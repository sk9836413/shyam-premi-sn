#!/usr/bin/env node
// Viral Radar (owner, 15 Nov 2026): which devotional Shorts are TRULY viral in India this week, why (hook, format,
// deity, cover / art style, length), and ORIGINAL topic ideas for our banks. Workflow: .github/workflows/viral-radar.yml.
//
//   node scripts/viral-radar.mjs due [--mode auto|sweep|daily] [--force]   should a run happen now? (GITHUB_OUTPUT run, mode)
//   node scripts/viral-radar.mjs scan --mode sweep|daily [--date D] [--work .radar-work]
//        YouTube search -> stats -> channel medians -> the viral filter -> automation/viral-radar/<date>.json
//        + .radar-work/pending.json and thumbnails for Claude
//   node scripts/viral-radar.mjs check --work .radar-work                  validate Claude's analysis.json (exit 1 = fix it)
//   node scripts/viral-radar.mjs apply --work .radar-work [--date D]       merge the analysis, add the ideas to the banks
//   node scripts/viral-radar.mjs rescore [--date D]                       re-apply the filter to a day file (no API calls)
//   node scripts/viral-radar.mjs summary [--date D]                       the weekly section of automation/viral-radar.md
//   node scripts/viral-radar.mjs budget                                   print the quota plan
//
// QUOTA (YouTube Data API, one project shared with the uploads: 10,000 units a day; an upload costs ~1,600, so 3 uploads
// + thumbnails + playlists + comments + growth/trends take ~5,500-6,500). search.list costs 100 units, the list calls 1
// unit per 50 ids. The radar's own ceiling is RADAR_CAP = 900 units a day:
//   sweep day (Monday IST, or the first run after a missed Monday): 8 searches = 800 + ~30 list units
//   other days: 2 searches = 200 + ~10 list units        -> ~2,100 units a week, never more than ~830 on one day
// Channel medians are cached 14 days in automation/viral-radar/channels.json (2 units per new channel).
//
// "TRULY viral" (filter): views >= 100k (or >= 30k within 3 days of upload) AND views >= 5 x the median views of that
// channel's other recent Shorts (at least 3 of them). That drops one-off lottery hits of big channels and reuploads.
// Off topic (not counted): a vlog / fun / kids / shop channel name, or under half of the channel's titles devotional.
// Likely reuploads (no watermark detection): a tiny channel (< 1,000 subscribers or views > 200 x subscribers), a new
// channel (< 60 days), random topics (under half of its recent titles devotional), spammy titles; two signals = skipped.
// Channels whose median is itself >= 40k are "consistently strong" (listed apart: style to learn from, not outliers).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { addIdeas, BANKS, ideaProblems } from './topic-banks.mjs';

export const OUT_DIR = 'automation/viral-radar';
export const SUMMARY = 'automation/viral-radar.md';
export const CHANNELS = `${OUT_DIR}/channels.json`;
export const THRESH = { views: 100000, fastViews: 30000, fastDays: 3, multiple: 5, minShorts: 3, strongMedian: 40000, maxSeconds: 180 };
export const UNITS = { search: 100, list: 1 };
export const RADAR_CAP = 900;
export const SEARCHES = { sweep: 8, daily: 2 };
export const CHANNEL_TTL_DAYS = 14;
export const MAX_NEW_CHANNELS = 25; // channel medians fetched per run at most (2 units each)

// Rotating base queries (owner list). `|` is the YouTube search OR.
export const QUERIES = ['खाटू श्याम', 'महादेव', 'हनुमान', 'श्री कृष्ण', 'राधा कृष्ण', 'श्री राम', 'माता रानी|दुर्गा', 'पौराणिक कथा',
  'रहस्य मंदिर', 'गरुड़ पुराण', 'महाभारत', 'रामायण'];

