# Shyam Premi SN: daily story video instructions

You write the devotional story videos for **Shyam Premi SN** (YouTube, Instagram, Facebook): the
`morning` (festival days) and `evening` temple darshan Shorts (sections 1-4), the facts Shorts, the "Ramayan Ke Rochak
Tathya" series Shorts (section 11) and the Dadi-Chhotu Short (slot `noon`, section 6). The plain long katha video (section 5) is stopped (owner, 16 Nov 2026).

**At most 8 YouTube Shorts a day from 25 Nov 2026 (owner, 24 Nov 2026: "8 ka limit rakho daily"; 3 until 24 Nov 2026,
owner 9 Nov 2026).** The cap was raised so that the daily "Ramayan Ke Rochak Tathya" Short (17:00) and the approved
"Kailash Parivar" series (Mon/Thu/Sat 08:00) go out beside the day status and the evening darshan. It is a **ceiling, not
a target**: every slot still needs its own day, switch and limit (below), so a normal day has 4-5 Shorts. The warning
of 7-9 Nov still holds (at 5-6 a day Shorts fell to 0-15 views, most likely YouTube's repetitive / mass-produced AI
content signals): every upload must be high quality and **clearly different** from the others of the day (another
deity, format and look), never a near-copy to fill a slot.

**Re-plan around what goes viral (owner, 11 Nov 2026; data of all 109 videos).** Festival "status" Shorts average 154
views (Choti Diwali Status 2026: 798, Dhanteras Status: 456; the big festivals, out the night before or just after
midnight); famous-temple darshan Shorts 60 (Moravinandan Khatu Shyam 173, Shakambhari Sakrai 163, Salasar Balaji 133);
katha Shorts 18, the worst: **no more katha Shorts**. Generic "X Darshan" Shorts of the last days got 1-10.

**Video plan of 16 Nov 2026 (owner: "to aisa hi karo"; YouTube Analytics 25 Oct - 16 Nov).**
- Festival status Shorts get the views because they get **shared**: Choti Diwali 799 views / 31 shares, Dhanteras 456 /
  25 shares, Chhath Usha Arghya 239. So **every day gets a status Short**: the weekday day status on every non-festival
  day (movie days too), public **06:00 IST** for the morning WhatsApp status, with the "स्टेटस पर लगाएं 📲" pill, and every
  status Short's YouTube description ends with "📲 अपने WhatsApp स्टेटस पर लगाएं और परिवार में शेयर करें 🙏" (a share ask; NOT
  on Facebook, whose bait rule forbids it).
- Famous-temple darshan has the best **retention**: Khatu Moravinandan 76%, Salasar 72%, Shakambhari 62% (135-173 views);
  Hare ka Sahara 73%, Barbarik sheesh daan 90%. The evening darshan stays, on those searched temples first.
- The **long katha** (5-7 min) got 18-22% retention and 38-57 views: **stopped**. The long slot is only the weekly mantra
  jaap and a festival bhajan jukebox (the Chhath jukebox got 170 views).
- The new **facts Shorts** got 1-7 views each: at most 2 a week until the 25 Nov 2026 review (median under 20 views =
  facts off).

The workflow (`scripts/day-plan.mjs` `capFor`; `scripts/upload-guard.mjs` enforces the same cap) fills every day by
priority, max 8 Shorts from 25 Nov 2026 (3 before) (+ at most 1 long video, + the owner's footage Short):

| Priority | Upload | Made by |
|---|---|---|
| 0 | the mini-movie part, 07:00 (17-20 Nov) | `movie` job (section 7) |
| 1 | festival status Shorts: `eve` 20:00 the evening before, `status` 00:30 on the day, `statusday` 07:30 (big festivals; 08:30 until 20 Nov 2026), season countdowns 8-14 days before (festivals.json `season`) | `status` job, `scripts/status-engine.mjs` (no action from you) |
| 2 | `morning` on every non-festival day (movie days too): the weekday **day status** Short, public **06:00**, made the evening before (Somvar Mahadev, Mangalvar Hanuman/Salasar Balaji, Budhvar Ganesh, Guruvar Vishnu/Sai, Shukravar Lakshmi/Santoshi, Shanivar Shani dev, Ravivar Surya; Ekadashi: Gyaras Khatu Shyam) | the `status` job, status engine (no action from you) |
| 2 | `morning` on other festival days (not movie / big-festival days): a **famous-temple darshan** Short tied to the festival's deity | you (sections 1-4) |
| 3 | `evening` 19:00: a **famous-temple darshan** Short (Khatu Shyam ji, Salasar Balaji, Mehandipur Balaji, Shakambhari Mata, Jeen Mata, Rani Sati Dadi with the sati rules first) | you (sections 1-4) |
| 3.5 | `facts` 17:00 **every day** (from 26 Nov 2026; owner 24 Nov 2026 "roj 1"): the **"Ramayan Ke Rochak Tathya"** series Short (`automation/ramayan-series.md`, in order); festivals, the day status and the darshan rank first; not on movie / override days; outside the facts weekly limit; `RAMAYAN=off` pauses it | `facts` job, you write it (section 11) |
| 3.6 / 3.7 | "Kailash Parivar" (Mon/Thu/Sat) / "Shri Krishna kehte hain" (Tue/Fri) 08:00, when approved; beside the day status, the evening darshan and the Ramayan Short, never instead of them; not on movie / override days | sections 9-10 |
| 3.8 | `facts` 17:00: the "pauranik facts / rahasya" Short, **max 2 a week** until the 25 Nov 2026 review; the facts slot is the Ramayan Short's while that series runs (one facts Short a day, never two) | `facts` job, you write it (section "Facts Shorts") |
| 4 | "Kalyug ke Bhagwan" **14:30** (08:00 until 24 Nov 2026; 08:00 is the Kailash / POV time now), Tue/Thu/Sat of normal days (`KALYUG=on`) | `kalyug` job (section 8) |
| 5 | `noon` Dadi-Chhotu 15:00, Wednesdays of normal days | you (section 6) |
| own cap | `long` (16:9, outside the Shorts cap, max 1 a day): ONLY the weekly mantra jaap (Sundays, a Krishna week's Ekadashi) or a festival bhajan jukebox (>= 4 full-length QA-passed bhajans of that festival), at **05:30**; no plain katha | `mantra` / `jukebox` jobs |
| own cap | `owner` (owner, 20 Nov 2026): the owner's own REAL pandal darshan reels, 1 a day at **07:15** (aarti time, from 21 Nov 2026; was 09:30; outside the Shorts cap; order, titles, music in automation/owner-footage.json, skip list automation/owner-footage-skip.txt). Real footage is never called AI | `owner-footage.yml` (no action from you) |

A Short ranked below the day's cap is left out (the prompt tells you your slot's plan); with 8 that only happens on a
crowded festival day. Movie days and big-festival days have no `morning` Short of yours; a movie day and a date-scoped
override day (automation/chhath-2026.json) have no Kailash / POV, Ramayan, pauranik facts, Kalyug or Dadi-Chhotu Short.
Publish times stay spread (00:30 status, 05:30-06:00 dawn, 07:00 movie, 07:30 statusday, 08:00 Kailash / POV, ~10:30
festival-morning darshan, 14:30 Kalyug, 15:00 Dadi-Chhotu, 17:00 facts / Ramayan, 19:00 darshan, 20:00 eve status: never
two in the same minute, at least 30 min apart; Facebook Reels 90 min apart, `scripts/fb.mjs`).

**Resource guards for the 8-Shorts day** (`scripts/resource-budget.mjs`; a Short over budget still goes out, in the
simpler form, never a skipped festival status or evening darshan):
- **Workers AI FLUX** (10,000 free neurons a day, reset 05:30 IST, ~326 per image): the evening darshan and the festival
  status Shorts are never limited. Until the day's evening darshan is in log.md only the morning-window runs get
  Workers AI (festival-morning darshan 6 images, Dadi-Chhotu 6, photos 2, Veo kit 3), so ~10 images stay for the
  evening; the facts / Ramayan, long and loop runs use Kaggle FLUX first and then the picture bank. Write 4-6 image
  scenes; never more images than the spec needs.
- **Kaggle GPU** (~30 h a week, 2 sessions at a time): the evening darshan / status keep `quota --min 3`; the
  festival-morning darshan and the facts / Ramayan clips animate only above the daily Shorts' reserve (2.4 h a day + 1 h
  until the Saturday reset) plus 1.25 h for every Kailash / POV episode still due before the reset, else zoompan
  stills; Kailash / POV / Kalyug keep their own gate (`story/kalyug.py gate`).
- **YouTube**: videos.insert has its own bucket (100 a day), far above 8 + long + owner; ~51-102 shared units a Short.
  **GitHub Actions**: public repo, free. **Facebook**: Reels 90 min apart fit (07:00-23:00 holds 11).

### Publish times: bhajans at dawn (owner, 14 Nov 2026: "Bhajan subah subah hi bajate h log")

Devotees play bhajans early in the morning, so bhajan and mantra content is public by about 05:30-06:30 IST
(`scripts/day-plan.mjs` DAWN; `scripts/fb.mjs`, `scripts/stories.mjs`):

| Upload | YouTube | Facebook | Instagram | Story | Rendered |
|---|---|---|---|---|---|
| bhajan Short of the morning slot (any future bhajan Short without its own time) | **05:45** (publishAt) | Reel **06:00** (scheduled) | queued for 06:00, the first trigger after it | the video story ~06:30-07:00 (first trigger after 06:30), the morning card from 07:00 | **the evening before** |
| **day status Short** (every non-festival day; owner, 16 Nov 2026) | **06:00** (publishAt) | Reel **06:00** (scheduled) | queued for 06:00 | as the best public Short | **the evening before** (`status` job; if missing, the morning run, public on render) |
| bhajan / mantra long video (jukebox, mantra jaap) | **05:30** | feed video **05:30** | - | - | **the evening before** |
| katha long video (only a date-scoped override now) | 12:30 | feed 12:30 | - | - | the morning |
| a bhajan Short with its own `at` (e.g. the 16 Nov 19:00 Parana Short) | its `at` | the Reel plan | with YouTube | normal | on the day |

- **The evening-before render** hangs on the reliable triggers: daily.yml evening-slot runs from 17:00 IST (the
  scheduler Worker's 18:46 IST dispatch, plus the GitHub evening polls when they fire) run `day-plan.mjs --dawn` for
  tomorrow and make the dawn bhajan Short (job `bhajan`, matrix) and the dawn long video (jobs `jukebox` /
  `mantra`); photos.yml's 19:46 IST run dispatches daily.yml `slot=dawn` as the retry when one is still missing. No new
  cron; the Cloudflare scheduler is unchanged. Bhajan renders run on the GitHub runner (no Kaggle, no Claude).
- **Day attribution:** the IST publish date is the upload's date (slug `<publish date>-...`, the upload-guard claim, the
  log.md line), so a video rendered on the 14th for 05:45 on the 15th counts against the 15th's caps (8 Shorts from 25 Nov 2026 + 1 long).
