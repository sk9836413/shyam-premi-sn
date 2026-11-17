#!/usr/bin/env node
// Weekly before/after check of the "max 3 uploads a day" change (owner, 9 Nov 2026) -> automation/growth.md.
//
//   node scripts/growth-compare.mjs --date 2026-11-16            Mondays (IST): the comparison + a subscriber snapshot
//   node scripts/growth-compare.mjs --date 2026-11-09 --snapshot  only record a subscriber snapshot (the baseline)
//
// Compares the average views per Short (YouTube Data API, the same credentials as scripts/youtube.mjs) of the 7 days
// before the change (2-8 Nov 2026, 3-6 uploads a day) with the first 7 days after it (10-16 Nov) and with the last 7
// days, plus the subscriber change since the baseline snapshot. The Data API only has lifetime views, so younger
// videos have had less time: the table also shows views per day of age, the fairer number while the windows differ
// in age. Shorts = videos up to 180 s; the date is the IST day the video went public.
//
//   node scripts/growth-compare.mjs --date 2026-11-25 --facts-review   FACTS REVIEW (owner, 16 Nov 2026: facts Shorts got
//        1-7 views; max 2 a week until 25 Nov, then compare): the median views of the public facts Shorts from 15 Nov
//        that are at least 2 days old -> automation/facts-review.json { date, n, median, verdict } (median under 20 =
//        "off": scripts/day-plan.mjs stops planning facts from that date; else "on": the weekly limit ends) and a
//        "## Facts review" section in growth.md. Exit 1 without a verdict (no facts Short old enough yet).
// growth.md keeps every "## " section this script does not write itself (e.g. "## Facts review", "## Character series").
// Each week also gets "### Retention (Shorts feed)" (scripts/retention.mjs, YouTube Analytics audience retention): per
// format the share of viewers kept at 0 s and 3 s, the drop in the first 3 s, the average % viewed and the traffic sources.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { radarFiles, workingLines } from './viral-radar.mjs';
import { FACTS_MEDIAN_MIN, FACTS_REVIEW_FILE } from './day-plan.mjs';
import { audit as retentionAudit, retentionSection } from './retention.mjs';

const FILE = 'automation/growth.md';
const CHANGE = '2026-11-10';
const BEFORE = ['2026-11-02', '2026-11-08'];
const AFTER = ['2026-11-10', '2026-11-16'];

const args = process.argv.slice(2);
const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const DATE = opt('--date') || new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
const addDays = (d, n) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const istDay = (iso) => new Date(Date.parse(iso) + 5.5 * 3600e3).toISOString().slice(0, 10);
const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } };

// Credentials: same rules as scripts/youtube.mjs / trend-signals.mjs.
const KEYS = ['YT_CLIENT_ID', 'YT_CLIENT_SECRET', 'YT_REFRESH_TOKEN'];
function loadEnv() {
  const envFile = path.join(os.homedir(), '.shyampremisk', 'youtube.env');
  const file = Object.fromEntries(read(envFile).split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]));
  const env = { ...file, ...Object.fromEntries(KEYS.filter((k) => process.env[k]).map((k) => [k, process.env[k]])) };
  if (KEYS.every((k) => process.env[`SHYAM_${k}`])) KEYS.forEach((k) => { env[k] = process.env[`SHYAM_${k}`]; });
  return env;
}
async function api(url, token) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) throw new Error(`${body.error?.message || res.statusText} (HTTP ${res.status})`);
  return body;
}
const seconds = (iso = '') => { const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/) || []; return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0); };

