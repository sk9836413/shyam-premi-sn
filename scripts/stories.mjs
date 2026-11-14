#!/usr/bin/env node
// Daily Facebook Page Stories and Instagram Stories for Shyam Premi SN (owner, 13 Nov 2026: "Facebook or Instagram me
// story bhi dal sakte ho"). Stories reach the existing followers (Page ~1,015, @khatushyampremisn ~1,393) and add
// engagement signals. Repo variable STORIES=on turns it on (.github/workflows/stories.yml, called from daily.yml and
// photos.yml on their existing triggers: no cron of its own).
//
// Daily plan (IST), at most CAP = 4 stories per platform per day, ONE story per run and at least MIN_GAP between two:
//   morning   06:45-12:00  photo post 1 as a 9:16 story card: the morning darshan (real temple photo, credited on the
//                          card) or, on a festival day, the festival greeting card. Header "आज के दर्शन 🙏" / "आज का पर्व 🙏"
//   video     07:30-23:30  the day's best Short as a video story, cut to VIDEO_MAX s, once it is public on YouTube:
//                          festival status Short > bhajan Short / eve status > morning Short > evening Short. A better
//                          Short that day-plan expects later is waited for (status until 12:00, bhajan/eve until 21:30).
//                          A dawn bhajan morning (05:45 bhajan Short): that bhajan from 06:30, the morning card 07:00+.
//   festival  10:40-19:00  festival days with a second greeting card (Chhath 14-16 Nov: photo post 2 or 3): that card
//   evening   19:30-23:30  photo post 4: the Sandhya aarti darshan of Khatu Shyam ji (sheesh only; AI picture labelled
//                          on the card) or the evening festival card. Header "संध्या आरती दर्शन 🪔" / "शुभ संध्या 🙏"
// DAWN BHAJAN MORNING (owner, 14 Nov 2026: "Bhajan subah subah hi bajate h log"): when a bhajan Short is public by 07:00
// (the 05:45 dawn bhajan, scripts/day-plan.mjs DAWN), the video story IS that bhajan Short, from DAWN_VIDEO_FROM (06:30;
// in practice the first trigger after it, the 06:47 IST poll), and the morning card moves to DAWN_CARD_FROM (07:00) so
// the bhajan goes first. While day-plan expects a dawn bhajan that is not on YouTube yet, both wait until 07:30, then
// the normal order applies (the bhajan was not made: the morning run makes it, and the usual pick takes over).
// The story cards REUSE the photo-post cards already hosted on the media Worker (photo-<date>-<n>-1.jpg: credits and the
// "AI चित्र (सांकेतिक)" tag are on the card itself) inside a 1080x1920 frame drawn by the photo-cards Chrome renderer,
// with a Hindi-first header (stories have no caption through the API). No links, no engagement bait, no other brand.
//
// API (Graph v27; docs: developers.facebook.com/docs/page-stories-api, /docs/instagram-platform/content-publishing,
// /docs/instagram-platform/instagram-graph-api/reference/ig-user/media):
//   Facebook photo story: POST /{page}/photos {url, published:false} -> photo_id; POST /{page}/photo_stories {photo_id}
//   Facebook video story: POST /{page}/video_stories {upload_phase:start} -> rupload the bytes -> {upload_phase:finish}
//   Instagram story: POST /{ig}/media {media_type:STORIES, image_url | video_url} -> status_code FINISHED -> media_publish
//   Limits: video 3-60 s (both), 9:16, IG image JPEG <= 8 MB, IG video <= 100 MB; no link/poll stickers via the API.
//
// Dedupe (the photo-post style: a state file per date, automation/stories/<date>.json): before posting, the story's
// platforms are CLAIMED and the state pushed (a rejected push = another run won: nothing is posted); afterwards the
// result is pushed. A claim older than CLAIM_STALE without a result (a crashed run) is first checked against the
// platform's own story list since the claim: found = recorded as posted, else one more attempt (MAX_ATTEMPTS).
//
//   node scripts/stories.mjs due [--date D] [--only key]     what is due now (JSON; GITHUB_OUTPUT due=, video=)
//   node scripts/stories.mjs run [--dry-run [--all]] [--push] [--only key] [--date D]   make and post the next due story
//                            (--dry-run --all: render/cut every story of the day now, post nothing, write no state)
//   node scripts/stories.mjs plan [--date D]                  the day's story plan with times and sources (no network)
//   node scripts/stories.mjs probe                            live check of the token and endpoints, publishes NOTHING
// Env: META_PAGE_ID, META_PAGE_TOKEN, IG_USER_ID, META_API_VERSION, MEDIA_URL, MEDIA_TOKEN, GITHUB_RUN_ID (else
// ~/.shyampremisk/social.env and media-token.txt). Tokens are never printed.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { esc, renderCards } from './photo-cards.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATE = path.join(ROOT, 'automation', 'stories');
const WORK = process.env.STORIES_WORK || path.join(os.tmpdir(), 'sps-stories'); // rendered stories (CI: the run's artifact)

