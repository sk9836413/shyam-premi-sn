# Viral Radar

Which devotional Shorts are TRULY viral in India each week, and why (scripts/viral-radar.mjs, workflow
.github/workflows/viral-radar.yml, owner 15 Nov 2026). Per-run data: automation/viral-radar/<date>.json.

- Filter: views >= 1.0 L (or >= 30k within 3 days) AND >= 5x the median of the
  channel's other recent Shorts (min 3); likely reuploads (tiny / new channel, random topics, spammy title) skipped.
- Quota: sweep (Monday) 8 searches ~838 units, other days 2 searches ~212 units;
  ~2110 units a week, never more than 900 a day (the project has 10,000/day shared with ~1,600 per upload).
- Ideas go into the banks as "status": "idea" with a citation to verify (`node scripts/topic-banks.mjs promote`).
  Our own words only: titles and scripts of other channels are never copied.

## Week of 2026-11-17

Runs: 2026-11-15 sweep, 2026-11-16 sweep, 2026-11-17 daily; quota used 1983 units (cap 900/day).

### Top 10 truly viral references

| # | Title | Channel | Views | x median | Age | Length | Hook | Format | Deity | Art / cover |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | [बूढ़ी माँ की पुकार सुनकर खुद प्रकट हुईं माँ दुर्गा 😭🙏 / माँ की असीम ](https://youtube.com/shorts/Is6wfUsW4js) | BhaktiVerse 3D | 32.4 L | 1855.5 | 6.8 d | 44 s | emotional-motivational line | katha | devi | cinematic: glowing Durga in red-gold sari, golden light burs |
| 2 | [बागेश्वर महाराज के बयान पर मचा बवाल! राम जी के 5 पिता! शास्त्रों में म](https://youtube.com/shorts/Um4CHpY6rgA) | SARVESHWAR SHARAN  | 25.8 L | 978.4 | 6.5 d | 156 s | listicle | other | ram | text-card: two speakers' photos, red text band 'श्रीराम के 5 |
| 3 | [श्री राम जन्मभूमि अयोध्या का नजारा🚩/अयोध्या #trandingshorts #shorts #](https://youtube.com/shorts/6h2vU8m5iQw) | Bhakti Soothingly | 31.3 L | 957.8 | 7 d | 17 s | name / plain | darshan | ram | real-photo: drone shot of the lit temple at dusk, two-line D |
| 4 | [जल में समा गईं माँ दुर्गा, भक्तों की आँखें हुईं नम 😢🙏 / जय माता दी �](https://youtube.com/shorts/cmbAxtdk4a8) | Manish  | 9.0 L | 876.2 | 6.4 d | 11 s | emotional-motivational line | other | devi | cinematic: AI Durga statue half in river, marigold, text ban |
| 5 | [जोड़ी हो तो ऐसी हो  / Jodi Ho To Aisi Ho / Radha Krishna Bhajan #short](https://youtube.com/shorts/8OKh9uSUeHg) | Aparna Dev Darshan  | 13.3 L | 796.7 | 4.7 d | 20 s | emotional-motivational line | loop | krishna | cartoon-3d: Radha and Krishna at a lotus pond with koi fish  |
| 6 | [माँ दुर्गा का जल में दिव्य मिलन 🙏😭 / विसर्जन का भावुक दृश्य / Jai Ma](https://youtube.com/shorts/J3bRy8f_lyw) | Manish  | 4.5 L | 440.3 | 5.9 d | 11 s | emotional-motivational line | other | devi | cinematic: AI Durga statues in water, marigold petals, cryin |
| 7 | [विसर्जन के बाद माँ दुर्गा की अनोखी कहानी 😢🌺 / माँ की विदाई का भावुक ](https://youtube.com/shorts/rqH7xW-Ir7E) | Manish  | 4.6 L | 352.1 | 6.9 d | 11 s | emotional-motivational line | katha | devi | cinematic: close-up of a crying Durga statue, red and gold,  |
| 8 | [आख़िर राधा रानी ने रुक्मिणी देवी को धूल क्यों दी? #shorts #radhakrishn](https://youtube.com/shorts/L6MHIoRvMYA) | AnantVerse | 8.3 L | 351.3 | 6.8 d | 178 s | 😱 क्यों? | facts | krishna | cinematic: single bridal portrait of a woman in red and gold |
| 9 | [500 वर्ष का बनवास जो बिताया है चलो अयोध्या श्री राम ने बुलाया है#jaysh](https://youtube.com/shorts/viy126XoFdM) | mmvines | 29.0 L | 212.3 | 4 d | 59 s | emotional-motivational line | other | ram | other: M and Z cookie letters floating over a road, a man ly |
| 10 | [माता रानी का चमत्कार! 🙏❤️ #Shorts #navratri #durga #maa #ai #animatio](https://youtube.com/shorts/MDGMPRyzrEQ) | Bhakti Leela Dham | 30.0 L | 181 | 6 d | 21 s | संत / लोक देवता चमत्कार | other | devi | cartoon-3d: dark tiger on the ground, crowned weeping goddes |

### What's working

- 50 truly viral devotional Shorts in 7 days (>= 100k or 30k in 3 days, >= 5x their channel's median).
- Hooks: name / plain 33, emotional-motivational line 10, listicle 2, 😱 क्यों? 2.
- Formats: other 23, katha 14, loop 6, facts 4; deities: ram 20, krishna 17, devi 6, hanuman 3.
- Art: cinematic 11, other 3, real-photo 2, cartoon-3d 2; length: <=30 s 34, 31-60 s 9, 121-180 s 6, 61-120 s 1.
- Best: "बूढ़ी माँ की पुकार सुनकर खुद प्रकट हुईं माँ दुर्गा 😭🙏 / मा" 32.4 L (1855.5x, emotional-motivational line); "बागेश्वर महाराज के बयान पर मचा बवाल! राम जी के 5 पिता! शास्त" 25.8 L (978.4x, listicle); "श्री राम जन्मभूमि अयोध्या का नजारा🚩/अयोध्या #trandingshorts" 31.3 L (957.8x, name / plain).
- New ideas in the banks (status "idea", citation to verify): facts:radar-bharat-paduka, facts:radar-navratri-kanya-poojan, kailash:radar-namak-kam-pyaar-zyada, pov:radar-ghamand-vinamrata, facts:radar-durga-visarjan-kyun, facts:radar-chunari-kyun, facts:radar-ram-samudra-baan, kailash:radar-ganesh-vidai-mata-roi, pov:radar-kuch-chhoot-jaye, facts:radar-hanuman-sankatmochan, facts:radar-lakshman-14-saal-jaagran, facts:radar-ganesh-modak-kyun, kailash:radar-modak-thaali-khaali, pov:radar-ananya-bhakti-yog-kshem.

### Consistently strong channels (median >= 40k: style to learn from, not outliers)

- Factorial xyz: "श्री राम के क्रोध से कांप उठा समुद्र! 🌊🙏 | रामायण की अद्भु" 6.3 L (channel median 7.1 L)
- Priyansh Shukla: "जब बाली ने खींची हनुमान जी की आधी शक्ति! 😱" 9.1 L (channel median 6.0 L)
- Rahul Panwar: "मेरे तन में भी राम मेरे मन में भी राम, जय श्रीराम, श्रीराम, " 5.3 L (channel median 2.0 L)

## Week of 2026-11-16

Runs: 2026-11-15 sweep, 2026-11-16 sweep; quota used 1729 units (cap 900/day).

### Top 10 truly viral references

| # | Title | Channel | Views | x median | Age | Length | Hook | Format | Deity | Art / cover |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | [बूढ़ी माँ की पुकार सुनकर खुद प्रकट हुईं माँ दुर्गा 😭🙏 / माँ की असीम ](https://youtube.com/shorts/Is6wfUsW4js) | BhaktiVerse 3D | 32.4 L | 1855.5 | 6.8 d | 44 s | emotional-motivational line | katha | devi | cinematic: glowing Durga in red-gold sari, golden light burs |
| 2 | [श्री राम जन्मभूमि अयोध्या का नजारा🚩/अयोध्या #trandingshorts #shorts #](https://youtube.com/shorts/6h2vU8m5iQw) | Bhakti Soothingly | 31.3 L | 957.8 | 7 d | 17 s | name / plain | darshan | ram | real-photo: drone shot of the lit temple at dusk, two-line D |
| 3 | [बागेश्वर महाराज के बयान पर मचा बवाल! राम जी के 5 पिता! शास्त्रों में म](https://youtube.com/shorts/Um4CHpY6rgA) | SARVESHWAR SHARAN  | 24.3 L | 923.3 | 5.5 d | 156 s | other question | other | ram | text-card: 2 real photos of speakers, Ram illustration, 3 te |
| 4 | [जल में समा गईं माँ दुर्गा, भक्तों की आँखें हुईं नम 😢🙏 / जय माता दी �](https://youtube.com/shorts/cmbAxtdk4a8) | Manish  | 9.0 L | 876.2 | 6.4 d | 11 s | emotional-motivational line | other | devi | cinematic: AI Durga statue half in river, marigold, text ban |
| 5 | [जोड़ी हो तो ऐसी हो  / Jodi Ho To Aisi Ho / Radha Krishna Bhajan #short](https://youtube.com/shorts/8OKh9uSUeHg) | Aparna Dev Darshan  | 10.4 L | 620.8 | 3.7 d | 20 s | name / plain | loop | krishna | cartoon-3d: AI Radha-Krishna by a lotus pond with koi and a  |
| 6 | [माँ दुर्गा का जल में दिव्य मिलन 🙏😭 / विसर्जन का भावुक दृश्य / Jai Ma](https://youtube.com/shorts/J3bRy8f_lyw) | Manish  | 4.5 L | 440.3 | 5.9 d | 11 s | emotional-motivational line | other | devi | cinematic: AI Durga statues in water, marigold petals, cryin |
| 7 | [विसर्जन के बाद माँ दुर्गा की अनोखी कहानी 😢🌺 / माँ की विदाई का भावुक ](https://youtube.com/shorts/rqH7xW-Ir7E) | Manish  | 4.6 L | 352.1 | 6.9 d | 11 s | emotional-motivational line | katha | devi | cinematic: close-up of a crying Durga statue, red and gold,  |
| 8 | [माता रानी का चमत्कार! 🙏❤️ #Shorts #navratri #durga #maa #ai #animatio](https://youtube.com/shorts/MDGMPRyzrEQ) | Bhakti Leela Dham | 30.0 L | 181 | 6 d | 21 s | संत / लोक देवता चमत्कार | other | devi | cartoon-3d: dark tiger on the ground, crowned weeping goddes |
| 9 | [500 वर्ष का बनवास जो बिताया है चलो अयोध्या श्री राम ने बुलाया है#jaysh](https://youtube.com/shorts/viy126XoFdM) | mmvines | 15.4 L | 113.2 | 3 d | 59 s | emotional-motivational line | other | ram | other: unrelated stunt: a man lying on a road, giant cookie  |
| 10 | [राधा की तमन्ना🙏🏻#radhakrishna #status #krishnastatus#ytshorts #bhaja](https://youtube.com/shorts/_AvicfDlCs0) | Reena Desi jaatni  | 9.1 L | 45 | 5 d | 11 s | name / plain | loop | krishna | cinematic: AI Krishna pouring water for Radha, diyas and pet |

### What's working

- 34 truly viral devotional Shorts in 7 days (>= 100k or 30k in 3 days, >= 5x their channel's median).
- Hooks: name / plain 22, emotional-motivational line 7, other question 1, संत / लोक देवता चमत्कार 1.
- Formats: other 15, katha 11, loop 4, facts 2; deities: ram 14, krishna 11, devi 6, shiv 2.
- Art: cinematic 8, other 3, real-photo 2, cartoon-3d 2; length: <=30 s 22, 31-60 s 6, 121-180 s 5, 61-120 s 1.
- Best: "बूढ़ी माँ की पुकार सुनकर खुद प्रकट हुईं माँ दुर्गा 😭🙏 / मा" 32.4 L (1855.5x, emotional-motivational line); "श्री राम जन्मभूमि अयोध्या का नजारा🚩/अयोध्या #trandingshorts" 31.3 L (957.8x, name / plain); "बागेश्वर महाराज के बयान पर मचा बवाल! राम जी के 5 पिता! शास्त" 24.3 L (923.3x, other question).
- New ideas in the banks (status "idea", citation to verify): facts:radar-bharat-paduka, facts:radar-navratri-kanya-poojan, kailash:radar-namak-kam-pyaar-zyada, pov:radar-ghamand-vinamrata, facts:radar-durga-visarjan-kyun, facts:radar-chunari-kyun, facts:radar-ram-samudra-baan, kailash:radar-ganesh-vidai-mata-roi, pov:radar-kuch-chhoot-jaye.

### Consistently strong channels (median >= 40k: style to learn from, not outliers)

- Factorial xyz: "श्री राम के क्रोध से कांप उठा समुद्र! 🌊🙏 | रामायण की अद्भु" 6.3 L (channel median 7.1 L)
- Priyansh Shukla: "जब बाली ने खींची हनुमान जी की आधी शक्ति! 😱" 9.1 L (channel median 6.0 L)

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
