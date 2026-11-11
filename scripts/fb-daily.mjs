#!/usr/bin/env node
// Facebook Page daily jobs for the monetization challenge (owner, 11 Nov 2026: 1,000,000 views in 30 days from 11 Nov).
//
//   node scripts/fb-daily.mjs insights [--dry]
//       Page views per day + plays per Reel/video -> automation/fb-insights.json (merged, history kept), with a 30-day
//       progress line toward 1,000,000 (`challenge.line`, also printed) that the CRM collector can read from the raw file:
//       https://raw.githubusercontent.com/sk9836413/shyam-premi-sn/main/automation/fb-insights.json
//       Metric names checked live on Graph API v27.0 (11 Nov 2026). Page (/{page}/insights, period=day):
//         page_media_view ("Facebook views", the challenge metric), page_total_media_view_unique, page_video_views,
//         page_post_engagements, page_daily_follows_unique, page_follows. Rejected now: page_impressions,
//         page_impressions_unique, page_media_view_unique.
//       Reels (/{video-id}/video_insights, lifetime): fb_reels_total_plays (plays incl. replays), blue_reels_play_count
//         (plays without replays), fb_reels_replay_count, post_video_avg_time_watched (ms), post_video_view_time (ms),
//         post_video_followers, post_video_social_actions. Rejected: post_impressions_unique, total_video_impressions,
//         video_views. The video's own `views` field works for Reels and normal Page videos (movie parts).
//   node scripts/fb-daily.mjs share-kit [--date YYYY-MM-DD] [--dry] [--no-send]
//       Today's "Share kit" for sharing the day's Facebook Reels by hand into public groups: the Reel URLs (from
//       automation/published.md), a ready-to-paste Hindi share line per Reel, today's groups from automation/fb-groups.json
//       (rotated so each group gets at most 1 share every 2 days), one etiquette line. Always written to
//       automation/share-kit/<date>.md; emailed to epifive2@gmail.com via Resend when RESEND_API_KEY is set (the same
//       path as scripts/veo-kit.mjs) and added as a daily CRM task when INGEST_TOKEN is set. photos.yml runs it ~20:45 IST.
// Env: META_PAGE_ID, META_PAGE_TOKEN, META_API_VERSION (else ~/.shyampremisk/social.env), RESEND_API_KEY, KIT_TO,
// INGEST_TOKEN, CRM_URL. Never fails a run: problems are printed and the exit code stays 0.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { categoryOfText, hindiName } from './fb.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INSIGHTS = path.join(ROOT, 'automation', 'fb-insights.json');
const GROUPS = path.join(ROOT, 'automation', 'fb-groups.json');
const KITS = path.join(ROOT, 'automation', 'share-kit');
const PUBLISHED = path.join(ROOT, 'automation', 'published.md');
const REPO = 'https://github.com/sk9836413/shyam-premi-sn/blob/main';

export const CHALLENGE = { metric: 'page_media_view', start: '2026-11-11', days: 30, goal: 1_000_000 };
export const PAGE_METRICS = ['page_media_view', 'page_total_media_view_unique', 'page_video_views', 'page_post_engagements', 'page_daily_follows_unique', 'page_follows'];
export const REEL_METRICS = ['fb_reels_total_plays', 'blue_reels_play_count', 'fb_reels_replay_count', 'post_video_avg_time_watched', 'post_video_view_time', 'post_video_followers', 'post_video_social_actions'];

const readEnv = (file) => (fs.existsSync(file)
  ? Object.fromEntries(fs.readFileSync(file, 'utf8').split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]))
  : {});
