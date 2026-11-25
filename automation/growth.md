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
| 2026-11-23 | 51 | 8784 | 159 |

## Facts review 2026-11-25

Owner, 16 Nov 2026: facts Shorts max 2 a week until 25 Nov, then compare; median under 20 views = facts off.

| Day | Views | Short |
|---|---|---|
| 2026-11-15 | 11 | Chhath: Sita ji aur Draupadi ka vrat 😱 #facts / Chhath Puja Katha / स |
| 2026-11-15 | 3 | Chhath ka arghya pehle kisne diya 😱 #facts / Karna Katha / छठ और कर्ण |
| 2026-11-15 | 1 | Chhathi Maiya ka sabse bada chamatkar 😱 #facts / Chhath Puja Katha /  |
| 2026-11-16 | 6 | Chhathi Maiya ko Chhathi kyun kehte 😱 #facts / Chhath Puja Katha / छठ |
| 2026-11-16 | 5 | Chhath: doobte Suraj ko arghya kyun 😱 #facts / Chhath Puja Katha / डू |
| 2026-11-17 | 55 | Khatu Shyam ke 5 naam ka rahasya 😱 #facts / Khatu Shyam Katha / बाबा  |

- 6 facts Shorts public 2026-11-15 to 2 days before 2026-11-25: median **5.5** views -> verdict **OFF: scripts/day-plan.mjs plans no facts Short from 2026-11-25 (automation/facts-review.json; to try again, set its verdict to "on" or delete it)**.

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

## Week of 2026-11-23

| Window | Dates | Uploads | Shorts | Avg views/Short | Avg views/Short/day of age | Shorts with <=15 views | Best Short |
|---|---|---|---|---|---|---|---|
| Before (3-6 a day) | 2026-11-02 to 2026-11-08 (7 d) | 29 (4.1/day) | 23 | 87.3 | 5.1 | 10 | 806: Choti Diwali Status 2026 / छोटी दिवाली स्टेटस वीडियो #Shorts |
| After (max 3 a day) | 2026-11-10 to 2026-11-16 (7 d) | 30 (4.3/day) | 26 | 48.4 | 5.4 | 12 | 243: Chhath Usha Arghya Status 2026 / छठ उषा अर्घ्य स्टेटस वीडियो |

- Average views per Short, after vs before: **-45%** (48.4 vs 87.3).

By format, videos public 2026-11-09 to 2026-11-22 (facts variant / art / length, loop vs veer and the evening hook A/B are rows of their own):

