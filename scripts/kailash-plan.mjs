// "Kailash Parivar" schedule helpers (STORY.md section 9): the Kailash entry of scripts/series-plan.mjs (Mon/Thu/Sat +
// at most one festival tie-in day a week, 08:00 IST, only after the owner approved the pilot; under the 3-Shorts cap it
// replaces the weekday day-status morning Short, never a festival status, the evening darshan, a dawn bhajan or a movie
// part). Used by scripts/kailash-due.mjs and the tests; scripts/day-plan.mjs uses series-plan.mjs directly.
import * as S from './series-plan.mjs';

const CFG = S.seriesOf('kailash');
export const KAILASH_DAYS = CFG.days;
export const KAILASH_AT = CFG.at;
export const KAILASH_PRIORITY = CFG.priority;
export const KAILASH_ORDER = CFG.order;
export const BANK_FILE = CFG.bank;

export const loadBank = (root = '.') => S.loadBank(CFG, root);

/** { kailash, kailashLogged, kailashTieIns } (the older names of seriesInputs' on / logged / tieIns). */
export function kailashInputs(root = '.', festivalsList = [], log = '', env = process.env) {
  const x = S.seriesInputs(CFG, root, festivalsList, log, env);
  return { kailash: x.on, kailashLogged: x.logged, kailashTieIns: x.tieIns };
}

export const kailashCandidate = (date, inputs = {}, ctx = {}) =>
  S.candidate(CFG, date, { on: inputs.kailash, logged: inputs.kailashLogged, tieIns: inputs.kailashTieIns }, ctx);
export const makeRoomForKailash = (cands, cap, rank) => S.makeRoom('kailash', cands, cap, rank);
export const pickEpisode = S.pickEpisode;
export const usedIds = (log = '', files = [], bank = { episodes: [] }) => S.usedIds('kailash', log, files, bank);
