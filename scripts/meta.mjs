#!/usr/bin/env node
// Publishes Shyam Premi SN videos to the Facebook Page "SHYAM PREMI SKA" and Instagram @khatushyampremisn directly
// through the Meta Graph API (never-expiring Page token). Node built-ins only.
//
//   node scripts/meta.mjs check                      read-only: the Page and the Instagram account
//   node scripts/meta.mjs short --video <mp4> --scenes <json> [--video-url <hosted mp4>] [--publish-at 19:00|YYYY-MM-DDTHH:MM] [--dry-run]
//   node scripts/meta.mjs long --video <mp4> --scenes <json> --meta <out/slug.json> [--thumbnail <jpg>] [--publish-at 12:30] [--dry-run]
//   node scripts/meta.mjs flush [--log automation/published.md] [--dry-run]
//
// short  Facebook: a Reel when the video is vertical and 3-90 s (Meta's Reel limit), otherwise a normal Page video
//        (the 90-120 s Dadi aur Chhotu Short). Instagram: a Reel (the API takes 3 s to 15 min). Captions:
//        facebook_caption / instagram_caption. With --publish-at (IST, like youtube.mjs) at least 15 minutes ahead,
//        Facebook is SCHEDULED for that time and Instagram, which has no scheduled publishing, is queued: the line
//        "ig: pending <ISO>" goes into automation/published.md and `flush` publishes it from --video-url.
// long   The long katha video as a normal Facebook Page video (in-stream ads later), scheduled like YouTube:
//        youtube_title, the description with chapters, the Devanagari keywords and the AI disclaimer. No Instagram.
// flush  Publishes every queued Instagram Reel whose time is within 20 minutes (waits for it) and no more than
//        6 hours past; appends "- <slug> | instagram: <url | error ... | skipped ...>" (2 attempts at most).
//
// Duplicates: short, long and flush first look for the same caption/title among the Page's Reels, videos and scheduled
//        posts and the Instagram media of the last 36 h; a hit is reported as "(already posted, not repeated)".
// Env (GitHub secrets) or %USERPROFILE%\.shyampremisk\social.env: META_PAGE_ID, META_PAGE_TOKEN, IG_USER_ID,
// optional META_API_VERSION (default v27.0); MEDIA_URL for flush. Tokens are never printed (public logs).
// Prints one JSON line. Exit 0 = done or not configured; 1 = a platform failed (result says which).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const FB_REEL_MAX = 90;
export const IG_REEL_MAX = 15 * 60;
const MIN_SECONDS = 3;
const LEAD_MS = 15 * 60e3; // youtube.mjs publishes straight away when the time is under 15 minutes away
const FLUSH_AHEAD_MS = 20 * 60e3;
const FLUSH_LATE_MS = 6 * 3600e3;
const AI_LINE = 'Chitra AI dwara banaye gaye hain (sanketik). Awaaz aur animation AI se.';

const readEnv = (file) => (fs.existsSync(file)
  ? Object.fromEntries(fs.readFileSync(file, 'utf8').split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]))
  : {});
const KEYS = ['META_PAGE_ID', 'META_PAGE_TOKEN', 'IG_USER_ID', 'META_API_VERSION', 'MEDIA_URL'];
const env = {
  MEDIA_URL: 'https://shyam-premi-media.sk9836413.workers.dev',
  ...readEnv(path.join(os.homedir(), '.shyampremisk', 'social.env')),
  ...Object.fromEntries(KEYS.filter((k) => process.env[k]).map((k) => [k, process.env[k]])),
};
const VERSION = env.META_API_VERSION || 'v27.0';
const API = `https://graph.facebook.com/${VERSION}`;
const TOKEN = env.META_PAGE_TOKEN;
export const configured = () => Boolean(TOKEN && env.META_PAGE_ID);
const redact = (s) => (TOKEN ? String(s ?? '').split(TOKEN).join('<token>') : String(s ?? ''));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class GraphError extends Error {
  constructor(message, code) { super(redact(message)); this.code = code; }
}
// 190 = invalid token, 102 = session, 10 and 200-299 = permission: the direct path cannot work at all.
export const isAuthError = (code) => code === 190 || code === 102 || code === 10 || (code >= 200 && code < 300);

