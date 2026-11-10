#!/usr/bin/env node
// Daily trend research for Shyam Premi SN: what people search right now, written to automation/trends/<date>.md
// for the story prompts (STORY.md section 1). Zero cost: public endpoints plus the channel's own YouTube token.
//
//   node scripts/trend-signals.mjs [--date YYYY-MM-DD] [--out automation/trends/<date>.md] [--force]
//
// Sources (each fails soft: a source that fails is noted in the file and skipped):
//   1. YouTube autocomplete (suggestqueries, ds=yt, gl=IN, hl=hi and hl=en) for Roman and Devanagari seeds: Khatu
//      Shyam, the deities, festivals in calendar.md for the next 14 days, the temples in mandir-series.md. A suggestion
//      not seen for the same seed in the last 7 days' files is marked rising (↑).
//   2. Google Trends "Trending now" RSS for India, devotional and festival items only.
//   3. The channel's own numbers: YouTube Analytics (last 28 days, per video; search terms from YT_SEARCH) when the
//      token has yt-analytics.readonly, otherwise Data API view counts (scripts/youtube.mjs credentials).
//   4. A ranked "Recommended topics for the next 3 days" list built from the above.
// Today's file already there: nothing is fetched (use --force to rebuild). No secret is ever printed.
// Prints one JSON line. Exit code 0 even when sources fail; 1 only if the file cannot be written.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const DAY = 86400e3;
const istToday = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
const addDays = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const weekday = (d) => new Date(`${d}T00:00:00Z`).getUTCDay();
const DAYS = ['Ravivar', 'Somvar', 'Mangalvar', 'Budhvar', 'Guruvar', 'Shukravar', 'Shanivar'];
const fmtDay = (d) => `${DAYS[weekday(d)]} ${Number(d.slice(8))} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(d.slice(5, 7)) - 1]}`;

