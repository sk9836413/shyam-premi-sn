#!/usr/bin/env node
// Shyam Premi SN numbers on demand, as markdown (the stats-now workflow writes it to the run's job summary):
// YouTube (subscribers, views, uploads of the last 48 h, per-day views / watch minutes / subscribers from YouTube
// Analytics, which lags 2-3 days) and the Facebook Page / Instagram followers. Read-only; counts only.
//   node scripts/stats-now.mjs [--what all|youtube|social] [--date YYYY-MM-DD] [--days 7]
// Env (this repo's secrets): YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN; META_PAGE_ID, META_PAGE_TOKEN, IG_USER_ID.
// A missing secret becomes an "owner step" line; an API error a "failed" line. Node built-ins only.
import fs from 'node:fs';

export const SECTIONS = ['youtube', 'social'];

/** Markdown table; pipes/newlines escaped; numeric columns right-aligned. */
export function mdTable(headers, rows) {
  const cell = (v) => String(v ?? '').replace(/\r?\n/g, ' ').replace(/\|/g, '\\|');
  const numeric = headers.map((_, i) => rows.length > 0 && rows.every((r) => r[i] == null || r[i] === '' || /^[+-]?[\d.,]+$/.test(String(r[i]))));
  const out = [`| ${headers.map(cell).join(' | ')} |`, `| ${headers.map((_, i) => (numeric[i] ? '---:' : '---')).join(' | ')} |`];
  for (const r of rows) out.push(`| ${r.map(cell).join(' | ')} |`);
  if (!rows.length) out.push(`| (no rows) |${' |'.repeat(headers.length - 1)}`);
  return out.join('\n');
}

export const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s)) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
export function addDays(date, n) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Section names for a `what` input; throws on an unknown one. */
export function pick(what = 'all') {
  const w = String(what || 'all').trim().toLowerCase();
  if (w === 'all') return [...SECTIONS];
  const list = w.split(/[\s,]+/).filter(Boolean);
  for (const s of list) if (!SECTIONS.includes(s)) throw new Error(`Unknown section "${s}" (all|${SECTIONS.join('|')})`);
  return list;
}

const ownerStep = (s) => `> **Owner step:** ${s}`;

async function getJson(url, token) {
  const r = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(`HTTP ${r.status} ${String(j.error?.message || j.error_description || '').slice(0, 160)}`.trim());
  return j;
}

async function youtube(date, days) {
  const e = process.env;
  if (!e.YT_REFRESH_TOKEN) return `#### YouTube\n\n${ownerStep('add YT_CLIENT_ID / YT_CLIENT_SECRET / YT_REFRESH_TOKEN')}`;
  const t = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({ client_id: e.YT_CLIENT_ID, client_secret: e.YT_CLIENT_SECRET, refresh_token: e.YT_REFRESH_TOKEN, grant_type: 'refresh_token' }),
  }).then((r) => r.json()).catch(() => ({}));
  if (!t.access_token) throw new Error('YouTube token refresh failed');
  const tok = t.access_token;
  const YT = 'https://www.googleapis.com/youtube/v3/';
  const ch = (await getJson(`${YT}channels?part=statistics,contentDetails,snippet&mine=true`, tok)).items?.[0];
  if (!ch) return '#### YouTube\n\nNo channel for this token.';
  const s = ch.statistics;
  const out = [`#### YouTube (${ch.snippet?.title || ''})`, mdTable(['Subscribers', 'Total views', 'Videos'], [[s.subscriberCount, s.viewCount, s.videoCount]])];
  const pl = await getJson(`${YT}playlistItems?part=contentDetails&maxResults=30&playlistId=${ch.contentDetails.relatedPlaylists.uploads}`, tok);
  const ids = (pl.items || []).map((i) => i.contentDetails.videoId);
  if (ids.length) {
    const v = await getJson(`${YT}videos?part=snippet,statistics,status&id=${ids.join(',')}`, tok);
    const recent = (v.items || []).filter((x) => Date.now() - Date.parse(x.snippet.publishedAt) < 48 * 3600e3);
    out.push(`**Uploads, last 48 h** (${recent.length})\n\n${mdTable(['Published (UTC)', 'Status', 'Views', 'Likes', 'Title'],
      recent.map((x) => [x.snippet.publishedAt.slice(0, 16).replace('T', ' '), x.status.privacyStatus, x.statistics.viewCount ?? 0, x.statistics.likeCount ?? 0, x.snippet.title.slice(0, 70)]))}`);
  }
  const start = addDays(date, -(days - 1));
  const q = new URLSearchParams({ ids: 'channel==MINE', startDate: start, endDate: date, metrics: 'views,estimatedMinutesWatched,subscribersGained,subscribersLost', dimensions: 'day', sort: 'day' });
  try {
    const a = await getJson(`https://youtubeanalytics.googleapis.com/v2/reports?${q}`, tok);
    out.push(`**Per day (YouTube Analytics, ${start} to ${date}; lags 2-3 days)**\n\n${mdTable(['Date', 'Views', 'Watch minutes', 'Subs +', 'Subs -'], (a.rows || []).map((r) => r.slice(0, 5)))}`);
  } catch (err) {
    out.push(`Per-day analytics: failed (${err.message}).`);
  }
  return out.join('\n\n');
}

async function social() {
  const { META_PAGE_ID: page, META_PAGE_TOKEN: token, IG_USER_ID: ig } = process.env;
  if (!page || !token) return `#### Facebook / Instagram\n\n${ownerStep('add META_PAGE_ID and META_PAGE_TOKEN')}`;
  const G = 'https://graph.facebook.com/v21.0/';
  const rows = [];
  try {
    const p = await getJson(`${G}${page}?fields=name,followers_count,fan_count`, token);
    rows.push(['Facebook Page', p.name || '', p.followers_count ?? '?', `likes ${p.fan_count ?? '?'}`]);
  } catch (err) {
    rows.push(['Facebook Page', '', 'failed', err.message]);
  }
  if (ig) {
    try {
      const i = await getJson(`${G}${ig}?fields=username,followers_count,media_count`, token);
      rows.push(['Instagram', `@${i.username || ''}`, i.followers_count ?? '?', `posts ${i.media_count ?? '?'}`]);
    } catch (err) {
      rows.push(['Instagram', '', 'failed', err.message]);
    }
  } else rows.push(['Instagram', '', 'n/a', 'IG_USER_ID not set']);
  return `#### Facebook / Instagram\n\n${mdTable(['Platform', 'Account', 'Followers', 'Other'], rows)}`;
}

export async function report({ what = 'all', date, days = 7 } = {}) {
  const day = date || new Date().toISOString().slice(0, 10);
  if (!isDate(day)) throw new Error(`Bad date ${day}`);
  const n = Math.min(Math.max(Number(days) || 7, 1), 90);
  const parts = [`## Shyam Premi SN stats now: ${pick(what).join(', ')} (date ${day} UTC)`];
  for (const s of pick(what)) {
    try {
      parts.push(s === 'youtube' ? await youtube(day, n) : await social());
    } catch (err) {
      parts.push(`#### ${s}\n\nFailed: ${String(err.message).slice(0, 300)}`);
    }
  }
  return parts.join('\n\n');
}

const isMain = (() => {
  try {
    return fs.realpathSync(new URL(import.meta.url)) === fs.realpathSync(process.argv[1] || '');
  } catch {
    return false;
  }
})();

if (isMain) {
  const argv = process.argv.slice(2);
  const flag = (n) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : undefined);
  console.log(await report({ what: flag('--what'), date: flag('--date'), days: flag('--days') }));
}
