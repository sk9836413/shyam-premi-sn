#!/usr/bin/env node
// "Pauranik facts / rahasya" Shorts (format `facts`; STORY.md "Facts Shorts"; owner, 15 Nov 2026).
//
// WHY: the owner's reference Shorts ("जटायु से भी 10 गुना शक्तिशाली था उसका बड़ा भाई संपाती! 😱 #facts" 3.4M views,
// "हारे का सहारा बाबा श्याम की असली कहानी! 😱 #facts" 2.6M, "यमराज ने हनुमान जी को लात क्यों मारी?" 4.35M, "Warriors who
// defeated Ravan" 1 lakh) all tell ONE lesser-known episode behind a dramatic curiosity hook. Our plain katha Shorts got
// 6-40 views, darshan 85-170, festival status 150-800: the hook and the storytelling make the difference, not the length.
// Our version: ORIGINAL topics (automation/facts-topics.json), every fact cited (scripture kand/sarga, parva, purana
// khand, or the temple's / a government site), folk versions said as "मान्यता है" / "लोककथा के अनुसार", no invented
// numbers ("10 guna" only when the text says so), edge-tts Madhur narration through the human chain, FLUX frames + Wan
// clips on Kaggle (zoompan stills when the GPU is short), a Whisper deity-name gate that never loosens (owner rule).
//
// VARIANTS (A/B, recorded in log.md / published.md / growth.md):
//   story  2-2.5 min katha (110-165 s, 10-16 scenes): hook, curiosity, resolution, one-line moral, CTA
//   kyun   the "<A> ने <B> को ... क्यों?" shock question (45-62 s, 6-9 scenes): the title and line 1 are the question, the
//          answer (`reveal`) lands at ~55-85 % of the video; the 3-line brush-band cover (story/cover.mjs `cover_lines`)
//   list   countdown/listicle (38-55 s): an intro line, 3-5 numbered items (`item` 1..n, number badge, one citation each)
//   gita   one real Bhagavad Gita shloka (ch.verse, public domain) + simple Hindi meaning + one life lesson (45-62 s);
//          Sundays, ~1 a week; the shloka passes the mantra gate or is shown as text only (the Hindi meaning is spoken)
// ART (A/B): `cinematic` (hyper-real golden epic) or `illustrated` (warm hand-drawn, clean outlines, soft sunset light),
// alternating; never a named studio's look, never a real actor's likeness; Khatu Shyam ji = the sheesh only.
//
//   node scripts/facts.mjs bank                                   check automation/facts-topics.json (exit 1 on problems)
//   node scripts/facts.mjs pick --date D                          the topic + variant + art the date's Short should use
//   node scripts/facts.mjs due [--spec F] [--today D] [--now ISO] what the `facts` job makes now (GITHUB_OUTPUT keys)
//   node scripts/facts.mjs check <spec.json>                      the facts rules only (validate.mjs runs them too)
//   node scripts/facts.mjs qa --spec F --asr asr.json [--shloka]  the Whisper deity-name gate (exit 1 = do not publish)
//   node scripts/facts.mjs plan [--days 14] [--from D]            the facts dates of the next days (dry run)
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { addDays, istToday, loadInputs, planDay, weekday } from './day-plan.mjs';
import { align, cer, nameOccurrences, norm, RULES } from '../music/bhajan-batch.mjs';

export const TOPICS_FILE = 'automation/facts-topics.json';
export const SPEC_DIR = 'story/facts';
export const PUBLISH_AT = '17:00'; // IST (day-plan AT.facts): between the 12:30 long video and the 19:00 evening darshan
export const VARIANTS = ['story', 'kyun', 'list', 'gita'];
export const ARTS = ['cinematic', 'illustrated'];
export const REPEAT_DAYS = 60; // a topic's keywords in a facts / any log line within this many days: not again
export const LABELS = ['scripture', 'tradition', 'temple'];
// Estimated length (s) per variant: the human voice chain speaks Madhur at ~12.9 Devanagari characters a second
// (measured 10 Nov 2026 on the Dadi-Chhotu Short: 13.9 at +8 %), each scene adds ~1 s (0.3 s lead + 0.7 s pad) and the
// cross-fades take 0.4 s each. A Short must stay under 3 minutes (179 s hard limit on the rendered file).
export const LENGTH = { story: [110, 165], kyun: [45, 62], list: [38, 55], gita: [45, 62] };
export const SCENES = { story: [10, 16], kyun: [6, 9], list: [5, 8], gita: [5, 8] };
export const CPS = 12.9;
export const MAX_RENDERED = 179;
const WEAK = /wikipedia\.org|blogspot\.|wordpress\.|medium\.com|quora\.com|youtube\.com|facebook\.com|instagram\.com|bhaktibharat|myyatradiary|studycafe|tripadvisor|holidify|templepurohit|pinterest/i;
const DEVANAGARI = /[ऀ-ॿ]/;
// Folk / temple belief must be said as such in the narration (owner, 15 Nov 2026).
export const FOLK_MARK = /मान्यता|लोककथा|लोक कथा|कहते हैं|कहा जाता है|परंपरा|परम्परा|लोक मान्यता|श्रद्धा है/;
// Hindi / Roman number words a hook or title might invent ("दस गुना"): allowed only when the topic lists them.
// ("ek" / "एक" is also the article "a", so it is not counted; Devanagari words only as whole words: दोस्त is not दो.)
const NUMBER_WORDS = /\b\d+\b|\b(teen|chaar|char|paanch|panch|chhah|saat|aath|nau|das|bees|sau|hazaar|hazar|lakh|crore|karod)\b|(?<![\p{L}\p{M}])(दो|तीन|चार|पाँच|पांच|छह|सात|आठ|नौ|दस|बीस|सौ|हज़ार|हजार|लाख|करोड़)(?![\p{L}\p{M}])/giu;
const GUNA = /guna|गुना|times/i;
// Physical humiliation or vulgarity: never a deity (owner, 15 Nov 2026: the "kyun" action may look dramatic, never demeaning).
const DEMEAN = /\b(thappad|slap|slapp|kick|kicked|kicking|lat maar|laat maar|joota|jute|chappal|naked|nude|nanga|vulgar|sexy|drunk|sharab|daaru|toilet|vomit|spit|thook)\b|थप्पड़|लात मार|जूता|चप्पल|नंगा|शराब|थूक/i;
const STUDIO = /pixar|disney|ghibli|dreamworks|marvel|illumination|amar chitra katha/i;
const GORE = /\b(blood|bloody|gore|beheaded|beheading|severed|decapitat|corpse|dead body|wound|killing|slaughter)/i;
// "धर्म की जिज्ञासा" answers come from shastra or parampara (owner, 15 Nov 2026): never pseudo-science or health claims.
export const PSEUDO = /bacteria|bacteri|virus|vaigyanik karan|scientific reason|science (says|proves)|positive energy|negative energy|vibration|immunity|oxygen|health benefit|rog door|bimari door|बैक्टीरिया|वायरस|वैज्ञानिक कारण|विज्ञान भी मानता|पॉजिटिव एनर्जी|नेगेटिव एनर्जी|सकारात्मक ऊर्जा|नकारात्मक ऊर्जा|इम्युनिटी|ऑक्सीजन|रोग दूर|बीमारी दूर|सेहत के लिए/i;

