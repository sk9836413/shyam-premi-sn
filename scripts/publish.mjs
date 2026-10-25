#!/usr/bin/env node
// Hosts the rendered video + thumbnail on the shyam-premi-media Worker, then sends the post to the
// Make scenario "Shyam Premi SN publisher" (Instagram + Facebook).
//   node scripts/publish.mjs --video <mp4> --scenes story/today/scenes.json [--dry-run]
// Env: CF_API_TOKEN (+ CLOUDFLARE_ACCOUNT_ID) for wrangler, MAKE_WEBHOOK_URL, MAKE_API_KEY
// (or %USERPROFILE%\.shyampremisk\make.env locally). Prints one JSON line.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MEDIA = path.join(ROOT, 'media-deploy');
const MEDIA_URL = 'https://shyam-premi-media.sk9836413.workers.dev';
const FF = process.env.FFMPEG_PATH || 'ffmpeg';

const args = process.argv.slice(2);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

const envFile = path.join(os.homedir(), '.shyampremisk', 'make.env');
const env = { ...(fs.existsSync(envFile)
  ? Object.fromEntries(fs.readFileSync(envFile, 'utf8').split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]))
  : {}), ...process.env };

function run(cmd, cmdArgs, opts = {}) {
  const r = spawnSync(cmd, cmdArgs, { encoding: 'utf8', shell: process.platform === 'win32', ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${cmdArgs[0]} failed: ${(r.stderr || r.stdout || '').trim().split('\n').slice(-3).join(' ')}`);
  return r.stdout;
}

async function main() {
  const video = option('--video');
  const spec = JSON.parse(fs.readFileSync(option('--scenes'), 'utf8'));
  const slug = spec.slug;

  // Only today's files are kept on the media Worker: Make fetches them right after the deploy.
  const pub = path.join(MEDIA, 'public');
  fs.mkdirSync(pub, { recursive: true });
  for (const f of fs.readdirSync(pub)) if (/\.(mp4|jpg)$/.test(f)) fs.rmSync(path.join(pub, f));
  fs.copyFileSync(video, path.join(pub, `${slug}.mp4`));
  run(FF, ['-y', '-loglevel', 'error', '-ss', '3', '-i', video, '-frames:v', '1', '-q:v', '3', path.join(pub, `${slug}.jpg`)]);
  fs.rmSync(path.join(MEDIA, 'wrangler.jsonc'), { force: true }); // wrangler sometimes writes one that overrides the toml

  const payload = {
    title: spec.title,
    youtube_title: spec.youtube_title,
    youtube_description: spec.youtube_description,
    youtube_tags: spec.youtube_tags,
    instagram_caption: spec.instagram_caption,
    facebook_caption: spec.facebook_caption,
    video_url: `${MEDIA_URL}/${slug}.mp4`,
    thumbnail_url: `${MEDIA_URL}/${slug}.jpg`,
  };
  if (args.includes('--dry-run')) return { status: 'dry-run', payload };

  run('npx', ['-y', 'wrangler@latest', 'deploy'], { cwd: MEDIA });
  for (let i = 0; i < 10; i++) {
    const head = await fetch(payload.video_url, { method: 'HEAD' });
    if (head.ok) break;
    if (i === 9) throw new Error(`video not reachable at ${payload.video_url} (HTTP ${head.status})`);
    await new Promise((r) => setTimeout(r, 6000));
  }

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
