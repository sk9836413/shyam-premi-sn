// Renders the daily long katha video (16:9, 1920x1080, 5-10 min) from a long scenes.json:
//   node story/render-long.mjs story/long/scenes.json
// Shorts are rendered by render-story.mjs; this file is separate so the Shorts pipeline never changes.
//
// Images: FLUX.1-schnell (1024x1024) through the shyam-premi-media Worker, only one per entry in
// spec.images (measured 1 Nov 2026: ~326 Workers AI neurons per image at 8 steps; 4 steps, the FLUX-schnell default, roughly halves it). Scenes reuse them
// with different 16:9 crops (focus top/center/bottom) and camera moves. images[i].file (relative to
// scenes.json) skips generation, for local tests.
// Voice: edge-tts hi-IN-MadhurNeural through the human chain (voice/humanize.py; Kokoro fallback). Music: synthesized
// drone, a bell per chapter, synthesized ambience; all ducked under the voice (sidechain), -14 LUFS.
// Within a chapter scenes crossfade; chapters dip through black and get a "Adhyay N" label.
// Real temple photos: images marked `real: true` (temple exterior/interior) use the licence-checked photos in
// footage/<spec.temple>/ (scripts/real-photos.mjs) instead of FLUX when there are any: no neurons spent, a 16:9
// cover crop with the scene's camera move, a small "Asli photo: <author>" label, and a credit line per photo
// ("Photo: <author>, <licence>, via Wikimedia Commons (<url>)") appended to the description (the spec is updated).
// Output: out/<slug>.mp4, out/<slug>-thumb.jpg (1280x720), out/<slug>.json (chapters, duration, neurons).
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { creditLine, photosFor } from '../scripts/real-photos.mjs';
import { coverWords, longThumbs } from './cover.mjs';
import { fallbackImage, iconography } from '../animate/frames.mjs';

const started = Date.now();
const FF = process.env.FFMPEG_PATH || 'E:/tools/ffmpeg/bin/ffmpeg.exe';
const FFPROBE = FF.replace(/ffmpeg(\.exe)?$/, 'ffprobe$1');
const PYTHON = process.env.PYTHON || 'E:/tools/kokoro/venv/Scripts/python.exe';
const KOKORO = process.env.KOKORO_DIR || 'E:/tools/kokoro';
const FONT = process.env.SUB_FONT || 'C\\:/Windows/Fonts/segoeuib.ttf';
const LOGO = process.env.LOGO || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../brand/logo.png');
const W = 1920, H = 1080, FPS = 30, FADE_FRAMES = 12, FADE = FADE_FRAMES / FPS;
const NEURONS_PER_IMAGE = 4 * 4.8 + 8 * 9.6;
const JOBS = Math.max(2, os.cpus().length);
// Where each focus puts the 16:9 window inside the square image (scaled to 2880x2880; 0-1260 possible).
const FOCUS_Y = { top: 250, center: 630, bottom: 1010 };

const specFile = path.resolve(process.argv[2] || 'scenes.json');
const base = path.dirname(specFile);
const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
const work = path.join(base, 'build', spec.slug);
fs.mkdirSync(path.join(base, 'images'), { recursive: true });
fs.mkdirSync(path.join(base, 'out'), { recursive: true });
fs.mkdirSync(work, { recursive: true });

// Flatten chapters into scenes, remembering where each chapter starts.
const scenes = spec.chapters.flatMap((ch, c) => ch.scenes.map((s, k) => ({ ...s, chapter: c, firstInChapter: k === 0, lastInChapter: k === ch.scenes.length - 1 })));

const esc = (p) => p.replace(/\\/g, '/').replace(/:/g, '\\:');
const wrap = (text, n) => text.split(' ').reduce((lines, word) => {
  const last = lines[lines.length - 1];
  if (last && (last + ' ' + word).length <= n) lines[lines.length - 1] = `${last} ${word}`;
  else lines.push(word);
  return lines;
}, []).join('\n');
const textFile = (name, text) => {
  const f = path.join(work, name);
  fs.writeFileSync(f, text);
  return esc(f);
};
// drawtext with expansion off, so a % or : in a line can never break the filter.
const draw = (file, opts) => `drawtext=fontfile='${FONT}':textfile='${file}':expansion=none:${opts}`;

function ff(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(FF, ['-y', '-hide_banner', '-loglevel', 'error', ...args]);
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(err.slice(-2000)))));
  });
}

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }));
  return out;
}

const duration = (file) => Number(spawnSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }).stdout.trim());

