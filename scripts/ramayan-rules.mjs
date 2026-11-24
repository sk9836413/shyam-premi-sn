// "Ramayan Ke Rochak Tathya" rules (STORY.md section 11; automation/ramayan-series.md; owner, 24 Nov 2026). Pure
// functions used by scripts/validate.mjs (a facts spec with "series": "ramayan") and scripts/ramayan-series.mjs check;
// tested by scripts/ramayan-series.test.mjs.
//
// Accuracy is the whole point of the series: every Short speaks its item's hook and fact WORD FOR WORD (the fact beat
// may not add a single word the item does not have), shows the item's primary source line on screen ("Valmiki Ramayan,
// Sundar Kand, Sarga 49"), and never adds "scientific proof", NASA / satellite / carbon-dating claims, BCE years or
// numbers the item does not have. Pictures: traditional, respectful; Shri Ram (and Shri Krishna) always dark / blue
// complexioned, never fair; Hanuman ji traditional with a clean-shaven vanara face; Ravan factual, never comic.
import { ARTS, CURE, DEMEAN, estimateSeconds, GORE, PROVEN, PSEUDO, STUDIO, WEAK } from './facts.mjs';
import { KICKER, PLAYLIST, SOURCE_RE, sourceParts } from './ramayan-series.mjs';

export const DEVANAGARI = /[ऀ-ॿ]/;
export const LENGTH = [28, 62]; // seconds (hook 2-3 s, fact, source line, lesson, CTA)
export const SCENES = [5, 8]; // including the end card
export const BEATS = ['hook', 'fact', 'source', 'lesson'];
export const SERIES_SIZE = [40, 60];
// Names a hook must carry (the channel's name-first rule; validate.mjs NAMES has the same words).
export const NAMES = /\b(shri ram|ram|rama|ramji|raghav|raghunath|sita|siya|janaki|lakshman|hanuman|bajrang|bharat|shatrughna|ravan|ramayan|ramcharitmanas|valmiki|tulsidas|jatayu|sampati|shabari|vibhishan|sugriv|angad|kumbhkaran|kumbhakarn|kaikeyi|dasharath|sumitra|kaushalya|janak|ahalya|kevat|marich|nal|surasa|mainak|agastya|anasuya|parshuram|vishwamitra|matali|mandodari|jambavan|guha|shiv)\b/i;
// Never in a Ramayan Short (owner, 24 Nov 2026): "scientific proof" / NASA / satellite / carbon-dating claims.
export const SCI = /scientific(ally)?\s*(proof|proven|evidence|praman)|science\s*(proof|proves|ne\s*sabit|ka\s*praman)|vaigyanik\s*(praman|saboot|sabut|sabit)|vigyan\s*(ka|ne)\s*(praman|sabit)|वैज्ञानिक\s*(प्रमाण|सबूत|आधार)|विज्ञान\s*(का|ने)\s*(प्रमाण|साबित)|\bnasa\b|नासा|satellite|सैटेलाइट|उपग्रह\s*(चित्र|तस्वीर)|carbon[\s-]*dating|कार्बन\s*डेटिंग|archaeolog|पुरातत्व/i;
// Era / age claims: BCE years, "N saal pehle", "years ago" (only when the item itself says so).
export const ERA = /\b(BC|BCE|B\.C\.?)(?![\p{L}])|ईसा\s*पूर्व|ई\.\s*पू\.|\b(saal|varsh|years?)\s+(pehle|purani|purana|purane|ago|old)\b|(साल|वर्ष)\s+(पहले|पुरान)/iu;
// Number words (Roman and Devanagari) and digits: a number in the Short must be one the item itself has.
export const NUM = /\b\d+\b|\b(teen|chaar|char|paanch|panch|chhah|saat|aath|nau|das|gyarah|barah|terah|chaudah|pandrah|solah|satrah|atharah|bees|chaubees|tees|chaalis|pachaas|sattar|assi|nabbe|sau|hazaar|hazar|lakh|crore|karod)\b|(?<![\p{L}\p{M}])(दो|तीन|चार|पाँच|पांच|छह|सात|आठ|नौ|दस|ग्यारह|बारह|तेरह|चौदह|पंद्रह|सोलह|सत्रह|अठारह|बीस|चौबीस|तीस|चालीस|पचास|साठ|सत्तर|अस्सी|नब्बे|सौ|हज़ार|हजार|लाख|करोड़)(?![\p{L}\p{M}])/giu;
const RAM_OR_KRISHNA = /\b(shri |lord |prince |young |king )?(rama?|raghav|raghunath|krishna)\b(?![- ]?setu)/i; // "Ram Setu" alone shows no person
const DARK = /\b(blue|bluish|dark|dusky|shyam|syam|cloud[- ]coloured|cloud[- ]colored|deep[- ]blue|neel|neela)\b/i;
const FAIR_RAM = /\b(fair|pale|light|white|golden)[- ](skinned|skin|complexion|complexioned)\s+(shri |lord |prince |young |king )?(rama?|krishna)\b|\b(rama?|krishna)\b[^,.;]{0,25}\b(fair|pale|light|white)[- ]?(skinned|skin|complexion|complexioned)\b/i;
const COMIC = /\b(comic|comical|comically|funny|cartoonish|clown\w*|silly|goofy|mock\w*|ridicul\w*|laughable|buffoon)\b/i;
const TEXT_WORDS = /\b(text|letters|writing|sign|caption|words|logo|title|label|inscription|calligraphy|script)\b/i;