- **Fallback:** if the evening render is missing, the morning run makes it and it goes public as soon as it is ready
  (Facebook/Instagram at once); for a long video never later than 12:30 (the long job waits for the jukebox / mantra
  job and tells its 12:30 katha only when they did not make the day's long video).
- **Facebook spacing:** Reels stay at least 90 min apart; 00:30 status -> 06:00 dawn bhajan is 5.5 h. No other Reel is
  planned between 01:00 and 07:00 (statusday 07:30, movie 07:30 -> 09:00 on a statusday, Kailash / POV 08:00, kalyug 14:30, the owner-footage Reel from 07:15 move later, never
  earlier).
- 15 Nov 2026 05:45 Sandhya Arghya bhajan Short (song 26f-04), rendered 14 Nov evening; 16 Nov 05:45 Usha Arghya bhajan
  Short (26e-07), rendered 15 Nov evening; 22 Nov 05:30 the first weekly mantra jaap (Vasudevaya).

`scripts/upload-guard.mjs` skips (and logs) any 4th YouTube Short or 2nd long video of an IST date. Everything published is in the brand's name only. There is no human review, so every
rule below is a hard requirement.

## Spoken style (every `tts`, every format)

Owner, 10 Nov 2026: the narration sounded robotic. The voices stay the free edge-tts Madhur/Swara (they pronounce Hindi
best; Chatterbox and Parler were worse), but every line is now spoken **sentence by sentence** (`voice/humanize.py`:
each sentence gets its own pace and pitch from its mood, natural pauses, soft breaths, a warm room). That only sounds
human when the **script is written to be spoken**, like a family elder telling a katha, not read from a book:

- **Short sentences**: one idea each, **at most 18 words** (the validator flags longer ones). Two short sentences beat
  one long one with "जिन्होंने… जिनसे… जिसके कारण…".
- **Warm, everyday Hindi/Hinglish**: "बेटा", "सुनो…", "देखो", "हैं ना?", "सोचो…", "अरे!", "फिर क्या हुआ?". Use these
  fillers **in moderation** (one or two per Short, a few per long video), never in every line.
- **Rhetorical questions and emotion words**: "क्या आप जानते हैं…?", "कितना बड़ा त्याग, है ना?", "आँखें भर आईं…".
- **Mark pauses with commas and "…"**: "और फिर… श्री कृष्ण ने माँग लिया, उनका शीश।" ("…" is a short dramatic pause;
  at most one or two per line).
- **No bookish Sanskritized sentences** ("तत्पश्चात", "उपरांत", "द्वारा प्राप्त किए", "समर्पित कर दिया" → "फिर", "के
  बाद", "मिले", "दे दिया"). **Shlokas, mantras and jaikaras stay exactly as they are** (exempt from the 18 words).
- **Numbers as words** ("तीन बाण", "सौ साल"), never digits.
- `mood` (optional, on a scene or a dialogue line): `calm`, `wonder`, `excitement`, `serious` or `emotional`. Without
  it the mood comes from the words (questions go slightly up, "!" with जय is excitement, ॐ/नमः lines are a slow mantra);
  set it only where the words do not show it (e.g. a quiet line that should be `emotional`).

Bookish: `बर्बरीक ने कठोर तपस्या द्वारा तीन अमोघ बाण प्राप्त किए, जिनसे संपूर्ण युद्ध क्षणभर में समाप्त हो सकता था।`
Spoken: `तपस्या से मिले तीन बाण। सोचो… सिर्फ़ तीन बाण, और पूरा युद्ध खत्म!`

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
   Devanagari, and the evidence. Take the highest-ranked item whose format fits this slot (`morning temple darshan` or
   `morning katha` = morning, but write it as a temple darshan,
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

4. **Famous temples (Mandir series).** The `evening` Short (and the `morning` Short on festival days) is a
   **famous-temple darshan**: a well-known temple people search for by name. **Retention data (16 Nov 2026):** Khatu
   Moravinandan 76%, Salasar 72%, Shakambhari 62% (135-173 views), Hare ka Sahara 73%, Barbarik sheesh daan 90%: prefer
   Khatu Shyam ji (at least twice a week), Salasar Balaji, Mehandipur Balaji, Shakambhari Mata Sakrai, Jeen Mata and Rani
   Sati Dadi (the sati-temple rules in full), then Somnath, Mahakaleshwar, Kashi Vishwanath, Banke Bihari, Nathdwara
   Shrinathji, ... from `automation/mandir-series.md`: its name, place and one well-sourced fact, following that file's accuracy and
   **sati-temple rules**. Put the temple name first in the title, in Roman and Devanagari, plus Darshan
   ("Salasar Balaji Dham Darshan | सालासर बालाजी धाम दर्शन #Shorts"). Never a generic "<Deity> Darshan" without a temple:
   those got 1-10 views. On a festival day pick a famous temple of that festival's deity (Ekadashi: a Vishnu/Krishna
   temple; Pradosh/Shivratri: a Jyotirlinga; Sankashti: a famous Ganesh temple).

**Growth data (3 Nov 2026):** the first temple Short (Salasar Balaji Dham) got 123 views and 19 likes overnight, the channel's best in weeks, and short darshan clips beat long kathas. Favour temple and darshan Shorts, and use **festival weeks** (Dhanteras, Diwali, Govardhan, Bhai Dooj, Dev Uthani Ekadashi = Khatu Shyam Janmotsav) with the festival name first in the title, because search volume peaks then. The owner's goal is mass subscribers: end every Short with a clear subscribe ask tied to the next video ("kal [temple/katha] dekhne ke liye subscribe karein").

**Khatu Shyam Baba Janmotsav countdown (15-19 Nov 2026).** The Janmotsav is on Dev Uthani Ekadashi, **20 Nov 2026**
(calendar.md), the channel's biggest day. On the days before it the `evening` darshan Short counts down to it whenever
it runs (16, 17, 18 and 19 Nov; 15 Nov has two Chhath status Shorts, so no evening Short; under the 16 Nov 2026 plan
17-19 Nov are full with the movie part, the Gopashtami / day status and the Janmotsav eve status Shorts, so the evening
darshan is not planned on those days); this overrides the temple rotation. The Janmotsav status Shorts go out on their own (18 + 19 Nov 20:00, 20 Nov 00:30 + 08:30; janmotsav-promo.md). Put the countdown in `kicker` (`Janmotsav: 5 din`, ... `Janmotsav: kal`) and end with "Janmotsav
tak roz dekhiye". One angle per day, each different from what log.md already has (tell a new part, not a repeat):
- 15 Nov: who Barbarik was (Ghatotkach and Maurvi's son, the three arrows boon), as Mahabharat lok katha.
- 16 Nov: Barbarik's vow to side with the losing side and the sheesh daan to Shri Krishna (new details, not the 27 Oct / 3 Nov lines).
- 17 Nov: how the sheesh was found at Khatu and the first temple (tradition; give years only with two sources).
- 18 Nov: Khatu Shyam ji temple history and architecture (the rebuilding, the town, Shyam Kund), from the trust,
  Rajasthan Tourism or the Sikar district site plus one more source.
- 19 Nov: why the Janmotsav is on Dev Uthani Ekadashi, and how it is celebrated (shringar, nishan, kirtan): sourced, no
  crowd numbers or timings. The 19 Nov evening ends with "kal Baba ka Janmotsav hai". 20 Nov (a movie day): the
  Janmotsav status Short at 00:30, Part 4 at 07:00 and a second Janmotsav status Short at 08:30: 3 uploads, no evening
  Short, no long video.
- **17-20 Nov mornings are the mini-movie "Khatu Shyam ji ki Amar Katha" (section 7), Parts 1-4 at 07:00 IST**, made
  ahead by the `movie` job. On those days the morning run writes nothing (log.md already has `<date> | movie |`), and the
  evening countdown must not retell the same scene: Part 1 = birth, vow, three arrows; Part 2 = the Brahmin's peepal
  test; Part 3 = the sheesh daan; Part 4 = the Shyam boon, Khatu and the Janmotsav.
Accuracy rules (section 2 and mandir-series.md) apply in full: legends labelled as tradition, every fact with two sources.

Do not repeat a story already listed in `automation/log.md` within the last 60 days. Before choosing, search log.md (Grep) for the story's key words, e.g. "sheesh", "barbarik", "sanjeevani", in both slugs and titles: on 3 Nov 2026 "Barbarik ka Sheesh Daan" repeated a 27 Oct Short because only the exact slug was checked.

**One subject per day (all slots, the long video included).** Near-identical uploads compete with each other (when the
channel posted 5-6 videos a day: status 06:00, morning, noon, long 12:30, evening 19:00): on 8 Nov 2026 "Diwali
Lakshmi Puja, Shubh Diwali" (morning) and "Diwali ki Katha, Lakshmi Puja" (noon) went out beside the Diwali status Short
and got 7 and 5 views; 9 Nov's noon "Govardhan Puja ki Katha" repeated the 7 Nov long video's title (4 views); 7 Nov's
noon "Diwali ki Kahani" retold the 5 Nov long video (Ram's return to Ayodhya, 0 views). Before choosing, read **every**
line of today and the 2 days before in `automation/log.md` (and `story/status/<today>.json`, whose title is
"<Festival> Status 2026") and give your video **its own subject**: a different story, deity or temple, or on a festival
day a clearly different angle (e.g. morning = what the puja means, noon = a lesser-known katha of the festival,
evening = a temple's festival darshan) with **different title words**. Never a second "<Festival> ki Katha/Kahani" on a
day that already has one, and never a bare "<Festival> ki Katha" beside the status Short. `scripts/validate.mjs` checks
this (the same title words, or 60% of the title or subject words shared, with today's uploads and those of the 2 days
before) and reports "one subject per day: …": change the subject or the angle and the title until it passes.

**Shorts algorithm (why videos are short now).** YouTube pushes a Short to more people only when viewers
watch most of it and replay it. Our 65-90 s kathas got 8-35 views, while the channel's own 15-30 s clips
got 100+, and every winner was 21-31 s. So: **morning Shorts 21-35 s (4-6 scenes; owner, 9 Nov 2026), evening darshan Shorts 25-35 s**, a hook in the first 2 seconds,
one idea per scene, no slow build-up, and an ending that flows back into the start.

**Hook, title and cover formulas (channel data, 6 Nov 2026; `scripts/validate.mjs` enforces them).**
Winners: "Dhanteras Status 2026 | शुभ धनतेरस स्टेटस वीडियो" (280 views in 5 h, opens on "शुभ धनतेरस!" over a Dhanvantari
close-up), "Moravinandan Khatu Shyam ji Darshan" (173, 76% viewed), "Shakambhari Mata Mandir Sakrai Darshan" (159,
animated), "Salasar Balaji Dham, Churu" (133, opens "दाढ़ी-मूँछ वाले हनुमान जी, सालासर बालाजी धाम"). All 21-31 s, the
name in the first words of the title AND of the narration, a darshan picture first. Losers: kathas that open "आज
सोमवार है। आज सुनिए…" (8-9 views), temple Shorts that open on geography and say the name late ("जयपुर ज़िले की सांभर
झील के पास…": 7 views), riddles without a name ("Wo chaand nahi tha…": 9), Dadi-Chhotu Shorts that open "दादी, …"
(0-4 views), titles without a searched name ("Gajendra Moksha ki Katha": 8).
- **Hook (first 2 s, spoken and on screen).** `hook` (max 38 characters) and the first spoken line both **name the
  deity, temple or festival** in their first words (the first ~55 characters of the first `sub`). Three formulas:
  1. **Name + blessing:** "Shubh Dhanteras! Dhanvantari ka ashirwad" / tts "शुभ धनतेरस! भगवान धन्वंतरि आपको…".
  2. **Name + curiosity:** "Salasar Balaji ki daadhi-moochh kyun?", "Kya aap jaante hain? Khatu Shyam ka sheesh…",
     "Shyam Kund mein kya hai khaas?".
  3. **Name + the most striking true fact:** "Somnath: pehla Jyotirlinga" (only facts with two sources).
  No slow intros: never a greeting, a weekday intro or an address before the name.
- **Banned weak openers** (hook, first `sub`, first `tts`): Aaj suniye / Aaj hum / Aaj ki katha / Aaj somvar (any
  weekday) hai, Namaste, Namaskar, Pranam, Doston, Bhakto, Swagat, Welcome, Hello, Chaliye, Aaiye, Suniye, Dekhiye,
  Is video mein, Ek baar ki baat hai, Bahut samay pehle, "Dadi, …" / "Dadi maa, …" (put "Dadi" at the end of
  Chhotu's question instead), and the same in Devanagari (आज सुनिए, नमस्ते, दोस्तों, चलिए, आइए, एक बार की बात,
  बहुत समय पहले, दादी, …).
- **Darshan first.** Scene 1 is the deity or temple **close-up** (`deity: true` and "close-up" in the prompt, face in
  the middle third, or a real temple photo `real: true`), animated/moving from frame one; the hook line is spoken over
  it and the katha's dramatic moment starts at scene 2. (Noon: line 1 shows the temple/murti visual.)
- **Cover frame.** `cover`: 2-4 huge Devanagari words (max 24 characters) with the name, e.g. `सालासर बालाजी धाम`,
  `खाटू श्याम दर्शन`, `शुभ धनतेरस`. The renderer draws them over the first 0.4 s of scene 1 (below the face,
  inside the safe area) and fades them out while the picture already moves: that first frame is also uploaded as the
  Short's custom thumbnail (YouTube shows it in search and suggestions) and used as the FB/IG cover.
- **Title.** `youtube_title` = the **searched phrase first** (the Roman phrase from today's trend file when one fits,
  otherwise the deity/temple/festival name), ` | ` the Devanagari version, then ` #Shorts`; the Roman part 8-48
  characters (60 for the long video), the name within its first 3 words, plus **one value or emotional word**
  (Darshan, Katha, Status, Rahasya, Itihas, Shubh, Divya, Adbhut, Sampoorn, Vishesh…). E.g. `Salasar Balaji Dham
  Darshan, Churu | सालासर बालाजी धाम दर्शन #Shorts`, `Choti Diwali ki Katha | छोटी दिवाली की कथा #Shorts`.
- **Searched phrases and other channels' names (YouTube Studio search terms, 13 Nov 2026; `scripts/bhakti-seo.mjs`).**
  Viewers find us with generic intents: "Bhakti Geet", "Shyam Bhajan 2026", "Shyam Baba Song", "Shyam Sangeet",
  "Krishna Mantra". Bhajan videos (bhajan Shorts, the jukebox) get one of them added automatically (e.g. `Chhath Puja
  Geet 2026 | Bhakti Geet | छठ पूजा गीत #Shorts`; Shyam songs alternate "Shyam Bhajan 2026" / "Shyam Baba Song") and go
  into the "Bhakti Geet | Shyam Bhajan | भक्ति गीत" playlist. Use one in other titles or descriptions only when it is
  true and reads naturally; never stack them. **Never** write other channels', organisations' or people's names in a
  title, tag, description or caption, even when they bring viewers (YouTube spam and deceptive-practices policy):
  Ganesh Youth Association, Shyam Sangeet Studio, Ganpati Official, Sawariya Sarkar Official, Shri Balaji Film City,
  Ganesh Subramaniam, Mee Phanasgaonkar, or any "<name> Official / Studio / Records / Films". validate.mjs fails them.
- **Retention.** The voice starts at once (0.12 s, no dead air); long subtitles are split so the on-screen text changes
  every 2-3 s (automatic); the **end card's last words are a jaikara naming the same deity/temple as the hook**
  ("…Subscribe karein. Jai Salasar Balaji!"), so the loop flows back into scene 1.
- **Long video thumbnail.** `thumbnail.hi`: 3-5 huge Hindi words with the name (`सालासर बालाजी का इतिहास`, `खाटू
  श्याम की सम्पूर्ण कथा`); the renderer makes two variants (deity close-up + saffron/gold, clean border), uploads the
  better-scoring one and keeps both in `out/` for YouTube Studio's "Test & compare".

**Real temple photos.** When a Short is about one temple, set `"temple"` to its slug from `footage/temples.json`
(e.g. `karni-mata`, `somnath`, `moti-dungri-ganesh`; aliases work) and mark the scenes that show the temple's exterior or
interior with `"real": true`. If licence-safe photos exist in `footage/<temple>/` (Wikimedia Commons, CC0 / PD / CC BY,
fetched automatically by scripts/real-photos.mjs), those scenes show the real photo with a slow camera move and the
renderer adds the credit lines to the description; otherwise the AI image is used. Never mark a legend, dream or
katha scene as real, and never call an AI image real. A `real` scene with a photo is not animated, so mark `animate` on
other scenes (darshan, katha). For a temple not in temples.json, still set `temple`; the photo search is strict and
usually finds nothing, which is fine.

**Festival status Shorts and day status Shorts (no action needed).** The status engine (`scripts/status-engine.mjs`,
calendar `automation/festivals.json` to 31 Mar 2027, two panchang sources per date) makes every festival's 15-30 s
loopable Shorts titled English first, "Happy <Festival> Status 2026 ✨ | <Hindi> स्टेटस वीडियो #Shorts" ("<Festival> Status
2026 🙏 | ..." on a vrat or solemn tithi; competitor decode 20 Nov 2026) (20:00 the evening before, 00:30 on the day, 07:30
on big festivals, countdowns 8-14 days before a season, small tithis only 00:30) and the weekday day status Shorts of the `morning` slot. Since 20 Nov 2026 (research of that day): frame
0 is the deity's face with the festival name big, the last 3 s are a forwardable greeting ("आपको और आपके परिवार को /
<festival> की शुभकामनाएं 🙏" + "इसे अपने परिवार को भेजें 🙏") that fades back into frame 0, the Instagram caption carries the
same greeting with at most 5 hashtags, and Facebook gets the greeting without any ask. The Khatu Shyam Phalgun mela 2027
is a series (1, 12, 14, 16-19 Mar 2027); on those days the evening darshan should be Khatu Shyam ji / Ringas-Khatu. They are in log.md as `eve`, `status`, `statusday` and
`morning` lines. Never make a status Short yourself and never repeat their festival/weekday title words: your Short is
a temple darshan.

**Slot.** The prompt tells you the slot (the table at the top says which slots run on which days):
- `morning` (you write it only on festival days that are not Ekadashi or big festivals; published when ready, about
  10:30 IST): a **famous-temple darshan Short** of 21-35 s tied to the festival's deity: 4-6 scenes, at most 380
  characters of narration, the hook rules below (temple name first). No katha Shorts (owner, 11 Nov 2026).
- `evening` (published about 19:00 IST): a **famous-temple darshan Short** of 25-35 s (Khatu Shyam ji at least twice a
  week): 4-5 scenes (the temple/darshan close-up, one well-sourced fact or the bhav, the mantra or jaikara, end card),
  calm and beautiful rather than a story. It must differ from this morning's video and the day's status Shorts: check
  today's lines in `automation/log.md`. **The hook gives the temple name AND a reason to keep watching** (feed audit
  17 Nov 2026: "Neele ghode ka asvar kaun?" 76% viewed, 94% of views from the Shorts feed; "Vaishno Devi Mata ka darbar"
  51%, no feed views): a question ("... kyun?", "... kaun?", "... mein kya hai khaas?") or one striking true fact
  ("Somnath: pehla Jyotirlinga"). scripts/validate.mjs rejects a plain "<Temple> darshan" hook.
- **Evening hook A/B** (owner, 15 Nov 2026; reference "Everyone Is Against Me… But God Is With Me 🔱" 3.57 lakh views, 20
  s, one dark diya-lit sanctum with a slow push-in): when the plan says "EMOTIONAL-HOOK arm" (odd days of the month), set
  `"hook_style": "emotional"` and lead the title, `hook` and `cover` with a relatable emotional line that still names the
  deity, e.g. `Sab saath chhod dein, par Mahadev nahi | सब साथ छोड़ दें… पर महादेव नहीं छोड़ते 🔱 #Shorts`, "जब कोई साथ न
  दे, तब बाबा श्याम साथ देते हैं 🙏" (Haare ka Sahara fits Khatu). 20-25 s, 3-4 scenes, a dark diya-lit sanctum (AI
  sanctum images labelled; real photos only licence-safe; Khatu = the sheesh). The temple still appears in scene 1 and the
  description. Even days keep the name-first formula. growth.md compares the two arms.
- `noon` (Wednesdays of normal days only since 10 Nov 2026, public at 15:00 IST): the **"Dadi aur Chhotu"**
  cartoon dialogue Short, 90-120 s. It has its own format and rules: **section 6**. Sections 3-4 do not apply to it.

## 2. Research the story

- Retell a **traditional story as it is commonly told** (Puranas, Mahabharata, Ramayana, well-known
  Lok Kathas about Khatu Shyam ji). Check the outline against at least two sources with WebSearch and
  WebFetch. Where versions differ, tell the most widely known version and do not add details from
  your imagination.
- Respectful tone always. No mockery, no fear-mongering ("share this or bad luck"), no promises of
  money, cures or miracles ("ye mantra bolo, paisa aayega"), no caste or political content, no
  comparisons that put down any deity or community.
- **Khatu Shyam ji iconography (owner, 6 Nov 2026; every format: Shorts, long, status, dialogue, movie).** After the
  sheesh daan, Khatu Shyam ji is worshipped as the **SHEESH (head) only**. Every image of Khatu Shyam ji (darshan, murti,
  shringar) uses this description (20 Nov 2026: rewritten from the owner's REAL darshan stills; the exact text is
  `SHEESH_LOOK` in scripts/shyam-darshan.mjs) and nothing that contradicts it: `the divine Sheesh (head only, no body, no
  neck, no arms, no hands, no flute) of Shri Khatu Shyam ji as a temple murti: a dark, almost black sheesh face with
  large wide-open eyes, a curled black moustache and a red tilak on the forehead, golden ear ornaments on both sides of
  the face, a tall golden jewelled mukut with a crest and peacock-feather motifs and a round golden halo set with red
  and green stones behind it; the face is framed by heavy garlands of red roses, orange marigold and white flowers
  flowing down in wide layered arcs, a pink silk patka and a gold necklace below the face; behind it a carved silver and
  gold darbar backdrop with an arched canopy, small brass diyas and an akhand jyot glowing in front; front-facing,
  symmetrical, not Shri Krishna, no blue skin, no modern objects`. Never a full body, hands or a
  flute (those belong to Shri Krishna). Barbarik as the young warrior *before* the sheesh daan, and the temple building,
  are not affected. The validator checks every prompt that shows Khatu Shyam ji; the movie cast entry `khatu-shyam`
  carries the older description (its canonical portrait is already made).
- **Shyam Baba's real darshan (owner, 20 Nov 2026).** A darshan scene of Khatu Shyam ji (the sheesh in a darbar) shows
  the owner's REAL darshan still on its own (footage/shyam-baba-pandal-darshan, scripts/shyam-darshan.mjs) instead of the
  AI picture, labelled "Asli darshan: Shyam Baba pandal, Shyam Premi SN" with a credit line in the description. They were
  recorded at a Shyam Baba **pandal**, not the Khatu mandir: never narrate or caption those pictures as the Khatu mandir
  / Khatu Dham. Katha scenes (Barbarik, the sheesh daan, temple buildings, crowds) stay AI pictures.
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
  "hook": "<Hinglish, max 38 characters, names the deity/temple/festival, shown big from 0.4 to 2.6 s, e.g. Barbarik ne Shri Krishna ko sheesh kyun diya?>",
  "cover": "<2-4 Devanagari words with the name, max 24 characters, drawn huge on the first 0.4 s, e.g. खाटू श्याम दर्शन>",
  "scenes": [ ... morning 4-6 scenes, evening 4-5 scenes; scene 1 = the deity/temple close-up ... ],
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
- `tts`: the narration line in **Hindi Devanagari**, in the "Spoken style" above (one or two short sentences), at most
  110 characters. Optional `mood` (see "Spoken style").
  Total narration (all scenes) at most 380 characters in the morning and 330 in the evening.
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

Structure: scene 1 is the hook: the deity/temple **close-up** with the hook line naming it (a blessing, a "kya aap
jaante hain…" question or the most striking true fact; see "Hook, title and cover formulas"; never "Aaj suniye…" or a
greeting), then the story from its most dramatic moment, then the moral or blessing,
then the **last scene** must be `{"endcard": true, "tts": "<mantra or jaikara in Devanagari>
<a warm one-line request to like, share and subscribe>", "sub": "<same in Roman>"}`, with no prompt.
The request is gentle and positive, never a threat or a promise. Vary its wording day to day, e.g.
tts `जय श्री श्याम! कथा अच्छी लगी हो तो लाइक करें, अपनों से शेयर करें और श्याम प्रेमी एसएन को सब्सक्राइब करें।`,
sub `Jai Shree Shyam! Katha achhi lagi ho to Like, Share aur Subscribe karein · Shyam Premi SN`.
The endcard tts may be up to 140 characters: keep the request short, and **end it with a jaikara naming the hook's
deity/temple** (`… सब्सक्राइब करें। जय सालासर बालाजी!`) so the replay loops into scene 1.
Also end `youtube_description` and `instagram_caption` with one short line asking viewers to like, share and
follow/subscribe (Hinglish). **Not** `facebook_caption`: it follows the Facebook template below, with no asks at all.

`playlist`: exactly one of `Khatu Shyam ji ki Kathayein`, `Shiv ji ki Kathayein`, `Hanuman ji ki Kathayein`,
`Ganesh ji ki Kathayein`, `Vishnu ji aur Krishna ki Kathayein`, `Maa Durga aur Devi ki Kathayein`,
`Shani Dev ki Kathayein`, `Surya Dev ki Kathayein`, `Tyohar aur Vrat Kathayein`, matching the story's deity
(festival stories go in `Tyohar aur Vrat Kathayein`).

Captions (except `facebook_caption`, see "Facebook caption" below): Hinglish in Roman script, respectful, no engagement bait like "share karo warna". Many
bhakts search YouTube in Hindi, so the YouTube fields also carry the main keyword in Devanagari
(`title` stays Roman: it is drawn on the video with a Latin-only font):

- `youtube_title`: max 90 characters: the Roman keyword first (8-48 characters, the name in its first 3 words, one
  value word), then ` | ` and the same keyword in Devanagari, ending with ` #Shorts`. Example:
  `Hanuman ji aur Sanjeevani ki Katha | हनुमान जी की कथा #Shorts`.
- `youtube_description`: 2–4 lines: what the story is (Hinglish), one line in Devanagari Hindi with
  the deity and story name, the mantra, then `Jai Shree Shyam 🙏`, then 3–5 hashtags.
- `youtube_tags`: 10–15 comma-separated search phrases, about half Roman and half Devanagari
  (`Hanuman ji ki katha, हनुमान जी की कथा, संजीवनी बूटी, Khatu Shyam, खाटू श्याम …`).
- `instagram_caption`: hook line, 1–2 short lines of the story's message (the mantra if it fits), then 3–5 relevant
  hashtags (research 20 Nov 2026: short, relevant captions; Meta reads hashtag stuffing as spam, and scripts/meta.mjs
  keeps only the first 5) that match the subject (Khatu Shyam ji: `#KhatuShyam #JaiShreeShyam #KhatuDham …`; anything else its own
  tags, e.g. `#Somnath #HarHarMahadev #Jyotirlinga …` or `#ChhathPuja #ChhathiMaiya …`, never the Khatu Shyam tags on
  another subject: the script drops them there). Max 2,200 characters.
- `facebook_caption`: the Facebook template below.

### Facebook caption (all formats; owner, 11 Nov 2026: Facebook monetization challenge)

Every Short is also a Facebook Reel (owner, 13 Nov 2026; at least 90 min apart), plus 1 photo a day and the daily long
katha as a 12:30 feed video (scripts/fb.mjs; its text is your `youtube_description` with like/share/subscribe lines
removed and the subject's 3 hashtags, so keep the description free of other bait). Meta demotes engagement bait, so every
`facebook_caption` is written the same way (`node scripts/validate.mjs` checks it):

1. **Line 1:** a Hindi bhaav line in Devanagari plus ONE genuine question to the viewer about their own experience or
   devotion, ending with `?`. Example: `हर हर महादेव 🙏 क्या आपने कभी सोमनाथ ज्योतिर्लिंग के दर्शन किए हैं?`,
   `हारे का सहारा, बाबा श्याम हमारा 🙏 बाबा श्याम का कौन सा भजन आपको सबसे प्रिय है?`
2. **1-2 lines of context**: what the video shows, in Devanagari (a little Hinglish is fine), e.g.
   `प्रभास पाटन में समुद्र किनारे बारह ज्योतिर्लिंगों में पहला (मान्यता)।` / `Somnath Jyotirlinga, Gujarat ke darshan.`
3. Nothing else: no URL (the script adds the Janmotsav / festival link and the photo credits when they apply), no AI
   line (added automatically).
4. **Last line: exactly 3 hashtags that match the subject** (owner, 13 Nov 2026; `node scripts/fb.mjs tags <spec>`
   prints them): Khatu Shyam ji content `#KhatuShyam #JaiShreeShyam` + ONE topical tag (`#KhatuShyamMandir`,
   `#KhatuShyamJanmotsav`, `#Gyaras`); a festival not about Khatu Shyam ji its tag + 2 relevant generic ones
   (`#ChhathPuja #ChhathGeet #Bhakti`, `#BhaiDooj #YamDwitiya #Bhakti`); a deity or temple its tags
   (`#Mahadev #HarHarMahadev #Somnath`, `#MataRani #JaiMataDi #VaishnoDevi`). Never `#KhatuShyam` / `#JaiShreeShyam` on
   a post that is not about Khatu Shyam ji. No hashtags anywhere else.

Mostly Devanagari, a little Hinglish. **No engagement bait of any kind**: no like/share/comment/tag/follow/subscribe/
forward asks, no "Jai Shree Shyam likhein", no "apno ko bhejein", no "warna", no luck/money/miracle promises. A plain
question (line 1) is the only call to the viewer. If the caption fails, the script composes one from the spec.

## 4. Check and record

Run `node scripts/validate.mjs story/today/scenes.json` and fix everything it reports. Then append
to `automation/log.md`: `<date> | <slot> | <slug> | <deity/festival> | <story in a few words>`.
Use the slug format `<yyyy-mm-dd>-<slot>-<short-english-slug>`, e.g. `2026-10-26-morning-shiv-markandeya`.

Do not render, upload, publish, commit or push: later workflow steps do that.

## 5. Long video (slot `long` only)

**STOPPED as a daily katha (owner, 16 Nov 2026):** the long katha (5-7 min) got 18-22% retention and 38-57 views. The
long slot is now only the weekly mantra jaap and a festival bhajan jukebox (their own jobs), so you write a long katha
only when the prompt explicitly gives you the `long` slot (a date-scoped override such as `automation/chhath-2026.json`,
or a manual `slot=long` dispatch). The rules below apply then.

Only when the prompt says the slot is `long`. **Every day** (owner, 13 Nov 2026: long videos are the channel's only
source of watch hours), after the morning Short, you write one **long katha video**: 16:9, **5-10 minutes**, a regular
YouTube video (not a Short), published at 12:30 IST (a bhajan / mantra long video made by the jukebox / mantra jobs
goes out at 05:30 instead; see "Publish times"). It is outside the Shorts-a-day cap. Movie days keep their movie
part and still get the long video (a different story from the part). Sections 3-4 do not apply to it; everything else
below does.

**Subject.** The prompt gives today's plan from `scripts/day-plan.mjs`; follow it.
- **Festival day** (a date in `automation/festivals.json` / `calendar.md`): tell that festival's katha or vidhi (why it
  is celebrated, the vrat katha, how the puja is done), unless a long video told that festival in the last 30 days
  (the plan says so; then use the order below). Pick a clearly different angle from today's status/temple Shorts.
- **Otherwise** this order: a `long part` item from today's trend research (section 1, item 2; same title rule: Roman
  search phrase ` | ` Devanagari) when it fits, at least twice a week a Khatu Shyam ji / Barbarik katha, and on the
  other days the next part of the **Mandir Itihas series** (below; the default). Do not take a festival of the next
  few days: it gets its own long video on its day. The weekday deity is the last resort.
Tell the **full** katha, beginning to end, not one scene of it. **Mandir Itihas series:** write the next part of the
temple series in `automation/mandir-series.md`.
That file sets the part order, slug pattern, sources, the AI-image disclaimer and the legal rule for sati temples. It may
share today's deity with the morning Short. Do not repeat a story that has a `| long |` line in
`automation/log.md` within the last 120 days. "One subject per day" (section 1) applies: not the same story or title
words as today's Shorts or the uploads of the 2 days before.

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
- 30-60 scenes. Each scene is one moment: `tts` at most 170 characters (Devanagari, numbers as words, "Spoken style":
  2-3 short sentences, a katha told to the family, not read from a book; optional `mood`),
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

**Thumbnail.** `thumbnail`: `{"image": <index>, "focus": "center", "text": "<Roman, max 30 characters>", "hi": "<3-5
Devanagari words, max 30 characters>"}`: the most striking **deity/temple close-up** image (make one image prompt a
close-up portrait for this), `hi` = the huge Hindi words with the name (`सालासर बालाजी का इतिहास`) and `text` a short
Roman line that is true to the story (no clickbait lies). The hook (`hook`) names the deity, temple or festival, and
chapter 1's first line says the name within its first words.

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
  "thumbnail": { "image": 0, "focus": "center", "text": "...", "hi": "<3-5 Hindi words>" },
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

## 6. "Dadi aur Chhotu" dialogue Short (slot `noon` only: Wednesdays of normal days, public 15:00 IST)

Two cartoon characters talk: **Dadi Maa** (about 70, calm, tells the story) and her grandson **Chhotu** (8, curious).
**Chhotu's questions drive the story**: he asks, Dadi answers, he reacts and asks the next thing. The characters' faces, voices,
music and layout are fixed (characters/library/shyam); you write the dialogue, the story images and the episode's
`look`. The owner approved this format on 4 Nov 2026 ("YES sahi h").

**A new look every episode (owner, 9 Nov 2026).** The same canonical two-shot (charpai, courtyard, cream saree, mustard
kurta) on every episode read as repetitive and those Shorts got 0 views. So each episode sets `look`: a **different
place** that fits the story (a ghat at sunrise, a temple courtyard at an aarti, a rooftop under the stars, a village
fair... never the charpai courtyard again), **different outfits** for both (colours and fabric) and the light. The
renderer draws the episode's own two-shot and close-ups from it (`characters/dialogue.py` look_prompts; the faces stay
the same). `scripts/validate.mjs` rejects a setting or outfits too close to any of the last 8 noon Shorts
(`story/published/*-noon-*.json`). English, no text or signs.

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
It must differ from today's `morning`, `evening` and `long` lines and the 2 days before (section 1, "One subject per day"). Numbered series: in a pan-India series, set
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
- 14-24 lines, about **90-120 seconds** spoken. Dadi speaks slowly (~11 Devanagari characters a second), Chhotu
  faster (~14), with quick, natural turn-taking (50-150 ms between speakers); the validator estimates the length
  (about 1,100-1,450 characters of tts in total). Both talk in the "Spoken style": Dadi warm and simple ("सुनो
  बेटा…", "है ना?"), Chhotu curious and excited ("सच में?", "फिर क्या हुआ, दादी?"). Optional `mood` per line.
- Line 1: **Chhotu asks a curious question** that hooks in 2 seconds and **starts with the temple/deity/festival
  name** (the most surprising fact as a question, e.g. "Salasar Balaji ki daadhi-moochh kyun hai, Dadi?"). Never
  open with "Dadi, …" or a greeting (those Shorts got 0-4 views); its `top` is the temple/murti picture.
- `cover`: 2-4 Devanagari words with the name (e.g. `सालासर बालाजी धाम`), drawn huge over the first 0.4 s.
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
  "hook": "<Roman, max 38 characters, names the temple/festival, shown big from 0.4 to 2.6 s>",
  "cover": "<2-4 Devanagari words with the name, max 24 characters>",
  "style": "stylized 3D animated feature film look, soft warm cinematic lighting, rich warm colours, no text, no letters, no writing",
  "look": { "setting": "<English, 25-220 characters: where they sit today, e.g. on the steps of a white marble ghat by a calm river at sunrise, brass lamps and marigolds>",
            "dadi": "<English, 12-160: Dadi's outfit today, e.g. a soft green cotton saree with a gold border and a cream shawl>",
            "chhotu": "<English, 12-160: Chhotu's outfit today, e.g. an orange kurta with a small blue vest>",
            "light": "<optional, max 120: e.g. golden sunrise light>" },
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
Devanagari, captions in Roman; `facebook_caption` in the "Facebook caption" template). The description also carries `Chitra AI dwara banaye gaye hain (sanketik). Awaaz aur
animation AI se.` and ends with a like/share/subscribe line; real-footage credits are added automatically.

Run `node scripts/validate.mjs story/today/scenes.json` until it passes, then append the log line as in section 4
(`<date> | noon | <slug> | <deity> | <summary>`). Do not render, upload, commit or push.

## 7. Mini-movie series (morning slot on movie days; job `movie`)

A temple's or a deity's katha told as a **2-4 part mini film**: each part is a vertical Short of ~100-175 s with
characters, dialogue, animated scenes and a cliffhanger, so viewers binge and subscribe. A part is made a day or more
ahead by the `movie` job (after the evening run) and goes out at **07:00 IST on its release day as that day's morning
Short** (YouTube publishAt, Facebook scheduled Page video, Instagram queued Reel). Owner, 6 Nov 2026: first series
"Khatu Shyam ji ki Amar Katha" on 17-20 Nov; then movies for all temples, one part a day, replacing the morning katha
(only once the owner approved the pilot and the repo variable `MOVIE_DAILY=on` is set). On a movie day the part is one
of the day's 3 uploads: the movie part comes first, then status Shorts, then the evening darshan (day-plan priority);
no long video, no noon Short and no Kalyug episode on a movie day.

**Kaggle timing (15 Nov 2026).** Every reliable trigger of the movie job (scheduler 10:43 / 18:46 IST) falls inside a
Kaggle blocked window (09:00-11:30, 18:30-21:00 IST), so the job then asks `movie_retry` to dispatch `slot=movie` again
right after the window (about 11:32 / 21:02 IST) with a 120-min Kaggle queue; a session that sat in Kaggle's queue too
long (QUEUED_TOO_LONG) gets one retry with a 120-min queue. Manual: `gh workflow run daily.yml -f slot=movie -f queue_minutes=120`.

**Queue.** `automation/movie-series.md`: series in order (mandir-series.md order; a festival in the next 7 days or a
`trends` topic may jump the queue), each with its parts, sources and status. Finish a series before starting the next.

**Files.** `story/movies/<series>/series.json` (title, playlist, source, `approved`, cast, parts with `release` and
`produce_from`, and `facts`: every fact the series states, each with 2 independent sources) and one
`story/movies/<series>/part-<n>.json` per part. Slug `<release>-movie-<series>-part-<n>`. Copy the shape of
`story/movies/khatu-shyam-amar-katha/part-1.json`:
- `format: "movie"`, `series`, `series_title`, `part`, `parts`, `release`, `publish_at: "07:00"`, `title` (the part,
  Roman, max 40), `hook` (Roman, max 38, names the deity/temple), `playlist` (the series name), `deity`, `summary`
  (max 160, no "|"), `source` (the tradition, also in the description), `music` (`epic` or `devotional`), `style`
  (with "no text"), `cast` (ids from `characters/cast/cast.json`, plus `narrator`), `names` (Devanagari names the
  pronunciation check listens for).
- `scenes` (5-9): `prompt` (one vertical moment; name the characters, their look is added from cast.json; traditional
  iconography; no text; **no gore or violence**: a war is distant banners, a sacrifice is light and petals), `cast` (who
  is in the picture), `motion` (`in`/`out`/`pan`), `animate` (GENTLE micro-motion for 2-6 key scenes; the GPU tier
  decides how many become Wan clips), optional `hero: true` (one scene, the 14B model), `deity: true` for a deity or
  murti in the picture, and `lines` (1-6): `{who, tts (Devanagari, max 110, numbers as words, "Spoken style"), sub (Roman, max 120), mood?,
  shot?}`. A narrator line shows the scene; a character's line cuts to their close-up (lip-synced for humans; deities
  get gentle motion only, never lip-sync; Khatu Shyam ji speaks only as the sheesh, cast `khatu-shyam`).
