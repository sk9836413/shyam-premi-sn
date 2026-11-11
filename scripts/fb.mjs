#!/usr/bin/env node
// Facebook Page plan for reach (owner, 11 Nov 2026: Facebook monetization challenge, 1,000,000 views in 30 days from
// 11 Nov; the Page had 0-9 views a day while it got ~3 Reels + 4-5 photo posts a day). Facebook now gets at most
// 2 videos + 1 photo a day, at fixed times, with one caption template. YouTube and Instagram are NOT changed by this file.
//
//   Photo   06:30 IST  the morning darshan photo (photos.mjs post 1; the festival greeting on festival days). Posts 2-4
//                      (vichar, temple carousel, Khatu sandhya aarti) stay on Instagram only.
//   Reel 1  07:30 IST  the best status Short: a festival status variant at its own time (`status` 00:30 on the day,
//                      `eve` 20:00 the evening before; big tier first), else the weekday day-status morning Short
//                      (made ~09:40-10:30 IST, so it goes out as soon as it is ready: 07:30 has passed by then), else
//                      on a movie day the mini-movie part (a Page video: parts are over Meta's 90 s Reel limit).
//   Reel 2  20:30 IST  the evening Khatu / famous-temple darshan Short (18:00 when Reel 1 is the 20:00 `eve` status, so
//                      the two are 2.5 h apart); without an evening Short: the festival morning's temple darshan, else
//                      the other festival status variant, else the movie part.
//   Everything else (statusday 08:30, the second status of a day, Kalyug, the long katha, the Dadi-Chhotu Short, the
//   festival-day morning temple Short when the evening one exists) is not posted to Facebook.
//
// Caption template (checkFbCaption; validate.mjs checks Claude's `facebook_caption`, photos.mjs post 1's `fb_caption`):
//   line 1   a Hindi bhaav line + one genuine question (Devanagari, e.g. "हारे का सहारा, बाबा श्याम हमारा 🙏 आप खाटू धाम कब गए थे?")
//   1-2 lines of context (Devanagari, a little Hinglish is fine)
//   [the festival link line from scripts/festival-links.mjs, only when it applies] [photo credits / AI line]
//   exactly 3 hashtags on the last line: #KhatuShyam #JaiShreeShyam + 1 topical
//   No engagement bait of any kind: no share/like/comment/tag/follow/subscribe/forward/"likhein"/"bhejein" asks.
//
//   node scripts/fb.mjs plan [--days 14] [--from YYYY-MM-DD]        the Facebook plan per day (prints, posts nothing)
//   node scripts/fb.mjs flags --date D --slot S [--festival-date F] [--now ISO]
//        prints the meta.mjs / publish.mjs flag for one video: "--fb-at D'T'HH:MM" | "--fb-at now" | "--no-fb"
//   node scripts/fb.mjs check <scenes.json | caption.txt>            caption check (exit 1 with the problems)
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { LINKS } from './festival-links.mjs';
import { loadInputs, planDay, addDays, istToday } from './day-plan.mjs';

export const FB_TIMES = { photo: '06:30', reel1: '07:30', reel2: '20:30', reel2BeforeEve: '18:00', reel2Late: '21:30' };
const LEAD_MS = 15 * 60e3; // meta.mjs schedules only when the time is at least 15 minutes ahead
// How long after its planned time a video may still go out at once (render ran late): morning status/movie until
// ~16:00 IST, the evening darshan 2 h, a festival status 3 h; later than that it is not posted to Facebook.
const GRACE_H = { daystatus: 8.5, movie: 8.5, temple: 2, status: 3 };
const IST = 5.5 * 3600e3;
export const istAt = (date, hm) => Date.parse(`${date}T${hm}:00Z`) - IST;
const TIER = { big: 0, status: 1 };

// ---------------------------------------------------------------- the plan

