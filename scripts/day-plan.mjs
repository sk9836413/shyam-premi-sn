#!/usr/bin/env node
// Which YouTube uploads a day gets (owner, 9 Nov 2026: at most 3 a day; re-planned 11 Nov 2026 around the one format
// the channel's data shows can go viral: the festival "status" Short).
//
// Data (all 109 videos, 11 Nov 2026): festival status Shorts avg 154 views (Choti Diwali Status 798, Dhanteras Status
// 456: the big festivals, released the night before or early on the day); famous-temple darshan avg 60 (Moravinandan
// Khatu Shyam 173, Shakambhari Sakrai 163, Salasar 133); katha Shorts avg 18 (the worst: cut); generic "X Darshan" 1-10.
// So every day is filled by priority, at most CAP = 3 uploads (scripts/upload-guard.mjs enforces the same cap):
//   0 movie      the approved mini-movie part, 07:00 (17-20 Nov: Khatu Shyam ji ki Amar Katha)
//   1 status     festival status Shorts (scripts/status-engine.mjs, automation/festivals.json): `eve` 20:00 the evening
//                before, `status` 00:30 on the day, `statusday` 08:30 on big festivals (Janmotsav also 2 days before)
//   2 morning    normal day: the weekday "day status" Short (Somvar Mahadev, Mangalvar Salasar Balaji, Budhvar Ganesh,
//                Guruvar Vishnu/Sai, Shukravar Lakshmi/Santoshi, Shanivar Shani dev, Ravivar Surya; status engine);
//                Ekadashi: Gyaras Khatu Shyam status; other festival days: a famous-temple darshan (Claude, STORY.md).
//                Not on movie days (the movie part is the morning upload) or big-festival days (`statusday` is).
//   3 evening    famous-temple darshan Short, 19:00 (Claude, STORY.md)
//   4 kalyug     "Kalyug ke Bhagwan" (KALYUG=on), Tue/Thu/Sat of non-festival, non-movie days, 08:00, only if it fits
//   5 long/noon  the long katha video Mon/Fri 15:00 and the Dadi-Chhotu Short Wed 15:00, only if they fit
// A logged kalyug episode counts first (it is already scheduled). Photo posts and the Veo kit are not YouTube uploads.
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
export const CAP = 3;
export const LONG_DAYS = [1, 5]; // Monday, Friday
export const NOON_DAYS = [3]; // Wednesday
export const KALYUG_DAYS = [2, 4, 6]; // Tuesday, Thursday, Saturday
export const AT = { status: '00:30', movie: '07:00', kalyug: '08:00', statusday: '08:30', morning: 'on render, ~10:30', long: '15:00', noon: '15:00', evening: '19:00', eve: '20:00' };
export const PRIORITY = { movie: 0, status: 1, eve: 1, statusday: 1, morning: 2, evening: 3, kalyug: 4, long: 5, noon: 5 };
const ORDER = { status: 0, movie: 1, kalyug: 2, statusday: 3, morning: 4, long: 5, noon: 6, evening: 7, eve: 8 };
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
  return { festivals, placements: placements(list), movies, kalyug: process.env.KALYUG === 'on', kalyugLogged };
}

/** The day's planned YouTube uploads (at most CAP), in time order: [{ slot, at, what, kind?, theme?, festival?, k? }];
 *  `dropped` lists the slots the cap left out. */
export function planDay(date, { festivals = new Map(), placements: pl = [], movies = new Map(), kalyug = false, kalyugLogged = new Set() }) {
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
  if (!fest && !movie && LONG_DAYS.includes(wd)) cands.push({ slot: 'long', what: 'long katha video' });
  if (!fest && !movie && NOON_DAYS.includes(wd)) cands.push({ slot: 'noon', what: 'Dadi-Chhotu Short (new setting/outfits)' });
  const rank = (c) => (c.logged ? 0.5 : PRIORITY[c.slot]);
  const ranked = cands.map((c, i) => ({ c, i })).sort((a, b) => rank(a.c) - rank(b.c) || a.i - b.i).map((x) => x.c);
  const kept = ranked.slice(0, CAP).sort((a, b) => ORDER[a.slot] - ORDER[b.slot]);
  const dropped = ranked.slice(CAP).map((c) => c.slot);
  const type = movie ? 'movie' : fest ? 'festival' : kept.some((c) => c.slot === 'kalyug') ? 'kalyug' : 'normal';
  return { date, day: WEEKDAY[wd], type, festival: f?.name, uploads: kept.map(({ logged, ...u }) => ({ ...u, at: u.at || AT[u.slot] })), dropped };
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
  const why = p.dropped.includes(slot) ? `${slot} is left out by the ${CAP}-a-day cap on ${date} (status and temple Shorts first: ${p.uploads.map((x) => x.slot).join(', ')})`
    : slot === 'long' ? `the long video runs on Mon and Fri of normal days only (${p.day}, ${p.type} day)`
      : slot === 'noon' ? `the Dadi-Chhotu Short runs on Wednesdays of normal days only (${p.day}, ${p.type} day)`
        : ['status', 'eve', 'statusday'].includes(slot) ? `no festival status Short planned in the ${slot} slot on ${date}`
          : `${slot} is not planned on ${date} (${p.type} day)`;
  return { planned: false, plan: p, why };
}

const describe = (u) => `${u.slot} ${u.at}${u.festival ? ` (${u.festival})` : u.kind ? ` (${u.kind}${u.theme !== undefined ? `:${u.theme}` : ''})` : ''}`;

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
  console.log(JSON.stringify({ date, slot, planned: r.planned, why: r.why || '', what: u.what || '', kind: u.kind || '', theme: u.theme ?? '', uploads: r.plan.uploads.map((x) => x.slot) }));
  if (process.env.GITHUB_OUTPUT) {
    const one = (t) => String(t ?? '').replace(/\n/g, ' ');
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `planned=${r.planned}\nwhy=${one(r.why)}\nwhat=${one(u.what)}\nkind=${one(u.kind)}\ntheme=${one(u.theme)}\n`);
  }
  if (args.includes('--check') && !r.planned) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
