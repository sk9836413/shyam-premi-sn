#!/usr/bin/env node
// Hosts the rendered video + thumbnail on the shyam-premi-media Worker (KV, kept 7 days), then publishes the Short to
// Facebook and Instagram: directly through the Meta Graph API (scripts/meta.mjs) when META_PAGE_ID/META_PAGE_TOKEN exist,
// otherwise (or when Meta rejects the token itself) via the Make scenario "Shyam Premi SN publisher" as before.
//   node scripts/publish.mjs --video <mp4> --scenes story/today/scenes.json [--publish-at 19:00] [--dry-run]
//   ... --host-only   only host the mp4 + jpg on the Worker (status videos: the download link for the description)
//   --publish-at      IST time YouTube publishes at: Facebook is scheduled for it, Instagram is queued (meta.mjs flush)
// Env: MEDIA_URL, MEDIA_TOKEN, META_PAGE_ID, META_PAGE_TOKEN, IG_USER_ID, MAKE_WEBHOOK_URL, MAKE_API_KEY (locally: %USERPROFILE%\.shyampremisk\
// make.env and media-token.txt). Prints one JSON line.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { configured as metaConfigured, postShort } from './meta.mjs';

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
  // 0.1 s = the cover frame (story/cover.mjs): thumbnail-grade, with the big Devanagari words.
  const r = spawnSync(FF, ['-y', '-loglevel', 'error', '-ss', '0.1', '-i', video, '-frames:v', '1', '-q:v', '3', thumb], { encoding: 'utf8' });
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
  const hostOnly = args.includes('--host-only');
  const direct = !hostOnly && metaConfigured();
  const publishAt = option('--publish-at');
  if (args.includes('--dry-run')) {
    return { status: 'dry-run', payload, ...(direct ? { meta: await postShort({ video, spec, videoUrl: payload.video_url, publishAt, dryRun: true }) } : {}) };
  }

  // With the Graph API the post is uploaded from the local file, so a hosting failure only affects a queued Instagram post.
  let hosted = true;
  try {
    await put(video, `${spec.slug}.mp4`);
    await put(thumb, `${spec.slug}.jpg`);
  } catch (e) {
    if (!direct) throw e;
    hosted = false;
    console.error(`::warning::${e.message}`);
  }
  if (hostOnly) return { status: 'hosted', video_url: payload.video_url, thumbnail_url: payload.thumbnail_url };
  if (direct) {
    const meta = await postShort({ video, spec, videoUrl: hosted ? payload.video_url : null, publishAt });
    if (meta.status !== 'ok') console.error(`::warning::Facebook/Instagram (Graph API): ${meta.summary || meta.error || meta.status}`);
    if (!meta.authFailed) return { status: meta.status, video_url: payload.video_url, summary: meta.summary, meta };
    console.error('::warning::Meta rejected the Page token; falling back to Make.');
  }
  if (!env.MAKE_WEBHOOK_URL) return { status: 'hosted-only', video_url: payload.video_url };

  const res = await fetch(env.MAKE_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-make-apikey': env.MAKE_API_KEY || '' },
    body: JSON.stringify(payload),
  });
  const text = (await res.text()).slice(0, 60);
  if (!res.ok) throw new Error(`Make webhook: HTTP ${res.status} ${text}`);
  return { status: 'ok', video_url: payload.video_url, summary: `via make (${res.status} ${text.trim()})`, make: `${res.status} ${text}` };
}

try {
  console.log(JSON.stringify(await main()));
} catch (e) {
  console.log(JSON.stringify({ status: 'error', error: e.message }));
  process.exitCode = 1;
}
