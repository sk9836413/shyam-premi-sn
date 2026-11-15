#!/usr/bin/env node
// Weekly long compilation of the facts Shorts (owner, 15 Nov 2026; reference: a long documentary listicle "Ramayana Was
// Darker Than You Think: 5 Forgotten Stories", 5.95 lakh views in 9 days, while our long kathas get 1-6 views).
// On SATURDAYS (Sundays are the weekly mantra jaap from 22 Nov) whose long video is not a festival katha or a mantra /
// jukebox, when at least MIN_SHORTS facts Shorts of the last 21 days are not in a compilation yet (and they add up to
// MIN_SECONDS), the day's 12:30 long video becomes ONE 16:9 compilation of them: a 15 s hook intro (big Devanagari
// title on brush bands, edge-tts line), each Short as a 9:16 centre panel over its own blurred picture with its number
// and title (re-rendering in 16:9 would cost the GPU again), an outro, chapters with each story's source, a big-text
// thumbnail, links to the Shorts in the description, and afterwards a "full video" link appended to each Short's
// description (the API cannot set a Short's related video or pin a comment). The Shorts are never re-uploaded as Shorts.
// Videos come from the facts job's artifacts (facts-<slug>, kept 30 days). If anything fails the long job tells its
// katha at 12:30 as before (it runs after this job and skips once log.md has the day's long line).
//
//   node scripts/facts-compile.mjs due --date D                     go=true|false (GITHUB_OUTPUT) + the Shorts
//   node scripts/facts-compile.mjs spec --date D --out <dir>/scenes.json
//   node scripts/facts-compile.mjs render --spec F --videos <dir with <slug>.mp4> --out <dir>   -> <slug>.mp4, .json, -thumb.jpg
//   node scripts/facts-compile.mjs link --spec F --url <long video url>                         Shorts' descriptions
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { addDays, loadInputs, planDay, weekday } from './day-plan.mjs';

export const MIN_SHORTS = 4;
export const MIN_SECONDS = 360; // ~6 min of Shorts + intro/outro -> a long video of 8-15 min with 5-8 stories
export const MAX_SHORTS = 8;
export const DAY = 6; // Saturday
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FF = process.env.FFMPEG_PATH || 'ffmpeg';
const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } };

/** Facts Shorts of [date-21, date-1] not compiled yet: [{ date, slug, seconds, url, spec }] (oldest first). */
export function pendingShorts(date, root = '.') {
  const log = read(path.join(root, 'automation/log.md'));
  const pub = read(path.join(root, 'automation/published.md'));
  const dir = path.join(root, 'story/published');
  const compiled = new Set((fs.existsSync(dir) ? fs.readdirSync(dir) : []).filter((f) => /-long-facts-.*\.json$/.test(f) && !f.endsWith('.meta.json'))
    .flatMap((f) => { try { return JSON.parse(read(path.join(dir, f))).compile?.map((c) => c.slug) || []; } catch { return []; } }));
  const out = [];
  for (const m of log.matchAll(/^(\d{4}-\d{2}-\d{2}) \| facts \| (\S+) \|.*?(\d+) s\)\s*$/gm)) {
    if (m[1] < addDays(date, -21) || m[1] >= date || compiled.has(m[2])) continue;
    const url = pub.match(new RegExp(`^- ${m[2]} \\| youtube: (https?://\\S+)`, 'm'))?.[1] || null;
    let spec = null;
    try { spec = JSON.parse(read(path.join(dir, `${m[2]}.json`))); } catch { /* none */ }
    if (url && spec) out.push({ date: m[1], slug: m[2], seconds: Number(m[3]), url, spec });
  }
  return out.slice(0, MAX_SHORTS);
}

/** Is the date's long video the compilation? { go, why, shorts } */
export function compileDue(date, { root = '.', inputs = loadInputs(root) } = {}) {
  if (process.env.FACTS === 'off') return { go: false, why: 'FACTS=off' };
  if (weekday(date) !== DAY) return { go: false, why: 'not a Saturday' };
  const long = planDay(date, inputs).uploads.find((u) => u.slot === 'long');
  if (!long || long.kind !== 'long' || long.topic !== 'series') return { go: false, why: `the long video is ${long?.kind} ${long?.topic || ''} (festival / mantra / jukebox days keep it)` };
  const shorts = pendingShorts(date, root);
  const secs = shorts.reduce((a, s) => a + s.seconds, 0);
  if (shorts.length < MIN_SHORTS || secs < MIN_SECONDS) return { go: false, why: `${shorts.length} facts Shorts / ${secs} s not compiled yet (needs ${MIN_SHORTS} and ${MIN_SECONDS} s)` };
  return { go: true, why: `${shorts.length} facts Shorts, ${secs} s`, shorts };
}

