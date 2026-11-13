// Weekly mantra-jaap long video (owner, 13 Nov 2026; automation/mantras.json): the pure parts, unit-tested in
// scripts/mantra.test.mjs. Used by scripts/day-plan.mjs (which day), music/mantra-takes.mjs (the ACE-Step takes and
// their Whisper gate) and scripts/mantra-long.mjs (render, metadata, ledger).
//
// SCHEDULE: one mantra video a week, as that day's long video (12:30 IST; the long cap stays 1 a day). Weeks run
// Monday-Sunday; week 0 is the week of `start` (Sun 22 Nov 2026). The week's mantra = rotation[week % n]. Its day is
// the Sunday; from `ekadashi_from` (23 Nov) a Vishnu/Krishna mantra (group "krishna") moves to an Ekadashi of the same
// week (festivals.json theme ekadashi / gita, or "Ekadashi" in the name; never Janmotsav). A protected date (protect.dates,
// a protected festival theme, a big festival, an approved movie part, a date-scoped override with its own long video)
// is never taken: an Ekadashi falls back to the Sunday, a protected Sunday means no mantra that week.
// 108 COUNT: a take's loop holds `reps` chants (a divisor of 108); a mala = 108 / reps copies of it, so the count is
// exact; the on-screen counter steps every loop.length / reps seconds.
// NO REUSE: a take is used by one video only (music/mantra/takes.json `used_in`, plus every id in `videos[].takes`).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { bhaktiPhrase, hasSearchedPhrase, thirdPartyNames } from './bhakti-seo.mjs';

export const REPS = 108;
export const DIVISORS = [12, 9, 6, 4, 3, 2, 1]; // chants per loop: 108 must divide evenly
export const MANTRA_FILE = 'automation/mantras.json';
export const LEDGER_FILE = 'music/mantra/takes.json';
const DAY = 864e5;
const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } };
const ms = (d) => Date.parse(`${d}T12:00:00Z`);
export const addDays = (date, n) => new Date(ms(date) + n * DAY).toISOString().slice(0, 10);
export const weekday = (date) => new Date(ms(date)).getUTCDay();
export const mondayOf = (date) => addDays(date, -((weekday(date) + 6) % 7));

export function loadMantras(root = '.') {
  const t = read(path.join(root, MANTRA_FILE));
  if (!t) return null;
  const cat = JSON.parse(t);
  for (const [id, m] of Object.entries(cat.mantras || {})) m.id = id;
  return cat;
}

// ---------------------------------------------------------------- schedule
export const weekIndex = (date, cat) => Math.floor((ms(mondayOf(date)) - ms(mondayOf(cat.start))) / (7 * DAY));
export const mantraOfWeek = (k, cat) => cat.rotation[((k % cat.rotation.length) + cat.rotation.length) % cat.rotation.length];
/** A festivals map entry ({ name, key, theme, tier }) that is an Ekadashi (not Janmotsav, which is one too). */
export const isEkadashi = (f) => !!f && f.theme !== 'janmotsav' && !/janmotsav/i.test(f.key || '')
  && (['ekadashi', 'gita'].includes(f.theme) || /ekadashi|gyaras/i.test(`${f.key || ''} ${f.name || ''}`));

/** Why the date's long video must not become the mantra video (null = free). */
export function protectedWhy(date, inputs = {}, cat = inputs.mantras) {
  const p = cat?.protect || {};
  if ((p.dates || []).includes(date)) return `protected date (${p.why || 'automation/mantras.json'})`;
  if (inputs.movies?.has?.(date)) return `mini-movie day (${inputs.movies.get(date)})`;
  if (inputs.override?.days?.[date]?.long) return 'date-scoped override with its own long video';
  const f = inputs.festivals?.get?.(date);
  if (f && (p.themes || []).includes(f.theme)) return `${f.name} keeps its own long video`;
  if (f && p.big && f.tier === 'big') return `${f.name} (big festival) keeps its own long video`;
  return null;
}