// ---- Images -------------------------------------------------------------------------------------
let generated = 0;
const photos = photosFor(spec.temple);
const realImages = spec.images.map((im, i) => (im.real ? i : -1)).filter((i) => i >= 0);
const photoOf = new Map(photos.length ? realImages.map((i, k) => [i, photos[k % photos.length]]) : []);
const usedPhotos = new Set();
const fbOf = new Map(); // image index -> stand-in { file, photo?, source }
let workersAiDown = false;
async function image(img, i) {
  if (photoOf.has(i)) return photoOf.get(i).file;
  if (img.file) return path.resolve(base, img.file);
  const file = path.join(base, 'images', `${spec.slug}-img${i}.jpg`);
  if (fs.existsSync(file)) return file;
  // Workers AI out of neurons (4006): animate/frames.mjs --long normally made the image on the Kaggle GPU first; whatever
  // is still missing gets a bank picture / real photo / plain background (animate/frames.mjs fallbackImage), never a failure.
  const standIn = (why) => {
    const fb = fallbackImage(spec, img.prompt, i, work);
    console.log(`::warning::image ${i}: ${String(why).slice(0, 160)}; using ${fb.source}`);
    fbOf.set(i, fb);
    return fb.file;
  };
  if (!process.env.MEDIA_URL || !process.env.MEDIA_TOKEN || workersAiDown || process.env.SPS_WORKERS_AI === '0') return standIn('Workers AI not used');
  let last;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${process.env.MEDIA_URL}/ai/flux`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.MEDIA_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `${iconography(img.prompt)}. Wide cinematic composition with the main subject in the middle band. ${spec.style}`, steps: 4 }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(JSON.stringify(j.errors));
      fs.writeFileSync(file, Buffer.from(j.result.image, 'base64'));
      generated++;
      return file;
    } catch (e) {
      last = e;
      if (/4006|allocation|neurons/i.test(e.message)) { workersAiDown = true; break; }
      await new Promise((r) => setTimeout(r, 4000 * attempt));
    }
  }
  return standIn(last.message);
}

// ---- Voice --------------------------------------------------------------------------------------
const EDGE_VOICES = { hm_omega: 'hi-IN-MadhurNeural', hf_alpha: 'hi-IN-SwaraNeural' };
async function ttsEdge() {
  return pool(scenes, 6, async (s, i) => {
    const voice = EDGE_VOICES[s.voice || spec.voice || 'hm_omega'] || EDGE_VOICES.hm_omega;
    const out = path.join(work, `voice-${i}.mp3`);
    for (let attempt = 1; attempt <= 3; attempt++) {
      const ok = await new Promise((resolve) => {
        const p = spawn(PYTHON, ['-m', 'edge_tts', '--voice', voice, '--rate=+0%', '--text', s.tts, '--write-media', out]);
        p.on('close', (code) => resolve(code === 0 && fs.existsSync(out) && fs.statSync(out).size > 1000));
      });
      if (ok) return { file: out, seconds: duration(out) };
      await new Promise((r) => setTimeout(r, 3000 * attempt));
    }
    throw new Error(`edge-tts line ${i} failed`);
  });
}
function ttsKokoro() {
  const lines = path.join(work, 'lines.txt');
  fs.writeFileSync(lines, scenes.map((s) => s.tts).join('\n'));
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
  const r = spawnSync(PYTHON, ['-c', py], { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(r.stderr);
  return JSON.parse(r.stdout.trim().split('\n').pop()).map((seconds, i) => ({ file: path.join(work, `voice-${i}.wav`), seconds }));
}
// TTS files start and end with silence; trimmed, the pause between lines is set by the scene timing.
const TRIM = 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05,areverse,' +
  'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.12,areverse';
// Chatterbox narration made on the Kaggle GPU (voice/chatterbox_tts.py), used when VOICE_DIR holds a voice.json in
// which every line succeeded; otherwise edge-tts (then Kokoro) makes the voice here.
function ttsPremade() {
  const dir = process.env.VOICE_DIR && path.resolve(process.env.VOICE_DIR);
  const meta = dir && path.join(dir, 'voice.json');
  if (!meta || !fs.existsSync(meta)) return null;
  const done = JSON.parse(fs.readFileSync(meta, 'utf8')).lines;
  const files = scenes.map((_, i) => path.join(dir, `voice-${i}.wav`));
  if (scenes.some((_, i) => !done.find((l) => l.i === i && l.ok) || !fs.existsSync(files[i]))) return null;
  console.log('voice: Chatterbox (made on Kaggle)');
  return files.map((file) => ({ file, seconds: duration(file) }));
}
// Human chain (default since 10 Nov 2026, voice/humanize.py): sentence-by-sentence mood prosody + jitter, 200-600 ms
// pauses with soft breaths, EQ / de-ess / compression / a small room. Lines after the first get a 0.3 s lead (it may
// hold a breath) and are placed that much earlier; they are already trimmed, so the TRIM pass below is skipped.
// SPS_HUMAN_VOICE=0 = the old single-request chain.
const HUMAN_LEAD = 0.3;
function ttsHuman() {
  const items = scenes.map((s, i) => ({
    text: s.tts, voice: s.voice || spec.voice || 'hm_omega', mood: s.mood, out: path.join(work, `line-${i}.wav`), lead: i === 0 ? 0 : HUMAN_LEAD,
  }));
  const job = path.join(work, 'voice-job.json');
  fs.writeFileSync(job, JSON.stringify({ items, concurrency: 6 }));
  const r = spawnSync(PYTHON, ['-I', path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../voice/humanize.py'), job],
    { encoding: 'utf8', env: { ...process.env, FFMPEG_PATH: FF }, maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`humanize: ${(r.stderr || '').trim().split('\n').pop()}`);
  const res = JSON.parse(r.stdout.trim().split('\n').pop());
  const bad = res.find((x) => x.error);
  if (bad) throw new Error(`humanize: ${bad.error}`);
  console.log('voice: edge-tts, human chain (voice/humanize.py)');
  return res.map((x) => ({ file: x.file, seconds: x.speech_s, lead: x.lead, mood: x.last_mood }));
}
async function tts() {
  let lines = ttsPremade();
  if (!lines && process.env.TTS_ENGINE !== 'kokoro' && process.env.SPS_HUMAN_VOICE !== '0') {
    try { return ttsHuman(); } catch (e) { console.log(`human voice chain failed, using plain edge-tts: ${e.message}`); }
  }
  if (!lines && process.env.TTS_ENGINE !== 'kokoro') {
    try { lines = await ttsEdge(); } catch (e) { console.log(`edge-tts failed, using Kokoro for every line: ${e.message}`); }
  }
  lines ||= ttsKokoro();
  return pool(lines, JOBS, async (v, i) => {
    const file = path.join(work, `line-${i}.wav`);
    await ff(['-i', v.file, '-af', TRIM, '-ar', '48000', '-ac', '2', file]);
    return { file, seconds: duration(file) };
  });
}

// ---- Scene clips --------------------------------------------------------------------------------
const motion = (kind, f) => ({
  in: `z='1+0.12*on/${f}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`,
  out: `z='1.12-0.12*on/${f}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`,
  pan: `z='1.12':x='(iw-iw/zoom)*on/${f}':y='ih/2-(ih/zoom/2)'`,
  panl: `z='1.12':x='(iw-iw/zoom)*(1-on/${f})':y='ih/2-(ih/zoom/2)'`,
})[kind] || `z='1+0.12*on/${f}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`;

