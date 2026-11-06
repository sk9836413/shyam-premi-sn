// Runs the image-to-video kernel on Kaggle's free GPU (the heavy work never runs on the PC or the CI runner):
//   node animate/kaggle.mjs prepare <scenes.json> [--plan plan.json] [--max 4] [--voice] [--dry-run = jobs.json only, no upload]
//        --voice: the kernel first narrates every scene with Chatterbox (voice/chatterbox_tts.py) and sizes the clips
//        to that narration; SPS_SLOT=long with --voice --max 0 is narration only (kernel sps-tts-long)
//        -> private dataset sps-animate-inputs (start images + jobs.json, a new version each run)
//   node animate/kaggle.mjs upload                    -> sends animate/dataset as it is (SPS_SLOT=char-<channel>: built by
//        characters/dialogue.py dataset) as a new version of the slot's private dataset
//   node animate/kaggle.mjs push [--retry-minutes 20] -> private GPU kernel (animate/kaggle/animate.py), T4 x2; retries while
//        Kaggle refuses because the account already runs 2 batch GPU sessions
//   node animate/kaggle.mjs lock [--minutes 45]      -> waits while another sps-animate-* kernel runs; exit 1 on timeout
//   node animate/kaggle.mjs wait [--minutes 100] [--queue-minutes 20]
//        -> polls until done; exit 0 only when COMPLETE; gives up if the session is still queued after --queue-minutes
//   node animate/kaggle.mjs fetch [--to <dir>] [--voice-to <dir>] -> clips <scene>.mp4, voice-<i>.wav + voice.json, results.json
//   node animate/kaggle.mjs quota [--min 10]         -> GPU hours left this week; exit 2 when under --min
//   node animate/kaggle.mjs status
// Quality (animate/REPORT.md section 10): the dataset also carries enhance.py (RIFE 30 fps + Real-ESRGAN 1080 px for
// every clip, Real-ESRGAN 2160 px for every still), hero14b.py (evening hero clip with Wan 2.2 I2V-A14B) and
// flux_frames.py (start frames re-made on the GPU with FLUX.1-schnell, 1024 px / 8 steps; off unless SPS_FLUX=1);
// `fetch --stills-to` brings back the upscaled stills. Defaults below; a spec's animate_settings or the env
// SPS_ENHANCE=0 / SPS_HERO14B=0 turn parts off. Motion prompts follow one template:
// camera move + subject micro-motion + (deity scenes) "the murti never moves".
// Jobs: with --plan (from `render-story.mjs --prepare`), the scenes marked `animate` (else the first ones), at most
// --max, never the end card, each clip as long
// as its scene (up to 169 frames = 7 s; the renderer may slow a clip by up to 1.1x). Without --plan (the
// pilot), every scene with prompt + image + video. A scene's `animate` text describes the motion.
// Login: the Kaggle CLI's own credentials (KAGGLE_API_TOKEN in CI, ~/.kaggle on the PC); never read here.
// KAGGLE_CLI = path to the CLI if not on PATH; KAGGLE_USER = account name (else read from the kernel list);
// SPS_SLOT = morning | evening | noon | status (festival status Short): each slot has its own kernel sps-animate-<slot> and dataset
// sps-animate-inputs-<slot>, so runs never overwrite each other's inputs or outputs, and `lock` keeps this channel to
// one GPU session at a time (Kaggle allows only ~2 batch GPU sessions per account). Settings: spec.animate_settings.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const CLI = process.env.KAGGLE_CLI || 'kaggle';
const SLOT = process.env.SPS_SLOT || 'daily';
// char-shyam / char-epifive: the daily two-character dialogue Short's lip-sync (characters/kaggle/lipsync_daily.py,
// dataset built by characters/dialogue.py and sent with `upload`).
const CHAR = SLOT.startsWith('char-');
// movie: one part of a mini-movie series (story/movie.py dataset -> story/movie_kernel.py: FLUX frames, Wan clips,
// lip-sync and a Whisper pronunciation check in one session; STORY.md section 7).
const MOVIE = SLOT === 'movie';
// frames-<slot>: FLUX.1-schnell start frames / story images on the GPU when Workers AI is out of neurons (animate/frames.mjs,
// kernel animate/kaggle/frames_kernel.py, dataset built by frames.mjs and sent with `upload`).
const FRAMES = SLOT.startsWith('frames-');
const DATASET = SLOT === 'long' ? 'sps-tts-inputs-long' : MOVIE ? 'sps-movie-inputs' : CHAR ? `sps-char-inputs-${SLOT.slice(5)}`
  : FRAMES ? `sps-frames-inputs-${SLOT.slice(7)}` : `sps-animate-inputs-${SLOT}`;
