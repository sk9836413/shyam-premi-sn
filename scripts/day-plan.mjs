#!/usr/bin/env node
// Which YouTube uploads a day gets (owner, 9 Nov 2026: at most 3 high-quality uploads a day).
//
// Why: at 3-4 uploads a day (2-6 Nov) Shorts got hundreds of views; at 5-6 a day (7-9 Nov: status, morning, noon,
// long 12:30, evening) they collapsed to 0-15, most likely YouTube's repetitive / mass-produced content signals.
//
//   normal day   morning Short (temple/darshan or a strong katha, 21-35 s) + evening darshan (19:00) + the rotating
//                "third": Monday and Friday the long katha video (15:00), Wednesday the Dadi-Chhotu Short (15:00,
//                a new setting and outfits each time), other days nothing
//   festival day (a date in automation/calendar.md) status Short 06:00 (when story/status/<date>.json exists) +
//                morning festival Short + evening darshan; no long, no noon
//   movie day    (a release date of an approved story/movies/<series>/series.json) the movie part at 07:00 replaces the
//                morning Short + evening darshan (+ the status Short when the day is also a festival with a status
//                file, e.g. 20 Nov Janmotsav); no long, no noon
// Photo posts and the Veo kit are not YouTube uploads and are not planned here. scripts/upload-guard.mjs enforces the
// hard cap (3 YouTube uploads per IST date) on top of this plan.
//
//   node scripts/day-plan.mjs --date 2026-11-11 --slot noon --check   exit 0 when planned, 1 when not (GITHUB_OUTPUT
//                                                                     planned=true|false, why=...)
//   node scripts/day-plan.mjs --days 14 [--from 2026-11-10]           print the plan per date (dry run, publishes nothing)
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const LONG_DAYS = [1, 5]; // Monday, Friday
export const NOON_DAYS = [3]; // Wednesday
export const AT = { status: '06:00', movie: '07:00', morning: 'on render, ~10:30', long: '15:00', noon: '15:00', evening: '19:00' };

const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } };
export const weekday = (date) => new Date(`${date}T12:00:00Z`).getUTCDay();
export const addDays = (date, n) => new Date(Date.parse(`${date}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
export const istToday = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);

/** Everything the plan depends on, read from the repo (root = the checkout). */
export function loadInputs(root = '.') {
  const festivals = new Map();
  for (const m of read(path.join(root, 'automation/calendar.md')).matchAll(/^\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*(.+?)\s*\|\s*$/gm)) {
    festivals.set(m[1], m[2].replace(/\*\*/g, '').split(';')[0].replace(/\s*\([^)]*\)/g, '').trim());
  }
  const statusDir = path.join(root, 'story/status');
  const status = new Set(fs.existsSync(statusDir) ? fs.readdirSync(statusDir).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).map((f) => f.slice(0, 10)) : []);
  const movies = new Map(); // release date -> "series part n"
  const movieDir = path.join(root, 'story/movies');
  for (const series of fs.existsSync(movieDir) ? fs.readdirSync(movieDir) : []) {
    let j;
    try { j = JSON.parse(read(path.join(movieDir, series, 'series.json'))); } catch { continue; }
    if (j?.approved !== true) continue;
    for (const p of j.parts || []) if (p.release) movies.set(p.release, `${series} part ${p.part ?? p.n ?? '?'}`);
  }
  for (const m of read(path.join(root, 'automation/log.md')).matchAll(/^(\d{4}-\d{2}-\d{2}) \| movie \| (\S+)/gm)) {
    if (!movies.has(m[1])) movies.set(m[1], m[2]);
  }
  return { festivals, status, movies };
}

/** The day's planned YouTube uploads, in time order: [{ slot, at, what }]. */
export function planDay(date, { festivals, status, movies }) {
  const wd = weekday(date);
  const festival = festivals.get(date);
  const movie = movies.get(date);
  const up = [];
  const hasStatus = festival && status.has(date);
  if (movie) {
    if (hasStatus) up.push({ slot: 'status', what: `${festival} status Short` });
    up.push({ slot: 'movie', what: `movie ${movie} (replaces the morning Short)` });
    up.push({ slot: 'evening', what: 'evening darshan' });
    return { date, day: WEEKDAY[wd], type: 'movie', festival, uploads: up.map((u) => ({ ...u, at: AT[u.slot] })) };
  }
  if (festival) {
    if (hasStatus) up.push({ slot: 'status', what: `${festival} status Short` });
    up.push({ slot: 'morning', what: `${festival} festival Short` });
    up.push({ slot: 'evening', what: 'evening darshan' });
    return { date, day: WEEKDAY[wd], type: 'festival', festival, uploads: up.map((u) => ({ ...u, at: AT[u.slot] })) };
  }
  up.push({ slot: 'morning', what: 'morning Short (temple/darshan or strong katha, 21-35 s)' });
  if (LONG_DAYS.includes(wd)) up.push({ slot: 'long', what: 'long katha video' });
  if (NOON_DAYS.includes(wd)) up.push({ slot: 'noon', what: 'Dadi-Chhotu Short (new setting/outfits)' });
  up.push({ slot: 'evening', what: 'evening darshan' });
  return { date, day: WEEKDAY[wd], type: 'normal', uploads: up.map((u) => ({ ...u, at: AT[u.slot] })) };
}

/** Is this slot planned for the date? The morning slot stays allowed on a movie day: the workflow reaches it there
 *  only when the movie part is NOT in log.md (it failed), and then a morning Short takes its place. */
export function isPlanned(date, slot, inputs) {
  const p = planDay(date, inputs);
  if (p.uploads.some((u) => u.slot === slot)) return { planned: true, plan: p };
  if (slot === 'morning' && p.type === 'movie') return { planned: true, plan: p, why: 'movie day without a logged movie part: the morning Short replaces it' };
  const why = slot === 'long' ? `the long video runs on Mon and Fri of normal days only (${p.day}, ${p.type} day)`
    : slot === 'noon' ? `the Dadi-Chhotu Short runs on Wednesdays of normal days only (${p.day}, ${p.type} day)`
      : slot === 'status' ? `no festival status Short planned for ${date}`
        : `${slot} is not planned on ${date} (${p.type} day)`;
  return { planned: false, plan: p, why };
}

function main() {
  const args = process.argv.slice(2);
  const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
  const inputs = loadInputs(opt('--root') || '.');
  if (opt('--days')) {
    const from = opt('--from') || istToday();
    const rows = [];
    for (let i = 0; i < +opt('--days'); i++) {
      const p = planDay(addDays(from, i), inputs);
      rows.push(`${p.date} ${p.day} ${p.type.padEnd(8)} ${p.uploads.length}: ${p.uploads.map((u) => `${u.slot} ${u.at}`).join(', ')}${p.festival ? `  [${p.festival}]` : ''}`);
    }
    console.log(rows.join('\n'));
    return;
  }
  const date = opt('--date') || istToday();
  const slot = opt('--slot');
  if (!slot) { console.log(JSON.stringify(planDay(date, inputs), null, 1)); return; }
  const r = isPlanned(date, slot, inputs);
  console.log(JSON.stringify({ date, slot, planned: r.planned, why: r.why || '', uploads: r.plan.uploads.map((u) => u.slot) }));
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `planned=${r.planned}\nwhy=${(r.why || '').replace(/\n/g, ' ')}\n`);
  if (args.includes('--check') && !r.planned) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
