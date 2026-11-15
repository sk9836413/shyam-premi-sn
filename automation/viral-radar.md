# Viral Radar

Which devotional Shorts are TRULY viral in India each week, and why (scripts/viral-radar.mjs, workflow
.github/workflows/viral-radar.yml, owner 15 Nov 2026). Per-run data: automation/viral-radar/<date>.json.

- Filter: views >= 1.0 L (or >= 30k within 3 days) AND >= 5x the median of the
  channel's other recent Shorts (min 3); likely reuploads (tiny / new channel, random topics, spammy title) skipped.
- Quota: sweep (Monday) 8 searches ~838 units, other days 2 searches ~212 units;
  ~2110 units a week, never more than 900 a day (the project has 10,000/day shared with ~1,600 per upload).
- Ideas go into the banks as "status": "idea" with a citation to verify (`node scripts/topic-banks.mjs promote`).
  Our own words only: titles and scripts of other channels are never copied.

## Week of 2026-11-15

Runs: 2026-11-15 sweep; quota used 865 units (cap 900/day).

### Top 10 truly viral references

| # | Title | Channel | Views | x median | Age | Length | Hook | Format | Deity | Art / cover |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | [बूढ़ी माँ की पुकार सुनकर खुद प्रकट हुईं माँ दुर्गा 😭🙏 / माँ की असीम ](https://youtube.com/shorts/Is6wfUsW4js) | BhaktiVerse 3D | 32.4 L | 1855.5 | 6.8 d | 44 s | emotional-motivational line | katha | devi | cinematic: glowing Durga in red-gold sari, golden light burs |
| 2 | [श्री राम जन्मभूमि अयोध्या का नजारा🚩/अयोध्या #trandingshorts #shorts #](https://youtube.com/shorts/6h2vU8m5iQw) | Bhakti Soothingly | 31.3 L | 957.8 | 7 d | 17 s | name / plain | darshan | ram | real-photo: drone shot of the lit temple at dusk, two-line D |
| 3 | [बागेश्वर महाराज के बयान पर मचा बवाल! राम जी के 5 पिता! शास्त्रों में म](https://youtube.com/shorts/Um4CHpY6rgA) | SARVESHWAR SHARAN  | 22.9 L | 869.8 | 4.9 d | 156 s | listicle | facts | ram | text-card: two speakers' photos side by side, Ram illustrati |
| 4 | [माता रानी का चमत्कार! 🙏❤️ #Shorts #navratri #durga #maa #ai #animatio](https://youtube.com/shorts/MDGMPRyzrEQ) | Bhakti Leela Dham | 25.2 L | 152.1 | 5.3 d | 21 s | संत / लोक देवता चमत्कार | katha | devi | cinematic: AI fantasy: white tiger, weeping crowned woman ov |
| 5 | [Krishna Teases Radha… But Gets HUMBLED! 😂💥 / Diwali Special #Shorts](https://youtube.com/shorts/UJlGvGrM7Ag) | @itsakshaya | 17.5 L | 23.8 | 6.9 d | 19 s | name / plain | katha | krishna | real-photo: woman in red-gold outfit lighting a diya on a ti |
| 6 | [मेरे तन में भी राम मेरे मन में भी राम, श्रीराम, जय श्रीराम, #ramjistat](https://youtube.com/shorts/Q1q2jkp31hg) | Rahul Panwar | 40.9 L | 20.9 | 6.9 d | 31 s | name / plain | loop | ram | murti-darshan: man with arms raised between Ram and Hanuman  |
| 7 | [एक राम भक्त की कहानी 🚩 जय श्री राम🚩🙏 #shorts #trend #jaishreeram #r](https://youtube.com/shorts/FTePfsHlDCU) | chandankumar098 | 11.0 L | 20.7 | 4.3 d | 7 s | name / plain | katha | ram | real-photo: pile of pale green and white foam blocks on a fo |
| 8 | [DIY Shri Ram $ well making with clay flower🌺#shorts#ytshorts#viral #v](https://youtube.com/shorts/ctxm8rDdpzc) | Bhakti Amrit (SK) | 39.9 L | 19.2 | 5.5 d | 49 s | name / plain | other | ram | cartoon-3d: 3D cartoon: child Ram and Hanuman at a stone wel |
| 9 | [एक राम भक्त की कहानी 🚩🙏 // जय श्री राम // राम नवम // राम जी स्टेटस /](https://youtube.com/shorts/Wzzo13ojPSE) | Adarsh Life 2.0 | 16.4 L | 15 | 1.5 d | 14 s | name / plain | katha | ram | real-photo: rural yard skit still: woman in pink tending a s |
| 10 | [श्री कृष्ण ऋषि उत्तंक को अमृत पिलाने का दिए आदेश🔥🙏🔥#कृष्ण #महाभारत ](https://youtube.com/shorts/d5L4N8OOcco) | Bhakti Drishayam 6.o | 20.1 L | 13.6 | 2.4 d | 61 s | name / plain | other | krishna | - |

### What's working

- 13 truly viral devotional Shorts in 7 days (>= 100k or 30k in 3 days, >= 5x their channel's median).
- Hooks: name / plain 9, listicle 2, emotional-motivational line 1, संत / लोक देवता चमत्कार 1.
- Formats: katha 6, other 3, facts 2, darshan 1; deities: ram 7, krishna 3, devi 2, shiv 1.
- Art: real-photo 4, cinematic 2, text-card 1, murti-darshan 1; length: <=30 s 7, 31-60 s 3, 121-180 s 2, 61-120 s 1.
- Best: "बूढ़ी माँ की पुकार सुनकर खुद प्रकट हुईं माँ दुर्गा 😭🙏 / मा" 32.4 L (1855.5x, emotional-motivational line); "श्री राम जन्मभूमि अयोध्या का नजारा🚩/अयोध्या #trandingshorts" 31.3 L (957.8x, name / plain); "बागेश्वर महाराज के बयान पर मचा बवाल! राम जी के 5 पिता! शास्त" 22.9 L (869.8x, listicle).
- New ideas in the banks (status "idea", citation to verify): facts:radar-bharat-paduka, facts:radar-navratri-kanya-poojan, kailash:radar-namak-kam-pyaar-zyada, pov:radar-ghamand-vinamrata.

### Consistently strong channels (median >= 40k: style to learn from, not outliers)

- Factorial xyz: "श्री राम के क्रोध से कांप उठा समुद्र! 🌊🙏 | रामायण की अद्भु" 6.3 L (channel median 7.1 L)