const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } };
const urls = (a) => (Array.isArray(a) ? a : []).filter((u) => /^https?:\/\/\S+$/.test(u));

// ---------------------------------------------------------------- the topic bank

export function loadTopics(root = '.') {
  const j = JSON.parse(read(path.join(root, TOPICS_FILE)) || '{"topics":[]}');
  return j.topics || [];
}

/** Problems of the bank (empty = OK): 60+ topics, unique ids, citation + source per topic, no sati topic, hooks fit. */
export function checkTopicBank(topics) {
  const e = [];
  if (topics.length < 60) e.push(`only ${topics.length} topics (needs 60+)`);
  const seen = new Set();
  for (const t of topics) {
    const n = `topic ${t.id || '?'}`;
    if (!/^[a-z0-9-]+$/.test(t.id || '')) e.push(`${n}: id must be a-z0-9-`);
    if (seen.has(t.id)) e.push(`${n}: duplicate id`);
    seen.add(t.id);
    if (![1, 2, 3].includes(t.p)) e.push(`${n}: p (priority) 1-3`);
    if (!LABELS.includes(t.label)) e.push(`${n}: label ${LABELS.join(' | ')}`);
    if (!(t.cite?.work?.length >= 6 && t.cite?.ref?.length >= 3)) e.push(`${n}: cite {work, ref} (the citation for the description)`);
    if (!urls(t.sources).length) e.push(`${n}: at least one source URL`);
    if (!t.hook || t.hook.length > 38 || DEVANAGARI.test(t.hook)) e.push(`${n}: hook Roman, max 38 characters`);
    if (!DEVANAGARI.test(t.hook_hi || '')) e.push(`${n}: hook_hi in Devanagari`);
    if (!(t.angle?.length >= 40)) e.push(`${n}: angle (what to tell) missing`);
    if (/sati\b|rani sati|सती/i.test(`${t.id} ${t.name} ${t.hook} ${t.hook_hi}`)) e.push(`${n}: no sati topics (Sati Prevention Act rule)`);
    if (PSEUDO.test(`${t.hook} ${t.hook_hi}`)) e.push(`${n}: no pseudo-science or health claims in the hook`);
    if (t.length && !(Array.isArray(t.length) && t.length[0] >= 30 && t.length[1] <= 165)) e.push(`${n}: length [min, max] seconds`);
    for (const h of [t.hook, t.hook_hi]) {
      if (GUNA.test(h || '') && !(t.numbers_ok || []).some((x) => GUNA.test(x))) e.push(`${n}: "guna" in the hook only when the text says so (numbers_ok)`);
      for (const m of String(h || '').match(NUMBER_WORDS) || []) {
        if (!(t.numbers_ok || []).map((x) => x.toLowerCase()).includes(m.toLowerCase())) e.push(`${n}: the hook's number "${m}" must be in numbers_ok (no invented numbers)`);
      }
    }
    if (t.after && !/^\d{4}-\d{2}-\d{2}$/.test(t.after)) e.push(`${n}: after YYYY-MM-DD`);
  }
  return e;
}

// ---------------------------------------------------------------- which topic, variant and art

const WEEKDAY_DEITY = { 0: ['surya', 'khatu', 'krishna'], 1: ['shiv'], 2: ['hanuman'], 3: ['ganesh'], 4: ['krishna', 'ram'], 5: ['devi'], 6: ['shani', 'hanuman'] };

