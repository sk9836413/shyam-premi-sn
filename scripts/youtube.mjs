#!/usr/bin/env node
// Uploads the day's story video to the Shyam Premi SN YouTube channel as a Short.
//
//   node scripts/youtube.mjs auth [--client <client_secret.json>]   one-time, on the PC (pick the Shyam Premi SN channel)
//   node scripts/youtube.mjs check
//   node scripts/youtube.mjs upload --video <mp4> --scenes story/today/scenes.json [--dry-run]
//
// Credentials: environment (GitHub secrets) or %USERPROFILE%\.shyampremisk\youtube.env:
// YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN. The OAuth client defaults to the one already
// set up on this PC (%USERPROFILE%\.epifive\youtube-client.json); only its id/secret are reused.
// Prints one JSON line. Exit code 0 = done (or not configured), 1 = failure.
import { exec } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const ENV_FILE = path.join(os.homedir(), '.shyampremisk', 'youtube.env');
const DEFAULT_CLIENT = path.join(os.homedir(), '.epifive', 'youtube-client.json');
const KEYS = ['YT_CLIENT_ID', 'YT_CLIENT_SECRET', 'YT_REFRESH_TOKEN'];
// upload: post Shorts; readonly: stats; force-ssl: read and reply to comments.
const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.force-ssl',
].join(' ');
const CATEGORY_PEOPLE_BLOGS = '22';

const args = process.argv.slice(2);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

function loadEnv() {
  const file = fs.existsSync(ENV_FILE)
    ? Object.fromEntries(fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]))
    : {};
  return { ...file, ...Object.fromEntries(KEYS.filter((k) => process.env[k]).map((k) => [k, process.env[k]])) };
}

async function json(res, what) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    const e = body.error;
    throw new Error(`${what}: ${(typeof e === 'object' ? e.message : body.error_description || e) || res.statusText} (HTTP ${res.status})`);
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

function metaFromScenes(file) {
  const s = JSON.parse(fs.readFileSync(file, 'utf8'));
  const title = String(s.youtube_title || '').replace(/[<>]/g, '').trim();
  const description = String(s.youtube_description || '').replace(/[<>]/g, '').trim();
  const tags = String(s.youtube_tags || '').split(',').map((t) => t.replace(/[<>]/g, '').trim()).filter(Boolean);
  while (tags.join(',').length > 450) tags.pop();
  if (!title || title.length > 100) throw new Error(`youtube_title must be 1-100 characters (is ${title.length})`);
  return { title, description, tags };
}

async function upload(env, videoFile, meta) {
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
      status: { privacyStatus: 'public', selfDeclaredMadeForKids: false, embeddable: true, containsSyntheticMedia: true },
    }),
  });
  if (!start.ok) await json(start, 'Upload session');
  const location = start.headers.get('location');
  if (!location) throw new Error('Upload session: no upload URL returned');
  const video = await json(await fetch(location, { method: 'PUT', headers: { 'Content-Type': 'video/mp4' }, body: data }), 'Video upload');
  return { id: video.id, url: `https://youtube.com/shorts/${video.id}`, privacy: video.status?.privacyStatus };
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
    const meta = metaFromScenes(scenes);
    if (args.includes('--dry-run')) return { status: 'dry-run', ...meta };
    return { status: 'ok', youtube: await upload(env, video, meta) };
  }
  throw new Error('Usage: youtube.mjs auth|check|upload (see the top of this file)');
}

try {
  console.log(JSON.stringify(await main()));
} catch (e) {
  console.log(JSON.stringify({ status: 'error', error: e.message }));
  process.exitCode = 1;
}
