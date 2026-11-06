#!/usr/bin/env node
// Real, licence-safe temple photos from Wikimedia Commons, so temple scenes can show the real temple instead of an
// AI picture (characters/REAL-FOOTAGE.md; the renderers credit every photo they show).
//
//   node scripts/real-photos.mjs <temple-slug> [--max 8] [--force] [--dry-run]   fetch photos for one temple
//   node scripts/real-photos.mjs --spec story/today/scenes.json                  the spec's `temple`, only when its folder
//        has no photos yet and it was not searched in the last 30 days (the daily workflow runs this before rendering)
//   node scripts/real-photos.mjs --all [--limit 15] [--min 4] [--max 6]          every temple in footage/temples.json that
//        has fewer than --min photos (default 1)
//   node scripts/real-photos.mjs --find "<temple name>"                          Commons categories, to add a temple
//
// Rules (hard):
// - Licence read from the file's own extmetadata (License / LicenseShortName / NonFree), never guessed. Only CC0,
//   Public Domain and CC BY (any version). CC BY-SA, NC, ND, GFDL, "fair use", unknown or missing: rejected.
// - Only files of exactly this temple: files in the temple's own Commons category (footage/temples.json; a sub-category
//   only when its name matches the temple too), and every file's title or categories must match the temple's `must`
//   pattern; anything matching `not` (other temples with similar names) is dropped. Free-text search is used only
//   for a temple without a category, and then the file's TITLE must name the temple. Unknown slugs use every word
//   of the slug as `must`, so they rarely match anything. Optional per temple: `place` (the title, categories or the
//   file's own description must name the town/state: some categories hold every temple of a deity) and `skip`
//   (Commons titles a person rejected after looking at them). (5 Nov 2026 test: search hits and deity/town categories
//   brought in a Kolkata Brahmo mandir, a Karnataka Mallikarjuna temple, a Reengus Shyam temple and Osian's Sachiya
//   Mata, so those routes are closed.)
// - Photos only (no maps, plans, paintings, drawings, logos), JPEG, shorter side >= 1000 px, at most 2 per author.
// - Saved as footage/<slug>/<name>.jpg (long side 1600 px, JPEG ~q80, <= 500 KB) + <name>.licence.json, plus
//   footage/<slug>/search.json (what was searched and why files were rejected).
// - Second source, only when Commons gives fewer than 4: Openverse (Flickr CC etc., fetchOpenverse below), same rules;
//   saved as footage/<slug>/openverse-<name>.jpg + the same .licence.json shape (source "Openverse/Flickr",
//   attribution "Photo: <author>, <licence>, via Flickr", url = the Flickr page).
// - Optional per temple in temples.json: `title` (the file's own title must match: for mixed categories that also hold
//   lakes, trails and towns), `openverse_q` (Openverse query), `openverse: false`.
// Exports photosFor() and creditLine() for the renderers.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const FOOTAGE = path.join(ROOT, 'footage');
const API = 'https://commons.wikimedia.org/w/api.php';
const UA = 'ShyamPremiSN-real-photos/1.0 (https://github.com/sk9836413/shyam-premi-sn; sk9836413@gmail.com)';
const FF = process.env.FFMPEG_PATH || (fs.existsSync('E:/tools/ffmpeg/bin/ffmpeg.exe') ? 'E:/tools/ffmpeg/bin/ffmpeg.exe' : 'ffmpeg');
const MAX_BYTES = 500 * 1024;
const NOT_A_PHOTO = /\b(map|plan|diagram|logo|stamp|coin|drawing|painting|pichwai|pichhwai|sketch|engraving|lithograph|watercolou?r|illustration|poster|banner|screenshot|svg|chart|ticket|currency)\b/i;
const NOT_THE_BUILDING = /\b(bhajan|mahotsav|kids|children|selfie|portrait|signpost|signboard|necklace|museum|mus[ée]e|guimet|usa|concert|pandit|minister|visit|information board|plaque|food|queue|fireworks|drummers|boris)\b/i;
// Old scans and institutional uploads: the real photographer is unknown, and they look poor in a post.
const HISTORICAL_TITLE = /\blccn|\bca\.|\bcirca\b|albumen|lantern slide|\b1[5-8]\d\d\b|\b19[0-4]\d\b/i;
const HISTORICAL_CAT = /historical images|old images|black and white photographs|\b1[89]\d0s\b/i;
const INSTITUTION = /publisher|news service|photoglob|museum|library|archive|rijks|\bcollection\b/i;
/** One key per person: "Varun Shiv Kapur from New Delhi, India" and "Varun Shiv Kapur" count as the same author. */
export const authorKey = (a) => String(a).toLowerCase().replace(/\s+from\s.*$/, '').replace(/^https?:\/\/(www\.)?flickr\.com\/(photos|people)\/([^/]+).*$/, '$3').replace(/[^a-z0-9]/g, '');
/** The counter key already used for this author ("varunshiv" and "varunshivkapur" are one person), else the new key. */
const authorSlot = (counts, a) => {
  const k = authorKey(a);
  return Object.keys(counts).find((o) => o.length >= 5 && k.length >= 5 && (o.startsWith(k) || k.startsWith(o))) || k;
};
const SLEEP = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- licence -----------------------------------------------------------------------------------
const strip = (html) => String(html || '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
  .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();

/** {licence, licence_url} for an allowed licence, or {reject: reason}. Reads extmetadata only. */
export function licenceOf(meta) {
  const code = String(meta.License?.value || '').toLowerCase().trim();
  const short = strip(meta.LicenseShortName?.value);
  const url = strip(meta.LicenseUrl?.value);
  if (String(meta.NonFree?.value || '').toLowerCase() === 'true') return { reject: 'non-free' };
  if (/sa|nc|nd|gfdl|fair|copyright/.test(code.replace(/^cc-by-(\d)/, '')) || /\b(SA|NC|ND)\b|share.?alike|non.?commercial|no.?deriv|gfdl|fair use/i.test(short)) {
    return { reject: `not allowed: ${short || code}` };
  }
  let m;
  if ((m = code.match(/^cc-by-(\d(?:\.\d)?)$/)) && /^CC BY \d(\.\d)?$/i.test(short)) {
    return { licence: `CC BY ${m[1]}`, licence_url: url || `https://creativecommons.org/licenses/by/${m[1]}/` };
  }
  if (code === 'cc0' || /^CC0( 1\.0)?$/i.test(short)) return { licence: 'CC0', licence_url: url || 'https://creativecommons.org/publicdomain/zero/1.0/' };
  if (/^pd/.test(code) || /^public domain$/i.test(short)) return { licence: 'Public Domain', licence_url: url || 'https://commons.wikimedia.org/wiki/Commons:Public_domain' };
  return { reject: `unknown licence: ${short || code || 'none'}` };
}

export const creditLine = (lic) => `${lic.attribution || `Photo: ${lic.author}, ${lic.licence}, via Wikimedia Commons`}${lic.url ? ` (${lic.url})` : ''}`;

/** Licence-checked real photos in footage/<temple>/ (the same rules as characters/dialogue.py footage_for). */
export function photosFor(temple, root = FOOTAGE) {
  if (!temple) return [];
  const dir = path.join(root, resolveSlug(temple));
  if (!fs.existsSync(dir)) return [];
  const ok = /^(own|permission|pixabay|pexels|cc0|public domain|cc by( [\d.]+)?)/i;
  return fs.readdirSync(dir).filter((f) => /\.jpe?g$/i.test(f)).sort().flatMap((f) => {
    const side = path.join(dir, f.replace(/\.jpe?g$/i, '.licence.json'));
    if (!fs.existsSync(side)) return [];
    const lic = JSON.parse(fs.readFileSync(side, 'utf8'));
    const name = String(lic.licence || '');
    if (!ok.test(name) || /\b(sa|nc|nd)\b|share.?alike|non.?commercial|no.?deriv/i.test(name) || !lic.author || !lic.source) return [];
    return [{ file: path.join(dir, f), ...lic }];
  });
}

// ---- registry ----------------------------------------------------------------------------------
let registry;
const temples = () => (registry ||= JSON.parse(fs.readFileSync(path.join(FOOTAGE, 'temples.json'), 'utf8')));
export function resolveSlug(slug) {
  const t = temples();
  if (t[slug]) return slug;
  return Object.keys(t).find((k) => !k.startsWith('_') && (t[k].aliases || []).includes(slug)) || slug;
}
function configFor(slug) {
  const t = temples()[slug];
  if (t) return t;
  // Unknown temple: every distinctive word of the slug must appear in the file's title or categories.
  const words = slug.split('-').filter((w) => w.length > 2 && !/^(mandir|temple|dham|mata|ji|devi|shri|shree|sri|baba|darshan|dadi)$/.test(w));
  return { name: slug, categories: [], must: words.map((w) => `(?=[\\s\\S]*${w})`).join('') || '^$', search: `${slug.replace(/-/g, ' ')} temple`, require: 'temple|mandir|dham|shrine' };
}

// ---- Commons API -------------------------------------------------------------------------------
async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i >= 4) throw e;
      await SLEEP(3000 * i);
    }
  }
}

