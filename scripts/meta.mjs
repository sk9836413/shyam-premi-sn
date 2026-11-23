#!/usr/bin/env node
// Publishes Shyam Premi SN videos to the Facebook Page "SHYAM PREMI SKA" and Instagram @khatushyampremisn directly
// through the Meta Graph API (never-expiring Page token). Node built-ins only.
//
//   node scripts/meta.mjs check                      read-only: the Page and the Instagram account
//   node scripts/meta.mjs short --video <mp4> --scenes <json> [--video-url <hosted mp4>] [--publish-at 19:00|YYYY-MM-DDTHH:MM]
//                              [--fb-at now|HH:MM|YYYY-MM-DDTHH:MM | --no-fb] [--ig-at YYYY-MM-DDTHH:MM] [--dry-run]
//   node scripts/meta.mjs long --video <mp4> --scenes <json> --meta <out/slug.json> [--thumbnail <jpg>] [--publish-at 12:30] [--no-fb] [--dry-run]
//   node scripts/meta.mjs flush [--log automation/published.md] [--dry-run]
//
// short  Facebook: a Reel when the video is vertical and 3-90 s (Meta's Reel limit), otherwise a normal Page video
//        (the 90-120 s Dadi aur Chhotu Short). Instagram: a Reel (the API takes 3 s to 15 min). Captions:
//        facebook_caption / instagram_caption. With --publish-at (IST, like youtube.mjs) at least 15 minutes ahead,
//        Facebook is SCHEDULED for that time and Instagram, which has no scheduled publishing, is queued: the line
//        "ig: pending <ISO>" goes into automation/published.md and `flush` publishes it from --video-url.
//        Facebook plan (scripts/fb.mjs; since 13 Nov 2026 every Short, 90 min apart): --fb-at gives Facebook its own
//        time ("now" = straight away) and --no-fb leaves Facebook out; Instagram keeps following --publish-at. Without
//        either flag Facebook follows --publish-at as before. The Facebook text is fbVideoCaption() (fb.mjs template)
//        plus, on regular Shorts, the samagri line (fbShortText; scripts/amazon.mjs withSamagri, no URL, not Instagram).
// long   The long katha video as a normal Facebook Page video (in-stream ads later), scheduled like YouTube:
//        youtube_title, the description with chapters, the Devanagari keywords and the AI disclaimer, and the same
//        Amazon.in section as YouTube (scripts/amazon.mjs; AMAZON_LINKS=off turns it off). No Instagram.
//        Page videos (long, movie parts, anything over 90 s) go up with the RESUMABLE chunked upload (fbVideoResumable;
//        one single POST of a 5-8 min video failed with 413 Request Entity Too Large). --dry-run shows the upload plan.
// flush  Publishes every queued Instagram Reel whose time is within 20 minutes (waits for it) and no more than
//        6 hours past; appends "- <slug> | instagram: <url | error ... | skipped ...>" (2 attempts at most).
//
// Trial Reels (Instagram): a spec with `ig_trial` ("SS_PERFORMANCE" | "MANUAL"; scripts/status-engine.mjs trialVariant)
//        is published as a Trial Reel: the container gets trial_params {graduation_strategy}, which the Graph API
//        documents for the standard (video_url) Reels upload only, so a trial Reel is always queued (--ig-at /
//        --publish-at) and published by `flush` from its hosted video_url; it goes to non-followers first.
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
import { capHashtags, fbLongText, fbVideoCaption, igHashtags } from './fb.mjs';
import { BHAJAN_LINE } from '../music/bhajan.mjs';
import { aiDisclosure, metaAiParam } from './ai-disclosure.mjs';
import { FB_MAX, withAmazon, withSamagri } from './amazon.mjs';

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

