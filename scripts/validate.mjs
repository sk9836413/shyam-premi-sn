#!/usr/bin/env node
// Checks story/today/scenes.json against automation/STORY.md before anything is rendered or posted.
//   node scripts/validate.mjs story/today/scenes.json
//   node scripts/validate.mjs [--long] story/long/scenes.json    the daily long katha video (STORY.md section 5)
// Prints each problem and exits 1 if there are any.
import fs from 'node:fs';

const longMode = process.argv.includes('--long');
const file = process.argv.slice(2).find((a) => a !== '--long') || 'story/today/scenes.json';
const s = JSON.parse(fs.readFileSync(file, 'utf8'));
const problems = [];
const need = (ok, msg) => { if (!ok) problems.push(msg); };
const DEVANAGARI = /[ऀ-ॿ]/;
const BAIT = /share\s*kar(o|ein|na)?\s*(warna|nahi\s*to)|paisa\s*aayega|dhan\s*varsha\s*hogi|guaranteed|100\s*%|bad\s*luck|ignore\s*mat|type\s*karo\s*jai|miracle|chamatkar\s*pakka/i;
const PLAYLISTS = ['Khatu Shyam ji ki Kathayein', 'Shiv ji ki Kathayein', 'Hanuman ji ki Kathayein', 'Ganesh ji ki Kathayein',
  'Vishnu ji aur Krishna ki Kathayein', 'Maa Durga aur Devi ki Kathayein', 'Shani Dev ki Kathayein', 'Surya Dev ki Kathayein', 'Tyohar aur Vrat Kathayein', 'Mandir Itihas'];

