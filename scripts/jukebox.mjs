#!/usr/bin/env node
// "Chhath Geet 2026 Nonstop" jukebox (owner, 13 Nov 2026: the AI-sung Chhath bhajans everywhere; one long upload of
// all the full-length songs back to back gives watch time, and nonstop jukeboxes trend in this niche). The long slot of
// its day (automation/chhath-2026.json `days.<date>.long.kind = "jukebox"`), outside the Shorts cap (1 long a day).
//
//   node scripts/jukebox.mjs --date 2026-11-14 --out story/jukebox/work [--min-seconds 100] [--part 1] [--dry-run]
//
// Songs: every QA-passed library bhajan of the festival (music/library/bhajan-*.licence.json, `bhajan.festival`) of at
// least --min-seconds, in festival-day order (nahay-khay, kharna, sandhya-arghya, usha-arghya, parana, general), 1.2 s
// apart. Pictures: the licence-safe AI picture bank brand/photo-bank/<festival>/ (landscape -w*.jpg first; faceless),
// 2-4 per song with a slow Ken Burns move. Text: the song number + Hindi title for the first 6 s of each song, and the
// WRITTEN lyric line under the music while Whisper heard it (bhajan.segments from the QA gate; no segments = no
// captions for that song). libass draws the Devanagari (Tiro Devanagari Hindi / Yatra One, OFL, brand/fonts).
// Output in --out: <slug>.mp4 (1920x1080, 25 fps, -14 LUFS), <slug>.json (chapters per song, for youtube.mjs --long and
// meta.mjs long), <slug>-thumb.jpg (1280x720), scenes.json (youtube_title / description / tags / captions).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { bhaktiTags, bhaktiTitle, withTags } from './bhakti-seo.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FF = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE = FF.replace(/ffmpeg(\.exe)?$/, 'ffprobe$1');
export const DAY_ORDER = ['nahay-khay', 'kharna', 'sandhya-arghya', 'usha-arghya', 'parana'];
const GAP = 1.2;
const FPS = 25;

const plainNorm = (s) => String(s || '').normalize('NFC').replace(/[‌‍]/g, '').replace(/़/g, '').replace(/[^\p{L}\p{M}\p{N}]+/gu, '');
const bigrams = (s) => { const c = [...plainNorm(s)]; const o = new Set(); for (let i = 0; i < c.length - 1; i++) o.add(c[i] + c[i + 1]); return o; };
export function dice(a, b) {
  const A = bigrams(a), B = bigrams(b);
  if (!A.size || !B.size) return 0;
  let n = 0;
  for (const x of A) if (B.has(x)) n++;
  return (2 * n) / (A.size + B.size);
}
const sung = (lyrics) => String(lyrics || '').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !/^\[.*\]$/.test(l));

/** Lyric captions of one song: [{ start, end, text }] = the written line Whisper heard in each segment (in order). */
export function lyricCaptions(lyrics, segments = [], { min = 0.3 } = {}) {
  const lines = sung(lyrics);
  const out = [];
  let k = 0; // the next written line to look from (songs run forward; choruses repeat, so search a window ahead)
  for (const s of segments) {
    if (!s || !(s.end > s.start) || !plainNorm(s.text)) continue;
    // a segment may hold 1-2 lines: try the next few lines, alone and in pairs
    let best = null;
    for (let i = k; i < Math.min(lines.length, k + 6); i++) {
      const one = dice(lines[i], s.text);
      if (!best || one > best.score) best = { i, n: 1, score: one };
      if (i + 1 < lines.length) {
        const two = dice(`${lines[i]} ${lines[i + 1]}`, s.text);
        if (two > best.score + 0.05) best = { i, n: 2, score: two };
      }
    }
    if (!best || best.score < min) continue;
    const span = (s.end - s.start) / best.n;
    for (let j = 0; j < best.n; j++) out.push({ start: +(s.start + j * span).toFixed(2), end: +(s.start + (j + 1) * span + 0.25).toFixed(2), text: lines[best.i + j] });
    k = best.i + best.n;
    if (k >= lines.length) k = 0;
  }
  for (let i = 0; i < out.length - 1; i++) out[i].end = Math.min(out[i].end, +(out[i + 1].start - 0.05).toFixed(2));
  return out;
}

