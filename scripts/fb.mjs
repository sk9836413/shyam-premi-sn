#!/usr/bin/env node
// Facebook Page plan for reach (owner, 11 Nov 2026: Facebook monetization challenge, 1,000,000 views in 30 days from
// 11 Nov). 11 Nov plan: at most 2 Reels + 1 photo a day. 13 Nov 2026 the owner changed it ("sare reel facebook me bhi
// jane chaiye"): EVERY Short that goes to YouTube also goes to Facebook as a Reel, spaced so the Page never gets several
// at once. YouTube's caps (scripts/day-plan.mjs, scripts/upload-guard.mjs: 3 Shorts + 1 long a day) are NOT changed
// here, and neither is Instagram's timing.
//
//   Photo   06:30 IST  the morning darshan photo (photos.mjs post 1; the festival greeting on festival days). Posts 2-4
//                      (vichar, temple carousel, Khatu sandhya aarti) stay on Instagram only.
//   Reels   every Short of the day (day-plan.mjs uploads: status / eve / statusday, morning, evening, bhajan, movie,
//           kalyug, noon), each at its own Facebook time (REEL_AT) and at least GAP_MIN = 90 minutes from every other
//           Facebook Reel: status 00:30, movie 07:30, kalyug 08:00, statusday 08:30, morning 10:30 (on render), noon
//           15:00, bhajan 19:45, eve 20:00, evening 20:30 (18:30 / 21:30 when a 20:00 eve status takes 20:30). Festival
//           status Reels are placed first; when a wanted time is taken the nearest free 15-minute step is used.
//           At upload time (`flags`) the Facebook Reels already posted or scheduled (automation/published.md) and the
//           planned ones still ahead count too: a Short ready close to another one is SCHEDULED (meta.mjs
//           --fb-at -> scheduled_publish_time) for the next free time instead of going out at once. Every Short is
//           posted: a late one gets the next free time (no grace cut-off any more). Shorts over Meta's 90 s Reel limit
//           (movie parts, the Dadi-Chhotu noon Short) go out as normal Page videos (meta.mjs decides by duration).
//   Feed    12:30 IST  the daily LONG katha video (owner, 13 Nov 2026: "long video to facebook me bhi dal sakte ho") as a
//                      normal Page feed video (not a Reel; meta.mjs resumable upload), scheduled for 12:30 like YouTube,
//                      or as soon as it is ready (up to 6 h late). A different format from the Reels: not part of their
//                      spacing. Its text is the YouTube description cleaned for Facebook (fbLongText: no
//                      like/share/subscribe lines, the subject's 3 hashtags). Old long videos are never reposted.
//
// Caption template (checkFbCaption; validate.mjs checks Claude's `facebook_caption`, photos.mjs post 1's `fb_caption`):
//   line 1   a Hindi bhaav line + one genuine question (Devanagari, e.g. "हारे का सहारा, बाबा श्याम हमारा 🙏 आप खाटू धाम कब गए थे?")
//   1-2 lines of context (Devanagari, a little Hinglish is fine)
//   [the festival link line from scripts/festival-links.mjs, only when it applies] [photo credits / AI line]
//   exactly 3 hashtags on the last line that MATCH THE SUBJECT (fbHashtags; owner, 13 Nov 2026: a Chhath bhajan went
//   out with #KhatuShyam #JaiShreeShyam #ChhathPuja):
//     Khatu Shyam content            #KhatuShyam #JaiShreeShyam + 1 topical (#KhatuShyamJanmotsav, #Gyaras, #KhatuShyamMandir)
//     a festival not about Khatu     the festival tag + 2 relevant generic ones (#ChhathPuja #ChhathGeet #Bhakti)
//     a deity / temple               the deity tag + its greeting + the temple or #Bhakti (#Mahadev #HarHarMahadev #Bhakti)
//   so #KhatuShyam / #JaiShreeShyam never go on a post that is not about Khatu Shyam ji. Instagram gets the same
//   subject-matching (igHashtags: the Khatu tags are swapped for the subject's on non-Khatu posts).
//   No engagement bait of any kind: no share/like/comment/tag/follow/subscribe/forward/"likhein"/"bhejein" asks.
//
//   node scripts/fb.mjs plan [--days 14] [--from YYYY-MM-DD]        the Facebook plan per day (prints, posts nothing)
//   node scripts/fb.mjs flags --date D --slot S [--festival-date F] [--now ISO] [--published automation/published.md]
//        prints the meta.mjs / publish.mjs flag for one video: "--fb-at D'T'HH:MM" | "--fb-at now" | "--no-fb"
//   node scripts/fb.mjs check <scenes.json | caption.txt>            caption check (exit 1 with the problems)
//   node scripts/fb.mjs tags <scenes.json>                           the 3 Facebook hashtags of a spec
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { LINKS } from './festival-links.mjs';
import { loadInputs, planDay, addDays, istToday } from './day-plan.mjs';
import { BHAJAN_LINE } from '../music/bhajan.mjs';

/** Facebook times (IST) of each Short slot. */
export const REEL_AT = { status: '00:30', movie: '07:30', kalyug: '08:00', statusday: '08:30', morning: '10:30', noon: '15:00', bhajan: '19:45', eve: '20:00', evening: '20:30' };
export const FB_TIMES = { photo: '06:30', long: '12:30', ...REEL_AT };
export const GAP_MIN = 90; // minutes between two Facebook Reels (owner, 13 Nov 2026: "at least about 90 minutes")
// Placed in this order (festival status first: the format that can go viral keeps its exact time).
const PLACE_ORDER = ['status', 'eve', 'statusday', 'movie', 'evening', 'bhajan', 'morning', 'kalyug', 'noon'];
// Tried before the 15-minute search when the wanted time is taken (the evening darshan on a 20:00 eve-status day).
const ALT_AT = { evening: ['18:30', '21:30'], bhajan: ['21:15', '18:15'] };
// The earliest a Short can exist (render times); the plan never puts a Reel before it. Latest: 23:30.
const EARLIEST = { morning: '10:00', bhajan: '10:00', evening: '13:00', eve: '13:00', noon: '12:00' };
const LATEST = '23:30';
const LEAD_MS = 15 * 60e3; // meta.mjs schedules only when the time is at least 15 minutes ahead
const LONG_GRACE_H = 6; // the long feed video: still posted up to 6 h after 12:30
const VIDEO_SLOTS = new Set(['movie', 'noon']); // over 90 s: a Page video, not a Reel
const IST = 5.5 * 3600e3;
export const istAt = (date, hm) => Date.parse(`${date}T${hm}:00Z`) - IST;
const toMin = (hm) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5));
const fromMin = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const istStamp = (ms) => new Date(ms + IST).toISOString().slice(0, 16); // 'YYYY-MM-DDTHH:MM' IST
const TIER = { big: 0, status: 1 };