/** Facebook posts of one IST date: { date, photo: {at}, videos: [{ slot, at, kind, role, festival?, festivalDate?, type }] }. */
export function fbDay(date, inputs) {
  const p = planDay(date, inputs);
  const pl = inputs.placements || [];
  const place = (u) => pl.find((x) => x.date === date && x.slot === u.slot && x.festival.key === u.festival);
  const fest = p.uploads.filter((u) => u.kind === 'status' && (u.slot === 'status' || u.slot === 'eve'))
    .map((u) => ({ u, pl: place(u) }))
    .sort((a, b) => (TIER[a.pl?.tier] ?? 9) - (TIER[b.pl?.tier] ?? 9) || (a.u.slot === 'status' ? 0 : 1) - (b.u.slot === 'status' ? 0 : 1));
  const asStatus = ({ u, pl: x }) => ({ slot: u.slot, at: u.at, kind: 'status', festival: u.festival, festivalDate: x?.festival.date || null, type: 'reel' });
  const daystatus = p.uploads.find((u) => u.slot === 'morning' && u.kind === 'daystatus');
  const movie = p.uploads.find((u) => u.slot === 'movie');
  const movieVideo = movie && { slot: 'movie', at: FB_TIMES.reel1, kind: 'movie', type: 'video' };
  const out = [];
  const r1 = fest.length ? asStatus(fest[0]) : daystatus ? { slot: 'morning', at: FB_TIMES.reel1, kind: 'daystatus', type: 'reel' } : movieVideo || null;
  if (r1) out.push({ ...r1, role: 'reel1' });
  const evening = p.uploads.find((u) => u.slot === 'evening');
  const morningTemple = p.uploads.find((u) => u.slot === 'morning' && u.kind === 'temple');
  const late = r1?.at === '20:00' ? FB_TIMES.reel2BeforeEve : FB_TIMES.reel2;
  const r2 = evening ? { slot: 'evening', at: late, kind: 'temple', type: 'reel' }
    : morningTemple ? { slot: 'morning', at: late, kind: 'temple', type: 'reel' }
      : fest[1] && !(r1?.slot === fest[1].u.slot) ? asStatus(fest[1])
        : movieVideo && r1?.slot !== 'movie' ? movieVideo : null;
  if (r2) out.push({ ...r2, role: 'reel2' });
  out.sort((a, b) => a.at.localeCompare(b.at));
  return { date, day: p.day, type: p.type, festival: p.festival, photo: { at: FB_TIMES.photo }, videos: out };
}

/** The Facebook decision for one video: { post, at: 'YYYY-MM-DDTHH:MM' | 'now' | null, why }. */
export function fbDecision({ date, slot, festivalDate = null, now = Date.now(), inputs }) {
  const day = fbDay(date, inputs);
  const v = day.videos.find((x) => x.slot === slot && (!festivalDate || !x.festivalDate || x.festivalDate === festivalDate));
  if (!v) return { post: false, at: null, why: `${date} ${slot}${festivalDate ? ` (${festivalDate})` : ''} is not in the Facebook plan (${day.videos.map((x) => `${x.slot} ${x.at}`).join(', ') || 'no videos'})` };
  const tries = [v.at, ...(v.role === 'reel2' && v.at === FB_TIMES.reel2BeforeEve ? [FB_TIMES.reel2Late] : [])];
  for (const hm of tries) if (istAt(date, hm) - now >= LEAD_MS) return { post: true, at: `${date}T${hm}`, why: `${v.role} ${hm} IST` };
  const graceEnd = istAt(date, tries.at(-1)) + (GRACE_H[v.kind] ?? 2) * 3600e3;
  if (now <= graceEnd) return { post: true, at: 'now', why: `${v.role}: ${v.at} IST has passed; posting as soon as it is ready` };
  return { post: false, at: null, why: `${v.role} ${v.at} IST is over ${GRACE_H[v.kind] ?? 2} h past: not posted to Facebook` };
}

// ---------------------------------------------------------------- captions

