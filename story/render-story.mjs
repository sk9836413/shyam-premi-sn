// Renders a narrated vertical story video from scenes.json:
//   node render-story.mjs scenes.json
// Images: FLUX.1-schnell on Cloudflare Workers AI (free daily allocation), cached in images/.
// Voice: Kokoro Hindi (Devanagari input). Music: synthesized drone + bell. Output: out/<slug>.mp4
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FF = process.env.FFMPEG_PATH || 'E:/tools/ffmpeg/bin/ffmpeg.exe';
const FFPROBE = FF.replace(/ffmpeg(\.exe)?$/, 'ffprobe$1');
const PYTHON = process.env.PYTHON || 'E:/tools/kokoro/venv/Scripts/python.exe';
const KOKORO = process.env.KOKORO_DIR || 'E:/tools/kokoro';
const ACCOUNT = process.env.CF_ACCOUNT_ID || 'cc7da560c73a0539ed32313476555d4a';
const FONT = process.env.SUB_FONT || 'C\\:/Windows/Fonts/segoeuib.ttf';
const W = 1080, H = 1920, FPS = 30, FADE = 0.6;
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

function cfToken() {
  if (process.env.CF_API_TOKEN) return process.env.CF_API_TOKEN;
  const cfg = fs.readFileSync(path.join(process.env.APPDATA || '', 'xdg.config/.wrangler/config/default.toml'), 'utf8');
  return cfg.match(/oauth_token\s*=\s*"([^"]+)"/)[1];
}

async function image(scene, i) {
  if (scene.image) return path.resolve(base, scene.image);
  const file = path.join(base, 'images', `${spec.slug}-${i}.jpg`);
  if (fs.existsSync(file)) return file;
  // In CI the media Worker runs FLUX through its AI binding (no Cloudflare API token needed);
  // locally the Workers AI REST API is called with the wrangler login.
  const viaWorker = process.env.MEDIA_URL && process.env.MEDIA_TOKEN;
  const res = await fetch(viaWorker ? `${process.env.MEDIA_URL}/ai/flux`
    : `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/ai/run/@cf/black-forest-labs/flux-1-schnell`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${viaWorker ? process.env.MEDIA_TOKEN : cfToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: `${scene.prompt}. ${spec.style}`, steps: 8 }),
  });
  const j = await res.json();
  if (!j.success) throw new Error(`image ${i}: ${JSON.stringify(j.errors)}`);
  fs.writeFileSync(file, Buffer.from(j.result.image, 'base64'));
  return file;
}