// ---------------------------------------------------------------- the plan

/** The Shorts of one date (not the long video). */
function shortsOf(date, inputs) {
  const p = planDay(date, inputs);
  const pl = inputs.placements || [];
  const place = (u) => pl.find((x) => x.date === date && x.slot === u.slot && x.festival.key === u.festival);
  const list = p.uploads.filter((u) => u.slot !== 'long').map((u) => {
    const x = u.kind === 'status' ? place(u) : null;
    return { slot: u.slot, kind: u.kind || u.slot, ...(u.festival ? { festival: u.festival, festivalDate: x?.festival.date || null, tier: x?.tier } : {}) };
  });
  return { p, list };
}

/** Facebook times for `items` (sets it.at), each >= GAP_MIN from the others and from `fixed` (minutes of the day). */
function placeTimes(items, fixed = []) {
  const taken = [...fixed];
  const order = [...items].sort((a, b) => PLACE_ORDER.indexOf(a.slot) - PLACE_ORDER.indexOf(b.slot) || (TIER[a.tier] ?? 9) - (TIER[b.tier] ?? 9));
  for (const it of order) {
    const want = toMin(REEL_AT[it.slot] || '12:00');
    const lo = Math.min(want, toMin(EARLIEST[it.slot] || '00:00'));
    const hi = Math.max(want, toMin(LATEST));
    const grid = [];
    for (let m = Math.ceil(lo / 15) * 15; m <= hi; m += 15) grid.push(m);
    grid.sort((a, b) => Math.abs(a - want) - Math.abs(b - want) || a - b);
    const cands = [want, ...(ALT_AT[it.slot] || []).map(toMin), ...grid];
    const gap = (m) => Math.min(Infinity, ...taken.map((t) => Math.abs(t - m)));
    const at = cands.find((m) => gap(m) >= GAP_MIN) ?? cands.reduce((best, m) => (gap(m) > gap(best) ? m : best), want);
    taken.push(at);
    it.at = fromMin(at);
  }
  return items;
}

/** Facebook posts of one IST date: { date, photo: {at}, videos: [{ slot, at, kind, role, festival?, festivalDate?, type }],
 *  feed: [the long katha Page video] }. `videos` = every Short of the day (type 'video' = over 90 s, a Page video). */
export function fbDay(date, inputs) {
  const { p, list } = shortsOf(date, inputs);
  // tomorrow's 00:30 status Reel counts as 24:30 today (no late Reel within 90 min of it)
  const next = shortsOf(addDays(date, 1), inputs).list.filter((x) => x.slot === 'status').map(() => 24 * 60 + toMin(REEL_AT.status));
  const videos = placeTimes(list, next).map(({ tier, ...v }) => ({ ...v, role: 'reel', type: VIDEO_SLOTS.has(v.slot) ? 'video' : 'reel' }))
    .sort((a, b) => a.at.localeCompare(b.at));
  const feed = p.uploads.some((u) => u.slot === 'long') ? [{ slot: 'long', at: FB_TIMES.long, kind: 'long', role: 'feed', type: 'video' }] : [];
  return { date, day: p.day, type: p.type, festival: p.festival, photo: { at: FB_TIMES.photo }, videos, feed };
}

/**
 * Facebook videos already posted or scheduled, from automation/published.md: [{ slug, date, slot, at (epoch ms) }].
 * The time is the "(scheduled ...)" one, else the video's claim time (it is posted right after the YouTube upload).
 * The long feed video is left out (not part of the Reel spacing).
 */
export function fbPosted(text) {
  const claims = new Map();
  const out = [];
  for (const line of String(text || '').split(/\r?\n/)) {
    const c = line.match(/^- (\S+) \| claim: (\d{4}-\d{2}-\d{2}) (\w+) by .* at (\S+)/);
    if (c) { claims.set(c[1], { date: c[2], slot: c[3], at: Date.parse(c[4]) }); continue; }
    const m = line.match(/^- (\S+) \|.*?\bfb: (https:\/\/www\.facebook\.com\/\S+)(?: \(scheduled (\S+?)\))?/);
    if (!m) continue;
    const cl = claims.get(m[1]);
    const s = m[1].match(/^(\d{4}-\d{2}-\d{2})-([a-z]+)-/);
    const date = cl?.date || s?.[1];
    const slot = cl?.slot || s?.[2];
    const at = m[3] && !/already/.test(m[3]) ? Date.parse(m[3]) : cl?.at;
    if (!date || !slot || slot === 'long' || !Number.isFinite(at) || out.some((x) => x.slug === m[1])) continue;
    out.push({ slug: m[1], date, slot, at });
  }
  return out;
}

/**
 * The Facebook decision for one Short (or the long video): { post, at: 'YYYY-MM-DDTHH:MM' | 'now' | null, why }.
 * posted: fbPosted(published.md), the Reels already on Facebook (or scheduled there).
 */
export function fbDecision({ date, slot, festivalDate = null, now = Date.now(), inputs, posted = [] }) {
  const day = fbDay(date, inputs);
  if (slot === 'long') {
    const v = day.feed[0];
    if (!v) return { post: false, at: null, why: `${date}: no long video in the plan` };
    if (istAt(date, v.at) - now >= LEAD_MS) return { post: true, at: `${date}T${v.at}`, why: `feed ${v.at} IST` };
    if (now <= istAt(date, v.at) + LONG_GRACE_H * 3600e3) return { post: true, at: 'now', why: `feed: ${v.at} IST has passed; posting as soon as it is ready` };
    return { post: false, at: null, why: `feed ${v.at} IST is over ${LONG_GRACE_H} h past: not posted to Facebook` };
  }
  // Every Short goes to Facebook (owner, 13 Nov 2026), whichever festival variant it is; one not in the plan (a
  // replacement Short) gets its slot's time.
  const v = day.videos.find((x) => x.slot === slot && (!festivalDate || !x.festivalDate || x.festivalDate === festivalDate))
    || day.videos.find((x) => x.slot === slot) || { slot, at: REEL_AT[slot] || '12:00', adhoc: true };
  // Times to keep GAP_MIN away from: Reels already on Facebook, and the planned Reels (yesterday, today, tomorrow) not
  // posted yet and still ahead.
  const others = posted.filter((p) => !(p.date === date && p.slot === slot)).map((p) => p.at);
  for (const d of [addDays(date, -1), date, addDays(date, 1)]) {
    for (const x of d === date ? day.videos : fbDay(d, inputs).videos) {
      if ((d === date && x.slot === slot) || posted.some((p) => p.date === d && p.slot === x.slot)) continue;
      const t = istAt(d, x.at);
      if (t >= now) others.push(t);
    }
  }
  const gapOf = (t) => Math.min(Infinity, ...others.map((o) => Math.abs(o - t)));
  const free = (t) => gapOf(t) >= GAP_MIN * 60e3;
  const want = istAt(date, v.at);
  const start = now + LEAD_MS;
  const target = Math.max(want, now);
  const grid = [];
  const end = Math.max(istAt(date, '23:45'), start + 6 * 3600e3);
  for (let t = Math.ceil(start / 9e5) * 9e5; t <= end; t += 9e5) grid.push(t);
  grid.sort((a, b) => Math.abs(a - target) - Math.abs(b - target) || a - b);
  const cands = [want >= start ? want : now, ...grid];
  const t = cands.find(free) ?? cands.reduce((best, c) => (gapOf(c) > gapOf(best) ? c : best), cands[0]);
  const label = `${slot}${v.adhoc ? ' (not in the plan)' : ''}`;
  if (t < start) return { post: true, at: 'now', why: `${label}: ${v.at} IST has passed; posting now (${GAP_MIN} min clear of the other Reels)` };
  const at = istStamp(t);
  const moved = t === want ? '' : ` (planned ${v.at}; moved to stay ${GAP_MIN} min from the other Reels${free(t) ? '' : ' as far as possible'})`;
  return { post: true, at, why: `${label} Reel ${at.slice(11)} IST${at.slice(0, 10) === date ? '' : ` on ${at.slice(0, 10)}`}${moved}` };
}

