#!/usr/bin/env node
// Which YouTube uploads a day gets (owner, 9 Nov 2026: at most 3 Shorts a day; re-planned 11 Nov 2026 around the festival
// "status" Short; re-planned again 16 Nov 2026 from YouTube Analytics, owner: "to aisa hi karo").
//
// DATA (YouTube Analytics, 25 Oct - 16 Nov 2026):
//   - festival status Shorts get the views because they get SHARED: Choti Diwali 799 views / 31 shares, Dhanteras 456 /
//     25 shares, Chhath Usha Arghya 239 (released the night before or early on the day, when people pick their status);
//   - famous-temple darshan has the best retention: Khatu Moravinandan 76%, Salasar 72%, Shakambhari 62% (135-173 views);
//     Hare ka Sahara 73%, Barbarik sheesh daan 90% (38-86 views);
//   - long katha (5-7 min): 18-22% retention, 38-57 views (STOPPED); the Chhath jukebox long: 170 views;
//   - the new facts Shorts: 1-7 views each (capped at 2 a week, reviewed on 25 Nov 2026).
// So every day is filled by priority, at most CAP = 3 Shorts (scripts/upload-guard.mjs enforces the same cap):
//   0   movie      the approved mini-movie part, 07:00 (17-20 Nov: Khatu Shyam ji ki Amar Katha)
//   1   status     festival status Shorts (scripts/status-engine.mjs, automation/festivals.json): `eve` 20:00 the evening
//                  before, `status` 00:30 on the day, `statusday` 08:30 on big festivals (Janmotsav also 2 days before)
//   2   morning    EVERY non-festival day (movie days too): the weekday "day status" Short (Somvar Mahadev, Mangalvar
//                  Salasar Balaji, Budhvar Ganesh, Guruvar Vishnu, Shukravar Lakshmi, Shanivar Shani dev, Ravivar Surya;
//                  Ekadashi: Gyaras Khatu Shyam), public 06:00 IST (DAWN.daystatus) for the morning WhatsApp status, with
//                  the "स्टेटस पर लगाएं 📲" pill; RENDERED THE EVENING BEFORE by the `status` job (status-engine `due`).
//                  Other festival days (their status Short is the share format): a famous-temple darshan of the deity.
//                  Not on big-festival days (`statusday` is the morning upload).
//   3   evening    famous-temple darshan Short, 19:00 (Claude, STORY.md): the searched, high-retention temples first
//                  (Khatu Shyam ji, Salasar Balaji, Mehandipur Balaji, Shakambhari Mata, Jeen Mata, Rani Sati Dadi with
//                  the sati rules)
//   3.6 kailash / 3.7 pov   the character series (scripts/series-plan.mjs), 08:00 on their days; never instead of the
//                  day status or the evening darshan (on a festival tie-in day they take the festival-morning darshan)
//   3.8 facts      "pauranik facts / rahasya" Short 17:00 (scripts/facts.mjs, made the evening before): at most
//                  FACTS_PER_WEEK = 2 a week until the FACTS_REVIEW (25 Nov 2026) verdict in automation/facts-review.json
//                  (scripts/growth-compare.mjs --facts-review): median under 20 views = facts stop; repo var FACTS=off too
//   4   kalyug     "Kalyug ke Bhagwan" (KALYUG=on), Tue/Thu/Sat of non-festival, non-movie days, 08:00, only if it fits
//   5   noon       the Dadi-Chhotu Short Wed 15:00, only if it fits
// A logged upload counts first (it is already scheduled). Photo posts and the Veo kit are not YouTube uploads. The bhajan
// loop / veer rotation no longer takes the morning slot (16 Nov 2026: the day status is the morning upload every day);
// scripts/loop.mjs still runs on a manual slot=loop dispatch.
// LONG VIDEO (owner, 16 Nov 2026): the plain long katha is STOPPED. The long slot (LONG_CAP = 1, outside the Shorts cap)
// only holds the formats that work: the weekly MANTRA JAAP (kind "mantra"; scripts/mantra.mjs, automation/mantras.json:
// Sundays from 22 Nov 2026, a Vishnu/Krishna mantra on the week's Ekadashi from 23 Nov) and a festival BHAJAN JUKEBOX
// (kind "jukebox", scripts/jukebox.mjs) when the library has at least JUKEBOX_MIN_SONGS full-length (>= 100 s) QA-passed
// bhajans of that festival, a picture bank and no jukebox of it in the last LONG_REPEAT_DAYS days (JUKEBOXES lists the
// kinds jukebox.mjs can build); a date-scoped override (automation/chhath-2026.json) may still set its own long video.
// Every other day has NO long video (the long job skips). The weekly facts compilation (scripts/facts-compile.mjs) runs
// only after a positive facts review. longSubject() is kept for the override / an explicit slot=long dispatch.
//
//   node scripts/day-plan.mjs --date 2026-11-11 --slot noon --check   exit 0 when planned, 1 when not (GITHUB_OUTPUT
//                                                                     planned, why, what, kind, theme)
//   node scripts/day-plan.mjs --days 14 [--from 2026-11-10]           print the plan per date (dry run, publishes nothing)
//   node scripts/day-plan.mjs --date 2026-11-15 --dawn                the date's DAWN uploads not in log.md yet (made the
//                                                                     evening before; GITHUB_OUTPUT dawn_bhajans, dawn_long)
// DAWN UPLOADS (owner, 14 Nov 2026: "Bhajan subah subah hi bajate h log", devotees play bhajans early in the morning):
// a bhajan Short in the morning (or extra `bhajan`) slot is public at 05:45 IST (DAWN.bhajan; Facebook Reel 06:00,
// Instagram on the first poll after 06:00), the day status Short at 06:00 (DAWN.daystatus; inside the 05:30-06:30 bhajan
// window because its soundtrack is a bhajan), and a long video of a bhajan or mantra kind (the jukebox, the weekly mantra
// jaap: DAWN_LONG_KINDS) at 05:30 (DAWN.long; Facebook feed 05:30). Dawn uploads are RENDERED THE EVENING BEFORE (daily.yml:
// every evening-slot run, i.e. the 10:43 / 18:46 IST scheduler dispatches and the evening polls, plus slot=dawn which
// photos.yml dispatches at 19:46 IST) with publishAt; the IST date of the publish stays the upload's date (slug, log.md
// line, upload-guard cap). When that render is missing, the morning run makes it and it goes public as soon as it is ready.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadFestivals, placements } from './status-engine.mjs';
import { DAY_THEMES } from './status-themes.mjs';
import { loadMantras, mantraFor } from './mantra.mjs';
import { addSeries, allSeriesInputs, morningFallback, seriesTables } from './series-plan.mjs';

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const CAP = 3; // Shorts: every vertical upload (status, morning, evening, noon, kalyug, movie parts)
export const LONG_CAP = 1; // at most 1 long video a day (mantra jaap / festival jukebox), never counted against CAP
export const LONG_REPEAT_DAYS = 30; // a festival told by a long video (katha or jukebox) within this many days is not repeated
export const NOON_DAYS = [3]; // Wednesday
export const KALYUG_DAYS = [2, 4, 6]; // Tuesday, Thursday, Saturday
export const FACTS_FROM = '2026-11-17'; // owner, 15 Nov 2026: facts Shorts from 17 Nov where the caps allow
// Facts Shorts got 1-7 views each (16 Nov 2026): at most FACTS_PER_WEEK (Mon-Sun) until the review on FACTS_REVIEW, when
// scripts/growth-compare.mjs --facts-review writes FACTS_REVIEW_FILE: median views under FACTS_MEDIAN_MIN = verdict "off"
// (the planner stops facts from that date), else "on" (the weekly limit ends; the cap and priority still apply).
export const FACTS_PER_WEEK = 2;
export const FACTS_REVIEW = '2026-11-25';
export const FACTS_REVIEW_FILE = 'automation/facts-review.json';
export const FACTS_MEDIAN_MIN = 20;
// Festival bhajan jukebox as the long video (owner, 16 Nov 2026): the festivals.json theme -> the library songs it uses
// (bhajan.festival or bhajan.deity) and the picture bank (brand/photo-bank/<bank>). Only kinds scripts/jukebox.mjs can
// build are listed (its titles, captions and thumbnail are Chhath's); a Khatu Janmotsav jukebox needs >= 4 full-length
// QA-passed Khatu bhajans AND jukebox.mjs support (16 Nov 2026: only w47-05 / w47-09 passed, 45 s each).
export const JUKEBOXES = { chhath: { festival: 'chhath', bank: 'chhath' } };
export const JUKEBOX_MIN_SONGS = 4;
export const JUKEBOX_MIN_SECONDS = 100;
export const AT = { status: '00:30', movie: '07:00', kalyug: '08:00', statusday: '08:30', morning: 'on render, ~10:30', long: '12:30', noon: '15:00', facts: '17:00', evening: '19:00', bhajan: '19:45', eve: '20:00' };
// owner, 16 Nov 2026: movie > festival status > day status > darshan > Kailash / POV (series-plan.mjs 3.6 / 3.7) > facts
export const PRIORITY = { movie: 0, status: 1, eve: 1, statusday: 1, morning: 2, evening: 3, facts: 3.8, kalyug: 4, noon: 5, bhajan: 6 };
// Dawn uploads (see the header): times and the long-video kinds that go out at dawn instead of 12:30. The day status
// Short: 06:00, early for the morning WhatsApp status and inside the 05:30-06:30 bhajan window (owner, 16 Nov 2026).
export const DAWN = { bhajan: '05:45', daystatus: '06:00', long: '05:30' };
export const DAWN_FB = { bhajan: '06:00', daystatus: '06:00', long: '05:30' }; // Facebook times (the bhajan Reel 15 min after YouTube)
export const DAWN_IG = { bhajan: '06:00' }; // Instagram queue time: published by the first trigger after it
export const DAWN_LONG_KINDS = ['jukebox', 'mantra', 'bhajan'];
export const DAWN_SLOTS = ['morning', 'bhajan']; // a bhajan Short in these slots without its own `at` is a dawn upload
export const isDawnAt = (at) => /^\d{2}:\d{2}$/.test(at || '') && at < '07:00' && at >= '04:00';
/** Time of a bhajan Short of the override: its own `at` (null = on render, kept for 14 Nov 2026), else DAWN.bhajan in
 *  the morning / extra bhajan slot (owner, 14 Nov 2026), else the slot's normal time. */