const DATE = option('--date') || istToday();
const OUT = option('--out') || `automation/trends/${DATE}.md`;
const notes = [];
const note = (s) => { notes.push(s); console.error(s); };
const read = (f) => { try { return fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n'); } catch { return ''; } };
// Festivals whose status Shorts the status engine makes (automation/festivals.json, tier big/status).
const statusDates = () => { try { return new Set(JSON.parse(read('automation/festivals.json')).festivals.filter((x) => x.tier !== 'info').map((x) => x.date)); } catch { return new Set(); } };

// ---------- Devanagari forms (word by word; a phrase with an unknown word has no form) ----------
const PHRASES = {
  'dev uthani': 'देवउठनी', 'khatu shyam ji': 'खाटू श्याम जी', 'jai shree shyam': 'जय श्री श्याम', 'jai shri shyam': 'जय श्री श्याम',
  'choti diwali': 'छोटी दिवाली', 'chhoti diwali': 'छोटी दिवाली', 'bhai dooj': 'भाई दूज', 'sai baba': 'साईं बाबा',
};
const WORDS = Object.fromEntries(`
khatu खाटू|shyam श्याम|baba बाबा|ji जी|jai जय|shree श्री|shri श्री|sri श्री|barbarik बर्बरीक|barbareek बर्बरीक|janmotsav जन्मोत्सव|janmdin जन्मदिन
hanuman हनुमान|shiv शिव|shiva शिव|ganesh गणेश|ganpati गणपति|krishna कृष्ण|lakshmi लक्ष्मी|laxmi लक्ष्मी|durga दुर्गा|shani शनि|sai साईं|vishnu विष्णु|surya सूर्य|ram राम|sita सीता|radha राधा|bhagwan भगवान|mata माता|maa माँ|devi देवी|dev देव|santoshi संतोषी|balaji बालाजी|bholenath भोलेनाथ|mahadev महादेव|kuber कुबेर|dhanvantari धन्वंतरि|yamraj यमराज|tulsi तुलसी|gopal गोपाल|bal बाल|kanha कान्हा
ki की|ka का|ke के|aur और|se से|me में|mein में|par पर|katha कथा|kahani कहानी|kahaniyan कहानियाँ|itihas इतिहास|mandir मंदिर|temple मंदिर|history इतिहास|story स्टोरी|darshan दर्शन|dham धाम|status स्टेटस|vrat व्रत|puja पूजा|pooja पूजा|vidhi विधि|kab कब|hai है|h है|hain हैं|kyu क्यों|kyon क्यों|kyun क्यों|kaise कैसे|kaun कौन|kya क्या|kahan कहाँ|manate मनाते|manaya मनाया|jata जाता|jati जाती|hota होता|hoti होती|tha था|the थे|aaj आज|kal कल|sheesh शीश|daan दान|rahasya रहस्य|mahima महिमा|janm जन्म|nishan निशान|kund कुंड|leela लीला|mantra मंत्र|naam नाम|sampoorn संपूर्ण|sampurn संपूर्ण|pauranik पौराणिक|prachin प्राचीन|kahaniya कहानियाँ|vrat-katha व्रत-कथा|din दिन|tithi तिथि|2026 2026|shubh शुभ|parikrama परिक्रमा|vishesh विशेष|yatra यात्रा|mela मेला
dhanteras धनतेरस|diwali दिवाली|deepawali दीपावली|dipawali दीपावली|naraka नरक|narak नरक|chaturdashi चतुर्दशी|govardhan गोवर्धन|bhai भाई|dooj दूज|chhath छठ|chhat छठ|uthani उठनी|prabodhini प्रबोधिनी|ekadashi एकादशी|vivah विवाह|karwa करवा|chauth चौथ|ahoi अहोई|ashtami अष्टमी|rama रमा|sandhya संध्या|usha उषा|arghya अर्घ्य|nahay नहाय|khay खाय|purnima पूर्णिमा|amavasya अमावस्या|kartik कार्तिक|sankashti संकष्टी|chaturthi चतुर्थी|annakut अन्नकूट|yamdeep यमदीप|dev-uthani देवउठनी|gopashtami गोपाष्टमी|akshay अक्षय|navami नवमी|vaikuntha वैकुंठ|guru गुरु|nanak नानक|jayanti जयंती|kalbhairav कालभैरव|bhairav भैरव|margashirsha मार्गशीर्ष|utpanna उत्पन्ना|vivah-panchami विवाह-पंचमी|panchami पंचमी|dev-deepawali देव-दीपावली|deepawali दीपावली|tulsi-vivah तुलसी-विवाह
salasar सालासर|jeen जीण|shakambhari शाकम्भरी|sakrai सकराय|sambhar सांभर|rani रानी|sati सती|dadi दादी|dhandhan ढांढण|mehandipur मेहंदीपुर|karni करणी|deshnoke देशनोक|shrinathji श्रीनाथजी|nathdwara नाथद्वारा|brahma ब्रह्मा|pushkar पुष्कर|eklingji एकलिंगजी|kaila कैला|tanot तनोट|ramdev रामदेव|ramdevra रामदेवरा|govind गोविंद|trinetra त्रिनेत्र|ranthambore रणथंभौर|moti मोती|dungri डूंगरी|churu चूरू|sikar सीकर|jhunjhunu झुंझुनूं|dausa दौसा|bikaner बीकानेर|ajmer अजमेर|udaipur उदयपुर|karauli करौली|jaisalmer जैसलमेर|jaipur जयपुर
somnath सोमनाथ|mallikarjuna मल्लिकार्जुन|mallikarjun मल्लिकार्जुन|mahakaleshwar महाकालेश्वर|mahakal महाकाल|omkareshwar ओंकारेश्वर|kedarnath केदारनाथ|bhimashankar भीमाशंकर|kashi काशी|vishwanath विश्वनाथ|trimbakeshwar त्र्यंबकेश्वर|vaidyanath वैद्यनाथ|baidyanath बैद्यनाथ|nageshwar नागेश्वर|rameshwaram रामेश्वरम|grishneshwar घृष्णेश्वर|jyotirlinga ज्योतिर्लिंग|badrinath बद्रीनाथ|dwarka द्वारका|puri पुरी|jagannath जगन्नाथ|yamunotri यमुनोत्री|gangotri गंगोत्री|char चार|chhota छोटा|kamakhya कामाख्या|kalighat कालीघाट|vaishno वैष्णो|jwala ज्वाला|naina नैना|chintpurni चिंतपूर्णी|hinglaj हिंगलाज|tarapith तारापीठ|ambaji अंबाजी|vindhyavasini विंध्यवासिनी|shakti शक्ति|peeth पीठ|ashtavinayak अष्टविनायक|moreshwar मोरेश्वर|siddhivinayak सिद्धिविनायक|ballaleshwar बल्लालेश्वर|varadvinayak वरदविनायक|chintamani चिंतामणि|girijatmaj गिरिजात्मज|vighneshwar विघ्नेश्वर|mahaganapati महागणपति|tungnath तुंगनाथ|rudranath रुद्रनाथ|madhyamaheshwar मध्यमहेश्वर|kalpeshwar कल्पेश्वर|panch पंच|kedar केदार|ayodhya अयोध्या|mathura मथुरा|haridwar हरिद्वार|kanchipuram कांचीपुरम|ujjain उज्जैन|ekambareswarar एकाम्बरेश्वर|jambukeswarar जम्बुकेश्वर|arunachaleswarar अरुणाचलेश्वर|nataraja नटराज|srikalahasti श्रीकालहस्ती|banke बांके|bihari बिहारी|prem प्रेम|iskcon इस्कॉन|vrindavan वृंदावन|barsana बरसाना|nandgaon नंदगांव|janmabhoomi जन्मभूमि|dwarkadhish द्वारकाधीश|udupi उडुपी|guruvayur गुरुवायूर|sankat संकट|mochan मोचन|garhi गढ़ी|dhara धारा|jakhu जाखू|bade बड़े|kashtbhanjan कष्टभंजन|navagraha नवग्रह|shingnapur शिंगणापुर|tirupati तिरुपति|meenakshi मीनाक्षी|padmanabhaswamy पद्मनाभस्वामी|sabarimala सबरीमाला|konark कोणार्क|sun सूर्य|khajuraho खजुराहो|dakshineswar दक्षिणेश्वर|akshardham अक्षरधाम|ganga गंगा|varanasi वाराणसी
`.trim().split(/[|\n]/).map((p) => p.trim().split(' ')).filter((p) => p.length === 2));
function deva(phrase) {
  let s = ` ${phrase.toLowerCase().replace(/\s+/g, ' ').trim()} `;
  if (/[ऀ-ॿ]/.test(s)) return s.trim();
  for (const [r, d] of Object.entries(PHRASES)) s = s.replaceAll(` ${r} `, ` ${d} `);
  const out = s.trim().split(' ').map((w) => (/[ऀ-ॿ]/.test(w) ? w : WORDS[w]));
  return out.every(Boolean) ? out.join(' ') : null;
}

// ---------- Seeds ----------
const KHATU_ROMAN = ['khatu shyam', 'shyam baba', 'khatu shyam bhajan', 'khatu shyam katha', 'khatu shyam status', 'jai shree shyam',
  'khatu shyam mandir', 'khatu shyam ka itihas', 'khatu shyam janmotsav', 'barbarik'];
const KHATU_DEVA = ['खाटू श्याम', 'श्याम बाबा', 'खाटू श्याम भजन', 'खाटू श्याम कथा', 'खाटू श्याम स्टेटस', 'जय श्री श्याम', 'बर्बरीक'];
const GENERIC = ['mandir', 'ki katha', 'ka itihas', 'मंदिर', 'की कथा', 'का इतिहास'];
const DEITIES = [
  { key: 'hanuman', roman: 'hanuman ji' }, { key: 'shiv', roman: 'shiv ji' }, { key: 'ganesh', roman: 'ganesh ji' },
  { key: 'krishna', roman: 'krishna' }, { key: 'lakshmi', roman: 'lakshmi ji' }, { key: 'durga', roman: 'durga maa' },
  { key: 'shani', roman: 'shani dev' }, { key: 'sai', roman: 'sai baba' }, { key: 'vishnu', roman: 'vishnu ji' }, { key: 'surya', roman: 'surya dev' },
];
// Weekday deity (STORY.md section 1), as DEITIES keys; Khatu Shyam ji at least twice a week.
const WEEKDAY_DEITY = [['surya'], ['shiv'], ['hanuman'], ['ganesh'], ['vishnu', 'sai'], ['lakshmi', 'durga'], ['shani', 'hanuman']];

function calendar() {
  return [...read('automation/calendar.md').matchAll(/^\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*(.+?)\s*\|\s*$/gm)].map(([, date, text]) => {
    const clean = text.split(/Sources?:/)[0].replace(/\*\*/g, '').replace(/\([^)]*\)/g, '');
    const names = clean.split(/[;,]/).map((s) => s.split(':')[0].trim()).filter((s) => s && s.length < 40)
      .map((s) => s.replace(/^also\s+/i, ''));
    return { date, text: text.replace(/\*\*/g, ''), names };
  });
}

const SATI = /\bsati\b/i;
function temples() {
  const md = read('automation/mandir-series.md');
  const raj = (md.split('**Rajasthan (first)**')[1] || '').split('## ')[0];
  const list = [...raj.matchAll(/^\d+\.\s+(.+)$/gm)].map(([, line]) => line.split(/\s*\(|:|,| itself/)[0].trim())
    .map((n) => ({ name: n.replace(/\s+(Dham|Mandir|ji Mandir)$/i, '').replace(/\s+Mandir$/i, ''), series: 'Rajasthan' }));
  const pan = (md.split('## Pan-India series')[1] || '').split('Accuracy rules above')[0];
  const items = pan.split(/\n(?=\d+\.\s+\*\*)/).filter((b) => /^\d+\.\s+\*\*/.test(b));
  const stop = /\b(Traditions|Start|Golden|NOT|order|note|claimed|sites|history|framing|modern|mention|BAPS|Shiv as|Pakistan|Shankaracharya|Stotram|tradition|the|and|ones|Tamil|cluster|Kumbakonam|elements|cities)\b/;
  for (const block of items) {
    const series = block.match(/\*\*(.+?)\*\*/)[1];
    const body = block.replace(/\*\*[^*]+\*\*/g, '').replace(/\([^)]*\)/g, '').replace(/\n\s+/g, ' ');
    for (let piece of body.split(/[:;,.]/)) {
      piece = piece.replace(/^\s*\d+\s*/, '').trim();
      if (!piece || stop.test(piece) || piece.split(/\s+/).length > 3 || !/^[A-Z]/.test(piece)) continue;
      if (!list.some((t) => t.name.toLowerCase() === piece.toLowerCase())) list.push({ name: piece, series });
    }
  }
  return list;
}

// ---------- Fetch helpers ----------
const UA = { 'User-Agent': 'Mozilla/5.0 (Shyam Premi SN trend research)' };
async function text(url) {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}
async function suggest(q, hl) {
  const body = await text(`https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&hl=${hl}&gl=IN&q=${encodeURIComponent(q)}`);
  return (JSON.parse(body)[1] || []).map((s) => String(s).toLowerCase().trim());
}
async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k]); await new Promise((r) => setTimeout(r, 120)); }
  }));
  return out;
}