const titleText = `${spec.kicker}  |  ${spec.title}`;
const titleSize = Math.max(24, Math.min(36, Math.floor(1500 / (0.62 * titleText.length))));
const titleFile = textFile('title.txt', titleText);

async function clip(scene, i, img, voice) {
  // Voice starts as the crossfade ends; lines are ~0.9 s apart (longer, with a bell, between chapters).
  const lead = i === 0 ? 0.1 : scene.firstInChapter ? 0.5 : FADE + 0.05;
  // A beat longer after an emotional / serious / mantra line (human chain: voice.mood).
  const tail = (scene.lastInChapter ? 0.9 : 0.35) + (['emotional', 'serious', 'mantra'].includes(voice.mood) ? 0.25 : 0);
  const minimum = scene.endcard ? 6 : 3;
  const frames = Math.round(Math.max(minimum, lead + voice.seconds + tail + FADE) * FPS);
  const out = path.join(work, `clip-${i}.mp4`);
  const subFile = textFile(`sub-${i}.txt`, wrap(scene.sub, 52));
  const subtitle = draw(subFile, `fontsize=48:fontcolor=white:line_spacing=10:box=1:boxcolor=0x000000@0.58:boxborderw=18:x=(w-text_w)/2:y=h-text_h-58`);
  const encode = ['-map', '[v]', '-frames:v', String(frames), '-r', String(FPS), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-pix_fmt', 'yuv420p', out];
  if (scene.endcard) {
    const sign = textFile('signoff.txt', spec.signoff || 'Jai Shree Shyam');
    await ff(['-f', 'lavfi', '-i', `color=c=0x0b1430:s=${W}x${H}:r=${FPS}`, '-loop', '1', '-framerate', String(FPS), '-i', LOGO, '-filter_complex', [
      `[1:v]scale=560:560,format=rgba,fade=t=in:st=0:d=0.9:alpha=1[lg]`,
      `[0:v][lg]overlay=(W-w)/2:90:shortest=1,${draw(sign, 'fontsize=72:fontcolor=0xFFD877:x=(w-text_w)/2:y=680')},${subtitle}[v]`,
    ].join(';'), ...encode]);
  } else {
    const label = [];
    if (i === 0 && spec.hook) {
      const hook = textFile('hook.txt', wrap(spec.hook, 22));
      label.push(draw(hook, `fontsize=100:fontcolor=0xFFE27A:line_spacing=16:box=1:boxcolor=0x1a0b00@0.72:boxborderw=40:x=(w-text_w)/2:y=h-text_h-190:enable='lt(t,3.2)'`));
    } else if (scene.firstInChapter) {
      const ch = textFile(`chapter-${scene.chapter}.txt`, `Adhyay ${scene.chapter}  ·  ${spec.chapters[scene.chapter].title}`);
      label.push(draw(ch, `fontsize=46:fontcolor=0xFFE27A:box=1:boxcolor=0x1a0b00@0.72:boxborderw=22:x=70:y=170:` +
        `alpha='if(lt(t,0.5),t/0.5,if(lt(t,3.6),1,max(0,(4.1-t)/0.5)))':enable='lt(t,4.1)'`));
    }
    const y = FOCUS_Y[scene.focus] ?? FOCUS_Y.center;
    const photo = photoOf.get(scene.img) || fbOf.get(scene.img)?.photo;
    const anyAspect = Boolean(photo || fbOf.has(scene.img));
    if (photo) {
      usedPhotos.add(photo);
      label.push(draw(textFile(`photo-${i}.txt`, `Asli photo: ${photo.author}`.slice(0, 70)), 'fontsize=28:fontcolor=white@0.9:box=1:boxcolor=0x000000@0.45:boxborderw=8:x=w-text_w-30:y=30'));
    }
    // A real photo (any aspect) is cover-cropped to 16:9; a FLUX image is square and cropped at its focus band.
    const frame = anyAspect ? 'scale=2880:1620:force_original_aspect_ratio=increase:flags=lanczos,crop=2880:1620,setsar=1' : `scale=2880:2880:flags=lanczos,crop=2880:1620:0:${y}`;
    await ff(['-i', img, '-i', LOGO, '-filter_complex', [
      `[0:v]${frame},zoompan=${motion(scene.motion, frames)}:d=${frames}:s=${W}x${H}:fps=${FPS}[bg]`,
      `[1:v]scale=96:96[lg]`,
      `[bg][lg]overlay=40:30,` +
        draw(titleFile, `fontsize=${titleSize}:fontcolor=0xFFE7A8:shadowcolor=0x000000@0.8:shadowx=2:shadowy=2:box=1:boxcolor=0x000000@0.35:boxborderw=10:x=152:y=78-text_h/2`) +
        `,${subtitle}${label.map((l) => `,${l}`).join('')}[v]`,
    ].join(';'), ...encode]);
  }
  return { file: out, frames, seconds: frames / FPS, lead, voice };
}

// ---- Build --------------------------------------------------------------------------------------
const voices = await tts();
console.log(`voice: ${voices.length} lines, ${voices.reduce((n, v) => n + v.seconds, 0).toFixed(0)} s of narration`);
const imageFiles = await pool(spec.images, 3, image);
console.log(`images: ${spec.images.length} (${generated} generated, ~${Math.round(generated * NEURONS_PER_IMAGE)} neurons, ${fbOf.size} stand-ins)`);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `- Images (render-long): Workers AI ${generated} (~${generated * 326} neurons), stand-ins ${fbOf.size}
`);
let done = 0;
const clips = await pool(scenes, JOBS, async (s, i) => {
  const c = await clip(s, i, s.endcard ? null : imageFiles[s.img], voices[i]);
  console.log(`clip ${++done}/${scenes.length}`);
  return c;
});

