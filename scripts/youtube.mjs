#!/usr/bin/env node
// Uploads the day's story video to the Shyam Premi SN YouTube channel (a Short, or the daily long katha).
//
//   node scripts/youtube.mjs auth [--client <client_secret.json>]   one-time, on the PC (pick the Shyam Premi SN channel)
//   node scripts/youtube.mjs check
//   node scripts/youtube.mjs upload --video <mp4> --scenes story/today/scenes.json [--publish-at 19:00 | 2026-11-06T06:00] [--dry-run]
//   node scripts/youtube.mjs upload --long --video <mp4> --scenes story/long/scenes.json --meta <out/slug.json>
//        [--thumbnail <jpg>] [--publish-at 12:30]   regular video, chapters from --meta, scheduled at that IST time
//
// Quota (developers.google.com/youtube/v3/determine_quota_cost, updated 2026-10-15): videos.insert has its
// own bucket (100 calls a day, 1 per call). From the shared 10,000 units: playlists.list 1, playlistItems.insert
// 50, thumbnails.set 50, playlists.insert 50 (rare). A Short costs ~51 units and the long video ~101: about 200
// a day for Shyam, far under its 4,500 share of the Google project it shares with EpiFive.
// quotaExceeded / uploadLimitExceeded print {"status":"quota"} and exit 3, so the caller can retry later.
//
// Credentials: environment (GitHub secrets) or %USERPROFILE%\.shyampremisk\youtube.env:
// YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN. The OAuth client defaults to the one already
// set up on this PC (%USERPROFILE%\.epifive\youtube-client.json); only its id/secret are reused.
// Dormant override: SHYAM_YT_CLIENT_ID / SHYAM_YT_CLIENT_SECRET / SHYAM_YT_REFRESH_TOKEN, when all three are
// set, replace the YT_* values (for a separate Google project later; `auth --client <json>` makes them).
// Shorts also get their cover frame (the thumbnail-grade first frame, story/cover.mjs) as the custom thumbnail. Tested
// 6 Nov 2026 on a Short of this channel: thumbnails.set returns 200 and YouTube serves the image as hqdefault /
// maxresdefault (search results, the watch page, suggestions); the portrait Shorts-feed frame (oar2) stays YouTube's
// own pick, which is why the frame itself must be strong too. --no-cover-thumbnail turns it off.
// Prints one JSON line. Exit code 0 = done (or not configured), 1 = failure.
import { exec, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const ENV_FILE = path.join(os.homedir(), '.shyampremisk', 'youtube.env');
const DEFAULT_CLIENT = path.join(os.homedir(), '.epifive', 'youtube-client.json');
const KEYS = ['YT_CLIENT_ID', 'YT_CLIENT_SECRET', 'YT_REFRESH_TOKEN'];
// upload: post Shorts; readonly: stats; force-ssl: read and reply to comments; yt-analytics.readonly: watch-time and
// the search terms that bring viewers (scripts/trend-signals.mjs; until a re-auth it falls back to view counts).
const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.force-ssl',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
].join(' ');
const CATEGORY_PEOPLE_BLOGS = '22';

const args = process.argv.slice(2);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

function loadEnv() {
  const file = fs.existsSync(ENV_FILE)
    ? Object.fromEntries(fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]))
    : {};
  const env = { ...file, ...Object.fromEntries(KEYS.filter((k) => process.env[k]).map((k) => [k, process.env[k]])) };
  if (KEYS.every((k) => process.env[`SHYAM_${k}`])) KEYS.forEach((k) => { env[k] = process.env[`SHYAM_${k}`]; });
  return env;
}

async function json(res, what) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    const e = body.error;
    const reason = typeof e === 'object' ? e.errors?.[0]?.reason : undefined;
    const err = new Error(`${what}: ${(typeof e === 'object' ? e.message : body.error_description || e) || res.statusText} (HTTP ${res.status}${reason ? `, ${reason}` : ''})`);
    err.quota = /quotaExceeded|uploadLimitExceeded|dailyLimitExceeded/.test(`${reason} ${err.message}`);
    throw err;
  }
  return body;
}

async function accessToken(env) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({ client_id: env.YT_CLIENT_ID, client_secret: env.YT_CLIENT_SECRET, refresh_token: env.YT_REFRESH_TOKEN, grant_type: 'refresh_token' }),
  });
  return (await json(res, 'Token refresh')).access_token;
}

async function channel(token) {
  const res = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', { headers: { Authorization: `Bearer ${token}` } });
  const { items = [] } = await json(res, 'Channel lookup');
  return items[0] ? { id: items[0].id, title: items[0].snippet.title, handle: items[0].snippet.customUrl } : null;
}