| Format | Videos | Avg views | Avg views/day of age | Best |
|---|---|---|---|---|
| festival status | 17 | 204.5 | 45.3 | 953: Gopashtami Status 2026 / गोपाष्टमी स्टेटस वीडियो # |
| long | 5 | 53.6 | 5.3 | 175: Chhath Puja Geet 2026 Nonstop / 10 Chhath Geet / B |
| facts story | 1 | 49 | 8.6 | 49: Khatu Shyam ke 5 naam ka rahasya 😱 #facts / Khatu |
| facts 100-180 s | 1 | 49 | 8.6 | 49: Khatu Shyam ke 5 naam ka rahasya 😱 #facts / Khatu |
| bhajan Short | 4 | 42.3 | 5.3 | 110: Sandhya Arghya Geet 2026 / Chhath Puja Song / Bhak |
| day status | 2 | 31 | 7 | 55: Guruvar Sai Baba Status / गुरुवार साईं बाबा स्टेटस |
| bhajan | 1 | 27 | 2.8 | 27: Chhath Puja Song 2026 / Nahay Khay Kaddu Bhaat Gee |
| noon | 1 | 21 | 1.5 | 21: Govardhan Puja ki Katha / गोवर्धन पूजा की कथा #Sho |
| movie | 4 | 20.3 | 3.7 | 57: Khatu Shyam ji ki Amar Katha Part 1 / खाटू श्याम ज |
| time test: statusday 08:30 | 1 | 20 | 6.6 | 20: Khatu Shyam Birthday Status 2026 / खाटू श्याम जन्म |
| facts art cinematic | 6 | 12.5 | 2 | 49: Khatu Shyam ke 5 naam ka rahasya 😱 #facts / Khatu |
| morning darshan | 5 | 9.2 | 1 | 30: Deo Surya Mandir Darshan, Bihar / देव सूर्य मंदिर  |
| time test: owner 22:19 | 1 | 8 | 3.3 | 8: Khatu Shyam Baba Safed Shringar Darshan / खाटू श्य |
| evening darshan (name hook) | 6 | 6.2 | 0.9 | 12: Khatu Shyam Mandir Darshan, Sikar / खाटू श्याम मंद |
| facts kyun | 5 | 5.2 | 0.7 | 11: Chhath: Sita ji aur Draupadi ka vrat 😱 #facts / C |
| facts 45-65 s | 5 | 5.2 | 0.7 | 11: Chhath: Sita ji aur Draupadi ka vrat 😱 #facts / C |
| owner | 3 | 4.3 | 2.3 | 8: Khatu Shyam Baba Safed Shringar Darshan / खाटू श्य |
| time test: owner 07:15 | 2 | 2.5 | 1.9 | 3: Shyam Baba Ke Shringar Darshan / श्याम बाबा का श्र |
| evening darshan (emotional hook) | 1 | 1 | 0.6 | 1: Jab Koi Saath Na De, Baba Shyam Darshan / जब कोई स |

### Retention (Shorts feed): the last 30 public Shorts, YouTube Analytics to 2026-11-23

"Kept at N s" = audienceWatchRatio at that second (share of views still watching; replays push it above 100%). Relative
retention 1.0 = like other YouTube videos of that length. "Viewed vs swiped away" is not in the API: see Studio.

| Format | Shorts (with curve) | Avg length | Avg views | Avg % viewed | Kept at 0 s | Kept at 3 s | Drop in first 3 s | End (>100 = replays) | Rel. retention at 3 s | Search % | Shorts feed % | Likes+comments+shares /100 views | Shares | Subs gained |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| status | 13 (5) | 17.2 s | 206.2 | 36.1% | 125% | 97.2% | 27.8 pts | 31.6% | 0.41 | 55.3% | 29.2% | 4.1 | 70 | 2 |
| movie | 4 (0) | 119.5 s | 17.3 | 105.8% | - | - | - | - | - | 76.6% | 21.3% | 5.8 | 0 | 1 |
| facts | 4 (1) | 71.5 s | 16.8 | 48.7% | 110.5% | 105.3% | 5.3 pts | 5.3% | 0.32 | 67.2% | 24.6% | 4.5 | 0 | 0 |
| bhajan | 2 (0) | 89.5 s | 17.5 | 4.5% | - | - | - | - | - | 77.3% | 0% | 0 | 0 | 0 |
| darshan | 7 (0) | 20.6 s | 1.6 | 63.5% | - | - | - | - | - | 37.5% | 62.5% | 9.1 | 0 | 0 |

### Shorts of the last 7 days (2026-11-16 to 2026-11-22, YouTube Analytics to 2026-11-23)