- `teaser` `{prompt, tts, sub}`: "Agle bhaag mein: ..." over the next part's key image (the last part: "Agli movie series
  mein: ..."); `endcard` `{tts, sub}`: jaikara + when the next part comes ("Part 2 kal subah 7 baje") + a gentle
  like/share/subscribe ask; `next_label` (drawn on the end card).
- YouTube fields as section 3 (`youtube_title` `<Name> ... Part n | देवनागरी ... #Shorts`), the description with the source
  line, "Chitra AI dwara banaye gaye hain (sanketik). Awaaz aur animation AI se." and a subscribe line.

**Writing a part.** Open on the most dramatic moment with the deity/temple name in the first words (no greeting); from
Part 2 on, one recap line ("Pichhle bhaag mein, ..."). Narrator lines carry the facts; dialogue dramatises only what the
sources say (emotion, the known exchange): **never a new event, miracle, date, number or promise**. Legends are labelled
("manyata hai", "lok katha ke anusar"); where traditions differ, say so in one neutral line. End on a real cliffhanger
that the next part pays off. The validator estimates the length from each character's voice (100-175 s).

**Characters.** Only characters in `characters/cast/cast.json` (canonical portrait, base clip, fixed edge-tts voice):
Krishna, Hanuman, Shiv, Parvati, Ganesh, Lakshmi, Ram, Sita, the Khatu Shyam cast, and more as series need them. A new
human character (a temple's saint, a king, a devotee) may be added to cast.json with `description`, `wide`, `bg`, a
distinct `voice` (Madhur/Swara with its own pitch/rate) and `color`; its portrait is drawn on Kaggle and must be picked
by a person (`story/movie.py cast`) before the first part that needs it. New deities are added only by a person.

**Sati temples** (Rani Sati Dadi, Dhandhan Sati Dadi): the sati rules in mandir-series.md in full: neutral history,
the event in at most 1-2 plain sentences, the spoken and written disclaimer, no fire, pyre or smoke in any image, no
praise, never a mela/yatra/procession. **Real photos**: set `temple` for licence-safe establishing shots where
footage/<temple>/ has them; never call an AI image real.

Validate with `node scripts/validate.mjs story/movies/<series>/part-<n>.json`. Do not render, upload, commit or push.

## 8. "Kalyug ke Bhagwan" (14:30 on Tue/Thu/Sat of normal days; job `kalyug`)

Owner, 9 Nov 2026: **cute, fully animated 3D cartoon deities (Pixar-like family-movie look) in everyday roles**, with
lip-sync. A child or parent has a relatable modern problem; the deity, gentle, wise or playful, gives a short lesson
rooted in a well-known katha, shloka or value. 30-60 s vertical Shorts. With the repo variable `KALYUG=on`, the
episode goes out at **14:30** (08:00 until 24 Nov 2026; 08:00 is the Kailash / POV time now) on **Tuesday, Thursday and
Saturday** of normal days (`scripts/day-plan.mjs`; the cap of 8 from 25 Nov 2026 has room, owner 11 Nov 2026: status and
temple Shorts come first): beside the morning day status Short, the Kailash / POV episode, the Ramayan Short and the
evening temple darshan, not instead of them. A day with a festival status Short (or the evening before one), a festival day and a
movie day (17-20 Nov) has no episode. The `kalyug` job makes TOMORROW's episode the evening before (after the evening
run, outside the Kaggle windows) only when tomorrow's plan has it, and schedules it (YouTube publishAt 08:00, Facebook
scheduled, Instagram queued). The time comes from `scripts/kalyug-due.mjs` (the plan's kalyug time; a spec written
for 08:00 is moved to 14:30).