async function categoryFiles(cat, depth = 1, seen = new Set(), sub = null) {
  if (seen.has(cat)) return [];
  seen.add(cat);
  const out = [];
  let cont = {};
  do {
    const j = await api({ action: 'query', list: 'categorymembers', cmtitle: `Category:${cat}`, cmlimit: '500', cmtype: 'file|subcat', ...cont });
    for (const m of j.query?.categorymembers || []) {
      if (m.ns === 6) out.push(m.title);
      else if (m.ns === 14 && depth > 0 && (!sub || sub(m.title.slice(9)))) out.push(...await categoryFiles(m.title.slice(9), depth - 1, seen, sub));
    }
    cont = j.continue || null;
  } while (cont);
  return out;
}

async function searchFiles(q) {
  const j = await api({ action: 'query', list: 'search', srnamespace: '6', srlimit: '50', srsearch: `${q} filetype:bitmap` });
  return (j.query?.search || []).map((s) => s.title);
}

async function details(titles) {
  const pages = new Map();
  // Batches of <= 40 titles and <= ~2500 characters (long titles in one GET gave an HTML error page, 6 Nov 2026).
  const batches = [];
  for (const t of titles) {
    const last = batches[batches.length - 1];
    if (last && last.length < 40 && encodeURIComponent([...last, t].join('|')).length < 2500) last.push(t);
    else batches.push([t]);
  }
  for (const batch of batches) {
    let cont = {};
    do {
      const j = await api({ action: 'query', titles: batch.join('|'), prop: 'imageinfo|categories',
        iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1920', clshow: '!hidden', cllimit: 'max', ...cont });
      for (const p of j.query?.pages || []) {
        const prev = pages.get(p.title) || { title: p.title, categories: [] };
        if (p.imageinfo) prev.info = p.imageinfo[0];
        prev.categories.push(...(p.categories || []).map((c) => c.title.slice(9)));
        pages.set(p.title, prev);
      }
      cont = j.continue || null;
    } while (cont);
  }
  return [...pages.values()];
}

export async function findCategories(name) {
  const j = await api({ action: 'query', list: 'search', srnamespace: '14', srlimit: '10', srsearch: name });
  return (j.query?.search || []).map((s) => s.title.slice(9));
}

// ---- fetch -------------------------------------------------------------------------------------
// Short readable name + a hash of the full title, so two long titles never collide.
const fileSlug = (title) => `${title.replace(/^File:/, '').replace(/\.[a-z]+$/i, '').normalize('NFKD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 40).replace(/-$/, '')}-${createHash('sha1').update(title).digest('hex').slice(0, 6)}`;

function recompress(src, dst) {
  for (const [q, side] of [[5, 1600], [7, 1600], [8, 1400], [10, 1280]]) {
    const r = spawnSync(FF, ['-y', '-v', 'error', '-i', src, '-vf', `scale='if(gt(iw,ih),min(${side},iw),-2)':'if(gt(iw,ih),-2,min(${side},ih))':flags=lanczos`,
      '-q:v', String(q), '-map_metadata', '-1', dst], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`ffmpeg: ${r.stderr.trim().split('\n').pop()}`);
    if (fs.statSync(dst).size <= MAX_BYTES) return fs.statSync(dst).size;
  }
  throw new Error('over 500 KB even after recompression');
}

export async function fetchTemple(slugIn, { max = 8, dryRun = false, log = console.log } = {}) {
  const slug = resolveSlug(slugIn);
  const cfg = configFor(slug);
  const must = new RegExp(cfg.must, 'i');
  const not = cfg.not ? new RegExp(cfg.not, 'i') : null;
  const require = cfg.require ? new RegExp(cfg.require, 'i') : null;
  const place = cfg.place ? new RegExp(cfg.place, 'i') : null;
  const titleRe = cfg.title ? new RegExp(cfg.title, 'i') : null;
  const fromCat = new Set();
  const subOk = (c) => must.test(c) && !(not && not.test(c));
  for (const c of cfg.categories || []) (await categoryFiles(c, 1, new Set(), subOk)).forEach((t) => fromCat.add(t));
  const found = new Set(fromCat);
  if (!(cfg.categories || []).length && cfg.search !== false) (await searchFiles(cfg.search || cfg.name.split(',')[0])).forEach((t) => found.add(t));
  const pages = await details([...found]);
  const rejected = {};
  const no = (why) => { rejected[why] = (rejected[why] || 0) + 1; return false; };
  const ok = pages.filter((p) => {
    const i = p.info;
    if (!i) return no('no image info');
    const text = `${p.title} | ${p.categories.join(' | ')}`;
    const desc = strip(i.extmetadata?.ImageDescription?.value);
    if ((cfg.skip || []).includes(p.title)) return no('skipped by hand (temples.json)');
    if (!must.test(text)) return no('not this temple (title/categories)');
    if (not && not.test(`${text} | ${desc}`)) return no('another place with a similar name');
    if (place && !place.test(`${text} | ${desc}`)) return no('place not confirmed (title/categories/description)');
    if (require && !require.test(text)) return no('not clearly the temple');
    if (titleRe && !titleRe.test(p.title)) return no('title does not name the temple (mixed category)');
    if (!fromCat.has(p.title) && !must.test(p.title)) return no('search hit without the temple in its title');
    if (NOT_THE_BUILDING.test(p.title)) return no('people, event or object, not the temple');
    if (i.mime !== 'image/jpeg') return no('not a JPEG photo');
    if (NOT_A_PHOTO.test(p.title) || p.categories.some((c) => /paintings|drawings|maps|diagrams|plans of|illustrations|postcards/i.test(c))) return no('not a photo');
    if (Math.min(i.width, i.height) < 1000) return no('under 1000 px');
    const lic = licenceOf(i.extmetadata || {});
    if (lic.reject) return no(lic.reject.startsWith('not allowed') ? 'licence not allowed (SA/NC/ND/GFDL...)' : lic.reject);
    if (HISTORICAL_TITLE.test(p.title) || p.categories.some((c) => HISTORICAL_CAT.test(c))) return no('historical scan, photographer unclear');
    const names = [i.extmetadata.Attribution?.value, i.extmetadata.Artist?.value].map(strip).filter(Boolean);
    const url = /^https?:|^www\./i;
    const author = (names.find((a) => !url.test(a)) || names[0] || '').replace(/^https?:\/\/(www\.)?flickr\.com\/(photos|people)\/([^/]+).*$/i, '$3');
    // No named author: an unverifiable licence claim (5 Nov test: scanned prints marked PD by "Unknown"). Rejected.
    if (!author || /^(unknown|anonymous)\b/i.test(author) || url.test(author)) return no('no named author');
    if (INSTITUTION.test(author)) return no('historical scan, photographer unclear');
    if (/personality|trademark/i.test(strip(i.extmetadata.Restrictions?.value))) return no('personality/trademark restriction');
    Object.assign(p, lic, { author: author.slice(0, 120) });
    return true;
  });
  // Best first: Commons quality marks, files from the temple's own category, bigger originals; max 2 per author.
  const score = (p) => (p.categories.some((c) => /quality images|featured pictures|valued images/i.test(c)) ? 3 : 0)
    + (fromCat.has(p.title) ? 2 : 0) + (/temple|mandir/i.test(p.title) ? 1 : 0) + Math.min(2, (p.info.width * p.info.height) / 12e6);
  ok.sort((a, b) => score(b) - score(a));
  const perAuthor = {};
  const picks = ok.filter((p) => { const k = authorSlot(perAuthor, p.author); return (perAuthor[k] = (perAuthor[k] || 0) + 1) <= 2; }).slice(0, max);
  const dir = path.join(FOOTAGE, slug);
  const saved = [];
  if (!dryRun && picks.length) fs.mkdirSync(dir, { recursive: true });
  for (const p of picks) {
    const name = `commons-${fileSlug(p.title)}`;
    const jpg = path.join(dir, `${name}.jpg`);
    const lic = {
      source: 'Wikimedia Commons',
      kind: 'photo',
      author: p.author,
      licence: p.licence,
      licence_url: p.licence_url,
      attribution: `Photo: ${p.author}, ${p.licence}, via Wikimedia Commons`,
      url: p.info.descriptionurl,
      title: p.title,
      original_size: [p.info.width, p.info.height],
      changes: 'resized and recompressed; may be cropped and slowly zoomed in the video',
      matched_categories: p.categories.filter((c) => must.test(c)).slice(0, 5),
      fetched: new Date().toISOString().slice(0, 10),
    };
    if (dryRun) { saved.push({ name, ...lic }); continue; }
    try {
      const tmp = path.join(os.tmpdir(), `${name}-orig.jpg`);
      const res = await fetch(p.info.thumburl || p.info.url, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`download HTTP ${res.status}`);
      fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
      const bytes = recompress(tmp, jpg);
      fs.rmSync(tmp, { force: true });
      fs.writeFileSync(path.join(dir, `${name}.licence.json`), `${JSON.stringify(lic, null, 2)}\n`);
      saved.push({ name, bytes, ...lic });
      await SLEEP(800);
    } catch (e) {
      fs.rmSync(jpg, { force: true });
      log(`  ${p.title}: ${e.message}`);
    }
  }
  // Too few from Commons: top up from Openverse (Flickr CC etc.), same licence and same-temple rules.
  let openverse = null;
  if (saved.length < OPENVERSE_BELOW && saved.length < max && cfg.openverse !== false && process.env.OPENVERSE !== '0') {
    const authors = {};
    for (const s of saved) { const k = authorSlot(authors, s.author); authors[k] = (authors[k] || 0) + 1; }
    try {
      openverse = await fetchOpenverse(slug, cfg, { must, not, place, require, max: max - saved.length, authors, dryRun, log });
      saved.push(...openverse.saved);
    } catch (e) {
      openverse = { error: e.message };
      log(`  openverse: ${e.message}`);
    }
  }
  const summary = { temple: slug, name: cfg.name, searched: new Date().toISOString().slice(0, 10), candidates: pages.length, usable: ok.length,
    saved: saved.length, rejected, ...(openverse ? { openverse: { ...openverse, saved: openverse.saved?.length || 0 } } : {}),
    files: saved.map((s) => `${s.name}.jpg (${s.licence}, ${s.author}${s.source === 'Wikimedia Commons' ? '' : `, ${s.source}`})`) };
  if (!dryRun) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'search.json'), `${JSON.stringify(summary, null, 2)}\n`);
  }
  return summary;
}

