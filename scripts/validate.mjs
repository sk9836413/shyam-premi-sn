#!/usr/bin/env node
// Checks story/today/scenes.json against automation/STORY.md before anything is rendered or posted.
//   node scripts/validate.mjs story/today/scenes.json
// Prints each problem and exits 1 if there are any.
import fs from 'node:fs';

const file = process.argv[2] || 'story/today/scenes.json';
const s = JSON.parse(fs.readFileSync(file, 'utf8'));
const problems = [];
const need = (ok, msg) => { if (!ok) problems.push(msg); };
const DEVANAGARI = /[ऀ-ॿ]/;
const BAIT = /share\s*kar(o|ein|na)?\s*(warna|nahi\s*to)|paisa\s*aayega|dhan\s*varsha\s*hogi|guaranteed|100\s*%|bad\s*luck|ignore\s*mat|type\s*karo\s*jai|miracle|chamatkar\s*pakka/i;

need(/^\d{4}-\d{2}-\d{2}-(morning|evening)-[a-z0-9-]+$/.test(s.slug || ''), 'slug must be <yyyy-mm-dd>-<morning|evening>-<lowercase-english-slug>');
need(s.title && s.title.length <= 45, `title must be 1-45 characters (is ${s.title?.length ?? 0})`);
need(s.kicker && s.kicker.length <= 22, `kicker must be 1-22 characters (is ${s.kicker?.length ?? 0})`);
need(['hm_omega', 'hf_alpha'].includes(s.voice), 'voice must be hm_omega or hf_alpha');
const PLAYLISTS = ['Khatu Shyam ji ki Kathayein', 'Shiv ji ki Kathayein', 'Hanuman ji ki Kathayein', 'Ganesh ji ki Kathayein',
  'Vishnu ji aur Krishna ki Kathayein', 'Maa Durga aur Devi ki Kathayein', 'Shani Dev ki Kathayein', 'Surya Dev ki Kathayein', 'Tyohar aur Vrat Kathayein'];
need(PLAYLISTS.includes(s.playlist), `playlist must be one of: ${PLAYLISTS.join(', ')}`);
need(/no text/i.test(s.style || ''), 'style must include "no text"');

const scenes = Array.isArray(s.scenes) ? s.scenes : [];
need(scenes.length >= 6 && scenes.length <= 9, `6-9 scenes needed (has ${scenes.length})`);
scenes.forEach((sc, i) => {
  const n = `scene ${i + 1}`;
  const last = i === scenes.length - 1;
  need(sc.tts && DEVANAGARI.test(sc.tts), `${n}: tts must be Hindi in Devanagari`);
  const max = last ? 200 : 160;
  need(sc.tts && sc.tts.length <= max, `${n}: tts over ${max} characters (${sc.tts?.length})`);
  need(sc.tts && !/\d/.test(sc.tts), `${n}: write numbers in tts as words`);
  need(sc.sub && !DEVANAGARI.test(sc.sub), `${n}: sub must be Roman-script Hinglish`);
  need(sc.sub && sc.sub.length <= 120, `${n}: sub over 120 characters (${sc.sub?.length})`);
  if (last) {
    need(sc.endcard === true && !sc.prompt, `${n}: the last scene must be {"endcard": true, "tts", "sub"} with no prompt`);
    need(/subscribe/i.test(sc.sub || '') && /like/i.test(sc.sub || ''), `${n}: the end card must ask to like, share and subscribe`);
  } else {
    need(!sc.endcard, `${n}: only the last scene can be the end card`);
    need(sc.prompt && sc.prompt.length >= 40, `${n}: prompt missing or too short`);
    need(!/\b(text|letters|writing|sign|caption|words|logo)\b/i.test((sc.prompt || '').replace(/no (text|letters|writing)/gi, '')), `${n}: prompt must not ask for text, signs or letters`);
    need(['in', 'out', 'pan'].includes(sc.motion), `${n}: motion must be in, out or pan`);
  }
});

const yt = s.youtube_title || '';
need(yt.length > 0 && yt.length <= 90 && yt.endsWith(' #Shorts'), 'youtube_title: max 90 characters, ending with " #Shorts"');
need(!/[<>]/.test(yt + (s.youtube_description || '') + (s.youtube_tags || '')), 'YouTube fields must not contain < or >');
need((s.youtube_description || '').trim().length > 0, 'youtube_description is empty');
const tags = (s.youtube_tags || '').split(',').map((t) => t.trim()).filter(Boolean);
need(tags.length >= 10 && tags.length <= 15, `youtube_tags: 10-15 tags (has ${tags.length})`);
need(s.instagram_caption && s.instagram_caption.length <= 2200, 'instagram_caption: 1-2200 characters');
need((s.facebook_caption || '').trim().length > 0, 'facebook_caption is empty');
// title is drawn on the video with a Latin-only font; the YouTube fields carry Devanagari keywords too.
need(DEVANAGARI.test(yt), 'youtube_title needs the keyword in Devanagari too ("Roman | देवनागरी #Shorts")');
need(DEVANAGARI.test(s.youtube_tags || ''), 'youtube_tags need some Devanagari search phrases');
for (const k of ['title', 'instagram_caption', 'facebook_caption']) {
  need(!DEVANAGARI.test(s[k] || ''), `${k} must be Roman-script Hinglish`);
}
const all = JSON.stringify(s);
need(!BAIT.test(all), 'remove engagement bait, fear or money/miracle promises');

if (problems.length) {
  console.log(problems.map((p) => `- ${p}`).join('\n'));
  process.exit(1);
}
console.log(`OK: ${file} (${scenes.length} scenes)`);