// ---------------------------------------------------------------- pure helpers (unit-tested)

/** "19:00" (today, IST) or "YYYY-MM-DDTHH:MM" (IST) -> epoch ms, or null when under 15 minutes away or past. */
export function istAt(hhmm, now = Date.now()) {
  if (!hhmm) return null;
  const day = String(hhmm).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  const hm = day ? [day[4], day[5]] : String(hhmm).match(/^(\d{1,2}):(\d{2})$/)?.slice(1);
  if (!hm) throw new Error(`Bad --publish-at ${hhmm} (HH:MM or YYYY-MM-DDTHH:MM, IST)`);
  const ist = new Date(now + 5.5 * 3600e3);
  const at = (day ? Date.UTC(+day[1], +day[2] - 1, +day[3], +hm[0], +hm[1])
    : Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), +hm[0], +hm[1])) - 5.5 * 3600e3;
  return at - now > LEAD_MS ? at : null;
}

/** What goes where for a Short. */
export function planShort({ seconds, width, height, publishAt = null, now = Date.now() }) {
  const vertical = height > width;
  const fb = vertical && seconds >= MIN_SECONDS && seconds <= FB_REEL_MAX ? 'reel' : 'video';
  const ig = seconds >= MIN_SECONDS && seconds <= IG_REEL_MAX ? 'reel' : 'skip';
  const at = publishAt && publishAt - now > LEAD_MS ? publishAt : null;
  if (at && at - now > 29 * 86400e3) throw new Error('publish time more than 29 days ahead');
  const unix = at ? String(Math.floor(at / 1000)) : null;
  const fbSchedule = !unix ? {} : fb === 'reel' ? { video_state: 'SCHEDULED', scheduled_publish_time: unix } : { published: 'false', scheduled_publish_time: unix };
  return { fb, ig, fbSchedule, igAt: ig === 'reel' && at ? new Date(at).toISOString() : null };
}

