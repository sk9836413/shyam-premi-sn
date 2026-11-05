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
  'Vishnu ji aur Krishna ki Kathayein', 'Maa Durga aur Devi ki Kathayein', 'Shani Dev ki Kathayein', 'Surya Dev ki Kathayein', 'Tyohar aur Vrat Kathayein', 'Mandir Itihas',
  '12 Jyotirlinga', 'Char Dham', 'Shakti Peeth', 'Ashtavinayak', 'Panch Kedar', 'Sapta Puri', 'Pancha Bhoota Sthalam',
  'Krishna Leela Dham', 'Hanuman ji ke Prasiddh Mandir', 'Navagraha Mandir', 'Prasiddh Mandir'];

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
    need(im?.real === undefined || typeof im.real === 'boolean', `image ${i}: real must be true or false`);
  });
  need(s.temple === undefined || /^[a-z0-9-]+$/.test(s.temple), 'temple: lowercase slug from footage/temples.json');
  need(!images.some((im) => im?.real) || s.temple, '"real" images need the "temple" slug');

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

// ---- Festival "WhatsApp status" Short (story/status/<date>.json, published 06:00 IST on the day) ----------------
// 15-30 s vertical: 2-3 darshan scenes with a big Hindi blessing (Devanagari overlay), an optional well-known mantra,
// then the end card with the fixed share/subscribe line. Written in advance, so this check is strict.
if (s.format === 'status') {
  need(/^\d{4}-\d{2}-\d{2}-status-[a-z0-9-]+$/.test(s.slug || ''), 'slug must be <yyyy-mm-dd>-status-<lowercase-english-slug>');
  need(s.date && (s.slug || '').startsWith(s.date), 'date must be the festival day (YYYY-MM-DD) and start the slug');
  need(/^\d{2}:\d{2}$/.test(s.publish_at || ''), 'publish_at: IST time on the festival day, e.g. "06:00"');
  need(s.kicker && s.kicker.length <= 22 && !DEVANAGARI.test(s.kicker), 'kicker: Roman, 1-22 characters (drawn beside the logo)');
  need(s.title && s.title.length <= 30 && !DEVANAGARI.test(s.title), 'title: Roman, max 30 characters (the channel name watermark)');
  need(['hm_omega', 'hf_alpha'].includes(s.voice), 'voice must be hm_omega or hf_alpha');
  need(PLAYLISTS.includes(s.playlist), `playlist must be one of: ${PLAYLISTS.join(', ')}`);
  need(/no text/i.test(s.style || ''), 'style must include "no text"');
  const end = s.endline || 'Apne parivaar ko bhejein 🙏 | Subscribe: Shyam Premi SN';
  need(/bhejein/i.test(end) && /Subscribe: Shyam Premi SN/.test(end), 'endline must be "Apne parivaar ko bhejein 🙏 | Subscribe: Shyam Premi SN"');
  const scenes = Array.isArray(s.scenes) ? s.scenes : [];
  need(scenes.length >= 3 && scenes.length <= 4, `2-3 darshan scenes plus the end card (has ${scenes.length} scenes)`);
  let secs = 0, animated = 0;
  scenes.forEach((sc, i) => {
    const n = `scene ${i + 1}`;
    const last = i === scenes.length - 1;
    need(sc.tts && DEVANAGARI.test(sc.tts) && sc.tts.length <= 110 && !/\d/.test(sc.tts), `${n}: tts Devanagari, max 110 characters, numbers as words`);
    need(sc.sub && !DEVANAGARI.test(sc.sub), `${n}: sub must be Roman Hinglish`);
    need(sc.hold === undefined || (sc.hold >= 3 && sc.hold <= 9), `${n}: hold 3-9 seconds`);
    secs += Math.max(2.6, sc.hold || 0, (sc.tts || '').length / 12 + 0.7);
    if (last) {
      need(sc.endcard === true && !sc.prompt, `${n}: the last scene must be the end card (no prompt)`);
      return;
    }
    need(!sc.endcard, `${n}: only the last scene can be the end card`);
    need(sc.prompt && sc.prompt.length >= 40 && !/\b(text|letters|writing|sign|caption|words|logo)\b/i.test(sc.prompt), `${n}: prompt missing, too short, or asks for text`);
    need(sc.big && DEVANAGARI.test(sc.big) && sc.big.length <= 26, `${n}: big: the Hindi blessing in Devanagari, max 26 characters (drawn ~118 px)`);
    need(sc.line === undefined || (DEVANAGARI.test(sc.line) && sc.line.length <= 48), `${n}: line: Devanagari, max 48 characters`);
    need(sc.mantra === undefined || (DEVANAGARI.test(sc.mantra) && sc.mantra.length <= 90), `${n}: mantra: Devanagari, max 90 characters`);
    need(['in', 'out', 'pan'].includes(sc.motion), `${n}: motion must be in, out or pan`);
    if (sc.animate !== undefined) {
      animated++;
      need(typeof sc.animate === 'string' && sc.animate.length >= 20 && sc.animate.length <= 300, `${n}: animate: one English sentence of gentle motion`);
    }
  });
  secs -= 0.4 * Math.max(0, scenes.length - 1);
  need(secs >= 15 && secs <= 30, `estimated length ${Math.round(secs)} s; a status video is 15-30 s`);
  need(animated >= 1 && animated <= 3, `mark 1-3 scenes with "animate" (has ${animated})`);
  // A mantra or shloka is shown only with its tradition named in the description (and it must be the standard text).
  if (scenes.some((sc) => sc.mantra)) need(s.mantra_source && (s.youtube_description || '').includes(s.mantra_source), 'mantra_source: name the mantra\'s tradition, and put the same text in youtube_description');
  const yt = s.youtube_title || '';
  need(yt.length > 0 && yt.length <= 90 && yt.endsWith(' #Shorts') && DEVANAGARI.test(yt), 'youtube_title: max 90 characters, "Roman | देवनागरी #Shorts"');
  const desc = s.youtube_description || '';
  need(desc.length <= 4200 && /subscribe/i.test(desc) && /sanketik/i.test(desc), 'youtube_description: max 4200 characters (the download link is added on upload), a subscribe line and "Chitra AI dwara banaye gaye hain (sanketik)"');
  need(!/[<>]/.test(yt + desc + (s.youtube_tags || '')), 'YouTube fields must not contain < or >');
  const tags = (s.youtube_tags || '').split(',').map((t) => t.trim()).filter(Boolean);
  need(tags.length >= 10 && tags.length <= 15 && DEVANAGARI.test(s.youtube_tags || ''), `youtube_tags: 10-15 tags with some Devanagari (has ${tags.length})`);
  need(s.instagram_caption && s.instagram_caption.length <= 2200 && !DEVANAGARI.test(s.instagram_caption), 'instagram_caption: Roman, 1-2200 characters');
  need((s.facebook_caption || '').trim() && !DEVANAGARI.test(s.facebook_caption), 'facebook_caption: Roman, not empty');
  need(!BAIT.test(JSON.stringify(s)), 'remove engagement bait, fear or money/miracle promises');
  if (problems.length) {
    console.log(problems.map((p) => `- ${p}`).join('\n'));
    process.exit(1);
  }
  console.log(`OK: ${file} (status, ${scenes.length} scenes, ~${Math.round(secs)} s)`);
  process.exit(0);
}

