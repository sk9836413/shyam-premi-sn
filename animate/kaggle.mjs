// Runs the image-to-video kernel on Kaggle's free GPU (the heavy work never runs on the PC or the CI runner):
//   node animate/kaggle.mjs prepare <scenes.json> [--plan plan.json] [--max 4]
//        -> private dataset sps-animate-inputs (start images + jobs.json, a new version each run)
//   node animate/kaggle.mjs push                     -> private GPU kernel (animate/kaggle/animate.py), T4 x2
//   node animate/kaggle.mjs wait [--minutes 100]     -> polls until done; exit 0 only when COMPLETE
//   node animate/kaggle.mjs fetch [--to <dir>]       -> clips <scene>.mp4 + results.json
//   node animate/kaggle.mjs quota [--min 10]         -> GPU hours left this week; exit 2 when under --min
//   node animate/kaggle.mjs status
// Jobs: with --plan (from `render-story.mjs --prepare`), the first --max non-end-card scenes, each clip as long
// as its scene (up to 169 frames = 7 s; the renderer may slow a clip by up to 1.1x). Without --plan (the
// pilot), every scene with prompt + image + video. A scene's `animate` text describes the motion.
// Login: the Kaggle CLI's own credentials (KAGGLE_API_TOKEN in CI, ~/.kaggle on the PC); never read here.
// KAGGLE_CLI = path to the CLI if not on PATH; KAGGLE_USER = account name (else read from the kernel list);
// SPS_KERNEL = kernel slug (default sps-animate-daily). Settings can be put in spec.animate_settings.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const CLI = process.env.KAGGLE_CLI || 'kaggle';
const DATASET = 'sps-animate-inputs', KERNEL = process.env.SPS_KERNEL || 'sps-animate-daily';
const args = process.argv.slice(2);
const cmd = args[0] || 'status';
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const STAMP_FILE = path.join(DIR, 'dataset', 'jobs.json');

function kaggle(...a) {
  const r = spawnSync(CLI, a, { encoding: 'utf8' });
  return { ok: r.status === 0, out: `${r.stdout || ''}${r.stderr || ''}`.trim() };
}

let account;
function user() {
  if (account) return account;
  if (process.env.KAGGLE_USER) return (account = process.env.KAGGLE_USER);
  const r = kaggle('kernels', 'list', '--mine', '--csv', '--page-size', '1');
  const row = r.ok && r.out.split('\n').find((l) => /^[\w-]+\/[\w-]+,/.test(l));
  if (!row) throw new Error(`cannot read the Kaggle account name: ${r.out.split('\n').pop()}`);
  return (account = row.split('/')[0]);
}

// Frames for a scene: 4k+1 (Wan's grid), long enough that at most a 1.1x slow-down fills the scene, 81-169.
const framesFor = (seconds) => Math.min(169, Math.max(81, 4 * Math.ceil((Math.ceil((seconds / 1.1) * 24) - 1) / 4) + 1));

async function prepare() {
  const specFile = path.resolve(args[1]), base = path.dirname(specFile);
  const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
  const plan = opt('--plan') ? JSON.parse(fs.readFileSync(opt('--plan'), 'utf8')) : null;
  const out = path.join(DIR, 'dataset');
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const look = '3D animated devotional movie style, soft cinematic lighting, rich warm colours, smooth natural motion';
  const picks = plan
    ? plan.scenes.filter((p) => spec.scenes[p.i]?.prompt && !spec.scenes[p.i].endcard).slice(0, Number(opt('--max', 4)))
      .map((p) => ({ i: p.i, image: p.image, frames: framesFor(p.seconds) }))
    : spec.scenes.flatMap((s, i) => (s.prompt && s.image && s.video ? [{ i, image: path.resolve(base, s.image) }] : []));
  const jobs = picks.map(({ i, image, frames }) => {
    const s = spec.scenes[i];
    fs.copyFileSync(image, path.join(out, `${i}${path.extname(image)}`));
    return { id: String(i), image: `${i}${path.extname(image)}`, ...(frames ? { frames } : {}), seed: s.seed || 42,
      prompt: `${s.prompt}. ${s.animate || 'gentle natural motion, slow camera push-in, calm devotional mood'}. ${look}` };
  });
  const stamp = `${spec.slug}-${Date.now()}`;
  fs.writeFileSync(path.join(out, 'jobs.json'), JSON.stringify({ stamp, settings: spec.animate_settings || {}, jobs }, null, 2));
  fs.writeFileSync(path.join(out, 'dataset-metadata.json'), JSON.stringify({ title: DATASET, id: `${user()}/${DATASET}`, licenses: [{ name: 'other' }] }, null, 2));
  // New datasets are private unless --public is passed; later runs add a version.
  let r = kaggle('datasets', 'version', '-p', out, '-m', stamp, '-q');
  if (!r.ok || /not found|does not exist/i.test(r.out)) r = kaggle('datasets', 'create', '-p', out, '-q');
  if (!r.ok) throw new Error(`dataset upload failed: ${r.out.split('\n').pop()}`);
  // Wait until Kaggle has processed the new version (the kernel also checks the stamp).
  for (let t = 0; t < 20; t++) {
    await sleep(15000);
    if (/ready/i.test(kaggle('datasets', 'status', `${user()}/${DATASET}`).out)) break;
  }
  console.log(JSON.stringify({ stamp, jobs: jobs.map((j) => ({ id: j.id, frames: j.frames || 121 })) }));
}

