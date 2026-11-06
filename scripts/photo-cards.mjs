// HTML designs for the daily Instagram/Facebook photo posts (scripts/photos.mjs) and a small headless-Chrome renderer.
// Every card is 1080x1350 (Instagram's 4:5 portrait feed size; Facebook shows it as is). Devanagari is drawn by Chrome
// with the OFL fonts in brand/fonts (Yatra One for headings, Tiro Devanagari Hindi for text), so conjuncts and matras
// shape correctly (ffmpeg drawtext cannot). Real photos carry their credit on the image; AI pictures carry an
// "AI चित्र (सांकेतिक)" tag, so an AI picture is never mistaken for a photo of a real temple.
//
//   cardHtml(card)              -> HTML string; card.kind: darshan | aarti | festival | vichar | fact-cover | fact
//   renderCards([{html, file}]) -> writes JPEGs (quality 90) through the Chrome DevTools protocol; returns [{file, overflow}]
// CHROME = path to Chrome/Edge if it is not found automatically. Node 22+ (built-in WebSocket), no npm packages.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const W = 1080;
export const H = 1350;
const FONTS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../brand/fonts');
const BRAND = 'Shyam Premi SN';

export const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const url = (file) => pathToFileURL(path.resolve(file)).href;
const font = (name, file) => `@font-face{font-family:'${name}';src:url('${url(path.join(FONTS, file))}')}`;
const EMOJI = "'Noto Color Emoji','Segoe UI Emoji','Apple Color Emoji'";

const BASE = `${font('Yatra', 'YatraOne-Regular.ttf')}${font('Tiro', 'TiroDevanagariHindi-Regular.ttf')}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:#1a0800}
body{position:relative;font-family:'Tiro',${EMOJI},serif;color:#fff}
.photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.top{position:absolute;left:0;right:0;top:0;height:480px;background:linear-gradient(to bottom,rgba(26,8,0,.82),rgba(26,8,0,.55) 55%,rgba(26,8,0,0))}
.bottom{position:absolute;left:0;right:0;bottom:0;height:620px;background:linear-gradient(to top,rgba(26,8,0,.95),rgba(26,8,0,.8) 55%,rgba(26,8,0,0))}
.head{position:absolute;left:50px;right:50px;top:54px;text-align:center}
.big{font-family:'Yatra',${EMOJI},sans-serif;font-size:112px;line-height:1.1;color:#FFD54A;
  text-shadow:0 0 18px rgba(255,140,0,.5),0 5px 0 #5a1f00,0 8px 22px rgba(0,0,0,.8)}
.line{font-family:'Yatra',${EMOJI},sans-serif;font-size:56px;line-height:1.25;color:#fff;margin-top:10px;text-shadow:0 3px 12px rgba(0,0,0,.95)}
.foot{position:absolute;left:56px;right:56px;bottom:92px;text-align:center}
.place{font-family:'Yatra',${EMOJI},sans-serif;font-size:58px;line-height:1.2;color:#FFD54A;text-shadow:0 3px 12px rgba(0,0,0,.9)}
.text{font-size:46px;line-height:1.38;color:#fff;margin-top:16px;text-shadow:0 2px 10px rgba(0,0,0,.95)}
.q{display:inline-block;margin-top:22px;padding:18px 30px;border:3px solid #FFD54A;border-radius:22px;background:rgba(90,31,0,.55);
  font-size:44px;line-height:1.35;color:#fff}
.credit{position:absolute;left:24px;right:24px;bottom:22px;font-family:Arial,sans-serif;font-size:21px;line-height:1.25;color:rgba(255,255,255,.82);
  text-align:center;text-shadow:0 1px 4px #000}
.brand{position:absolute;right:30px;top:24px;font-family:Arial,sans-serif;font-size:24px;letter-spacing:1px;color:rgba(255,255,255,.85);text-shadow:0 1px 4px #000}
.ai{position:absolute;left:28px;top:22px;padding:6px 14px;border-radius:12px;background:rgba(0,0,0,.55);font-size:26px;color:#fff}
.frame{position:absolute;inset:16px;border:3px solid rgba(255,213,74,.75);border-radius:26px;pointer-events:none}`;

// window.fit(): shrinks each [data-lines] block until every line fits on one row, then the text of each [data-fixed]
// box until the box's content fits its height. The renderer calls it after the fonts load.
const FIT = `window.fit=()=>{const px=(e)=>parseFloat(getComputedStyle(e).fontSize);
for(const q of document.querySelectorAll('[data-lines]')){let s=px(q);const ls=[...q.children];while(ls.some((l)=>l.scrollWidth>l.clientWidth+1)&&s>34){s-=2;q.style.fontSize=s+'px';}}
for(const b of document.querySelectorAll('[data-fixed]')){let k=0;while(b.scrollHeight>b.clientHeight+2&&k++<20){for(const t of b.querySelectorAll('*')){if(t.children.length&&!t.matches('[data-lines]'))continue;t.style.fontSize=(px(t)*0.94)+'px';}}}};`;
const page = (css, body) => `<!doctype html><html lang="hi"><head><meta charset="utf-8"><style>${BASE}${css}</style><script>${FIT}</script></head><body>${body}<div class="frame"></div></body></html>`;