// Per chapter: crossfade its clips, dip through black at both ends, and lay its narration at the
// exact scene starts. Chapters are then joined end to end (same encoder settings, so no re-encode).
const chapters = [];
const jobs = [];
let at = 0;
for (const [c, ch] of spec.chapters.entries()) {
  const idx = scenes.map((s, i) => (s.chapter === c ? i : -1)).filter((i) => i >= 0);
  const cl = idx.map((i) => clips[i]);
  const frames = cl.reduce((n, x) => n + x.frames, 0) - (cl.length - 1) * FADE_FRAMES;
  const secs = frames / FPS;
  const f = [];
  let prev = '0:v', offset = cl[0].frames;
  for (let k = 1; k < cl.length; k++) {
    f.push(`[${prev}][${k}:v]xfade=transition=fade:duration=${FADE.toFixed(4)}:offset=${((offset - FADE_FRAMES) / FPS).toFixed(4)}[x${k}]`);
    offset += cl[k].frames - FADE_FRAMES;
    prev = `x${k}`;
  }
  const fades = [c > 0 ? `fade=t=in:st=0:d=${FADE.toFixed(4)}` : null, `fade=t=out:st=${(secs - FADE).toFixed(4)}:d=${FADE.toFixed(4)}`].filter(Boolean).join(',');
  f.push(`[${prev}]${fades}[v]`);
  const video = path.join(work, `chapter-${c}.mp4`);
  const audio = path.join(work, `chapter-${c}.wav`);
  let start = 0;
  const a = [];
  cl.forEach((x, k) => {
    const ms = Math.max(0, Math.round((start + x.lead - (x.voice.lead || 0)) * 1000));
    a.push(`[${k + 1}:a]aresample=48000,aformat=channel_layouts=stereo,volume=1.7,adelay=${ms}|${ms}[a${k}]`);
    start += x.seconds - FADE;
  });
  a.push(`[0:a]${cl.map((_, k) => `[a${k}]`).join('')}amix=inputs=${cl.length + 1}:duration=first:normalize=0[a]`);
  chapters.push({ title: ch.title, start: at, seconds: secs, video, audio });
  at += secs;
  jobs.push(() => Promise.all([
    ff([...cl.flatMap((x) => ['-i', x.file]), '-filter_complex', f.join(';'), '-map', '[v]', '-frames:v', String(frames), '-r', String(FPS),
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '21', '-g', '60', '-pix_fmt', 'yuv420p', '-an', video]),
    ff(['-f', 'lavfi', '-i', `aevalsrc=0|0:s=48000:d=${secs.toFixed(4)}`, ...cl.flatMap((x) => ['-i', x.voice.file]),
      '-filter_complex', a.join(';'), '-map', '[a]', '-c:a', 'pcm_f32le', audio]),
  ]).then(() => console.log(`chapter ${c + 1}/${spec.chapters.length}: ${secs.toFixed(1)} s`)));
}
// Two chapters at a time: each x264 encode already uses several cores.
await pool(jobs, 2, (job) => job());

