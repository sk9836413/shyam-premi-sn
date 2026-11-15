#!/usr/bin/env node
// Bhajan "loop" and "veer" Shorts (format `loop`; owner, 15 Nov 2026). Both are made the evening before by daily.yml job
// `loop` and go public at dawn (05:45 IST: bhajan audio content is public 05:30-06:30, owner rule 14 Nov 2026).
//
// LOOP (reference: a 14-15 s chorus clip over ONE devotional artwork, 19.5 lakh views; the same channel's other uploads of
// the same song got 1-7k: a lottery driven by the loop rate). Our legal version: a 12-15 s SEAMLESS loop of the catchiest
// chorus of OUR OWN QA-passed AI bhajans (music/library, licence JSON; never downloaded or trending audio), ONE new FLUX
// artwork of the deity (clay art / miniature painting / oil painting), a gentle zoom that ends where it started, the
// chorus line as big Devanagari lyrics. Title "<Deity> 🙏 <chorus first words> #bhaktisong #भक्तिभाव #shorts".
// VEER (reference: one intense heroic close-up with a big red jaikara on top, 21.5 lakh views; theirs is a filtered TV
// frame of a real actor: never copied). Our version: an ORIGINAL FLUX deity portrait in rudra/veer mood (Mahakal,
// Hanuman, Maa Kali, Shri Ram, Narasimha), square, letterboxed in black inside 9:16, slow push-in with light rays, the
// jaikara big in red on top (Chrome-drawn Devanagari), 30-40 s of our own QA-passed bhajan chorus or a licence-safe
// library bed. Title "<jaikara> 🙏 #<deity> #bhakti"; the Roman + Devanagari keywords go in the tags.
// VARIETY (YouTube reused/repetitive content policy): never the same audio + picture twice: every upload a new artwork
// (new seed + style), at most one use of the same bhajan in 3 days, a different chorus window than its last use.
// GATE: only bhajans that passed the existing QA gate (licence qa.names all right, CER <= 0.40); Khatu bhajans are out
// until one passes (Whisper hears शाम); festival songs only near their festival. Never loosened.
// ROTATION (scripts/day-plan.mjs): on normal days the morning day-status Short alternates with these: Mon veer (Mahakal),
// Wed loop, Fri loop, Sat veer (Hanuman); Tue/Thu/Sun keep the day status Short; festival days unchanged. LOOPS=off stops.
//
//   node scripts/loop.mjs spec --date D [--kind loop|veer] [--deity shiv] --out <dir>/scenes.json   build the day's spec
//   node scripts/loop.mjs check <scenes.json>                                                     the loop rules
//   node scripts/loop.mjs plan [--days 14]                                                        dry run of the rotation
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const LOOP_SECONDS = [12, 15];
export const VEER_SECONDS = [30, 40];
export const REPEAT_DAYS = 3; // the same bhajan at most once in 3 days (owner, 15 Nov 2026)
export const CER_MAX = 0.4; // the bhajan batch gate (music/bhajan-batch.mjs)
export const ROTATION = { 1: 'veer', 3: 'loop', 5: 'loop', 6: 'veer' }; // weekday -> kind (others: day status)
const LIB = 'music/library';
const DEV = /[ऀ-ॿ]/;
const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } };
const dayNo = (d) => Math.floor(Date.parse(`${d}T00:00:00Z`) / 864e5);
const addDays = (d, n) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const weekday = (d) => new Date(`${d}T12:00:00Z`).getUTCDay();
const hash = (s) => [...String(s)].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

