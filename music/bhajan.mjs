// AI-sung bhajans in the videos (owner, 13 Nov 2026: liked the ACE-Step take "1-zwj-hi-seed2222", "1 no h"; every long
// video and Short should carry bhajans like it). Off unless the repo variable BHAJAN_VOCALS=on (daily.yml env).
// The bhajans are original songs made by the weekly batch (music/bhajan-batch.mjs + music/kaggle/bhajan_batch.py:
// ACE-Step 1.5, MIT; Claude's own lyrics; 3 takes per song, the best one through the QA gate) and live in music/library/
// as bhajan-*.ogg + bhajan-*.licence.json (kind "vocal", `bhajan`: deity, mood, festival, lyrics, chorus_at).
//
// THE RULE: the narration voice never overlaps the sung vocals. Timelines (pure functions, unit-tested):
//   status  festival status Short (text + music): no narration at all; the bhajan is the whole soundtrack, starting
//           just before its chorus so the hook is sung in second 1, and the video length is rounded up to whole bars
//           so the loop replays on the beat.
//   outro   narrated Shorts (morning / evening darshan, temple, day status): narration first over the instrumental bed
//           (music/engine.mjs), the bed fades out, then 8-15 s of the bhajan chorus once the last line has ended (the
//           last scene is held that much longer). A Short that would pass 59 s keeps the instrumental bed only.
//   long    the long katha: ~20-30 s of the chorus BEFORE the katha starts, the whole bhajan AFTER the katha has
//           ended; the instrumental bed stays under the narration.
// Selection: the deity / festival must match (no match = the instrumental engine as before); never the same bhajan
// on the channel within 5 days (story/published/*.json keep spec.bhajan.id); stable per slug.
// Disclosure: videos with a bhajan get BHAJAN_LINE in the description / captions; YouTube uploads always set
// status.containsSyntheticMedia = true (scripts/youtube.mjs syntheticMedia).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadLibrary, LIBRARY } from './engine.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
export const BHAJAN_LINE = 'भजन: मौलिक रचना, AI द्वारा गाया गया (ACE-Step)';
export const REPEAT_DAYS = 5;
export const BHAJAN_MOODS = ['thaath', 'bhaavuk'];

// Deity of a video spec (keys as in scripts/fb.mjs categoryOfText; "Shyam Premi SN" and the sign-off are ignored).
const DEITIES = [
  ['khatu', /khatu|shyam baba|baba shyam|shyam ji|barbarik|janmotsav|gyaras|sheesh ke dani|खाटू|श्याम बाबा|बाबा श्याम|बर्बरीक/i],
  ['shiv', /shiv|mahadev|bhole|jyotirling|somnath|mahakal|kedarnath|omkareshwar|mallikarjun|vishwanath|pradosh|shivratri|somvar|dev deepawali|devdeepawali|शिव|महादेव|भोले|ज्योतिर्लिंग/i],
  ['hanuman', /hanuman|bajrang|balaji|salasar|mehandipur|sankat mochan|mangalvar|हनुमान|बजरंग|बालाजी/i],
  ['ganesh', /ganesh|ganpati|vinayak|sankashti|sakat|budhvar|गणेश|गणपति/i],
  ['krishna', /krishna|kanha|govind|gopal|bihari|vrindavan|shrinath|nathdwara|govardhan|gopashtami|dwarka|कृष्ण|कान्हा|गोवर्धन/i],
  ['vishnu', /vishnu|narayan|ekadashi|tulsi|vaikuntha|guruvar|विष्णु|नारायण|तुलसी/i],
  ['devi', /mata|devi|durga|lakshmi|santoshi|chhath|chhathi|माता|देवी|दुर्गा|लक्ष्मी|छठ/i],
  ['ram', /\bram\b|ayodhya|sita|राम/i],
];
export function deityOf(spec) {
  // Field by field, most specific first (a playlist like "Vishnu ji aur Krishna ki Kathayein" must not decide it).
  for (const v of [spec.deity, spec.festival, spec.temple, spec.title, spec.youtube_title, spec.cover, spec.kicker, spec.family, spec.slug, spec.day_status, spec.playlist]) {
    const t = String(v || '').replace(/Shyam Premi SN/gi, '');
    const hit = t && DEITIES.find(([, re]) => re.test(t));
    if (hit) return hit[0];
  }
  return null;
}

/** The festivals.json theme a spec belongs to (its slug / family names the festival key), else null. */
export function festivalOf(spec, festivals = []) {
  const t = `${spec.slug || ''} ${spec.family || ''} ${spec.festival_key || ''}`;
  if (spec.theme && festivals.some((f) => f.theme === spec.theme)) return spec.theme;
  const f = festivals.filter((x) => x.theme && x.key).sort((a, b) => b.key.length - a.key.length).find((x) => t.includes(x.key));
  if (f) return f.theme;
  // the theme word itself in the slug (a Chhath long video "2026-11-14-long-chhath-vrat-katha", a bhajan Short)
  const theme = [...new Set(festivals.map((x) => x.theme).filter(Boolean))].find((th) => new RegExp(`(^|-)${th}(-|$)`).test(`${spec.slug || ''}`));
  return theme || null;
}

