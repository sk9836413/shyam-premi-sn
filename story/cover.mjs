// Thumbnail-grade frames, from the 6 Nov 2026 hook study (automation/STORY.md "Hook, title and cover formulas").
//
// 1. Shorts "cover": YouTube shows a frame of a Short as its thumbnail in search, on the channel page and in
//    suggestions, and the API cannot set a custom one for Shorts. So the first ~0.4 s of every Short is made
//    thumbnail-grade: scene 1 is the deity/temple close-up (already moving: zoompan or the animated clip) and this
//    transparent 1080x1920 overlay puts 2-4 huge Devanagari words on it, inside the safe area (clear of our title bar
//    at the top, YouTube's buttons on the right and its caption block at the bottom). render-story.mjs fades it out at
//    ~0.4 s, so it never holds up the motion; characters/dialogue.py takes the same PNG with --cover.
// 2. Long-video thumbnails (1280x720): two variants of the chosen scene image with 3-5 huge Hindi words in saffron and
//    gold, a clean border and the logo, each scored by a simple heuristic (contrast at mobile size plus the size of the
//    deity's face), and the better one becomes <slug>-thumb.jpg. Both stay in out/ for YouTube Studio's manual
//    "Test & compare".
// Headless Chrome draws the text (ffmpeg's drawtext cannot shape Devanagari conjuncts and matras); fonts: brand/fonts (OFL).
//   node story/cover.mjs <scenes.json> <out.png> [--dialogue]        the Short's cover overlay
//   node story/cover.mjs --thumbs <image> "<Hindi words>" "<Roman line>" <out-base> [top|center|bottom]
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chrome } from './status-overlays.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FONTS = path.join(ROOT, 'brand/fonts');
const LOGO = path.join(ROOT, 'brand/logo.png');
const DEV = /[ऀ-ॿ]/;
const FF = process.env.FFMPEG_PATH || (fs.existsSync('E:/tools/ffmpeg/bin/ffmpeg.exe') ? 'E:/tools/ffmpeg/bin/ffmpeg.exe' : 'ffmpeg');

const esc = (t) => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const url = (file) => pathToFileURL(path.resolve(file)).href;
const fontCss = `@font-face{font-family:'Yatra';src:url('${url(path.join(FONTS, 'YatraOne-Regular.ttf'))}')}`;

/** The 2-4 cover words: spec.cover, else the status blessing, else the first words of the Devanagari title keyword. */
export function coverWords(spec) {
  if (spec.cover) return String(spec.cover).trim();
  if (spec.format === 'status') return spec.scenes?.[0]?.big || '';
  if (spec.format === 'long' && spec.thumbnail?.hi) return spec.thumbnail.hi;
  const dev = (spec.youtube_title || '').replace(/#Shorts/gi, '').split('|').map((p) => p.trim()).find((p) => DEV.test(p)) || '';
  return dev.split(/\s+/).filter(Boolean).slice(0, 3).join(' ');
}

// Two lines at most, split where the halves are closest in length.
function lines(text) {
  const w = text.split(/\s+/).filter(Boolean);
  if (w.length <= 2 && text.length <= 12) return [text];
  let best = [text], diff = Infinity;
  for (let k = 1; k < w.length; k++) {
    const a = w.slice(0, k).join(' '), b = w.slice(k).join(' ');
    if (Math.abs(a.length - b.length) <= diff) { diff = Math.abs(a.length - b.length); best = [a, b]; }
  }
  return best;
}

// Grows the font until the box is full: the words are as big as the safe area allows.
const fitScript = (sel, max, min) => `<script>
for (const el of document.querySelectorAll('${sel}')) {
  let s = ${max}; el.style.fontSize = s + 'px';
  while (s > ${min} && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)) { s -= 4; el.style.fontSize = s + 'px'; }
}</script>`;

function shot(html, png, w, h, transparent) {
  const page = png.replace(/\.(png|jpg)$/i, '.html');
  fs.mkdirSync(path.dirname(png), { recursive: true });
  fs.writeFileSync(page, html);
  fs.rmSync(png, { force: true });
  const r = spawnSync(chrome(), ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox', '--allow-file-access-from-files',
    '--force-device-scale-factor=1', ...(transparent ? ['--default-background-color=00000000'] : []), `--window-size=${w},${h}`,
    '--virtual-time-budget=4000', `--screenshot=${png}`, url(page)], { encoding: 'utf8', timeout: 90000 });
  fs.rmSync(page, { force: true });
  if (!fs.existsSync(png)) throw new Error(`Chrome made no PNG (${(r.stderr || '').trim().split('\n').pop()})`);
  return png;
}