export function bhajanAt(slot, o = {}) {
  const at = Object.hasOwn(o, 'at') ? o.at || null : DAWN_SLOTS.includes(slot) ? DAWN.bhajan : null;
  return { at, dawn: isDawnAt(at) };
}
const ORDER = { status: 0, movie: 1, kalyug: 2, statusday: 3, morning: 4, long: 5, noon: 6, facts: 6.5, evening: 7, bhajan: 7.5, eve: 8 };
// Date-scoped override (automation/chhath-2026.json, owner 13 Nov 2026: Chhath bhajan Shorts 13-16 Nov and every upload
// of those dates Chhath themed): `slots.<slot>` turns that slot into a bhajan Short (kind "bhajan", scripts/bhajan-short.mjs;
// the extra `bhajan` slot only fits on EXTRA_UPLOAD_DAY), `long` replaces the long video's subject. Other dates: untouched.
export const OVERRIDE_FILE = 'automation/chhath-2026.json';
export const BHAJAN_FALLBACK = 'Chhath Surya temple or ghat darshan Short (no Chhath bhajan passed QA): Deo Surya Mandir Aurangabad, Ulaar Surya Mandir, Konark Sun Temple, Modhera Sun Temple, or the Patna / Varanasi Chhath ghats; a temple not used in the last 30 days; every fact verified (STORY.md); Chhath bhajan outro when BHAJAN_VOCALS=on';
const TIER = { big: 0, status: 1 };
const GYARAS_THEMES = ['ekadashi', 'gita'];
// The evening darshan's temples (owner, 16 Nov 2026, from the retention data): searched temples people stay for.
export const DARSHAN_PREFER = 'prefer the high-retention, searched temples: Khatu Shyam ji (Moravinandan Khatu Shyam 76% retention, Hare ka Sahara 73%, Barbarik sheesh daan 90%), Salasar Balaji (72%), Mehandipur Balaji, Shakambhari Mata Sakrai (62%), Jeen Mata, Rani Sati Dadi (the sati-temple rules of mandir-series.md in full), not one used in the last 30 days';

