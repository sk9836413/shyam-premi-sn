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
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

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
  return { stats, videos };
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

const SNAP = /^\| (\d{4}-\d{2}-\d{2}) \| (\d+) \| (\d+) \| (\d+) \|$/gm;
function writeFile({ snapshot, section }) {
  const old = read(FILE);
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
    ...sections.map((p) => p.trimEnd() + '\n'),
  ].join('\n');
  fs.writeFileSync(FILE, out.trimEnd() + '\n');
  return { snaps };
}

async function main() {
  const { stats, videos } = await channel();
  if (args.includes('--snapshot')) {
    writeFile({ snapshot: stats });
    console.log(`Snapshot ${DATE}: ${stats.subscribers} subscribers, ${stats.views} views, ${stats.videos} videos`);
    return;
  }
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
    `- Subscribers: **${stats.subscribers}**${base ? ` (${stats.subscribers - base[1] >= 0 ? '+' : ''}${stats.subscribers - base[1]} since ${base[0]})` : ' (first snapshot)'}${prev && prev !== base ? `, ${stats.subscribers - prev[1] >= 0 ? '+' : ''}${stats.subscribers - prev[1]} since ${prev[0]}` : ''}.`,
    '',
  ].join('\n');
  writeFile({ snapshot: stats, section });
  console.log(section);
}

main().catch((e) => { console.error(`growth-compare: ${e.message}`); process.exit(1); });
