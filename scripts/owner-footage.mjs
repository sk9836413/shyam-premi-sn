#!/usr/bin/env node
// Owner footage lane (owner, 20 Nov 2026: "tum upload kardo, daily upload me daal do"): the REAL darshan videos the owner
// recorded himself at a Khatu Shyam ji pandal, one a day as an EXTRA Short on YouTube, Facebook and Instagram.
// The plan (clips, order, titles, music, time) is automation/owner-footage.json; the skip list is
// automation/owner-footage-skip.txt (a clip the owner posted by hand, e.g. with an in-app song, is never auto-posted).
//
//   node scripts/owner-footage.mjs prepare [--clip 01] [--src <dir>] [--out <dir>]   (owner PC) mux the library track,
//        -14 LUFS, fades, CRF 23 (max 6 Mb/s: under the media Worker's 25 MB) 1080x1920 -> <out>/owner-<id>-<name>.mp4 (upload them as assets of the plan's release)
//   node scripts/owner-footage.mjs next --day YYYY-MM-DD [--assets a.mp4,b.mp4] [--now ISO]
//        the clip due on that IST date: {"go":true,clip,slug,asset,publish_at,...} or {"go":false,"reason"}
//   node scripts/owner-footage.mjs spec --clip 01 --day YYYY-MM-DD --out <scenes.json>   the upload spec (youtube.mjs / meta.mjs)
//   node scripts/owner-footage.mjs photos [--check] [--now ISO] [--dry-run]   the owner's photo carousel on Instagram when it is
//        due (--check: only say whether it is due; needs OWNER_PHOTOS_DIR with the release's post-NN.jpg to post)
//
// Honesty (scripts/ai-disclosure.mjs): the pictures are real footage, never called AI; the music is a cc-* library track
// (original arrangement of CC0 human recordings, no AI), so YouTube's synthetic flag and Meta's AI label are both off and
// no AI line is added. Were an AI track ever used, ai-disclosure.mjs decides the flags and the captions say "sangeet AI se"
// (only the music), never that the darshan is AI. No third-party song, no sung bhajan without its pronunciation QA.
// Upload cap: slot `owner` has its own cap of 1 a day (scripts/upload-guard.mjs OWNER_CAP), outside the 3 Shorts.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { aiDisclosure } from './ai-disclosure.mjs';
import { checkFbCaption } from './fb.mjs';
import { thirdPartyNames } from './bhakti-seo.mjs';
import { loadLibrary } from '../music/engine.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PLAN_FILE = path.join(ROOT, 'automation', 'owner-footage.json');
export const SKIP_FILE = path.join(ROOT, 'automation', 'owner-footage-skip.txt');
export const SEND_LINE = 'इसे अपने परिवार को भेजें 🙏';
export const TAGS = ['#KhatuShyam', '#JaiShreeShyam', '#ShyamBaba', '#KhatuShyamDarshan'];
export const LUFS = -14;
export const MAX_SECONDS = 90; // Facebook Reels stop at 90 s (meta.mjs FB_REEL_MAX); the reels are 11-30 s
const IST = 5.5 * 3600e3;
const read = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '');

export const loadPlan = (file = PLAN_FILE) => JSON.parse(fs.readFileSync(file, 'utf8'));
export const assetName = (c) => `owner-${c.id}-${c.name}.mp4`;
export const slugOf = (c, day) => `${day}-owner-${c.name}`;
export const istDate = (now = Date.now()) => new Date(now + IST).toISOString().slice(0, 10);
export const istAt = (day, hm) => Date.parse(`${day}T${hm}:00Z`) - IST;

