// Renders a narrated vertical story video from scenes.json:
//   node render-story.mjs scenes.json
// Images: FLUX.1-schnell on Cloudflare Workers AI (free daily allocation), cached in images/.
// Animated mode: a scene with "video" (an image-to-video clip, see animate/) uses that real motion,
// upscaled to the same 1080 px square, instead of the zoompan camera move; if the clip is missing or
// ANIMATED=0 is set, the scene falls back to the still image + zoompan.
// Real temple photos: when the spec names a `temple` and footage/<temple>/ holds licence-checked photos
// (scripts/real-photos.mjs: Wikimedia Commons, CC0 / PD / CC BY), scenes marked `real: true` (temple exterior or
// interior) show those photos with a gentle Ken Burns move instead of the AI image or clip, labelled "Asli photo:
// <author>", and every photo shown is credited at the end of the description and captions (the spec is updated).
// Status videos (spec.format "status", story/status/<date>.json): the festival "WhatsApp status" Short; each scene's
// big Hindi blessing, mantra and the end line are drawn by story/status-overlays.mjs (headless Chrome, so Devanagari
// and the emoji render correctly) and laid over the frame instead of the subtitles.
// Voice: edge-tts made human (voice/humanize.py: sentence-by-sentence mood prosody + jitter, pauses, soft breaths,
// EQ / de-ess / compression / a small room; SPS_HUMAN_VOICE=0 = the old single-request chain; Kokoro fallback).
// Music: synthesized drone + bell. Ambience (Nov 2026): a synthesized bed picked
// from the scenes (temple air, crowd murmur, diya crackle, distant bells at scene changes; no third-party audio),
// ducked under the voice with a sidechain compressor, then the whole mix to -14 LUFS.
// Look (Nov 2026, animate/REPORT.md section 10): a light warm grade + vignette, subtle temporal film grain and a
// sharpen pass on every scene picture (SPS_LOOK=0 turns it off). Upscaled stills from the Kaggle kernel
// (STILLS_DIR, default <spec dir>/stills/<scene>.jpg, Real-ESRGAN 2160 px) replace the 1024 px FLUX images, and
// enhanced clips (30 fps, 1080 px, already at the scene's length) are used as they are. Output: out/<slug>.mp4
// Cover frame (Nov 2026 hook study, story/cover.mjs): the first ~0.4 s carries 2-4 huge Devanagari words (spec.cover)
// over the moving scene-1 close-up, so the opening frame is thumbnail-grade; the hook text follows until 2.6 s, the
// voice starts at 0.12 s (no dead air) and long subtitles change every ~2-3 s instead of once per scene.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { creditLine, photosFor } from '../scripts/real-photos.mjs';
import { framePrompt } from '../animate/kaggle.mjs';
import { makeCover } from './cover.mjs';
import { fallbackImage, iconography } from '../animate/frames.mjs';

const FF = process.env.FFMPEG_PATH || 'E:/tools/ffmpeg/bin/ffmpeg.exe';
const FFPROBE = FF.replace(/ffmpeg(\.exe)?$/, 'ffprobe$1');
const PYTHON = process.env.PYTHON || 'E:/tools/kokoro/venv/Scripts/python.exe';
const KOKORO = process.env.KOKORO_DIR || 'E:/tools/kokoro';
const ACCOUNT = process.env.CF_ACCOUNT_ID || 'cc7da560c73a0539ed32313476555d4a';
const FONT = process.env.SUB_FONT || 'C\\:/Windows/Fonts/segoeuib.ttf';
const W = 1080, H = 1920, FPS = 30, FADE = 0.4;
// Title bar: shrink the font so "kicker | title" fits beside the logo (bold fonts are ~0.62 em per character).
const titleSize = (text) => Math.max(26, Math.min(40, Math.floor(860 / (0.62 * text.length))));
const LOGO_FILE = process.env.LOGO || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../brand/logo.png');
const LOGO = fs.existsSync(LOGO_FILE) ? LOGO_FILE : null;

const specFile = path.resolve(process.argv[2] || 'scenes.json');
const base = path.dirname(specFile);
const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
const work = path.join(base, 'build', spec.slug);
fs.mkdirSync(path.join(base, 'images'), { recursive: true });
fs.mkdirSync(work, { recursive: true });
const STATUS = spec.format === 'status';

// Real photos for the `real: true` scenes, in turn (none: those scenes keep the AI image).
const photos = photosFor(spec.temple);
const realIdx = spec.scenes.map((s, i) => (s.real && !s.endcard ? i : -1)).filter((i) => i >= 0);
const photoFor = (i) => (photos.length && realIdx.includes(i) ? photos[realIdx.indexOf(i) % photos.length] : null);
const usedPhotos = [];
if (spec.temple) console.log(`real photos for ${spec.temple}: ${photos.length}${photos.length ? `, used on scenes ${realIdx.map((i) => i + 1).join(', ')}` : ''}`);

