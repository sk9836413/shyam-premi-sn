// Start frames and story images for every video and post, so a post is never skipped when Cloudflare Workers AI is out
// of its free daily allocation (10,000 neurons, resets 00:00 UTC = 05:30 IST; error 4006). Order per image:
//   1. Workers AI FLUX.1-schnell through the media Worker (/ai/flux), the normal path, while it answers;
//   2. Kaggle GPU FLUX.1-schnell (Apache-2.0, GGUF Q6_K, animate/kaggle/flux_frames.py) for everything still missing,
//      in ONE short session (private kernel sps-frames-<slot>, ~5.5 min setup + ~1 min per 1024 px image on a T4);
//   3. fallbackImage() below (the renderers call it): the AI picture bank (brand/photo-bank: Khatu Shyam ji sheesh,
//      festival keys), the spec temple's licence-safe real photos (footage/), else a plain warm background.
//   node animate/frames.mjs <scenes.json>                 Shorts / status (render-story.mjs): images/<slug>-<i>.jpg
//   node animate/frames.mjs <scenes.json> --long          long video (render-long.mjs): images/<slug>-img<i>.jpg
//   node animate/frames.mjs <scenes.json> --visuals <dir> noon dialogue Short (characters/dialogue.py): <dir>/<key>.jpg
//   node animate/frames.mjs --jobs <jobs.json>            any list [{ out, prompt, w?, h?, seed? }] (photo posts, Veo kit)
//   options: --kaggle (skip Workers AI: pilots, experiments, a forced fallback test), --kaggle-first (Kaggle, then Workers AI
//            for anything Kaggle did not make: the long video, so its ~12 images leave the neurons to the Shorts),
//            --no-kaggle, --wait <min> (default 40),
//            --dry-run (list what would be made; no Workers AI, no Kaggle)
// Env: SPS_SLOT (kernel sps-frames-<slot>), SPS_WORKERS_AI=0 (= --kaggle), MEDIA_URL + MEDIA_TOKEN, KAGGLE_API_TOKEN
// (or the PC's ~/.kaggle), FFMPEG_PATH. Neuron ledger: one line per run in $GITHUB_STEP_SUMMARY (images per source,
// ~326 neurons per Workers AI image at 4 steps, measured 1 Nov) and a JSON line on stdout. Never exits non-zero for a
// missing picture: the renderers' fallbackImage() covers whatever is left.
// Budget rule: scheduled production gets Workers AI first. Pilots and experiments (movie/character work, A/B tests)
// must use --kaggle (or SPS_WORKERS_AI=0) so they never spend the Shorts' neurons. With up to 8 Shorts a day (owner,
// 24 Nov 2026) each run also gets a Workers AI allowance by slot (scripts/resource-budget.mjs workersAiAllowance: the
// evening darshan and the festival status are never limited; until the day's evening darshan is in log.md only the
// morning-window slots get a few images, so the evening's neurons stay free). Images over the allowance go to Kaggle
// FLUX, then the bank / photo stand-in; the run leaves WORKERS_AI_MARKER in the images dir so the renderers do not make
// them with Workers AI after all. --no-budget skips the allowance (a manual run).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { photosFor } from '../scripts/real-photos.mjs';
import { NEURONS_PER_IMAGE, workersAiAllowance, writeWorkersAiMarker } from '../scripts/resource-budget.mjs';
import { KHATU_NEGATIVE, SHEESH_LOOK, longImagesFor, pickStill, realScenesFor, realShyamOn, shyamStills, showsShyamDarshan } from '../scripts/shyam-darshan.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(DIR, '..');
const FF = process.env.FFMPEG_PATH || 'E:/tools/ffmpeg/bin/ffmpeg.exe';
export { NEURONS_PER_IMAGE }; // 326: FLUX.1-schnell 1024 px, 4 steps (commit 9c1e186: 1 Nov used 13k for ~40 images)