const env = {
  ...readEnv(path.join(os.homedir(), '.shyampremisk', 'social.env')),
  ...Object.fromEntries(['META_PAGE_ID', 'META_PAGE_TOKEN', 'META_API_VERSION', 'RESEND_API_KEY', 'KIT_TO', 'INGEST_TOKEN', 'CRM_URL'].filter((k) => process.env[k]).map((k) => [k, process.env[k]])),
};
const API = `https://graph.facebook.com/${env.META_API_VERSION || 'v27.0'}`;
const redact = (s) => (env.META_PAGE_TOKEN ? String(s ?? '').split(env.META_PAGE_TOKEN).join('<token>') : String(s ?? ''));
const IST = 5.5 * 3600e3;
export const istDate = (now = Date.now()) => new Date(now + IST).toISOString().slice(0, 10);
export const addDays = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const dayNo = (d) => Math.round(Date.parse(`${d}T00:00:00Z`) / 864e5);
const fmt = (n) => Number(n || 0).toLocaleString('en-US');

async function graph(endpoint, params = {}) {
  const res = await fetch(`${API}/${endpoint}?${new URLSearchParams({ ...params, access_token: env.META_PAGE_TOKEN })}`, { signal: AbortSignal.timeout(60e3) })
    .catch((e) => { throw new Error(redact(`GET /${endpoint}: ${e.message}`)); });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.error) throw new Error(redact(`GET /${endpoint}: ${j.error?.message || res.statusText} (code ${j.error?.code ?? res.status})`));
  return j;
}

// ---------------------------------------------------------------- insights

/** Meta's daily values carry end_time = the END of the day (midnight Pacific); the day itself is the date before. */
export const metaDay = (endTime) => addDays(String(endTime).slice(0, 10), -1);

/** The 30-day progress toward the goal from { day: { page_media_view } }. */
export function progress(days, { now = Date.now(), c = CHALLENGE } = {}) {
  const end = addDays(c.start, c.days - 1);
  const total = Object.entries(days).filter(([d]) => d >= c.start && d <= end).reduce((a, [, v]) => a + (Number(v?.[c.metric]) || 0), 0);
  const today = istDate(now);
  const day = Math.min(c.days, Math.max(0, dayNo(today) - dayNo(c.start) + 1));
  const left = Math.max(0, c.goal - total);
  const daysLeft = Math.max(0, c.days - day + (day ? 1 : 0)); // today still counts
  const needPerDay = daysLeft ? Math.ceil(left / daysLeft) : left;
  const percent = Math.round((total / c.goal) * 10000) / 100;
  const line = `FB views (${c.metric}) ${c.start}..${end}: ${fmt(total)} / ${fmt(c.goal)} (${percent}%), day ${day}/${c.days}, need ${fmt(needPerDay)}/day for the remaining ${daysLeft} day(s)`;
  return { metric: c.metric, start: c.start, end, goal: c.goal, total, percent, day, daysLeft, needPerDay, line };
}

/** Facebook post id -> slug, from published.md ("- <slug> | ... fb: https://www.facebook.com/reel/<id>" / ".../videos/<id>"). */
export function fbSlugs(text) {
  const map = {};
  for (const m of String(text).matchAll(/^- (\S+) \|.*?facebook\.com\/(?:reel\/|\d+\/videos\/)(\d+)/gm)) map[m[2]] = m[1];
  return map;
}

