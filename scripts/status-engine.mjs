#!/usr/bin/env node
// Festival status engine (owner, 11 Nov 2026): the channel's only format that went viral is the festival "status" Short
// (Choti Diwali Status 2026: 798 views; Dhanteras Status 456; Govardhan Puja Status 56 within hours of 00:30), released
// the night before or early on the day, when people pick tomorrow's WhatsApp status. So every festival in
// automation/festivals.json (two panchang sources each) gets 15-25 s loopable status Shorts:
//   status tier: the evening before at 20:00 IST (slot `eve`) and 00:30 IST on the day (slot `status`)
//   big tier:    + 08:30 IST on the day (slot `statusday`), each variant with its own 3 pictures; Janmotsav also 2 days
//                before (festivals.json `variants`)
// and the morning slot of normal days is a weekday "day status" Short (Somvar Mahadev, Mangalvar Salasar Balaji, ...;
// Ekadashi: Gyaras Khatu Shyam). scripts/day-plan.mjs decides which of them fit the 3-uploads-a-day cap.
// Titles: "<Festival> Status <year> | <Hindi> स्टेटस वीडियो #Shorts", one festivals.json name per variant, so no two
// uploads share a title. The first frame is a bold Hindi hook ("कल है खाटू श्याम जन्मोत्सव 🙏"), every scene asks
// "स्टेटस पर लगाएं", and the video ends on its own first frame (render-story.mjs `loop`), so it replays seamlessly.
//
//   node scripts/status-engine.mjs due [--today D] [--family D] [--dry] --out <dir>   what the `status` job makes now:
//        writes <dir>/family.json (the base spec: story/status/<date>.json or the theme) and <dir>/due.json
//   node scripts/status-engine.mjs variants --base <W>/scenes.json --due <dir>/due.json   writes <W>/v-<slug>.json for
//        each due variant (pictures and Kaggle clips of the base reused) and prints one line per variant:
//        <file>\t<slug>\t<day>\t<slot>\t<at>
//   node scripts/status-engine.mjs day --date D --out story/today/scenes.json [--log automation/log.md]   the morning
//        day status Short: normally made THE EVENING BEFORE by `due` / `variants` (owner, 16 Nov 2026: public 06:00 IST
//        for the morning WhatsApp status); the story job runs `day` only when that render is missing
//   node scripts/status-engine.mjs trial --base <W>/scenes.json --spec <W>/v-<slug>.json [--out F] [--graduation MANUAL]
//        the Instagram Trial Reel spec of a festival variant (trialVariant; daily.yml, only when vars.IG_TRIAL == "on")
//   node scripts/status-engine.mjs plan [--from D] [--to D]    every planned status upload with its title (dry run)
//   node scripts/status-engine.mjs calendar                    rewrite automation/calendar.md from festivals.json
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DAY_THEMES, DEFAULT_PICKS, DEFAULT_WISH, MANTRA, THEMES } from './status-themes.mjs';