const KERNEL = SLOT === 'long' ? 'sps-tts-long' : MOVIE ? 'sps-movie' : CHAR ? `sps-${SLOT}` : FRAMES ? `sps-${SLOT}` : `sps-animate-${SLOT}`;
const CODE = MOVIE ? path.join(DIR, '..', 'story', 'movie_kernel.py') : CHAR ? path.join(DIR, '..', 'characters', 'kaggle', 'lipsync_daily.py')
  : FRAMES ? path.join(DIR, 'kaggle', 'frames_kernel.py') : path.join(DIR, 'kaggle', 'animate.py');
// Every GPU kernel of both channels (one Kaggle account): `lock` waits while any other one runs.
const ALL_KERNELS = [...['morning', 'evening', 'noon', 'status', 'daily'].map((x) => `sps-animate-${x}`), 'sps-tts-long',
  'sps-char-shyam', 'sps-char-epifive', 'sps-char-anim', 'sps-movie',
  ...['morning', 'evening', 'noon', 'status', 'long', 'photos', 'veo', 'pilot'].map((x) => `sps-frames-${x}`)];
const stateOf = (out) => (out.match(/status "(?:KernelWorkerStatus\.)?(\w+)"/i)?.[1] || '').toUpperCase();
const args = process.argv.slice(2);
const cmd = args[0] || 'status';
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const STAMP_FILE = path.join(DIR, 'dataset', MOVIE ? 'movie.json' : 'jobs.json');

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

// Frames for a scene: 4k+1 (Wan's grid), long enough that at most a 1.1x slow-down fills the scene, 81-169. With the
// RIFE post-process on, the kernel stretches a clip smoothly by up to 1.25x (real in-between frames), so ~12% fewer
// frames are generated (Wan's cost grows faster than linearly with frames).
const SLOW = process.env.SPS_ENHANCE === '0' ? 1.1 : 1.25;
const framesFor = (seconds) => Math.min(169, Math.max(81, 4 * Math.ceil((Math.ceil((seconds / SLOW) * 24) - 1) / 4) + 1));

