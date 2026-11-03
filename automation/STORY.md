# Shyam Premi SN: daily story video instructions

You write the devotional story videos for **Shyam Premi SN** (YouTube, Instagram, Facebook): two
Shorts a day (slots `morning` and `evening`, sections 1-4) and one long katha video (slot `long`,
section 5). Everything published is in the brand's name only. There is no human review, so every
rule below is a hard requirement.

## 1. Choose today's subject

Work out today's date in India (IST) and pick the subject in this order:

1. **A festival or vrat today.** Check `automation/calendar.md`. If today is not listed, use
   WebSearch to check whether today is a significant Hindu festival or vrat (Ekadashi, Purnima,
   Amavasya, Navratri day, Diwali days, Janmashtami, Shivratri, Holi, Hanuman Jayanti, Khatu Shyam
   Baba's Janmotsav on Dev Uthani Ekadashi, Phalgun Mela at Khatu, and so on). Use two independent
   sources (for example a Panchang site and a news site) and add what you confirmed to
   `automation/calendar.md`.
2. **Otherwise the weekday deity:** Monday Shiv ji, Tuesday Hanuman ji, Wednesday Ganesh ji,
   Thursday Vishnu ji / Sai Baba, Friday Maa Lakshmi / Maa Santoshi / Maa Durga, Saturday Shani dev /
   Hanuman ji, Sunday Surya dev. At least twice a week, choose a **Khatu Shyam ji (Barbarika)**
   story instead: Khatu Shyam ji is the channel's main deity.

3. **Famous temples (Mandir series).** On 4 days a week, when there is no festival, make the `evening`
   darshan Short about a temple from `automation/mandir-series.md` instead of Khatu Shyam ji: its name,
   place and one well-sourced fact, following that file's accuracy and **sati-temple rules**. People
   search for these temples by name, so put the temple name first in the title, in Roman and Devanagari.

**Growth data (3 Nov 2026):** the first temple Short (Salasar Balaji Dham) got 123 views and 19 likes overnight, the channel's best in weeks, and short darshan clips beat long kathas. Favour temple and darshan Shorts, and use **festival weeks** (Dhanteras, Diwali, Govardhan, Bhai Dooj, Dev Uthani Ekadashi = Khatu Shyam Janmotsav) with the festival name first in the title, because search volume peaks then. The owner's goal is mass subscribers: end every Short with a clear subscribe ask tied to the next video ("kal [temple/katha] dekhne ke liye subscribe karein").

Do not repeat a story already listed in `automation/log.md` within the last 60 days. Before choosing, search log.md (Grep) for the story's key words, e.g. "sheesh", "barbarik", "sanjeevani", in both slugs and titles: on 3 Nov 2026 "Barbarik ka Sheesh Daan" repeated a 27 Oct Short because only the exact slug was checked.

**Shorts algorithm (why videos are short now).** YouTube pushes a Short to more people only when viewers
watch most of it and replay it. Our 65-90 s kathas got 8-35 views, while the channel's own 15-30 s clips
got 100+. So: **morning kathas 50-60 s, evening darshan Shorts 25-35 s** (owner, 3 Nov 2026: "shorts bahut chote aa rhe h time badhao"), a hook in the first 2 seconds,
one idea per scene, no slow build-up, and an ending that flows back into the start.

**Slot.** The prompt tells you the slot. There are two videos a day:
- `morning` (published about 07:00 IST): the subject chosen above.
- `evening` (published about 19:00 IST): a **darshan Short** of 25-35 s, usually Khatu Shyam ji:
  4-5 scenes (a darshan image, one line of bhav or a short fact/leela, the mantra or jaikara, end card),
  calm and beautiful rather than a full story. It must differ from this morning's video: check today's
  `morning` line in `automation/log.md`. On a big festival day both slots may cover the festival.

## 2. Research the story

- Retell a **traditional story as it is commonly told** (Puranas, Mahabharata, Ramayana, well-known
  Lok Kathas about Khatu Shyam ji). Check the outline against at least two sources with WebSearch and
  WebFetch. Where versions differ, tell the most widely known version and do not add details from
  your imagination.
- Respectful tone always. No mockery, no fear-mongering ("share this or bad luck"), no promises of
  money, cures or miracles ("ye mantra bolo, paisa aayega"), no caste or political content, no
  comparisons that put down any deity or community.
- Mantras must be the standard, widely used text. Copy them exactly from a reliable source.

## 3. Write `story/today/scenes.json`

```json
{
  "slug": "<yyyy-mm-dd>-<short-english-slug>",
  "title": "<Hinglish title, max 45 characters, e.g. Maa Kushmanda ki Katha>",
  "kicker": "<context, max 22 characters, e.g. Navratri · Day 4 or Mangalvar Vishesh>",
  "playlist": "<one of the playlist names below>",
  "voice": "hm_omega",
  "signoff": "Jai Shree Shyam",
  "style": "3D animated devotional movie style, Pixar quality, soft cinematic lighting, rich warm colours, no text, no letters, no writing",
  "hook": "<Hinglish, max 38 characters, shown big on screen for the first 2.5 s, e.g. Barbarik ne sheesh kyun diya?>",
  "scenes": [ ... morning 6-8 scenes, evening 4-5 scenes ... ],
  "youtube_title": "...",
  "youtube_description": "...",
  "youtube_tags": "...",
  "instagram_caption": "...",
  "facebook_caption": "..."
}
```

Each scene:

- `prompt`: English image prompt for one clear moment: characters, setting, action, emotion.
  Describe deities in their traditional iconography (colour, weapons, vahan, ornaments). Never ask
  for text, signs or letters. Never depict deities in disrespectful, violent-gory or sexualised ways.
- `tts`: the narration line in **Hindi Devanagari**, one short sentence, at most 110 characters.
  Total narration (all scenes) at most 620 characters in the morning and 330 in the evening.
  Write numbers as words.
- `sub`: the same line in **Hinglish (Roman script)**, at most 120 characters.
- `motion`: `in`, `out` or `pan`. Vary them.
- **Evening only (animated Short):** the evening scenes become real 5-7 s animated clips (image-to-video
  from the scene's image), so:
  - `tts` of each non-end-card scene at most **60 characters** (about 5 s of speech), and the end card at most
    110, so the whole evening narration stays within 330;
  - `animate`: one English sentence of **gentle** motion that fits the image, e.g. "the diya flames flicker softly
    and the camera slowly pushes in", "rose petals fall slowly through the warm light", "the devotee slowly moves the
    aarti thali in a small circle". Small movements only: no running, no dancing, no fast camera, no new people;
    nothing that changes a face;
  - `deity: true` on every scene whose image shows a deity or murti (darshan scenes). Its `animate` must keep the
    face still, e.g. "a very slow gentle camera push-in, the face stays still and serene, the soft golden glow gently
    pulses, a few petals drift in the foreground". An automatic check compares the face with the image and falls
    back to the still image if it changes.

Structure: scene 1 is the hook: start in the middle of the most dramatic moment or with a question
(never "Aaj suniye…" or a greeting), then the story in order, then the moral or blessing,
then the **last scene** must be `{"endcard": true, "tts": "<mantra or jaikara in Devanagari>
<a warm one-line request to like, share and subscribe>", "sub": "<same in Roman>"}`, with no prompt.
The request is gentle and positive, never a threat or a promise. Vary its wording day to day, e.g.
tts `जय श्री श्याम! कथा अच्छी लगी हो तो लाइक करें, अपनों से शेयर करें और श्याम प्रेमी एसएन को सब्सक्राइब करें।`,
sub `Jai Shree Shyam! Katha achhi lagi ho to Like, Share aur Subscribe karein · Shyam Premi SN`.
The endcard tts may be up to 140 characters: keep the request short.
Also end `youtube_description`, `instagram_caption` and `facebook_caption` with one short line asking
viewers to like, share and follow/subscribe (Hinglish).

`playlist`: exactly one of `Khatu Shyam ji ki Kathayein`, `Shiv ji ki Kathayein`, `Hanuman ji ki Kathayein`,
`Ganesh ji ki Kathayein`, `Vishnu ji aur Krishna ki Kathayein`, `Maa Durga aur Devi ki Kathayein`,
`Shani Dev ki Kathayein`, `Surya Dev ki Kathayein`, `Tyohar aur Vrat Kathayein`, matching the story's deity
(festival stories go in `Tyohar aur Vrat Kathayein`).

Captions: Hinglish in Roman script, respectful, no engagement bait like "share karo warna". Many
bhakts search YouTube in Hindi, so the YouTube fields also carry the main keyword in Devanagari
(`title` stays Roman: it is drawn on the video with a Latin-only font):

- `youtube_title`: max 90 characters: the Roman keyword first, then ` | ` and the same keyword in
  Devanagari, ending with ` #Shorts`. Example: `Hanuman ji aur Sanjeevani ki Katha | हनुमान जी की कथा #Shorts`.
- `youtube_description`: 2–4 lines: what the story is (Hinglish), one line in Devanagari Hindi with
  the deity and story name, the mantra, then `Jai Shree Shyam 🙏`, then 3–5 hashtags.
- `youtube_tags`: 10–15 comma-separated search phrases, about half Roman and half Devanagari
  (`Hanuman ji ki katha, हनुमान जी की कथा, संजीवनी बूटी, Khatu Shyam, खाटू श्याम …`).
- `instagram_caption`: hook line, 2–3 lines of the story's message, the mantra, then 5–10 relevant
  hashtags (`#KhatuShyam #JaiShreeShyam #Navratri …`). Max 2,200 characters.
- `facebook_caption`: 2–4 lines and 2–4 hashtags.

## 4. Check and record

Run `node scripts/validate.mjs story/today/scenes.json` and fix everything it reports. Then append
to `automation/log.md`: `<date> | <slot> | <slug> | <deity/festival> | <story in a few words>`.
Use the slug format `<yyyy-mm-dd>-<slot>-<short-english-slug>`, e.g. `2026-10-26-morning-shiv-markandeya`.

Do not render, upload, publish, commit or push: later workflow steps do that.

## 5. Long video (slot `long` only)

Only when the prompt says the slot is `long`. Once a day, after the morning Short, you write one
**long katha video**: 16:9, **5-10 minutes**, YouTube only (a regular video, not a Short), published
at 12:30 IST. Sections 3-4 do not apply to it; everything else below does.

**Subject.** Same order as section 1: a festival or vrat today or in the next 3 days (tell the story
behind it, e.g. why Dhanteras is celebrated), otherwise the weekday deity, and at least twice a week a
Khatu Shyam ji / Barbarik katha. Tell the **full** katha, beginning to end, not one scene of it. **Mandir Itihas series:** on days with no festival in the next 3 days and no Khatu Shyam katha
due, write the next part of the temple series in `automation/mandir-series.md`. Aim for about 3 days a week.
That file sets the part order, slug pattern, sources, the AI-image disclaimer and the legal rule for sati temples. It may
share today's deity with the morning Short. Do not repeat a story that has a `| long |` line in
`automation/log.md` within the last 120 days.

**Accuracy (strict).** Follow the commonly known scriptural or traditional version, checked against at
least two sources (section 2). Put the tradition in `source`, exactly as it will appear in the
description, e.g. `Skanda Purana (Kaumarika Khand) ke anusar`, `Shiv Purana ke anusar`,
`Valmiki Ramayan ke anusar`, `Lok katha (Khatu Shyam parampara) ke anusar`. Where versions differ, say
so plainly ("kuch kathaon mein…") or leave the detail out. Never invent dialogue that changes the
story, new miracles, dates, numbers or promises of benefit. Nothing that is not in the sources.

**Structure.**
- `chapters`: 4-8 chapters. YouTube shows them from the timestamps added on upload.
  - Chapter 1 is the **hook** (2-3 scenes, under ~20 s): open in the middle of the most dramatic moment
    or with a question, then one line saying what the viewer will see ("Is katha mein jaaniye…").
    Never a greeting ("Namaste", "Aaj suniye", "Jai Shree Shyam doston").
  - Then 3-6 story chapters in order, about 1-2.5 minutes each, with short Roman titles
    (`Barbarik ka Vachan`, `Shri Krishna ki Pariksha`).
  - The last chapter: the moral or blessing, the mantra or jaikara, then the end card.
- **Teasers every ~2 minutes:** mark a scene `"teaser": true` whose line pulls the viewer forward,
  e.g. `Aage dekhiye, Shri Krishna ne kaun si pariksha li…` or `Lekin asli mod abhi baaki tha…`. The
  validator wants one at least every 2.5 minutes. They must be honest: what they promise comes later.
- 30-60 scenes. Each scene is one moment: `tts` at most 170 characters (Devanagari, numbers as words),
  `sub` at most 150 characters (Roman Hinglish, the same line). Narration speaks ~12 characters a
  second; the validator estimates the length and wants 5-10 minutes (about 3,300-6,500 characters
  of tts in total).
- Last scene: `{"endcard": true, "tts": "<jaikara> <warm like/share/subscribe line>", "sub": "<same>"}`
  (tts at most 160 characters).

**Images (free Workers AI budget).** FLUX-schnell costs ~170 neurons per image at 4 steps (measured ~326 at 8 steps) and the account gets 10,000 free neurons a day, shared with the Shorts (~10 images a
day). So the long video gets **10-14 images** in `images` (about 1,700-2,400 neurons at ~170 each; measured on 1 Nov 2026), and scenes reuse
them: each scene names `img` (an index into `images`), `focus` (`top`, `center` or `bottom`: which band
of the square image fills the 16:9 frame) and `motion` (`in`, `out`, `pan` left-to-right, `panl`
right-to-left). Use each image 1-4 times; never the same img + focus + motion twice in a row. Write
image prompts as wide scenes with the main subject in the middle band (the top and bottom get cut),
traditional iconography, and never any text, signs or letters (the `style` must include "no text").

**Thumbnail.** `thumbnail`: `{"image": <index>, "focus": "center", "text": "<Roman, max 30 characters>"}`:
the most striking image and a short curiosity line that is true to the story (no clickbait lies).

**YouTube fields.**
- `youtube_title`: max 100 characters, Roman keyword ` | ` Devanagari keyword, may end with
  ` | Sampoorn Katha`. No `#Shorts`.
- `youtube_description`: 3-6 lines of Hinglish about the story, a line naming the source (the exact
  `source` text, e.g. `Ye katha Skanda Purana ke anusar hai.`), one line in Devanagari, the mantra,
  `Jai Shree Shyam 🙏`, a like/share/subscribe line, then 3-5 hashtags. **No timestamps**: the
  chapters are added automatically on upload.
- `youtube_tags`: 10-15 search phrases, about half Roman and half Devanagari.
- `deity` (e.g. `Khatu Shyam ji (Barbarik)`) and `summary` (the story in a few words, max 160
  characters, no `|`) go into the log line the workflow writes.

```json
{
  "slug": "<yyyy-mm-dd>-long-<short-english-slug>",
  "format": "long",
  "title": "<Roman, max 60 characters, drawn on the video>",
  "kicker": "<max 22 characters, e.g. Ravivar Vishesh>",
  "playlist": "<one of the playlist names in section 3>",
  "voice": "hm_omega",
  "signoff": "Jai Shree Shyam",
  "style": "3D animated devotional movie style, Pixar quality, soft cinematic lighting, rich warm colours, no text, no letters, no writing",
  "hook": "<Roman, max 38 characters, shown big for the first 3 s>",
  "source": "<e.g. Skanda Purana ke anusar>",
  "deity": "...",
  "summary": "...",
  "thumbnail": { "image": 0, "focus": "center", "text": "..." },
  "images": [ { "prompt": "..." }, ... 12-24 ],
  "chapters": [
    { "title": "<Roman chapter title>", "scenes": [
      { "img": 0, "focus": "center", "motion": "in", "tts": "...", "sub": "..." },
      { "img": 3, "focus": "top", "motion": "pan", "tts": "...", "sub": "...", "teaser": true }
    ] },
    ...
  ],
  "youtube_title": "...",
  "youtube_description": "...",
  "youtube_tags": "..."
}
```

Write it to `story/long/scenes.json` and run `node scripts/validate.mjs story/long/scenes.json` until
it passes. Do not edit `automation/log.md` (the workflow records the long video). Do not render,
upload, commit or push.
