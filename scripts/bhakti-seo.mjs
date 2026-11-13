// Searched generic phrases and other channels' names (owner, 13 Nov 2026: YouTube Studio "top search terms" for
// Shyam Premi SN were "bhakti geete channel", "ganesh youth association", "shyam sangeet studio", "krishna mantra
// channel", "shyam baba song", "ganpati official", "sawariya sarkar official", "shri balaji film city", "ganesh
// subramaniam", "shyam bhajan 2026", "mee phanasgaonkar").
//
// - The generic intents (Bhakti Geet, Shyam Bhajan <year>, Shyam Baba Song, Shyam Sangeet, Krishna Mantra) go into the
//   titles, descriptions and tags of bhajan videos, naturally and once (bhaktiTitle), never as a keyword list.
// - The others are names of other channels, organisations or people. YouTube's spam and deceptive-practices policy
//   forbids using them in our metadata to borrow their traffic, so they are never in a title, description, tag or
//   caption: scripts/validate.mjs fails a spec that has one, youtube.mjs refuses the upload, and trend-signals.mjs
//   marks them in the trend file. ("Shyam Sangeet Studio" is a real channel of the singer Shyam Prajapati, checked
//   13 Nov 2026; "Shyam Sangeet" alone is a generic phrase.)
// - Every bhajan video (bhajan Shorts, the nonstop jukebox, the weekly mantra jaap) also goes into the public playlist BHAKTI_PLAYLIST
//   (youtube.mjs, created once when missing); playlists rank in YouTube search.

export const BHAKTI_PLAYLIST = 'Bhakti Geet | Shyam Bhajan | भक्ति गीत';
export const BHAKTI_PLAYLIST_DESCRIPTION = [
  'भक्ति गीत और भजन: खाटू श्याम जी, छठी मइया, महादेव, हनुमान जी, कृष्ण और गणपति के नए मौलिक भजन, एक ही जगह।',
  'Bhakti Geet aur Shyam Bhajan: Shyam Premi SN ke naye original bhajan, Khatu Shyam ji se Chhath geet tak. Roz suniye, parivaar ke saath share kijiye.',
  'भजन: मौलिक रचना, AI द्वारा गाया गया (ACE-Step). Jai Shree Shyam 🙏',
].join('\n');

/** Other channels', organisations' and people's names seen in our search terms: never in our metadata. */
export const OTHER_CHANNEL_NAMES = ['ganesh youth association', 'shyam sangeet studio', 'ganpati official', 'sawariya sarkar official',
  'shri balaji film city', 'ganesh subramaniam', 'mee phanasgaonkar'];
// Words that make a search term look like a channel, label or organisation name ("<x> official", "<x> studio").
const ORG_WORDS = /\b(official|studios?|film ?city|association|records|productions?|music company|entertainment|films|digital)\b/i;

const norm = (t) => ` ${String(t || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim()} `;

/** The other-channel names in a text (title, description, tags...). */
export function thirdPartyNames(text) {
  const n = norm(text);
  return OTHER_CHANNEL_NAMES.filter((name) => n.includes(` ${name} `));
}
/** A search term that is (or looks like) another channel's or organisation's name. */
export const otherChannelTerm = (term) => thirdPartyNames(term).length > 0 || ORG_WORDS.test(String(term || ''));

/** The searched generic phrases (Roman); a title with one of them needs no other. */
export const SEARCHED_PHRASES = ['bhakti geet', 'shyam bhajan', 'shyam baba song', 'shyam sangeet', 'krishna mantra'];
export const hasSearchedPhrase = (title) => SEARCHED_PHRASES.some((p) => norm(title).includes(` ${p} `));

const SHYAM = /khatu|shyam|janmotsav|gyaras|ekadashi|barbarik/i;
/** The phrase for a bhajan video: Shyam songs alternate "Shyam Bhajan <year>" / "Shyam Baba Song" (by date and slot,
 *  so two titles in a row differ); a mantra jaap is "Krishna Mantra"; everything else "Bhakti Geet". */
export function bhaktiPhrase({ date = '', deity = '', festival = '', kind = '', slot = '' } = {}) {
  if (/mantra/i.test(kind) && /krishna|vasudev|hare/i.test(`${deity} ${festival}`)) return 'Krishna Mantra';
  if (SHYAM.test(`${deity} ${festival}`)) {
    const day = Math.floor(Date.parse(`${date || '2026-01-01'}T00:00:00Z`) / 864e5) || 0;
    const k = ['morning', 'evening', 'bhajan'].indexOf(slot);
    return (day + Math.max(0, k)) % 2 ? 'Shyam Baba Song' : `Shyam Bhajan ${String(date).slice(0, 4) || '2026'}`;
  }
  return 'Bhakti Geet';
}

/** The title with one searched phrase added as its own " | " part, before the first Devanagari part (or before
 *  "#Shorts", or at the end). Unchanged when it already has one, or when the phrase does not fit in `max`. */
export function bhaktiTitle(title, opts = {}, max = 90) {
  const t = String(title || '').trim();
  if (!t || hasSearchedPhrase(t)) return t;
  const phrase = opts.phrase || bhaktiPhrase(opts);
  const parts = t.split(' | ');
  const dev = parts.findIndex((p) => /[ऀ-ॿ]/.test(p));
  let out;
  if (dev > 0) out = [...parts.slice(0, dev), phrase, ...parts.slice(dev)].join(' | ');
  else if (/ #Shorts$/i.test(t)) out = t.replace(/ #Shorts$/i, ` | ${phrase} #Shorts`);
  else out = `${t} | ${phrase}`;
  return out.length <= max ? out : t;
}

/** A bhajan video (its soundtrack is our song): bhajan Shorts, the nonstop jukebox and the weekly mantra jaap
 *  (scripts/mantra-long.mjs). Narrated Shorts with only a chorus outro are not. */
export const isBhajanVideo = (spec = {}) => spec.bhajan_short === true || ['jukebox', 'mantra'].includes(spec.kind) || ['jukebox', 'mantra'].includes(spec.bhajan?.mode);

/** The generic tags of a bhajan video (added once; Shyam songs get the Shyam phrases too). */
export function bhaktiTags({ deity = '', festival = '', date = '' } = {}) {
  const year = String(date).slice(0, 4) || '2026';
  return SHYAM.test(`${deity} ${festival}`)
    ? ['bhakti geet', 'भक्ति गीत', `shyam bhajan ${year}`, 'shyam baba song', 'shyam sangeet']
    : ['bhakti geet', 'भक्ति गीत'];
}
export function withTags(tags, extra) {
  const list = String(tags || '').split(',').map((x) => x.trim()).filter(Boolean);
  for (const x of extra) if (!list.some((y) => y.toLowerCase() === x.toLowerCase())) list.splice(Math.max(0, list.length - 1), 0, x);
  return list.join(', ');
}