async function channel() {
  const env = loadEnv();
  if (!KEYS.every((k) => env[k])) throw new Error('no YouTube credentials (YT_* secrets or ~/.shyampremisk/youtube.env)');
  const tok = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', signal: AbortSignal.timeout(20000),
    body: new URLSearchParams({ client_id: env.YT_CLIENT_ID, client_secret: env.YT_CLIENT_SECRET, refresh_token: env.YT_REFRESH_TOKEN, grant_type: 'refresh_token' }),
  }).then((r) => r.json());
  if (!tok.access_token) throw new Error(`token refresh failed (${tok.error || 'no token'})`);
  const D = 'https://www.googleapis.com/youtube/v3';
  const ch = (await api(`${D}/channels?part=statistics,contentDetails&mine=true`, tok.access_token)).items?.[0];
  if (!ch) throw new Error('no channel');
  const stats = { subscribers: +ch.statistics.subscriberCount || 0, views: +ch.statistics.viewCount || 0, videos: +ch.statistics.videoCount || 0 };
  // Uploads newest first, until before the "before" window (max 4 pages = 200 videos, ~8 quota units).
  const ids = [];
  let page = '';
  for (let i = 0; i < 4; i++) {
    const pl = await api(`${D}/playlistItems?part=contentDetails&maxResults=50&playlistId=${ch.contentDetails.relatedPlaylists.uploads}${page ? `&pageToken=${page}` : ''}`, tok.access_token);
    ids.push(...pl.items.map((x) => x.contentDetails.videoId));
    const oldest = pl.items.at(-1)?.contentDetails?.videoPublishedAt;
    if (!pl.nextPageToken || (oldest && istDay(oldest) < BEFORE[0])) break;
    page = pl.nextPageToken;
  }
  const videos = [];
  for (let i = 0; i < ids.length; i += 50) {
    const r = await api(`${D}/videos?part=snippet,statistics,contentDetails,status&id=${ids.slice(i, i + 50).join(',')}`, tok.access_token);
    for (const v of r.items) {
      if (v.status?.privacyStatus !== 'public') continue; // scheduled (publishAt) and private uploads are not public yet
      videos.push({ id: v.id, title: v.snippet.title, day: istDay(v.snippet.publishedAt), at: v.snippet.publishedAt,
        seconds: seconds(v.contentDetails.duration), views: +v.statistics.viewCount || 0 });
    }
  }
  return { stats, videos, token: tok.access_token };
}

function windowStats(videos, [from, to]) {
  const all = videos.filter((v) => v.day >= from && v.day <= to);
  const shorts = all.filter((v) => v.seconds <= 180);
  const days = Math.round((Date.parse(to) - Date.parse(from)) / 864e5) + 1;
  const now = Date.now();
  const views = shorts.reduce((n, v) => n + v.views, 0);
  const perDay = shorts.reduce((n, v) => n + v.views / Math.max(1, (now - Date.parse(v.at)) / 864e5), 0);
  const top = [...shorts].sort((a, b) => b.views - a.views)[0];
  return { from, to, days, uploads: all.length, shorts: shorts.length, views, avg: shorts.length ? views / shorts.length : 0,
    avgPerDay: shorts.length ? perDay / shorts.length : 0, zeroish: shorts.filter((v) => v.views <= 15).length, top };
}

