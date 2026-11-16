// Weekly character-series Shorts in scripts/day-plan.mjs: "Kailash Parivar" (STORY.md section 9) and "Shri Krishna kehte
// hain" / Shyam POV (STORY.md section 10). Both are made the evening before by their own workflow (kailash.yml,
// krishna-pov.yml), go public at 08:00 IST and only run once the owner approved the pilot (the bank's "approved": true,
// like a movie series.json); the repo variable KAILASH=off / KRISHNA_POV=off pauses one.
//
// Days: their weekdays plus festival tie-in days (a bank idea whose festival falls on that date; at most ONE extra such
// day a week and never a big festival, which has no morning slot to give: its idea airs on the nearest series day inside
// the idea's window). Never on movie days (17-20 Nov 2026 keep the movie part) or on date-scoped override days
// (automation/chhath-2026.json: Chhath until 16 Nov).
// Under the 3-Shorts cap (owner, 16 Nov 2026: movie > festival status > day status > darshan > Kailash / POV > facts):
// a series Short ranks after the festival status Shorts, the morning day status Short and the evening temple darshan,
// before the facts Short, Kalyug ke Bhagwan and the Dadi-Chhotu noon Short. When the cap would still drop it, it takes
// the place of the festival-morning temple darshan (the second darshan of a festival day; the evening darshan stays),
// else of that day's facts Short. It never displaces the day status Short (incl. the Khatu Gyaras status), a festival
// status Short, the evening temple darshan or a movie part. If its episode is not in log.md by the morning run (QA gate
// failed), the morning Short runs after all (morningFallback; only when it replaced a morning Short).
import fs from 'node:fs';
import path from 'node:path';

// priority 3.6 / 3.7: after the evening darshan (3), before facts (3.8; scripts/day-plan.mjs PRIORITY)
export const SERIES = [
  { slot: 'kailash', name: 'Kailash Parivar', days: [1, 4, 6], at: '08:00', priority: 3.6, order: 2.5, bank: 'automation/kailash-episodes.json', items: 'episodes', env: 'KAILASH' },
  { slot: 'pov', name: 'Shri Krishna kehte hain (Shyam POV)', days: [2, 5], at: '08:00', priority: 3.7, order: 2.6, bank: 'automation/krishna-pov-topics.json', items: 'topics', env: 'KRISHNA_POV' },
];
export const seriesOf = (slot) => SERIES.find((x) => x.slot === slot);

const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } };
const wdOf = (d) => new Date(`${d}T12:00:00Z`).getUTCDay();
const weekOf = (d) => { const t = Date.parse(`${d}T12:00:00Z`); return new Date(t - ((new Date(t).getUTCDay() + 6) % 7) * 864e5).toISOString().slice(0, 10); };

/** A series' idea bank (episodes / topics under `items`), or an empty one. */
export function loadBank(cfg, root = '.') {
  try {
    const b = JSON.parse(read(path.join(root, cfg.bank)));
    return { ...b, episodes: b[cfg.items] || [] };
  } catch { return { approved: false, episodes: [] }; }
}

/** One series' plan inputs: { on, logged: Set(dates), tieIns: Map(date -> idea id) }. */
export function seriesInputs(cfg, root = '.', festivalsList = [], log = '', env = process.env) {
  const bank = loadBank(cfg, root);
  const byKey = new Map(festivalsList.map((f) => [f.key, f.date]));
  const tierOf = new Map(festivalsList.map((f) => [f.date, f.tier]));
  const tieIns = new Map();
  for (const e of [...bank.episodes].sort((x, y) => (y.weight || 1) - (x.weight || 1))) {
    const d = e.kind === 'festival' ? byKey.get(e.festival) : null;
    if (d && !tieIns.has(d)) tieIns.set(d, e.id);
  }
  const weightOf = (id) => bank.episodes.find((e) => e.id === id)?.weight || 1;
  const extra = new Map(); // week -> date
  for (const [d, id] of [...tieIns].sort((x, y) => weightOf(y[1]) - weightOf(x[1]) || x[0].localeCompare(y[0]))) {
    if (cfg.days.includes(wdOf(d))) continue;
    // another series' weekday stays that series' day (Kailash never takes a Tuesday/Friday, POV never a Mon/Thu/Sat)
    if (SERIES.some((x) => x !== cfg && x.days.includes(wdOf(d)))) { tieIns.delete(d); continue; }
    if (tierOf.get(d) === 'big') { tieIns.delete(d); continue; }
    if (extra.has(weekOf(d))) tieIns.delete(d); else extra.set(weekOf(d), d);
  }
  return {
    on: bank.approved === true && env[cfg.env] !== 'off',
    logged: new Set([...log.matchAll(new RegExp(`^(\\d{4}-\\d{2}-\\d{2}) \\| ${cfg.slot} \\| `, 'gm'))].map((m) => m[1])),
    tieIns,
  };
}