// ---- "Dadi aur Chhotu" dialogue Short (noon slot, STORY.md section 6) -----------------------------
// Speaking pace measured with edge-tts on 4 Nov 2026: Dadi (Swara, -15%) ~9.9 Devanagari characters a second,
// Chhotu (Madhur, +4%, pitched up) ~14.2; each turn adds ~0.65-0.75 s of pause (longer when the speaker changes).
// Sati temples (automation/mandir-series.md): no fair/mela/procession talk at all, and the legal disclaimer is required.
if (/sati/i.test(`${s.slug || ''} ${s.temple || ''} ${s.title || ''}`)) {
  const all = JSON.stringify(s);
  need(!/(mela|yatra|juloos|jaloos|procession|bhado|bhadi|amavasya)|मेला|यात्रा|भादो|भादी|अमावस्या/i.test(all), 'sati temple: never mention a mela, yatra, procession or the Bhado/Bhadi amavasya gathering (mandir-series.md)');
  need(/Sati Nivaran Adhiniyam 1987/.test(all), 'sati temple: the legal disclaimer (Sati Nivaran Adhiniyam 1987) must be spoken and in the description');
  need(!/balidaan|amar tyag|mahima|chita|agni|aag/i.test(all), 'sati temple: no praise of the act and no fire imagery');
}