const memo = new WeakMap();
/** The mantra video of week k: { week, monday, sunday, mantra, date (null = none this week), why }. */
export function weekPlan(k, inputs = {}, cat = inputs.mantras) {
  let m = memo.get(inputs);
  if (!m) memo.set(inputs, (m = new Map()));
  if (m.has(k)) return m.get(k);
  const monday = addDays(mondayOf(cat.start), 7 * k);
  const sunday = addDays(monday, 6);
  const id = mantraOfWeek(k, cat);
  const mantra = cat.mantras[id];
  let date = sunday;
  let why = 'Sunday';
  if (mantra.group === 'krishna') {
    for (let d = monday; d <= sunday; d = addDays(d, 1)) {
      if (d < cat.ekadashi_from || d < cat.start || !isEkadashi(inputs.festivals?.get?.(d))) continue;
      const no = protectedWhy(d, inputs, cat);
      if (no) { why = `Ekadashi ${d} is protected (${no}), so Sunday`; continue; }
      date = d;
      why = `${inputs.festivals.get(d).name} (a Vishnu/Krishna mantra moves to the week's Ekadashi)`;
      break;
    }
  }
  const no = protectedWhy(date, inputs, cat);
  const r = no ? { week: k, monday, sunday, mantra: id, date: null, why: `no mantra video this week: ${date} ${no}` } : { week: k, monday, sunday, mantra: id, date, why };
  m.set(k, r);
  return r;
}

/** The mantra video of this date, or null: { id, date, week, why, ...catalog entry }. */
export function mantraFor(date, inputs = {}, cat = inputs.mantras) {
  if (!cat?.start || !cat.rotation?.length || date < cat.start) return null;
  const w = weekPlan(weekIndex(date, cat), inputs, cat);
  if (w.date !== date) return null;
  return { ...cat.mantras[w.mantra], id: w.mantra, date, week: w.week, why: w.why };
}

/** The mantra videos from `from` for `weeks` weeks: [{ week, date|null, mantra, why }]. */
export function mantraSchedule(from, weeks, inputs = {}, cat = inputs.mantras) {
  const k0 = Math.max(0, weekIndex(from, cat));
  return Array.from({ length: weeks }, (_, i) => weekPlan(k0 + i, inputs, cat));
}

// ---------------------------------------------------------------- metadata
/** "ॐ नमो भगवते वासुदेवाय 108 बार | Krishna Mantra Jaap | Bhakti Geet" (the searched phrase from bhakti-seo.mjs). */
export function mantraTitle(m) {
  const phrase = bhaktiPhrase({ kind: 'mantra', deity: `${m.id || ''} ${m.deity || ''}` });
  const jaap = phrase === 'Krishna Mantra' ? 'Krishna Mantra Jaap' : `${m.label} Mantra Jaap`;
  return `${m.short || m.text} 108 बार | ${jaap} | Bhakti Geet`;
}

export const mantraSlug = (date, id) => `${date}-long-mantra-${id}`;
const mmss = (s) => `${Math.floor(s / 60)} min`;

export function mantraDescription({ m, malas, seconds, credits = [], cat }) {
  const n = malas.length;
  const raags = malas.map((x, i) => `Mala ${i + 1}: Raag ${x.raag}${x.tempo === 'medium' ? ' (madhyam lay)' : ' (dheemi lay)'}`).join('\n');
  return [
    `${m.text} ॥ ${n} माला, हर माला में ${REPS} बार जाप (कुल ${mmss(seconds)})।`,
    `मंत्र का अर्थ: ${m.meaning_hi}`,
    `सही उच्चारण: ${m.pron_hi}`,
    `स्रोत: ${m.source_hi}`,
    '',
    `${m.roman} | ${m.label === 'Krishna' ? 'Krishna Mantra' : `${m.label} Mantra`} ${REPS} baar jaap, ${n} mala.`,
    `Arth: ${m.meaning_roman}`,
    `Source: ${m.source_en}.`,
    'Jaap kaise karein: shaant jagah par seedhe baithiye, saans sahaj rakhiye, har mantra par mala ka ek manka aage badhaiye. Screen par ginti 1 se 108 tak chalti hai, isliye mala na ho tab bhi jaap poora hota hai.',
    'Har mala ki dhun alag hai:',
    raags,
    '',
    'Bhakti Geet | भक्ति गीत: Shyam Premi SN ke mantra jaap aur maulik bhajan.',
    cat.disclosure,
    cat.voice_line,
    ...(credits.length ? ['', 'Tasveerein (asli mandir photos):', ...credits] : []),
    '',
    'Aise hi mantra jaap aur bhajan ke liye like, share aur subscribe karein: Shyam Premi SN 🙏',
    '',
    `#MantraJaap #${m.label}Mantra #BhaktiGeet`,
  ].join('\n');
}