function tts() {
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

const motion = (kind, frames) => ({
  in: `z='1+0.14*on/${frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`,
  out: `z='1.14-0.14*on/${frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`,
  pan: `z='1.14':x='(iw-iw/zoom)*on/${frames}':y='ih/2-(ih/zoom/2)'`,
})[kind] || '';

function run(args) {
  const r = spawnSync(FF, ['-y', '-hide_banner', '-loglevel', 'error', ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr);
}

const durations = tts();
const clips = [];
for (const [i, scene] of spec.scenes.entries()) {
  const img = await image(scene, i);
  const seconds = Math.max(3.5, durations[i] + 1.4);
  const frames = Math.round(seconds * FPS);
  const subFile = path.join(work, `sub-${i}.txt`);
  const titleFile = path.join(work, 'title.txt');
  fs.writeFileSync(subFile, wrap(scene.sub));
  fs.writeFileSync(titleFile, `${spec.kicker}  |  ${spec.title}`);
  const esc = (p) => p.replace(/\\/g, '/').replace(/:/g, '\\:');
  const clip = path.join(work, `clip-${i}.mp4`);
  const subtitle = `drawtext=fontfile='${FONT}':textfile='${esc(subFile)}':fontsize=50:fontcolor=white:line_spacing=12:` +
    `box=1:boxcolor=0x000000@0.55:boxborderw=22:x=(w-text_w)/2:y=1385`;
  const encode = ['-map', '[v]', '-frames:v', String(frames), '-r', String(FPS), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '19', clip];
  if (scene.endcard && LOGO) {
    // End card: the channel logo on deep blue, fading in, with the sign-off line.
    const signFile = path.join(work, 'signoff.txt');
    fs.writeFileSync(signFile, spec.signoff || 'Jai Shree Shyam');
    run(['-f', 'lavfi', '-i', `color=c=0x0b1430:s=${W}x${H}:r=${FPS}:d=${seconds.toFixed(2)}`,
      '-loop', '1', '-framerate', String(FPS), '-t', seconds.toFixed(2), '-i', LOGO, '-filter_complex', [
      `[1:v]scale=820:820,format=rgba,fade=t=in:st=0:d=0.9:alpha=1[lg]`,
      `[0:v][lg]overlay=(W-w)/2:330,` +
        `drawtext=fontfile='${FONT}':textfile='${esc(signFile)}':fontsize=76:fontcolor=0xFFD877:x=(w-text_w)/2:y=1210,${subtitle}[v]`,
    ].join(';'), ...encode]);
  } else {
    // Blurred cover background + the square scene image with a slow camera move + subtitles,
    // with the channel logo as a small watermark next to the title.
    run(['-i', img, ...(LOGO ? ['-i', LOGO] : []), '-filter_complex', [
      `[0:v]scale=${H}:${H},crop=${W}:${H},boxblur=28:4,eq=brightness=-0.18[bg]`,
      `[0:v]scale=2160:2160,zoompan=${motion(scene.motion, frames)}:d=${frames}:s=${W}x${W}:fps=${FPS}[fg]`,
      `[bg]loop=loop=${frames}:size=1,fps=${FPS}[bgl]`,
      ...(LOGO ? [`[1:v]scale=124:124[lg]`] : []),
      `[bgl][fg]overlay=0:250:shortest=1${LOGO ? '[base];[base][lg]overlay=36:110' : ''},` +
        `drawtext=fontfile='${FONT}':textfile='${esc(titleFile)}':fontsize=${titleSize(`${spec.kicker}  |  ${spec.title}`)}:fontcolor=0xFFE7A8:x=${LOGO ? 180 : '(w-text_w)/2'}:y=152,${subtitle}[v]`,
    ].join(';'), ...encode]);
  }
  clips.push({ file: clip, seconds, voice: path.join(work, `voice-${i}.wav`) });
  console.log(`scene ${i + 1}/${spec.scenes.length}: ${seconds.toFixed(1)}s`);
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
const drone = `aevalsrc='0.09*sin(2*PI*138.59*t)*(1+0.25*sin(2*PI*0.18*t))+0.06*sin(2*PI*207.65*t)*(1+0.25*sin(2*PI*0.23*t))+0.045*sin(2*PI*277.18*t)|0.09*sin(2*PI*138.59*t+0.4)*(1+0.25*sin(2*PI*0.21*t))+0.06*sin(2*PI*207.65*t+0.3)+0.045*sin(2*PI*277.18*t+0.2)':s=48000:d=${total.toFixed(2)}`;
const bell = `aevalsrc='0.45*sin(2*PI*1046*t)*exp(-2.2*t)+0.25*sin(2*PI*2093*t)*exp(-3.5*t)+0.15*sin(2*PI*1568*t)*exp(-2.8*t)':s=48000:d=4`;
let start = 0;
const mix = [];
clips.forEach((c, i) => {
  if (i > 0) start += clips[i - 1].seconds - FADE;
  const ms = Math.round((start + (i === 0 ? 0.5 : FADE + 0.15)) * 1000);
  f.push(`[${n + 2 + i}:a]aresample=48000,aformat=channel_layouts=stereo,volume=1.7,adelay=${ms}|${ms}[v${i}]`);
  mix.push(`[v${i}]`);
});
f.push(`[${n}:a]volume=0.5[dr];[${n + 1}:a]aformat=channel_layouts=stereo[bl];[dr][bl]${mix.join('')}amix=inputs=${n + 2}:duration=first:normalize=0,afade=t=out:st=${(total - 2).toFixed(2)}:d=2,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]`);
fs.mkdirSync(path.join(base, 'out'), { recursive: true });
const out = path.join(base, 'out', `${spec.slug}.mp4`);
run([
  ...clips.flatMap((c) => ['-i', c.file]), '-f', 'lavfi', '-i', drone, '-f', 'lavfi', '-i', bell, ...clips.flatMap((c) => ['-i', c.voice]),
  '-filter_complex', f.join(';'), '-map', `[${prev}]`, '-map', '[a]',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-crf', '23', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2',
  '-t', total.toFixed(2), '-movflags', '+faststart', out,
]);
console.log(JSON.stringify({ out, seconds: Number(total.toFixed(1)), scenes: n }));