/** The facts Shorts already made: [{ date, slug, topic?, variant?, art? }] from log.md (+ spec files written ahead). */
export function factsHistory(root = '.') {
  const out = [];
  for (const m of read(path.join(root, 'automation/log.md')).matchAll(/^(\d{4}-\d{2}-\d{2}) \| facts \| (\S+) \|(.*)$/gm)) {
    const v = m[3].match(/variant (\w+)/), a = m[3].match(/art (\w+)/);
    out.push({ date: m[1], slug: m[2], variant: v?.[1], art: a?.[1] });
  }
  const dir = path.join(root, SPEC_DIR);
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    if (!/^\d{4}-\d{2}-\d{2}-.+\.json$/.test(f)) continue;
    try {
      const s = JSON.parse(read(path.join(dir, f)));
      const i = out.findIndex((x) => x.slug === s.slug);
      const row = { date: s.release, slug: s.slug, topic: s.topic, variant: s.variant, art: s.art };
      if (i >= 0) out[i] = { ...out[i], ...row }; else out.push(row);
    } catch { /* a broken file is the validator's business */ }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

const slugTopic = (slug, topics) => topics.find((t) => String(slug).includes(t.id));

/** Variant for a date: Sunday = gita (~1 a week); otherwise rotate story -> kyun -> list over the facts history. */
export function variantFor(date, history = []) {
  if (weekday(date) === 0) return 'gita';
  const done = history.filter((h) => h.date < date && h.variant && h.variant !== 'gita');
  const last = done.at(-1)?.variant;
  const order = ['story', 'kyun', 'list'];
  return last ? order[(order.indexOf(last) + 1) % order.length] : 'story';
}
/** Art style A/B: alternate with the last facts Short. */
export function artFor(date, history = []) {
  const last = history.filter((h) => h.date < date && h.art).at(-1)?.art;
  return last === 'cinematic' ? 'illustrated' : 'cinematic';
}

/** Is the topic allowed on the date (after, festival window, not used, keywords not in log within REPEAT_DAYS)? */
export function topicAllowed(t, date, { history = [], log = '', festivals = [], topics = [] } = {}) {
  if (t.after && date < t.after) return false;
  if (t.festival) {
    const near = festivals.some((f) => String(f.key || f.theme || '').includes(t.festival) && f.date >= date && f.date <= addDays(date, 4));
    if (!near) return false;
  }
  if (history.some((h) => (h.topic || slugTopic(h.slug, topics)?.id) === t.id && h.date !== date)) return false;
  const from = addDays(date, -REPEAT_DAYS);
  const recent = log.split(/\r?\n/).filter((l) => { const d = l.slice(0, 10); return d >= from && d < date; }).join('\n').toLowerCase();
  return !(t.keywords || []).some((k) => k.length >= 4 && recent.includes(k.toLowerCase()));
}

/** The topic for a date: festival-window topics first, then Khatu Shyam ji while fewer than 2 Khatu facts in the last
 *  7 days (the channel's own deity), then the weekday deity, by priority; gita days take the Gita topic. */
export function pickTopic(date, { topics = [], history = [], log = '', festivals = [] } = {}) {
  let variant = variantFor(date, history);
  const all = topics.filter((t) => topicAllowed(t, date, { history, log, festivals, topics }));
  if (variant === 'gita') {
    const g = all.filter((t) => t.variant_only === 'gita').sort((a, b) => a.p - b.p)[0];
    if (g) return { topic: g, variant: 'gita', art: artFor(date, history) };
    variant = 'story';
  }
  // list topics need their own countdown material; kyun prefers its own shock questions, else any "...kyun?" topic
  if (variant === 'list' && !all.some((t) => t.variant_only === 'list')) variant = 'kyun';
  const own = all.filter((t) => t.variant_only === variant);
  const ok = variant === 'list' ? own
    : variant === 'kyun' ? (own.length ? own : all.filter((t) => !t.variant_only && /kyun|kyon/i.test(t.hook)))
      : all.filter((t) => !t.variant_only);
  if (!ok.length && variant !== 'story') return pickTopic(date, { topics, history: [...history, { date: addDays(date, -1), variant: 'list' }], log, festivals });
  const week = history.filter((h) => h.date >= addDays(date, -6) && h.date < date);
  const khatuWeek = week.filter((h) => (h.topic ? topics.find((t) => t.id === h.topic) : slugTopic(h.slug, topics))?.deity === 'khatu').length;
  const wd = WEEKDAY_DEITY[weekday(date)] || [];
  const score = (t, i) => (t.festival ? 0 : 10) + (t.deity === 'khatu' && khatuWeek < 2 ? 0 : wd.includes(t.deity) ? 1 : 3) + t.p * 0.1 + i * 0.0001;
  const best = ok.map((t, i) => ({ t, s: score(t, i) })).sort((a, b) => a.s - b.s)[0];
  return { topic: best?.t || null, variant, art: artFor(date, history) };
}

// ---------------------------------------------------------------- the job: what to make now

const IST = 5.5 * 3600e3;
const istHM = (ms) => new Date(ms + IST).toISOString().slice(11, 16);
/** Kaggle windows of the coordinator (no new GPU session for movie-type jobs 09:00-11:30 and 18:30-21:00 IST). */
export const KAGGLE_WINDOWS = [['09:00', '11:30'], ['18:30', '21:00']];
export const inKaggleWindow = (hm) => KAGGLE_WINDOWS.some(([a, b]) => hm >= a && hm < b);

/**
 * What the `facts` job makes now: today's Short when it is planned, not made yet and still ahead of its 17:00 time
 * (a missed evening-before run), else tomorrow's (the normal case: made the evening before, like the Kalyug episode).
 * { mode: produce | write | none, release, file?, slug?, publish_at, why?, topic?, variant?, art?, gpu }
 */
export function factsDue({ root = '.', today = istToday(), now = Date.now(), inputs = loadInputs(root), spec } = {}) {
  const info = (file) => {
    const s = JSON.parse(read(path.join(root, file)));
    return { mode: 'produce', file, slug: s.slug, release: s.release, publish_at: s.publish_at || PUBLISH_AT, topic: s.topic, variant: s.variant, art: s.art };
  };
  const gpu = !inKaggleWindow(istHM(now));
  if (spec) return { ...info(spec), gpu };
  if (process.env.FACTS === 'off') return { mode: 'none', why: 'repo variable FACTS=off', gpu };
  const log = read(path.join(root, 'automation/log.md'));
  const days = istHM(now) < '14:00' ? [today, addDays(today, 1)] : [addDays(today, 1)];
  const why = [];
  for (const day of days) {
    if (!planDay(day, inputs).uploads.some((u) => u.slot === 'facts')) { why.push(`${day}: no facts slot (cap)`); continue; }
    if (new RegExp(`^${day} \\| facts \\|`, 'm').test(log)) { why.push(`${day}: already scheduled`); continue; }
    const dir = path.join(root, SPEC_DIR);
    const f = (fs.existsSync(dir) ? fs.readdirSync(dir) : []).filter((x) => x.startsWith(`${day}-`) && x.endsWith('.json')).sort()[0];
    if (f) return { ...info(path.posix.join(SPEC_DIR, f)), gpu };
    const topics = loadTopics(root);
    const p = pickTopic(day, { topics, history: factsHistory(root), log, festivals: inputs.festivalList || [] });
    if (!p.topic) { why.push(`${day}: no topic left in the bank`); continue; }
    return { mode: 'write', release: day, publish_at: PUBLISH_AT, topic: p.topic.id, variant: p.variant, art: p.art, gpu };
  }
  return { mode: 'none', why: why.join('; ') || 'nothing due', gpu };
}

// ---------------------------------------------------------------- spec rules (scripts/validate.mjs calls these)

/** Estimated length (s) of a facts spec (same arithmetic as render-story.mjs sceneSeconds + cross-fades). */
export function estimateSeconds(scenes = []) {
  const per = scenes.map((sc) => Math.max(2.6, String(sc.tts || '').length / CPS + 1.0));
  return per.reduce((a, b) => a + b, 0) - 0.4 * Math.max(0, per.length - 1);
}

/** Start time (s) of each scene. */
const starts = (scenes) => {
  const out = [];
  let t = 0;
  for (const sc of scenes) { out.push(t); t += Math.max(2.6, String(sc.tts || '').length / CPS + 1.0) - 0.4; }
  return out;
};

/** The facts rules for one spec (problems; empty = OK). topics = the bank. */
export function checkFactsSpec(s, { topics = loadTopics('.') } = {}) {
  const e = [];
  const need = (ok, msg) => { if (!ok) e.push(msg); };
  const v = s.variant;
  need(VARIANTS.includes(v), `variant: ${VARIANTS.join(' | ')}`);
  need(ARTS.includes(s.art), `art: ${ARTS.join(' | ')} (the art-style A/B)`);
  const pilot = s.release === 'pilot';
  need(pilot ? /^facts-pilot-[a-z0-9-]+$/.test(s.slug || '') : /^\d{4}-\d{2}-\d{2}-facts-[a-z0-9-]+$/.test(s.slug || '') && s.slug.startsWith(s.release),
    'slug: <release yyyy-mm-dd>-facts-<topic id>');
  need(pilot || /^\d{2}:\d{2}$/.test(s.publish_at || ''), 'publish_at: IST time on the release day (e.g. "17:00")');
  const t = topics.find((x) => x.id === s.topic);
  need(t, `topic: an id from ${TOPICS_FILE}`);
  if (t && !pilot) need(String(s.slug).endsWith(`-facts-${t.id}`), 'slug must end with -facts-<topic id>');
  need(s.title && s.title.length <= 45 && !DEVANAGARI.test(s.title), 'title: Roman, max 45 characters (the title bar on the video)');
  need(s.kicker && s.kicker.length <= 22, 'kicker: max 22 characters');
  need(s.deity && !/[|\n]/.test(s.deity) && s.summary && s.summary.length <= 160 && !/[|\n]/.test(s.summary), 'deity and summary (max 160, no "|") for the log line');
  need(/no text/i.test(s.style || '') && !STUDIO.test(s.style || ''), 'style: must include "no text" and never name a studio (Pixar, Disney, Ghibli...)');
  if (s.art === 'illustrated') need(/hand[- ]drawn|illustrat/i.test(s.style || ''), 'art illustrated: the style says "warm hand-drawn illustration, clean outlines, soft sunset light"');
  if (s.art === 'cinematic') need(/cinematic/i.test(s.style || ''), 'art cinematic: the style says "hyper-real cinematic ... golden"');
  need(typeof s.source === 'string' && s.source.length >= 12, 'source: the citation (work + kand/sarga, parva, khand or the temple/government site)');
  if (t) need(s.source && s.source.toLowerCase().includes(String(t.cite.work).split(/[;(,]/)[0].trim().toLowerCase()), `source must name the topic's work ("${t.cite.work}")`);
  const desc = s.youtube_description || '';
  need(s.source && desc.includes(s.source), 'youtube_description must carry the exact "source" citation');
  need(/sanketik/i.test(desc) && /AI/.test(desc), 'youtube_description: "Chitra AI dwara banaye gaye hain (sanketik). Awaaz AI se." (synthetic media)');
  need(/subscribe/i.test(desc) && DEVANAGARI.test(desc), 'youtube_description: a Devanagari line and a like/share/subscribe line');
  need(v === 'gita' ? /#gita/i.test(desc) : /#facts/i.test(desc), `youtube_description hashtags: ${v === 'gita' ? '#gita #krishna' : '#facts #story'}`);

  // facts: the existing facts-source rule (2 URLs per fact, at least one not Wikipedia / a blog)
  const facts = Array.isArray(s.facts) ? s.facts : [];
  need(facts.length >= 3, 'facts: at least 3 {claim, source, sources: [2+ URLs]} for what the narration states');
  facts.forEach((f, i) => {
    need(f?.claim && urls(f.sources).length >= 2, `fact ${i + 1}: a claim and 2 independent source URLs`);
    need(urls(f?.sources).some((u) => !WEAK.test(u)), `fact ${i + 1}: Wikipedia and blogs don't count alone; add the scripture text site, the temple trust or a *.gov.in page`);
  });

  // scenes
  const scenes = Array.isArray(s.scenes) ? s.scenes : [];
  const body = scenes.filter((sc) => !sc.endcard);
  // a topic may set its own length (the 35-47 s "धर्म की जिज्ञासा" questions); scenes follow it
  const ownLen = Array.isArray(t?.length) ? t.length : null;
  const [lo, hi] = ownLen && ownLen[1] <= 50 ? [5, 8] : SCENES[v] || [5, 16];
  need(scenes.length >= lo && scenes.length <= hi, `${v}: ${lo}-${hi} scenes including the end card (has ${scenes.length})`);
  need(scenes.at(-1)?.endcard === true && !scenes.at(-1)?.prompt, 'the last scene is the end card {endcard: true, tts, sub} (no prompt)');
  need(/subscribe/i.test(scenes.at(-1)?.sub || '') && /like/i.test(scenes.at(-1)?.sub || '') && /share/i.test(scenes.at(-1)?.sub || ''), 'end card: like, share and subscribe ask');
  const secs = estimateSeconds(scenes);
  const [a, b] = ownLen || LENGTH[v] || [38, 165];
  need(secs >= a && secs <= b, `estimated length ${Math.round(secs)} s; the ${v} variant is ${a}-${b} s (~${CPS} Devanagari characters a second + ~1 s a scene)`);
  scenes.forEach((sc, i) => {
    const n = `scene ${i + 1}`;
    need(sc.tts && DEVANAGARI.test(sc.tts) && !/\d/.test(sc.tts), `${n}: tts Devanagari, numbers as words`);
    need(sc.tts && sc.tts.length <= (sc.endcard ? 150 : 140), `${n}: tts max ${sc.endcard ? 150 : 140} characters`);
    need(sc.sub && !DEVANAGARI.test(sc.sub) && sc.sub.length <= 130, `${n}: sub Roman Hinglish, max 130 characters`);
    if (sc.endcard) return;
    const p = String(sc.prompt || '');
    need(p.length >= 40 && !/\b(text|letters|writing|sign|caption|words|logo)\b/i.test(p.replace(/no (text|letters|writing|logo|watermark)/gi, '')), `${n}: prompt missing, too short or asks for text`);
    need(['in', 'out', 'pan'].includes(sc.motion), `${n}: motion in, out or pan`);
    need(!GORE.test(p.replace(/\bno (blood|gore|violence)\b/gi, '')), `${n}: no gore or violence (light, petals, dust instead)`);
    need(!STUDIO.test(p), `${n}: never name a studio or copy a film / TV look`);
    need(!/\b(actor|actress|celebrity|tv serial|film still)\b/i.test(p), `${n}: never a real actor's likeness or a TV/film frame`);
    if (/hanuman|bajrang|maruti|anjaneya/i.test(p) && !/salasar/i.test(p)) {
      need(/no beard|beardless|clean[- ]shaven/i.test(p), `${n}: Hanuman ji: add "clean-shaven vanara face, no beard" (FLUX draws a beard; only Salasar Balaji has daadhi-moonchh)`);
    }
    if (sc.animate !== undefined) {
      need(typeof sc.animate === 'string' && sc.animate.length >= 20 && sc.animate.length <= 300 && !/\b(run|running|fight|fighting|dance|dancing|battle|explod|lightning strike|fast)\b/i.test(sc.animate), `${n}: animate: one sentence of GENTLE motion`);
      need(sc.tts.length <= 95, `${n}: an animated scene's tts is max 95 characters (the clip is at most ~8 s)`);
    }
  });
  const marked = body.filter((sc) => sc.animate !== undefined).length;
  need(marked >= 1 && marked <= 4, `mark 1-4 scenes with "animate" (has ${marked}): the GPU budget makes at most 3-4 clips`);
  // hook in the first ~3 s: the name first, a question or exclamation, short
  const first = scenes[0] || {};
  need(String(first.tts || '').length <= 75 && /[?!]/.test(first.tts || ''), 'scene 1: the hook in the first ~3 s: max 75 characters, a question or exclamation');
  need(/close[- ]?up|portrait/i.test(first.prompt || ''), 'scene 1: a dramatic close-up of the deity/character (it is the cover frame)');
  // demeaning actions, never on a deity
  const txt = [s.hook, s.youtube_title, s.title, ...(s.cover_lines || []), ...scenes.flatMap((sc) => [sc.prompt, sc.tts, sc.sub])].join(' ');
  need(!DEMEAN.test(txt), 'respect rule: a dramatic action is fine, never a deity humiliated, hit, kicked or anything vulgar');
  need(!PSEUDO.test(`${txt} ${s.youtube_description || ''} ${s.instagram_caption || ''} ${s.facebook_caption || ''}`), 'no pseudo-science or health claims ("bacteria", "positive energy", "vaigyanik karan"): answer from shastra or parampara');
  // folk label, numbers
  const folk = t?.label === 'tradition' || facts.some((f) => f.kind === 'tradition') || scenes.some((sc) => sc.label === 'tradition');
  if (folk) need(scenes.some((sc) => FOLK_MARK.test(sc.tts || '')), 'a folk / temple-belief topic: say it in the narration ("मान्यता है…", "लोककथा के अनुसार…")');
  for (const h of [s.hook, s.youtube_title, ...(s.cover_lines || [])]) {
    const ok = (t?.numbers_ok || []).map((x) => x.toLowerCase());
    if (GUNA.test(h || '') && !ok.some((x) => GUNA.test(x))) e.push('no invented multipliers ("10 guna") in the hook/title unless the text says so (topic numbers_ok)');
    for (const m of String(h || '').replace(/#\w+/g, '').match(NUMBER_WORDS) || []) {
      if (!ok.includes(m.toLowerCase()) && !(v === 'gita' && /^\d+$/.test(m)) && !(v === 'list' && /^\d$/.test(m))) e.push(`hook/title number "${m}" is not in the topic's numbers_ok (no invented numbers)`);
    }
  }
  // the moral (story/kyun/list): one scene marked moral before the end card
  if (v !== 'gita') need(body.some((sc) => sc.moral === true), 'one scene "moral": true: the one-line moral before the end card');
  // variant rules
  if (v === 'kyun') {
    need(/\?/.test(s.hook || '') && /kyun|kyon|kaise|kisne|kaun|क्यों|कैसे|किसने|कौन/i.test(`${s.hook} ${s.youtube_title}`), 'kyun: the hook/title is the "...kyun?" question');
    need(/\?/.test(first.tts || '') && /क्यों|कैसे|किसने|कौन/.test(first.tts || ''), 'kyun: the first spoken line is the question ("... क्यों ...?")');
    const r = scenes.findIndex((sc) => sc.reveal === true);
    const st = starts(scenes);
    need(r > 0 && st[r] / secs >= 0.5 && st[r] / secs <= 0.85, `kyun: mark the answer scene "reveal": true at ~55-85 % of the video (is ${r > 0 ? Math.round((st[r] / secs) * 100) : '-'} %)`);
  }
  if (v === 'kyun' || s.cover_lines) {
    const cl = s.cover_lines || [];
    need(cl.length === 3 && cl.every((l) => DEVANAGARI.test(l) && [...l].length <= 16) && /\?$/.test(cl[2] || ''), 'cover_lines: 3 short Devanagari lines (max 16 characters each): white / the key name or verb in gold / red band ending with "?"');
  }
  if (v === 'list') {
    const items = body.filter((sc) => Number.isInteger(sc.item));
    need(items.length >= 3 && items.length <= 5 && items.every((sc, k) => sc.item === k + 1), 'list: 3-5 item scenes numbered "item": 1..n in order');
    items.forEach((sc) => {
      need(typeof sc.cite === 'string' && sc.cite.length >= 8, `list item ${sc.item}: "cite": its scripture citation`);
      if (sc.label === 'tradition') need(FOLK_MARK.test(sc.tts || ''), `list item ${sc.item}: a folk item says "मान्यता…" in its line`);
    });
    need(!body[0]?.item, 'list: scene 1 is the hook/intro line, the items follow');
  }
  if (v === 'gita') {
    const sh = s.shloka || {};
    need(DEVANAGARI.test(sh.text || '') && /Bhagavad Gita \d{1,2}\.\d{1,2}/i.test(sh.ref || '') && urls(sh.sources).length >= 2, 'gita: shloka {text (exact, Devanagari), ref "Bhagavad Gita <ch>.<verse>", sources: 2 URLs with the same text}');
    const sc = scenes.find((x) => x.shloka === true);
    need(sc && (sc.tts || '').includes(sh.text || '#'), 'gita: one scene "shloka": true speaks the shloka text exactly');
    need(sc && typeof sc.tts_meaning === 'string' && DEVANAGARI.test(sc.tts_meaning), 'gita: the shloka scene has "tts_meaning": its Hindi meaning, spoken instead if the Sanskrit fails the pronunciation gate');
    const ref = (sh.ref || '').match(/\d{1,2}\.\d{1,2}/)?.[0] || '#';
    need(/😱/.test(s.youtube_title || '') && (s.youtube_title || '').includes(`Bhagavad Gita ${ref}`) && /#gita/i.test(s.youtube_title || '') && /#krishna/i.test(s.youtube_title || ''), 'gita title: "<hook> 😱 | Bhagavad Gita <ch.verse> #gita #krishna"');
  } else {
    const yt = s.youtube_title || '';
    need(/^.{8,48} (😱|🤯) ?#facts \| .+ Katha( \| .+)?$/u.test(yt.replace(/ #Shorts$/, '')) || /^.+ (😱|🤯) #facts \| .+ Katha/u.test(yt), 'youtube_title: "<hook> 😱 #facts | <Deity> Katha | <देवनागरी>"');
  }
  const yt = s.youtube_title || '';
  need(yt.length <= 100 && DEVANAGARI.test(`${yt} ${s.youtube_tags || ''}`), 'youtube_title max 100 characters; Devanagari keywords in the title or tags');
  return e;
}

// ---------------------------------------------------------------- the Whisper deity-name gate

// Facts narration names: the bhajan gate's names (music/lyrics/spelling.json) plus the characters these Shorts name.
// `ok` = what Whisper must hear at that position (the key sound: aspirates, the y-glide of श्याम); spelling variants that
// keep the sound pass. Positions right after श्री are skipped (Whisper writes श्री श्याम as शाम even when spoken right).
export const FACTS_NAMES = {
  ...RULES.names,
  हनुमान: { deity: 'hanuman', ok: '^ह[नण][ुू]?म' },
  खाटू: { deity: 'khatu', ok: '^खा?[टठ]' },
  बर्बरीक: { deity: 'khatu', ok: '^बा?र्?बा?र' },
  घटोत्कच: { deity: 'khatu', ok: '^घ' },
  मोरवी: { deity: 'khatu', ok: '^म[ोौ]र' },
  मौरवी: { deity: 'khatu', ok: '^म[ोौ]र' },
  भीम: { deity: 'mahabharat', ok: '^भ' },
  भीष्म: { deity: 'mahabharat', ok: '^भी?[षश]' },
  अर्जुन: { deity: 'mahabharat', ok: '^अ?र्?ज' },
  युधिष्ठिर: { deity: 'mahabharat', ok: '^यु?ध' },
  द्रौपदी: { deity: 'mahabharat', ok: '^द्?र?[ौो]' },
  विष्णु: { deity: 'vishnu', ok: '^[वब]ि?ष' },
  जगन्नाथ: { deity: 'krishna', ok: '^ज' },
  बलराम: { deity: 'krishna', ok: '^बल' },
  सुदर्शन: { deity: 'vishnu', ok: '^सु?द' },
  जटायु: { deity: 'ram', ok: '^ज[टठ]' },
  संपाती: { deity: 'ram', ok: '^स[ंम]्?प' },
  सम्पाती: { deity: 'ram', ok: '^स[ंम]्?प' },
  रावण: { deity: 'ram', ok: '^रा?व' },
  कुंभकर्ण: { deity: 'ram', ok: '^कु?[ंम]्?भ' },
  लक्ष्मी: { deity: 'devi', ok: '^ल[क]?्?[षछ]' },
  दुर्गा: { deity: 'devi', ok: '^दु?र्?ग' },
  पार्वती: { deity: 'shiv', ok: '^पा?र्?व' },
  सालासर: { deity: 'hanuman', ok: '^सा?ला?स' },
  षष्ठी: { deity: 'devi', ok: '^[षश]' },
  शनि: { deity: 'shani', ok: '^श[नण]' },
  कर्ण: { deity: 'mahabharat', ok: '^क[र]?्?[णन]' },
};
export const FACTS_RULES = { names: FACTS_NAMES };
export const QA_CER_MAX = 0.25; // whole narration (edge-tts Madhur measured 4-5 % CER on 10 Nov 2026)

/** Name check of one spoken line against Whisper: { checked, right, wrong: [{word, heard}] } (every deity/character). */
export function lineNames(text, heard, rules = FACTS_RULES) {
  const ref = norm(text), hyp = norm(heard);
  const H = [...hyp];
  const map = align(ref, hyp);
  const res = { checked: 0, right: 0, wrong: [] };
  for (const o of nameOccurrences(text, rules)) {
    if (o.sri) continue;
    const js = map.slice(o.at, o.at + o.len).filter((x) => x >= 0);
    res.checked++;
    const got = js.length ? H.slice(Math.min(...js), Math.max(...js) + 1).join('') : '';
    if (got && new RegExp(rules.names[o.word].ok, 'u').test(got)) res.right++;
    else res.wrong.push({ word: o.word, heard: got });
  }
  return res;
}

/**
 * The gate for one rendered narration: asr = { lines: [{ i, heard }] } (voice/facts_asr.py on the per-scene voice files).
 * ok = every checked name position heard right, at least 2 checked, the whole-narration CER <= QA_CER_MAX. The shloka
 * line (gita) is judged like a mantra take: CER <= 0.5 (music/mantra-takes.mjs CER_MAX) and its names right.
 * Never loosened (owner, 14 Nov 2026: "Quality me no compromised"): a failure means re-voice once, then skip.
 */
export function qaGate(spec, asr) {
  const lines = asr?.lines || [];
  const out = { ok: false, checked: 0, right: 0, wrong: [], cer: null, shloka: null, why: [] };
  let ref = '', hyp = '';
  spec.scenes.forEach((sc, i) => {
    const l = lines.find((x) => x.i === i);
    const text = sc.shloka && sc.spoken === 'meaning' ? sc.tts_meaning : sc.tts;
    if (!l) { out.why.push(`scene ${i + 1}: no transcript`); return; }
    if (sc.shloka && sc.spoken !== 'meaning') {
      const c = cer(spec.shloka?.text || text, l.heard);
      const n = lineNames(spec.shloka?.text || text, l.heard);
      out.shloka = { cer: c, names: n, ok: c != null && c <= 0.5 && !n.wrong.length };
      if (!out.shloka.ok) out.why.push(`shloka: CER ${c}${n.wrong.length ? `, names ${n.wrong.map((w) => `${w.word}->"${w.heard}"`).join(', ')}` : ''}`);
      return;
    }
    const n = lineNames(text, l.heard);
    out.checked += n.checked; out.right += n.right;
    out.wrong.push(...n.wrong.map((w) => ({ ...w, scene: i + 1 })));
    ref += `${text} `; hyp += `${l.heard} `;
  });
  out.cer = cer(ref, hyp);
  if (out.wrong.length) out.why.push(`names not heard right: ${out.wrong.map((w) => `scene ${w.scene} ${w.word}->"${w.heard}"`).join(', ')}`);
  if (out.checked < 2) out.why.push(`only ${out.checked} name position(s) checked (needs 2: the narration names the deity)`);
  if (out.cer == null || out.cer > QA_CER_MAX) out.why.push(`narration CER ${out.cer} > ${QA_CER_MAX}`);
  out.ok = !out.why.length;
  return out;
}

// ---------------------------------------------------------------- CLI

function setOutput(o) {
  console.log(JSON.stringify(o));
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(o).filter(([, x]) => typeof x !== 'object').map(([k, x]) => `${k}=${String(x).replace(/\n/g, ' ')}\n`).join(''));
}

function main() {
  const args = process.argv.slice(2);
  const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
  const cmd = args[0];
  if (cmd === 'bank') {
    const t = loadTopics('.');
    const e = checkTopicBank(t);
    console.log(e.length ? e.map((x) => `- ${x}`).join('\n') : `OK: ${t.length} topics (${['scripture', 'tradition', 'temple'].map((l) => `${t.filter((x) => x.label === l).length} ${l}`).join(', ')}; ${t.filter((x) => x.deity === 'khatu').length} Khatu)`);
    process.exit(e.length ? 1 : 0);
  }
  if (cmd === 'pick') {
    const date = opt('--date') || addDays(istToday(), 1);
    const inputs = loadInputs('.');
    const p = pickTopic(date, { topics: loadTopics('.'), history: factsHistory('.'), log: read('automation/log.md'), festivals: inputs.festivalList || [] });
    console.log(JSON.stringify({ date, variant: p.variant, art: p.art, topic: p.topic }, null, 1));
    return;
  }
  if (cmd === 'due') {
    const now = opt('--now') ? Date.parse(opt('--now')) : Date.now();
    setOutput(factsDue({ today: opt('--today') || istToday(), now, spec: opt('--spec') || undefined }));
    return;
  }
  if (cmd === 'check') {
    const e = checkFactsSpec(JSON.parse(read(args[1])));
    console.log(e.length ? e.map((x) => `- ${x}`).join('\n') : `OK: ${args[1]}`);
    process.exit(e.length ? 1 : 0);
  }
  if (cmd === 'qa') {
    const spec = JSON.parse(read(opt('--spec')));
    const r = qaGate(spec, JSON.parse(read(opt('--asr'))));
    setOutput({ ok: r.ok, checked: r.checked, right: r.right, cer: r.cer, shloka_ok: r.shloka ? r.shloka.ok : '', why: r.why.join('; ') });
    process.exit(r.ok ? 0 : 1);
  }
  if (cmd === 'plan') {
    const inputs = loadInputs('.');
    const from = opt('--from') || istToday();
    const history = factsHistory('.');
    const topics = loadTopics('.');
    const log = read('automation/log.md');
    for (let i = 0; i < Number(opt('--days') || 14); i++) {
      const d = addDays(from, i);
      if (!planDay(d, inputs).uploads.some((u) => u.slot === 'facts')) { console.log(`${d} -`); continue; }
      const have = history.find((h) => h.date === d && h.topic);
      const p = have ? { variant: have.variant, art: have.art, topic: topics.find((t) => t.id === have.topic) } : pickTopic(d, { topics, history, log, festivals: inputs.festivalList || [] });
      console.log(`${d} ${p.variant}/${p.art} ${p.topic?.id || '(none)'}: ${p.topic?.hook || ''}${have ? ' (spec written)' : ''}`);
      if (have) continue;
      if (p.topic) history.push({ date: d, topic: p.topic.id, variant: p.variant, art: p.art, slug: `${d}-facts-${p.topic.id}` });
    }
    return;
  }
  console.log('usage: node scripts/facts.mjs bank | pick --date D | due [--spec F] | check <spec> | qa --spec F --asr A | plan [--days N]');
  process.exit(2);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