export const STYLE = '3D animated devotional movie style, Pixar quality, soft cinematic lighting, rich warm festive colours, glowing diyas, vertical friendly centred composition, no text, no letters, no writing';
export const CTA = 'स्टेटस पर लगाएं 📲';
// Share push (owner, 16 Nov 2026: the status Shorts that worked were SHARED, Choti Diwali 31 shares, Dhanteras 25): the
// last line of every status Short's YouTube description (scripts/youtube.mjs keeps it last, after the download link,
// festival links and the bhajan line). A share ask, not like/comment bait; NOT on Facebook, whose bait rule
// (scripts/fb.mjs FB_BAIT) forbids "शेयर" (Meta demotes share asks), and the FB caption is built without it.
export const SHARE_LINE = '📲 अपने WhatsApp स्टेटस पर लगाएं और परिवार में शेयर करें 🙏';
// Shorts feed audit (17 Nov 2026, automation/feed-audit-2026-11-17.md): status Shorts lost 40-60% of viewers in the first
// 3 s and only 5-16% reached the end (no replays), so a status loop is now 12-20 s (3 scenes of STATUS_HOLD s, the song
// rounds up to whole bars), its last scene ends on its own picture and line (no "सब्सक्राइब" line, no spoken ask: that
// broke the loop into an end card; the subscribe ask stays in the description and the channel's first comment
// scripts/first-comment.mjs), and a scene with an animated clip opens the video when the first pick has none.
// Research of 20 Nov 2026 (E:/SK/epifive-social/ALGO-RESEARCH-2026-11.md; YouTube "viewed vs swiped away" and Instagram
// watch time decide reach in the first 1-2 s; Instagram ranks SENDS per reach highest for non-followers):
//   - frame 0 = the deity's face, large, with the festival name big (faceFirst + the deity-first scene order in compose);
//     the YouTube thumbnail is that same frame (scripts/youtube.mjs coverFrame, 0.1 s);
//   - the last SEND_SECONDS show a forwardable greeting ("आपको और आपके परिवार को / <festival> की शुभकामनाएं 🙏") with the
//     pill SEND_PILL, then the loop fades into frame 0 (render-story.mjs + status-overlays.mjs, spec.send);
//   - 15-30 s: 3 scenes of STATUS_HOLD = 6 s (~17-20 s with the bar-rounded song);
//   - Instagram caption: the greeting, one Roman line, SEND_PILL and at most IG_TAGS_MAX hashtags.
export const STATUS_HOLD = 6;
export const SEND_PILL = 'इसे अपने परिवार को भेजें 🙏';
export const SEND_SECONDS = 3;
export const IG_TAGS_MAX = 5;
// Instagram Trial Reels (Graph API POST /{ig-user}/media with `trial_params` {graduation_strategy: MANUAL |
// SS_PERFORMANCE}, media_type REELS, standard upload by video_url; developers.facebook.com reference, checked 20 Nov
// 2026): a second hook of a festival's 00:30 variant is shown to non-followers first (`trial` below; daily.yml runs it
// only when the repo variable IG_TRIAL is "on"). SS_PERFORMANCE = Instagram shares it to followers if it performs well.
export const TRIAL_GRADUATION = 'SS_PERFORMANCE';
export const TRIAL_AT = '07:30';
export const FACE_FIRST = "the deity's face large, sharp and clearly visible in the upper half of the picture";
/** A deity scene's prompt asks for the face large and clear (frame 0 is a deity picture); a Shivling has no face. */
export function faceFirst(scene) {
  if (scene?.deity && scene.prompt && !/shivling/i.test(scene.prompt) && !scene.prompt.includes(FACE_FIRST)) scene.prompt = `${scene.prompt}, ${FACE_FIRST}`;
  return scene;
}
/** The forwardable greeting of the last seconds: { pre, big, line } (theme `wish` or DEFAULT_WISH; {name} = Hindi name). */
export function wishFor(wish, nameHi) {
  const [pre, big] = (Array.isArray(wish) && wish.length === 2 ? wish : DEFAULT_WISH).map((x) => x.replace('{name}', nameHi));
  return { pre, big, line: `${pre}${/(को|पर)$/.test(pre) ? "" : ","} ${big}` };
}
export const DEFAULT_VARIANTS = {
  status: [{ slot: 'eve', offset: -1, at: '20:00' }, { slot: 'status', offset: 0, at: '00:30' }],
  big: [{ slot: 'eve', offset: -1, at: '20:00' }, { slot: 'status', offset: 0, at: '00:30' }, { slot: 'statusday', offset: 0, at: '08:30' }],
};
export const STATUS_SLOTS = ['eve', 'status', 'statusday'];
// How late a variant may still be made (after its publish time): later, it is skipped (the next variant covers it).
const GRACE_MIN = { eve: 150, status: 8 * 60, statusday: 3 * 60 };

