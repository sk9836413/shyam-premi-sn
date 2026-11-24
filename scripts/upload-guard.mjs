#!/usr/bin/env node
// Idempotent uploads: one video per slot and day, however many runs reach the upload step at once.
//
//   node scripts/upload-guard.mjs claim --day 2026-11-08 --slot status --slug 2026-11-08-status-diwali
//   node scripts/upload-guard.mjs release --day ... --slot ... --slug ... [--reason "upload failed"]
//
// Why: on 7 Nov 2026 the 18:43 IST evening schedule run and the 18:46 IST evening dispatch ran side by side; both
// status jobs read log.md before either had recorded the Diwali status Short, so it went to YouTube (cxLIaA38kKE,
// bUAZevyVvHE) and to the Facebook Page twice. Duplicates read as spam and the Diwali status got 21 + 9 views.
//
// claim  (run right before the upload) fetches origin/main and answers go=false when
//        - automation/log.md already has "<day> | <slot> |" (another run published the slot), or
//        - automation/published.md has "- <slug> | youtube: https…", or
//        - another run holds an unexpired claim (2 h) on the same day+slot or slug that it has not released, or
//        - the DAILY CAP, counted per kind (owner, 13 Nov 2026): at most DAILY_CAP Shorts (every slot but `long` and
//          `owner`: status, eve, statusday, morning, evening, noon, kalyug, kailash, pov, facts, movie parts; 8 from
//          25 Nov 2026, owner 24 Nov 2026 "8 ka limit rakho daily"; 3 on earlier dates) and, separately, 1 long video per IST date
//          (log.md / published.md lines of that date, plus live claims of other slots of the same kind). The long
//          video never counts against the Shorts cap; neither does slot `owner` (the owner's own darshan footage, 1 a day,
//          OWNER_CAP, scripts/owner-footage.mjs). The skip is logged as "- <slug> | skipped: daily cap ..." in
//          published.md. EXTRA_UPLOAD_DAY=<date> (repo variable, the owner's one-day exception) adds 1 to that date's
//          Shorts cap; EXTRA_UPLOADS="<date>:<n>,..." (one-off, guard only; see extraUploads) adds n more.
//        Otherwise it appends "- <slug> | claim: <day> <slot> by run <id> at <ISO>" to published.md on top of
//        origin/main (git plumbing, the job's checkout is not touched) and pushes. A rejected push means someone else pushed first: fetch, check
//        again, retry (git's fast-forward rule makes the claim atomic, so only one run can win).
//        Git trouble -> go=true with a warning: youtube.mjs and meta.mjs still look for the same title on the channel
//        and the Page in the last 36 h before uploading (the second lock).
// release (after a failed upload) appends "- <slug> | claim released: <day> <slot> by run <id> (<reason>)" so the
//        next run may retry at once instead of waiting for the claim to expire.
// Prints one JSON line; with GITHUB_OUTPUT also writes go=true|false and reason=... . Exit code is always 0.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const CLAIM_TTL_MS = 2 * 3600e3;
// YouTube Shorts per IST date: 3 (owner, 9 Nov 2026) until 24 Nov 2026, 8 from DAILY_CAP_FROM (owner, 24 Nov 2026: "8 ka
// limit rakho daily"; scripts/day-plan.mjs CAP / CAP_FROM / CAP_BEFORE, the same numbers). A ceiling: the day plan
// fills it only with the Shorts that have their own day and switch (most days 4-5).
export const DAILY_CAP = 8;
export const DAILY_CAP_FROM = '2026-11-25';
export const DAILY_CAP_BEFORE = 3;
/** The plain Shorts cap of an IST date (no owner exception). */
export const dailyCap = (day) => (String(day) >= DAILY_CAP_FROM ? DAILY_CAP : DAILY_CAP_BEFORE);
// YouTube Data API (scripts/youtube.mjs): videos.insert has its own bucket of 100 calls a day for the Google project;
// every other call comes from the shared 10,000 units (~51-102 units a Short: thumbnail + playlist). The most this
// channel can upload in a day stays far under the bucket (test: DAILY_CAP + EXTRA_UPLOAD_DAY + long + owner).
export const UPLOAD_CALLS_PER_DAY = 100;
export const LONG_CAP = 1; // long videos per IST date, on top of the Shorts (owner, 13 Nov 2026; day-plan LONG_CAP)
// The owner's own darshan footage (owner, 20 Nov 2026: "daily upload me daal do"; scripts/owner-footage.mjs): ONE extra
// Short a day in slot `owner`, with its own cap, so it never takes one of the planned Shorts' places and they never
// take its place.
export const OWNER_CAP = 1;

