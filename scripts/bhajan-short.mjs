#!/usr/bin/env node
// Bhajan Shorts (owner, 13 Nov 2026: original Chhath Puja bhajans on the channel from 13 Nov, 2-3 a day 14-16 Nov).
// A vertical Short whose WHOLE soundtrack is one QA-passed library bhajan (music/library/bhajan-*, ACE-Step 1.5, our own
// lyrics), starting just before its chorus, 45-90 s; no narration. Pictures: the licence-safe AI picture bank
// brand/photo-bank/<festival>/ (no faces), so no Workers AI neurons and no Kaggle session are needed at upload time
// (the Kaggle blocked window 18:30-21:00 IST does not matter). Text: a bold Hindi hook on frame 1, the first chorus line
// under it (the song starts on the chorus), then short blessings; the end card. Title/description/captions come from
// automation/chhath-2026.json (the date-scoped override; scripts/day-plan.mjs routes the slot here).
//
//   node scripts/bhajan-short.mjs build --date 2026-11-13 --slot bhajan --out story/bhajan/work/spec.json
//        writes the spec (format "status", bhajan_short, bhajan_id = the chosen song) and prints
//        {"slug","publish_at","fb","bhajan"}; exit 1 when no Chhath bhajan passed QA (the caller falls back)
//   node scripts/bhajan-short.mjs pick --date D --slot S      only which bhajan would be used
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { bhaktiTags, bhaktiTitle, withTags } from './bhakti-seo.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CONFIG = path.join(ROOT, 'automation', 'chhath-2026.json');
export const MIN_S = 45, MAX_S = 88;
const FADE = 0.4; // render-story.mjs scene cross-fade

export function loadOverride(file = CONFIG) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}
/** The override entry of a slot on a date, or null. */
export function slotOverride(date, slot, cfg = loadOverride()) {
  return cfg?.days?.[date]?.slots?.[slot] || null;
}

/** Library bhajans of the festival, best first for a day: the day's own song, then the general ones, then the rest;
 *  inside a tier the one used least recently (history: [{date, id}]), then the lowest CER. */
export function chooseBhajan(bhajans, { festival, day, date, history = [] }) {
  // only the day's own song or a general one of the festival (never the Nahay Khay song under a Kharna title)
  const pool = bhajans.filter((b) => b.bhajan?.festival === festival && (b.bhajan.day === day || b.bhajan.day === festival || !b.bhajan.day));
  if (!pool.length) return null;
  const last = (id) => history.filter((h) => h.id === id && h.date <= date).map((h) => h.date).sort().pop() || '0000';
  const tier = (b) => (b.bhajan.day === day ? 0 : b.bhajan.day === festival || !b.bhajan.day ? 1 : 2);
  return [...pool].sort((a, b) => tier(a) - tier(b) || last(a.id).localeCompare(last(b.id)) || (a.qa?.cer ?? 1) - (b.qa?.cer ?? 1) || a.id.localeCompare(b.id))[0];
}

const lines = (lyrics) => String(lyrics || '').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !/^\[.*\]$/.test(l));
const BLESS = ['जय छठी मइया 🙏', 'सूर्य देव की जय', 'छठ महापर्व की शुभकामनाएं', 'छठी मइया सबकी मनोकामना पूरी करें', 'घाट घाट दीप जले', 'जय सूर्य देव 🌅'];

