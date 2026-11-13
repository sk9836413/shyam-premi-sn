#!/usr/bin/env node
// Daily photo posts for Shyam Premi SN: 4 a day on the Instagram feed (@khatushyampremisn) and the Facebook Page
// (SHYAM PREMI SKA), for interaction between the videos. Rules and the texts Claude writes: automation/PHOTOS.md.
//
//   1 Suprabhat darshan: a REAL temple photo (footage/<temple>/, licence-checked, credited), rotated by the weekday
//     deity; on a festival day (automation/calendar.md) the festival greeting card instead   FB 06:30  IG 09:13 IST
//   2 Aaj ka vichar: a quote card (automation/vichar.json, rotated; no picture)               IG 10:43 only
//   3 Mandir carousel: real photos of one temple + 3 sourced fact slides (Claude)            IG 18:46 only
//   4 Sandhya aarti: Khatu Shyam ji darshan (AI picture, labelled; the owner's own photos in
//     footage/khatu-shyam-mandir/ win when they exist) + a genuine question                    IG 19:46 only
// Facebook (owner, 11 Nov 2026, monetization challenge): ONE photo a day, post 1 at 06:30 IST, in the Facebook caption
// template of scripts/fb.mjs (Claude's `fb_caption`, else composed); Instagram is unchanged.
// Facebook is SCHEDULED (scheduled_publish_time). Instagram has no scheduled publishing, so its times are the existing
// triggers of the scheduler Worker (E:\epifive\scheduler), which dispatches .github/workflows/photos.yml on every
// cron; `flush` publishes the Instagram post whose time has come. Build happens the evening before (18:46 IST, retry
// 19:46) for the next day, and on any run for the slots of today that are still ahead (first day, missed evening).
//
//   node scripts/photos.mjs due                       dates/slots that still need building (JSON; GITHUB_OUTPUT dates=)
//   node scripts/photos.mjs plan --date D [--slots 1,2,3,4]   choose temple, photos, quote, festival -> story/photos/D/plan.json
//   node scripts/photos.mjs validate --date D         check Claude's story/photos/D/posts.json (exit 1 with the problems)
//   node scripts/photos.mjs build --date D [--no-flux]         texts (Claude's or the fallback) + cards -> story/photos/D/out/
//   node scripts/photos.mjs publish --date D [--dry-run]       host on the media Worker, schedule FB, queue IG -> automation/photos/D.json
//   node scripts/photos.mjs flush [--dry-run]         publish the Instagram post that is due (at most one per run)
//   node scripts/photos.mjs topup [--max 2]          morning runs: AI pictures for upcoming festivals / Khatu into brand/photo-bank
// Env: META_PAGE_ID, META_PAGE_TOKEN, IG_USER_ID, META_API_VERSION, MEDIA_URL, MEDIA_TOKEN (else ~/.shyampremisk/social.env
// and media-token.txt). FLUX: media Worker /ai/flux (FLUX.1 schnell, ~170 neurons per picture; 1-2 pictures a day).
// Fail-soft by design: the workflow is separate from the video pipeline, and a missing text, picture or platform only
// drops or simplifies that one post.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { linkLines } from './festival-links.mjs';
import { checkFbCaption, fbPhotoCaption } from './fb.mjs';
import { cardHtml, imageSize, renderCards } from './photo-cards.mjs';
import { photosFor, FOOTAGE } from './real-photos.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATE = path.join(ROOT, 'automation', 'photos');
const WORK = path.join(ROOT, 'story', 'photos');

// ---------------------------------------------------------------- env

const readEnv = (file) => (fs.existsSync(file)
  ? Object.fromEntries(fs.readFileSync(file, 'utf8').split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]))
  : {});
const KEYS = ['META_PAGE_ID', 'META_PAGE_TOKEN', 'IG_USER_ID', 'META_API_VERSION', 'MEDIA_URL', 'MEDIA_TOKEN'];
const env = {
  MEDIA_URL: 'https://shyam-premi-media.sk9836413.workers.dev',
  ...readEnv(path.join(os.homedir(), '.shyampremisk', 'social.env')),
  ...Object.fromEntries(KEYS.filter((k) => process.env[k]).map((k) => [k, process.env[k]])),
};
if (!env.MEDIA_TOKEN) {
  const f = path.join(os.homedir(), '.shyampremisk', 'media-token.txt');
  if (fs.existsSync(f)) env.MEDIA_TOKEN = fs.readFileSync(f, 'utf8').trim();
}
const API = `https://graph.facebook.com/${env.META_API_VERSION || 'v27.0'}`;
const SECRETS = () => [env.META_PAGE_TOKEN, env.MEDIA_TOKEN].filter(Boolean);
const redact = (s) => SECRETS().reduce((t, k) => t.split(k).join('<token>'), String(s ?? ''));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- time (IST)

export const SLOTS = [
  { n: 1, fb: '06:30', ig: '09:13' },
  { n: 2, fb: null, ig: '10:43' },
  { n: 3, fb: null, ig: '18:46' },
  { n: 4, fb: null, ig: '19:46' },
];
const IST = 5.5 * 3600e3;
export const istDate = (now = Date.now()) => new Date(now + IST).toISOString().slice(0, 10);
export const istHour = (now = Date.now()) => new Date(now + IST).getUTCHours();
export const istAt = (date, hm) => Date.parse(`${date}T${hm}:00Z`) - IST;
export const addDays = (date, n) => new Date(Date.parse(`${date}T00:00:00Z`) + n * 86400e3).toISOString().slice(0, 10);
const weekday = (date) => new Date(`${date}T00:00:00Z`).getUTCDay();
const FB_LEAD = 12 * 60e3; // Facebook needs a scheduled time at least 10 minutes ahead
const IG_EARLY = 10 * 60e3; // flush publishes an Instagram post up to 10 minutes before its time
const IG_LATE = 4 * 3600e3; // and skips it when more than 4 hours late (the next slot has its own post)

/** Slots of `date` that still make sense to build at `now`, minus those already published. */
export function slotsToBuild(date, now = Date.now(), done = []) {
  return SLOTS.filter((s) => !done.includes(s.n))
    .filter((s) => istAt(date, s.ig) >= now - IG_EARLY || (s.fb && istAt(date, s.fb) >= now + FB_LEAD))
    .map((s) => s.n);
}

const statePath = (date) => path.join(STATE, `${date}.json`);
const readState = (date) => (fs.existsSync(statePath(date)) ? JSON.parse(fs.readFileSync(statePath(date), 'utf8')) : null);

/** What the workflow should build now: today's remaining slots (when today was never built) and tomorrow from 17:00 IST. */
export function due(now = Date.now()) {
  const today = istDate(now);
  const out = [];
  for (const date of [today, ...(istHour(now) >= 17 ? [addDays(today, 1)] : [])]) {
    const st = readState(date);
    const done = st ? st.posts.map((p) => p.n) : [];
    if (st && date !== today) continue; // tomorrow is planned once
    if (st && done.length) continue; // today was built (maybe partly): never add more posts to a built day
    const slots = slotsToBuild(date, now, done);
    if (slots.length) out.push({ date, slots });
  }
  return out;
}

// ---------------------------------------------------------------- calendar and festivals