/** Credit strip for a real photo or the AI tag for an AI picture. */
function source(card) {
  if (card.ai) return `<div class="ai">AI चित्र (सांकेतिक)</div>`;
  return card.credit ? `<div class="credit">${esc(card.credit)}</div>` : '';
}

function photoCard(card) {
  const pos = card.focus || 'center';
  return page(`.photo{object-position:${pos}}`, `
<img class="photo" src="${url(card.image)}">
<div class="top"></div><div class="bottom"></div>
<div class="head fit"><div class="big">${esc(card.big)}</div>${card.line ? `<div class="line">${esc(card.line)}</div>` : ''}</div>
<div class="foot fit">${card.place ? `<div class="place">${esc(card.place)}</div>` : ''}${card.text ? `<div class="text">${esc(card.text)}</div>` : ''}${card.question ? `<div class="q">${esc(card.question)}</div>` : ''}</div>
${source(card)}<div class="brand">${BRAND}</div>`);
}

function vichar(card) {
  const n = String(card.quote).length;
  const size = n > 110 ? 64 : 76;
  return page(`
body{background:radial-gradient(circle at 50% 38%,#fff6df 0%,#ffe2a8 45%,#f6b45c 100%);color:#4a1500}
.mandala{position:absolute;left:50%;top:50%;width:1500px;height:1500px;margin:-750px 0 0 -750px;border-radius:50%;opacity:.16;
  background:repeating-conic-gradient(from 0deg,#b34700 0 4deg,transparent 4deg 15deg),radial-gradient(circle,transparent 30%,#b34700 30.4%,transparent 31%,transparent 44%,#b34700 44.4%,transparent 45%)}
.card{position:absolute;left:70px;right:70px;top:120px;bottom:150px;display:flex;flex-direction:column;justify-content:center;text-align:center}
.title{font-family:'Yatra',${EMOJI},sans-serif;font-size:76px;color:#8a1c00;line-height:1.1}
.diya{font-size:60px;margin-top:6px}
.quote{font-size:${size}px;line-height:1.42;color:#3d1000;margin-top:40px;font-weight:600}
.ql{white-space:nowrap}
.src{font-family:'Yatra',${EMOJI},sans-serif;font-size:44px;color:#9c3a00;margin-top:30px}
.mean{font-size:38px;line-height:1.4;color:#5a2300;margin-top:36px;padding-top:30px;border-top:3px solid rgba(138,28,0,.35)}
.frame{border-color:rgba(138,28,0,.55)}
.brand2{position:absolute;left:0;right:0;bottom:56px;text-align:center;font-family:Arial,sans-serif;font-size:28px;letter-spacing:2px;color:#7a2a00}`, `
<div class="mandala"></div>
<div class="card fit" data-fixed><div class="title">${esc(card.big || 'आज का विचार')}</div><div class="diya">🪔</div>
<div class="quote" data-lines>${String(card.quote).split('\n').map((l) => `<div class="ql">${esc(l)}</div>`).join('')}</div>${card.source ? `<div class="src">— ${esc(card.source)}</div>` : ''}
${card.meaning ? `<div class="mean">${esc(card.meaning)}</div>` : ''}</div>
<div class="brand2">${BRAND} 🙏 जय श्री श्याम</div>`);
}

function factCover(card) {
  return page(`.photo{object-position:${card.focus || 'center'}}
.ttl{position:absolute;left:56px;right:56px;bottom:120px;text-align:center}
.kick{display:inline-block;padding:10px 26px;border-radius:40px;background:#FFD54A;color:#5a1f00;font-family:'Yatra',${EMOJI},sans-serif;font-size:40px}
.name{font-family:'Yatra',${EMOJI},sans-serif;font-size:96px;line-height:1.12;color:#fff;margin-top:22px;text-shadow:0 4px 16px #000}
.sub{font-size:46px;line-height:1.3;color:#FFD54A;margin-top:14px;text-shadow:0 2px 10px #000}
.swipe{position:absolute;right:40px;top:50%;font-family:Arial,sans-serif;font-size:30px;color:#fff;background:rgba(0,0,0,.45);padding:10px 18px;border-radius:30px}`, `
<img class="photo" src="${url(card.image)}"><div class="bottom" style="height:760px"></div>
<div class="ttl fit"><div class="kick">${esc(card.kicker || 'मंदिर दर्शन')}</div><div class="name">${esc(card.big)}</div>${card.line ? `<div class="sub">${esc(card.line)}</div>` : ''}</div>
<div class="swipe">स्वाइप करें →</div>
${source(card)}<div class="brand">${BRAND}</div>`);
}

