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
//        - the DAILY CAP: the day already has 3 YouTube uploads (log.md / published.md lines of that IST date, plus live
//          claims of other slots); the skip is logged as "- <slug> | skipped: daily cap 3 (...)" in published.md.
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
export const DAILY_CAP = 3; // YouTube uploads per IST date (owner, 9 Nov 2026; scripts/day-plan.mjs)

const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Pure decision from the two files' text (unit-tested). */
export function decide({ log = '', pub = '', day, slot, slug, run, now = Date.now(), ttl = CLAIM_TTL_MS, cap = DAILY_CAP }) {
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
    if (key.startsWith(`${day} `)) done.set(s, key.slice(day.length + 1)); // another slot of the day, uploading right now
  }
  // Daily cap (owner, 9 Nov 2026; scripts/day-plan.mjs): at most `cap` YouTube uploads go public per IST date.
  for (const [s, sl] of done) if (s === slug || sl === slot) done.delete(s);
  if (done.size >= cap) {
    return { go: false, cap: true, reason: `daily cap: ${day} already has ${done.size} YouTube uploads (${[...done.values()].sort().join(', ')}); max ${cap} a day` };
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
  return up;
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
  // Owner's one-day exception (repo variable EXTRA_UPLOAD_DAY=YYYY-MM-DD, e.g. a big festival): one extra upload that day only.
  const cap = process.env.EXTRA_UPLOAD_DAY && process.env.EXTRA_UPLOAD_DAY.trim() === day ? DAILY_CAP + 1 : DAILY_CAP;
  const check = () => decide({ log: show('automation/log.md'), pub: show('automation/published.md'), day, slot, slug, run, cap });
  try {
    const r = pushLine(claimLine({ day, slot, slug, run }), `Claim ${day} ${slot}: ${slug}`, check);
    if (r.go) return { go: true, claimed: `${day} ${slot}`, slug, run };
    // Over the daily cap: skip this upload and say so in published.md (once per slug and day).
    if (r.cap && !show('automation/published.md').includes(`- ${slug} | skipped: daily cap`)) {
      try { pushLine(`- ${slug} | skipped: daily cap ${DAILY_CAP} (${day} ${slot}; ${r.reason.replace(/^daily cap: /, '')}) by run ${run}`, `Skip ${day} ${slot}: daily cap`); } catch (e) { r.warning = `could not log the skip: ${e.message}`; }
    }
    return { ...r, slug };
  } catch (e) {
    return { go: true, slug, warning: `upload guard could not claim ${day} ${slot} (${e.message}); relying on the YouTube/Meta duplicate check` };
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { out(main()); } catch (e) { out({ go: true, warning: `upload guard: ${e.message}` }); }
}