// ---------- Previous 7 days (rising) ----------
const LINE = /^- \*\*(.+?)\*\* → (.*)$/;
function seenLastWeek() {
  const seen = new Map();
  let files = 0;
  for (let n = 1; n <= 7; n++) {
    const md = read(path.join(path.dirname(OUT), `${addDays(DATE, -n)}.md`));
    if (!md) continue;
    files++;
    for (const line of md.split('\n')) {
      const m = line.match(LINE);
      if (!m) continue;
      const set = seen.get(m[1]) || new Set();
      m[2].split(' · ').forEach((s) => set.add(s.replace(/^↑\s*/, '').trim()));
      seen.set(m[1], set);
    }
  }
  return { seen, files };
}

// ---------- Google Trends ----------
const DEVOTIONAL = /\b(mandir|temple|puja|pooja|vrat|ekadashi|diwali|deepawali|dhanteras|chhath|govardhan|bhai dooj|katha|aarti|bhagwan|mata|devi|shiv|mahadev|hanuman|ganesh|krishna|ram lalla|lakshmi|durga|shani|sai baba|shyam|khatu|jayanti|purnima|amavasya|navratri|tulsi|kartik|guru nanak|festival|tyohar|parv|muhurat|panchang|janmotsav|darshan|ayodhya|vrindavan|kedarnath|tirupati)\b|मंदिर|पूजा|व्रत|एकादशी|दिवाली|धनतेरस|छठ|गोवर्धन|भाई दूज|कथा|आरती|भगवान|माता|देवी|शिव|हनुमान|गणेश|कृष्ण|लक्ष्मी|दुर्गा|शनि|श्याम|खाटू|जयंती|पूर्णिमा|अमावस्या|त्योहार|तुलसी/i;
const OFFTOPIC = /\b(bjp|congress|aap|modi|yogi|rahul|gandhi|election|chunav|vote|voter|rally|controvers\w*|vivad|vivaad|riot|danga|court|arrest|police|stampede|bhagdad|accident|hadsa|death|died|maut|murder|scam|fraud|mosque|masjid|gyanvapi|waqf|protest|ban|boycott|cricket|vs|ipl|match|movie|film|box office|stock|share price|sensex|gold rate|silver rate|horoscope|rashifal|lottery)\b/i;
async function trendsIN() {
  const xml = await text('https://trends.google.com/trending/rss?geo=IN');
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, item]) => {
    const tag = (name) => item.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1]?.trim();
    const news = [...item.matchAll(/<ht:news_item_title>([\s\S]*?)<\/ht:news_item_title>/g)].map((m) => m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim());
    return { query: tag('title'), traffic: tag('ht:approx_traffic'), news: news.slice(0, 2) };
  });
  return {
    total: items.length,
    kept: items.filter((t) => DEVOTIONAL.test(`${t.query} ${t.news.join(' ')}`) && !OFFTOPIC.test(`${t.query} ${t.news.join(' ')}`)),
  };
}