export const CAP = 4; // stories per platform per IST day
export const VIDEO_MAX = 59; // seconds; Facebook and Instagram video stories stop at 60 s
export const MIN_GAP = 25 * 60e3; // between two stories of the same day
export const CLAIM_STALE = 20 * 60e3;
export const MAX_ATTEMPTS = 2; // per story and platform
export const SW = 1080;
export const SH = 1920;
export const DAWN_VIDEO_FROM = '06:30';
export const DAWN_CARD_FROM = '07:00';
const DAWN_PUBLIC_BY = '07:00'; // a bhajan Short public by then is the dawn bhajan
const DAWN_WAIT_UNTIL = '07:30'; // an expected dawn bhajan not on YouTube by then: back to the normal plan

// ---------------------------------------------------------------- env

const readEnv = (file) => (fs.existsSync(file)
  ? Object.fromEntries(fs.readFileSync(file, 'utf8').split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]))
  : {});
const KEYS = ['META_PAGE_ID', 'META_PAGE_TOKEN', 'IG_USER_ID', 'META_API_VERSION', 'MEDIA_URL', 'MEDIA_TOKEN'];
const env = {
  MEDIA_URL: 'https://shyam-premi-media.sk9836413.workers.dev',
  ...readEnv(path.join(os.homedir(), '.shyampremisk', 'social.env')),
  ...Object.fromEntries(KEYS.filter((k) => process.env[k]).map((k) => [k, process.env[k]])),
};
if (!env.MEDIA_TOKEN) {
  const f = path.join(os.homedir(), '.shyampremisk', 'media-token.txt');
  if (fs.existsSync(f)) env.MEDIA_TOKEN = fs.readFileSync(f, 'utf8').trim();
}
const VERSION = env.META_API_VERSION || 'v27.0';
const API = `https://graph.facebook.com/${VERSION}`;
const redact = (s) => [env.META_PAGE_TOKEN, env.MEDIA_TOKEN].filter(Boolean).reduce((t, k) => t.split(k).join('<token>'), String(s ?? ''));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const configured = () => Boolean(env.META_PAGE_TOKEN && env.META_PAGE_ID);

// ---------------------------------------------------------------- time (IST)

const IST = 5.5 * 3600e3;
export const istDate = (now = Date.now()) => new Date(now + IST).toISOString().slice(0, 10);
export const istAt = (date, hm) => Date.parse(`${date}T${hm}:00Z`) - IST;
const hm = (ms) => new Date(ms + IST).toISOString().slice(11, 16);

// ---------------------------------------------------------------- the day's plan (pure, unit-tested)

/** Tier of a published Short by its slug "<date>-<slot>-..." (lower = better); null = never a story. */
export function tierOf(slug) {
  const slot = String(slug).replace(/^\d{4}-\d{2}-\d{2}-/, '').split('-')[0];
  if (/-geet$/.test(slug) || slot === 'bhajan') return 2; // Chhath bhajan Shorts (bhajan slot or a morning/evening bhajan)
  return { status: 1, statusday: 1, eve: 2, morning: 3, evening: 4 }[slot] ?? null; // long/noon/kalyug/movie/jukebox/mantra: no
}

/** Today's public Shorts from automation/published.md: [{slug, tier, public (ms)}], best first. */
export function shortsOf(pubText, date) {
  const out = new Map();
  for (const line of String(pubText).split(/\r?\n/)) {
    const m = line.match(/^- (\S+) \| youtube: https?:\/\/\S+(?: \(public at ([^)]+)\))?/);
    if (!m || !m[1].startsWith(`${date}-`)) continue;
    const tier = tierOf(m[1]);
    if (!tier) continue;
    let at = Date.parse(`${date}T00:00:00Z`) - IST; // no "(public at" = public on upload
    if (m[2]) {
      const iso = Date.parse(m[2]);
      const t = m[2].match(/^(\d{1,2}):(\d{2}) IST$/);
      at = Number.isFinite(iso) && /T/.test(m[2]) ? iso : t ? istAt(date, `${t[1].padStart(2, '0')}:${t[2]}`) : at;
    }
    out.set(m[1], { slug: m[1], tier, public: at, ...(m[2] ? { scheduled: true } : {}) });
  }
  return [...out.values()].sort((a, b) => a.tier - b.tier || a.public - b.public);
}

/** The dawn bhajan Short of the day (a bhajan Short public by 07:00 IST), or null. shorts = shortsOf(...). */
export const isBhajanSlug = (slug) => /-geet$/.test(slug) || String(slug).replace(/^\d{4}-\d{2}-\d{2}-/, '').startsWith('bhajan-');
export function dawnShort(shorts, date) {
  return shorts.filter((x) => isBhajanSlug(x.slug) && x.scheduled && x.public <= istAt(date, DAWN_PUBLIC_BY)).sort((a, b) => a.public - b.public)[0] || null;
}

