# Shorts feed audit, 17 Nov 2026

Goal: get the Shorts into the YouTube **Shorts feed**, not only search. Data: YouTube Analytics API (audience retention
report, dimension `elapsedVideoTimeRatio`, metrics `audienceWatchRatio` + `relativeRetentionPerformance`; per-video views,
average view %, traffic sources, `subscribedStatus`) for the channel's last 75 public Shorts (25 Oct - 17 Nov 2026), via
`node scripts/retention.mjs audit --n 75`. Analytics lags 2-3 days, so the 15-17 Nov uploads (facts, movie part 1,
Gopashtami) have no data yet. YouTube gives a retention curve only above a minimum number of views: 14 of the 75 Shorts.
The owner's Studio number for Gopashtami Status 2026 (221 views in 48 h, 209 = 95% from YouTube search, 4 from the
Shorts feed) matches the pattern below. The channel's own token works for the Analytics API with `youtube.readonly`
(no re-auth needed).

"Kept at N s" = audienceWatchRatio at that second (the share of views still watching; rewinds and replays push it above
100%). "Relative" = relativeRetentionPerformance (1.0 = like other YouTube videos of that length).

## 1. Where viewers drop (the first 3 seconds)

| Format | Shorts (with curve) | Avg length | Avg % viewed | Kept at 0 s | Kept at 3 s | Drop in first 3 s | Kept at the end | Relative at 3 s | Search share | Shorts feed share |
|---|---|---|---|---|---|---|---|---|---|---|
| Festival status | 14 (5) | 21 s | 35.5% | 109% | **67%** | **42 pts** | 10% | 0.18 | **72%** | **14%** |
| Temple darshan | 21 (7) | 29 s | 56.9% | 129% | **120%** | **9 pts** | 34% | 0.30 | 13% | **77%** |
| Katha Short (morning) | 21 (7) | 69 s | 52.7% | 121% | 115% | 7 pts | 28% | 0.47 | 13% | 73% |
| Bhajan Short | 5 (1) | 84 s | 15.9% | 112% | 94% | 18 pts | 6% | 0.23 | 78% | 2% |
| Facts / movie | 6 (0) | 56-128 s | no data yet (1-9 views each) | | | | | | | |

Per Short (the ones with a curve):

| Short | Length | Views | Avg % viewed | Kept at 3 s | End | Feed / search views |
|---|---|---|---|---|---|---|
| Dhanteras Status 2026 (6 Nov, hook "शुभ धनतेरस", animated scene 1) | 24 s | 456 | 48.7% | 106% | 16% | 39 / 30 (+23 external) |
| Choti Diwali Status 2026 (7 Nov, "शुभ छोटी दिवाली", animated) | 25 s | 799 | 36.3% | 85% | 13% | 19 / 116 |
| Chhath Sandhya Arghya Status 2026 (14 Nov eve, "कल है छठ संध्या अर्घ्य 🙏") | 18 s | 81 | 19.6% | 61% | 7% | 2 / 71 |
| Nahay Khay Status 2026 (12 Nov eve, "कल है नहाय खाय 🙏", still scene 1) | 20 s | 112 | 15.5% | 43% | 11% | 4 / 95 |
| Chhath Puja Nahay Khay Status 2026 (13 Nov, "आज है छठ पूजा नहाय खाय 🙏") | 21 s | 209 | 20.7% | 40% | 5% | 2 / 26 (partial) |
| Moravinandan Khatu Shyam ji Darshan (hook "Neele ghode ka asvar kaun?") | 21 s | 173 | 75.8% | 124% | 38% | 163 / 8 |
| Shakambhari Mata Mandir Sakrai Darshan | 31 s | 164 | 62% | 115% | 20% | 148 / 11 |
| Salasar Balaji Dham, Churu ("Daadhi-moochh wale Hanuman ji!") | 23 s | 135 | 72% | 117% | 29% | 102 / 27 |
| Haare ka Sahara Baba Shyam | 24 s | 86 | 73% | 118% | 23% | 80 / 2 |
| Shubh Dhanteras Maa Lakshmi Darshan | 31 s | 54 | 57% | 105% | 14% | 52 / 2 |

