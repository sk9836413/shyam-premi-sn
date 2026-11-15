// "Kailash Parivar" episode rules (STORY.md section 9; automation/kailash-episodes.json; characters/kailash/). Pure
// functions, used by scripts/validate.mjs (format "kailash") and tested by scripts/kailash-rules.test.mjs.
//
// Why (owner, 15 Nov 2026): a Kailash-family Short on another channel ("Mahadev ne Mata Parvati ko kyun rulaya", 1.13
// crore views) showed the pattern: festival tie-ins, a warm emotional or light-hearted family conflict, a loving
// resolution, ~60 s of dialogue, and a cliffhanger title/cover ("फिर ... ने जो किया…"). We make our OWN stories: never
// that channel's titles or plots, never a face like a TV-serial actor, and strict devotional tone rules.
import fs from 'node:fs';

export const DEVANAGARI = /[ऀ-ॿ]/;
export const STORY_TYPES = ['scripture', 'parampara', 'fictional'];
export const FICTION_LINE = /काल्पनिक प्रस्तुति/;
export const FICTION_LINE_2 = /भक्तिभाव से बनाई गई कहानी/;
export const PLAYLIST = 'Kailash Parivar';
export const PLAYLIST_FALLBACK = 'Shiv ji ki Kathayein';
export const LEN = { min: 55, max: 75 };
export const LINES = { min: 10, max: 16 };
export const DEITY_NAMES = ['महादेव', 'पार्वती', 'गणेश', 'कार्तिकेय', 'नंदी'];
// Title formula: "😱 <situation>! फिर <X> ने जो किया… 🔱❤️ | Mahadev Parvati" (किया / कहा / बताया / सुनाया; or "फिर जो हुआ…").
export const TITLE_RE = /^\p{Extended_Pictographic}️? [^|]*[ऀ-ॿ][^|]*[!?] फिर (?:[ऀ-ॿ ]+ ने )?जो (?:किया|कहा|बताया|सुनाया|हुआ)… 🔱❤️ \| Mahadev Parvati(?: #Shorts)?$/u;

// Tone (hard rules). Intoxication: never, not even as a joke (bhang/ganja/chillum are often joked about with Mahadev:
// that hurts devotees). Mocking/insults, vulgarity, romance beyond dignified divine-couple affection, on-screen
// violence, politics, other religions.
export const INTOXICATION = /\b((?<!(?:dhanush|vrat|tapasya|niyam|dhyan)[- ]?)bhang|bhaang|ganja|gaanja|charas|chillum|chilam|nasha|nashe|nashedi|sharab|sharaab|daaru|daru|beer|whisky|wine|drunk|intoxicat\w*|high\s+ho|smoking|smokes|weed|hookah|cigarette|beedi|bidi|gutka)\b|भांग|भाँग|गांजा|गाँजा|चिलम|(?<![ऀ-ॿ])चरस|(?<![ऀ-ॿ])नशा|(?<![ऀ-ॿ])नशे|शराब|दारू|धुआँ उड़ा|सुट्टा|हुक्का/i;
export const MOCKING = /\b(mazaak\s*uda\w*|mock\w*|joke\s+on|pagal|bewakoof|buddhu|ullu|gadha|gadhe|kutta|kutte|moorkh|murkh|nalayak|kamina|chutiya|bakwas|darpok|loser|stupid|idiot|fool|thappad|slap\w*|joota|chappal\s*maar|toilet|potty|fart\w*|vomit|ulti)\b|मज़ाक उड़ा|मजाक उड़ा|पागल|बेवकूफ़?|बुद्धू|उल्लू|गधा|गधे|मूर्ख|नालायक|डरपोक|थप्पड़|बकवास/i;
export const ROMANCE = /\b(kiss\w*|chumban|romance|romantic|sexy|hot\b|honeymoon|bedroom|flirt\w*|darling|jaanu|jaan\s+meri|baby\s+doll|date\s+par|i\s+love\s+you|hug\s+karke\s+chum)\b|चुंबन|(?<![ऀ-ॿ])चूम|रोमांस|रोमांटिक|सेक्सी|हनीमून|जानू|डार्लिंग/i;
export const VULGAR = /\b(item\s*song|bikini|nude|naked|vulgar|gaali|abuse)\b|गाली|नंगा/i;
export const VIOLENCE = /\b(blood|khoon|behead\w*|sir\s+kaat\w*|gala\s+kaat\w*|kill\w*|murder|maar\s+daal\w*|gore|corpse|laash)\b|खून|सिर काट|गला काट|मार डाल|(?<![ऀ-ॿ])लाश/i;
export const POLITICS_RELIGION = /\b(politic\w*|neta|modi|gandhi|bjp|congress|chunav|election|allah|jesus|yesu|church|girja|masjid|mosque|quran|bible|isai|muslim|islam|namaz|pope)\b|चुनाव|नेता|मस्जिद|चर्च/i;
// The reference channel's titles and plots (never copied): Parvati at her mother's home, leaving Kailash, Mahadev's anger
// shaking Kailash, the pushpak vimaan for Nandi, mice opening the jata, "Mahadev ne Parvati ko rulaya".
export const COPY_GUARD = /mayke|maike|मायके|kailash\s+chhod|कैलाश छोड़|pushpak|पुष्पक|choo?ho[nm]?\s+ko\s+bhaga|चूहों को भगा|jata\s+khol|जटा खोल|रुलाया|rulaya|krodh\s+se\s+kaanp|क्रोध से कांप|हाहाकार|pakad\s+liye\s+kaan|पकड़ लिए कान/i;
const WEAK_OPENER = /^(namaste|namaskar|pranam|doston|dosto|bhakto|swagat|welcome|hello|aaj\s+(suniye|hum)|ek\s+baar\s+ki\s+baat|bahut\s+(samay|pehle)|suniye|chaliye|aaiye)/i;
const WEAK_OPENER_DEV = /^(नमस्ते|नमस्कार|प्रणाम|दोस्तों|भक्तों|स्वागत|आज सुनिए|एक बार की बात|बहुत समय पहले|सुनिए|चलिए|आइए)/;
const GENTLE_BAN = /\b(run|running|fight|fighting|dance|dancing|battle|explod\w*|lightning|fast|fly|flying|jump\w*)\b/i;
const URL = /^https?:\/\//;

// Names the Whisper gate (large-v3-turbo) hears wrongly in some voices: measured 15 Nov 2026 on Kaggle, 3 voices x 12
// test sentences (E:\SK\kailash-pilot\workartest). The gate is never loosened, so the script avoids them instead:
// गणेश right only in the Swara voice (Parvati 2/2; Madhur deep and child heard "गनेश" 4/4) -> others say "गजानन" (3/3);
// कार्तिकेय 0/6 ("कार्ति के", "कार्थिके"), स्कंद 0/3, गणपति 0/3 ("गणपती") -> never spoken (titles/descriptions are fine).
// पार्वती 3/3, नंदी 3/3, महादेव, गजानन 3/3 pass.
export const NAME_VOICE = [
  { word: 'गणेश', ok: (v) => /Swara/.test(v.edge || ''), msg: 'only a Swara voice (Mata Parvati) says "गणेश" (Whisper hears the Madhur voices as "गनेश"): the others say "गजानन"' },
  { word: 'कार्तिकेय', ok: () => false, msg: 'never speak "कार्तिकेय" (Whisper 0/6): address him as "पुत्र", "भैया" or "मेरे लाल"; the name stays in titles and descriptions' },
  { word: 'स्कंद', ok: () => false, msg: 'never speak "स्कंद" (Whisper 0/3)' },
  { word: 'गणपति', ok: () => false, msg: 'never speak "गणपति" (Whisper writes "गणपती"): say "गजानन"' },
];

/** Name/voice problems of the spoken lines (lines: [{who, tts}], lib = cast characters). */
export function nameVoiceProblems(lines, lib = {}) {
  const out = [];
  lines.forEach((l, i) => {
    for (const r of NAME_VOICE) {
      if ((l.tts || '').includes(r.word) && !r.ok(lib[l.who]?.voice || {})) out.push(`line ${i + 1} (${l.who}): ${r.msg}`);
    }
  });
  return out;
}

/** Speaking-time estimate (s) of one line: edge-tts Madhur ~13.6, Swara ~11.6 Devanagari characters a second at +0%,
 *  scaled by the character's rate, + 0.45 s for the pause (measured for the Kalyug/movie voices). */
export function lineSeconds(tts, voice = {}) {
  const cps = (/Swara/.test(voice.edge || '') ? 11.6 : 13.6) * (1 + parseInt(voice.rate || '0', 10) / 100);
  return String(tts || '').length / cps + 0.45;
}

/** Every text field a viewer can see or hear, for the tone rules. */
export function texts(s) {
  return [
    ...(s.scenes || []).flatMap((sc) => [sc?.prompt, sc?.animate, ...(sc?.lines || []).flatMap((l) => [l?.tts, l?.sub])]),
    s.endcard?.tts, s.endcard?.sub, s.title, s.title_dev, s.cover, s.summary, s.moral, s.topic,
    s.youtube_title, s.youtube_description, s.youtube_tags, s.instagram_caption, s.facebook_caption,
  ].filter((t) => typeof t === 'string');
}

/** Tone problems (hard): [] when respectful. */
export function toneProblems(s) {
  const all = texts(s);
  const hit = (re) => all.find((t) => re.test(t));
  const out = [];
  const checks = [
    [INTOXICATION, 'no bhang, ganja, chillum, nasha or any intoxication, not even as a joke'],
    [MOCKING, 'never mock or insult a deity or anyone (no "pagal", "buddhu", "darpok", slaps or toilet humour); light family humour only'],
    [ROMANCE, 'no romance beyond dignified divine-couple affection (no kiss, "romantic", "jaanu", honeymoon...)'],
    [VULGAR, 'no vulgarity'],
    [VIOLENCE, 'no violence or gore on screen or in words (a demon story is one calm line: "asur ka ant hua")'],
    [POLITICS_RELIGION, 'no politics and no other religions'],
  ];
  for (const [re, msg] of checks) {
    const t = hit(re);
    if (t) out.push(`tone: ${msg} (found in "${t.slice(0, 60)}${t.length > 60 ? '…' : ''}")`);
  }
  const copy = hit(COPY_GUARD);
  if (copy) out.push(`original stories only: this reads like the reference channel's title/plot (Parvati mayke, Kailash chhodna, pushpak, choohe/jata, "rulaya", krodh se Kailash kaanpa): "${copy.slice(0, 60)}"`);
  return out;
}

/** Title formula problems. */
export function titleProblems(yt) {
  const t = String(yt || '');
  const out = [];
  if (!TITLE_RE.test(t)) out.push(`youtube_title: follow the formula "😱 <situation in Devanagari>! फिर महादेव ने जो किया… 🔱❤️ | Mahadev Parvati" (किया/कहा/बताया/सुनाया, or "फिर जो हुआ…"; is "${t}")`);
  if ([...t].length > 100) out.push(`youtube_title: max 100 characters (has ${[...t].length})`);
  return out;
}

/** Cover frame: 2-4 big Devanagari words, max 24 characters (drawn on the first 0.4 s). */
export function coverProblems(cover) {
  const c = String(cover || '').trim();
  const n = c.split(/\s+/).filter(Boolean).length;
  return c && DEVANAGARI.test(c) && n >= 2 && n <= 4 && c.length <= 24 ? [] : [`cover: 2-4 big Devanagari words, max 24 characters (is "${c}")`];
}

/** Description: synthetic-media line, source or fiction label, Devanagari, subscribe, series name + hashtag. */
export function descriptionProblems(s) {
  const d = String(s.youtube_description || '');
  const out = [];
  if (!/sanketik/i.test(d) || !/\bAI\b/.test(d)) out.push('youtube_description: the synthetic-media line "Chitra, awaaz aur animation AI se banaye gaye hain (sanketik)."');
  if (!DEVANAGARI.test(d)) out.push('youtube_description: one Devanagari line');
  if (!/subscribe/i.test(d)) out.push('youtube_description: a Like/Share/Subscribe line');
  if (!/kailash parivar/i.test(d) || !/#KailashParivar/.test(d)) out.push('youtube_description: name the series "Kailash Parivar" and add #KailashParivar');
  if (/epifive/i.test(JSON.stringify(s))) out.push('never mention EpiFive (separate brands)');
  if (s.story_type === 'fictional') {
    if (!FICTION_LINE.test(d) || !FICTION_LINE_2.test(d)) out.push('youtube_description: a fictional slice-of-life episode says "काल्पनिक प्रस्तुति / भक्तिभाव से बनाई गई कहानी"');
  } else if (STORY_TYPES.includes(s.story_type)) {
    if (!/(strot|srot|source|स्रोत|आधार)\s*:/i.test(d)) out.push('youtube_description: a source line ("Katha ka strot: <text, khanda/adhyay or the tradition>") for a scripture/parampara episode');
    const src = String(s.source || '');
    const key = src.split(/[,(:;]/)[0].trim().split(/\s+/).slice(0, 2).join(' ');
    if (key && !d.toLowerCase().includes(key.toLowerCase())) out.push(`youtube_description: cite the same source as "source" ("${key}...")`);
  }
  return out;
}

/** All problems of a kailash spec. ctx: { lib (cast.json characters), bank (kailash-episodes.json), hasPortrait(id),
 *  planned(date) -> bool (scripts/day-plan.mjs has a kailash slot that day) }. */
export function checkKailashSpec(s, ctx = {}) {
  const P = [];
  const need = (ok, msg) => { if (!ok) P.push(msg); };
  const lib = ctx.lib || {};
  const bank = ctx.bank || { episodes: [] };
  const pilot = s.release === 'pilot';
  need(s.format === 'kailash' && s.series === 'kailash-parivar' && s.series_title === 'Kailash Parivar', 'format "kailash", series "kailash-parivar", series_title "Kailash Parivar"');
  need(pilot ? /^kailash-pilot-[a-z0-9-]+$/.test(s.slug || '') : /^\d{4}-\d{2}-\d{2}-kailash-[a-z0-9-]+$/.test(s.slug || '') && String(s.slug).startsWith(s.release),
    'slug: <release yyyy-mm-dd>-kailash-<topic in Roman, a-z0-9->');
  if (!pilot) {
    need(/^\d{4}-\d{2}-\d{2}$/.test(s.release || '') && (!ctx.planned || ctx.planned(s.release)),
      `release ${s.release}: a kailash day of scripts/day-plan.mjs (Mon/Thu/Sat, or a festival tie-in day; never movie or Chhath-override days)`);
  }
  need(/^\d{2}:\d{2}$/.test(s.publish_at || ''), 'publish_at: IST time on the release day, e.g. "08:00"');
  const ep = (bank.episodes || []).find((e) => e.id === s.episode_id);
  need(ep, `episode_id: an id from automation/kailash-episodes.json (is "${s.episode_id}")`);
  if (ep?.kind === 'festival' && !pilot && ep.window) need(s.release >= ep.window[0] && s.release <= ep.window[1], `episode ${ep.id} is tied to ${ep.festival}: release within ${ep.window.join('..')}`);
  need(STORY_TYPES.includes(s.story_type), `story_type: ${STORY_TYPES.join(' | ')}`);
  if (s.story_type === 'scripture' || s.story_type === 'parampara') {
    need(String(s.source || '').length >= 20, 'source: the text (with khanda/adhyay) or the named tradition the episode draws on');
    const facts = Array.isArray(s.facts) ? s.facts : [];
    need(facts.length >= 1, 'facts: at least 1 {claim, sources: [2+ URLs]} for the katha details the episode states');
    facts.forEach((f, i) => need(f?.claim && (f.sources || []).filter((u) => URL.test(u)).length >= 2, `fact ${i + 1}: a claim and 2 independent source URLs`));
  }
  const cast = Array.isArray(s.cast) ? s.cast : [];
  cast.forEach((c) => need(lib[c], `cast "${c}" is not in characters/kailash/cast.json`));
  cast.filter((c) => lib[c] && lib[c].kind !== 'voice').forEach((c) => need(!ctx.hasPortrait || ctx.hasPortrait(c), `cast "${c}" has no master portrait yet (characters/kailash/${c}.png, picked by a person)`));
  need(lib[s.lead]?.kind === 'deity' && cast.includes(s.lead), 'lead: the episode\'s main deity (an id from characters/kailash/cast.json, in cast)');
  need(s.deity && !/[|\n]/.test(s.deity) && s.summary && s.summary.length <= 160 && !/[|\n]/.test(s.summary), 'deity and summary (max 160 characters, no "|") for the log line');
  need(s.moral && s.moral.length <= 160, 'moral: the short moral in one line (max 160)');
  need(s.title && s.title.length <= 40 && !DEVANAGARI.test(s.title) && s.title_dev && DEVANAGARI.test(s.title_dev), 'title (Roman, max 40) and title_dev (Devanagari): shown big over the hook after the cover');
  P.push(...coverProblems(s.cover));
  P.push(...titleProblems(s.youtube_title));
  P.push(...descriptionProblems(s));
  P.push(...toneProblems(s));
  need([PLAYLIST, PLAYLIST_FALLBACK].includes(s.playlist), `playlist: "${PLAYLIST}" (created on the first upload) or "${PLAYLIST_FALLBACK}"`);
  const scenes = Array.isArray(s.scenes) ? s.scenes : [];
  need(scenes.length >= 3 && scenes.length <= 6, `3-6 scenes (has ${scenes.length})`);
  let secs = 0, n = 0, animated = 0;
  const said = [];
  const line = (l, where) => {
    const c = lib[l.who];
    need(c && (cast.includes(l.who) || l.who === 'narrator'), `${where}: who "${l.who}" must be in the spec's cast`);
    need(l.tts && DEVANAGARI.test(l.tts) && l.tts.length <= 110 && !/\d/.test(l.tts), `${where}: tts Devanagari, max 110 characters, numbers as words`);
    need(l.sub && !DEVANAGARI.test(l.sub) && l.sub.length <= 110, `${where}: sub = big Hinglish subtitle (Roman), max 110 characters`);
    need(l.shot === undefined || ['wide', 'close'].includes(l.shot), `${where}: shot must be "wide" or "close"`);
    secs += lineSeconds(l.tts, c?.voice); n++;
    said.push(l);
  };
  scenes.forEach((sc, i) => {
    const w = `scene ${i + 1}`;
    need(sc.prompt && sc.prompt.length >= 40 && !/\b(text|letters|writing|sign|caption|words|logo)\b/i.test(sc.prompt.replace(/no (text|letters|writing)/gi, '')), `${w}: prompt missing, too short, or asks for text`);
    (sc.cast || []).forEach((c) => need(cast.includes(c), `${w}: cast "${c}" is not in the spec's cast`));
    const ICON = { mahadev: /mahadev|\bshiva?\b|bholenath/i, parvati: /parvati/i, ganesh: /ganesh|ganesha|ganpati/i, kartikeya: /kartikeya|murugan|skanda/i, nandi: /nandi/i, mushak: /mushak|mouse/i, narad: /narad/i };
    for (const [id, re] of Object.entries(ICON)) need(!re.test(sc.prompt || '') || (sc.cast || []).includes(id), `${w}: the prompt shows ${lib[id]?.name || id}: add "${id}" to the scene's cast (the master look comes from cast.json)`);
    need(['in', 'out', 'pan', 'still', undefined].includes(sc.motion), `${w}: motion in, out, pan or still`);
    if (sc.animate !== undefined) {
      animated++;
      need(typeof sc.animate === 'string' && sc.animate.length >= 20 && sc.animate.length <= 300 && !GENTLE_BAN.test(sc.animate), `${w}: animate: one sentence of GENTLE motion`);
    }
    const ls = Array.isArray(sc.lines) ? sc.lines : [];
    need(ls.length >= 1 && ls.length <= 6, `${w}: 1-6 lines`);
    ls.forEach((l, k) => line(l, `${w} line ${k + 1}`));
  });
  if (s.endcard) line({ who: s.endcard.who || s.lead, ...s.endcard }, 'endcard');
  need(s.endcard && lib[s.endcard.who || s.lead]?.kind === 'deity', 'endcard: spoken by a deity: the moral in one line + the like/subscribe ask');
  need(/like/i.test(s.endcard?.sub || '') && /subscribe/i.test(s.endcard?.sub || ''), 'endcard.sub: ends with the Like and Subscribe ask');
  const first = scenes[0]?.lines?.[0];
  need(first && (first.tts || '').length <= 60 && !WEAK_OPENER.test(String(first.sub || '').trim()) && !WEAK_OPENER_DEV.test(String(first.tts || '').trim()),
    'hook: line 1 is the conflict or surprise in max 60 characters (~2-3 s), no greeting');
  need(animated >= 1 && animated <= 3, `mark 1-3 scenes with "animate" (has ${animated}); 2 become Wan clips`);
  need(said.filter((l) => l.who === s.lead).length >= 2, 'the lead deity speaks at least 2 lines');
  need(n >= LINES.min && n <= LINES.max, `${LINES.min}-${LINES.max} spoken lines incl. the endcard (has ${n})`);
  need(secs >= LEN.min && secs <= LEN.max, `estimated length ${Math.round(secs)} s; an episode is ${LEN.min}-${LEN.max} s`);
  P.push(...nameVoiceProblems(said, lib));
  const names = Array.isArray(s.names) ? s.names : [];
  for (const d of DEITY_NAMES) {
    if (said.some((l) => (l.tts || '').includes(d))) need(names.includes(d), `names: add "${d}" (it is spoken: the Whisper gate checks it)`);
  }
  const tags = String(s.youtube_tags || '').split(',').map((t) => t.trim()).filter(Boolean);
  need(tags.length >= 8 && tags.length <= 15 && DEVANAGARI.test(s.youtube_tags || ''), `youtube_tags: 8-15 tags with some Devanagari (has ${tags.length})`);
  need(!/[<>]/.test(`${s.youtube_title}${s.youtube_description}${s.youtube_tags}`), 'YouTube fields must not contain < or >');
  need(s.instagram_caption && s.instagram_caption.length <= 2200 && !DEVANAGARI.test(s.instagram_caption), 'instagram_caption: Roman, 1-2200 characters');
  need(String(s.facebook_caption || '').trim(), 'facebook_caption: not empty (STORY.md "Facebook caption")');
  return { problems: P, seconds: secs, lines: n, scenes: scenes.length };
}

/** File-backed context for validate.mjs. */
export function loadContext(root = '.') {
  const lib = JSON.parse(fs.readFileSync(`${root}/characters/kailash/cast.json`, 'utf8')).characters;
  const bank = JSON.parse(fs.readFileSync(`${root}/automation/kailash-episodes.json`, 'utf8'));
  return { lib, bank, hasPortrait: (c) => fs.existsSync(`${root}/characters/kailash/${c}.png`) };
}
export const checkSpec = checkKailashSpec;