/** Better Shorts day-plan still expects today: [{tier, until}] (status until 12:00, bhajan/eve until 21:30). */
export function expectedTiers(uploads = [], date) {
  const t = [];
  for (const u of uploads) {
    if (u.slot === 'status' || u.slot === 'statusday') t.push({ tier: 1, until: istAt(date, '12:00') });
    else if (u.kind === 'bhajan' || u.slot === 'bhajan' || u.slot === 'eve') t.push({ tier: 2, until: istAt(date, '21:30') });
  }
  return t;
}

/** The video story's Short: the best one public by `now`, unless a better one is still expected. */
export function pickShort(shorts, expected, now) {
  const live = shorts.filter((s) => s.public <= now);
  if (!live.length) return null;
  const best = live[0];
  return expected.some((e) => e.tier < best.tier && now < e.until) ? null : best;
}

const HEAD = {
  darshan: ['आज के दर्शन 🙏', 'Jai Shree Shyam'],
  festival: ['आज का पर्व 🙏', 'Jai Shree Shyam'],
  aarti: ['संध्या आरती दर्शन 🪔', 'Jai Shree Shyam'],
  eveningFestival: ['शुभ संध्या 🙏', 'Jai Shree Shyam'],
};

/**
 * The day's stories in time order: [{key, type, from, until, image?, slug?, head?}].
 * photos = automation/photos/<date>.json (or null), pubText = automation/published.md, uploads = day-plan uploads.
 */
export function dayPlan({ date, photos, pubText = '', uploads = [], now = Date.now() }) {
  const post = (n) => photos?.posts?.find((p) => p.n === n && p.images?.length);
  const list = [];
  const p1 = post(1);
  const shorts = shortsOf(pubText, date);
  // the dawn bhajan (05:45) goes first: the video story at 06:30, the morning card after it (see the header)
  const dawn = dawnShort(shorts, date);
  const dawnWait = !dawn && uploads.some((u) => u.dawn && u.kind === 'bhajan' && u.slot !== 'long') && now < istAt(date, DAWN_WAIT_UNTIL);
  const cardFrom = dawn || dawnWait ? DAWN_CARD_FROM : '06:45';
  if (p1) list.push({ key: 'morning', type: 'image', from: istAt(date, cardFrom), until: istAt(date, '12:00'), image: p1.images[0], post: 1, head: p1.kind === 'festival' ? HEAD.festival : HEAD.darshan });
  if (dawn) {
    list.push({ key: 'video', type: 'video', from: Math.max(dawn.public, istAt(date, DAWN_VIDEO_FROM)), until: istAt(date, '23:30'), slug: dawn.slug, ready: true, dawn: true });
  } else {
    const s = pickShort(shorts, expectedTiers(uploads, date), now);
    const anyShort = shorts[0];
    if (s || anyShort) {
      const pick = s || anyShort;
      list.push({ key: 'video', type: 'video', from: Math.max(pick.public, istAt(date, '07:30')), until: istAt(date, '23:30'), slug: pick.slug, ready: Boolean(s) && !dawnWait });
    }
  }
  const fest = [2, 3].map(post).find((p) => p && p.kind === 'festival');
  if (fest) list.push({ key: 'festival', type: 'image', from: istAt(date, '10:40'), until: istAt(date, '19:00'), image: fest.images[0], post: fest.n, head: HEAD.festival });
  const p4 = post(4);
  if (p4) list.push({ key: 'evening', type: 'image', from: istAt(date, '19:30'), until: istAt(date, '23:30'), image: p4.images[0], post: 4, head: p4.kind === 'aarti' ? HEAD.aarti : HEAD.eveningFestival });
  return list.sort((a, b) => a.from - b.from).slice(0, CAP);
}

const PLATFORMS = ['fb', 'ig'];
const posted = (x) => Boolean(x && (x.id || x.recovered));

/** Posts of `platform` counted against the cap: posted ones and live claims. */
export function used(state, platform, now = Date.now()) {
  return (state?.stories || []).filter((s) => posted(s[platform]) || (s[platform]?.claim && now - Date.parse(s[platform].claim.at) < CLAIM_STALE)).length;
}

/** What a platform still needs for a story: 'post' | 'recover' (stale claim) | null (done, given up, busy). */
export function platformNeed(rec, now = Date.now()) {
  if (!rec) return 'post';
  if (posted(rec) || rec.skipped || rec.gaveUp) return null;
  if (rec.claim) return now - Date.parse(rec.claim.at) < CLAIM_STALE ? null : 'recover';
  return (rec.attempts || 0) < MAX_ATTEMPTS ? 'post' : null;
}

/**
 * The one story to post now (or null) and why: due = inside its window, its source ready, a platform still needs it,
 * the platform's cap not reached, and at least MIN_GAP since the last story of the day.
 */