| Short | Format | Length | Views | Engaged views | Avg % viewed | Shorts feed % | Search % |
|---|---|---|---|---|---|---|---|
| Happy Vaikuntha Chaturdashi Status 2026 ✨ / वैकुंठ चतुर | status | 18 s | 0 | - | - | - | - |
| Rani Sati Dadi Mandir Darshan / रानी सती दादी मंदिर दर् | darshan | 20 s | 0 | - | - | - | - |
| Shyam Baba Ke Shringar Darshan / श्याम बाबा का श्रृंगार | darshan | 19 s | 0 | - | - | - | - |
| Ravi Pradosh Vrat Status 2026 🙏 / रवि प्रदोष व्रत स्टे | status | 21 s | 0 | - | - | - | - |
| Jab Koi Saath Na De, Baba Shyam Darshan / जब कोई साथ न  | darshan | 21 s | 0 | - | - | - | - |
| Dwarkadhish Mandir Darshan, Dwarka / द्वारकाधीश मंदिर द | darshan | 28 s | 1 | 1 | 91.82% | - | - |
| Khatu Shyam Baba Darshan / खाटू श्याम बाबा के दर्शन / J | darshan | 23 s | 2 | 2 | 46.43% | - | - |
| Tulsi Vivah Status 2026 / तुलसी विवाह स्टेटस वीडियो | status | 16 s | 4 | 3 | 18.1% | - | - |
| Khatu Shyam Baba Safed Shringar Darshan / खाटू श्याम बा | darshan | 19 s | 8 | 2 | 52.37% | 62.5% | 37.5% |
| Khatu Shyam Birthday Status 2026 / खाटू श्याम जन्मदिन स | status | 15 s | 20 | 14 | 13.33% | 0% | 0% |
| Khatu Shyam ji ki Amar Katha Part 4 / खाटू श्याम जन्मोत | movie | 109 s | 2 | 1 | 2.66% | 0% | 100% |
| Dev Uthani Ekadashi Status 2026 / देवउठनी एकादशी स्टेटस | status | 16 s | 954 | 223 | 43.52% | 1.9% | 81.5% |
| Khatu Shyam Janmotsav Status 2026 / खाटू श्याम जन्मोत्स | status | 15 s | 134 | 54 | 10.55% | 10.4% | 75.4% |
| Khatu Shyam ji ki Amar Katha Part 3 / बर्बरीक का शीश दा | movie | 115 s | 7 | 4 | 29.07% | 0% | 83.3% |
| Guruvar Sai Baba Status / गुरुवार साईं बाबा स्टेटस वीडि | status | 16 s | 55 | 24 | 38.72% | 42.9% | 14.3% |
| Shyam Baba Janmotsav Status 2026 / श्याम बाबा जन्मोत्सव | status | 16 s | 23 | 9 | 30.86% | 21.7% | 52.2% |
| Khatu Shyam ji ki Amar Katha Part 2 / खाटू श्याम जी की  | movie | 126 s | 13 | 4 | 29.23% | 0% | 100% |
| Akshaya Navami Status 2026 / अक्षय नवमी स्टेटस वीडियो | status | 16 s | 263 | 135 | 57.2% | 6.1% | 81.8% |
| Khatu Shyam ke 5 naam ka rahasya 😱 #facts / Khatu Shya | facts | 121 s | 45 | 21 | 39.93% | 29.5% | 65.9% |
| Khatu Shyam ji ki Amar Katha Part 1 / खाटू श्याम जी की  | movie | 128 s | 47 | 13 | 362.16% | 31.3% | 68.8% |
| Gopashtami Status 2026 / गोपाष्टमी स्टेटस वीडियो | status | 19 s | 953 | 423 | 47.76% | 2.7% | 65.2% |
| Chhath Parana Geet 2026 / Chhathi Maiya Dhanyavad Song  | bhajan | 89 s | 16 | 5 | 5.71% | 0% | 81.3% |
| Usha Arghya Geet 2026 / Chhath Puja Song / Bhakti Geet  | bhajan | 90 s | 19 | 6 | 3.2199999999999998% | 0% | 66.7% |
| Chhathi Maiya ko Chhathi kyun kehte 😱 #facts / Chhath  | facts | 51 s | 6 | 4 | 81% | 0% | 80% |
| Chhath: doobte Suraj ko arghya kyun 😱 #facts / Chhath  | facts | 60 s | 5 | 3 | 25.53% | 0% | 0% |
| Chhathi Maiya Status 2026 / छठी मैया स्टेटस वीडियो | status | 18 s | 31 | 15 | 56.879999999999995% | 0% | 100% |