// Deity cards: names, the jaikara (veer), hashtags, and picture prompts (Khatu = sheesh only; Hanuman never bearded).
export const DEITIES = {
  shiv: { roman: 'Mahadev', hi: 'महादेव', jaikara: 'हर हर महादेव', jaikara_roman: 'Har Har Mahadev', tag: '#mahadev', playlist: 'Shiv ji ki Kathayein',
    fb: '#Mahadev #HarHarMahadev #Bhakti',
    loop: 'Lord Shiva in deep meditation on Mount Kailash, ash-blue skin with a deeper blue throat, crescent moon and the river Ganga in his matted hair, a cobra around his neck, trishul with a damru beside him, serene face, snowy peaks and a calm starry sky',
    veer: 'Mahakal, the fierce form of Lord Shiva, a majestic close-up portrait, ash-blue skin, intense third eye glowing softly, crescent moon and flowing matted hair, rudraksha garlands, trishul raised, storm clouds and lightning-lit dramatic sky behind, powerful divine aura' },
  hanuman: { roman: 'Hanuman ji', hi: 'हनुमान जी', jaikara: 'जय बजरंगबली', jaikara_roman: 'Jai Bajrangbali', tag: '#hanuman', playlist: 'Hanuman ji ki Kathayein',
    fb: '#Hanuman #JaiBajrangbali #Bhakti',
    // FLUX draws a bearded Hanuman whatever the prompt says (6 Nov cast sheet, 15 Nov veer pilot): the face is never shown,
    // a heroic back / silhouette composition instead (beard-proof); "no beard" stays in the prompt for the validator.
    loop: 'Lord Hanuman seen from behind, kneeling in devotion with folded hands before a radiant golden light of Shri Ram, orange-vermilion vanara body, golden mukut, a round golden gada (mace) resting beside him, a long monkey tail curled behind him, no trident, face not visible, no beard, sunrise sky',
    veer: 'Lord Hanuman seen from behind, standing tall on a mountain peak, a huge round golden gada (mace) resting on his right shoulder, no trident, no spear, no bow, orange-vermilion muscular vanara body, golden mukut, a long monkey tail curling up behind him, facing a huge rising sun, face not visible, no beard, heroic silhouette, dramatic storm clouds and golden light rays' },
  kali: { roman: 'Maa Kali', hi: 'माँ काली', jaikara: 'जय माँ काली', jaikara_roman: 'Jai Maa Kali', tag: '#maakali', playlist: 'Maa Durga aur Devi ki Kathayein',
    fb: '#MaaKali #JaiMaaKali #Bhakti',
    loop: 'Maa Kali in a gentle protective blessing form, dark blue skin, calm compassionate eyes, flowing black hair, red and gold attire, raising one hand in blessing, lotus and diyas around her, deep red twilight sky',
    veer: 'Maa Kali, majestic fierce close-up portrait, dark blue skin, blazing protective eyes, flowing black hair, golden crown, red hibiscus garland, a raised sword glowing with light, stormy crimson sky with lightning, dignified and divine, no blood' },
  ram: { roman: 'Shri Ram', hi: 'श्री राम', jaikara: 'जय श्री राम', jaikara_roman: 'Jai Shree Ram', tag: '#ram', playlist: 'Vishnu ji aur Krishna ki Kathayein',
    fb: '#ShriRam #JaiShreeRam #Bhakti',
    loop: 'Lord Rama with blue-green skin, golden crown, gentle smile, holding his bow, standing in a lotus garden by the Sarayu river at sunrise',
    veer: 'Lord Rama, majestic heroic close-up portrait, blue-green skin, determined compassionate eyes, golden crown, bow drawn with a glowing arrow, dramatic sunset sky with golden clouds and light rays' },
  narasimha: { roman: 'Narasimha', hi: 'नरसिंह भगवान', jaikara: 'जय नरसिंह भगवान', jaikara_roman: 'Jai Narasimha Bhagwan', tag: '#narasimha', playlist: 'Vishnu ji aur Krishna ki Kathayein',
    fb: '#Narasimha #Vishnu #Bhakti',
    veer: 'Lord Narasimha, majestic fierce close-up portrait, a divine lion face with a golden mane, golden crown and jewels, protective blazing eyes, a radiant chakra glowing behind him, stormy dramatic sky, no blood, dignified and divine' },
  krishna: { roman: 'Shri Krishna', hi: 'श्री कृष्ण', jaikara: 'जय श्री कृष्ण', jaikara_roman: 'Jai Shree Krishna', tag: '#krishna', playlist: 'Vishnu ji aur Krishna ki Kathayein',
    fb: '#Krishna #RadheRadhe #Bhakti',
    loop: 'Blue-skinned Lord Krishna playing the flute under a kadamba tree by the Yamuna, peacock feather crown, yellow silk, cows and peacocks nearby, soft golden evening light' },
  ganesh: { roman: 'Ganesh ji', hi: 'गणेश जी', jaikara: 'गणपति बप्पा मोरया', jaikara_roman: 'Ganpati Bappa Morya', tag: '#ganesh', playlist: 'Ganesh ji ki Kathayein',
    fb: '#Ganesh #GanpatiBappaMorya #Bhakti',
    loop: 'Lord Ganesha with an elephant head and one broken tusk, red and gold attire, a bowl of modaks, his mouse vahan at his feet, seated on a lotus throne with diyas and marigolds' },
  devi: { roman: 'Mata Rani', hi: 'माता रानी', jaikara: 'जय माता दी', jaikara_roman: 'Jai Mata Di', tag: '#matarani', playlist: 'Maa Durga aur Devi ki Kathayein',
    fb: '#MataRani #JaiMataDi #Bhakti',
    loop: 'Maa Durga seated on her lion, eight arms holding her divine weapons and a lotus, red saree with gold, a gentle blessing smile, temple lamps and red chunri' },
};
// Loop art styles (new each upload) and the veer style.
export const LOOP_STYLES = [
  'handmade clay art sculpture style, soft studio light, warm earthy colours, tactile clay texture',
  'traditional Indian miniature painting style, fine gold detailing, rich mineral colours, decorative border-free composition',
  'rich oil painting style, visible brush strokes, warm glowing light, devotional fine-art look',
];
export const VEER_STYLE = 'epic painterly digital art, dramatic cinematic lighting, light rays, high contrast, rich saturated colours, majestic and powerful';
// Which deity on which day (veer: Mon Mahakal, Sat Hanuman; loop: Wed Ganesh, Fri Devi, each falling back to any passed bhajan).
const VEER_DAY = { 1: 'shiv', 2: 'hanuman', 6: 'hanuman', 5: 'kali', 0: 'ram', 4: 'narasimha' };
const LOOP_DAY = { 3: 'ganesh', 5: 'devi', 4: 'krishna', 1: 'shiv' };

