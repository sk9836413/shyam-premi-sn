#!/usr/bin/env node
// Weekly mantra-jaap long video (owner, 13 Nov 2026; automation/mantras.json, scripts/mantra.mjs): the day's 12:30 IST
// long video once a week (day-plan kind "mantra"), made the evening before by daily.yml job `mantra`. Runner only (the
// ACE-Step takes were made earlier on Kaggle by music/mantra-takes.mjs).
//
//   node scripts/mantra-long.mjs due --date YYYY-MM-DD        is it a mantra day, and are there enough unused takes?
//        prints JSON; GITHUB_OUTPUT due=true|false, mantra, why
//   node scripts/mantra-long.mjs render --date YYYY-MM-DD --out <dir> [--dry-run]
//        [--mantra <id> --take-files a.ogg,b.ogg --sample]   (a local sample from any audio files; no ledger)
//   node scripts/mantra-long.mjs record --spec <dir>/scenes.json   after the upload: takes used_in + the video in
//        music/mantra/takes.json, the used takes' audio deleted (never reused)
//
// The video (1920x1080, 25 fps, -14 LUFS):
//   intro 30-60 s   the mantra, its meaning, the right pronunciation and how to chant, said by our human voice chain
//                   (edge-tts + voice/humanize.py; no owner voice, no cloned singer) over a soft drone, captions
//   malas           one ACE-Step take each (slow - medium - slow), its loop of `reps` chants repeated 108/reps times
//                   with a crossfaded seam (scripts/mantra.mjs findLoop), an on-screen counter 1..108, "माला k / n",
//                   the mantra text; a temple bell + drone bridge between malas; one YouTube chapter per mala
//   ending          "ॐ शांति" + like/share/subscribe, drone and bell, slow fade
//   pictures        licence-checked real temple photos of the mantra's deity (footage/<temple>/, CC BY/CC0/PD), the
//                   week's least-used set, one every ~40 s, slow zoom, 1 s dip between pictures (no flashing), credited
// Outputs in --out: <slug>.mp4, <slug>.json (chapters, seconds), <slug>-thumb.jpg, scenes.json (spec for youtube.mjs,
// validate.mjs and meta.mjs).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assHeader } from './jukebox.mjs';
import { creditLine, photosFor } from './real-photos.mjs';
import { addDays, analyzeTake, chooseMalas, counterEvents, loadLedger, loadMantras, malaPlan, mantraDescription, mantraFor, mantraSlug, mantraTitle, pickPictures, pickTakes, saveLedger, usedIds } from './mantra.mjs';
import { withTags } from './bhakti-seo.mjs';
import { loadInputs } from './day-plan.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FF = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE = FF.replace(/ffmpeg(\.exe)?$/, 'ffprobe$1');
const PYTHON = process.env.PYTHON || 'python';
const FPS = 25;
const SR = 48000;
const BRIDGE = 6;
const XF = 0.35;
const SHOT = 42; // target seconds per picture (30-60)
// Extra libass styles next to jukebox.mjs assHeader (Lyric / Title / Small / Big / Mid): the mantra text (top, on a soft
// box), the counter (bottom right), "माला k / n" (bottom left), the photo credit line, and the centred cards between malas
// and at the end. Devanagari with a matra/anusvara is always Tiro Devanagari Hindi: Yatra One drops the anusvara
// ("शांति" came out "शाति" in the 13 Nov sample).
const MANTRA_STYLES = [
  'Style: Mantra,Tiro Devanagari Hindi,84,&H0077D8FF,&H0077D8FF,&H70000000,&H70000000,1,0,0,0,100,100,0,0,3,14,0,8,80,80,50,1',
  'Style: Card,Tiro Devanagari Hindi,110,&H0077D8FF,&H0077D8FF,&H00101010,&H96000000,1,0,0,0,100,100,0,0,1,7,3,5,80,80,60,1',
  'Style: CardSub,Tiro Devanagari Hindi,52,&H00FFFFFF,&H00FFFFFF,&H00101010,&H96000000,0,0,0,0,100,100,0,0,1,4,2,8,80,80,700,1',
  'Style: Count,Yatra One,96,&H00FFFFFF,&H00FFFFFF,&H00101010,&HA0000000,0,0,0,0,100,100,0,0,1,6,2,3,90,90,70,1',
  'Style: Mala,Yatra One,40,&H0077D8FF,&H0077D8FF,&H00101010,&HA0000000,0,0,0,0,100,100,0,0,1,4,1,1,90,90,80,1',
  'Style: Credit,DejaVu Sans,20,&H00DDDDDD,&H00DDDDDD,&H00101010,&H80000000,0,0,0,0,100,100,0,0,1,2,0,1,30,30,18,1',
];

