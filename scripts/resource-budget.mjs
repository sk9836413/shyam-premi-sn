#!/usr/bin/env node
// Resource guards for the 8-Shorts day (owner, 24 Nov 2026: "8 ka limit rakho daily"; scripts/day-plan.mjs CAP). The
// cap is a ceiling; what really limits a day is the free GPU and the free FLUX neurons, so more Shorts must fall back
// (zoompan instead of Wan clips, Kaggle FLUX / the picture bank instead of Workers AI) before they starve the Shorts
// that matter most: the festival status Shorts and the 19:00 evening darshan.
//
// 1. Workers AI FLUX neurons (Cloudflare free tier: 10,000 a day, reset 00:00 UTC = 05:30 IST; ~326 per FLUX.1-schnell
//    1024 px image at 4 steps as measured on 1 Nov 2026, animate/frames.mjs NEURONS_PER_IMAGE; the older ~170 figure is
//    an under-estimate, so the budget uses 326). workersAiAllowance(slot) = how many Workers AI images ONE run of a
//    slot may make. The evening darshan and the festival status Shorts are never limited. Until the neuron day's
//    evening darshan is in automation/log.md (it renders at 10:43 IST; the 18:46 IST run is its retry) only the
//    morning-window consumers get Workers AI, each with a fixed allowance (BEFORE_EVENING: the festival-morning darshan
//    and the Wednesday Dadi-Chhotu never fall on the same day), and the evening's EVENING_RESERVE_IMAGES stay free
//    (test: the sum fits in IMAGES_PER_DAY). The Kaggle-first consumers (facts / Ramayan, the long video, the loop)
//    get no Workers AI before that: Kaggle FLUX, else the picture bank. Afterwards every slot keeps a per-run ceiling
//    (SLOT_IMAGES). animate/frames.mjs applies it and, when it held images back, writes WORKERS_AI_MARKER next to the
//    images so story/render-story.mjs / story/render-long.mjs do not make them with Workers AI after all;
//    scripts/veo-kit.mjs asks for slot `veo`.
// 2. Kaggle GPU (~30 h a week on the account, reset Sat 05:30 IST, 2 GPU sessions at a time): the evening darshan and
//    the status Shorts keep their fixed `quota --min 3`; the character series gate (story/kalyug.py gate, shared by
//    Kailash / POV) keeps the daily Shorts' reserve (DAILY_RESERVE_H a day + 1 h until the reset). The LOWER-priority
//    animations that have a zoompan fallback (the festival-morning darshan, the facts / Ramayan clips) now also keep that
//    reserve PLUS the Kailash / POV episodes still planned before the reset (EPISODE_H each; they have no fallback):
//      node scripts/resource-budget.mjs gpu --quota quota.json --min 5    exit 0 = animate, 2 = zoompan (prints why)
// 3. YouTube: videos.insert has its own bucket (scripts/upload-guard.mjs UPLOAD_CALLS_PER_DAY = 100 a project); 8
//    Shorts + 1 long + 1 owner Short + retries stay far under it; thumbnails / playlists ~51-102 units a Short of the
//    shared 10,000 (scripts/youtube.mjs). GitHub Actions: public repo, standard runners are free. Facebook: Reels 90 min
//    apart (scripts/fb.mjs; 07:00-23:00 holds 11), Instagram's 50 API posts a day are far away.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const NEURONS_PER_DAY = 10000;
export const NEURONS_PER_IMAGE = 326;
export const IMAGES_PER_DAY = Math.floor(NEURONS_PER_DAY / NEURONS_PER_IMAGE); // 30
// The 19:00 evening darshan: 4-6 scenes + a retry's re-made pictures.
export const EVENING_RESERVE_IMAGES = 10;
// A festival status base spec (cached per festival day; the status job runs after the evening story job).
export const STATUS_IMAGES = 6;
// Never limited: priority 1 (festival status) and 3 (the evening darshan).
export const UNLIMITED = ['evening', 'status'];
// Workers AI images per run before the day's evening darshan is logged (the morning window: festival-morning darshan
// 09:13 IST, Dadi-Chhotu noon 10:13 IST (Wednesdays of normal days, so never with the festival-morning darshan), the
// photo topup, the Veo kit). Every other slot: 0 until then.
export const BEFORE_EVENING = { morning: 6, noon: 6, photos: 2, veo: 3 };
// Per-run ceiling once the evening darshan is logged (a run never needs more; a broken spec cannot burn the day).
export const SLOT_IMAGES = { morning: 8, noon: 6, photos: 2, veo: 3, facts: 6, long: 8, loop: 4 };
export const DEFAULT_IMAGES = 4;
// scripts/photos.mjs topup: picture-bank FLUX pictures through the media Worker directly (its own limit: 2 a day).
export const PHOTO_TOPUP_IMAGES = 2;
export const WORKERS_AI_MARKER = '.workers-ai-budget.json';

/** The Workers AI neuron day of a moment: the UTC date (the free allocation resets 00:00 UTC = 05:30 IST). */
export const neuronDay = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);

