#!/usr/bin/env node
// Checks story/today/scenes.json against automation/STORY.md before anything is rendered or posted.
//   node scripts/validate.mjs story/today/scenes.json
//   node scripts/validate.mjs [--long] story/long/scenes.json    the daily long katha video (STORY.md section 5)
//   --soft-topics   the "one subject per day" check (scripts/topics.mjs) only warns; the workflow's own Validate steps
//                   pass it, so while the story is written the clash must be fixed, but it never stops a post.
// Prints each problem and exits 1 if there are any.
import fs from 'node:fs';
import { topicWarnings } from './topics.mjs';

const longMode = process.argv.includes('--long');
const file = process.argv.slice(2).find((a) => !a.startsWith('--')) || 'story/today/scenes.json';
const s = JSON.parse(fs.readFileSync(file, 'utf8'));
const problems = [];
const need = (ok, msg) => { if (!ok) problems.push(msg); };
const DEVANAGARI = /[ऀ-ॿ]/;
const BAIT = /share\s*kar(o|ein|na)?\s*(warna|nahi\s*to)|paisa\s*aayega|dhan\s*varsha\s*hogi|guaranteed|100\s*%|bad\s*luck|ignore\s*mat|type\s*karo\s*jai|miracle|chamatkar\s*pakka/i;
const PLAYLISTS = ['Khatu Shyam ji ki Kathayein', 'Shiv ji ki Kathayein', 'Hanuman ji ki Kathayein', 'Ganesh ji ki Kathayein',
  'Vishnu ji aur Krishna ki Kathayein', 'Maa Durga aur Devi ki Kathayein', 'Shani Dev ki Kathayein', 'Surya Dev ki Kathayein', 'Tyohar aur Vrat Kathayein', 'Mandir Itihas',
  '12 Jyotirlinga', 'Char Dham', 'Shakti Peeth', 'Ashtavinayak', 'Panch Kedar', 'Sapta Puri', 'Pancha Bhoota Sthalam',
  'Krishna Leela Dham', 'Hanuman ji ke Prasiddh Mandir', 'Navagraha Mandir', 'Prasiddh Mandir'];

// ---- Hook, title and cover formulas (STORY.md "Hook, title and cover formulas"; channel data of 6 Nov 2026) ---------
// Winners name the deity, temple or festival in the first 2 seconds, in the title's first words and on the opening
// frame (Dhanteras Status 280 views in 5 h, Moravinandan Khatu Shyam 173, Shakambhari Mata Sakrai 159, Salasar Balaji
// 133); slow intros ("Aaj suniye...", "Aaj somvar hai", "Dadi, ...") sat at 0-16 views.
const NAMES = new RegExp('\\b(' + [
  'khatu', 'shyam', 'barbarik', 'moravi', 'shiv', 'shiva', 'mahadev', 'bholenath', 'shankar', 'neelkanth', 'hanuman', 'bajrang',
  'balaji', 'sankat ?mochan', 'ganesh', 'ganpati', 'ganesha', 'vinayak', 'gajanan', 'vishnu', 'narayan', 'hari', 'krishna',
  'kanha', 'kanhaiya', 'govind', 'gopal', 'bihari', 'radha', 'ram', 'rama', 'raghunath', 'sita', 'lakshman', 'lakshmi',
  'durga', 'maa', 'mata', 'devi', 'ambe', 'kali', 'santoshi', 'saraswati', 'parvati', 'gauri', 'shani', 'surya', 'sai',
  'ganga', 'yamuna', 'tulsi', 'dhanvantari', 'kuber', 'yamraj', 'chhathi', 'gajendra', 'markandeya', 'prahlad', 'narsimha',
  'narasimha', 'dhruv', 'sudama', 'savitri', 'nachiketa', 'bhagirath', 'parshuram', 'vaman', 'jagannath', 'vitthal',
  'dhanteras', 'diwali', 'deepawali', 'dipawali', 'deepotsav', 'narak', 'govardhan', 'annakut', 'bhai ?dooj', 'chhath',
  'ekadashi', 'purnima', 'amavasya', 'navratri', 'dussehra', 'janmashtami', 'shivratri', 'holi', 'karwa', 'ahoi',
  'janmotsav', 'sawan', 'kartik', 'jyotirlinga', 'shakti ?peeth', 'kedarnath', 'badrinath', 'somnath', 'mahakal',
  'mahakaleshwar', 'omkareshwar', 'mallikarjun', 'kashi', 'vishwanath', 'vrindavan', 'ayodhya', 'mathura', 'salasar',
  'mehandipur', 'jeen', 'shakambhari', 'karni', 'rani sati', 'dadi', 'pushkar', 'brahma', 'kaila', 'eklingji', 'nathdwara',
  'shrinathji', 'sanwaliya', 'tirupati', 'vaishno', 'kamakhya', 'char dham', 'ashtavinayak',
].join('|') + ')', 'i');
const GENERIC = new Set(['ki', 'ka', 'ke', 'aur', 'mein', 'me', 'se', 'ko', 'hai', 'ji', 'jai', 'shree', 'shri', 'katha', 'kahani',
  'darshan', 'status', 'video', 'shorts', 'sampoorn', 'mandir', 'dham', 'temple', 'kyun', 'kya', 'kaise', 'baba', 'part', 'the']);