const katha = at; // the narrated katha
// AI-sung bhajan (music/bhajan.mjs; repo variable BHAJAN_VOCALS=on): ~20-30 s of the chorus BEFORE the katha starts and the
// whole bhajan AFTER it has ended; the narration only ever plays between the two (no voice under the singing).
let bhajan = null, bh = null;
if (process.env.BHAJAN_VOCALS === 'on') {
  try {
    const m = await import('../music/bhajan.mjs');
    bhajan = m.bhajanFor(spec);
    bh = bhajan && m.longTimeline({ katha, track: bhajan.track });
    if (bhajan && !bh) { console.log(`bhajan ${bhajan.meta.id} too short for a 20 s intro: instrumental only`); bhajan = null; }
  } catch (e) { console.log(`bhajan skipped: ${e.message}`); bhajan = null; bh = null; }
}
const OFF = bh ? bh.kathaStart : 0; // where the katha starts in the final video
const total = bh ? bh.total : katha;
const bhClips = [];
if (bh) {
  // Same encoder settings as the chapters, so the concat below still needs no re-encode.
  const enc = (frames, out) => ['-map', '[v]', '-frames:v', String(frames), '-r', String(FPS), '-c:v', 'libx264', '-preset', 'fast', '-crf', '21', '-g', '60', '-pix_fmt', 'yuv420p', '-an', out];
  const frameOf = (k) => (photoOf.has(k) || fbOf.has(k) ? 'scale=2880:1620:force_original_aspect_ratio=increase:flags=lanczos,crop=2880:1620,setsar=1'
    : `scale=2880:2880:flags=lanczos,crop=2880:1620:0:${FOCUS_Y.center}`);
  const label = textFile('bhajan-label.txt', `Bhajan  ·  ${bhajan.meta.title}`.slice(0, 80));
  const labelDraw = draw(label, 'fontsize=40:fontcolor=0xFFE27A:box=1:boxcolor=0x1a0b00@0.7:boxborderw=18:x=70:y=h-text_h-70');
  const thumbIdx = spec.thumbnail?.image ?? 0;
  // Intro: the thumbnail picture, slow zoom, the hook for 3.2 s, the bhajan label; dips to black into chapter 1.
  const iFrames = Math.round(bh.intro * FPS);
  const intro = path.join(work, 'bhajan-intro.mp4');
  const hook = spec.hook ? draw(textFile('bhajan-hook.txt', wrap(spec.hook, 22)), `fontsize=100:fontcolor=0xFFE27A:line_spacing=16:box=1:boxcolor=0x1a0b00@0.72:boxborderw=40:x=(w-text_w)/2:y=h-text_h-220:enable='lt(t,3.2)'`) + ',' : '';
  await ff(['-i', imageFiles[thumbIdx], '-i', LOGO, '-filter_complex', [
    `[0:v]${frameOf(thumbIdx)},zoompan=${motion('in', iFrames)}:d=${iFrames}:s=${W}x${H}:fps=${FPS},setsar=1[bg]`, `[1:v]scale=96:96[lg]`,
    `[bg][lg]overlay=40:30,${hook}${labelDraw},fade=t=out:st=${(bh.intro - FADE).toFixed(4)}:d=${FADE.toFixed(4)}[v]`,
  ].join(';'), ...enc(iFrames, intro)]);
  // Outro: the whole bhajan over 2-4 of the katha's pictures (crossfades), logo, sign-off and the bhajan label.
  const oSecs = total - bh.kathaEnd;
  const pics = [...new Set([thumbIdx, ...scenes.filter((x) => !x.endcard).map((x) => x.img)])].filter((k) => imageFiles[k])
    .slice(0, Math.max(2, Math.min(4, Math.round(oSecs / 15))));
  const seg = (oSecs + (pics.length - 1)) / pics.length; // 1 s crossfades
  const sFrames = Math.round(seg * FPS) + 2;
  const oFrames = Math.round(oSecs * FPS);
  const outro = path.join(work, 'bhajan-outro.mp4');
  const sign = textFile('bhajan-sign.txt', spec.signoff || 'Jai Shree Shyam');
  const xf = pics.slice(1).map((_, k) => `[${k === 0 ? 'p0' : `x${k}`}][p${k + 1}]xfade=transition=fade:duration=1:offset=${((k + 1) * (seg - 1)).toFixed(3)}[x${k + 1}]`);
  await ff([...pics.flatMap((k) => ['-i', imageFiles[k]]), '-i', LOGO, '-filter_complex', [
    ...pics.map((k, j) => `[${j}:v]${frameOf(k)},zoompan=${motion(j % 2 ? 'out' : 'in', sFrames)}:d=${sFrames}:s=${W}x${H}:fps=${FPS},eq=brightness=-0.12,setsar=1[p${j}]`),
    ...xf, `[${pics.length}:v]scale=200:200[lg]`,
    `[${pics.length > 1 ? `x${pics.length - 1}` : 'p0'}][lg]overlay=W-w-50:40,${draw(sign, 'fontsize=72:fontcolor=0xFFD877:shadowcolor=0x000000@0.8:shadowx=3:shadowy=3:box=1:boxcolor=0x1a0b00@0.55:boxborderw=20:x=(w-text_w)/2:y=h-text_h-190')},${labelDraw},` +
      `fade=t=in:st=0:d=${FADE.toFixed(4)},tpad=stop_mode=clone:stop_duration=3,trim=duration=${(oFrames / FPS).toFixed(4)}[v]`,
  ].join(';'), ...enc(oFrames, outro)]);
  bhClips.push(intro, outro);
}
const vlist = path.join(work, 'video.txt');
const alist = path.join(work, 'audio.txt');
const vfiles = [...(bh ? [bhClips[0]] : []), ...chapters.map((c) => c.video), ...(bh ? [bhClips[1]] : [])];
fs.writeFileSync(vlist, vfiles.map((v) => `file '${v.replace(/\\/g, '/')}'`).join('\n'));
fs.writeFileSync(alist, chapters.map((c) => `file '${c.audio.replace(/\\/g, '/')}'`).join('\n'));
const joined = path.join(work, 'video.mp4');
const narration = path.join(work, 'narration.wav');
await ff(['-f', 'concat', '-safe', '0', '-i', vlist, '-c', 'copy', joined]);
await ff(['-f', 'concat', '-safe', '0', '-i', alist, '-c', 'copy', narration]);

