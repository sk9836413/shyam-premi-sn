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
| 2 | [माता सीता ने बोली श्री राम जी से की मै आपकी दासी.!#motivationalvideo#p](https://youtube.com/shorts/w54Mdg1X2vs) | Ranita | 21.8 L | 1069 | 4.8 d | 31 s | emotional-motivational line | katha | ram | real-photo: TV-serial close-up of Ram with tilak and a soft  |
| 3 | [श्री राम जन्मभूमि अयोध्या का नजारा🚩/अयोध्या #trandingshorts #shorts #](https://youtube.com/shorts/6h2vU8m5iQw) | Bhakti Soothingly | 31.3 L | 957.8 | 7 d | 17 s | name / plain | darshan | ram | real-photo: drone shot of the lit temple at dusk, two-line D |
| 4 | [बागेश्वर महाराज के बयान पर मचा बवाल! राम जी के 5 पिता! शास्त्रों में म](https://youtube.com/shorts/Um4CHpY6rgA) | SARVESHWAR SHARAN  | 22.9 L | 869.8 | 4.9 d | 156 s | listicle | facts | ram | text-card: two speakers' photos side by side, Ram illustrati |
| 5 | [🌸❤️ Mata Rani Ki Pyari Si Muskaan  🙏❤️ #YouTube short#short feel #th](https://youtube.com/shorts/eA8QpQYgoUs) | The Family Funny | 65.4 L | 190.3 | 7.4 d | 21 s | name / plain | veer | devi | real-photo: three boys in yellow polos raising fists, Devana |
| 6 | [माता रानी का चमत्कार! 🙏❤️ #Shorts #navratri #durga #maa #ai #animatio](https://youtube.com/shorts/MDGMPRyzrEQ) | Bhakti Leela Dham | 25.2 L | 152.1 | 5.3 d | 21 s | संत / लोक देवता चमत्कार | katha | devi | cinematic: AI fantasy: white tiger, weeping crowned woman ov |
| 7 | [एक राम भक्त की कहनी 🚩🙏 // जय श्री राम // नवम // ye badi maggie h 🤣�](https://youtube.com/shorts/NK3H3jK6Dfw) | The kids fun  | 70.6 L | 87.7 | 6.5 d | 6 s | name / plain | other | ram | other: a noodle packet with cartoon arms and legs walking on |
| 8 | [The Emotional Reunion of Lord Ram and Bharat! 🙏 #facts](https://youtube.com/shorts/kKVfKK2z8sQ) | History Uncovered India | 29.1 L | 70.5 | 6.9 d | 157 s | emotional-motivational line | facts | ram | real-photo: TV-serial still of Bharat, face in the centre, o |
| 9 | [Mata Rani ki mahima 🥰 // Diwali special video 🪔❣️ // motivational st](https://youtube.com/shorts/_Mx_nfYh0xE) | Aradhya vlogs 005 | 14.9 L | 51.8 | 7.5 d | 60 s | emotional-motivational line | katha | devi | real-photo: girl in a white tee crying, holding a clay diya; |
| 10 | [When Lakshman Got Angry at Shri Ram! / Ramayan #facts](https://youtube.com/shorts/sKRbOVxfmUY) | History Uncovered India | 10.8 L | 26.2 | 2.4 d | 35 s | जब… | facts | ram | real-photo: TV-serial close-up of Lakshman looking angry, on |

### What's working

- 20 truly viral devotional Shorts in 7 days (>= 100k or 30k in 3 days, >= 5x their channel's median).
- Hooks: name / plain 11, emotional-motivational line 4, listicle 2, जब… 2.
- Formats: katha 8, other 5, facts 4, darshan 1; deities: ram 11, devi 4, krishna 4, shiv 1.
- Art: real-photo 9, cinematic 2, text-card 1, other 1; length: <=30 s 9, 31-60 s 6, 121-180 s 4, 61-120 s 1.
- Best: "बूढ़ी माँ की पुकार सुनकर खुद प्रकट हुईं माँ दुर्गा 😭🙏 / मा" 32.4 L (1855.5x, emotional-motivational line); "माता सीता ने बोली श्री राम जी से की मै आपकी दासी.!#motivatio" 21.8 L (1069x, emotional-motivational line); "श्री राम जन्मभूमि अयोध्या का नजारा🚩/अयोध्या #trandingshorts" 31.3 L (957.8x, name / plain).
- New ideas in the banks (status "idea", citation to verify): facts:radar-bharat-paduka, facts:radar-navratri-kanya-poojan, kailash:radar-namak-kam-pyaar-zyada, pov:radar-ghamand-vinamrata.

### Consistently strong channels (median >= 40k: style to learn from, not outliers)

- Voiceover By Dev: "Jai Shri Ram, Happy Diwali🪔❤️" 17.6 L (channel median 12.1 L)
- Chiku life vlogs: "एक राम भक्त की कहानी 🚩🙏🏼 || जय श्री राम || राम नवम || राम" 15.9 L (channel median 6.6 L)
- Factorial xyz: "श्री राम के क्रोध से कांप उठा समुद्र! 🌊🙏 | रामायण की अद्भु" 6.3 L (channel median 7.1 L)