export function nextDue({ plan, state, now = Date.now(), only = null }) {
  const stories = state?.stories || [];
  const last = Math.max(0, ...stories.flatMap((s) => PLATFORMS.map((p) => Date.parse(s[p]?.at || s[p]?.claim?.at || 0) || 0)));
  const notes = [];
  for (const item of plan) {
    if (only && item.key !== only) continue;
    const rec = stories.find((s) => s.key === item.key);
    const need = Object.fromEntries(PLATFORMS.map((p) => [p, platformNeed(rec?.[p], now)]));
    const open = PLATFORMS.filter((p) => need[p] && (need[p] === 'recover' || used(state, p, now) < CAP));
    if (!open.length) { notes.push(`${item.key}: done`); continue; }
    if (now < item.from) { notes.push(`${item.key}: at ${hm(item.from)} IST`); continue; }
    if (now > item.until) { notes.push(`${item.key}: window closed ${hm(item.until)} IST`); continue; }
    if (item.type === 'video' && !item.ready) { notes.push(`${item.key}: waiting for a better Short`); continue; }
    if (!only && now - last < MIN_GAP) { notes.push(`${item.key}: due, after the ${Math.round(MIN_GAP / 60e3)}-min gap`); return { item: null, platforms: [], notes }; }
    return { item, platforms: open, need, notes };
  }
  return { item: null, platforms: [], notes };
}

// ---------------------------------------------------------------- story card (9:16 frame around the photo-post card)

const FONTS = path.join(ROOT, 'brand', 'fonts');
const fileUrl = (f) => pathToFileURL(path.resolve(f)).href;
const EMOJI = "'Noto Color Emoji','Segoe UI Emoji','Apple Color Emoji'";

/** HTML of a 1080x1920 story: blurred card background, Hindi-first header in Instagram's safe zone, the card below. */
export function storyHtml({ image, head }) {
  const [line1, line2] = head;
  return `<!doctype html><html lang="hi"><head><meta charset="utf-8"><style>
@font-face{font-family:'Yatra';src:url('${fileUrl(path.join(FONTS, 'YatraOne-Regular.ttf'))}')}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${SW}px;height:${SH}px;overflow:hidden;background:#1a0800}
.bg{position:absolute;inset:-60px;width:${SW + 120}px;height:${SH + 120}px;object-fit:cover;filter:blur(34px) brightness(.42) saturate(1.2)}
.head{position:absolute;left:40px;right:40px;top:236px;text-align:center}
.l1{font-family:'Yatra',${EMOJI},sans-serif;font-size:82px;line-height:1.15;color:#FFD54A;white-space:nowrap;
  text-shadow:0 0 18px rgba(255,140,0,.5),0 4px 0 #5a1f00,0 8px 22px rgba(0,0,0,.8)}
.l2{font-family:Arial,sans-serif;font-size:42px;letter-spacing:2px;color:#fff;margin-top:8px;text-shadow:0 2px 10px #000}
.card{position:absolute;left:66px;top:452px;width:948px;height:1185px;border:5px solid #FFD54A;border-radius:28px;overflow:hidden;
  box-shadow:0 0 40px rgba(255,170,0,.4),0 12px 40px rgba(0,0,0,.7)}
.card img{width:100%;height:100%;object-fit:cover;display:block}
</style></head><body><img class="bg" src="${fileUrl(image)}">
<div class="head fit"><div class="l1">${esc(line1)}</div><div class="l2">${esc(line2)}</div></div>
<div class="card"><img src="${fileUrl(image)}"></div></body></html>`;
}

// ---------------------------------------------------------------- state and git

const statePath = (date) => path.join(STATE, `${date}.json`);
export const readState = (date) => (fs.existsSync(statePath(date)) ? JSON.parse(fs.readFileSync(statePath(date), 'utf8')) : { date, stories: [] });
function writeState(st) {
  fs.mkdirSync(STATE, { recursive: true });
  fs.writeFileSync(statePath(st.date), `${JSON.stringify(st, null, 2)}\n`);
}
const git = (...a) => spawnSync('git', a, { cwd: ROOT, encoding: 'utf8' });

/** Commits automation/stories and pushes (pull --rebase, 4 tries). false = could not push (another run won). */
function save(st, msg, push) {
  writeState(st);
  if (!push) return true;
  git('add', path.relative(ROOT, STATE));
  if (git('diff', '--cached', '--quiet').status !== 0) {
    git('-c', 'user.name=shyam-premi-bot', '-c', 'user.email=41898282+github-actions[bot]@users.noreply.github.com', 'commit', '-qm', msg);
  }
  for (let i = 1; i <= 4; i++) {
    const pull = git('pull', '-q', '--rebase', 'origin', 'main');
    if (pull.status !== 0) { git('rebase', '--abort'); return false; } // the same state file changed elsewhere: lost the race
    if (git('push', '-q', 'origin', 'HEAD:main').status === 0) return true;
    spawnSync(process.platform === 'win32' ? 'timeout' : 'sleep', [String(5 * i)]);
  }
  return false;
}