function fact(card) {
  return page(`.photo{object-position:${card.focus || 'center'};filter:blur(3px) brightness(.42) saturate(1.1);transform:scale(1.04)}
.box{position:absolute;left:70px;right:70px;top:150px;bottom:150px;display:flex;flex-direction:column;justify-content:center;text-align:center}
.num{width:132px;height:132px;margin:0 auto;border-radius:50%;background:#FFD54A;color:#5a1f00;font-family:'Yatra',${EMOJI},sans-serif;font-size:76px;line-height:140px}
.dev{font-size:60px;line-height:1.42;margin-top:44px;text-shadow:0 2px 12px #000}
.rom{font-family:Arial,sans-serif;font-size:34px;line-height:1.4;color:#FFE08A;margin-top:34px;text-shadow:0 2px 8px #000}
.of{position:absolute;left:0;right:0;top:64px;text-align:center;font-family:'Yatra',${EMOJI},sans-serif;font-size:40px;color:#FFD54A}`, `
<img class="photo" src="${url(card.image)}">
<div class="of">${esc(card.title || '')}</div>
<div class="box fit" data-fixed><div class="num">${esc(card.n)}</div><div class="dev">${esc(card.dev)}</div>${card.roman ? `<div class="rom">${esc(card.roman)}</div>` : ''}</div>
${source(card)}<div class="brand">${BRAND}</div>`);
}

// An AI picture (usually 9:16) shown whole in a gold frame over a blurred copy of itself, the text below it: nothing is
// cropped away (crown and face stay visible) and the text never covers the face.
function portrait(card) {
  const [w, h] = card.size || [9, 16];
  const s = Math.min(980 / w, 880 / h);
  const fw = Math.round(w * s); const fh = Math.round(h * s);
  return page(`
.bg{position:absolute;inset:-40px;width:${W + 80}px;height:${H + 80}px;object-fit:cover;filter:blur(26px) brightness(.42) saturate(1.2)}
.pf{position:absolute;top:46px;left:${Math.round((W - fw) / 2)}px;width:${fw}px;height:${fh}px;border:6px solid #FFD54A;border-radius:28px;overflow:hidden;
  box-shadow:0 0 40px rgba(255,170,0,.45),0 12px 40px rgba(0,0,0,.7)}
.pf img{width:100%;height:100%;object-fit:cover;display:block}
.pf .ai{left:14px;top:14px}
.txt{position:absolute;left:50px;right:50px;top:${46 + fh + 18}px;bottom:44px;display:flex;flex-direction:column;justify-content:center;text-align:center}
.big{font-size:80px}.line{font-size:46px;margin-top:4px}
.text,.q{font-size:40px;margin-top:12px}.q{padding:10px 24px}
.brand{top:auto;bottom:14px;right:28px;font-size:20px}`, `
<img class="bg" src="${url(card.image)}"><div class="pf"><img src="${url(card.image)}">${card.ai ? '<div class="ai">AI चित्र (सांकेतिक)</div>' : ''}</div>
<div class="txt" data-fixed data-shrink-all><div class="big">${esc(card.big)}</div>${card.line ? `<div class="line">${esc(card.line)}</div>` : ''}${card.place ? `<div class="text">${esc(card.place)}</div>` : ''}${card.question ? `<div><span class="q">${esc(card.question)}</span></div>` : card.text ? `<div class="text">${esc(card.text)}</div>` : ''}</div>
${card.credit ? `<div class="credit" style="bottom:12px;left:24px;right:220px;text-align:left">${esc(card.credit)}</div>` : ''}<div class="brand">${BRAND}</div>`);
}

// Festival greeting without any picture (the AI picture could not be made): diyas, warm gradient, big greeting.
function greeting(card) {
  return page(`
body{background:radial-gradient(circle at 50% 30%,#a8380a 0%,#6e1600 45%,#2a0500 100%)}
.rays{position:absolute;left:50%;top:38%;width:1600px;height:1600px;margin:-800px 0 0 -800px;opacity:.13;background:repeating-conic-gradient(from 0deg,#ffcf5a 0 5deg,transparent 5deg 18deg)}
.box{position:absolute;left:60px;right:60px;top:110px;bottom:130px;display:flex;flex-direction:column;justify-content:center;text-align:center}
.diyas{font-size:84px;letter-spacing:18px}
.big{font-size:124px;margin-top:30px}.line{font-size:58px;margin-top:16px}
.text{font-size:48px;margin-top:40px;color:#ffe9b0}
.brand{top:auto;bottom:40px;right:0;left:0;text-align:center;font-size:28px}`, `
<div class="rays"></div>
<div class="box" data-fixed><div class="diyas">🪔🪔🪔</div><div class="big">${esc(card.big)}</div>${card.line ? `<div class="line">${esc(card.line)}</div>` : ''}${card.text ? `<div class="text">${esc(card.text)}</div>` : ''}</div>
<div class="brand">${BRAND} 🙏 जय श्री श्याम</div>`);
}