const DEV = /[ऀ-ॿ]/;
const DEV_G = /[ऀ-ॿ]/g;
const LAT_G = /[A-Za-z]/g;
const TAG = /^#[\p{L}\p{N}_]+$/u;
export const BASE_TAGS = ['#KhatuShyam', '#JaiShreeShyam'];
// Meta demotes engagement bait (react/comment/share/tag/vote baiting). A plain question is fine; any ask to act is not.
const FB_BAIT = new RegExp([
  String.raw`\b(share|shares|sharing|forward|tag|like|likes|comment|comments|subscribe|follow)\b`,
  String.raw`शेयर|फॉरवर्ड|फ़ॉरवर्ड|टैग|लाइक|कमेंट|कॉमेंट|सब्सक्राइब|फॉलो|फ़ॉलो|भेजें|भेजो|भेजिए|लिखें|लिखो|लिखिए|टाइप`,
  String.raw`\bbhej(o|ein|en|iye)\b|\blikh(o|ein|en|iye)\b|\btype\s*kar|\bwarna\b|वरना|nahi\s*to\s*(bura|nuksaan|paap)|\bamen\b|आमीन`,
  String.raw`paisa\s*aayega|dhan\s*varsha|guaranteed|100\s*%|bad\s*luck|ignore\s*mat|miracle|chamatkar\s*pakka|चमत्कार\s*पक्का`,
].join('|'), 'i');
const isTagLine = (l) => l.split(/\s+/).filter(Boolean).every((w) => TAG.test(w));
const isLink = (l) => /https?:\/\//.test(l);
const isCredit = (l) => /^(📷\s*)?(Photo|Photos|Foto)\b.*:|Wikimedia Commons|^📷/i.test(l);
const isAi = (l) => /sanketik|सांकेतिक|\bAI\s+(se|dwara|द्वारा|से)\b/i.test(l);
const devShare = (t) => { const d = (t.match(DEV_G) || []).length; const l = (t.match(LAT_G) || []).length; return d + l ? d / (d + l) : 0; };

/** Problems with a Facebook caption (empty = OK). draft: Claude's text before the script adds links/credits (no URLs). */
export function checkFbCaption(text, { draft = false } = {}) {
  const e = [];
  const t = String(text ?? '').trim();
  if (!t) return ['facebook caption: empty'];
  const lines = t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const last = lines.at(-1);
  const tags = isTagLine(last) ? last.split(/\s+/).filter(Boolean) : [];
  if (tags.length !== 3) e.push(`hashtags: exactly 3 on the last line (#KhatuShyam #JaiShreeShyam + 1 topical), has ${tags.length}`);
  else {
    const low = tags.map((x) => x.toLowerCase());
    if (!low.includes('#khatushyam') || !low.includes('#jaishreeshyam')) e.push('hashtags: must include #KhatuShyam and #JaiShreeShyam');
    if (new Set(low).size !== 3) e.push('hashtags: the third one is a different, topical tag (deity, temple or festival)');
  }
  const rest = tags.length ? lines.slice(0, -1) : lines;
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
  const bhaav = isStatus && DEV.test(big) ? big.replace(/\s*🙏\s*$/, '').trim() + ' 🙏' : (cat?.[2] || 'जय श्री श्याम 🙏');
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
  return { lines: [`${bhaav} ${q}`, ...ctx], tag: topicalTag(spec, cat) };
}

/** Only the festival-links.mjs link lines are kept on Facebook (not the status download link: an off-site link in a Reel caption). */
export const festivalLinkLines = (text) => String(text || '').split(/\r?\n/).map((l) => l.trim())
  .filter((l) => isLink(l) && LINKS.some((x) => l.includes(new URL(x.url).origin + new URL(x.url).pathname)));