/** Problems of a mantra video spec (scripts/validate.mjs runs this for kind "mantra"). */
export function checkMantraSpec(s, cat) {
  const e = [];
  const need = (ok, msg) => { if (!ok) e.push(msg); };
  const m = cat?.mantras?.[s.mantra];
  need(m, `mantra "${s.mantra}" is not in ${MANTRA_FILE}`);
  need(/^\d{4}-\d{2}-\d{2}-long-mantra-[a-z-]+$/.test(s.slug || ''), 'slug: <date>-long-mantra-<id>');
  need(s.format === 'long' && s.kind === 'mantra', 'format "long", kind "mantra"');
  const yt = String(s.youtube_title || '');
  need(yt.length >= 10 && yt.length <= 100 && !/#shorts/i.test(yt), 'youtube_title: 10-100 characters, no #Shorts');
  need(/[ऀ-ॿ]/.test(yt) && yt.includes('108'), 'youtube_title: the mantra in Devanagari and "108"');
  need(hasSearchedPhrase(yt), 'youtube_title: one searched generic phrase (Krishna Mantra / Bhakti Geet; scripts/bhakti-seo.mjs)');
  if (m) need(yt.startsWith(m.short || m.text), 'youtube_title starts with the mantra');
  const named = thirdPartyNames(`${yt} ${s.youtube_description || ''} ${s.youtube_tags || ''}`);
  need(!named.length, `other channels' names (${named.join(', ')}): never in our metadata`);
  const d = String(s.youtube_description || '');
  need(d.length > 200 && d.length <= 4500, 'youtube_description: 200-4500 characters (chapters are added on upload)');
  if (m) {
    need(d.includes(m.meaning_hi), 'youtube_description: the meaning (meaning_hi)');
    need(d.includes(m.source_hi) && s.source === m.source_hi, 'youtube_description + source: the traditional source (source_hi)');
  }
  need(cat && d.includes(cat.disclosure), 'youtube_description: the AI disclosure line (mantras.json disclosure)');
  need(/subscribe/i.test(d), 'youtube_description: a like/share/subscribe line');
  need(!/\b\d{1,2}:\d{2}\b/.test(d), 'youtube_description: no timestamps (chapters come from the meta file)');
  need(s.synthetic === true, 'synthetic: true (YouTube containsSyntheticMedia)');
  const tags = String(s.youtube_tags || '').split(',').map((x) => x.trim()).filter(Boolean);
  need(tags.length >= 10 && tags.length <= 15 && tags.some((t) => /[ऀ-ॿ]/.test(t)), 'youtube_tags: 10-15, some in Devanagari');
  const malas = Array.isArray(s.malas) ? s.malas : [];
  const max = cat?.length?.max_malas ?? 5;
  need(malas.length >= 1 && malas.length <= max, `malas: 1-${max} (has ${malas.length})`);
  malas.forEach((x, i) => {
    need(x.count === REPS, `mala ${i + 1}: exactly ${REPS} chants (has ${x.count})`);
    need(x.reps > 0 && REPS % x.reps === 0 && x.copies * x.reps === REPS, `mala ${i + 1}: loop of ${x.reps} chants x ${x.copies} copies must be ${REPS}`);
    need(typeof x.take === 'string' && x.take, `mala ${i + 1}: take id`);
  });
  need(new Set(malas.map((x) => x.take)).size === malas.length, 'a different take for every mala');
  need(malas.every((x, i) => i === 0 || x.style !== malas[i - 1].style), 'neighbouring malas need different arrangements');
  const min = s.sample ? 0 : (cat?.length?.min_minutes ?? 18) * 60;
  const top = (cat?.length?.max_minutes ?? 62) * 60;
  need(s.seconds >= min && s.seconds <= top, `length ${Math.round((s.seconds || 0) / 60)} min: ${min / 60}-${top / 60} min`);
  const ch = Array.isArray(s.chapters) ? s.chapters : [];
  need(ch.length === malas.length + 2 && ch[0]?.start === 0, 'chapters: intro at 0:00, one per mala, the ending');
  need(ch.every((c, i) => i === 0 || c.start - ch[i - 1].start >= 10), 'chapters: at least 10 s each');
  need(Array.isArray(s.pictures) && s.pictures.length >= 4, 'pictures: at least 4 licence-checked photos');
  return e;
}

// ---------------------------------------------------------------- 108 count and loops
/** A mala from a loop of `reps` chants lasting `length` s: copies so that the count is exactly 108. */
export function malaPlan(loop) {
  if (!(loop?.reps > 0) || REPS % loop.reps) throw new Error(`a loop of ${loop?.reps} chants does not divide ${REPS}`);
  if (!(loop.length > 0)) throw new Error('loop length');
  const copies = REPS / loop.reps;
  return { count: REPS, reps: loop.reps, copies, period: loop.length / loop.reps, seconds: copies * loop.length };
}

/** The counter: chant n (1..108) is shown from its start to the next chant's start (s, from the mala start). */
export function counterEvents(plan, { lead = 0.12 } = {}) {
  return Array.from({ length: REPS }, (_, i) => ({ n: i + 1, start: +(i === 0 ? 0 : i * plan.period + lead).toFixed(3), end: +(i === REPS - 1 ? plan.seconds : (i + 1) * plan.period + lead).toFixed(3) }));
}

const smoothed = (x, w) => { // centred moving mean over w frames
  const out = new Float64Array(x.length);
  const pre = new Float64Array(x.length + 1);
  for (let i = 0; i < x.length; i++) pre[i + 1] = pre[i] + x[i];
  const h = Math.floor(w / 2);
  for (let i = 0; i < x.length; i++) { const a = Math.max(0, i - h), b = Math.min(x.length, i + h + 1); out[i] = (pre[b] - pre[a]) / (b - a); }
  return out;
};

/** Log-energy envelope (dB) of mono PCM at `fps` frames a second. */
export function envelope(pcm, sr = 8000, fps = 100) {
  const hop = Math.round(sr / fps);
  const n = Math.floor(pcm.length / hop);
  const env = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = i * hop; j < (i + 1) * hop; j++) s += pcm[j] * pcm[j];
    env[i] = 10 * Math.log10(s / hop + 1e-10);
  }
  return env;
}

