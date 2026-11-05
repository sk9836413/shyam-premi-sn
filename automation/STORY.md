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
   `automation/calendar.md`. Festival and calendar rules (this item and the Janmotsav countdown below) always come first.
2. **Then what people search right now: today's trend research.** `automation/trends/<today>.md` is made every
   morning by `scripts/trend-signals.mjs` from YouTube autocomplete (Roman and Devanagari), Google Trends India and our
   own channel numbers (if today's file is missing, use the newest one in that folder). Read its first 100 lines: the
   **Recommended topics** list is ranked, and each item names a format, the exact search phrase in Roman and
   Devanagari, and the evidence. Take the highest-ranked item whose format fits this slot (`morning katha` = morning,
   `evening darshan` = evening, `noon Dadi-Chhotu` = noon, `long part` = long) and that passes every rule in this file.
   On a festival day the festival stays the subject: use the file to pick its angle and search phrase.
   - **Title:** use the item's search phrase naturally: in `youtube_title` the Roman phrase first, ` | `, then the
     Devanagari phrase (e.g. `Dhanteras ki Katha | धनतेरस की कथा #Shorts`; write chat spellings out, "h" as "hai"), and
     put both forms in `youtube_tags`. `title` and `hook` may echo it too.
   - The **accuracy rules (section 2, mandir-series.md), the sati-temple rules and the no-repeat rule below stay
     absolute**: a trend never overrides them. An item marked "already a <slot> video on it" is used only with a clearly
     new angle; otherwise take the next item.
   - **Never chase** a trend that is off-topic (film or bhajan songs, aarti or chalisa singing, rangoli, ringtones,
     cricket, films), political, communal or controversial, or that would need a claim you cannot source twice (muhurat
     timings, crowd numbers, miracles or benefits, dates not in calendar.md). Skip it and take the next item.
3. **Then the weekday deity:** Monday Shiv ji, Tuesday Hanuman ji, Wednesday Ganesh ji,
   Thursday Vishnu ji / Sai Baba, Friday Maa Lakshmi / Maa Santoshi / Maa Durga, Saturday Shani dev /
   Hanuman ji, Sunday Surya dev. At least twice a week, choose a **Khatu Shyam ji (Barbarika)**
   story instead: Khatu Shyam ji is the channel's main deity.

4. **Famous temples (Mandir series).** On 4 days a week, when there is no festival, make the `evening`
   darshan Short about a temple from `automation/mandir-series.md` instead of Khatu Shyam ji: its name,
   place and one well-sourced fact, following that file's accuracy and **sati-temple rules**. People
   search for these temples by name, so put the temple name first in the title, in Roman and Devanagari.

**Growth data (3 Nov 2026):** the first temple Short (Salasar Balaji Dham) got 123 views and 19 likes overnight, the channel's best in weeks, and short darshan clips beat long kathas. Favour temple and darshan Shorts, and use **festival weeks** (Dhanteras, Diwali, Govardhan, Bhai Dooj, Dev Uthani Ekadashi = Khatu Shyam Janmotsav) with the festival name first in the title, because search volume peaks then. The owner's goal is mass subscribers: end every Short with a clear subscribe ask tied to the next video ("kal [temple/katha] dekhne ke liye subscribe karein").

**Khatu Shyam Baba Janmotsav countdown (15-19 Nov 2026).** The Janmotsav is on Dev Uthani Ekadashi, **20 Nov 2026**
(calendar.md), the channel's biggest day. On the 5 days before it the `evening` darshan Short and the `noon` Dadi-Chhotu
Short count down to it (this overrides the temple rotation and, for these two slots, the Chhath days; the `morning` slot
keeps the festival). Put the countdown in `kicker` (`Janmotsav: 5 din`, ... `Janmotsav: kal`) and end with "Janmotsav
tak roz dekhiye". One angle per day, each different from what log.md already has (tell a new part, not a repeat):
- 15 Nov: who Barbarik was (Ghatotkach and Maurvi's son, the three arrows boon), as Mahabharat lok katha.
- 16 Nov: Barbarik's vow to side with the losing side and the sheesh daan to Shri Krishna (new details, not the 27 Oct / 3 Nov lines).
- 17 Nov: how the sheesh was found at Khatu and the first temple (tradition; give years only with two sources).
- 18 Nov: Khatu Shyam ji temple history and architecture (the rebuilding, the town, Shyam Kund), from the trust,
  Rajasthan Tourism or the Sikar district site plus one more source.
- 19 Nov: why the Janmotsav is on Dev Uthani Ekadashi, and how it is celebrated (shringar, nishan, kirtan): sourced, no
  crowd numbers or timings. Dadi ends with "kal Baba ka Janmotsav hai". 20 Nov: morning and long video on the
  Janmotsav and Dev Uthani Ekadashi; the status Short (story/status/2026-11-20.json) goes out at 06:00 IST.
Accuracy rules (section 2 and mandir-series.md) apply in full: legends labelled as tradition, every fact with two sources.

Do not repeat a story already listed in `automation/log.md` within the last 60 days. Before choosing, search log.md (Grep) for the story's key words, e.g. "sheesh", "barbarik", "sanjeevani", in both slugs and titles: on 3 Nov 2026 "Barbarik ka Sheesh Daan" repeated a 27 Oct Short because only the exact slug was checked.

**Shorts algorithm (why videos are short now).** YouTube pushes a Short to more people only when viewers
watch most of it and replay it. Our 65-90 s kathas got 8-35 views, while the channel's own 15-30 s clips
got 100+. So: **morning kathas 50-60 s, evening darshan Shorts 25-35 s** (owner, 3 Nov 2026: "shorts bahut chote aa rhe h time badhao"), a hook in the first 2 seconds,
one idea per scene, no slow build-up, and an ending that flows back into the start.

**Real temple photos.** When a Short is about one temple, set `"temple"` to its slug from `footage/temples.json`
(e.g. `karni-mata`, `somnath`, `moti-dungri-ganesh`; aliases work) and mark the scenes that show the temple's exterior or
interior with `"real": true`. If licence-safe photos exist in `footage/<temple>/` (Wikimedia Commons, CC0 / PD / CC BY,
fetched automatically by scripts/real-photos.mjs), those scenes show the real photo with a slow camera move and the
renderer adds the credit lines to the description; otherwise the AI image is used. Never mark a legend, dream or
katha scene as real, and never call an AI image real. A `real` scene with a photo is not animated, so mark `animate` on
other scenes (darshan, katha). For a temple not in temples.json, still set `temple`; the photo search is strict and
usually finds nothing, which is fine.

**Festival status Shorts (no action needed).** For Dhanteras to Chhath and the Khatu Shyam Janmotsav, a separate 15-30 s
"WhatsApp status" Short is pre-written in `story/status/<date>.json` and published at 06:00 IST by the workflow's
`status` job. It does not use a slot or a log line of yours; do not duplicate it.

**Slot.** The prompt tells you the slot. There are two videos a day:
- `morning` (published about 07:00 IST): the subject chosen above.
- `evening` (published about 19:00 IST): a **darshan Short** of 25-35 s, usually Khatu Shyam ji:
  4-5 scenes (a darshan image, one line of bhav or a short fact/leela, the mantra or jaikara, end card),
  calm and beautiful rather than a full story. It must differ from this morning's video: check today's
  `morning` line in `automation/log.md`. On a big festival day both slots may cover the festival.
- `noon` (daily since 5 Nov 2026, published as soon as it is ready, about 11:00-11:30 IST): the **"Dadi aur Chhotu"**
  cartoon dialogue Short, 90-120 s. It has its own format and rules: **section 6**. Sections 3-4 do not apply to it.

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
- `voice` (optional, rare): `hf_alpha` for a line that needs the female narrator (e.g. a goddess's or mother's words);
  every other line uses the spec's `voice` (the channel's male narrator, `hm_omega`).
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
  - Write `animate` as **subject micro-motion** (what moves: flames, smoke, petals, cloth, leaves, water, light,
    breathing/blinking of a person) - the camera move comes from `motion` (`in` / `out` / `pan`), and the
    renderer adds the camera, the cinematic look and the stability rules itself. Deity scenes always get a straight
    push-in, never a sideways pan, and only the surroundings move: never ask the murti to move, turn,
    smile, bless or blink. Avoid things that flash or cut (lightning, fireworks, a door bursting open), and a petal
    or flame right in front of the lens: those look like a glitch and get the clip rejected.
  - Deity `prompt`s state the skin colour and key iconography explicitly (e.g. "blue-skinned Lord Krishna",
    "dark stone Banke Bihari murti", "orange-vermilion Hanuman ji"): the image model otherwise sometimes paints
    Krishna or Shyam ji fair-skinned.
  - `hero: true` (optional, at most one scene, evening only): the single most important darshan shot. When the
    bigger 14B video model is on, that one scene is animated with it (animate/REPORT.md section 10).
- **Morning (partly animated):** mark the **visually strongest 1-4 scenes** (ideally 3-4) with `animate`: the
  deity/murti darshan, the temple, and the key moment of the katha. Those scenes become real animated clips (at most
  7 s), so each marked scene's `tts` is at most **80 characters**; the other scenes stay as stills with a camera move
  and keep the normal 110-character limit. `animate` and `deity` follow the evening rules above (gentle motion only,
  `deity: true` for deity/murti images, face kept still). Prefer calm moments for the marked scenes: a battle or a
  crowd scene animates badly.

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
behind it, e.g. why Dhanteras is celebrated), then a `long part` item from today's trend research (section 1, item 2;
same title rule: Roman search phrase ` | ` Devanagari), otherwise the weekday deity, and at least twice a week a
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