function push() {
  const u = user();
  const stamp = JSON.parse(fs.readFileSync(STAMP_FILE, 'utf8')).stamp;
  const dir = path.join(DIR, 'kaggle-push');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const code = fs.readFileSync(path.join(DIR, 'kaggle', 'animate.py'), 'utf8').replace(/^EXPECT_STAMP = None.*$/m, `EXPECT_STAMP = ${JSON.stringify(stamp)}`);
  fs.writeFileSync(path.join(dir, 'animate.py'), code);
  fs.writeFileSync(path.join(dir, 'kernel-metadata.json'), JSON.stringify({
    id: `${u}/${KERNEL}`, title: KERNEL, code_file: 'animate.py', language: 'python', kernel_type: 'script',
    is_private: true, enable_gpu: true, enable_internet: true, machine_shape: 'NvidiaTeslaT4',
    docker_image_pinning_type: 'latest', dataset_sources: [`${u}/${DATASET}`], competition_sources: [], kernel_sources: [],
  }, null, 2));
  const r = kaggle('kernels', 'push', '-p', dir, '--accelerator', 'NvidiaTeslaT4');
  console.log(r.out.split('\n').pop());
  if (!r.ok || !/successfully pushed/i.test(r.out)) process.exit(1);
}

async function wait() {
  const until = Date.now() + Number(opt('--minutes', 100)) * 60e3;
  let last = '';
  await sleep(60e3);
  while (Date.now() < until) {
    const r = kaggle('kernels', 'status', `${user()}/${KERNEL}`); // transient errors just retry
    const m = r.out.match(/status "(?:KernelWorkerStatus\.)?(\w+)"/i);
    if (m) last = m[1].toUpperCase();
    if (/COMPLETE|ERROR|CANCEL/.test(last)) break;
    await sleep(60e3);
  }
  console.log(JSON.stringify({ status: last || 'unknown' }));
  process.exit(last === 'COMPLETE' ? 0 : 1);
}

function fetch() {
  const to = path.resolve(opt('--to', path.join(DIR, 'clips')));
  const out = path.join(DIR, 'kaggle-out');
  fs.rmSync(out, { recursive: true, force: true });
  const r = kaggle('kernels', 'output', `${user()}/${KERNEL}`, '-p', out);
  if (!r.ok) throw new Error(`kernel output: ${r.out.split('\n').pop()}`);
  fs.mkdirSync(to, { recursive: true });
  const results = fs.existsSync(path.join(out, 'results.json')) ? JSON.parse(fs.readFileSync(path.join(out, 'results.json'), 'utf8')) : null;
  // Only this run's clips: while a kernel is still running, `kernels output` returns the previous run's files.
  const stamp = fs.existsSync(STAMP_FILE) ? JSON.parse(fs.readFileSync(STAMP_FILE, 'utf8')).stamp : null;
  const fresh = !stamp || results?.stamp === stamp;
  const clips = fresh && fs.existsSync(path.join(out, 'clips')) ? fs.readdirSync(path.join(out, 'clips')).filter((f) => f.endsWith('.mp4')) : [];
  for (const f of clips) fs.copyFileSync(path.join(out, 'clips', f), path.join(to, f));
  console.log(JSON.stringify({ fresh, clips, session_s: results?.session_s, clip_s: results?.clips?.map((c) => [c.id, c.seconds, c.frames]) }));
}

function quota() {
  const r = kaggle('quota');
  const m = r.out.match(/^GPU\s+([\d.]+)h\s+([\d.]+)h\s+([\d.]+)h/m);
  if (!m) { console.log(JSON.stringify({ error: r.out.split('\n').pop() })); process.exit(2); }
  const left = Number(m[2]);
  console.log(JSON.stringify({ used: Number(m[1]), left, total: Number(m[3]) }));
  if (left < Number(opt('--min', 0))) process.exit(2);
}

if (cmd === 'prepare') await prepare();
else if (cmd === 'push') push();
else if (cmd === 'wait') await wait();
else if (cmd === 'fetch') fetch();
else if (cmd === 'quota') quota();
else if (cmd === 'status') console.log(kaggle('kernels', 'status', `${user()}/${KERNEL}`).out);
else throw new Error(`unknown command ${cmd}`);