// ---- Per format (owner, 15 Nov 2026: the facts / loop / veer formats and their A/B arms are tracked on their own) --------
// automation/published.md maps a YouTube id to its slug ("- <slug> | youtube: https://youtu.be/<id>"); the slug and the
// saved spec (story/published/<slug>.json) give the format, the facts variant (story / kyun / list / gita), the art style
// (cinematic / illustrated), the loop kind (loop / veer) and the evening hook arm (name / emotional).
export function formatOf(slug, spec = {}) {
  const slot = String(slug || '').replace(/^\d{4}-\d{2}-\d{2}-/, '').split('-')[0];
  if (slot === 'facts') return `facts ${spec.variant || '?'}`;
  if (slot === 'loop' || slot === 'veer') return slot;
  if (slot === 'long') return spec.kind === 'compilation' ? 'long (facts compilation)' : 'long';
  if (['status', 'eve', 'statusday'].includes(slot)) return 'festival status';
  if (slot === 'morning') return spec.format === 'status' ? (spec.bhajan_short ? 'bhajan Short' : 'day status') : spec.format === 'loop' ? spec.kind || 'loop' : 'morning darshan';
  if (slot === 'evening') return spec.bhajan_short ? 'bhajan Short' : spec.hook_style === 'emotional' ? 'evening darshan (emotional hook)' : 'evening darshan (name hook)';
  return slot || 'other';
}
export function formatTable(videos, pub, { from, to, readSpec = () => ({}) }) {
  const slugOf = new Map([...String(pub || '').matchAll(/^- (\S+) \| youtube: https?:\/\/(?:youtu\.be\/|www\.youtube\.com\/(?:shorts\/|watch\?v=))([\w-]{6,})/gm)].map((m) => [m[2], m[1]]));
  const rows = new Map();
  const now = Date.now();
  for (const v of videos) {
    if (v.day < from || v.day > to) continue;
    const slug = slugOf.get(v.id);
    const spec = slug ? readSpec(slug) : {};
    const keys = [formatOf(slug, spec)];
    if (String(slug).includes('-facts-')) keys.push(`facts art ${spec.art || '?'}`, `facts ${v.seconds <= 65 ? '45-65 s' : '100-180 s'}`);
    for (const k of keys) {
      const r = rows.get(k) || { n: 0, views: 0, perDay: 0, best: null };
      r.n++; r.views += v.views; r.perDay += v.views / Math.max(1, (now - Date.parse(v.at)) / 864e5);
      if (!r.best || v.views > r.best.views) r.best = v;
      rows.set(k, r);
    }
  }
  return [...rows.entries()].sort((a, b) => b[1].views / b[1].n - a[1].views / a[1].n);
}

// ---- Facts review (owner, 16 Nov 2026) -----------------------------------------------------------------------------
export const FACTS_SINCE = '2026-11-15'; // the first facts Shorts (the Chhath ones)
export const FACTS_MIN_AGE_DAYS = 2;
export const median = (xs) => { const a = [...xs].sort((x, y) => x - y); const n = a.length; return n ? (n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2) : null; };
/** { date, since, n, median, min, verdict: 'off' | 'on' | null, videos } of the public facts Shorts (published.md slug
 *  "<date>-facts-...") from `since` that are at least FACTS_MIN_AGE_DAYS old on `date`. */
export function factsReview(videos, pub, { date, since = FACTS_SINCE } = {}) {
  const slugOf = new Map([...String(pub || '').matchAll(/^- (\S+) \| youtube: https?:\/\/(?:youtu\.be\/|(?:www\.)?youtube\.com\/(?:shorts\/|watch\?v=))([\w-]{6,})/gm)].map((m) => [m[2], m[1]]));
  const last = new Date(Date.parse(`${date}T12:00:00Z`) - FACTS_MIN_AGE_DAYS * 864e5).toISOString().slice(0, 10);
  const facts = videos.filter((v) => /^\d{4}-\d{2}-\d{2}-facts\d*-/.test(slugOf.get(v.id) || '') && v.day >= since && v.day <= last)
    .map((v) => ({ id: v.id, slug: slugOf.get(v.id), day: v.day, views: v.views, title: v.title }))
    .sort((a, b) => a.day.localeCompare(b.day));
  const med = median(facts.map((v) => v.views));
  const verdict = !facts.length ? null : med < FACTS_MEDIAN_MIN ? 'off' : 'on';
  return { date, since, n: facts.length, median: med, min: FACTS_MEDIAN_MIN, verdict, videos: facts };
}
export function factsReviewSection(r) {
  const v = r.verdict === 'off'
    ? `OFF: scripts/day-plan.mjs plans no facts Short from ${r.date} (automation/facts-review.json; to try again, set its verdict to "on" or delete it)`
    : 'ON: facts stay (the 2-a-week limit ends; the cap and the priority still apply)';
  return [
    `## Facts review ${r.date}`,
    '',
    `Owner, 16 Nov 2026: facts Shorts max 2 a week until 25 Nov, then compare; median under ${r.min} views = facts off.`,
    '',
    '| Day | Views | Short |',
    '|---|---|---|',
    ...r.videos.map((x) => `| ${x.day} | ${x.views} | ${String(x.title || x.slug).replace(/\|/g, '/').slice(0, 70)} |`),
    '',
    `- ${r.n} facts Shorts public ${r.since} to ${FACTS_MIN_AGE_DAYS} days before ${r.date}: median **${r.median}** views -> verdict **${v}**.`,
    '',
  ].join('\n');
}

