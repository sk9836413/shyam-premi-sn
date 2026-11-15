// Renders a bhajan "loop" or "veer" Short (scripts/loop.mjs spec, format "loop"):
//   node story/render-loop.mjs <scenes.json>          -> <spec dir>/out/<slug>.mp4 (1080x1920, 30 fps)
// loop: ONE artwork (images/<slug>-0.jpg from animate/frames.mjs) on its own blurred copy, a gentle zoom + light shimmer
//       that are periodic (the last frame equals the first), the chorus line as big Devanagari lyrics, and a SEAMLESS
//       audio loop: the window's last 0.6 s cross-fades into its own first 0.6 s, so YouTube's replay never jumps.
// veer: the square portrait letterboxed in black inside 9:16, a slow push-in and back (periodic), a pulsing golden glow
//       (light rays), the jaikara big in red on top; 30-40 s of the bhajan chorus or a licence-safe library bed.
// Devanagari text is drawn by headless Chrome (Yatra One, OFL; ffmpeg drawtext cannot shape matras / conjuncts).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chrome } from './status-overlays.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FF = process.env.FFMPEG_PATH || (fs.existsSync('E:/tools/ffmpeg/bin/ffmpeg.exe') ? 'E:/tools/ffmpeg/bin/ffmpeg.exe' : 'ffmpeg');
const W = 1080, H = 1920, FPS = 30, X = 0.6;
const LOGO = path.join(ROOT, 'brand/logo.png');
const url = (f) => pathToFileURL(path.resolve(f)).href;
const esc = (t) => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const font = `@font-face{font-family:'Yatra';src:url('${url(path.join(ROOT, 'brand/fonts/YatraOne-Regular.ttf'))}')}`;