/** QA-passed library bhajans (licence qa: every checked name right, CER <= 0.40), with their chorus lines and windows. */
export function passedBhajans(root = '.') {
  const dir = path.join(root, LIB);
  const out = [];
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir).filter((x) => /^bhajan-.*\.licence\.json$/.test(x)) : []) {
    let j;
    try { j = JSON.parse(read(path.join(dir, f))); } catch { continue; }
    const q = j.qa || {};
    if (!(q.names && q.names.checked >= 1 && q.names.right === q.names.checked && typeof q.cer === 'number' && q.cer <= CER_MAX)) continue;
    if (!j.bhajan?.deity || !fs.existsSync(path.join(dir, `${j.id}.ogg`))) continue;
    out.push({ id: j.id, file: path.join(dir, `${j.id}.ogg`), deity: j.bhajan.deity, festival: j.bhajan.festival || null, title_hi: j.bhajan.title_hi, title_roman: j.bhajan.title_roman,
      seconds: j.bhajan.seconds, chorus_at: j.bhajan.chorus_at || 0, bpm: j.bpm || null, lyrics: j.bhajan.lyrics || '', segments: j.bhajan.segments || [] });
  }
  return out;
}

/** Chorus windows of a bhajan: [{ from, dur, line }] with dur within [lo, hi], built from Whisper segments of chorus lines. */
export function chorusWindows(b, [lo, hi]) {
  const chorus = (String(b.lyrics).match(/\[chorus\]([\s\S]*?)(?=\[|$)/i)?.[1] || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const segs = (b.segments || []).filter((s) => s.end > s.start);
  const out = [];
  for (let i = 0; i < segs.length; i++) {
    let end = segs[i].end;
    let k = i;
    while (k + 1 < segs.length && segs[k + 1].end - segs[i].start <= hi) { k++; end = segs[k].end; }
    const dur = Math.min(hi, Math.max(lo, end - segs[i].start + 0.3));
    if (segs[i].start + dur > (b.seconds || 0) + 0.01) continue;
    // the written chorus line the window starts with (most words shared with its first Whisper segment)
    const ws = (t) => new Set(String(t).replace(/[,।!?]/g, ' ').split(/\s+/).filter((w) => w.length > 1));
    const first = ws(segs[i].text);
    const scored = chorus.map((c) => ({ c, n: [...ws(c)].filter((w) => first.has(w)).length })).sort((x, y) => y.n - x.n);
    if (!chorus.length || !scored[0] || scored[0].n < 2) continue;
    out.push({ from: Math.max(0, +(segs[i].start - 0.1).toFixed(2)), dur: +dur.toFixed(2), line: scored[0].c });
  }
  if (!out.length && b.seconds >= lo) out.push({ from: b.chorus_at || 0, dur: Math.min(hi, b.seconds - (b.chorus_at || 0)), line: chorus[0] || '' });
  return out;
}

/** Loop / veer uploads already made: [{ date, slug, kind, bhajan, from, style, seed }] from story/published/*.json. */
export function loopHistory(root = '.') {
  const dir = path.join(root, 'story/published');
  return (fs.existsSync(dir) ? fs.readdirSync(dir) : []).filter((f) => f.endsWith('.json') && !f.endsWith('.meta.json')).flatMap((f) => {
    try {
      const j = JSON.parse(read(path.join(dir, f)));
      return j.format === 'loop' ? [{ date: j.date, slug: j.slug, kind: j.kind, bhajan: j.audio?.bhajan_id || null, from: j.audio?.from ?? null, style: j.picture_style, seed: j.scenes?.[0]?.seed }] : [];
    } catch { return []; }
  });
}

/** Festival songs only within 4 days before their festival day; everything else any day. */
const festivalOk = (b, date, festivals) => !b.festival || festivals.some((f) => String(f.key || f.theme || '').includes(b.festival) && dayNo(f.date) - dayNo(date) >= 0 && dayNo(f.date) - dayNo(date) <= 4);

/** The day's pick: { kind, deity, bhajan?, window?, style, seed } or null. */
export function pickLoop(date, { kind, deity, bhajans = [], history = [], festivals = [] } = {}) {
  const wd = weekday(date);
  kind = kind || ROTATION[wd];
  if (!kind) return null;
  const recent = new Set(history.filter((h) => dayNo(date) - dayNo(h.date) < REPEAT_DAYS && dayNo(date) - dayNo(h.date) >= 0 && h.date !== date).map((h) => h.bhajan));
  const usable = bhajans.filter((b) => !recent.has(b.id) && festivalOk(b, date, festivals));
  const want = deity || (kind === 'veer' ? VEER_DAY[wd] : LOOP_DAY[wd]);
  const seed = 1000 + (hash(`${date}-${kind}`) % 90000);
  if (kind === 'veer') {
    const d = DEITIES[want]?.veer ? want : 'hanuman';
    const b = usable.find((x) => x.deity === d);
    const win = b ? pickWindow(b, VEER_SECONDS, history) : null;
    return { kind, deity: d, bhajan: win ? b : null, window: win, style: VEER_STYLE, seed };
  }
  // loop: a passed bhajan is required (the song IS the Short); the wanted deity first, then any other deity
  const order = [...usable.filter((b) => b.deity === want), ...usable.filter((b) => b.deity !== want && DEITIES[b.deity]?.loop)];
  for (const b of order) {
    const win = pickWindow(b, LOOP_SECONDS, history);
    if (win) {
      const used = history.filter((h) => h.kind === 'loop').map((h) => h.style);
      const style = LOOP_STYLES.find((s) => !used.slice(-2).includes(s)) || LOOP_STYLES[hash(date) % LOOP_STYLES.length];
      return { kind, deity: b.deity, bhajan: b, window: win, style, seed };
    }
  }
  return null;
}
function pickWindow(b, range, history) {
  const wins = chorusWindows(b, range);
  const last = history.filter((h) => h.bhajan === b.id).map((h) => h.from);
  return wins.find((w) => !last.includes(w.from)) || null;
}

/** The library instrumental bed for a veer Short without a passed bhajan (music/engine.mjs, festive/aarti mood). */
export function veerBed(root = '.', date = '') {
  const dir = path.join(root, LIB);
  const beds = (fs.existsSync(dir) ? fs.readdirSync(dir) : []).filter((f) => f.endsWith('.licence.json') && !f.startsWith('bhajan-')).map((f) => {
    try { return JSON.parse(read(path.join(dir, f))); } catch { return null; }
  }).filter((j) => j && j.kind !== 'vocal' && (j.moods || []).some((m) => ['festive', 'aarti'].includes(m)) && fs.existsSync(path.join(dir, `${j.id}.ogg`)));
  if (!beds.length) return null;
  const j = beds[hash(date) % beds.length];
  return { id: j.id, file: path.join(dir, `${j.id}.ogg`), licence: j.licence, title: j.title || j.id };
}

/** Builds the spec of a loop / veer Short (no Claude: everything comes from the library and the cards above). */
export function buildSpec(date, pick, { bed = null, at = '05:45' } = {}) {
  const D = DEITIES[pick.deity];
  const veer = pick.kind === 'veer';
  const b = pick.bhajan;
  const words = (t, n) => String(t || '').replace(/[,।!?]/g, ' ').split(/\s+/).filter(Boolean).slice(0, n).join(' ');
  const line = pick.window?.line || '';
  const slug = `${date}-${pick.kind}-${pick.deity}-${b ? b.id.replace(/^bhajan-/, '') : 'bed'}`.replace(/[^a-z0-9-]/g, '-');
  const prompt = `${veer ? D.veer : D.loop}, square composition with the deity in the centre, no text, no letters, no watermark`;
  const youtube_title = veer
    ? `${D.jaikara} 🙏 ${D.tag} #bhakti`
    : `${D.roman} 🙏 ${words(b.title_roman || '', 4)} | ${words(line, 4)} #bhaktisong #भक्तिभाव #shorts`;
  const ai = 'Chitra AI dwara banaye gaye hain (sanketik).';
  const song = b ? `भजन: मौलिक रचना, AI द्वारा गाया गया (ACE-Step)` : `Sangeet: ${bed?.title || 'library'} (${bed?.licence || 'licence-safe'})`;
  return {
    slug, format: 'loop', kind: pick.kind, date, publish_at: at, deity: D.roman, title: veer ? D.jaikara_roman : `${D.roman} Bhajan`,
    kicker: veer ? 'Jaikara' : 'Bhakti Geet', playlist: D.playlist, picture_style: pick.style, style: `${pick.style}, no text, no letters`,
    scenes: [{ prompt, seed: pick.seed, deity: true }],
    audio: b ? { bhajan_id: b.id, file: b.file, from: pick.window.from, dur: pick.window.dur, bpm: b.bpm } : { music_id: bed?.id, file: bed?.file, from: 0, dur: VEER_SECONDS[0] + 4 },
    lyric: veer ? null : line, jaikara: veer ? D.jaikara : null,
    summary: `${pick.kind} Short: ${D.roman}, ${b ? `bhajan ${b.id} chorus ${pick.window.from}-${(pick.window.from + pick.window.dur).toFixed(1)} s` : `bed ${bed?.id}`}, art ${pick.style.split(',')[0]}, seed ${pick.seed}`,
    youtube_title,
    youtube_description: [veer ? `${D.jaikara} 🙏` : `${D.hi} 🙏 ${line}`,
      veer ? `${D.jaikara_roman}! ${D.roman} ki shakti aur bhakti ka darshan.` : `${D.roman} ka bhajan, mool AI rachna (original). Loop par sunein.`,
      song, ai, 'Jai Shree Shyam 🙏 Achha laga ho to Like, Share aur Subscribe karein.', `${D.tag} #bhakti #bhaktisong #shorts`].join('\n'),
    youtube_tags: [D.roman, D.hi, `${D.roman} bhajan`, `${D.hi} भजन`, D.jaikara_roman, D.jaikara, 'Bhakti song', 'भक्ति गीत', 'bhakti status', 'भक्ति स्टेटस', 'devotional shorts', 'सनातन धर्म'].join(', '),
    instagram_caption: `${D.jaikara_roman} 🙏\n${veer ? `${D.roman} ka veer roop.` : `${D.roman} ka bhajan (original AI rachna).`} Chitra AI se (sanketik).\n${D.fb} #bhaktisong #shorts`,
    facebook_caption: `${D.jaikara} 🙏 आज किसके लिए प्रार्थना कर रहे हैं?\n${veer ? `${D.hi} का वीर रूप।` : `${D.hi} का भजन, मौलिक रचना।`}\n${D.fb}`,
    synthetic: true,
  };
}

/** The loop rules (problems; empty = OK). */
export function checkLoopSpec(s, { history = [] } = {}) {
  const e = [];
  const need = (ok, m) => { if (!ok) e.push(m); };
  need(s.format === 'loop' && ['loop', 'veer'].includes(s.kind), 'format "loop", kind loop | veer');
  need(/^\d{4}-\d{2}-\d{2}-(loop|veer)-[a-z0-9-]+$/.test(s.slug || '') && s.slug.startsWith(s.date), 'slug <date>-<loop|veer>-<deity>-<bhajan>');
  need(DEITIES[Object.keys(DEITIES).find((k) => DEITIES[k].roman === s.deity)], 'deity: one of the deity cards');
  need(!/khatu|shyam/i.test(`${s.deity} ${s.audio?.bhajan_id || ''}`) || false, 'no Khatu bhajan until one passes the pronunciation gate');
  const [lo, hi] = s.kind === 'veer' ? VEER_SECONDS : LOOP_SECONDS;
  need(s.audio?.file && s.audio.dur >= (s.kind === 'veer' && !s.audio.bhajan_id ? lo : Math.min(lo, LOOP_SECONDS[0])) && s.audio.dur <= hi + 4, `audio: ${lo}-${hi} s`);
  if (s.kind === 'loop') need(s.audio?.bhajan_id && DEV.test(s.lyric || ''), 'loop: a QA-passed bhajan chorus and its Devanagari lyric line');
  if (s.kind === 'veer') need(DEV.test(s.jaikara || ''), 'veer: the Devanagari jaikara');
  const p = s.scenes?.[0]?.prompt || '';
  need(/no text/i.test(p) && !/actor|actress|tv serial|film still|celebrity/i.test(p), 'picture: original, no text, never a real actor / TV frame');
  if (/hanuman/i.test(p)) need(/no beard/i.test(p), 'Hanuman ji: "clean-shaven vanara face, no beard"');
  if (/khatu|shyam baba/i.test(p)) need(/sheesh|head only/i.test(p), 'Khatu Shyam ji = the sheesh only');
  need(/sanketik/i.test(s.youtube_description || '') && (s.audio?.bhajan_id ? /AI द्वारा गाया गया/.test(s.youtube_description || '') : /Sangeet:/.test(s.youtube_description || '')), 'description: AI picture line and the bhajan / music disclosure');
  need(/🙏/.test(s.youtube_title || '') && (s.kind === 'veer' ? /#bhakti/.test(s.youtube_title) : /#bhaktisong/.test(s.youtube_title)), 'title: "<Deity> 🙏 <chorus words> #bhaktisong #भक्तिभाव #shorts" / veer "<jaikara> 🙏 #<deity> #bhakti"');
  need((s.youtube_title || '').length <= 100, 'title max 100 characters');
  const tags = String(s.youtube_tags || '').split(',').filter((t) => t.trim());
  need(tags.length >= 8 && DEV.test(s.youtube_tags || ''), 'tags: 8+ with Roman and Devanagari keywords');
  // variety: never the same audio + picture again; the same bhajan at most once in 3 days
  for (const h of history) {
    if (h.slug === s.slug) continue;
    if (h.bhajan && h.bhajan === s.audio?.bhajan_id && Math.abs(dayNo(s.date) - dayNo(h.date)) < REPEAT_DAYS) e.push(`bhajan ${h.bhajan} already used on ${h.date} (max once in ${REPEAT_DAYS} days)`);
    if (h.bhajan && h.bhajan === s.audio?.bhajan_id && h.from === s.audio?.from && h.seed === s.scenes?.[0]?.seed) e.push(`the same audio + picture as ${h.slug}`);
  }
  return e;
}

function main() {
  const args = process.argv.slice(2);
  const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
  const festivals = (() => { try { return JSON.parse(read('automation/festivals.json')).festivals || []; } catch { return []; } })();
  if (args[0] === 'spec') {
    const date = opt('--date');
    const pick = pickLoop(date, { kind: opt('--kind'), deity: opt('--deity'), bhajans: passedBhajans('.'), history: loopHistory('.'), festivals });
    if (!pick) { console.log(JSON.stringify({ status: 'none', why: `no ${opt('--kind') || 'rotation'} Short for ${date} (no QA-passed bhajan left for a loop)` })); process.exit(2); }
    const spec = buildSpec(date, pick, { bed: pick.bhajan ? null : veerBed('.', date), at: opt('--at') || '05:45' });
    const out = opt('--out');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, `${JSON.stringify(spec, null, 2)}\n`);
    const e = checkLoopSpec(spec, { history: loopHistory('.') });
    console.log(JSON.stringify({ status: e.length ? 'invalid' : 'ok', slug: spec.slug, kind: spec.kind, deity: spec.deity, audio: spec.audio.bhajan_id || spec.audio.music_id, problems: e }));
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `slug=${spec.slug}\nkind=${spec.kind}\n`);
    process.exit(e.length ? 1 : 0);
  }
  if (args[0] === 'check') {
    const e = checkLoopSpec(JSON.parse(read(args[1])), { history: loopHistory('.') });
    console.log(e.length ? e.map((x) => `- ${x}`).join('\n') : `OK: ${args[1]}`);
    process.exit(e.length ? 1 : 0);
  }
  if (args[0] === 'plan') {
    const from = opt('--from') || new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
    const history = loopHistory('.');
    const bh = passedBhajans('.');
    for (let i = 0; i < Number(opt('--days') || 14); i++) {
      const d = addDays(from, i);
      const p = pickLoop(d, { bhajans: bh, history, festivals });
      console.log(`${d} ${p ? `${p.kind} ${p.deity} ${p.bhajan?.id || '(library bed)'} ${p.window ? `${p.window.from}+${p.window.dur}s` : ''}` : '-'}`);
      if (p) history.push({ date: d, kind: p.kind, bhajan: p.bhajan?.id || null, from: p.window?.from ?? null, style: p.style, seed: p.seed });
    }
    return;
  }
  console.log('usage: node scripts/loop.mjs spec --date D [--kind loop|veer] --out F | check F | plan [--days N]');
  process.exit(2);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