/** Which cap a slot counts against: the 16:9 long video, the owner-footage Short, or a Short (every other vertical upload). */
export const kindOf = (slot) => (slot === 'long' ? 'long' : slot === 'owner' ? 'owner' : 'short');

const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Pure decision from the two files' text (unit-tested). */
export function decide({ log = '', pub = '', day, slot, slug, run, now = Date.now(), ttl = CLAIM_TTL_MS, cap = dailyCap(day), longCap = LONG_CAP, ownerCap = OWNER_CAP }) {
  if (new RegExp(`^${esc(day)} \\| ${esc(slot)} \\|`, 'm').test(log)) return { go: false, reason: `log.md already has ${day} | ${slot}` };
  if (new RegExp(`^- ${esc(slug)} \\| youtube: https?://`, 'm').test(pub)) return { go: false, reason: `published.md already has ${slug} on YouTube` };
  const claims = new Map(); // "<run>|<day> <slot>|<slug>" -> at
  for (const line of pub.split(/\r?\n/)) {
    const c = line.match(/^- (\S+) \| claim: (\S+) (\S+) by run (\S+) at (\S+)/);
    if (c) { claims.set(`${c[4]}|${c[2]} ${c[3]}|${c[1]}`, Date.parse(c[5])); continue; }
    const r = line.match(/^- (\S+) \| claim released: (\S+) (\S+) by run (\S+)/);
    if (r) claims.delete(`${r[4]}|${r[2]} ${r[3]}|${r[1]}`);
  }
  const done = dayUploads({ log, pub, day }); // slug -> slot
  for (const [k, at] of claims) {
    const [who, key, s] = k.split('|');
    if (who.split('.')[0] === String(run).split('.')[0]) continue; // our own claim (or an earlier attempt of this run)
    if (!(now - at < ttl)) continue;
    if (key === `${day} ${slot}` || s === slug) return { go: false, reason: `run ${who} claimed ${key} (${s}) at ${new Date(at).toISOString()}` };
    if (key.startsWith(`${day} `) && !withheld(pub).has(s)) done.set(s, key.slice(day.length + 1)); // another slot of the day, uploading right now
  }
  // Daily cap per kind (scripts/day-plan.mjs): at most `cap` Shorts and `longCap` long videos go public per IST date.
  const kind = kindOf(slot);
  const max = kind === 'long' ? longCap : kind === 'owner' ? ownerCap : cap;
  // (a Short's own slot never counts against it; a long video or owner Short already on YouTube under another slug does: 1 a day)
  for (const [s, sl] of done) if (s === slug || kindOf(sl) !== kind || (sl === slot && kind === 'short')) done.delete(s);
  if (done.size >= max) {
    const what = kind === 'long' ? 'long video' : kind === 'owner' ? 'owner-footage Short' : 'Short';
    return { go: false, cap: true, kind, max, reason: `daily cap: ${day} already has ${done.size} YouTube ${what}${done.size === 1 ? '' : 's'} (${[...done.values()].sort().join(', ')}); max ${max} ${what}${max === 1 ? '' : 's'} a day` };
  }
  return { go: true };
}

/** The day's YouTube uploads as slug -> slot: log.md lines "<day> | <slot> | <slug> |" and published.md lines
 *  "- <day>-<slot>-… | youtube: https…". A scheduled status Short or movie part counts on its public day, which its
 *  slug and log line carry. One slug is one upload (on a movie day the "morning" line repeats the movie part's slug). */