const run = (a) => {
  const r = spawnSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', ...a], { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`ffmpeg: ${(r.stderr || '').trim().split('\n').slice(-3).join(' | ')}`);
};
const probe = (f) => Number(spawnSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }).stdout.trim());
const assTime = (t) => {
  const cs = Math.max(0, Math.round(t * 100));
  const h = Math.floor(cs / 360000), m = Math.floor((cs % 360000) / 6000), s = Math.floor((cs % 6000) / 100), c = cs % 100;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(c).padStart(2, '0')}`;
};
const ev = (a, b, style, text, layer = 0) => `Dialogue: ${layer},${assTime(a)},${assTime(b)},${style},,0,0,0,,${String(text).replace(/[{}]/g, '').replace(/\n/g, '\\N')}`;
const escPath = (p) => p.replace(/\\/g, '/').replace(/^([A-Za-z]):/, '$1\\:');
const pcm = ['-ar', String(SR), '-ac', '2', '-c:a', 'pcm_s16le'];

// soft tanpura-like drone (C# - G# - C#, slow beating) and a temple bell, synthesized (no samples)
const drone = (d, v = 1) => `aevalsrc='${(0.09 * v).toFixed(3)}*sin(2*PI*138.59*t)*(1+0.25*sin(2*PI*0.18*t))+${(0.06 * v).toFixed(3)}*sin(2*PI*207.65*t)*(1+0.25*sin(2*PI*0.23*t))+${(0.045 * v).toFixed(3)}*sin(2*PI*277.18*t)|${(0.09 * v).toFixed(3)}*sin(2*PI*138.59*t+0.4)*(1+0.25*sin(2*PI*0.21*t))+${(0.06 * v).toFixed(3)}*sin(2*PI*207.65*t+0.3)+${(0.045 * v).toFixed(3)}*sin(2*PI*277.18*t+0.2)':s=${SR}:d=${d.toFixed(3)}`;
const bell = (d = 5) => `aevalsrc='0.45*sin(2*PI*1046*t)*exp(-2.2*t)+0.25*sin(2*PI*2093*t)*exp(-3.5*t)+0.15*sin(2*PI*1568*t)*exp(-2.8*t)':s=${SR}:d=${d}`;

/** Spoken lines through the human voice chain: [{ file, seconds }]. */
function speak(lines, work, tag) {
  const items = lines.map((text, i) => ({ text, voice: 'hm_omega', out: path.join(work, `${tag}-${i}.wav`), lead: 0, seed: `mantra-${tag}-${i}` }));
  const job = path.join(work, `${tag}-job.json`);
  fs.writeFileSync(job, JSON.stringify({ items, concurrency: 4 }));
  const r = spawnSync(PYTHON, ['-I', path.join(ROOT, 'voice', 'humanize.py'), job], { encoding: 'utf8', env: { ...process.env, FFMPEG_PATH: FF }, maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`humanize: ${(r.stderr || '').trim().split('\n').pop()}`);
  const res = JSON.parse(r.stdout.trim().split('\n').pop());
  const bad = res.find((x) => x.error);
  if (bad) throw new Error(`humanize: ${bad.error}`);
  return res.map((x) => ({ file: x.file, seconds: probe(x.file) }));
}

/** Voice lines placed one after another (gap s) from `at`: [{ ...line, start }] and the end time. */
function place(lines, at, gap = 0.45) {
  let t = at;
  const out = lines.map((l) => { const p = { ...l, start: +t.toFixed(3) }; t += l.seconds + gap; return p; });
  return { lines: out, end: t - gap };
}

/** A section with drone + bell + voice lines, `len` s long (wav). */
function section(file, len, placed, { bellAt = 0, droneVol = 1, fadeIn = 1.5, fadeOut = 2.5 } = {}) {
  const inputs = ['-f', 'lavfi', '-i', drone(len, droneVol), '-f', 'lavfi', '-i', bell()];
  const parts = ['[0:a]volume=0.8[d]', `[1:a]adelay=${Math.round(bellAt * 1000)}|${Math.round(bellAt * 1000)},volume=0.7[b]`];
  const mix = ['[d]', '[b]'];
  placed.forEach((l, i) => {
    inputs.push('-i', l.file);
    const ms = Math.round(l.start * 1000);
    parts.push(`[${i + 2}:a]aresample=${SR},aformat=channel_layouts=stereo,adelay=${ms}|${ms}[v${i}]`);
    mix.push(`[v${i}]`);
  });
  parts.push(`${mix.join('')}amix=inputs=${mix.length}:normalize=0:duration=first,afade=t=in:d=${fadeIn},afade=t=out:st=${(len - fadeOut).toFixed(3)}:d=${fadeOut},atrim=end=${len.toFixed(3)}[a]`);
  run([...inputs, '-filter_complex', parts.join(';'), '-map', '[a]', ...pcm, file]);
}

/** One mala: the take's own first pass of the loop, then (copies - 1) seamless loops (head crossfaded with the
 *  continuation after the loop end), exactly copies x loop.length s. */
function malaAudio(take, plan, work, k) {
  const { start: S, length: L } = take.loop;
  const loop = path.join(work, `loop-${k}.wav`);
  const first = path.join(work, `first-${k}.wav`);
  const s0 = Math.round(S * SR), sL = Math.round(L * SR), sX = Math.round(XF * SR);
  const base = `aresample=${SR},aformat=sample_fmts=fltp:channel_layouts=stereo`;
  run(['-i', take.file, '-filter_complex',
    `[0:a]${base},asplit=3[a1][a2][a3];`
    + `[a1]atrim=start_sample=${s0 + sL}:end_sample=${s0 + sL + sX},asetpts=PTS-STARTPTS,afade=t=out:d=${XF}:curve=qsin[t];`
    + `[a2]atrim=start_sample=${s0}:end_sample=${s0 + sX},asetpts=PTS-STARTPTS,afade=t=in:d=${XF}:curve=qsin[h];`
    + `[t][h]amix=inputs=2:normalize=0[hm];[a3]atrim=start_sample=${s0 + sX}:end_sample=${s0 + sL},asetpts=PTS-STARTPTS[body];`
    + '[hm][body]concat=n=2:v=0:a=1[a]', '-map', '[a]', ...pcm, loop]);
  run(['-i', take.file, '-af', `${base},atrim=start_sample=${s0}:end_sample=${s0 + sL},asetpts=PTS-STARTPTS,afade=t=in:d=0.6`, ...pcm, first]);
  const out = path.join(work, `mala-${k}.wav`);
  const list = path.join(work, `mala-${k}.txt`);
  fs.writeFileSync(list, [`file '${first.replace(/\\/g, '/')}'`, ...Array(plan.copies - 1).fill(`file '${loop.replace(/\\/g, '/')}'`)].join('\n'));
  run(['-f', 'concat', '-safe', '0', '-i', list, '-af', `afade=t=out:st=${(plan.seconds - 1.5).toFixed(3)}:d=1.5`, ...pcm, out]);
  return out;
}

/** Two-pass loudness normalisation to -14 LUFS / -1.5 dBTP (AAC 192k). */
function loudnorm(src, dst) {
  const r = spawnSync(FF, ['-hide_banner', '-nostats', '-i', src, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const m = (r.stderr || '').match(/\{[^{}]*"input_i"[^{}]*\}/s);
  if (!m) throw new Error('loudness probe failed');
  const j = JSON.parse(m[0]);
  run(['-i', src, '-af', `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true,aresample=${SR}`, '-c:a', 'aac', '-b:a', '192k', dst]);
  return Number(j.input_i);
}

/** The week's pictures: licence-checked real photos of the mantra's temples. */
export function picturePool(m, root = ROOT, skip = null) {
  const bad = skip ? new RegExp(skip, 'i') : null; // mantras.json picture_skip: walls, steps, festival crowds
  const from = (list) => (list || []).flatMap((t) => { try { return photosFor(t, path.join(root, 'footage')); } catch { return []; } })
    .filter((p) => !bad || !bad.test(`${path.basename(p.file)} ${p.title || ''}`));
  let pool = from(m.temples);
  if (pool.length < 8) pool = [...pool, ...from(m.fallback_temples)];
  return pool;
}

/** The whole timeline: { intro, malas: [{ start, seconds, ... }], ending, total, chapters }. */
export function timeline({ introLen, malaPlans, endingLen, bridge = BRIDGE }) {
  let t = introLen;
  const malas = malaPlans.map((p, i) => { if (i) t += bridge; const r = { ...p, start: +t.toFixed(3), chapter: +(i ? t - bridge : t).toFixed(3) }; t += p.seconds; return r; });
  const ending = +t.toFixed(3);
  return { intro: introLen, malas, ending, total: +(t + endingLen).toFixed(3) };
}

function render() {
  const args = process.argv.slice(2);
  const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
  const date = opt('--date');
  const out = path.resolve(opt('--out', path.join(ROOT, 'story', 'mantra', 'work')));
  const sample = args.includes('--sample');
  const work = path.join(out, 'tmp');
  fs.rmSync(work, { recursive: true, force: true });
  fs.mkdirSync(work, { recursive: true });
  const cat = loadMantras(ROOT);
  const ledger = loadLedger(ROOT);
  let m;
  if (opt('--mantra')) m = { ...cat.mantras[opt('--mantra')], id: opt('--mantra'), date };
  else {
    m = mantraFor(date, loadInputs(ROOT));
    if (!m) throw new Error(`${date} is not a mantra day`);
  }
  // ---- takes (never reused)
  let takes;
  if (opt('--take-files')) {
    const styles = cat.styles;
    takes = opt('--take-files').split(',').map((f, i) => {
      const loop = analyzeTake(path.resolve(f), { estPeriod: Number(opt('--period', (m.sec_per_rep[0] + m.sec_per_rep[1]) / 2)) });
      if (loop.error) throw new Error(`${f}: ${loop.error}`);
      const st = styles[i % styles.length];
      return { id: `sample-${i + 1}`, file: path.resolve(f), loop, style: st.id, tempo: st.tempo, raag: st.raag };
    });
  } else {
    takes = pickTakes(ledger, { mantra: m.id, date, exists: (t) => fs.existsSync(path.join(ROOT, t.file)) }).map((t) => ({ ...t, file: path.join(ROOT, t.file) }));
    const used = usedIds(ledger);
    if (takes.some((t) => used.has(t.id))) throw new Error('a used take was picked');
  }
  if (opt('--malas')) takes = takes.slice(0, Number(opt('--malas')));
  const ch = chooseMalas(takes, { cat, sample });
  if (!ch) throw new Error(`not enough unused QA-passed takes for ${m.id} (${takes.length}): the long job tells a katha instead`);
  takes = takes.slice(0, ch.malas);
  const plans = takes.map((t) => malaPlan(t.loop));
  const slug = mantraSlug(date, m.id);
  // ---- voice: intro + ending
  const introV = speak(m.intro_tts, work, 'intro');
  const intro = place(introV, 2.2, 0.5);
  const introLen = Math.max(30, Math.min(62, intro.end + 2.5));
  const endText = cat.ending_tts.split(/(?<=।)\s+/);
  const endV = speak(endText, work, 'end');
  const ending = place(endV, 2.5, 0.6);
  const endingLen = ending.end + 7;
  const tl = timeline({ introLen, malaPlans: plans, endingLen });
  // ---- audio
  const segs = [];
  const introWav = path.join(work, 'intro.wav');
  section(introWav, introLen, intro.lines, { bellAt: 0.2, fadeOut: 1.2 });
  segs.push(introWav);
  takes.forEach((t, k) => {
    if (k) { const b = path.join(work, `bridge-${k}.wav`); section(b, BRIDGE, [], { bellAt: 0.3, fadeIn: 0.8, fadeOut: 1.0, droneVol: 1.2 }); segs.push(b); }
    segs.push(malaAudio(t, plans[k], work, k));
  });
  const endWav = path.join(work, 'ending.wav');
  section(endWav, endingLen, ending.lines, { bellAt: 0.3, fadeIn: 1.0, fadeOut: 5 });
  segs.push(endWav);
  const list = path.join(work, 'audio.txt');
  fs.writeFileSync(list, segs.map((f) => `file '${f.replace(/\\/g, '/')}'`).join('\n'));
  const full = path.join(work, 'full.wav');
  run(['-f', 'concat', '-safe', '0', '-i', list, ...pcm, full]);
  const aud = path.join(work, 'audio.m4a');
  const lufsIn = loudnorm(full, aud);
  const total = probe(full);
  // ---- pictures: the week's set, one every ~SHOT s
  const pool = picturePool(m, ROOT, cat.picture_skip);
  if (pool.length < 4) throw new Error(`only ${pool.length} licence-checked photos for ${m.id}`);
  const set = pickPictures(pool.map((p) => p.file), ledger, { n: Math.min(24, pool.length), seed: m.week || 0 });
  const byFile = Object.fromEntries(pool.map((p) => [p.file, p]));
  const nShots = Math.max(1, Math.round(total / SHOT));
  const shotLen = total / nShots;
  const shots = Array.from({ length: nShots }, (_, i) => ({ pic: set[i % set.length], start: i * shotLen, seconds: shotLen }));
  // ---- text (libass, OFL fonts in brand/fonts)
  const n = takes.length;
  const lines = [assHeader().replace('\n\n[Events]', `\n${MANTRA_STYLES.join('\n')}\n\n[Events]`)];
  const evs = [];
  evs.push(ev(0.4, introLen - 0.3, 'Mantra', m.short || m.text));
  intro.lines.forEach((l, i) => evs.push(ev(l.start, Math.min(introLen - 0.2, l.start + l.seconds + 0.4), 'Lyric', m.intro_tts[i])));
  evs.push(ev(Math.max(0.5, introLen - 9), introLen - 0.3, 'Credit', cat.disclosure));
  tl.malas.forEach((x, k) => {
    const t = takes[k];
    if (k) {
      evs.push(ev(x.start - BRIDGE + 0.4, x.start - 0.2, 'Card', `माला ${k + 1} / ${n}`));
      evs.push(ev(x.start - BRIDGE + 0.8, x.start - 0.2, 'CardSub', `राग ${t.raag || ''} | Raag ${t.raag || ''}`));
    }
    evs.push(ev(x.start, x.start + x.seconds, 'Mantra', m.short ? m.text.replace(', ', '\n') : m.text));
    evs.push(ev(x.start, x.start + x.seconds, 'Mala', `माला ${k + 1} / ${n}`));
    for (const c of counterEvents(plans[k])) evs.push(ev(x.start + c.start, x.start + c.end, 'Count', `${c.n} / 108`));
  });
  evs.push(ev(tl.ending + 0.5, tl.total - 0.5, 'Card', 'ॐ शांति शांति शांतिः'));
  evs.push(ev(tl.ending + 3, tl.total - 0.5, 'CardSub', 'Like | Share | Subscribe: Shyam Premi SN'));
  ending.lines.forEach((l, i) => evs.push(ev(tl.ending + l.start, tl.ending + l.start + l.seconds + 0.4, 'Lyric', endText[i])));
  for (const s of shots) {
    const lic = byFile[s.pic];
    if (lic) evs.push(ev(s.start + 1, s.start + s.seconds - 1, 'Credit', lic.attribution || `Photo: ${lic.author}, ${lic.licence}`));
  }
  const assFile = path.join(work, 'mantra.ass');
  fs.writeFileSync(assFile, `${[...lines, ...evs].join('\n')}\n`);
  // ---- spec + meta
  const malasSpec = takes.map((t, k) => ({ take: t.id, style: t.style, raag: t.raag, tempo: t.tempo, count: plans[k].count, reps: plans[k].reps, copies: plans[k].copies, period: +plans[k].period.toFixed(3), seconds: +plans[k].seconds.toFixed(2), start: tl.malas[k].start }));
  const chapters = [{ title: 'Parichay: arth, sahi uchcharan aur jaap vidhi', start: 0 },
    ...tl.malas.map((x, k) => ({ title: `Mala ${k + 1}: ${m.roman.split(',')[0]} 108 baar (Raag ${takes[k].raag})`, start: x.chapter })),
    { title: 'Shanti path', start: tl.ending }];
  const credits = [...new Set(shots.map((s) => byFile[s.pic]).filter(Boolean).map(creditLine))];
  const spec = {
    slug, format: 'long', kind: 'mantra', mantra: m.id, date, deity: m.deity, source: m.source_hi, ...(sample ? { sample: true } : {}),
    youtube_title: mantraTitle(m),
    youtube_description: mantraDescription({ m, malas: malasSpec, seconds: total, credits, cat }),
    youtube_tags: withTags(m.tags.join(', '), ['मंत्र जाप', 'mantra jaap']).split(', ').slice(0, 15).join(', '),
    facebook_caption: '',
    synthetic: true,
    seconds: +total.toFixed(2), lufs_in: lufsIn, malas: malasSpec, chapters,
    pictures: set.map((f) => path.relative(ROOT, f).replace(/\\/g, '/')),
    intro: { tts: m.intro_tts.join(' '), seconds: +introLen.toFixed(2) },
    ending: { tts: cat.ending_tts, seconds: +endingLen.toFixed(2) },
    bhajan: { mode: 'mantra', id: takes.map((t) => t.id).join(',') },
  };
  fs.writeFileSync(path.join(out, 'scenes.json'), `${JSON.stringify(spec, null, 2)}\n`);
  fs.writeFileSync(path.join(out, `${slug}.json`), `${JSON.stringify({ slug, seconds: spec.seconds, malas: n, chapters }, null, 2)}\n`);
  console.log(JSON.stringify({ slug, mantra: m.id, malas: n, minutes: +(total / 60).toFixed(1), takes: takes.map((t) => t.id), shots: nShots, pictures: set.length }));
  if (args.includes('--dry-run')) return;
  // ---- video: unique pictures decoded once, one slow zoom per shot, 1 s dip at each cut, then the text
  const uniq = [...new Set(shots.map((s) => s.pic))];
  const usesOf = (p) => shots.filter((s) => s.pic === p).length;
  const chains = uniq.map((p, i) => `[${i}:v]scale=2400:1350:force_original_aspect_ratio=increase,crop=2400:1350,setsar=1,format=yuv420p${usesOf(p) > 1 ? `,split=${usesOf(p)}${Array.from({ length: usesOf(p) }, (_, j) => `[p${i}_${j}]`).join('')}` : `[p${i}_0]`}`);
  const taken = new Map();
  shots.forEach((s, k) => {
    const i = uniq.indexOf(s.pic);
    const j = taken.get(i) || 0;
    taken.set(i, j + 1);
    const frames = Math.max(2, Math.round(s.seconds * FPS));
    const z = k % 2 === 0 ? `min(1+0.06*on/${frames},1.06)` : `max(1.06-0.06*on/${frames},1.0)`;
    chains.push(`[p${i}_${j}]zoompan=z='${z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1920x1080:fps=${FPS},trim=end_frame=${frames},setpts=PTS-STARTPTS,fade=t=in:st=0:d=1,fade=t=out:st=${(frames / FPS - 1).toFixed(2)}:d=1[v${k}]`);
  });
  const fontsdir = escPath(path.join(ROOT, 'brand', 'fonts'));
  const vf = `${chains.join(';')};${shots.map((_, k) => `[v${k}]`).join('')}concat=n=${shots.length}:v=1:a=0[vc];[vc]subtitles='${escPath(assFile)}':fontsdir='${fontsdir}'[v]`;
  const vid = path.join(work, 'video-only.mp4');
  run([...uniq.flatMap((p) => ['-i', p]), '-filter_complex', vf, '-map', '[v]', ...(process.env.SPS_FF_THREADS ? ['-threads', process.env.SPS_FF_THREADS] : []), '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'stillimage', '-crf', '23', '-pix_fmt', 'yuv420p', '-r', String(FPS), vid]);
  const mp4 = path.join(out, `${slug}.mp4`);
  run(['-i', vid, '-i', aud, '-map', '0:v', '-map', '1:a', '-c', 'copy', '-shortest', '-movflags', '+faststart', mp4]);
  // ---- thumbnail
  const thumbAss = path.join(work, 'thumb.ass');
  const th = assHeader(1280, 720).replace('Big,Yatra One,120', 'Big,Tiro Devanagari Hindi,92').replace('Mid,Yatra One,64', 'Mid,Tiro Devanagari Hindi,60');
  fs.writeFileSync(thumbAss, `${[th, ev(0, 5, 'Big', (m.short || m.text)), ev(0, 5, 'Mid', `108 बार जाप | ${n} माला`)].join('\n')}\n`);
  run(['-i', set[0], '-vf', `scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,eq=brightness=-0.08,subtitles='${escPath(thumbAss)}':fontsdir='${fontsdir}'`, '-frames:v', '1', '-q:v', '2', path.join(out, `${slug}-thumb.jpg`)]);
  if (!args.includes('--keep-work')) fs.rmSync(work, { recursive: true, force: true });
  console.log(JSON.stringify({ out: mp4, seconds: probe(mp4), thumb: path.join(out, `${slug}-thumb.jpg`) }));
}

/** After the upload: the takes are used (never again), their audio is deleted; the video and its pictures are logged. */
export function recordUse(ledger, spec, { root = ROOT, url = null } = {}) {
  const ids = spec.malas.map((x) => x.take);
  const used = usedIds(ledger);
  const again = ids.filter((id) => used.has(id));
  if (again.length) throw new Error(`takes already used: ${again.join(', ')}`);
  for (const t of ledger.takes || []) {
    if (!ids.includes(t.id)) continue;
    t.used_in = spec.slug;
    if (t.file) { fs.rmSync(path.join(root, t.file), { force: true }); t.file = null; }
  }
  ledger.videos = [...(ledger.videos || []), { date: spec.date, slug: spec.slug, mantra: spec.mantra, takes: ids, styles: spec.malas.map((x) => x.style), pictures: spec.pictures, ...(url ? { url } : {}) }];
  return ledger;
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
  const cmd = args[0];
  if (cmd === 'render') return render();
  if (cmd === 'due') {
    const date = opt('--date') || addDays(new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10), 1);
    const cat = loadMantras(ROOT);
    const m = mantraFor(date, loadInputs(ROOT));
    const ledger = loadLedger(ROOT);
    const takes = m ? pickTakes(ledger, { mantra: m.id, date, exists: (t) => fs.existsSync(path.join(ROOT, t.file)) }) : [];
    const ch = m ? chooseMalas(takes, { cat }) : null;
    const r = { date, due: !!(m && ch), mantra: m?.id || '', why: !m ? `${date} is not a mantra day` : ch ? `${m.why}: ${ch.malas} malas, ~${Math.round(ch.seconds / 60)} min` : `not enough unused QA-passed takes for ${m.id} (${takes.length})`, takes: takes.map((t) => t.id) };
    console.log(JSON.stringify(r));
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `due=${r.due}\nmantra=${r.mantra}\nwhy=${r.why.replace(/\n/g, ' ')}\n`);
    return;
  }
  if (cmd === 'record') {
    const spec = JSON.parse(fs.readFileSync(opt('--spec'), 'utf8'));
    const ledger = recordUse(loadLedger(ROOT), spec, { url: opt('--url', null) });
    saveLedger(ledger, ROOT);
    console.log(JSON.stringify({ recorded: spec.slug, takes: spec.malas.map((x) => x.take) }));
    return;
  }
  console.log('usage: due | render | record (see the header)');
  process.exit(2);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { await main(); } catch (e) { console.log(JSON.stringify({ error: e.message })); process.exit(1); }
}