const SNAP = /^\| (\d{4}-\d{2}-\d{2}) \| (\d+) \| (\d+) \| (\d+) \|$/gm;
function writeFile({ snapshot, section, extra }) {
  const old = read(FILE);
  // sections this script does not write themselves ("## Facts review ...", "## Character series", ...) are kept as they
  // are (a new facts review replaces the one of the same title)
  const kept = old.split(/^(?=## )/m).filter((p) => p.startsWith('## ') && !p.startsWith('## Week of ') && !p.startsWith('## Subscriber snapshots')
    && !(extra && p.split('\n')[0] === extra.split('\n')[0]));
  if (extra) kept.unshift(extra);
  const snaps = new Map([...old.matchAll(SNAP)].map((m) => [m[1], m.slice(2, 5).map(Number)]));
  if (snapshot) snaps.set(DATE, [snapshot.subscribers, snapshot.views, snapshot.videos]);
  const sections = old.split(/^(?=## Week of )/m).filter((p) => p.startsWith('## Week of ') && !p.startsWith(`## Week of ${DATE}`));
  if (section) sections.unshift(section);
  sections.sort((a, b) => b.slice(11, 21).localeCompare(a.slice(11, 21)));
  const rows = [...snaps.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([d, [s, v, n]]) => `| ${d} | ${s} | ${v} | ${n} |`);
  const out = [
    '# Growth: the "max 3 uploads a day" change',
    '',
    `Owner, 9 Nov 2026: from ${CHANGE} at most 3 YouTube uploads a day (scripts/day-plan.mjs), because 5-6 a day (7-9 Nov)`,
    'collapsed views from hundreds to 0-15. Every Monday the `growth` job of .github/workflows/daily.yml compares the average',
    'views per Short before (2-8 Nov) and after (10-16 Nov, then each last 7 days) with scripts/growth-compare.mjs.',
    'Data API lifetime views: younger videos have had less time, so compare "views per day of age" too.',
    '',
    '## Subscriber snapshots',
    '',
    '| Date | Subscribers | Channel views | Videos |',
    '|---|---|---|---|',
    ...rows,
    '',
    ...kept.map((p) => p.trimEnd() + '\n'),
    ...sections.map((p) => p.trimEnd() + '\n'),
  ].join('\n');
  fs.writeFileSync(FILE, out.trimEnd() + '\n');
  return { snaps };
}

async function main() {
  const { stats, videos, token } = await channel();
  if (args.includes('--facts-review')) {
    const r = factsReview(videos, read('automation/published.md'), { date: DATE });
    if (!r.verdict) { console.log(`Facts review ${DATE}: no public facts Short old enough yet`); process.exit(1); }
    fs.writeFileSync(FACTS_REVIEW_FILE, `${JSON.stringify({ date: DATE, n: r.n, median: r.median, min: r.min, verdict: r.verdict, since: r.since, videos: r.videos.map(({ title, ...v }) => v) }, null, 2)}\n`);
    const sec = factsReviewSection(r);
    writeFile({ extra: sec });
    console.log(sec);
    return;
  }
  if (args.includes('--snapshot')) {
    writeFile({ snapshot: stats });
    console.log(`Snapshot ${DATE}: ${stats.subscribers} subscribers, ${stats.views} views, ${stats.videos} videos`);
    return;
  }
  // Retention per format (Shorts feed audit, 17 Nov 2026; scripts/retention.mjs): the first-3-second drop and the average %
  // viewed of the last 30 Shorts. A failure only leaves a note (the comparison above still goes out).
  let retention;
  try { retention = retentionSection(await retentionAudit({ token, n: 30, end: DATE })); } catch (e) { retention = retentionSection({ shorts: [], note: `Retention report failed: ${e.message}` }); }
  const after = [AFTER[0], AFTER[1] < DATE ? AFTER[1] : addDays(DATE, -1)];
  const rows = [['Before (3-6 a day)', windowStats(videos, BEFORE)], ['After (max 3 a day)', windowStats(videos, after)]];
  const last = [addDays(DATE, -7), addDays(DATE, -1)];
  if (last[0] > AFTER[1]) rows.push(['Last 7 days', windowStats(videos, last)]);
  const snaps = new Map([...read(FILE).matchAll(SNAP)].map((m) => [m[1], +m[2]]));
  const base = [...snaps.entries()].filter(([d]) => d < CHANGE).sort().at(-1) || [...snaps.entries()].sort()[0];
  const prev = [...snaps.entries()].filter(([d]) => d < DATE).sort().at(-1);
  const f1 = (n) => (Math.round(n * 10) / 10).toString();
  const [b, a] = [rows[0][1], rows[1][1]];
  const change = !a.shorts ? 'no Shorts in the after window yet' : b.avg ? `${a.avg >= b.avg ? '+' : ''}${Math.round((a.avg / b.avg - 1) * 100)}%` : 'n/a';
  const section = [
    `## Week of ${DATE}`,
    '',
    '| Window | Dates | Uploads | Shorts | Avg views/Short | Avg views/Short/day of age | Shorts with <=15 views | Best Short |',
    '|---|---|---|---|---|---|---|---|',
    ...rows.map(([name, w]) => `| ${name} | ${w.from} to ${w.to} (${w.days} d) | ${w.uploads} (${f1(w.uploads / w.days)}/day) | ${w.shorts} | ${f1(w.avg)} | ${f1(w.avgPerDay)} | ${w.zeroish} | ${w.top ? `${w.top.views}: ${w.top.title.replace(/\|/g, '/').slice(0, 60)}` : '-'} |`),
    '',
    `- Average views per Short, after vs before: **${change}** (${f1(a.avg)} vs ${f1(b.avg)}).${a.to < AFTER[1] ? ` The after window is still partial (to ${a.to}).` : ''}`,
    '',
    `By format, videos public ${addDays(DATE, -14)} to ${addDays(DATE, -1)} (facts variant / art / length, loop vs veer and the evening hook A/B are rows of their own):`,
    '',
    '| Format | Videos | Avg views | Avg views/day of age | Best |',
    '|---|---|---|---|---|',
    ...formatTable(videos, read('automation/published.md'), { from: addDays(DATE, -14), to: addDays(DATE, -1),
      readSpec: (slug) => { try { return JSON.parse(read(`story/published/${slug}.json`)); } catch { return {}; } } })
      .map(([k, r]) => `| ${k} | ${r.n} | ${f1(r.views / r.n)} | ${f1(r.perDay / r.n)} | ${r.best ? `${r.best.views}: ${r.best.title.replace(/\|/g, '/').slice(0, 50)}` : '-'} |`),
    '',
    ...retention,
    "### What's working outside (viral radar, last 7 days; automation/viral-radar.md)",
    '',
    ...workingLines(radarFiles('.'), addDays(DATE, -1)),
    '',
    `- Subscribers: **${stats.subscribers}**${base ? ` (${stats.subscribers - base[1] >= 0 ? '+' : ''}${stats.subscribers - base[1]} since ${base[0]})` : ' (first snapshot)'}${prev && prev !== base ? `, ${stats.subscribers - prev[1] >= 0 ? '+' : ''}${stats.subscribers - prev[1]} since ${prev[0]}` : ''}.`,
    '',
  ].join('\n');
  writeFile({ snapshot: stats, section });
  console.log(section);
}

if (process.argv[1] && path.resolve(process.argv[1]).endsWith(path.join('scripts', 'growth-compare.mjs'))) {
  main().catch((e) => { console.error(`growth-compare: ${e.message}`); process.exit(1); });
}