// YouTube chapters: timestamps in the description, the first at 0:00.
const stamp = (sec) => {
  const t = Math.floor(sec);
  const [h, m, x] = [Math.floor(t / 3600), Math.floor((t % 3600) / 60), t % 60];
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`;
};

function metaFromScenes(file, metaFile) {
  const s = JSON.parse(fs.readFileSync(file, 'utf8'));
  const title = String(s.youtube_title || '').replace(/[<>]/g, '').trim();
  let description = String(s.youtube_description || '').replace(/[<>]/g, '').trim();
  if (metaFile) {
    const { chapters = [] } = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
    if (chapters.length >= 3) {
      description += `\n\nAdhyay (Chapters):\n${chapters.map((c, i) => `${stamp(i === 0 ? 0 : c.start)} ${c.title}`).join('\n')}`;
    }
  }
  const tags = String(s.youtube_tags || '').split(',').map((t) => t.replace(/[<>]/g, '').trim()).filter(Boolean);
  while (tags.join(',').length > 450) tags.pop();
  if (!title || title.length > 100) throw new Error(`youtube_title must be 1-100 characters (is ${title.length})`);
  return { title, description, tags };
}

// The long video (and the evening Short, made early) is uploaded private with publishAt (today at the given IST time); when that time is under
// 15 minutes away or already past, it is published straight away.
// "YYYY-MM-DDTHH:MM" (IST) sets another day, e.g. a festival status Short made the evening before for 06:00.
function publishAt(hhmm) {
  if (!hhmm) return null;
  const day = hhmm.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})$/);
  const [h, m] = (day ? day[4] : hhmm).split(':').map(Number);
  const ist = new Date(Date.now() + 5.5 * 3600e3);
  const at = (day ? Date.UTC(Number(day[1]), Number(day[2]) - 1, Number(day[3]), h, m)
    : Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), h, m)) - 5.5 * 3600e3;
  return at - Date.now() > 15 * 60e3 ? new Date(at).toISOString() : null;
}

async function upload(env, videoFile, meta, opts = {}) {
  const token = await accessToken(env);
  const data = fs.readFileSync(videoFile);
  const start = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Length': String(data.length),
      'X-Upload-Content-Type': 'video/mp4',
    },
    body: JSON.stringify({
      snippet: { title: meta.title, description: meta.description, tags: meta.tags, categoryId: CATEGORY_PEOPLE_BLOGS, defaultLanguage: 'hi', defaultAudioLanguage: 'hi' },
      // The visuals and voice are AI-generated, so the video carries YouTube's synthetic-content label.
      status: {
        ...(opts.publishAt ? { privacyStatus: 'private', publishAt: opts.publishAt } : { privacyStatus: 'public' }),
        selfDeclaredMadeForKids: false, embeddable: true, containsSyntheticMedia: true,
      },
    }),
  });
  if (!start.ok) await json(start, 'Upload session');
  const location = start.headers.get('location');
  if (!location) throw new Error('Upload session: no upload URL returned');
  const video = await json(await fetch(location, { method: 'PUT', headers: { 'Content-Type': 'video/mp4' }, body: data }), 'Video upload');
  return {
    id: video.id,
    url: opts.long ? `https://youtu.be/${video.id}` : `https://youtube.com/shorts/${video.id}`,
    privacy: video.status?.privacyStatus,
    ...(opts.publishAt ? { publishAt: opts.publishAt } : {}),
  };
}

// Custom thumbnails need a phone-verified channel; a failure is reported, never fatal.
async function setThumbnail(env, videoId, file) {
  const token = await accessToken(env);
  await json(await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/jpeg' }, body: fs.readFileSync(file),
  }), 'Thumbnail');
  return true;
}