// ---- Openverse (second source: Flickr CC and a few other open collections) ---------------------
// Used only when Commons gave fewer than OPENVERSE_BELOW photos. Same rules: licence from the API's own fields (cc0, pdm or
// by only; BY-SA/NC/ND/unknown rejected), a named creator (not a URL, not a museum/archive), the TITLE must match the
// temple's `must` and name a temple building (title + tags must also pass `place`, `require`, `title` when set, and not
// match `not`), JPEG photo checked after download (magic bytes + real size, shorter side >= OPENVERSE_MIN_SIDE), at
// most 2 per creator (Commons picks count too). 6 Nov 2026 run: Flickr via Openverse serves 1024 px copies, so almost
// every Flickr hit fails the 1000 px rule; 63 queries gave 1 usable photo. Anonymous API limits (20/min, 200/day): one call per temple,
// >= 3.5 s apart; a 429 with a long wait switches Openverse off for the rest of the run.
const OV_API = 'https://api.openverse.org/v1/images/';
const OPENVERSE_BELOW = 4;
const OV_MIN_SIDE = Number(process.env.OPENVERSE_MIN_SIDE || 1000);
const OV_SOURCES = { flickr: 'Flickr', wordpress: 'WordPress Photo Directory', stocksnap: 'StockSnap', nappy: 'nappy' };
const OV_BUILDING = /\b(temples?|mandir|mandiram|shrine|dham|gopura?m?|kovil|koil|haveli|shikhara?|vimana|sanctum|jyotirlinga?|matha?|devasthanam|deul|kshetra|ghat)\b/i;
const OV_NOT_BUILDING = /#|\b(view from|trek|trekking|bridge|valley|vally|river|flower|spider|macro|statue of belief|selfie|sunset over|road to|on the way)\b/i;
let ovNext = 0;
let ovOff = null;

