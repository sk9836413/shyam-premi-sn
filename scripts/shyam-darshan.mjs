// Shyam Baba's REAL darshan pictures (owner, 20 Nov 2026: "AI se Shyam Baba ka proper pic nahi ban pa raha; maine sample
// diye hain, aisa hi hota hai Shyam Baba ka roop"). footage/shyam-baba-pandal-darshan/ holds 18 stills from the owner's
// own darshan videos (white-flower shringar, red-rose shringar, akhand jyot) and 5 of his own photos, recorded at a
// decorated Shyam Baba PANDAL (sajavat), NOT the Khatu Shyam ji mandir in Sikar. One licence.json per picture
// (source/licence "own", place, focus point, kind, view, deity_face; characters/REAL-FOOTAGE.md section 6).
//
// Where they win over AI pictures (an AI picture stays the fallback for other deities and for what the stills cannot
// show: Barbarik the young warrior, the sheesh daan katha, temple buildings, crowds, roads, kund...):
//   story/render-story.mjs   every Shyam Baba darshan scene of a Short / status Short (realScenesFor below); no FLUX
//                            image is made for those scenes (animate/frames.mjs wanted, render-story --prepare)
//   animate/frames.mjs       fallbackImage(): a Khatu prompt without an AI image gets a real still before the AI bank
//   story/render-long.mjs    a Shyam Baba darshan image of the long video gets a landscape real photo (16:9 crop)
//   scripts/photos.mjs       post 4 (Sandhya aarti darshan) and the Khatu festival cards (Janmotsav, Ekadashi)
// Honesty: the picture shows the label "Asli darshan: Shyam Baba pandal, Shyam Premi SN"; captions and descriptions get
// the credit line (licence attribution) "Asli darshan: Shyam Baba ka pandal (sajavat), Shyam Premi SN ne khud record
// kiya; Khatu mandir nahi"; nothing calls these pictures the Khatu mandir. They carry no "AI chitra" label and do not
// count as AI visuals (scripts/ai-disclosure.mjs `real_image`); AI music / an AI voice are still disclosed as before.
// SPS_SHYAM_REAL=0 (or `ai_only: true` on a spec or scene) keeps the old AI-only behaviour.
import fs from 'node:fs';
import path from 'node:path';
import { photosFor, FOOTAGE } from './real-photos.mjs';

export const SHYAM_REAL_SLUG = 'shyam-baba-pandal-darshan';
export const SHYAM_REAL_DIR = path.join(FOOTAGE, SHYAM_REAL_SLUG);
export const SHYAM_REAL_LABEL = 'Asli darshan: Shyam Baba pandal, Shyam Premi SN';
export const SHYAM_REAL_PLACE_HI = 'श्याम बाबा का पंडाल (सजावट)';

// ---- the AI prompt of the sheesh roop, written from the real darshan (footage/shyam-baba-pandal-darshan) --------------
// What the real darshan shows: a dark, almost black sheesh face with large wide-open eyes, a curled black moustache, a
// tilak; golden ear ornaments beside the face; a tall golden jewelled mukut with a crest (blue peacock-feather motifs in
// the white shringar) and a round golden prabhamandal behind it; heavy garlands of red roses, marigold and white flowers
// in wide layered arcs that frame the face and fill the whole lower picture; a pink silk patka and a gold necklace under
// the face; a carved silver-and-gold darbar backdrop with an arched canopy; small diyas and the akhand jyot in front.
// Never a body, arms, hands or a flute (that is Shri Krishna). validate.mjs needs "sheesh", "mukut" and "garland" here,
// and rejects "full body" / "torso" / "his hands" and "text" / "letters" even when negated, so the negatives below avoid
// those words (the format styles already say "no text").
export const SHEESH_LOOK = 'the divine Sheesh (head only, no body, no neck, no arms, no hands, no flute) of Shri Khatu Shyam ji as a temple murti: '
  + 'a dark, almost black sheesh face with large wide-open eyes, a curled black moustache and a red tilak on the forehead, '
  + 'golden ear ornaments on both sides of the face, a tall golden jewelled mukut with a crest and peacock-feather motifs and a round golden halo '
  + 'set with red and green stones behind it; the face is framed by heavy garlands of red roses, orange marigold and white flowers flowing down in '
  + 'wide layered arcs, a pink silk patka and a gold necklace below the face; behind it a carved silver and gold darbar backdrop with an arched canopy, '
  + 'small brass diyas and an akhand jyot glowing in front; front-facing, symmetrical, not Shri Krishna, no blue skin, no modern objects';