/** Facebook Page video copy of the long katha: title, description (+ chapters, Devanagari keywords, AI line). */
export function longPost(spec, meta = {}) {
  const title = String(spec.youtube_title || spec.title || '').replace(/[<>]/g, '').trim().slice(0, 255);
  if (!title) throw new Error('scenes.json has no youtube_title/title');
  const lines = String(spec.youtube_description || spec.summary || '').replace(/[<>]/g, '').trim().split('\n');
  const tags = /^(#[\p{L}\p{N}_]+\s*)+$/u.test(lines.at(-1)?.trim() || '') ? lines.pop() : null;
  const extra = [];
  const chapters = meta.chapters || [];
  if (chapters.length >= 3) {
    const stamp = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
    extra.push('', 'Adhyay (Chapters):', ...chapters.map((c, i) => `${stamp(i === 0 ? 0 : c.start)} ${c.title}`));
  }
  const body = lines.join('\n');
  const hindi = String(spec.youtube_tags || '').split(',').map((t) => t.trim()).filter((t) => /[ऀ-ॿ]/.test(t) && !body.includes(t));
  if (hindi.length) extra.push('', hindi.join(' | '));
  if (!/\bAI\b/.test(body)) extra.push('', AI_LINE);
  return { title, description: [body, ...extra, ...(tags ? ['', tags] : [])].join('\n') };
}

export function captions(spec) {
  const fallback = String(spec.youtube_description || spec.title || '').trim();
  return {
    facebook: String(spec.facebook_caption || fallback).trim(),
    instagram: String(spec.instagram_caption || fallback).trim().slice(0, 2200),
  };
}

/** Queued Instagram posts in published.md: [{ slug, at, attempts }] not yet published or given up. */
export function igQueue(text) {
  const queue = new Map();
  for (const line of text.split(/\r?\n/)) {
    const pending = line.match(/^- (\S+) \|.*\big: pending (\S+?)(?:\s|\||$)/);
    if (pending) { queue.set(pending[1], { slug: pending[1], at: pending[2], attempts: 0 }); continue; }
    const done = line.match(/^- (\S+) \| instagram: (.*)$/);
    if (done && queue.has(done[1])) {
      if (done[2].startsWith('error') && queue.get(done[1]).attempts < 1) queue.get(done[1]).attempts++;
      else queue.delete(done[1]);
    }
  }
  return [...queue.values()];
}

/** Same post text? Case, spaces, emoji and punctuation ignored; the first 160 characters decide (unit-tested). */
export function sameText(a, b) {
  const n = (t) => String(t || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim().slice(0, 160);
  return n(a).length >= 12 && n(a) === n(b);
}

/** One-line summary for automation/published.md. */
export function summarize(r) {
  if (r.status === 'not-configured') return 'meta not configured';
  const cell = (x) => (!x ? 'skipped' : x.error ? `error ${x.error.slice(0, 120)}` : x.pending ? `pending ${x.pending}`
    : `${x.url || x.id}${x.duplicate ? ' (already posted, not repeated)' : x.scheduled ? ` (scheduled ${x.scheduled})` : ''}`);
  return `fb: ${cell(r.facebook)} | ig: ${cell(r.instagram)}`.replace(/\r?\n/g, ' ');
}

// ---------------------------------------------------------------- Graph API

async function graph(method, endpoint, params = {}, timeoutMs = 60000) {
  const body = new URLSearchParams({ ...params, access_token: TOKEN });
  const signal = AbortSignal.timeout(timeoutMs);
  const res = await (method === 'GET' ? fetch(`${API}/${endpoint}?${body}`, { signal }) : fetch(`${API}/${endpoint}`, { method, body, signal }))
    .catch((e) => { throw new GraphError(`${method} /${endpoint}: ${e.name === 'TimeoutError' ? 'timed out' : e.message}`); });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    const e = json.error || {};
    throw new GraphError(`${method} /${endpoint}: ${e.message || res.statusText} (code ${e.code ?? res.status}${e.error_subcode ? `/${e.error_subcode}` : ''})`, e.code);
  }
  return json;
}

// Reels / IG resumable upload of the local file in one chunk.
async function rupload(url, file) {
  const data = fs.readFileSync(file);
  const res = await fetch(url, {
    method: 'POST', headers: { Authorization: `OAuth ${TOKEN}`, offset: '0', file_size: String(data.length) }, body: data, signal: AbortSignal.timeout(10 * 60000),
  }).catch((e) => { throw new GraphError(`upload: ${e.message}`); });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false || json.error || json.debug_info) {
    throw new GraphError(`upload failed: ${json.error?.message || json.debug_info?.message || res.statusText}`, json.error?.code);
  }
}

async function fbReel(file, description, schedule) {
  const start = await graph('POST', `${env.META_PAGE_ID}/video_reels`, { upload_phase: 'start' });
  await rupload(start.upload_url || `https://rupload.facebook.com/video-upload/${VERSION}/${start.video_id}`, file);
  // The visuals and voices are AI-made, so the Reel carries Meta's AI label (as YouTube's synthetic-content flag).
  await graph('POST', `${env.META_PAGE_ID}/video_reels`, {
    upload_phase: 'finish', video_id: start.video_id, video_state: 'PUBLISHED', description, is_ai_generated: 'true', ...schedule,
  });
  return { id: start.video_id, url: `https://www.facebook.com/reel/${start.video_id}`, type: 'reel' };
}