export function dayUploads({ log = '', pub = '', day }) {
  const up = new Map();
  for (const m of log.matchAll(new RegExp(`^${esc(day)} \\| (\\w+) \\| (\\S+)`, 'gm'))) if (!up.has(m[2])) up.set(m[2], m[1]);
  for (const m of pub.matchAll(new RegExp(`^- (${esc(day)}-([a-z]+)-\\S*) \\| youtube: https?://`, 'gm'))) if (!up.has(m[1])) up.set(m[1], m[2]);
  for (const s of withheld(pub)) up.delete(s);
  return up;
}

/** Slugs marked "- <slug> | withheld: ..." in published.md: uploaded but taken back before going public (kept private;
 *  15 Nov 2026, a Short that should have failed the pronunciation gate). They never count against the cap. */
export const withheld = (pub = '') => new Set([...String(pub).matchAll(/^- (\S+) \| withheld:/gm)].map((m) => m[1]));

/** The Shorts cap of a date: dailyCap(day), +1 on the owner's one-day exception (repo variable EXTRA_UPLOAD_DAY=YYYY-MM-DD,
 *  e.g. a big festival). The long video has its own cap (LONG_CAP) and is never affected. */
export const shortsCap = (day, extra = process.env.EXTRA_UPLOAD_DAY, uploads = process.env.EXTRA_UPLOADS) =>
  dailyCap(day) + (extra && extra.trim() === day ? 1 : 0) + extraUploads(day, uploads);

/** ONE-OFF owner exceptions beyond EXTRA_UPLOAD_DAY (repo variable EXTRA_UPLOADS = "YYYY-MM-DD:n[,YYYY-MM-DD:n]"; owner,
 *  15 Nov 2026: "Isi format me chath ka 4-5 video aaj live karo" = 4-5 Chhath facts Shorts on 15-16 Nov on top of the
 *  planned 3). Only this guard reads it (scripts/day-plan.mjs does not), so the day plan never grows by itself: the extra
 *  room is used only by the uploads dispatched for it. Malformed entries count 0; n is capped at 3. Clear it afterwards. */
export function extraUploads(day, uploads = process.env.EXTRA_UPLOADS) {
  let n = 0;
  for (const part of String(uploads || '').split(',')) {
    const m = part.trim().match(/^(\d{4}-\d{2}-\d{2}):([1-9])$/);
    if (m && m[1] === day) n += Math.min(3, Number(m[2]));
  }
  return n;
}

export const claimLine = ({ day, slot, slug, run, now = Date.now() }) => `- ${slug} | claim: ${day} ${slot} by run ${run} at ${new Date(now).toISOString()}`;

// ---------------------------------------------------------------- git

const git = (args, opts = {}) => {
  const r = spawnSync('git', args, { encoding: 'utf8', ...opts });
  if (r.status !== 0) throw new Error(`git ${args[0]}: ${(r.stderr || r.error?.message || '').trim().split('\n').pop()}`);
  return r.stdout;
};
const show = (file) => { try { return git(['show', `origin/main:${file}`]); } catch { return ''; } };
const pause = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const ID = { GIT_AUTHOR_NAME: 'shyam-premi-bot', GIT_COMMITTER_NAME: 'shyam-premi-bot',
  GIT_AUTHOR_EMAIL: '41898282+github-actions[bot]@users.noreply.github.com', GIT_COMMITTER_EMAIL: '41898282+github-actions[bot]@users.noreply.github.com' };

/** Appends a line to automation/published.md on origin/main with git plumbing (a temporary index, no checkout), so the
 *  job's working tree and its uncommitted story files stay untouched. The push only lands as a fast-forward of the
 *  main we just checked; otherwise fetch, re-check and try again. */
