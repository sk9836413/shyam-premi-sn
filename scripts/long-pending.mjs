#!/usr/bin/env node
// Keeps a long video whose YouTube upload failed (quota or an error) and retries it on a later run.
//   node scripts/long-pending.mjs keep <slug> <reason>   parks story/long/out/<slug>.mp4 (+ thumb) on the media
//                                                         Worker in 24 MB parts (KV, 7 days) and lists it in
//                                                         automation/long-pending.md
//   node scripts/long-pending.mjs retry                  uploads the oldest pending video (one per run) from the
//                                                         Worker; drops entries older than 6 days
// The scenes and chapters come from story/published/<slug>.json and <slug>.meta.json (committed when the video
// was rendered). Env: MEDIA_URL, MEDIA_TOKEN and the YT_* secrets. Prints one JSON line.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PENDING = 'automation/long-pending.md';
const PART = 24 * 1024 * 1024;
const MEDIA_URL = process.env.MEDIA_URL || 'https://shyam-premi-media.sk9836413.workers.dev';
const auth = { Authorization: `Bearer ${process.env.MEDIA_TOKEN}` };
const [command, slugArg, ...reason] = process.argv.slice(2);

const pending = () => (fs.existsSync(PENDING) ? fs.readFileSync(PENDING, 'utf8').split('\n').filter((l) => / \| /.test(l)) : []);
const writePending = (lines) => fs.writeFileSync(PENDING, lines.length ? `${lines.join('\n')}\n` : '');
const today = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);

async function put(name, body) {
  const res = await fetch(`${MEDIA_URL}/m/${name}`, { method: 'PUT', headers: auth, body });
  if (!res.ok) throw new Error(`media upload ${name}: HTTP ${res.status}`);
}
async function get(name) {
  const res = await fetch(`${MEDIA_URL}/m/${name}`);
  if (!res.ok) throw new Error(`media download ${name}: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function keep(slug, why) {
  const data = fs.readFileSync(`story/long/out/${slug}.mp4`);
  const parts = Math.ceil(data.length / PART);
  for (let k = 0; k < parts; k++) await put(`${slug}-p${k}.mp4`, data.subarray(k * PART, (k + 1) * PART));
  const thumb = `story/long/out/${slug}-thumb.jpg`;
  if (fs.existsSync(thumb)) await put(`${slug}-thumb.jpg`, fs.readFileSync(thumb));
  writePending([...pending().filter((l) => !l.startsWith(`${slug} |`)), `${slug} | ${parts} | ${today()} | ${why.replace(/[|\n]/g, ' ').slice(0, 160)}`]);
  return { status: 'kept', slug, parts, bytes: data.length };
}

async function retry() {
  const lines = pending();
  if (!lines.length) return { status: 'none' };
  const [slug, parts, date] = lines[0].split(' | ').map((x) => x.trim());
  const ageDays = (Date.parse(today()) - Date.parse(date)) / 86400e3;
  if (ageDays > 6) {
    writePending(lines.slice(1));
    fs.appendFileSync('automation/published.md', `- ${slug} | youtube: expired (upload never succeeded within 7 days) | long\n`);
    return { status: 'expired', slug };
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'long-'));
  const video = path.join(dir, `${slug}.mp4`);
  const chunks = [];
  for (let k = 0; k < Number(parts); k++) chunks.push(await get(`${slug}-p${k}.mp4`));
  fs.writeFileSync(video, Buffer.concat(chunks));
  const thumb = path.join(dir, `${slug}-thumb.jpg`);
  const hasThumb = await get(`${slug}-thumb.jpg`).then((b) => (fs.writeFileSync(thumb, b), true), () => false);
  const r = spawnSync(process.execPath, ['scripts/youtube.mjs', 'upload', '--long', '--video', video,
    '--scenes', `story/published/${slug}.json`, '--meta', `story/published/${slug}.meta.json`,
    ...(hasThumb ? ['--thumbnail', thumb] : []), ...(date === today() ? ['--publish-at', '15:00'] : [])], { encoding: 'utf8', env: process.env });
  const out = JSON.parse(r.stdout.trim().split('\n').pop() || '{}');
  if (out.status !== 'ok') return { status: out.status === 'quota' ? 'quota' : 'error', slug, error: out.error };
  writePending(lines.slice(1));
  fs.appendFileSync('automation/published.md', `- ${slug} | youtube: ${out.youtube.url} | long (uploaded on retry, ${today()})\n`);
  return { status: 'ok', slug, youtube: out.youtube };
}

try {
  const result = command === 'keep' ? await keep(slugArg, reason.join(' ') || 'upload failed')
    : command === 'retry' ? await retry()
      : (() => { throw new Error('Usage: long-pending.mjs keep <slug> <reason> | retry'); })();
  console.log(JSON.stringify(result));
} catch (e) {
  console.log(JSON.stringify({ status: 'error', error: e.message }));
  process.exitCode = 1;
}