export async function insights({ now = Date.now(), dry = false, log = console.log } = {}) {
  if (!env.META_PAGE_TOKEN || !env.META_PAGE_ID) { log('insights: META_PAGE_ID / META_PAGE_TOKEN not set; nothing logged'); return null; }
  const old = fs.existsSync(INSIGHTS) ? JSON.parse(fs.readFileSync(INSIGHTS, 'utf8')) : {};
  const days = { ...(old.days || {}) };
  const since = addDays(CHALLENGE.start, -14);
  const until = addDays(istDate(now), 1);
  const errors = [];
  for (const m of PAGE_METRICS) {
    try {
      const j = await graph(`${env.META_PAGE_ID}/insights`, { metric: m, period: 'day', since, until });
      for (const v of j.data?.[0]?.values || []) {
        const d = metaDay(v.end_time);
        days[d] = { ...(days[d] || {}), [m]: v.value };
      }
    } catch (e) { errors.push(`${m}: ${e.message.slice(0, 160)}`); }
  }
  // Reels and Page videos of the last 45 days, with lifetime plays.
  const slugs = fbSlugs(fs.existsSync(PUBLISHED) ? fs.readFileSync(PUBLISHED, 'utf8') : '');
  const after = Date.parse(`${addDays(istDate(now), -45)}T00:00:00Z`);
  const reels = { ...(old.reels || {}) };
  try {
    const list = [
      ...((await graph(`${env.META_PAGE_ID}/video_reels`, { fields: 'id,created_time,views,length', limit: '50' })).data || []).map((x) => ({ ...x, type: 'reel' })),
      ...((await graph(`${env.META_PAGE_ID}/videos`, { fields: 'id,created_time,views,length', limit: '50' }).catch(() => ({ data: [] }))).data || []).map((x) => ({ ...x, type: 'video' })),
    ].filter((x, i, a) => Date.parse(x.created_time) >= after && a.findIndex((y) => y.id === x.id) === i);
    for (const v of list) {
      const row = { type: v.type, created: v.created_time, slug: slugs[v.id] || reels[v.id]?.slug || null, seconds: v.length ? Math.round(v.length) : null, views: v.views ?? null, checked: new Date(now).toISOString() };
      if (v.type === 'reel') {
        try {
          const j = await graph(`${v.id}/video_insights`, { metric: REEL_METRICS.join(',') });
          for (const d of j.data || []) row[d.name] = d.values?.[0]?.value ?? null;
        } catch (e) { errors.push(`reel ${v.id}: ${e.message.slice(0, 120)}`); }
      }
      reels[v.id] = row;
    }
  } catch (e) { errors.push(`reels: ${e.message.slice(0, 160)}`); }
  const p = progress(days, { now });
  const recent = Object.entries(reels).filter(([, r]) => Date.parse(r.created) >= Date.parse(`${addDays(istDate(now), -7)}T00:00:00Z`));
  const out = {
    _about: 'Facebook Page SHYAM PREMI SKA: daily Page views and plays per Reel (scripts/fb-daily.mjs insights). days: Meta day (Pacific) -> metric values. reels: post id -> lifetime numbers. challenge.line = 30-day progress toward 1,000,000 views.',
    updated: new Date(now).toISOString(),
    challenge: p,
    last7: { reels: recent.length, plays: recent.reduce((a, [, r]) => a + (Number(r.fb_reels_total_plays ?? r.views) || 0), 0) },
    metrics: { page: PAGE_METRICS, reel: REEL_METRICS },
    days: Object.fromEntries(Object.entries(days).sort(([a], [b]) => a.localeCompare(b))),
    reels: Object.fromEntries(Object.entries(reels).sort(([, a], [, b]) => String(b.created).localeCompare(String(a.created)))),
    ...(errors.length ? { errors } : {}),
  };
  if (!dry) fs.writeFileSync(INSIGHTS, `${JSON.stringify(out, null, 1)}\n`);
  log(p.line);
  log(`last 7 days: ${out.last7.reels} Facebook video(s), ${fmt(out.last7.plays)} plays`);
  for (const e of errors) log(`::warning::insights ${e}`);
  return out;
}

// ---------------------------------------------------------------- share kit

/** Today's Facebook videos from published.md: [{ slug, url, at }] (scheduled time in IST decides the date). */
export function todaysVideos(text, date) {
  const out = [];
  for (const line of String(text).split(/\r?\n/)) {
    const m = line.match(/^- (\S+) \|.*?\bfb: (https:\/\/www\.facebook\.com\/\S+)(?: \(scheduled (\S+?)\))?/);
    if (!m) continue;
    const at = m[3] && !/already/.test(m[3]) ? m[3] : null;
    const day = at ? istDate(Date.parse(at)) : m[1].slice(0, 10);
    if (day === date && !out.some((x) => x.url === m[2])) out.push({ slug: m[1], url: m[2], at });
  }
  return out;
}