const assTime = (t) => {
  const cs = Math.max(0, Math.round(t * 100));
  const h = Math.floor(cs / 360000), m = Math.floor((cs % 360000) / 6000), s = Math.floor((cs % 6000) / 100), c = cs % 100;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(c).padStart(2, '0')}`;
};
const assEsc = (t) => String(t).replace(/[{}]/g, '').replace(/\n/g, '\\N');
export function assHeader(w = 1920, h = 1080) {
  return [
    '[Script Info]', 'ScriptType: v4.00+', `PlayResX: ${w}`, `PlayResY: ${h}`, 'WrapStyle: 0', 'ScaledBorderAndShadow: yes', '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    'Style: Lyric,Tiro Devanagari Hindi,72,&H00FFFFFF,&H00FFFFFF,&H78000000,&H78000000,0,0,0,0,100,100,0,0,3,10,0,2,80,80,64,1',
    'Style: Title,Yatra One,58,&H0077D8FF,&H0077D8FF,&H00101010,&H96000000,0,0,0,0,100,100,0,0,1,4,2,7,60,60,50,1',
    'Style: Small,Yatra One,34,&H00FFFFFF,&H00FFFFFF,&H00101010,&H96000000,0,0,0,0,100,100,0,0,1,3,1,7,60,60,118,1',
    'Style: Big,Yatra One,120,&H0077D8FF,&H0077D8FF,&H00101010,&H96000000,0,0,0,0,100,100,0,0,1,7,3,5,60,60,60,1',
    'Style: Mid,Yatra One,64,&H00FFFFFF,&H00FFFFFF,&H00101010,&H96000000,0,0,0,0,100,100,0,0,1,5,2,2,60,60,90,1',
    '', '[Events]', 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ].join('\n');
}
const ev = (a, b, style, text) => `Dialogue: 0,${assTime(a)},${assTime(b)},${style},,0,0,0,,${assEsc(text)}`;

const run = (args, opts = {}) => {
  const r = spawnSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { encoding: 'utf8', maxBuffer: 1 << 26, ...opts });
  if (r.status !== 0) throw new Error(`ffmpeg: ${(r.stderr || '').trim().split('\n').slice(-3).join(' | ')}`);
};
const probe = (f) => Number(spawnSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }).stdout.trim());

export function bankPictures(festival) {
  const d = path.join(ROOT, 'brand', 'photo-bank', festival);
  if (!fs.existsSync(d)) return [];
  const all = fs.readdirSync(d).filter((f) => /\.jpe?g$/i.test(f)).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  return [...all.filter((f) => /-w\d+\.jpe?g$/.test(f)), ...all.filter((f) => !/-w\d+\.jpe?g$/.test(f))].map((f) => path.join(d, f));
}

/** The songs of the jukebox, in festival-day order. */
export function jukeboxSongs(library, { festival = 'chhath', minSeconds = 100 } = {}) {
  const rank = (b) => { const i = DAY_ORDER.indexOf(b.bhajan.day); return i < 0 ? DAY_ORDER.length : i; };
  return library.filter((b) => b.bhajan?.festival === festival && (b.bhajan.seconds || 0) >= minSeconds)
    .sort((a, b) => rank(a) - rank(b) || (a.qa?.cer ?? 1) - (b.qa?.cer ?? 1) || a.id.localeCompare(b.id));
}

export function buildPlan(songs, pics, { per = 38 } = {}) {
  let t = 0;
  let p = 0;
  return songs.map((s, i) => {
    const dur = s.seconds;
    const n = Math.max(2, Math.min(4, Math.ceil(dur / per)));
    const shots = Array.from({ length: n }, (_, k) => ({ image: pics[(p + k) % pics.length], seconds: +(dur / n + (k === n - 1 ? (i === songs.length - 1 ? 0 : GAP) : 0)).toFixed(2) }));
    p += n;
    const row = { ...s, start: +t.toFixed(2), shots };
    t += dur + (i === songs.length - 1 ? 0 : GAP);
    return row;
  });
}

function main() {
  const args = process.argv.slice(2);
  const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
  const date = opt('--date');
  const out = path.resolve(opt('--out', path.join(ROOT, 'story', 'jukebox', 'work')));
  const festival = opt('--festival', 'chhath');
  fs.mkdirSync(out, { recursive: true });
  const libDir = path.resolve(opt('--library', path.join(ROOT, 'music', 'library')));
  const library = fs.readdirSync(libDir).filter((f) => /^bhajan-.*\.licence\.json$/.test(f)).map((f) => ({ ...JSON.parse(fs.readFileSync(path.join(libDir, f), 'utf8')), file: path.join(libDir, f.replace(/\.licence\.json$/, '.ogg')) }))
    .filter((b) => fs.existsSync(b.file));
  const songs = jukeboxSongs(library, { festival, minSeconds: Number(opt('--min-seconds', 100)) }).map((b) => ({ id: b.id, file: b.file, seconds: probe(b.file) || b.bhajan.seconds, title_hi: b.bhajan.title_hi, title_roman: b.bhajan.title_roman || b.title, day: b.bhajan.day, lyrics: b.bhajan.lyrics, segments: b.bhajan.segments || [] }));
  if (songs.length < 4) { console.log(JSON.stringify({ error: `only ${songs.length} full-length ${festival} bhajans` })); process.exit(1); }
  const pics = bankPictures(festival);
  if (pics.length < 4) { console.log(JSON.stringify({ error: `only ${pics.length} bank pictures` })); process.exit(1); }
  const plan = buildPlan(songs, pics);
  const total = plan.at(-1).start + plan.at(-1).seconds;
  const n = songs.length;
  const slug = `${date}-long-chhath-geet-nonstop`;
  // ---- texts
  const chapters = plan.map((s, i) => ({ title: `${i + 1}. ${s.title_roman} (${s.title_hi})`, start: s.start }));
  const listHi = plan.map((s, i) => `${i + 1}. ${s.title_hi}`).join('\n');
  const spec = {
    slug, format: 'long', date, festival: 'Chhath Puja 2026', deity: 'Chhathi Maiya / Surya dev', kind: 'jukebox',
    // + "Bhakti Geet" (a searched generic phrase, scripts/bhakti-seo.mjs)
    youtube_title: bhaktiTitle(`Chhath Puja Geet 2026 Nonstop | ${n} Chhath Geet | छठ पूजा गीत | Chhath Puja Song`, { date, festival }, 100),
    youtube_description: [
      `छठ पूजा 2026 के ${n} नए छठ गीत, एक साथ नॉनस्टॉप। नहाय खाय और खरना से संध्या अर्घ्य, उषा अर्घ्य और पारण तक, छठी मइया और सूर्य देव के भक्ति गीत।`,
      'घाट पर, घर में या स्टेटस पर, पूरे परिवार के साथ सुनिए। जय छठी मइया, जय सूर्य देव 🙏',
      '',
      `Chhath Puja Geet 2026 Nonstop: ${n} original Chhath geet in one video, Nahay Khay se Usha Arghya aur Parana tak.`,
      '',
      'गीत सूची:', listHi,
      '',
      'Bhakti Geet | भक्ति गीत: Shyam Premi SN ke naye maulik bhajan.',
      'भजन: मौलिक रचना, AI द्वारा गाया गया (ACE-Step)',
      'Sabhi geet Shyam Premi SN ki maulik rachna hain (kisi gayak ki awaaz ki nakal nahi). Chitra AI dwara banaye gaye hain (sanketik).',
      '',
      'Aise hi bhajan aur darshan ke liye subscribe karein: Shyam Premi SN',
      '',
      '#ChhathPuja #ChhathGeet #छठपूजा',
    ].join('\n'),
    youtube_tags: withTags(['chhath puja geet 2026', 'chhath geet nonstop', 'chhath puja song', 'chhath puja song 2026', 'chhath geet', 'chhathi maiya song', 'nahay khay geet', 'kharna geet',
      'sandhya arghya geet', 'usha arghya geet', 'छठ पूजा गीत', 'छठ गीत', 'छठी मइया के गीत', 'छठ पूजा 2026', 'bhojpuri chhath geet'].join(', '), bhaktiTags({ festival, date })),
    facebook_caption: '',
    songs: plan.map((s) => ({ id: s.id, start: s.start, seconds: s.seconds, title_hi: s.title_hi, title_roman: s.title_roman, day: s.day })),
    bhajan: { id: plan.map((s) => s.id).join(','), mode: 'jukebox' },
  };
  fs.writeFileSync(path.join(out, 'scenes.json'), `${JSON.stringify(spec, null, 2)}\n`);
  fs.writeFileSync(path.join(out, `${slug}.json`), `${JSON.stringify({ slug, seconds: +total.toFixed(2), songs: n, chapters }, null, 2)}\n`);
  // ---- captions
  const ass = [assHeader()];
  let captioned = 0;
  plan.forEach((s, i) => {
    ass.push(ev(s.start + 0.3, s.start + 6.5, 'Title', `${i + 1}. ${s.title_hi}`));
    ass.push(ev(s.start + 0.3, s.start + 6.5, 'Small', 'Chhath Geet 2026 Nonstop | Shyam Premi SN'));
    const caps = lyricCaptions(s.lyrics, s.segments);
    if (caps.length) captioned++;
    for (const c of caps) if (c.start < s.seconds) ass.push(ev(s.start + c.start, s.start + Math.min(c.end, s.seconds), 'Lyric', c.text));
  });
  const assFile = path.join(out, 'lyrics.ass');
  fs.writeFileSync(assFile, `${ass.join('\n')}\n`);
  console.log(JSON.stringify({ slug, songs: n, seconds: +total.toFixed(1), captioned, pictures: pics.length }));
  if (args.includes('--dry-run')) return;
  // ---- video: one Ken Burns shot per picture, fade at each cut, then the captions
  const inputs = [];
  const chains = [];
  const shots = plan.flatMap((s) => s.shots);
  shots.forEach((sh, k) => {
    inputs.push('-i', sh.image);
    const frames = Math.max(2, Math.round(sh.seconds * FPS));
    const zin = k % 2 === 0;
    const z = zin ? `min(1+0.10*on/${frames},1.10)` : `max(1.10-0.10*on/${frames},1.0)`;
    chains.push(`[${k}:v]scale=2400:1350:force_original_aspect_ratio=increase,crop=2400:1350,setsar=1,zoompan=z='${z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1920x1080:fps=${FPS},trim=end_frame=${frames},setpts=PTS-STARTPTS,format=yuv420p,fade=t=in:st=0:d=0.5,fade=t=out:st=${(frames / FPS - 0.5).toFixed(2)}:d=0.5[v${k}]`);
  });
  const fontsdir = path.join(ROOT, 'brand', 'fonts').replace(/\\/g, '/').replace(/^([A-Za-z]):/, '$1\\:');
  const assEscPath = assFile.replace(/\\/g, '/').replace(/^([A-Za-z]):/, '$1\\:');
  const vf = `${chains.join(';')};${shots.map((_, k) => `[v${k}]`).join('')}concat=n=${shots.length}:v=1:a=0[vc];[vc]subtitles='${assEscPath}':fontsdir='${fontsdir}'[v]`;
  const vid = path.join(out, 'video-only.mp4');
  fs.writeFileSync(path.join(out, 'filter.txt'), vf);
  run([...inputs, '-filter_complex', vf, '-map', '[v]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p', '-r', String(FPS), vid]);
  // ---- audio: the songs back to back, GAP s apart, -14 LUFS
  const ain = songs.flatMap((s) => ['-i', s.file]);
  const af = `${songs.map((_, i) => `[${i}:a]aresample=48000,aformat=channel_layouts=stereo${i < songs.length - 1 ? `,apad=pad_dur=${GAP}` : ''}[a${i}]`).join(';')};${songs.map((_, i) => `[a${i}]`).join('')}concat=n=${songs.length}:v=0:a=1,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]`;
  const aud = path.join(out, 'audio.m4a');
  run([...ain, '-filter_complex', af, '-map', '[a]', '-c:a', 'aac', '-b:a', '192k', aud]);
  const mp4 = path.join(out, `${slug}.mp4`);
  run(['-i', vid, '-i', aud, '-map', '0:v', '-map', '1:a', '-c', 'copy', '-shortest', '-movflags', '+faststart', mp4]);
  // ---- thumbnail
  const thumbAss = path.join(out, 'thumb.ass');
  fs.writeFileSync(thumbAss, `${[assHeader(1280, 720).replace('Big,Yatra One,120', 'Big,Yatra One,104').replace('Mid,Yatra One,64', 'Mid,Yatra One,56'),
    ev(0, 5, 'Big', 'छठ पूजा गीत 2026'), ev(0, 5, 'Mid', `NONSTOP | ${n} नए छठ गीत`)].join('\n')}\n`);
  const thumbEsc = thumbAss.replace(/\\/g, '/').replace(/^([A-Za-z]):/, '$1\\:');
  run(['-i', pics[0], '-vf', `scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,eq=brightness=-0.06,subtitles='${thumbEsc}':fontsdir='${fontsdir}'`, '-frames:v', '1', '-q:v', '2', path.join(out, `${slug}-thumb.jpg`)]);
  fs.rmSync(vid, { force: true });
  fs.rmSync(aud, { force: true });
  console.log(JSON.stringify({ out: mp4, seconds: probe(mp4), thumb: path.join(out, `${slug}-thumb.jpg`) }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { main(); } catch (e) { console.log(JSON.stringify({ error: e.message })); process.exit(1); }
}