async function ovApi(params) {
  if (ovOff) throw new Error(`openverse off: ${ovOff}`);
  for (let i = 1; ; i++) {
    const wait = ovNext - Date.now();
    if (wait > 0) await SLEEP(wait);
    ovNext = Date.now() + 3500;
    const res = await fetch(`${OV_API}?${new URLSearchParams(params)}`, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (res.headers.get('x-ratelimit-available-anon_sustained') === '0') ovOff = 'daily anonymous limit used up';
    if (res.status === 429 || res.status >= 500) {
      const retry = Number(res.headers.get('retry-after') || 0);
      if (res.status === 429 && retry > 120) { ovOff = `rate limited for ${retry} s`; throw new Error(`openverse off: ${ovOff}`); }
      if (i >= 3) throw new Error(`openverse HTTP ${res.status}`);
      await SLEEP(Math.max(retry * 1000, 15000 * i));
      continue;
    }
    if (!res.ok) throw new Error(`openverse HTTP ${res.status}`);
    return res.json();
  }
}

/** Width/height from a JPEG's SOF marker, or null. */
function jpegSize(buf) {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  for (let i = 2; i + 9 < buf.length;) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

function ovLicence(r) {
  const code = String(r.license || '').toLowerCase();
  const v = String(r.license_version || '').trim();
  if (code === 'cc0') return { licence: 'CC0', licence_url: 'https://creativecommons.org/publicdomain/zero/1.0/' };
  if (code === 'pdm') return { licence: 'Public Domain', licence_url: 'https://creativecommons.org/publicdomain/mark/1.0/' };
  if (code === 'by' && /^(\d(\.\d)?)?$/.test(v)) return { licence: v ? `CC BY ${v}` : 'CC BY', licence_url: r.license_url || `https://creativecommons.org/licenses/by/${v || '4.0'}/` };
  return { reject: `licence not allowed or unknown: ${code || 'none'} ${v}`.trim() };
}

export async function fetchOpenverse(slug, cfg, { must, not, place, require, max = 6, authors = {}, dryRun = false, log = console.log } = {}) {
  const titleRe = cfg.title ? new RegExp(cfg.title, 'i') : null;
  // Openverse needs every word to match, so the short name only ("Jeen Mata", not "Jeen Mata temple Sikar").
  const q = cfg.openverse_q || cfg.name.split(',')[0].replace(/\([^)]*\)/g, ' ')
    .replace(/\b(mandir|temple|jyotirlinga|dham|shri|shree|sri|sree|ji|dadi)\b/gi, ' ').replace(/\s+/g, ' ').trim();
  const j = await ovApi({ q, license: 'by,cc0,pdm', source: Object.keys(OV_SOURCES).join(','), mature: 'false', page_size: '20' });
  const rejected = {};
  const no = (why) => { rejected[why] = (rejected[why] || 0) + 1; return false; };
  const ok = (j.results || []).filter((r) => {
    const tags = (r.tags || []).map((t) => t.name).join(' | ');
    const text = `${r.title || ''} | ${tags}`;
    if ((cfg.skip || []).includes(r.foreign_landing_url) || (cfg.skip || []).includes(`openverse:${r.id}`)) return no('skipped by hand (temples.json)');
    if (!OV_SOURCES[r.source]) return no(`source ${r.source} not used`);
    // Stricter than Commons (no category to lean on; 6 Nov test brought treks, bridges, flowers and a Shiva statue):
    // the TITLE must name the temple and a temple building; hashtag/Instagram cross-posts are dropped.
    if (!must.test(r.title || '')) return no('title does not name the temple');
    if (!OV_BUILDING.test(r.title || '')) return no('title does not name a temple building');
    if (OV_NOT_BUILDING.test(r.title || '') || /instagram/i.test(tags)) return no('view, trek, nature or hashtag post, not the temple');
    if (not && not.test(text)) return no('another place with a similar name');
    if (place && !place.test(text)) return no('place not confirmed (title/tags)');
    if (require && !require.test(text)) return no('not clearly the temple');
    if (titleRe && !titleRe.test(text)) return no('title/tags do not name the temple');
    if (NOT_THE_BUILDING.test(r.title || '')) return no('people, event or object, not the temple');
    if (NOT_A_PHOTO.test(r.title || '') || /\b(painting|drawing|illustration|engraving|poster|lithograph)\b/i.test(tags)) return no('not a photo');
    if (HISTORICAL_TITLE.test(r.title || '') || INSTITUTION.test(r.creator || '')) return no('historical scan, photographer unclear');
    if (r.filetype ? !/^jpe?g$/i.test(r.filetype) : !/\.jpe?g(\?|$)/i.test(r.url || '')) return no('not a JPEG photo');
    if (r.width && r.height && Math.min(r.width, r.height) < OV_MIN_SIDE) return no(`under ${OV_MIN_SIDE} px`);
    const lic = ovLicence(r);
    if (lic.reject) return no(lic.reject);
    const author = strip(r.creator);
    if (!author || /^(unknown|anonymous)|^https?:|^www\./i.test(author)) return no('no named author');
    Object.assign(r, lic, { author: author.slice(0, 120) });
    return true;
  });
  ok.sort((a, b) => Math.min(b.width || 0, b.height || 0) - Math.min(a.width || 0, a.height || 0));
  const dir = path.join(FOOTAGE, slug);
  const saved = [];
  for (const r of ok) {
    if (saved.length >= max) break;
    const key = authorSlot(authors, r.author);
    if ((authors[key] || 0) >= 2) { no('3rd+ photo by the same creator'); continue; }
    const provider = OV_SOURCES[r.source];
    const name = `openverse-${fileSlug(`${r.title || 'photo'} ${r.id}`)}`;
    const lic = {
      source: `Openverse/${provider}`,
      kind: 'photo',
      author: r.author,
      licence: r.licence,
      licence_url: r.licence_url,
      attribution: `Photo: ${r.author}, ${r.licence}, via ${provider}`,
      url: r.foreign_landing_url,
      title: r.title || '',
      openverse_id: r.id,
      creator_url: r.creator_url || '',
      tags: (r.tags || []).map((t) => t.name).slice(0, 12),
      original_size: r.width && r.height ? [r.width, r.height] : null,
      changes: 'resized and recompressed; may be cropped and slowly zoomed in the video',
      fetched: new Date().toISOString().slice(0, 10),
    };
    if (dryRun) { saved.push({ name, ...lic }); authors[key] = (authors[key] || 0) + 1; continue; }
    const jpg = path.join(dir, `${name}.jpg`);
    const tmp = path.join(os.tmpdir(), `${name}-orig.jpg`);
    try {
      const res = await fetch(r.url, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`download HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const size = jpegSize(buf);
      if (!size) { no('download is not a JPEG'); continue; }
      if (Math.min(size.width, size.height) < OV_MIN_SIDE) { no(`under ${OV_MIN_SIDE} px (after download)`); continue; }
      lic.original_size = [size.width, size.height];
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(tmp, buf);
      const bytes = recompress(tmp, jpg);
      fs.writeFileSync(path.join(dir, `${name}.licence.json`), `${JSON.stringify(lic, null, 2)}\n`);
      saved.push({ name, bytes, ...lic });
      authors[key] = (authors[key] || 0) + 1;
      await SLEEP(1000);
    } catch (e) {
      fs.rmSync(jpg, { force: true });
      log(`  openverse ${r.foreign_landing_url}: ${e.message}`);
    } finally {
      fs.rmSync(tmp, { force: true });
    }
  }
  return { query: q, results: (j.results || []).length, result_count: j.result_count ?? null, usable: ok.length, rejected, saved };
}

// ---- CLI ---------------------------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
  const max = Number(opt('--max', 8));
  const dryRun = args.includes('--dry-run');
  if (args.includes('--find')) return console.log(JSON.stringify(await findCategories(opt('--find'))));
  if (args.includes('--spec')) {
    const spec = JSON.parse(fs.readFileSync(opt('--spec'), 'utf8'));
    if (!spec.temple) return console.log(JSON.stringify({ status: 'no temple in spec' }));
    const slug = resolveSlug(spec.temple);
    const have = photosFor(slug);
    const last = path.join(FOOTAGE, slug, 'search.json');
    const recent = fs.existsSync(last) && Date.now() - Date.parse(JSON.parse(fs.readFileSync(last, 'utf8')).searched) < 30 * 86400e3;
    if (have.length || (recent && !args.includes('--force'))) return console.log(JSON.stringify({ status: 'have', temple: slug, photos: have.length, searched_recently: recent }));
    return console.log(JSON.stringify({ status: 'fetched', ...(await fetchTemple(slug, { max, dryRun })) }));
  }
  const list = args.includes('--all') ? Object.keys(temples()).filter((k) => !k.startsWith('_')).slice(0, Number(opt('--limit', 999)))
    : args.filter((a, i) => !a.startsWith('--') && !['--max', '--min', '--limit'].includes(args[i - 1]));
  if (!list.length) throw new Error('usage: real-photos.mjs <temple-slug> | --spec <scenes.json> | --all | --find "<name>"');
  for (const slug of list) {
    const have = photosFor(slug).length;
    if (!args.includes('--force') && have >= Number(opt('--min', 1))) { console.log(JSON.stringify({ temple: slug, status: 'have', photos: have })); continue; }
    try {
      console.log(JSON.stringify(await fetchTemple(slug, { max, dryRun })));
    } catch (e) {
      console.log(JSON.stringify({ temple: slug, error: e.message }));
      process.exitCode = 1;
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
