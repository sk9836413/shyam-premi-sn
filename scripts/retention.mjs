#!/usr/bin/env node
// Shorts feed audit (17 Nov 2026): where viewers drop, per format. The Shorts feed rewards a low "swiped away" rate and a
// high average % viewed (loops above 100%), so the first 1-3 seconds decide whether YouTube shows a Short to more people.
// Gopashtami Status 2026 got 95% of its views from SEARCH and 4 from the feed; this report shows why.
//
//   node scripts/retention.mjs audit [--n 30] [--json <file>]   the last n public Shorts: YouTube Analytics audience
//        retention (dimension elapsedVideoTimeRatio, metrics audienceWatchRatio + relativeRetentionPerformance), views,
//        average view %, likes / comments / shares / subscribers gained and traffic sources, grouped by format; prints
//        the markdown (scripts/growth-compare.mjs puts the same table in the Monday report as "### Retention").
//
// Credentials: the same as scripts/youtube.mjs (YT_* secrets or ~/.shyampremisk/youtube.env). The Analytics API accepts
// the youtube.readonly scope for these (non-revenue) reports; yt-analytics.readonly is not needed. Analytics quota is
// separate from the Data API's 10,000 units; ~4 report calls per Short.
// "Viewed vs swiped away" (the Shorts feed's own metric) is NOT in the API (the Analytics API metrics list, checked again
// 20 Nov 2026, has engagedViews but no swipe / "stayed to watch" metric): the owner reads it in Studio (Content -> a
// Short -> Analytics -> Engagement / "Viewed vs swiped away").
// Weekly Shorts metrics (weekSection, research 20 Nov 2026): the Shorts public in the last 7 days with views, ENGAGED
// views (metric engagedViews: views past the first frame, what monetisation counts), average % viewed and the Shorts
// feed / search share, plus the top 3 by feed share, and the owner's Studio / Instagram / Facebook screenshot asks
// (Instagram and Facebook insights need a permission the token does not have).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { formatOf } from './growth-compare.mjs';

const A = 'https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE';
const D = 'https://www.googleapis.com/youtube/v3';
const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } };
const istDay = (iso) => new Date(Date.parse(iso) + 5.5 * 3600e3).toISOString().slice(0, 10);
const seconds = (iso = '') => { const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/) || []; return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0); };
const r1 = (x) => (x == null || Number.isNaN(x) ? null : Math.round(x * 10) / 10);

/** Format of a Short, collapsed to the families the feed audit compares: the title first (a "Katha" Short published in
 *  the evening slot is a katha, not a darshan), then the published.md slug + saved spec (growth-compare formatOf). */
export function feedFormat(slug, spec, title = '') {
  const t = String(title);
  const f = slug ? formatOf(slug, spec || {}) : '';
  if (/\bStatus\b/i.test(t) || /status/.test(f)) return 'status';
  if (/#facts/i.test(t) || /^facts/.test(f)) return 'facts';
  if (f === 'movie' || /Amar Katha Part|\bPart \d/i.test(t)) return 'movie';
  if (/\b(Geet|Song|Bhajan)\b|भजन/i.test(t) || /bhajan/i.test(f)) return 'bhajan';
  if (/\b(Katha|Kahani)\b|कथा|कहानी/i.test(t)) return 'katha';
  if (/^noon/.test(f) || /-noon-/.test(slug)) return 'dadi-chhotu';
  if (/Darshan|Dham|Mandir|दर्शन|धाम|मंदिर/i.test(t) || /darshan/.test(f)) return 'darshan';
  if (/loop|veer/.test(f)) return 'loop/veer';
  return slug ? f || 'other' : 'other (manual upload)';
}

/** audienceWatchRatio at second `sec` of a `duration`-second video (rows [[ratio, watch, relative], ...], linear). */
export function watchAt(rows, sec, duration) {
  if (!rows?.length || !duration) return null;
  const x = Math.min(1, Math.max(0, sec / duration));
  const pts = [...rows].map((r) => [Number(r[0]), Number(r[1])]).sort((a, b) => a[0] - b[0]);
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    if (x <= x1) { const [x0, y0] = pts[i - 1]; return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1); }
  }
  return pts.at(-1)[1];
}