function cfToken() {
  if (process.env.CF_API_TOKEN) return process.env.CF_API_TOKEN;
  const cfg = fs.readFileSync(path.join(process.env.APPDATA || '', 'xdg.config/.wrangler/config/default.toml'), 'utf8');
  return cfg.match(/oauth_token\s*=\s*"([^"]+)"/)[1];
}

const STILLS = process.env.STILLS_DIR ? path.resolve(process.env.STILLS_DIR) : path.join(base, 'stills');
const LOOK_ON = process.env.SPS_LOOK !== '0';
// Warm grade + soft vignette on the scene picture; grain is added last so it is not blurred by scaling.
const LOOK = LOOK_ON ? ',eq=contrast=1.05:saturation=1.07:gamma=0.98,colorbalance=rs=0.015:bs=-0.02:rm=0.02:bm=-0.025:rh=0.02:bh=-0.02,vignette=angle=PI/7' : '';
const GRAIN = LOOK_ON ? ',noise=c0s=5:c0f=t+u' : '';

// Workers AI out of neurons (4006) or down: animate/frames.mjs normally made the image on the Kaggle GPU already (the
// workflow runs it first); if not, a bank picture / real photo / plain background stands in (never a failed post).
const fellBack = new Map(); // scene index -> { file, photo?, source }
let workersAiDown = false;
let workersAiImages = 0;
async function image(scene, i) {
  if (scene.image) return path.resolve(base, scene.image);
  if (fellBack.has(i)) return fellBack.get(i).file;
  try {
    return await workersImage(scene, i);
  } catch (e) {
    workersAiDown = workersAiDown || /4006|allocation|neurons/i.test(e.message);
    const fb = fallbackImage(spec, scene.prompt, i, work);
    console.log(`::warning::${e.message.slice(0, 200)}; scene ${i + 1} uses ${fb.source}`);
    fellBack.set(i, fb);
    return fb.file;
  }
}
async function workersImage(scene, i) {
  // Real-ESRGAN 2160 px still from the Kaggle kernel (same picture as the clip's start frame), not during --prepare.
  const up = path.join(STILLS, `${i}.jpg`);
  if (!process.argv.includes('--prepare') && fs.existsSync(up)) return up;
  const file = path.join(base, 'images', `${spec.slug}-${i}.jpg`);
  if (fs.existsSync(file)) return file;
  if (workersAiDown || process.env.SPS_WORKERS_AI === '0') throw new Error('Workers AI skipped (4006 earlier in this run or SPS_WORKERS_AI=0)');
  // In CI the media Worker runs FLUX through its AI binding (no Cloudflare API token needed);
  // locally the Workers AI REST API is called with the wrangler login.
  const viaWorker = process.env.MEDIA_URL && process.env.MEDIA_TOKEN;
  const res = await fetch(viaWorker ? `${process.env.MEDIA_URL}/ai/flux`
    : `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/ai/run/@cf/black-forest-labs/flux-1-schnell`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${viaWorker ? process.env.MEDIA_TOKEN : cfToken()}`, 'Content-Type': 'application/json' },
    // Lighting, lens and composition added to every image prompt (same neurons); SPS_FRAME_PROMPT=0 = the old prompt.
    body: JSON.stringify({ prompt: process.env.SPS_FRAME_PROMPT === '0' ? `${iconography(scene.prompt)}. ${spec.style}` : framePrompt({ ...scene, prompt: iconography(scene.prompt) }, spec), steps: 4 }),
  });
  const j = await res.json().catch(() => ({ errors: [`HTTP ${res.status}`] }));
  if (!j.success) throw new Error(`image ${i}: ${JSON.stringify(j.errors)}`);
  fs.writeFileSync(file, Buffer.from(j.result.image, 'base64'));
  workersAiImages++;
  return file;
}

// Voice: Microsoft's neural Hindi voices through edge-tts (much more natural than Kokoro, no account
// needed). Kokoro is the fallback when edge-tts fails. TTS_ENGINE=kokoro forces the old voice.
const EDGE_VOICES = { hm_omega: 'hi-IN-MadhurNeural', hf_alpha: 'hi-IN-SwaraNeural' };
let voiceExt = 'wav';

function ttsEdge() {
  return spec.scenes.map((s, i) => {
    const voice = EDGE_VOICES[s.voice || spec.voice || 'hm_omega'] || EDGE_VOICES.hm_omega;
    const out = path.join(work, `voice-${i}.mp3`);
    const r = spawnSync(PYTHON, ['-m', 'edge_tts', '--voice', voice, '--rate=+0%', '--text', s.tts, '--write-media', out], { encoding: 'utf8' });
    if (r.status !== 0 || !fs.existsSync(out)) throw new Error(`edge-tts line ${i}: ${(r.stderr || '').trim().split('\n').pop()}`);
    const d = spawnSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out], { encoding: 'utf8' });
    return Number(d.stdout.trim());
  });
}

// Human chain (default since 10 Nov 2026): one batch through voice/humanize.py. Every scene after the first gets a
// 0.3 s lead (it may hold a soft breath) and is placed that much earlier, so the words still start where they did.
// Emotional / serious / mantra scenes hold 0.2 s longer before the next scene.
const HUMAN = process.env.SPS_HUMAN_VOICE !== '0';
const HUMAN_LEAD = 0.3;
const leads = spec.scenes.map(() => 0);
const extraHold = spec.scenes.map(() => 0);
function ttsHuman() {
  const items = spec.scenes.map((s, i) => ({
    text: s.tts, voice: s.voice || spec.voice || 'hm_omega', mood: s.mood, out: path.join(work, `voice-${i}.wav`), lead: i === 0 ? 0 : HUMAN_LEAD,
  }));
  const job = path.join(work, 'voice-job.json');
  fs.writeFileSync(job, JSON.stringify({ items, concurrency: 5 }));
  const r = spawnSync(PYTHON, ['-I', path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../voice/humanize.py'), job],
    { encoding: 'utf8', env: { ...process.env, FFMPEG_PATH: FF }, maxBuffer: 1 << 24 });
  if (r.status !== 0) throw new Error(`humanize: ${(r.stderr || '').trim().split('\n').pop()}`);
  const res = JSON.parse(r.stdout.trim().split('\n').pop());
  const bad = res.find((x) => x.error);
  if (bad) throw new Error(`humanize: ${bad.error}`);
  res.forEach((x, i) => { leads[i] = x.lead; extraHold[i] = ['emotional', 'serious', 'mantra'].includes(x.last_mood) ? 0.2 : 0; });
  return res.map((x) => x.speech_s);
}

// Chatterbox narration made on the Kaggle GPU (voice/chatterbox_tts.py): used when VOICE_DIR holds a voice.json in
// which every line succeeded; otherwise edge-tts (then Kokoro) makes the voice here.
function ttsPremade() {
  const dir = process.env.VOICE_DIR && path.resolve(process.env.VOICE_DIR);
  const meta = dir && path.join(dir, 'voice.json');
  if (!meta || !fs.existsSync(meta)) return null;
  const lines = JSON.parse(fs.readFileSync(meta, 'utf8')).lines;
  if (spec.scenes.some((_, i) => !lines.find((l) => l.i === i && l.ok) || !fs.existsSync(path.join(dir, `voice-${i}.wav`)))) return null;
  return spec.scenes.map((_, i) => {
    fs.copyFileSync(path.join(dir, `voice-${i}.wav`), path.join(work, `voice-${i}.wav`));
    return lines.find((l) => l.i === i).seconds;
  });
}

function tts() {
  const premade = !process.argv.includes('--prepare') && ttsPremade();
  if (premade) {
    console.log('voice: Chatterbox (made on Kaggle)');
    voiceExt = 'wav';
    return premade;
  }
  if (process.env.TTS_ENGINE !== 'kokoro' && HUMAN) {
    try {
      const durations = ttsHuman();
      voiceExt = 'wav';
      console.log('voice: edge-tts, human chain (voice/humanize.py)');
      return durations;
    } catch (e) {
      leads.fill(0); extraHold.fill(0);
      console.log(`human voice chain failed, using plain edge-tts: ${e.message}`);
    }
  }
  if (process.env.TTS_ENGINE !== 'kokoro') {
    try {
      const durations = ttsEdge();
      voiceExt = 'mp3';
      return durations;
    } catch (e) {
      console.log(`edge-tts failed, using Kokoro: ${e.message}`);
    }
  }
  return ttsKokoro();
}

function ttsKokoro() {
  const lines = path.join(work, 'lines.txt');
  fs.writeFileSync(lines, spec.scenes.map((s) => s.tts).join('\n'));
  const py = `
import soundfile as sf, json
from kokoro_onnx import Kokoro
k = Kokoro(r"${KOKORO}/kokoro-v1.0.onnx", r"${KOKORO}/voices-v1.0.bin")
out = []
for i, line in enumerate(open(r"${lines}", encoding="utf-8").read().split("\\n")):
    s, r = k.create(line, voice="${spec.voice || 'hm_omega'}", speed=0.9, lang="hi")
    sf.write(r"${work}/voice-%d.wav" % i, s, r)
    out.append(len(s) / r)
print(json.dumps(out))`;
  const r = spawnSync(PYTHON, ['-c', py], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr);
  return JSON.parse(r.stdout.trim().split('\n').pop());
}

// Wrap subtitle text to lines of at most n characters.
const wrap = (text, n = 30) => text.split(' ').reduce((lines, word) => {
  const last = lines[lines.length - 1];
  if (last && (last + ' ' + word).length <= n) lines[lines.length - 1] = `${last} ${word}`;
  else lines.push(word);
  return lines;
}, []).join('\n');

// Splits a subtitle into 2-3 parts when it is long and spoken for more than ~4.5 s, preferring breaks after punctuation;
// each part gets the share of the voice time its characters take ({ text, from: 0-1 }).
function subParts(sub, seconds) {
  const words = String(sub || '').split(' ').filter(Boolean);
  const n = words.length < 7 || seconds < 4.5 ? 1 : Math.min(3, Math.round(seconds / 2.6));
  if (n <= 1) return [{ text: sub || '', from: 0 }];
  const total = words.join(' ').length;
  const at = (k) => words.slice(0, k).join(' ').length; // characters before word k
  const cuts = [];
  for (let j = 1; j < n; j++) {
    let best = 0, cost = Infinity;
    for (let k = (cuts.at(-1) || 0) + 2; k <= words.length - 2; k++) {
      const c = Math.abs(at(k) - (total * j) / n) - (/[,.!?;:।]$/.test(words[k - 1]) ? total * 0.15 : 0);
      if (c < cost) { cost = c; best = k; }
    }
    if (best) cuts.push(best);
  }
  const bounds = [0, ...cuts, words.length];
  return bounds.slice(0, -1).map((k, j) => ({ text: words.slice(k, bounds[j + 1]).join(' '), from: k ? (at(k) + 1) / total : 0 }));
}

const motion = (kind, frames) => ({
  in: `z='1+0.14*on/${frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`,
  out: `z='1.14-0.14*on/${frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`,
  pan: `z='1.14':x='(iw-iw/zoom)*on/${frames}':y='ih/2-(ih/zoom/2)'`,
})[kind] || '';