// Music: a soft tanpura-like drone under everything and a temple bell at every chapter start.
const drone = `aevalsrc='0.09*sin(2*PI*138.59*t)*(1+0.25*sin(2*PI*0.18*t))+0.06*sin(2*PI*207.65*t)*(1+0.25*sin(2*PI*0.23*t))+0.045*sin(2*PI*277.18*t)|0.09*sin(2*PI*138.59*t+0.4)*(1+0.25*sin(2*PI*0.21*t))+0.06*sin(2*PI*207.65*t+0.3)+0.045*sin(2*PI*277.18*t+0.2)':s=48000:d=${katha.toFixed(3)}`;
// Music engine (music/engine.mjs, repo variable MUSIC_ENGINE=on): a licence-checked instrumental library track replaces
// the drone under the narration (same ducking); any problem keeps the drone.
let music = null;
if (process.env.MUSIC_ENGINE === 'on') {
  try { music = (await import('../music/engine.mjs')).musicFor(spec); } catch (e) { console.log(`music engine skipped: ${e.message}`); }
  if (music) { spec.music = music.meta; console.log(`music: ${music.meta.id} (${music.meta.mood})`); }
}
const bell = `aevalsrc='0.45*sin(2*PI*1046*t)*exp(-2.2*t)+0.25*sin(2*PI*2093*t)*exp(-3.5*t)+0.15*sin(2*PI*1568*t)*exp(-2.8*t)':s=48000:d=4`;
const K = chapters.length;
// Ambience under the voice (10 Nov 2026, as in the Shorts; all synthesized, no third-party audio): temple air always,
// a distant crowd murmur for temple stories and a soft diya crackle for aarti/lamp scenes (from the image prompts;
// spec.ambience overrides: temple | aarti | nature | quiet | none). Drone + bells + ambience are ducked under the
// narration with a sidechain compressor, then the whole mix goes to -14 LUFS.
const promptWords = (spec.images || []).map((im) => im.prompt || '').join(' ').toLowerCase();
const PLACE = /temple|mandir|courtyard|devotee|darshan|murti/;
const amb = spec.ambience || (/aarti|diya|lamp|flame/.test(promptWords) && PLACE.test(promptWords) ? 'aarti'
  : PLACE.test(promptWords) ? 'temple' : /forest|grove|river|mountain|field|village|sky|garden/.test(promptWords) ? 'nature' : 'quiet');
