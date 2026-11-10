// One subject per day (automation/STORY.md section 1, "One subject per day"). Used by scripts/validate.mjs.
//
// Why: from 7 Nov 2026 the channel went from 3-4 to 5-6 uploads a day and several of them told the same thing:
// 8 Nov had "Diwali Lakshmi Puja, Shubh Diwali" (morning) and "Diwali ki Katha, Lakshmi Puja" (noon) beside the Diwali
// status Short (uploaded twice); 9 Nov's noon "Govardhan Puja ki Katha" repeated the 7 Nov long video's title; 7 Nov's
// noon retold the 5 Nov long video (Ram's return to Ayodhya). Every one of them got 0-9 views: near-identical uploads
// compete with each other and read as repetition to YouTube.
//
// The rule: a new video must not be near-identical to another upload of the same day (any slot, the long video, the
// movie part, and by exact title the festival status Short) or of the 2 days before (story and title words).
// "Near-identical": the same title words, or 60% of the title words, or 60% of the subject words (title + slug) shared.
// Festival days may still have several festival videos, each with its own story or angle and its own title words.
import fs from 'node:fs';
import path from 'node:path';

// Words that say nothing about the subject (format words, particles, the year).
const GENERIC = new Set(['ki', 'ka', 'ke', 'aur', 'mein', 'me', 'se', 'ko', 'hai', 'ji', 'jai', 'shree', 'shri', 'katha', 'kahani',
  'darshan', 'status', 'video', 'shorts', 'sampoorn', 'mandir', 'dham', 'temple', 'kyun', 'kya', 'kaise', 'baba', 'part', 'the',
  'shubh', 'par', 'lok', 'vishesh', 'itihas', 'sachchi', 'rahasya', 'divya', 'adbhut', 'pavan', 'mahatva', 'manate', 'hain']);
const SYNONYM = { deepawali: 'diwali', dipawali: 'diwali', deepavali: 'diwali', pooja: 'puja', ganpati: 'ganesh', ganesha: 'ganesh',
  shiva: 'shiv', rama: 'ram', krishn: 'krishna', kanha: 'krishna', laxmi: 'lakshmi' };
const SAME_DAY = 0.6;
const RECENT = 0.6;
const RECENT_DAYS = 2;

export const words = (t) => [...new Set(String(t || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/[\s-]+/)
  .map((w) => SYNONYM[w] || w).filter((w) => w.length >= 3 && !/^\d+$/.test(w) && !GENERIC.has(w)))];
const romanTitle = (yt) => String(yt || '').replace(/#shorts/gi, '').split('|')[0].trim();
const jaccard = (a, b) => {
  if (!a.length || !b.length) return 0;
  const B = new Set(b);
  const shared = a.filter((w) => B.has(w)).length;
  return shared / new Set([...a, ...b]).size;
};
const parseSlug = (slug) => {
  const m = String(slug || '').match(/^(\d{4}-\d{2}-\d{2})-([a-z]+)-(.*)$/);
  return m ? { day: m[1], slot: m[2], rest: m[3] } : { day: '', slot: '', rest: String(slug || '') };
};

/** A video as the rule sees it. */
export function topic({ slug, title, day, slot }) {
  const p = parseSlug(slug);
  const t = words(romanTitle(title));
  return { slug, day: day || p.day, slot: slot || p.slot, title: romanTitle(title), titleWords: t, subject: [...new Set([...t, ...words(p.rest)])] };
}

/** Clashes of `video` with `others` (topic() objects): [{ other, why }] (unit-tested). */
export function clashes(video, others) {
  const out = [];
  const v = topic(video);
  for (const raw of others) {
    const o = raw.titleWords ? raw : topic(raw);
    if (o.slug === v.slug || !o.day || !v.day) continue;
    const days = (Date.parse(v.day) - Date.parse(o.day)) / 86400e3;
    if (days < 0 || days > RECENT_DAYS) continue;
    if (days === 0 && o.slot === v.slot) continue; // an earlier attempt of this same slot
    const sameWords = v.titleWords.length > 0 && v.titleWords.length === o.titleWords.length && v.titleWords.every((w) => o.titleWords.includes(w));
    const formatted = (x) => (x.status || ['status', 'eve', 'statusday', 'movie'].includes(x.slot)); // festival status variants share words by design
    let why = '';
    if (sameWords) why = 'the same title words';
    else if (days === 0 && !formatted(o) && jaccard(v.titleWords, o.titleWords) >= SAME_DAY) why = 'a near-identical title';
    else if (!formatted(o) && jaccard(v.subject, o.subject) >= (days === 0 ? SAME_DAY : RECENT)) why = 'the same subject';
    if (why) out.push({ other: o, why, when: days === 0 ? 'today' : `${days} day${days > 1 ? 's' : ''} ago` });
  }
  return out;
}

/** Every upload of `day` and the RECENT_DAYS before it: story/published, story/status, log.md lines (repo root). */
export function uploadsAround(day, root = '.') {
  const from = new Date(Date.parse(day) - RECENT_DAYS * 86400e3).toISOString().slice(0, 10);
  const inRange = (d) => d >= from && d <= day;
  const bySlug = new Map();
  const pubDir = path.join(root, 'story', 'published');
  if (fs.existsSync(pubDir)) {
    for (const f of fs.readdirSync(pubDir)) {
      if (!f.endsWith('.json') || f.endsWith('.meta.json') || !inRange(f.slice(0, 10))) continue;
      try { const s = JSON.parse(fs.readFileSync(path.join(pubDir, f), 'utf8')); bySlug.set(f.slice(0, -5), { slug: f.slice(0, -5), title: s.youtube_title || s.title }); } catch {}
    }
  }
  const statusDir = path.join(root, 'story', 'status');
  if (fs.existsSync(statusDir)) {
    for (const f of fs.readdirSync(statusDir)) {
      if (!/^\d{4}-\d{2}-\d{2}\.json$/.test(f) || !inRange(f.slice(0, 10))) continue;
      try { const s = JSON.parse(fs.readFileSync(path.join(statusDir, f), 'utf8')); if (s.slug && !bySlug.has(s.slug)) bySlug.set(s.slug, { slug: s.slug, title: s.youtube_title, status: true }); } catch {}
    }
  }
  const log = path.join(root, 'automation', 'log.md');
  if (fs.existsSync(log)) {
    for (const line of fs.readFileSync(log, 'utf8').split(/\r?\n/)) {
      const p = line.split(' | ').map((x) => x.trim());
      if (p.length < 3 || !/^\d{4}-\d{2}-\d{2}$/.test(p[0]) || !inRange(p[0])) continue;
      const slot = p[1] === 'morning' && p[2].includes('-movie-') ? 'movie' : p[1];
      if (!bySlug.has(p[2])) bySlug.set(p[2], { slug: p[2], day: p[0], slot });
      else Object.assign(bySlug.get(p[2]), { day: p[0], slot: bySlug.get(p[2]).slot || slot });
    }
  }
  return [...bySlug.values()];
}

/** Messages for validate.mjs (empty when the video has its own subject). */
export function topicWarnings(spec, root = '.') {
  const v = topic({ slug: spec.slug, title: spec.youtube_title || spec.title });
  if (!v.day) return [];
  return clashes(v, uploadsAround(v.day, root)).map(({ other, why, when }) =>
    `one subject per day: "${v.title}" has ${why} as ${when}'s ${other.slot || 'video'} "${other.title || other.slug}" (${other.slug}). `
    + 'Choose another story, deity or temple, or a clearly different angle with different title words (STORY.md section 1, "One subject per day")');
}
