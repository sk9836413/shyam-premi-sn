// Amazon.in Associates links in Shyam Premi SN LONG videos (owner, 23 Nov 2026: "use Amazon.in with relevant products in
// Shyam Premi"). The product map is automation/amazon-products.json; the tracking ID is Shyam's own (TAG), never another
// brand's. Shyam Premi SN is a separate entity: no other brand is ever named or linked here.
//
// Where: the YouTube description of a long video (youtube.mjs upload --long: the weekly mantra jaap, a festival bhajan
// jukebox, a long katha override, the facts compilation) and the same video's Facebook Page copy (meta.mjs long).
// A short section goes just before the hashtags: a one-line heading, 2-3 search links of the video's group (mantra id >
// festival / deity / temple in the map's `order` > general puja items) and the required line "As an Amazon Associate, I
// earn from qualifying purchases." (in every description that carries a link).
// Never: Shorts and anything not format "long", festival / day "status" Shorts, the owner's own darshan footage, anything
// about Rani Sati Dadi or the other sati temples (sati rule: darshan and bhakti only, no commerce), Instagram (captions
// are not clickable). No prices, no "abhimantrit / siddh / blessed / guaranteed / manokamna" claims, no murti / idol as
// merchandise. Search links only (/s?k=...&tag=...), so a link never points to a dead product page.
// Switch: repo variable AMAZON_LINKS (daily.yml env); unset or "on" = on, "off" (or 0 / false / no) = off.
// The AI disclosure (scripts/ai-disclosure.mjs) is not touched by any of this.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PRODUCTS_FILE = path.join(ROOT, 'automation', 'amazon-products.json');
export const TAG = 'shyam0414-21';
export const DISCLOSURE = 'As an Amazon Associate, I earn from qualifying purchases.';
export const YT_MAX = 5000; // YouTube's description limit (characters)
// Rani Sati Dadi, Dhandhan Dham Sati Dadi (Tida-Gela Maiya), Narayani Dadi, any sati theme: no commerce (mandir-series.md).
export const SATI = /rani[\s_-]*sati|sati[\s_-]*dadi|\bsati\b|सती(?![ऀ-ॿ])|jhunjhunu|झुंझुनू|dhandhan|ढांढण|t[ie]d[ae][\s_-]*gela|टीडा|टेडा|narayani|नारायणी/i;
// Words that never go into a product line (claims, prices, a deity as merchandise).
export const FORBIDDEN = /abhimantrit|अभिमंत्रित|siddh|सिद्ध|energi[sz]ed|blessed|guarantee|गारंटी|manokamna|मनोकामना|lucky|chamatkar|चमत्कार|murti|मूर्ति|idol|statue|₹|\brs\.?\s*\d|\bprice\b|\bmrp\b|\boffer\b|discount/i;

let cached = null;
export function loadProducts(file = PRODUCTS_FILE) {
  if (file === PRODUCTS_FILE && cached) return cached;
  const map = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (file === PRODUCTS_FILE) cached = map;
  return map;
}

/** The Amazon.in search link of a query, always with Shyam's tag. */
export const amazonUrl = (q) => `https://www.amazon.in/s?k=${encodeURIComponent(String(q).trim().toLowerCase()).replace(/%20/g, '+')}&tag=${TAG}`;

/** Is the switch on? Unset / "on" = on; "off", "0", "false", "no" = off. */
export const amazonOn = (env = process.env) => !/^(off|0|false|no)$/i.test(String(env.AMAZON_LINKS ?? '').trim());

/** May this spec carry Amazon links? { ok, why }. */
export function amazonEligible(spec = {}, { env = process.env } = {}) {
  if (!amazonOn(env)) return { ok: false, why: 'AMAZON_LINKS=off' };
  if (spec.format !== 'long') return { ok: false, why: `not a long video (format ${spec.format || 'short'})` };
  if (spec.share_line || /status/i.test(`${spec.kind || ''} ${spec.format || ''}`) || /-status-/.test(spec.slug || '')) return { ok: false, why: 'status video' };
  if (/-owner-/.test(spec.slug || '') || spec.owner_footage || /owner/i.test(spec.kind || '')) return { ok: false, why: "the owner's own darshan footage" };
  if (SATI.test(JSON.stringify(spec))) return { ok: false, why: 'Rani Sati Dadi / sati theme: darshan and bhakti only, no commerce' };
  return { ok: true, why: 'long video' };
}