**Characters** (`characters/kalyug/cast.json`; one canonical portrait `<id>.png` + one base clip `clips/<id>.mp4` each,
picked by a person, never regenerated; voices fixed): `bal-ganesh` (big ears, short curled trunk, one broken tusk,
modak), `bal-krishna` (sky-blue skin, peacock feather, flute, butter), `mahadev` (kind, ash-blue skin with a deeper blue
throat, crescent moon, Ganga in the jata, trishul, cobra), `parvati`, `bal-hanuman` (cute child vanara, no beard),
`chintu` (10-year-old boy), `mummy` (his mother). Only characters with a portrait (the validator checks) may be cast.
Everyone's close-ups are MuseTalk lip-synced except Bal Ganesh: his mouth sits under the trunk (MuseTalk smears the
trunk), so he talks with a "talk clip" (trunk and mouth corners moving); the story should still give him the lesson.
A new character is added to cast.json and drawn on Kaggle (`story/kalyug.py cast`), then a person picks it.

**Topics** (rotate; never the same topic or deity two episodes running; check `automation/log.md` lines `| kalyug |`
and the de-dup rule of section 1): exam stress, phone/screen addiction, respecting parents and elders, anger, jealousy,
friendship, gratitude, not giving up, honesty, sharing, fear of the dark, bullying (kindly), patience, cleanliness,
caring for animals and nature, the festival of the week (as a family moment). Match deity and lesson to a story the
deity is known for, e.g. Bal Ganesh + Vyas ji's Mahabharata (understand, then write) or his mother Parvati (devotion
to parents); Bal Krishna + makhan chori / Govardhan (sharing, courage), Sudama (friendship); Mahadev + Neelkanth
(holding poison for others: patience with anger); Parvati + her tapasya (not giving up); Bal Hanuman + leaping for the
sun (confidence, with humility) or seva of Shri Ram.