/** One Short's retention numbers: start (first point), kept at 1 s and 3 s, drop in the first 3 s (percentage points of
 *  the start), the end (last point; >1 = loops), and the relative retention (vs similar-length YouTube videos) at 3 s. */
export function curveStats(rows, duration) {
  if (!rows?.length) return null;
  const start = watchAt(rows, 0, duration);
  const at1 = watchAt(rows, 1, duration);
  const at3 = watchAt(rows, 3, duration);
  const end = Number([...rows].sort((a, b) => a[0] - b[0]).at(-1)[1]);
  const rel = rows.map((r) => [Number(r[0]), Number(r[2])]);
  const rel3 = watchAt(rel.map(([a, b]) => [a, b]), 3, duration);
  return { start: r1(start * 100), at1: r1(at1 * 100), at3: r1(at3 * 100), drop3: r1((start - at3) * 100), end: r1(end * 100), rel3: r1(rel3 * 100) / 100 };
}

const mean = (xs) => { const a = xs.filter((x) => x != null && !Number.isNaN(x)); return a.length ? a.reduce((s, x) => s + x, 0) / a.length : null; };
const sum = (xs) => xs.reduce((s, x) => s + (x || 0), 0);

/** Per-format summary of audited Shorts (each { format, seconds, views, avp, curve, sources, likes, comments, shares, subs }). */
export function summarize(shorts) {
  const by = new Map();
  for (const s of shorts) { if (!by.has(s.format)) by.set(s.format, []); by.get(s.format).push(s); }
  return [...by.entries()].map(([format, xs]) => {
    const withCurve = xs.filter((x) => x.curve);
    const views = sum(xs.map((x) => x.views));
    const src = {};
    for (const x of xs) for (const [k, v] of Object.entries(x.sources || {})) src[k] = (src[k] || 0) + v;
    const srcTotal = sum(Object.values(src));
    const pct = (k) => (srcTotal ? r1((100 * (src[k] || 0)) / srcTotal) : null);
    return {
      format, n: xs.length, curves: withCurve.length, views, avgViews: r1(views / xs.length), seconds: r1(mean(xs.map((x) => x.seconds))),
      avp: r1(mean(xs.map((x) => x.avp))), // average view %, mean of the Shorts
      start: r1(mean(withCurve.map((x) => x.curve.start))), at3: r1(mean(withCurve.map((x) => x.curve.at3))),
      drop3: r1(mean(withCurve.map((x) => x.curve.drop3))), end: r1(mean(withCurve.map((x) => x.curve.end))),
      rel3: mean(withCurve.map((x) => x.curve.rel3)) == null ? null : Math.round(mean(withCurve.map((x) => x.curve.rel3)) * 100) / 100,
      searchPct: pct('YT_SEARCH'), feedPct: pct('SHORTS'), engagedPer100: views ? r1((100 * sum(xs.map((x) => (x.likes || 0) + (x.comments || 0) + (x.shares || 0)))) / views) : null,
      shares: sum(xs.map((x) => x.shares)), subs: sum(xs.map((x) => x.subs)),
    };
  }).sort((a, b) => b.views - a.views);
}