/** The festival day a spec is about (Chhath 2026: nahay-khay / kharna / sandhya-arghya / usha-arghya / parana), else null. */
export const FESTIVAL_DAYS = ['nahay-khay', 'kharna', 'sandhya-arghya', 'usha-arghya', 'parana'];
export function festivalDayOf(spec) {
  const t = `${spec.slug || ''} ${spec.family || ''} ${spec.festival_key || ''}`.toLowerCase();
  return FESTIVAL_DAYS.find((d) => t.includes(d)) || null;
}

export function loadFestivals(root = path.join(DIR, '..')) {
  try { return JSON.parse(fs.readFileSync(path.join(root, 'automation', 'festivals.json'), 'utf8')).festivals || []; } catch { return []; }
}

/** Valid vocal bhajans of the library (licence-checked by engine.loadLibrary; kind "vocal" with bhajan tags). */
export function loadBhajans(dir = LIBRARY) {
  return loadLibrary(dir).filter((t) => t.kind === 'vocal' && t.bhajan && t.bhajan.deity && typeof t.bhajan.chorus_at === 'number');
}

/** Bhajan ids used per date, from the published specs (spec.bhajan.id). */
export function bhajanHistory(publishedDir) {
  if (!fs.existsSync(publishedDir)) return [];
  return fs.readdirSync(publishedDir).filter((f) => /^\d{4}-\d{2}-\d{2}-.*\.json$/.test(f) && !f.endsWith('.meta.json')).flatMap((f) => {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(publishedDir, f), 'utf8'));
      return j.bhajan?.id ? [{ date: (j.date || f).slice(0, 10), id: j.bhajan.id, slug: j.slug }] : [];
    } catch { return []; }
  });
}

const dayNo = (iso) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / 864e5);
const hash = (s) => [...`${s}`].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

/**
 * One bhajan for a video, or null (= the instrumental engine). Festival match first, then deity match; never one used
 * on the channel in the REPEAT_DAYS days up to `date` (the same day included; a re-render of the same slug keeps its
 * own pick); the preferred mood first; stable for the slug.
 */
export function pickBhajan(bhajans, { deity, festival = null, day = null, mood = null, date, slug, history = [] }) {
  const today = dayNo(date);
  const recent = new Set(history.filter((h) => !(h.slug && h.slug === slug)).filter((h) => {
    const d = dayNo(h.date);
    return d <= today && today - d < REPEAT_DAYS;
  }).map((h) => h.id));
  const fresh = bhajans.filter((b) => !recent.has(b.id)).sort((a, b) => a.id.localeCompare(b.id));
  const tiers = [
    // Chhath 2026 (automation/chhath-2026.json): the song of the festival's own day first (kharna, sandhya-arghya, ...)
    festival && day ? fresh.filter((b) => b.bhajan.festival === festival && b.bhajan.day === day) : [],
    festival ? fresh.filter((b) => b.bhajan.festival && b.bhajan.festival === festival) : [],
    // a festival song never goes under another festival's / an ordinary video of the same deity (a Chhath geet is
    // "devi", but not for a Vaishno Devi darshan)
    deity ? fresh.filter((b) => b.bhajan.deity === deity && (!b.bhajan.festival || b.bhajan.festival === festival)) : [],
  ];
  for (const [k, pool] of tiers.entries()) {
    if (!pool.length) continue;
    const inMood = pool.filter((b) => b.bhajan.mood === mood);
    const p = inMood.length ? inMood : pool;
    return { track: p[hash(slug || date) % p.length], match: k <= 1 ? 'festival' : 'deity' };
  }
  return null;
}

/** Which bhajan timeline a spec gets: 'status' (no narration), 'outro' (narrated Short) or 'long'. */
export function modeFor(spec) {
  if (spec.format === 'long' || spec.chapters) return 'long';
  if (spec.format === 'status' && !spec.day_status) return 'status';
  return 'outro';
}
const moodPref = (spec, mode) => (mode === 'status' || spec.day_status || /-morning-/.test(spec.slug || '') ? 'thaath' : 'bhaavuk');

/**
 * For the renderers: { track, mode, meta } or null (BHAJAN_VOCALS off, no matching bhajan, or every match used in the
 * last 5 days). meta goes into spec.bhajan (history + disclosure).
 */
