#!/usr/bin/env node
// Which YouTube uploads a day gets (owner, 9 Nov 2026: at most 3 a day; re-planned 11 Nov 2026 around the one format
// the channel's data shows can go viral: the festival "status" Short).
//
// Data (all 109 videos, 11 Nov 2026): festival status Shorts avg 154 views (Choti Diwali Status 798, Dhanteras Status
// 456: the big festivals, released the night before or early on the day); famous-temple darshan avg 60 (Moravinandan
// Khatu Shyam 173, Shakambhari Sakrai 163, Salasar 133); katha Shorts avg 18 (the worst: cut); generic "X Darshan" 1-10.
// So every day is filled by priority, at most CAP = 3 Shorts (scripts/upload-guard.mjs enforces the same cap):
//   0 movie      the approved mini-movie part, 07:00 (17-20 Nov: Khatu Shyam ji ki Amar Katha)
//   1 status     festival status Shorts (scripts/status-engine.mjs, automation/festivals.json): `eve` 20:00 the evening
//                before, `status` 00:30 on the day, `statusday` 08:30 on big festivals (Janmotsav also 2 days before)
//   2 morning    normal day: the weekday "day status" Short (Somvar Mahadev, Mangalvar Salasar Balaji, Budhvar Ganesh,
//                Guruvar Vishnu/Sai, Shukravar Lakshmi/Santoshi, Shanivar Shani dev, Ravivar Surya; status engine);
//                Ekadashi: Gyaras Khatu Shyam status; other festival days: a famous-temple darshan (Claude, STORY.md).
//                Not on movie days (the movie part is the morning upload) or big-festival days (`statusday` is).
//   3 evening    famous-temple darshan Short, 19:00 (Claude, STORY.md)
//   4 kalyug     "Kalyug ke Bhagwan" (KALYUG=on), Tue/Thu/Sat of non-festival, non-movie days, 08:00, only if it fits
//   5 noon       the Dadi-Chhotu Short Wed 15:00, only if it fits
// A logged kalyug episode counts first (it is already scheduled). Photo posts and the Veo kit are not YouTube uploads.
// LONG VIDEO (owner, 13 Nov 2026): one 16:9 long katha EVERY day at 12:30 IST, outside the Shorts cap (its own cap,
// LONG_CAP = 1). Long videos are the channel's only source of watch hours (YPP: 4,000 h before 31 Jan 2027); the
// 3-a-day cap exists because 5-6 Shorts a day collapsed Shorts views (7-9 Nov). While the long video was inside the
// cap (Mon/Fri of normal days only) festivals filled every day and it stopped for 3 days (10-12 Nov). Its subject
// (longSubject): on a festival day the festival's katha or vidhi, unless a long video told that festival in the last
// LONG_REPEAT_DAYS = 30 days; otherwise STORY.md section 5's order (the Mandir Itihas series). Movie days keep the movie
// part (a vertical Short-type upload) and still get the long video.
//
//   node scripts/day-plan.mjs --date 2026-11-11 --slot noon --check   exit 0 when planned, 1 when not (GITHUB_OUTPUT
//                                                                     planned, why, what, kind, theme)
//   node scripts/day-plan.mjs --days 14 [--from 2026-11-10]           print the plan per date (dry run, publishes nothing)
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadFestivals, placements } from './status-engine.mjs';
import { DAY_THEMES } from './status-themes.mjs';

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const CAP = 3; // Shorts: every vertical upload (status, morning, evening, noon, kalyug, movie parts)
export const LONG_CAP = 1; // the long video, every day, never counted against CAP
export const LONG_REPEAT_DAYS = 30; // a festival katha told in a long video within this many days is not retold
export const NOON_DAYS = [3]; // Wednesday
export const KALYUG_DAYS = [2, 4, 6]; // Tuesday, Thursday, Saturday
export const AT = { status: '00:30', movie: '07:00', kalyug: '08:00', statusday: '08:30', morning: 'on render, ~10:30', long: '12:30', noon: '15:00', evening: '19:00', bhajan: '19:45', eve: '20:00' };
export const PRIORITY = { movie: 0, status: 1, eve: 1, statusday: 1, morning: 2, evening: 3, kalyug: 4, noon: 5, bhajan: 6 };
const ORDER = { status: 0, movie: 1, kalyug: 2, statusday: 3, morning: 4, long: 5, noon: 6, evening: 7, bhajan: 7.5, eve: 8 };
// Date-scoped override (automation/chhath-2026.json, owner 13 Nov 2026: Chhath bhajan Shorts 13-16 Nov and every upload
// of those dates Chhath themed): `slots.<slot>` turns that slot into a bhajan Short (kind "bhajan", scripts/bhajan-short.mjs;
// the extra `bhajan` slot only fits on EXTRA_UPLOAD_DAY), `long` replaces the long video's subject. Other dates: untouched.
export const OVERRIDE_FILE = 'automation/chhath-2026.json';
export const BHAJAN_FALLBACK = 'Chhath Surya temple or ghat darshan Short (no Chhath bhajan passed QA): Deo Surya Mandir Aurangabad, Ulaar Surya Mandir, Konark Sun Temple, Modhera Sun Temple, or the Patna / Varanasi Chhath ghats; a temple not used in the last 30 days; every fact verified (STORY.md); Chhath bhajan outro when BHAJAN_VOCALS=on';
const TIER = { big: 0, status: 1 };
const GYARAS_THEMES = ['ekadashi', 'gita'];