const RAMAYAN = /ramayan|jatayu|sampati|ravan|lanka|setu|kumbhkaran|lakshman|shabari|angad|bali/i;
const MAHABHARAT = /mahabharat|bheem|bhishma|karn|arjun|yudhishthir|abhimanyu|ghatotkach|dwarka|shishupal|yaksha/i;
/** The curiosity listicle title from the compiled Shorts. */
export function compileTitle(shorts) {
  const n = shorts.length;
  const text = shorts.map((s) => `${s.spec.topic} ${s.spec.deity} ${s.spec.source}`).join(' ');
  const khatu = shorts.every((s) => /khatu|barbarik|shyam/i.test(`${s.spec.topic} ${s.spec.deity}`));
  const hiNum = ['', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह', 'सात', 'आठ'][n] || String(n);
  if (khatu) return { roman: `Khatu Shyam ji ke ${n} rahasya`, hi: `खाटू श्याम जी के ${hiNum} रहस्य जो बहुत कम लोग जानते हैं 😱`, lines: ['खाटू श्याम जी के', `${hiNum} रहस्य`, 'जानते हैं आप?'] };
  if (shorts.every((s) => RAMAYAN.test(`${s.spec.topic} ${s.spec.source}`))) return { roman: `Ramayan ki ${n} kahaniyan`, hi: `रामायण की ${hiNum} कहानियाँ जो आपको किसी ने नहीं सुनाईं 😱`, lines: ['रामायण की', `${hiNum} कहानियाँ`, 'किसी ने नहीं सुनाईं?'] };
  if (shorts.every((s) => MAHABHARAT.test(`${s.spec.topic} ${s.spec.source}`))) return { roman: `Mahabharat ki ${n} bhooli kahaniyan`, hi: `महाभारत की ${hiNum} भूली हुई कहानियाँ 😱`, lines: ['महाभारत की', `${hiNum} भूली कहानियाँ`, 'सुनी हैं आपने?'] };
  void text;
  return { roman: `Pauranik kathaon ke ${n} rahasya`, hi: `पौराणिक कथाओं के ${hiNum} रहस्य जो बहुत कम लोग जानते हैं 😱`, lines: ['पौराणिक कथाओं के', `${hiNum} रहस्य`, 'जानते हैं आप?'] };
}

/** The compilation's long spec (format "long", kind "compilation"). */
export function compileSpec(date, shorts) {
  const t = compileTitle(shorts);
  const slug = `${date}-long-facts-${t.roman.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')}`;
  const list = shorts.map((s, i) => ({ n: i + 1, slug: s.slug, url: s.url, seconds: s.seconds, title: s.spec.title || s.spec.hook, hook: s.spec.hook, source: s.spec.source, deity: s.spec.deity }));
  return {
    slug, format: 'long', kind: 'compilation', date, title: t.roman, playlist: 'Khatu Shyam ji ki Kathayein', deity: 'Pauranik facts (sankalan)',
    summary: `Weekly facts compilation: ${list.map((c) => c.slug.replace(/^\d{4}-\d{2}-\d{2}-facts-/, '')).join(', ')}`.slice(0, 160),
    source: [...new Set(list.map((c) => c.source))].join('; '),
    cover_lines: t.lines,
    intro_tts: `${t.hi.replace(' 😱', '')}। एक एक करके सुनिए, और आखिरी कहानी तक ज़रूर देखिए।`,
    outro_tts: 'जय श्री श्याम! ऐसी और पौराणिक कहानियों के लिए लाइक, शेयर और सब्सक्राइब करें।',
    compile: list,
    youtube_title: `${t.roman} | ${t.hi}`.slice(0, 100),
    youtube_description: [`${t.hi.replace(' 😱', '')}: is video mein ${list.length} pauranik kathayein, har ek apne granth ke sandarbh ke saath.`,
      ...list.map((c) => `${c.n}. ${c.title}: ${c.source} | Short: ${c.url}`),
      'Chitra AI dwara banaye gaye hain (sanketik). Awaaz AI se.', 'Jai Shree Shyam 🙏 Achha laga ho to Like, Share aur Subscribe karein.', '#facts #story #PauranikKatha #Bhakti'].join('\n'),
    youtube_tags: ['pauranik katha', 'पौराणिक कथा', 'pauranik rahasya', 'पौराणिक रहस्य', t.roman, t.hi.replace(' 😱', ''), 'facts', 'Khatu Shyam', 'खाटू श्याम', 'Ramayan', 'रामायण', 'Mahabharat', 'महाभारत'].join(', '),
    synthetic: true,
  };
}

function run(args) {
  const r = spawnSync(FF, ['-y', '-hide_banner', '-loglevel', 'error', ...args], { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(r.stderr.slice(-800));
}
const probe = (f) => Number(spawnSync(FF.replace(/ffmpeg(\.exe)?$/, 'ffprobe$1'), ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }).stdout.trim());

/** Renders the compilation: intro, the Shorts as 9:16 panels on their blurred picture, outro; meta with chapters. */
export async function renderCompile(specFile, videosDir, outDir) {
  const spec = JSON.parse(read(specFile));
  const work = path.join(outDir, 'work');
  fs.mkdirSync(work, { recursive: true });
  const { chrome } = await import('../story/status-overlays.mjs');
  const font = `@font-face{font-family:'Yatra';src:url('${pathToFileURL(path.join(ROOT, 'brand/fonts/YatraOne-Regular.ttf')).href}')}`;
  const shot = (html, png, w, h, transparent = false) => {
    const page = png.replace(/\.(png|jpg)$/, '.html');
    fs.writeFileSync(page, html);
    spawnSync(chrome(), ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox', '--allow-file-access-from-files', '--force-device-scale-factor=1',
      ...(transparent ? ['--default-background-color=00000000'] : []), `--window-size=${w},${h}`, '--virtual-time-budget=4000', `--screenshot=${png}`, pathToFileURL(page).href], { timeout: 90000 });
    fs.rmSync(page, { force: true });
    if (!fs.existsSync(png)) throw new Error('Chrome made no picture');
    return png;
  };
  const bands = (lines, w, h, img) => `<!doctype html><html><head><meta charset="utf-8"><style>${font}
    html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;background:${img ? `url('${pathToFileURL(img).href}') center/cover` : 'transparent'}}
    .b{position:absolute;left:4%;width:92%;display:flex;align-items:center;justify-content:center;clip-path:polygon(1% 14%,6% 4%,22% 9%,41% 2%,63% 8%,82% 1%,97% 7%,100% 34%,98% 63%,100% 90%,84% 97%,61% 92%,40% 99%,19% 93%,3% 98%,0% 70%,2% 41%)}
    .t{font-family:'Yatra',sans-serif;white-space:nowrap;text-align:center;width:94%;overflow:hidden;paint-order:stroke fill;line-height:1.1}
    .b1{top:${h * 0.06}px;height:${h * 0.2}px;background:rgba(0,0,0,.86)} .b1 .t{color:#fff;-webkit-text-stroke:5px #000;height:${h * 0.19}px}
    .b2{top:${h * 0.25}px;height:${h * 0.3}px;background:rgba(0,0,0,.9)} .b2 .t{color:#FFD23F;-webkit-text-stroke:8px #3a1000;height:${h * 0.29}px}
    .b3{top:${h * 0.54}px;height:${h * 0.2}px;background:#C8102E} .b3 .t{color:#fff;-webkit-text-stroke:5px #4a0008;height:${h * 0.19}px}
    </style></head><body>${lines.map((l, i) => `<div class="b b${i + 1}"><div class="t">${l.replace(/[<>&]/g, '')}</div></div>`).join('')}
    <script>for(const el of document.querySelectorAll('.t')){let s=${Math.round(h * 0.27)};el.style.fontSize=s+'px';while(s>20&&(el.scrollWidth>el.clientWidth+1||el.scrollHeight>el.clientHeight+1)){s-=3;el.style.fontSize=s+'px'}}</script></body></html>`;
  const vids = spec.compile.map((c) => path.join(videosDir, `${c.slug}.mp4`));
  for (const v of vids) if (!fs.existsSync(v)) throw new Error(`missing Short video ${v}`);
  // the first Short's cover frame (0.1 s) is the thumbnail / intro picture
  const frame = path.join(work, 'frame.jpg');
  run(['-ss', '0.1', '-i', vids[0], '-frames:v', '1', '-vf', 'scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,boxblur=6:1', frame]);
  const thumb = path.join(outDir, `${spec.slug}-thumb.jpg`);
  shot(bands(spec.cover_lines, 1280, 720, frame), thumb.replace(/\.jpg$/, '.png'), 1280, 720);
  run(['-i', thumb.replace(/\.jpg$/, '.png'), '-q:v', '3', thumb]);
  fs.rmSync(thumb.replace(/\.jpg$/, '.png'), { force: true });
  const introPng = shot(bands(spec.cover_lines, 1920, 1080), path.join(work, 'intro.png'), 1920, 1080, true);
  // voices (plain edge-tts Madhur: short lines, no humanize needed)
  const say = (text, out) => {
    const r = spawnSync(process.env.PYTHON || 'python', ['-m', 'edge_tts', '--voice', 'hi-IN-MadhurNeural', '--text', text, '--write-media', out], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`edge-tts: ${r.stderr}`);
    return out;
  };
  const enc = ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '30', '-crf', '21', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2'];
  const drone = (d) => `aevalsrc='0.06*sin(2*PI*138.59*t)+0.04*sin(2*PI*207.65*t)|0.06*sin(2*PI*138.59*t+0.4)+0.04*sin(2*PI*207.65*t+0.3)':s=48000:d=${d}`;
  const segs = [];
  // intro (~15 s): the first Short's picture blurred, the title bands, the hook line over a soft drone
  const introV = say(spec.intro_tts, path.join(work, 'intro.mp3'));
  const iDur = Math.max(12, Math.min(16, probe(introV) + 1.5));
  const intro = path.join(work, 'seg-0.mp4');
  run(['-ss', '1', '-t', String(iDur), '-i', vids[0], '-loop', '1', '-t', String(iDur), '-i', introPng, '-i', introV, '-f', 'lavfi', '-i', drone(iDur),
    '-filter_complex', `[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,boxblur=24:3,eq=brightness=-0.2,fps=30,tpad=stop_mode=clone:stop_duration=${iDur}[bg];[bg][1:v]overlay=0:0,trim=duration=${iDur}[v];[2:a]adelay=400|400,apad[vo];[vo][3:a]amix=inputs=2:duration=longest:normalize=0,atrim=duration=${iDur},loudnorm=I=-14:TP=-1.5[a]`,
    '-map', '[v]', '-map', '[a]', ...enc, '-t', String(iDur), intro]);
  segs.push({ file: intro, seconds: iDur, title: 'Shuruaat' });
  // the Shorts as 9:16 centre panels over their own blurred picture, with the number and title on the left
  spec.compile.forEach((c, i) => {
    const d = probe(vids[i]);
    const tf = path.join(work, `title-${i}.txt`);
    fs.writeFileSync(tf, `${c.n}. ${c.title}`.slice(0, 40));
    const fontFile = (process.env.SUB_FONT || 'C\\:/Windows/Fonts/segoeuib.ttf');
    const esc = (p) => p.replace(/\\/g, '/').replace(/:/g, '\\:');
    const out = path.join(work, `seg-${i + 1}.mp4`);
    run(['-i', vids[i], '-filter_complex',
      `[0:v]split=2[a][b];[a]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,boxblur=30:3,eq=brightness=-0.25[bg];[b]scale=-2:1080[fg];` +
      `[bg][fg]overlay=(W-w)/2:0,drawtext=fontfile='${fontFile}':textfile='${esc(tf)}':fontsize=40:fontcolor=0xFFE27A:box=1:boxcolor=0x1a0b00@0.75:boxborderw=18:x=40:y=60,fps=30[v];` +
      `[0:a]aresample=48000,aformat=channel_layouts=stereo,loudnorm=I=-14:TP=-1.5[au]`, '-map', '[v]', '-map', '[au]', ...enc, out]);
    segs.push({ file: out, seconds: d, title: `${c.n}. ${c.title} (${String(c.source).split(';')[0].slice(0, 50)})` });
  });
  // outro (~8 s): the logo and the subscribe line
  const outroV = say(spec.outro_tts, path.join(work, 'outro.mp3'));
  const oDur = Math.max(7, probe(outroV) + 1.5);
  const outro = path.join(work, `seg-${segs.length}.mp4`);
  run(['-f', 'lavfi', '-i', `color=c=0x0b1430:s=1920x1080:r=30:d=${oDur}`, '-loop', '1', '-t', String(oDur), '-i', path.join(ROOT, 'brand/logo.png'), '-i', outroV, '-f', 'lavfi', '-i', drone(oDur),
    '-filter_complex', `[1:v]scale=640:640,format=rgba[lg];[0:v][lg]overlay=(W-w)/2:(H-h)/2-40,trim=duration=${oDur}[v];[2:a]adelay=300|300,apad[vo];[vo][3:a]amix=inputs=2:duration=longest:normalize=0,atrim=duration=${oDur},loudnorm=I=-14:TP=-1.5[a]`,
    '-map', '[v]', '-map', '[a]', ...enc, '-t', String(oDur), outro]);
  segs.push({ file: outro, seconds: oDur, title: 'Aashirwad aur agli kathayein' });
  // concat
  const list = path.join(work, 'list.txt');
  fs.writeFileSync(list, segs.map((s) => `file '${s.file.replace(/\\/g, '/')}'`).join('\n'));
  const out = path.join(outDir, `${spec.slug}.mp4`);
  run(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', out]);
  let t = 0;
  const chapters = segs.slice(0, -1).map((s) => { const c = { start: Math.round(t), title: s.title }; t += s.seconds; return c; });
  const meta = { seconds: probe(out), chapters, scenes: segs.length, render_seconds: 0, neurons: 0, images: 0, images_generated: 0 };
  fs.writeFileSync(path.join(outDir, `${spec.slug}.json`), JSON.stringify(meta, null, 2));
  return { out, thumb, ...meta };
}

// ---------------------------------------------------------------- the Shorts' descriptions: a link to the full video
async function ytToken() {
  const env = { ...Object.fromEntries(read(path.join(os.homedir(), '.shyampremisk', 'youtube.env')).split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()])), ...process.env };
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ client_id: env.YT_CLIENT_ID, client_secret: env.YT_CLIENT_SECRET, refresh_token: env.YT_REFRESH_TOKEN, grant_type: 'refresh_token' }) }).then((x) => x.json());
  if (!r.access_token) throw new Error(`token: ${r.error || 'none'}`);
  return r.access_token;
}
export async function linkShorts(spec, longUrl) {
  const token = await ytToken();
  const api = (u, o = {}) => fetch(`https://www.googleapis.com/youtube/v3/${u}`, { ...o, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }).then((x) => x.json());
  const done = [];
  for (const c of spec.compile) {
    const id = c.url.match(/(?:shorts\/|youtu\.be\/|v=)([\w-]{6,})/)?.[1];
    if (!id) continue;
    const v = (await api(`videos?part=snippet&id=${id}`)).items?.[0];
    if (!v || v.snippet.description.includes(longUrl)) continue;
    const snippet = { title: v.snippet.title, categoryId: v.snippet.categoryId, description: `${v.snippet.description}\n\nPoori series (long video): ${longUrl}`.slice(0, 4900), tags: v.snippet.tags, defaultLanguage: v.snippet.defaultLanguage, defaultAudioLanguage: v.snippet.defaultAudioLanguage };
    const r = await api('videos?part=snippet', { method: 'PUT', body: JSON.stringify({ id, snippet }) });
    done.push({ id, ok: !r.error, error: r.error?.message });
  }
  return done;
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
  const out = (o) => {
    console.log(JSON.stringify(o));
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(o).filter(([, v]) => typeof v !== 'object').map(([k, v]) => `${k}=${v}\n`).join(''));
  };
  if (args[0] === 'due') {
    const r = compileDue(opt('--date'));
    return out({ go: r.go, why: r.why, slugs: (r.shorts || []).map((s) => s.slug).join(' ') });
  }
  if (args[0] === 'spec') {
    const r = compileDue(opt('--date'));
    if (!r.go) { out({ status: 'none', why: r.why }); process.exit(2); }
    const s = compileSpec(opt('--date'), r.shorts);
    fs.mkdirSync(path.dirname(opt('--out')), { recursive: true });
    fs.writeFileSync(opt('--out'), `${JSON.stringify(s, null, 2)}\n`);
    return out({ status: 'ok', slug: s.slug, shorts: s.compile.length });
  }
  if (args[0] === 'render') return out(await renderCompile(opt('--spec'), opt('--videos'), opt('--out')));
  if (args[0] === 'link') return out({ linked: await linkShorts(JSON.parse(read(opt('--spec'))), opt('--url')) });
  console.log('usage: node scripts/facts-compile.mjs due --date D | spec --date D --out F | render --spec F --videos DIR --out DIR | link --spec F --url U');
  process.exit(2);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