export function festivalOn(date) {
  const file = path.join(ROOT, 'automation', 'calendar.md');
  const row = fs.readFileSync(file, 'utf8').split(/\r?\n/).find((l) => l.startsWith(`| ${date} |`));
  if (!row) return null;
  // the festival names only, not the cited sources ("Dev Diwali" in a Kartik Purnima source line is not Diwali)
  const text = row.split('|')[2].replace(/\*\*/g, '').split(/Sources?:/)[0].trim();
  const f = FESTIVALS.find((x) => x.match.test(text));
  return f ? { ...f, calendar: text } : null;
}

const STYLE = 'Respectful traditional Hindu devotional art, highly detailed, soft painterly finish, warm cinematic golden lighting, centred symmetrical composition, no text, no letters, no words, no watermark, no logo';
// Owner, 6 Nov 2026: Baba Shyam is worshipped as the SHEESH (head) only: no body, no flute, no arms.
export const KHATU_SHEESH = 'Front-facing darshan of Shri Khatu Shyam ji exactly as worshipped at Khatu Dham, Rajasthan: ONLY the sacred head (sheesh) of the deity, no body, no neck, no shoulders, no arms, no hands, no flute; a large divine face with big wide expressive eyes and a curled moustache, a tilak on the forehead, a tall ornate golden crown (mukut) with peacock feathers and golden sun-ray motifs; the head is set inside an oval frame of layered flower garlands in white, pink, blue and orange marigold, with gold jewellery; behind it a richly decorated temple sanctum with silver and gold carvings';
const AARTI_LIGHT = [
  'warm evening aarti light, brass diyas glowing in the foreground, soft incense haze',
  'evening sandhya aarti, a lit five-wick aarti diya in the foreground, glowing marigold and rose petals',
  'golden evening lamp light, rows of small clay diyas, gentle incense smoke, red and gold silk drapes',
];

// Festival greeting cards (post 1 on these days). `temple` = a real photo of that temple; `flux` = an AI picture (labelled).
const FESTIVALS = [
  { key: 'janmotsav', bank: ['janmotsav', 'khatu'], match: /janmotsav/i, big: 'श्याम जन्मोत्सव', line: 'जय श्री श्याम 🙏', text: 'बाबा श्याम के जन्मोत्सव की हार्दिक शुभकामनाएं', tags: ['#KhatuShyamJanmotsav', '#DevUthaniEkadashi'], flux: `${KHATU_SHEESH}, festive decorations, many diyas and flower garlands` },
  { key: 'dhanteras', match: /dhanteras/i, big: 'शुभ धनतेरस', line: 'जय श्री श्याम 🙏', text: 'आपके घर सुख, आरोग्य और समृद्धि बनी रहे', tags: ['#Dhanteras', '#Dhanteras2026'], flux: 'A shining brass kalash and new brass utensils on a red cloth with a lit clay diya, marigold flowers and a colourful rangoli, festive evening light, no people' },
  { key: 'choti-diwali', match: /choti diwali|naraka/i, big: 'छोटी दिवाली', line: 'की शुभकामनाएं 🙏', text: 'दीपों का प्रकाश आपके घर में खुशियां लाए', tags: ['#ChotiDiwali', '#NarakChaturdashi'], flux: 'Rows of glowing clay diyas on a courtyard floor around a bright flower rangoli at dusk, marigold garlands on a carved wooden doorway, no people' },
  { key: 'diwali', match: /diwali|lakshmi puja/i, big: 'शुभ दीपावली', line: 'जय श्री श्याम 🙏', text: 'माँ लक्ष्मी की कृपा से आपका घर रोशन रहे', tags: ['#Diwali', '#HappyDiwali', '#LakshmiPuja', '#Deepawali'], flux: 'A beautifully decorated home altar for Lakshmi Puja: brass diyas, marigold garlands, a silver kalash with mango leaves and a coconut, lotus flowers, a colourful rangoli, glowing warm light, no people' },
  { key: 'govardhan', match: /govardhan/i, big: 'गोवर्धन पूजा', line: 'की हार्दिक शुभकामनाएं 🙏', text: 'गिरिराज जी की कृपा सदा बनी रहे', tags: ['#GovardhanPuja', '#Annakut', '#GirirajJi'], temple: 'govardhan' },
  { key: 'bhai-dooj', match: /bhai dooj/i, big: 'भाई दूज', line: 'की शुभकामनाएं 🙏', text: 'भाई-बहन का प्रेम सदा बना रहे', tags: ['#BhaiDooj', '#BhaiDooj2026'], flux: 'A festive puja thali on a red cloth with roli, rice, a lit diya, sweets and a coconut, marigold flowers around it, warm light, no people' },
  { key: 'chhath', match: /chhath/i, big: 'छठ पूजा', line: 'की शुभकामनाएं 🙏', text: 'छठी मैया और सूर्य देव की कृपा बनी रहे', tags: ['#ChhathPuja', '#ChhathiMaiya', '#SuryaDev'], flux: 'Sunrise over a calm river ghat, bamboo soop baskets with fruits, sugarcane and thekua on the steps, lit diyas floating on the water, golden sun on the horizon, no people' },
  { key: 'tulsi-vivah', match: /tulsi vivah/i, big: 'तुलसी विवाह', line: 'की शुभकामनाएं 🙏', text: 'तुलसी माता और शालिग्राम जी की कृपा बनी रहे', tags: ['#TulsiVivah', '#TulsiVivah2026'], flux: 'A tulsi plant dressed as a bride with a red chunari and marigold garlands, a small Shaligram stone on a silver throne beside it, lit diyas, no people' },
  { key: 'ekadashi', bank: ['khatu'], match: /ekadashi/i, big: 'शुभ एकादशी', line: 'जय श्री श्याम 🙏', text: 'भगवान श्री हरि की कृपा सदा बनी रहे', tags: ['#Ekadashi', '#JaiShreeHari'], temple: null },
];

// Festival links (the card pages on the channel's own site, site/) come from scripts/festival-links.mjs, shared with the videos: the Diwali card on
// festival posts 6-11 Nov, the Khatu Shyam Janmotsav card on festival, morning darshan and Khatu sandhya posts 17-20 Nov,
// tagged per platform (utm_source=facebook / instagram), only while the page returns 200.

// ---------------------------------------------------------------- temples and rotation

const temples = () => JSON.parse(fs.readFileSync(path.join(FOOTAGE, 'temples.json'), 'utf8'));
export const CATEGORY = [
  ['shiv', /somnath|mallikarjun|mahakal|omkareshwar|kedarnath|bhimashankar|vishwanath|trimbak|baidyanath|vaidyanath|nageshwar|rameshwaram|grishneshwar|tungnath|rudranath|kalpeshwar|madhyamaheshwar|ekambar|jambukeswar|arunachal|nataraja|kalahasti|eklingji|khajuraho|parli/],
  ['hanuman', /hanuman|sankat-mochan|jakhu|salasar|mehandipur|kashtbhanjan/],
  ['ganesh', /ganesh|ashtavinayak|siddhivinayak|vinayak/],
  ['shani', /shani|navagraha/],
  ['surya', /konark|surya|sun-temple/],
  ['vishnu', /govind|badrinath|dwarkadhish|jagannath|bihari|prem-mandir|iskcon|govardhan|barsana|udupi|guruvayur|tirupati|padmanabh|shrinath|krishna|nandgaon|ram-mandir/],
  ['devi', /mata|devi|kamakhya|kalighat|vaishno|chintpurni|tarapith|ambaji|kamakshi|meenakshi|dakshineswar|jwala|naina|vindhya|hinglaj|shakambhari|karni|kaila|tanot|jeen/],
];
export const categoryOf = (slug) => (/sati/.test(slug) ? 'sati' : CATEGORY.find(([, re]) => re.test(slug))?.[0] || 'other');
// Weekday deity (STORY.md): Sun Surya, Mon Shiv, Tue Hanuman, Wed Ganesh, Thu Vishnu/Krishna, Fri Devi, Sat Shani/Hanuman.
const DAY_CATS = [['surya', 'other', 'vishnu'], ['shiv'], ['hanuman'], ['ganesh'], ['vishnu'], ['devi'], ['shani', 'hanuman']];
const CAT_TAGS = { shiv: ['#HarHarMahadev', '#Mahadev'], hanuman: ['#JaiHanuman', '#Bajrangbali'], ganesh: ['#GanpatiBappaMorya', '#Ganesh'], shani: ['#ShaniDev', '#Navagraha'], surya: ['#SuryaDev', '#Mandir'], vishnu: ['#JaiShreeKrishna', '#Vishnu'], devi: ['#JaiMataDi', '#MaaDurga'], other: ['#Mandir', '#SanatanDharma'] };