// ---------------------------------------------------------------- captions

const DEV = /[ऀ-ॿ]/;
const DEV_G = /[ऀ-ॿ]/g;
const LAT_G = /[A-Za-z]/g;
const TAG = /^#[\p{L}\p{N}_]+$/u;
// Meta demotes engagement bait (react/comment/share/tag/vote baiting). A plain question is fine; any ask to act is not.
const FB_BAIT = new RegExp([
  String.raw`\b(share|shares|sharing|forward|tag|like|likes|comment|comments|subscribe|follow)\b`,
  String.raw`शेयर|फॉरवर्ड|फ़ॉरवर्ड|टैग|लाइक|कमेंट|कॉमेंट|सब्सक्राइब|फॉलो|फ़ॉलो|भेजें|भेजो|भेजिए|लिखें|लिखो|लिखिए|टाइप`,
  String.raw`\bbhej(o|ein|en|iye)\b|\blikh(o|ein|en|iye)\b|\btype\s*kar|\bwarna\b|वरना|nahi\s*to\s*(bura|nuksaan|paap)|\bamen\b|आमीन`,
  String.raw`paisa\s*aayega|dhan\s*varsha|guaranteed|100\s*%|bad\s*luck|ignore\s*mat|miracle|chamatkar\s*pakka|चमत्कार\s*पक्का`,
].join('|'), 'i');
const isTagLine = (l) => l.split(/\s+/).filter(Boolean).every((w) => TAG.test(w));

/** The Facebook text of the long katha video from its YouTube description: lines asking for likes/shares/subscribes
 *  (engagement bait, demoted by Meta) are dropped and the hashtags become the subject's 3 (fbHashtags of the spec, else
 *  of the description's own text and tags; Khatu Shyam content keeps the description's first topical tag). */
export function fbLongText(description, spec = null) {
  const lines = String(description ?? '').split(/\r?\n/);
  const own = [];
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i].trim();
    if (!l || !isTagLine(l)) continue;
    own.unshift(...l.split(/\s+/));
    lines.splice(i, 1);
  }
  const kept = lines.filter((l) => !FB_BAIT.test(l));
  while (kept.length && !kept.at(-1).trim()) kept.pop();
  let subj = spec ? fbSubject({ ...spec, hashtags: own }) : null;
  if (!subj || subj.kind === 'none') subj = fbSubject({ text: `${kept.join(' ')} ${own.join(' ')}`, hashtags: own });
  return [...kept, '', subj.tags.join(' ')].join('\n');
}
const isLink = (l) => /https?:\/\//.test(l);
const isCredit = (l) => /^(📷\s*)?(Photo|Photos|Foto)\b.*:|Wikimedia Commons|^📷/i.test(l);
// (\b is ASCII-only in JS: after a Devanagari word it never matches, so the Hindi forms are checked without it.)
const isAi = (l) => /sanketik|सांकेतिक|\bAI\s+(se|dwara)\b|\bAI\s+(द्वारा|से)(?![ऀ-ॿ])/i.test(l);
const devShare = (t) => { const d = (t.match(DEV_G) || []).length; const l = (t.match(LAT_G) || []).length; return d + l ? d / (d + l) : 0; };

/**
 * Problems with a Facebook caption (empty = OK). draft: Claude's text before the script adds links/credits (no URLs).
 * subject: the spec / photo post it belongs to (fbSubject); without one (or when the spec names no subject) the subject
 * is read from the caption's own text.
 */