function run(args) {
  const r = spawnSync(FF, ['-y', '-hide_banner', '-loglevel', 'error', ...args], { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(r.stderr);
}

/** A transparent 1080x1920 PNG with one text block drawn by Chrome. kind lyric (lower band) | jaikara (top, red). */
export function textOverlay(text, png, kind) {
  const css = kind === 'jaikara'
    ? `.box{position:absolute;left:40px;width:1000px;top:110px;height:250px;display:flex;align-items:center;justify-content:center}
       .t{font-family:'Yatra','Noto Color Emoji','Segoe UI Emoji',sans-serif;color:#E3121B;-webkit-text-stroke:9px #fff;paint-order:stroke fill;
         text-shadow:0 0 28px rgba(255,60,0,.65),0 8px 20px #000;white-space:nowrap;line-height:1.1;width:1000px;height:240px;text-align:center;overflow:hidden}`
    : `.box{position:absolute;left:50px;width:980px;top:1350px;height:360px;display:flex;align-items:center;justify-content:center;
         background:radial-gradient(ellipse at 50% 50%,rgba(20,4,0,.78) 0%,rgba(20,4,0,.55) 55%,rgba(20,4,0,0) 75%)}
       .t{font-family:'Yatra',sans-serif;color:#FFE27A;-webkit-text-stroke:8px #2a0900;paint-order:stroke fill;text-shadow:0 6px 18px #000;
         line-height:1.15;width:940px;max-height:340px;text-align:center;overflow:hidden}`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${font}
    html,body{margin:0;width:${W}px;height:${H}px;background:transparent;overflow:hidden}${css}</style></head>
    <body><div class="box"><div class="t">${esc(text)}</div></div><script>
    const el=document.querySelector('.t');let s=${kind === 'jaikara' ? 170 : 110};el.style.fontSize=s+'px';
    const fits=()=>el.scrollWidth<=el.clientWidth+1&&el.scrollHeight<=${kind === 'jaikara' ? 240 : 340};
    while(s>48&&!fits()){s-=4;el.style.fontSize=s+'px'}</script></body></html>`;
  const page = png.replace(/\.png$/, '.html');
  fs.writeFileSync(page, html);
  fs.rmSync(png, { force: true });
  spawnSync(chrome(), ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox', '--allow-file-access-from-files', '--force-device-scale-factor=1',
    '--default-background-color=00000000', `--window-size=${W},${H}`, '--virtual-time-budget=4000', `--screenshot=${png}`, url(page)], { encoding: 'utf8', timeout: 90000 });
  fs.rmSync(page, { force: true });
  if (!fs.existsSync(png)) throw new Error('Chrome made no overlay PNG');
  return png;
}

/** Seamless audio loop of [from, from+dur]: the last X s cross-fade into the first X s (veer beds just fade). */
function audio(spec, out) {
  const { file, from = 0, dur } = spec.audio;
  const T = dur.toFixed(3);
  const loud = 'loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000';
  if (spec.kind === 'loop' || spec.audio.bhajan_id) {
    run(['-ss', String(from), '-t', (dur + X).toFixed(3), '-i', file, '-filter_complex',
      `[0:a]aresample=48000,aformat=channel_layouts=stereo,asplit=2[a][b];` +
      `[a]atrim=${X}:${(dur + X).toFixed(3)},asetpts=PTS-STARTPTS,afade=t=out:st=${(dur - X).toFixed(3)}:d=${X}[body];` +
      `[b]atrim=0:${X},asetpts=PTS-STARTPTS,afade=t=in:d=${X},adelay=${Math.round((dur - X) * 1000)}|${Math.round((dur - X) * 1000)}[head];` +
      `[body][head]amix=inputs=2:normalize=0:duration=first,atrim=duration=${T},${loud}[o]`, '-map', '[o]', '-c:a', 'aac', '-b:a', '192k', out]);
  } else {
    run(['-ss', String(from), '-t', T, '-i', file, '-af', `aresample=48000,aformat=channel_layouts=stereo,afade=t=in:d=0.5,afade=t=out:st=${(dur - 1.2).toFixed(2)}:d=1.2,${loud}`, '-c:a', 'aac', '-b:a', '192k', out]);
  }
}

export function renderLoop(specFile) {
  const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
  const base = path.dirname(path.resolve(specFile));
  const work = path.join(base, 'build', spec.slug);
  fs.mkdirSync(work, { recursive: true });
  fs.mkdirSync(path.join(base, 'out'), { recursive: true });
  const img = spec.scenes[0].image ? path.resolve(base, spec.scenes[0].image) : path.join(base, 'images', `${spec.slug}-0.jpg`);
  if (!fs.existsSync(img)) throw new Error(`no artwork ${img} (run animate/frames.mjs first)`);
  const dur = spec.audio.dur;
  const N = Math.round(dur * FPS);
  const wav = path.join(work, 'audio.m4a');
  audio(spec, wav);
  const veer = spec.kind === 'veer';
  const ov = textOverlay(veer ? `${spec.jaikara} 🙏` : spec.lyric, path.join(work, 'text.png'), veer ? 'jaikara' : 'lyric');
  // periodic camera: zoom 1 -> 1+A -> 1 over the whole video, so the last frame equals the first
  const A = veer ? 0.09 : 0.06;
  const zoom = `zoompan=z='1+${A}*sin(PI*on/${N})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${N}:s=1080x1080:fps=${FPS}`;
  const shimmer = `eq=brightness='0.025*sin(2*PI*t/${dur.toFixed(3)})':eval=frame`;
  const logo = fs.existsSync(LOGO) ? ['-i', LOGO] : [];
  const out = path.join(base, 'out', `${spec.slug}.mp4`);
  // inputs: 0 the artwork once (zoompan makes the N frames), 1 the text overlay, 2 the audio, 3 the artwork looped (background /
  // glow), 4 the logo
  const f = veer
    ? [`color=c=black:s=${W}x${H}:r=${FPS}:d=${dur.toFixed(3)}[bg]`,
      `[0:v]scale=2160:2160:flags=lanczos,${zoom},${shimmer},format=yuv420p[sq]`,
      // a soft golden halo around the portrait that breathes with the zoom (the light rays)
      `[3:v]scale=1300:1300,boxblur=60:2,eq=brightness=0.06:saturation=1.4,format=rgba,colorchannelmixer=aa=0.55[glow]`,
      `[bg][glow]overlay=(W-w)/2:(H-h)/2+40:shortest=1[b1]`, `[b1][sq]overlay=0:460[b2]`]
    : [`[3:v]scale=${H}:${H},crop=${W}:${H},boxblur=28:4,eq=brightness=-0.16[bg]`,
      `[0:v]scale=2160:2160:flags=lanczos,${zoom},${shimmer},format=yuv420p[sq]`, `[bg][sq]overlay=0:250:shortest=1[b2]`];
  f.push(`[1:v]format=rgba[tx]`, `[b2][tx]overlay=0:0:shortest=1[b3]`);
  if (logo.length) f.push(`[4:v]scale=${veer ? 110 : 124}:-1[lg]`, `[b3][lg]overlay=${veer ? '(W-w)/2:1640' : '36:110'}[v]`);
  else f.push('[b3]null[v]');
  run(['-i', img, '-loop', '1', '-framerate', String(FPS), '-t', dur.toFixed(3), '-i', ov, '-i', wav,
    '-loop', '1', '-framerate', String(FPS), '-t', dur.toFixed(3), '-i', img, ...logo,
    '-filter_complex', f.join(';'), '-map', '[v]', '-map', '2:a', '-frames:v', String(N), '-r', String(FPS),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-c:a', 'copy', '-t', dur.toFixed(3), '-movflags', '+faststart', out]);
  return { out, seconds: dur, kind: spec.kind };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  console.log(JSON.stringify(renderLoop(process.argv[2])));
}
