# Growth: the "max 3 uploads a day" change

Owner, 9 Nov 2026: from 2026-11-10 at most 3 YouTube uploads a day (scripts/day-plan.mjs), because 5-6 a day (7-9 Nov)
collapsed views from hundreds to 0-15. Every Monday the `growth` job of .github/workflows/daily.yml compares the average
views per Short before (2-8 Nov) and after (10-16 Nov, then each last 7 days) with scripts/growth-compare.mjs.
Data API lifetime views: younger videos have had less time, so compare "views per day of age" too.

## Subscriber snapshots

| Date | Subscribers | Channel views | Videos |
|---|---|---|---|
| 2026-11-09 | 43 | 4558 | 106 |
| 2026-11-16 | 47 | 6055 | 134 |

## Upload time test (A/B from 21 Nov 2026, compare after 2 weeks)

Competitor decode of 20 Nov 2026 (automation/competitor-decode-2026-11.md, 1,307 Shorts of 15 devotional channels):
05-07 h IST uploads 1.08x their channel's median, 14-16 h 1.09x, **08-10 h the weakest (0.89x)**; festival status on the
festival day at 08-11 h 0.78x; real-darshan channels win at aarti time (05:00-07:30). Two of our slots sat in that hour:

| Lane | Before (A) | From 21 Nov 2026 (B) | Where |
|---|---|---|---|
| Owner footage (the owner's own pandal darshan, 1 extra Short a day) | 09:30 IST (an owner Short already scheduled keeps it) | **07:15 IST** | automation/owner-footage.json `at` |
| Big-festival `statusday` variant | 08:30 IST (Janmotsav 20 Nov 2026) | **07:30 IST** (Dev Deepawali 24 Nov, Makar Sankranti, Basant Panchami, Mahashivratri, Phalgun Ekadashi, Holi) | status-engine STATUSDAY_AT, festivals.json |

Unchanged: bhajan / mantra 05:30-06:30, day status 06:00, status 00:30 and eve 20:00, movie 07:00. Facebook keeps its
90-minute spacing (fb.mjs moves the owner Reel off 07:15 when a 06:00 / 07:30 Reel is planned; the statusday Reel is
07:30 and a movie part moves 90 min away); the Instagram trial Reel moved 07:30 -> 09:00 (status-engine TRIAL_AT).

How to compare (review on **Mon 7 Dec 2026**, the 2 weeks 21 Nov - 4 Dec): the weekly "By format" table now has
`time test: owner HH:MM` and `time test: statusday HH:MM` rows (scripts/growth-compare.mjs timeTestKey, the IST publish
time); judge on views per day of age and the first-24-h views against the 09:30 owner Shorts (the first one: 21 Nov if
it was already scheduled) and the 08:30 Janmotsav statusday (20 Nov). Few data points (1 owner Short a day, ~2
statusday Shorts in 2 weeks): keep the new times unless they are clearly worse; YouTube says Shorts are not ranked by
upload hour, so this is a tie-breaker about when the audience is awake and searching.

## Week of 2026-11-16

| Window | Dates | Uploads | Shorts | Avg views/Short | Avg views/Short/day of age | Shorts with <=15 views | Best Short |
|---|---|---|---|---|---|---|---|
| Before (3-6 a day) | 2026-11-02 to 2026-11-08 (7 d) | 29 (4.1/day) | 23 | 86.4 | 8.5 | 11 | 802: Choti Diwali Status 2026 / छोटी दिवाली स्टेटस वीडियो #Shorts |
| After (max 3 a day) | 2026-11-10 to 2026-11-15 (6 d) | 24 (4/day) | 21 | 54.6 | 30.9 | 10 | 238: Chhath Usha Arghya Status 2026 / छठ उषा अर्घ्य स्टेटस वीडियो |

- Average views per Short, after vs before: **-37%** (54.6 vs 86.4). The after window is still partial (to 2026-11-15).

By format, videos public 2026-11-02 to 2026-11-15 (facts variant / art / length, loop vs veer and the evening hook A/B are rows of their own):

| Format | Videos | Avg views | Avg views/day of age | Best |
|---|---|---|---|---|
| other | 47 | 67.4 | 18.1 | 802: Choti Diwali Status 2026 / छोटी दिवाली स्टेटस वीडि |
| long | 10 | 31.6 | 10.2 | 171: Chhath Puja Geet 2026 Nonstop / 10 Chhath Geet / B |

### What's working outside (viral radar, last 7 days; automation/viral-radar.md)

- 13 truly viral devotional Shorts in 7 days (>= 100k or 30k in 3 days, >= 5x their channel's median).
- Hooks: name / plain 9, listicle 2, emotional-motivational line 1, संत / लोक देवता चमत्कार 1.
- Formats: katha 6, other 3, facts 2, darshan 1; deities: ram 7, krishna 3, devi 2, shiv 1.
- Art: real-photo 4, cinematic 2, text-card 1, murti-darshan 1; length: <=30 s 7, 31-60 s 3, 121-180 s 2, 61-120 s 1.
- Best: "बूढ़ी माँ की पुकार सुनकर खुद प्रकट हुईं माँ दुर्गा 😭🙏 / मा" 32.4 L (1855.5x, emotional-motivational line); "श्री राम जन्मभूमि अयोध्या का नजारा🚩/अयोध्या #trandingshorts" 31.3 L (957.8x, name / plain); "बागेश्वर महाराज के बयान पर मचा बवाल! राम जी के 5 पिता! शास्त" 22.9 L (869.8x, listicle).
- New ideas in the banks (status "idea", citation to verify): facts:radar-bharat-paduka, facts:radar-navratri-kanya-poojan, kailash:radar-namak-kam-pyaar-zyada, pov:radar-ghamand-vinamrata.

- Subscribers: **47** (+4 since 2026-11-09), +4 since 2026-11-09.