function pushLine(line, message, recheck) {
  const index = path.join(process.env.RUNNER_TEMP || os.tmpdir(), `guard-index-${process.pid}`);
  const env = { ...process.env, ...ID, GIT_INDEX_FILE: index };
  try {
    for (let i = 0; i < 6; i++) {
      git(['fetch', '-q', 'origin', 'main']);
      if (recheck) { const d = recheck(); if (!d.go) return d; }
      const base = git(['rev-parse', 'origin/main']).trim();
      const cur = show('automation/published.md');
      const blob = git(['hash-object', '-w', '--stdin'], { input: `${cur}${cur && !cur.endsWith('\n') ? '\n' : ''}${line}\n` }).trim();
      git(['read-tree', base], { env });
      git(['update-index', '--cacheinfo', `100644,${blob},automation/published.md`], { env });
      const tree = git(['write-tree'], { env }).trim();
      const commit = git(['commit-tree', tree, '-p', base, '-m', message], { env }).trim();
      if (spawnSync('git', ['push', '-q', 'origin', `${commit}:refs/heads/main`], { encoding: 'utf8' }).status === 0) return { go: true, pushed: commit };
      pause(2000 + i * 3000);
    }
    throw new Error('push rejected 6 times');
  } finally {
    fs.rmSync(index, { force: true });
  }
}

function out(o) {
  console.log(JSON.stringify(o));
  if (process.env.GITHUB_OUTPUT && 'go' in o) fs.appendFileSync(process.env.GITHUB_OUTPUT, `go=${o.go}\nreason=${String(o.reason || '').replace(/\n/g, ' ')}\n`);
  if (o.go === false && process.env.GITHUB_ACTIONS) console.log(`::notice::Upload skipped: ${o.reason}`);
  if (o.warning && process.env.GITHUB_ACTIONS) console.log(`::warning::${o.warning}`);
}

function main() {
  const args = process.argv.slice(2);
  const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
  const [cmd] = args;
  const day = opt('--day'), slot = opt('--slot'), slug = opt('--slug');
  if (!['claim', 'release'].includes(cmd) || !day || !slot || !slug) throw new Error('Usage: upload-guard.mjs claim|release --day YYYY-MM-DD --slot <slot> --slug <slug> [--reason ...]');
  const run = process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_RUN_ID}.${process.env.GITHUB_RUN_ATTEMPT || 1}` : `local-${process.pid}`;
  if (cmd === 'release') {
    try {
      pushLine(`- ${slug} | claim released: ${day} ${slot} by run ${run} (${String(opt('--reason') || 'upload failed').replace(/[|\n]/g, ' ').slice(0, 120)})`, `Release ${day} ${slot}`);
      return { status: 'released', slug };
    } catch (e) {
      return { status: 'error', error: e.message };
    }
  }
  const cap = shortsCap(day);
  const check = () => decide({ log: show('automation/log.md'), pub: show('automation/published.md'), day, slot, slug, run, cap });
  try {
    const r = pushLine(claimLine({ day, slot, slug, run }), `Claim ${day} ${slot}: ${slug}`, check);
    if (r.go) return { go: true, claimed: `${day} ${slot}`, slug, run };
    // Over the daily cap: skip this upload and say so in published.md (once per slug and day).
    if (r.cap && !show('automation/published.md').includes(`- ${slug} | skipped: daily cap`)) {
      try { pushLine(`- ${slug} | skipped: daily cap ${r.max} ${r.kind === 'long' ? 'long' : r.kind === 'owner' ? 'owner-footage' : 'Shorts'} (${day} ${slot}; ${r.reason.replace(/^daily cap: /, '')}) by run ${run}`, `Skip ${day} ${slot}: daily cap`); } catch (e) { r.warning = `could not log the skip: ${e.message}`; }
    }
    return { ...r, slug };
  } catch (e) {
    return { go: true, slug, warning: `upload guard could not claim ${day} ${slot} (${e.message}); relying on the YouTube/Meta duplicate check` };
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { out(main()); } catch (e) { out({ go: true, warning: `upload guard: ${e.message}` }); }
}