// ---------------------------------------------------------------- Graph API, hosting, media

async function graph(method, endpoint, params = {}, timeoutMs = 90000) {
  const body = new URLSearchParams({ ...params, access_token: env.META_PAGE_TOKEN });
  const signal = AbortSignal.timeout(timeoutMs);
  const res = await (method === 'GET' ? fetch(`${API}/${endpoint}?${body}`, { signal }) : fetch(`${API}/${endpoint}`, { method, body, signal }))
    .catch((e) => { throw new Error(redact(`${method} /${endpoint}: ${e.message}`)); });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) throw new Error(redact(`${method} /${endpoint}: ${json.error?.error_user_msg || json.error?.message || res.statusText} (code ${json.error?.code ?? res.status}${json.error?.error_subcode ? `/${json.error.error_subcode}` : ''})`));
  return json;
}

async function host(file, name, type) {
  if (!env.MEDIA_TOKEN) throw new Error('no MEDIA_TOKEN for the media Worker');
  const r = await fetch(`${env.MEDIA_URL}/m/${name}`, { method: 'PUT', headers: { Authorization: `Bearer ${env.MEDIA_TOKEN}`, 'Content-Type': type }, body: fs.readFileSync(file), signal: AbortSignal.timeout(120e3) });
  if (!r.ok) throw new Error(`media upload ${name}: HTTP ${r.status}`);
  return (await r.json()).url || `${env.MEDIA_URL}/m/${name}`;
}

async function download(url, file) {
  const r = await fetch(url, { signal: AbortSignal.timeout(180e3) });
  if (!r.ok) throw new Error(`download ${url.replace(/^.*\/m\//, '/m/')}: HTTP ${r.status}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  return file;
}

const ffbin = (name) => (process.env.FFMPEG_PATH || 'ffmpeg').replace(/ffmpeg(\.exe)?$/, (m) => m.replace('ffmpeg', name));
function probe(file) {
  const r = spawnSync(ffbin('ffprobe'), ['-v', 'error', '-show_entries', 'stream=codec_type,width,height:format=duration', '-of', 'json', file], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffprobe: ${(r.stderr || r.error?.message || '').slice(0, 200)}`);
  const j = JSON.parse(r.stdout);
  const v = j.streams.find((s) => s.codec_type === 'video');
  return { seconds: Number(j.format.duration), width: v?.width, height: v?.height, audio: j.streams.some((s) => s.codec_type === 'audio') };
}

/** ffmpeg arguments for the story copy: 1080x1920, 30 fps, H.264 closed GOP, AAC 48 kHz stereo, at most VIDEO_MAX s. */
export function storyVideoArgs(input, output, { seconds, audio = true }) {
  const cut = seconds > VIDEO_MAX;
  const len = Math.min(seconds, VIDEO_MAX);
  const vf = `scale=${SW}:${SH}:force_original_aspect_ratio=decrease,pad=${SW}:${SH}:(ow-iw)/2:(oh-ih)/2:color=black,fps=30,format=yuv420p${cut ? `,fade=t=out:st=${(len - 1.2).toFixed(2)}:d=1.2` : ''}`;
  const a = audio ? ['-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-ac', '2', ...(cut ? ['-af', `afade=t=out:st=${(len - 2).toFixed(2)}:d=2`] : [])] : ['-an'];
  return ['-y', '-v', 'error', '-i', input, '-t', String(len), '-vf', vf, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-profile:v', 'high',
    '-g', '60', '-keyint_min', '60', '-sc_threshold', '0', ...a, '-movflags', '+faststart', output];
}

// Facebook ----------------------------------------------------------------
async function fbPhotoStory(imageUrl) {
  const photo = await graph('POST', `${env.META_PAGE_ID}/photos`, { url: imageUrl, published: 'false' });
  const r = await graph('POST', `${env.META_PAGE_ID}/photo_stories`, { photo_id: photo.id });
  if (r.success === false) throw new Error('photo_stories answered success=false');
  return { id: r.post_id || photo.id };
}

async function fbVideoStory(file) {
  const start = await graph('POST', `${env.META_PAGE_ID}/video_stories`, { upload_phase: 'start' });
  const data = fs.readFileSync(file);
  const up = await fetch(start.upload_url || `https://rupload.facebook.com/video-upload/${VERSION}/${start.video_id}`, {
    method: 'POST', headers: { Authorization: `OAuth ${env.META_PAGE_TOKEN}`, offset: '0', file_size: String(data.length) }, body: data, signal: AbortSignal.timeout(10 * 60e3),
  }).catch((e) => { throw new Error(redact(`video story upload: ${e.message}`)); });
  const uj = await up.json().catch(() => ({}));
  if (!up.ok || uj.success === false || uj.error) throw new Error(redact(`video story upload: ${uj.error?.message || uj.debug_info?.message || up.statusText}`));
  // The Shorts are AI-made (pictures, voice), so the story carries Meta's AI label like the Reels do.
  const r = await graph('POST', `${env.META_PAGE_ID}/video_stories`, { upload_phase: 'finish', video_id: start.video_id, is_ai_generated: 'true' }, 180000);
  if (r.success === false) throw new Error('video_stories finish answered success=false');
  return { id: r.post_id || start.video_id };
}