export function retentionTable(summary) {
  const f = (x, s = '') => (x == null ? '-' : `${x}${s}`);
  return [
    '| Format | Shorts (with curve) | Avg length | Avg views | Avg % viewed | Kept at 0 s | Kept at 3 s | Drop in first 3 s | End (>100 = replays) | Rel. retention at 3 s | Search % | Shorts feed % | Likes+comments+shares /100 views | Shares | Subs gained |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
    ...summary.map((r) => `| ${r.format} | ${r.n} (${r.curves}) | ${f(r.seconds, ' s')} | ${f(r.avgViews)} | ${f(r.avp, '%')} | ${f(r.start, '%')} | ${f(r.at3, '%')} | ${f(r.drop3, ' pts')} | ${f(r.end, '%')} | ${f(r.rel3)} | ${f(r.searchPct, '%')} | ${f(r.feedPct, '%')} | ${f(r.engagedPer100)} | ${r.shares} | ${r.subs} |`),
  ];
}

/** The "### Retention" block of the Monday growth report. */
export function retentionSection(audit) {
  if (!audit?.shorts?.length) return ['### Retention (Shorts feed)', '', `_${audit?.note || 'No Short with Analytics data yet.'}_`, ''];
  return [
    `### Retention (Shorts feed): the last ${audit.shorts.length} public Shorts, YouTube Analytics to ${audit.end}`,
    '',
    '"Kept at N s" = audienceWatchRatio at that second (share of views still watching; replays push it above 100%). Relative',
    'retention 1.0 = like other YouTube videos of that length. "Viewed vs swiped away" is not in the API: see Studio.',
    '',
    ...retentionTable(summarize(audit.shorts)),
    '',
  ];
}

const addDays = (date, n) => new Date(Date.parse(`${date}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const share = (src = {}, key) => { const t = sum(Object.values(src)); return t ? r1((100 * (src[key] || 0)) / t) : null; };

/** The "### Shorts of the last 7 days" block of the Monday growth report (Shorts public end-7 .. end-1). */
export function weekSection(audit, end = audit?.end) {
  const from = addDays(end, -7), to = addDays(end, -1);
  const xs = (audit?.shorts || []).filter((s) => s.day >= from && s.day <= to);
  const f = (x, u = '') => (x == null ? '-' : `${x}${u}`);
  const t = (s) => s.title.replace(/\|/g, '/').replace(/#shorts/gi, '').trim().slice(0, 55);
  const rows = xs.map((s) => ({ ...s, feed: share(s.sources, 'SHORTS'), search: share(s.sources, 'YT_SEARCH') }));
  const top = rows.filter((s) => s.views >= 10 && s.feed != null).sort((a, b) => b.feed - a.feed || b.views - a.views).slice(0, 3);
  const engagedTotal = rows.some((s) => s.engaged != null) ? sum(rows.map((s) => s.engaged)) : null;
  return [
    `### Shorts of the last 7 days (${from} to ${to}, YouTube Analytics to ${end})`,
    '',
    ...(rows.length ? [
      '| Short | Format | Length | Views | Engaged views | Avg % viewed | Shorts feed % | Search % |',
      '|---|---|---|---|---|---|---|---|',
      ...rows.map((s) => `| ${t(s)} | ${s.format} | ${s.seconds} s | ${s.views} | ${f(s.engaged)} | ${f(s.avp, '%')} | ${f(s.feed, '%')} | ${f(s.search, '%')} |`),
      '',
      `- Totals: ${sum(rows.map((s) => s.views))} views, ${f(engagedTotal)} engaged views; average % viewed ${f(r1(mean(rows.map((s) => s.avp))), '%')} (mean of the Shorts).`,
      `- Top 3 by Shorts feed share (at least 10 views): ${top.length ? top.map((s, i) => `${i + 1}. ${t(s)} (${s.feed}% feed, ${s.views} views, ${f(s.avp, '%')} viewed)`).join('; ') : 'none yet'}.`,
    ] : ['_No public Short in these 7 days has Analytics data yet (2-3 days lag)._']),
    '- **Viewed vs swiped away** is not in the YouTube Analytics API: owner, please send the Studio number (Content -> the Short -> Analytics -> Engagement) for the top 3 above.',
    '- **Instagram / Facebook insights** are not available through the API (the token lacks the insights permission): owner, please send a screenshot of Instagram Insights (Reels: watch time, sends/reach, likes/reach of the top 3) and the Facebook Professional Dashboard (Reels plays, last 7 days).',
    '',
  ];
}