// Each Short also goes into its deity's public playlist (created when missing), so a viewer who liked
// one katha finds the next one. Best effort: a failure is reported, not thrown.
async function addToPlaylist(env, videoId, title) {
  const token = await accessToken(env);
  const api = (url, init = {}) => fetch(`https://www.googleapis.com/youtube/v3/${url}`, {
    ...init, headers: { Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
  });
  const { items = [] } = await json(await api('playlists?part=snippet&mine=true&maxResults=50'), 'Playlist lookup');
  let id = items.find((p) => p.snippet.title === title)?.id;
  if (!id) {
    id = (await json(await api('playlists?part=snippet,status', {
      method: 'POST',
      body: JSON.stringify({ snippet: { title, description: `${title}: Shyam Premi SN ki kathayein. Jai Shree Shyam 🙏`, defaultLanguage: 'hi' }, status: { privacyStatus: 'public' } }),
    }), 'Playlist create')).id;
  }
  await json(await api('playlistItems?part=snippet', {
    method: 'POST', body: JSON.stringify({ snippet: { playlistId: id, resourceId: { kind: 'youtube#video', videoId } } }),
  }), 'Playlist add');
  return title;
}

async function auth(clientFile) {
  const raw = JSON.parse(fs.readFileSync(clientFile, 'utf8'));
  const client = raw.installed || raw.web;
  if (!client) throw new Error(`${clientFile} is not an OAuth client JSON`);
  const server = http.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const redirect = `http://127.0.0.1:${server.address().port}`;
  const url = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
    client_id: client.client_id, redirect_uri: redirect, response_type: 'code', scope: SCOPES,
    access_type: 'offline', prompt: 'consent select_account',
  })}`;
  exec(process.platform === 'win32' ? `start "" "${url}"` : `xdg-open "${url}"`);
  console.error('A browser window opened. Sign in and choose the Shyam Premi SN channel, then allow access.');
  const code = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('No response from the browser within 15 minutes')), 15 * 60 * 1000);
    server.on('request', (req, res) => {
      const q = new URL(req.url, redirect).searchParams;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(q.get('code') ? '<h2>YouTube connected. You can close this tab.</h2>' : `<h2>Failed: ${q.get('error') || 'no code'}</h2>`);
      clearTimeout(timer);
      q.get('code') ? resolve(q.get('code')) : reject(new Error(`Google returned: ${q.get('error') || 'no code'}`));
    });
  }).finally(() => server.close());
  const tokens = await json(await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({ code, client_id: client.client_id, client_secret: client.client_secret, redirect_uri: redirect, grant_type: 'authorization_code' }),
  }), 'Code exchange');
  if (!tokens.refresh_token) throw new Error('Google did not return a refresh token; run auth again');
  const ch = await channel(tokens.access_token);
  fs.mkdirSync(path.dirname(ENV_FILE), { recursive: true });
  fs.writeFileSync(ENV_FILE, `YT_CLIENT_ID=${client.client_id}\nYT_CLIENT_SECRET=${client.client_secret}\nYT_REFRESH_TOKEN=${tokens.refresh_token}\n`);
  return { status: 'ok', channel: ch, wrote: ENV_FILE };
}

// The Short's first frame (0.1 s, after the cover words are drawn) as a JPEG next to the video; null if ffmpeg fails.
function coverFrame(video) {
  const out = video.replace(/\.mp4$/i, '') + '-cover.jpg';
  if (fs.existsSync(out)) return out;
  const ff = process.env.FFMPEG_PATH || (fs.existsSync('E:/tools/ffmpeg/bin/ffmpeg.exe') ? 'E:/tools/ffmpeg/bin/ffmpeg.exe' : 'ffmpeg');
  const r = spawnSync(ff, ['-v', 'error', '-y', '-ss', '0.1', '-i', video, '-frames:v', '1', '-q:v', '3', out], { encoding: 'utf8' });
  return r.status === 0 && fs.existsSync(out) && fs.statSync(out).size < 2e6 ? out : null;
}

async function main() {
  const command = args[0];
  if (command === 'auth') return auth(option('--client') ?? DEFAULT_CLIENT);
  const env = loadEnv();
  if (!KEYS.every((k) => env[k])) return { status: 'not-configured', envFile: ENV_FILE };
  if (command === 'check') return { status: 'ok', channel: await channel(await accessToken(env)) };
  if (command === 'upload') {
    const video = option('--video');
    const scenes = option('--scenes');
    if (!video || !scenes) throw new Error('Usage: youtube.mjs upload --video <mp4> --scenes <scenes.json>');
    const long = args.includes('--long');
    if (long && !option('--meta')) throw new Error('--long needs --meta <out/slug.json> for the chapters');
    const meta = metaFromScenes(scenes, option('--meta'));
    const opts = { long, publishAt: publishAt(option('--publish-at')) };
    if (args.includes('--dry-run')) return { status: 'dry-run', ...meta, ...opts };
    let youtube;
    try {
      youtube = await upload(env, video, meta, opts);
    } catch (e) {
      if (!e.quota) throw e;
      process.exitCode = 3;
      return { status: 'quota', error: e.message };
    }
    let units = 52; // playlists.list 1 + playlistItems.insert 50 + token/misc; videos.insert uses its own bucket
    const thumb = option('--thumbnail') || (!long && !args.includes('--no-cover-thumbnail') ? coverFrame(video) : null);
    if (thumb) {
      units += 50;
      try { youtube.thumbnail = await setThumbnail(env, youtube.id, thumb); } catch (e) { youtube.thumbnailError = e.message; }
    }
    const playlist = JSON.parse(fs.readFileSync(scenes, 'utf8')).playlist;
    if (playlist) {
      try { youtube.playlist = await addToPlaylist(env, youtube.id, playlist); } catch (e) { youtube.playlistError = e.message; }
    }
    return { status: 'ok', youtube, units };
  }
  throw new Error('Usage: youtube.mjs auth|check|upload (see the top of this file)');
}

try {
  console.log(JSON.stringify(await main()));
} catch (e) {
  console.log(JSON.stringify({ status: 'error', error: e.message }));
  process.exitCode = 1;
}