export function bhajanFor(spec, { env = process.env, date, publishedDir, library = LIBRARY, festivals } = {}) {
  // A bhajan Short (scripts/bhajan-short.mjs, spec.bhajan_id) IS the song: it names its track and needs no BHAJAN_VOCALS.
  if (spec.bhajan_id) {
    const t = loadBhajans(library).find((b) => b.id === spec.bhajan_id);
    if (!t) throw new Error(`bhajan ${spec.bhajan_id} is not a valid library bhajan`);
    return { track: { file: t.file, seconds: t.bhajan.seconds || t.qa?.seconds || 60, chorus_at: t.bhajan.chorus_at, bpm: t.bpm || null }, mode: 'status',
      meta: { id: t.id, title: t.title || t.id, title_hi: t.bhajan.title_hi || null, deity: t.bhajan.deity, mood: t.bhajan.mood, festival: t.bhajan.festival || null,
        match: 'chosen', mode: 'status', licence: t.licence, model: t.model, singer: 'AI (ACE-Step 1.5), no real singer cloned' } };
  }
  if (env.BHAJAN_VOCALS !== 'on') return null;
  const mode = modeFor(spec);
  const day = date || spec.date || `${spec.slug || ''}`.slice(0, 10) || new Date().toISOString().slice(0, 10);
  const deity = deityOf(spec);
  const festival = festivalOf(spec, festivals || loadFestivals());
  const pick = pickBhajan(loadBhajans(library), {
    deity, festival, day: festivalDayOf(spec), mood: moodPref(spec, mode), date: day, slug: spec.slug,
    history: bhajanHistory(publishedDir || path.join(DIR, '..', 'story', 'published')),
  });
  if (!pick) return null;
  const t = pick.track;
  return {
    track: { file: t.file, seconds: t.bhajan.seconds || t.qa?.seconds || 60, chorus_at: t.bhajan.chorus_at, bpm: t.bpm || null },
    mode,
    meta: { id: t.id, title: t.title || t.id, title_hi: t.bhajan.title_hi || null, deity: t.bhajan.deity, mood: t.bhajan.mood, festival: t.bhajan.festival || null,
      match: pick.match, mode, licence: t.licence, model: t.model, singer: 'AI (ACE-Step 1.5), no real singer cloned' },
  };
}

const r2 = (x) => Math.round(x * 100) / 100;

/**
 * Short timeline. voiceEnd = when the last narration line has ended (s); total = the video length without a bhajan.
 *   status: { voice: false, from, start: 0, dur, total, extend }   (total rounded up to whole 4/4 bars when bpm known)
 *   outro:  { voice: true, from, start, dur, total, extend, bedFadeAt }   or null when it cannot fit (then: no bhajan)
 * from = where in the song to start (just before the chorus); extend = seconds added to the last scene.
 */
export function shortTimeline({ mode, voiceEnd = 0, total, track, gap = 0.45, lead = 0.3, outro = [8, 15], target = 12, maxTotal = 59 }) {
  const from = Math.max(0, track.chorus_at - lead);
  const avail = track.seconds - from;
  if (mode === 'status') {
    let t = total;
    if (track.bpm) { const bar = 240 / track.bpm; t = Math.ceil((total - 0.01) / bar) * bar; }
    if (avail < t) t = Math.max(total, Math.min(t, avail)); // the song must last the whole video
    if (avail < total) return null;
    return { voice: false, from: r2(from), start: 0, dur: r2(t), total: r2(t), extend: r2(t - total) };
  }
  const start = voiceEnd + gap;
  const room = maxTotal - start;
  const dur = Math.min(target, outro[1], avail, room);
  if (dur < outro[0]) return null;
  const end = start + dur;
  const t = Math.max(total, end);
  return { voice: true, from: r2(from), start: r2(start), dur: r2(dur), total: r2(t), extend: r2(t - total), bedFadeAt: r2(Math.max(0, start - 1.2)) };
}

/**
 * Long-video timeline. katha = length of the narrated katha (s). The intro (20-30 s of chorus) comes before it, the whole
 * song after it: { intro, introFrom, kathaStart, kathaEnd, outroStart, outroDur, total }.
 */
export function longTimeline({ katha, track, intro = [20, 30], target = 25, gap = 0.6, lead = 0.3 }) {
  const introFrom = Math.max(0, track.chorus_at - lead);
  const I = Math.min(target, intro[1], track.seconds - introFrom);
  if (I < intro[0]) return null;
  const kathaStart = I;
  const kathaEnd = I + katha;
  const outroStart = kathaEnd + gap;
  return { intro: r2(I), introFrom: r2(introFrom), kathaStart: r2(kathaStart), kathaEnd: r2(kathaEnd), outroStart: r2(outroStart),
    outroDur: r2(track.seconds), total: r2(outroStart + track.seconds) };
}

/** Voice and sung-vocal intervals of a timeline never intersect (renderers assert it; tests check it). */
export function overlaps(voice, sung) {
  return voice.some(([a, b]) => sung.some(([c, d]) => a < d - 1e-6 && c < b - 1e-6));
}

/** Adds the disclosure line to the description / captions (idempotent). Facebook's line is added by scripts/fb.mjs. */
export function discloseBhajan(spec) {
  for (const k of ['youtube_description', 'instagram_caption']) {
    if (typeof spec[k] === 'string' && spec[k].trim() && !spec[k].includes(BHAJAN_LINE)) spec[k] = `${spec[k].trimEnd()}\n\n${BHAJAN_LINE}`;
  }
  return spec;
}