// ---------- The channel's own numbers ----------
const ENV_FILE = path.join(os.homedir(), '.shyampremisk', 'youtube.env');
const KEYS = ['YT_CLIENT_ID', 'YT_CLIENT_SECRET', 'YT_REFRESH_TOKEN'];
function loadEnv() { // same rules as scripts/youtube.mjs
  const file = fs.existsSync(ENV_FILE)
    ? Object.fromEntries(read(ENV_FILE).split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]))
    : {};
  const env = { ...file, ...Object.fromEntries(KEYS.filter((k) => process.env[k]).map((k) => [k, process.env[k]])) };
  if (KEYS.every((k) => process.env[`SHYAM_${k}`])) KEYS.forEach((k) => { env[k] = process.env[`SHYAM_${k}`]; });
  return env;
}
async function api(url, token, what) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) throw new Error(`${what}: ${body.error?.message || body.error_description || res.statusText} (HTTP ${res.status})`);
  return body;
}
const seconds = (iso = '') => { const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/) || []; return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0); };

function ourVideos() { // video id -> { slug, tags } from published.md, log.md and story/published
  const log = new Map(read('automation/log.md').split('\n').map((l) => l.split(' | ')).filter((p) => p.length >= 5).map((p) => [p[2], p]));
  const map = new Map();
  for (const line of read('automation/published.md').split('\n')) {
    const m = line.match(/^- (\S+) \| youtube: https:\/\/(?:youtube\.com\/shorts\/|youtu\.be\/)([\w-]{11})/);
    if (!m) continue;
    const [, slug, id] = m;
    const slot = slug.split('-')[3];
    const deity = log.get(slug)?.[3] || '';
    let spec = {};
    try { spec = JSON.parse(read(`story/published/${slug}.json`) || '{}'); } catch {}
    const tags = new Set([{ morning: 'katha', evening: 'darshan', noon: 'Dadi-Chhotu', long: 'long', status: 'status' }[slot] || slot]);
    if (/mandir series|mandir itihas/i.test(deity) || spec.temple || spec.playlist === 'Mandir Itihas') tags.add('mandir');
    if (/darshan/.test(slug)) tags.add('darshan');
    if (/animated [1-9]/.test(line)) tags.add('animated');
    map.set(id, { slug, tags: [...tags] });
  }
  return map;
}

async function channelData() {
  const env = loadEnv();
  if (!KEYS.every((k) => env[k])) return { mode: 'none', note: 'No YouTube credentials (YT_* secrets or ~/.shyampremisk/youtube.env): channel data skipped.' };
  const tok = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', signal: AbortSignal.timeout(20000),
    body: new URLSearchParams({ client_id: env.YT_CLIENT_ID, client_secret: env.YT_CLIENT_SECRET, refresh_token: env.YT_REFRESH_TOKEN, grant_type: 'refresh_token' }),
  }).then((r) => r.json());
  if (!tok.access_token) throw new Error(`token refresh failed (${tok.error || 'no token'})`);
  const token = tok.access_token;
  const scope = String(tok.scope || '');
  const D = 'https://www.googleapis.com/youtube/v3';
  // Uploads (Data API, ~3 units): titles, durations and lifetime views of the latest 50.
  const ch = await api(`${D}/channels?part=contentDetails&mine=true`, token, 'channel');
  const uploads = ch.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  const pl = uploads ? await api(`${D}/playlistItems?part=contentDetails&maxResults=50&playlistId=${uploads}`, token, 'uploads') : { items: [] };
  const ids = pl.items.map((i) => i.contentDetails.videoId);
  const vids = ids.length ? (await api(`${D}/videos?part=snippet,statistics,contentDetails&id=${ids.join(',')}`, token, 'videos')).items : [];
  const ours = ourVideos();
  const videos = new Map(vids.map((v) => {
    const sec = seconds(v.contentDetails.duration);
    const known = ours.get(v.id);
    return [v.id, {
      id: v.id, title: v.snippet.title, published: v.snippet.publishedAt.slice(0, 10), seconds: sec,
      views: +v.statistics.viewCount || 0, likes: +v.statistics.likeCount || 0,
      tags: known ? known.tags : ['older', sec <= 180 ? 'older-short' : 'older-long'],
    }];
  }));
  const out = { mode: 'data-api', videos, scope };
  if (!/yt-analytics(-monetary)?\.readonly/.test(scope)) {
    out.note = 'The token has no yt-analytics.readonly scope, so these are Data API lifetime views (no average view percentage, no search terms). '
      + 'To unlock them, the owner enables the "YouTube Analytics API" in the Google Cloud project, re-runs `node scripts/youtube.mjs auth` '
      + '(the scope is now requested) and updates the YT_REFRESH_TOKEN secret.';
    return out;
  }
  const A = 'https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE';
  const range = `&startDate=${addDays(DATE, -28)}&endDate=${addDays(DATE, -1)}`;
  const rows = (r) => (r.rows || []).map((row) => Object.fromEntries(r.columnHeaders.map((h, i) => [h.name, row[i]])));
  try {
    const top = rows(await api(`${A}${range}&metrics=views,averageViewPercentage,averageViewDuration,likes,subscribersGained&dimensions=video&sort=-views&maxResults=50`, token, 'analytics'));
    out.mode = 'analytics';
    out.top = top;
    // Videos in the report but older than the latest 50 uploads: fetch their titles.
    const missing = top.map((r) => r.video).filter((id) => !videos.has(id)).slice(0, 50);
    if (missing.length) {
      for (const v of (await api(`${D}/videos?part=snippet,contentDetails&id=${missing.join(',')}`, token, 'videos')).items) {
        const sec = seconds(v.contentDetails.duration);
        videos.set(v.id, { id: v.id, title: v.snippet.title, published: v.snippet.publishedAt.slice(0, 10), seconds: sec, views: 0, tags: ours.get(v.id)?.tags || ['older', sec <= 180 ? 'older-short' : 'older-long'] });
      }
    }
  } catch (e) { out.note = `Analytics report failed (${e.message}); Data API views shown.`; }
  try {
    out.search = rows(await api(`${A}${range}&metrics=views&dimensions=insightTrafficSourceDetail&filters=insightTrafficSourceType==YT_SEARCH&sort=-views&maxResults=25`, token, 'search terms'));
  } catch (e) { out.searchNote = `Search terms unavailable: ${e.message}`; }
  return out;
}