function run(args) {
  const r = spawnSync(FF, ['-y', '-hide_banner', '-loglevel', 'error', ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr);
}

// The scene's animated clip, if it has one and animated mode is on.
const videoFor = (scene) => {
  if (!scene.video || process.env.ANIMATED === '0') return null;
  const file = path.resolve(base, scene.video);
  return fs.existsSync(file) ? file : (console.log(`no clip ${scene.video}, using the still image`), null);
};
const probeSeconds = (file) => Number(spawnSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }).stdout.trim());

const durations = tts();
// `hold` (status videos) keeps a scene on screen longer than its narration.
const sceneSeconds = (i) => Math.max(2.6, spec.scenes[i].hold || 0, durations[i] + 0.7 + extraHold[i]);

// --prepare: only make the FLUX images and measure each scene's length, for the image-to-video step
// (animate/kaggle.mjs prepare --plan). Writes build/<slug>/plan.json; the full render runs later.
if (process.argv.includes('--prepare')) {
  const plan = { slug: spec.slug, scenes: [] };
  for (const [i, scene] of spec.scenes.entries()) {
    if (scene.endcard || photoFor(i)) continue; // a real photo is shown as it is: no AI image, no animation
    const img = await image(scene, i);
    if (fellBack.has(i)) continue; // a bank picture / real photo stand-in is not animated (zoompan in the render)
    plan.scenes.push({ i, image: img, seconds: Number(sceneSeconds(i).toFixed(2)) });
  }
  console.log(`- Images (render-story --prepare): Workers AI ${workersAiImages} (~${workersAiImages * 326} neurons), fallback ${fellBack.size}${fellBack.size ? ` (${[...fellBack.values()].map((f) => f.source).join(', ')})` : ''}`);
  fs.writeFileSync(path.join(work, 'plan.json'), JSON.stringify(plan, null, 2));
  console.log(JSON.stringify({ plan: path.join(work, 'plan.json'), scenes: plan.scenes.length }));
  process.exit(0);
}