// A normal Page video from the local file (non-resumable, one request, under 1 GB).
async function fbVideo(file, { title, description, thumb, schedule }) {
  const form = new FormData();
  form.append('access_token', TOKEN);
  if (title) form.append('title', title);
  form.append('description', description);
  for (const [k, v] of Object.entries(schedule || {})) form.append(k, v);
  form.append('source', await fs.openAsBlob(file, { type: 'video/mp4' }), path.basename(file));
  if (thumb && fs.existsSync(thumb)) form.append('thumb', await fs.openAsBlob(thumb, { type: 'image/jpeg' }), path.basename(thumb));
  const res = await fetch(`https://graph-video.facebook.com/${VERSION}/${env.META_PAGE_ID}/videos`, { method: 'POST', body: form, signal: AbortSignal.timeout(20 * 60000) })
    .catch((e) => { throw new GraphError(`POST /videos: ${e.name === 'TimeoutError' ? 'timed out' : e.message}`); });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error || !json.id) throw new GraphError(`POST /videos: ${json.error?.message || res.statusText} (code ${json.error?.code ?? res.status})`, json.error?.code);
  return { id: json.id, url: `https://www.facebook.com/${env.META_PAGE_ID}/videos/${json.id}`, type: 'video' };
}

// Instagram: create the container, poll status_code until FINISHED (15 s steps, 10 minutes), then media_publish.
async function igReel(caption, { file, videoUrl }) {
  if (!env.IG_USER_ID) throw new Error('IG_USER_ID not set');
  const params = { media_type: 'REELS', share_to_feed: 'true', caption };
  const container = await graph('POST', `${env.IG_USER_ID}/media`, file ? { ...params, upload_type: 'resumable' } : { ...params, video_url: videoUrl });
  if (file) await rupload(container.uri, file);
  const end = Date.now() + 10 * 60e3;
  for (;;) {
    const { status_code: code, status } = await graph('GET', container.id, { fields: 'status_code,status' });
    if (code === 'FINISHED') break;
    if (code === 'ERROR' || code === 'EXPIRED') throw new GraphError(`container ${code}${status ? ` (${status})` : ''}`);
    if (Date.now() > end) throw new GraphError('container not ready after 10 minutes');
    await sleep(15000);
  }
  const { id } = await graph('POST', `${env.IG_USER_ID}/media_publish`, { creation_id: container.id });
  const { permalink } = await graph('GET', id, { fields: 'permalink' }).catch(() => ({}));
  return { id, url: permalink || `https://www.instagram.com/khatushyampremisn/`, type: 'reel' };
}

// Duplicate guard (7 Nov 2026: the Diwali status Reel went to the Page twice, 18:48 and 19:32 IST): before posting,
// the Page's Reels, videos and scheduled posts and the Instagram media of the last 36 h are checked for the same
// caption/title; a hit is returned as {..., duplicate: true} and nothing is posted. A failed lookup posts as before.
const RECENT_MS = 36 * 3600e3;
export async function fbExisting(text, title) {
  const since = Date.now() - RECENT_MS;
  const fresh = (x) => !x.created_time || Date.parse(x.created_time) >= since;
  const [reels, videos, scheduled] = await Promise.all([
    graph('GET', `${env.META_PAGE_ID}/video_reels`, { fields: 'id,description,created_time', limit: '25' }).catch(() => ({ data: [] })),
    graph('GET', `${env.META_PAGE_ID}/videos`, { fields: 'id,title,description,created_time', limit: '25' }),
    graph('GET', `${env.META_PAGE_ID}/scheduled_posts`, { fields: 'id,message', limit: '50' }).catch(() => ({ data: [] })),
  ]);
  const hit = [...(reels.data || []), ...(videos.data || [])].filter(fresh)
    .find((v) => sameText(v.description, text) || (title && sameText(v.title, title)));
  if (hit) return { id: hit.id, url: `https://www.facebook.com/${env.META_PAGE_ID}/videos/${hit.id}`, duplicate: true };
  const post = (scheduled.data || []).find((p) => sameText(p.message, text));
  return post ? { id: post.id, url: `https://www.facebook.com/${post.id}`, scheduled: 'already scheduled', duplicate: true } : null;
}
export async function igExisting(caption) {
  if (!env.IG_USER_ID) return null;
  const { data = [] } = await graph('GET', `${env.IG_USER_ID}/media`, { fields: 'id,caption,timestamp,permalink', limit: '25' });
  const hit = data.find((m) => Date.parse(m.timestamp) >= Date.now() - RECENT_MS && sameText(m.caption, caption));
  return hit ? { id: hit.id, url: hit.permalink, type: 'reel', duplicate: true } : null;
}
const orNull = (p) => p.catch((e) => { console.error(`::warning::Meta duplicate check failed (${redact(e.message)}); posting`); return null; });

