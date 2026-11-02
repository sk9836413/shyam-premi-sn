// Runs the animated-clip kernel on Kaggle's free GPU (heavy work stays off this PC):
//   node animate/kaggle.mjs prepare [animate/scenes.json]  -> private dataset sps-animate-inputs (start images + jobs.json)
//   node animate/kaggle.mjs push                           -> private GPU kernel sps-animate-pilot (animate/kaggle/animate.py)
//   node animate/kaggle.mjs status | quota
//   node animate/kaggle.mjs fetch                          -> clips into animate/clips/, results into animate/kaggle-out/
// Every scene with `prompt` + `image` + `video` becomes one job; its `animate` text describes the motion.
// Kaggle login: the CLI's own credentials (~/.kaggle), never read here. KAGGLE_CLI = path to kaggle(.exe) if it
// is not on PATH; KAGGLE_USER = the account name (otherwise read from `kaggle kernels list --mine`).
// Settings (size/frames/steps/...) can be put in spec.animate_settings.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const CLI = process.env.KAGGLE_CLI || 'kaggle';
const DATASET = 'sps-animate-inputs', KERNEL = 'sps-animate-pilot';
const [cmd = 'status', specArg = path.join(DIR, 'scenes.json')] = process.argv.slice(2);

function kaggle(...args) {
  const r = spawnSync(CLI, args, { encoding: 'utf8' });
  return { ok: r.status === 0, out: `${r.stdout || ''}${r.stderr || ''}`.trim() };
}

function user() {
  if (process.env.KAGGLE_USER) return process.env.KAGGLE_USER;
  const r = kaggle('kernels', 'list', '--mine', '--csv', '--page-size', '1');
  const row = r.out.split('\n')[1];
  if (!row) throw new Error('set KAGGLE_USER (no kernels yet to read the account name from)');
  return row.split(',')[0].split('/')[0];
}

if (cmd === 'prepare') {
  const specFile = path.resolve(specArg), base = path.dirname(specFile);
  const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
  const out = path.join(DIR, 'dataset');
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const jobs = spec.scenes.flatMap((s, i) => {
    if (!s.prompt || !s.image || !s.video) return [];
    const image = `${i}${path.extname(s.image)}`;
    fs.copyFileSync(path.resolve(base, s.image), path.join(out, image));
    const look = '3D animated devotional movie style, soft cinematic lighting, rich warm colours, smooth natural motion';
    return [{ id: path.basename(s.video, '.mp4'), image, prompt: `${s.prompt}. ${s.animate || 'gentle natural motion, slow camera push-in'}. ${look}`, seed: s.seed || 42 }];
  });
  fs.writeFileSync(path.join(out, 'jobs.json'), JSON.stringify({ settings: spec.animate_settings || {}, jobs }, null, 2));
  fs.writeFileSync(path.join(out, 'dataset-metadata.json'), JSON.stringify({
    title: DATASET, id: `${user()}/${DATASET}`, licenses: [{ name: 'other' }],
  }, null, 2));
  // New datasets are private unless --public is passed; later runs add a version.
  let r = kaggle('datasets', 'create', '-p', out, '-q');
  if (!r.ok || /already (exists|in use)/i.test(r.out)) r = kaggle('datasets', 'version', '-p', out, '-m', `jobs ${new Date().toISOString()}`, '-q');
  console.log(r.out);
  console.log(`${jobs.length} jobs: ${jobs.map((j) => j.id).join(', ')}`);
} else if (cmd === 'push') {
  const u = user();
  fs.writeFileSync(path.join(DIR, 'kaggle', 'kernel-metadata.json'), JSON.stringify({
    id: `${u}/${KERNEL}`, title: KERNEL, code_file: 'animate.py', language: 'python', kernel_type: 'script',
    is_private: true, enable_gpu: true, enable_internet: true, machine_shape: 'NvidiaTeslaT4',
    // Without the GPU image the session can come up on Kaggle's CPU image even with enable_gpu.
    docker_image: 'gcr.io/kaggle-gpu-images/python', docker_image_pinning_type: 'latest',
    dataset_sources: [`${u}/${DATASET}`], competition_sources: [], kernel_sources: [],
  }, null, 2));
  console.log(kaggle('kernels', 'push', '-p', path.join(DIR, 'kaggle'), '--accelerator', 'NvidiaTeslaT4').out);
} else if (cmd === 'status') {
  console.log(kaggle('kernels', 'status', `${user()}/${KERNEL}`).out);
} else if (cmd === 'quota') {
  console.log(kaggle('quota').out);
} else if (cmd === 'fetch') {
  const out = path.join(DIR, 'kaggle-out');
  fs.rmSync(out, { recursive: true, force: true });
  console.log(kaggle('kernels', 'output', `${user()}/${KERNEL}`, '-p', out).out.split('\n').slice(-3).join('\n'));
  fs.mkdirSync(path.join(DIR, 'clips'), { recursive: true });
  for (const f of fs.existsSync(path.join(out, 'clips')) ? fs.readdirSync(path.join(out, 'clips')) : []) {
    fs.copyFileSync(path.join(out, 'clips', f), path.join(DIR, 'clips', f));
    console.log(`clips/${f}`);
  }
} else {
  throw new Error(`unknown command ${cmd}`);
}