export function cardHtml(card) {
  if (card.kind === 'vichar') return vichar(card);
  if (card.kind === 'fact-cover') return factCover(card);
  if (card.kind === 'fact') return fact(card);
  if (card.kind === 'greeting') return greeting(card);
  if (card.ai || card.layout === 'portrait') return portrait(card);
  return photoCard(card); // darshan, aarti, festival over a real photo
}

/** [width, height] of a JPEG or PNG file. */
export function imageSize(file) {
  const b = fs.readFileSync(file);
  if (b.readUInt32BE(0) === 0x89504e47) return [b.readUInt32BE(16), b.readUInt32BE(20)];
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    i += 2 + b.readUInt16BE(i + 2);
  }
  throw new Error(`no image size in ${file}`);
}

// ---------------------------------------------------------------- renderer (Chrome DevTools protocol)

function findChrome() {
  const list = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  const hit = list.find((p) => p && fs.existsSync(p));
  if (!hit) throw new Error('Chrome not found (set CHROME)');
  return hit;
}

/** Renders [{html, file}] to JPEG files with one browser; returns [{file, overflow}] (.fit elements that overflow). */
export async function renderCards(pages) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'sps-photo-'));
  const proc = spawn(findChrome(), ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
    '--no-sandbox', '--allow-file-access-from-files', '--remote-debugging-port=0', `--user-data-dir=${path.join(work, 'profile')}`, 'about:blank'],
  { stdio: ['ignore', 'ignore', 'pipe'] });
  try {
    const wsUrl = await new Promise((resolve, reject) => {
      let buf = '';
      const timer = setTimeout(() => reject(new Error('Chrome did not start within 30 s')), 30000);
      proc.stderr.on('data', (d) => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(timer); resolve(m[1]); } });
      proc.on('exit', (code) => reject(new Error(`Chrome exited early (${code})`)));
    });
    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let id = 0;
    const pending = new Map();
    const listeners = new Set();
    ws.addEventListener('message', (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id && pending.has(msg.id)) { const p = pending.get(msg.id); pending.delete(msg.id); if (msg.error) p.reject(new Error(msg.error.message)); else p.resolve(msg.result); } else if (msg.method) listeners.forEach((l) => l(msg));
    });
    const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const i = ++id; pending.set(i, { resolve, reject }); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
    const once = (method) => new Promise((resolve) => { const l = (m) => { if (m.method === method) { listeners.delete(l); resolve(m.params); } }; listeners.add(l); });
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false }, sessionId);
    await send('Page.enable', {}, sessionId);
    const out = [];
    for (const [i, p] of pages.entries()) {
      const htmlFile = path.join(work, `card-${i}.html`);
      fs.writeFileSync(htmlFile, p.html);
      const loaded = once('Page.loadEventFired');
      await send('Page.navigate', { url: pathToFileURL(htmlFile).href }, sessionId);
      await loaded;
      const { result } = await send('Runtime.evaluate', {
        expression: `document.fonts.ready.then(() => Promise.all([...document.images].map((im) => im.decode().catch(() => null)))).then(() => { window.fit && window.fit();
          return [...document.querySelectorAll('.fit,[data-fixed]')].some((el) => { const r = el.getBoundingClientRect();
            return (el.hasAttribute('data-fixed') && el.scrollHeight > el.clientHeight + 2) || r.top < 10 || r.bottom > ${H - 10}; }); })`,
        awaitPromise: true, returnByValue: true,
      }, sessionId);
      const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 90, clip: { x: 0, y: 0, width: W, height: H, scale: 1 } }, sessionId);
      fs.mkdirSync(path.dirname(p.file), { recursive: true });
      fs.writeFileSync(p.file, Buffer.from(data, 'base64'));
      out.push({ file: p.file, overflow: Boolean(result.value) });
    }
    ws.close();
    return out;
  } finally {
    proc.kill();
    proc.stderr?.destroy();
    proc.unref();
    await new Promise((r) => setTimeout(r, 300));
    try { fs.rmSync(work, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }); } catch { /* Chrome may still hold profile files on Windows */ }
  }
}