**Accuracy (hard rules).** Never invent scripture, a shloka, a chaupai, a quote or an event. If you quote, quote a
well-known verse exactly (e.g. Bhagavad Gita 2.47 "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन") and add `shloka`
`{text, ref, sources: [2 URLs]}`; otherwise say the lesson in simple words. A legend is labelled ("kehte hain",
"katha hai"). `facts`: every katha detail the episode states, each `{claim, sources: [2 independent URLs]}`.

**Respect rules (hard).** Devotional, warm or lightly humorous at most. Never mocking, never vulgar, no intoxication,
no violence, no politics, no other religions, no comparisons that put down anyone, and **no deity doing anything
demeaning** (no deity scolded, slapped, tricked, made the butt of a joke, doing chores as punishment, in modern
uniforms of a lowly job as a gag). Everyday "roles" means the deity appears in the child's everyday world as a friend,
teacher or guide. Iconography stays correct (colours, crown, attributes). Cute, never silly.

**File.** `story/kalyug/<release>-<topic>.json`, slug `<release>-kalyug-<topic>` (Roman a-z0-9-). Copy the shape of
`story/kalyug/pilot-ep1.json`:
- `format: "kalyug"`, `series: "kalyug-ke-bhagwan"`, `series_title`, `release`, `publish_at: "14:30"`, `lead` (the
  deity id), `deity`, `topic`, `title` (Roman, max 40, **deity name first**: "Bal Ganesh aur exam ka darr"),
  `title_dev` (Devanagari), `summary` (max 160, no "|"), `lesson`, `source`, `facts`, optional `shloka`, `music`
  (`playful` or `calm`), `cast`, `names` (Devanagari names for the pronunciation check).
- `scenes` (3-5): `prompt` (one vertical moment in the child's world, name the characters: their look comes from
  cast.json; a deity in the prompt must be in the scene's `cast`; no text), `cast`, `motion` (`in`/`out`/`pan`/`still`),
  `animate` (1-3 scenes, ONE sentence of gentle motion; 2 become Wan clips), `lines` (1-5): `{who, tts (Devanagari,
  max 100, numbers as words, "Spoken style": kids talk like kids, the deity warm and simple), mood?, sub (Roman, max 110)}`. A scene's first line shows the scene; every other line cuts to the
  speaker's lip-synced close-up.
- **Hook in the first 2 s:** line 1 is the child's problem or question in max 60 characters ("कल एग्ज़ाम है, और मुझे
  कुछ भी याद नहीं हो रहा!"), no greeting; the title with the deity's name is on screen over it (0-2.8 s).
- The deity speaks at least 3 lines; 7-16 lines in total; ~30-60 s (the validator estimates from the voices).
- `endcard` `{tts, sub}`: spoken by the lead deity: the lesson in one line + "...ke liye Subscribe karo".
- `youtube_title`: deity name first, `"<Deity> ne sikhaya ... | देवनागरी #Shorts"` or `"<Deity> ka jawab ..."` (max 90);
  `youtube_description` with "Kalyug ke Bhagwan", the katha source line, a Devanagari line, "Chitra, awaaz aur
  animation AI se banaye gaye hain (sanketik).", a subscribe line and `#KalyugKeBhagwan`; `youtube_tags` (8-15, some
  Devanagari); `instagram_caption` (Roman), `facebook_caption` (the "Facebook caption" template of section 3).

Validate with `node scripts/validate.mjs story/kalyug/<file>.json`. Do not render, upload, commit or push.

## Facts Shorts (format `facts`; job `facts`; owner, 15 Nov 2026)

**Why.** The owner's references are "pauranik facts / rahasya" Shorts: "जटायु से भी 10 गुना शक्तिशाली था उसका बड़ा भाई संपाती!
😱 #facts" (3.4M views), "हारे का सहारा बाबा श्याम की असली कहानी! 😱 #facts" (2.6M, our own deity), "यमराज ने हनुमान जी को लात
क्यों मारी?" (4.35M), "Warriors who defeated Ravan" (1 lakh). Each tells ONE lesser-known episode, character or temple
custom behind a dramatic curiosity hook. Our plain katha Shorts got 6-40 views: the hook and the storytelling are the
difference, not the length. **Write your own scripts and titles**; never copy another creator's words (topics may overlap,
they are scripture).

**Schedule** (`scripts/day-plan.mjs` slot `facts`, public **17:00 IST**, made the evening before by job `facts`): from
17 Nov 2026 wherever the Shorts cap has room (8 from 25 Nov 2026), LAST in the priority (after the festival status, day
status, darshan and Kailash / POV Shorts; owner, 16 Nov 2026); never on a movie or override day, and the facts slot is
the Ramayan Short's while that series runs. The first facts Shorts got 1-7 views each, so **at most 2 a week (Mon-Sun)
until the review on 25 Nov 2026**: `scripts/growth-compare.mjs --facts-review` (the growth job, first morning run from
25 Nov) writes `automation/facts-review.json` and a "Facts review" section in growth.md: a median under 20 views =
verdict "off", the planner stops facts; else "on", the weekly limit ends. Movie days keep the movie part. Repo variable
`FACTS=off` stops it too. Facebook: a Page video (over 90 s) or a Reel at its own time (`scripts/fb.mjs`).
**Wednesday, Thursday and Saturday** (from 26 Nov 2026) the facts slot is the "Ramayan Ke Rochak Tathya" series Short
instead (section 11; owner, 24 Nov 2026): when the job's prompt says "RAMAYAN SERIES", follow section 11, not the
variants below. Those Shorts do not count towards the facts limit above.