/**
 * The loop of a take: { start, length, reps, period, corr, seam } (s) or { error }.
 * The chant period comes from the envelope's autocorrelation around estPeriod (the smallest strong peak, so a 2-chant
 * melody does not double it); the loop starts in the quiet just before a chant (a Whisper segment start when given) after
 * the intro (startFrac), holds the largest divisor of 108 chants that fits before endFrac (and maxLoop s), and its end
 * is moved +-0.25 s to where the envelope best matches the start, so the crossfaded seam is not heard.
 */
export function findLoop({ env, fps = 100, estPeriod, segStarts = [], startFrac = 0.12, endFrac = 0.92, xf = 0.35, maxLoop = 75 }) {
  const n = env.length;
  if (!(estPeriod > 0) || n < fps * 10) return { error: 'take too short' };
  const sm = smoothed(env, Math.max(3, Math.round(fps * 0.08)));
  const trend = smoothed(sm, Math.round(fps * 3));
  const x = sm.map((v, i) => v - trend[i]);
  const a = Math.floor(n * startFrac), b = Math.floor(n * endFrac);
  const lo = Math.max(Math.round(0.6 * estPeriod * fps), 5);
  const hi = Math.min(Math.round(1.6 * estPeriod * fps), Math.floor((b - a) / 2));
  if (hi <= lo) return { error: `take too short for a ${estPeriod} s chant` };
  const r = new Float64Array(hi + 2);
  for (let l = lo - 1; l <= hi + 1; l++) {
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = a; i < b - l; i++) { sxy += x[i] * x[i + l]; sxx += x[i] * x[i]; syy += x[i + l] * x[i + l]; }
    r[l] = sxy / Math.sqrt(sxx * syy + 1e-12);
  }
  let rmax = -1;
  for (let l = lo; l <= hi; l++) rmax = Math.max(rmax, r[l]);
  let lag = -1;
  for (let l = lo; l <= hi; l++) if (r[l] >= r[l - 1] && r[l] >= r[l + 1] && r[l] >= 0.85 * rmax) { lag = l; break; }
  if (lag < 0) for (let l = lo; l <= hi; l++) if (r[l] === rmax) { lag = l; break; }
  const den = r[lag - 1] - 2 * r[lag] + r[lag + 1];
  const P = (lag + (den ? 0.5 * (r[lag - 1] - r[lag + 1]) / den : 0)) / fps;
  if (!(r[lag] >= 0.25)) return { error: `no steady chant rhythm (autocorrelation ${r[lag].toFixed(2)})`, period: P };
  // loop starts: Whisper segment starts after the intro, else every quiet frame of the first chant period after it
  const t0 = a / fps;
  const at = (t) => Math.min(n - 1, Math.max(0, Math.round(t * fps)));
  let cands = segStarts.filter((t) => t >= t0 && t <= t0 + 4 * P);
  if (!cands.length) { // no Whisper segments: the 3 quietest dips of the first chant period (the gaps between chants)
    const dips = [];
    for (let i = at(t0) + 1; i < at(t0 + P); i++) if (sm[i] <= sm[i - 1] && sm[i] <= sm[i + 1]) dips.push(i);
    cands = dips.sort((p, q) => sm[p] - sm[q]).slice(0, 3).map((i) => i / fps);
    if (!cands.length) cands = [t0];
  }
  const quietBefore = (t) => { let best = at(t); for (let i = at(t - 0.5); i <= at(t + 0.1); i++) if (sm[i] < sm[best]) best = i; return best / fps; };
  // seam distance: the envelope from 0.3 s before the boundary through the chant after it (up to 3 s), start vs end
  const W0 = Math.round(fps * 0.3), W1 = Math.round(fps * Math.min(3, P));
  const seam = (s, e) => { let d = 0; for (let j = -W0; j <= W1; j++) { const u = x[at(s) + j] ?? 0, v = x[at(e) + j] ?? 0; d += (u - v) ** 2; } return d / (W0 + W1 + 1); };
  const starts = [...new Set(cands.map(quietBefore).map((t) => +t.toFixed(2)))];
  for (const k of DIVISORS) {
    if (k * P > maxLoop) continue;
    let best = null;
    for (const s of starts) {
      const e0 = s + k * P;
      if (e0 + xf + 0.3 > b / fps) continue;
      for (let e = e0 - 0.25; e <= e0 + 0.25 + 1e-9; e += 1 / fps) {
        const d = seam(s, e) + 0.002 * (sm[at(e)] - sm[at(s)]) ** 2 + 60 * (e - e0) ** 2; // stay near k periods (rhythm)
        if (!best || d < best.d) best = { s, e, d };
      }
    }
    if (best) {
      const length = +(best.e - best.s).toFixed(3);
      return { start: +best.s.toFixed(3), length, reps: k, period: +(length / k).toFixed(3), corr: +r[lag].toFixed(3), seam: +best.d.toFixed(3) };
    }
  }
  return { error: 'no loop fits in the take', period: P };
}

