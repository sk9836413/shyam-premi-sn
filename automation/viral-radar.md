# Viral Radar

Which devotional Shorts are TRULY viral in India each week, and why (scripts/viral-radar.mjs, workflow
.github/workflows/viral-radar.yml, owner 15 Nov 2026). Per-run data: automation/viral-radar/<date>.json.

- Filter: views >= 1.0 L (or >= 30k within 3 days) AND >= 5x the median of the
  channel's other recent Shorts (min 3); likely reuploads (tiny / new channel, random topics, spammy title) skipped.
- Quota: sweep (Monday) 8 searches ~838 units, other days 2 searches ~212 units;
  ~2110 units a week, never more than 900 a day (the project has 10,000/day shared with ~1,600 per upload).
- Ideas go into the banks as "status": "idea" with a citation to verify (`node scripts/topic-banks.mjs promote`).
  Our own words only: titles and scripts of other channels are never copied.

## Week of 2026-11-25

Runs: 2026-11-19 daily, 2026-11-20 daily, 2026-11-21 daily, 2026-11-22 daily, 2026-11-23 sweep, 2026-11-24 daily, 2026-11-25 daily; quota used 2341 units (cap 900/day).

### Top 10 truly viral references

| # | Title | Channel | Views | x median | Age | Length | Hook | Format | Deity | Art / cover |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | [जटायु से भी 10 गुना शक्तिशाली था संपाति! 😱](https://youtube.com/shorts/icIBvvOfw-Y) | PS creation cartoon | 22.5 L | 3781.5 | 5.8 d | 176 s | रहस्य / secret | katha | ram | illustrated: giant AI eagle close-up, Hanuman group pointing |
| 2 | [लक्ष्मण 14 साल तक क्यों नहीं सोए? 😱 उर्मिला ने किया था सबसे बड़ा त्या](https://youtube.com/shorts/RJLRkvY-AdM) | Ulta Gyann | 11.9 L | 1488.5 | 5.7 d | 122 s | 😱 क्यों? | facts | ram | illustrated: Lakshman asleep under a tree, Ram by the river  |
| 3 | [विष्णु जी का सिर कैसे कटा? 😱 हयग्रीव अवतार का रहस्य / #shorts](https://youtube.com/shorts/uJqsVTdch7Y) | BHAKTI FACTS | 21.6 L | 1146.5 | 6.8 d | 169 s | strange visual ("X क्या कर रहे हैं? 😱") | facts | vishnu | cinematic: blue deity body on cracked ground, head lying apa |
| 4 | [रामायण रहस्य #spiritualawarness #spirituality #shortsfeed](https://youtube.com/shorts/v6Ygkxtn_BI) | अरुण कुमार शर्मा काशी | 15.4 L | 957.3 | 6.1 d | 80 s | रहस्य / secret | facts | ram | cinematic: seated blue deity flanked by 3 figures, Shesh naa |
| 5 | [कैलाश में छिपा था महादेव का सबसे बड़ा रहस्य! 😱 आखिर कौन था गद्दार?](https://youtube.com/shorts/7Ct4NJCXeAg) | दिव्य कथा स्टूडियो | 12.8 L | 760.9 | 6.9 d | 65 s | रहस्य / secret | kailash | shiv | cinematic: Shiv, Parvati and Ganesh around a glowing blue po |
| 6 | [रामायण के अनसुने किस्से 🙏🚩 / जानिए ऐसी बातें जो बहुत कम लोग जानते है](https://youtube.com/shorts/kbykUAvmivY) | Simee Kaur | 8.4 L | 752.4 | 5.1 d | 122 s | रहस्य / secret | facts | ram | illustrated: dim palace hall, seated sage, red 'Jai Shri Ram |
| 7 | [जब रावण और हनुमान जी के बीच हुआ एक मुक्के का युद्ध! जानिए किसमें था सब](https://youtube.com/shorts/kW97Vejt1Gk) | Mr India& Bharat  | 12.5 L | 626.2 | 6.7 d | 171 s | जब… | facts | hanuman | cinematic: seated Hanuman in meditation at a temple with a f |
| 8 | [sheru bhai 🆚 Mahadev 🔱🦁महादेव के भक्त और शेरू भाई के फैन कमेंट जरूर](https://youtube.com/shorts/_Qo8Ot0yZSo) | Mayna Patra | 28.4 L | 613.6 | 4.7 d | 54 s | name / plain | other | shiv | illustrated: versus frame: Sheru on a throne vs Mahadev, 2 t |
| 9 | [माता सीता का सिंदूर देखकर हनुमान जी ने किया ऐसा काम 😍🚩 / Jai Shree R](https://youtube.com/shorts/Vss7DIJ35QI) | kattarhindusanatandharm-ram | 11.7 L | 602.8 | 2.6 d | 25 s | फिर … ने जो किया… | katha | hanuman | cinematic: close-up Hanuman, sindoor pouring down his chest  |
| 10 | [कौन है असली पार्वती? 😱 महादेव भी हुए हैरान! 🔱🕉️#mahadev #mataparvat](https://youtube.com/shorts/fjwraQhby3Y) | priyanshi  | 13.7 L | 560 | 6.5 d | 33 s | other question | kailash | shiv | cinematic: close-up bridal Parvati with folded hands, Shiv b |

### What's working

- 143 truly viral devotional Shorts in 7 days (>= 100k or 30k in 3 days, >= 5x their channel's median).
- Hooks: name / plain 68, रहस्य / secret 14, strange visual ("X क्या कर रहे हैं? 😱") 9, 😱 क्यों? 8.
- Formats: other 65, facts 32, katha 14, loop 10; deities: shiv 40, hanuman 25, devi 23, krishna 17.
- Art: cinematic 27, real-photo 14, illustrated 12, murti-darshan 4; length: <=30 s 60, 31-60 s 37, 121-180 s 30, 61-120 s 16.
- Best: "जटायु से भी 10 गुना शक्तिशाली था संपाति! 😱" 22.5 L (3781.5x, रहस्य / secret); "लक्ष्मण 14 साल तक क्यों नहीं सोए? 😱 उर्मिला ने किया था सबसे" 11.9 L (1488.5x, 😱 क्यों?); "विष्णु जी का सिर कैसे कटा? 😱 हयग्रीव अवतार का रहस्य / #shor" 21.6 L (1146.5x, strange visual ("X क्या कर रहे हैं? 😱")).
- New ideas in the banks (status "idea", citation to verify): facts:radar-samundra-shivling, facts:radar-ravan-shivling-baidyanath, facts:radar-garuda-garbh-vachan, kailash:radar-kamandal-jal-kam, pov:radar-sach-ki-gawahi, facts:radar-vibhishan-lanka-raaj, facts:radar-hanuman-poonch-aag, facts:radar-karn-kavach-kundal, kailash:radar-jhoola-toota, pov:radar-galti-kshama, facts:radar-sheesh-yudh-dekha, facts:radar-shiv-tulsi-nahi, kailash:radar-darpan-kho-gaya, pov:radar-dhokha-dhairya, facts:radar-hanuman-musthi-ravan, facts:radar-krishna-makhan-chor, facts:radar-krishna-bansuri-bans, kailash:radar-mehndi-rang-halka, pov:radar-pehli-roti-gau, facts:radar-andhak-janm, facts:radar-kali-krodh-shiv, facts:radar-vidur-neeti, kailash:radar-der-se-ghar-aaye, pov:radar-jalan-shant, facts:radar-khatu-lakhdatar, facts:radar-shiv-sharabh-roop, facts:radar-hanuman-sanjeevani-pahad, kailash:radar-chudiyan-gayab, pov:radar-mandir-na-ja-paaye, facts:radar-trimbak-teen-mukh, facts:radar-angarmoti-naam, kailash:radar-chhata-kisne-liya, pov:radar-line-dhairya.

### Consistently strong channels (median >= 40k: style to learn from, not outliers)

- Learn With Vishu: "मरने के बाद पहली रात आत्मा कहाँ होती है? 😳 गरुड़ पुराण का र" 4.1 L (channel median 2.6 L)
- CG Hindi Fact: "देवरानी-जेठानी मंदिर का रहस्य! जीव-जंतुओं से बनी भगवान शिव क" 1.4 L (channel median 44k)
- Dharmik Yatra vlog1M: "नीलकंठ महादेव का गुप्त रहस्य🚩 |समुद्र मंथन का वो विष महादेव" 38k (channel median 48k)
- Factorial xyz: "श्री राम के क्रोध से कांप उठा समुद्र! 🌊🙏 | रामायण की अद्भु" 17.8 L (channel median 7.1 L)
- Priyansh Shukla: "भीष्म पितामह ने श्री कृष्ण की प्रतिज्ञा कैसे तुड़वाई? 😱 #fac" 6.6 L (channel median 7.3 L)
-  Raw Talks With Anaya
: "महाभारत के युद्ध में मारे गए थे 1 अरब 66 करोड़ योद्धा? 😱 | " 1.5 L (channel median 53k)
- Mister Virat Kumar Subhash Chandra Bose: "महादेव ने क्यों कहा, सोना-चांदी नहीं, बांस ही सबसे पवित्र है" 13.7 L (channel median 6.1 L)
- Priti Verma: "आखिर महादेव का सारा खाना किसने खाया😡😂 #mahadev #shivparvat" 7.3 L (channel median 1.7 L)

## Week of 2026-11-24

Runs: 2026-11-18 daily, 2026-11-19 daily, 2026-11-20 daily, 2026-11-21 daily, 2026-11-22 daily, 2026-11-23 sweep, 2026-11-24 daily; quota used 2367 units (cap 900/day).

### Top 10 truly viral references

| # | Title | Channel | Views | x median | Age | Length | Hook | Format | Deity | Art / cover |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | [जटायु से भी 10 गुना शक्तिशाली था संपाति! 😱](https://youtube.com/shorts/icIBvvOfw-Y) | PS creation cartoon | 22.5 L | 3781.5 | 5.8 d | 176 s | रहस्य / secret | katha | ram | illustrated: giant AI eagle close-up, Hanuman group pointing |
| 2 | [लक्ष्मण 14 साल तक क्यों नहीं सोए? 😱 उर्मिला ने किया था सबसे बड़ा त्या](https://youtube.com/shorts/RJLRkvY-AdM) | Ulta Gyann | 11.9 L | 1488.5 | 5.7 d | 122 s | 😱 क्यों? | facts | ram | illustrated: Lakshman asleep under a tree, Ram by the river  |
| 3 | [विष्णु जी का सिर कैसे कटा? 😱 हयग्रीव अवतार का रहस्य / #shorts](https://youtube.com/shorts/uJqsVTdch7Y) | BHAKTI FACTS | 21.6 L | 1146.5 | 6.8 d | 169 s | strange visual ("X क्या कर रहे हैं? 😱") | facts | vishnu | cinematic: blue deity body on cracked ground, head lying apa |
| 4 | [रामायण रहस्य #spiritualawarness #spirituality #shortsfeed](https://youtube.com/shorts/v6Ygkxtn_BI) | अरुण कुमार शर्मा काशी | 15.4 L | 957.3 | 6.1 d | 80 s | रहस्य / secret | facts | ram | cinematic: seated blue deity flanked by 3 figures, Shesh naa |
| 5 | [🌺#माँ दुर्गा की अंतिम विदाई 🙏 / नम आँखों से भक्तों ने दी माँ को विदा](https://youtube.com/shorts/m-pAzJqfVS0) | Benny Bhalchanra | 10.6 L | 855.9 | 6.1 d | 11 s | emotional-motivational line | other | devi | cinematic: Durga idol on a float in the sea, crying devotees |
| 6 | [रामायण के अनसुने किस्से 🙏🚩 / जानिए ऐसी बातें जो बहुत कम लोग जानते है](https://youtube.com/shorts/kbykUAvmivY) | Simee Kaur | 8.4 L | 752.4 | 5.1 d | 122 s | रहस्य / secret | facts | ram | illustrated: dim palace hall, seated sage, red 'Jai Shri Ram |
| 7 | [कैलाश में छिपा था महादेव का सबसे बड़ा रहस्य! 😱 आखिर कौन था गद्दार?](https://youtube.com/shorts/7Ct4NJCXeAg) | दिव्य कथा स्टूडियो | 10.9 L | 648.1 | 4.9 d | 65 s | रहस्य / secret | kailash | shiv | cinematic: alarmed Parvati, Shiv and Bal Ganesh, glowing blu |
| 8 | [जब रावण और हनुमान जी के बीच हुआ एक मुक्के का युद्ध! जानिए किसमें था सब](https://youtube.com/shorts/kW97Vejt1Gk) | Mr India& Bharat  | 12.5 L | 626.2 | 6.7 d | 171 s | जब… | facts | hanuman | cinematic: seated Hanuman in meditation at a temple with a f |
| 9 | [sheru bhai 🆚 Mahadev 🔱🦁महादेव के भक्त और शेरू भाई के फैन कमेंट जरूर](https://youtube.com/shorts/_Qo8Ot0yZSo) | Mayna Patra | 28.4 L | 613.6 | 4.7 d | 54 s | name / plain | other | shiv | illustrated: versus frame: Sheru on a throne vs Mahadev, 2 t |
| 10 | [माता सीता का सिंदूर देखकर हनुमान जी ने किया ऐसा काम 😍🚩 / Jai Shree R](https://youtube.com/shorts/Vss7DIJ35QI) | kattarhindusanatandharm-ram | 11.7 L | 602.8 | 2.6 d | 25 s | फिर … ने जो किया… | katha | hanuman | cinematic: close-up Hanuman, sindoor pouring down his chest  |

### What's working

- 155 truly viral devotional Shorts in 7 days (>= 100k or 30k in 3 days, >= 5x their channel's median).
- Hooks: name / plain 77, रहस्य / secret 13, 😱 क्यों? 9, strange visual ("X क्या कर रहे हैं? 😱") 9.
- Formats: other 75, facts 32, katha 13, loop 12; deities: shiv 40, devi 34, hanuman 25, krishna 17.
- Art: cinematic 32, real-photo 16, illustrated 10, murti-darshan 7; length: <=30 s 68, 31-60 s 42, 121-180 s 29, 61-120 s 16.
- Best: "जटायु से भी 10 गुना शक्तिशाली था संपाति! 😱" 22.5 L (3781.5x, रहस्य / secret); "लक्ष्मण 14 साल तक क्यों नहीं सोए? 😱 उर्मिला ने किया था सबसे" 11.9 L (1488.5x, 😱 क्यों?); "विष्णु जी का सिर कैसे कटा? 😱 हयग्रीव अवतार का रहस्य / #shor" 21.6 L (1146.5x, strange visual ("X क्या कर रहे हैं? 😱")).
- New ideas in the banks (status "idea", citation to verify): facts:radar-murti-visarjan-jal, facts:radar-akshat-kyun-chadhate, facts:radar-aruna-bina-pair, kailash:radar-akshat-gayab, pov:radar-visarjan-main-kahin-nahi, facts:radar-samundra-shivling, facts:radar-ravan-shivling-baidyanath, facts:radar-garuda-garbh-vachan, kailash:radar-kamandal-jal-kam, pov:radar-sach-ki-gawahi, facts:radar-vibhishan-lanka-raaj, facts:radar-hanuman-poonch-aag, facts:radar-karn-kavach-kundal, kailash:radar-jhoola-toota, pov:radar-galti-kshama, facts:radar-sheesh-yudh-dekha, facts:radar-shiv-tulsi-nahi, kailash:radar-darpan-kho-gaya, pov:radar-dhokha-dhairya, facts:radar-hanuman-musthi-ravan, facts:radar-krishna-makhan-chor, facts:radar-krishna-bansuri-bans, kailash:radar-mehndi-rang-halka, pov:radar-pehli-roti-gau, facts:radar-andhak-janm, facts:radar-kali-krodh-shiv, facts:radar-vidur-neeti, kailash:radar-der-se-ghar-aaye, pov:radar-jalan-shant, facts:radar-khatu-lakhdatar, facts:radar-shiv-sharabh-roop, facts:radar-hanuman-sanjeevani-pahad, kailash:radar-chudiyan-gayab, pov:radar-mandir-na-ja-paaye.

### Consistently strong channels (median >= 40k: style to learn from, not outliers)

- Priyansh Shukla: "जब बाली ने खींची हनुमान जी की आधी शक्ति! 😱" 16.0 L (channel median 6.0 L)
- Mister Virat Kumar Subhash Chandra Bose: "रावण, जो कैलाश उठा सकता था, उसे एक देवी ने पैर के अंगूठे से " 8.7 L (channel median 5.0 L)
- Learn With Vishu: "मरने के बाद पहली रात आत्मा कहाँ होती है? 😳 गरुड़ पुराण का र" 4.1 L (channel median 2.6 L)
- CG Hindi Fact: "देवरानी-जेठानी मंदिर का रहस्य! जीव-जंतुओं से बनी भगवान शिव क" 1.4 L (channel median 44k)
- Dharmik Yatra vlog1M: "नीलकंठ महादेव का गुप्त रहस्य🚩 |समुद्र मंथन का वो विष महादेव" 38k (channel median 48k)
- Factorial xyz: "श्री राम के क्रोध से कांप उठा समुद्र! 🌊🙏 | रामायण की अद्भु" 17.8 L (channel median 7.1 L)
-  Raw Talks With Anaya
: "महाभारत के युद्ध में मारे गए थे 1 अरब 66 करोड़ योद्धा? 😱 | " 1.5 L (channel median 53k)
- Priti Verma: "आखिर महादेव का सारा खाना किसने खाया😡😂 #mahadev #shivparvat" 7.3 L (channel median 1.7 L)

## Week of 2026-11-23

Runs: 2026-11-17 daily, 2026-11-18 daily, 2026-11-19 daily, 2026-11-20 daily, 2026-11-21 daily, 2026-11-22 daily, 2026-11-23 sweep; quota used 2367 units (cap 900/day).

### Top 10 truly viral references

| # | Title | Channel | Views | x median | Age | Length | Hook | Format | Deity | Art / cover |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | [जटायु से भी 10 गुना शक्तिशाली था संपाति! 😱](https://youtube.com/shorts/icIBvvOfw-Y) | PS creation cartoon | 22.5 L | 3781.5 | 5.8 d | 176 s | रहस्य / secret | katha | ram | illustrated: giant AI eagle close-up, Hanuman group pointing |
| 2 | [लक्ष्मण 14 साल तक क्यों नहीं सोए? 😱 उर्मिला ने किया था सबसे बड़ा त्या](https://youtube.com/shorts/RJLRkvY-AdM) | Ulta Gyann | 11.9 L | 1488.5 | 5.7 d | 122 s | 😱 क्यों? | facts | ram | illustrated: Lakshman asleep under a tree, Ram by the river  |
| 3 | [बागेश्वर महाराज के बयान पर मचा बवाल! राम जी के 5 पिता! शास्त्रों में म](https://youtube.com/shorts/Um4CHpY6rgA) | SARVESHWAR SHARAN  | 25.8 L | 978.4 | 6.5 d | 156 s | listicle | other | ram | text-card: two speakers' photos, red text band 'श्रीराम के 5 |
| 4 | [रामायण रहस्य #spiritualawarness #spirituality #shortsfeed](https://youtube.com/shorts/v6Ygkxtn_BI) | अरुण कुमार शर्मा काशी | 15.4 L | 957.3 | 6.1 d | 80 s | रहस्य / secret | facts | ram | cinematic: seated blue deity flanked by 3 figures, Shesh naa |
| 5 | [🌺#माँ दुर्गा की अंतिम विदाई 🙏 / नम आँखों से भक्तों ने दी माँ को विदा](https://youtube.com/shorts/m-pAzJqfVS0) | Benny Bhalchanra | 10.6 L | 855.9 | 6.1 d | 11 s | emotional-motivational line | other | devi | cinematic: Durga idol on a float in the sea, crying devotees |
| 6 | [जोड़ी हो तो ऐसी हो  / Jodi Ho To Aisi Ho / Radha Krishna Bhajan #short](https://youtube.com/shorts/8OKh9uSUeHg) | Aparna Dev Darshan  | 13.3 L | 796.7 | 4.7 d | 20 s | emotional-motivational line | loop | krishna | cartoon-3d: Radha and Krishna at a lotus pond with koi fish  |
| 7 | [रामायण के अनसुने किस्से 🙏🚩 / जानिए ऐसी बातें जो बहुत कम लोग जानते है](https://youtube.com/shorts/kbykUAvmivY) | Simee Kaur | 8.4 L | 752.4 | 5.1 d | 122 s | रहस्य / secret | facts | ram | illustrated: dim palace hall, seated sage, red 'Jai Shri Ram |
| 8 | [कैलाश में छिपा था महादेव का सबसे बड़ा रहस्य! 😱 आखिर कौन था गद्दार?](https://youtube.com/shorts/7Ct4NJCXeAg) | दिव्य कथा स्टूडियो | 10.9 L | 648.1 | 4.9 d | 65 s | रहस्य / secret | kailash | shiv | cinematic: alarmed Parvati, Shiv and Bal Ganesh, glowing blu |
| 9 | [जब रावण और हनुमान जी के बीच हुआ एक मुक्के का युद्ध! जानिए किसमें था सब](https://youtube.com/shorts/kW97Vejt1Gk) | Mr India& Bharat  | 12.5 L | 626.2 | 6.7 d | 171 s | जब… | facts | hanuman | cinematic: seated Hanuman in meditation at a temple with a f |
| 10 | [sheru bhai 🆚 Mahadev 🔱🦁महादेव के भक्त और शेरू भाई के फैन कमेंट जरूर](https://youtube.com/shorts/_Qo8Ot0yZSo) | Mayna Patra | 28.4 L | 613.6 | 4.7 d | 54 s | name / plain | other | shiv | illustrated: versus frame: Sheru on a throne vs Mahadev, 2 t |

### What's working

- 162 truly viral devotional Shorts in 7 days (>= 100k or 30k in 3 days, >= 5x their channel's median).
- Hooks: name / plain 93, रहस्य / secret 13, emotional-motivational line 10, 😱 क्यों? 8.
- Formats: other 72, facts 29, katha 23, loop 16; deities: shiv 41, ram 30, hanuman 28, krishna 27.
- Art: cinematic 31, real-photo 11, illustrated 9, cartoon-3d 5; length: <=30 s 78, 31-60 s 42, 121-180 s 26, 61-120 s 16.
- Best: "जटायु से भी 10 गुना शक्तिशाली था संपाति! 😱" 22.5 L (3781.5x, रहस्य / secret); "लक्ष्मण 14 साल तक क्यों नहीं सोए? 😱 उर्मिला ने किया था सबसे" 11.9 L (1488.5x, 😱 क्यों?); "बागेश्वर महाराज के बयान पर मचा बवाल! राम जी के 5 पिता! शास्त" 25.8 L (978.4x, listicle).
- New ideas in the banks (status "idea", citation to verify): facts:radar-hanuman-sankatmochan, facts:radar-lakshman-14-saal-jaagran, facts:radar-ganesh-modak-kyun, kailash:radar-modak-thaali-khaali, pov:radar-ananya-bhakti-yog-kshem, facts:radar-murti-visarjan-jal, facts:radar-akshat-kyun-chadhate, facts:radar-aruna-bina-pair, kailash:radar-akshat-gayab, pov:radar-visarjan-main-kahin-nahi, facts:radar-samundra-shivling, facts:radar-ravan-shivling-baidyanath, facts:radar-garuda-garbh-vachan, kailash:radar-kamandal-jal-kam, pov:radar-sach-ki-gawahi, facts:radar-vibhishan-lanka-raaj, facts:radar-hanuman-poonch-aag, facts:radar-karn-kavach-kundal, kailash:radar-jhoola-toota, pov:radar-galti-kshama, facts:radar-sheesh-yudh-dekha, facts:radar-shiv-tulsi-nahi, kailash:radar-darpan-kho-gaya, pov:radar-dhokha-dhairya, facts:radar-hanuman-musthi-ravan, facts:radar-krishna-makhan-chor, facts:radar-krishna-bansuri-bans, kailash:radar-mehndi-rang-halka, pov:radar-pehli-roti-gau, facts:radar-andhak-janm, facts:radar-kali-krodh-shiv, facts:radar-vidur-neeti, kailash:radar-der-se-ghar-aaye, pov:radar-jalan-shant.

### Consistently strong channels (median >= 40k: style to learn from, not outliers)

- Factorial xyz: "श्री राम के क्रोध से कांप उठा समुद्र! 🌊🙏 | रामायण की अद्भु" 9.7 L (channel median 7.1 L)
- Rahul Panwar: "मेरे तन में भी राम मेरे मन में भी राम, जय श्रीराम, श्रीराम, " 5.3 L (channel median 2.0 L)
- Priyansh Shukla: "जब बाली ने खींची हनुमान जी की आधी शक्ति! 😱" 16.0 L (channel median 6.0 L)
- Mister Virat Kumar Subhash Chandra Bose: "रावण, जो कैलाश उठा सकता था, उसे एक देवी ने पैर के अंगूठे से " 8.7 L (channel median 5.0 L)
- Learn With Vishu: "मरने के बाद पहली रात आत्मा कहाँ होती है? 😳 गरुड़ पुराण का र" 4.1 L (channel median 2.6 L)
- CG Hindi Fact: "देवरानी-जेठानी मंदिर का रहस्य! जीव-जंतुओं से बनी भगवान शिव क" 1.4 L (channel median 44k)
- Dharmik Yatra vlog1M: "नीलकंठ महादेव का गुप्त रहस्य🚩 |समुद्र मंथन का वो विष महादेव" 38k (channel median 48k)
-  Raw Talks With Anaya
: "महाभारत के युद्ध में मारे गए थे 1 अरब 66 करोड़ योद्धा? 😱 | " 1.5 L (channel median 53k)

## Week of 2026-11-22

Runs: 2026-11-16 sweep, 2026-11-17 daily, 2026-11-18 daily, 2026-11-19 daily, 2026-11-20 daily, 2026-11-21 daily, 2026-11-22 daily; quota used 2366 units (cap 900/day).

### Top 10 truly viral references

| # | Title | Channel | Views | x median | Age | Length | Hook | Format | Deity | Art / cover |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | [जटायु से भी 10 गुना शक्तिशाली था संपाति! 😱](https://youtube.com/shorts/icIBvvOfw-Y) | PS creation cartoon | 22.5 L | 3781.5 | 5.8 d | 176 s | रहस्य / secret | katha | ram | illustrated: giant AI eagle close-up, Hanuman group pointing |
| 2 | [बागेश्वर महाराज के बयान पर मचा बवाल! राम जी के 5 पिता! शास्त्रों में म](https://youtube.com/shorts/Um4CHpY6rgA) | SARVESHWAR SHARAN  | 25.8 L | 978.4 | 6.5 d | 156 s | listicle | other | ram | text-card: two speakers' photos, red text band 'श्रीराम के 5 |
| 3 | [जल में समा गईं माँ दुर्गा, भक्तों की आँखें हुईं नम 😢🙏 / जय माता दी �](https://youtube.com/shorts/cmbAxtdk4a8) | Manish  | 9.0 L | 876.2 | 6.4 d | 11 s | emotional-motivational line | other | devi | cinematic: AI Durga statue half in river, marigold, text ban |
| 4 | [🌺#माँ दुर्गा की अंतिम विदाई 🙏 / नम आँखों से भक्तों ने दी माँ को विदा](https://youtube.com/shorts/m-pAzJqfVS0) | Benny Bhalchanra | 10.6 L | 855.9 | 6.1 d | 11 s | emotional-motivational line | other | devi | cinematic: Durga idol on a float in the sea, crying devotees |
| 5 | [जोड़ी हो तो ऐसी हो  / Jodi Ho To Aisi Ho / Radha Krishna Bhajan #short](https://youtube.com/shorts/8OKh9uSUeHg) | Aparna Dev Darshan  | 13.3 L | 796.7 | 4.7 d | 20 s | emotional-motivational line | loop | krishna | cartoon-3d: Radha and Krishna at a lotus pond with koi fish  |
| 6 | [रामायण के अनसुने किस्से 🙏🚩 / जानिए ऐसी बातें जो बहुत कम लोग जानते है](https://youtube.com/shorts/kbykUAvmivY) | Simee Kaur | 8.4 L | 752.4 | 5.1 d | 122 s | रहस्य / secret | facts | ram | illustrated: dim palace hall, seated sage, red 'Jai Shri Ram |
| 7 | [माता सीता का सिंदूर देखकर हनुमान जी ने किया ऐसा काम 😍🚩 / Jai Shree R](https://youtube.com/shorts/Vss7DIJ35QI) | kattarhindusanatandharm-ram | 11.7 L | 602.8 | 2.6 d | 25 s | फिर … ने जो किया… | katha | hanuman | cinematic: close-up Hanuman, sindoor pouring down his chest  |
| 8 | [हनुमान चालीसा🙏#hanuman #shorts #bhakti #shreeram](https://youtube.com/shorts/5nCGy7sKjYw) | Aarohi | 10.8 L | 544.3 | 1 d | 10 s | name / plain | loop | hanuman | cinematic: Ram with bow and child Hanuman on a motorbike, st |
| 9 | [जब रावण और हनुमान जी के बीच हुआ एक मुक्के का युद्ध! जानिए किसमें था सब](https://youtube.com/shorts/kW97Vejt1Gk) | Mr India& Bharat  | 10.7 L | 534.4 | 5.7 d | 171 s | जब… | facts | hanuman | cinematic: calm seated Hanuman before a temple lamp, no figh |
| 10 | [हनुमान चालीसा संपूर्ण ❤️🙏#viral #sanatandharma #shorts #trending #baj](https://youtube.com/shorts/dC8BqrPHTSE) | Radhe Radhe ji@459 | 10.3 L | 519.9 | 6.5 d | 21 s | name / plain | loop | hanuman | cinematic: Hanuman underwater facing a snapping sea creature |

### What's working

- 143 truly viral devotional Shorts in 7 days (>= 100k or 30k in 3 days, >= 5x their channel's median).
- Hooks: name / plain 78, emotional-motivational line 15, रहस्य / secret 11, जब… 8.
- Formats: other 67, katha 26, facts 21, loop 17; deities: krishna 31, hanuman 28, shiv 27, ram 26.
- Art: cinematic 38, real-photo 10, illustrated 6, cartoon-3d 6; length: <=30 s 73, 31-60 s 33, 121-180 s 25, 61-120 s 12.
- Best: "जटायु से भी 10 गुना शक्तिशाली था संपाति! 😱" 22.5 L (3781.5x, रहस्य / secret); "बागेश्वर महाराज के बयान पर मचा बवाल! राम जी के 5 पिता! शास्त" 25.8 L (978.4x, listicle); "जल में समा गईं माँ दुर्गा, भक्तों की आँखें हुईं नम 😢🙏 / जय" 9.0 L (876.2x, emotional-motivational line).
- New ideas in the banks (status "idea", citation to verify): facts:radar-durga-visarjan-kyun, facts:radar-chunari-kyun, facts:radar-ram-samudra-baan, kailash:radar-ganesh-vidai-mata-roi, pov:radar-kuch-chhoot-jaye, facts:radar-hanuman-sankatmochan, facts:radar-lakshman-14-saal-jaagran, facts:radar-ganesh-modak-kyun, kailash:radar-modak-thaali-khaali, pov:radar-ananya-bhakti-yog-kshem, facts:radar-murti-visarjan-jal, facts:radar-akshat-kyun-chadhate, facts:radar-aruna-bina-pair, kailash:radar-akshat-gayab, pov:radar-visarjan-main-kahin-nahi, facts:radar-samundra-shivling, facts:radar-ravan-shivling-baidyanath, facts:radar-garuda-garbh-vachan, kailash:radar-kamandal-jal-kam, pov:radar-sach-ki-gawahi, facts:radar-vibhishan-lanka-raaj, facts:radar-hanuman-poonch-aag, facts:radar-karn-kavach-kundal, kailash:radar-jhoola-toota, pov:radar-galti-kshama, facts:radar-sheesh-yudh-dekha, facts:radar-shiv-tulsi-nahi, kailash:radar-darpan-kho-gaya, pov:radar-dhokha-dhairya, facts:radar-hanuman-musthi-ravan, facts:radar-krishna-makhan-chor, facts:radar-krishna-bansuri-bans, kailash:radar-mehndi-rang-halka, pov:radar-pehli-roti-gau.

### Consistently strong channels (median >= 40k: style to learn from, not outliers)

- Priyansh Shukla: "जब बाली ने खींची हनुमान जी की आधी शक्ति! 😱" 9.1 L (channel median 6.0 L)
- Factorial xyz: "श्री राम के क्रोध से कांप उठा समुद्र! 🌊🙏 | रामायण की अद्भु" 7.3 L (channel median 7.1 L)
- Rahul Panwar: "मेरे तन में भी राम मेरे मन में भी राम, जय श्रीराम, श्रीराम, " 5.3 L (channel median 2.0 L)
- Mister Virat Kumar Subhash Chandra Bose: "रावण, जो कैलाश उठा सकता था, उसे एक देवी ने पैर के अंगूठे से " 8.7 L (channel median 5.0 L)
- Learn With Vishu: "मरने के बाद पहली रात आत्मा कहाँ होती है? 😳 गरुड़ पुराण का र" 4.1 L (channel median 2.6 L)
- CG Hindi Fact: "देवरानी-जेठानी मंदिर का रहस्य! जीव-जंतुओं से बनी भगवान शिव क" 1.4 L (channel median 44k)
- Dharmik Yatra vlog1M: "नीलकंठ महादेव का गुप्त रहस्य🚩 |समुद्र मंथन का वो विष महादेव" 38k (channel median 48k)
-  Raw Talks With Anaya
: "महाभारत के युद्ध में मारे गए थे 1 अरब 66 करोड़ योद्धा? 😱 | " 1.5 L (channel median 53k)

## Week of 2026-11-21

Runs: 2026-11-15 sweep, 2026-11-16 sweep, 2026-11-17 daily, 2026-11-18 daily, 2026-11-19 daily, 2026-11-20 daily, 2026-11-21 daily; quota used 2977 units (cap 900/day).

### Top 10 truly viral references

| # | Title | Channel | Views | x median | Age | Length | Hook | Format | Deity | Art / cover |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | [जटायु से भी 10 गुना शक्तिशाली था संपाति! 😱](https://youtube.com/shorts/icIBvvOfw-Y) | PS creation cartoon | 22.5 L | 3781.5 | 5.8 d | 176 s | रहस्य / secret | katha | ram | illustrated: giant AI eagle close-up, Hanuman group pointing |
| 2 | [बूढ़ी माँ की पुकार सुनकर खुद प्रकट हुईं माँ दुर्गा 😭🙏 / माँ की असीम ](https://youtube.com/shorts/Is6wfUsW4js) | BhaktiVerse 3D | 32.4 L | 1855.5 | 6.8 d | 44 s | emotional-motivational line | katha | devi | cinematic: glowing Durga in red-gold sari, golden light burs |
| 3 | [बागेश्वर महाराज के बयान पर मचा बवाल! राम जी के 5 पिता! शास्त्रों में म](https://youtube.com/shorts/Um4CHpY6rgA) | SARVESHWAR SHARAN  | 25.8 L | 978.4 | 6.5 d | 156 s | listicle | other | ram | text-card: two speakers' photos, red text band 'श्रीराम के 5 |
| 4 | [श्री राम जन्मभूमि अयोध्या का नजारा🚩/अयोध्या #trandingshorts #shorts #](https://youtube.com/shorts/6h2vU8m5iQw) | Bhakti Soothingly | 31.3 L | 957.8 | 7 d | 17 s | name / plain | darshan | ram | real-photo: drone shot of the lit temple at dusk, two-line D |
| 5 | [जल में समा गईं माँ दुर्गा, भक्तों की आँखें हुईं नम 😢🙏 / जय माता दी �](https://youtube.com/shorts/cmbAxtdk4a8) | Manish  | 9.0 L | 876.2 | 6.4 d | 11 s | emotional-motivational line | other | devi | cinematic: AI Durga statue half in river, marigold, text ban |
| 6 | [🌺#माँ दुर्गा की अंतिम विदाई 🙏 / नम आँखों से भक्तों ने दी माँ को विदा](https://youtube.com/shorts/m-pAzJqfVS0) | Benny Bhalchanra | 10.6 L | 855.9 | 6.1 d | 11 s | emotional-motivational line | other | devi | cinematic: Durga idol on a float in the sea, crying devotees |
| 7 | [जोड़ी हो तो ऐसी हो  / Jodi Ho To Aisi Ho / Radha Krishna Bhajan #short](https://youtube.com/shorts/8OKh9uSUeHg) | Aparna Dev Darshan  | 13.3 L | 796.7 | 4.7 d | 20 s | emotional-motivational line | loop | krishna | cartoon-3d: Radha and Krishna at a lotus pond with koi fish  |
| 8 | [रामायण के अनसुने किस्से 🙏🚩 / जानिए ऐसी बातें जो बहुत कम लोग जानते है](https://youtube.com/shorts/kbykUAvmivY) | Simee Kaur | 8.4 L | 752.4 | 5.1 d | 122 s | रहस्य / secret | facts | ram | illustrated: dim palace hall, seated sage, red 'Jai Shri Ram |
| 9 | [jay maa durga🙏😂#bhakti #jaimaadurga  #shorts 🌺 / mata rani bhajan 2](https://youtube.com/shorts/jDW2D-3RQqk) | Radha Rani Bhakti Dham | 6.9 L | 489.3 | 4.8 d | 11 s | name / plain | loop | devi | murti-darshan: underwater goddess murti with smoke and bubbl |
| 10 | [रामायण रहस्य #spiritualawarness #spirituality #shortsfeed](https://youtube.com/shorts/v6Ygkxtn_BI) | अरुण कुमार शर्मा काशी | 7.7 L | 479.7 | 3.1 d | 80 s | रहस्य / secret | facts | ram | cinematic: Ram darbar: seated blue-skinned Ram under a Shesh |

### What's working

- 113 truly viral devotional Shorts in 7 days (>= 100k or 30k in 3 days, >= 5x their channel's median).
- Hooks: name / plain 59, emotional-motivational line 16, रहस्य / secret 10, other question 6.
- Formats: other 49, katha 26, facts 17, loop 11; deities: ram 28, shiv 26, devi 21, krishna 21.
- Art: cinematic 31, real-photo 11, illustrated 6, murti-darshan 5; length: <=30 s 59, 31-60 s 25, 121-180 s 18, 61-120 s 11.
- Best: "जटायु से भी 10 गुना शक्तिशाली था संपाति! 😱" 22.5 L (3781.5x, रहस्य / secret); "बूढ़ी माँ की पुकार सुनकर खुद प्रकट हुईं माँ दुर्गा 😭🙏 / मा" 32.4 L (1855.5x, emotional-motivational line); "बागेश्वर महाराज के बयान पर मचा बवाल! राम जी के 5 पिता! शास्त" 25.8 L (978.4x, listicle).
- New ideas in the banks (status "idea", citation to verify): facts:radar-bharat-paduka, facts:radar-navratri-kanya-poojan, kailash:radar-namak-kam-pyaar-zyada, pov:radar-ghamand-vinamrata, facts:radar-durga-visarjan-kyun, facts:radar-chunari-kyun, facts:radar-ram-samudra-baan, kailash:radar-ganesh-vidai-mata-roi, pov:radar-kuch-chhoot-jaye, facts:radar-hanuman-sankatmochan, facts:radar-lakshman-14-saal-jaagran, facts:radar-ganesh-modak-kyun, kailash:radar-modak-thaali-khaali, pov:radar-ananya-bhakti-yog-kshem, facts:radar-murti-visarjan-jal, facts:radar-akshat-kyun-chadhate, facts:radar-aruna-bina-pair, kailash:radar-akshat-gayab, pov:radar-visarjan-main-kahin-nahi, facts:radar-samundra-shivling, facts:radar-ravan-shivling-baidyanath, facts:radar-garuda-garbh-vachan, kailash:radar-kamandal-jal-kam, pov:radar-sach-ki-gawahi, facts:radar-vibhishan-lanka-raaj, facts:radar-hanuman-poonch-aag, facts:radar-karn-kavach-kundal, kailash:radar-jhoola-toota, pov:radar-galti-kshama, facts:radar-sheesh-yudh-dekha, facts:radar-shiv-tulsi-nahi, kailash:radar-darpan-kho-gaya, pov:radar-dhokha-dhairya.

### Consistently strong channels (median >= 40k: style to learn from, not outliers)

- Factorial xyz: "श्री राम के क्रोध से कांप उठा समुद्र! 🌊🙏 | रामायण की अद्भु" 6.3 L (channel median 7.1 L)
- Priyansh Shukla: "जब बाली ने खींची हनुमान जी की आधी शक्ति! 😱" 9.1 L (channel median 6.0 L)
- Rahul Panwar: "मेरे तन में भी राम मेरे मन में भी राम, जय श्रीराम, श्रीराम, " 5.3 L (channel median 2.0 L)
- Mister Virat Kumar Subhash Chandra Bose: "रावण, जो कैलाश उठा सकता था, उसे एक देवी ने पैर के अंगूठे से " 8.7 L (channel median 5.0 L)
- Learn With Vishu: "मरने के बाद पहली रात आत्मा कहाँ होती है? 😳 गरुड़ पुराण का र" 4.1 L (channel median 2.6 L)
- CG Hindi Fact: "देवरानी-जेठानी मंदिर का रहस्य! जीव-जंतुओं से बनी भगवान शिव क" 1.4 L (channel median 44k)
- Dharmik Yatra vlog1M: "नीलकंठ महादेव का गुप्त रहस्य🚩 |समुद्र मंथन का वो विष महादेव" 38k (channel median 48k)
-  Raw Talks With Anaya
: "महाभारत के युद्ध में मारे गए थे 1 अरब 66 करोड़ योद्धा? 😱 | " 1.5 L (channel median 53k)

## Week of 2026-11-20

Runs: 2026-11-15 sweep, 2026-11-16 sweep, 2026-11-17 daily, 2026-11-18 daily, 2026-11-19 daily, 2026-11-20 daily; quota used 2723 units (cap 900/day).

### Top 10 truly viral references

| # | Title | Channel | Views | x median | Age | Length | Hook | Format | Deity | Art / cover |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | [जटायु से भी 10 गुना शक्तिशाली था संपाति! 😱](https://youtube.com/shorts/icIBvvOfw-Y) | PS creation cartoon | 22.5 L | 3781.5 | 5.8 d | 176 s | रहस्य / secret | katha | ram | illustrated: giant AI eagle close-up, Hanuman group pointing |
| 2 | [बूढ़ी माँ की पुकार सुनकर खुद प्रकट हुईं माँ दुर्गा 😭🙏 / माँ की असीम ](https://youtube.com/shorts/Is6wfUsW4js) | BhaktiVerse 3D | 32.4 L | 1855.5 | 6.8 d | 44 s | emotional-motivational line | katha | devi | cinematic: glowing Durga in red-gold sari, golden light burs |
| 3 | [बागेश्वर महाराज के बयान पर मचा बवाल! राम जी के 5 पिता! शास्त्रों में म](https://youtube.com/shorts/Um4CHpY6rgA) | SARVESHWAR SHARAN  | 25.8 L | 978.4 | 6.5 d | 156 s | listicle | other | ram | text-card: two speakers' photos, red text band 'श्रीराम के 5 |
| 4 | [श्री राम जन्मभूमि अयोध्या का नजारा🚩/अयोध्या #trandingshorts #shorts #](https://youtube.com/shorts/6h2vU8m5iQw) | Bhakti Soothingly | 31.3 L | 957.8 | 7 d | 17 s | name / plain | darshan | ram | real-photo: drone shot of the lit temple at dusk, two-line D |
| 5 | [जल में समा गईं माँ दुर्गा, भक्तों की आँखें हुईं नम 😢🙏 / जय माता दी �](https://youtube.com/shorts/cmbAxtdk4a8) | Manish  | 9.0 L | 876.2 | 6.4 d | 11 s | emotional-motivational line | other | devi | cinematic: AI Durga statue half in river, marigold, text ban |
| 6 | [🌺#माँ दुर्गा की अंतिम विदाई 🙏 / नम आँखों से भक्तों ने दी माँ को विदा](https://youtube.com/shorts/m-pAzJqfVS0) | Benny Bhalchanra | 10.6 L | 855.9 | 6.1 d | 11 s | emotional-motivational line | other | devi | cinematic: Durga idol on a float in the sea, crying devotees |
| 7 | [जोड़ी हो तो ऐसी हो  / Jodi Ho To Aisi Ho / Radha Krishna Bhajan #short](https://youtube.com/shorts/8OKh9uSUeHg) | Aparna Dev Darshan  | 13.3 L | 796.7 | 4.7 d | 20 s | emotional-motivational line | loop | krishna | cartoon-3d: Radha and Krishna at a lotus pond with koi fish  |
| 8 | [रामायण के अनसुने किस्से 🙏🚩 / जानिए ऐसी बातें जो बहुत कम लोग जानते है](https://youtube.com/shorts/kbykUAvmivY) | Simee Kaur | 8.4 L | 752.4 | 5.1 d | 122 s | रहस्य / secret | facts | ram | illustrated: dim palace hall, seated sage, red 'Jai Shri Ram |
| 9 | [jay maa durga🙏😂#bhakti #jaimaadurga  #shorts 🌺 / mata rani bhajan 2](https://youtube.com/shorts/jDW2D-3RQqk) | Radha Rani Bhakti Dham | 6.9 L | 489.3 | 4.8 d | 11 s | name / plain | loop | devi | murti-darshan: underwater goddess murti with smoke and bubbl |
| 10 | [रामायण रहस्य #spiritualawarness #spirituality #shortsfeed](https://youtube.com/shorts/v6Ygkxtn_BI) | अरुण कुमार शर्मा काशी | 7.7 L | 479.7 | 3.1 d | 80 s | रहस्य / secret | facts | ram | cinematic: Ram darbar: seated blue-skinned Ram under a Shesh |

### What's working

- 92 truly viral devotional Shorts in 7 days (>= 100k or 30k in 3 days, >= 5x their channel's median).
- Hooks: name / plain 50, emotional-motivational line 14, रहस्य / secret 9, 😱 क्यों? 3.
- Formats: other 42, katha 21, facts 16, loop 8; deities: ram 28, krishna 21, devi 20, shiv 7.
- Art: cinematic 21, real-photo 10, illustrated 6, cartoon-3d 4; length: <=30 s 46, 31-60 s 20, 121-180 s 17, 61-120 s 9.
- Best: "जटायु से भी 10 गुना शक्तिशाली था संपाति! 😱" 22.5 L (3781.5x, रहस्य / secret); "बूढ़ी माँ की पुकार सुनकर खुद प्रकट हुईं माँ दुर्गा 😭🙏 / मा" 32.4 L (1855.5x, emotional-motivational line); "बागेश्वर महाराज के बयान पर मचा बवाल! राम जी के 5 पिता! शास्त" 25.8 L (978.4x, listicle).
- New ideas in the banks (status "idea", citation to verify): facts:radar-bharat-paduka, facts:radar-navratri-kanya-poojan, kailash:radar-namak-kam-pyaar-zyada, pov:radar-ghamand-vinamrata, facts:radar-durga-visarjan-kyun, facts:radar-chunari-kyun, facts:radar-ram-samudra-baan, kailash:radar-ganesh-vidai-mata-roi, pov:radar-kuch-chhoot-jaye, facts:radar-hanuman-sankatmochan, facts:radar-lakshman-14-saal-jaagran, facts:radar-ganesh-modak-kyun, kailash:radar-modak-thaali-khaali, pov:radar-ananya-bhakti-yog-kshem, facts:radar-murti-visarjan-jal, facts:radar-akshat-kyun-chadhate, facts:radar-aruna-bina-pair, kailash:radar-akshat-gayab, pov:radar-visarjan-main-kahin-nahi, facts:radar-samundra-shivling, facts:radar-ravan-shivling-baidyanath, facts:radar-garuda-garbh-vachan, kailash:radar-kamandal-jal-kam, pov:radar-sach-ki-gawahi, facts:radar-vibhishan-lanka-raaj, facts:radar-hanuman-poonch-aag, facts:radar-karn-kavach-kundal, kailash:radar-jhoola-toota, pov:radar-galti-kshama.

### Consistently strong channels (median >= 40k: style to learn from, not outliers)

- Factorial xyz: "श्री राम के क्रोध से कांप उठा समुद्र! 🌊🙏 | रामायण की अद्भु" 6.3 L (channel median 7.1 L)
- Priyansh Shukla: "जब बाली ने खींची हनुमान जी की आधी शक्ति! 😱" 9.1 L (channel median 6.0 L)
- Rahul Panwar: "मेरे तन में भी राम मेरे मन में भी राम, जय श्रीराम, श्रीराम, " 5.3 L (channel median 2.0 L)
- Mister Virat Kumar Subhash Chandra Bose: "रावण, जो कैलाश उठा सकता था, उसे एक देवी ने पैर के अंगूठे से " 8.7 L (channel median 5.0 L)
- Learn With Vishu: "मरने के बाद पहली रात आत्मा कहाँ होती है? 😳 गरुड़ पुराण का र" 4.1 L (channel median 2.6 L)
- CG Hindi Fact: "देवरानी-जेठानी मंदिर का रहस्य! जीव-जंतुओं से बनी भगवान शिव क" 1.4 L (channel median 44k)
- Dharmik Yatra vlog1M: "नीलकंठ महादेव का गुप्त रहस्य🚩 |समुद्र मंथन का वो विष महादेव" 38k (channel median 48k)
-  Raw Talks With Anaya
: "महाभारत के युद्ध में मारे गए थे 1 अरब 66 करोड़ योद्धा? 😱 | " 1.5 L (channel median 53k)

## Week of 2026-11-19

Runs: 2026-11-15 sweep, 2026-11-16 sweep, 2026-11-17 daily, 2026-11-18 daily, 2026-11-19 daily; quota used 2469 units (cap 900/day).

### Top 10 truly viral references

| # | Title | Channel | Views | x median | Age | Length | Hook | Format | Deity | Art / cover |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | [बूढ़ी माँ की पुकार सुनकर खुद प्रकट हुईं माँ दुर्गा 😭🙏 / माँ की असीम ](https://youtube.com/shorts/Is6wfUsW4js) | BhaktiVerse 3D | 32.4 L | 1855.5 | 6.8 d | 44 s | emotional-motivational line | katha | devi | cinematic: glowing Durga in red-gold sari, golden light burs |
| 2 | [बागेश्वर महाराज के बयान पर मचा बवाल! राम जी के 5 पिता! शास्त्रों में म](https://youtube.com/shorts/Um4CHpY6rgA) | SARVESHWAR SHARAN  | 25.8 L | 978.4 | 6.5 d | 156 s | listicle | other | ram | text-card: two speakers' photos, red text band 'श्रीराम के 5 |
| 3 | [श्री राम जन्मभूमि अयोध्या का नजारा🚩/अयोध्या #trandingshorts #shorts #](https://youtube.com/shorts/6h2vU8m5iQw) | Bhakti Soothingly | 31.3 L | 957.8 | 7 d | 17 s | name / plain | darshan | ram | real-photo: drone shot of the lit temple at dusk, two-line D |
| 4 | [जल में समा गईं माँ दुर्गा, भक्तों की आँखें हुईं नम 😢🙏 / जय माता दी �](https://youtube.com/shorts/cmbAxtdk4a8) | Manish  | 9.0 L | 876.2 | 6.4 d | 11 s | emotional-motivational line | other | devi | cinematic: AI Durga statue half in river, marigold, text ban |
| 5 | [🌺#माँ दुर्गा की अंतिम विदाई 🙏 / नम आँखों से भक्तों ने दी माँ को विदा](https://youtube.com/shorts/m-pAzJqfVS0) | Benny Bhalchanra | 10.6 L | 855.9 | 6.1 d | 11 s | emotional-motivational line | other | devi | cinematic: Durga idol on a float in the sea, crying devotees |
| 6 | [जोड़ी हो तो ऐसी हो  / Jodi Ho To Aisi Ho / Radha Krishna Bhajan #short](https://youtube.com/shorts/8OKh9uSUeHg) | Aparna Dev Darshan  | 13.3 L | 796.7 | 4.7 d | 20 s | emotional-motivational line | loop | krishna | cartoon-3d: Radha and Krishna at a lotus pond with koi fish  |
| 7 | [jay maa durga🙏😂#bhakti #jaimaadurga  #shorts 🌺 / mata rani bhajan 2](https://youtube.com/shorts/jDW2D-3RQqk) | Radha Rani Bhakti Dham | 6.9 L | 489.3 | 4.8 d | 11 s | name / plain | loop | devi | murti-darshan: underwater goddess murti with smoke and bubbl |
| 8 | [माँ दुर्गा का जल में दिव्य मिलन 🙏😭 / विसर्जन का भावुक दृश्य / Jai Ma](https://youtube.com/shorts/J3bRy8f_lyw) | Manish  | 4.5 L | 440.3 | 5.9 d | 11 s | emotional-motivational line | other | devi | cinematic: AI Durga statues in water, marigold petals, cryin |
| 9 | [सूर्यदेव के सात घोड़े और अरुण देव की अद्भुत कथा 😱/ सूर्य रथ का रहस्य ](https://youtube.com/shorts/VlnGxCQQThM) | Divya Katha Sansar | 6.3 L | 409.8 | 2.5 d | 180 s | रहस्य / secret | facts | surya | cinematic: young deity rising from a cracked golden egg with |
| 10 | [विसर्जन के बाद माँ दुर्गा की अनोखी कहानी 😢🌺 / माँ की विदाई का भावुक ](https://youtube.com/shorts/rqH7xW-Ir7E) | Manish  | 4.6 L | 352.1 | 6.9 d | 11 s | emotional-motivational line | katha | devi | cinematic: close-up of a crying Durga statue, red and gold,  |

### What's working

- 73 truly viral devotional Shorts in 7 days (>= 100k or 30k in 3 days, >= 5x their channel's median).
- Hooks: name / plain 43, emotional-motivational line 12, रहस्य / secret 4, 😱 क्यों? 3.
- Formats: other 33, katha 17, facts 10, loop 8; deities: devi 20, ram 20, krishna 17, shiv 7.
- Art: cinematic 20, real-photo 8, murti-darshan 4, text-card 3; length: <=30 s 42, 31-60 s 16, 121-180 s 11, 61-120 s 4.
- Best: "बूढ़ी माँ की पुकार सुनकर खुद प्रकट हुईं माँ दुर्गा 😭🙏 / मा" 32.4 L (1855.5x, emotional-motivational line); "बागेश्वर महाराज के बयान पर मचा बवाल! राम जी के 5 पिता! शास्त" 25.8 L (978.4x, listicle); "श्री राम जन्मभूमि अयोध्या का नजारा🚩/अयोध्या #trandingshorts" 31.3 L (957.8x, name / plain).
- New ideas in the banks (status "idea", citation to verify): facts:radar-bharat-paduka, facts:radar-navratri-kanya-poojan, kailash:radar-namak-kam-pyaar-zyada, pov:radar-ghamand-vinamrata, facts:radar-durga-visarjan-kyun, facts:radar-chunari-kyun, facts:radar-ram-samudra-baan, kailash:radar-ganesh-vidai-mata-roi, pov:radar-kuch-chhoot-jaye, facts:radar-hanuman-sankatmochan, facts:radar-lakshman-14-saal-jaagran, facts:radar-ganesh-modak-kyun, kailash:radar-modak-thaali-khaali, pov:radar-ananya-bhakti-yog-kshem, facts:radar-murti-visarjan-jal, facts:radar-akshat-kyun-chadhate, facts:radar-aruna-bina-pair, kailash:radar-akshat-gayab, pov:radar-visarjan-main-kahin-nahi, facts:radar-samundra-shivling, facts:radar-ravan-shivling-baidyanath, facts:radar-garuda-garbh-vachan, kailash:radar-kamandal-jal-kam, pov:radar-sach-ki-gawahi.

### Consistently strong channels (median >= 40k: style to learn from, not outliers)

- Factorial xyz: "श्री राम के क्रोध से कांप उठा समुद्र! 🌊🙏 | रामायण की अद्भु" 6.3 L (channel median 7.1 L)
- Priyansh Shukla: "जब बाली ने खींची हनुमान जी की आधी शक्ति! 😱" 9.1 L (channel median 6.0 L)
- Rahul Panwar: "मेरे तन में भी राम मेरे मन में भी राम, जय श्रीराम, श्रीराम, " 5.3 L (channel median 2.0 L)
- Mister Virat Kumar Subhash Chandra Bose: "रावण, जो कैलाश उठा सकता था, उसे एक देवी ने पैर के अंगूठे से " 8.7 L (channel median 5.0 L)
- Learn With Vishu: "मरने के बाद पहली रात आत्मा कहाँ होती है? 😳 गरुड़ पुराण का र" 4.1 L (channel median 2.6 L)
- CG Hindi Fact: "देवरानी-जेठानी मंदिर का रहस्य! जीव-जंतुओं से बनी भगवान शिव क" 1.4 L (channel median 44k)
- Dharmik Yatra vlog1M: "नीलकंठ महादेव का गुप्त रहस्य🚩 |समुद्र मंथन का वो विष महादेव" 38k (channel median 48k)

## Week of 2026-11-18

Runs: 2026-11-15 sweep, 2026-11-16 sweep, 2026-11-17 daily, 2026-11-18 daily; quota used 2237 units (cap 900/day).

### Top 10 truly viral references

| # | Title | Channel | Views | x median | Age | Length | Hook | Format | Deity | Art / cover |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | [बूढ़ी माँ की पुकार सुनकर खुद प्रकट हुईं माँ दुर्गा 😭🙏 / माँ की असीम ](https://youtube.com/shorts/Is6wfUsW4js) | BhaktiVerse 3D | 32.4 L | 1855.5 | 6.8 d | 44 s | emotional-motivational line | katha | devi | cinematic: glowing Durga in red-gold sari, golden light burs |
| 2 | [बागेश्वर महाराज के बयान पर मचा बवाल! राम जी के 5 पिता! शास्त्रों में म](https://youtube.com/shorts/Um4CHpY6rgA) | SARVESHWAR SHARAN  | 25.8 L | 978.4 | 6.5 d | 156 s | listicle | other | ram | text-card: two speakers' photos, red text band 'श्रीराम के 5 |
| 3 | [श्री राम जन्मभूमि अयोध्या का नजारा🚩/अयोध्या #trandingshorts #shorts #](https://youtube.com/shorts/6h2vU8m5iQw) | Bhakti Soothingly | 31.3 L | 957.8 | 7 d | 17 s | name / plain | darshan | ram | real-photo: drone shot of the lit temple at dusk, two-line D |
| 4 | [जल में समा गईं माँ दुर्गा, भक्तों की आँखें हुईं नम 😢🙏 / जय माता दी �](https://youtube.com/shorts/cmbAxtdk4a8) | Manish  | 9.0 L | 876.2 | 6.4 d | 11 s | emotional-motivational line | other | devi | cinematic: AI Durga statue half in river, marigold, text ban |
| 5 | [🌺#माँ दुर्गा की अंतिम विदाई 🙏 / नम आँखों से भक्तों ने दी माँ को विदा](https://youtube.com/shorts/m-pAzJqfVS0) | Benny Bhalchanra | 10.6 L | 855.9 | 6.1 d | 11 s | emotional-motivational line | other | devi | cinematic: Durga idol on a float in the sea, crying devotees |
| 6 | [जोड़ी हो तो ऐसी हो  / Jodi Ho To Aisi Ho / Radha Krishna Bhajan #short](https://youtube.com/shorts/8OKh9uSUeHg) | Aparna Dev Darshan  | 13.3 L | 796.7 | 4.7 d | 20 s | emotional-motivational line | loop | krishna | cartoon-3d: Radha and Krishna at a lotus pond with koi fish  |
| 7 | [jay maa durga🙏😂#bhakti #jaimaadurga  #shorts 🌺 / mata rani bhajan 2](https://youtube.com/shorts/jDW2D-3RQqk) | Radha Rani Bhakti Dham | 6.9 L | 489.3 | 4.8 d | 11 s | name / plain | loop | devi | murti-darshan: underwater goddess murti with smoke and bubbl |
| 8 | [माँ दुर्गा का जल में दिव्य मिलन 🙏😭 / विसर्जन का भावुक दृश्य / Jai Ma](https://youtube.com/shorts/J3bRy8f_lyw) | Manish  | 4.5 L | 440.3 | 5.9 d | 11 s | emotional-motivational line | other | devi | cinematic: AI Durga statues in water, marigold petals, cryin |
| 9 | [सूर्यदेव के सात घोड़े और अरुण देव की अद्भुत कथा 😱/ सूर्य रथ का रहस्य ](https://youtube.com/shorts/VlnGxCQQThM) | Divya Katha Sansar | 6.3 L | 409.8 | 2.5 d | 180 s | रहस्य / secret | facts | surya | cinematic: young deity rising from a cracked golden egg with |
| 10 | [विसर्जन के बाद माँ दुर्गा की अनोखी कहानी 😢🌺 / माँ की विदाई का भावुक ](https://youtube.com/shorts/rqH7xW-Ir7E) | Manish  | 4.6 L | 352.1 | 6.9 d | 11 s | emotional-motivational line | katha | devi | cinematic: close-up of a crying Durga statue, red and gold,  |

### What's working

- 67 truly viral devotional Shorts in 7 days (>= 100k or 30k in 3 days, >= 5x their channel's median).
- Hooks: name / plain 42, emotional-motivational line 12, 😱 क्यों? 3, listicle 2.
- Formats: other 33, katha 15, loop 8, facts 7; deities: devi 20, ram 20, krishna 17, shiv 4.
- Art: cinematic 19, real-photo 4, murti-darshan 4, text-card 3; length: <=30 s 42, 31-60 s 14, 121-180 s 8, 61-120 s 3.
- Best: "बूढ़ी माँ की पुकार सुनकर खुद प्रकट हुईं माँ दुर्गा 😭🙏 / मा" 32.4 L (1855.5x, emotional-motivational line); "बागेश्वर महाराज के बयान पर मचा बवाल! राम जी के 5 पिता! शास्त" 25.8 L (978.4x, listicle); "श्री राम जन्मभूमि अयोध्या का नजारा🚩/अयोध्या #trandingshorts" 31.3 L (957.8x, name / plain).
- New ideas in the banks (status "idea", citation to verify): facts:radar-bharat-paduka, facts:radar-navratri-kanya-poojan, kailash:radar-namak-kam-pyaar-zyada, pov:radar-ghamand-vinamrata, facts:radar-durga-visarjan-kyun, facts:radar-chunari-kyun, facts:radar-ram-samudra-baan, kailash:radar-ganesh-vidai-mata-roi, pov:radar-kuch-chhoot-jaye, facts:radar-hanuman-sankatmochan, facts:radar-lakshman-14-saal-jaagran, facts:radar-ganesh-modak-kyun, kailash:radar-modak-thaali-khaali, pov:radar-ananya-bhakti-yog-kshem, facts:radar-murti-visarjan-jal, facts:radar-akshat-kyun-chadhate, facts:radar-aruna-bina-pair, kailash:radar-akshat-gayab, pov:radar-visarjan-main-kahin-nahi.

### Consistently strong channels (median >= 40k: style to learn from, not outliers)

- Factorial xyz: "श्री राम के क्रोध से कांप उठा समुद्र! 🌊🙏 | रामायण की अद्भु" 6.3 L (channel median 7.1 L)
- Priyansh Shukla: "जब बाली ने खींची हनुमान जी की आधी शक्ति! 😱" 9.1 L (channel median 6.0 L)
- Rahul Panwar: "मेरे तन में भी राम मेरे मन में भी राम, जय श्रीराम, श्रीराम, " 5.3 L (channel median 2.0 L)
- Mister Virat Kumar Subhash Chandra Bose: "रावण, जो कैलाश उठा सकता था, उसे एक देवी ने पैर के अंगूठे से " 8.7 L (channel median 5.0 L)

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