/** Clip ids in the skip list: one per line ("04" or "04-pandal-se-darshan-tak.mp4"), "#" comments. */
export function skipped(text = '') {
  return new Set(String(text).split(/\r?\n/).map((l) => l.replace(/#.*/, '').trim()).filter(Boolean).map((l) => l.match(/^(\d{2})/)?.[1]).filter(Boolean));
}

/** Clips already published (or claimed and not released): log.md "<day> | owner | <slug> |" and published.md lines. */
export function publishedClips(plan, { log = '', pub = '' } = {}) {
  const done = new Map(); // clip id -> day
  const byName = new Map(plan.clips.map((c) => [c.name, c.id]));
  for (const m of log.matchAll(/^(\d{4}-\d{2}-\d{2}) \| owner \| \d{4}-\d{2}-\d{2}-owner-(\S+) \|/gm)) if (byName.has(m[2])) done.set(byName.get(m[2]), m[1]);
  for (const m of pub.matchAll(/^- (\d{4}-\d{2}-\d{2})-owner-(\S+) \| youtube: https?:/gm)) if (byName.has(m[2])) done.set(byName.get(m[2]), m[1]);
  return done;
}

/**
 * The clip due on `day`: the first clip in plan order that is not published, not skipped and (with `assets`) uploaded to
 * the release. Nothing before plan.start (except plan.first's own day), nothing when the day already has its owner Short.
 */
export function nextClip(plan, { day, log = '', pub = '', skip = '', assets = null, now = Date.now() } = {}) {
  if (new RegExp(`^${day} \\| owner \\|`, 'm').test(log)) return { go: false, reason: `${day} already has its owner-footage Short (log.md)` };
  if (new RegExp(`^- ${day}-owner-\\S+ \\| youtube: https?:`, 'm').test(pub)) return { go: false, reason: `${day} already has its owner-footage Short (published.md)` };
  const first = plan.first && plan.first.day === day ? plan.first.clip : null;
  if (!first && day < plan.start) return { go: false, reason: `${day} is before the lane starts (${plan.start})` };
  const done = publishedClips(plan, { log, pub });
  const skip_ = skipped(skip);
  const have = assets ? new Set(assets) : null;
  const order = first ? [plan.clips.find((c) => c.id === first), ...plan.clips.filter((c) => c.id !== first)] : plan.clips;
  const why = [];
  for (const c of order.filter(Boolean)) {
    if (done.has(c.id)) continue;
    if (skip_.has(c.id)) { why.push(`${c.id} skipped (owner-footage-skip.txt)`); continue; }
    if (have && !have.has(assetName(c))) { why.push(`${c.id} not in the release yet`); continue; }
    const at = istAt(day, plan.at);
    const publishAt = at - now > 15 * 60e3 ? `${day}T${plan.at}` : null; // youtube.mjs: under 15 min ahead = public now
    if (day < istDate(now)) return { go: false, reason: `${day} is in the past` };
    return { go: true, clip: c.id, slug: slugOf(c, day), asset: assetName(c), music: c.music, at: publishAt ? plan.at : 'now', publish_at: publishAt, notes: why };
  }
  return { go: false, reason: `no clip left (${done.size} published${why.length ? `; ${why.join('; ')}` : ''})` };
}

let library = null; // loadLibrary checks every file's sha256: once per run
const trackOf = (id) => {
  const t = (library ||= loadLibrary()).find((x) => x.id === id);
  if (!t) throw new Error(`music ${id}: not a valid licence-checked track in music/library`);
  if (t.kind === 'vocal' && !(t.qa?.names && t.qa.names.right === t.qa.names.checked)) throw new Error(`music ${id}: a sung track without a passed name-pronunciation QA`);
  return t;
};

/** The upload spec of one clip on one day (youtube.mjs metaFromScenes, meta.mjs captions / fbVideoCaption, ai-disclosure). */
export function buildSpec(plan, clipId, day, { track = null } = {}) {
  const c = plan.clips.find((x) => x.id === clipId);
  if (!c) throw new Error(`clip ${clipId} is not in the plan`);
  const t = track || trackOf(c.music);
  const music = { id: t.id, title: t.title || t.id, licence: t.licence, licence_url: t.licence_url || null };
  const spec = {
    slug: slugOf(c, day),
    format: 'owner-footage',
    real_footage: true,
    title: 'Shyam Premi SN',
    temple: 'khatu-shyam-mandir',
    deity: 'Khatu Shyam ji',
    playlist: plan.playlist,
    music,
    hashtags: TAGS,
    // the reel is the owner's own recording: one real scene, no AI picture, no voice (ai-disclosure.mjs aiLook = none)
    scenes: [{ real: true, image: `footage/owner/${c.file}`, source: 'own', licence: 'own' }],
    youtube_title: c.title,
    youtube_description: [
      c.line,
      c.roman,
      'Ye asli darshan video hai: Shyam Premi SN ne khud Shyam Baba ke pandal mein record kiya.',
      SEND_LINE,
      c.question,
      '',
      `Sangeet: "${music.title}" (CC0 recordings ki original arrangement, Shyam Premi SN).`,
      TAGS.join(' '),
    ].join('\n'),
    youtube_tags: ['Khatu Shyam darshan', 'खाटू श्याम दर्शन', 'Shyam Baba darshan', 'श्याम बाबा के दर्शन', 'Khatu Shyam shringar', 'Jai Shree Shyam', 'जय श्री श्याम', 'Khatu Shyam ji', 'Shyam Baba', 'Shyam Premi SN'].join(', '),
    instagram_caption: [c.line, c.question, SEND_LINE, 'Darshan: Shyam Premi SN ne khud record kiya 🙏', TAGS.join(' ')].join('\n'),
    // Facebook: the fb.mjs template (no share/forward ask there: the Page's bait rule); fbVideoCaption adds no AI line
    facebook_caption: [`${c.line} ${c.question}`, 'ये दर्शन Shyam Premi SN ने खुद श्याम बाबा के पंडाल में रिकॉर्ड किए हैं।', '', `${TAGS[0]} ${TAGS[1]} ${TAGS[2]}`].join('\n'),
  };
  const ai = aiDisclosure(spec);
  if (ai.youtube || ai.meta) {
    // only the music can be AI here: say so for the music, never for the darshan
    spec.youtube_description = spec.youtube_description.replace(/^Sangeet: .*$/m, `Sangeet AI se banaya gaya hai (original, "${music.title}"). Darshan asli hain.`);
  }
  return spec;
}

/** Problems of a spec (empty = fine). */
export function checkSpec(spec) {
  const e = [];
  if (!spec.youtube_title || spec.youtube_title.length > 100) e.push(`youtube_title 1-100 characters (${spec.youtube_title?.length})`);
  if (!/#Shorts/.test(spec.youtube_title)) e.push('youtube_title: #Shorts');
  for (const k of ['youtube_description', 'instagram_caption']) if (!spec[k].includes(SEND_LINE)) e.push(`${k}: the forwardable line`);
  const igTags = spec.instagram_caption.match(/#\S+/g) || [];
  if (igTags.length < 3 || igTags.length > 5) e.push(`instagram: 3-5 hashtags (${igTags.length})`);
  if (/\bAI\b/.test(`${spec.youtube_description}\n${spec.instagram_caption}`) && !aiDisclosure(spec).meta) e.push('real footage with non-AI music: no AI wording');
  if (/darshan.{0,20}\bAI\b|AI.{0,20}(chitra|darshan|video)/i.test(`${spec.youtube_description}\n${spec.instagram_caption}\n${spec.facebook_caption}`)) e.push('never call the real darshan AI');
  const names = thirdPartyNames(`${spec.youtube_title} ${spec.youtube_description}`);
  if (names.length) e.push(`other channels / organisations named: ${names.join(', ')}`);
  e.push(...checkFbCaption(spec.facebook_caption, { subject: spec }).map((x) => `facebook: ${x}`));
  return e;
}

// ---------------------------------------------------------------- prepare (owner PC)

const FF = process.env.FFMPEG_PATH || 'ffmpeg';
const duration = (f) => Number((spawnSync(FF.replace(/ffmpeg(\.exe)?$/, 'ffprobe$1'), ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }).stdout || '0').trim());

/** ffmpeg: the muted reel + its library track (from 0 s, cut to the clip, 0.5 s fade in, 1.5 s fade out, -14 LUFS / -1.5 dBTP). */
export function prepareClip(c, { src, out }) {
  const video = path.join(src, c.file);
  if (!fs.existsSync(video)) return { clip: c.id, status: 'missing', file: video };
  const t = trackOf(c.music);
  const dur = duration(video);
  if (!(dur >= 3 && dur <= MAX_SECONDS)) return { clip: c.id, status: 'too-long', file: video, seconds: dur, why: `a Short / Facebook Reel here is 3-${MAX_SECONDS} s` };
  const fades = `afade=t=in:d=0.5,afade=t=out:st=${(dur - 1.5).toFixed(2)}:d=1.5`;
  const chain = `aresample=48000,aformat=channel_layouts=stereo,${fades}`;
  const probe = spawnSync(FF, ['-hide_banner', '-nostats', '-i', t.file, '-t', String(dur), '-af', `${chain},loudnorm=I=${LUFS}:TP=-1.5:LRA=11:print_format=json`, '-f', 'null', '-'], { encoding: 'utf8' });
  const m = (probe.stderr || '').match(/\{[^{}]*"input_i"[^{}]*\}/s);
  if (!m) throw new Error(`loudness probe failed for ${t.id}`);
  const j = JSON.parse(m[0]);
  const af = `${chain},loudnorm=I=${LUFS}:TP=-1.5:LRA=11:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true,aresample=48000`;
  fs.mkdirSync(out, { recursive: true });
  const dst = path.join(out, assetName(c));
  const r = spawnSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-i', video, '-i', t.file, '-map', '0:v:0', '-map', '1:a:0', '-t', String(dur),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-maxrate', '6M', '-bufsize', '12M', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-r', '30', '-vf', 'scale=1080:1920:flags=lanczos,setsar=1',
    '-af', af, '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', dst], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`encode ${c.id}: ${r.stderr}`);
  const meas = spawnSync(FF, ['-hide_banner', '-nostats', '-i', dst, '-map', '0:a', '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' }).stderr || '';
  const lufs = Number(meas.match(/I:\s+(-?[\d.]+) LUFS\s*\n\s*Threshold[\s\S]*$/)?.[1] ?? meas.match(/I:\s+(-?[\d.]+) LUFS/g)?.pop()?.match(/-?[\d.]+/)?.[0]);
  return { clip: c.id, status: 'ok', file: dst, seconds: dur, mb: +(fs.statSync(dst).size / 1e6).toFixed(1), music: t.id, lufs };
}

// ---------------------------------------------------------------- photos (Instagram carousel)

async function photos({ now = Date.now(), dryRun = false, check = false } = {}) {
  const plan = loadPlan();
  const p = plan.photos;
  if (!p) return { status: 'none' };
  const stateFile = path.join(ROOT, 'automation', 'photos', `owner-${p.day}.json`);
  if (fs.existsSync(stateFile)) return { status: 'done', state: path.relative(ROOT, stateFile) };
  const at = istAt(p.day, p.at);
  if (now < at - 20 * 60e3) return { status: 'not-due', at: `${p.day}T${p.at}` };
  if (now > at + 4 * 3600e3) return { status: 'missed', at: `${p.day}T${p.at}` };
  if (check) return { status: 'due', at: `${p.day}T${p.at}` };
  const dir = process.env.OWNER_PHOTOS_DIR;
  if (!dir || !p.files.every((f) => fs.existsSync(path.join(dir, f)))) throw new Error('OWNER_PHOTOS_DIR with the photos (the release assets post-NN.jpg) is missing');
  const { host, instagram } = await import('./photos.mjs');
  if (dryRun) return { status: 'dry-run', files: p.files, caption: p.caption };
  const urls = [];
  for (const f of p.files) urls.push(await host(path.join(dir, f), `owner-photo-${p.day}-${f.replace(/\.jpg$/, '')}.jpg`));
  const wait = at - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  const ig = await instagram(urls, p.caption);
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  fs.writeFileSync(stateFile, `${JSON.stringify({ date: p.day, kind: 'owner-photos', instagram: ig.url, files: p.files, posted: new Date().toISOString() }, null, 2)}\n`);
  return { status: 'ok', instagram: ig.url, state: path.relative(ROOT, stateFile) };
}

// ---------------------------------------------------------------- CLI

async function main() {
  const args = process.argv.slice(2);
  const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
  const cmd = args[0];
  const plan = loadPlan();
  if (cmd === 'prepare') {
    const src = opt('--src') || plan.source_dir;
    const out = opt('--out') || path.join(ROOT, '..', 'owner-footage-out');
    const clips = opt('--clip') ? plan.clips.filter((c) => c.id === opt('--clip')) : plan.clips;
    return { status: 'ok', results: clips.map((c) => prepareClip(c, { src, out })) };
  }
  if (cmd === 'next') {
    const now = opt('--now') ? Date.parse(opt('--now')) : Date.now();
    const assets = opt('--assets') !== undefined ? String(opt('--assets')).split(',').map((s) => s.trim()).filter(Boolean) : null;
    return nextClip(plan, { day: opt('--day') || istDate(now), log: read(path.join(ROOT, 'automation', 'log.md')), pub: read(path.join(ROOT, 'automation', 'published.md')), skip: read(SKIP_FILE), assets, now });
  }
  if (cmd === 'spec') {
    const spec = buildSpec(plan, opt('--clip'), opt('--day'));
    const problems = checkSpec(spec);
    if (problems.length) throw new Error(`spec problems: ${problems.join('; ')}`);
    if (opt('--out')) { fs.mkdirSync(path.dirname(path.resolve(opt('--out'))), { recursive: true }); fs.writeFileSync(opt('--out'), `${JSON.stringify(spec, null, 2)}\n`); }
    return { status: 'ok', slug: spec.slug, title: spec.youtube_title, music: spec.music.id, ai: aiDisclosure(spec), ...(opt('--out') ? {} : { spec }) };
  }
  if (cmd === 'photos') return photos({ now: opt('--now') ? Date.parse(opt('--now')) : Date.now(), dryRun: args.includes('--dry-run'), check: args.includes('--check') });
  throw new Error('Usage: owner-footage.mjs prepare | next | spec | photos (see the header)');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().then((r) => console.log(JSON.stringify(r))).catch((e) => { console.log(JSON.stringify({ status: 'error', error: e.message })); process.exitCode = 1; });
}