// Instagram ---------------------------------------------------------------
async function igContainer(params, waitMs) {
  if (!env.IG_USER_ID) throw new Error('IG_USER_ID not set');
  const c = await graph('POST', `${env.IG_USER_ID}/media`, { media_type: 'STORIES', ...params });
  const end = Date.now() + waitMs;
  for (;;) {
    const { status_code: code, status } = await graph('GET', c.id, { fields: 'status_code,status' });
    if (code === 'FINISHED') return c.id;
    if (code === 'ERROR' || code === 'EXPIRED') throw new Error(`story container ${code}${status ? ` (${status})` : ''}`);
    if (Date.now() > end) throw new Error(`story container not ready after ${Math.round(waitMs / 60e3)} min`);
    await sleep(params.video_url ? 15000 : 5000);
  }
}
async function igStory(params) {
  const id = await igContainer(params, params.video_url ? 8 * 60e3 : 3 * 60e3);
  const r = await graph('POST', `${env.IG_USER_ID}/media_publish`, { creation_id: id });
  return { id: r.id };
}

/** A story of this media type on the platform since `since` (ms)? For a claim whose run died before writing the result. */
async function storySince(platform, type, since) {
  if (platform === 'fb') {
    const { data = [] } = await graph('GET', `${env.META_PAGE_ID}/stories`, { since: String(Math.floor(since / 1000)), limit: '25' });
    const hit = data.find((s) => Number(s.creation_time) * 1000 >= since - 60e3 && String(s.media_type).toLowerCase() === (type === 'video' ? 'video' : 'photo'));
    return hit ? { id: hit.post_id } : null;
  }
  const { data = [] } = await graph('GET', `${env.IG_USER_ID}/stories`, { fields: 'id,media_type,timestamp', limit: '25' });
  const hit = data.find((s) => Date.parse(s.timestamp) >= since - 60e3 && String(s.media_type).toUpperCase() === (type === 'video' ? 'VIDEO' : 'IMAGE'));
  return hit ? { id: hit.id } : null;
}

// ---------------------------------------------------------------- inputs and commands

function inputs(date) {
  const photosFile = path.join(ROOT, 'automation', 'photos', `${date}.json`);
  const photos = fs.existsSync(photosFile) ? JSON.parse(fs.readFileSync(photosFile, 'utf8')) : null;
  const pubFile = path.join(ROOT, 'automation', 'published.md');
  const pubText = fs.existsSync(pubFile) ? fs.readFileSync(pubFile, 'utf8') : '';
  return { photos, pubText };
}
async function uploadsOf(date) {
  try {
    const dp = await import('./day-plan.mjs');
    return dp.planDay(date, dp.loadInputs(ROOT)).uploads || [];
  } catch (e) {
    console.error(`::warning::day-plan unavailable (${e.message}); the video story takes the best Short already public`);
    return [];
  }
}
async function planFor(date, now) {
  const { photos, pubText } = inputs(date);
  return dayPlan({ date, photos, pubText, uploads: await uploadsOf(date), now });
}