if (s.format === 'dialogue') {
  need(/^\d{4}-\d{2}-\d{2}-noon-[a-z0-9-]+$/.test(s.slug || ''), 'slug must be <yyyy-mm-dd>-noon-<lowercase-english-slug>');
  need(s.title && s.title.length <= 45 && !DEVANAGARI.test(s.title), `title: Roman Hinglish, 1-45 characters (is ${s.title?.length ?? 0})`);
  need(s.kicker && s.kicker.length <= 22, `kicker must be 1-22 characters (is ${s.kicker?.length ?? 0})`);
  need(PLAYLISTS.includes(s.playlist), `playlist must be one of: ${PLAYLISTS.join(', ')}`);
  need(/no text/i.test(s.style || ''), 'style must include "no text"');
  need(s.hook && s.hook.length <= 38 && !DEVANAGARI.test(s.hook), 'hook: Roman Hinglish, 1-38 characters');
  need(s.next && s.next.length <= 30 && !DEVANAGARI.test(s.next), 'next: tomorrow\'s temple or festival in Roman, max 30 characters (drawn on the end card)');
  need(s.temple === undefined || /^[a-z0-9-]+$/.test(s.temple), 'temple: lowercase slug (footage/<temple>/), or leave it out on festival days');
  need(s.deity && s.deity.length <= 60 && !/[|\n]/.test(s.deity), 'deity: 1-60 characters, no "|"');
  need(s.summary && s.summary.length <= 160 && !/[|\n]/.test(s.summary) && /agla:/i.test(s.summary), 'summary: max 160 characters, no "|", ending with "agla: <next>"');
  const vis = s.visuals && typeof s.visuals === 'object' ? s.visuals : {};
  const keys = Object.keys(vis);
  need(keys.length >= 3 && keys.length <= 6, `visuals: 3-6 story images (has ${keys.length}); each costs ~170 of the 10,000 free daily neurons`);
  keys.forEach((k) => {
    need(/^[a-z][a-z0-9-]*$/.test(k) && k !== 'end', `visual "${k}": key must be a lowercase word (and not "end", which is the end card)`);
    const pr = vis[k]?.prompt || '';
    need(pr.length >= 40, `visual "${k}": prompt missing or too short`);
    need(!/\b(text|letters|writing|sign|caption|words|logo)\b/i.test(pr.replace(/no (text|letters|writing)/gi, '')), `visual "${k}": prompt must not ask for text, signs or letters`);
    need(vis[k]?.real === undefined || typeof vis[k].real === 'boolean', `visual "${k}": real must be true or false`);
  });
  const lines = Array.isArray(s.lines) ? s.lines : [];
  need(lines.length >= 14 && lines.length <= 24, `14-24 lines needed (has ${lines.length})`);
  const used = new Set();
  lines.forEach((l, i) => {
    const n = `line ${i + 1}`;
    need(['dadi', 'chhotu'].includes(l.who), `${n}: who must be "dadi" or "chhotu"`);
    need(l.tts && DEVANAGARI.test(l.tts), `${n}: tts must be Hindi in Devanagari`);
    need(l.tts && l.tts.length <= 150, `${n}: tts over 150 characters (${l.tts?.length}); split the turn`);
    need(l.tts && !/\d/.test(l.tts), `${n}: write numbers in tts as words`);
    need(l.sub && !DEVANAGARI.test(l.sub) && l.sub.length <= 140, `${n}: sub must be Roman Hinglish, max 140 characters`);
    need(l.top === 'end' || keys.includes(l.top), `${n}: top must be a key of visuals or "end"`);
    used.add(l.top);
  });
  keys.forEach((k) => need(used.has(k), `visual "${k}" is never shown; remove it (it would waste neurons)`));
  const chhotu = lines.filter((l) => l.who === 'chhotu');
  need(lines[0]?.who === 'chhotu' && /\?\s*$/.test(lines[0]?.sub || ''), 'line 1: Chhotu opens with a curious question (ends with "?")');
  need(chhotu.filter((l) => /\?\s*$/.test(l.sub || '')).length >= 4, 'Chhotu\'s questions drive the story: at least 4 Chhotu lines ending with "?"');
  need(lines.every((l, i) => i < 2 || !(l.who === lines[i - 1].who && l.who === lines[i - 2].who)), 'no one speaks more than 2 lines in a row: let Chhotu react or ask');
  const tail = lines.slice(-2);
  need(tail.some((l) => l.who === 'chhotu' && /\bkal\b/i.test(l.sub || '') && /\?/.test(l.sub || '')), 'one of the last 2 lines: Chhotu asks about tomorrow\'s temple ("Dadi, kal ... ?")');
  need(/subscribe/i.test(lines.at(-1)?.sub || '') && /like/i.test(lines.at(-1)?.sub || ''), 'the last line asks to like, share and subscribe');
  need(lines.at(-1)?.top === 'end', 'the last line shows the end card (top "end")');
  const secs = lines.reduce((t, l) => t + (l.tts || '').length / (l.who === 'dadi' ? 9.9 : 14.2) + (l.who === 'dadi' ? 0.63 : 0.76), 0);
  need(secs >= 85 && secs <= 125, `estimated length ${Math.round(secs)} s; must be 90-120 s (Dadi speaks ~9.9 characters a second, Chhotu ~14.2): adjust the lines`);
  const facts = Array.isArray(s.facts) ? s.facts : [];
  need(facts.length >= 3, 'facts: at least 3 entries {claim, sources: [2+ URLs]} for what the dialogue states');
  facts.forEach((f, i) => need(f?.claim && Array.isArray(f.sources) && f.sources.filter((u) => /^https?:\/\//.test(u)).length >= 2, `fact ${i + 1}: needs a claim and 2 independent source URLs`));
  // The 4 Nov dry run cited Wikipedia + travel/devotional blogs only: at least one source per fact must be stronger
  // (temple trust, *.gov.in tourism/district, ASI, or a news site).
  const WEAK = /wikipedia\.org|blogspot\.|wordpress\.|medium\.com|quora\.com|youtube\.com|facebook\.com|instagram\.com|bhaktibharat|myyatradiary|studycafe|tripadvisor|holidify|templepurohit|pinterest/i;
  facts.forEach((f, i) => need((f?.sources || []).some((u) => /^https?:\/\//.test(u) && !WEAK.test(u)), `fact ${i + 1}: Wikipedia and blogs don't count alone; add the temple trust, a *.gov.in tourism/district page, ASI or a news site`));
  const desc = s.youtube_description || '';
  need(/sanketik/i.test(desc) && /AI/.test(desc), 'youtube_description must say "Chitra AI dwara banaye gaye hain (sanketik)"');
  need(/subscribe/i.test(desc), 'youtube_description must end with a like/share/subscribe line');
  // Sati temples (automation/mandir-series.md): history only, a legal disclaimer, no fire imagery, no praise.
  const sati = /sati/i.test(`${s.temple || ''} ${s.slug || ''} ${s.title || ''}`);
  if (sati) {
    need(/Sati Nivaran Adhiniyam/i.test(desc), 'sati temple: the description needs the Sati (Prevention) Act disclaimer from mandir-series.md');
    need(lines.some((l) => /pratibandhit/i.test(l.sub || '')), 'sati temple: one line must speak the disclaimer (Sati pratha ... pratibandhit hai ...)');
    need(!keys.some((k) => /\b(fire|flame|pyre|burn|blaze|cremat)/i.test(vis[k].prompt || '')), 'sati temple: no fire, pyre or burning in any image prompt');
    need(!/(mahaan balidaan|amar tyag|sati ki mahima|punya)/i.test(lines.map((l) => l.sub).join(' ')), 'sati temple: no praise of the act');
  }
  const yt = s.youtube_title || '';
  need(yt.length > 0 && yt.length <= 90 && yt.endsWith(' #Shorts') && DEVANAGARI.test(yt), 'youtube_title: max 90 characters, "Roman | देवनागरी #Shorts"');
  need(!/[<>]/.test(yt + desc + (s.youtube_tags || '')), 'YouTube fields must not contain < or >');
  const tags = (s.youtube_tags || '').split(',').map((t) => t.trim()).filter(Boolean);
  need(tags.length >= 10 && tags.length <= 15 && DEVANAGARI.test(s.youtube_tags || ''), `youtube_tags: 10-15 tags with some Devanagari (has ${tags.length})`);
  need(s.instagram_caption && s.instagram_caption.length <= 2200 && !DEVANAGARI.test(s.instagram_caption), 'instagram_caption: Roman, 1-2200 characters');
  need((s.facebook_caption || '').trim() && !DEVANAGARI.test(s.facebook_caption), 'facebook_caption: Roman, not empty');
  need(!BAIT.test(JSON.stringify(s)), 'remove engagement bait, fear or money/miracle promises');
  if (problems.length) {
    console.log(problems.map((p) => `- ${p}`).join('\n'));
    process.exit(1);
  }
  console.log(`OK: ${file} (dialogue, ${lines.length} lines, ~${Math.round(secs)} s)`);
  process.exit(0);
}

// ---- Shorts -------------------------------------------------------------------------------------

need(/^\d{4}-\d{2}-\d{2}-(morning|evening|noon)-[a-z0-9-]+$/.test(s.slug || ''), 'slug must be <yyyy-mm-dd>-<morning|evening|noon>-<lowercase-english-slug>');
need(s.title && s.title.length <= 45, `title must be 1-45 characters (is ${s.title?.length ?? 0})`);
need(s.kicker && s.kicker.length <= 22, `kicker must be 1-22 characters (is ${s.kicker?.length ?? 0})`);
need(['hm_omega', 'hf_alpha'].includes(s.voice), 'voice must be hm_omega or hf_alpha');
need(PLAYLISTS.includes(s.playlist), `playlist must be one of: ${PLAYLISTS.join(', ')}`);
need(/no text/i.test(s.style || ''), 'style must include "no text"');

const scenes = Array.isArray(s.scenes) ? s.scenes : [];
const evening = /-(evening|noon)-/.test(s.slug || ''); // noon = an extra animated darshan Short, same rules
const [minScenes, maxScenes, maxChars] = evening ? [4, 5, 330] : [6, 8, 620];
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
  need(sc.voice === undefined || ['hm_omega', 'hf_alpha'].includes(sc.voice), `${n}: voice (optional) must be hm_omega or hf_alpha`);
  if (last) {
    need(sc.endcard === true && !sc.prompt, `${n}: the last scene must be {"endcard": true, "tts", "sub"} with no prompt`);
    need(/subscribe/i.test(sc.sub || '') && /like/i.test(sc.sub || ''), `${n}: the end card must ask to like, share and subscribe`);
  } else {
    need(!sc.endcard, `${n}: only the last scene can be the end card`);
    need(sc.prompt && sc.prompt.length >= 40, `${n}: prompt missing or too short`);
    need(!/\b(text|letters|writing|sign|caption|words|logo)\b/i.test((sc.prompt || '').replace(/no (text|letters|writing)/gi, '')), `${n}: prompt must not ask for text, signs or letters`);
    need(['in', 'out', 'pan'].includes(sc.motion), `${n}: motion must be in, out or pan`);
    if (evening) {
      // Evening scenes are animated (5-7 s image-to-video clips): short lines, and a motion description.
      need(sc.tts && sc.tts.length <= 60, `${n}: evening tts over 60 characters (${sc.tts?.length}); the animated clip is ~5-7 s`);
      need(typeof sc.animate === 'string' && sc.animate.length >= 20 && sc.animate.length <= 300, `${n}: evening scenes need "animate": one English sentence of gentle motion (20-300 characters)`);
      need(sc.deity === undefined || typeof sc.deity === 'boolean', `${n}: deity must be true or false`);
    } else if (sc.animate !== undefined) {
      // Morning: up to 4 marked scenes become animated clips (<= 7 s), so their lines stay short.
      need(typeof sc.animate === 'string' && sc.animate.length >= 20 && sc.animate.length <= 300, `${n}: "animate" must be one English sentence of gentle motion (20-300 characters)`);
      need(sc.tts && sc.tts.length <= 80, `${n}: an animated morning scene needs tts of at most 80 characters (${sc.tts?.length}); the clip is at most 7 s`);
      need(sc.deity === undefined || typeof sc.deity === 'boolean', `${n}: deity must be true or false`);
    }
  }
});
if (!evening) {
  const marked = scenes.filter((sc) => sc.animate !== undefined && !sc.endcard).length;
  need(marked >= 1 && marked <= 4, `morning: mark 1-4 scenes with "animate" (has ${marked}); they become animated clips, the rest stay still`);
}

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
// Real temple photos (footage/<temple>/, scripts/real-photos.mjs): `temple` names the folder, `real` marks temple scenes.
need(s.temple === undefined || /^[a-z0-9-]+$/.test(s.temple), 'temple: lowercase slug from footage/temples.json');
scenes.forEach((sc, i) => need(sc.real === undefined || (typeof sc.real === 'boolean' && !sc.endcard), `scene ${i + 1}: real must be true or false (not on the end card)`));
need(!scenes.some((sc) => sc.real) || s.temple, '"real" scenes need the "temple" slug');
const all = JSON.stringify(s);
need(!BAIT.test(all), 'remove engagement bait, fear or money/miracle promises');

if (problems.length) {
  console.log(problems.map((p) => `- ${p}`).join('\n'));
  process.exit(1);
}
console.log(`OK: ${file} (${scenes.length} scenes)`);