const camelTag = (name) => `#${name.split(',')[0].replace(/\(.*?\)/g, '').replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join('')}`;

/** Temples with licence-safe photos: [{slug, name, category, photos}] (sati temples never). */
export function photoTemples() {
  return Object.entries(temples()).filter(([k]) => !k.startsWith('_')).map(([slug, t]) => ({ slug, name: t.name, category: categoryOf(slug), photos: photosFor(slug) }))
    .filter((t) => t.photos.length && t.category !== 'sati');
}

/** Usage history from automation/photos/*.json of the last 60 days: {temple: lastDate}, {photoFile: count}, quotes used. */
export function history(before) {
  const h = { temple: {}, photo: {}, quote: [] };
  // Published days (automation/photos/<date>.json) and days planned but not yet published (story/photos/<date>/plan.json),
  // so a run that plans today and tomorrow does not pick the same temple twice.
  const files = [
    ...(fs.existsSync(STATE) ? fs.readdirSync(STATE).filter((x) => /^\d{4}-\d{2}-\d{2}\.json$/.test(x)).map((x) => [x.slice(0, 10), path.join(STATE, x)]) : []),
    ...(fs.existsSync(WORK) ? fs.readdirSync(WORK).filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x)).map((x) => [x, path.join(WORK, x, 'plan.json')]) : []),
  ].filter(([date, f]) => date < before && date >= addDays(before, -60) && fs.existsSync(f)).sort();
  for (const [date, f] of files) {
    for (const p of JSON.parse(fs.readFileSync(f, 'utf8')).posts || []) {
      if (p.temple) h.temple[p.temple] = date > (h.temple[p.temple] || '') ? date : h.temple[p.temple];
      for (const ph of [...(p.photos || []), ...(p.bank ? [p.bank] : [])]) { const k = typeof ph === 'string' ? ph : ph.file; h.photo[k] = (h.photo[k] || 0) + 1; }
      if (Number.isInteger(p.quote)) h.quote.push(p.quote);
    }
  }
  return h;
}

const hash = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const rel = (f) => path.relative(ROOT, f).split(path.sep).join('/');

function pickTemple(list, h, date, avoid = [], minPhotos = 1) {
  const pool = list.filter((t) => !avoid.includes(t.slug) && t.photos.length >= minPhotos);
  return pool.sort((a, b) => (h.temple[a.slug] || '0').localeCompare(h.temple[b.slug] || '0') || (hash(date + a.slug) - hash(date + b.slug)))[0];
}
function pickPhotos(t, h, date, n) {
  return [...t.photos].sort((a, b) => (h.photo[rel(a.file)] || 0) - (h.photo[rel(b.file)] || 0) || hash(date + a.file) - hash(date + b.file)).slice(0, n);
}
// ---- AI picture bank (brand/photo-bank/<key>/*.jpg + .json): made ahead, so a post never depends on that day's FLUX
// budget (the 10,000 free neurons are often used up by the videos before noon IST). `topup` adds at most 2 a day.
const BANK = path.join(ROOT, 'brand', 'photo-bank');
export const bankFiles = (key) => {
  const dir = path.join(BANK, key);
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /\.jpe?g$/i.test(f)).sort().map((f) => rel(path.join(dir, f))) : [];
};
function pickBank(keys, h) {
  for (const key of keys) {
    const files = bankFiles(key);
    if (files.length) return files.sort((a, b) => (h.photo[a] || 0) - (h.photo[b] || 0) || a.localeCompare(b))[0];
  }
  return null;
}

/** Adds AI pictures to the bank on the morning runs: a festival in the next 1-4 days without one, then Khatu (up to 24). */
export async function topup({ max = 2, now = Date.now(), log = console.log } = {}) {
  const today = istDate(now);
  const made = [];
  const madeToday = fs.existsSync(BANK) ? fs.readdirSync(BANK).flatMap((k) => fs.readdirSync(path.join(BANK, k)).filter((f) => f.endsWith('.json')).map((f) => path.join(BANK, k, f)))
    .filter((f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')).made === today && /workers-ai/.test(JSON.parse(fs.readFileSync(f, 'utf8')).source || ''); } catch { return false; } }).length : 0;
  let left = Math.max(0, max - madeToday);
  const wants = [];
  for (let d = 1; d <= 4; d++) { // tomorrow is built this evening; today is already built
    const f = festivalOn(addDays(today, d));
    if (f && f.flux && !f.temple && !bankFiles(f.key).length && !wants.some((w) => w.key === f.key)) wants.push({ key: f.key, prompt: f.flux });
  }
  if (bankFiles('khatu').length < 24) wants.push({ key: 'khatu', prompt: `${KHATU_SHEESH}, ${AARTI_LIGHT[hash(today) % AARTI_LIGHT.length]}` });
  for (const w of wants) {
    if (left <= 0) break;
    const dir = path.join(BANK, w.key);
    fs.mkdirSync(dir, { recursive: true });
    const name = `workers-ai-${today}-${hash(w.prompt + today) % 1000}`;
    try {
      await flux(w.prompt, path.join(dir, `${name}.jpg`));
      fs.writeFileSync(path.join(dir, `${name}.json`), `${JSON.stringify({ ai: true, source: 'workers-ai flux-1-schnell (media Worker /ai/flux)', prompt: w.prompt, made: today }, null, 2)}\n`);
      made.push(`${w.key}/${name}.jpg`);
      left--;
    } catch (e) {
      log(`topup ${w.key}: ${redact(e.message)}`);
      break; // usually the daily neuron budget: stop for today
    }
  }
  return { status: 'ok', made, neurons: made.length * 170 };
}

const photoInfo = (p) => ({ file: rel(p.file), credit: p.attribution || `Photo: ${p.author}, ${p.licence}`, url: p.url || '', licence: p.licence, author: p.author, title: p.title || '' });

// Recent Shorts' temple (story/published/<date or the day before>-*.json `temple`), so the carousel follows the videos.
function recentVideoTemple(date, list) {
  const dir = path.join(ROOT, 'story', 'published');
  if (!fs.existsSync(dir)) return null;
  const days = [addDays(date, -1), addDays(date, -2)];
  for (const f of fs.readdirSync(dir).filter((x) => days.some((d) => x.startsWith(d)) && x.endsWith('.json') && !x.endsWith('.meta.json')).sort().reverse()) {
    try {
      const slug = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).temple;
      const t = slug && list.find((x) => x.slug === slug || temples()[x.slug]?.aliases?.includes(slug));
      if (t && t.photos.length >= 2) return t;
    } catch { /* skip a broken file */ }
  }
  return null;
}

// ---------------------------------------------------------------- plan

const QUOTES = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'automation', 'vichar.json'), 'utf8')).quotes;
export const quoteIndex = (date, n) => Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse('2026-11-01T00:00:00Z')) / 86400e3) % n;