// ---------------------------------------------------------------- API

function loadEnv() {
  const KEYS = ['YT_CLIENT_ID', 'YT_CLIENT_SECRET', 'YT_REFRESH_TOKEN'];
  const file = Object.fromEntries(read(path.join(os.homedir(), '.shyampremisk', 'youtube.env')).split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]));
  const env = { ...file, ...Object.fromEntries(KEYS.filter((k) => process.env[k]).map((k) => [k, process.env[k]])) };
  if (KEYS.every((k) => process.env[`SHYAM_${k}`])) KEYS.forEach((k) => { env[k] = process.env[`SHYAM_${k}`]; });
  if (!KEYS.every((k) => env[k])) throw new Error('no YouTube credentials (YT_* secrets or ~/.shyampremisk/youtube.env)');
  return env;
}
export async function accessToken(env = loadEnv()) {
  const tok = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', signal: AbortSignal.timeout(20000),
    body: new URLSearchParams({ client_id: env.YT_CLIENT_ID, client_secret: env.YT_CLIENT_SECRET, refresh_token: env.YT_REFRESH_TOKEN, grant_type: 'refresh_token' }),
  }).then((r) => r.json());
  if (!tok.access_token) throw new Error(`token refresh failed (${tok.error || 'no token'})`);
  return tok.access_token;
}
async function api(url, token) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) throw new Error(`${body.error?.message || res.statusText} (HTTP ${res.status})`);
  return body;
}

/** The last n public Shorts (<= 180 s) of the channel, newest first: { id, title, at, day, seconds }. */
export async function recentShorts(token, n = 30) {
  const ch = (await api(`${D}/channels?part=contentDetails&mine=true`, token)).items?.[0];
  if (!ch) throw new Error('no channel');
  const out = [];
  let page = '';
  for (let i = 0; i < 4 && out.length < n; i++) {
    const pl = await api(`${D}/playlistItems?part=contentDetails&maxResults=50&playlistId=${ch.contentDetails.relatedPlaylists.uploads}${page ? `&pageToken=${page}` : ''}`, token);
    const ids = pl.items.map((x) => x.contentDetails.videoId);
    const v = await api(`${D}/videos?part=snippet,contentDetails,status&id=${ids.join(',')}`, token);
    const byId = new Map(v.items.map((x) => [x.id, x]));
    for (const id of ids) {
      const x = byId.get(id);
      if (!x || x.status?.privacyStatus !== 'public' || seconds(x.contentDetails.duration) > 180) continue;
      out.push({ id, title: x.snippet.title, at: x.snippet.publishedAt, day: istDay(x.snippet.publishedAt), seconds: seconds(x.contentDetails.duration) });
      if (out.length >= n) break;
    }
    if (!pl.nextPageToken) break;
    page = pl.nextPageToken;
  }
  return out;
}

const rowsOf = (r) => r.rows || [];