/** What goes where for a Short. fbAt: Facebook's own time (epoch ms), null = now, 'skip' = no Facebook; undefined = publishAt. */
export function planShort({ seconds, width, height, publishAt = null, fbAt, igAt: igOwn, now = Date.now() }) {
  const vertical = height > width;
  const fb = fbAt === 'skip' ? 'skip' : vertical && seconds >= MIN_SECONDS && seconds <= FB_REEL_MAX ? 'reel' : 'video';
  const ig = seconds >= MIN_SECONDS && seconds <= IG_REEL_MAX ? 'reel' : 'skip';
  const ahead = (t) => (t && t - now > LEAD_MS ? t : null);
  const at = ahead(publishAt);
  const fbTime = fbAt === undefined ? at : fbAt === 'skip' ? null : ahead(fbAt);
  for (const t of [at, fbTime]) if (t && t - now > 29 * 86400e3) throw new Error('publish time more than 29 days ahead');
  const unix = fbTime ? String(Math.floor(fbTime / 1000)) : null;
  const fbSchedule = !unix || fb === 'skip' ? {} : fb === 'reel' ? { video_state: 'SCHEDULED', scheduled_publish_time: unix } : { published: 'false', scheduled_publish_time: unix };
  // igOwn (--ig-at, epoch ms or null = now): Instagram's own queue time (the dawn bhajan Short: YouTube 05:45, IG 06:00)
  const igTime = igOwn === undefined ? at : ahead(igOwn);
  return { fb, ig, fbSchedule, igAt: ig === 'reel' && igTime ? new Date(igTime).toISOString() : null };
}

/** --fb-at value -> planShort's fbAt: 'skip' (--no-fb), null ('now' or a time already past), epoch ms, undefined (no flag). */
export function fbAtOption(value, noFb = false, now = Date.now()) {
  if (noFb || value === 'skip') return 'skip';
  if (value === undefined || value === null || value === '') return undefined;
  if (value === 'now') return null;
  return istAt(value, now - LEAD_MS - 1) ?? null;
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
  if (!/\bAI\b/.test(body.replace(BHAJAN_LINE, ''))) extra.push('', AI_LINE); // the bhajan line alone does not cover the pictures/voice
  return { title, description: [body, ...extra, ...(tags ? ['', tags] : [])].join('\n') };
}

/** The Facebook Page copy of a long video as posted: longPost, then fb.mjs fbLongText (no like/share/subscribe lines,
 *  the subject's 3 hashtags), then the same Amazon.in section as YouTube (scripts/amazon.mjs; never on Instagram). */
export function fbLongPost(spec, meta = {}, { env: e = process.env } = {}) {
  const post = longPost(spec, meta);
  post.description = withAmazon(fbLongText(post.description, spec), spec, { env: e });
  return post;
}

/** The Facebook text of a Short (Reel, or the Page video of a longer Short) as posted: fb.mjs fbVideoCaption, then the
 *  samagri line before its 3 hashtags (scripts/amazon.mjs withSamagri: no URL; regular Shorts only, never status, owner
 *  footage or sati; AMAZON_LINKS=off turns it off). Instagram (captions) never gets it. */
export function fbShortText(spec, { env: e = process.env } = {}) {
  const c = fbVideoCaption(spec);
  return { ...c, text: withSamagri(c.text, spec, { env: e, max: FB_MAX }) };
}

