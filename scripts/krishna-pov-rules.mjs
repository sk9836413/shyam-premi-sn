// "Shri Krishna kehte hain" / Shyam POV episode rules (STORY.md section 10; automation/krishna-pov-topics.json;
// characters/krishna-pov/). Pure functions, used by scripts/validate.mjs (format "krishna-pov") and tested by
// scripts/krishna-pov-rules.test.mjs.
//
// Why (owner, 15 Nov 2026): a 2D Krishna POV channel's Shorts get 0.4-10M views (festival tie-in + a modern question,
// Krishna answering in first person, ~60 s). Several of its hits QUESTION rituals (Karwa Chauth, Manglik, crackers);
// that would hurt our devotional audience, so our rule is the opposite: never mock or tell people to drop a ritual or a
// festival practice. "Puja bhi karo, aur saath mein ... bhi karo." No invented scripture in God's mouth: a quote is a
// real Gita verse with chapter.verse; otherwise the message is "in the spirit of the Gita".
import fs from 'node:fs';
import { DEVANAGARI, coverProblems, lineSeconds, toneProblems } from './kailash-rules.mjs';

export const PLAYLIST = 'Shri Krishna kehte hain';
export const PLAYLIST_FALLBACK = 'Vishnu ji aur Krishna ki Kathayein';
export const LEN = { min: 45, max: 60 };
export const LINES = { min: 8, max: 16 };
export const DISCLOSURE = /भक्तिभाव से बनाई गई काल्पनिक प्रस्तुति/;
export const NAME_WORDS = ['कृष्ण', 'श्याम', 'कान्हा', 'गोविंद'];
// "<Hinglish question>? 👀 | <Festival> Special #krishna #shorts"
export const TITLE_RE = /^[A-Za-z0-9 ,'.…-]{8,70}\? 👀 \| [A-Z][A-Za-z ]{2,40} Special #krishna #shorts$/u;

// Never question, mock or tell people to drop a ritual / festival practice (the reference channel's controversial angle).
export const RITUAL_ATTACK = /\b(andh ?vishwas|andh ?vishvas|dhakosla|dhong|pakhand|paakhand|superstition|real meaning|reality after|reality of|galat parampara|parampara galat|ritual (is )?wrong|(puja|pooja|vrat|ritual|tyohar|parampara|riwaz) band karo|mat manao|mat mnao|bekaar hai|bekar hai|fizool|faltu ki|kya fayda|koi fayda nahi|sab dikhawa hai|ye sab bakwas|tradition (is )?wrong|old ?fashioned|outdated|kyun karte ho ye)\b|अंधविश्वास|ढकोसला|ढोंग|पाखंड|बेकार है|फ़ालतू|फालतू|मत मनाओ|(पूजा|व्रत|त्योहार|परंपरा|रिवाज) बंद करो|गलत परंपरा|परंपरा गलत|कोई फायदा नहीं|सब दिखावा है/i;
// No politics (kailash-rules), and no caste / gender debates.
export const DEBATE = /\b(caste|jaativaad|jatiwad|jaat-?paat|dalit|savarna|reservation|aarakshan|gender|feminis\w*|patriarch\w*|dahej|dowry|equality|ladka ladki barabar)\b|जाति|जातिवाद|दलित|आरक्षण|दहेज|लिंग भेद|नारीवाद|बराबरी का हक/i;
// No health or astrology claims.
export const HEALTH_ASTRO = /\b(cure\w*|ilaaj|ilaj|bimari theek|rog door|cancer|diabetes|medicine|dawai|dawa|astrolog\w*|jyotish|kundli|kundali|manglik|mangalik|grah dosh|shani dosh|rahu|ketu|rashifal|horoscope|lucky number|lucky colour|totka|vastu|upay)\b|इलाज|बीमारी ठीक|रोग दूर|दवाई|ज्योतिष|कुंडली|मांगलिक|मंगलिक|ग्रह दोष|शनि दोष|राहु|केतु|राशिफल|टोटका|वास्तु/i;
// A scripture "quote" without a real verse: "Gita mein likha hai ...", "shastra kehte hain ...".
export const QUOTE_CLAIM = /गीता में|गीता कहती|शास्त्र कहते|वेद में लिखा|पुराण में लिखा|gita mein|shastra kehte|ved mein likha/i;

/** The ritual / debate / health-astrology rules (on top of kailash-rules toneProblems). */
export function povToneProblems(s, texts) {
  const out = [];
  const hit = (re) => texts.find((t) => re.test(t));
  const r = hit(RITUAL_ATTACK);
  if (r) out.push(`tone: never mock, question or tell people to drop a ritual or festival practice ("puja bhi karo, aur saath mein ... bhi karo"): "${r.slice(0, 60)}"`);
  const d = hit(DEBATE);
  if (d) out.push(`tone: no caste or gender debates: "${d.slice(0, 60)}"`);
  const h = hit(HEALTH_ASTRO);
  if (h) out.push(`tone: no health or astrology claims (no ilaaj, kundli, manglik, grah dosh, upay): "${h.slice(0, 60)}"`);
  return out;
}

/** Title: "<Hinglish question>? 👀 | <Festival> Special #krishna #shorts". */
export function titleProblems(yt) {
  const t = String(yt || '');
  const out = [];
  if (!TITLE_RE.test(t)) out.push(`youtube_title: "<Hinglish question>? 👀 | <Festival> Special #krishna #shorts" (Roman question, max 70 before "?"; is "${t}")`);
  if ([...t].length > 100) out.push('youtube_title: max 100 characters');
  return out;
}

const allTexts = (s) => [
  ...(s.scenes || []).flatMap((sc) => [sc?.prompt, sc?.animate, ...(sc?.lines || []).flatMap((l) => [l?.tts, l?.sub])]),
  s.endcard?.tts, s.endcard?.sub, s.title, s.title_dev, s.cover, s.label, s.summary, s.message, s.topic,
  s.youtube_title, s.youtube_description, s.youtube_tags, s.instagram_caption, s.facebook_caption,
].filter((t) => typeof t === 'string');

/** All problems of a krishna-pov spec. ctx: { lib, bank, hasPortrait(id), planned(date) }. */
export function checkSpec(s, ctx = {}) {
  const P = [];
  const need = (ok, msg) => { if (!ok) P.push(msg); };
  const lib = ctx.lib || {};
  const bank = ctx.bank || { topics: [] };
  const pilot = s.release === 'pilot';
  need(s.format === 'krishna-pov' && s.series === 'shri-krishna-kehte-hain', 'format "krishna-pov", series "shri-krishna-kehte-hain"');
  need(pilot ? /^pov-pilot-[a-z0-9-]+$/.test(s.slug || '') : /^\d{4}-\d{2}-\d{2}-pov-[a-z0-9-]+$/.test(s.slug || '') && String(s.slug).startsWith(s.release),
    'slug: <release yyyy-mm-dd>-pov-<topic in Roman, a-z0-9->');
  if (!pilot) need(/^\d{4}-\d{2}-\d{2}$/.test(s.release || '') && (!ctx.planned || ctx.planned(s.release)), `release ${s.release}: a pov day of scripts/day-plan.mjs (Tue/Fri or a festival tie-in)`);
  need(/^\d{2}:\d{2}$/.test(s.publish_at || ''), 'publish_at: IST time, e.g. "08:00"');
  const t = (bank.topics || []).find((x) => x.id === s.topic_id);
  need(t, `topic_id: an id from automation/krishna-pov-topics.json (is "${s.topic_id}")`);
  if (t?.kind === 'festival' && !pilot && t.window) need(s.release >= t.window[0] && s.release <= t.window[1], `topic ${t.id} is tied to ${t.festival}: release within ${t.window.join('..')}`);
  need(lib.krishna && (!ctx.hasPortrait || ctx.hasPortrait('krishna')), 'characters/krishna-pov/krishna.png: the master portrait is picked first');
  need(s.lead === 'krishna', 'lead: "krishna" (the only speaker; Khatu Shyam ji is never a speaking body, only the sheesh)');
  need(s.summary && s.summary.length <= 160 && !/[|\n]/.test(s.summary) && s.deity && !/[|\n]/.test(s.deity), 'deity and summary (max 160, no "|") for the log line');
  need(s.message && s.message.length <= 160, 'message: the positive message in one line (max 160)');
  need(s.title && s.title.length <= 40 && !DEVANAGARI.test(s.title) && s.title_dev && DEVANAGARI.test(s.title_dev), 'title (Roman, max 40) + title_dev (Devanagari)');
  need(typeof s.label === 'string' && /^[A-Za-z0-9 ,'?!.-]{3,26}$/.test(s.label), 'label: the small text on top, Roman, 3-26 characters, no emoji (e.g. "Ghar ke buzurg")');
  P.push(...coverProblems(s.cover), ...titleProblems(s.youtube_title));
  const texts = allTexts(s);
  P.push(...toneProblems(s), ...povToneProblems(s, texts));
  // Real scripture only
  const spoken = [...(s.scenes || []).flatMap((sc) => sc.lines || []), s.endcard || {}].map((l) => l.tts || '');
  if (spoken.some((x) => QUOTE_CLAIM.test(x)) || s.shloka) {
    const sh = s.shloka || {};
    need(sh.text && DEVANAGARI.test(sh.text) && spoken.some((x) => x.includes(sh.text)), 'shloka.text: the verse exactly as spoken in a tts (a line that says "Gita mein..." must quote a real verse)');
    need(/^(Bhagavad )?Gita \d{1,2}\.\d{1,3}$/.test(sh.ref || ''), 'shloka.ref: "Bhagavad Gita <chapter>.<verse>"');
    need((sh.sources || []).filter((u) => /^https?:\/\//.test(u)).length >= 2, 'shloka.sources: 2 URLs with the same verse');
    const m = String(sh.ref || '').match(/\d{1,2}\.\d{1,3}/);
    need(m && String(s.youtube_description || '').includes(m[0]), 'youtube_description: name the Gita verse (chapter.verse)');
  }
  if (['scripture', 'parampara'].includes(s.story_type)) {
    const facts = Array.isArray(s.facts) ? s.facts : [];
    need(facts.length >= 1, 'facts: every katha detail Krishna mentions, each {claim, sources: [2 URLs]}');
    facts.forEach((f, i) => need(f?.claim && (f.sources || []).filter((u) => /^https?:\/\//.test(u)).length >= 2, `fact ${i + 1}: a claim and 2 independent source URLs`));
  }
  need(['scripture', 'parampara', 'fictional'].includes(s.story_type), 'story_type: scripture | parampara | fictional');
  const d = String(s.youtube_description || '');
  need(DISCLOSURE.test(d), 'youtube_description: "भक्तिभाव से बनाई गई काल्पनिक प्रस्तुति"');
  need(/sanketik/i.test(d) && /\bAI\b/.test(d), 'youtube_description: the synthetic-media line "Chitra, awaaz aur animation AI se banaye gaye hain (sanketik)."');
  need(/subscribe/i.test(d) && /#ShriKrishnaKehteHain/.test(d), 'youtube_description: a subscribe line and #ShriKrishnaKehteHain');
  need(!/epifive/i.test(JSON.stringify(s)), 'never mention EpiFive (separate brands)');
  need([PLAYLIST, PLAYLIST_FALLBACK].includes(s.playlist), `playlist: "${PLAYLIST}" (created on the first upload) or "${PLAYLIST_FALLBACK}"`);
  const scenes = Array.isArray(s.scenes) ? s.scenes : [];
  need(scenes.length >= 1 && scenes.length <= 4, `1-4 scenes (has ${scenes.length})`);
  let secs = 0, n = 0, animated = 0;
  const lines = [];
  const line = (l, where) => {
    need(l.who === 'krishna', `${where}: a POV monologue: every line is Shri Krishna's`);
    need(l.tts && DEVANAGARI.test(l.tts) && l.tts.length <= 110 && !/\d/.test(l.tts), `${where}: tts Devanagari, max 110, numbers as words`);
    need(l.sub && !DEVANAGARI.test(l.sub) && l.sub.length <= 110, `${where}: sub = big Hinglish subtitle (Roman), max 110`);
    need(l.shot === undefined || ['wide', 'close'].includes(l.shot), `${where}: shot "wide" (an illustrated B-roll) or "close" (to camera)`);
    secs += lineSeconds(l.tts, lib.krishna?.voice); n++;
    lines.push(l);
  };
  scenes.forEach((sc, i) => {
    const w = `scene ${i + 1}`;
    need(sc.prompt && sc.prompt.length >= 40 && !/\b(text|letters|writing|sign|caption|words|logo)\b/i.test(sc.prompt.replace(/no (text|letters|writing)/gi, '')), `${w}: prompt missing, too short, or asks for text`);
    need(!/\b(night sky|starry)\b/i.test(sc.prompt || ''), `${w}: not the reference channel's night-sky look: our own dawn / day backgrounds`);
    if (sc.animate !== undefined) animated++;
    (sc.lines || []).forEach((l, k) => line(l, `${w} line ${k + 1}`));
  });
  if (s.endcard) line({ who: 'krishna', ...s.endcard }, 'endcard');
  need(/like/i.test(s.endcard?.sub || '') && /subscribe/i.test(s.endcard?.sub || ''), 'endcard.sub: ends with the Like and Subscribe ask');
  need(animated <= 2, 'at most 2 scenes with "animate" (one character: the close-ups carry the motion)');
  const first = scenes[0]?.lines?.[0];
  need(first && first.shot === 'close' && (first.tts || '').length <= 60 && /[?？]/.test(first.tts || ''), 'hook: line 1 is Krishna to camera (shot "close") asking the question, max 60 characters');
  need(lines.filter((l) => l.shot !== 'wide').length >= Math.ceil(n * 0.6), 'POV: at least 60 % of the lines are close-ups to camera');
  need(n >= LINES.min && n <= LINES.max, `${LINES.min}-${LINES.max} lines incl. the endcard (has ${n})`);
  need(secs >= LEN.min && secs <= LEN.max, `estimated length ${Math.round(secs)} s; a POV Short is ${LEN.min}-${LEN.max} s`);
  const names = Array.isArray(s.names) ? s.names : [];
  for (const w of NAME_WORDS) if (lines.some((l) => (l.tts || '').includes(w))) need(names.includes(w), `names: add "${w}" (spoken: the Whisper gate checks it)`);
  const tags = String(s.youtube_tags || '').split(',').map((x) => x.trim()).filter(Boolean);
  need(tags.length >= 8 && tags.length <= 15 && DEVANAGARI.test(s.youtube_tags || ''), `youtube_tags: 8-15 with some Devanagari (has ${tags.length})`);
  need(s.instagram_caption && !DEVANAGARI.test(s.instagram_caption) && s.instagram_caption.length <= 2200, 'instagram_caption: Roman');
  need(String(s.facebook_caption || '').trim(), 'facebook_caption: not empty');
  return { problems: P, seconds: secs, lines: n, scenes: scenes.length };
}

export function loadContext(root = '.') {
  const lib = JSON.parse(fs.readFileSync(`${root}/characters/krishna-pov/cast.json`, 'utf8')).characters;
  const bank = JSON.parse(fs.readFileSync(`${root}/automation/krishna-pov-topics.json`, 'utf8'));
  return { lib, bank, hasPortrait: (c) => fs.existsSync(`${root}/characters/krishna-pov/${c}.png`) };
}