const DAY = 864e5;
const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } };
const readJson = (f, d) => { try { return JSON.parse(read(f)); } catch { return d; } };
export const istToday = (now = Date.now()) => new Date(now + 5.5 * 3600e3).toISOString().slice(0, 10);
const addDays = (d, n) => new Date(Date.parse(`${d}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const weekday = (d) => new Date(`${d}T12:00:00Z`).getUTCDay();
const dayNo = (d) => Math.floor(Date.parse(`${d}T12:00:00Z`) / DAY);
export const seconds = (iso = '') => { const m = iso.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/) || []; return (+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0); };
export const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const h = s.length >> 1; return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };

// ---------------------------------------------------------------- queries and quota

/** Festival queries: the next 10 days' status / big festivals of automation/festivals.json (Hindi names). */
export function festivalQueries(date, festivals = []) {
  return festivals.filter((f) => f.date >= date && f.date <= addDays(date, 10) && ['big', 'status'].includes(f.tier))
    .sort((a, b) => a.date.localeCompare(b.date)).map((f) => f.names?.[0]?.hi || f.label).filter(Boolean).slice(0, 2);
}

/** The searches of a run: sweep = festival queries + base queries up to 8; daily = 2 base queries, rotating so the
 *  6 daily runs of a week cover the whole base list. */
export function queriesFor(date, mode, festivals = []) {
  const n = SEARCHES[mode] || SEARCHES.daily;
  const fest = mode === 'sweep' ? festivalQueries(date, festivals) : [];
  const start = mode === 'sweep' ? (Math.floor(dayNo(date) / 7) * 5) % QUERIES.length : (dayNo(date) * 2) % QUERIES.length;
  const base = [];
  for (let i = 0; base.length < n - fest.length && i < QUERIES.length; i++) {
    const q = QUERIES[(start + i) % QUERIES.length];
    if (!fest.includes(q)) base.push(q);
  }
  // Khatu Shyam ji is the channel's own deity: every sweep searches it
  if (mode === 'sweep' && !base.includes(QUERIES[0])) base[base.length - 1] = QUERIES[0];
  return [...fest, ...base];
}

/** Estimated units: searches x 100 + videos.list / channels.list per 50 ids + 2 per channel median (playlistItems + videos). */
export function quotaUnits({ searches = 0, videoIds = 0, channels = 0, medianChannels = 0 } = {}) {
  return searches * UNITS.search + Math.ceil(videoIds / 50) * UNITS.list + Math.ceil(channels / 50) * UNITS.list + medianChannels * 2 * UNITS.list;
}
/** How many new channel medians still fit under the cap after the searches and lists. */
export function medianBudget(spent, cap = RADAR_CAP) { return Math.max(0, Math.floor((cap - spent) / 2)); }
export function weeklyPlan() {
  const sweep = quotaUnits({ searches: SEARCHES.sweep, videoIds: 400, channels: 300, medianChannels: 12 });
  const daily = quotaUnits({ searches: SEARCHES.daily, videoIds: 100, channels: 80, medianChannels: 4 });
  return { sweep, daily, week: sweep + 6 * daily, cap: RADAR_CAP };
}

/** Sweep or daily? Monday (IST) sweeps; a missed sweep is made up by the next run (no sweep file in the last 6 days). */
export function modeFor(date, files = []) {
  const sweptRecently = files.some((f) => f.mode === 'sweep' && f.date > addDays(date, -7) && f.date <= date);
  return weekday(date) === 1 || !sweptRecently ? 'sweep' : 'daily';
}

// ---------------------------------------------------------------- the viral filter

/** { viral, abs, multiple, why } for one Short. median = of the channel's OTHER recent Shorts (n of them). */
export function viralCheck({ views = 0, ageDays = 99 }, med, n = 0, t = THRESH) {
  const abs = views >= t.views || (ageDays <= t.fastDays && views >= t.fastViews);
  const multiple = med != null && med > 0 ? views / med : med === 0 ? Infinity : null;
  const why = [];
  if (!abs) why.push(`views ${views} < ${t.views} (or < ${t.fastViews} within ${t.fastDays} days)`);
  if (n < t.minShorts) why.push(`only ${n} other Shorts on the channel (needs ${t.minShorts} for a median)`);
  else if (!(multiple >= t.multiple)) why.push(`${multiple == null ? '?' : multiple.toFixed(1)}x the channel median (needs ${t.multiple}x)`);
  return { viral: abs && n >= t.minShorts && multiple >= t.multiple, abs, multiple, why };
}

const DEVOTIONAL = /श्याम|खाटू|बाबा|महादेव|शिव|भोले|शंकर|हनुमान|बालाजी|बजरंग|राम|सीता|कृष्ण|कान्हा|राधा|गोविंद|माता|माँ|मां|दुर्गा|देवी|काली|लक्ष्मी|गणेश|गणपति|भगवान|प्रभु|भक्त|भजन|आरती|मंदिर|कथा|पुराण|महाभारत|रामायण|गीता|मंत्र|जय|हरि|विष्णु|नारायण|शनि|सनातन|धर्म|पूजा|व्रत|तीर्थ|गुरु|संत|\b(shyam|khatu|baba|mahadev|shiv|shiva|bhole|hanuman|balaji|bajrang|ram|krishna|kanha|radha|mata|durga|devi|kali|ganesh|ganpati|bhagwan|bhakti|bhajan|aarti|mandir|temple|katha|purana|mahabharat|ramayan|gita|mantra|jai|hari|vishnu|narayan|shani|sanatan|dharma|puja|vrat|guru|sant|god|lord|mythology|hindu)\b/i;
// A channel named like a vlog / fun / kids / shop channel is not our kind even when one devotional clip took off.
const OFF_TOPIC_CHANNEL = /vlogs?\b|\bblog\b|funny|\bfun\b|comedy|\bkids?\b|prank|gaming|meme|selling|explore with|family/i;
const SPAM = /#viral|#trending|#fyp|#foryou|credit|copyright|re-?upload|full video|#reels|#explore/i;

/** Share of devotional titles among a channel's recent uploads (the cache keeps only this, not the titles). */
export const devotionalShare = (titles = []) => ({ n: titles.length, share: titles.length ? Math.round((titles.filter((t) => DEVOTIONAL.test(t)).length / titles.length) * 100) / 100 : 0 });

/** Reupload / not-our-kind signals (titles of the channel's recent uploads in `ch.titles`). */
export function reuploadSignals(v, ch = {}, now = Date.now()) {
  const s = [];
  if (ch.hiddenSubs || (ch.subs ?? 0) < 1000) s.push('tiny channel');
  else if (v.views > 200 * ch.subs) s.push('views far beyond subscribers');
  if (ch.created && (now - Date.parse(ch.created)) / DAY < 60) s.push('new channel');
  const share = ch.titles ? devotionalShare(ch.titles) : ch.dev_share;
  if (share && share.n >= 5 && share.share < 0.5) s.push('random topics');
  if (SPAM.test(v.title || '')) s.push('spammy title');
  if (OFF_TOPIC_CHANNEL.test(v.channel || ch.title || '')) s.push('non-devotional channel');
  // likely reupload: two signals; off topic (not a devotional channel): random topics or a vlog/fun/kids channel name
  return { signals: s, likely: s.length >= 2, offTopic: s.includes('random topics') || s.includes('non-devotional channel') };
}

// ---------------------------------------------------------------- heuristic classifier (Claude refines it)

export const HOOKS = ['strange-visual', 'varjit', 'kyon', 'jab', 'phir-jo-kiya', 'listicle', 'kaliyug', 'chamatkar', 'modern-question', 'pov', 'series', 'rahasya', 'emotional', 'question', 'name'];
export const HOOK_LABEL = { 'strange-visual': 'strange visual ("X क्या कर रहे हैं? 😱")', varjit: 'वर्जित क्यों / pooja niyam', kyon: '😱 क्यों?', jab: 'जब…', 'phir-jo-kiya': 'फिर … ने जो किया…', listicle: 'listicle', kaliyug: 'Kaliyug connection',
  chamatkar: 'संत / लोक देवता चमत्कार', 'modern-question': 'modern question', pov: 'POV question', series: 'series EP / Part', rahasya: 'रहस्य / secret', emotional: 'emotional-motivational line', question: 'other question', name: 'name / plain' };
export const FORMATS = ['facts', 'kailash', 'krishna-pov', 'veer', 'loop', 'darshan', 'gita', 'series', 'katha', 'other'];
export const ART = ['cinematic', 'illustrated', 'infographic-2d', 'cartoon-3d', 'real-photo', 'murti-darshan', 'text-card', 'other'];
export const DEITIES = ['khatu', 'shiv', 'hanuman', 'krishna', 'ram', 'devi', 'ganesh', 'vishnu', 'shani', 'surya', 'lokdevta', 'mahabharat', 'other'];

const HOOK_RE = [
  ['strange-visual', /क्या कर रह[ेी] (हैं|है|थे|थी)|what (are|is|were) .{2,40} doing|kya kar rah[ei]/i],
  ['varjit', /वर्जित|नहीं चढ़|नहीं चढा|क्यों नहीं|मना है|नियम|गलती से भी|भूलकर भी|varjit|niyam|never offer|kyun nahi|kyon nahi/i],
  ['kaliyug', /कलियुग|कलयुग|kali ?yug|kalyug|कल्कि|kalki/i],
  ['chamatkar', /चमत्कार|chamatkar|miracle|गोरखनाथ|gorakh|गोगा|goga|रामदेव|ramdev|तेजाजी|tejaji|पाबूजी|pabuji|करणी|karni|जीण|jeen mata|सालासर|salasar/i],
  ['series', /\b(ep|episode|part)\s?-?\d+|पार्ट\s?\d+|भाग\s?\d+|एपिसोड\s?\d+/i],
  ['phir-jo-kiya', /फिर .{0,40}(ने )?जो (किया|कहा|बताया|हुआ)|phir .{0,40}jo (kiya|kaha|hua)/i],
  ['jab', /^[^\p{L}]*(जब|jab|when)(?![\p{L}\p{M}])|\sजब\s/iu],
  ['listicle', /^\W*\d+\s|\b(top|\d+)\s+(warriors|facts|things|secrets|names)|(\d+|दो|तीन|चार|पाँच|पांच|सात|दस)\s+(योद्धा|रहस्य|बातें|नाम|अवतार|मंदिर|गलतियाँ|चीज़ें|चीजें)/i],
  ['modern-question', /nuclear|परमाणु|science|विज्ञान|scientist|वैज्ञानिक|nasa|alien|एलियन|technology|टेक्नोलॉजी/i],
  ['pov', /\bpov\b|कृष्ण कहते|krishna kehte|krishna says|अगर .{0,30}(होते|मिल जाएँ|मिले)|तुम्हें पता है/i],
  ['kyon', /क्यों|क्यूँ|kyon|kyun|\bwhy\b/i],
  ['rahasya', /रहस्य|राज़|राज |rahasya|secret|mystery|मिस्ट्री/i],
  ['emotional', /हिम्मत|भरोसा|हार मत|हारे|आँसू|रो पड़|माँ-बाप|never give up|motivat|विश्वास रख|सब ठीक/i],
  ['question', /\?|कौन|कैसे|kaise|kaun|kya /i],
];
const FORMAT_RE = [
  ['series', /\b(ep|episode|part)\s?-?\d+|पार्ट\s?\d+|भाग\s?\d+/i],
  ['kailash', /(पार्वती|parvati).{0,60}(महादेव|शिव|mahadev|gane)|(महादेव|mahadev).{0,60}(पार्वती|parvati)|kailash parivar|कैलाश परिवार/i],
  ['krishna-pov', /\bpov\b|कृष्ण कहते|krishna kehte|krishna says|krishna vani|कृष्ण वाणी/i],
  ['gita', /गीता|\bgita\b|श्लोक|shloka/i],
  ['loop', /भजन|bhajan|song|lyrics|गीत|🎵|🎶/i],
  ['darshan', /दर्शन|darshan|आरती|aarti|\blive\b|श्रृंगार|shringar/i],
  ['veer', /^\W*(जय|jai|हर हर|har har|बजरंगबली|बोलो)\b/i],
  ['facts', /#facts|facts|रहस्य|rahasya|क्यों|kyon|kyun|why|\?/i],
  ['katha', /कथा|katha|story|कहानी|kahani/i],
];
const DEITY_RE = [
  ['khatu', /खाटू|khatu|श्याम बाबा|shyam baba|बर्बरीक|barbarik|हारे का सहारा|शीश के दानी/i],
  ['lokdevta', /गोरखनाथ|gorakh|गोगा|goga|रामदेव|ramdev|तेजाजी|tejaji|पाबूजी|pabuji|जीण|करणी माता|karni mata/i],
  ['hanuman', /हनुमान|hanuman|बालाजी|balaji|बजरंग|bajrang|सालासर|salasar/i],
  ['shiv', /महादेव|mahadev|शिव|shiv|भोले|bhole|शंकर|shankar|महाकाल|mahakal|कैलाश|kailash|पार्वती|parvati/i],
  ['ganesh', /गणेश|ganesh|गणपति|ganpati/i],
  ['ram', /श्री राम|shri ram|\bram\b|रामायण|ramayan|सीता|sita|रावण|ravan|लक्ष्मण/i],
  ['krishna', /कृष्ण|krishna|कान्हा|kanha|राधा|radha|गोविंद|govind|सुदामा|sudama|द्वारका|वृंदावन|vrindavan/i],
  ['mahabharat', /महाभारत|mahabharat|अर्जुन|arjun|कर्ण|karna|भीष्म|bhishma|दुर्योधन|duryodhan|अश्वत्थामा|ashwatthama/i],
  ['devi', /माता|mata|दुर्गा|durga|देवी|devi|काली|kali maa|लक्ष्मी|lakshmi|माँ |वैष्णो/i],
  ['vishnu', /विष्णु|vishnu|नारायण|narayan|गरुड़|garud|यम|yam|अवतार|avatar|कल्कि|kalki/i],
  ['shani', /शनि|shani/i],
  ['surya', /सूर्य|surya|छठ|chhath/i],
];
export const lengthBucket = (s) => (s <= 30 ? '<=30 s' : s <= 60 ? '31-60 s' : s <= 120 ? '61-120 s' : '121-180 s');

/** Title (+ length) -> { hooks, hook, format, deity, length } by rules; Claude adds topic / cover / art / a better read. */
export function classify(title = '', secs = 0) {
  const t = String(title);
  const hooks = HOOK_RE.filter(([, re]) => re.test(t)).map(([k]) => k);
  return {
    hooks: hooks.length ? hooks : ['name'],
    hook: hooks[0] || 'name',
    format: FORMAT_RE.find(([, re]) => re.test(t))?.[0] || 'other',
    deity: DEITY_RE.find(([, re]) => re.test(t))?.[0] || 'other',
    length: lengthBucket(secs),
  };
}

// ---------------------------------------------------------------- YouTube

const KEYS = ['YT_CLIENT_ID', 'YT_CLIENT_SECRET', 'YT_REFRESH_TOKEN'];
function loadEnv() {
  const file = Object.fromEntries(read(path.join(os.homedir(), '.shyampremisk', 'youtube.env')).split(/\r?\n/)
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]));
  const env = { ...file, ...Object.fromEntries(KEYS.filter((k) => process.env[k]).map((k) => [k, process.env[k]])) };
  if (KEYS.every((k) => process.env[`SHYAM_${k}`])) KEYS.forEach((k) => { env[k] = process.env[`SHYAM_${k}`]; });
  return env;
}
async function token() {
  const env = loadEnv();
  if (!KEYS.every((k) => env[k])) throw new Error('no YouTube credentials (YT_* secrets or ~/.shyampremisk/youtube.env)');
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', signal: AbortSignal.timeout(20000),
    body: new URLSearchParams({ client_id: env.YT_CLIENT_ID, client_secret: env.YT_CLIENT_SECRET, refresh_token: env.YT_REFRESH_TOKEN, grant_type: 'refresh_token' }) }).then((x) => x.json());
  if (!r.access_token) throw new Error(`token refresh failed (${r.error || 'no token'})`);
  return r.access_token;
}
function client(tok) {
  const used = { units: 0, search: 0, list: 0 };
  const get = async (endpoint, params, cost) => {
    const url = `https://www.googleapis.com/youtube/v3/${endpoint}?${new URLSearchParams(params)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${tok}` }, signal: AbortSignal.timeout(25000) });
    used.units += cost; used[endpoint === 'search' ? 'search' : 'list']++;
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.error) throw new Error(`${endpoint}: ${body.error?.message || res.statusText} (HTTP ${res.status})`);
    return body;
  };
  return { used, get };
}
async function videosById(yt, ids) {
  const out = [];
  for (let i = 0; i < ids.length; i += 50) {
    const r = await yt.get('videos', { part: 'snippet,statistics,contentDetails', id: ids.slice(i, i + 50).join(','), maxResults: 50 }, UNITS.list);
    out.push(...(r.items || []));
  }
  return out;
}