const TT = katha.toFixed(3); // the bed lasts the katha only; it is placed at OFF
const ambLayers = amb === 'none' ? [] : [
  `anoisesrc=color=brown:amplitude=0.6:seed=7:d=${TT},lowpass=f=${amb === 'nature' ? 900 : 380},tremolo=f=0.11:d=0.55,volume=${amb === 'nature' ? 0.14 : 0.08}`,
  ...(['temple', 'aarti'].includes(amb) ? [`anoisesrc=color=pink:amplitude=0.5:seed=11:d=${TT},bandpass=f=520:width_type=h:w=520,tremolo=f=3.3:d=0.55,tremolo=f=0.31:d=0.6,lowpass=f=1400,volume=0.06`] : []),
  ...(['aarti', 'temple'].includes(amb) ? [`aevalsrc='if(lt(random(0),${amb === 'aarti' ? 0.0008 : 0.0003}),(random(1)-0.5)*1.4,0)':s=48000:d=${TT},highpass=f=1800,lowpass=f=7500,volume=${amb === 'aarti' ? 0.45 : 0.25}`] : []),
];
const OFFMS = Math.round(OFF * 1000);
const at0 = (ms) => (ms > 0 ? `,adelay=${ms}|${ms}` : '');
const TF = total.toFixed(3);
const BI = 4 + ambLayers.length; // bhajan inputs: the intro cut, then the whole song
const mix = [
  `[2:a]${music ? `${music.filter},atrim=duration=${TT},afade=t=out:st=${Math.max(0, katha - 2.5).toFixed(2)}:d=2.5` : 'volume=0.42'}${at0(OFFMS)},apad=whole_dur=${TF}[dr]`,
  `[3:a]aformat=channel_layouts=stereo,volume=0.7,asplit=${K}${chapters.map((_, k) => `[b${k}]`).join('')}`,
  ...chapters.map((c, k) => `[b${k}]adelay=${Math.round((c.start + OFF) * 1000)}|${Math.round((c.start + OFF) * 1000)}[bb${k}]`),
  ...ambLayers.map((_, k) => `[${4 + k}:a]aformat=sample_rates=48000:channel_layouts=stereo${at0(OFFMS)}[am${k}]`),
  `[1:a]aformat=sample_rates=48000:channel_layouts=stereo${at0(OFFMS)},apad=whole_dur=${TF},asplit=2[vox][key]`,
  `[dr]${chapters.map((_, k) => `[bb${k}]`).join('')}${ambLayers.map((_, k) => `[am${k}]`).join('')}amix=inputs=${K + 1 + ambLayers.length}:duration=first:normalize=0[bed]`,
  '[bed][key]sidechaincompress=threshold=0.02:ratio=4:attack=25:release=500:makeup=1[duck]',
  ...(bh ? [
    `[${BI}:a]aresample=48000,aformat=sample_rates=48000:channel_layouts=stereo,atrim=duration=${bh.intro},afade=t=in:d=0.04,afade=t=out:st=${(bh.intro - 2.5).toFixed(2)}:d=2.5,apad=whole_dur=${TF}[bhi]`,
    `[${BI + 1}:a]aresample=48000,aformat=sample_rates=48000:channel_layouts=stereo,afade=t=in:d=0.5,adelay=${Math.round(bh.outroStart * 1000)}|${Math.round(bh.outroStart * 1000)},apad=whole_dur=${TF}[bho]`,
  ] : []),
  `[vox][duck]${bh ? '[bhi][bho]' : ''}amix=inputs=${bh ? 4 : 2}:duration=first:normalize=0,atrim=duration=${TF},` +
    `afade=t=out:st=${(total - 2.5).toFixed(2)}:d=2.5,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]`,
];
const out = path.join(base, 'out', `${spec.slug}.mp4`);
await ff(['-i', joined, '-i', narration, ...(music ? music.input : ['-f', 'lavfi', '-i', drone]), '-f', 'lavfi', '-i', bell, ...ambLayers.flatMap((l) => ['-f', 'lavfi', '-i', l]),
  ...(bh ? ['-ss', String(bh.introFrom), '-i', bhajan.track.file, '-i', bhajan.track.file] : []), '-filter_complex', mix.join(';'),
  '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2', '-t', TF, '-movflags', '+faststart', out]);