/**
 * Writes the Short's transparent 1080x1920 cover overlay; returns the path, or null when there are no cover words.
 * layout "dialogue" (Dadi-Chhotu, characters/dialogue.py): the words sit on the lower part of the story picture
 * (y 520-830), above the characters.
 */
export function makeCover(spec, png, layout = 'story') {
  const [top, height] = layout === 'dialogue' ? [520, 310] : [1040, 400];
  const words = coverWords(spec);
  if (!words) return null;
  const ls = lines(words);
  // Safe area: x 60-940 (YouTube's buttons sit on the right), y 1040-1440: the lower part of the scene picture and just
  // below it, so the deity's face (the middle of the square, y ~500-1000) stays clear, and above YouTube's title block.
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${fontCss}
    html,body{margin:0;width:1080px;height:1920px;background:transparent;overflow:hidden}
    .glow{position:absolute;left:-60px;right:-60px;top:${top - 80}px;height:${height + 180}px;
      background:radial-gradient(ellipse at 46% 50%,rgba(24,6,0,.72) 0%,rgba(24,6,0,.45) 45%,rgba(24,6,0,0) 72%)}
    .box{position:absolute;left:60px;width:880px;top:${top}px;height:${height}px;display:flex;flex-direction:column;justify-content:center}
    .l{font-family:'Yatra',sans-serif;line-height:1.12;text-align:center;white-space:nowrap;overflow:hidden;height:${Math.floor(height / ls.length)}px;
      color:#FFD54A;-webkit-text-stroke:12px #2a0900;paint-order:stroke fill;
      text-shadow:0 0 34px rgba(255,120,0,.75),0 10px 24px rgba(0,0,0,.95)}
    .l:nth-child(2){color:#FFFFFF}
  </style></head><body><div class="glow"></div><div class="box">${ls.map((l) => `<div class="l">${esc(l)}</div>`).join('')}</div>
  ${fitScript('.l', ls.length === 1 ? 210 : 170, 80)}</body></html>`;
  return shot(html, png, 1080, 1920, true);
}

// ---- Long-video thumbnails --------------------------------------------------------------------------------------
const POS = { top: '50% 18%', center: '50% 50%', bottom: '50% 82%' };
// Deity face height as a share of the square scene image in our close-up/darshan prompts (measured on the Nov 2026
// long-video images: ~0.2-0.25). The thumbnail layouts scale the image differently, so the face size differs.
const FACE_IN_IMAGE = 0.22;

function thumbHtml(kind, { image, hi, roman, focus }) {
  const ls = lines(hi);
  const pos = POS[focus] || POS.center;
  const img = url(image);
  const logo = fs.existsSync(LOGO) ? `<img class="logo" src="${url(LOGO)}">` : '';
  const common = `${fontCss}
    *{box-sizing:border-box}html,body{margin:0;width:1280px;height:720px;overflow:hidden;background:#2a0900}
    .frame{position:absolute;inset:0;border:14px solid #FFC83D;box-shadow:inset 0 0 0 5px #7a1d00;pointer-events:none}
    .logo{position:absolute;width:118px;height:118px;left:30px;top:28px;border-radius:50%;box-shadow:0 4px 18px rgba(0,0,0,.6)}
    .t{font-family:'Yatra',sans-serif;line-height:1.08;white-space:nowrap;overflow:hidden;color:#FFD54A;-webkit-text-stroke:10px #2a0900;
      paint-order:stroke fill;text-shadow:0 0 26px rgba(255,110,0,.7),0 8px 18px rgba(0,0,0,.9)}
    .t + .t{color:#fff}
    .r{display:inline-block;font:800 34px/1.1 'DejaVu Sans','Segoe UI',Arial,sans-serif;color:#2a0900;background:#FFC83D;padding:8px 20px;
      border-radius:10px;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}`;
  if (kind === 'a') {
    // A: the deity close-up fills the right 58%, the words sit on a saffron-to-maroon panel on the left.
    return `<!doctype html><html><head><meta charset="utf-8"><style>${common}
      .pic{position:absolute;right:0;top:0;width:760px;height:720px;background:url('${img}') ${pos}/auto 165% no-repeat}
      .pic:after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,#8a2200 0%,rgba(138,34,0,0) 28%)}
      .panel{position:absolute;left:0;top:0;width:560px;height:720px;background:linear-gradient(160deg,#FF8A00 0%,#C43A00 45%,#5a1000 100%)}
      .words{position:absolute;left:40px;width:510px;top:160px;height:430px;display:flex;flex-direction:column;justify-content:center}
      .t{height:${Math.floor(430 / ls.length)}px}
      .rw{position:absolute;left:44px;bottom:44px;max-width:640px}
    </style></head><body><div class="pic"></div><div class="panel"></div>
      <div class="words">${ls.map((l) => `<div class="t">${esc(l)}</div>`).join('')}</div>
      ${roman ? `<div class="rw"><span class="r">${esc(roman)}</span></div>` : ''}${logo}<div class="frame"></div>
      ${fitScript('.t', 170, 70)}</body></html>`;
  }
  // B: the picture full-bleed (the face in the lower two thirds, uncovered), the words in a bold band across the top.
  const posB = { top: '50% 0%', center: '50% 24%', bottom: '50% 62%' }[focus] || '50% 24%';
  return `<!doctype html><html><head><meta charset="utf-8"><style>${common}
    .pic{position:absolute;inset:0;background:url('${img}') ${posB}/100% auto no-repeat}
    .shade{position:absolute;left:0;right:0;top:0;height:330px;background:linear-gradient(0deg,rgba(60,10,0,0) 0%,rgba(60,10,0,.85) 40%,#3a0800 100%)}
    .words{position:absolute;left:40px;right:40px;top:30px;height:250px;display:flex;flex-direction:column;justify-content:center;align-items:center}
    .t{height:${Math.floor(250 / ls.length)}px;max-width:1200px;text-align:center}
    .rw{position:absolute;right:40px;bottom:40px;max-width:760px}
    .logo{top:auto;bottom:34px}
  </style></head><body><div class="pic"></div><div class="shade"></div>
    <div class="words">${ls.map((l) => `<div class="t">${esc(l)}</div>`).join('')}</div>
    ${roman ? `<div class="rw"><span class="r">${esc(roman)}</span></div>` : ''}${logo}<div class="frame"></div>
    ${fitScript('.t', ls.length === 1 ? 190 : 120, 60)}</body></html>`;
}

/**
 * Mobile-size score of a thumbnail (0-100): YouTube shows it ~168x94 on a phone, so contrast is measured at that size
 * (RMS contrast of the luma), plus the deity face height as a share of the frame (estimated from the layout: no face
 * detector is free to run in CI). 60% contrast, 40% face size.
 */
export function scoreThumb(file, faceShare) {
  const r = spawnSync(FF, ['-v', 'error', '-i', file, '-vf', 'scale=168:94,format=gray', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 20 });
  const px = r.stdout && r.stdout.length ? [...r.stdout] : [];
  const mean = px.reduce((a, b) => a + b, 0) / (px.length || 1);
  const rms = Math.sqrt(px.reduce((a, b) => a + (b - mean) ** 2, 0) / (px.length || 1));
  const contrast = Math.min(1, rms / 75);
  const face = Math.min(1, faceShare / 0.5);
  return { score: Math.round(100 * (0.6 * contrast + 0.4 * face)), contrast: Number(contrast.toFixed(3)), face: Number(faceShare.toFixed(2)) };
}

/**
 * Two 1280x720 variants of a long video's thumbnail: <outBase>-a.jpg and -b.jpg, scored; the better one is copied to
 * <outBase>.jpg. Returns { winner, variants: [{ kind, file, score, contrast, face }] }.
 */
export function longThumbs({ image, hi, roman = '', outBase, focus = 'center' }) {
  if (!hi) throw new Error('no Hindi thumbnail words');
  const variants = [];
  for (const kind of ['a', 'b']) {
    const png = `${outBase}-${kind}.png`;
    shot(thumbHtml(kind, { image, hi, roman, focus }), png, 1280, 720, false);
    const jpg = `${outBase}-${kind}.jpg`;
    const c = spawnSync(FF, ['-y', '-v', 'error', '-i', png, '-q:v', '2', jpg]);
    if (c.status !== 0 || !fs.existsSync(jpg)) throw new Error(`thumbnail ${kind}: ffmpeg could not write the JPEG`);
    fs.rmSync(png, { force: true });
    // Face height: A shows the square image at 165% of the 720 px height; B at the full 1280 px width.
    const face = kind === 'a' ? FACE_IN_IMAGE * 1.65 : FACE_IN_IMAGE * 1280 / 720;
    variants.push({ kind, file: jpg, ...scoreThumb(jpg, face) });
  }
  const winner = variants.reduce((a, b) => (b.score > a.score ? b : a));
  fs.copyFileSync(winner.file, `${outBase}.jpg`);
  return { winner: winner.kind, variants };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const a = process.argv.slice(2);
  if (a[0] === '--thumbs') {
    console.log(JSON.stringify(longThumbs({ image: a[1], hi: a[2], roman: a[3], outBase: path.resolve(a[4]), focus: a[5] })));
  } else {
    const spec = JSON.parse(fs.readFileSync(a[0], 'utf8'));
    const out = makeCover(spec, path.resolve(a[1] || 'cover.png'), a.includes('--dialogue') || spec.format === 'dialogue' ? 'dialogue' : 'story');
    console.log(JSON.stringify({ cover: out, words: coverWords(spec) }));
  }
}