/** Consistently strong channels: median >= 40k, no reupload / off-topic signal, one (the best) Short per channel. */
export function strongOf(rows) {
  const seen = new Set();
  return rows.filter((r) => !r.viral && r.strong_channel && !(r.reupload || []).length).sort((a, b) => b.views - a.views)
    .filter((r) => !seen.has(r.channelId) && seen.add(r.channelId)).slice(0, 10);
}

/** Claude saw a TV-serial / film still or another channel's watermark on the cover: a likely reupload. */
const SUSPECT = 'TV / film still or watermark (thumbnail)';
function markSuspect(it) {
  if (it.analysis?.reupload_suspect !== true) return;
  it.reupload = [...new Set([...(it.reupload || []), SUSPECT])];
  it.likely_reupload = true;
  it.viral = false;
}
function moveSuspects(day) {
  const out = [...(day.viral || []), ...(day.strong || [])].filter((r) => r.likely_reupload);
  day.viral = (day.viral || []).filter((r) => !r.likely_reupload);
  day.strong = (day.strong || []).filter((r) => !r.likely_reupload);
  const have = new Set((day.reuploads || []).map((x) => x.id));
  day.reuploads = [...(day.reuploads || []), ...out.filter((r) => !have.has(r.id)).map(({ id, url, title, channel, views, reupload }) => ({ id, url, title, channel, views, signals: reupload }))];
  day.counts = { ...day.counts, viral: day.viral.length, strong: day.strong.length };
}