/** Groups for `date`: every group every second day (group i on days where (day + i) is even). */
export function groupsFor(groups, date) {
  return groups.filter((g, i) => (dayNo(date) + i) % 2 === 0);
}

const SHARE = {
  status: ['{name} के पावन अवसर पर यह छोटा सा स्टेटस वीडियो बनाया है, आप सबके साथ रख रहा हूँ 🙏 जय श्री श्याम', 'आप सबको {name} की बहुत-बहुत शुभकामनाएं 🙏 यह छोटा सा वीडियो इसी भाव से बनाया है।'],
  temple: ['आज {name} के दर्शन का यह छोटा सा वीडियो बनाया, मन को बहुत शांति मिली 🙏 आप भी दर्शन कीजिए। जय श्री श्याम', 'शाम की आरती के समय {name} के दर्शन 🙏 घर बैठे दर्शन करने वालों के लिए बनाया है।'],
  khatu: ['बाबा श्याम के दर्शन का यह छोटा सा वीडियो बनाया है 🙏 हारे का सहारा, बाबा श्याम हमारा।', 'आज शाम बाबा श्याम के दर्शन 🙏 घर बैठे दर्शन करने वाले भक्तों के लिए बनाया है। जय श्री श्याम'],
  day: ['आज के दिन के लिए यह छोटा सा भक्ति स्टेटस बनाया है 🙏 सबका दिन मंगलमय हो।'],
  movie: ['खाटू श्याम जी की कथा पर यह छोटी सी फ़िल्म बनाई है 🙏 बर्बरीक से बाबा श्याम तक की कथा। जय श्री श्याम'],
};

/** A ready-to-paste Hindi line for one video (personal, no asks). */
export function shareLine(spec, slug) {
  const name = spec ? hindiName(spec) : '';
  const cat = spec ? categoryOfText([spec.title, spec.youtube_title, spec.temple, spec.festival].join(' ').replace(/Shyam Premi SN/gi, '')) : null;
  const kind = /-movie-/.test(slug) || spec?.format === 'movie' ? 'movie' : spec?.day_status ? 'day'
    : spec?.format === 'status' || /-(status|eve|statusday)-/.test(slug) ? 'status' : cat?.[0] === 'khatu' ? 'khatu' : 'temple';
  const list = SHARE[kind].filter((t) => !t.includes('{name}') || name);
  const pick = (list.length ? list : SHARE.day)[dayNo(slug.slice(0, 10) || '2026-01-01') % (list.length || 1)];
  return pick.replace('{name}', name).replace('{bhaav}', cat?.[2]?.replace(' 🙏', '') || 'जय श्री श्याम').replace(/\s{2,}/g, ' ').trim();
}

export const ETIQUETTE = 'Group etiquette: har group ke rules pehle padhein aur unhi ke hisaab se post karein (kai groups mein admin approval lagta hai); link ke saath apni ek chhoti personal line zaroor likhein, sirf link mat daaliye. Ek group mein 2 din mein 1 se zyada share nahi.';

export function kitMarkdown({ date, videos, groups, progressLine }) {
  const L = [`# Facebook share kit: ${date}`, ''];
  if (progressLine) L.push(`Progress: ${progressLine}`, '');
  L.push('## Aaj ke Reels');
  if (!videos.length) L.push('', 'Aaj Facebook par koi Reel nahi mila (automation/published.md). Groups mein purana koi achha Reel share kar sakte hain.');
  videos.forEach((v, i) => L.push('', `${i + 1}. ${v.url}${v.at ? ` (live ${new Date(Date.parse(v.at) + IST).toISOString().slice(11, 16)} IST)` : ''}`, `   Share line (copy karein, apni ek line jod sakte hain):`, `   ${v.line}`));
  L.push('', `## Aaj ke groups (${groups.length}; har group 2 din mein ek baar)`, '');
  groups.forEach((g, i) => {
    const v = videos.length ? videos[i % videos.length] : null;
    L.push(`- [${g.name}](${g.url})${g.members ? ` · ${fmt(g.members)} members` : ''}${v ? ` → Reel ${videos.indexOf(v) + 1}` : ''}${g.note ? ` · ${g.note}` : ''}`);
  });
  L.push('', ETIQUETTE, '');
  return L.join('\n');
}