/** Photo posts / bank pictures: a whole darshan picture. */
export const KHATU_DARSHAN_PROMPT = `Front-facing darshan of ${SHEESH_LOOK}`;
/** Negative prompt for generators with true CFG (Kaggle FLUX `negative`, cfg true_cfg > 1). */
export const KHATU_NEGATIVE = 'body, shoulders, arms, hands, holding a flute, flute, bansuri, Krishna, blue skin, standing figure, sitting figure, '
  + 'modern objects, mobile phone, plastic, electric wires, people, devotees, text, letters, words, watermark, logo, extra eyes, deformed face, '
  + 'asymmetrical eyes, crooked crown, cartoon, anime';

// ---- which scenes show Shyam Baba's darshan ------------------------------------------------------------------------
const NAMED = /khatu\s*shyam|shyam\s*baba|baba\s*shyam|shri\s*shyam\s*ji|shyam\s*ji\b|khatu\s*naresh|sheesh\s*ke\s*daani|खाटू\s*श्याम|श्याम\s*बाबा|बाबा\s*श्याम/i;
const VISUAL = /darshan|murti|idol|\bface\b|deity|sheesh|head only|divine head|mukut|crown|shringar|darbar|sanctum|garbh/i;
// The katha and places the stills cannot show (the stills are the deity in a pandal darbar, nothing else).
const NOT_DARSHAN = /barbari|warrior|\bprince\b|battle|kurukshetra|\bbow\b|arrows?\b|mahabharat|ghatotkach|bhe+m\b|morvi|ahilawati|disguise|brahmin|sheesh\s*daan|offer(s|ed|ing)?\s+(his|the)\s+head|severed|\bcow\b|\bkund\b|pond|nishan|\broad\b|marble|temple (building|exterior|gate|shikhar|town)|shikhar|aerial|village|digging|buried|from the ground|night sky|crowd/i;

export const realShyamOn = (spec = {}) => process.env.SPS_SHYAM_REAL !== '0' && !spec?.ai_only;

/** A scene (or a picture prompt) that shows Shyam Baba's darshan: the sheesh in a darbar, not a katha or a place. */
export function showsShyamDarshan(prompt) {
  const p = String(prompt || '');
  return NAMED.test(p) && VISUAL.test(p) && !NOT_DARSHAN.test(p);
}

/**
 * The real stills: photosFor() rules (licence "own", author, source), plus `face` = only pictures with the deity's face
 * large (deity_face), `landscape` = only wider-than-tall pictures (the long video's 16:9 frame).
 * Also the owner's later darshan photos from the mail inbox (scripts/inbox.mjs): footage/<slug>-own/ and
 * footage/khatu-shyam-mandir/, only pictures whose licence.json says `bank: "shyam-darshan"` (each with its own place
 * label and credit, never the pandal's).
 */
const bankCache = new Map();
export function inboxStills(root = FOOTAGE) {
  if (bankCache.has(root)) return bankCache.get(root);
  const dirs = fs.existsSync(root) ? fs.readdirSync(root).filter((d) => /-own$/.test(d) || d === 'khatu-shyam-mandir') : [];
  const list = dirs.flatMap((d) => photosFor(d, root)).filter((p) => p.bank === 'shyam-darshan');
  bankCache.set(root, list);
  return list;
}
export function shyamStills({ root, face = true, landscape = false } = {}) {
  const list = [...photosFor(SHYAM_REAL_SLUG, root || FOOTAGE), ...inboxStills(root || FOOTAGE)].filter((p) => p.source === 'own' && p.ai !== true);
  return list.filter((p) => (!face || p.deity_face) && (!landscape || (Array.isArray(p.size) && p.size[0] > p.size[1])));
}