/** The spec of one bhajan Short. o = override entry; track = library bhajan (licence JSON + file). */
export function buildSpec({ date, slot, o, track, bank, festival = 'chhath', hashtag = '#ChhathPuja', min = MIN_S }) {
  const from = Math.max(0, track.bhajan.chorus_at - 0.3);
  const avail = (track.bhajan.seconds || track.qa?.seconds || 60) - from;
  const target = Math.min(MAX_S, avail - 0.6);
  if (target < min) throw new Error(`${track.id}: only ${avail.toFixed(1)} s of song after the chorus starts (need ${min})`);
  const pics = (o.images || []).map((n) => bank.find((f) => new RegExp(`-${n}\\.jpe?g$`).test(f))).filter(Boolean);
  for (const f of bank) if (pics.length < 5 && !pics.includes(f)) pics.push(f);
  if (pics.length < 3) throw new Error(`only ${pics.length} bank pictures for ${festival}`);
  const n = Math.min(pics.length, Math.max(5, Math.round(target / 9)));
  const endHold = 4;
  // scene lengths: (sum of holds) - FADE * (scenes) = target, with n picture scenes + the end card
  const hold = Math.round(((target - endHold + FADE * n) / n) * 100) / 100;
  const sung = lines(track.bhajan.lyrics);
  const scenes = pics.slice(0, n).map((img, i) => ({
    image: path.resolve(img),
    prompt: `bank picture ${path.basename(img)} (licence-safe AI picture bank, no faces)`,
    motion: ['in', 'pan', 'out'][i % 3],
    hold,
    big: i === 0 ? o.hook : BLESS[(i - 1) % BLESS.length],
    ...(i === 0 && sung[0] ? { line: sung[0].slice(0, 48) } : i === 1 && sung[1] ? { line: sung[1].slice(0, 48) } : {}),
    tts: 'जय छठी मइया',
    sub: 'Jai Chhathi Maiya',
  }));
  scenes.push({ endcard: true, hold: endHold, big: 'जय छठी मइया 🙏', tts: 'जय छठी मइया', sub: 'Jai Chhathi Maiya' });
  const slotWord = slot === 'bhajan' ? 'bhajan' : slot;
  const slug = `${date}-${slotWord}-chhath-${o.day}-geet`;
  // + one searched generic phrase ("Bhakti Geet"; Shyam songs "Shyam Bhajan 2026" / "Shyam Baba Song"), scripts/bhakti-seo.mjs
  const title = bhaktiTitle(o.title, { date, festival, slot });
  const songHi = track.bhajan.title_hi || '';
  const desc = [
    `${o.intro_hi}`,
    `इस छठ पर सुनिए नया छठ गीत "${songHi}" 🙏 जय छठी मइया, जय सूर्य देव।`,
    '',
    `Chhath Puja 2026 ka naya geet: "${track.bhajan.title_roman || track.title}". ${o.festival}.`,
    'Bhakti Geet | भक्ति गीत: Shyam Premi SN ke naye maulik bhajan.',
    'भजन: मौलिक रचना, AI द्वारा गाया गया (ACE-Step)',
    'Chitra AI dwara banaye gaye hain (sanketik).',
    '',
    'Aise hi bhajan aur darshan ke liye subscribe karein: Shyam Premi SN',
    '',
    `${hashtag} #ChhathGeet #ChhathiMaiya #छठपूजा #Shorts`,
  ].join('\n');
  return {
    slug, format: 'status', bhajan_short: true, bhajan_id: track.id, loop: false, date, festival_date: date, slot,
    festival: o.festival, theme: festival, family: slug, title: 'Shyam Premi SN', kicker: o.kicker,
    playlist: 'Tyohar aur Vrat Kathayein', voice: 'hf_alpha', signoff: 'Jai Chhathi Maiya',
    style: 'licence-safe AI picture bank (brand/photo-bank), no text, no faces',
    endline: 'Apne parivaar ko bhejein 🙏 | Subscribe: Shyam Premi SN',
    ...(o.at ? { publish_at: o.at } : {}),
    scenes,
    youtube_title: title,
    youtube_description: desc,
    youtube_tags: withTags(['chhath puja song', 'chhath puja geet 2026', 'chhath geet', 'chhathi maiya song', 'chhath bhajan', `${o.day.replace(/-/g, ' ')} geet`,
      'छठ पूजा गीत', 'छठ गीत', 'छठी मइया', 'छठ पूजा 2026', 'surya dev', 'bhojpuri chhath geet', 'shyam premi sn'].join(', '), bhaktiTags({ festival, date })),
    instagram_caption: `${o.festival} 🙏 Naya Chhath geet "${track.bhajan.title_roman || track.title}". Jai Chhathi Maiya, Jai Surya Dev.\n\nBhajan: maulik rachna, AI dwara gaya gaya (ACE-Step). Chitra AI dwara (sanketik).\n\n${hashtag} #ChhathGeet #ChhathiMaiya #Chhath2026 #ShyamPremiSN`,
    facebook_caption: `${o.question_hi.startsWith('जय') ? '' : 'जय छठी मइया 🙏 '}${o.question_hi}\n${o.intro_hi}\n\n#KhatuShyam #JaiShreeShyam ${hashtag}`,
    song: { id: track.id, from, seconds: Math.round((n * hold + endHold - FADE * n) * 100) / 100 },
  };
}

export function bankPictures(festival = 'chhath') {
  const d = path.join(ROOT, 'brand', 'photo-bank', festival);
  return fs.existsSync(d) ? fs.readdirSync(d).filter((f) => /\.jpe?g$/i.test(f)).sort((a, b) => a.localeCompare(b, 'en', { numeric: true })).map((f) => path.join(d, f)) : [];
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
  const date = opt('--date'), slot = opt('--slot');
  const cfg = loadOverride();
  const o = slotOverride(date, slot, cfg);
  if (!o || o.kind !== 'bhajan') { console.log(JSON.stringify({ error: `no bhajan slot ${slot} on ${date} in automation/chhath-2026.json` })); process.exit(1); }
  const { loadBhajans, bhajanHistory } = await import(pathToFileURL(path.join(ROOT, 'music', 'bhajan.mjs')).href);
  const history = bhajanHistory(path.join(ROOT, 'story', 'published'));
  const track = chooseBhajan(loadBhajans(), { festival: cfg.festival, day: o.day, date, history });
  if (!track) { console.log(JSON.stringify({ error: `no QA-passed ${cfg.festival} bhajan in music/library` })); process.exit(1); }
  if (args[0] === 'pick') { console.log(JSON.stringify({ id: track.id, day: track.bhajan.day, title: track.title })); return; }
  const spec = buildSpec({ date, slot, o, track, bank: bankPictures(cfg.festival), festival: cfg.festival, hashtag: cfg.hashtag });
  const out = opt('--out');
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(spec, null, 2)}\n`);
  console.log(JSON.stringify({ slug: spec.slug, publish_at: o.at || '', fb: o.fb || '', bhajan: track.id, day: track.bhajan.day || null, seconds: spec.song.seconds, scenes: spec.scenes.length }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch((e) => { console.log(JSON.stringify({ error: e.message })); process.exit(1); });