const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } };
export const weekday = (date) => new Date(`${date}T12:00:00Z`).getUTCDay();
export const addDays = (date, n) => new Date(Date.parse(`${date}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
export const istToday = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);

/** Everything the plan depends on, read from the repo (root = the checkout). */
// Character series (scripts/series-plan.mjs): Kailash Parivar Mon/Thu/Sat, Shri Krishna kehte hain (pov) Tue/Fri, +1 festival
// tie-in a week each, 08:00, once the owner approved the pilot; below the day status and the evening darshan (16 Nov 2026).
Object.assign(AT, seriesTables().at); Object.assign(PRIORITY, seriesTables().priority); Object.assign(ORDER, seriesTables().order);

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
  const factsLogged = new Set([...log.matchAll(/^(\d{4}-\d{2}-\d{2}) \| facts \| /gm)].map((m) => m[1]));
  let factsReview = null;
  try { factsReview = JSON.parse(read(path.join(root, FACTS_REVIEW_FILE))); } catch { /* not reviewed yet */ }
  const seriesIn = allSeriesInputs(root, list, log);
  return { ...seriesIn, festivals, festivalList: list, placements: placements(list), movies, kalyug: process.env.KALYUG === 'on', kalyugLogged, longs: longsOf(log), today: istToday(),
    override, extraDay: (process.env.EXTRA_UPLOAD_DAY || '').trim(), mantras: loadMantras(root), facts: process.env.FACTS !== 'off', factsLogged, factsReview,
    library: bhajanLibrary(root) };
}

/** QA-passed library bhajans (music/library/bhajan-*.licence.json; only songs that passed the gate are imported):
 *  [{ id, deity, festival, seconds }]. */
export function bhajanLibrary(root = '.') {
  const dir = path.join(root, 'music/library');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((x) => /^bhajan-.*\.licence\.json$/.test(x)) : [];
  return files.flatMap((x) => {
    try {
      const j = JSON.parse(read(path.join(dir, x)));
      const b = j.bhajan || {};
      return [{ id: j.id || x.replace(/\.licence\.json$/, ''), deity: b.deity || j.deity || null, festival: b.festival || null, seconds: Number(b.seconds || j.qa?.seconds || 0) }];
    } catch { return []; }
  });
}

/** The festival jukebox the date's long video can be: { key, songs, bank } or { key?, why } (no jukebox). */
export function jukeboxFor(date, inputs = {}) {
  const f = inputs.festivals?.get(date);
  if (!f || f.tier === 'info') return { why: 'no festival today' };
  const key = Object.keys(JUKEBOXES).find((k) => k === f.theme || k === f.key);
  if (!key) return { why: `no jukebox kind for ${f.name} (scripts/jukebox.mjs builds: ${Object.keys(JUKEBOXES).join(', ')})` };
  const j = JUKEBOXES[key];
  const songs = (inputs.library || []).filter((b) => (j.festival ? b.festival === j.festival : b.deity === j.deity) && b.seconds >= JUKEBOX_MIN_SECONDS);
  if (songs.length < JUKEBOX_MIN_SONGS) return { key, why: `only ${songs.length} full-length (>= ${JUKEBOX_MIN_SECONDS} s) QA-passed ${key} bhajans (needs ${JUKEBOX_MIN_SONGS})` };
  const from = addDays(date, -LONG_REPEAT_DAYS);
  const done = (inputs.longs || []).find((l) => l.date >= from && l.date < date && l.text.includes(key) && /nonstop|jukebox/.test(l.text));
  if (done) return { key, why: `a ${key} jukebox went out on ${done.date} (within ${LONG_REPEAT_DAYS} days)` };
  return { key, songs: songs.length, bank: j.bank };
}

const factsMemo = new WeakMap();
/** Does the date's plan keep a facts Short? (memoised per inputs: the weekly limit looks back over the week) */
function factsKept(date, inputs) {
  let m = factsMemo.get(inputs);
  if (!m) factsMemo.set(inputs, (m = new Map()));
  if (!m.has(date)) m.set(date, planDay(date, inputs).uploads.some((u) => u.slot === 'facts'));
  return m.get(date);
}
const mondayOf = (date) => addDays(date, -((weekday(date) + 6) % 7));
/** Facts Shorts of the date's Mon-Sun week other than the date: logged ones (any day) + planned ones before it. */
export function factsInWeek(date, inputs = {}) {
  const mon = mondayOf(date);
  let n = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(mon, i);
    if (d === date) continue;
    if (inputs.factsLogged?.has(d) || (d < date && d >= FACTS_FROM && factsKept(d, inputs))) n++;
  }
  return n;
}
/** Facts state of a date: { on, why } (FACTS=off, the review verdict, the weekly limit). */
export function factsState(date, inputs = {}) {
  if (inputs.facts !== true || date < FACTS_FROM) return { on: false, why: 'facts off (FACTS=off or before 17 Nov 2026)' };
  const r = inputs.factsReview;
  if (r?.verdict === 'off' && date >= r.date) return { on: false, why: `facts review ${r.date}: median ${r.median} views < ${FACTS_MEDIAN_MIN}, facts stopped` };
  if (r?.verdict === 'on' && date >= r.date) return { on: true, why: `facts review ${r.date}: median ${r.median} views` };
  const n = factsInWeek(date, inputs);
  return n < FACTS_PER_WEEK ? { on: true, why: `${n} facts Short(s) this week` } : { on: false, why: `${FACTS_PER_WEEK} facts Shorts this week already (max ${FACTS_PER_WEEK} a week until the ${FACTS_REVIEW} review)` };
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
      if (g && sameFestival(g.key || g.name, key) && longSubject(d, inputs).festival && !mantraOf(d, inputs)) covered = d;
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
  // Morning (owner, 16 Nov 2026): a status Short every day. Non-festival days (movie days too) and Ekadashi: the day
  // status Short at 06:00, rendered the evening before by the status job; other festival days (they have their festival
  // status Short): a famous-temple darshan of the deity (not on movie days: the movie part is the morning upload).
  if (!bigToday) {
    if (fest && !GYARAS_THEMES.includes(fest.theme)) {
      if (!movie) cands.push({ slot: 'morning', kind: 'temple', what: `famous-temple darshan Short tied to ${fest.name} (a well-known, searched temple of that deity; STORY.md)` });
    } else {
      const theme = fest ? 'gyaras' : wd;
      cands.push({ slot: 'morning', kind: 'daystatus', theme, at: DAWN.daystatus, dawn: true,
        what: `day status Short: ${DAY_THEMES[theme].names[0].en} (15-25 s loop, "स्टेटस पर लगाएं 📲" pill; public ${DAWN.daystatus} IST for the morning WhatsApp status, made the evening before by the status job; scripts/status-engine.mjs)` });
    }
  }
  // Evening hook A/B (owner, 15 Nov 2026; reference "Everyone is against me... but God is with me" 3.57 lakh): on odd
  // days of the month the darshan Short leads with a relatable emotional line instead of the temple name (hook_style).
  const emo = date >= '2026-11-21' && Number(date.slice(8, 10)) % 2 === 1; // after the Janmotsav countdown evenings
  cands.push({ slot: 'evening', kind: 'temple', ...(emo ? { hook: 'emotional' } : {}),
    what: `${emo ? 'famous-temple darshan Short, EMOTIONAL-HOOK arm of the A/B: "hook_style": "emotional", a relatable line as title, hook and cover (e.g. "सब साथ छोड़ दें… पर महादेव नहीं छोड़ते 🔱"), 20-25 s, dark diya-lit sanctum, slow push-in (STORY.md "Evening hook A/B")'
      : 'famous-temple darshan Short (a well-known, searched temple; name first; STORY.md)'}; ${DARSHAN_PREFER}` });
  if (kalyugLogged.has(date) || (kalyug && KALYUG_DAYS.includes(wd) && !fest && !movie)) {
    cands.push({ slot: 'kalyug', logged: kalyugLogged.has(date), what: 'Kalyug ke Bhagwan episode (08:00, made the evening before)' });
  }
  // Facts Short (scripts/facts.mjs): from FACTS_FROM where it fits (last in the priority), at most FACTS_PER_WEEK a week
  // until the review; a logged one counts first.
  const factsOn = factsState(date, inputs).on; // loadInputs sets inputs.facts (FACTS != off); hand-made test inputs leave it out
  if (inputs.factsLogged?.has(date) || factsOn) {
    cands.push({ slot: 'facts', kind: 'facts', logged: Boolean(inputs.factsLogged?.has(date)), what: 'pauranik facts / rahasya Short (17:00, made the evening before; scripts/facts.mjs, STORY.md "Facts Shorts")' });
  }
  if (!fest && !movie && NOON_DAYS.includes(wd)) cands.push({ slot: 'noon', what: 'Dadi-Chhotu Short (new setting/outfits)' });
  const ov = inputs.override?.days?.[date] || null;
  for (const [slot, o] of Object.entries(ov?.slots || {})) {
    if (o.kind !== 'bhajan') continue;
    const t = bhajanAt(slot, o);
    const u = { slot, kind: 'bhajan', day: o.day, ...(t.at ? { at: t.at } : {}), ...(t.dawn ? { dawn: true } : {}),
      what: `Chhath bhajan Short "${o.title}" (${o.day}; the library bhajan is the whole soundtrack; scripts/bhajan-short.mjs, automation/chhath-2026.json)`, fallback: BHAJAN_FALLBACK };
    const k = cands.findIndex((c) => c.slot === slot);
    if (k >= 0) cands[k] = u; else cands.push(u);
  }
  const cap = CAP + (inputs.extraDay && inputs.extraDay === date ? 1 : 0);
  const rank = (c) => (c.logged ? 0.5 : c.rank ?? PRIORITY[c.slot]);
  addSeries(date, inputs, { wd, movie, override: ov }, cands, cap, rank);
  const ranked = cands.map((c, i) => ({ c, i })).sort((a, b) => rank(a.c) - rank(b.c) || a.i - b.i).map((x) => x.c);
  const kept = ranked.slice(0, cap);
  const dropped = ranked.slice(cap).map((c) => c.slot);
  const long = longUpload(date, inputs, movie, ov);
  let noLong = '';
  if (long) {
    if (DAWN_LONG_KINDS.includes(long.kind)) Object.assign(long, { at: DAWN.long, dawn: true });
    kept.push(long);
  } else noLong = longWhyNot(date, inputs);
  // time order: dawn uploads right after the 00:30 status Short (05:30 long, 05:45 bhajan, 06:00 day status)
  const ord = (u) => (u.dawn ? (u.slot === 'long' ? 0.4 : 0.5) : ORDER[u.slot]);
  kept.sort((a, b) => ord(a) - ord(b) || String(a.at).localeCompare(String(b.at)));
  const type = movie ? 'movie' : fest ? 'festival' : kept.some((c) => c.slot === 'kalyug') ? 'kalyug' : 'normal';
  return { date, day: WEEKDAY[wd], type, festival: f?.name, uploads: kept.map(({ logged, ...u }) => ({ ...u, at: u.at || AT[u.slot] })), dropped,
    ...(noLong ? { noLong } : {}) };
}

/** The weekly mantra video of the date (scripts/mantra.mjs), or null. */
export const mantraOf = (date, inputs = {}) => (inputs.mantras ? mantraFor(date, inputs) : null);

/** Why the date has no long video (planDay `noLong`, isPlanned's `why`). */
function longWhyNot(date, inputs) {
  const j = jukeboxFor(date, inputs);
  return `no long video on ${date}: the plain long katha is stopped (owner, 16 Nov 2026: 18-22% retention, 38-57 views); the long slot is only the weekly mantra jaap or a festival bhajan jukebox (${j.why})`;
}

/** The day's long video (outside the Shorts cap) or null: the weekly mantra jaap, else a date-scoped override's long
 *  video (automation/chhath-2026.json), else a festival bhajan jukebox (jukeboxFor), else none (owner, 16 Nov 2026: no
 *  plain katha any more). `what` describes it for the job that makes it. */
function longUpload(date, inputs, movie, ov) {
  const m = mantraOf(date, inputs);
  if (m) {
    return { slot: 'long', kind: 'mantra', topic: `mantra:${m.id}`, mantra: m.id,
      what: `weekly mantra jaap long video "${m.text}" (${m.why}; 108-count malas, made the evening before by daily.yml job mantra, scripts/mantra-long.mjs; public ${DAWN.long} IST). If it cannot be made (no QA-passed takes), the day has no long video (no katha instead)` };
  }
  if (ov?.long) {
    const sub = longSubject(date, inputs);
    const u = { slot: 'long', kind: ov.long.kind || 'long', topic: ov.long.topic || sub.festival || 'series',
      what: ov.long.what || `long video of the date-scoped override (${OVERRIDE_FILE})${movie ? '; today is a mini-movie day, so not the story of the movie part' : ''}` };
    return u;
  }
  const j = jukeboxFor(date, inputs);
  if (j.songs) {
    return { slot: 'long', kind: 'jukebox', topic: j.key, jukebox: j.key,
      what: `${j.key} bhajan jukebox long video: ${j.songs} full-length QA-passed ${j.key} bhajans back to back, chapters + lyric captions, bank pictures brand/photo-bank/${j.bank} (made the evening before by daily.yml job jukebox, scripts/jukebox.mjs; public ${DAWN.long} IST)` };
  }
  return null;
}

/** Is this slot planned for the date? The morning slot stays allowed on a movie day: the workflow reaches it there only
 *  when the movie part is NOT in log.md (it failed), and then a morning Short takes its place. */
export function isPlanned(date, slot, inputs) {
  const p = planDay(date, inputs);
  const u = p.uploads.find((x) => x.slot === slot);
  if (u) return { planned: true, plan: p, upload: u };
  if (slot === 'morning' && morningFallback(p, inputs)) {
    return { planned: true, plan: p, upload: { slot, kind: 'temple', what: 'famous-temple darshan Short (the series episode that replaced it is missing)' }, why: 'series episode not in log.md: the morning Short runs' };
  }
  if (slot === 'morning' && p.type === 'movie') {
    return { planned: true, plan: p, upload: { slot, kind: 'temple', what: 'famous-temple darshan Short (the movie part is missing)' }, why: 'movie day without a logged movie part: the morning Short replaces it' };
  }
  const why = slot === 'long' && p.noLong ? p.noLong
    : p.dropped.includes(slot) ? `${slot} is left out by the ${CAP}-Shorts-a-day cap on ${date} (status and temple Shorts first: ${p.uploads.filter((x) => x.slot !== 'long').map((x) => x.slot).join(', ')})`
    : slot === 'noon' ? `the Dadi-Chhotu Short runs on Wednesdays of normal days only (${p.day}, ${p.type} day)`
        : ['status', 'eve', 'statusday'].includes(slot) ? `no festival status Short planned in the ${slot} slot on ${date}`
          : `${slot} is not planned on ${date} (${p.type} day)`;
  return { planned: false, plan: p, why };
}

/** The date's dawn uploads (made the evening before): { bhajans: [{ day, slot, at }], long: kind | '', daystatus?: { day,
 *  at } }; `log` = log.md text: uploads already there are left out. The day status Short is made by the status job
 *  (status-engine `due`), so it is only reported here (photos.yml's 19:46 IST retry counts it). */
export function dawnUploads(date, inputs = {}, log = '') {
  const done = (slot) => log.split(/\r?\n/).some((l) => l.startsWith(`${date} | ${slot} |`));
  const p = planDay(date, inputs);
  const bhajans = p.uploads.filter((u) => u.dawn && u.slot !== 'long' && u.kind === 'bhajan' && !done(u.slot)).map((u) => ({ day: date, slot: u.slot, at: u.at }));
  const loops = p.uploads.filter((u) => u.dawn && ['loop', 'veer'].includes(u.kind) && !done(u.slot)).map((u) => ({ day: date, slot: u.slot, kind: u.kind }));
  const l = p.uploads.find((u) => u.slot === 'long' && u.dawn);
  const ds = p.uploads.find((u) => u.dawn && u.kind === 'daystatus' && !done(u.slot));
  return { date, bhajans, ...(loops.length ? { loops } : {}), long: l && !done('long') ? l.kind : '', longAt: l ? l.at : '',
    ...(ds ? { daystatus: { day: date, slot: ds.slot, at: ds.at } } : {}) };
}

const describe = (u) => `${u.slot} ${u.at}${u.festival ? ` (${u.festival})` : u.mantra ? ` (${u.topic})` : u.kind === 'jukebox' || (u.slot === 'long' && u.kind === 'bhajan') ? ` (${u.kind}: ${u.topic})` : u.topic ? ` (${u.topic === 'series' ? 'section 5 / mandir series' : `${u.topic} katha`})` : u.kind ? ` (${u.kind}${u.theme !== undefined ? `:${u.theme}` : ''})` : ''}`;

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
  if (args.includes('--dawn')) {
    const r = dawnUploads(date, inputs, read(path.join(opt('--root') || '.', 'automation/log.md')));
    console.log(JSON.stringify(r));
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `dawn_bhajans=${JSON.stringify(r.bhajans)}\ndawn_loops=${JSON.stringify(r.loops || [])}\ndawn_long=${r.long}\n`);
    return;
  }
  const slot = opt('--slot');
  if (!slot) { console.log(JSON.stringify(planDay(date, inputs), null, 1)); return; }
  const r = isPlanned(date, slot, inputs);
  const u = r.upload || {};
  console.log(JSON.stringify({ date, slot, planned: r.planned, why: r.why || '', what: u.what || '', kind: u.kind || '', theme: u.theme ?? '', at: u.at || '', dawn: Boolean(u.dawn), fallback: u.fallback || '', uploads: r.plan.uploads.map((x) => x.slot) }));
  if (process.env.GITHUB_OUTPUT) {
    const one = (t) => String(t ?? '').replace(/\n/g, ' ');
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `planned=${r.planned}\nwhy=${one(r.why)}\nwhat=${one(u.what)}\nkind=${one(u.kind)}\ntheme=${one(u.theme)}\nat=${one(u.at)}\nfallback=${one(u.fallback)}\nday=${one(u.day)}\n`);
  }
  if (args.includes('--check') && !r.planned) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