// Thumbnail 1280x720: the chosen scene image, darkened at the bottom, big gold text and the logo.
const th = spec.thumbnail || {};
const thumb = path.join(base, 'out', `${spec.slug}-thumb.jpg`);
// Font size fits both the widest line (bold DejaVu is ~0.68 em per character) and ~300 px of height.
const thLines = wrap(th.text || spec.hook || spec.title, 18).split('\n');
const thText = textFile('thumb.txt', thLines.join('\n'));
const thSize = Math.max(56, Math.min(110, Math.floor(1180 / (0.68 * Math.max(...thLines.map((l) => l.length)))), Math.floor(300 / (1.18 * thLines.length))));
const thY = Math.round((FOCUS_Y[th.focus] ?? FOCUS_Y.center) * 1280 / 2880);
await ff(['-i', imageFiles[th.image ?? 0], '-i', LOGO, '-filter_complex', [
  `[0:v]${photoOf.has(th.image ?? 0) || fbOf.has(th.image ?? 0) ? 'scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720' : `scale=1280:1280:flags=lanczos,crop=1280:720:0:${thY}`},eq=saturation=1.15:contrast=1.05[bg]`,
  `[1:v]scale=150:150[lg]`,
  `[bg][lg]overlay=28:24,${draw(thText, `fontsize=${thSize}:fontcolor=0xFFD54A:borderw=6:bordercolor=0x2a0f00:line_spacing=10:` +
    `box=1:boxcolor=0x000000@0.45:boxborderw=24:x=(w-text_w)/2:y=h-text_h-44`)}[v]`,
].join(';'), '-map', '[v]', '-frames:v', '1', '-q:v', '2', thumb]);

// Two Chrome-drawn variants (story/cover.mjs): 3-5 huge Hindi words (thumbnail.hi), saffron/gold, a clean border,
// readable at phone size. The better-scoring one (contrast at 168x94 + deity face size) replaces the thumbnail above,
// which stays as the fallback when Chrome fails. Both variants stay in out/ for YouTube Studio's "Test & compare".
let thumbVariants = null;
try {
  thumbVariants = longThumbs({ image: imageFiles[th.image ?? 0], hi: th.hi || coverWords(spec), roman: th.text || '',
    outBase: thumb.replace(/\.jpg$/, ''), focus: th.focus || 'center' });
  console.log(`thumbnail: variant ${thumbVariants.winner} (${thumbVariants.variants.map((v) => `${v.kind} ${v.score}`).join(', ')})`);
} catch (e) {
  console.log(`thumbnail variants skipped, using the plain one: ${e.message}`);
}

const meta = {
  slug: spec.slug,
  video: out,
  thumbnail: thumb,
  seconds: Number(total.toFixed(1)),
  scenes: scenes.length,
  // With a bhajan: "Bhajan" at 0:00, the katha chapters after the intro, the full bhajan at the end (YouTube chapters).
  chapters: [...(bh ? [{ title: 'Bhajan', start: 0 }] : []), ...chapters.map((c) => ({ title: c.title, start: Number((c.start + OFF).toFixed(2)) })),
    ...(bh ? [{ title: `Bhajan: ${bhajan.meta.title}`.slice(0, 90), start: bh.outroStart }] : [])],
  images: spec.images.length,
  images_generated: generated,
  neurons: Math.round(generated * NEURONS_PER_IMAGE),
  render_seconds: Math.round((Date.now() - started) / 1000),
};
meta.real_photos = usedPhotos.size;
if (thumbVariants) meta.thumbnail_variants = { winner: thumbVariants.winner, scores: thumbVariants.variants.map(({ kind, score, contrast, face }) => ({ kind, score, contrast, face })) };
fs.writeFileSync(path.join(base, 'out', `${spec.slug}.json`), JSON.stringify(meta, null, 2));
if (bh) {
  meta.bhajan = { id: bhajan.meta.id, intro: [0, bh.intro], katha: [bh.kathaStart, bh.kathaEnd], outro: [bh.outroStart, bh.total] };
  spec.bhajan = { ...bhajan.meta, intro: bh.intro, from: bh.introFrom, outro_start: bh.outroStart, seconds: bh.outroDur, narration: true };
  (await import('../music/bhajan.mjs')).discloseBhajan(spec);
  fs.writeFileSync(path.join(base, 'out', `${spec.slug}.json`), JSON.stringify(meta, null, 2));
}
if (usedPhotos.size) {
  const credit = [...usedPhotos].map(creditLine).join('\n');
  if (!spec.youtube_description.includes(credit)) spec.youtube_description = `${spec.youtube_description.trimEnd()}\n\n${credit}`;
}
if (usedPhotos.size || bh || music) fs.writeFileSync(specFile, `${JSON.stringify(spec, null, 2)}\n`);
console.log(JSON.stringify(meta));