/** Re-apply the current signals to a day file (no API calls; e.g. after a filter change). */
export function rescoreDay(day, cache = {}, now = Date.now()) {
  const rows = [...(day.viral || []), ...(day.strong || [])];
  const out = [];
  for (const r of rows) {
    const re = reuploadSignals(r, { ...(cache[r.channelId] || {}), subs: r.subs, title: r.channel }, now);
    const check = viralCheck(r, r.median, r.n_shorts);
    const row = { ...r, reupload: re.signals, likely_reupload: re.likely, off_topic: re.offTopic, viral: check.viral && !re.likely && !re.offTopic, heuristic: classify(r.title, r.seconds) };
    markSuspect(row);
    out.push(row);
  }
  const viral = out.filter((r) => r.viral).sort((a, b) => b.multiple - a.multiple || b.views - a.views);
  const strong = strongOf(out);
  const dropped = out.filter((r) => !r.viral && !strong.includes(r));
  return { ...day, viral, strong, reuploads: [...(day.reuploads || []), ...dropped.filter((r) => r.likely_reupload || r.off_topic && !(day.reuploads || []).some((x) => x.id === r.id))
    .map(({ id, url, title, channel, views, reupload }) => ({ id, url, title, channel, views, signals: reupload }))],
  counts: { ...day.counts, viral: viral.length, strong: strong.length } };
}