/** Same text for the word-for-word checks: case, punctuation, quotes, dashes and spaces do not count. */
export const normText = (t) => String(t || '').normalize('NFC').toLowerCase().replace(/[।॥,.!?…:;"'‘’“”()\-–—/]/g, ' ').replace(/\s+/g, ' ').trim();
const nums = (t) => (String(t || '').match(NUM) || []).map((x) => x.toLowerCase());
const urls = (a) => (Array.isArray(a) ? a : []).filter((u) => /^https?:\/\/\S+$/.test(u));
const words = (sent) => sent.split(/\s+/).filter((w) => /[ऀ-ॿA-Za-z]/.test(w)).length;
const sentences = (t) => String(t || '').split(/[।!?.॥]+/).map((x) => x.trim()).filter(Boolean);
const itemText = (it) => [it.title, it.hook, it.hook_hi, it.fact, it.fact_hi, it.lesson].join(' ');

/** Problems of the series file (empty = OK). */
export function checkSeries(items) {
  const e = [];
  if (items.length < SERIES_SIZE[0] || items.length > SERIES_SIZE[1]) e.push(`${items.length} items (the series has ${SERIES_SIZE[0]}-${SERIES_SIZE[1]})`);
  const ids = new Set();
  items.forEach((it, k) => {
    const n = `item ${it.n}`;
    if (it.n !== k + 1) e.push(`${n}: numbered out of order (expected ${k + 1})`);
    if (!new RegExp(`^ramayan-${String(it.n).padStart(2, '0')}-[a-z0-9-]+$`).test(it.id || '')) e.push(`${n}: id "ramayan-${String(it.n).padStart(2, '0')}-<slug>"`);
    if (ids.has(it.id)) e.push(`${n}: duplicate id`);
    ids.add(it.id);
    if (!it.title || it.title.length > 26 || DEVANAGARI.test(it.title)) e.push(`${n}: title Roman, max 26 characters (it follows "Ramayan Tathya ${it.n}/${items.length}: " in the title)`);
    if (!it.deity || /[|]/.test(it.deity)) e.push(`${n}: deity (for the log line, no "|")`);
    if (!it.hook || it.hook.length > 75 || DEVANAGARI.test(it.hook) || !/[?!]$/.test(it.hook)) e.push(`${n}: hook Roman, max 75 characters, ending in ? or !`);
    if (it.hook && !NAMES.test(it.hook.slice(0, 55))) e.push(`${n}: hook names Shri Ram / Sita / Hanuman / Ramayan ... in its first 55 characters`);
    if (!DEVANAGARI.test(it.hook_hi || '') || it.hook_hi.length > 75 || !/[?!]$/.test(it.hook_hi) || /\d/.test(it.hook_hi)) e.push(`${n}: hook_hi Devanagari, max 75 characters, ending in ? or !, numbers as words`);
    if (!it.fact || DEVANAGARI.test(it.fact) || it.fact.length > 340 || sentences(it.fact).length > 3) e.push(`${n}: fact Roman, 1-3 sentences, max 340 characters`);
    if (!DEVANAGARI.test(it.fact_hi || '') || /\d/.test(it.fact_hi || '') || (it.fact_hi || '').length > 290) e.push(`${n}: fact_hi Devanagari, numbers as words, max 290 characters`);
    for (const s of sentences(it.fact_hi)) {
      if (words(s) > 18) e.push(`${n}: fact_hi sentence of ${words(s)} words (max 18): "${s.slice(0, 50)}…"`);
      if (s.length > 135) e.push(`${n}: fact_hi sentence over 135 characters (a scene speaks at most 140)`);
    }
    if (!SOURCE_RE.test(it.source || '')) e.push(`${n}: source "Valmiki Ramayan, <Kand> Kand, Sarga N" or "Shri Ramcharitmanas, <Kand> Kand, Doha N" (is "${it.source}")`);
    const p = sourceParts(it.source);
    if (p && p.work === 'Valmiki Ramayan' && p.kand === 'Lanka') e.push(`${n}: Valmiki Ramayan has Yuddha Kand (Lanka Kand is the Ramcharitmanas name)`);
    if (p && p.work === 'Shri Ramcharitmanas' && p.kand === 'Yuddha') e.push(`${n}: Ramcharitmanas has Lanka Kand`);
    if (!/^https:\/\/heritage\.iitk\.ac\.in\/(VRAM|RCM)\/\d/.test(it.verify || '')) e.push(`${n}: verify = the verse/doha URL on heritage.iitk.ac.in (VRAM/<kand>.<sarga>.<verse> or RCM/<kand>.<doha>)`);
    if (!it.lesson || it.lesson.length > 120 || DEVANAGARI.test(it.lesson)) e.push(`${n}: lesson Roman, one line, max 120 characters`);
    const all = itemText(it);
    if (SCI.test(all) || ERA.test(all) || PSEUDO.test(all) || PROVEN.test(all) || CURE.test(all)) e.push(`${n}: no scientific-proof / NASA / era / health claims`);
    if (DEMEAN.test(all)) e.push(`${n}: respectful wording only`);
  });
  return e;
}

/** Problems of one scene image prompt (the Ramayan visual rules). */
export function visualProblems(prompt, where = 'prompt') {
  const e = [];
  const p = String(prompt || '');
  const plain = p.replace(/\bno (text|letters|writing|logo|watermark|words|captions?|signs?|titles?|labels?|inscriptions?)\b/gi, '');
  if (p.length < 40) e.push(`${where}: an English image prompt of one clear moment (40+ characters)`);
  if (TEXT_WORDS.test(plain)) e.push(`${where}: never ask for text, letters, signs or a title in the picture (the source line is drawn by the renderer)`);
  if (GORE.test(p.replace(/\bno (blood|gore|violence)\b/gi, ''))) e.push(`${where}: no gore or violence (light, petals, dust instead)`);
  if (STUDIO.test(p)) e.push(`${where}: never name a studio or copy a film / TV look`);
  if (/\b(actor|actress|celebrity|tv serial|film still|movie still)\b/i.test(p)) e.push(`${where}: never a real actor's likeness or a TV/film frame`);
  if (RAM_OR_KRISHNA.test(p)) {
    if (!DARK.test(p)) e.push(`${where}: Shri Ram / Shri Krishna are dark blue-complexioned in tradition: say so ("dark blue-complexioned Shri Ram")`);
    if (FAIR_RAM.test(p)) e.push(`${where}: Shri Ram / Shri Krishna are never fair-skinned`);
  }
  if (/hanuman|bajrang|maruti|anjaneya|pavanputra/i.test(p) && !/salasar/i.test(p) && !/no beard|beardless|clean[- ]shaven/i.test(p)) e.push(`${where}: Hanuman ji: traditional vanara form with "clean-shaven vanara face, no beard"`);
  if (/ravan|ravana|dashanan|lankesh/i.test(p) && COMIC.test(p)) e.push(`${where}: Ravan is shown factually and dignified (owner, 24 Nov 2026), never comic or mocked`);
  if (/\b(nude|naked|sensual|seductive|cleavage|bikini)\b/i.test(p)) e.push(`${where}: respectful, modest framing only`);
  return e;
}

/** The Ramayan rules for one facts spec ("series": "ramayan"); items = loadSeries(). Problems (empty = OK). */
export function checkRamayanSpec(s, items = []) {
  const e = [];
  const need = (ok, msg) => { if (!ok) e.push(msg); };
  const it = items.find((x) => x.id === s.topic);
  need(it, `topic: an item id of automation/ramayan-series.md (is "${s.topic}")`);
  if (!it) return e;
  const total = items.length;
  const src = sourceParts(it.source);
  need(s.format === 'facts' && s.series === 'ramayan' && s.variant === 'ramayan', 'format "facts", series "ramayan", variant "ramayan"');
  need(ARTS.includes(s.art), `art: ${ARTS.join(' | ')} (the art-style A/B)`);
  need(/^\d{4}-\d{2}-\d{2}$/.test(s.release || '') && s.slug === `${s.release}-facts-${it.id}`, `slug: <release>-facts-${it.id}`);
  need(/^\d{2}:\d{2}$/.test(s.publish_at || ''), 'publish_at: IST time on the release day ("17:00")');
  need(s.kicker === KICKER(it.n, total), `kicker: exactly "${KICKER(it.n, total)}"`);
  need(s.title && s.title.length <= 45 && !DEVANAGARI.test(s.title), 'title: Roman, max 45 characters (the title bar; e.g. the item title)');
  need(s.playlist === PLAYLIST, `playlist: "${PLAYLIST}"`);
  need(s.deity && !/[|\n]/.test(s.deity) && s.summary && s.summary.length <= 160 && !/[|\n]/.test(s.summary), 'deity and summary (max 160, no "|") for the log line');
  need(/no text/i.test(s.style || '') && !STUDIO.test(s.style || ''), 'style: must include "no text" and never name a studio');
  if (s.art === 'illustrated') need(/hand[- ]drawn|illustrat/i.test(s.style || ''), 'art illustrated: the style says "warm hand-drawn illustration, clean outlines, soft sunset light"');
  if (s.art === 'cinematic') need(/cinematic/i.test(s.style || ''), 'art cinematic: the style says "hyper-real cinematic ... golden"');
  need(s.source === it.source, `source: exactly the item's source line "${it.source}"`);
  const desc = s.youtube_description || '';
  need(desc.includes(`Source: ${it.source}`), `youtube_description: the line "Source: ${it.source}"`);
  need(/sanketik/i.test(desc) && /AI/.test(desc), 'youtube_description: "Chitra AI dwara banaye gaye hain (sanketik). Awaaz AI se."');
  need(/subscribe/i.test(desc) && DEVANAGARI.test(desc), 'youtube_description: a Devanagari line and a like/share/subscribe line');
  need(/#ramayan\b/i.test(desc) && /#facts\b/i.test(desc), 'youtube_description hashtags: #ramayan #facts + 1-2 subject tags');
  const yt = s.youtube_title || '';
  const titleRe = new RegExp(`^Ramayan Tathya ${it.n}/${total}: [^|]{3,} \\| [^|]*[ऀ-ॿ][^|]* #Shorts$`, 'u');
  need(titleRe.test(yt) && yt.length <= 100, `youtube_title: "Ramayan Tathya ${it.n}/${total}: <Roman> | <देवनागरी> #Shorts" (max 100)`);
  need(s.real === undefined && (s.scenes || []).every((sc) => !sc.real || s.temple), 'real photos only with "temple" (footage/temples.json, licence-checked Wikimedia), never for a katha scene');

  // the item's own facts check (the job verified the citation): at least the item's fact with 2 URLs, one not a blog
  const facts = Array.isArray(s.facts) ? s.facts : [];
  need(facts.length >= 1, 'facts: at least 1 {claim, sources: [2+ URLs]} (the item\'s fact and its verse/doha page)');
  facts.forEach((f, i) => {
    need(f?.claim && urls(f.sources).length >= 2, `fact ${i + 1}: a claim and 2 source URLs`);
    need(urls(f?.sources).some((u) => !WEAK.test(u)), `fact ${i + 1}: one URL must be the text itself (the item's verify URL, heritage.iitk.ac.in)`);
  });

  // beats: hook -> fact (1-3 scenes) -> source -> lesson -> end card
  const scenes = Array.isArray(s.scenes) ? s.scenes : [];
  need(scenes.length >= SCENES[0] && scenes.length <= SCENES[1], `${SCENES[0]}-${SCENES[1]} scenes including the end card (has ${scenes.length})`);
  const body = scenes.filter((sc) => !sc.endcard);
  need(scenes.at(-1)?.endcard === true && !scenes.at(-1)?.prompt, 'the last scene is the end card {endcard: true, tts, sub} (no prompt)');
  const order = body.map((sc) => sc.beat).join(' ');
  need(/^hook( fact){1,3} source lesson$/.test(order), `beats in order: hook, fact (1-3 scenes), source, lesson, then the end card (has "${order}")`);
  const by = (b) => body.filter((sc) => sc.beat === b);
  const hook = by('hook')[0] || {};
  need(normText(hook.tts) === normText(it.hook_hi), `hook scene: tts is the item's hook_hi word for word ("${it.hook_hi}")`);
  need(normText(hook.sub) === normText(it.hook), `hook scene: sub is the item's hook word for word ("${it.hook}")`);
  need(/close[- ]?up|portrait/i.test(hook.prompt || ''), 'hook scene: a dramatic close-up (it is the cover frame)');
  const fact = by('fact');
  need(normText(fact.map((sc) => sc.tts).join(' ')) === normText(it.fact_hi), 'fact beat: its tts lines together are the item\'s fact_hi word for word (no added or changed words)');
  need(normText(fact.map((sc) => sc.sub).join(' ')) === normText(it.fact), 'fact beat: its sub lines together are the item\'s fact word for word (no added or changed words)');
  const sb = by('source')[0] || {};
  need(sb.source_line === it.source, `source scene: "source_line": "${it.source}" (drawn on screen)`);
  need(normText(sb.sub) === normText(it.source), 'source scene: sub is the source line');
  const spoken = String(sb.tts || '').replace(/\s+/g, '');
  need(src && spoken.includes(src.workHi.replace(/\s+/g, '')) && spoken.includes(src.kandHi), `source scene: tts names "${src?.workHi}" and "${src?.kandHi}" (e.g. "यह प्रसंग ${src?.workHi} के ${src?.kandHi} में है।")`);
  need(String(sb.tts || '').length <= 90, 'source scene: tts max 90 characters');
  const lesson = by('lesson')[0] || {};
  need(lesson.moral === true && DEVANAGARI.test(lesson.tts || '') && String(lesson.tts || '').length <= 110 && String(lesson.sub || '').length <= 130, 'lesson scene: "moral": true, one line (tts max 110, sub max 130)');
  const end = scenes.at(-1) || {};
  need(/subscribe/i.test(end.sub || '') && /like/i.test(end.sub || '') && /share/i.test(end.sub || '') && /जय/.test(end.tts || ''), 'end card: a jaikara and the like, share and subscribe ask');

  const secs = estimateSeconds(scenes);
  need(secs >= LENGTH[0] && secs <= LENGTH[1], `estimated length ${Math.round(secs)} s; a Ramayan Tathya Short is ${LENGTH[0]}-${LENGTH[1]} s`);
  scenes.forEach((sc, i) => {
    const n = `scene ${i + 1}`;
    need(sc.tts && DEVANAGARI.test(sc.tts) && !/\d/.test(sc.tts), `${n}: tts Devanagari, numbers as words`);
    need(sc.tts && sc.tts.length <= (sc.endcard ? 150 : 140), `${n}: tts max ${sc.endcard ? 150 : 140} characters`);
    need(sc.sub && !DEVANAGARI.test(sc.sub) && sc.sub.length <= 130, `${n}: sub Roman Hinglish, max 130 characters`);
    if (sc.endcard) return;
    for (const p of visualProblems(sc.prompt, n)) e.push(p);
    need(['in', 'out', 'pan'].includes(sc.motion), `${n}: motion in, out or pan`);
    if (sc.animate !== undefined) {
      need(typeof sc.animate === 'string' && sc.animate.length >= 20 && sc.animate.length <= 300 && !/\b(run|running|fight|fighting|dance|dancing|battle|explod|lightning strike|fast)\b/i.test(sc.animate), `${n}: animate: one sentence of GENTLE motion`);
      need(String(sc.tts || '').length <= 95, `${n}: an animated scene's tts is max 95 characters`);
    }
  });
  const marked = body.filter((sc) => sc.animate !== undefined).length;
  need(marked >= (s.no_kaggle === true ? 0 : 1) && marked <= 4, `mark 1-4 scenes with "animate" (has ${marked})`);

  // no science-proof / NASA / era claims anywhere; no numbers the item does not have
  const texts = [s.hook, s.title, s.cover, ...(s.cover_lines || []), yt, desc, s.youtube_tags, s.instagram_caption, s.facebook_caption, s.summary,
    ...scenes.flatMap((sc) => [sc.tts, sc.sub, sc.prompt, sc.animate])].map((x) => String(x || ''));
  const all = texts.join(' \n ');
  need(!SCI.test(all), 'no "scientific proof", NASA, satellite, carbon-dating or archaeology claims (owner rule): say only what the text says');
  need(!ERA.test(all) || ERA.test(itemText(it)), 'no BCE years / "N saal pehle" / "years ago" claims (not in the item)');
  need(!PSEUDO.test(all) && !PROVEN.test(all) && !CURE.test(all), 'no pseudo-science, "proven" or cure claims');
  need(!DEMEAN.test(all), 'respect rule: nobody humiliated, hit or mocked; nothing vulgar');
  const allowed = new Set(nums(itemText(it)));
  const strip = (t) => String(t || '').replace(/Ramayan Tathya \d+\/\d+/gi, ' ').replace(/रामायण तथ्य \d+(\/\d+)?/g, ' ').replace(/^Source:.*$/gim, ' ')
    .replace(/#[\p{L}\p{N}_]+/gu, ' ').replace(/\b(Sarga|Doha|सर्ग|दोहा) \d+([-–]\d+)?( aur \d+)?/gi, ' ');
  const own = [s.hook, s.title, s.cover, ...(s.cover_lines || []), yt, desc, s.instagram_caption, s.facebook_caption, s.summary, lesson.tts, lesson.sub, end.tts, end.sub, sb.tts];
  const extra = [...new Set(own.flatMap((t) => nums(strip(t))))].filter((x) => !allowed.has(x));
  need(!extra.length, `numbers not in the item (no invented numbers, ages or distances): ${extra.join(', ')}`);
  return e;
}