async function prepare() {
  const specFile = path.resolve(args[1]), base = path.dirname(specFile);
  const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
  // A long video keeps its scenes in chapters: flatten them in render-long.mjs order.
  const all = spec.scenes || spec.chapters.flatMap((c) => c.scenes);
  const plan = opt('--plan') ? JSON.parse(fs.readFileSync(opt('--plan'), 'utf8')) : null;
  const out = path.join(DIR, 'dataset');
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const settings = { ...DEFAULTS(), ...(spec.animate_settings || {}) };
  const usable = plan ? plan.scenes.filter((p) => all[p.i]?.prompt && !all[p.i].endcard) : [];
  const marked = usable.filter((p) => all[p.i].animate);
  const picks = plan
    ? (marked.length ? marked : usable).slice(0, Number(opt('--max', 4)))
      .map((p) => ({ i: p.i, image: p.image, frames: framesFor(p.seconds), seconds: p.seconds }))
    : all.flatMap((s, i) => (s.prompt && s.image && s.video ? [{ i, image: path.resolve(base, s.image) }] : []));
  const jobs = picks.map(({ i, image, frames, seconds }) => {
    const s = all[i];
    fs.copyFileSync(image, path.join(out, `${i}${path.extname(image)}`));
    return { id: String(i), image: `${i}${path.extname(image)}`, ...(frames ? { frames } : {}), ...(seconds ? { seconds } : {}),
      seed: s.seed || 42, prompt: motionPrompt(s), ...(settings.flux ? { flux_prompt: framePrompt(s, spec) } : {}),
      ...(s.hero ? { hero: true } : {}) };
  });
  // Hero clip: the scene marked `hero`, else the first deity/murti scene among the jobs.
  if (settings.hero14b && jobs.length && !jobs.some((j) => j.hero)) {
    const d = jobs.find((j) => DEITY(all[Number(j.id)]));
    if (d) d.hero = true;
  }
  // The zoompan scenes' images too, so the kernel can upscale them (still-<i>.jpg -> stills/<i>.jpg, 2160 px).
  if (plan && settings.stills) {
    for (const p of plan.scenes) {
      if (!picks.some((k) => k.i === p.i) && fs.existsSync(p.image)) fs.copyFileSync(p.image, path.join(out, `still-${p.i}.jpg`));
    }
  }
  for (const f of ['enhance.py', 'flux_frames.py', 'hero14b.py']) fs.copyFileSync(path.join(DIR, 'kaggle', f), path.join(out, f));
  await esrWeights(out);
  const stamp = `${spec.slug}-${Date.now()}`;
  // Narration lines for Chatterbox (flat files: Kaggle skips sub-folders of a dataset by default).
  let voice;
  if (args.includes('--voice')) {
    const VOICE = path.join(DIR, '..', 'voice');
    for (const f of ['chatterbox_tts.py', 'ref-male.wav', 'ref-female.wav']) fs.copyFileSync(path.join(VOICE, f), path.join(out, f));
    fs.writeFileSync(path.join(out, 'voice-lines.json'), JSON.stringify({
      refs: { hm_omega: 'ref-male.wav', hf_alpha: 'ref-female.wav' },
      lines: all.map((s, i) => ({ i, text: s.tts, voice: s.voice || spec.voice || 'hm_omega' })),
    }, null, 2));
    voice = { lines: 'voice-lines.json', pad: 0.7, max_minutes: SLOT === 'long' ? 30 : 15 };
  }
  fs.writeFileSync(path.join(out, 'jobs.json'), JSON.stringify({ stamp, settings, ...(voice ? { voice } : {}), jobs }, null, 2));
  if (args.includes('--dry-run')) {
    console.log(JSON.stringify({ dryRun: true, kernel: KERNEL, dataset: DATASET, stamp, jobs: jobs.map((j) => ({ id: j.id, frames: j.frames || 121 })) }));
    return;
  }
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

// Real-ESRGAN weights (BSD-3-Clause, 4.9 MB) go into every dataset, so the kernel never depends on a GitHub download
// (one 504'd on 5 Nov). Cached in animate/.cache; checked against the pinned SHA-256. Failure: the kernel downloads.
async function esrWeights(out) {
  const url = 'https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-general-x4v3.pth';
  const sha = '8dc7edb9ac80ccdc30c3a5dca6616509367f05fbc184ad95b731f05bece96292';
  const cache = path.join(DIR, '.cache', 'realesr-general-x4v3.pth');
  const { createHash } = await import('node:crypto');
  const ok = (f) => fs.existsSync(f) && createHash('sha256').update(fs.readFileSync(f)).digest('hex') === sha;
  for (let k = 0; k < 3 && !ok(cache); k++) {
    try {
      const r = await globalThis.fetch(url);
      if (r.ok) { fs.mkdirSync(path.dirname(cache), { recursive: true }); fs.writeFileSync(cache, Buffer.from(await r.arrayBuffer())); }
    } catch (e) { console.log(`Real-ESRGAN weights: ${e.message}`); }
    if (!ok(cache)) await sleep(5000);
  }
  if (ok(cache)) fs.copyFileSync(cache, path.join(out, 'realesr-general-x4v3.pth'));
}

// Default quality settings for every animated slot (each part falls back to the old path inside the kernel).
const DEFAULTS = () => ({
  enhance: process.env.SPS_ENHANCE !== '0', // RIFE 30 fps + Real-ESRGAN 1080 px per clip
  stills: process.env.SPS_ENHANCE !== '0', // Real-ESRGAN 2160 px per still
  // Off by default since the 5 Nov A/B (REPORT section 10): +7.7 GPU min per Short, more cinematic in 3 of 4 frames,
  // but one Krishna murti came out fair-skinned. SPS_FLUX=1 turns it on; the better frame prompt is used on Workers AI.
  flux: process.env.SPS_FLUX === '1' ? { size: 1024, steps: 8 } : false,
  // Evening only: one hero darshan clip with Wan 2.2 I2V-A14B (GGUF Q4_K_S + Lightning 4-step LoRA, 640 px, ~23 min of
  // the session); the workflow sets SPS_HERO14B=0 when under 6 GPU hours are left this week.
  hero14b: SLOT === 'evening' && process.env.SPS_HERO14B !== '0' ? { quant: 'Q4_K_S', sizes: [640], steps: 4 } : false,
});

// Motion prompt template: subject + camera move + micro-motion + a stability guard + one cinematic look.
const DEITY = (s) => s.deity === true || /(murti|idol|deity|darshan of)/i.test(s.prompt || '');
const CAMERA = {
  in: 'the camera slowly and smoothly dollies in', out: 'the camera slowly and smoothly pulls back',
  pan: 'the camera slowly tracks sideways', still: 'locked-off camera on a tripod',
};
export function motionPrompt(s) {
  const deity = DEITY(s);
  // A murti is a sacred statue: only a straight push-in (or a still camera), so the face never slides or turns.
  const cam = CAMERA[deity && s.motion !== 'still' ? 'in' : s.motion] || CAMERA.in;
  const micro = s.animate || (deity ? 'diya flames flicker softly, thin incense smoke curls upward, warm light shimmers on the jewellery'
    : 'gentle natural movement, cloth and leaves sway softly');
  const guard = deity
    ? 'The murti is a perfectly still sacred statue: its face, eyes, hands and ornaments do not move or change shape; only the light, flames, smoke and petals move'
    : 'Faces stay the same person throughout, with subtle natural movement such as breathing and blinking';
  return `${s.prompt}. ${cam}, steady and continuous, no cut, no shake. Motion: ${micro}. ${guard}. ` +
    '3D animated devotional film, cinematic lighting with a warm key light and soft rim light, shallow depth of field, rich warm colours, smooth natural motion';
}
// Start-frame prompt (FLUX): the scene + the spec's style + lighting, lens and composition; iconography stays as written.
export function framePrompt(s, spec) {
  return `${s.prompt}. ${spec.style || '3D animated devotional movie style, no text'}. Cinematic composition with a clear main subject, ` +
    '50mm lens, soft volumetric light rays, warm diya key light and gentle rim light, shallow depth of field, rich detail, ' +
    'traditional Hindu iconography exactly as described, full-frame square image without black bars, no text, no letters, no watermark';
}

// Sends a dataset folder that is already built (characters/dialogue.py dataset) as a new version of DATASET.
async function upload() {
  const out = path.join(DIR, 'dataset');
  // The lip-sync kernel upscales its clips with the same enhance.py (Real-ESRGAN); the frames kernel needs neither.
  if (!FRAMES) {
    fs.copyFileSync(path.join(DIR, 'kaggle', 'enhance.py'), path.join(out, 'enhance.py'));
    await esrWeights(out);
  }
  const { stamp } = JSON.parse(fs.readFileSync(STAMP_FILE, 'utf8'));
  fs.writeFileSync(path.join(out, 'dataset-metadata.json'), JSON.stringify({ title: DATASET, id: `${user()}/${DATASET}`, licenses: [{ name: 'other' }] }, null, 2));
  let r = kaggle('datasets', 'version', '-p', out, '-m', stamp, '-q');
  if (!r.ok || /not found|does not exist/i.test(r.out)) r = kaggle('datasets', 'create', '-p', out, '-q');
  if (!r.ok) throw new Error(`dataset upload failed: ${r.out.split('\n').pop()}`);
  for (let t = 0; t < 20; t++) {
    await sleep(15000);
    if (/ready/i.test(kaggle('datasets', 'status', `${user()}/${DATASET}`).out)) break;
  }
  console.log(JSON.stringify({ dataset: DATASET, stamp }));
}

async function push() {
  const u = user();
  const stamp = JSON.parse(fs.readFileSync(STAMP_FILE, 'utf8')).stamp;
  const dir = path.join(DIR, 'kaggle-push');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  // START_BY: a session that only starts after this (queued too long, so the workflow has already fallen back to
  // zoompan) exits at once instead of spending GPU hours on clips nobody will use.
  const write = () => {
    const startBy = Math.round(Date.now() / 1000 + 60 * (Number(opt('--queue-minutes', 20)) + 5));
    fs.writeFileSync(path.join(dir, path.basename(CODE)), fs.readFileSync(CODE, 'utf8')
      .replace(/^EXPECT_STAMP = None.*$/m, `EXPECT_STAMP = ${JSON.stringify(stamp)}`)
      .replace(/^START_BY = None.*$/m, `START_BY = ${startBy}`));
  };
  fs.writeFileSync(path.join(dir, 'kernel-metadata.json'), JSON.stringify({
    id: `${u}/${KERNEL}`, title: KERNEL, code_file: path.basename(CODE), language: 'python', kernel_type: 'script',
    is_private: true, enable_gpu: true, enable_internet: true, machine_shape: 'NvidiaTeslaT4',
    docker_image_pinning_type: 'latest', dataset_sources: [`${u}/${DATASET}`], competition_sources: [], kernel_sources: [],
  }, null, 2));
  // Kaggle refuses a push while the account already runs 2 batch GPU sessions (any project): retry for a while.
  const until = Date.now() + Number(opt('--retry-minutes', 20)) * 60e3;
  for (;;) {
    write();
    const r = kaggle('kernels', 'push', '-p', dir, '--accelerator', 'NvidiaTeslaT4');
    console.log(r.out.split('\n').pop());
    if (r.ok && /successfully pushed/i.test(r.out)) return;
    if (!/maximum batch GPU session/i.test(r.out) || Date.now() > until) process.exit(1);
    await sleep(60e3);
  }
}

// One sps-animate session at a time: wait while another slot's kernel is running or queued.
async function lock() {
  const until = Date.now() + Number(opt('--minutes', 45)) * 60e3;
  for (;;) {
    const busy = ALL_KERNELS.filter((k) => k !== KERNEL)
      .filter((k) => /RUNNING|QUEUED/.test(stateOf(kaggle('kernels', 'status', `${user()}/${k}`).out)));
    if (!busy.length) { console.log(JSON.stringify({ lock: 'free' })); return; }
    if (Date.now() > until) { console.log(JSON.stringify({ lock: 'timeout', busy })); process.exit(1); }
    console.log(`waiting for ${busy.join(', ')}`);
    await sleep(60e3);
  }
}

async function wait() {
  const t0 = Date.now(), until = t0 + Number(opt('--minutes', 100)) * 60e3;
  const queueLimit = t0 + Number(opt('--queue-minutes', 20)) * 60e3;
  let last = '', started = false;
  await sleep(60e3);
  while (Date.now() < until) {
    const st = stateOf(kaggle('kernels', 'status', `${user()}/${KERNEL}`).out); // transient errors just retry
    if (st) last = st;
    if (/RUNNING|COMPLETE|ERROR/.test(last)) started = true;
    if (/COMPLETE|ERROR|CANCEL/.test(last)) break;
    if (!started && Date.now() > queueLimit) { last = 'QUEUED_TOO_LONG'; break; }
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
  if (FRAMES) { // FLUX frames <id>.png of this run only
    const got = fresh && fs.existsSync(path.join(out, 'frames')) ? fs.readdirSync(path.join(out, 'frames')).filter((f) => f.endsWith('.png')) : [];
    for (const f of got) fs.copyFileSync(path.join(out, 'frames', f), path.join(to, f));
    console.log(JSON.stringify({ fresh, frames: got.map((f) => f.slice(0, -4)), asked: results?.asked, session_s: results?.session_s, flux: results?.flux && { download_s: results.flux.download_s, text_s: results.flux.text_s, load_s: results.flux.load_s, flux_s: results.flux.flux_s } }));
    return;
  }
  if (MOVIE) { // the whole output tree (frames, stills, clips, lip, qa.json, results*.json) for story/movie.py render
    if (fresh) fs.cpSync(out, to, { recursive: true });
    console.log(JSON.stringify({ fresh, session_s: results?.session_s, tier: results?.tier, images: results?.images,
      clips: results?.clips && { made: results.clips.made?.length, asked: results.clips.asked?.length, seconds: results.clips.seconds },
      lips: results?.lips && { made: results.lips.made, asked: results.lips.asked, seconds: results.lips.seconds }, qa: results?.qa }));
    return;
  }
  // Chatterbox narration: copied only when every line succeeded (otherwise the renderer uses edge-tts for all).
  const vj = path.join(out, 'voice', 'voice.json');
  let voice = 'none';
  if (fresh && opt('--voice-to') && fs.existsSync(vj)) {
    const v = JSON.parse(fs.readFileSync(vj, 'utf8'));
    voice = v.lines.every((l) => l.ok) ? 'chatterbox' : `incomplete (${v.lines.filter((l) => !l.ok).length} failed)`;
    if (voice === 'chatterbox') {
      const dst = path.resolve(opt('--voice-to'));
      fs.mkdirSync(dst, { recursive: true });
      for (const f of fs.readdirSync(path.join(out, 'voice'))) fs.copyFileSync(path.join(out, 'voice', f), path.join(dst, f));
    }
  }
  const clips = fresh && fs.existsSync(path.join(out, 'clips')) ? fs.readdirSync(path.join(out, 'clips')).filter((f) => f.endsWith('.mp4')) : [];
  for (const f of clips) fs.copyFileSync(path.join(out, 'clips', f), path.join(to, f));
  // Upscaled stills (2160 px) for the zoompan scenes and the clips' fallbacks.
  let stills = [];
  if (fresh && opt('--stills-to') && fs.existsSync(path.join(out, 'stills'))) {
    const dst = path.resolve(opt('--stills-to'));
    fs.mkdirSync(dst, { recursive: true });
    stills = fs.readdirSync(path.join(out, 'stills')).filter((f) => /^\d+\.jpg$/.test(f));
    for (const f of stills) fs.copyFileSync(path.join(out, 'stills', f), path.join(dst, f));
  }
  console.log(JSON.stringify({ fresh, voice, voice_s: results?.voice_s, clips, stills: stills.length, session_s: results?.session_s,
    flux: results?.flux, clip_s: results?.clips?.map((c) => [c.id, c.seconds, c.frames, c.enhance_s ?? null]) }));
}

function quota() {
  const r = kaggle('quota');
  const m = r.out.match(/^GPU\s+([\d.]+)h\s+([\d.]+)h\s+([\d.]+)h(?:\s+(\S+))?/m);
  if (!m) { console.log(JSON.stringify({ error: r.out.split('\n').pop() })); process.exit(2); }
  const left = Number(m[2]);
  // refreshAt: when the weekly quota resets (story/movie.py tier keeps the daily Shorts' hours until then).
  console.log(JSON.stringify({ used: Number(m[1]), left, total: Number(m[3]), ...(m[4] ? { refreshAt: m[4] } : {}) }));
  if (left < Number(opt('--min', 0))) process.exit(2);
}

// Run as a CLI only (other scripts import motionPrompt / framePrompt).
const MAIN = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (!MAIN) { /* imported */ } else if (cmd === 'prepare') await prepare();
else if (cmd === 'upload') await upload();
else if (cmd === 'push') await push();
else if (cmd === 'wait') await wait();
else if (cmd === 'lock') await lock();
else if (cmd === 'fetch') fetch();
else if (cmd === 'quota') quota();
else if (cmd === 'status') console.log(kaggle('kernels', 'status', `${user()}/${KERNEL}`).out);
else throw new Error(`unknown command ${cmd}`);