export async function shareKit({ date = istDate(), dry = false, send = true, log = console.log, progressLine = null } = {}) {
  const published = fs.existsSync(PUBLISHED) ? fs.readFileSync(PUBLISHED, 'utf8') : '';
  const specOf = (slug) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'story', 'published', `${slug}.json`), 'utf8')); } catch { return null; } };
  const videos = todaysVideos(published, date).slice(0, 2).map((v) => ({ ...v, line: shareLine(specOf(v.slug), v.slug) }));
  const all = JSON.parse(fs.readFileSync(GROUPS, 'utf8')).groups || [];
  const groups = groupsFor(all, date);
  if (!progressLine && fs.existsSync(INSIGHTS)) { try { progressLine = JSON.parse(fs.readFileSync(INSIGHTS, 'utf8')).challenge?.line; } catch { /* none */ } }
  const md = kitMarkdown({ date, videos, groups, progressLine });
  const file = path.join(KITS, `${date}.md`);
  if (dry) { log(md); return { file: null, videos, groups: groups.length }; }
  fs.mkdirSync(KITS, { recursive: true });
  fs.writeFileSync(file, md);
  log(`share kit: ${path.relative(ROOT, file)} (${videos.length} Reel(s), ${groups.length} group(s))`);
  const link = `${REPO}/automation/share-kit/${date}.md`;
  const steps = [];
  if (!send) log('email/CRM: skipped (--no-send)');
  else {
    if (!env.RESEND_API_KEY) { log('email: not sent (no RESEND_API_KEY secret); the kit is in the repo'); steps.push('gh secret set RESEND_API_KEY -R sk9836413/shyam-premi-sn'); }
    else {
      const html = `<pre style="font:15px/1.5 system-ui,sans-serif;white-space:pre-wrap">${md.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre>`;
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'Shyam Premi SN <newsletter@epifive.com>', to: (env.KIT_TO || 'epifive2@gmail.com').split(',').map((s) => s.trim()),
          subject: `Facebook share kit ${date}: ${videos.length} Reel(s), ${groups.length} groups`, html, text: md }),
        signal: AbortSignal.timeout(30e3),
      }).catch((e) => ({ ok: false, status: e.message }));
      log(`email to ${env.KIT_TO || 'epifive2@gmail.com'}: ${r.ok ? 'sent' : `failed (${r.status})`}`);
    }
    if (env.INGEST_TOKEN) {
      const r = await fetch(`${(env.CRM_URL || 'https://crm.epifive.com').replace(/\/$/, '')}/api/ingest/task`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Ingest-Token': env.INGEST_TOKEN },
        body: JSON.stringify({ title: 'Aaj ke Facebook Reels groups mein share karo', cadence: 'daily', role: 'manager', link,
          details: `${date}: ${videos.map((v) => v.url).join(' , ') || 'no Reel today'}\n${groups.length} groups, share lines and etiquette: ${link}` }),
        signal: AbortSignal.timeout(30e3),
      }).catch((e) => ({ ok: false, status: e.message }));
      log(`CRM task: ${r.ok ? 'added/updated' : `failed (${r.status})`}`);
    }
  }
  return { file, videos, groups: groups.length, ownerSteps: steps };
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
  const dry = args.includes('--dry');
  if (args[0] === 'insights') return insights({ dry });
  if (args[0] === 'share-kit') return shareKit({ date: opt('--date') || istDate(), dry, send: !args.includes('--no-send') });
  throw new Error('Usage: fb-daily.mjs insights | share-kit (see the header)');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((e) => console.log(`::warning::fb-daily: ${redact(e.message)}`));
}