export function captions(spec) {
  const fallback = String(spec.youtube_description || spec.title || '').trim();
  return {
    facebook: String(spec.facebook_caption || fallback).trim(),
    // the Khatu Shyam tags only on Khatu Shyam content (fb.mjs igHashtags; owner, 13 Nov 2026)
    // at most 5 hashtags (fb.mjs capHashtags; research 20 Nov 2026: short, relevant captions)
    instagram: capHashtags(igHashtags(String(spec.instagram_caption || fallback).trim(), spec)).slice(0, 2200),
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
  const cell = (x) => (!x ? 'skipped' : x.skipped ? `skipped (${x.skipped})` : x.error ? `error ${x.error.slice(0, 120)}` : x.pending ? `pending ${x.pending}`
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

// Meta's AI label (is_ai_generated, Reels Publishing API finish step) when scripts/ai-disclosure.mjs says Meta requires
// it (AI voice, AI music or photorealistic AI video); `ai` = metaAiParam(spec), {} = no label.
async function fbReel(file, description, schedule, ai = { is_ai_generated: 'true' }) {
  const start = await graph('POST', `${env.META_PAGE_ID}/video_reels`, { upload_phase: 'start' });
  await rupload(start.upload_url || `https://rupload.facebook.com/video-upload/${VERSION}/${start.video_id}`, file);
  await graph('POST', `${env.META_PAGE_ID}/video_reels`, {
    upload_phase: 'finish', video_id: start.video_id, video_state: 'PUBLISHED', description, ...ai, ...schedule,
  });
  return { id: start.video_id, url: `https://www.facebook.com/reel/${start.video_id}`, type: 'reel', aiLabel: Boolean(ai.is_ai_generated) };
}

// A normal Page video: POST /{page}/videos has no AI-disclosure parameter (Graph API v27 reference, checked 20 Nov 2026),
// so the label is asked for afterwards on the video (is_ai_generated, the v27 edit field). Never fails the upload: a
// refusal is returned for the run log and the owner sets "AI info" in Meta Business Suite by hand.
export async function fbVideoAiLabel(id, ai, { post = graph } = {}) {
  if (!ai.is_ai_generated) return { aiLabel: false };
  try {
    await post('POST', id, { is_ai_generated: 'true' });
    return { aiLabel: true };
  } catch (e) {
    return { aiLabel: `not set by the API (${redact(e.message).slice(0, 120)}): add the AI label in Meta Business Suite` };
  }
}

// A normal Page video (the long katha, movie parts and other videos over the 90 s Reel limit), uploaded RESUMABLY in
// chunks (Graph API v27 POST /{page-id}/videos on graph-video.facebook.com: upload_phase start -> transfer ... ->
// finish, Page token). Until 13 Nov 2026 this was ONE multipart POST with the whole file as `source`, and every long
// video (7-9 Nov 2026, 5-8 min) failed with "POST /videos: Request Entity Too Large (code 413)". Now no request carries
// more than the chunk Facebook asks for (start_offset..end_offset of each answer). Meta's newer Resumable Upload API
// (POST /{app-id}/uploads -> fbuploader_video_file_chunk handle) needs the app id and a USER token, which this repo
// does not have (only the never-expiring Page token), so the Page-token chunked session is used.
export const FB_CHUNK_TRIES = 4; // per chunk (Facebook's own advice for error 6001 / 1363xxx: retry the same chunk)

/** One multipart POST to graph-video.facebook.com/<version>/<page>/videos (fields + optional Blob parts). */
async function videosPost(fields, blobs = {}) {
  const form = new FormData();
  form.append('access_token', TOKEN);
  for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== null) form.append(k, String(v));
  for (const [k, b] of Object.entries(blobs)) form.append(k, b.blob, b.name);
  const phase = fields.upload_phase || 'upload';
  const res = await fetch(`https://graph-video.facebook.com/${VERSION}/${env.META_PAGE_ID}/videos`, { method: 'POST', body: form, signal: AbortSignal.timeout(10 * 60000) })
    .catch((e) => { throw new GraphError(`POST /videos (${phase}): ${e.name === 'TimeoutError' ? 'timed out' : e.message}`); });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    const e = json.error || {};
    throw new GraphError(`POST /videos (${phase}): ${e.error_user_msg || e.message || res.statusText} (code ${e.code ?? res.status}${e.error_subcode ? `/${e.error_subcode}` : ''})`, e.code);
  }
  return json;
}

/** The resumable upload itself; `post(fields, blobs)` is videosPost (a fake in scripts/meta.test.mjs). */
export async function fbVideoResumable(file, { title, description, thumb, schedule = {} }, { post = videosPost, wait = sleep } = {}) {
  const size = fs.statSync(file).size;
  const start = await post({ upload_phase: 'start', file_size: size });
  const session = start.upload_session_id;
  if (!session || start.start_offset === undefined) throw new GraphError(`POST /videos (start): no upload session in the answer (${JSON.stringify(start).slice(0, 120)})`);
  let from = Number(start.start_offset);
  let to = Number(start.end_offset);
  let chunks = 0;
  const fd = fs.openSync(file, 'r');
  try {
    while (from < to) {
      const buf = Buffer.alloc(to - from);
      fs.readSync(fd, buf, 0, buf.length, from);
      let res;
      for (let i = 1; !res; i++) {
        try {
          res = await post({ upload_phase: 'transfer', upload_session_id: session, start_offset: from },
            { video_file_chunk: { blob: new Blob([buf], { type: 'application/octet-stream' }), name: `chunk-${from}` } });
        } catch (e) {
          if (i >= FB_CHUNK_TRIES || isAuthError(e.code)) {
            await post({ upload_phase: 'cancel', upload_session_id: session }).catch(() => {});
            throw new GraphError(`${e.message} at byte ${from} of ${size} (chunk ${chunks + 1}, try ${i}; upload session cancelled)`, e.code);
          }
          await wait(3000 * i);
        }
      }
      const next = Number(res.start_offset);
      if (!(next > from) || Number.isNaN(Number(res.end_offset))) {
        await post({ upload_phase: 'cancel', upload_session_id: session }).catch(() => {});
        throw new GraphError(`POST /videos (transfer): the upload did not move on from byte ${from} (${JSON.stringify(res).slice(0, 120)})`);
      }
      from = next;
      to = Number(res.end_offset);
      chunks++;
    }
  } finally {
    fs.closeSync(fd);
  }
  const blobs = thumb && fs.existsSync(thumb) ? { thumb: { blob: await fs.openAsBlob(thumb, { type: 'image/jpeg' }), name: path.basename(thumb) } } : {};
  const fin = await post({ upload_phase: 'finish', upload_session_id: session, ...(title ? { title } : {}), description, ...schedule }, blobs);
  if (fin.success === false) throw new GraphError(`POST /videos (finish): Facebook answered success=false (${JSON.stringify(fin).slice(0, 120)})`);
  const id = start.video_id || fin.video_id || fin.id;
  return { id, url: `https://www.facebook.com/${env.META_PAGE_ID}/videos/${id}`, type: 'video', bytes: size, chunks };
}

const fbVideo = (file, opts) => fbVideoResumable(file, opts);
const fbVideoLabelled = async (file, opts, ai) => {
  const fb = await fbVideo(file, opts);
  return { ...fb, ...(await fbVideoAiLabel(fb.id, ai)) };
};

// Instagram: create the container, poll status_code until FINISHED (15 s steps, 10 minutes), then media_publish.
// is_ai_generated on the container = Instagram's AI label (Content Publishing API, changelog 22 Jun 2026); `ai` =
// metaAiParam(spec) from scripts/ai-disclosure.mjs, {} = no label.
export const TRIAL_STRATEGIES = ['MANUAL', 'SS_PERFORMANCE'];
/** The Reels container parameters (trial: a graduation strategy of TRIAL_STRATEGIES = a Trial Reel). */
export function igReelParams(caption, { ai = { is_ai_generated: 'true' }, trial = null } = {}) {
  const params = { media_type: 'REELS', share_to_feed: 'true', caption, ...ai };
  if (trial) {
    if (!TRIAL_STRATEGIES.includes(trial)) throw new Error(`ig_trial must be one of ${TRIAL_STRATEGIES.join(', ')} (got ${trial})`);
    params.trial_params = JSON.stringify({ graduation_strategy: trial });
    delete params.share_to_feed; // a trial reel goes to non-followers first, not to the followers' feed
  }
  return params;
}
async function igReel(caption, { file, videoUrl, ai = { is_ai_generated: 'true' }, trial = null }) {
  if (!env.IG_USER_ID) throw new Error('IG_USER_ID not set');
  if (trial && !videoUrl) throw new Error('a Trial Reel needs a hosted video_url (standard upload)');
  const params = igReelParams(caption, { ai, trial });
  const resumable = file && !trial;
  const container = await graph('POST', `${env.IG_USER_ID}/media`, resumable ? { ...params, upload_type: 'resumable' } : { ...params, video_url: videoUrl });
  if (resumable) await rupload(container.uri, file);
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
  return { id, url: permalink || `https://www.instagram.com/khatushyampremisn/`, type: trial ? 'trial reel' : 'reel' };
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

async function shortUnsafe({ video, spec, videoUrl, publishAt, fbAt, igAt, noFb = false, dryRun = false }) {
  const info = probe(video);
  const plan = planShort({ ...info, publishAt: istAt(publishAt), fbAt: fbAtOption(fbAt, noFb), ...(igAt ? { igAt: istAt(igAt) } : {}) });
  const text = captions(spec);
  const fbText = fbShortText(spec);
  text.facebook = fbText.text;
  const ai = metaAiParam(spec);
  if (dryRun) return { status: 'dry-run', version: VERSION, video: info, plan, facebook_caption: fbText, chars: { facebook: text.facebook.length, instagram: text.instagram.length }, aiLabel: aiDisclosure(spec).why.meta };
  const r = { status: 'ok', slug: spec.slug, seconds: Math.round(info.seconds), aiLabel: Boolean(ai.is_ai_generated) };
  const errors = [];
  const attempt = async (key, fn) => {
    try { r[key] = await fn(); } catch (e) { r[key] = { error: redact(e.message) }; errors.push(e); }
  };
  const scheduled = plan.fbSchedule.scheduled_publish_time ? { scheduled: new Date(+plan.fbSchedule.scheduled_publish_time * 1000).toISOString() } : {};
  if (plan.fb === 'skip') r.facebook = { skipped: 'not in the Facebook plan' };
  else {
    await attempt('facebook', async () => (await orNull(fbExisting(text.facebook))) || ({
      ...(plan.fb === 'reel' ? await fbReel(video, text.facebook, plan.fbSchedule, ai) : await fbVideoLabelled(video, { title: spec.title, description: text.facebook, schedule: plan.fbSchedule }, ai)),
      ...scheduled,
    }));
  }
  const igDup = plan.ig === 'reel' && env.IG_USER_ID ? await orNull(igExisting(text.instagram)) : null;
  if (igDup) r.instagram = igDup;
  else if (plan.ig === 'reel' && env.IG_USER_ID) {
    if (plan.igAt) {
      if (!videoUrl) r.instagram = { error: 'no hosted video_url to publish from later' };
      else r.instagram = { pending: plan.igAt };
    } else await attempt('instagram', () => igReel(text.instagram, spec.ig_trial ? { videoUrl, ai, trial: spec.ig_trial } : { file: video, ai }));
  }
  if (errors.length) r.status = 'partial-failure';
  if (errors.length && errors.length === [r.facebook, r.instagram].filter((x) => x && !x.pending && !x.skipped).length && errors.some((e) => isAuthError(e.code))) r.authFailed = true;
  r.summary = summarize(r);
  return r;
}

async function postLong({ video, spec, meta, thumbnail, publishAt, noFb, dryRun }) {
  if (!configured()) return { status: 'not-configured' };
  if (noFb) return { status: 'ok', slug: spec.slug, facebook: { skipped: 'not in the Facebook plan' } };
  const post = fbLongPost(spec, meta);
  const at = istAt(publishAt);
  const schedule = at ? { published: 'false', scheduled_publish_time: String(Math.floor(at / 1000)) } : {};
  if (dryRun) {
    const bytes = fs.statSync(video).size;
    return { status: 'dry-run', version: VERSION, ...post, schedule, thumbnail: Boolean(thumbnail && fs.existsSync(thumbnail)), aiLabel: aiDisclosure(spec).why.meta,
      upload: { method: 'resumable', endpoint: `graph-video.facebook.com/${VERSION}/<page>/videos`, phases: ['start', 'transfer (chunks Facebook asks for)', 'finish'], bytes, mb: +(bytes / 1048576).toFixed(1) } };
  }
  try {
    const dup = await orNull(fbExisting(post.description, post.title));
    if (dup) return { status: 'ok', slug: spec.slug, facebook: dup };
    const fb = await fbVideoLabelled(video, { ...post, thumb: thumbnail, schedule }, metaAiParam(spec));
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
        const qspec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
        const caption = captions(qspec).instagram;
        const dup = await orNull(igExisting(caption));
        const reel = dup ? null : await igReel(caption, { videoUrl: `${env.MEDIA_URL}/m/${q.slug}.mp4`, ai: metaAiParam(qspec), trial: qspec.ig_trial || null });
        cell = dup ? `${dup.url} (already posted, not repeated)` : `${reel.url}${qspec.ig_trial ? ` (trial reel, ${qspec.ig_trial})` : ''}`;
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
    const noFb = args.includes('--no-fb');
    if (cmd === 'short') return postShort({ video, spec, videoUrl: opt('--video-url'), publishAt: opt('--publish-at'), fbAt: opt('--fb-at'), igAt: opt('--ig-at'), noFb, dryRun });
    const meta = opt('--meta') ? JSON.parse(fs.readFileSync(opt('--meta'), 'utf8')) : {};
    return postLong({ video, spec, meta, thumbnail: opt('--thumbnail'), publishAt: opt('--publish-at'), noFb, dryRun });
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