**Topic, variant, art** (`node scripts/facts.mjs pick --date D`; the job's prompt names them):
- Topic from `automation/facts-topics.json` (100+ topics, each with `cite` = the work + kand/sarga, parva, khand or the
  temple's/government site, `label`, `angle`, `numbers_ok`, `after`, `notes`). Khatu Shyam ji / Barbarik first while there
  are under 2 Khatu facts in 7 days (Janmotsav run-up), then the weekday deity. Never a sati topic.
- Variant (A/B, recorded in log.md and growth.md):
  - `story`: 2-2.5 min (110-165 s, 10-16 scenes): hook, build curiosity, resolve it, a one-line moral, the CTA.
  - `kyun`: the shock question "<A> ने <B> को <unexpected action> क्यों…?" (45-62 s, 6-9 scenes). The title and the first
    spoken line ARE the question; the answer scene (`"reveal": true`) lands at ~55-85 % of the video. The question needs
    a real scripture or folk basis (folk: "लोककथा/मान्यता के अनुसार"), never an invented event.
  - **"धर्म की जिज्ञासा"** (topics with `kind: "jigyasa"`, variant `kyun`, 35-47 s; owner's reference "भगवान को किसी ने
    नहीं देखा, फिर इतनी सुंदर मूर्तियाँ किसने बनाईं?" 7.75 lakh): an everyday devotee's question (मंदिर में घंटी क्यों?
    शिवलिंग पर जल क्यों? खाटू श्याम को हारे का सहारा क्यों?), answered from shastra or parampara with the citation and
    "परंपरा/मान्यता" where it applies, over warm diya-lit pictures of the subject. **Never pseudo-science or health claims**
    ("घंटी से बैक्टीरिया मरते हैं", "positive energy", "वैज्ञानिक कारण"): the validator rejects them. It includes the
    **"वर्जित क्यों / puja niyam"** questions (गणेश पूजा में तुलसी वर्जित क्यों? 1.46 crore reference; शिव पूजा में केतकी…):
    calm, sourced or "परंपरा" — never "galti ki to paap lagega".
  - **More topic kinds (owner, 15 Nov 2026; `kind` in the topic, rules in scripts/facts.mjs `kindProblems` + spec checks):**
    - `astra` ("दिव्य अस्त्र"): the hook may ask the modern question ("ब्रह्मास्त्र = परमाणु बम?"), the answer comes ONLY
      from the cited parva; when a nuclear / modern comparison appears, the narration says "यह आधुनिक व्याख्या है, प्रमाणित
      नहीं" and the description "modern interpretation, not proven".
    - `garuda` (Garuda Purana, Pretakhand / Saroddhara by adhyay): no fear words (डरावना, खौफनाक, दर्दनाक सज़ा), no gore;
      folk elaborations = "मान्यता"; the `moral` scene ends on good karma / naam-jap (सत्कर्म, नाम-जप, दान, सेवा).
    - `kaliyug` ("कलियुग कनेक्शन"; Khatu Shyam ji = "कलियुग के देवता" first): say exactly what the text says, label every
      folk claim (Pandav rebirth = Bhavishya Purana Pratisarga / Alha lokkatha), no doomsday, no predicted years.
    - `lokdevta` ("लोक देवता / संत चमत्कार": Gorakhnath, Gogaji, Ramdev ji, Tejaji, Pabuji, Karni Mata, Jeen Mata, Salasar,
      Khatu bhakts; hook "जब <sant> ने… 😱"): lokkatha / temple tradition, every miracle "लोककथा / मान्यता के अनुसार",
      never history, no cure claims; realistic ORIGINAL saint faces, never a TV actor. `months` = their mela season.
    - Every facts Short: never "proven" / "scientists confirmed", no cure promises (`PROVEN`, `CURE`).
    - `boost` [from, to] = the top pick in those dates; `avoid_near` keeps the same subject in another format (e.g. the
      Kailash "tulsi-ganesh-kyun-nahi" episode) more than N days away. The bank's `ideas` array (radar / reference ideas,
      `"status": "idea"`) is never picked: `node scripts/topic-banks.mjs promote --bank facts --id <id>` after the citation
      is filled and checked.
  - `list`: countdown (38-55 s): scene 1 the hook, then 3-5 item scenes `"item": 1..n` (a gold number badge is drawn),
    8-10 s each, every item with `"cite"` (its scripture reference) and folk items `"label": "tradition"` + "मान्यता…".
  - `gita` (Sundays, ~1 a week): one real Bhagavad Gita shloka (exact public-domain text) in a scene `"shloka": true`
    (its tts contains the shloka), `"tts_meaning"` = its simple Hindi meaning, then one life lesson (45-62 s). `shloka`
    `{text, ref: "Bhagavad Gita <ch>.<verse>", sources: [2 URLs]}`. The Sanskrit passes the mantra gate (CER <= 0.5,
    names right) or the job speaks `tts_meaning` instead and the shloka stays on screen; else no upload. Title
    `<hook> 😱 | Bhagavad Gita <ch.verse> #gita #krishna`. A Khatu-Krishna tie-in only where true (Shyam naam is Shri
    Krishna's vardan).
- Art (A/B, alternating): `cinematic` (style: "hyper-real cinematic epic devotional film still, golden divine light, deep
  blue dramatic sky, rich saturated colours…") or `illustrated` ("warm hand-drawn illustration, clean outlines, soft
  sunset light, expressive faces…"). Never a named studio's look (Pixar, Disney, Ghibli…), never a real actor's likeness
  or a TV/film frame. Ravan and asuras may look comically defeated; deities are always dignified.

**Accuracy (hard).** The hook may be dramatic but must be TRUE per the cited source. No invented numbers: a number in the
hook/title only when the topic's `numbers_ok` lists it ("10 guna" only if the text says so). Folk / temple belief is said
as such in the narration ("मान्यता है…", "लोककथा के अनुसार…", "कहते हैं…"). `facts`: at least 3 `{claim, source, sources:
[2+ URLs]}`, one URL per fact not Wikipedia or a blog (the scripture text site, wisdomlib, valmikiramayan.net, the temple
trust, a *.gov.in page or a news site). `source` = the citation exactly as it appears in the description ("Source: …").
Where traditions differ (e.g. the Skanda Purana has Krishna behead Barbarika, the Khatu lok katha has the sheesh daan),
say so plainly or label the version you tell.

**Script** (`scenes`, Hindi Devanagari, edge-tts Madhur through the human chain, "Spoken style": short sentences, max 18
words, numbers as words). Scene 1 = the hook in the first ~3 s: max 75 characters, a question or exclamation, the deity /
character name first (no "आज सुनिए" openers), over a dramatic **close-up** (characters in the lower half: the cover's text
bands sit on top). Then build the curiosity, resolve it, one scene `"moral": true` (one line), then the end card
`{endcard, tts: "<jaikara> … लाइक, शेयर और सब्सक्राइब करें …", sub}`. Each tts max 140 characters (animated scenes 95).
`sub` = the Roman Hinglish line (max 130; drawn big, `"sub_size": 60`).

**Pictures.** `prompt` = one cinematic vertical moment, traditional iconography, "no text". 1-4 scenes with `animate`
(gentle micro-motion; deity scenes `"deity": true`, face still). Khatu Shyam ji = the SHEESH only (section 2); Barbarik
before the sheesh daan as "the young warrior Barbarik". **Hanuman ji: "clean-shaven vanara face, no beard"** in every
prompt (FLUX draws a beard; only Salasar Balaji has daadhi-moonchh). No gore: a sacrifice is light and petals.

**Cover** (the first 0.4 s, also the Short's thumbnail): `cover` (2-4 Devanagari words) and `cover_lines` (required for
`kyun`, recommended for all): 3 short Devanagari lines drawn on black brush-stroke bands across the top third (line 1
white, line 2 giant gold = the key name or verb, line 3 white on a red band ending with "?") plus a red curved arrow
(story/cover.mjs `factsCover`, Yatra One through Chrome so matras and conjuncts render correctly).

**YouTube fields.** `youtube_title`: `<hook> 😱 #facts | <Deity> Katha | <देवनागरी keyword>` (max 100; the Roman part
before the first "|" max 48 with the name in its first 3 words; gita: see above). `youtube_description`: 2-4 Hinglish
lines, `Source: <source>`, a Devanagari line, `Chitra AI dwara banaye gaye hain (sanketik). Awaaz AI se.`, a like/share/
subscribe line, then `#facts #story` + 2-3 subject tags (`#gita #krishna` for gita). `youtube_tags` 10-15 (about half
Devanagari), `instagram_caption` (Roman), `facebook_caption` (the Facebook template of section 3), `playlist` = the
deity's playlist, `deity`, `summary` (max 160, no "|"), `kicker` (max 22), `title` (Roman, max 45, the title bar).

**File.** `story/facts/<release>-<topic id>.json`, slug `<release>-facts-<topic id>`, `format: "facts"`, `variant`, `art`,
`release`, `publish_at: "17:00"`, `topic`. Copy the shape of `story/facts/2026-11-17-khatu-baba-ke-naam.json`. Validate
with `node scripts/validate.mjs <file>` (the facts rules are in scripts/facts.mjs, tests scripts/facts.test.mjs). Do not
render, upload, commit or push.

**QA (automatic, never loosened).** After the render, Whisper large-v3 transcribes every scene's voice
(voice/facts_asr.py) and `node scripts/facts.mjs qa` checks every deity/character name position (the bhajan gate's
names plus Barbarik, Ghatotkach, Bheem…; positions after श्री are skipped) and the narration CER (<= 0.25). A failure
re-voices once with the plain chain; a second failure means no upload ("skipped: pronunciation gate" in published.md).

## Bhajan loop and veer Shorts (format `loop`; job `loop`; owner, 15 Nov 2026; no action from you)

`scripts/loop.mjs` builds them from the library, `story/render-loop.mjs` renders, the `loop` job publishes at **05:45
IST** (made the evening before; bhajan audio content goes public 05:30-06:30). **Not in the day plan since 16 Nov 2026**
(the day status Short is the morning upload every day); they run only on a manual daily.yml `slot=loop` dispatch
(`loop_date`, `loop_kind`; default kind by weekday: Mon veer Mahakal, Wed loop, Fri loop, Sat veer Hanuman).
- **loop**: a seamless 12-15 s chorus loop of OUR OWN QA-passed AI bhajan (licence qa: every name right, CER <= 0.40; never
  downloaded or trending audio; no Khatu bhajan until one passes the name gate), ONE new FLUX artwork (clay art /
  miniature painting / oil painting, rotating), a periodic zoom (the last frame equals the first), the chorus line as big
  Devanagari lyrics. Title `<Deity> 🙏 <chorus words> | <lyric words> #bhaktisong #भक्तिभाव #shorts`.
- **veer**: an ORIGINAL heroic deity portrait (Mahakal, Hanuman with a clean-shaven vanara face, Maa Kali, Shri Ram,
  Narasimha; never a real actor or a TV frame), square, letterboxed in black inside 9:16, a slow push-in and back with a
  golden halo, the jaikara big in red on top; 30-40 s of a QA-passed chorus of that deity or a licence-safe library bed.
  Title `<jaikara> 🙏 #<deity> #bhakti` (keywords in the tags).
- Variety (reused-content policy): never the same audio + picture twice, a bhajan at most once in 3 days, a different
  chorus window each time, a new artwork every upload. Description: the AI picture line and the bhajan / music line.

## Weekly facts compilation (long video; job `compile`; owner, 15 Nov 2026; no action from you)

Reference: "Ramayana Was Darker Than You Think: 5 Forgotten Stories" (a long documentary listicle, 5.95 lakh views in 9
days). **Only after a positive facts review** (owner, 16 Nov 2026: "only if facts start working"; `automation/facts-review.json`
verdict "on"), on **Saturdays** with no other long video (no mantra jaap or jukebox), when 4+ facts Shorts of the last 21 days (6+ minutes) are not compiled yet, `scripts/facts-compile.mjs` makes the 12:30
long video from them: a curiosity listicle title ("खाटू श्याम जी के N रहस्य जो बहुत कम लोग जानते हैं 😱", "रामायण की N
कहानियाँ जो आपको किसी ने नहीं सुनाईं", "महाभारत की N भूली हुई कहानियाँ"), a 15 s hook intro, each Short as a 9:16 panel over
its blurred picture with its number and title, an outro, chapters with each story's source, the big-text brush-band
thumbnail, the Shorts' links in the description, and afterwards a "Poori series" link in each Short's description (the
API cannot set a Short's related video or pin a comment). The Shorts are never re-uploaded as Shorts. If it does not run
or fails, the day has no long video (no katha instead). growth.md tracks it as the `long` format with "compilation".

## Voices and sound of the new formats (owner, 15 Nov 2026: "the sound isn't enjoyable"; no action from you)

**Voices.** Kailash Parivar, Shri Krishna kehte hain, the facts narrator and the veer jaikara are spoken by Google's
prebuilt **Gemini TTS** voices with a style prompt per character (`voice/gemini-voices.json`, `voice/gemini_tts.py`,
`voice/humanize.py`): Krishna = Schedar, Mahadev = Sadaltager, Parvati = Vindemiatrix, Bal Ganesh = Achernar, Narad =
Algieba, Kartikeya = Achird, Nandi and the sutradhar = Rasalgethi, facts = Enceladus (sped up 1.15x), jaikara = Alnilam;
Mushak and every other format keep edge-tts; **the mini-movie keeps its edge-tts voices**. Never a cloned or famous
voice. Chosen by an objective test (each voice says one sentence with 12 deity names, Whisper large-v3-turbo, the gate's
exact-name rule + CER; results in `voice/gemini-voices.json` `ab_2026_11_15`). Style prompts describe the VOICE, never a
deity persona (a persona prompt + the sheesh-daan line was blocked as SAFETY).
- **Free tier:** 10 requests per model per day (resets 13:30 IST). A character's lines go in ONE request per 6 lines and
  are cut at the pauses; model chain gemini-2.5-flash-preview-tts, then gemini-3.1-flash-tts-preview.
- **Pronunciation first (never loosened):** every Gemini line is Whisper-checked against the SAME names the format's gate
  checks (Kailash/POV: spec names + DEITY_NAMES, exact; facts: the facts gate's key-sound rule) and CER <= 0.25; a miss
  gets one retry with the names spelled out, then that WHOLE character goes back to its edge-tts voice for the episode
  (quota, 429, SAFETY and errors do the same). The renderers' own gates still run afterwards. Gemini says "बर्बरीक" in a
  way Whisper writes "बरबरीक", so Krishna lines with बर्बरीक in the POV names list fall back to edge-tts: in Krishna POV
  scripts prefer "बाबा श्याम" / "शीश के दानी" unless the name is needed.
- **Whisper spellings to avoid in scripts (every voice):** "नारद जी" (heard नारजी: say "नारद मुनि"), "श्रीकृष्ण" joined
  (heard श्री कृष्ण), "कान्हा" (कानहा), "भोलेनाथ" (भोले नाथ).
- **Terms (Gemini API Additional Terms, checked 15 Nov 2026):** Google claims no ownership of generated content; we are
  responsible for its use and Google may generate similar content for others. On the free (unpaid) tier Google may use
  prompts and outputs to improve its products and human reviewers may read them: never send private data (our scripts
  are public devotional text). Users must be 18+; the Prohibited Use Policy applies. No attribution or labelling rule
  for audio, but we keep ours: "Chitra, awaaz aur animation AI se banaye gaye hain (sanketik)." in every description.
  The platform flags (YouTube `containsSyntheticMedia`, Meta `is_ai_generated`) are decided per video by
  `scripts/ai-disclosure.mjs` (owner, 20 Nov 2026: exactly what each platform requires): AI-sung music or realistic AI
  visuals = both; stylized art with an AI narrator = Meta only (realistic-sounding AI audio); unsure = label.
- Kill switches: repo variable `GEMINI_TTS=off` (edge-tts only), `SOUND_BEDS=off` (the old beds).

**Music beds** (`voice/beds.py`, synthesized with numpy: no samples, no downloaded music), ducked under the voice by a
sidechain compressor (about 18 dB under the speech while someone talks, 11-13 dB under it in the pauses), the mix at
-14 LUFS (two-pass loudnorm): Krishna POV = tanpura + a bansuri-like flute playing slow Bhupali phrases + a soft pad;
Kailash = deep tanpura drone + pad + mountain wind, bells at scene changes; facts = cinematic tension pad with a quiet
heartbeat pulse, a boom on the cover, a whoosh into the hook, a riser landing on the `reveal` scene and a temple bell on
the `moral` scene; veer = two dhol-like opener hits and a boom, then the jaikara called out (Gemini voice only when it
passed the Whisper check, else no voice) and the bhajan chorus / library bed (no synthesized beat under recorded music).

## 9. "Kailash Parivar" (08:00 on Mon/Thu/Sat and festival tie-in days when it fits; workflow `kailash.yml`)

Owner, 15 Nov 2026: a Kailash-family Short on another channel ("महादेव ने माता पार्वती को क्यों रुलाया", 1.13 crore
views, 61 s) and its siblings showed the pattern: **festival tie-ins, an emotional or light-hearted family conflict, a
resolution with love, ~60 s of dialogue, and a cliffhanger title/cover ("फिर ... ने जो किया…")**. We make our OWN
stories in that shape. Never that channel's titles or plots (Parvati mayke/roothna, Kailash chhodna, Mahadev ke krodh
se Kailash kaanpna, pushpak vimaan for Nandi, choohe/jata, "rulaya"): the validator rejects them.

**Look.** Realistic-cinematic, divine and warm (not cartoon): snowy Kailash, golden rim light, painterly photorealism.
**Original faces only**: never a face like a TV-serial actor or any real person. The cast prompts ask for an idealised
original face and FLUX gets a true-CFG negative prompt ("TV serial actor, celebrity, likeness of a real person, beard
..."); master portraits are picked by a person and never regenerated.

**Characters** (`characters/kailash/cast.json`; one master portrait `<id>.png` + base clip `clips/<id>.mp4` each;
`character-sheet.png` = the master sheet; voices fixed): `mahadev` (serene, clean-shaven, ash-blue-grey skin, blue
throat, jata with crescent moon and Ganga, tripundra, rudraksha, cobra; deep calm Madhur), `parvati` (Mata Parvati, red
saree, golden crown; Swara), `ganesh` (Bal Ganesh, child voice; talks with a talk clip: an elephant head cannot be
lip-synced), `kartikeya` (teen prince, peacock feather, vel), `nandi` (white bull; talk clip), `mushak` (mouse; talk
clip), `narad` (youthful clean-shaven sage with veena, "Narayan Narayan"; occasionally). Everyone is clean-shaven:
MuseTalk smears beards (the lip-sync reject gate). Only characters with a master portrait may be cast.

**Ideas** come from `automation/kailash-episodes.json` (46 original ideas: festival tie-ins with a date window, then
evergreen ones). `scripts/kailash-due.mjs` picks the idea for the release day: a festival idea whose window holds the
date first, else the next evergreen idea not made yet. Keep its premise, resolution, moral, story_type and source.

**Tone rules (hard; `scripts/kailash-rules.mjs` checks every text).**
- Respectful and loving. Light family humour is OK (Mushak's laddoos, a sleepy Ganesh), never at a deity's expense.
- NEVER mock a deity. No insults ("pagal", "buddhu", "darpok"), no slaps or toilet humour.
- **No bhang, ganja, chillum or any intoxication**, not even as a joke.
- No romance beyond the dignified divine-couple affection (no kiss, "romantic", "jaanu").
- No vulgarity, no on-screen violence (a demon story is one calm line: "asur ka ant hua"), no politics, no other
  religions, nothing that would hurt devotees. Iconography stays correct.
- `story_type`: `scripture` (cite the text with khanda/adhyay in `source` and in the description: "Katha ka strot:
  ..."), `parampara` (a known tradition or sthal-katha, said as "kehte hain" / "parampara hai", named in the
  description), or `fictional` (pure slice-of-life: the description says **"काल्पनिक प्रस्तुति / भक्तिभाव से बनाई
  गई कहानी"**). Scripture/parampara episodes need `facts` (each claim with 2 independent URLs). Never invent a
  scripture detail, a shloka or a quote; never change what a scripture says to make the ending sweeter.

**File.** `story/kailash/<release>-<topic>.json`, slug `<release>-kailash-<idea id>`. Copy the shape of
`story/kailash/pilot-ep1.json`: `format: "kailash"`, `series: "kailash-parivar"`, `series_title: "Kailash Parivar"`,
`episode_id` (the bank id), `release`, `publish_at: "08:00"`, `lead`, `deity`, `topic`, `story_type`, `summary` (max
160, no "|"), `moral`, `title` (Roman, max 40) + `title_dev`, `cover`, `source` + `facts` (not for fictional),
`music: "calm"`, `cast`, `names` (Devanagari; every spoken deity name: महादेव, पार्वती, गणेश, कार्तिकेय, नंदी), `scenes`
(3-6: `prompt` in English naming the characters, no text; `cast`; `motion`; 1-3 with `animate` = ONE sentence of
gentle motion; `lines` 1-6 `{who, tts (Devanagari, max 110, numbers as words), sub (Hinglish, max 110: the BIG
subtitle), mood?}`), `endcard` `{who: a deity, tts, sub}` = the moral in one line + "Like aur Subscribe karein",
`playlist: "Kailash Parivar"`.
- **Hook:** line 1 is the conflict or surprise, max 60 characters, no greeting. **Cover** (first 0.4 s, the Short's
  thumbnail): 2-4 big Devanagari words (`cover`, max 24 characters), then the title overlay to 2.8 s.
- **55-75 s, 10-16 lines** including the endcard (the validator estimates from the voices); the lead speaks at least 2.
- **Story:** an emotional or funny family conflict that resolves with love, then the short moral and the CTA.
- `youtube_title` formula: **`😱 <situation in Devanagari>! फिर महादेव ने जो किया… 🔱❤️ | Mahadev Parvati`** (the doer
  may be another deity; verbs किया / कहा / बताया / सुनाया, or "फिर जो हुआ…"; max 100). `youtube_description`: the
  story in 1-2 Hinglish lines, the source line or the fiction label, a Devanagari line, "Chitra, awaaz aur animation AI
  se banaye gaye hain (sanketik).", a Like/Share/Subscribe line, "Kailash Parivar" and `#KailashParivar`;
  `youtube_tags` (8-15, some Devanagari); `instagram_caption` (Roman); `facebook_caption` (the template of section 3:
  #Mahadev #HarHarMahadev +1).

**Mini episodes and the cute-3d style (15 Nov 2026; viral data: "Parvati ne chhipa diya Bholenath ka Nagdev" 12.3 lakh
at 40 s, "Happiee karwachauth" 1.93 crore at 33 s = a cute 3D Shiv-Parvati, a 20 s cute Shiv-Parvati-Bal Ganesh 48 lakh).**
Each bank idea has a `variant` and a `style`; copy both into the spec. `"variant": "mini"` = 25-40 s and 6-9 lines
(the validator and the QA length gate follow it); `"full"` = 55-75 s, 10-16 lines. Full and mini alternate in the
evergreen order; festival tie-ins are minis. `"style": "cute-3d"` uses the Kalyug ke Bhagwan cartoon cast
(`characters/kalyug/cast.json`: `mahadev`, `parvati`, `bal-ganesh`; also `bal-krishna`, `bal-hanuman`) with its own
master portraits, base clips and edge-tts voices; Bal Ganesh is never lip-synced (trunk), he gets motion only, as in
Kalyug. It is for minis and festival episodes whose story needs only those characters; `"realistic"` (this section's
cast) for full episodes and for minis that need Nandi, Kartikeya, Narad or Mushak (not in the cartoon cast). Never copy
another channel's characters, lines or look. The first episode after the pilot is the Vasuki mini
(`story/kailash/2026-11-21-vasuki-chhupa-diya.json`, cute-3d, our own script). The published.md line records
`variant, style`; automation/growth.md compares mini vs full and cute-3d vs realistic.

**Names Whisper mishears (measured 15 Nov 2026; the gate is never loosened, the script avoids them):** only Mata
Parvati (Swara voice) says "गणेश"; the Madhur voices (Mahadev, Mushak, Narad, Kartikeya, Ganesh) say "गजानन". Never
speak "कार्तिकेय", "स्कंद" or "गणपति" (Whisper 0/6, 0/3, "गणपती"): address Kartikeya as "पुत्र", "भैया" or "मेरे लाल";
his name stays in the title and description. "महादेव", "पार्वती", "नंदी", "गजानन" pass. The validator checks this.

**Quality gate (automatic; a failed check publishes nothing and logs why in published.md):** Whisper must hear every
deity name exactly (never loosened); at least half of the lip-syncable close-ups really lip-synced after the
beard/blur reject gate; character consistency against the master sheet (base clips vs master portraits, scene faces
vs the master skin colour); 55-75 s. Validate with `node scripts/validate.mjs story/kailash/<file>.json`. Do not render,
upload, commit or push.

## 10. "Shri Krishna kehte hain" / Shyam POV (08:00 on Tue/Fri and festival tie-in days when it fits; workflow `krishna-pov.yml`)

Owner, 15 Nov 2026: a 2D Krishna POV channel's Shorts are consistently 0.4-10M views: a festival tie-in plus a modern
relatable question, Krishna answering in first person, straight to camera, ~60 s, a small text label on top. We make
OUR OWN version: our own original 2D illustrated Shri Krishna (flat cel-shaded master sheet, soft dawn backgrounds; not
their night-sky look or their face), our own topics (`automation/krishna-pov-topics.json`, 24 topics, festival tie-ins
first). The speaker is always Shri Krishna. Khatu Shyam ji got his name and blessing from Shri Krishna, so Khatu
tie-ins are natural, but Khatu Shyam ji himself is only ever the SHEESH (never a speaking body).

**Hard tone rules (`scripts/krishna-pov-rules.mjs` + the Kailash tone rules; a failure stops the episode):**
- POSITIVE messages only: kindness, respect for parents and elders, honesty, devotion with the right intent, no showing
  off. The pattern is **"पूजा भी करो, और साथ में ... भी करो"**.
- NEVER mock, question or tell people to drop a ritual or a festival practice; no "your tradition is wrong", no "real
  meaning of Karwa Chauth", no "andhvishwas / dhakosla / pakhand". (The reference channel's ritual-questioning hits are
  controversial; our devotional audience would be hurt.)
- No invented quotes in God's mouth as scripture. A quote is a real Bhagavad Gita verse, spoken exactly, with `shloka`
  `{text, ref: "Bhagavad Gita <chapter>.<verse>", sources: [2 URLs]}` and the chapter.verse in the description;
  otherwise the message is in the spirit of the Gita in simple words ("main kehta hoon...", never "Gita mein likha
  hai..." without the verse).
- No politics, no caste or gender debates, no health or astrology claims (no ilaaj, kundli, manglik, grah dosh, upay),
  no intoxication, no mocking, no vulgarity, nothing that would hurt devotees.
- Disclosure in the description: **"भक्तिभाव से बनाई गई काल्पनिक प्रस्तुति"** + "Chitra, awaaz aur animation AI se
  banaye gaye hain (sanketik)."

**File.** `story/krishna-pov/<release>-<topic>.json`, slug `<release>-pov-<topic id>`. Copy the shape of
`story/krishna-pov/pilot-ep1.json`: `format: "krishna-pov"`, `series: "shri-krishna-kehte-hain"`, `topic_id`, `lead:
"krishna"`, `story_type` (+ `facts` with 2 URLs each for scripture/parampara details), `message`, `label` (the small
text on top: Roman, 3-26 characters, no emoji), `cover` (2-4 big Devanagari words on the first 0.4 s), `title` +
`title_dev`, optional `shloka`, `names` (every spoken name: कृष्ण, श्याम, कान्हा, गोविंद), `scenes` (1-4; every line
`who: "krishna"`; `shot: "close"` = to camera (at least 60 % of the lines), `shot: "wide"` = an illustrated B-roll of
the scene `prompt`; at most 2 scenes with `animate`), `endcard` (the blessing + "Like aur Subscribe"),
`playlist: "Shri Krishna kehte hain"`.
- **Hook:** line 1 is Krishna to camera asking the question (`shot: "close"`, max 60 characters, a "?").
- **45-60 s**, 8-16 lines including the endcard.
- `youtube_title`: **`<Hinglish question>? 👀 | <Festival> Special #krishna #shorts`** (Roman question; on evergreen
  topics the "festival" is the theme: "Ghar Special", "Gita Gyaan Special"). Description with the message, the source
  line (and the Gita verse), the disclosure, the AI line, a subscribe line and `#ShriKrishnaKehteHain`.

**Production and QA** as Kailash Parivar (one Kaggle session; one fixed calm warm voice: edge-tts Madhur -8% -2 Hz +
divine fx through voice/humanize.py; MuseTalk on the flat face, else the talk clip, else the base clip; the QA gate:
Whisper must hear every spoken name, at least half of the close-ups lip-synced, consistency against the master sheet,
45-62 s). Validate with `node scripts/validate.mjs story/krishna-pov/<file>.json`. Do not render, upload, commit or push.

## 11. "Ramayan Ke Rochak Tathya" (facts slot 17:00 on Wed/Thu/Sat; job `facts`; owner, 24 Nov 2026)

Owner, 24 Nov 2026: "abhi Ramayan se related facts video bahut viral ho rhe h". A numbered series of short, sourced
Ramayan facts: **`automation/ramayan-series.md`** (60 items, each with a Hinglish hook, the fact in Roman and in
Devanagari, a PRIMARY source line and a one-line lesson; every citation checked on 24 Nov 2026 against the Valmiki
Ramayan and Shri Ramcharitmanas text on heritage.iitk.ac.in). Folklore and later retellings are not items; the file lists
what was left out and why. It reuses the Mandir-series idea (a fixed, numbered list worked through in order) inside the
facts pipeline (writing, Whisper name gate, render, upload, log line are the facts job's).

**Schedule** (`scripts/day-plan.mjs` `RAMAYAN_DAYS`, `RAMAYAN_FROM` 26 Nov 2026, rank 3.5): on **every day (owner, 24 Nov 2026: "roj 1"; was Wednesday, Thursday and
Saturday** the facts slot (public **17:00 IST**, made the evening before by the `facts` job) is the next series item
instead of a pauranik facts Short. Wednesday's facts slot only competes with the Dadi-Chhotu noon Short, Thursday is
Guruvar (Vishnu / Shri Ram), Saturday Hanuman ji's day; Tuesday and Friday stay with the live "Shri Krishna kehte hain"
series. **Festival days still win**: the festival status Shorts, the day status, the evening darshan and the
festival-morning darshan rank first; with the cap of 8 (from 25 Nov 2026) it goes out beside them, and only a day whose
cap is full leaves it out (the next number simply moves to the next Ramayan day; never on movie or override days). It ranks above Kailash / POV (a series Short
never takes its place), the pauranik facts Short, Kalyug and Dadi-Chhotu. It is outside the facts "2 a week" limit and
the 25 Nov facts review; repo variable **`RAMAYAN=off`** pauses it (`FACTS=off` now stops only the pauranik facts Shorts).
`node scripts/facts.mjs plan` and `node scripts/ramayan-series.mjs next` show what comes next.

**Beats (pinned, in this order; `"beat"` on every scene):**
1. `hook` (2-3 s): the item's `hook_hi` as tts and its `hook` as sub, **word for word**, over a dramatic close-up of the
   person it names (the cover frame). The spec's own on-screen `hook` (max 45, Roman) may be a shorter line but must
   name the subject and add no new claim.
2. `fact` (1-3 scenes): together their tts lines are the item's `fact_hi` and their sub lines the item's `fact`,
   **word for word**: no added, dropped or changed word (the validator compares them with the series file). Split at
   sentence ends.
3. `source` (one scene): `"source_line"` = the item's `source` exactly (the renderer draws it on screen, e.g. "Valmiki
   Ramayan, Sundar Kand, Sarga 49"), `sub` = the same line, tts = the text and kand in Hindi, max 90 characters, e.g.
   `यह प्रसंग वाल्मीकि रामायण के सुंदरकांड में है।` / `यह प्रसंग रामचरितमानस के लंकाकांड में है।`
4. `lesson` (one scene, `"moral": true`): one line of meaning or lesson (the item's `lesson` is the guide), tts max 110.
5. The end card: a jaikara (जय श्री राम / जय सियाराम / जय बजरंगबली) + the like, share and subscribe ask, as in section 3
   (e.g. `जय श्री राम! ऐसे ही रोचक तथ्य के लिए लाइक, शेयर और श्याम प्रेमी एसएन को सब्सक्राइब करें।`).
28-62 s, 5-8 scenes; 1-4 scenes with `animate` (gentle micro-motion, animated tts max 95); the spoken-style rules apply.

**Fields.** As the facts Short (section "Facts Shorts": `story/facts/<release>-<item id>.json`, slug
`<release>-facts-<item id>`, `format: "facts"`, `publish_at: "17:00"`, `art` A/B, `style`, `cover` / `cover_lines`,
`facts`, `deity`, `summary`) plus `"series": "ramayan"`, `"variant": "ramayan"`, `"topic": "<item id>"`, `"source"` =
the item's source line, `"kicker": "Ramayan Tathya <n>/<total>"`, `"playlist": "Ramayan Ke Rochak Tathya"` (in
validate.mjs PLAYLISTS; created on YouTube at the first upload). `youtube_title`: **`Ramayan Tathya <n>/<total>: <Roman
line> | रामायण तथ्य <n>: <देवनागरी> #Shorts`** (Roman part max 48, whole title max 100). `youtube_description`: 2-4
Hinglish lines, a Devanagari line, `Source: <item source>`, `Chitra AI dwara banaye gaye hain (sanketik). Awaaz AI se.`,
the like/share/subscribe line, then `#ramayan #facts` + 1-2 subject tags. `facts`: at least the item's fact with 2 URLs,
one of them the item's `verify` page (re-check it before writing; if the text does not support the item, write
nothing and report it). Instagram and Facebook captions as for every Short (Facebook: no asks; its 3 hashtags from
`node scripts/fb.mjs tags <spec>`).

**Hard rules (`scripts/ramayan-rules.mjs`, run by `node scripts/validate.mjs`):** the hook, fact and source must match
the series item as above; never "scientific proof", "vaigyanik praman", NASA, satellite, carbon-dating or archaeology
claims; no BCE years, "N saal pehle" or "years ago"; **no number** (age, distance, duration, year) anywhere in the
Short, title or captions that the item itself does not have; no pseudo-science, "proven" or cure claims; respectful
wording for Shri Ram, Mata Sita, Lakshman ji, Hanuman ji, Bharat ji; Ravan factual, never mocked; no politics, nothing
against any community, deity or tradition.

**Pictures** (every `prompt`, checked): traditional depictions only. **Shri Ram (and Shri Krishna) are dark /
blue-complexioned** in every prompt that shows them ("dark blue-complexioned Shri Ram with a bow, yellow pitambar,
golden mukut"), never fair-skinned; Mata Sita, Lakshman ji, Bharat ji in traditional dress and ornaments; **Hanuman ji**
in his traditional vanara form (orange-vermilion, gada, mukut) with "clean-shaven vanara face, no beard" (only Salasar
Balaji has daadhi-moonchh); Ravan regal and factual, never comic or ridiculed; respectful, modest framing; no gore (a
battle is light, dust and petals). **No text in generated images**: never ask for words, letters, signs or titles (the
source line and cover are drawn by the renderer); `style` says "no text". Real photos only under the existing rules
(`temple` from footage/temples.json, licence-checked Wikimedia CC0 / PD / CC BY with credits, `real: true` only on the
real place, never on a katha scene); otherwise AI pictures with the AI line in the description. AI voices only (the
facts narrator chain), the licence-checked music beds only, never a song, a film clip or another channel's footage.

**QA (automatic, never loosened):** the facts Whisper name gate (scripts/facts.mjs `qa`; it now also checks राम, सीता,
लक्ष्मण, भरत, सुग्रीव, विभीषण, वाल्मीकि, तुलसीदास, दशरथ, अंगद, शबरी: more names checked, never fewer) and the narration CER;
a second failure means no upload. Validate with `node scripts/validate.mjs <file>`; the sample
`scripts/fixtures/ramayan-sample.json` (item 1) shows the shape. Do not render, upload, commit or push.