// ---------------------------------------------------------------- scan

export function radarFiles(root = '.') {
  const dir = path.join(root, OUT_DIR);
  return (fs.existsSync(dir) ? fs.readdirSync(dir) : []).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort()
    .map((f) => readJson(path.join(dir, f), null)).filter(Boolean);
}

async function scan({ date, mode, work, root = '.' }) {
  const fest = readJson(path.join(root, 'automation/festivals.json'), {});
  const queries = queriesFor(date, mode, fest.festivals || fest || []);
  const yt = client(await token());
  const after = new Date(Date.parse(`${date}T00:00:00+05:30`) - 7 * DAY).toISOString();
  const found = new Map();
  for (const q of queries) {
    try {
      const r = await yt.get('search', { part: 'snippet', type: 'video', videoDuration: 'short', order: 'viewCount', publishedAfter: after,
        regionCode: 'IN', relevanceLanguage: 'hi', maxResults: 50, q }, UNITS.search);
      for (const it of r.items || []) if (it.id?.videoId && !found.has(it.id.videoId)) found.set(it.id.videoId, q);
    } catch (e) { console.error(`search "${q}": ${e.message}`); if (/quota/i.test(e.message)) break; }
  }
  const now = Date.now();
  const vids = (await videosById(yt, [...found.keys()])).map((v) => ({
    id: v.id, url: `https://youtube.com/shorts/${v.id}`, title: v.snippet.title, channel: v.snippet.channelTitle, channelId: v.snippet.channelId,
    published: v.snippet.publishedAt, ageDays: Math.round(((now - Date.parse(v.snippet.publishedAt)) / DAY) * 10) / 10,
    seconds: seconds(v.contentDetails.duration), views: +v.statistics.viewCount || 0, likes: +v.statistics.likeCount || 0,
    thumb: v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.default?.url || '', query: found.get(v.id),
  })).filter((v) => v.seconds > 0 && v.seconds <= THRESH.maxSeconds);
  // channel stats for all, medians only for the channels with an absolute-threshold candidate (quota)
  const chIds = [...new Set(vids.map((v) => v.channelId))];
  const chInfo = new Map();
  for (let i = 0; i < chIds.length; i += 50) {
    const r = await yt.get('channels', { part: 'snippet,statistics,contentDetails', id: chIds.slice(i, i + 50).join(','), maxResults: 50 }, UNITS.list);
    for (const c of r.items || []) chInfo.set(c.id, { title: c.snippet.title, created: c.snippet.publishedAt, subs: +c.statistics.subscriberCount || 0,
      hiddenSubs: !!c.statistics.hiddenSubscriberCount, uploads: c.contentDetails?.relatedPlaylists?.uploads });
  }
  const cache = readJson(path.join(root, CHANNELS), {});
  const cand = vids.filter((v) => viralCheck(v, null, 0).abs).sort((a, b) => b.views - a.views);
  let room = Math.min(MAX_NEW_CHANNELS, medianBudget(yt.used.units));
  for (const v of cand) {
    const c = chInfo.get(v.channelId) || {};
    const hit = cache[v.channelId];
    if (hit && (now - Date.parse(hit.at)) / DAY < CHANNEL_TTL_DAYS) continue;
    if (room <= 0 || !c.uploads) continue;
    room--;
    try {
      const pl = await yt.get('playlistItems', { part: 'contentDetails,snippet', playlistId: c.uploads, maxResults: 50 }, UNITS.list);
      const items = await videosById(yt, (pl.items || []).map((x) => x.contentDetails.videoId));
      const shorts = items.filter((x) => { const s = seconds(x.contentDetails.duration); return s > 0 && s <= THRESH.maxSeconds; })
        .map((x) => ({ id: x.id, views: +x.statistics.viewCount || 0, at: x.snippet.publishedAt }));
      cache[v.channelId] = { title: c.title, subs: c.subs, hiddenSubs: c.hiddenSubs, created: c.created, at: new Date(now).toISOString(),
        shorts: shorts.slice(0, 30), dev_share: devotionalShare(items.slice(0, 20).map((x) => x.snippet.title)) };
    } catch (e) { console.error(`channel ${c.title}: ${e.message}`); }
  }
  const rows = cand.map((v) => {
    const c = { ...chInfo.get(v.channelId), ...(cache[v.channelId] || {}) };
    const others = (c.shorts || []).filter((x) => x.id !== v.id).map((x) => x.views);
    const med = median(others);
    const check = viralCheck(v, med, others.length);
    const re = reuploadSignals(v, c, now);
    return { ...v, subs: c.subs ?? null, median: med, n_shorts: others.length, multiple: check.multiple === Infinity ? null : check.multiple && Math.round(check.multiple * 10) / 10,
      viral: check.viral && !re.likely && !re.offTopic, off_topic: re.offTopic, strong_channel: med != null && med >= THRESH.strongMedian, why_not: check.why, reupload: re.signals, likely_reupload: re.likely,
      heuristic: classify(v.title, v.seconds) };
  });
  const viral = rows.filter((r) => r.viral).sort((a, b) => b.multiple - a.multiple || b.views - a.views);
  const strong = strongOf(rows);
  const out = {
    date, mode, queries, thresholds: THRESH,
    quota: { searches: yt.used.search, list_calls: yt.used.list, units: yt.used.units, cap: RADAR_CAP },
    counts: { found: found.size, shorts: vids.length, over_threshold: cand.length, viral: viral.length, strong: strong.length, likely_reuploads: rows.filter((r) => r.likely_reupload).length },
    viral, strong,
    near: rows.filter((r) => !r.viral && !r.strong_channel && !r.likely_reupload).sort((a, b) => b.views - a.views).slice(0, 8)
      .map(({ id, url, title, channel, views, multiple, why_not }) => ({ id, url, title, channel, views, multiple, why_not })),
    reuploads: rows.filter((r) => r.likely_reupload).map(({ id, url, title, channel, views, reupload }) => ({ id, url, title, channel, views, signals: reupload })),
    ideas_added: [],
  };
  fs.mkdirSync(path.join(root, OUT_DIR), { recursive: true });
  // keep the cache small: entries seen in the last 60 days
  for (const [k, c] of Object.entries(cache)) if ((now - Date.parse(c.at)) / DAY > 60) delete cache[k];
  fs.writeFileSync(path.join(root, CHANNELS), JSON.stringify(cache, null, 1) + '\n');
  fs.writeFileSync(path.join(root, OUT_DIR, `${date}.json`), JSON.stringify(out, null, 1) + '\n');
  // Claude's input: the viral + strong items, thumbnails downloaded (public i.ytimg.com, no quota)
  fs.mkdirSync(path.join(work, 'thumbs'), { recursive: true });
  const items = [...viral.slice(0, 15), ...strong.slice(0, 5)];
  for (const it of items) {
    try {
      const buf = Buffer.from(await (await fetch(it.thumb, { signal: AbortSignal.timeout(15000) })).arrayBuffer());
      fs.writeFileSync(path.join(work, 'thumbs', `${it.id}.jpg`), buf);
      it.thumb_file = path.posix.join(work.replace(/\\/g, '/'), 'thumbs', `${it.id}.jpg`);
    } catch { /* no thumbnail: Claude judges the title only */ }
  }
  fs.writeFileSync(path.join(work, 'pending.json'), JSON.stringify({ date, items: items.map((i) => ({ id: i.id, title: i.title, channel: i.channel, seconds: i.seconds,
    views: i.views, multiple: i.multiple, strong_channel: !i.viral, thumb_file: i.thumb_file || null, heuristic: i.heuristic })) }, null, 1));
  return out;
}