// Chhath 2026 (owner, 13 Nov 2026: every post of 14-16 Nov Chhath themed; automation/chhath-2026.json `photos.days`):
// post 2 and post 4 become Chhath greeting cards (AI bank pictures, labelled), post 3 the carousel of a Surya temple.
export function chhathDay(date) {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'automation', 'chhath-2026.json'), 'utf8')).photos?.days?.[date] || null; } catch { return null; }
}
const CHHATH_TAGS = ['#ChhathPuja', '#ChhathiMaiya', '#SuryaDev'];

export function plan(date, slots = [1, 2, 3, 4]) {
  const h = history(date);
  const ch = chhathDay(date);
  const takenBank = [];
  const chhathCard = (base, c) => {
    const free = bankFiles('chhath').filter((f) => !takenBank.includes(f)).sort((a, b) => (h.photo[a] || 0) - (h.photo[b] || 0) || a.localeCompare(b));
    const bank = (c.img && free.find((f) => new RegExp(`-${c.img}\\.jpe?g$`).test(f))) || free[0] || null;
    if (bank) takenBank.push(bank);
    return { ...base, kind: 'festival', festival: { key: 'chhath', name: c.name, big: c.big, line: c.line, blessing: c.text, tags: CHHATH_TAGS },
      ...(bank ? { bank } : { flux: c.flux }), write: ['big', 'line', 'place', 'text', 'caption', 'hashtags'] };
  };
  const list = photoTemples();
  const fest = festivalOn(date);
  const cats = DAY_CATS[weekday(date)];
  const inCats = list.filter((t) => cats.includes(t.category));
  const posts = [];
  const used = [];
  for (const n of slots) {
    const s = SLOTS.find((x) => x.n === n);
    const base = { n, fbAt: s.fb ? new Date(istAt(date, s.fb)).toISOString() : null, igAt: new Date(istAt(date, s.ig)).toISOString() };
    if (ch && ch[`p${n}`] && !ch[`p${n}`].temple) {
      posts.push(chhathCard(base, ch[`p${n}`]));
      continue;
    }
    const chT = ch?.[`p${n}`]?.temple && list.find((x) => x.slug === ch[`p${n}`].temple);
    if (n === 3 && chT) {
      used.push(chT.slug);
      posts.push({ ...base, kind: 'facts', temple: chT.slug, templeName: chT.name, category: chT.category, photos: pickPhotos(chT, h, date, 4).map(photoInfo), write: ['title', 'line', 'facts', 'sources', 'caption', 'hashtags'] });
      continue;
    }
    if (n === 1 && fest) {
      const t = fest.temple && list.find((x) => x.slug === fest.temple);
      const bank = !t && (fest.key === 'chhath' ? (() => { const b = (ch?.p1img && bankFiles('chhath').find((f) => new RegExp(`-${ch.p1img}\\.jpe?g$`).test(f))) || pickBank([fest.key], h); if (b) takenBank.push(b); return b; })() : pickBank(fest.bank || [fest.key], h));
      posts.push({ ...base, kind: 'festival', festival: { key: fest.key, name: fest.calendar, big: fest.big, line: fest.line, blessing: fest.text, tags: fest.tags },
        ...(t ? { temple: t.slug, templeName: t.name, photos: pickPhotos(t, h, date, 1).map(photoInfo) } : bank ? { bank } : { flux: fest.flux || `${KHATU_SHEESH}, festive diyas and flowers` }),
        write: ['big', 'line', 'place', 'text', 'caption', 'hashtags', 'fb_caption'] });
      if (t) used.push(t.slug);
    } else if (n === 1) {
      const t = pickTemple(inCats.length ? inCats : list, h, date, used);
      used.push(t.slug);
      posts.push({ ...base, kind: 'darshan', temple: t.slug, templeName: t.name, category: t.category, photos: pickPhotos(t, h, date, 1).map(photoInfo), write: ['big', 'line', 'place', 'text', 'caption', 'hashtags', 'fb_caption'] });
    } else if (n === 2) {
      const qs = QUOTES();
      const i = quoteIndex(date, qs.length);
      posts.push({ ...base, kind: 'vichar', quote: i, quoteText: qs[i], write: ['caption', 'hashtags'] });
    } else if (n === 3) {
      const t = recentVideoTemple(date, list.filter((x) => !used.includes(x.slug) && (h.temple[x.slug] || '0') < addDays(date, -21)))
        || pickTemple(inCats.length > 1 ? inCats : list, h, date, used, 3) || pickTemple(list, h, date, used, 2);
      used.push(t.slug);
      posts.push({ ...base, kind: 'facts', temple: t.slug, templeName: t.name, category: t.category, photos: pickPhotos(t, h, date, 4).map(photoInfo), write: ['title', 'line', 'facts', 'sources', 'caption', 'hashtags'] });
    } else if (n === 4) {
      // The owner's own Khatu photos win; else the AI picture bank (brand/photo-bank/khatu); live FLUX only if the bank is empty.
      const own = photosFor('khatu-shyam-mandir');
      const bank = !own.length && pickBank(['khatu'], h);
      posts.push({ ...base, kind: 'aarti', temple: 'khatu-shyam-mandir', templeName: 'Khatu Shyam ji Mandir, Sikar',
        ...(own.length ? { photos: pickPhotos({ photos: own }, h, date, 1).map(photoInfo) } : bank ? { bank } : { flux: `${KHATU_SHEESH}, ${AARTI_LIGHT[hash(date) % AARTI_LIGHT.length]}` }),
        write: ['big', 'line', 'question', 'caption', 'hashtags'] });
    }
  }
  return { date, weekday: ['Ravivar', 'Somvar', 'Mangalvar', 'Budhvar', 'Guruvar', 'Shukravar', 'Shanivar'][weekday(date)], festival: fest?.text || null, posts };
}

// ---------------------------------------------------------------- texts: validation and fallbacks

// The BAIT regex of scripts/validate.mjs, plus Meta's engagement-bait kinds (share/tag/comment/react/vote baiting).
const BAIT = /share\s*kar(o|ein|na)?\s*(warna|nahi\s*to)|paisa\s*aayega|dhan\s*varsha\s*hogi|guaranteed|100\s*%|bad\s*luck|ignore\s*mat|type\s*karo\s*jai|miracle|chamatkar\s*pakka/i;
const BAIT2 = /\b(share|forward|tag|like|subscribe)\s*(kar|karo|karein|karen|kijiye|kare|zaroor)\b|\b(comment|type|likh(o|ein|iye)?)\s*(mein|me|karke|kar)?\s*['"“]?(yes|haan|jai|om|ram|shyam|amen)\b|(शेयर|फॉरवर्ड|टैग|लाइक)\s*(करें|करो|कीजिए|जरूर)|\bwarna\b|वरना|nahi\s*to\s*(bura|nuksaan|paap)|\bamen\b/i;
const AI_FALSE = /asli\s*darshan|live\s*darshan|real\s*photo|taaza\s*tasveer|aaj\s*ki\s*(asli\s*)?(photo|tasveer)|असली\s*दर्शन|लाइव\s*दर्शन|लाइव/i;
const DEV = /[\u0900-\u097F]/;
const HOST = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return null; } };