// ---- Long video (16:9, 5-10 min) ----------------------------------------------------------------
// Narration runs at ~12 characters a second; each scene adds ~0.8 s and each chapter ~1 s of pause.
const CHARS_PER_SECOND = 12;
const sceneSeconds = (sc) => (sc.endcard ? Math.max(6, (sc.tts || '').length / CHARS_PER_SECOND + 1) : (sc.tts || '').length / CHARS_PER_SECOND + 0.8);
if (longMode || s.format === 'long' || /^\d{4}-\d{2}-\d{2}-long-/.test(s.slug || '')) {
  need(/^\d{4}-\d{2}-\d{2}-long-[a-z0-9-]+$/.test(s.slug || ''), 'slug must be <yyyy-mm-dd>-long-<lowercase-english-slug>');
  need(s.format === 'long', 'format must be "long"');
  need(s.title && s.title.length <= 60 && !DEVANAGARI.test(s.title), `title: Roman Hinglish, 1-60 characters (is ${s.title?.length ?? 0})`);
  need(s.kicker && s.kicker.length <= 22, `kicker must be 1-22 characters (is ${s.kicker?.length ?? 0})`);
  need(['hm_omega', 'hf_alpha'].includes(s.voice), 'voice must be hm_omega or hf_alpha');
  need(PLAYLISTS.includes(s.playlist), `playlist must be one of: ${PLAYLISTS.join(', ')}`);
  need(/no text/i.test(s.style || ''), 'style must include "no text"');
  need(s.hook && s.hook.length <= 38 && !DEVANAGARI.test(s.hook), 'hook: Roman Hinglish, 1-38 characters');
  need(typeof s.source === 'string' && s.source.trim().length >= 8, 'source: name the scriptural/traditional source, e.g. "Skanda Purana ke anusar" or "Lok katha (Khatu Shyam parampara)"');
  need(s.deity && s.deity.length <= 60 && !/[|\n]/.test(s.deity), 'deity: 1-60 characters, no "|"');
  need(s.summary && s.summary.length <= 160 && !/[|\n]/.test(s.summary), 'summary: the story in a few words, max 160 characters, no "|"');

  const images = Array.isArray(s.images) ? s.images : [];
  need(images.length >= 10 && images.length <= 14, `images: 10-14 entries (has ${images.length}); each costs ~170 of the 10,000 free neurons a day, shared with the Shorts`);
  images.forEach((im, i) => {
    need(im && typeof im.prompt === 'string' && im.prompt.length >= 40, `image ${i}: prompt missing or too short`);
    need(!/\b(text|letters|writing|sign|caption|words|logo|title)\b/i.test((im?.prompt || '').replace(/no (text|letters|writing)/gi, '')), `image ${i}: prompt must not ask for text, signs or letters`);
  });

  const chapters = Array.isArray(s.chapters) ? s.chapters : [];
  need(chapters.length >= 4 && chapters.length <= 8, `chapters: 4-8 including the opening hook chapter (has ${chapters.length})`);
  const scenes = chapters.flatMap((c) => (Array.isArray(c.scenes) ? c.scenes : []));
  need(scenes.length >= 30 && scenes.length <= 60, `30-60 scenes needed (has ${scenes.length})`);
  chapters.forEach((c, k) => {
    const n = (c.scenes || []).length;
    need(c.title && c.title.length >= 3 && c.title.length <= 40 && !DEVANAGARI.test(c.title), `chapter ${k + 1}: title Roman, 3-40 characters`);
    need(n >= 2 && n <= 14, `chapter ${k + 1}: 2-14 scenes (has ${n})`);
    const secs = (c.scenes || []).reduce((t, sc) => t + sceneSeconds(sc), 0);
    need(secs >= 12, `chapter ${k + 1}: too short for a YouTube chapter (~${Math.round(secs)} s, needs 12+)`);
    if (k === 0) need(n <= 3 && secs <= 28, `chapter 1 is the hook: 2-3 scenes, under ~25 s (is ~${Math.round(secs)} s)`);
  });

  const uses = new Array(images.length).fill(0);
  let prev = null;
  scenes.forEach((sc, i) => {
    const n = `scene ${i + 1}`;
    const last = i === scenes.length - 1;
    need(sc.tts && DEVANAGARI.test(sc.tts), `${n}: tts must be Hindi in Devanagari`);
    const max = last ? 160 : 170;
    need(sc.tts && sc.tts.length <= max, `${n}: tts over ${max} characters (${sc.tts?.length})`);
    need(sc.tts && !/\d/.test(sc.tts), `${n}: write numbers in tts as words`);
    need(sc.sub && !DEVANAGARI.test(sc.sub), `${n}: sub must be Roman-script Hinglish`);
    need(sc.sub && sc.sub.length <= 150, `${n}: sub over 150 characters (${sc.sub?.length}); split the scene`);
    if (last) {
      need(sc.endcard === true && sc.img === undefined, `${n}: the last scene must be {"endcard": true, "tts", "sub"} with no img`);
      need(/subscribe/i.test(sc.sub || '') && /like/i.test(sc.sub || ''), `${n}: the end card must ask to like, share and subscribe`);
      return;
    }
    need(!sc.endcard, `${n}: only the last scene can be the end card`);
    need(Number.isInteger(sc.img) && sc.img >= 0 && sc.img < images.length, `${n}: img must be an index into images`);
    if (Number.isInteger(sc.img) && sc.img < images.length) uses[sc.img]++;
    need(['top', 'center', 'bottom'].includes(sc.focus), `${n}: focus must be top, center or bottom`);
    need(['in', 'out', 'pan', 'panl'].includes(sc.motion), `${n}: motion must be in, out, pan or panl`);
    const shot = `${sc.img}/${sc.focus}/${sc.motion}`;
    need(shot !== prev, `${n}: same image, focus and motion as the scene before; change the focus or motion`);
    prev = shot;
  });
  uses.forEach((u, i) => {
    need(u >= 1, `image ${i} is never used; remove it (it would waste neurons)`);
    need(u <= 4, `image ${i} is used ${u} times; max 4`);
  });
  need(!/^(aaj suniye|namaste|namaskar|jai shree shyam|swagat)/i.test(scenes[0]?.sub || ''), 'scene 1 must open with the dramatic moment or a question, not a greeting');

  // Duration 5-10 min, and a teaser scene ("Aage dekhiye...") at least every ~2.5 min until the last stretch.
  const total = scenes.reduce((t, sc) => t + sceneSeconds(sc), 0) + chapters.length;
  need(total >= 300 && total <= 600, `estimated length ${Math.round(total)} s; must be 300-600 s (5-10 min): adjust the narration (~12 characters a second)`);
  let t = 0, lastTeaser = 0;
  scenes.forEach((sc, i) => {
    if (sc.teaser) lastTeaser = t;
    else if (t - lastTeaser > 150 && t < total - 90) {
      problems.push(`scene ${i + 1} (~${Math.round(t)} s): no teaser scene ("teaser": true) for over 2.5 min`);
      lastTeaser = t;
    }
    t += sceneSeconds(sc);
  });

  const th = s.thumbnail || {};
  need(Number.isInteger(th.image) && th.image >= 0 && th.image < images.length, 'thumbnail.image must be an index into images');
  need(th.text && th.text.length <= 30 && !DEVANAGARI.test(th.text), 'thumbnail.text: Roman Hinglish, 1-30 characters');
  need(!th.focus || ['top', 'center', 'bottom'].includes(th.focus), 'thumbnail.focus must be top, center or bottom');

  const yt = s.youtube_title || '';
  const desc = s.youtube_description || '';
  need(yt.length > 0 && yt.length <= 100 && !/#shorts/i.test(yt), 'youtube_title: 1-100 characters, no #Shorts');
  need(DEVANAGARI.test(yt), 'youtube_title needs the keyword in Devanagari too ("Roman | देवनागरी")');
  need(!/[<>]/.test(yt + desc + (s.youtube_tags || '')), 'YouTube fields must not contain < or >');
  need(desc.trim().length > 0 && desc.length <= 4000, 'youtube_description: 1-4000 characters (chapters are added on upload)');
  need(s.source && desc.includes(s.source.trim()), 'youtube_description must name the source tradition (the exact "source" text)');
  need(DEVANAGARI.test(desc), 'youtube_description needs a line in Devanagari');
  need(/subscribe/i.test(desc), 'youtube_description must end with a like/share/subscribe line');
  need(!/\b\d{1,2}:\d{2}\b/.test(desc), 'youtube_description must not contain timestamps: chapters are added automatically');
  const tags = (s.youtube_tags || '').split(',').map((x) => x.trim()).filter(Boolean);
  need(tags.length >= 10 && tags.length <= 15, `youtube_tags: 10-15 tags (has ${tags.length})`);
  need(DEVANAGARI.test(s.youtube_tags || ''), 'youtube_tags need some Devanagari search phrases');
  need(!BAIT.test(JSON.stringify(s)), 'remove engagement bait, fear or money/miracle promises');
  if (problems.length) {
    console.log(problems.map((p) => `- ${p}`).join('\n'));
    process.exit(1);
  }
  console.log(`OK: ${file} (${scenes.length} scenes, ${chapters.length} chapters, ${images.length} images, ~${Math.round(total)} s)`);
  process.exit(0);
}

// ---- Shorts -------------------------------------------------------------------------------------

need(/^\d{4}-\d{2}-\d{2}-(morning|evening)-[a-z0-9-]+$/.test(s.slug || ''), 'slug must be <yyyy-mm-dd>-<morning|evening>-<lowercase-english-slug>');
need(s.title && s.title.length <= 45, `title must be 1-45 characters (is ${s.title?.length ?? 0})`);
need(s.kicker && s.kicker.length <= 22, `kicker must be 1-22 characters (is ${s.kicker?.length ?? 0})`);
need(['hm_omega', 'hf_alpha'].includes(s.voice), 'voice must be hm_omega or hf_alpha');
need(PLAYLISTS.includes(s.playlist), `playlist must be one of: ${PLAYLISTS.join(', ')}`);
need(/no text/i.test(s.style || ''), 'style must include "no text"');

const scenes = Array.isArray(s.scenes) ? s.scenes : [];
const evening = /-evening-/.test(s.slug || '');
const [minScenes, maxScenes, maxChars] = evening ? [3, 4, 200] : [5, 6, 420];
need(scenes.length >= minScenes && scenes.length <= maxScenes, `${minScenes}-${maxScenes} scenes needed for this slot (has ${scenes.length})`);
const totalTts = scenes.reduce((n, sc) => n + (sc.tts || '').length, 0);
need(totalTts <= maxChars, `total narration ${totalTts} characters; keep it under ${maxChars} so the Short stays short`);
need(s.hook && s.hook.length <= 38 && !DEVANAGARI.test(s.hook), 'hook: Roman Hinglish, 1-38 characters');
need(!/^(aaj suniye|namaste|jai shree shyam)/i.test(scenes[0]?.sub || ''), 'scene 1 must open with the dramatic moment or a question, not a greeting');
scenes.forEach((sc, i) => {
  const n = `scene ${i + 1}`;
  const last = i === scenes.length - 1;
  need(sc.tts && DEVANAGARI.test(sc.tts), `${n}: tts must be Hindi in Devanagari`);
  const max = last ? 140 : 110;
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