**Real temple photos (Mandir Itihas parts).** Set `"temple"` (slug from `footage/temples.json`) and add `"real": true` to
the `images` entries that show the temple building or its interior (2-5 of them). When licence-safe photos exist in
`footage/<temple>/`, those images become the real photos (no FLUX cost) and their credits are added to the description;
keep the "Chitra AI dwara banaye gaye hain (sanketik)" line for the rest. Legend scenes stay AI images.

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

## 6. "Dadi aur Chhotu" dialogue Short (slot `noon` only)

Two cartoon characters talk: **Dadi Maa** (about 70, calm, tells the story) and her grandson **Chhotu** (8, curious).
**Chhotu's questions drive the story**: he asks, Dadi answers, he reacts and asks the next thing. The characters, voices,
music and layout are fixed (characters/library/shyam); you only write the dialogue and the story images. The owner
approved this format on 4 Nov 2026 ("YES sahi h").

**Subject (in this order).**
1. A festival today or tomorrow (`automation/calendar.md`; Diwali week: Dhanteras, Choti Diwali, Diwali, Govardhan,
   Bhai Dooj; Dev Uthani Ekadashi = Khatu Shyam Janmotsav): Chhotu asks why it is celebrated, Dadi tells the katha.
2. Otherwise **the temple Chhotu asked about yesterday**: read the latest `| noon |` line in `automation/log.md`
   (its summary ends with `agla: <temple>`). If there is none, take the next temple in `automation/mandir-series.md`
   (Rajasthan list first, then the pan-India series and their calendar rotation) that has no noon Short yet
   (Grep log.md for the temple's name).
3. **Trend research** (section 1, item 2) shapes both: use the `noon Dadi-Chhotu` item for today's subject as the
   search phrase in the title (Roman ` | ` Devanagari) and in Chhotu's first question when it fits (e.g. "Dadi, Choti
   Diwali kyun manate hain?"), and when you choose tomorrow's temple (`next`), prefer one that the file's Recommended
   topics or autocomplete show people searching for, among the next 3 in the series order. A promised `next` is
   never dropped for a trend.
It must differ from today's `morning` and `evening` lines. Numbered series: in a pan-India series, set
`kicker` to the series and number (`Jyotirlinga 3/12`) and use the series name as `playlist`; Rajasthan temples
use `Dadi ki Kahani` and `Mandir Itihas`; festivals `Tyohar aur Vrat Kathayein`.

**Accuracy (strict, as in mandir-series.md).** Every fact Dadi states (place, district, who built it, when, the main
festival) needs **two independent sources** (WebSearch + WebFetch): list them in `facts`. At least one of the two must be
the temple trust's site, a government page (tourism.rajasthan.gov.in, the district's *.gov.in / *.nic.in, ASI) or an
established news site (Amar Ujala, Dainik Bhaskar, Times of India, Webdunia...): Wikipedia and travel or devotional blogs
never count alone (the validator checks this). Legends are always labelled
in the line itself: "manyata hai…", "kehte hain…", "lok katha ke anusar…". Where sources differ, say so or leave it
out; never guess a year. Images are AI illustrations: never call them real or "asli darshan". **Sati temples**: the
sati rule in mandir-series.md applies in full: one neutral history sentence for the event, then a line where Dadi
speaks the disclaimer ("Sati pratha Bharat mein kanoon dwara pratibandhit hai…"), no praise, no fire imagery, and
the disclaimer in the description. Respectful tone, no fear or money promises (section 2).

