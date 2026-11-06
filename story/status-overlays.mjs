// Text overlays for the festival "WhatsApp status" Short (spec.format "status"): one transparent 1080x1920 PNG per
// scene, laid over the frame by render-story.mjs. Headless Chrome draws them, because ffmpeg's drawtext cannot shape
// Devanagari conjuncts and matras, and the end line carries an emoji.
//   scene.big     big Hindi blessing (Devanagari, gold, Yatra One)
//   scene.line    one smaller Hindi line under it
//   scene.mantra  optional mantra / shloka line (Tiro Devanagari Hindi, saffron)
//   end card      spec.endline (default "Apne parivaar ko bhejein 🙏 | Subscribe: Shyam Premi SN"), split at " | "
// Fonts: brand/fonts (SIL OFL). Emoji: the system colour emoji font (CI installs fonts-noto-color-emoji).
// CHROME = path to Chrome/Edge if it is not found automatically.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const FONTS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../brand/fonts');
export const END_LINE = 'Apne parivaar ko bhejein 🙏 | Subscribe: Shyam Premi SN';

export function chrome() {
  const list = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  const hit = list.find((p) => p && fs.existsSync(p));
  if (!hit) throw new Error('Chrome not found (set CHROME)');
  return hit;
}

const esc = (t) => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const font = (name, file) => `@font-face{font-family:'${name}';src:url('${pathToFileURL(path.join(FONTS, file)).href}')}`;

function html(scene, spec) {
  const css = `${font('Yatra', 'YatraOne-Regular.ttf')}${font('Tiro', 'TiroDevanagariHindi-Regular.ttf')}
    html,body{margin:0;width:1080px;height:1920px;background:transparent;overflow:hidden}
    .panel{position:absolute;left:0;right:0;bottom:0;height:640px;
      background:linear-gradient(to bottom,rgba(26,8,0,0) 0%,rgba(26,8,0,.78) 26%,rgba(26,8,0,.9) 100%)}
    .box{position:absolute;left:50px;right:50px;bottom:120px;text-align:center}
    .big{font-family:'Yatra','Noto Color Emoji',sans-serif;font-size:118px;line-height:1.12;color:#FFD54A;
      text-shadow:0 0 18px rgba(255,140,0,.55),0 5px 0 #5a1f00,0 8px 22px rgba(0,0,0,.85)}
    .line{font-family:'Yatra','Noto Color Emoji',sans-serif;font-size:62px;line-height:1.3;color:#fff;margin-top:18px;
      text-shadow:0 3px 12px rgba(0,0,0,.95)}
    .mantra{font-family:'Tiro','Noto Color Emoji',serif;font-size:54px;line-height:1.35;color:#FFB74D;margin-top:22px;
      text-shadow:0 3px 10px rgba(0,0,0,.95)}
    .end{position:absolute;left:40px;right:40px;top:1210px;text-align:center}
    .e1{font-family:'Yatra','Noto Color Emoji',sans-serif;font-size:86px;line-height:1.2;color:#FFD54A;
      text-shadow:0 4px 0 #3b1500,0 6px 18px rgba(0,0,0,.9)}
    .e2{display:inline-block;margin-top:40px;padding:18px 44px;border-radius:60px;background:#c4161c;
      font-family:'Yatra',sans-serif;font-size:60px;color:#fff;box-shadow:0 6px 18px rgba(0,0,0,.6)}`;
  let body;
  if (scene.endcard) {
    const [a, b] = String(spec.endline || END_LINE).split(' | ');
    body = `<div class="end"><div class="e1">${esc(a)}</div>${b ? `<div class="e2">${esc(b)}</div>` : ''}</div>`;
  } else {
    body = `<div class="panel"></div><div class="box">${scene.big ? `<div class="big">${esc(scene.big)}</div>` : ''}` +
      `${scene.line ? `<div class="line">${esc(scene.line)}</div>` : ''}${scene.mantra ? `<div class="mantra">${esc(scene.mantra)}</div>` : ''}</div>`;
  }
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`;
}

/** Writes overlay-<i>.png into `work` for every scene; returns the paths (null where a scene has no text). */
export function makeOverlays(spec, work) {
  const exe = chrome();
  return spec.scenes.map((scene, i) => {
    if (!scene.endcard && !scene.big && !scene.line && !scene.mantra) return null;
    const page = path.join(work, `overlay-${i}.html`);
    const png = path.join(work, `overlay-${i}.png`);
    fs.writeFileSync(page, html(scene, spec));
    fs.rmSync(png, { force: true });
    const r = spawnSync(exe, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox', '--allow-file-access-from-files',
      '--force-device-scale-factor=1', '--default-background-color=00000000', '--window-size=1080,1920',
      '--virtual-time-budget=3000', `--screenshot=${png}`, pathToFileURL(page).href], { encoding: 'utf8', timeout: 90000 });
    if (!fs.existsSync(png)) throw new Error(`overlay ${i}: Chrome made no PNG (${(r.stderr || '').trim().split('\n').pop()})`);
    return png;
  });
}

// Preview: node story/status-overlays.mjs <spec.json> <outdir>
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const out = path.resolve(process.argv[3] || '.');
  fs.mkdirSync(out, { recursive: true });
  console.log(JSON.stringify(makeOverlays(spec, out)));
}