Findings:
- **Status Shorts lose 40-60% of viewers in the first 3 s** (except Dhanteras/Choti Diwali) and only 5-16% reach the end,
  so no Short loops above 100%. They live on SEARCH (72% of views; Gopashtami 95%) and shares, not the feed (14%).
  Searchers often look at several status videos and go back, which is part of the drop and cannot be fully fixed.
- The two status Shorts that held (85-106% at 3 s) opened on a **short, huge word** ("शुभ धनतेरस", 118 px) over an
  **animated** first scene. The three that dropped to 40-61% opened on a long hook ("आज है छठ पूजा नहाय खाय 🙏", drawn at
  84 px), one of them over a still first scene. Small sample (5 curves), but consistent. (The last 30 Shorts alone:
  3 curves, 48% kept at 3 s, a 56-point drop.)
- **Darshan Shorts are what the feed pushes**: 77% of their views come from the Shorts feed, >100% kept at 3 s, 57-76%
  viewed. But the darshan Shorts from 9-13 Nov (name-only hooks: "Vaishno Devi Mata ka darbar", "Khatu Shyam Mandir,
  Sikar darshan", "Shrinathji, Nathdwara: Annakut darshan") got 1-21 views, 15-51% viewed and almost no feed views. The
  winners all had a curiosity hook ("... kaun?", "... kya hai khaas?", "Daadhi-moochh wale Hanuman ji!"). The cover frame
  (6 Nov) and 5-6 uploads a day (7-9 Nov) changed at the same time, so this is a correlation, not proof.
- Engagement per 100 views: darshan 12.4 (likes+comments+shares), status 5.4 (mostly shares: 64 shares). Comments: 0
  on almost every Short.
- "Viewed vs swiped away" (the feed's own metric) is not in the API; see owner steps below.

## 2. What was changed (commits of 17 Nov 2026)

- `scripts/retention.mjs` (+ tests): the audit above; the Monday growth report (`scripts/growth-compare.mjs`) now has a
  "### Retention (Shorts feed)" table for the last 30 Shorts (first-3-second drop, % viewed, search vs feed share).
- Status loops (`scripts/status-engine.mjs`, `story/status-overlays.mjs`, `story/render-story.mjs`, `scripts/validate.mjs`):
  - 12-20 s (3 scenes of 5 s; was 6 s, 18-21 s); the validator's loop range is 12-20 s.
  - the last scene no longer gets the "अपनों को भेजें, सब्सक्राइब करें 🙏" line or the spoken "स्टेटस पर लगाएं, और सबको
    भेजें" ask, so the video ends on its own picture and fades into frame 0 (the subscribe ask stays in the description);
  - the audio only dips 0.25 s at the loop point (was 0.6 s: an audible gap on every replay);
  - frame 0: when the first picture is a still and another scene has an animated clip, the animated scene goes first;
  - the first-frame hook draws "आज है / कल है / परसों है" small above and the festival name (the searched words) big:
    "छठ पूजा नहाय खाय" at 100 px instead of the whole hook at 84 px; the emoji never wraps onto its own line;
  - tags lead with the searched forms: "<Festival> status", "status 2026", "whatsapp status", "status video",
    "<हिंदी> स्टेटस", "<हिंदी> स्टेटस वीडियो", "<हिंदी> व्हाट्सएप स्टेटस".
  - The bhajan already starts on frame 0 in status Shorts (song mode, 40 ms fade-in); there is no fade from black and
    no intro before the hook (the cover/hook is on frame 0 in every format).
- Darshan (`scripts/validate.mjs`, `automation/STORY.md`): the evening darshan hook must give the temple name AND a reason
  to keep watching (a question or a striking true fact); a plain "<Temple> darshan" hook fails validation. The emotional
  A/B arm keeps its own formula. The cover (temple name, 0-0.4 s) and the hook (from 0.36 s) are both in the first second.
- Timing (`scripts/day-plan.mjs`): when the cap leaves room for only one darshan on a festival day, it is the 19:00 evening
  darshan, not the ~10:30 festival-morning one (21 Nov, 22 Nov, 6-7 Dec, ...). Other times already fit: status 00:30 and
  20:00, day status 06:00, bhajan 05:30-06:30, movie 07:00, series 08:00, facts 17:00, darshan 19:00. The only planned
  slots in the 11:00-16:00 dead hours are the Wednesday Dadi-Chhotu (15:00, never fits the cap now) and the long video
  12:30 (only on a manual dispatch; the long slot is the 05:30 mantra jaap / jukebox).
- Search + feed (`automation/festivals.json`, `scripts/status-themes.mjs`): Akshaya (Amla) Navami 18 Nov (00:30 only;
  17 Nov is full) and Vaikuntha Chaturdashi 23 Nov (eve 22 Nov 20:00 + 00:30, "Vaikuntha" and "Baikunth" spellings)
  switched from info to status with their own themes. Kharmas / Dhanu Sankranti (16 Dec) stays info: it is the start
  of an inauspicious month, not a greeting people put on their status.
- `scripts/trend-signals.mjs`: uses YouTube Analytics with the youtube.readonly scope (it fell back to lifetime views).
- Also fixed: two sati-temple regexes in `scripts/validate.mjs` had invisible backspace characters instead of `\b`, so the
  "no mela / yatra / amavasya" and "no fire imagery" checks never matched; they now work as written (stricter).

Not done: the automatic first comment (blocked by the session's permission rules; owner step below).

## 3. Channel focus (report only, nothing changed)

Views from SUBSCRIBED viewers (the closest the API has to returning viewers) on these 75 Shorts: 35 of ~3,700. 34 of them
were on darshan / katha Shorts, 0 on the 14 status Shorts (1,934 views). Subscribers gained: darshan 9, katha 4, status 3.

| Deity / temple group | Shorts | Avg views | Shorts feed share | Avg % viewed | Subscribed views | Subs gained |
|---|---|---|---|---|---|---|
| Khatu Shyam ji | 15 | 42 | 85% | 73% | 11 | 8 |
| Hanuman / Salasar Balaji | 4 | 58 | 72% | 65% | 6 | 3 |
| Rajasthan Devi (Shakambhari, Jeen Mata, Rani Sati) + Vaishno | 5 | 62 | 67% | 47% | 5 | 2 |
| Lakshmi / Diwali (mostly status) | 13 | 111 | 42% | 45% | 2 | 2 |
| Chhath (status, bhajan, facts) | 16 | 39 | 3% | 21% | 0 | 1 |
| Krishna / Govardhan | 7 | 16 | 43% | 70% | 4 | 0 |
| Shiv | 4 | 22 | 79% | 37% | 2 | 1 |

Recommendation: the feed and the returning viewers come from **Khatu Shyam ji and the Shekhawati/Rajasthan circuit**
(Salasar Balaji, Shakambhari, Jeen Mata, Rani Sati Dadi with the sati rules): highest feed share, best retention, most
of the subscribers gained, and it matches the channel name. Mixing many deities does not seem to hurt SEARCH (status
Shorts are found by festival name), but it gives the feed no consistent audience: Chhath, Shiv and Krishna Shorts
reached new people through search and none of them came back. Suggested split (owner to decide): the feed formats
(evening darshan, movie/series, bhajan Shorts) mostly Khatu Shyam + Rajasthan temples (e.g. 5 of 7 evenings), festival
status Shorts for every festival as now (search traffic), other deities only on their festival days.

## 4. Owner steps

1. **Studio, per Short, "Viewed vs swiped away"** (Content -> the Short -> Analytics -> Engagement / "How many chose to
   view"): please send it for Gopashtami Status 2026, Chhath Puja Nahay Khay Status 2026, Dhanteras Status 2026,
   Moravinandan Khatu Shyam ji Darshan, Vaishno Devi Mata Darshan and the next 3 Shorts after 18 Nov. The API does not
   expose it, and it is the number that decides the feed.
2. **First comment** (blocked here): allow the automation to post one question comment as the channel after each upload
   (commentThreads.insert, 50 quota units each, max 8 a day), or post it by hand and pin it. Questions to use:
   status: "आपके घर <त्योहार> कैसे मनाते हैं? 🙏"; Khatu darshan: "आप खाटू श्याम जी के दर्शन करने कब गए थे? 🙏"; other
   darshan: "क्या आपने कभी <मंदिर> के दर्शन किए हैं? 🙏"; bhajan: "<देवता> का कौन सा भजन आपको सबसे प्रिय है? 🙏"; facts:
   "क्या आप यह बात पहले से जानते थे? 🙏". No "comment karo / likhein / bhejein / share / subscribe" wording; never on
   Rani Sati videos.
3. Pin that comment in Studio (the API cannot pin).
4. Decide the channel focus (section 3).
