#!/usr/bin/env node
// Hosts the rendered video + thumbnail on the shyam-premi-media Worker (KV, kept 7 days), then sends
// the post to the Make scenario "Shyam Premi SN publisher" (Instagram + Facebook).
//   node scripts/publish.mjs --video <mp4> --scenes story/today/scenes.json [--dry-run]
// Env: MEDIA_URL, MEDIA_TOKEN, MAKE_WEBHOOK_URL, MAKE_API_KEY (locally: %USERPROFILE%\.shyampremisk\
// make.env and media-token.txt). Prints one JSON line.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const FF = process.env.FFMPEG_PATH || 'ffmpeg';
const DIR = path.join(os.homedir(), '.shyampremisk');

const args = process.argv.slice(2);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

const readEnv = (file) => (fs.existsSync(file)
  ? Object.fromEntries(fs.readFileSync(file, 'utf8').split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]))
  : {});
const tokenFile = path.join(DIR, 'media-token.txt');
const env = {
  MEDIA_URL: 'https://shyam-premi-media.sk9836413.workers.dev',
  ...(fs.existsSync(tokenFile) ? { MEDIA_TOKEN: fs.readFileSync(tokenFile, 'utf8').trim() } : {}),
  ...readEnv(path.join(DIR, 'make.env')),
  ...Object.fromEntries(Object.entries(process.env).filter(([, v]) => v)),
};

async function put(file, name) {
  const res = await fetch(`${env.MEDIA_URL}/m/${name}`, {
    method: 'PUT', headers: { Authorization: `Bearer ${env.MEDIA_TOKEN}` }, body: fs.readFileSync(file),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.url) throw new Error(`media upload ${name}: HTTP ${res.status}`);
  return j.url;
}

async function main() {
  const video = option('--video');
  const spec = JSON.parse(fs.readFileSync(option('--scenes'), 'utf8'));
  const thumb = path.join(os.tmpdir(), `${spec.slug}.jpg`);
  const r = spawnSync(FF, ['-y', '-loglevel', 'error', '-ss', '3', '-i', video, '-frames:v', '1', '-q:v', '3', thumb], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`thumbnail: ${r.stderr}`);

  const payload = {
    title: spec.title,
    youtube_title: spec.youtube_title,
    youtube_description: spec.youtube_description,
    youtube_tags: spec.youtube_tags,
    instagram_caption: spec.instagram_caption,
    facebook_caption: spec.facebook_caption,
    video_url: `${env.MEDIA_URL}/m/${spec.slug}.mp4`,
    thumbnail_url: `${env.MEDIA_URL}/m/${spec.slug}.jpg`,
  };
  if (args.includes('--dry-run')) return { status: 'dry-run', payload };

  await put(video, `${spec.slug}.mp4`);
  await put(thumb, `${spec.slug}.jpg`);
  if (!env.MAKE_WEBHOOK_URL) return { status: 'hosted-only', video_url: payload.video_url };

  const res = await fetch(env.MAKE_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-make-apikey': env.MAKE_API_KEY || '' },
    body: JSON.stringify(payload),
  });
  const text = (await res.text()).slice(0, 60);
  if (!res.ok) throw new Error(`Make webhook: HTTP ${res.status} ${text}`);
  return { status: 'ok', video_url: payload.video_url, make: `${res.status} ${text}` };
}

try {
  console.log(JSON.stringify(await main()));
} catch (e) {
  console.log(JSON.stringify({ status: 'error', error: e.message }));
  process.exitCode = 1;
}