const words = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/[\s-]+/).filter((w) => w.length >= 3 && !GENERIC.has(w));
// Weak openers: greetings, "today" intros and slow build-ups, in Roman (hook, sub) and Devanagari (tts).
const WEAK_OPENER = /^(aaj\s+(suniye|sunte|hum|ham|ki\s+katha|ke\s+video|main|mai|mein|ka\s+din)|aaj\s+(somvar|mangalvar|budhvar|guruvar|shukravar|shanivar|ravivar)|namaste|namaskar|pranam|ram\s+ram\s+(ji|sa)|jai\s+shree\s+(shyam|ram|krishna)\s+(doston|bhakto|dosto)|doston|dosto|bhakto|bhaktjan|pyare|swagat|welcome|hello|hi\b|chaliye|aaiye|aaye|aaj\s+hum|is\s+video|iss\s+video|ek\s+baar\s+ki\s+baat|bahut\s+(samay|pehle|purani)|suniye|dekhiye|dadi\s*(maa)?\s*,)/i;
const WEAK_OPENER_DEV = /^(आज\s+(सुनिए|सुनते|हम|की\s+कथा|का\s+दिन|सोमवार|मंगलवार|बुधवार|गुरुवार|शुक्रवार|शनिवार|रविवार)|नमस्ते|नमस्कार|प्रणाम|दोस्तों|भक्तों|स्वागत|चलिए|आइए|एक\s+बार\s+की\s+बात|बहुत\s+समय\s+पहले|सुनिए|दादी\s*(माँ)?\s*,)/;
const VALUE = /\b(darshan|status|katha|kahani|rahasya|itihas|shubh|divya|adbhut|anokh[ia]|pavan|prachin|sampoorn|sachchi|sacchi|vrat|puja|pooja|aarti|vishesh|mahatva|kyun|kaise|shubhkamnayein|janmotsav|2026|2027)\b|दर्शन|स्टेटस|कथा|कहानी|रहस्य|इतिहास|शुभ|दिव्य|अद्भुत|अनोख|पावन|प्राचीन|संपूर्ण|सम्पूर्ण|व्रत|पूजा|आरती|विशेष|महत्व|क्यों|कैसे|शुभकामना/i;
const romanTitle = (yt) => String(yt || '').replace(/#shorts/gi, '').split('|')[0].trim();
const devTitle = (yt) => (String(yt || '').replace(/#shorts/gi, '').split('|').map((p) => p.trim()).find((p) => DEVANAGARI.test(p)) || '');
const titleKeys = words(romanTitle(s.youtube_title)).concat(words(s.temple), words(s.deity));
const named = (t) => NAMES.test(t || '') || words(t).some((w) => titleKeys.includes(w));
// Today's searched phrases (automation/trends/<date>.md, Recommended topics): `roman` | `देवनागरी`.
const trendPhrases = (() => {
  const day = (s.slug || '').slice(0, 10);
  const dir = 'automation/trends';
  if (!fs.existsSync(dir)) return [];
  const f = fs.readdirSync(dir).filter((x) => x.endsWith('.md') && x.slice(0, 10) <= day).sort().pop();
  if (!f) return [];
  return [...fs.readFileSync(`${dir}/${f}`, 'utf8').matchAll(/`([^`]+)`\s*\|\s*`([^`]+)`/g)].map((m) => m[1].toLowerCase());
})();
const notes = [];

// ---- One subject per day (scripts/topics.mjs, STORY.md section 1) ----------------------------------------------------
// No two uploads of the same day (any slot, the long video, the status Short by title) and none of the 2 days before
// with the same title words or subject: 7-9 Nov 2026 had "Diwali Lakshmi Puja" + "Diwali ki Katha, Lakshmi Puja" on one
// day and "Govardhan Puja ki Katha" twice in 3 days, all at 0-9 views. Soft rule: a problem while writing (pick
// another angle), only a warning with --soft-topics (the workflow), so it never blocks a post.
if (!['status', 'movie'].includes(s.format)) {
  let clashes = [];
  try { clashes = topicWarnings(s); } catch (e) { console.log(`warning: topic check skipped (${e.message})`); }
  for (const w of clashes) {
    if (process.argv.includes('--soft-topics')) console.log(`${process.env.GITHUB_ACTIONS ? '::warning::' : 'warning: '}${w}`);
    else problems.push(w);
  }
}

function checkHook(hook, what = 'hook') {
  need(!WEAK_OPENER.test(String(hook || '').trim()), `${what}: no greeting or slow intro ("Aaj suniye", "Namaste", "Dadi, ..."): open with the name or the question`);
  need(named(hook), `${what}: name the deity, temple or festival (formula: "<Name>: <blessing or curiosity>", e.g. "Salasar Balaji ki daadhi kyun?" or "Shubh Dhanteras! Dhanvantari ka ashirwad")`);
}
function checkOpening(sub, tts, what = 'scene 1') {
  need(!WEAK_OPENER.test(String(sub || '').trim()) && !WEAK_OPENER_DEV.test(String(tts || '').trim()), `${what}: the first spoken words must not be a greeting or slow intro (see the banned openers in STORY.md)`);
  need(named(String(sub || '').slice(0, 55)), `${what}: say the deity, temple or festival name in the first ~2 seconds (within the first 55 characters of sub)`);
}
function checkTitle(maxRoman) {
  const yt = s.youtube_title || '';
  const roman = romanTitle(yt);
  const first = roman.split(/\s+/).slice(0, 3).join(' ');
  const trendFirst = trendPhrases.some((p) => roman.toLowerCase().startsWith(p.split(' ').slice(0, 2).join(' ')));
  need(roman.length >= 8 && roman.length <= maxRoman, `youtube_title: the Roman part (before " | ") is ${roman.length} characters; keep it 8-${maxRoman} so the searched phrase is not cut off in search`);
  need(NAMES.test(first) || words(first).some((w) => words(`${s.temple || ''} ${s.deity || ''}`).includes(w)) || trendFirst,
    `youtube_title: start with the searched name (deity, temple or festival) in the first 3 words, e.g. "Salasar Balaji Dham, Churu | सालासर बालाजी धाम #Shorts" (is "${first}")`);
  need(VALUE.test(yt), 'youtube_title: add one value or emotional word (Darshan, Katha, Status, Rahasya, Itihas, Shubh, Divya, Adbhut, Sampoorn...)');
  if (trendPhrases.length && !trendPhrases.some((p) => yt.toLowerCase().includes(p))) notes.push(`note: no searched phrase from automation/trends is in the title (e.g. "${trendPhrases.slice(0, 3).join('", "')}"); use one if it fits the subject`);
}
function checkCover() {
  const c = String(s.cover || '').trim();
  const n = c.split(/\s+/).filter(Boolean).length;
  need(c && DEVANAGARI.test(c) && n >= 2 && n <= 4 && c.length <= 24, `cover: 2-4 big Devanagari words, max 24 characters, drawn huge on the first 0.4 s (the frame YouTube shows as the Short's thumbnail), e.g. "सालासर बालाजी धाम" (is "${c}")`);
  const dev = devTitle(s.youtube_title).split(/\s+/).filter((w) => w.length >= 2 && !['की', 'का', 'के', 'और', 'में', 'से', 'जी'].includes(w));
  need(!c || dev.some((w) => c.includes(w)), 'cover: use the deity/temple/festival word of the Devanagari title keyword');
}

// ---- Khatu Shyam ji iconography (STORY.md, all formats) ------------------------------------------------------------
// After the sheesh daan Khatu Shyam ji is worshipped as the SHEESH only: a big divine face with large wide eyes and a
// moustache, a tall golden mukut (peacock-feather and sun-ray motifs), an oval of layered white/pink/blue/orange flower
// garlands and jewels, in a decorated sanctum. Never a full body or a flute (that is Shri Krishna). Barbarik as the
// young warrior BEFORE the sheesh daan is fine; a temple building alone is fine.
const allPrompts = [
  ...(s.scenes || []).map((x) => x?.prompt), ...(s.images || []).map((x) => x?.prompt),
  ...Object.values(s.visuals || {}).map((x) => x?.prompt), ...(s.chapters || []).flatMap((c) => (c.scenes || []).map((x) => x?.prompt)),
  s.teaser?.prompt,
].filter((p) => typeof p === 'string');
for (const p of allPrompts) {
  const shows = /(khatu\s*shyam|shyam\s*baba|shyam\s*ji)/i.test(p) && /(darshan|murti|idol|face|deity|sheesh|head of|mukut|crown|shringar)/i.test(p)
    && !/\b(young|warrior|prince)\b[^.]*barbari|barbari[a-z]*[^.]*\b(young|warrior|prince)\b/i.test(p);
  if (!shows) continue;
  const bad = p.replace(/\bno (body|flute|hands|arms)\b/gi, '');
  need(/(sheesh|head only|divine head)/i.test(p) && /(mukut|crown)/i.test(p) && /garland/i.test(p) && !/\b(flute|bansuri|full[- ]body|full[- ]length|whole body|torso|his body|his hands|his arms)\b/i.test(bad),
    `Khatu Shyam ji image: show only the SHEESH (head): "the divine Sheesh (head only, no body, no flute) of Shri Khatu Shyam ji: a big divine dark face with large wide eyes and a moustache, a tall ornate golden mukut with peacock-feather and sun-ray motifs, framed in an oval of layered white, pink, blue and orange flower garlands and jewels, in a decorated sanctum" (prompt: "${p.slice(0, 80)}...")`);
}

// ---- Long video (16:9, 5-10 min) ----------------------------------------------------------------
// Narration runs at ~12 characters a second; each scene adds ~0.8 s and each chapter ~1 s of pause.
const CHARS_PER_SECOND = 12;
const sceneSeconds = (sc) => (sc.endcard ? Math.max(6, (sc.tts || '').length / CHARS_PER_SECOND + 1) : (sc.tts || '').length / CHARS_PER_SECOND + 0.8);
if (longMode || s.format === 'long' || /^\d{4}-\d{2}-\d{2}-long-/.test(s.slug || '')) {
  need(/^\d{4}-\d{2}-\d{2}-long-[a-z0-9-]+$/.test(s.slug || ''), 'slug must be <yyyy-mm-dd>-long-<lowercase-english-slug>');
  need(s.format === 'long', 'format must be "long"');
  need(s.title && s.title.length <= 60 && !DEVANAGARI.test(s.title), `title: Roman Hinglish, 1-60 characters (is ${s.title?.length ?? 0})`);
  need(s.kicker && s.kicker.length <= 22, `kicker must be 1-22 characters (is ${s.kicker?.length ?? 0})`);
  need(['hm_omega', 'hf_alpha'].includes(s.voice), 'voice must be hm_omega or hf_alpha');
  need(PLAYLISTS.includes(s.playlist), `playlist must be one of: ${PLAYLISTS.join(', ')}`);
  need(/no text/i.test(s.style || ''), 'style must include "no text"');
  need(s.hook && s.hook.length <= 38 && !DEVANAGARI.test(s.hook), 'hook: Roman Hinglish, 1-38 characters');
  need(typeof s.source === 'string' && s.source.trim().length >= 8, 'source: name the scriptural/traditional source, e.g. "Skanda Purana ke anusar" or "Lok katha (Khatu Shyam parampara)"');
  need(s.deity && s.deity.length <= 60 && !/[|\n]/.test(s.deity), 'deity: 1-60 characters, no "|"');
  need(s.summary && s.summary.length <= 160 && !/[|\n]/.test(s.summary), 'summary: the story in a few words, max 160 characters, no "|"');

  const images = Array.isArray(s.images) ? s.images : [];
  need(images.length >= 10 && images.length <= 14, `images: 10-14 entries (has ${images.length}); each costs ~170 of the 10,000 free neurons a day, shared with the Shorts`);
  images.forEach((im, i) => {
    need(im && typeof im.prompt === 'string' && im.prompt.length >= 40, `image ${i}: prompt missing or too short`);
    need(!/\b(text|letters|writing|sign|caption|words|logo|title)\b/i.test((im?.prompt || '').replace(/no (text|letters|writing)/gi, '')), `image ${i}: prompt must not ask for text, signs or letters`);
    need(im?.real === undefined || typeof im.real === 'boolean', `image ${i}: real must be true or false`);
  });
  need(s.temple === undefined || /^[a-z0-9-]+$/.test(s.temple), 'temple: lowercase slug from footage/temples.json');
  need(!images.some((im) => im?.real) || s.temple, '"real" images need the "temple" slug');

  const chapters = Array.isArray(s.chapters) ? s.chapters : [];
  need(chapters.length >= 4 && chapters.length <= 8, `chapters: 4-8 including the opening hook chapter (has ${chapters.length})`);
  const scenes = chapters.flatMap((c) => (Array.isArray(c.scenes) ? c.scenes : []));
  need(scenes.length >= 30 && scenes.length <= 60, `30-60 scenes needed (has ${scenes.length})`);
  chapters.forEach((c, k) => {
    const n = (c.scenes || []).length;
    need(c.title && c.title.length >= 3 && c.title.length <= 40 && !DEVANAGARI.test(c.title), `chapter ${k + 1}: title Roman, 3-40 characters`);
    need(n >= 2 && n <= 14, `chapter ${k + 1}: 2-14 scenes (has ${n})`);
    const secs = (c.scenes || []).reduce((t, sc) => t + sceneSeconds(sc), 0);
    need(secs >= 12, `chapter ${k + 1}: too short for a YouTube chapter (~${Math.round(secs)} s, needs 12+)`);
    if (k === 0) need(n <= 3 && secs <= 28, `chapter 1 is the hook: 2-3 scenes, under ~25 s (is ~${Math.round(secs)} s)`);
  });

  const uses = new Array(images.length).fill(0);
  let prev = null;
  scenes.forEach((sc, i) => {
    const n = `scene ${i + 1}`;
    const last = i === scenes.length - 1;
    need(sc.tts && DEVANAGARI.test(sc.tts), `${n}: tts must be Hindi in Devanagari`);
    const max = last ? 160 : 170;
    need(sc.tts && sc.tts.length <= max, `${n}: tts over ${max} characters (${sc.tts?.length})`);
    need(sc.tts && !/\d/.test(sc.tts), `${n}: write numbers in tts as words`);
    need(sc.sub && !DEVANAGARI.test(sc.sub), `${n}: sub must be Roman-script Hinglish`);
    need(sc.sub && sc.sub.length <= 150, `${n}: sub over 150 characters (${sc.sub?.length}); split the scene`);
    if (last) {
      need(sc.endcard === true && sc.img === undefined, `${n}: the last scene must be {"endcard": true, "tts", "sub"} with no img`);
      need(/subscribe/i.test(sc.sub || '') && /like/i.test(sc.sub || ''), `${n}: the end card must ask to like, share and subscribe`);
      return;
    }
    need(!sc.endcard, `${n}: only the last scene can be the end card`);
    need(Number.isInteger(sc.img) && sc.img >= 0 && sc.img < images.length, `${n}: img must be an index into images`);
    if (Number.isInteger(sc.img) && sc.img < images.length) uses[sc.img]++;
    need(['top', 'center', 'bottom'].includes(sc.focus), `${n}: focus must be top, center or bottom`);
    need(['in', 'out', 'pan', 'panl'].includes(sc.motion), `${n}: motion must be in, out, pan or panl`);
    const shot = `${sc.img}/${sc.focus}/${sc.motion}`;
    need(shot !== prev, `${n}: same image, focus and motion as the scene before; change the focus or motion`);
    prev = shot;
  });
  uses.forEach((u, i) => {
    need(u >= 1, `image ${i} is never used; remove it (it would waste neurons)`);
    need(u <= 4, `image ${i} is used ${u} times; max 4`);
  });
  need(!/^(aaj suniye|namaste|namaskar|jai shree shyam|swagat)/i.test(scenes[0]?.sub || ''), 'scene 1 must open with the dramatic moment or a question, not a greeting');
  checkHook(s.hook);
  checkOpening(scenes[0]?.sub, scenes[0]?.tts);
  checkTitle(60);

  // Duration 5-10 min, and a teaser scene ("Aage dekhiye...") at least every ~2.5 min until the last stretch.
  const total = scenes.reduce((t, sc) => t + sceneSeconds(sc), 0) + chapters.length;
  need(total >= 300 && total <= 600, `estimated length ${Math.round(total)} s; must be 300-600 s (5-10 min): adjust the narration (~12 characters a second)`);
  let t = 0, lastTeaser = 0;
  scenes.forEach((sc, i) => {
    if (sc.teaser) lastTeaser = t;
    else if (t - lastTeaser > 150 && t < total - 90) {
      problems.push(`scene ${i + 1} (~${Math.round(t)} s): no teaser scene ("teaser": true) for over 2.5 min`);
      lastTeaser = t;
    }
    t += sceneSeconds(sc);
  });

  const th = s.thumbnail || {};
  need(Number.isInteger(th.image) && th.image >= 0 && th.image < images.length, 'thumbnail.image must be an index into images');
  need(th.text && th.text.length <= 30 && !DEVANAGARI.test(th.text), 'thumbnail.text: Roman Hinglish, 1-30 characters');
  const hiN = String(th.hi || '').trim().split(/\s+/).filter(Boolean).length;
  need(th.hi && DEVANAGARI.test(th.hi) && hiN >= 3 && hiN <= 5 && th.hi.length <= 30, 'thumbnail.hi: 3-5 huge Hindi words in Devanagari, max 30 characters, with the deity/temple/festival name (e.g. "सालासर बालाजी का इतिहास")');
  need(!th.focus || ['top', 'center', 'bottom'].includes(th.focus), 'thumbnail.focus must be top, center or bottom');

  const yt = s.youtube_title || '';
  const desc = s.youtube_description || '';
  need(yt.length > 0 && yt.length <= 100 && !/#shorts/i.test(yt), 'youtube_title: 1-100 characters, no #Shorts');
  need(DEVANAGARI.test(yt), 'youtube_title needs the keyword in Devanagari too ("Roman | देवनागरी")');
  need(!/[<>]/.test(yt + desc + (s.youtube_tags || '')), 'YouTube fields must not contain < or >');
  need(desc.trim().length > 0 && desc.length <= 4000, 'youtube_description: 1-4000 characters (chapters are added on upload)');
  need(s.source && desc.includes(s.source.trim()), 'youtube_description must name the source tradition (the exact "source" text)');
  need(DEVANAGARI.test(desc), 'youtube_description needs a line in Devanagari');
  need(/subscribe/i.test(desc), 'youtube_description must end with a like/share/subscribe line');
  need(!/\b\d{1,2}:\d{2}\b/.test(desc), 'youtube_description must not contain timestamps: chapters are added automatically');
  const tags = (s.youtube_tags || '').split(',').map((x) => x.trim()).filter(Boolean);
  need(tags.length >= 10 && tags.length <= 15, `youtube_tags: 10-15 tags (has ${tags.length})`);
  need(DEVANAGARI.test(s.youtube_tags || ''), 'youtube_tags need some Devanagari search phrases');
  need(!BAIT.test(JSON.stringify(s)), 'remove engagement bait, fear or money/miracle promises');
  if (problems.length) {
    console.log(problems.map((p) => `- ${p}`).join('\n'));
    process.exit(1);
  }
  if (notes.length) console.log(notes.join('\n'));
  console.log(`OK: ${file} (${scenes.length} scenes, ${chapters.length} chapters, ${images.length} images, ~${Math.round(total)} s)`);
  process.exit(0);
}

// ---- Festival "WhatsApp status" Short (story/status/<date>.json, published 06:00 IST on the day) ----------------
// 15-30 s vertical: 2-3 darshan scenes with a big Hindi blessing (Devanagari overlay), an optional well-known mantra,
// then the end card with the fixed share/subscribe line. Written in advance, so this check is strict.
if (s.format === 'status') {
  need(/^\d{4}-\d{2}-\d{2}-status-[a-z0-9-]+$/.test(s.slug || ''), 'slug must be <yyyy-mm-dd>-status-<lowercase-english-slug>');
  need(s.date && (s.slug || '').startsWith(s.date), 'date must be the festival day (YYYY-MM-DD) and start the slug');
  need(/^\d{2}:\d{2}$/.test(s.publish_at || ''), 'publish_at: IST time on the festival day, e.g. "06:00"');
  need(s.kicker && s.kicker.length <= 22 && !DEVANAGARI.test(s.kicker), 'kicker: Roman, 1-22 characters (drawn beside the logo)');
  need(s.title && s.title.length <= 30 && !DEVANAGARI.test(s.title), 'title: Roman, max 30 characters (the channel name watermark)');
  need(['hm_omega', 'hf_alpha'].includes(s.voice), 'voice must be hm_omega or hf_alpha');
  need(PLAYLISTS.includes(s.playlist), `playlist must be one of: ${PLAYLISTS.join(', ')}`);
  need(/no text/i.test(s.style || ''), 'style must include "no text"');
  const end = s.endline || 'Apne parivaar ko bhejein 🙏 | Subscribe: Shyam Premi SN';
  need(/bhejein/i.test(end) && /Subscribe: Shyam Premi SN/.test(end), 'endline must be "Apne parivaar ko bhejein 🙏 | Subscribe: Shyam Premi SN"');
  const scenes = Array.isArray(s.scenes) ? s.scenes : [];
  need(scenes.length >= 3 && scenes.length <= 4, `2-3 darshan scenes plus the end card (has ${scenes.length} scenes)`);
  let secs = 0, animated = 0;
  scenes.forEach((sc, i) => {
    const n = `scene ${i + 1}`;
    const last = i === scenes.length - 1;
    need(sc.tts && DEVANAGARI.test(sc.tts) && sc.tts.length <= 110 && !/\d/.test(sc.tts), `${n}: tts Devanagari, max 110 characters, numbers as words`);
    need(sc.sub && !DEVANAGARI.test(sc.sub), `${n}: sub must be Roman Hinglish`);
    need(sc.hold === undefined || (sc.hold >= 3 && sc.hold <= 9), `${n}: hold 3-9 seconds`);
    secs += Math.max(2.6, sc.hold || 0, (sc.tts || '').length / 12 + 0.7);
    if (last) {
      need(sc.endcard === true && !sc.prompt, `${n}: the last scene must be the end card (no prompt)`);
      return;
    }
    need(!sc.endcard, `${n}: only the last scene can be the end card`);
    need(sc.prompt && sc.prompt.length >= 40 && !/\b(text|letters|writing|sign|caption|words|logo)\b/i.test(sc.prompt), `${n}: prompt missing, too short, or asks for text`);
    need(sc.big && DEVANAGARI.test(sc.big) && sc.big.length <= 26, `${n}: big: the Hindi blessing in Devanagari, max 26 characters (drawn ~118 px)`);
    need(sc.line === undefined || (DEVANAGARI.test(sc.line) && sc.line.length <= 48), `${n}: line: Devanagari, max 48 characters`);
    need(sc.mantra === undefined || (DEVANAGARI.test(sc.mantra) && sc.mantra.length <= 90), `${n}: mantra: Devanagari, max 90 characters`);
    need(['in', 'out', 'pan'].includes(sc.motion), `${n}: motion must be in, out or pan`);
    if (sc.animate !== undefined) {
      animated++;
      need(typeof sc.animate === 'string' && sc.animate.length >= 20 && sc.animate.length <= 300, `${n}: animate: one English sentence of gentle motion`);
    }
  });
  secs -= 0.4 * Math.max(0, scenes.length - 1);
  need(secs >= 15 && secs <= 30, `estimated length ${Math.round(secs)} s; a status video is 15-30 s`);
  need(animated >= 1 && animated <= 3, `mark 1-3 scenes with "animate" (has ${animated})`);
  // A mantra or shloka is shown only with its tradition named in the description (and it must be the standard text).
  if (scenes.some((sc) => sc.mantra)) need(s.mantra_source && (s.youtube_description || '').includes(s.mantra_source), 'mantra_source: name the mantra\'s tradition, and put the same text in youtube_description');
  const yt = s.youtube_title || '';
  need(yt.length > 0 && yt.length <= 90 && yt.endsWith(' #Shorts') && DEVANAGARI.test(yt), 'youtube_title: max 90 characters, "Roman | देवनागरी #Shorts"');
  checkTitle(48);
  const desc = s.youtube_description || '';
  need(desc.length <= 4200 && /subscribe/i.test(desc) && /sanketik/i.test(desc), 'youtube_description: max 4200 characters (the download link is added on upload), a subscribe line and "Chitra AI dwara banaye gaye hain (sanketik)"');
  need(!/[<>]/.test(yt + desc + (s.youtube_tags || '')), 'YouTube fields must not contain < or >');
  const tags = (s.youtube_tags || '').split(',').map((t) => t.trim()).filter(Boolean);
  need(tags.length >= 10 && tags.length <= 15 && DEVANAGARI.test(s.youtube_tags || ''), `youtube_tags: 10-15 tags with some Devanagari (has ${tags.length})`);
  need(s.instagram_caption && s.instagram_caption.length <= 2200 && !DEVANAGARI.test(s.instagram_caption), 'instagram_caption: Roman, 1-2200 characters');
  need((s.facebook_caption || '').trim() && !DEVANAGARI.test(s.facebook_caption), 'facebook_caption: Roman, not empty');
  need(!BAIT.test(JSON.stringify(s)), 'remove engagement bait, fear or money/miracle promises');
  if (problems.length) {
    console.log(problems.map((p) => `- ${p}`).join('\n'));
    process.exit(1);
  }
  console.log(`OK: ${file} (status, ${scenes.length} scenes, ~${Math.round(secs)} s)`);
  process.exit(0);
}

// ---- Movie part (story/movies/<series>/part-<n>.json, STORY.md section 7) ------------------------------------------
// Speaking pace: edge-tts hi-IN Madhur ~13.6 Devanagari characters a second at +0%, Swara ~11.6 (measured 4 Nov 2026),
// scaled by each character's rate; +0.3-0.75 s pause per line, +2 s title beat. A part is a vertical Short: <= 175 s.
if (s.format === 'movie') {
  const castLib = JSON.parse(fs.readFileSync('characters/cast/cast.json', 'utf8')).characters;
  need(/^\d{4}-\d{2}-\d{2}-movie-[a-z0-9-]+-part-\d$/.test(s.slug || '') && (s.slug || '').startsWith(s.release || '#'), 'slug: <release yyyy-mm-dd>-movie-<series>-part-<n>');
  need(s.slug?.endsWith(`-part-${s.part}`) && s.slug?.includes(`-movie-${s.series}-`), 'slug must carry the series and part number');
  const seriesFile = `story/movies/${s.series}/series.json`;
  const series = fs.existsSync(seriesFile) ? JSON.parse(fs.readFileSync(seriesFile, 'utf8')) : null;
  need(series, `series plan ${seriesFile} missing`);
  need(Number.isInteger(s.part) && Number.isInteger(s.parts) && s.parts >= 2 && s.parts <= 4 && s.part >= 1 && s.part <= s.parts, 'part/parts: 2-4 parts, part 1..parts');
  if (series) {
    need(series.parts?.length === s.parts, `parts (${s.parts}) must match ${seriesFile} (${series.parts?.length})`);
    const row = series.parts?.find((p) => p.part === s.part);
    need(row && row.release === s.release, `release ${s.release} must match the series plan (${row?.release})`);
    const facts = series.facts || [];
    need(facts.length >= 3, 'series.json facts: at least 3 {claim, sources: [2+ URLs]}');
    facts.forEach((f, i) => need(f?.claim && (f.sources || []).filter((u) => /^https?:\/\//.test(u)).length >= 2, `series fact ${i + 1}: a claim and 2 independent source URLs`));
  }
  need(/^\d{2}:\d{2}$/.test(s.publish_at || ''), 'publish_at: IST time on the release day, e.g. "07:00"');
  need(s.title && s.title.length <= 40 && !DEVANAGARI.test(s.title), 'title: the part title, Roman, max 40 characters (drawn on the title card)');
  need(s.series_title && s.series_title.length <= 40 && !DEVANAGARI.test(s.series_title), 'series_title: Roman, max 40 characters');
  need(s.hook && s.hook.length <= 38 && !DEVANAGARI.test(s.hook), 'hook: Roman, max 38 characters');
  checkHook(s.hook);
  need(s.playlist && s.playlist.length <= 60, 'playlist: the series playlist (created on first upload)');
  need(/no text/i.test(s.style || ''), 'style must include "no text"');
  need(s.source && (s.youtube_description || '').toLowerCase().includes(s.source.split(';')[0].trim().toLowerCase()), 'source: the tradition, and the same words in youtube_description');
  need(s.deity && !/[|\n]/.test(s.deity) && s.summary && s.summary.length <= 160 && !/[|\n]/.test(s.summary), 'deity and summary (max 160 characters, no "|") for the log line');
  const cast = Array.isArray(s.cast) ? s.cast : [];
  cast.forEach((c) => need(castLib[c], `cast "${c}" is not in characters/cast/cast.json (add the character with a sheet and a voice first)`));
  const scenes = Array.isArray(s.scenes) ? s.scenes : [];
  need(scenes.length >= 5 && scenes.length <= 9, `5-9 scenes (has ${scenes.length})`);
  let secs = 2, nLines = 0, animated = 0, heroes = 0;
  const spoken = (l) => {
    const v = castLib[l.who]?.voice || {};
    const rate = 1 + parseInt(v.rate || '0', 10) / 100;
    return (l.tts || '').length / ((/Swara/.test(v.edge || '') ? 11.6 : 13.6) * rate) + 0.55;
  };
  const checkLine = (l, n) => {
    need(castLib[l.who] && (cast.includes(l.who) || l.who === 'narrator'), `${n}: who "${l.who}" must be in the spec's cast`);
    need(l.tts && DEVANAGARI.test(l.tts) && l.tts.length <= 110 && !/\d/.test(l.tts), `${n}: tts Devanagari, max 110 characters, numbers as words`);
    need(l.sub && !DEVANAGARI.test(l.sub) && l.sub.length <= 120, `${n}: sub Roman Hinglish, max 120 characters`);
    need(l.shot === undefined || ['wide', 'close'].includes(l.shot), `${n}: shot must be "wide" or "close"`);
    secs += spoken(l); nLines++;
  };
  scenes.forEach((sc, i) => {
    const n = `scene ${i + 1}`;
    need(sc.prompt && sc.prompt.length >= 40 && !/\b(text|letters|writing|sign|caption|words|logo)\b/i.test(sc.prompt.replace(/no (text|letters|writing)/gi, '')), `${n}: prompt missing, too short, or asks for text`);
    need(!/\b(blood|gore|beheaded|severed|decapitat|corpse|dead body|wound|killing)/i.test((sc.prompt || '').replace(/\bno (blood|gore|violence)\b/gi, '')),`${n}: no gore or violence in images (the sheesh daan is shown with light and petals, never a cut)`);
    (sc.cast || []).forEach((c) => need(cast.includes(c), `${n}: cast "${c}" is not in the spec's cast`));
    need(['in', 'out', 'pan', undefined].includes(sc.motion), `${n}: motion in, out or pan`);
    if (sc.animate !== undefined) {
      animated++;
      need(typeof sc.animate === 'string' && sc.animate.length >= 20 && sc.animate.length <= 300 && !/\b(run|running|fight|fighting|dance|dancing|battle|explod|lightning|fast)\b/i.test(sc.animate), `${n}: animate: one sentence of GENTLE motion (no running, fighting, dancing, lightning)`);
    }
    if (sc.hero) heroes++;
    const lines = Array.isArray(sc.lines) ? sc.lines : [];
    need(lines.length >= 1 && lines.length <= 6, `${n}: 1-6 lines`);
    lines.forEach((l, k) => checkLine(l, `${n} line ${k + 1}`));
    // Deities never lip-sync, Khatu Shyam ji speaks only as the sheesh (cast "khatu-shyam").
    lines.forEach((l, k) => need(!(castLib[l.who]?.kind === 'deity' && l.shot === 'close' && castLib[l.who]?.lipsync), `${n} line ${k + 1}: deities have no lip-sync`));
  });
  const first = scenes[0]?.lines?.[0];
  if (first) checkOpening(first.sub, first.tts, 'scene 1 line 1');
  need(animated >= 2 && animated <= 6, `mark 2-6 scenes with "animate" (has ${animated}); the GPU tier decides how many become clips`);
  need(heroes <= 1, 'at most one scene with "hero": true');
  need(s.teaser?.prompt && s.teaser.prompt.length >= 40, 'teaser.prompt: the "Agle part mein..." image (next part\'s key moment, or the next series on the last part)');
  if (s.teaser) checkLine({ who: 'narrator', ...s.teaser }, 'teaser');
  need(/(agle|agli|aakhiri)/i.test(s.teaser?.sub || ''), 'teaser.sub must start the cliffhanger ("Agle bhaag mein..." / "Agli series mein...")');
  if (s.endcard) checkLine({ who: 'narrator', ...s.endcard }, 'endcard');
  need(/subscribe/i.test(s.endcard?.sub || '') && /like/i.test(s.endcard?.sub || ''), 'endcard.sub: a gentle like/share/subscribe ask');
  if (s.part < s.parts) need(/kal|7 baje/i.test(s.endcard?.sub || ''), 'endcard.sub: say when the next part comes ("Part 2 kal subah 7 baje")');
  need(secs >= 100 && secs <= 175, `estimated length ${Math.round(secs)} s; a part is 100-175 s (a Short stays under 3 min)`);
  need(nLines >= 12 && nLines <= 32, `12-32 spoken lines (has ${nLines})`);
  // Sati series (mandir-series.md): the full sati rule, plus no fire imagery in any prompt.
  if (/sati/i.test(`${s.series || ''} ${s.title || ''} ${s.temple || ''}`)) {
    const txt = scenes.flatMap((sc) => sc.lines.map((l) => l.sub)).join(' ');
    need(/pratibandhit/i.test(txt) && /Sati Nivaran Adhiniyam 1987/.test(s.youtube_description || ''), 'sati series: the disclaimer must be spoken ("...pratibandhit hai...") and in the description (Sati Nivaran Adhiniyam 1987)');
    need(!scenes.some((sc) => /\b(fire|flame|pyre|burn|blaze|cremat|smoke)\b/i.test(sc.prompt || '')) && !/\b(fire|flame|pyre|burn)\b/i.test(s.teaser?.prompt || ''), 'sati series: no fire, pyre, smoke or burning in any image prompt');
  }
  const yt = s.youtube_title || '';
  need(yt.length > 0 && yt.length <= 90 && yt.endsWith(' #Shorts') && DEVANAGARI.test(yt) && /part\s*\d|भाग/i.test(yt), 'youtube_title: max 90 characters, "Roman ... Part n | देवनागरी #Shorts"');
  checkTitle(60);
  const desc = s.youtube_description || '';
  need(/sanketik/i.test(desc) && /subscribe/i.test(desc) && DEVANAGARI.test(desc), 'youtube_description: the AI line ("Chitra AI dwara banaye gaye hain (sanketik)"), a Devanagari line and a subscribe line');
  need(!/[<>]/.test(yt + desc + (s.youtube_tags || '')), 'YouTube fields must not contain < or >');
  const tags = (s.youtube_tags || '').split(',').map((t) => t.trim()).filter(Boolean);
  need(tags.length >= 10 && tags.length <= 15 && DEVANAGARI.test(s.youtube_tags || ''), `youtube_tags: 10-15 tags with some Devanagari (has ${tags.length})`);
  need(s.instagram_caption && s.instagram_caption.length <= 2200 && !DEVANAGARI.test(s.instagram_caption), 'instagram_caption: Roman, 1-2200 characters');
  need((s.facebook_caption || '').trim() && !DEVANAGARI.test(s.facebook_caption), 'facebook_caption: Roman, not empty');
  need(!BAIT.test(JSON.stringify(s)), 'remove engagement bait, fear or money/miracle promises');
  if (problems.length) {
    console.log(problems.map((p) => `- ${p}`).join('\n'));
    process.exit(1);
  }
  for (const n of notes) console.log(n);
  console.log(`OK: ${file} (movie part ${s.part}/${s.parts}, ${scenes.length} scenes, ${nLines} lines, ~${Math.round(secs)} s)`);
  process.exit(0);
}

// ---- "Dadi aur Chhotu" dialogue Short (noon slot, STORY.md section 6) -----------------------------
// Speaking pace measured with edge-tts on 4 Nov 2026: Dadi (Swara, -15%) ~9.9 Devanagari characters a second,
// Chhotu (Madhur, +4%, pitched up) ~14.2; each turn adds ~0.65-0.75 s of pause (longer when the speaker changes).
// Sati temples (automation/mandir-series.md): no fair/mela/procession talk at all, and the legal disclaimer is required.
if (/sati/i.test(`${s.slug || ''} ${s.temple || ''} ${s.title || ''}`)) {
  const all = JSON.stringify(s);
  need(!/(mela|yatra|juloos|jaloos|procession|bhado|bhadi|amavasya)|मेला|यात्रा|भादो|भादी|अमावस्या/i.test(all), 'sati temple: never mention a mela, yatra, procession or the Bhado/Bhadi amavasya gathering (mandir-series.md)');
  need(/Sati Nivaran Adhiniyam 1987/.test(all), 'sati temple: the legal disclaimer (Sati Nivaran Adhiniyam 1987) must be spoken and in the description');
  need(!/balidaan|amar tyag|mahima|chita|agni|aag/i.test(all), 'sati temple: no praise of the act and no fire imagery');
}

if (s.format === 'dialogue') {
  need(/^\d{4}-\d{2}-\d{2}-noon-[a-z0-9-]+$/.test(s.slug || ''), 'slug must be <yyyy-mm-dd>-noon-<lowercase-english-slug>');
  need(s.title && s.title.length <= 45 && !DEVANAGARI.test(s.title), `title: Roman Hinglish, 1-45 characters (is ${s.title?.length ?? 0})`);
  need(s.kicker && s.kicker.length <= 22, `kicker must be 1-22 characters (is ${s.kicker?.length ?? 0})`);
  need(PLAYLISTS.includes(s.playlist), `playlist must be one of: ${PLAYLISTS.join(', ')}`);
  need(/no text/i.test(s.style || ''), 'style must include "no text"');
  need(s.hook && s.hook.length <= 38 && !DEVANAGARI.test(s.hook), 'hook: Roman Hinglish, 1-38 characters');
  need(s.next && s.next.length <= 30 && !DEVANAGARI.test(s.next), 'next: tomorrow\'s temple or festival in Roman, max 30 characters (drawn on the end card)');
  need(s.temple === undefined || /^[a-z0-9-]+$/.test(s.temple), 'temple: lowercase slug (footage/<temple>/), or leave it out on festival days');
  need(s.deity && s.deity.length <= 60 && !/[|\n]/.test(s.deity), 'deity: 1-60 characters, no "|"');
  need(s.summary && s.summary.length <= 160 && !/[|\n]/.test(s.summary) && /agla:/i.test(s.summary), 'summary: max 160 characters, no "|", ending with "agla: <next>"');
  const vis = s.visuals && typeof s.visuals === 'object' ? s.visuals : {};
  const keys = Object.keys(vis);
  need(keys.length >= 3 && keys.length <= 6, `visuals: 3-6 story images (has ${keys.length}); each costs ~170 of the 10,000 free daily neurons`);
  keys.forEach((k) => {
    need(/^[a-z][a-z0-9-]*$/.test(k) && k !== 'end', `visual "${k}": key must be a lowercase word (and not "end", which is the end card)`);
    const pr = vis[k]?.prompt || '';
    need(pr.length >= 40, `visual "${k}": prompt missing or too short`);
    need(!/\b(text|letters|writing|sign|caption|words|logo)\b/i.test(pr.replace(/no (text|letters|writing)/gi, '')), `visual "${k}": prompt must not ask for text, signs or letters`);
    need(vis[k]?.real === undefined || typeof vis[k].real === 'boolean', `visual "${k}": real must be true or false`);
  });
  // Per-episode look (owner, 9 Nov 2026): the identical canonical two-shot every day got 0 views, so each episode has
  // its own setting, outfits and light (characters/dialogue.py look_prompts), never one of the last 8 noon Shorts'.
  const look = s.look && typeof s.look === 'object' ? s.look : {};
  need(typeof look.setting === 'string' && look.setting.length >= 25 && look.setting.length <= 220, 'look.setting: the episode\'s place in English, 25-220 characters (e.g. "on the steps of a white marble ghat by the river at sunrise, brass lamps")');
  for (const k of ['dadi', 'chhotu']) need(typeof look[k] === 'string' && look[k].length >= 12 && look[k].length <= 160, `look.${k}: ${k}'s outfit in English, 12-160 characters (colours and fabric, new each episode)`);
  need(look.light === undefined || (typeof look.light === 'string' && look.light.length <= 120), 'look.light: optional, max 120 characters');
  need(!/\b(text|letters|writing|sign|caption|words|logo)\b/i.test(Object.values(look).join(' ')), 'look: must not ask for text, signs or letters');
  try {
    const dir = 'story/published';
    const prev = (fs.existsSync(dir) ? fs.readdirSync(dir) : []).filter((f) => /^\d{4}-\d{2}-\d{2}-noon-.+\.json$/.test(f) && !f.startsWith(s.slug || '~')).sort().slice(-8);
    const lw = (t) => new Set(String(t || '').toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 4));
    const overlap = (a, b) => { const A = lw(a), B = lw(b); if (!A.size || !B.size) return 0; let n = 0; for (const w of A) if (B.has(w)) n++; return n / Math.min(A.size, B.size); };
    for (const f of prev) {
      const p = JSON.parse(fs.readFileSync(`${dir}/${f}`, 'utf8')).look;
      if (!p) continue;
      const clash = overlap(look.setting, p.setting) >= 0.5 ? 'setting' : overlap(`${look.dadi} ${look.chhotu}`, `${p.dadi} ${p.chhotu}`) >= 0.6 ? 'outfits' : '';
      if (!clash) continue;
      const msg = `look: the ${clash} repeats ${f.replace(/\.json$/, '')}; choose a clearly different place, outfits and light`;
      if (process.argv.includes('--soft-topics')) console.log(`${process.env.GITHUB_ACTIONS ? '::warning::' : 'warning: '}${msg}`);
      else problems.push(msg);
    }
  } catch (e) { console.log(`warning: look check skipped (${e.message})`); }
  const lines = Array.isArray(s.lines) ? s.lines : [];
  need(lines.length >= 14 && lines.length <= 24, `14-24 lines needed (has ${lines.length})`);
  const used = new Set();
  lines.forEach((l, i) => {
    const n = `line ${i + 1}`;
    need(['dadi', 'chhotu'].includes(l.who), `${n}: who must be "dadi" or "chhotu"`);
    need(l.tts && DEVANAGARI.test(l.tts), `${n}: tts must be Hindi in Devanagari`);
    need(l.tts && l.tts.length <= 150, `${n}: tts over 150 characters (${l.tts?.length}); split the turn`);
    need(l.tts && !/\d/.test(l.tts), `${n}: write numbers in tts as words`);
    need(l.sub && !DEVANAGARI.test(l.sub) && l.sub.length <= 140, `${n}: sub must be Roman Hinglish, max 140 characters`);
    need(l.top === 'end' || keys.includes(l.top), `${n}: top must be a key of visuals or "end"`);
    used.add(l.top);
  });
  keys.forEach((k) => need(used.has(k), `visual "${k}" is never shown; remove it (it would waste neurons)`));
  const chhotu = lines.filter((l) => l.who === 'chhotu');
  need(lines[0]?.who === 'chhotu' && /\?\s*$/.test(lines[0]?.sub || ''), 'line 1: Chhotu opens with a curious question (ends with "?")');
  checkHook(s.hook);
  checkOpening(lines[0]?.sub, lines[0]?.tts, 'line 1');
  checkCover();
  // Darshan first: line 1 shows the temple or deity picture (the cover frame), not a legend scene.
  const v0 = vis[lines[0]?.top] || {};
  need(v0.real === true || /\b(murti|idol|deity|temple|mandir|shrine|darshan|lord|goddess|god|ji)\b/i.test(v0.prompt || ''), 'line 1: show the temple or deity picture first (top = a temple/murti visual): it is the cover frame');
  need(chhotu.filter((l) => /\?\s*$/.test(l.sub || '')).length >= 4, 'Chhotu\'s questions drive the story: at least 4 Chhotu lines ending with "?"');
  need(lines.every((l, i) => i < 2 || !(l.who === lines[i - 1].who && l.who === lines[i - 2].who)), 'no one speaks more than 2 lines in a row: let Chhotu react or ask');
  const tail = lines.slice(-2);
  need(tail.some((l) => l.who === 'chhotu' && /\bkal\b/i.test(l.sub || '') && /\?/.test(l.sub || '')), 'one of the last 2 lines: Chhotu asks about tomorrow\'s temple ("Dadi, kal ... ?")');
  need(/subscribe/i.test(lines.at(-1)?.sub || '') && /like/i.test(lines.at(-1)?.sub || ''), 'the last line asks to like, share and subscribe');
  need(lines.at(-1)?.top === 'end', 'the last line shows the end card (top "end")');
  const secs = lines.reduce((t, l) => t + (l.tts || '').length / (l.who === 'dadi' ? 9.9 : 14.2) + (l.who === 'dadi' ? 0.63 : 0.76), 0);
  need(secs >= 85 && secs <= 125, `estimated length ${Math.round(secs)} s; must be 90-120 s (Dadi speaks ~9.9 characters a second, Chhotu ~14.2): adjust the lines`);
  const facts = Array.isArray(s.facts) ? s.facts : [];
  need(facts.length >= 3, 'facts: at least 3 entries {claim, sources: [2+ URLs]} for what the dialogue states');
  facts.forEach((f, i) => need(f?.claim && Array.isArray(f.sources) && f.sources.filter((u) => /^https?:\/\//.test(u)).length >= 2, `fact ${i + 1}: needs a claim and 2 independent source URLs`));
  // The 4 Nov dry run cited Wikipedia + travel/devotional blogs only: at least one source per fact must be stronger
  // (temple trust, *.gov.in tourism/district, ASI, or a news site).
  const WEAK = /wikipedia\.org|blogspot\.|wordpress\.|medium\.com|quora\.com|youtube\.com|facebook\.com|instagram\.com|bhaktibharat|myyatradiary|studycafe|tripadvisor|holidify|templepurohit|pinterest/i;
  facts.forEach((f, i) => need((f?.sources || []).some((u) => /^https?:\/\//.test(u) && !WEAK.test(u)), `fact ${i + 1}: Wikipedia and blogs don't count alone; add the temple trust, a *.gov.in tourism/district page, ASI or a news site`));
  const desc = s.youtube_description || '';
  need(/sanketik/i.test(desc) && /AI/.test(desc), 'youtube_description must say "Chitra AI dwara banaye gaye hain (sanketik)"');
  need(/subscribe/i.test(desc), 'youtube_description must end with a like/share/subscribe line');
  // Sati temples (automation/mandir-series.md): history only, a legal disclaimer, no fire imagery, no praise.
  const sati = /sati/i.test(`${s.temple || ''} ${s.slug || ''} ${s.title || ''}`);
  if (sati) {
    need(/Sati Nivaran Adhiniyam/i.test(desc), 'sati temple: the description needs the Sati (Prevention) Act disclaimer from mandir-series.md');
    need(lines.some((l) => /pratibandhit/i.test(l.sub || '')), 'sati temple: one line must speak the disclaimer (Sati pratha ... pratibandhit hai ...)');
    need(!keys.some((k) => /\b(fire|flame|pyre|burn|blaze|cremat)/i.test(vis[k].prompt || '')), 'sati temple: no fire, pyre or burning in any image prompt');
    need(!/(mahaan balidaan|amar tyag|sati ki mahima|punya)/i.test(lines.map((l) => l.sub).join(' ')), 'sati temple: no praise of the act');
  }
  const yt = s.youtube_title || '';
  need(yt.length > 0 && yt.length <= 90 && yt.endsWith(' #Shorts') && DEVANAGARI.test(yt), 'youtube_title: max 90 characters, "Roman | देवनागरी #Shorts"');
  checkTitle(48);
  need(!/[<>]/.test(yt + desc + (s.youtube_tags || '')), 'YouTube fields must not contain < or >');
  const tags = (s.youtube_tags || '').split(',').map((t) => t.trim()).filter(Boolean);
  need(tags.length >= 10 && tags.length <= 15 && DEVANAGARI.test(s.youtube_tags || ''), `youtube_tags: 10-15 tags with some Devanagari (has ${tags.length})`);
  need(s.instagram_caption && s.instagram_caption.length <= 2200 && !DEVANAGARI.test(s.instagram_caption), 'instagram_caption: Roman, 1-2200 characters');
  need((s.facebook_caption || '').trim() && !DEVANAGARI.test(s.facebook_caption), 'facebook_caption: Roman, not empty');
  need(!BAIT.test(JSON.stringify(s)), 'remove engagement bait, fear or money/miracle promises');
  if (problems.length) {
    console.log(problems.map((p) => `- ${p}`).join('\n'));
    process.exit(1);
  }
  if (notes.length) console.log(notes.join('\n'));
  console.log(`OK: ${file} (dialogue, ${lines.length} lines, ~${Math.round(secs)} s)`);
  process.exit(0);
}

// ---- Shorts -------------------------------------------------------------------------------------

need(/^\d{4}-\d{2}-\d{2}-(morning|evening|noon)-[a-z0-9-]+$/.test(s.slug || ''), 'slug must be <yyyy-mm-dd>-<morning|evening|noon>-<lowercase-english-slug>');
need(s.title && s.title.length <= 45, `title must be 1-45 characters (is ${s.title?.length ?? 0})`);
need(s.kicker && s.kicker.length <= 22, `kicker must be 1-22 characters (is ${s.kicker?.length ?? 0})`);
need(['hm_omega', 'hf_alpha'].includes(s.voice), 'voice must be hm_omega or hf_alpha');
need(PLAYLISTS.includes(s.playlist), `playlist must be one of: ${PLAYLISTS.join(', ')}`);
need(/no text/i.test(s.style || ''), 'style must include "no text"');

const scenes = Array.isArray(s.scenes) ? s.scenes : [];
const evening = /-(evening|noon)-/.test(s.slug || ''); // noon = an extra animated darshan Short, same rules
// Morning: 21-35 s since 10 Nov 2026 (owner: max 3 uploads a day; every winner was 21-31 s), so 4-6 scenes, 380 characters.
const [minScenes, maxScenes, maxChars] = evening ? [4, 5, 330] : [4, 6, 380];
need(scenes.length >= minScenes && scenes.length <= maxScenes, `${minScenes}-${maxScenes} scenes needed for this slot (has ${scenes.length})`);
const totalTts = scenes.reduce((n, sc) => n + (sc.tts || '').length, 0);
need(totalTts <= maxChars, `total narration ${totalTts} characters; keep it under ${maxChars} so the Short stays short`);
need(s.hook && s.hook.length <= 38 && !DEVANAGARI.test(s.hook), 'hook: Roman Hinglish, 1-38 characters');
need(!/^(aaj suniye|namaste|jai shree shyam)/i.test(scenes[0]?.sub || ''), 'scene 1 must open with the dramatic moment or a question, not a greeting');
checkHook(s.hook);
checkOpening(scenes[0]?.sub, scenes[0]?.tts);
checkCover();
checkTitle(48);
// Darshan first: scene 1 is the deity/temple close-up (its first frame is the cover YouTube shows as the thumbnail).
need(scenes[0] && !scenes[0].endcard && (scenes[0].real === true || (scenes[0].deity === true && /close[- ]?up|portrait|face/i.test(scenes[0].prompt || ''))),
  'scene 1: the deity or temple close-up first ("deity": true with "close-up" in the prompt, or a real temple photo "real": true); the story starts at scene 2');
// Loop ending: the end card's last words name the same deity/temple as the hook, so the replay flows into scene 1.
const endSub = String(scenes.at(-1)?.sub || '');
need(words(endSub.slice(-70)).some((w) => words(`${s.hook} ${scenes[0]?.sub || ''}`).includes(w)), 'end card: finish with a jaikara that names the same deity/temple as the hook (e.g. "Jai Salasar Balaji!"), so the loop flows back into scene 1');
scenes.forEach((sc, i) => {
  const n = `scene ${i + 1}`;
  const last = i === scenes.length - 1;
  need(sc.tts && DEVANAGARI.test(sc.tts), `${n}: tts must be Hindi in Devanagari`);
  const max = last ? 140 : 110;
  need(sc.tts && sc.tts.length <= max, `${n}: tts over ${max} characters (${sc.tts?.length})`);
  need(sc.tts && !/\d/.test(sc.tts), `${n}: write numbers in tts as words`);
  need(sc.sub && !DEVANAGARI.test(sc.sub), `${n}: sub must be Roman-script Hinglish`);
  need(sc.sub && sc.sub.length <= 120, `${n}: sub over 120 characters (${sc.sub?.length})`);
  need(sc.voice === undefined || ['hm_omega', 'hf_alpha'].includes(sc.voice), `${n}: voice (optional) must be hm_omega or hf_alpha`);
  if (last) {
    need(sc.endcard === true && !sc.prompt, `${n}: the last scene must be {"endcard": true, "tts", "sub"} with no prompt`);
    need(/subscribe/i.test(sc.sub || '') && /like/i.test(sc.sub || ''), `${n}: the end card must ask to like, share and subscribe`);
  } else {
    need(!sc.endcard, `${n}: only the last scene can be the end card`);
    need(sc.prompt && sc.prompt.length >= 40, `${n}: prompt missing or too short`);
    need(!/\b(text|letters|writing|sign|caption|words|logo)\b/i.test((sc.prompt || '').replace(/no (text|letters|writing)/gi, '')), `${n}: prompt must not ask for text, signs or letters`);
    need(['in', 'out', 'pan'].includes(sc.motion), `${n}: motion must be in, out or pan`);
    if (evening) {
      // Evening scenes are animated (5-7 s image-to-video clips): short lines, and a motion description.
      need(sc.tts && sc.tts.length <= 60, `${n}: evening tts over 60 characters (${sc.tts?.length}); the animated clip is ~5-7 s`);
      need(typeof sc.animate === 'string' && sc.animate.length >= 20 && sc.animate.length <= 300, `${n}: evening scenes need "animate": one English sentence of gentle motion (20-300 characters)`);
      need(sc.deity === undefined || typeof sc.deity === 'boolean', `${n}: deity must be true or false`);
      need(sc.hero === undefined || (sc.hero === true && i === scenes.findIndex((x) => x.hero)), `${n}: "hero": true on at most one scene`);
    } else if (sc.animate !== undefined) {
      // Morning: up to 4 marked scenes become animated clips (<= 7 s), so their lines stay short.
      need(typeof sc.animate === 'string' && sc.animate.length >= 20 && sc.animate.length <= 300, `${n}: "animate" must be one English sentence of gentle motion (20-300 characters)`);
      need(sc.tts && sc.tts.length <= 80, `${n}: an animated morning scene needs tts of at most 80 characters (${sc.tts?.length}); the clip is at most 7 s`);
      need(sc.deity === undefined || typeof sc.deity === 'boolean', `${n}: deity must be true or false`);
    }
  }
});
if (!evening) {
  const marked = scenes.filter((sc) => sc.animate !== undefined && !sc.endcard).length;
  need(marked >= 1 && marked <= 4, `morning: mark 1-4 scenes with "animate" (has ${marked}); they become animated clips, the rest stay still`);
}

const yt = s.youtube_title || '';
need(yt.length > 0 && yt.length <= 90 && yt.endsWith(' #Shorts'), 'youtube_title: max 90 characters, ending with " #Shorts"');
need(!/[<>]/.test(yt + (s.youtube_description || '') + (s.youtube_tags || '')), 'YouTube fields must not contain < or >');
need((s.youtube_description || '').trim().length > 0, 'youtube_description is empty');
const tags = (s.youtube_tags || '').split(',').map((t) => t.trim()).filter(Boolean);
need(tags.length >= 10 && tags.length <= 15, `youtube_tags: 10-15 tags (has ${tags.length})`);
need(s.instagram_caption && s.instagram_caption.length <= 2200, 'instagram_caption: 1-2200 characters');
need((s.facebook_caption || '').trim().length > 0, 'facebook_caption is empty');
// title is drawn on the video with a Latin-only font; the YouTube fields carry Devanagari keywords too.
need(DEVANAGARI.test(yt), 'youtube_title needs the keyword in Devanagari too ("Roman | देवनागरी #Shorts")');
need(DEVANAGARI.test(s.youtube_tags || ''), 'youtube_tags need some Devanagari search phrases');
for (const k of ['title', 'instagram_caption', 'facebook_caption']) {
  need(!DEVANAGARI.test(s[k] || ''), `${k} must be Roman-script Hinglish`);
}
// Real temple photos (footage/<temple>/, scripts/real-photos.mjs): `temple` names the folder, `real` marks temple scenes.
need(s.temple === undefined || /^[a-z0-9-]+$/.test(s.temple), 'temple: lowercase slug from footage/temples.json');
scenes.forEach((sc, i) => need(sc.real === undefined || (typeof sc.real === 'boolean' && !sc.endcard), `scene ${i + 1}: real must be true or false (not on the end card)`));
need(!scenes.some((sc) => sc.real) || s.temple, '"real" scenes need the "temple" slug');
const all = JSON.stringify(s);
need(!BAIT.test(all), 'remove engagement bait, fear or money/miracle promises');

if (problems.length) {
  console.log(problems.map((p) => `- ${p}`).join('\n'));
  process.exit(1);
}
if (notes.length) console.log(notes.join('\n'));
console.log(`OK: ${file} (${scenes.length} scenes)`);