// STORY.md: Khatu Shyam ji is the SHEESH (head) only. A prompt that names him without the sheesh form gets it added.
// The look is written from the owner's real darshan stills (scripts/shyam-darshan.mjs SHEESH_LOOK, 20 Nov 2026).
export const KHATU_SHEESH = SHEESH_LOOK;
const KHATU = /khatu\s*shyam|shyam\s*baba|baba\s*shyam|shri\s*shyam\s*ji/i;
export function iconography(prompt) {
  const p = String(prompt || '');
  return KHATU.test(p) && !/sheesh|head only/i.test(p) && !/barbari/i.test(p) ? `${p}. Shown as ${KHATU_SHEESH}` : p;
}

// ---- fallback of last resort (no Workers AI, no Kaggle): bank picture, real photo or a warm plain background ----------
const BANK = path.join(ROOT, 'brand', 'photo-bank');
const bank = (key) => {
  const d = path.join(BANK, key);
  return fs.existsSync(d) ? fs.readdirSync(d).filter((f) => /\.jpe?g$/i.test(f)).sort().map((f) => path.join(d, f)) : [];
};
const festivalKey = (spec) => String(spec?.festival || spec?.slug || '').toLowerCase()
  .replace(/.*(choti[- ]diwali|naraka?).*/, 'choti-diwali').replace(/.*(dhanteras).*/, 'dhanteras').replace(/.*(bhai[- ]dooj).*/, 'bhai-dooj')
  .replace(/.*(govardhan).*/, 'govardhan').replace(/.*(chhath).*/, 'chhath').replace(/.*(tulsi[- ]vivah).*/, 'tulsi-vivah')
  .replace(/.*(janmotsav|dev uthani).*/, 'janmotsav').replace(/.*(diwali|lakshmi).*/, 'diwali');
/**
 * A picture for scene i when no AI image could be made: { file, photo? } (photo = licence record of a real photo, to be
 * credited like any `real` scene). Never throws.
 */