function formatStats(ch) {
  const by = new Map();
  const add = (tags, views, pct) => tags.forEach((t) => {
    const s = by.get(t) || { n: 0, views: 0, pct: 0, pctN: 0 };
    s.n++; s.views += views;
    if (pct != null) { s.pct += pct; s.pctN++; }
    by.set(t, s);
  });
  if (ch.mode === 'analytics' && ch.top) {
    for (const r of ch.top) add(ch.videos.get(r.video)?.tags || ['older'], r.views, r.averageViewPercentage);
  } else {
    const since = addDays(DATE, -28);
    for (const v of ch.videos.values()) if (v.published >= since) add(v.tags, v.views, null);
  }
  return [...by.entries()].map(([tag, s]) => ({ tag, n: s.n, avg: s.views / s.n, pct: s.pctN ? s.pct / s.pctN : null })).sort((a, b) => b.avg - a.avg);
}

// ---------- Recommendations ----------
const BLOCK = /\b(song|songs|gana|gane|gaana|geet|ringtone|dj|remix|mp3|download|lyrics|dance|rangoli|mehndi|drawing|wallpaper|photo|photos|image|images|pic|pics|shayari|wishes|quotes|movie|serial|film|news|live|rashifal|horoscope|muhurat|time|timing|chamatkar|upay|totka|tone|keyboard|piano|guitar|flute|meme|funny|comedy|game|bhajan|bhajans|aarti|kirtan|chalisa|jaap|dhun|sangeet|qawwali|short video|reels?|whatsapp|attitude|new|hd|4k|full|ai|images?)\b|गाने|गाना|भजन|आरती|डीजे|रिंगटोन|शायरी/i;
const FIT = /(katha|kahani|story|itihas|history|darshan|mandir|temple|dham|kyu|kyon|kyun|kaise|kaun|status|janmotsav|vrat|mahima|rahasya|sheesh|kahan|kab hai)/;
function formatOf(phrase, fallback) {
  if (/status/.test(phrase)) return 'festival status';
  if (/itihas|history/.test(phrase)) return 'long part';
  if (/\b(kyu|kyon|kyun|kaise|kaun|kahan|kab hai)\b/.test(phrase)) return 'noon Dadi-Chhotu';
  if (/darshan|mandir|temple|dham/.test(phrase)) return 'evening darshan';
  if (/katha|kahani|story|vrat/.test(phrase)) return 'morning katha';
  return fallback;
}
const FORMAT_SLOT = { 'morning temple darshan': 'morning', 'morning katha': 'morning', 'evening darshan': 'evening', 'noon Dadi-Chhotu': 'noon', 'long part': 'long', 'festival status': 'status' };
const FORMAT_TAG = { 'morning temple darshan': 'darshan', 'morning katha': 'katha', 'evening darshan': 'darshan', 'noon Dadi-Chhotu': 'Dadi-Chhotu', 'long part': 'long', 'festival status': 'status' };

function recentLog(days) {
  const since = addDays(DATE, -days);
  return read('automation/log.md').split('\n').map((l) => l.split(' | ')).filter((p) => p.length >= 5 && p[0] >= since && p[0] <= DATE);
}
function covered(word, days = 60) {
  const re = new RegExp(`\\b${word.toLowerCase().replace(/[^a-z ]/g, '').trim().split(/\s+/).join('[- ]')}\\b`);
  return recentLog(days).filter((p) => re.test(`${p[2]} ${p[3]} ${p[4].replace(/agla:.*$/, '')}`.toLowerCase())).map((p) => `${p[0].slice(5)} ${p[1]}`);
}