**Dialogue.**
- 14-24 lines, about **90-120 seconds** spoken. Dadi speaks slowly (~10 Devanagari characters a second), Chhotu
  faster (~14), with a short pause between turns; the validator estimates the length (about 1,000-1,300 characters
  of tts in total).
- Line 1: **Chhotu asks a curious question** that hooks in 2 seconds (the most surprising fact as a question, e.g.
  "Dadi, Hanuman ji ki daadhi-moochh kyun hai?"). No greeting.
- At least 4 of Chhotu's lines are questions ("Phir kya hua?", "Wo murti aayi kahan se?"). Nobody speaks more than
  2 lines in a row. Dadi's lines are short and warm ("Suno beta…"), one idea each.
- **Ending:** Chhotu asks about tomorrow ("Dadi, kal kis mandir ki kahani sunaogi?" or he names it), and Dadi
  answers with tomorrow's temple and a gentle like/share/subscribe ask, e.g. tts `कल सुनाऊँगी जीण माता की कहानी।
  देखने के लिए लाइक, शेयर और सब्सक्राइब करना, बेटा!`, sub `Kal sunaungi Jeen Mata ki kahani. Dekhne ke liye Like,
  Share aur Subscribe karna, beta!`. Tomorrow's temple is the next one in the series order, or one of the next 3 that
  people search for (subject item 3); put it in `next`, and tomorrow's noon Short must then really be about it.
- Each line: `who` (`dadi` or `chhotu`), `tts` (Hindi Devanagari, max 150 characters, numbers as words), `sub`
  (the same in Roman Hinglish, max 140 characters), `top` (which story image shows above the characters: a key of
  `visuals`, or `end` for the end card on the last line or two).

**Story images (`visuals`).** 3-6 entries `{"prompt": "...", "real": true|false}`, each shown for one or more lines.
FLUX-schnell, square, so describe one clear scene with the subject in the middle band (the top and bottom are cut),
traditional iconography, never text or letters. `real: true` marks images of the temple itself (building, murti,
darshan): when licence-checked real footage or photos exist in `footage/<temple>/` (owner clips, or Wikimedia Commons
photos fetched automatically: set `temple` to the slug in `footage/temples.json`), the renderer shows them there instead
(photos with a slow Ken Burns move) and credits them in the description; otherwise the AI image is shown, labelled
"AI chitra (sanketik)". Legend
scenes (a farmer's plough, a dream, a cart) are `real: false`.

```json
{
  "slug": "<yyyy-mm-dd>-noon-<short-english-slug>",
  "format": "dialogue",
  "title": "<Roman, max 45 characters, drawn on the video, e.g. Salasar Balaji Dham>",
  "kicker": "<max 22 characters: Dadi ki Kahani, or the series and number>",
  "playlist": "<one of the playlist names>",
  "temple": "<lowercase slug for footage/, e.g. salasar-balaji; leave it out on a festival day>",
  "next": "<tomorrow's temple or festival, Roman, max 30 characters>",
  "deity": "<for the log line, max 60 characters>",
  "summary": "<the story in a few words, max 160 characters, ending with 'agla: <next>'>",
  "hook": "<Roman, max 38 characters, shown big for the first 2.5 s>",
  "style": "stylized 3D animated feature film look, soft warm cinematic lighting, rich warm colours, no text, no letters, no writing",
  "visuals": { "temple": { "prompt": "...", "real": true }, "field": { "prompt": "...", "real": false } },
  "lines": [ { "who": "chhotu", "tts": "...", "sub": "...", "top": "temple" }, ... ],
  "facts": [ { "claim": "...", "sources": ["https://...", "https://..."] }, ... at least 3 ],
  "youtube_title": "<Roman keyword | Devanagari keyword #Shorts; in a series: <Temple> | <Series> n/total | <देवनागरी> #Shorts>",
  "youtube_description": "...",
  "youtube_tags": "...",
  "instagram_caption": "...",
  "facebook_caption": "..."
}
```

YouTube and caption fields follow section 3's rules (title max 90 characters ending ` #Shorts`, 10-15 tags with
Devanagari, captions in Roman). The description also carries `Chitra AI dwara banaye gaye hain (sanketik). Awaaz aur
animation AI se.` and ends with a like/share/subscribe line; real-footage credits are added automatically.

Run `node scripts/validate.mjs story/today/scenes.json` until it passes, then append the log line as in section 4
(`<date> | noon | <slug> | <deity> | <summary>`). Do not render, upload, commit or push.