/** Mono 8 kHz float PCM of an audio file (ffmpeg). */
export function decodePcm(file, sr = 8000, ff = process.env.FFMPEG_PATH || 'ffmpeg') {
  const r = spawnSync(ff, ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(sr), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`decode ${file}: ${String(r.stderr || '').slice(-200)}`);
  const buf = r.stdout;
  return new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 4));
}

/** The loop of an audio file (decode + findLoop). */
export function analyzeTake(file, opts) {
  return findLoop({ ...opts, env: envelope(decodePcm(file), 8000, 100), fps: 100 });
}

// ---------------------------------------------------------------- takes ledger (never reuse)
export function loadLedger(root = '.') {
  const t = read(path.join(root, LEDGER_FILE));
  return t ? JSON.parse(t) : { about: 'Mantra-jaap ACE-Step takes (music/mantra-takes.mjs import) and the videos that used them (scripts/mantra-long.mjs record). A take is used by ONE video only, ever: used_in is set and its audio file deleted after upload.', takes: [], videos: [] };
}
export const saveLedger = (ledger, root = '.') => {
  const f = path.join(root, LEDGER_FILE);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, `${JSON.stringify(ledger, null, 1)}\n`);
};
/** Every take id ever used by a video. */
export const usedIds = (ledger) => new Set([...(ledger.takes || []).filter((t) => t.used_in).map((t) => t.id), ...(ledger.videos || []).flatMap((v) => v.takes || [])]);