export function checkPost(p, entry) {
  const e = [];
  const need = (ok, msg) => { if (!ok) e.push(msg); };
  const s = (k) => String(p?.[k] ?? '');
  need(p && typeof p === 'object', 'missing');
  if (!e.length) {
    const cap = s('caption');
    need(cap.length >= 80 && cap.length <= 1200, `caption: 80-1200 characters (${cap.length})`);
    need(DEV.test(cap), 'caption: needs one Devanagari line');
    need(/\?\s*$/.test(cap.trim().split('\n').filter(Boolean).pop() || '') || /\?/.test(cap.slice(-200)), 'caption: end with one genuine question');
    need(!/https?:\/\//.test(cap), 'caption: no URLs (the script adds links and credits)');
    const tags = Array.isArray(p.hashtags) ? p.hashtags : [];
    need(tags.length >= 5 && tags.length <= 10, `hashtags: 5-10 (${tags.length})`);
    need(tags.every((t) => /^#[\p{L}\p{N}_]+$/u.test(t)), 'hashtags: each one word starting with #');
    need(tags.some((t) => /^#(JaiShreeShyam|KhatuShyam)$/i.test(t)), 'hashtags: include #JaiShreeShyam or #KhatuShyam');
    const all = JSON.stringify(p);
    need(!BAIT.test(all) && !BAIT2.test(all), 'remove engagement bait (share/tag/like/comment-YES/type requests, threats, money/miracle promises)');
    need(!/(sati)/i.test(entry.temple || '') || !/(mela|yatra|juloos|procession|amavasya)|मेला|यात्रा|अमावस्या/i.test(all), 'sati temple: no mela/yatra/procession');
    if (entry.flux) need(!AI_FALSE.test(all), 'AI picture: never call it asli/live darshan or a real photo');
    if (/khatu/.test(entry.temple || '') || entry.festival?.key === 'janmotsav') need(!/\b(flute|bansuri|murli)\b|बांसुरी|बाँसुरी|मुरली/i.test(all), 'Khatu Shyam ji is the sheesh only: no flute');
    const max = { big: 16, line: 32, place: 36, text: 72, question: 72, title: 26 };
    for (const k of entry.write.filter((x) => max[x])) need(s(k).trim().length > 0 && [...s(k)].length <= max[k], `${k}: 1-${max[k]} characters`);
    for (const k of ['big', 'place', 'text', 'question', 'title'].filter((x) => entry.write.includes(x))) need(DEV.test(s(k)), `${k}: Devanagari`);
    if (entry.kind === 'facts') {
      const f = Array.isArray(p.facts) ? p.facts : [];
      need(f.length === 3, 'facts: exactly 3');
      f.forEach((x, i) => {
        need(DEV.test(x?.dev || '') && [...String(x?.dev || '')].length <= 115, `facts[${i}].dev: Devanagari, max 115`);
        need(String(x?.roman || '').length > 10 && String(x?.roman || '').length <= 135, `facts[${i}].roman: max 135`);
      });
      const hosts = new Set((p.sources || []).map(HOST).filter(Boolean));
      need(hosts.size >= 2, 'sources: at least 2 URLs on different sites');
      need([...hosts].some((x) => !/wikipedia\.org$/.test(x)), 'sources: not only Wikipedia');
      need(!/\b(timing|ticket|price|fees?|₹|rs\.?\s*\d)/i.test(JSON.stringify(f)), 'facts: no timings or prices');
    }
  }
  return e;
}

/** Post 1 also goes to Facebook (06:30 IST): its `fb_caption` follows the Facebook template (scripts/fb.mjs). Checked on
 *  its own, so a weak Facebook text never replaces the Instagram texts (build composes a Facebook text instead). */
export function checkFbPost(p, entry) {
  if (!entry.fbAt) return [];
  if (!p?.fb_caption) return ['fb_caption: missing (the Facebook text of this post; PHOTOS.md "Facebook caption")'];
  return checkFbCaption(p.fb_caption, { draft: true }).map((m) => `fb_caption: ${m}`);
}

const AARTI_Q = [
  ['Aapke ghar mein aaj kaunsi aarti hui?', 'आपके घर में आज कौन सी आरती हुई?'],
  ['Aap Khatu Dham kab gaye the?', 'आप खाटू धाम कब गए थे?'],
  ['Baba Shyam ka kaunsa bhajan aapko sabse priya hai?', 'बाबा श्याम का कौन सा भजन आपको सबसे प्रिय है?'],
  ['Aapki pehli Khatu yatra kab hui thi?', 'आपकी पहली खाटू यात्रा कब हुई थी?'],
  ['Aap sandhya aarti mein kaunsa diya jalate hain, ghee ka ya tel ka?', 'आप संध्या आरती में कौन सा दीया जलाते हैं?'],
  ['Aapke shehar mein Shyam ji ka mandir kahan hai?', 'आपके शहर में श्याम जी का मंदिर कहाँ है?'],
];
const BLESS = ['आपका दिन मंगलमय हो', 'प्रभु की कृपा आप पर सदा बनी रहे', 'हर काम में प्रभु का आशीर्वाद मिले', 'आपके घर सुख-शांति बनी रहे'];
const BASE_TAGS = ['#JaiShreeShyam', '#KhatuShyam', '#ShyamBaba'];
const uniq = (a) => [...new Set(a)];

/** Deterministic texts when Claude's are missing or fail the checks (never facts: the carousel becomes photos only). */
export function fallback(entry, date) {
  const i = hash(date);
  const short = (entry.templeName || '').split(',')[0];
  const catTags = CAT_TAGS[entry.category || 'other'] || [];
  if (entry.kind === 'festival') {
    const f = entry.festival;
    return { big: f.big, line: f.line, place: '', text: f.blessing, hashtags: uniq([...BASE_TAGS, ...f.tags, '#Festival']).slice(0, 8),
      caption: `${f.name.split(/[(;]/)[0].trim()} ki aap sabhi ko hardik shubhkamnayein 🙏\n${f.big} ${f.line.replace('🙏', '').trim()}: ${f.blessing}।\nJai Shree Shyam!\n\nAapke ghar mein yeh tyohar kaise manaya jata hai?` };
  }
  if (entry.kind === 'darshan') {
    const b = BLESS[i % BLESS.length];
    return { big: 'सुप्रभात', line: 'जय श्री श्याम 🙏', place: short, text: b, hashtags: uniq([...BASE_TAGS, ...catTags, camelTag(short), '#MandirDarshan', '#Suprabhat']).slice(0, 9),
      caption: `Suprabhat 🙏 Jai Shree Shyam\nAaj subah ke darshan: ${entry.templeName}.\nसुप्रभात! ${b}।\n\nKya aap kabhi ${short} gaye hain?` };
  }
  if (entry.kind === 'vichar') {
    const q = entry.quoteText;
    return { hashtags: uniq([...BASE_TAGS, '#AajKaVichar', '#SuvicharInHindi', '#Bhakti', '#SanatanDharma']).slice(0, 8),
      caption: `Aaj ka vichar 🙏\n\n${q.dev}\n— ${q.source}\n\n${q.meaning}\n\nIs vichar ki kaunsi baat aaj aapke din se judti hai?` };
  }
  if (entry.kind === 'facts') {
    return { title: '', line: '', photosOnly: true, hashtags: uniq([...BASE_TAGS, ...catTags, camelTag(short), '#MandirDarshan', '#IncredibleIndia']).slice(0, 9),
      caption: `${entry.templeName} ke darshan 🙏\nदर्शन कीजिए: ${short}.\nSwipe karke dekhiye mandir ki aur tasveerein.\n\nKya aap ${short} gaye hain? Aapka anubhav kaisa raha?` };
  }
  const [qr, qd] = AARTI_Q[i % AARTI_Q.length];
  return { big: 'शुभ संध्या', line: 'संध्या आरती 🪔 जय श्री श्याम', question: qd, hashtags: uniq([...BASE_TAGS, '#KhatuShyamJi', '#SandhyaAarti', '#HaareKaSahara', '#KhatuDham']).slice(0, 8),
    caption: `Shubh sandhya 🪔 Jai Shree Shyam\nBaba Shyam ki sandhya aarti ke darshan kijiye.\nहारे का सहारा, बाबा श्याम हमारा।\n\n${qr}\n${qd}` };
}

// ---------------------------------------------------------------- build (texts + cards)

const workDir = (date) => path.join(WORK, date);
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

function textsFor(date, p) {
  const file = path.join(workDir(date), 'posts.json');
  let claude = {};
  try { claude = readJson(file).posts || {}; } catch { /* no Claude texts: fallbacks */ }
  return p.posts.map((entry) => {
    const mine = claude[String(entry.n)];
    const errors = mine ? checkPost(mine, entry) : ['not written'];
    return { entry, text: errors.length ? fallback(entry, date) : mine, source: errors.length ? 'fallback' : 'claude', errors };
  });
}

async function flux(prompt, file) {
  if (!env.MEDIA_TOKEN) throw new Error('no MEDIA_TOKEN');
  const r = await fetch(`${env.MEDIA_URL}/ai/flux`, {
    method: 'POST', headers: { Authorization: `Bearer ${env.MEDIA_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: `${prompt}. ${STYLE}`, steps: 8 }), signal: AbortSignal.timeout(120e3),
  });
  const j = await r.json().catch(() => ({}));
  if (!j.success || !j.result?.image) throw new Error(`FLUX ${r.status}: ${JSON.stringify(j.errors || j).slice(0, 160)}`);
  fs.writeFileSync(file, Buffer.from(j.result.image, 'base64'));
}

/** Cards for every planned post -> out/<n>-<i>.jpg; writes out/posts.json (what publish posts). */
export async function build(date, { noFlux = false, log = console.log } = {}) {
  const p = readJson(path.join(workDir(date), 'plan.json'));
  const out = path.join(workDir(date), 'out');
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const abs = (f) => path.join(ROOT, f);
  const result = [];
  let neurons = 0;
  for (const { entry, text, source, errors } of textsFor(date, p)) {
    if (errors.length && source === 'fallback') log(`post ${entry.n}: fallback texts (${errors.slice(0, 4).join('; ')})`);
    let image = null; let ai = false; let photos = entry.photos || [];
    let greetingOnly = false;
    if (entry.bank && fs.existsSync(abs(entry.bank))) { image = abs(entry.bank); ai = true; }
    else if (entry.flux) {
      const f = path.join(out, `flux-${entry.n}.jpg`);
      // Made earlier in this run by animate/frames.mjs (photos.yml "AI pictures" step: Workers AI, else Kaggle FLUX).
      const pre = path.join(workDir(date), `kaggle-${entry.n}.jpg`);
      if (fs.existsSync(pre)) { fs.copyFileSync(pre, f); image = f; ai = true; } else try {
        if (noFlux) throw new Error('--no-flux');
        await flux(entry.flux, f); neurons += 170; image = f; ai = true;
      } catch (e) {
        log(`post ${entry.n}: FLUX failed (${redact(e.message)})`);
        if (entry.kind === 'festival') greetingOnly = true; // the greeting card needs no picture
      }
    }
    if ((entry.bank || entry.flux) && !image && !greetingOnly) {
      {
        // No AI picture: a real temple photo, and texts that name that temple (never "Khatu darshan" over another temple).
        log(`post ${entry.n}: using a real temple photo instead`);
        const tp = pickTemple(photoTemples(), history(date), `${date}-${entry.n}`, [], 1);
        photos = pickPhotos(tp, history(date), date, 1).map(photoInfo);
        const short = tp.name.split(',')[0];
        entry.temple = tp.slug; entry.templeName = tp.name;
        if (entry.kind === 'aarti') {
          const fb = fallback(entry, date);
          Object.assign(text, { ...fb, line: 'जय श्री श्याम 🪔', place: short, caption: `Shubh sandhya 🪔 Jai Shree Shyam\nAaj sandhya ke darshan: ${tp.name}.\n${fb.caption.split('\n').slice(-2).join('\n')}` });
        } else Object.assign(text, { place: short });
      }
    }
    const ph = photos.map((x) => ({ ...x, abs: abs(x.file) }));
    const cards = [];
    const t = text;
    if (entry.kind === 'vichar') {
      const q = entry.quoteText;
      cards.push({ kind: 'vichar', big: 'आज का विचार', quote: q.dev, source: q.source, meaning: q.meaning });
    } else if (entry.kind === 'facts' && !t.photosOnly) {
      cards.push({ kind: 'fact-cover', image: ph[0].abs, credit: ph[0].credit, big: t.title, line: t.line, kicker: 'मंदिर दर्शन' });
      t.facts.forEach((f, i) => { const x = ph[(i + 1) % ph.length]; cards.push({ kind: 'fact', image: x.abs, credit: x.credit, title: t.title, n: String(i + 1), dev: f.dev, roman: f.roman }); });
    } else if (entry.kind === 'facts') {
      ph.forEach((x, i) => cards.push(i === 0 ? { kind: 'fact-cover', image: x.abs, credit: x.credit, big: (entry.templeName || '').split(',')[0], line: 'मंदिर दर्शन 🙏', kicker: 'दर्शन' } : { kind: 'darshan', image: x.abs, credit: x.credit, big: '', line: '' }));
    } else if (greetingOnly) {
      cards.push({ kind: 'greeting', big: t.big, line: t.line, text: t.text || t.place });
    } else {
      const img = image || ph[0]?.abs;
      cards.push({ kind: entry.kind, image: img, ai, size: ai ? imageSize(img) : null, credit: ai ? '' : ph[0]?.credit, big: t.big, line: t.line, place: t.place, text: t.text, question: t.question });
    }
    const files = cards.map((c, i) => path.join(out, `${entry.n}-${i + 1}.jpg`));
    let rendered = await renderCards(cards.map((c, i) => ({ html: cardHtml(c), file: files[i] })));
    if (rendered.some((r) => r.overflow) && source === 'claude' && entry.kind !== 'facts') {
      log(`post ${entry.n}: text overflows the card; fallback texts`);
      const fb = fallback(entry, date);
      Object.assign(cards[0], { big: fb.big, line: fb.line, place: fb.place, text: fb.text, question: fb.question });
      Object.assign(t, fb);
      rendered = await renderCards(cards.map((c, i) => ({ html: cardHtml(c), file: files[i] })));
    }
    if (rendered.some((r) => r.overflow)) log(`::warning::post ${entry.n}: text still overflows on ${rendered.filter((r) => r.overflow).length} card(s)`);
    const fbOk = source === 'claude' && t.fb_caption && !checkFbPost(t, entry).length;
    const fbInfo = entry.fbAt ? { kind: entry.kind, date, temple: entry.temple || null, templeName: entry.templeName || '', festival: entry.festival ? { key: entry.festival.key, big: t.big || entry.festival.big, line: t.line || entry.festival.line, blessing: entry.festival.blessing } : null,
      fbCaption: fbOk ? t.fb_caption : null, place: t.place || '', blessing: t.text || '', hashtags: t.hashtags || [] } : null;
    result.push({ n: entry.n, kind: entry.kind, fbAt: entry.fbAt, igAt: entry.igAt, temple: entry.temple || null, quote: entry.quote, ai, greeting: greetingOnly, fbInfo,
      bank: ai && image && entry.bank ? entry.bank : null, photos: ai || greetingOnly ? [] : ph.map((x) => x.file), credits: ai ? [] : uniq(ph.map((x) => `${x.credit}${/BY/.test(x.licence || '') ? ', cropped' : ''}${x.url ? `: ${x.url}` : ''}`)),
      text: { caption: t.caption, hashtags: t.hashtags }, source, festival: entry.festival?.key || null, files: files.map(rel) });
  }
  fs.writeFileSync(path.join(out, 'posts.json'), `${JSON.stringify({ date, neurons, posts: result }, null, 2)}\n`);
  log(`built ${result.length} post(s) for ${date}: ${result.map((r) => `${r.n}:${r.kind}/${r.source}${r.ai ? '/ai' : ''}`).join(' ')}; FLUX ~${neurons} neurons`);
  return { date, neurons, posts: result };
}

// ---------------------------------------------------------------- captions

/** `links`: festival link lines for this post and platform (linkLines in festival-links.mjs). */
export function caption(post, links = []) {
  const parts = [post.text.caption.trim()];
  if (links.length) parts.push(links.join('\n'));
  if (post.ai) parts.push('Chitra AI dwara banaya gaya hai (sanketik).');
  if (post.credits?.length) parts.push(post.credits.map((c) => `📷 ${c}`).join('\n'));
  parts.push(post.text.hashtags.join(' '));
  return parts.join('\n\n').slice(0, 2200);
}

// ---------------------------------------------------------------- Graph API and hosting

const configured = () => Boolean(env.META_PAGE_TOKEN && env.META_PAGE_ID);
async function graph(method, endpoint, params = {}) {
  const body = new URLSearchParams({ ...params, access_token: env.META_PAGE_TOKEN });
  const signal = AbortSignal.timeout(90000);
  const res = await (method === 'GET' ? fetch(`${API}/${endpoint}?${body}`, { signal }) : fetch(`${API}/${endpoint}`, { method, body, signal }))
    .catch((e) => { throw new Error(redact(`${method} /${endpoint}: ${e.message}`)); });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) throw new Error(redact(`${method} /${endpoint}: ${json.error?.message || res.statusText} (code ${json.error?.code ?? res.status})`));
  return json;
}

async function host(file, name) {
  if (!env.MEDIA_TOKEN) throw new Error('no MEDIA_TOKEN for the media Worker');
  const r = await fetch(`${env.MEDIA_URL}/m/${name}`, { method: 'PUT', headers: { Authorization: `Bearer ${env.MEDIA_TOKEN}`, 'Content-Type': 'image/jpeg' }, body: fs.readFileSync(file), signal: AbortSignal.timeout(60e3) });
  if (!r.ok) throw new Error(`upload ${name}: HTTP ${r.status}`);
  return (await r.json()).url;
}

/** Facebook: one photo or a multi-photo post, scheduled for `at` (or now when that is under 12 minutes away). */
async function facebook(urls, message, at) {
  const schedule = at - Date.now() > FB_LEAD ? { published: 'false', scheduled_publish_time: String(Math.floor(at / 1000)) } : {};
  if (urls.length === 1) {
    const r = await graph('POST', `${env.META_PAGE_ID}/photos`, { url: urls[0], message, ...schedule });
    return { id: r.post_id || r.id, ...(schedule.scheduled_publish_time ? { scheduled: new Date(at).toISOString() } : {}) };
  }
  const ids = [];
  for (const url of urls) ids.push((await graph('POST', `${env.META_PAGE_ID}/photos`, { url, published: 'false', ...(schedule.scheduled_publish_time ? { temporary: 'true' } : {}) })).id);
  const media = Object.fromEntries(ids.map((id, i) => [`attached_media[${i}]`, JSON.stringify({ media_fbid: id })]));
  const r = await graph('POST', `${env.META_PAGE_ID}/feed`, { message, ...media, ...schedule });
  return { id: r.id, ...(schedule.scheduled_publish_time ? { scheduled: new Date(at).toISOString() } : {}) };
}

async function igWait(id) {
  const end = Date.now() + 3 * 60e3;
  for (;;) {
    const { status_code: code } = await graph('GET', id, { fields: 'status_code' });
    if (code === 'FINISHED') return;
    if (code === 'ERROR' || code === 'EXPIRED') throw new Error(`container ${code}`);
    if (Date.now() > end) throw new Error('container not ready after 3 minutes');
    await sleep(5000);
  }
}

/** Instagram: one image or a carousel (2-10), published now. */
async function instagram(urls, captionText) {
  if (!env.IG_USER_ID) throw new Error('IG_USER_ID not set');
  let container;
  if (urls.length === 1) container = (await graph('POST', `${env.IG_USER_ID}/media`, { image_url: urls[0], caption: captionText })).id;
  else {
    const children = [];
    for (const url of urls.slice(0, 10)) children.push((await graph('POST', `${env.IG_USER_ID}/media`, { image_url: url, is_carousel_item: 'true' })).id);
    for (const c of children) await igWait(c);
    container = (await graph('POST', `${env.IG_USER_ID}/media`, { media_type: 'CAROUSEL', children: children.join(','), caption: captionText })).id;
  }
  await igWait(container);
  const { id } = await graph('POST', `${env.IG_USER_ID}/media_publish`, { creation_id: container });
  const { permalink } = await graph('GET', id, { fields: 'permalink' }).catch(() => ({}));
  return { id, url: permalink || 'https://www.instagram.com/khatushyampremisn/' };
}

// ---------------------------------------------------------------- publish and flush

function writeState(date, st) {
  fs.mkdirSync(STATE, { recursive: true });
  fs.writeFileSync(statePath(date), `${JSON.stringify(st, null, 2)}\n`);
}

/** Hosts the cards, schedules Facebook and queues Instagram; merges into automation/photos/<date>.json. */
export async function publish(date, { dryRun = false, log = console.log } = {}) {
  const built = readJson(path.join(workDir(date), 'out', 'posts.json'));
  const st = readState(date) || { date, posts: [] };
  for (const post of built.posts) {
    // a dry run shows every post's texts, also of a day already published (to check the Instagram and Facebook texts)
    if (st.posts.some((x) => x.n === post.n) && !dryRun) { log(`post ${post.n}: already published`); continue; }
    const igText = caption(post, await linkLines(date, 'instagram', post));
    // Facebook: post 1 only (fbAt), in the Facebook template; the photo credits and the AI line stay (licence, honesty).
    const fb = post.fbAt && post.fbInfo ? fbPhotoCaption(post.fbInfo, { links: await linkLines(date, 'facebook', post), credits: (post.credits || []).map((c) => `📷 ${c}`), ai: post.ai }) : null;
    const text = fb?.text || null;
    if (dryRun) { log(`[dry-run] post ${post.n} (${post.kind}, ${post.files.length} image(s)) ${text ? `FB ${post.fbAt} [${fb.source}]` : 'FB -'} IG ${post.igAt}\n${igText}\n${text ? `--- Facebook ---\n${text}\n` : ''}`); continue; }
    const rec = { n: post.n, kind: post.kind, temple: post.temple, quote: post.quote, ai: post.ai, bank: post.bank, photos: post.photos, source: post.source, fbAt: post.fbAt, igAt: post.igAt };
    try {
      rec.images = [];
      for (const [i, f] of post.files.entries()) rec.images.push(await host(path.join(ROOT, f), `photo-${date}-${post.n}-${i + 1}.jpg`));
    } catch (e) { log(`::warning::post ${post.n}: hosting failed, not posted (the next run retries): ${redact(e.message)}`); continue; }
    rec.caption = igText; // what Instagram posts (flush reads igCaption || caption)
    if (text) { rec.fbCaption = text; rec.fbSource = fb.source; }
    // (a post built by the old 4-a-day plan has an fbAt but no fbInfo: Instagram only too)
    if (!post.fbAt || !text) rec.fb = { skipped: 'Instagram only (Facebook gets 1 photo a day: post 1, 06:30 IST)' };
    else if (configured()) {
      try { rec.fb = await facebook(rec.images, text, Date.parse(post.fbAt)); } catch (e) { rec.fb = { error: redact(e.message).slice(0, 200) }; log(`::warning::post ${post.n}: Facebook: ${rec.fb.error}`); }
    } else rec.fb = { error: 'META_* not configured' };
    rec.ig = env.IG_USER_ID ? { pending: post.igAt } : { skipped: 'IG_USER_ID not set' };
    st.posts.push(rec);
    log(`post ${post.n} (${post.kind}): fb ${rec.fb.id ? `${rec.fb.id}${rec.fb.scheduled ? ` scheduled ${rec.fb.scheduled}` : ' published'}` : rec.fb.error || rec.fb.skipped} | ig pending ${post.igAt}`);
  }
  if (!dryRun) { st.posts.sort((a, b) => a.n - b.n); st.neurons = (st.neurons || 0) + (built.neurons || 0); writeState(date, st); }
  return st;
}

/** Publishes the most overdue Instagram post that is due (one per run); marks posts over 4 h late as skipped. */
export async function flush({ dryRun = false, now = Date.now(), log = console.log } = {}) {
  if (!configured() || !env.IG_USER_ID) return { status: 'not-configured' };
  const done = [];
  for (const date of [addDays(istDate(now), -1), istDate(now)]) {
    const st = readState(date);
    if (!st) continue;
    let changed = false;
    for (const p of st.posts) {
      if (!p.ig?.pending || !p.images?.length) continue;
      const at = Date.parse(p.ig.pending);
      if (at - now > IG_EARLY) continue;
      if (now - at > IG_LATE) { p.ig = { skipped: `missed ${p.ig.pending} by over 4 h` }; changed = true; continue; }
      if (done.length) continue; // one Instagram post per run: a missed slot catches up on the next trigger
      if (dryRun) { done.push({ date, n: p.n, dryRun: true }); continue; }
      try {
        const r = await instagram(p.images, p.igCaption || p.caption);
        p.ig = { id: r.id, url: r.url, at: new Date().toISOString() };
      } catch (e) {
        p.igAttempts = (p.igAttempts || 0) + 1;
        if (p.igAttempts >= 2) p.ig = { error: redact(e.message).slice(0, 200) };
        log(`::warning::Instagram post ${date} #${p.n}: ${redact(e.message)}`);
      }
      done.push({ date, n: p.n, ig: p.ig });
      changed = true;
    }
    if (changed && !dryRun) writeState(date, st);
  }
  return { status: 'ok', published: done };
}

// ---------------------------------------------------------------- CLI

async function main() {
  const argv = process.argv.slice(2);
  const opt = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
  const flag = (n) => argv.includes(`--${n}`);
  const cmd = argv[0];
  const date = opt('date') || istDate();
  if (cmd === 'due') {
    const d = due();
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `dates=${d.map((x) => `${x.date}:${x.slots.join(',')}`).join(' ')}\n`);
    return d;
  }
  if (cmd === 'plan') {
    const slots = (opt('slots') || '1,2,3,4').split(',').map(Number).filter(Boolean);
    const p = plan(date, slots);
    fs.mkdirSync(workDir(date), { recursive: true });
    fs.writeFileSync(path.join(workDir(date), 'plan.json'), `${JSON.stringify(p, null, 2)}\n`);
    return { date, posts: p.posts.map((x) => `${x.n}:${x.kind}${x.temple ? `:${x.temple}` : ''}${x.flux ? ':flux' : ''}`) };
  }
  if (cmd === 'validate') {
    const p = readJson(path.join(workDir(date), 'plan.json'));
    const file = path.join(workDir(date), 'posts.json');
    if (!fs.existsSync(file)) return { status: 'error', problems: [`${rel(file)} missing`] };
    let posts;
    try { posts = readJson(file).posts || {}; } catch (e) { return { status: 'error', problems: [`posts.json: ${e.message}`] }; }
    const problems = p.posts.flatMap((entry) => (posts[String(entry.n)] ? [...checkPost(posts[String(entry.n)], entry), ...checkFbPost(posts[String(entry.n)], entry)] : ['not written']).map((m) => `post ${entry.n} (${entry.kind}): ${m}`));
    return { status: problems.length ? 'error' : 'ok', problems };
  }
  if (cmd === 'flux-jobs') { // the AI pictures build needs, for animate/frames.mjs --jobs (Workers AI, else Kaggle FLUX)
    const p = readJson(path.join(workDir(date), 'plan.json'));
    const abs = (f) => path.join(ROOT, f);
    const jobs = p.posts.filter((e) => e.flux && !(e.bank && fs.existsSync(abs(e.bank))))
      .map((e) => ({ id: `post${e.n}`, out: path.join(workDir(date), `kaggle-${e.n}.jpg`), prompt: `${e.flux}. ${STYLE}` }));
    fs.writeFileSync(path.join(workDir(date), 'flux-jobs.json'), JSON.stringify(jobs, null, 2));
    return { status: 'ok', jobs: jobs.length, file: rel(path.join(workDir(date), 'flux-jobs.json')) };
  }
  if (cmd === 'build') return build(date, { noFlux: flag('no-flux') });
  if (cmd === 'publish') return publish(date, { dryRun: flag('dry-run') });
  if (cmd === 'flush') return flush({ dryRun: flag('dry-run') });
  if (cmd === 'topup') return topup({ max: Number(opt('max') || 2) });
  throw new Error('Usage: photos.mjs due | plan | validate | build | publish | flush (see the header)');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const r = await main();
    console.log(JSON.stringify(r, null, r?.posts?.[0]?.caption ? 2 : 0));
    if (r?.status === 'error') process.exitCode = 1;
  } catch (e) {
    console.log(JSON.stringify({ status: 'error', error: redact(e.message) }));
    process.exitCode = 1;
  }
}