/** Every series' inputs under inputs.series[slot] (spread into scripts/day-plan.mjs loadInputs). */
export function allSeriesInputs(root = '.', festivalsList = [], log = '', env = process.env) {
  return { series: Object.fromEntries(SERIES.map((cfg) => [cfg.slot, seriesInputs(cfg, root, festivalsList, log, env)])) };
}

/** The series candidate of a date, or null. si = inputs.series[slot]; ctx: { wd, movie, override } */
export function candidate(cfg, date, si = {}, ctx = {}) {
  if (si.logged?.has(date)) return { slot: cfg.slot, logged: true, what: `${cfg.name} episode (${cfg.at}, made the evening before)` };
  if (!si.on || ctx.movie || ctx.override) return null;
  const tie = si.tieIns?.get(date);
  if (!cfg.days.includes(ctx.wd) && !tie) return null;
  return { slot: cfg.slot, ...(tie ? { tieIn: tie } : { ownDay: true }), what: `${cfg.name} episode (${cfg.at}, made the evening before${tie ? `; festival tie-in ${tie}` : ''})` };
}

/** When the series candidate would be dropped by the cap, it replaces the festival-morning temple darshan (a festival
 *  tie-in day) or the day's facts Short, never the day status Short. Mutates and returns cands. */
export function makeRoom(slot, cands, cap, rank) {
  const k = cands.find((c) => c.slot === slot);
  if (!k) return cands;
  const kept = [...cands].map((c, i) => ({ c, i })).sort((a, b) => rank(a.c) - rank(b.c) || a.i - b.i).slice(0, cap).map((x) => x.c);
  if (kept.includes(k)) return cands;
  // the weakest kept Short it may take: the festival-morning temple darshan, else the facts Short (never the day
  // status, a festival status or the evening darshan; owner, 16 Nov 2026)
  const order = [
    (c) => c.slot === 'morning' && c.kind === 'temple',
    (c) => c.slot === 'facts' && !c.logged,
  ];
  for (const test of order) {
    const m = cands.findIndex((c) => kept.includes(c) && test(c));
    if (m < 0) continue;
    k.replaces = `${cands[m].slot === 'facts' ? 'facts' : `${cands[m].kind} morning`} Short`;
    k.rank = rank(cands[m]); // the replaced Short's own rank
    cands.splice(m, 1);
    break;
  }
  return cands;
}

/** day-plan.mjs hook: adds every series candidate of the date to cands (and makes room). */
export function addSeries(date, inputs, ctx, cands, cap, rank) {
  for (const cfg of SERIES) {
    const c = candidate(cfg, date, inputs.series?.[cfg.slot], ctx);
    if (c) { cands.push(c); makeRoom(cfg.slot, cands, cap, rank); }
  }
  return cands;
}

/** day-plan.mjs isPlanned hook: the morning slot runs after all when a series episode that replaced it is not logged. */
export function morningFallback(plan, inputs = {}) {
  return SERIES.some((cfg) => {
    const k = plan.uploads.find((u) => u.slot === cfg.slot);
    return Boolean(k?.replaces && !inputs.series?.[cfg.slot]?.logged?.has(plan.date));
  });
}

/** Times / priorities / time order to merge into day-plan.mjs AT, PRIORITY and ORDER. */
export const seriesTables = () => ({
  at: Object.fromEntries(SERIES.map((c) => [c.slot, c.at])),
  priority: Object.fromEntries(SERIES.map((c) => [c.slot, c.priority])),
  order: Object.fromEntries(SERIES.map((c) => [c.slot, c.order])),
});

/** Which bank idea a release date gets: a festival idea whose window holds the date (bigger `weight` first, then the
 *  date's own tie-in, then the one whose window ends first), else the next evergreen idea (bank order) not made yet. */
export function pickEpisode(date, bank, done = new Set(), tieIn = '') {
  const eps = (bank.episodes || []).filter((e) => !done.has(e.id) && !e.pilot);
  const fest = eps.filter((e) => e.kind === 'festival' && (e.id === tieIn || (e.window && date >= e.window[0] && date <= e.window[1])))
    .sort((a, b) => (b.weight || 1) - (a.weight || 1) || (b.id === tieIn) - (a.id === tieIn) || a.window[1].localeCompare(b.window[1]));
  return fest[0] || eps.find((e) => e.kind === 'evergreen') || null;
}

/** Bank ids already used: "<date> | <slot> | <slug>" lines in log.md and the series' story file names. */
export function usedIds(slot, log = '', files = [], bank = { episodes: [] }) {
  const ids = (bank.episodes || []).map((e) => e.id).sort((a, b) => b.length - a.length);
  const out = new Set();
  const text = [...log.matchAll(new RegExp(`^\\d{4}-\\d{2}-\\d{2} \\| ${slot} \\| (\\S+)`, 'gm'))].map((m) => m[1]).concat(files);
  for (const t of text) {
    const id = ids.find((x) => t.includes(x));
    if (id) out.add(id);
  }
  return out;
}