function recommend({ sugg, rising, cal, temps, ch, stats, trends }) {
  const cands = [];
  const sOf = (seed) => sugg.get(seed)?.list || [];
  const posOf = (seed, phrase) => { const i = sOf(seed).indexOf(phrase); return i < 0 ? null : i + 1; };
  const avgAll = stats.length ? stats.reduce((a, s) => a + s.avg * s.n, 0) / Math.max(1, stats.reduce((a, s) => a + s.n, 0)) : 0;
  const factor = (fmt) => { const s = stats.find((x) => x.tag === FORMAT_TAG[fmt]); return s && avgAll ? Math.min(1.3, Math.max(0.8, s.avg / avgAll)) : 1; };
  const allSugg = new Set([...sugg.values()].flatMap((e) => e.list));
  const hindiSeen = (dv) => allSugg.has(dv);
  const searchTerms = (ch?.search || []).map((r) => String(r.insightTrafficSourceDetail).toLowerCase());
  const add = (c) => {
    const ev = [...c.why];
    const p = posOf(c.seed, c.phrase);
    if (p) ev.push(`autocomplete #${p} for "${c.seed}"`);
    if (rising.get(c.seed)?.has(c.phrase)) { ev.push('rising: new this week'); c.score += 25; }
    const hit = searchTerms.find((t) => t.includes(c.subjectWord) || c.phrase.includes(t));
    if (hit) { ev.push(`viewers found us searching "${hit}"`); c.score += 20; }
    const f = factor(c.format);
    if (f !== 1) ev.push(`${FORMAT_TAG[c.format]} videos ${f > 1 ? 'beat' : 'trail'} our average (${Math.round(f * 100)}%)`);
    if (c.subjectWord) {
      const done = covered(c.subjectWord, c.format === 'long part' ? 120 : 60);
      const slot = FORMAT_SLOT[c.format];
      if (done.some((d) => d.endsWith(` ${slot}`))) { ev.push(`already a ${slot} video on it (${done.slice(-3).join(', ')}): only with a clearly new angle`); c.score -= 40; }
      else if (done.length) { ev.push(`covered in other slots (${done.slice(-3).join(', ')}): new angle needed`); c.score -= 8; }
    }
    const dv = deva(c.phrase);
    if (dv && dv !== c.phrase && hindiSeen(dv)) ev.push(`"${dv}" is in Hindi autocomplete too`);
    c.score = (c.score + (p ? 12 - p : 0)) * f;
    c.why = ev;
    cands.push(c);
  };
  const best = (seed, prefer) => sOf(seed).filter((s) => !BLOCK.test(s) && !OFFTOPIC.test(s)).find((s) => prefer.test(s));

  // 1. Festivals today .. +3 days (calendar.md): first, as STORY.md section 1 says.
  for (const f of cal.filter((c) => c.date >= DATE && c.date <= addDays(DATE, 3))) {
    const away = (Date.parse(f.date) - Date.parse(DATE)) / DAY;
    for (const name of f.names.slice(0, 2)) {
      const seed = name.toLowerCase();
      const why = [`${name} on ${fmtDay(f.date)} (calendar.md)`];
      const subjectWord = seed.split(' ')[0];
      // Katha Shorts are cut (owner, 11 Nov 2026: avg 18 views); on a festival day the morning Short is a temple darshan.
      const darshan = best(seed, /darshan|mandir|temple|dham/) || `${seed} darshan`;
      add({ format: 'morning temple darshan', when: fmtDay(f.date), seed, phrase: darshan, subjectWord, why, score: 100 - away * 6 });
      const kyu = best(seed, /kyu|kyon|kyun|kaise|kab hai/) || `${seed} kyu manate hai`;
      if (away <= 1) add({ format: 'noon Dadi-Chhotu', when: fmtDay(f.date), seed, phrase: kyu, subjectWord, why, score: 92 - away * 6 });
      if (away >= 1) add({ format: 'long part', when: `${fmtDay(addDays(f.date, -1))} (eve of ${name})`, seed, phrase: best(seed, /katha|kahani|itihas/) || `${seed} ki katha`, subjectWord, why, score: 80 - away * 5 });
      const st = best(seed, /status/);
      if (st) {
        // The status engine (automation/festivals.json) makes these itself: 20:00 the evening before + 00:30 on the day.
        const pre = fs.existsSync(`story/status/${f.date}.json`) || statusDates().has(f.date);
        add({ format: 'festival status', when: fmtDay(f.date), seed, phrase: st, subjectWord, why: [...why, pre ? 'the status engine already makes this festival\'s status Shorts (20:00 the evening before, 00:30 on the day): do not duplicate' : 'no status Short planned yet'], score: (pre ? 55 : 75) - away * 4 });
      }
    }
  }
  // The noon chain: yesterday's Dadi promised this subject ("agla: ..." in the last noon log line).
  const noonLine = recentLog(30).filter((p) => p[1] === 'noon').pop();
  const promised = noonLine?.[4]?.match(/agla:\s*(.+)$/)?.[1]?.trim();
  if (promised) {
    const seed = [...sugg.keys()].find((k) => !/[ऀ-ॿ]/.test(k) && promised.toLowerCase().replace(/\s+(mandir|dham)$/, '').startsWith(k)) || promised.toLowerCase();
    const phrase = SATI.test(promised) ? `${seed} mandir` : (best(seed, /kyu|kyon|kyun|kahani|katha|itihas|kahan/) || `${seed} ki kahani`);
    const nextNoon = noonLine[0] === DATE ? addDays(DATE, 1) : DATE;
    add({ format: 'noon Dadi-Chhotu', when: fmtDay(nextNoon), seed, phrase, subjectWord: '', why: [`Dadi promised it in the ${noonLine[0].slice(5)} noon Short (agla: ${promised})`, ...(SATI.test(promised) ? ['sati-temple rules apply in full'] : [])], score: 95 });
  }
  // 2. Khatu Shyam ji: the channel's main deity; the Janmotsav countdown when it is within 15 days.
  const jan = cal.find((c) => /janmotsav/i.test(c.text) && c.date >= DATE && c.date <= addDays(DATE, 15));
  const kWhy = jan ? [`Khatu Shyam Janmotsav on ${fmtDay(jan.date)}: searches build up before it`] : ['main deity, at least twice a week'];
  for (const seed of ['khatu shyam', 'khatu shyam katha', 'khatu shyam ka itihas', 'khatu shyam janmotsav', 'barbarik', 'khatu shyam mandir']) {
    const phrase = best(seed, FIT);
    if (phrase) add({ format: formatOf(phrase, 'evening darshan'), when: 'any of the next 3 days', seed, phrase, subjectWord: /barbarik/.test(phrase) ? 'barbarik' : /janmotsav/.test(phrase) ? 'janmotsav' : /itihas|history/.test(phrase) ? 'itihas' : '', why: kWhy, score: jan ? 62 : 50 });
  }
  // 3. Temples: next uncovered ones in mandir-series.md (sati temples are left to the series order, never trend-driven).
  const agla = promised;
  let picked = 0;
  for (const t of temps) {
    if (picked >= 4 || SATI.test(t.name)) continue;
    const seed = t.name.toLowerCase();
    const key = seed.split(' ')[0];
    if (covered(key, 120).length && !(agla && agla.toLowerCase().includes(key))) continue;
    picked++;
    const darshan = best(seed, /darshan|mandir|temple|dham/) || `${seed} mandir`;
    add({ format: 'evening darshan', when: 'a no-festival day', seed, phrase: darshan, subjectWord: key, why: [`next in mandir-series.md (${t.series})`, `${sOf(seed).length} autocomplete suggestions`], score: 45 + sOf(seed).length });
    const itihas = best(seed, /itihas|history|kahani|katha/);
    if (itihas) add({ format: formatOf(itihas, 'long part'), when: 'a no-festival day', seed, phrase: itihas, subjectWord: key, why: [`next in mandir-series.md (${t.series})`], score: 40 + sOf(seed).length });
  }
  // 4. Weekday deity for the next 3 days.
  for (let n = 0; n < 3; n++) {
    const d = addDays(DATE, n);
    for (const key of WEEKDAY_DEITY[weekday(d)]) {
      const dt = DEITIES.find((x) => x.key === key);
      for (const seed of [`${dt.roman} ki katha`, dt.roman]) {
        const phrase = best(seed, /katha|kahani|story|kyu|kyon|kaise/);
        if (phrase) { add({ format: formatOf(phrase, 'morning katha'), when: fmtDay(d), seed, phrase, subjectWord: '', why: [`${DAYS[weekday(d)]} deity`], score: 35 - n * 3 }); break; }
      }
    }
  }
  // 5. Any other rising suggestion that fits the channel.
  for (const [seed, set] of rising) {
    for (const phrase of set) {
      if (BLOCK.test(phrase) || OFFTOPIC.test(phrase) || !FIT.test(phrase) || SATI.test(phrase)) continue;
      add({ format: formatOf(phrase, 'morning katha'), when: 'next 3 days', seed, phrase, subjectWord: '', why: ['new in autocomplete this week'], score: 45 });
    }
  }
  // 6. Devotional Google Trends items.
  for (const t of trends?.kept || []) {
    const q = t.query.toLowerCase();
    if (BLOCK.test(q)) continue;
    add({ format: formatOf(q, 'morning katha'), when: 'today', seed: q, phrase: q, subjectWord: '', why: [`Google Trends IN today (${t.traffic || '?'} searches)`], score: 70 });
  }

  // Rank, dedupe, keep variety: at most 3 per format and 2 per subject.
  const seen = new Set(); const perFmt = {}; const perSubj = {}; const out = [];
  for (const c of cands.sort((a, b) => b.score - a.score)) {
    const subj = c.seed.split(' ').slice(0, 2).join(' ');
    if (seen.has(c.phrase) || (perFmt[c.format] || 0) >= 3 || (perSubj[subj] || 0) >= 2) continue;
    seen.add(c.phrase); perFmt[c.format] = (perFmt[c.format] || 0) + 1; perSubj[subj] = (perSubj[subj] || 0) + 1;
    c.deva = deva(c.phrase) || deva(c.seed) || null;
    out.push(c);
    if (out.length >= 12) break;
  }
  return out.slice(0, Math.max(8, Math.min(12, out.length)));
}