const overlays = STATUS ? (await import('./status-overlays.mjs')).makeOverlays(spec, work) : [];
// Status Shorts already open on the big blessing (shown from frame one below), so they need no extra cover.
let COVER = null;
if (!STATUS) {
  try { COVER = makeCover(spec, path.join(work, 'cover.png')); } catch (e) { console.log(`cover frame skipped: ${e.message}`); }
}
const COVER_END = 0.4; // seconds the cover words stay before they fade out (0.08 s)
const VOICE_START = 0.12; // the first line starts almost at once: no dead air
const clips = [];
for (const [i, scene] of spec.scenes.entries()) {
  const photo = scene.endcard ? null : photoFor(i);
  const vid = scene.endcard || photo ? null : videoFor(scene);
  // Status: the scene's overlay (big blessing / mantra / end line) fades in over the finished frame.
  const ov = overlays[i] && fs.existsSync(overlays[i]) ? overlays[i] : null;
  const ovIn = ov ? ['-loop', '1', '-framerate', String(FPS), '-t', String(30), '-i', ov] : [];
  // Scene 1 of a status Short shows its blessing from the first frame (that frame is the cover); later scenes fade it in.
  const withOverlay = (n) => (ov ? `[vpre];[${n}:v]format=rgba${i === 0 ? '' : ',fade=t=in:st=0.25:d=0.6:alpha=1'}[ovl];[vpre][ovl]overlay=0:0:shortest=1` : '');
  const cover = i === 0 && COVER && !scene.endcard;
  const coverIn = cover ? ['-loop', '1', '-framerate', String(FPS), '-t', '1', '-i', COVER] : [];
  const withCover = (n) => (cover ? `[vcov];[${n}:v]format=rgba,fade=t=out:st=${COVER_END}:d=0.08:alpha=1[cov];[vcov][cov]overlay=0:0:eof_action=pass` : '');
  const coverAt = (LOGO ? 2 : 1) + (ov ? 1 : 0);
  let animated = false;
  // Tight pacing keeps Shorts short (viewers who finish and replay are what YouTube rewards).
  const seconds = sceneSeconds(i);
  const frames = Math.round(seconds * FPS);
  const titleFile = path.join(work, 'title.txt');
  fs.writeFileSync(titleFile, `${spec.kicker}  |  ${spec.title}`);
  const esc = (p) => p.replace(/\\/g, '/').replace(/:/g, '\\:');
  const clip = path.join(work, `clip-${i}.mp4`);
  // Subtitles: a long line is split into 2-3 parts timed to the voice, so the on-screen text changes every ~2-3 s.
  const voiceAt = i === 0 ? VOICE_START : FADE + 0.15;
  const parts = subParts(scene.sub, durations[i]);
  const subtitle = STATUS ? 'null' : parts.map((p, k) => {
    const file = path.join(work, `sub-${i}-${k}.txt`);
    fs.writeFileSync(file, wrap(p.text));
    const a = k === 0 ? (cover ? COVER_END : 0) : voiceAt + p.from * durations[i];
    const b = k === parts.length - 1 ? 999 : voiceAt + parts[k + 1].from * durations[i];
    return `drawtext=fontfile='${FONT}':textfile='${esc(file)}':fontsize=50:fontcolor=white:line_spacing=12:` +
      `box=1:boxcolor=0x000000@0.55:boxborderw=22:x=(w-text_w)/2:y=1385:enable='between(t,${a.toFixed(2)},${b.toFixed(2)})'`;
  }).join(',');
  // Hook: big text over the first scene until 2.6 s (after the cover words), the moment viewers decide whether to keep
  // watching. It sits on the lower part of the picture so the deity's face stays clear.
  const hookFile = path.join(work, 'hook.txt');
  if (i === 0 && spec.hook) fs.writeFileSync(hookFile, wrap(spec.hook, 18));
  const hook = i === 0 && spec.hook && !STATUS
    ? `,drawtext=fontfile='${FONT}':textfile='${esc(hookFile)}':fontsize=84:fontcolor=0xFFE27A:line_spacing=14:` +
      `box=1:boxcolor=0x1a0b00@0.72:boxborderw=34:x=(w-text_w)/2:y=1075:enable='between(t,${cover ? COVER_END - 0.04 : 0},2.6)'`
    : '';
  const encode = ['-map', '[v]', '-frames:v', String(frames), '-r', String(FPS), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '19', clip];
  if (scene.endcard && LOGO) {
    // End card: the channel logo on deep blue, fading in, with the sign-off line.
    const signFile = path.join(work, 'signoff.txt');
    fs.writeFileSync(signFile, spec.signoff || 'Jai Shree Shyam');
    run(['-f', 'lavfi', '-i', `color=c=0x0b1430:s=${W}x${H}:r=${FPS}:d=${seconds.toFixed(2)}`,
      '-loop', '1', '-framerate', String(FPS), '-t', seconds.toFixed(2), '-i', LOGO, ...ovIn, '-filter_complex', [
      `[1:v]scale=820:820,format=rgba,fade=t=in:st=0:d=0.9:alpha=1[lg]`,
      `[0:v][lg]overlay=(W-w)/2:${STATUS ? 220 : 330},` +
        `drawtext=fontfile='${FONT}':textfile='${esc(signFile)}':fontsize=76:fontcolor=0xFFD877:x=(w-text_w)/2:y=${STATUS ? 1090 : 1210},${subtitle}${withOverlay(2)}[v]`,
    ].join(';'), ...encode]);
  } else {
    if (vid) {
      // Animated clip: stretched up to 1.3x slower when it is shorter than the narration, then the last
      // frame is held; the same moving clip, blurred, fills the background.
      const slow = Math.min(1.3, Math.max(1, seconds / (probeSeconds(vid) || seconds)));
      // An enhanced clip is already 1080 px (Real-ESRGAN): only a light sharpen; a raw 704 px clip keeps the old one.
      const big = Number(spawnSync(FFPROBE, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width', '-of', 'csv=p=0', vid], { encoding: 'utf8' }).stdout.trim()) >= 1000;
      try {
        run(['-i', vid, ...(LOGO ? ['-i', LOGO] : []), ...ovIn, ...coverIn, '-filter_complex', [
          `[0:v]setpts=${slow.toFixed(3)}*PTS,fps=${FPS},tpad=stop_mode=clone:stop_duration=${seconds.toFixed(2)},` +
            `trim=duration=${seconds.toFixed(2)},setpts=PTS-STARTPTS,format=yuv420p,split[a][b]`,
          `[a]scale=${H}:${H},crop=${W}:${H},boxblur=28:4,eq=brightness=-0.18[bgl]`,
          `[b]scale=${W}:${W}:flags=lanczos,${big ? 'unsharp=3:3:0.3' : 'unsharp=5:5:0.6'}${LOOK}${GRAIN}[fg]`,
          ...(LOGO ? [`[1:v]scale=124:124[lg]`] : []),
          `[bgl][fg]overlay=0:250${LOGO ? '[base];[base][lg]overlay=36:110' : ''},` +
            `drawtext=fontfile='${FONT}':textfile='${esc(titleFile)}':fontsize=${titleSize(`${spec.kicker}  |  ${spec.title}`)}:fontcolor=0xFFE7A8:x=${LOGO ? 180 : '(w-text_w)/2'}:y=152,${subtitle}${hook}${withOverlay(LOGO ? 2 : 1)}${withCover(coverAt)}[v]`,
        ].join(';'), ...encode]);
        animated = true;
      } catch (e) {
        console.log(`animated scene ${i + 1} failed, using zoompan: ${e.message.split('\n')[0]}`);
      }
    }
    // Still path (and fallback): blurred cover background + the square scene image with a slow camera
    // move + subtitles, with the channel logo as a small watermark next to the title.
    if (!animated) {
      // A real photo (any aspect) is cover-cropped to the square; an AI image is already square. A stand-in picture
      // (fellBack: bank / real photo / plain) may have any aspect too; a real photo stand-in is credited like `real`.
      const img = photo ? photo.file : await image(scene, i);
      const fb = photo ? null : fellBack.get(i);
      const shot = photo || fb?.photo || null;
      const anyAspect = Boolean(photo || fb);
      const cover = (w, h) => (anyAspect ? `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},setsar=1` : `scale=${h}:${h},crop=${w}:${h}`);
      let credit = '';
      if (shot) {
        if (!usedPhotos.includes(shot)) usedPhotos.push(shot);
        const cf = path.join(work, `photo-${i}.txt`);
        fs.writeFileSync(cf, `Asli photo: ${shot.author}`.slice(0, 60));
        credit = `,drawtext=fontfile='${FONT}':textfile='${esc(cf)}':fontsize=26:fontcolor=white@0.9:box=1:boxcolor=0x000000@0.45:boxborderw=8:x=w-text_w-24:y=1290`;
      }
      run(['-i', img, ...(LOGO ? ['-i', LOGO] : []), ...ovIn, ...coverIn, '-filter_complex', [
        `[0:v]${cover(W, H)},boxblur=28:4,eq=brightness=-0.18[bg]`,
        `[0:v]${anyAspect ? cover(2160, 2160) : 'scale=2160:2160:flags=lanczos'},zoompan=${motion(scene.motion, frames)}:d=${frames}:s=${W}x${W}:fps=${FPS}${shot ? '' : `,unsharp=3:3:0.3${LOOK}${GRAIN}`}[fg]`,
        `[bg]loop=loop=${frames}:size=1,fps=${FPS}[bgl]`,
        ...(LOGO ? [`[1:v]scale=124:124[lg]`] : []),
        `[bgl][fg]overlay=0:250:shortest=1${LOGO ? '[base];[base][lg]overlay=36:110' : ''},` +
          `drawtext=fontfile='${FONT}':textfile='${esc(titleFile)}':fontsize=${titleSize(`${spec.kicker}  |  ${spec.title}`)}:fontcolor=0xFFE7A8:x=${LOGO ? 180 : '(w-text_w)/2'}:y=152${credit},${subtitle}${hook}${withOverlay(LOGO ? 2 : 1)}${withCover(coverAt)}[v]`,
      ].join(';'), ...encode]);
    }
  }
  clips.push({ file: clip, seconds, voice: path.join(work, `voice-${i}.${voiceExt}`) });
  console.log(`scene ${i + 1}/${spec.scenes.length}: ${seconds.toFixed(1)}s${animated ? ' (animated)' : photo ? ' (real photo)' : fellBack.has(i) ? ` (stand-in: ${fellBack.get(i).source})` : ''}`);
}

// Join with crossfades; place each narration line at its scene's start; add music.
let total = clips[0].seconds;
const f = [];
let prev = '0:v';
for (let i = 1; i < clips.length; i++) {
  f.push(`[${prev}][${i}:v]xfade=transition=fade:duration=${FADE}:offset=${(total - FADE).toFixed(2)}[x${i}]`);
  total += clips[i].seconds - FADE;
  prev = `x${i}`;
}
const n = clips.length;
// Scene start times (the voice timing below uses the same arithmetic).
const starts = clips.map((_, i) => clips.slice(0, i).reduce((a, c) => a + c.seconds - FADE, 0));
// Ambience bed, all synthesized here: which layers depends on the scenes (spec.ambience overrides: temple | aarti |
// nature | quiet | none).
const words = spec.scenes.map((s) => `${s.prompt || ''} ${s.animate || ''}`).join(' ').toLowerCase();
const PLACE = /temple|mandir|courtyard|devotee|darshan|murti/;
const amb = spec.ambience || (/aarti|diya|lamp|flame/.test(words) && PLACE.test(words) ? 'aarti'
  : PLACE.test(words) ? 'temple' : /forest|grove|river|mountain|field|village|sky|garden/.test(words) ? 'nature' : 'quiet');
const T = total.toFixed(2);
// Music engine (music/engine.mjs, off unless the repo variable MUSIC_ENGINE=on): a licence-checked library track takes
// the drone's place in the ducked bed; any problem keeps the drone. The pick is saved as spec.music (7-day no-repeat).
let music = null;
if (process.env.MUSIC_ENGINE === 'on') {
  try { music = (await import('../music/engine.mjs')).musicFor(spec); } catch (e) { console.log(`music engine skipped: ${e.message}`); }
  if (music) { spec.music = music.meta; console.log(`music: ${music.meta.id} (${music.meta.mood})`); }
}
const layers = amb === 'none' ? [] : [
  // temple air / wind: brown noise, low-passed, slowly breathing
  `anoisesrc=color=brown:amplitude=0.6:seed=7:d=${T},lowpass=f=${amb === 'nature' ? 900 : 380},tremolo=f=0.11:d=0.55,volume=${amb === 'nature' ? 0.16 : 0.09}`,
  // distant crowd murmur: band-passed pink noise with syllable-rate and phrase-rate modulation
  ...(['temple', 'aarti'].includes(amb) ? [`anoisesrc=color=pink:amplitude=0.5:seed=11:d=${T},bandpass=f=520:width_type=h:w=520,tremolo=f=3.3:d=0.55,tremolo=f=0.31:d=0.6,lowpass=f=1400,volume=0.07`] : []),
  // diya crackle: sparse random clicks, band-limited
  ...(['aarti', 'temple'].includes(amb) ? [`aevalsrc='if(lt(random(0),${amb === 'aarti' ? 0.0009 : 0.0004}),(random(1)-0.5)*1.4,0)':s=48000:d=${T},highpass=f=1800,lowpass=f=7500,volume=${amb === 'aarti' ? 0.5 : 0.3}`] : []),
];
// Distant temple bell (inharmonic partials) at each later scene change.
const bellAt = amb === 'quiet' || amb === 'none' ? [] : starts.slice(1).filter((t) => t > 1 && t < total - 2.5);
const bell2 = `aevalsrc='0.20*sin(2*PI*587*t)*exp(-1.6*t)+0.12*sin(2*PI*1620*t)*exp(-2.4*t)+0.07*sin(2*PI*3170*t)*exp(-3.6*t)+0.04*sin(2*PI*5240*t)*exp(-5*t)':s=48000:d=4`;
const drone = `aevalsrc='0.09*sin(2*PI*138.59*t)*(1+0.25*sin(2*PI*0.18*t))+0.06*sin(2*PI*207.65*t)*(1+0.25*sin(2*PI*0.23*t))+0.045*sin(2*PI*277.18*t)|0.09*sin(2*PI*138.59*t+0.4)*(1+0.25*sin(2*PI*0.21*t))+0.06*sin(2*PI*207.65*t+0.3)+0.045*sin(2*PI*277.18*t+0.2)':s=48000:d=${total.toFixed(2)}`;
const bell = `aevalsrc='0.45*sin(2*PI*1046*t)*exp(-2.2*t)+0.25*sin(2*PI*2093*t)*exp(-3.5*t)+0.15*sin(2*PI*1568*t)*exp(-2.8*t)':s=48000:d=4`;
let start = 0;
const mix = [];
clips.forEach((c, i) => {
  if (i > 0) start += clips[i - 1].seconds - FADE;
  const ms = Math.max(0, Math.round((start + (i === 0 ? VOICE_START : FADE + 0.15) - leads[i]) * 1000));
  f.push(`[${n + 2 + i}:a]aresample=48000,aformat=channel_layouts=stereo,volume=1.7,adelay=${ms}|${ms}[v${i}]`);
  mix.push(`[v${i}]`);
});
// Voice bus; music + ambience bus ducked under it (sidechain), then the whole mix normalised to -14 LUFS.
const A0 = 2 * n + 2; // first ambience input
f.push(`${mix.join('')}amix=inputs=${n}:duration=longest:normalize=0,apad=whole_dur=${T},asplit=2[vox][key]`);
f.push(`[${n}:a]${music ? `${music.filter},atrim=duration=${T}` : 'volume=0.5'}[dr]`, `[${n + 1}:a]aformat=channel_layouts=stereo[bl]`);
layers.forEach((_, k) => f.push(`[${A0 + k}:a]aformat=sample_rates=48000:channel_layouts=stereo[am${k}]`));
bellAt.forEach((t, k) => { const ms = Math.round(t * 1000); f.push(`[${A0 + layers.length + k}:a]aformat=channel_layouts=stereo,adelay=${ms}|${ms}[bb${k}]`); });
const bedIns = ['[dr]', '[bl]', ...layers.map((_, k) => `[am${k}]`), ...bellAt.map((_, k) => `[bb${k}]`)];
f.push(`${bedIns.join('')}amix=inputs=${bedIns.length}:duration=first:normalize=0[bed]`);
f.push('[bed][key]sidechaincompress=threshold=0.02:ratio=5:attack=25:release=450:makeup=1[duck]');
const OUTFADE = STATUS && spec.loop ? 0.6 : 2; // a loop status Short only dips at the end, then replays
f.push(`[duck][vox]amix=inputs=2:duration=first:normalize=0,atrim=duration=${T},afade=t=out:st=${(total - OUTFADE).toFixed(2)}:d=${OUTFADE},loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]`);
fs.mkdirSync(path.join(base, 'out'), { recursive: true });
const out = path.join(base, 'out', `${spec.slug}.mp4`);
run([
  ...clips.flatMap((c) => ['-i', c.file]), ...(music ? music.input : ['-f', 'lavfi', '-i', drone]), '-f', 'lavfi', '-i', bell, ...clips.flatMap((c) => ['-i', c.voice]),
  ...layers.flatMap((l) => ['-f', 'lavfi', '-i', l]), ...bellAt.flatMap(() => ['-f', 'lavfi', '-i', bell2]),
  '-filter_complex', f.join(';'), '-map', `[${prev}]`, '-map', '[a]',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-crf', '23', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2',
  '-t', total.toFixed(2), '-movflags', '+faststart', out,
]);
// Loop status Shorts (scripts/status-engine.mjs, spec.loop): the last 0.5 s cross-fades into the video's own first frame
// (the hook), so YouTube's automatic replay continues seamlessly instead of jumping from an end card to the start.
if (STATUS && spec.loop) {
  const first = path.join(work, 'loop-first.png');
  run(['-i', clips[0].file, '-frames:v', '1', first]);
  const X = 0.5;
  const tmp = path.join(work, 'loop.mp4');
  run(['-i', out, '-loop', '1', '-framerate', String(FPS), '-t', (X + 0.1).toFixed(2), '-i', first, '-filter_complex',
    `[1:v]format=yuv420p,setsar=1,fps=${FPS},settb=1/${FPS}[t];[0:v]format=yuv420p,setsar=1,fps=${FPS},settb=1/${FPS}[m];[m][t]xfade=transition=fade:duration=${X}:offset=${(total - X).toFixed(2)},trim=duration=${total.toFixed(2)}[v]`,
    '-map', '[v]', '-map', '0:a', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-crf', '23', '-c:a', 'copy', '-movflags', '+faststart', tmp]);
  fs.renameSync(tmp, out);
  console.log('loop: the last 0.5 s fades into the first frame');
}
if (music && !usedPhotos.length) fs.writeFileSync(specFile, `${JSON.stringify(spec, null, 2)}\n`);
// Credit every real photo shown: "Photo: <author>, <licence>, via Wikimedia Commons (<file page>)".
if (usedPhotos.length) {
  const credit = usedPhotos.map(creditLine).join('\n');
  for (const k of ['youtube_description', 'instagram_caption', 'facebook_caption']) {
    if (spec[k] && !spec[k].includes(credit)) spec[k] = `${spec[k].trimEnd()}\n\n${credit}`;
  }
  fs.writeFileSync(specFile, `${JSON.stringify(spec, null, 2)}\n`);
}
console.log(JSON.stringify({ out, seconds: Number(total.toFixed(1)), scenes: n, real_photos: usedPhotos.length, ambience: amb, look: LOOK_ON,
  workers_ai_images: workersAiImages, neurons: workersAiImages * 326, stand_ins: [...fellBack.values()].map((f) => f.source) }));
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `- Images (render): Workers AI ${workersAiImages} (~${workersAiImages * 326} neurons), stand-ins ${fellBack.size}${fellBack.size ? ` (${[...fellBack.values()].map((f) => f.source).join(', ')})` : ''}
`);
}