const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } };
export const weekday = (date) => new Date(`${date}T12:00:00Z`).getUTCDay();
export const addDays = (date, n) => new Date(Date.parse(`${date}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
export const istToday = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);

/** Everything the plan depends on, read from the repo (root = the checkout). */
export function loadInputs(root = '.') {
  const list = loadFestivals(root);
  const festivals = new Map(list.map((f) => [f.date, { name: f.label, tier: f.tier, key: f.key, theme: f.theme }]));
  // Rows someone added to automation/calendar.md that festivals.json does not have: calendar info only (no status).
  for (const m of read(path.join(root, 'automation/calendar.md')).matchAll(/^\|\s*(\d{4}-\d{2}-\d{2})\s*\|([^|]+)\|\s*$/gm)) {
    if (!festivals.has(m[1])) festivals.set(m[1], { name: m[2].replace(/\*\*/g, '').split(/Sources?:/)[0].split(';')[0].replace(/\s*\([^)]*\)/g, '').trim(), tier: 'info' });
  }
  const movies = new Map(); // release date -> "series part n"
  const movieDir = path.join(root, 'story/movies');
  for (const series of fs.existsSync(movieDir) ? fs.readdirSync(movieDir) : []) {
    let j;
    try { j = JSON.parse(read(path.join(movieDir, series, 'series.json'))); } catch { continue; }
    if (j?.approved !== true) continue;
    for (const p of j.parts || []) if (p.release) movies.set(p.release, `${series} part ${p.part ?? p.n ?? '?'}`);
  }
  const log = read(path.join(root, 'automation/log.md'));
  for (const m of log.matchAll(/^(\d{4}-\d{2}-\d{2}) \| movie \| (\S+)/gm)) {
    if (!movies.has(m[1])) movies.set(m[1], m[2]);
  }
  const kalyugLogged = new Set([...log.matchAll(/^(\d{4}-\d{2}-\d{2}) \| kalyug \| /gm)].map((m) => m[1]));
  let override = null;
  try { override = JSON.parse(read(path.join(root, OVERRIDE_FILE))); } catch { /* none */ }
  return { festivals, placements: placements(list), movies, kalyug: process.env.KALYUG === 'on', kalyugLogged, longs: longsOf(log), today: istToday(),
    override, extraDay: (process.env.EXTRA_UPLOAD_DAY || '').trim() };
}

/** The long videos in log.md: [{ date, text }] (text = slug, deity and summary, lower case). */
export const longsOf = (log) => [...log.matchAll(/^(\d{4}-\d{2}-\d{2}) \| long \| (.*)$/gm)].map((m) => ({ date: m[1], text: m[2].toLowerCase() }));

const STOP = new Set(['puja', 'vrat', 'day', 'the', 'and', 'nov', 'dec', 'jan', 'feb', 'main', 'begins', 'until', 'also']);
/** A festival's distinctive words: "ravi-pradosh-nov" -> ["ravi", "pradosh"] (the same festival in another month matches). */
export const festTokens = (keyOrName) => String(keyOrName).toLowerCase().replace(/\([^)]*\)/g, ' ').split(/[^a-z]+/)
  .filter((t) => t.length > 2 && !STOP.has(t));
const sameFestival = (a, b) => festTokens(a).join('-') === festTokens(b).join('-');
const memo = new WeakMap();

/** What the day's long video is about: { festival: key|null, name?, covered?: 'YYYY-MM-DD' }. A festival day (any
 *  calendar entry, info rows included) gets its own katha/vidhi unless a long video told it in the last
 *  LONG_REPEAT_DAYS days: a log.md long line with all its distinctive words, or (for days not logged yet, from `today`
 *  on) an earlier planned long video of the same festival. */
export function longSubject(date, inputs = {}) {
  let m = memo.get(inputs);
  if (!m) memo.set(inputs, (m = new Map()));
  if (m.has(date)) return m.get(date);
  const f = inputs.festivals?.get(date);
  let r = { festival: null };
  if (f) {
    const key = f.key || festTokens(f.name).join('-');
    const tokens = festTokens(key);
    const from = addDays(date, -LONG_REPEAT_DAYS);
    const logged = tokens.length ? (inputs.longs || []).find((l) => l.date >= from && l.date < date && tokens.every((t) => l.text.includes(t))) : null;
    let covered = logged?.date;
    for (let d = addDays(date, -1); !covered && d >= from && d >= (inputs.today || from); d = addDays(d, -1)) {
      const g = inputs.festivals.get(d);
      if (g && sameFestival(g.key || g.name, key) && longSubject(d, inputs).festival) covered = d;
    }
    r = covered ? { festival: null, name: f.name, covered } : { festival: key, name: f.name };
  }
  m.set(date, r);
  return r;
}

/** The day's planned YouTube uploads (at most CAP Shorts + the long video), in time order:
 *  [{ slot, at, what, kind?, theme?, festival?, k?, topic? }]; `dropped` lists the Short slots the cap left out. */
export function planDay(date, inputs = {}) {
  const { festivals = new Map(), placements: pl = [], movies = new Map(), kalyug = false, kalyugLogged = new Set() } = inputs;
  const wd = weekday(date);
  const f = festivals.get(date);
  const fest = f && f.tier !== 'info' ? f : null;
  const movie = movies.get(date);
  const cands = [];
  if (movie) cands.push({ slot: 'movie', what: `movie ${movie} (the morning upload)` });
  // Status Shorts that go public today (one per slot: the bigger festival, then the nearer one).
  const mine = pl.filter((p) => p.date === date)
    .sort((a, b) => (TIER[a.tier] ?? 9) - (TIER[b.tier] ?? 9) || a.festival.date.localeCompare(b.festival.date));
  for (const p of mine) {
    if (cands.some((c) => c.slot === p.slot)) continue;
    const when = p.slot === 'eve' ? `the evening before ${p.festival.date}` : p.slot === 'status' ? 'just after midnight on the day' : 'the festival morning';
    cands.push({ slot: p.slot, at: p.at, festival: p.festival.key, k: p.k, kind: 'status',
      what: `"${p.name.en} Status" Short, variant ${p.k + 1} (${when}; scripts/status-engine.mjs)` });
  }
  const bigToday = cands.some((c) => c.slot === 'statusday');
  if (!movie && !bigToday) {
    if (fest && !GYARAS_THEMES.includes(fest.theme)) {
      cands.push({ slot: 'morning', kind: 'temple', what: `famous-temple darshan Short tied to ${fest.name} (a well-known, searched temple of that deity; STORY.md)` });
    } else {
      const theme = fest ? 'gyaras' : wd;
      cands.push({ slot: 'morning', kind: 'daystatus', theme, what: `day status Short: ${DAY_THEMES[theme].names[0].en} (15-25 s loop; scripts/status-engine.mjs day)` });
    }
  }
  cands.push({ slot: 'evening', kind: 'temple', what: 'famous-temple darshan Short (a well-known, searched temple; name first; STORY.md)' });
  if (kalyugLogged.has(date) || (kalyug && KALYUG_DAYS.includes(wd) && !fest && !movie)) {
    cands.push({ slot: 'kalyug', logged: kalyugLogged.has(date), what: 'Kalyug ke Bhagwan episode (08:00, made the evening before)' });
  }
  if (!fest && !movie && NOON_DAYS.includes(wd)) cands.push({ slot: 'noon', what: 'Dadi-Chhotu Short (new setting/outfits)' });
  const ov = inputs.override?.days?.[date] || null;
  for (const [slot, o] of Object.entries(ov?.slots || {})) {
    if (o.kind !== 'bhajan') continue;
    const u = { slot, kind: 'bhajan', day: o.day, ...(o.at ? { at: o.at } : {}),
      what: `Chhath bhajan Short "${o.title}" (${o.day}; the library bhajan is the whole soundtrack; scripts/bhajan-short.mjs, automation/chhath-2026.json)`, fallback: BHAJAN_FALLBACK };
    const k = cands.findIndex((c) => c.slot === slot);
    if (k >= 0) cands[k] = u; else cands.push(u);
  }
  const cap = CAP + (inputs.extraDay && inputs.extraDay === date ? 1 : 0);
  const rank = (c) => (c.logged ? 0.5 : PRIORITY[c.slot]);
  const ranked = cands.map((c, i) => ({ c, i })).sort((a, b) => rank(a.c) - rank(b.c) || a.i - b.i).map((x) => x.c);
  const kept = ranked.slice(0, cap);
  const dropped = ranked.slice(cap).map((c) => c.slot);
  const long = longUpload(date, inputs, movie);
  if (ov?.long?.what) Object.assign(long, { topic: ov.long.topic || long.topic, what: ov.long.what });
  kept.push(long);
  kept.sort((a, b) => ORDER[a.slot] - ORDER[b.slot]);
  const type = movie ? 'movie' : fest ? 'festival' : kept.some((c) => c.slot === 'kalyug') ? 'kalyug' : 'normal';
  return { date, day: WEEKDAY[wd], type, festival: f?.name, uploads: kept.map(({ logged, ...u }) => ({ ...u, at: u.at || AT[u.slot] })), dropped };
}

/** The day's long video (every day, 12:30 IST, outside the Shorts cap). `what` goes into the long job's story prompt. */
function longUpload(date, inputs, movie) {
  const sub = longSubject(date, inputs);
  const base = 'long katha video (16:9, 5-10 min, public 12:30 IST; STORY.md section 5)';
  const notMovie = movie ? '; today is a mini-movie day, so not the story of the movie part' : '';
  if (sub.festival) {
    return { slot: 'long', kind: 'long', topic: sub.festival,
      what: `${base}: today is ${sub.name}, so tell its katha or vidhi (no long video on it in the last ${LONG_REPEAT_DAYS} days)${notMovie}` };
  }
  const why = sub.covered ? `today is ${sub.name}, but the long video of ${sub.covered} already told it, so` : 'no festival today, so';
  return { slot: 'long', kind: 'long', topic: 'series',
    what: `${base}: ${why} follow the section 5 subject order (the next Mandir Itihas part in automation/mandir-series.md unless a Khatu Shyam katha or a trend "long part" topic is due)${notMovie}` };
}

/** Is this slot planned for the date? The morning slot stays allowed on a movie day: the workflow reaches it there only
 *  when the movie part is NOT in log.md (it failed), and then a morning Short takes its place. */
export function isPlanned(date, slot, inputs) {
  const p = planDay(date, inputs);
  const u = p.uploads.find((x) => x.slot === slot);
  if (u) return { planned: true, plan: p, upload: u };
  if (slot === 'morning' && p.type === 'movie') {
    return { planned: true, plan: p, upload: { slot, kind: 'temple', what: 'famous-temple darshan Short (the movie part is missing)' }, why: 'movie day without a logged movie part: the morning Short replaces it' };
  }
  const why = p.dropped.includes(slot) ? `${slot} is left out by the ${CAP}-Shorts-a-day cap on ${date} (status and temple Shorts first: ${p.uploads.filter((x) => x.slot !== 'long').map((x) => x.slot).join(', ')})`
    : slot === 'noon' ? `the Dadi-Chhotu Short runs on Wednesdays of normal days only (${p.day}, ${p.type} day)`
        : ['status', 'eve', 'statusday'].includes(slot) ? `no festival status Short planned in the ${slot} slot on ${date}`
          : `${slot} is not planned on ${date} (${p.type} day)`;
  return { planned: false, plan: p, why };
}

const describe = (u) => `${u.slot} ${u.at}${u.festival ? ` (${u.festival})` : u.topic ? ` (${u.topic === 'series' ? 'section 5 / mandir series' : `${u.topic} katha`})` : u.kind ? ` (${u.kind}${u.theme !== undefined ? `:${u.theme}` : ''})` : ''}`;

function main() {
  const args = process.argv.slice(2);
  const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
  const inputs = loadInputs(opt('--root') || '.');
  if (opt('--days')) {
    const from = opt('--from') || istToday();
    const rows = [];
    for (let i = 0; i < +opt('--days'); i++) {
      const p = planDay(addDays(from, i), inputs);
      rows.push(`${p.date} ${p.day} ${p.type.padEnd(8)} ${p.uploads.length}: ${p.uploads.map(describe).join(', ')}${p.dropped.length ? `  | cap drops: ${p.dropped.join(', ')}` : ''}${p.festival ? `  [${p.festival}]` : ''}`);
    }
    console.log(rows.join('\n'));
    return;
  }
  const date = opt('--date') || istToday();
  const slot = opt('--slot');
  if (!slot) { console.log(JSON.stringify(planDay(date, inputs), null, 1)); return; }
  const r = isPlanned(date, slot, inputs);
  const u = r.upload || {};
  console.log(JSON.stringify({ date, slot, planned: r.planned, why: r.why || '', what: u.what || '', kind: u.kind || '', theme: u.theme ?? '', fallback: u.fallback || '', uploads: r.plan.uploads.map((x) => x.slot) }));
  if (process.env.GITHUB_OUTPUT) {
    const one = (t) => String(t ?? '').replace(/\n/g, ' ');
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `planned=${r.planned}\nwhy=${one(r.why)}\nwhat=${one(u.what)}\nkind=${one(u.kind)}\ntheme=${one(u.theme)}\nfallback=${one(u.fallback)}\nday=${one(u.day)}\n`);
  }
  if (args.includes('--check') && !r.planned) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