/** Audits the last n Shorts. pub = automation/published.md text, readSpec(slug) = story/published/<slug>.json. */
export async function audit({ token, n = 30, end, pub = read('automation/published.md'), readSpec = (s) => { try { return JSON.parse(read(`story/published/${s}.json`)); } catch { return {}; } } } = {}) {
  token = token || await accessToken();
  end = end || new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
  const slugOf = new Map([...String(pub).matchAll(/^- (\S+) \| youtube: https?:\/\/(?:youtu\.be\/|(?:www\.)?youtube\.com\/(?:shorts\/|watch\?v=))([\w-]{6,})/gm)].map((m) => [m[2], m[1]]));
  const list = await recentShorts(token, n);
  if (!list.length) return { end, shorts: [], note: 'No public Short found.' };
  const start = list.reduce((a, v) => (v.day < a ? v.day : a), end);
  const range = `&startDate=${start}&endDate=${end}`;
  const ids = list.map((v) => v.id).join(',');
  const stats = new Map(rowsOf(await api(`${A}${range}&dimensions=video&metrics=views,averageViewPercentage,averageViewDuration,likes,comments,shares,subscribersGained&filters=video==${ids}&maxResults=200`, token))
    .map((r) => [r[0], { views: r[1], avp: r[2], avd: r[3], likes: r[4], comments: r[5], shares: r[6], subs: r[7] }]));
  // Engaged views (a separate call: a metric the report cannot get must not cost the rest)
  let engaged = new Map();
  try {
    engaged = new Map(rowsOf(await api(`${A}${range}&dimensions=video&metrics=engagedViews&filters=video==${ids}&maxResults=200`, token)).map((r) => [r[0], r[1]]));
  } catch { engaged = new Map(); }
  const shorts = [];
  for (const v of list) {
    const slug = slugOf.get(v.id) || '';
    const s = stats.get(v.id) || {};
    let curve = null, sources = {};
    try {
      const rr = rowsOf(await api(`${A}&startDate=${v.day}&endDate=${end}&dimensions=elapsedVideoTimeRatio&metrics=audienceWatchRatio,relativeRetentionPerformance&filters=video==${v.id}`, token));
      curve = curveStats(rr, v.seconds);
      if (curve) curve.points = rr.length;
    } catch (e) { curve = null; }
    try {
      sources = Object.fromEntries(rowsOf(await api(`${A}&startDate=${v.day}&endDate=${end}&dimensions=insightTrafficSourceType&metrics=views&filters=video==${v.id}`, token)));
    } catch { sources = {}; }
    shorts.push({ ...v, slug, format: feedFormat(slug, slug ? readSpec(slug) : {}, v.title), views: s.views ?? 0, engaged: engaged.has(v.id) ? engaged.get(v.id) : null, avp: s.avp ?? null, avd: s.avd ?? null,
      likes: s.likes ?? 0, comments: s.comments ?? 0, shares: s.shares ?? 0, subs: s.subs ?? 0, curve, sources });
  }
  // Returning viewers: views from subscribed vs unsubscribed viewers, per format (Analytics has no "returning viewer"
  // dimension in the API; subscribedStatus is the closest).
  const subscribed = {};
  try {
    for (const r of rowsOf(await api(`${A}${range}&dimensions=video,subscribedStatus&metrics=views,averageViewPercentage&filters=video==${ids}&maxResults=200`, token))) {
      const f = shorts.find((x) => x.id === r[0])?.format || 'other';
      subscribed[f] = subscribed[f] || { SUBSCRIBED: 0, UNSUBSCRIBED: 0 };
      subscribed[f][r[1]] = (subscribed[f][r[1]] || 0) + r[2];
    }
  } catch (e) { subscribed.error = e.message; }
  return { end, start, shorts, subscribed };
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
  if (args[0] !== 'audit') throw new Error('usage: retention.mjs audit [--n 30] [--json <file>]');
  const a = await audit({ n: Number(opt('--n')) || 30 });
  if (opt('--json')) fs.writeFileSync(opt('--json'), `${JSON.stringify(a, null, 2)}\n`);
  console.log(retentionSection(a).join('\n'));
  console.log(weekSection(a).join('\n'));
  for (const s of a.shorts) {
    const c = s.curve;
    console.log(`${s.day} ${s.format.padEnd(8)} ${String(s.seconds).padStart(3)}s views ${String(s.views).padStart(4)} avp ${s.avp ?? '-'}% ${c ? `start ${c.start} @1s ${c.at1} @3s ${c.at3} end ${c.end} rel3 ${c.rel3}` : 'no curve'} | ${s.title.slice(0, 60)}`);
  }
  console.log(JSON.stringify({ subscribed: a.subscribed }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((e) => { console.error(`retention: ${e.message}`); process.exit(1); });
}
