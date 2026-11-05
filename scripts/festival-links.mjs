#!/usr/bin/env node
// Adds festival link lines to a spec's description and captions just before upload, only while the linked page is
// live (HTTP 200), so a link that is not ready yet is never posted.
//   node scripts/festival-links.mjs <scenes.json>      prints {"added": [...]}; never fails the run
// Current link: the EpiFive "Diwali greeting card with name and photo" tool with the Jai Shree Shyam theme, on the
// Diwali-week status Shorts and "Dadi aur Chhotu" (noon) Shorts, 6-11 Nov 2026 (coordinator, 5 Nov 2026).
import fs from 'node:fs';

const LINKS = [
  {
    from: '2026-11-06', to: '2026-11-11', slots: ['status', 'noon'],
    url: 'https://www.epifive.com/tools/diwali-greeting-card-with-name?theme=shyam',
    line: (url) => `Apne naam aur photo wala Jai Shree Shyam Diwali card banayein (free): ${url}`,
  },
];

const file = process.argv[2];
const spec = JSON.parse(fs.readFileSync(file, 'utf8'));
const [, day, slot] = (spec.slug || '').match(/^(\d{4}-\d{2}-\d{2})-([a-z]+)-/) || [];
const added = [];
for (const l of LINKS) {
  if (!day || day < l.from || day > l.to || !l.slots.includes(slot)) continue;
  let status = 0;
  try {
    status = (await fetch(l.url, { redirect: 'follow', signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'shyam-premi-sn/1.0' } })).status;
  } catch { /* not reachable: skip */ }
  if (status !== 200) { console.error(`festival link not live yet (HTTP ${status}): ${l.url}`); continue; }
  const line = l.line(l.url);
  for (const k of ['youtube_description', 'instagram_caption', 'facebook_caption']) {
    if (spec[k] && !spec[k].includes(l.url)) spec[k] = `${spec[k].trimEnd()}\n\n${line}`;
  }
  added.push(l.url);
}
if (added.length) fs.writeFileSync(file, `${JSON.stringify(spec, null, 2)}\n`);
console.log(JSON.stringify({ added }));
