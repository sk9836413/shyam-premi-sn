#!/usr/bin/env node
// Adds festival link lines to a spec's description and captions just before upload, only while the linked page is
// live (HTTP 200), so a link that is not ready yet is never posted.
//   node scripts/festival-links.mjs <scenes.json> [--day YYYY-MM-DD] [--slot <slot>]
//     prints {"added": [...]}; never fails the run. Day and slot come from the slug ("<day>-<slot>-..."); pass them
//     for specs whose slug does not start that way (movie and Kalyug parts: their release day).
// Photo posts (scripts/photos.mjs) use linkLines() from this file, so videos and photos share one list.
//
// Links (coordinator):
// - 6-11 Nov 2026: the Diwali greeting card (Jai Shree Shyam theme) on the status and noon Shorts.
// - 17-20 Nov 2026 (Khatu Shyam Janmotsav = Dev Uthani Ekadashi, Fri 20 Nov 2026; Drik Panchang + Prokerala): the
//   Khatu Shyam Janmotsav card on every upload (all slots, long video, movie and Kalyug parts) and on the
//   festival and Khatu sandhya photo posts, with utm_source per platform (youtube / instagram / facebook). The status
//   engine's Janmotsav variants (eve 18 + 19 Nov 20:00, status 20 Nov 00:30, statusday 20 Nov 08:30) carry it too.
// The cards live on the channel's own site (site/ in this repo, GitHub Pages, .github/workflows/pages.yml). Shyam Premi
// SN is a separate entity from any other brand: never link or co-brand another site here.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export const LINKS = [
  {
    from: '2026-11-06', to: '2026-11-11', slots: ['status', 'noon'],
    url: 'https://sk9836413.github.io/shyam-premi-sn/diwali/?theme=shyam',
    line: (url) => `Apne naam aur photo wala Jai Shree Shyam Diwali card banayein (free): ${url}`,
  },
  {
    from: '2026-11-17', to: '2026-11-20',
    slots: ['morning', 'evening', 'noon', 'status', 'eve', 'statusday', 'long', 'movie', 'kalyug'],
    // photo posts (photos.mjs): calendar-festival posts, the morning darshan and the Khatu sandhya aarti post
    photoKinds: ['darshan', 'aarti'],
    url: 'https://sk9836413.github.io/shyam-premi-sn/janmotsav/',
    campaign: 'janmotsav2026',
    line: (url) => `🙏 Shyam Janmotsav (20 Nov) ka card apne naam aur photo ke saath banayein, free: ${url}`,
  },
];

/** The link with UTM tags for one platform; links without a campaign stay as they are. */
export function tagged(link, platform, content) {
  if (!link.campaign) return link.url;
  const u = new URL(link.url);
  u.searchParams.set('utm_source', platform);
  u.searchParams.set('utm_medium', 'social');
  u.searchParams.set('utm_campaign', link.campaign);
  if (content) u.searchParams.set('utm_content', content);
  return u.toString();
}

const live = new Map();
/** HTTP 200 check, once per URL per process. */
export async function isLive(url) {
  if (!live.has(url)) {
    live.set(url, fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'Mozilla/5.0 (compatible; shyam-premi-sn/1.0)' } })
      .then((r) => r.status).catch(() => 0));
  }
  return (await live.get(url)) === 200;
}

/** Links that apply on `day` to a video `slot` or to a photo post ({ kind, festival }), and are live. */
export async function activeLinks(day, { slot, photo } = {}) {
  const out = [];
  for (const l of LINKS) {
    if (!day || day < l.from || day > l.to) continue;
    if (slot && !l.slots.includes(slot)) continue;
    if (photo && !(photo.festival || (l.photoKinds || []).includes(photo.kind))) continue;
    if (await isLive(l.url)) out.push(l);
    else console.error(`festival link not live yet: ${l.url}`);
  }
  return out;
}

/** Caption lines for one platform (photo posts). */
export async function linkLines(day, platform, photo) {
  return (await activeLinks(day, { photo })).map((l) => l.line(tagged(l, platform, photo?.kind)));
}

const FIELDS = { youtube_description: 'youtube', instagram_caption: 'instagram', facebook_caption: 'facebook' };

async function main() {
  const args = process.argv.slice(2);
  const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : '');
  const file = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
  const spec = JSON.parse(fs.readFileSync(file, 'utf8'));
  const [, slugDay, slugSlot] = (spec.slug || '').match(/^(\d{4}-\d{2}-\d{2})-([a-z]+)-/) || [];
  const day = (opt('--day') || slugDay || '').slice(0, 10);
  const slot = opt('--slot') || slugSlot;
  const added = [];
  for (const l of await activeLinks(day, { slot })) {
    let changed = false;
    for (const [k, platform] of Object.entries(FIELDS)) {
      if (!spec[k] || spec[k].includes(l.url)) continue;
      changed = true;
      const line = l.line(tagged(l, platform, slot));
      // after the first paragraph, where it shows before "...more"; at the end when there is only one paragraph
      spec[k] = /\n\n/.test(spec[k]) ? spec[k].replace(/\n\n/, `\n\n${line}\n\n`) : `${spec[k].trimEnd()}\n\n${line}`;
    }
    if (changed) added.push(l.url);
  }
  if (added.length) fs.writeFileSync(file, `${JSON.stringify(spec, null, 2)}\n`);
  console.log(JSON.stringify({ added, day, slot }));
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((e) => { console.error(`festival-links: ${e.message}`); console.log(JSON.stringify({ added: [] })); });
}