export function fallbackImage(spec, prompt, i = 0, workDir = path.join(ROOT, 'animate', 'out')) {
  const pick = (list) => list[i % list.length];
  // Shyam Baba: the owner's real darshan stills first (scripts/shyam-darshan.mjs; credited and labelled like a real photo),
  // then the AI bank. Only for a darshan picture (not the katha: Barbarik, the sheesh daan, temple buildings...).
  if (KHATU.test(prompt || '') && realShyamOn(spec) && showsShyamDarshan(prompt)) {
    const still = pickStill(shyamStills(), prompt, `${spec?.slug || ''}-fb-${i}`);
    if (still) return { file: still.file, photo: still, source: 'real:shyam-baba-pandal-darshan' };
  }
  if (KHATU.test(prompt || '') && bank('khatu').length) return { file: pick(bank('khatu')), source: 'bank:khatu' };
  const fk = festivalKey(spec);
  if (fk && bank(fk).length && !/murti|deity|darshan|krishna|shiva|hanuman|ganesh|lakshmi|devi|mata/i.test(prompt || '')) {
    return { file: pick(bank(fk)), source: `bank:${fk}` };
  }
  const photos = photosFor(spec?.temple);
  if (photos.length) return { file: pick(photos).file, photo: pick(photos), source: `photo:${spec.temple}` };
  // Plain deep-saffron to maroon background with a soft glow: honest, never a wrong deity.
  fs.mkdirSync(workDir, { recursive: true });
  const file = path.join(workDir, 'fallback-plain.jpg');
  if (!fs.existsSync(file)) {
    spawnSync(FF, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=0x8a3a10:s=1024x1024:d=1', '-vf', 'vignette=PI/3', '-frames:v', '1', file]);
  }
  return { file, source: 'plain' };
}

// ---- what to make --------------------------------------------------------------------------------------------------
function wanted(specFile, mode, visualsDir) {
  const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
  const base = path.dirname(specFile);
  const photos = photosFor(spec.temple);
  const list = [];
  if (mode === 'long') {
    const real = (spec.images || []).map((im, i) => (im.real ? i : -1)).filter((i) => i >= 0);
    const shyam = longImagesFor(spec); // Shyam Baba darshan images: the owner's real (landscape) stills, no FLUX
    (spec.images || []).forEach((im, i) => {
      if (im.file || (photos.length && real.includes(i)) || shyam.has(i) || !im.prompt) return;
      list.push({ id: `img${i}`, out: path.join(base, 'images', `${spec.slug}-img${i}.jpg`),
        prompt: `${iconography(im.prompt)}. Wide cinematic composition with the main subject in the middle band. ${spec.style || ''}`, seed: im.seed || 42 + i });
    });
  } else if (mode === 'visuals') {
    for (const [key, v] of Object.entries(spec.visuals || {})) {
      if (!v.prompt || (v.real && photos.length)) continue;
      list.push({ id: key.replace(/[^\w-]/g, '_'), out: path.join(visualsDir, `${key}.jpg`), prompt: `${iconography(v.prompt)}. ${spec.style || ''}`, seed: v.seed || 42 });
    }
  } else {
    const realIdx = spec.scenes.map((s, i) => (s.real && !s.endcard ? i : -1)).filter((i) => i >= 0);
    const shyam = realScenesFor(spec); // Shyam Baba darshan scenes show the real stills (render-story.mjs): no FLUX image
    // Same prompt as render-story.mjs image() (framePrompt adds lighting, lens and composition; SPS_FRAME_PROMPT=0 = old).
    return import(pathToFileURL(path.join(DIR, 'kaggle.mjs')).href).then(({ framePrompt }) => {
      spec.scenes.forEach((s, i) => {
        if (s.endcard || s.image || !s.prompt || shyam.has(i) || (photos.length && realIdx.includes(i))) return;
        const sc = { ...s, prompt: iconography(s.prompt) };
        list.push({ id: String(i), out: path.join(base, 'images', `${spec.slug}-${i}.jpg`),
          prompt: process.env.SPS_FRAME_PROMPT === '0' ? `${sc.prompt}. ${spec.style}` : framePrompt(sc, spec), seed: s.seed || 42 });
      });
      return list;
    });
  }
  return Promise.resolve(list);
}

// ---- 1. Workers AI ------------------------------------------------------------------------------------------------
async function workersAi(job) {
  const r = await fetch(`${process.env.MEDIA_URL}/ai/flux`, {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.MEDIA_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: job.prompt, steps: 4 }), signal: AbortSignal.timeout(120e3),
  }).catch((e) => ({ status: e.message, json: async () => ({}) }));
  const j = await r.json().catch(() => ({}));
  if (!j.success || !j.result?.image) {
    const msg = JSON.stringify(j.errors || j).slice(0, 200);
    const e = new Error(`Workers AI ${r.status}: ${msg}`);
    e.exhausted = /4006|daily free allocation|neurons/i.test(msg);
    throw e;
  }
  fs.mkdirSync(path.dirname(job.out), { recursive: true });
  fs.writeFileSync(job.out, Buffer.from(j.result.image, 'base64'));
}

// ---- 2. Kaggle GPU ------------------------------------------------------------------------------------------------
function kaggleMjs(args, env) {
  const r = spawnSync(process.execPath, [path.join(DIR, 'kaggle.mjs'), ...args], { encoding: 'utf8', env, maxBuffer: 64 << 20 });
  const out = `${r.stdout || ''}${r.stderr || ''}`.trim();
  console.log(`kaggle ${args[0]}: ${out.split('\n').slice(-2).join(' | ')}`);
  return { ok: r.status === 0, out };
}