/** Renders (image) or cuts (video) the story file; returns {file, url?, info?}. */
async function makeMedia(item, date, dryRun) {
  const dir = path.join(WORK, date);
  fs.mkdirSync(dir, { recursive: true });
  if (item.type === 'image') {
    const src = await download(item.image, path.join(dir, `${item.key}-source.jpg`));
    const file = path.join(dir, `story-${date}-${item.key}.jpg`);
    const [r] = await renderCards([{ html: storyHtml({ image: src, head: item.head }), file, width: SW, height: SH }]);
    if (r.overflow) console.log(`::warning::${item.key}: the header overflows the story card`);
    return { file, url: dryRun ? null : await host(file, `story-${date}-${item.key}.jpg`, 'image/jpeg') };
  }
  const src = await download(`${env.MEDIA_URL}/m/${item.slug}.mp4`, path.join(dir, 'video-source.mp4'));
  const info = probe(src);
  if (!(info.height > info.width)) throw new Error(`${item.slug} is not vertical (${info.width}x${info.height})`);
  if (info.seconds < 3) throw new Error(`${item.slug} is under 3 s`);
  const file = path.join(dir, `story-${date}-video.mp4`);
  const r = spawnSync(ffbin('ffmpeg'), storyVideoArgs(src, file, info), { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffmpeg: ${(r.stderr || r.error?.message || '').slice(-300)}`);
  const out = probe(file);
  return { file, info: { source: Math.round(info.seconds), story: Math.round(out.seconds * 10) / 10 }, url: dryRun ? null : await host(file, `story-${date}-video.mp4`, 'video/mp4') };
}

async function postOne(platform, item, media) {
  if (platform === 'fb') return item.type === 'image' ? fbPhotoStory(media.url) : fbVideoStory(media.file);
  return igStory(item.type === 'image' ? { image_url: media.url } : { video_url: media.url });
}

export async function run({ date = istDate(), now = Date.now(), dryRun = false, all = false, push = false, only = null, log = console.log } = {}) {
  if (!dryRun && !configured()) return { status: 'not-configured' };
  if (push) git('pull', '-q', '--rebase', 'origin', 'main');
  const plan = await planFor(date, now);
  if (dryRun && all) { // test: make every story of the day now (no posting, no state), whatever the time
    const made = [];
    for (const it of plan) {
      const m = await makeMedia(it.type === 'video' ? { ...it, ready: true } : it, date, true).catch((e) => ({ error: redact(e.message).slice(0, 200) }));
      made.push({ key: it.key, type: it.type, at: `${hm(it.from)}-${hm(it.until)} IST`, source: it.image || it.slug, head: it.head?.join(' | '), ...(m.error ? { error: m.error } : { file: m.file, video: m.info || undefined }) });
    }
    return { status: made.some((x) => x.error) ? 'error' : 'dry-run', date, work: WORK, stories: made };
  }
  let state = readState(date);
  const { item, platforms, need, notes } = nextDue({ plan, state, now, only });
  if (!item) return { status: 'ok', date, posted: null, notes };
  const runId = `${process.env.GITHUB_RUN_ID || 'local'}.${process.env.GITHUB_RUN_ATTEMPT || 1}`;
  let rec = state.stories.find((s) => s.key === item.key);
  if (!dryRun) {
    if (!rec) { rec = { key: item.key, type: item.type, source: item.image || item.slug }; state.stories.push(rec); }
    // stale claims: did the dead run post it after all?
    for (const p of platforms.filter((x) => need[x] === 'recover')) {
      const at = Date.parse(rec[p].claim.at);
      const hit = await storySince(p, item.type, at).catch(() => null);
      rec[p] = hit ? { ...hit, recovered: true, at: rec[p].claim.at } : { attempts: (rec[p].attempts || 0) + 1, error: 'run ended before the result was saved' };
    }
    const go = platforms.filter((p) => platformNeed(rec[p], now) === 'post' && used(state, p, now) < CAP);
    if (!go.length) { save(state, `Stories ${date}: ${item.key} recovered`, push); return { status: 'ok', date, posted: null, recovered: item.key, notes }; }
    for (const p of go) rec[p] = { ...(rec[p] || {}), claim: { run: runId, at: new Date(now).toISOString() } };
    if (!save(state, `Stories ${date}: claim ${item.key}`, push)) return { status: 'ok', date, posted: null, notes: [...notes, `${item.key}: claim not pushed (another run is posting it)`] };
    state = readState(date);
    rec = state.stories.find((s) => s.key === item.key);
    if (go.some((p) => rec?.[p]?.claim?.run !== runId)) return { status: 'ok', date, posted: null, notes: [...notes, `${item.key}: claimed by another run`] };
    platforms.splice(0, platforms.length, ...go);
  }
  let media;
  try {
    media = await makeMedia(item, date, dryRun);
  } catch (e) {
    const error = redact(e.message).slice(0, 200);
    if (dryRun) return { status: 'error', date, story: item.key, error };
    for (const p of platforms) rec[p] = { attempts: (rec[p]?.attempts || 0) + 1, error };
    save(state, `Stories ${date}: ${item.key} failed`, push);
    log(`::warning::story ${item.key}: ${error}`);
    return { status: 'error', date, story: item.key, error };
  }
  if (dryRun) {
    return { status: 'dry-run', date, story: { ...item, from: hm(item.from), until: hm(item.until) }, platforms, file: path.relative(ROOT, media.file), video: media.info || null, notes };
  }
  const result = {};
  for (const p of platforms) {
    try {
      const r = await postOne(p, item, media);
      rec[p] = { id: r.id, at: new Date().toISOString() };
    } catch (e) {
      const attempts = (rec[p]?.attempts || 0) + 1;
      rec[p] = { attempts, error: redact(e.message).slice(0, 200), ...(attempts >= MAX_ATTEMPTS ? { gaveUp: true } : {}) };
      log(`::warning::${p === 'fb' ? 'Facebook' : 'Instagram'} story ${item.key}: ${rec[p].error}`);
    }
    result[p] = rec[p];
  }
  if (media.info) rec.seconds = media.info;
  rec.media = media.url;
  save(state, `Stories ${date}: ${item.key}`, push);
  return { status: Object.values(result).some((x) => x.error) ? 'partial-failure' : 'ok', date, posted: item.key, result, notes };
}

/** Live check that publishes nothing: token scopes, story lists, an unpublished Page photo (deleted again), an
 *  Instagram STORIES container that is never published (it expires after 24 h), a video_stories upload session start. */
async function probeLive() {
  if (!configured()) return { status: 'not-configured' };
  const out = { version: VERSION };
  const step = async (name, fn) => { try { out[name] = await fn(); } catch (e) { out[name] = { error: redact(e.message).slice(0, 220) }; } };
  await step('scopes', async () => {
    const { data = {} } = await graph('GET', 'debug_token', { input_token: env.META_PAGE_TOKEN });
    const need = ['pages_manage_posts', 'pages_read_engagement', 'pages_show_list', 'instagram_basic', 'instagram_content_publish'];
    return { type: data.type, valid: data.is_valid, expires: data.expires_at === 0 ? 'never' : data.expires_at, missing: need.filter((s) => !(data.scopes || []).includes(s)) };
  });
  await step('fbStoriesList', async () => ({ ok: Array.isArray((await graph('GET', `${env.META_PAGE_ID}/stories`, { limit: '1' })).data) }));
  await step('igStoriesList', async () => ({ ok: Array.isArray((await graph('GET', `${env.IG_USER_ID}/stories`, { fields: 'id', limit: '1' })).data) }));
  const date = istDate();
  const img = await (async () => {
    const dir = path.join(WORK, 'probe');
    const src = path.join(ROOT, 'brand', 'logo-original.jpg');
    const file = path.join(dir, 'story-probe.jpg');
    const [r] = await renderCards([{ html: storyHtml({ image: src, head: HEAD.darshan }), file, width: SW, height: SH }]);
    return { file: r.file, url: await host(r.file, `story-probe-${date}.jpg`, 'image/jpeg') };
  })().catch((e) => ({ error: redact(e.message) }));
  out.probeImage = img.url ? 'hosted' : img;
  if (img.url) {
    await step('fbPhotoUnpublished', async () => {
      const photo = await graph('POST', `${env.META_PAGE_ID}/photos`, { url: img.url, published: 'false' });
      const del = await graph('DELETE', photo.id).catch((e) => ({ error: redact(e.message).slice(0, 120) }));
      return { ok: Boolean(photo.id), deleted: del.success === true || del.error || del };
    });
    await step('igStoryContainer', async () => ({ ok: Boolean(await igContainer({ image_url: img.url }, 2 * 60e3)), published: false }));
  }
  await step('fbVideoStorySession', async () => {
    const s = await graph('POST', `${env.META_PAGE_ID}/video_stories`, { upload_phase: 'start' });
    return { ok: Boolean(s.video_id), uploadUrl: Boolean(s.upload_url), finished: false };
  });
  await step('igPublishingLimit', async () => (await graph('GET', `${env.IG_USER_ID}/content_publishing_limit`, { fields: 'quota_usage,config' })).data?.[0]);
  const failed = Object.entries(out).filter(([, v]) => v && v.error).map(([k]) => k);
  return { status: failed.length || out.scopes?.missing?.length ? 'error' : 'ok', failed, ...out };
}

async function main() {
  const argv = process.argv.slice(2);
  const opt = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
  const flag = (n) => argv.includes(`--${n}`);
  const cmd = argv[0];
  const date = opt('date') || istDate();
  const now = opt('now') ? Date.parse(opt('now')) : Date.now();
  if (cmd === 'plan') {
    const plan = await planFor(date, now);
    return { date, stories: plan.map((x) => ({ key: x.key, type: x.type, from: hm(x.from), until: hm(x.until), source: x.image || x.slug, ...(x.type === 'video' ? { ready: x.ready } : {}), head: x.head?.join(' | ') })) };
  }
  if (cmd === 'due') {
    const plan = await planFor(date, now);
    const d = nextDue({ plan, state: readState(date), now, only: opt('only') || null });
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `due=${d.item?.key || ''}\nvideo=${d.item?.type === 'video' ? 1 : ''}\n`);
    return { date, due: d.item?.key || null, platforms: d.platforms, notes: d.notes };
  }
  if (cmd === 'run') return run({ date, now, dryRun: flag('dry-run'), all: flag('all'), push: flag('push'), only: opt('only') || null });
  if (cmd === 'probe') return probeLive();
  throw new Error('Usage: stories.mjs plan | due | run | probe (see the header)');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const r = await main();
    console.log(JSON.stringify(r, null, 1));
    if (r?.status === 'error') process.exitCode = 1;
  } catch (e) {
    console.log(JSON.stringify({ status: 'error', error: redact(e.message) }));
    process.exitCode = 1;
  }
}