const hash = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
// The colour a scene asks for, in its own words (SHEESH_LOOK, shared by every prompt, names red roses AND white flowers).
const kindFor = (prompt) => {
  const p = String(prompt || '').split(SHEESH_LOOK).join(' ');
  return /\b(white|safed|jasmine|mogra|gajra)\b|सफेद/i.test(p) ? 'safed' : /\b(red|rose|roses|gulab)\b|गुलाब|लाल/i.test(p) ? 'gulab' : null;
};

/** One still for a prompt: the colour the prompt asks for when there is one, rotated by `key`, not in `used`. */
export function pickStill(list, prompt, key = '', used = []) {
  if (!list.length) return null;
  const free = list.filter((p) => !used.includes(p.file));
  const pool = free.length ? free : list;
  const want = kindFor(prompt);
  const match = want ? pool.filter((p) => p.kind === want) : [];
  const from = match.length ? match : pool;
  return from[hash(key) % from.length];
}

/**
 * Scene index -> real still for every Shyam Baba darshan scene of a Short / status spec (spec.scenes). Different
 * stills on different scenes (as far as there are enough). Empty when switched off or when there are no stills.
 */
export function realScenesFor(spec, { root, landscape = false } = {}) {
  const out = new Map();
  if (!spec || !realShyamOn(spec)) return out;
  const list = shyamStills({ root, landscape, face: !landscape });
  if (!list.length) return out;
  const used = [];
  (spec.scenes || []).forEach((s, i) => {
    if (!s || s.endcard || s.ai_only || !showsShyamDarshan(s.prompt)) return;
    const still = pickStill(list, s.prompt, `${spec.slug || ''}-${i}`, used);
    if (still) { used.push(still.file); out.set(i, still); }
  });
  return out;
}

/** Image index -> landscape real still for the long video's Shyam Baba darshan images (spec.images, 16:9 frames). */
export function longImagesFor(spec, { root } = {}) {
  const out = new Map();
  if (!spec || !realShyamOn(spec)) return out;
  const list = shyamStills({ root, face: false, landscape: true });
  if (!list.length) return out;
  const used = [];
  (spec.images || []).forEach((im, i) => {
    if (!im || im.file || im.ai_only || !showsShyamDarshan(im.prompt)) return;
    const still = pickStill(list, im.prompt, `${spec.slug || ''}-img${i}`, used);
    if (still) { used.push(still.file); out.set(i, still); }
  });
  return out;
}

/** Repo-relative path of a still ("footage/shyam-baba-pandal-darshan/<name>.jpg"), for specs and posts. */
export const relStill = (still, root = path.dirname(FOOTAGE)) => path.relative(root, still.file).split(path.sep).join('/');

/** ffmpeg crop x / y (pixels) that keep the still's focus point inside a cw x ch window of an iw x ih picture. */
export function focusCrop(still, iw, ih, cw, ch) {
  const fx = Number(still?.focus?.x ?? 0.5); const fy = Number(still?.focus?.y ?? 0.5);
  const clamp = (v, max) => Math.max(0, Math.min(max, Math.round(v)));
  return { x: clamp(fx * iw - cw / 2, iw - cw), y: clamp(fy * ih - ch / 2, ih - ch) };
}

/** CSS object-position of a still (photo cards). */
export const focusCss = (still) => `${Math.round(100 * Number(still?.focus?.x ?? 0.5))}% ${Math.round(100 * Number(still?.focus?.y ?? 0.5))}%`;

// A sentence that would call the pandal the Khatu mandir / Khatu Dham, or place it in Sikar.
export const KHATU_PLACE_CLAIM = /((khatu\s*(dham|mandir|temple)|sikar|खाटू\s*(धाम|मंदिर)|सीकर)[^\n.?!।]{0,40}(darshan|दर्शन|\bse\b|से(?![ऀ-ॿ])|live|लाइव))|((darshan|दर्शन)[^\n.?!।]{0,30}(khatu\s*(dham|mandir|temple)|sikar|खाटू\s*(धाम|मंदिर)|सीकर))/i;