/** The text the group is read from: mantra, deity, festival, theme, temple, title, slug (never the whole description). */
const subjectText = (spec) => [spec.mantra, spec.deity, spec.festival, spec.theme, spec.temple, spec.youtube_title || spec.title, spec.slug]
  .filter(Boolean).join(' ').toLowerCase();

/** The product group of a spec: the mantra's own group, else the first group in `order` whose pattern matches. */
export function amazonGroup(spec = {}, map = loadProducts()) {
  if (spec.mantra && map.mantras?.[spec.mantra]) return map.mantras[spec.mantra];
  const text = subjectText(spec);
  for (const g of map.order || []) {
    const re = map.groups[g]?.match;
    if (re && new RegExp(re, 'i').test(text)) return g;
  }
  return 'general';
}

/** 2-3 products of the spec's group (padded up to 2 from `general` when the group has fewer), no repeats. Every link
 *  is rebuilt from its query with TAG, so a stale or wrong tag in the file can never go out. */
export function amazonProducts(spec = {}, map = loadProducts(), { max = 3 } = {}) {
  const group = amazonGroup(spec, map);
  const list = [...(map.groups[group]?.products || [])];
  for (const p of map.groups.general?.products || []) if (list.length < 2 && !list.some((x) => x.q === p.q)) list.push(p);
  return { group, products: list.slice(0, max).map((p) => ({ label: p.label, q: p.q, url: amazonUrl(p.q) })) };
}

/** The description section (lines joined with \n), or '' when the spec may not carry links. */
export function amazonSection(spec = {}, { env = process.env, map = loadProducts() } = {}) {
  if (!amazonEligible(spec, { env }).ok) return '';
  const { products } = amazonProducts(spec, map);
  if (products.length < 2) return '';
  const h = map.headings || {};
  const heading = h[spec.kind] || h.default || '🛕 Puja ke liye (Amazon):';
  return [heading, ...products.map((p) => `• ${p.label}: ${p.url}`), DISCLOSURE].join('\n');
}

const TAG_LINE = /^(#[\p{L}\p{N}_]+\s*)+$/u;

/** The description with the Amazon section just before its trailing hashtag line (at the end when it has none).
 *  Idempotent; leaves the text unchanged when the spec may not carry links or the result would pass `max` characters. */
export function withAmazon(description, spec = {}, { env = process.env, map = loadProducts(), max = YT_MAX } = {}) {
  const text = String(description || '');
  if (text.includes(`tag=${TAG}`)) return text;
  const section = amazonSection(spec, { env, map });
  if (!section) return text;
  const lines = text.replace(/\s+$/, '').split('\n');
  let i = lines.length;
  while (i > 0 && TAG_LINE.test(lines[i - 1].trim())) i--;
  const head = lines.slice(0, i);
  while (head.length && !head.at(-1).trim()) head.pop();
  const tail = lines.slice(i);
  const out = [...head, '', section, ...(tail.length ? ['', ...tail] : [])].join('\n');
  if (out.length > max) { console.error(`::warning::Amazon section left out: the description would be ${out.length} > ${max} characters`); return text; }
  return out;
}

/** Problems with a text that carries Amazon links (empty = OK): wrong tag or host, a product link, no disclosure. */
export function checkAmazonText(text) {
  const t = String(text || '');
  const links = t.match(/https?:\/\/[^\s)]*amazon\.[^\s)]*/gi) || [];
  if (!links.length) return [];
  const e = [];
  for (const l of links) {
    const u = new URL(l);
    if (u.hostname !== 'www.amazon.in') e.push(`not amazon.in: ${l}`);
    if (u.pathname !== '/s' || !u.searchParams.get('k')) e.push(`not a search link: ${l}`);
    if (u.searchParams.get('tag') !== TAG) e.push(`tag must be ${TAG}: ${l}`);
  }
  if (!t.includes(DISCLOSURE)) e.push(`the line "${DISCLOSURE}" is missing`);
  return e;
}