// ---------------------------------------------------------------- Claude's analysis -> the day file + the banks

const words = (t) => new Set(String(t || '').toLowerCase().replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ').split(/\s+/).filter((w) => w.length > 1));
/** Share of the idea's words that also are in a reference title (an idea must be our own words). */
export function overlap(a, b) {
  const A = words(a), B = words(b);
  if (!A.size) return 0;
  return [...A].filter((w) => B.has(w)).length / A.size;
}
export const COPY_MAX = 0.6;

/** Problems of analysis.json {items: {id: {...}}, ideas: [{bank, ...}]} against pending.json. */
export function analysisProblems(an, pending, root = '.') {
  const e = [];
  const titles = (pending.items || []).map((i) => i.title);
  for (const [id, a] of Object.entries(an.items || {})) {
    if (!(pending.items || []).some((i) => i.id === id)) e.push(`items.${id}: not in pending.json`);
    if (!HOOKS.includes(a.hook_type)) e.push(`items.${id}: hook_type one of ${HOOKS.join(', ')}`);
    if (a.hooks && !(Array.isArray(a.hooks) && a.hooks.every((h) => HOOKS.includes(h)))) e.push(`items.${id}: hooks from ${HOOKS.join(', ')}`);
    if (!FORMATS.includes(a.format)) e.push(`items.${id}: format one of ${FORMATS.join(', ')}`);
    if (!DEITIES.includes(a.deity)) e.push(`items.${id}: deity one of ${DEITIES.join(', ')}`);
    if (!ART.includes(a.art_style)) e.push(`items.${id}: art_style one of ${ART.join(', ')}`);
    if (!(typeof a.topic === 'string' && a.topic.length >= 3)) e.push(`items.${id}: topic (a few words)`);
    if (!(typeof a.cover_style === 'string' && a.cover_style.length >= 3)) e.push(`items.${id}: cover_style (what the thumbnail shows)`);
    if (a.reupload_suspect !== undefined && typeof a.reupload_suspect !== 'boolean') e.push(`items.${id}: reupload_suspect true | false`);
  }
  const counts = {};
  const used = new Set(Object.keys(BANKS).flatMap((b) => { const d = readJson(path.join(root, BANKS[b].file), {}); return [...(d[BANKS[b].items] || []), ...(d.ideas || [])].map((x) => x.id); }));
  for (const [k, x] of (an.ideas || []).entries()) {
    const n = `ideas[${k}] ${x.id || ''}`;
    if (!BANKS[x.bank]) { e.push(`${n}: bank facts | kailash | pov`); continue; }
    counts[x.bank] = (counts[x.bank] || 0) + 1;
    const idea = { ...x, status: 'idea', from: { source: 'viral-radar', refs: x.from?.refs || [] } };
    delete idea.bank;
    e.push(...ideaProblems(x.bank, idea, used).map((m) => `${n}: ${m}`));
    used.add(x.id);
    const text = x.bank === 'facts' ? `${x.hook} ${x.hook_hi}` : `${x.title} ${x.hook || ''}`;
    const copied = titles.find((t) => overlap(text, t) >= COPY_MAX);
    if (copied) e.push(`${n}: too close to a reference title ("${copied.slice(0, 50)}"): write our OWN hook, never copy titles`);
  }
  if ((counts.facts || 0) > 4 || (counts.kailash || 0) > 2 || (counts.pov || 0) > 2) e.push('ideas: at most 4 facts, 2 kailash and 2 pov a run');
  return e;
}

function apply({ date, work, root = '.' }) {
  const file = path.join(root, OUT_DIR, `${date}.json`);
  const day = readJson(file, null);
  if (!day) throw new Error(`no ${file}: run scan first`);
  const an = readJson(path.join(work, 'analysis.json'), { items: {}, ideas: [] });
  const pending = readJson(path.join(work, 'pending.json'), { items: [] });
  const bad = analysisProblems(an, pending, root);
  // an item with a problem keeps the heuristic read; an idea with a problem is dropped (reported)
  const badItem = new Set(bad.map((m) => m.match(/^items\.([\w-]+):/)?.[1]).filter(Boolean));
  const badIdea = new Set(bad.map((m) => m.match(/^ideas\[(\d+)\]/)?.[1]).filter((x) => x != null).map(Number));
  for (const list of [day.viral, day.strong]) {
    for (const it of list) {
      const a = an.items?.[it.id];
      it.analysis = a && !badItem.has(it.id) ? { ...a, by: 'claude' } : { hook_type: it.heuristic.hook, hooks: it.heuristic.hooks, format: it.heuristic.format, deity: it.heuristic.deity, by: 'rules' };
      markSuspect(it);
    }
  }
  moveSuspects(day);
  const added = [];
  for (const [k, x] of (an.ideas || []).entries()) {
    if (badIdea.has(k) || !BANKS[x.bank]) continue;
    const idea = { ...x, status: 'idea', from: { source: `viral-radar ${date}`, refs: (x.from?.refs || []).filter((u) => /^https?:\/\//.test(u)), added: date } };
    delete idea.bank;
    for (const id of addIdeas(x.bank, [idea], root)) added.push(`${x.bank}:${id}`);
  }
  day.ideas_added = [...new Set([...(day.ideas_added || []), ...added])];
  day.analysis_problems = bad;
  fs.writeFileSync(file, JSON.stringify(day, null, 1) + '\n');
  return { added, problems: bad.length };
}

// ---------------------------------------------------------------- summaries

const fmt = (n) => (n >= 1e7 ? `${(n / 1e7).toFixed(2)} Cr` : n >= 1e5 ? `${(n / 1e5).toFixed(1)} L` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : `${n}`);
const tally = (list, key) => Object.entries(list.reduce((m, x) => { for (const k of [].concat(key(x) || [])) m[k] = (m[k] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]);

/** The viral items of the 7 days up to `date` (latest stats per video). */
export function weekItems(files, date) {
  const from = addDays(date, -6);
  const by = new Map();
  for (const f of files.filter((x) => x.date >= from && x.date <= date).sort((a, b) => a.date.localeCompare(b.date))) {
    for (const v of f.viral || []) by.set(v.id, { ...by.get(v.id), ...v, seen: f.date });
  }
  return [...by.values()].sort((a, b) => (b.multiple || 0) - (a.multiple || 0) || b.views - a.views);
}
const A = (v) => v.analysis || { hook_type: v.heuristic?.hook, format: v.heuristic?.format, deity: v.heuristic?.deity };

/** "What's working" lines (growth.md on Mondays and the weekly summary). */
export function workingLines(files, date) {
  const items = weekItems(files, date);
  if (!items.length) return ['- Viral radar: no truly viral devotional Shorts recorded in the last 7 days (or the radar has not run yet).'];
  const top = (list) => list.slice(0, 4).map(([k, n]) => `${k} ${n}`).join(', ');
  const lines = [
    `- ${items.length} truly viral devotional Shorts in 7 days (>= 100k or 30k in 3 days, >= ${THRESH.multiple}x their channel's median).`,
    `- Hooks: ${top(tally(items, (v) => HOOK_LABEL[A(v).hook_type] || A(v).hook_type))}.`,
    `- Formats: ${top(tally(items, (v) => A(v).format))}; deities: ${top(tally(items, (v) => A(v).deity))}.`,
    `- Art: ${top(tally(items.filter((v) => A(v).art_style), (v) => A(v).art_style)) || 'not analysed'}; length: ${top(tally(items, (v) => v.heuristic?.length))}.`,
    `- Best: ${items.slice(0, 3).map((v) => `"${v.title.replace(/\|/g, '/').slice(0, 60)}" ${fmt(v.views)} (${v.multiple}x, ${HOOK_LABEL[A(v).hook_type] || A(v).hook_type})`).join('; ')}.`,
  ];
  const ideas = files.filter((f) => f.date > addDays(date, -7) && f.date <= date).flatMap((f) => f.ideas_added || []);
  if (ideas.length) lines.push(`- New ideas in the banks (status "idea", citation to verify): ${ideas.join(', ')}.`);
  return lines;
}

export function weeklySection(files, date) {
  const items = weekItems(files, date).slice(0, 10);
  const week = files.filter((f) => f.date > addDays(date, -7) && f.date <= date);
  const strong = new Map();
  for (const f of week) for (const s of f.strong || []) if (!strong.has(s.channelId)) strong.set(s.channelId, s);
  const units = week.reduce((n, f) => n + (f.quota?.units || 0), 0);
  return [
    `## Week of ${date}`,
    '',
    `Runs: ${week.map((f) => `${f.date} ${f.mode}`).join(', ') || '-'}; quota used ${units} units (cap ${RADAR_CAP}/day).`,
    '',
    '### Top 10 truly viral references',
    '',
    '| # | Title | Channel | Views | x median | Age | Length | Hook | Format | Deity | Art / cover |',
    '|---|---|---|---|---|---|---|---|---|---|---|',
    ...items.map((v, i) => `| ${i + 1} | [${v.title.replace(/[|\]]/g, '/').slice(0, 70)}](${v.url}) | ${v.channel.replace(/\|/g, '/')} | ${fmt(v.views)} | ${v.multiple ?? '-'} | ${v.ageDays} d | ${v.seconds} s | ${HOOK_LABEL[A(v).hook_type] || A(v).hook_type} | ${A(v).format} | ${A(v).deity} | ${[A(v).art_style, A(v).cover_style].filter(Boolean).join(': ').replace(/\|/g, '/').slice(0, 60) || '-'} |`),
    ...(items.length ? [] : ['| - | nothing passed the filter this week | | | | | | | | | |']),
    '',
    '### What\'s working',
    '',
    ...workingLines(files, date),
    '',
    ...(strong.size ? ['### Consistently strong channels (median >= 40k: style to learn from, not outliers)', '',
      ...[...strong.values()].slice(0, 8).map((s) => `- ${s.channel}: "${s.title.slice(0, 60)}" ${fmt(s.views)} (channel median ${fmt(Math.round(s.median))})`), ''] : []),
  ].join('\n');
}

export function writeSummary(date, root = '.') {
  const files = radarFiles(root);
  const old = read(path.join(root, SUMMARY));
  const sections = old.split(/^(?=## Week of )/m).filter((p) => p.startsWith('## Week of ') && !p.startsWith(`## Week of ${date}`));
  sections.unshift(weeklySection(files, date) + '\n');
  sections.sort((a, b) => b.slice(11, 21).localeCompare(a.slice(11, 21)));
  const plan = weeklyPlan();
  const head = [
    '# Viral Radar',
    '',
    'Which devotional Shorts are TRULY viral in India each week, and why (scripts/viral-radar.mjs, workflow',
    '.github/workflows/viral-radar.yml, owner 15 Nov 2026). Per-run data: automation/viral-radar/<date>.json.',
    '',
    `- Filter: views >= ${fmt(THRESH.views)} (or >= ${fmt(THRESH.fastViews)} within ${THRESH.fastDays} days) AND >= ${THRESH.multiple}x the median of the`,
    `  channel's other recent Shorts (min ${THRESH.minShorts}); likely reuploads (tiny / new channel, random topics, spammy title) skipped.`,
    `- Quota: sweep (Monday) ${SEARCHES.sweep} searches ~${plan.sweep} units, other days ${SEARCHES.daily} searches ~${plan.daily} units;`,
    `  ~${plan.week} units a week, never more than ${RADAR_CAP} a day (the project has 10,000/day shared with ~1,600 per upload).`,
    '- Ideas go into the banks as "status": "idea" with a citation to verify (`node scripts/topic-banks.mjs promote`).',
    '  Our own words only: titles and scripts of other channels are never copied.',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(root, SUMMARY), `${head}\n${sections.map((s) => s.trimEnd() + '\n').join('\n')}`);
}

// ---------------------------------------------------------------- CLI

function setOutput(o) {
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(o).map(([k, v]) => `${k}=${v}\n`).join(''));
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
  const date = opt('--date', istToday());
  const work = opt('--work', '.radar-work');
  const cmd = args[0];
  if (cmd === 'budget') { console.log(JSON.stringify(weeklyPlan())); return; }
  if (cmd === 'due') {
    const files = radarFiles();
    const asked = opt('--mode', 'auto');
    const mode = asked === 'auto' ? modeFor(date, files) : asked;
    const hour = +new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(11, 13);
    let run = true, why = '';
    if (process.env.RADAR === 'off') { run = false; why = 'repo variable RADAR=off'; }
    else if (!args.includes('--force') && files.some((f) => f.date === date)) { run = false; why = `already ran today (${OUT_DIR}/${date}.json)`; }
    else if (!args.includes('--force') && asked === 'auto' && hour >= 13) { run = false; why = 'morning runs only (before 13:00 IST)'; }
    console.log(JSON.stringify({ run, mode, why }));
    setOutput({ run, mode });
    return;
  }
  if (cmd === 'scan') {
    const out = await scan({ date, mode: opt('--mode', 'daily'), work });
    const n = Math.min(out.viral.length, 15) + Math.min(out.strong.length, 5);
    console.log(`Viral radar ${date} (${out.mode}): ${out.counts.found} found, ${out.counts.shorts} Shorts, ${out.counts.over_threshold} over the view threshold, ${out.viral.length} truly viral, ${out.strong.length} strong-channel, ${out.counts.likely_reuploads} likely reuploads skipped; quota ${out.quota.units} units (${out.quota.searches} searches)`);
    for (const v of out.viral.slice(0, 10)) console.log(`- ${fmt(v.views)} ${v.multiple}x ${v.heuristic.hook}/${v.heuristic.format}: ${v.title}`);
    setOutput({ items: n });
    return;
  }
  if (cmd === 'check') {
    const e = analysisProblems(readJson(path.join(work, 'analysis.json'), { items: {}, ideas: [] }), readJson(path.join(work, 'pending.json'), { items: [] }));
    console.log(e.length ? e.map((x) => `- ${x}`).join('\n') : 'OK');
    process.exit(e.length ? 1 : 0);
  }
  if (cmd === 'apply') {
    const r = apply({ date, work });
    writeSummary(date);
    console.log(`applied: ${r.added.length} ideas added (${r.added.join(', ') || '-'}); ${r.problems} analysis problems; ${SUMMARY} updated`);
    return;
  }
  if (cmd === 'rescore') {
    const f = path.join(OUT_DIR, `${date}.json`);
    const day = rescoreDay(readJson(f, null) || {}, readJson(CHANNELS, {}));
    fs.writeFileSync(f, `${JSON.stringify(day, null, 1)}\n`);
    writeSummary(date);
    console.log(`rescored ${f}: ${day.viral.length} viral, ${day.strong.length} strong`);
    return;
  }
  if (cmd === 'summary') { writeSummary(date); console.log(`${SUMMARY} updated for the week of ${date}`); return; }
  console.log('usage: node scripts/viral-radar.mjs due | scan | check | apply | summary | budget (see the header)');
  process.exit(2);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((e) => { console.error(`viral-radar: ${e.message}`); process.exit(1); });
}