function probe(file) {
  const ffprobe = (process.env.FFMPEG_PATH || 'ffmpeg').replace(/ffmpeg(\.exe)?$/, (m) => m.replace('ffmpeg', 'ffprobe'));
  const r = spawnSync(ffprobe, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration', '-of', 'json', file], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffprobe: ${r.stderr || r.error?.message}`);
  const j = JSON.parse(r.stdout);
  return { seconds: Number(j.format.duration), width: j.streams[0].width, height: j.streams[0].height };
}

// ---------------------------------------------------------------- commands

/** Posts one Short; never throws. Used by publish.mjs and the status job. */
export async function postShort(opts) {
  if (!configured()) return { status: 'not-configured' };
  try {
    return await shortUnsafe(opts);
  } catch (e) {
    const error = redact(e.message);
    return { status: 'error', slug: opts.spec?.slug, error, summary: `meta error ${error.slice(0, 160)}` };
  }
}

async function shortUnsafe({ video, spec, videoUrl, publishAt, dryRun = false }) {
  const info = probe(video);
  const plan = planShort({ ...info, publishAt: istAt(publishAt) });
  const text = captions(spec);
  if (dryRun) return { status: 'dry-run', version: VERSION, video: info, plan, chars: { facebook: text.facebook.length, instagram: text.instagram.length } };
  const r = { status: 'ok', slug: spec.slug, seconds: Math.round(info.seconds) };
  const errors = [];
  const attempt = async (key, fn) => {
    try { r[key] = await fn(); } catch (e) { r[key] = { error: redact(e.message) }; errors.push(e); }
  };
  const scheduled = plan.fbSchedule.scheduled_publish_time ? { scheduled: new Date(+plan.fbSchedule.scheduled_publish_time * 1000).toISOString() } : {};
  await attempt('facebook', async () => (await orNull(fbExisting(text.facebook))) || ({
    ...(plan.fb === 'reel' ? await fbReel(video, text.facebook, plan.fbSchedule) : await fbVideo(video, { title: spec.title, description: text.facebook, schedule: plan.fbSchedule })),
    ...scheduled,
  }));
  const igDup = plan.ig === 'reel' && env.IG_USER_ID ? await orNull(igExisting(text.instagram)) : null;
  if (igDup) r.instagram = igDup;
  else if (plan.ig === 'reel' && env.IG_USER_ID) {
    if (plan.igAt) {
      if (!videoUrl) r.instagram = { error: 'no hosted video_url to publish from later' };
      else r.instagram = { pending: plan.igAt };
    } else await attempt('instagram', () => igReel(text.instagram, { file: video }));
  }
  if (errors.length) r.status = 'partial-failure';
  if (errors.length && errors.length === [r.facebook, r.instagram].filter((x) => x && !x.pending).length && errors.some((e) => isAuthError(e.code))) r.authFailed = true;
  r.summary = summarize(r);
  return r;
}

async function postLong({ video, spec, meta, thumbnail, publishAt, dryRun }) {
  if (!configured()) return { status: 'not-configured' };
  const post = longPost(spec, meta);
  const at = istAt(publishAt);
  const schedule = at ? { published: 'false', scheduled_publish_time: String(Math.floor(at / 1000)) } : {};
  if (dryRun) return { status: 'dry-run', version: VERSION, ...post, schedule, thumbnail: Boolean(thumbnail && fs.existsSync(thumbnail)) };
  try {
    const dup = await orNull(fbExisting(post.description, post.title));
    if (dup) return { status: 'ok', slug: spec.slug, facebook: dup };
    const fb = await fbVideo(video, { ...post, thumb: thumbnail, schedule });
    return { status: 'ok', slug: spec.slug, facebook: { ...fb, ...(at ? { scheduled: new Date(at).toISOString() } : {}) } };
  } catch (e) {
    return { status: 'error', slug: spec.slug, error: redact(e.message), ...(isAuthError(e.code) ? { authFailed: true } : {}) };
  }
}

async function flush({ log, dryRun }) {
  if (!configured()) return { status: 'not-configured' };
  if (!fs.existsSync(log)) return { status: 'ok', published: [] };
  const now = Date.now();
  const due = igQueue(fs.readFileSync(log, 'utf8')).filter((q) => Date.parse(q.at) - now <= FLUSH_AHEAD_MS);
  const results = [];
  for (const q of due) {
    const late = Date.now() - Date.parse(q.at);
    let cell;
    if (late > FLUSH_LATE_MS) cell = `skipped (missed the ${q.at} slot by ${Math.round(late / 3600e3)} h)`;
    else if (dryRun) cell = `dry-run (would publish at ${q.at})`;
    else {
      const specFile = path.join('story', 'published', `${q.slug}.json`);
      try {
        if (!fs.existsSync(specFile)) throw new Error(`${specFile} missing`);
        const wait = Date.parse(q.at) - Date.now();
        if (wait > 0) await sleep(wait);
        const caption = captions(JSON.parse(fs.readFileSync(specFile, 'utf8'))).instagram;
        const dup = await orNull(igExisting(caption));
        cell = dup ? `${dup.url} (already posted, not repeated)` : (await igReel(caption, { videoUrl: `${env.MEDIA_URL}/m/${q.slug}.mp4` })).url;
      } catch (e) {
        cell = `error ${redact(e.message).slice(0, 160)}`;
      }
    }
    results.push({ slug: q.slug, at: q.at, instagram: cell });
    if (!dryRun) fs.appendFileSync(log, `- ${q.slug} | instagram: ${cell}`.replace(/\r?\n/g, ' ') + '\n');
  }
  return { status: results.some((r) => r.instagram.startsWith('error')) ? 'partial-failure' : 'ok', published: results };
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
  const dryRun = args.includes('--dry-run');
  const cmd = args[0];
  if (cmd === 'check') {
    if (!configured()) return { status: 'not-configured' };
    const page = await graph('GET', env.META_PAGE_ID, { fields: 'name,followers_count' });
    const ig = env.IG_USER_ID ? await graph('GET', env.IG_USER_ID, { fields: 'username,followers_count' }) : null;
    const limit = env.IG_USER_ID ? await graph('GET', `${env.IG_USER_ID}/content_publishing_limit`, { fields: 'quota_usage,config' }).catch(() => null) : null;
    return { status: 'ok', version: VERSION, page: { name: page.name, followers: page.followers_count }, instagram: ig && { username: ig.username, followers: ig.followers_count, published_24h: limit?.data?.[0]?.quota_usage } };
  }
  if (cmd === 'short' || cmd === 'long') {
    const video = opt('--video');
    const spec = JSON.parse(fs.readFileSync(opt('--scenes'), 'utf8'));
    if (!video || !fs.existsSync(video)) throw new Error(`video not found: ${video}`);
    if (cmd === 'short') return postShort({ video, spec, videoUrl: opt('--video-url'), publishAt: opt('--publish-at'), dryRun });
    const meta = opt('--meta') ? JSON.parse(fs.readFileSync(opt('--meta'), 'utf8')) : {};
    return postLong({ video, spec, meta, thumbnail: opt('--thumbnail'), publishAt: opt('--publish-at'), dryRun });
  }
  if (cmd === 'flush') return flush({ log: opt('--log') || 'automation/published.md', dryRun });
  throw new Error('Usage: meta.mjs check | short ... | long ... | flush (see the header)');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const r = await main();
    console.log(JSON.stringify(r));
    if (r.status === 'error' || r.status === 'partial-failure') process.exitCode = 1;
  } catch (e) {
    console.log(JSON.stringify({ status: 'error', error: redact(e.message) }));
    process.exitCode = 1;
  }
}