/** Assembles body + link + credits + 3 hashtags. */
export function assemble({ lines, tag, links = [], credits = [], ai = false, aiLine = 'Chitra AI dwara banaye gaye hain (sanketik).' }) {
  const third = !tag || /^#(khatushyam|jaishreeshyam)$/i.test(tag) ? '#ShyamBaba' : tag;
  const meta = [...links, ...(ai ? [aiLine] : []), ...credits];
  return [lines.join('\n'), ...(meta.length ? [meta.join('\n')] : []), [...BASE_TAGS, third].join(' ')].join('\n\n');
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
 */
export function fbVideoCaption(spec, { kind } = {}) {
  const k = kind || (spec.format === 'status' ? (spec.slot === 'eve' ? 'eve' : spec.day_status ? 'daystatus' : 'status') : spec.format === 'movie' ? 'movie' : 'temple');
  const own = splitCaption(spec.facebook_caption);
  const { credits } = own;
  const mine = assemble({ lines: own.body, tag: own.tags.find((x) => !/^#(khatushyam|jaishreeshyam)$/i.test(x)), links: own.links, credits, ai: true });
  if (own.tags.length === 3 && !checkFbCaption(mine).length) return { text: mine, source: 'spec' };
  const c = composeVideoBody(spec, k);
  const text = assemble({ ...c, links: own.links, credits, ai: true });
  return { text, source: 'composed', problems: checkFbCaption(mine) };
}

/**
 * The Facebook text of photo post 1 (darshan / festival): Claude's `fb_caption` if it passes, else composed.
 * p = { kind, date, temple, templeName, festival: { big, line, blessing } | null, fbCaption, place, blessing, hashtags }
 */
export function fbPhotoCaption(p, { links = [], credits = [], ai = false } = {}) {
  const aiLine = 'Chitra AI dwara banaya gaya hai (sanketik).';
  const own = splitCaption(p.fbCaption);
  if (p.fbCaption && !checkFbCaption(p.fbCaption, { draft: true }).length) {
    return { text: assemble({ lines: own.body, tag: own.tags[2], links, credits, ai, aiLine }), source: 'claude' };
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
  const tag = (p.hashtags || []).find((x) => !/^#(khatushyam|jaishreeshyam|shyambaba|suprabhat|mandirdarshan|festival)$/i.test(x)) || cat?.[3];
  return { text: assemble({ lines, tag, links, credits, ai, aiLine }), source: 'composed' };
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
      console.log(`${d.date} ${d.day} ${d.type.padEnd(8)} photo ${d.photo.at} | ${d.videos.map((v) => `${v.role} ${v.at} ${v.slot}${v.festival ? `(${v.festival})` : ''}${v.type === 'video' ? ' [page video]' : ''}`).join(' | ') || 'no videos'}`);
    }
    return 0;
  }
  if (cmd === 'flags') {
    const inputs = loadInputs(opt('--root') || '.');
    const d = fbDecision({ date: opt('--date') || istToday(), slot: opt('--slot'), festivalDate: opt('--festival-date') || null, now: opt('--now') ? Date.parse(opt('--now')) : Date.now(), inputs });
    console.error(`facebook: ${d.why}`);
    console.log(d.post ? `--fb-at ${d.at}` : '--no-fb');
    return 0;
  }
  if (cmd === 'check') {
    const f = args[1];
    const raw = fs.readFileSync(f, 'utf8');
    const text = f.endsWith('.json') ? JSON.parse(raw).facebook_caption : raw;
    const p = checkFbCaption(text, { draft: args.includes('--draft') });
    console.log(p.length ? p.map((x) => `- ${x}`).join('\n') : 'OK');
    return p.length ? 1 : 0;
  }
  if (cmd === 'caption') { // preview the final Facebook text of a video spec
    const spec = JSON.parse(fs.readFileSync(args[1], 'utf8'));
    const r = fbVideoCaption(spec, { kind: opt('--kind') });
    console.log(`[${r.source}]\n${r.text}`);
    return 0;
  }
  throw new Error('Usage: fb.mjs plan | flags | check | caption (see the header)');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  // On an error `flags` prints --no-fb and exits 0 (a broken plan never adds Facebook posts; the workflow continues).
  main().then((c) => { process.exitCode = c; }).catch((e) => { console.error(`fb.mjs: ${e.message}`); if (process.argv[2] === 'flags') console.log('--no-fb'); else process.exitCode = 1; });
}