// ---------- Main ----------
async function main() {
  if (fs.existsSync(OUT) && !args.includes('--force')) return { status: 'exists', file: OUT };
  const cal = calendar();
  const temps = temples();
  const festivals = cal.filter((c) => c.date >= DATE && c.date <= addDays(DATE, 14));
  const festSeeds = [...new Set(festivals.flatMap((f) => f.names.map((n) => n.toLowerCase())))];
  const groups = [
    ['Khatu Shyam ji', [...KHATU_ROMAN, ...KHATU_DEVA]],
    [`Festivals (${DATE} to ${addDays(DATE, 14)})`, [...festSeeds, ...festSeeds.map(deva).filter(Boolean)]],
    ['Deities', DEITIES.flatMap((d) => [d.roman, `${d.roman} ki katha`, `${d.key} mandir`, deva(`${d.roman} ki katha`), deva(`${d.key} mandir`)]).filter(Boolean)],
    ['Generic', GENERIC],
    ['Temples (mandir-series.md)', temps.map((t) => t.name.toLowerCase())],
  ];
  const seeds = [...new Set(groups.flatMap(([, s]) => s))];
  const jobs = seeds.flatMap((s) => (/[ऀ-ॿ]/.test(s) ? [[s, 'hi']] : [[s, 'hi'], [s, 'en']]));
  let failed = 0;
  const results = await pool(jobs, 5, async ([s, hl]) => { try { return [s, hl, await suggest(s, hl)]; } catch (e) { failed++; return [s, hl, null, e.message]; } });
  if (failed) note(`Autocomplete: ${failed} of ${jobs.length} requests failed${failed === jobs.length ? ` (${results[0][3]})` : ''}.`);
  const sugg = new Map();
  for (const [s, hl, list] of results) {
    if (!list) continue;
    const e = sugg.get(s) || { list: [], hl: [] };
    for (const x of list) if (!e.list.includes(x)) e.list.push(x);
    e.hl.push(hl);
    sugg.set(s, e);
  }
  const { seen, files } = seenLastWeek();
  const rising = new Map();
  for (const [s, e] of sugg) {
    const old = seen.get(s);
    if (!old) continue;
    const fresh = e.list.filter((x) => !old.has(x));
    if (fresh.length) rising.set(s, new Set(fresh));
  }

  let trends = null;
  try { trends = await trendsIN(); } catch (e) { note(`Google Trends RSS failed: ${e.message}`); }
  let ch = { mode: 'none', videos: new Map() };
  try { ch = await channelData(); } catch (e) { note(`Channel data failed: ${e.message}`); ch = { mode: 'none', videos: new Map() }; }
  if (ch.note) note(ch.note);
  const stats = ch.videos?.size ? formatStats(ch) : [];
  const recs = recommend({ sugg, rising, cal, temps, ch, stats, trends });

  // ---------- Write the file ----------
  const L = [];
  L.push(`# Trend research ${DATE} (${fmtDay(DATE)})`, '');
  L.push(`Made by scripts/trend-signals.mjs at ${new Date().toISOString().slice(11, 16)} UTC. Read **Recommended topics** first; the rest is evidence.`);
  L.push('Festival/calendar rules, accuracy, sati-temple and no-repeat rules (STORY.md) always win over this list.', '');
  L.push('## Recommended topics for the next 3 days', '');
  if (!recs.length) L.push('_No recommendation today (sources failed): use STORY.md section 1 as usual._');
  recs.forEach((r, i) => {
    L.push(`${i + 1}. **${r.format}** (${r.when}): \`${r.phrase}\` | \`${r.deva || '(no Devanagari form: write it from the Roman)'}\``);
    L.push(`   Why: ${r.why.join('; ')}.`);
  });
  L.push('');
  L.push('Use the phrase naturally in the title (Roman ` | ` Devanagari). Skip any item that is off-topic, political, controversial or needs a claim you cannot source.', '');

  L.push('## Rising in YouTube autocomplete (new vs the last 7 days)', '');
  if (!files) L.push('_First file (no earlier trend files): today is the baseline; rising starts tomorrow._');
  else if (!rising.size) L.push(`_Nothing new vs ${files} earlier file(s)._`);
  else {
    // Only the suggestions that fit our formats are listed (at most 15 seeds); the rest are counted.
    const fits = (x) => !BLOCK.test(x) && !OFFTOPIC.test(x) && FIT.test(x);
    const shown = [...rising].filter(([, set]) => [...set].some(fits)).slice(0, 15);
    shown.forEach(([s, set]) => L.push(`- ${s}: ${[...set].filter(fits).join(' · ')}`));
    const other = [...rising.values()].reduce((a, set) => a + [...set].filter((x) => !fits(x)).length, 0);
    L.push('', `(${shown.length ? '' : 'None fits our formats. '}${other} other new suggestion(s), mostly songs, bhajans or rangoli, are marked ↑ in the lists below.)`);
  }
  L.push('');

  L.push('## Google Trends India today (devotional and festival items only)', '');
  if (!trends) L.push('_Feed unavailable today._');
  else if (!trends.kept.length) L.push(`_None of today's ${trends.total} trending searches is devotional._`);
  else trends.kept.forEach((t) => L.push(`- **${t.query}** (${t.traffic || '?'}): ${t.news.join(' / ')}`));
  L.push('');

  L.push('## Our channel (last 28 days)', '');
  if (ch.mode === 'none') L.push('_Channel data unavailable today._');
  if (ch.note) L.push(`> ${ch.note}`, '');
  if (ch.mode === 'analytics' && ch.top) {
    L.push('| Views | Avg view % | Video | Formats |', '|---:|---:|---|---|');
    ch.top.slice(0, 12).forEach((r) => { const v = ch.videos.get(r.video); L.push(`| ${r.views} | ${Math.round(r.averageViewPercentage)}% | ${(v?.title || r.video).replace(/\|/g, '/')} | ${(v?.tags || []).join(', ')} |`); });
  } else if (ch.videos?.size) {
    const since = addDays(DATE, -28);
    L.push('| Views (lifetime) | Published | Video | Formats |', '|---:|---|---|---|');
    [...ch.videos.values()].filter((v) => v.published >= since).sort((a, b) => b.views - a.views).slice(0, 12)
      .forEach((v) => L.push(`| ${v.views} | ${v.published.slice(5)} | ${v.title.replace(/\|/g, '/')} | ${v.tags.join(', ')} |`));
  }
  if (stats.length) {
    L.push('', '**Which formats win** (average views per video' + (ch.mode === 'analytics' ? ', average view percentage' : '') + '):', '');
    stats.forEach((s) => L.push(`- ${s.tag}: ${Math.round(s.avg)} views avg over ${s.n} video(s)${s.pct != null ? `, ${Math.round(s.pct)}% watched` : ''}`));
  }
  L.push('', '**YouTube search terms that brought viewers:**', '');
  if (ch.search?.length) ch.search.forEach((r) => L.push(`- ${r.insightTrafficSourceDetail}: ${r.views} views`));
  else L.push(`_${ch.searchNote || (ch.mode === 'analytics' ? 'None in the last 28 days.' : 'Needs the yt-analytics.readonly scope (owner re-auth, see the note above).')}_`);
  L.push('');

  L.push('## YouTube autocomplete (gl=IN; hl=hi + hl=en merged; ↑ = new vs the last 7 days)', '');
  const listed = new Set();
  for (const [title, list] of groups) {
    L.push(`### ${title}`, '');
    for (const s of [...new Set(list)].filter((x) => !listed.has(x))) {
      listed.add(s);
      const e = sugg.get(s);
      if (!e || !e.list.length) continue;
      L.push(`- **${s}** → ${e.list.map((x) => (rising.get(s)?.has(x) ? `↑ ${x}` : x)).join(' · ')}`);
    }
    L.push('');
  }
  if (notes.length) L.push('## Source notes', '', ...notes.map((n) => `- ${n}`), '');

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, L.join('\n'));
  return {
    status: 'ok', file: OUT, seeds: seeds.length, requests: jobs.length, failed, rising: [...rising.values()].reduce((a, s) => a + s.size, 0),
    trends: trends ? trends.kept.length : null, channel: ch.mode, searchTerms: ch.search?.length ?? 0, recommendations: recs.length,
  };
}

try {
  console.log(JSON.stringify(await main()));
} catch (e) {
  console.log(JSON.stringify({ status: 'error', error: e.message }));
  process.exitCode = 1;
}