/** Order: slow first, then medium, slow, ... (slow - medium - slow), the rest at the end. */
export function arrange(takes) {
  const slow = takes.filter((t) => t.tempo !== 'medium');
  const med = takes.filter((t) => t.tempo === 'medium');
  const out = [];
  while (slow.length || med.length) {
    const want = out.length % 2 === 0 ? slow : med;
    out.push((want.length ? want : slow.length ? slow : med).shift());
  }
  // never two of the same arrangement side by side
  for (let i = 1; i < out.length; i++) {
    if (out[i].style !== out[i - 1].style) continue;
    const j = out.findIndex((t, k) => k > i && t.style !== out[i].style && (k + 1 >= out.length || out[k + 1]?.style !== out[i].style));
    if (j > 0) [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Unused, QA-passed takes for a mantra video: the ones made for this date first, then older unused ones. */
export function pickTakes(ledger, { mantra, date, exists = (t) => !!t.file }) {
  const used = usedIds(ledger);
  const ok = (ledger.takes || []).filter((t) => t.mantra === mantra && t.status === 'ok' && !t.used_in && !used.has(t.id) && t.loop && !t.loop.error && exists(t));
  ok.sort((a, b) => (a.for === date ? 0 : 1) - (b.for === date ? 0 : 1) || String(a.for).localeCompare(String(b.for)) || a.id.localeCompare(b.id));
  return arrange(ok);
}

/** How many malas: as many takes as fit under max_minutes (and max_malas); null when even all of them stay under min_minutes. */
export function chooseMalas(takes, { intro = 45, ending = 40, bridge = 6, cat, sample = false } = {}) {
  const L = cat?.length || { min_minutes: 18, max_minutes: 62, max_malas: 5 };
  let n = Math.min(takes.length, L.max_malas || 5);
  const total = (k) => intro + ending + takes.slice(0, k).reduce((t, x) => t + malaPlan(x.loop).seconds, 0) + Math.max(0, k - 1) * bridge;
  while (n > 1 && total(n) > L.max_minutes * 60) n--;
  if (!n || (!sample && total(n) < L.min_minutes * 60)) return null;
  return { malas: n, seconds: total(n) };
}

/** Licence-checked photos for the week: least used in earlier mantra videos first, so each week's set differs. */
export function pickPictures(pool, ledger, { n = 20, seed = 0 } = {}) {
  const uses = new Map();
  (ledger.videos || []).forEach((v, k) => (v.pictures || []).forEach((p) => uses.set(p, { n: (uses.get(p)?.n || 0) + 1, last: k })));
  const key = (p) => uses.get(p) || { n: 0, last: -1 };
  const h = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0) + seed) % 1000003, 7);
  return [...pool].sort((a, b) => key(a).n - key(b).n || key(a).last - key(b).last || h(a) - h(b)).slice(0, n);
}