async function kaggleFrames(jobs, { waitMin, slot }) {
  const env = { ...process.env, SPS_SLOT: `frames-${slot}` };
  const ds = path.join(DIR, 'dataset');
  fs.rmSync(ds, { recursive: true, force: true });
  fs.mkdirSync(ds, { recursive: true });
  fs.copyFileSync(path.join(DIR, 'kaggle', 'flux_frames.py'), path.join(ds, 'flux_frames.py'));
  const stamp = `frames-${slot}-${Date.now()}`;
  // 1024 px square (what Workers AI makes, and what the renderers expect); a job may ask for another size (multiples of 16).
  // Shyam Baba prompts carry the negative prompt (used only with true CFG, settings.flux.true_cfg > 1) and, with
  // SPS_SHYAM_REF=1, one of the owner's real darshan stills as the reference image (img2img in flux_frames.py; strength
  // SPS_SHYAM_REF_STRENGTH, default 0.6). Off by default until a Kaggle test run of it has been checked by a person.
  const refOn = process.env.SPS_SHYAM_REF === '1';
  const kj = jobs.map((j) => {
    const khatu = KHATU.test(j.prompt) && !/barbari/i.test(j.prompt);
    const ref = refOn && khatu && showsShyamDarshan(j.prompt) ? pickStill(shyamStills(), j.prompt, j.id) : null;
    if (ref) fs.copyFileSync(ref.file, path.join(ds, `ref-${j.id}.jpg`));
    return { id: j.id, flux_prompt: j.prompt, seed: j.seed || 42, ...(j.w ? { w: j.w, h: j.h } : {}), ...(khatu ? { negative: KHATU_NEGATIVE } : {}),
      ...(ref ? { init_image: `ref-${j.id}.jpg`, strength: Number(process.env.SPS_SHYAM_REF_STRENGTH || 0.6), ref_focus: [ref.focus?.x ?? 0.5, ref.focus?.y ?? 0.5] } : {}) };
  });
  fs.writeFileSync(path.join(ds, 'jobs.json'), JSON.stringify({ stamp, settings: { flux: { size: 1024, steps: 8 } }, jobs: kj }, null, 2));
  if (!kaggleMjs(['upload'], env).ok) return { error: 'dataset upload failed' };
  // No `lock`: this session is short, and push already retries while the account runs its 2 GPU sessions.
  if (!kaggleMjs(['push', '--queue-minutes', '25', '--retry-minutes', '30'], env).ok) return { error: 'kernel push failed' };
  const w = kaggleMjs(['wait', '--minutes', String(waitMin), '--queue-minutes', '25'], env);
  const tmp = path.join(DIR, 'kaggle-frames');
  fs.rmSync(tmp, { recursive: true, force: true });
  const f = kaggleMjs(['fetch', '--to', tmp], env);
  let got = {};
  try { got = JSON.parse(f.out.split('\n').filter((l) => l.startsWith('{')).pop()); } catch { /* none */ }
  let made = 0;
  for (const j of jobs) {
    const png = path.join(tmp, `${j.id}.png`);
    if (!got.fresh || !fs.existsSync(png)) continue;
    fs.mkdirSync(path.dirname(j.out), { recursive: true });
    const r = spawnSync(FF, ['-y', '-v', 'error', '-i', png, '-q:v', '2', j.out], { encoding: 'utf8' });
    if (r.status !== 0 || !fs.existsSync(j.out)) fs.copyFileSync(png, j.out); // no ffmpeg: PNG bytes (readers sniff the content)
    if (fs.existsSync(j.out)) { made++; j.source = 'kaggle'; }
  }
  return { made, wait: w.out.split('\n').pop(), session_s: got.session_s, flux: got.flux };
}