const addDays = (date, n) => new Date(Date.parse(`${date}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const istNow = (now = Date.now()) => new Date(now + 5.5 * 3600e3).toISOString();
const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } };
const slugify = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const noEmoji = (t) => String(t).replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').replace(/\s+/g, ' ').trim();
const clone = (o) => JSON.parse(JSON.stringify(o));

// ---------------------------------------------------------------- calendar

/** automation/festivals.json entries, by date. */
export function loadFestivals(root = '.') {
  const j = JSON.parse(read(path.join(root, 'automation/festivals.json')) || '{"festivals":[]}');
  return (j.festivals || []).slice().sort((a, b) => a.date.localeCompare(b.date));
}

export const variantsOf = (f) => f.variants || DEFAULT_VARIANTS[f.tier] || [];

/** Every status upload the calendar asks for: [{ date (public day), slot, at, k, festival, name, picks, tier }]. */
export function placements(festivals) {
  const out = [];
  for (const f of festivals) {
    variantsOf(f).forEach((v, k) => {
      const names = f.names || [{ en: f.label, hi: f.label }];
      out.push({ date: addDays(f.date, v.offset), slot: v.slot, at: v.at, offset: v.offset, k, festival: f, name: names[k % names.length], picks: v.picks, hook: v.hook, tier: f.tier });
    });
  }
  return out.sort((a, b) => `${a.date}T${a.at}`.localeCompare(`${b.date}T${b.at}`));
}

/** The bold Hindi hook of the first frame (and its spoken and Roman forms). A festivals.json variant may set its own
 *  `hook` {hi, say?, roman} (Gopashtami 2026: "गोपाष्टमी की शुभकामनाएं 🐄" instead of "आज है गोपाष्टमी 🙏"). */
export function hookFor(p) {
  if (p.hook?.hi && p.hook?.roman) return { hi: p.hook.hi, say: p.hook.say || `${noEmoji(p.hook.hi)}!`, roman: p.hook.roman };
  const { hi, en } = p.name;
  if (p.slot === 'eve') {
    const [h, r] = p.offset <= -2 ? ['परसों है', 'Parson hai'] : ['कल है', 'Kal hai'];
    return { hi: `${h} ${hi} 🙏`, say: `${h} ${hi}!`, roman: `${r} ${en} 🙏` };
  }
  if (p.slot === 'statusday') return { hi: `${hi} की बधाई 🙏`, say: `${hi} की बधाई!`, roman: `${en} ki badhai 🙏` };
  return { hi: `आज है ${hi} 🙏`, say: `आज है ${hi}!`, roman: `Aaj hai ${en} 🙏` };
}

export const statusTitle = (name, year) => `${name.en} Status ${year} | ${name.hi} स्टेटस वीडियो #Shorts`;
export const dayTitle = (name) => `${name.en} Status | ${name.hi} स्टेटस वीडियो #Shorts`;
export const slugOf = (p) => `${p.date}-${p.slot}-${slugify(p.name.en)}`;
export const titleOf = (p) => statusTitle(p.name, p.festival.date.slice(0, 4));

// ---------------------------------------------------------------- specs

/** The family's base spec: a hand-written story/status/<date>.json (festivals.json `spec`) or one built from the theme. */
export function buildFamily(f, root = '.') {
  if (f.spec && fs.existsSync(path.join(root, f.spec))) return JSON.parse(read(path.join(root, f.spec)));
  const t = THEMES[f.theme];
  if (!t) throw new Error(`festival ${f.date} ${f.key}: unknown theme "${f.theme}" and no spec`);
  return {
    slug: `${f.date}-status-${f.key}`, format: 'status', date: f.date, festival: f.label, theme: f.theme,
    title: 'Shyam Premi SN', kicker: kicker(f.names?.[0]?.en || f.label), playlist: t.playlist, voice: t.voice, signoff: 'Jai Shree Shyam', style: STYLE,
    desc: t.desc, deity: t.deity, hashtags: t.hashtags, tags: t.tags, ...(t.wish ? { wish: t.wish } : {}), scenes: clone(t.scenes).map(faceFirst),
  };
}

const kicker = (t) => {
  if (t.length <= 22) return t;
  let k = '';
  for (const w of t.split(/\s+/)) { if (`${k} ${w}`.trim().length > 22) break; k = `${k} ${w}`.trim(); }
  return k || t.slice(0, 22);
};
const joinTts = (a, b) => (`${a} ${b}`.length <= 110 ? `${a} ${b}` : a.length <= 110 ? a : a.slice(0, 110));
const mantraSource = (scenes, fallback) => {
  const m = scenes.find((s) => s.mantra)?.mantra;
  if (!m) return null;
  return Object.values(MANTRA).find(([t]) => t === m)?.[1] || fallback || 'parampara';
};
const dateText = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** The 3 pictures (base scene indices) of variant k. */
export function picksFor(content, p) {
  if (p.picks) return p.picks;
  const n = content.length;
  if (n >= 6) return DEFAULT_PICKS[6][p.k % 3];
  return [0, 1, 2].map((i) => (i + p.k) % Math.min(n, 3));
}

/** Points a variant scene at the base's picture / Kaggle clip (relative to the work dir), when they exist. */
function reuseAssets(scene, j, base, dir) {
  if (!dir) return scene;
  for (const rel of [`stills/${j}.jpg`, `images/${base.slug}-${j}.jpg`]) {
    if (fs.existsSync(path.join(dir, rel))) { scene.image = rel; break; }
  }
  if (base.scenes[j]?.video && fs.existsSync(path.join(dir, base.scenes[j].video))) scene.video = base.scenes[j].video;
  else delete scene.video;
  return scene;
}

/** Shared by festival variants and day status Shorts: hook on the first frame, the status ask (cta pill) on every scene, loop. */
function compose({ base, scenes, hook, slug, date, title, name, desc, hashtags, tags, festival, wish, extra = {} }) {
  const s = scenes.map((x) => { const c = faceFirst(clone(x)); delete c.endcard; c.hold = Math.min(c.hold || STATUS_HOLD, STATUS_HOLD); return c; });
  // Frame 0 = the deity's face (research 20 Nov 2026), moving where possible (feed audit 17 Nov 2026: animated first
  // scenes held viewers): a deity scene with a clip, else a deity scene, else a scene with a clip, else the first pick.
  const lead = [(x) => x.deity && x.video, (x) => x.deity, (x) => x.video].map((f) => s.findIndex(f)).find((i) => i >= 0) ?? 0;
  if (lead > 0) s.unshift(...s.splice(lead, 1));
  const first = s[0];
  // the blessing moves under the hook (unless the hook already says it: "आज है कार्तिक पूर्णिमा" over "कार्तिक पूर्णिमा")
  if (first.big && first.big.length <= 48 && !noEmoji(hook.hi).includes(noEmoji(first.big))) first.line = first.big;
  first.big = hook.hi;
  first.tts = joinTts(hook.say, first.tts);
  first.sub = `${noEmoji(hook.roman)}! ${first.sub}`;
  const greet = wishFor(wish ?? base.wish, name.hi);
  const mantraSrc = mantraSource(s, base.mantra_source);
  const year = (date || '').slice(0, 4);
  const firstRoman = noEmoji(hook.roman);
  const description = [
    `${firstRoman}! ${desc}. WhatsApp status ke liye sundar video.`,
    `${hook.hi} ${noEmoji(s[0].line || '')}`.trim(),
    greet.line,
    ...(mantraSrc ? [`Mantra: ${s.find((x) => x.mantra).mantra} (${mantraSrc})`] : []),
    '',
    'Is status video ko download karke apne WhatsApp / Instagram status par lagayein.',
    '',
    'Shyam Premi SN ki taraf se aapko aur aapke parivaar ko dher saari shubhkamnayein. Jai Shree Shyam 🙏',
    'Achha lage to Like karein, apno ko bhejein aur channel Subscribe karein.',
    hashtags.join(' '),
    ...(festival ? [`Tithi: Drik Panchang aur Prokerala (New Delhi), ${dateText(festival)}.`] : []),
    'Chitra AI dwara banaye gaye hain (sanketik). Awaaz AI se.',
  ].join('\n');
  // Search is the proven traffic of status Shorts (Gopashtami Status 2026: 95% of views from YouTube search), so the tags
  // carry the searched forms first: "<Festival> status (2026)", "whatsapp status", "status video" and the Hindi forms.
  const allTags = [...new Set([`${name.en} status`, ...(festival ? [`${name.en} status ${year}`] : []), `${name.hi} स्टेटस`, `${name.en} whatsapp status`,
    `${name.en} status video`, `${name.hi} स्टेटस वीडियो`, `${name.hi} व्हाट्सएप स्टेटस`, ...tags, 'Shyam Premi SN'])].slice(0, 15);
  const rest = s[0].sub.replace(/^[^!]*!\s*/, '');
  // Instagram: short and relevant (research 20 Nov 2026: 3-5 hashtags, no stuffing); the greeting and the send line in
  // Hindi, the same words as the video's last seconds. Facebook's text is composed by scripts/fb.mjs (greeting, no ask).
  const igCaption = [greet.line, `${hook.roman} ${rest}`.trim(), SEND_PILL, [...new Set(hashtags)].slice(0, IG_TAGS_MAX).join(' ')].join('\n');
  const fbCaption = [hook.roman, rest, hashtags.slice(0, 3).join(' ')].join('\n');
  return {
    slug, format: 'status', loop: true, date, ...(festival ? { festival_date: festival } : {}), festival: base.festival || name.en,
    family: base.slug, title: 'Shyam Premi SN', kicker: kicker(name.en), playlist: base.playlist, voice: base.voice || 'hf_alpha',
    signoff: base.signoff || 'Jai Shree Shyam', style: base.style || STYLE, cta: CTA, share_line: SHARE_LINE,
    send: { pre: greet.pre, big: greet.big, pill: SEND_PILL, seconds: SEND_SECONDS }, greeting: greet.line, status_name: { en: name.en, hi: name.hi },
    ...(mantraSrc ? { mantra_source: mantraSrc } : {}), ...extra,
    scenes: s,
    youtube_title: title, youtube_description: description, youtube_tags: allTags.join(', '),
    instagram_caption: igCaption, facebook_caption: fbCaption,
  };
}

/** One festival variant (placement p) from the family's base spec; dir = the work dir with the base's pictures/clips. */
export function buildVariant(base, p, { dir } = {}) {
  const content = base.scenes.filter((s) => !s.endcard);
  const picks = picksFor(content, p);
  const scenes = picks.map((j) => reuseAssets(clone(content[j]), j, base, dir));
  const f = p.festival;
  const t = THEMES[f.theme] || {};
  const desc = base.desc || t.desc || String(base.youtube_description || '').split('\n')[0].replace(/\.?\s*WhatsApp status ke liye\.?$/i, '');
  const hashtags = base.hashtags || t.hashtags || (String(base.youtube_description || '').match(/#[A-Za-z0-9]+/g) || []).slice(0, 6);
  const tags = base.tags || t.tags || String(base.youtube_tags || '').split(',').map((x) => x.trim()).filter(Boolean);
  return compose({
    base, scenes, hook: hookFor(p), slug: slugOf(p), date: p.date, title: titleOf(p), name: p.name, desc, hashtags, tags,
    festival: f.date, wish: base.wish || t.wish, extra: { publish_at: p.at, variant: p.k + 1, slot: p.slot },
  });
}

/** The Instagram Trial Reel of a festival variant (placement p): the same pictures, rotated, and a greeting-first hook
 *  ("<festival> की शुभकामनाएं 🙏" instead of "आज है ..."), so the two hooks can be compared on non-followers. Instagram only:
 *  slug "<variant slug>-trial", `ig_trial` = the graduation strategy, Instagram queue time TRIAL_AT on the public day. */
export function trialVariant(base, p, { dir, graduation = TRIAL_GRADUATION } = {}) {
  const content = base.scenes.filter((s) => !s.endcard);
  const picks = picksFor(content, p);
  const n = p.name;
  const long = `${n.hi} की शुभकामनाएं 🙏`;
  const hi = [long, `शुभ ${n.hi} 🙏`, `${n.hi} 🙏`].find((x) => x.length <= 34) || `${n.hi} 🙏`; // validate.mjs: hook max 34
  const hook = { hi, say: `${noEmoji(hi)}!`, roman: `${n.en} ki shubhkamnayein 🙏` };
  const spec = buildVariant(base, { ...p, hook, picks: [...picks.slice(1), picks[0]] }, { dir });
  return { ...spec, slug: `${spec.slug}-trial`, trial_of: spec.slug, ig_trial: graduation, publish_at: TRIAL_AT };
}

const weekNo = (date) => Math.floor(Date.parse(`${date}T00:00:00Z`) / (7 * 864e5));

/** The morning "day status" Short: weekday theme (or `gyaras` on an Ekadashi), names/hooks/first picture rotate weekly. */
export function dayStatus(date, { theme } = {}) {
  const wd = new Date(`${date}T12:00:00Z`).getUTCDay();
  const t = DAY_THEMES[theme ?? wd];
  if (!t) throw new Error(`no day status theme ${theme ?? wd}`);
  const w = weekNo(date);
  const name = t.names[w % t.names.length];
  const lead = name.lead ?? (w % 3);
  const order = [0, 1, 2].map((i) => (i + lead) % 3);
  const hi = t.hooks[w % t.hooks.length];
  const hook = { hi, say: noEmoji(hi).replace(/:/g, ',').replace(/!?$/, '!'), roman: `${name.en} 🙏` };
  const base = { slug: `day-${t.key}`, festival: name.en, playlist: t.playlist, voice: t.voice, signoff: 'Jai Shree Shyam', style: STYLE };
  return compose({
    base, scenes: order.map((i) => t.scenes[i]), hook, slug: `${date}-morning-${t.key}`, date, title: dayTitle(name), name,
    desc: t.desc, hashtags: t.hashtags, tags: t.tags, wish: t.wish, extra: { deity: t.deity, day_status: t.key },
  });
}

// ---------------------------------------------------------------- what the status job makes now

/** Tomorrow's day status Short (owner, 16 Nov 2026: public 06:00 IST, made the evening before; day-plan.mjs
 *  DAWN.daystatus): { date, theme, at } or { skip: reason }. */
export function dayStatusDue({ today, log = '', planFor }) {
  const date = addDays(today, 1);
  const u = planFor(date).uploads.find((x) => x.slot === 'morning' && x.kind === 'daystatus' && x.dawn);
  if (!u) return { skip: `${date}: no day status Short in the plan` };
  if (new RegExp(`^${date} \\| morning \\|`, 'm').test(log)) return { skip: `${date} morning: already in log.md` };
  return { date, theme: u.theme, at: u.at };
}

/**
 * The variants of ONE family (festival) to make in this run. eve variants publish today (evening), status/statusday
 * variants tomorrow; with `family` every not-yet-logged variant of that festival from today on (dry: all of them).
 * planFor(date) = scripts/day-plan.mjs planDay: a variant the 3-a-day cap dropped is not made.
 * When no festival variant is due, tomorrow's DAY STATUS Short (dayStatusDue) is the run's family instead
 * ({ family: date, daystatus: { date, theme, at } }); festivals always go first (their times are tighter).
 */
export function due({ today, now = Date.now(), log = '', festivals, planFor, family = '', dry = false, days = true }) {
  const tomorrow = addDays(today, 1);
  const skipped = [];
  const ok = [];
  for (const p of placements(festivals)) {
    if (family ? p.festival.date !== family : !((p.slot === 'eve' && p.date === today) || (p.slot !== 'eve' && p.date === tomorrow))) continue;
    const id = `${p.date} ${p.slot} ${p.festival.key}`;
    const planned = planFor(p.date).uploads.some((u) => u.slot === p.slot && u.festival === p.festival.key && u.k === p.k);
    if (!planned) { skipped.push(`${id}: dropped by the 3-a-day cap (scripts/day-plan.mjs)`); continue; }
    if (dry) { ok.push(p); continue; }
    if (new RegExp(`^${p.date} \\| ${p.slot} \\|`, 'm').test(log)) { skipped.push(`${id}: already in log.md`); continue; }
    const at = Date.parse(`${p.date}T${p.at}:00+05:30`);
    if (now > at + GRACE_MIN[p.slot] * 60e3) { skipped.push(`${id}: too late (public time ${p.at} passed)`); continue; }
    ok.push(p);
  }
  if (!ok.length) {
    if (!family && days) {
      const ds = dayStatusDue({ today, log, planFor });
      if (ds.date) return { family: ds.date, key: 'day-status', daystatus: ds, variants: [], skipped };
      skipped.push(ds.skip);
    }
    return { family: null, variants: [], skipped };
  }
  const fam = ok[0].festival;
  const variants = ok.filter((p) => p.festival.key === fam.key);
  return { family: fam.date, key: fam.key, festival: fam, variants, skipped };
}

const brief = (p) => ({ slug: slugOf(p), day: p.date, slot: p.slot, at: p.at, k: p.k, title: titleOf(p), festival: p.festival.key });

// ---------------------------------------------------------------- calendar.md

export function calendarMarkdown(festivals, isPlanned = () => true) {
  const plan = placements(festivals);
  const rows = festivals.map((f) => {
    const ps = plan.filter((p) => p.festival.key === f.key);
    const when = ps.map((p) => `${p.slot} ${p.date.slice(5)} ${p.at}${isPlanned(p) ? '' : ' dropped by the 3-a-day cap'}`).join(', ');
    const status = f.tier === 'info' ? 'no status Short' : `${f.tier === 'big' ? 'BIG, ' : ''}status Shorts: ${when}`;
    const names = (f.names || []).map((n) => n.en).filter((n) => n !== f.label).join('; ');
    return `| ${f.date} | ${f.label}${names ? `; ${names}` : ''} (${status}). Sources: ${f.sources.join('; ')} |`;
  });
  return rows.join('\n');
}

// ---------------------------------------------------------------- CLI

async function main() {
  const args = process.argv.slice(2);
  const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : '');
  const [cmd] = args;
  const out = (o) => { console.log(typeof o === 'string' ? o : JSON.stringify(o)); };
  const festivals = loadFestivals('.');
  const dp = await import('./day-plan.mjs');
  if (cmd === 'due') {
    const today = opt('--today') || dp.istToday();
    const inputs = dp.loadInputs('.');
    const r = due({ today, log: read('automation/log.md'), festivals, planFor: (d) => dp.planDay(d, inputs), family: opt('--family'), dry: args.includes('--dry') });
    const dir = opt('--out') || '.';
    fs.mkdirSync(dir, { recursive: true });
    const res = { today, now_ist: istNow().slice(0, 16), family: r.family, key: r.key || '', variants: r.variants.map(brief), skipped: r.skipped };
    if (r.daystatus) {
      // the day status Short is its own base (its pictures and clips are made once, then the spec is re-composed with them)
      const base = dayStatus(r.daystatus.date, { theme: r.daystatus.theme });
      fs.writeFileSync(path.join(dir, 'family.json'), `${JSON.stringify(base, null, 2)}\n`);
      res.base_slug = base.slug;
      res.variants = [{ slug: base.slug, day: r.daystatus.date, slot: 'morning', at: r.daystatus.at, title: base.youtube_title, daystatus: true, theme: r.daystatus.theme }];
    } else if (r.family) {
      const base = buildFamily(r.festival, '.');
      fs.writeFileSync(path.join(dir, 'family.json'), `${JSON.stringify(base, null, 2)}\n`);
      res.base_slug = base.slug;
    }
    fs.writeFileSync(path.join(dir, 'due.json'), `${JSON.stringify(res, null, 2)}\n`);
    // `day` keys the work-dir cache: a day status gets its own (a festival family of the same date keeps its clips)
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `day=${r.daystatus ? `${r.family}-daystatus` : r.family || ''}\ncount=${res.variants.length}\n`);
    return out(res);
  }
  if (cmd === 'variants') {
    const baseFile = opt('--base');
    const dir = path.dirname(path.resolve(baseFile));
    const base = JSON.parse(read(baseFile));
    const d = JSON.parse(read(opt('--due')));
    const all = placements(festivals);
    for (const v of d.variants) {
      if (v.daystatus) {
        const spec = dayStatus(v.day, { theme: v.theme });
        spec.scenes = spec.scenes.map((sc, j) => reuseAssets(sc, j, base, dir));
        Object.assign(spec, { publish_at: v.at, slot: 'morning' });
        const file = path.join(dir, `v-${spec.slug}.json`);
        fs.writeFileSync(file, `${JSON.stringify(spec, null, 2)}\n`);
        console.log([file, spec.slug, v.day, 'morning', v.at].join('\t'));
        continue;
      }
      const p = all.find((x) => x.festival.key === v.festival && x.k === v.k);
      const spec = buildVariant(base, p, { dir });
      const file = path.join(dir, `v-${spec.slug}.json`);
      fs.writeFileSync(file, `${JSON.stringify(spec, null, 2)}\n`);
      console.log([file, spec.slug, p.date, p.slot, p.at].join('\t'));
    }
    return;
  }
  if (cmd === 'trial') {
    const baseFile = opt('--base');
    const base = JSON.parse(read(baseFile));
    const v = JSON.parse(read(opt('--spec')));
    const p = placements(festivals).find((x) => slugOf(x) === v.slug);
    if (!p) throw new Error(`trial: ${v.slug} is not a festival variant (day status Shorts get no trial reel)`);
    const spec = trialVariant(base, p, { dir: path.dirname(path.resolve(baseFile)), graduation: opt('--graduation') || TRIAL_GRADUATION });
    const file = opt('--out') || path.join(path.dirname(path.resolve(baseFile)), `t-${v.slug}.json`);
    fs.writeFileSync(file, `${JSON.stringify(spec, null, 2)}\n`);
    return out({ file, slug: spec.slug, at: `${p.date}T${TRIAL_AT}`, graduation: spec.ig_trial });
  }
  if (cmd === 'day') {
    const date = opt('--date') || dp.istToday();
    const plan = dp.planDay(date, dp.loadInputs('.'));
    const m = plan.uploads.find((u) => u.slot === 'morning');
    const spec = dayStatus(date, { theme: m?.theme });
    const file = opt('--out') || 'story/today/scenes.json';
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(spec, null, 2)}\n`);
    if (opt('--log')) fs.appendFileSync(opt('--log'), `${date} | morning | ${spec.slug} | ${spec.deity} | Day status Short "${spec.youtube_title.split(' | ')[0]}" (status engine, 12-20 s loop)\n`);
    return out({ slug: spec.slug, title: spec.youtube_title, file });
  }
  if (cmd === 'plan') {
    const from = opt('--from') || dp.istToday();
    const to = opt('--to') || '2027-01-31';
    const inputs = dp.loadInputs('.');
    for (const p of placements(festivals).filter((x) => x.date >= from && x.date <= to)) {
      const planned = dp.planDay(p.date, inputs).uploads.some((u) => u.slot === p.slot && u.festival === p.festival.key && u.k === p.k);
      console.log(`${p.date} ${p.at} ${p.slot.padEnd(9)} ${planned ? '   ' : 'CAP'} ${titleOf(p)}`);
    }
    return;
  }
  if (cmd === 'calendar') {
    const file = 'automation/calendar.md';
    const text = read(file);
    const start = '<!-- status-engine:begin -->', end = '<!-- status-engine:end -->';
    const inputs = dp.loadInputs('.');
    const ok = (p) => dp.planDay(p.date, inputs).uploads.some((u) => u.slot === p.slot && u.festival === p.festival.key && u.k === p.k);
    const block = `${start}\n${calendarMarkdown(festivals, ok)}\n${end}`;
    const next = text.includes(start) ? text.replace(new RegExp(`${start}[\\s\\S]*?${end}`), block) : `${text.trimEnd()}\n${block}\n`;
    fs.writeFileSync(file, next);
    return out({ file, festivals: festivals.length });
  }
  throw new Error('usage: status-engine.mjs due|variants|day|plan|calendar (see the header)');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((e) => { console.error(`status-engine: ${e.message}`); process.exit(1); });
}
