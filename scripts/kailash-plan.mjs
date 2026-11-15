// "Kailash Parivar" schedule helpers (STORY.md section 9), used by scripts/day-plan.mjs and scripts/kailash-due.mjs.
//
// Days: Monday (Somvar), Thursday and Saturday, plus festival tie-in days (a bank episode whose festival falls on that
// date), at KAILASH_AT 08:00 IST. Never on movie days (17-20 Nov 2026 keep the movie part) or on days of a date-scoped
// override (automation/chhath-2026.json: Chhath until 16 Nov). Only when the repo variable KAILASH=on AND the owner
// approved the pilot (automation/kailash-episodes.json "approved": true, like a movie series.json).
// Under the 3-Shorts cap (owner: "kailash replaces the weakest slot"): kailash ranks after the festival status Shorts,
// the morning day status Short and the evening temple darshan, before Kalyug ke Bhagwan and the Dadi-Chhotu noon Short;
// when the cap would still drop it, it takes the place of the weekday day-status morning Short (the old plain katha
// slot), or on a festival tie-in day of the festival-morning temple darshan. It never displaces a festival status
// Short, the evening temple darshan, a bhajan (the dawn window 05:30-06:30) or a movie part.
import fs from 'node:fs';
import path from 'node:path';

export const KAILASH_DAYS = [1, 4, 6]; // Mon, Thu, Sat (getUTCDay of the date at noon)
export const KAILASH_AT = '08:00';
export const KAILASH_PRIORITY = 3.5; // between evening (3) and kalyug (4)
export const KAILASH_ORDER = 2.5; // time order: after kalyug (08:00), before statusday (08:30)
export const BANK_FILE = 'automation/kailash-episodes.json';

const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } };

/** The episode bank (or an empty one). */
export function loadBank(root = '.') {
  try { return JSON.parse(read(path.join(root, BANK_FILE))); } catch { return { approved: false, episodes: [] }; }
}

/** Inputs for the plan: on (KAILASH=on and the pilot approved), logged dates, festival tie-in dates. */
export function kailashInputs(root = '.', festivalsList = [], log = '', env = process.env) {
  const bank = loadBank(root);
  const byKey = new Map(festivalsList.map((f) => [f.key, f.date]));
  const tieIns = new Map(); // date -> episode id (the festival's own date)
  for (const e of bank.episodes || []) {
    const d = e.kind === 'festival' ? byKey.get(e.festival) : null;
    if (d && !tieIns.has(d)) tieIns.set(d, e.id);
  }
  return {
    kailash: env.KAILASH === 'on' && bank.approved === true,
    kailashLogged: new Set([...log.matchAll(/^(\d{4}-\d{2}-\d{2}) \| kailash \| /gm)].map((m) => m[1])),
    kailashTieIns: tieIns,
  };
}

/** The kailash candidate of a date, or null. ctx: { wd, movie, override (that date's override entry), fest } */
export function kailashCandidate(date, inputs = {}, ctx = {}) {
  const logged = inputs.kailashLogged?.has(date);
  if (logged) return { slot: 'kailash', logged: true, what: 'Kailash Parivar episode (08:00, made the evening before)' };
  if (!inputs.kailash || ctx.movie || ctx.override) return null;
  const tie = inputs.kailashTieIns?.get(date);
  if (!KAILASH_DAYS.includes(ctx.wd) && !tie) return null;
  return { slot: 'kailash', ...(tie ? { tieIn: tie } : {}), what: `Kailash Parivar episode (08:00, made the evening before${tie ? `; festival tie-in ${tie}` : ''})` };
}

/** Make room under the cap: when the kailash candidate would be dropped, it replaces the weekday day-status morning Short
 *  (or, on a festival tie-in day, the festival-morning temple darshan). Mutates and returns cands. */
export function makeRoomForKailash(cands, cap, rank) {
  const k = cands.find((c) => c.slot === 'kailash');
  if (!k) return cands;
  const kept = [...cands].map((c, i) => ({ c, i })).sort((a, b) => rank(a.c) - rank(b.c) || a.i - b.i).slice(0, cap).map((x) => x.c);
  if (kept.includes(k)) return cands;
  const m = cands.findIndex((c) => c.slot === 'morning' && ((c.kind === 'daystatus' && typeof c.theme === 'number') || (k.tieIn && c.kind === 'temple')));
  if (m >= 0) {
    k.replaces = `${cands[m].kind} morning Short`;
    k.rank = 2; // the morning Short's own rank
    cands.splice(m, 1);
  }
  return cands;
}

/** Which bank idea a release date gets: a festival idea whose window holds the date (the tie-in first), else the next
 *  evergreen idea (bank order) not made yet. done = ids already used (log.md slugs / story files). */
export function pickEpisode(date, bank, done = new Set()) {
  const eps = (bank.episodes || []).filter((e) => !done.has(e.id) && !e.pilot);
  const fest = eps.filter((e) => e.kind === 'festival' && e.window && date >= e.window[0] && date <= e.window[1])
    .sort((a, b) => a.window[1].localeCompare(b.window[1]));
  return fest[0] || eps.find((e) => e.kind === 'evergreen') || null;
}

/** Bank ids already used: "<date> | kailash | <date>-kailash-<id>" lines in log.md and story/kailash/<date>-<id>.json. */
export function usedIds(log = '', files = [], bank = { episodes: [] }) {
  const ids = (bank.episodes || []).map((e) => e.id).sort((a, b) => b.length - a.length);
  const out = new Set();
  const text = [...log.matchAll(/^\d{4}-\d{2}-\d{2} \| kailash \| (\S+)/gm)].map((m) => m[1]).concat(files);
  for (const t of text) {
    const id = ids.find((x) => t.includes(x));
    if (id) out.add(id);
  }
  return out;
}