/** Workers AI images one run of `slot` may make now: { max, why, day, eveningDone }. log = automation/log.md text. */
export function workersAiAllowance(slot, { log = '', now = Date.now() } = {}) {
  const day = neuronDay(now);
  if (UNLIMITED.includes(slot)) return { max: Infinity, day, why: `${slot}: first claim on the day's neurons` };
  const eveningDone = new RegExp(`^${day} \\| evening \\|`, 'm').test(String(log));
  if (!eveningDone) {
    const max = BEFORE_EVENING[slot] ?? 0;
    return { max, day, eveningDone, why: `${day} evening darshan not made yet: ${max} Workers AI image(s) for ${slot} (${EVENING_RESERVE_IMAGES} kept for the evening)` };
  }
  const max = SLOT_IMAGES[slot] ?? DEFAULT_IMAGES;
  return { max, day, eveningDone, why: `${day} evening darshan made: up to ${max} Workers AI image(s) for ${slot}` };
}

/** Marks a work dir: images were held back from Workers AI today (the renderers then use the bank / photo stand-in). */
export function writeWorkersAiMarker(dir, info = {}, now = Date.now()) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, WORKERS_AI_MARKER), `${JSON.stringify({ day: neuronDay(now), ...info })}\n`);
}

/** Is Workers AI held back for this image dir today? (a marker of an earlier neuron day does not count) */
export function workersAiHeld(dir, now = Date.now()) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(dir, WORKERS_AI_MARKER), 'utf8'));
    return j.day === neuronDay(now);
  } catch { return false; }
}

// ---------------------------------------------------------------- Kaggle GPU

export const DAILY_RESERVE_H = 2.4; // story/kalyug.py cmd_gate: 2.4 h a day + 1 h for the daily Shorts until the reset
export const RESERVE_BASE_H = 1.0;
export const EPISODE_H = 1.25; // one Kailash / POV session (max_minutes 75 incl. queue; ~40-60 GPU-min measured)
export const SERIES_KEEP = ['kailash', 'pov']; // approved series above the facts Short, no zoompan fallback

/** Whole days until the weekly GPU reset (at least 1), as story/kalyug.py counts them. */
export function daysToReset(refreshAt, now = Date.now()) {
  const t = Date.parse(refreshAt || '');
  return Number.isFinite(t) ? Math.max(1, Math.ceil((t - now) / 864e5)) : 7;
}

/** GPU hours a lower-priority animation needs left before it may start: { need, ok, why }. */
export function gpuNeed({ left = 0, refreshAt = '', now = Date.now(), min = 0, episodes = 0 } = {}) {
  const days = daysToReset(refreshAt, now);
  const reserve = DAILY_RESERVE_H * days + RESERVE_BASE_H + EPISODE_H * episodes;
  const need = Math.round(Math.max(min, reserve) * 100) / 100;
  const ok = Number(left) >= need;
  return { need, ok, left: Number(left), days, episodes, why: `${left} GPU h left; needs ${need} (daily Shorts ${DAILY_RESERVE_H} h x ${days} d + ${RESERVE_BASE_H} h${episodes ? ` + ${episodes} Kailash/POV episode(s) x ${EPISODE_H} h` : ''}, min ${min})` };
}

/** Kailash / POV episodes planned from tomorrow (IST) up to the reset date (scripts/day-plan.mjs). */
export async function seriesBeforeReset(refreshAt, now = Date.now(), root = '.') {
  const { addDays, loadInputs, planDay } = await import('./day-plan.mjs');
  const inputs = loadInputs(root);
  const today = new Date(now + 5.5 * 3600e3).toISOString().slice(0, 10);
  const end = new Date(Date.parse(refreshAt || '') + 5.5 * 3600e3 || now + 7 * 864e5).toISOString().slice(0, 10);
  let n = 0;
  for (let d = addDays(today, 1); d <= end && d <= addDays(today, 7); d = addDays(d, 1)) {
    // (an episode already in log.md has had its GPU session)
    n += planDay(d, inputs).uploads.filter((u) => SERIES_KEEP.includes(u.slot) && !inputs.series?.[u.slot]?.logged?.has(d)).length;
  }
  return n;
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
  if (args[0] === 'gpu') {
    let q = {};
    try { q = JSON.parse(fs.readFileSync(opt('--quota'), 'utf8')); } catch { /* unknown */ }
    const episodes = await seriesBeforeReset(q.refreshAt).catch(() => 0);
    const r = gpuNeed({ left: q.left || 0, refreshAt: q.refreshAt, min: Number(opt('--min', 0)), episodes });
    console.log(r.why);
    process.exit(r.ok ? 0 : 2);
  }
  if (args[0] === 'neurons') {
    let log = '';
    try { log = fs.readFileSync(opt('--log', 'automation/log.md'), 'utf8'); } catch { /* none */ }
    console.log(JSON.stringify(workersAiAllowance(opt('--slot', 'morning'), { log })));
    return;
  }
  throw new Error('Usage: resource-budget.mjs gpu --quota quota.json [--min 5] | neurons --slot <slot>');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