- Totals: 2608 views, 966 engaged views; average % viewed 51.7% (mean of the Shorts).
- Top 3 by Shorts feed share (at least 10 views): 1. Guruvar Sai Baba Status / गुरुवार साईं बाबा स्टेटस वीडि (42.9% feed, 55 views, 38.72% viewed); 2. Khatu Shyam ji ki Amar Katha Part 1 / खाटू श्याम जी की  (31.3% feed, 47 views, 362.16% viewed); 3. Khatu Shyam ke 5 naam ka rahasya 😱 #facts / Khatu Shya (29.5% feed, 45 views, 39.93% viewed).
- **Viewed vs swiped away** is not in the YouTube Analytics API: owner, please send the Studio number (Content -> the Short -> Analytics -> Engagement) for the top 3 above.
- **Instagram / Facebook insights** are not available through the API (the token lacks the insights permission): owner, please send a screenshot of Instagram Insights (Reels: watch time, sends/reach, likes/reach of the top 3) and the Facebook Professional Dashboard (Reels plays, last 7 days).

### What's working outside (viral radar, last 7 days; automation/viral-radar.md)

- 143 truly viral devotional Shorts in 7 days (>= 100k or 30k in 3 days, >= 5x their channel's median).
- Hooks: name / plain 78, emotional-motivational line 15, रहस्य / secret 11, जब… 8.
- Formats: other 67, katha 26, facts 21, loop 17; deities: krishna 31, hanuman 28, shiv 27, ram 26.
- Art: cinematic 38, real-photo 10, illustrated 6, cartoon-3d 6; length: <=30 s 73, 31-60 s 33, 121-180 s 25, 61-120 s 12.
- Best: "जटायु से भी 10 गुना शक्तिशाली था संपाति! 😱" 22.5 L (3781.5x, रहस्य / secret); "बागेश्वर महाराज के बयान पर मचा बवाल! राम जी के 5 पिता! शास्त" 25.8 L (978.4x, listicle); "जल में समा गईं माँ दुर्गा, भक्तों की आँखें हुईं नम 😢🙏 / जय" 9.0 L (876.2x, emotional-motivational line).
- New ideas in the banks (status "idea", citation to verify): facts:radar-durga-visarjan-kyun, facts:radar-chunari-kyun, facts:radar-ram-samudra-baan, kailash:radar-ganesh-vidai-mata-roi, pov:radar-kuch-chhoot-jaye, facts:radar-hanuman-sankatmochan, facts:radar-lakshman-14-saal-jaagran, facts:radar-ganesh-modak-kyun, kailash:radar-modak-thaali-khaali, pov:radar-ananya-bhakti-yog-kshem, facts:radar-murti-visarjan-jal, facts:radar-akshat-kyun-chadhate, facts:radar-aruna-bina-pair, kailash:radar-akshat-gayab, pov:radar-visarjan-main-kahin-nahi, facts:radar-samundra-shivling, facts:radar-ravan-shivling-baidyanath, facts:radar-garuda-garbh-vachan, kailash:radar-kamandal-jal-kam, pov:radar-sach-ki-gawahi, facts:radar-vibhishan-lanka-raaj, facts:radar-hanuman-poonch-aag, facts:radar-karn-kavach-kundal, kailash:radar-jhoola-toota, pov:radar-galti-kshama, facts:radar-sheesh-yudh-dekha, facts:radar-shiv-tulsi-nahi, kailash:radar-darpan-kho-gaya, pov:radar-dhokha-dhairya, facts:radar-hanuman-musthi-ravan, facts:radar-krishna-makhan-chor, facts:radar-krishna-bansuri-bans, kailash:radar-mehndi-rang-halka, pov:radar-pehli-roti-gau.

- Subscribers: **51** (+8 since 2026-11-09), +4 since 2026-11-16.

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