export function checkFbCaption(text, { draft = false, subject = null } = {}) {
  const e = [];
  const t = String(text ?? '').trim();
  if (!t) return ['facebook caption: empty'];
  const lines = t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const last = lines.at(-1);
  const tags = isTagLine(last) ? last.split(/\s+/).filter(Boolean) : [];
  const rest = tags.length ? lines.slice(0, -1) : lines;
  let subj = subject ? fbSubject(subject) : null;
  if (!subj || subj.kind === 'none') subj = fbSubject({ text: rest.join(' ') });
  if (tags.length !== 3) e.push(`hashtags: exactly 3 on the last line, matching the subject (here: ${subj.tags.join(' ')}), has ${tags.length}`);
  else {
    if (new Set(tags.map((x) => x.toLowerCase())).size !== 3) e.push('hashtags: 3 different tags');
    e.push(...tagProblems(tags, subj));
  }
  if (rest.some((l) => /#[\p{L}\p{N}_]/u.test(l))) e.push('hashtags: only on the last line');
  const meta = (l) => isLink(l) || isCredit(l) || isAi(l);
  if (draft && rest.some(isLink)) e.push('no URLs: the script adds the festival link and photo credits');
  const firstMeta = rest.findIndex(meta);
  const body = firstMeta < 0 ? rest : rest.slice(0, firstMeta);
  if (firstMeta >= 0 && rest.slice(firstMeta).some((l) => !meta(l))) e.push('order: bhaav line + question, context, then link/credits, then the 3 hashtags');
  const [first = '', ...ctx] = body;
  if (!DEV.test(first) || devShare(first) < 0.6) e.push('line 1: a Hindi (Devanagari) bhaav line');
  if (!/\?\s*$/.test(first.replace(/[\s\p{Extended_Pictographic}‍️]+$/u, ''))) e.push('line 1: end with one genuine question to the reader (?)');
  if ([...first].length > 160) e.push(`line 1: max 160 characters (${[...first].length})`);
  if (ctx.length < 1 || ctx.length > 2) e.push(`context: 1-2 lines after line 1 (has ${ctx.length})`);
  if (body.join(' ').split('?').length - 1 > 2) e.push('one question only (line 1)');
  if (devShare(body.join(' ')) < 0.4) e.push('mostly Devanagari: a little Hinglish is fine, not mostly Roman');
  if (FB_BAIT.test(t.replace(/https?:\/\/\S+/g, ''))) e.push('engagement bait: no share/like/comment/tag/follow/subscribe/forward/"likhein"/"bhejein" asks, threats or promises');
  if (/\bflute\b|bansuri|murli|बांसुरी|बाँसुरी|मुरली/i.test(t) && /khatu|shyam|खाटू|श्याम/i.test(t)) e.push('Khatu Shyam ji is the sheesh only: no flute');
  if (t.length > 1500) e.push(`max 1500 characters (${t.length})`);
  return e;
}

// ---- the composer (used when a caption is missing or fails: status Shorts are made by the engine, not Claude)

const CATS = [
  ['khatu', /khatu|shyam|barbarik|janmotsav|gyaras|खाटू|श्याम|बर्बरीक/i, 'हारे का सहारा, बाबा श्याम हमारा 🙏', '#ShyamBaba'],
  ['shiv', /shiv|mahadev|bholenath|jyotirling|somnath|mahakal|kedarnath|omkareshwar|mallikarjun|vishwanath|pradosh|shivratri|somvar|शिव|महादेव|ज्योतिर्लिंग/i, 'हर हर महादेव 🙏', '#HarHarMahadev'],
  ['hanuman', /hanuman|bajrang|balaji|salasar|mehandipur|sankat|mangalvar|हनुमान|बजरंग|बालाजी/i, 'जय बजरंगबली 🙏', '#JaiHanuman'],
  ['ganesh', /ganesh|ganpati|vinayak|sankashti|sakat|budhvar|गणेश|गणपति/i, 'गणपति बप्पा मोरया 🙏', '#GanpatiBappaMorya'],
  ['ram', /\bram\b|ayodhya|sita|vivah panchami|राम/i, 'जय श्री राम 🙏', '#JaiShreeRam'],
  ['krishna', /krishna|govind|gopal|bihari|vrindavan|shrinath|nathdwara|govardhan|annakut|gopashtami|dwarka|कृष्ण|गोवर्धन/i, 'जय श्री कृष्ण 🙏', '#JaiShreeKrishna'],
  ['vishnu', /vishnu|narayan|ekadashi|tulsi|vaikuntha|guruvar|विष्णु|नारायण|एकादशी|तुलसी/i, 'ॐ नमो भगवते वासुदेवाय 🙏', '#JaiShreeHari'],
  ['devi', /mata|devi|durga|lakshmi|santoshi|chhath|chhathi|yamuna|ganga|shukravar|माता|देवी|दुर्गा|लक्ष्मी|छठ/i, 'जय माता दी 🙏', '#JaiMataDi'],
  ['shani', /shani|shanivar|शनि/i, 'जय शनिदेव 🙏', '#ShaniDev'],
  ['surya', /surya|sankranti|ravivar|सूर्य/i, 'ॐ सूर्याय नमः 🙏', '#SuryaDev'],
  ['bhairav', /bhairav|भैरव/i, 'जय काल भैरव 🙏', '#KaalBhairav'],
];
export const categoryOfText = (t) => CATS.find(([, re]) => re.test(t || '')) || null;
const QUESTIONS = {
  status: ['आपके घर में {name} पर क्या ख़ास होता है?', 'इस बार {name} पर आपकी क्या तैयारी है?', '{name} की आपकी सबसे प्यारी याद कौन सी है?'],
  eve: ['कल {name} पर आपके घर क्या ख़ास होगा?', 'इस बार {name} पर आपकी क्या तैयारी है?'],
  temple: ['क्या आपने कभी {name} के दर्शन किए हैं?', '{name} से जुड़ी आपकी कोई याद है?', 'क्या {name} जाना आपकी यात्रा-सूची में है?'],
  khatu: ['क्या आप कभी खाटू धाम गए हैं?', 'बाबा श्याम का कौन सा भजन आपको सबसे प्रिय है?', 'बाबा श्याम से जुड़ी आपकी सबसे प्यारी याद कौन सी है?'],
  day: ['आज सुबह आपके घर कौन सी आरती हुई?', 'आपके दिन की शुरुआत किस भजन से होती है?', 'आज आप किस मंदिर के दर्शन करने जा रहे हैं?'],
  movie: ['इस कथा का कौन सा पल आपके मन को सबसे ज़्यादा छू गया?', 'क्या आपने यह कथा पहले सुनी थी?'],
  photo: ['क्या आपने कभी {name} के दर्शन किए हैं?', '{name} से जुड़ी आपकी कोई याद है?'],
  festival: ['आपके घर में {name} पर क्या ख़ास होता है?', '{name} की आपकी सबसे प्यारी याद कौन सी है?'],
};
const hash = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const cut = (t, n) => { const a = [...String(t).trim()]; if (a.length <= n) return a.join(''); const s = a.slice(0, n).join(''); return `${s.slice(0, Math.max(s.lastIndexOf(' '), n * 0.6)).replace(/[,;:\s]+$/, '')}…`; };
const noTags = (t) => String(t || '').replace(/#[\p{L}\p{N}_]+/gu, '').replace(/\s{2,}/g, ' ').trim();
const CTA_LINE = /\b(like|share|subscribe|follow|bhejein|download)\b|सब्सक्राइब|शेयर|लाइक|status par lagayein|स्टेटस पर लगाएं|sanketik|https?:/i;
const camel = (s) => `#${String(s).replace(/\(.*?\)/g, '').replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join('')}`;

// ---- hashtags that match the subject (owner, 13 Nov 2026: the Chhath bhajan Reel went out with
// #KhatuShyam #JaiShreeShyam #ChhathPuja; Khatu Shyam tags on a post about something else look like spam)

export const KHATU_TAGS = ['#KhatuShyam', '#JaiShreeShyam'];
export const BASE_TAGS = KHATU_TAGS; // the old name
// Tags that only belong on Khatu Shyam ji content (Facebook and Instagram).
export const KHATU_ONLY = /^#(khatushyam\w*|jaishreeshyam|shyambaba|babashyam|haarekasahara|khatudham|khatuwale\w*|shyamdhani)$/i;
// Deity content (categoryOfText keys): [name tag, greeting tag, other accepted tags...].
const DEITY_TAGS = {
  shiv: ['#Mahadev', '#HarHarMahadev', '#Shiv', '#ShivJi', '#Bholenath', '#OmNamahShivaya', '#Jyotirlinga'],
  hanuman: ['#HanumanJi', '#JaiHanuman', '#Hanuman', '#Bajrangbali', '#Balaji', '#SalasarBalaji', '#MehandipurBalaji', '#JaiShreeRam'],
  ganesh: ['#GaneshJi', '#GanpatiBappaMorya', '#Ganesh', '#Ganpati', '#Vinayak'],
  ram: ['#ShreeRam', '#JaiShreeRam', '#Ram', '#JaiSiyaRam', '#Ayodhya'],
  krishna: ['#ShreeKrishna', '#JaiShreeKrishna', '#Krishna', '#RadheRadhe', '#RadheKrishna', '#Shrinathji', '#Vrindavan'],
  vishnu: ['#VishnuJi', '#JaiShreeHari', '#Vishnu', '#Narayan', '#OmNamoNarayanaya', '#SaiBaba', '#OmSaiRam'],
  devi: ['#MataRani', '#JaiMataDi', '#Durga', '#MaaDurga', '#MaaLakshmi', '#Lakshmi', '#Navratri', '#VaishnoDevi'],
  shani: ['#ShaniDev', '#JaiShaniDev', '#Shani'],
  surya: ['#SuryaDev', '#JaiSuryaDev', '#Surya', '#SuryaNarayan'],
  bhairav: ['#KaalBhairav', '#JaiKaalBhairav', '#Bhairav'],
};
// Festivals not about Khatu Shyam ji: the festival tag + 2 relevant generic ones (song = a bhajan / geet video).
// (On Khatu Shyam content the first tag is the topical one: Gyaras, Ekadashi.)
const FESTIVAL_TAGS = [
  [/chhath|छठ/i, (song) => ['#ChhathPuja', song ? '#ChhathGeet' : '#ChhathiMaiya', '#Bhakti']],
  [/gyaras|ग्यारस/i, () => ['#Gyaras', '#Ekadashi', '#Bhakti']],
  [/ekadashi|एकादशी/i, () => ['#Ekadashi', '#JaiShreeHari', '#Bhakti']],
  [/dev\s*deep|देव\s*दीपावली/i, () => ['#DevDeepawali', '#HarHarMahadev', '#Bhakti']],
  [/diwali|deepawali|दिवाली|दीपावली/i, () => ['#Diwali', '#ShubhDeepawali', '#Bhakti']],
  [/dhanteras|धनतेरस/i, () => ['#Dhanteras', '#MaaLakshmi', '#Bhakti']],
  [/govardhan|annakut|गोवर्धन/i, () => ['#GovardhanPuja', '#JaiShreeKrishna', '#Bhakti']],
  [/bhai\s*dooj|bhaiya\s*dooj|भाई\s*दूज/i, () => ['#BhaiDooj', '#YamDwitiya', '#Bhakti']],
  [/tulsi\s*vivah|तुलसी\s*विवाह/i, () => ['#TulsiVivah', '#JaiShreeHari', '#Bhakti']],
  [/pradosh|प्रदोष/i, () => ['#PradoshVrat', '#HarHarMahadev', '#Bhakti']],
  [/shivratri|शिवरात्रि/i, () => ['#Shivratri', '#HarHarMahadev', '#Bhakti']],
  [/sakat/i, () => ['#SakatChauth', '#GanpatiBappaMorya', '#Bhakti']],
  [/sankashti|संकष्टी/i, () => ['#SankashtiChaturthi', '#GanpatiBappaMorya', '#Bhakti']],
  [/bhairav|भैरव/i, () => ['#KaalBhairavJayanti', '#JaiKaalBhairav', '#Bhakti']],
  [/vivah\s*panchami|ramsita/i, () => ['#VivahPanchami', '#JaiSiyaRam', '#Bhakti']],
  [/gita|गीता/i, () => ['#GitaJayanti', '#JaiShreeKrishna', '#Bhakti']],
  [/navratri|नवरात्रि/i, () => ['#Navratri', '#JaiMataDi', '#Bhakti']],
  [/janmashtami|जन्माष्टमी/i, () => ['#Janmashtami', '#JaiShreeKrishna', '#Bhakti']],
  [/sankranti|संक्रांति/i, () => ['#MakarSankranti', '#SuryaDev', '#Bhakti']],
  [/shakambhari|शाकंभरी/i, () => ['#Shakambhari', '#JaiMataDi', '#Bhakti']],
  [/amavasya|अमावस्या/i, () => ['#Amavasya', '#SanatanDharma', '#Bhakti']],
  [/purnima|पूर्णिमा/i, () => ['#Purnima', '#SanatanDharma', '#Bhakti']],
];
// The channel's sign-off ("Jai Shree Shyam 🙏") is on every post: it does not make a post Khatu Shyam content.
const SIGNOFF = /shyam\s*premi\s*sn|shyampremisn|jai\s*shree\s*shyam|जय\s*श्री\s*श्याम/gi;
const FORMAT_TAG = /^#(shorts|reels?|shyampremisn|shyampremi|viral|trending|status|whatsappstatus|fyp|explore|bhakti|devotional|sanatandharma|hindu|india|\w*status|\w*2026|\w*2027)$/i;
const str = (x) => (typeof x === 'string' ? x : '');

/**
 * What a post is about, for its hashtags: { kind: 'khatu' | 'festival' | 'deity' | 'none', tags: [3 hashtags], accept }.
 * spec: a video spec (festival, theme, deity, temple, youtube_title, cover, bhajan, captions), a photo post
 * ({ festival: { key, name } | key, temple, templeName, place, hashtags }), or { text } (read from a caption).
 *   khatu     #KhatuShyam #JaiShreeShyam + 1 topical (the festival, the spec's own topical tag, the temple, #ShyamBaba)
 *   festival  the festival's tag + 2 relevant generic ones (FESTIVAL_TAGS; others: its name, the deity greeting, #Bhakti)
 *   deity     the deity tag + its greeting + the temple tag or #Bhakti
 *   none      nothing to go on: #KhatuShyam #JaiShreeShyam #Bhakti (the channel's own tags; any 3 tags are accepted)
 */
export function fbSubject(spec = {}) {
  const f = spec.festival && typeof spec.festival === 'object' ? spec.festival : null;
  const festName = spec.day_status ? '' : str(f?.name) || str(spec.festival);
  const fest = spec.day_status ? '' : [festName, str(f?.key), str(spec.theme), str(spec.festival_key)].filter(Boolean).join(' ').replace(/-/g, ' ');
  const text = [spec.youtube_title, spec.temple, spec.templeName, spec.deity, spec.cover, spec.place, fest, spec.text].map(str).join(' ').replace(SIGNOFF, ' ');
  const cat = categoryOfText(text);
  const song = Boolean(spec.bhajan_short || spec.bhajan_id || spec.bhajan?.id || /\b(song|geet|bhajan)\b|गीत|भजन/i.test(str(spec.youtube_title)));
  const templeTag = str(spec.temple) ? camel(spec.temple.replace(/-/g, ' ')) : null;
  const pool = [...(Array.isArray(spec.hashtags) ? spec.hashtags : []), ...([spec.facebook_caption, spec.instagram_caption, spec.youtube_description].map(str).join(' ').match(/#[A-Za-z][A-Za-z0-9_]{2,40}/g) || [])];
  const festMatch = (t) => FESTIVAL_TAGS.find(([re]) => re.test(t));
  if (cat?.[0] === 'khatu') {
    const fm = fest ? festMatch(fest) : null;
    const isBase = (t) => !t || KHATU_TAGS.some((b) => b.toLowerCase() === t.toLowerCase()) || FORMAT_TAG.test(t);
    const topical = [fm?.[1](song)[0], festName && /[A-Za-z]/.test(festName) ? camel(festName) : null, ...pool, templeTag].find((t) => !isBase(t)) || '#ShyamBaba';
    return { kind: 'khatu', tags: [...KHATU_TAGS, topical], accept: [] };
  }
  // the festival field, else a festival the title / deity names ("Chhath Puja ... ki Katha"; a caption's own text)
  const fm = (fest && festMatch(fest)) || (!festName && festMatch(text)) || null;
  if (fm) { const tags = fm[1](song); return { kind: 'festival', tags, accept: [tags[0], ...(cat ? DEITY_TAGS[cat[0]] || [] : [])] }; }
  if (festName && /[A-Za-z]/.test(festName)) {
    const tags = [camel(festName), cat ? DEITY_TAGS[cat[0]]?.[1] || '#SanatanDharma' : '#SanatanDharma', '#Bhakti'];
    return { kind: 'festival', tags, accept: [tags[0], ...(cat ? DEITY_TAGS[cat[0]] || [] : [])] };
  }
  if (cat && DEITY_TAGS[cat[0]]) {
    const [name, greet, ...more] = DEITY_TAGS[cat[0]];
    const third = templeTag && ![name, greet].includes(templeTag) ? templeTag : '#Bhakti';
    return { kind: 'deity', tags: [name, greet, third], accept: [name, greet, ...more, ...(templeTag ? [templeTag] : [])] };
  }
  // the fields name nothing (a temple the categories do not know): read the spec's own texts, hashtags left out
  const own = [spec.facebook_caption, spec.instagram_caption, spec.youtube_description].map(str).join(' ').replace(/#[\p{L}\p{N}_]+/gu, ' ');
  if (!spec.text && own.trim()) {
    const s = fbSubject({ text: own, temple: spec.temple, hashtags: pool, bhajan_short: song });
    if (s.kind !== 'none') return s;
  }
  return { kind: 'none', tags: [...KHATU_TAGS, '#Bhakti'], accept: [] };
}

/** The 3 Facebook hashtags of a spec / photo post (fbSubject). */
export const fbHashtags = (spec) => fbSubject(spec).tags;

/** Problems with 3 hashtags for a subject (fbSubject result; empty = OK). */
export function tagProblems(tags, subj) {
  const low = tags.map((t) => t.toLowerCase());
  if (subj.kind === 'khatu') {
    return low.includes('#khatushyam') && low.includes('#jaishreeshyam') ? [] : [`hashtags: Khatu Shyam ji content: #KhatuShyam #JaiShreeShyam + 1 topical (e.g. ${subj.tags.join(' ')})`];
  }
  if (subj.kind === 'none') return [];
  const e = [];
  const khatu = tags.filter((t) => KHATU_ONLY.test(t));
  if (khatu.length) e.push(`hashtags: not about Khatu Shyam ji, so no ${khatu.join(' ')}: use the subject's (e.g. ${subj.tags.join(' ')})`);
  // a tag names the subject: one of the accepted tags, or contains the festival's / temple's word (#Chhath2026, #Somnath)
  const stem = (t) => t.toLowerCase().replace(/^#/, '').replace(/(puja|vrat|jayanti|chaturthi|mandir|temple|jyotirlinga|darshan)$/, '');
  const stems = subj.accept.map(stem).filter((s) => s.length >= 4);
  const ok = low.some((t) => subj.accept.some((a) => a.toLowerCase() === t) || stems.some((s) => t.includes(s) || (t.length >= 6 && s.includes(t.slice(1)))))
    // a temple / deity post on a festival day may name the festival (#ChhathPuja on a Surya temple darshan)
    || (subj.kind === 'deity' && low.some((t) => FESTIVAL_TAGS.some(([re]) => re.test(t.slice(1)))));
  if (!ok) e.push(`hashtags: name the subject (${subj.kind}): e.g. ${subj.tags.join(' ')}`);
  return e;
}

/**
 * Instagram: the same subject-matching. On a post that is not about Khatu Shyam ji the Khatu-only tags (#KhatuShyam,
 * #JaiShreeShyam, #ShyamBaba ...) are dropped and the subject's 2 main tags put first. Khatu content and posts without a
 * clear subject are unchanged. tags: an array (photo posts) -> array; text: a caption -> caption.
 */
export function igTagList(tags, spec) {
  const s = fbSubject(spec);
  if (s.kind === 'khatu' || s.kind === 'none' || !tags.some((t) => KHATU_ONLY.test(t))) return tags;
  const kept = tags.filter((t) => !KHATU_ONLY.test(t));
  const have = new Set(kept.map((t) => t.toLowerCase()));
  return [...s.tags.slice(0, 2).filter((t) => !have.has(t.toLowerCase())), ...kept];
}
export function igHashtags(text, spec) {
  const lines = String(text ?? '').split('\n');
  const at = lines.findLastIndex((l) => l.trim() && isTagLine(l.trim()));
  const inBody = lines.some((l, i) => i !== at && /#[\p{L}\p{N}_]+/u.test(l) && l.split(/\s+/).some((w) => KHATU_ONLY.test(w.replace(/[^\p{L}\p{N}_#]/gu, ''))));
  if (at < 0 && !inBody) return String(text ?? '');
  const s = fbSubject(spec);
  if (s.kind === 'khatu' || s.kind === 'none') return String(text ?? '');
  const out = lines.map((l, i) => {
    if (i === at) return igTagList(l.trim().split(/\s+/), spec).join(' ');
    return l.replace(/(^|\s)(#[\p{L}\p{N}_]+)/gu, (m, sp, t) => (KHATU_ONLY.test(t) ? sp : m)).replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+$/, '');
  });
  return out.join('\n');
}

/** The Devanagari name a spec is about: the Devanagari half of youtube_title, minus "स्टेटस वीडियो"/"दर्शन"-style words. */
export function hindiName(spec) {
  const yt = String(spec.youtube_title || '').replace(/#shorts/gi, '');
  const dev = yt.split('|').map((x) => x.trim()).find((x) => DEV.test(x)) || String(spec.cover || '');
  return dev.replace(/स्टेटस(\s*वीडियो)?|वीडियो|(के\s*)?दर्शन|(की\s*)?कथा|20\d\d|[🙏🪔✨]/g, '').replace(/\s{2,}/g, ' ').trim();
}

/** The topical hashtag: the spec's first own hashtag that is not a base/format tag, else the category's. */
export function topicalTag(spec, cat) {
  const skip = /^#(khatushyam|jaishreeshyam|shorts|reels?|shyampremisn|shyampremi|viral|trending|status|whatsappstatus|fyp|explore|bhakti|devotional|sanatandharma|hindu|india)$/i;
  const pool = [spec.facebook_caption, spec.instagram_caption, spec.youtube_description].join(' ').match(/#[A-Za-z][A-Za-z0-9_]{2,40}/g) || [];
  return pool.find((x) => !skip.test(x) && !/status$/i.test(x)) || cat?.[3] || (spec.festival && /[A-Za-z]/.test(spec.festival) ? camel(spec.festival) : '#ShyamBaba');
}

/** Body lines (bhaav + question, 1-2 context lines) for a video spec. kind: status | eve | daystatus | temple | movie. */
export function composeVideoBody(spec, kind = 'temple') {
  const text = [spec.title, spec.youtube_title, spec.temple, spec.festival, spec.deity, spec.cover].join(' ').replace(/Shyam Premi SN/gi, '');
  const cat = categoryOfText(text);
  const name = hindiName(spec);
  const isStatus = kind === 'status' || kind === 'eve' || spec.format === 'status';
  const big = String(spec.scenes?.[0]?.big || '');
  const subj = fbSubject(spec);
  const bhaav = isStatus && DEV.test(big) ? big.replace(/\s*🙏\s*$/, '').trim() + ' 🙏' : subj.tags[0] === '#ChhathPuja' ? 'जय छठी मइया 🙏' : (cat?.[2] || 'जय श्री श्याम 🙏');
  const qKind = kind === 'eve' || spec.slot === 'eve' ? 'eve' : kind === 'daystatus' || spec.day_status ? 'day' : isStatus ? 'status'
    : kind === 'movie' || spec.format === 'movie' ? 'movie' : cat?.[0] === 'khatu' ? 'khatu' : 'temple';
  const qs = QUESTIONS[qKind].filter((q) => !q.includes('{name}') || name);
  const q = (qs.length ? qs : QUESTIONS.day)[hash(spec.slug || name) % (qs.length || QUESTIONS.day.length)].replace('{name}', name);
  const devLines = [spec.scenes?.[0]?.line, ...String(spec.youtube_description || '').split('\n'), ...String(spec.instagram_caption || '').split('\n')]
    .map((l) => noTags(l)).filter((l) => l && DEV.test(l) && devShare(l) >= 0.6 && !CTA_LINE.test(l) && !l.includes('?') && !(big && l.includes(noTags(big).replace(/[!🙏\s]+$/u, ''))) && !noTags(big).includes(l.replace(/[।!🙏\s]+$/u, '')));
  const romanLines = [spec.scenes?.[0]?.sub?.replace(/^[^!]*!\s*/, ''), ...String(spec.youtube_description || '').split('\n')]
    .map((l) => noTags(l)).filter((l) => l && !DEV.test(l) && l.length > 20 && !CTA_LINE.test(l) && !l.includes('?'));
  const ctx = [];
  if (devLines[0]) ctx.push(cut(devLines[0], 140));
  if (romanLines[0]) ctx.push(cut(romanLines[0], ctx.length ? 90 : 140));
  if (!ctx.length) ctx.push('जय श्री श्याम, सबका कल्याण हो 🙏');
  if (devShare([bhaav, q, ...ctx].join(' ')) < 0.45 && ctx.length === 2) ctx.pop();
  return { lines: [`${bhaav} ${q}`, ...ctx], tag: topicalTag(spec, cat), tags: subj.tags };
}

/** Only the festival-links.mjs link lines are kept on Facebook (not the status download link: an off-site link in a Reel caption). */
export const festivalLinkLines = (text) => String(text || '').split(/\r?\n/).map((l) => l.trim())
  .filter((l) => isLink(l) && LINKS.some((x) => l.includes(new URL(x.url).origin + new URL(x.url).pathname)));

/** Assembles body + link + credits + the 3 hashtags (`tags`, fbSubject; `tag` alone = Khatu Shyam content's topical
 *  tag). bhajan: the video carries an AI-sung bhajan (music/bhajan.mjs). */
export function assemble({ lines, tags = null, tag, links = [], credits = [], ai = false, aiLine = 'Chitra AI dwara banaye gaye hain (sanketik).', bhajan = false }) {
  const third = !tag || /^#(khatushyam|jaishreeshyam)$/i.test(tag) ? '#ShyamBaba' : tag;
  const meta = [...links, ...(ai ? [aiLine] : []), ...(bhajan ? [BHAJAN_LINE] : []), ...credits];
  return [lines.join('\n'), ...(meta.length ? [meta.join('\n')] : []), (tags?.length === 3 ? tags : [...KHATU_TAGS, third]).join(' ')].join('\n\n');
}

/** Splits an existing caption into { body, links, credits, tags }. */
export function splitCaption(text) {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  // the hashtag line may sit above credit lines that render-story / movie.py appended later
  const at = lines.findLastIndex((l) => isTagLine(l));
  const tags = at >= 0 ? lines.splice(at, 1)[0].split(/\s+/) : [];
  return { body: lines.filter((l) => !isLink(l) && !isCredit(l) && !isAi(l)), links: festivalLinkLines(text), credits: lines.filter(isCredit), tags };
}

/**
 * The Facebook text of a video post: Claude's / the spec's facebook_caption when its body follows the template, else the
 * composed one; the festival link lines and photo credits already in the spec's caption are kept, the AI line added.
 * Hashtags: the caption's own 3 when they match the subject (fbSubject), else the subject's 3 (so a caption written with
 * #KhatuShyam #JaiShreeShyam on a Chhath / Mahadev video still goes out with the right ones).
 */
export function fbVideoCaption(spec, { kind } = {}) {
  const k = kind || (spec.format === 'status' ? (spec.slot === 'eve' ? 'eve' : spec.day_status ? 'daystatus' : 'status') : spec.format === 'movie' ? 'movie' : 'temple');
  const own = splitCaption(spec.facebook_caption);
  const { credits } = own;
  const bhajan = Boolean(spec.bhajan?.id);
  const subj = fbSubject(spec);
  const tags = own.tags.length === 3 && new Set(own.tags.map((t) => t.toLowerCase())).size === 3 && !tagProblems(own.tags, subj).length ? own.tags : subj.tags;
  const mine = assemble({ lines: own.body, tags, links: own.links, credits, ai: true, bhajan });
  if (own.tags.length && !checkFbCaption(mine, { subject: spec }).length) return { text: mine, source: 'spec' };
  const c = composeVideoBody(spec, k);
  const text = assemble({ ...c, links: own.links, credits, ai: true, bhajan });
  return { text, source: 'composed', problems: checkFbCaption(mine, { subject: spec }) };
}

/** The subject of photo post 1 (fbPhotoCaption's p / a photos.mjs entry) for fbSubject. */
export const photoSubject = (p) => ({ festival: p.festival ? { key: p.festival.key || '', name: p.festival.name || '' } : null, temple: p.temple || '', templeName: p.templeName || '', place: p.place || '', hashtags: p.hashtags || [] });

/**
 * The Facebook text of photo post 1 (darshan / festival): Claude's `fb_caption` if it passes, else composed.
 * p = { kind, date, temple, templeName, festival: { big, line, blessing } | null, fbCaption, place, blessing, hashtags }
 */
export function fbPhotoCaption(p, { links = [], credits = [], ai = false } = {}) {
  const aiLine = 'Chitra AI dwara banaya gaya hai (sanketik).';
  const own = splitCaption(p.fbCaption);
  const subject = photoSubject(p);
  if (p.fbCaption && !checkFbCaption(p.fbCaption, { draft: true, subject }).length) {
    return { text: assemble({ lines: own.body, tags: own.tags, links, credits, ai, aiLine }), source: 'claude' };
  }
  const cat = categoryOfText(`${p.temple || ''} ${p.templeName || ''} ${p.festival?.key || ''}`);
  const pick = (list, name) => list[hash(`${p.date}${name}`) % list.length].replace('{name}', name);
  let lines;
  if (p.kind === 'festival' && p.festival) {
    const f = p.festival;
    const fname = String(f.big || '').replace(/^शुभ\s*/, '').trim();
    const line = String(f.line || '').replace('🙏', '').trim();
    const head = `${f.big}${/^जय/.test(line) ? ', ' : ' '}${line}`.trim();
    lines = [`${head} 🙏 ${fname ? pick(QUESTIONS.festival, fname) : pick(QUESTIONS.day, '')}`, `${String(f.blessing || '').trim()}।`, 'Shyam Premi SN parivar ki taraf se hardik shubhkamnayein.'];
  } else {
    const dev = String(p.place || '').split(',')[0].trim();
    const q = dev && DEV.test(dev) ? pick(QUESTIONS.photo, dev) : pick(QUESTIONS.day, '');
    const name = String(p.templeName || '').split(',')[0].trim();
    lines = [`सुप्रभात 🙏 ${(cat?.[2] || 'जय श्री श्याम 🙏').replace(/\s*🙏$/, '')}। ${q}`, `${String(p.blessing || 'आपका दिन मंगलमय हो').trim().replace(/।$/, '')}।`, ...(name ? [`Aaj subah ke darshan: ${cut(name, 60)}.`] : [])];
  }
  const subj = fbSubject({ ...subject, hashtags: (p.hashtags || []).filter((x) => !/^#(shyambaba|suprabhat|mandirdarshan|festival)$/i.test(x)) });
  return { text: assemble({ lines, tags: subj.tags, links, credits, ai, aiLine }), source: 'composed' };
}

// ---------------------------------------------------------------- CLI

async function main() {
  const args = process.argv.slice(2);
  const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
  const cmd = args[0];
  if (cmd === 'plan') {
    const inputs = loadInputs(opt('--root') || '.');
    const from = opt('--from') || istToday();
    for (let i = 0; i < Number(opt('--days') || 14); i++) {
      const d = fbDay(addDays(from, i), inputs);
      const reels = d.videos.map((v) => `${v.at} ${v.slot}${v.kind && v.kind !== v.slot && v.kind !== 'status' ? `/${v.kind}` : ''}${v.festival ? `(${v.festival})` : ''}${v.type === 'video' ? ' [page video]' : ''}`).join(' | ') || 'no reels';
      const feed = d.feed.map((v) => ` || feed ${v.at} ${v.slot} [page video, not a Reel]`).join('');
      console.log(`${d.date} ${d.day} ${d.type.padEnd(8)} photo ${d.photo.at} | ${d.videos.length} reel(s): ${reels}${feed}`);
    }
    return 0;
  }
  if (cmd === 'flags') {
    const inputs = loadInputs(opt('--root') || '.');
    const pub = path.join(opt('--root') || '.', opt('--published') || 'automation/published.md');
    const posted = fs.existsSync(pub) ? fbPosted(fs.readFileSync(pub, 'utf8')) : [];
    const d = fbDecision({ date: opt('--date') || istToday(), slot: opt('--slot'), festivalDate: opt('--festival-date') || null, now: opt('--now') ? Date.parse(opt('--now')) : Date.now(), inputs, posted });
    console.error(`facebook: ${d.why}`);
    console.log(d.post ? `--fb-at ${d.at}` : '--no-fb');
    return 0;
  }
  if (cmd === 'check') {
    const f = args[1];
    const raw = fs.readFileSync(f, 'utf8');
    const spec = f.endsWith('.json') ? JSON.parse(raw) : null;
    const p = checkFbCaption(spec ? spec.facebook_caption : raw, { draft: args.includes('--draft'), subject: spec });
    console.log(p.length ? p.map((x) => `- ${x}`).join('\n') : 'OK');
    return p.length ? 1 : 0;
  }
  if (cmd === 'tags') {
    const spec = JSON.parse(fs.readFileSync(args[1], 'utf8'));
    const sj = fbSubject(spec);
    console.log(`${sj.tags.join(' ')}  (${sj.kind})`);
    return 0;
  }
  if (cmd === 'caption') { // preview the final Facebook text of a video spec
    const spec = JSON.parse(fs.readFileSync(args[1], 'utf8'));
    const r = fbVideoCaption(spec, { kind: opt('--kind') });
    console.log(`[${r.source}]\n${r.text}`);
    return 0;
  }
  throw new Error('Usage: fb.mjs plan | flags | check | tags | caption (see the header)');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  // On an error `flags` prints --no-fb and exits 0 (a broken plan never adds Facebook posts; the workflow continues).
  main().then((c) => { process.exitCode = c; }).catch((e) => { console.error(`fb.mjs: ${e.message}`); if (process.argv[2] === 'flags') console.log('--no-fb'); else process.exitCode = 1; });
}