// ---- main ---------------------------------------------------------------------------------------------------------
export async function ensureImages(jobs, { kaggleFirst = false, workersAfter = false, kaggle = true, waitMin = 40, slot = 'pilot', dryRun = false, log = console.log, allowance = Infinity } = {}) {
  const todo = jobs.filter((j) => !fs.existsSync(j.out));
  const ledger = { asked: jobs.length, cached: jobs.length - todo.length, workers_ai: 0, workers_ai_neurons: 0, kaggle: 0, missing: 0, exhausted: false, allowance, held: 0 };
  const allowed = () => ledger.workers_ai < allowance || (ledger.held++, false);
  if (dryRun) { log(JSON.stringify({ dryRun: true, todo: todo.map((j) => ({ id: j.id, out: path.relative(ROOT, j.out) })) })); return ledger; }
  const canWorkers = process.env.MEDIA_URL && process.env.MEDIA_TOKEN && !kaggleFirst && process.env.SPS_WORKERS_AI !== '0';
  const left = [];
  for (const j of todo) {
    if (!canWorkers || ledger.exhausted || !allowed()) { left.push(j); continue; }
    try {
      await workersAi(j); ledger.workers_ai++; j.source = 'workers-ai';
    } catch (e) {
      log(`image ${j.id}: ${e.message}`);
      if (e.exhausted) ledger.exhausted = true;
      left.push(j);
    }
  }
  ledger.workers_ai_neurons = ledger.workers_ai * NEURONS_PER_IMAGE;
  const hasKaggle = process.env.KAGGLE_API_TOKEN || process.env.KAGGLE_CLI || fs.existsSync(path.join(process.env.HOME || process.env.USERPROFILE || '', '.kaggle'));
  if (left.length && kaggle && hasKaggle) {
    log(`${left.length} image(s) left for Kaggle FLUX.1-schnell (sps-frames-${slot})`);
    const k = await kaggleFrames(left, { waitMin, slot });
    ledger.kaggle = k.made || 0;
    ledger.kaggle_detail = k;
  }
  // --kaggle-first: Workers AI for whatever Kaggle did not make (never for pilots: they pass --kaggle only).
  if (kaggleFirst && workersAfter && process.env.MEDIA_URL && process.env.MEDIA_TOKEN && process.env.SPS_WORKERS_AI !== '0') {
    for (const j of left.filter((x) => x.source !== 'kaggle')) {
      if (ledger.exhausted || !allowed()) break;
      try { await workersAi(j); ledger.workers_ai++; j.source = 'workers-ai'; } catch (e) { log(`image ${j.id}: ${e.message}`); if (e.exhausted) ledger.exhausted = true; }
    }
    ledger.workers_ai_neurons = ledger.workers_ai * NEURONS_PER_IMAGE;
  }
  ledger.missing = left.filter((j) => !j.source).length;
  // held back by the neuron budget and still missing: the renderers must not make them with Workers AI either
  if (ledger.held && ledger.missing) writeWorkersAiMarker(path.dirname(left.find((j) => !j.source).out), { slot, allowance });
  ledger.sources = Object.fromEntries(jobs.map((j) => [j.id, j.source || (fs.existsSync(j.out) ? 'cached' : 'fallback')]));
  return ledger;
}

const MAIN = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (MAIN) {
  const args = process.argv.slice(2);
  const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
  const slot = (process.env.SPS_SLOT || 'pilot').replace(/^frames-/, '');
  let jobs;
  if (opt('--jobs')) {
    jobs = JSON.parse(fs.readFileSync(opt('--jobs'), 'utf8')).map((j, k) => ({ id: j.id || `j${k}`, ...j, prompt: iconography(j.prompt), out: path.resolve(j.out) }));
  } else {
    const specFile = path.resolve(args.find((a) => a.endsWith('.json')));
    jobs = await wanted(specFile, args.includes('--long') ? 'long' : opt('--visuals') ? 'visuals' : 'story', opt('--visuals') && path.resolve(opt('--visuals')));
  }
  let budget = { max: Infinity, why: 'no budget (--no-budget)' };
  if (!args.includes('--no-budget')) {
    let logText = '';
    try { logText = fs.readFileSync(path.join(ROOT, 'automation', 'log.md'), 'utf8'); } catch { /* none */ }
    budget = workersAiAllowance(slot, { log: logText });
  }
  console.log(`Workers AI budget: ${budget.why}`);
  const ledger = await ensureImages(jobs, {
    kaggleFirst: args.includes('--kaggle') || args.includes('--kaggle-first'), workersAfter: args.includes('--kaggle-first'), kaggle: !args.includes('--no-kaggle'), waitMin: Number(opt('--wait', 40)), slot, dryRun: args.includes('--dry-run'),
    allowance: budget.max,
  });
  const line = `- Images (${slot}): ${ledger.asked} needed, ${ledger.cached} cached, Workers AI ${ledger.workers_ai} (~${ledger.workers_ai_neurons} neurons)` +
    `${ledger.exhausted ? ' then 4006 (daily neurons used up)' : ''}, Kaggle FLUX ${ledger.kaggle}` +
    `${ledger.kaggle_detail?.session_s ? ` (${Math.round(ledger.kaggle_detail.session_s / 60)} GPU-min)` : ''}, left for bank/photo fallback ${ledger.missing}` +
    `${ledger.held ? `; ${ledger.held} held back by the neuron budget (${budget.why})` : ''}`;
  console.log(line);
  console.log(JSON.stringify(ledger));
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n`);
}
