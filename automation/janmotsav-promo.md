# Khatu Shyam Janmotsav 2026: card tool promotion

Janmotsav = Dev Uthani (Prabodhini) Ekadashi, **Friday 20 Nov 2026** (Drik Panchang, New Delhi: Ekadashi 20 Nov 07:15 to
21 Nov 06:31, parana 21 Nov 13:11-15:18; Prokerala, Ujjain: 20 Nov, 07:16 to 06:32).

Tool: https://sk9836413.github.io/shyam-premi-sn/janmotsav/ (the channel's own card site, `site/` in this repo, GitHub
Pages via `.github/workflows/pages.yml`; free card with name and photo, 1080x1920 status and 1080x1080 post, WhatsApp
share; the photo never leaves the phone). Shyam Premi SN is its own entity: never link or co-brand another brand's site.

## Automatic (no action needed), 17-20 Nov 2026

`scripts/festival-links.mjs` adds one line with the link, tagged `utm_source=youtube|instagram|facebook`,
`utm_medium=social`, `utm_campaign=janmotsav2026`, `utm_content=<slot or photo kind>`, only while the page returns 200:

- Videos (daily.yml): YouTube description, Instagram caption and Facebook caption of every upload whose day is 17-20 Nov:
  the evening Shorts, the four Janmotsav status Shorts (slots `eve`, `status`, `statusday`), Khatu movie parts (by
  release day) and anything else that runs. The line goes after the first paragraph (visible before "...more").
- Photo posts (photos.yml via scripts/photos.mjs): the morning darshan post, the Khatu sandhya aarti post and any
  calendar-festival post (the 20 Nov Janmotsav greeting), on Facebook and Instagram.

Scheduler crons are unchanged; the 3-a-day cap (scripts/day-plan.mjs, scripts/upload-guard.mjs) holds every day.

## Upload plan, Janmotsav week (status engine, owner 11 Nov 2026)

The festival "status" Short is the only format that went viral (Choti Diwali Status 2026: 798 views, out at 00:30 /
the evening before), so the Janmotsav gets four visually different status Shorts around the movie series. Every one is a
15-25 s loop (ends on its own first frame), opens on a bold Hindi hook, shows "स्टेटस पर लगाएं 📲", carries the 7-day
download link and the card link above, and also goes out as a Facebook Reel (scheduled for the same time) and an
Instagram Reel (queued; the `instagram` job posts it with the first run after the time; for 00:30 that is the 05:47 IST
poll). Pictures: `story/status/2026-11-20.json` (6 scenes, Khatu Shyam ji as the SHEESH only; 3 animated once on Kaggle on
18 Nov and reused on 19 Nov). Synthesized music and the human edge-tts voice chain, as everywhere.

| Day | 00:30 | 07:00 | 08:30 | 19:00 | 20:00 | Uploads |
|---|---|---|---|---|---|---|
| Mon 16 Nov | Chhath Usha Arghya status ("Chhathi Maiya Status 2026") | | | Khatu darshan, countdown "Janmotsav: 4 din" (+ morning temple darshan ~10:30) | | 3 |
| Tue 17 Nov | | Movie Part 1 | | Khatu darshan, countdown "3 din" | | 2 |
| Wed 18 Nov | | Movie Part 2 | | Khatu darshan, countdown "2 din" | **Janmotsav status 1**: "Shyam Baba Janmotsav Status 2026 \| श्याम बाबा जन्मोत्सव स्टेटस वीडियो #Shorts", hook "परसों है श्याम बाबा जन्मोत्सव 🙏" (Khatu Dham lit up, sheesh, nishan yatra) | 3 |
| Thu 19 Nov | | Movie Part 3 | | Khatu darshan, "kal Baba ka Janmotsav hai" | **Janmotsav status 2**: "Khatu Shyam Janmotsav Status 2026 \| खाटू श्याम जन्मोत्सव स्टेटस वीडियो #Shorts", hook "कल है खाटू श्याम जन्मोत्सव 🙏" (sheesh, nishan yatra, tulsi and sugarcane mandap) | 3 |
| Fri 20 Nov | **Janmotsav status 3**: "Dev Uthani Ekadashi Status 2026 \| देवउठनी एकादशी स्टेटस वीडियो #Shorts", hook "आज है देवउठनी एकादशी 🙏" (rose-shringar sheesh, Vishnu awakening, sheesh) | Movie Part 4 | **Janmotsav status 4**: "Khatu Shyam Birthday Status 2026 \| खाटू श्याम जन्मदिन स्टेटस वीडियो #Shorts", hook "खाटू श्याम जन्मदिन की बधाई 🙏" (nishan yatra, rose-shringar sheesh, Khatu Dham) | | | 3 |
| Sat 21 Nov | Tulsi Vivah status ("Tulsi Vivah Status 2026") | | | | Ravi Pradosh status (evening before 22 Nov) | 3 (+ morning temple darshan) |

Left out by the cap that week: the 18 Nov Dadi-Chhotu Short, the 16 Nov long video, the 20 Nov evening Short, the
20 Nov 20:00 Tulsi Vivah status and every Kalyug ke Bhagwan episode (17-20 are movie days). How it runs: the 10:43 IST
evening dispatch on 18 Nov makes status 1 (scheduled 20:00); the one on 19 Nov makes status 2, 3 and 4 (scheduled 19 Nov
20:00, 20 Nov 00:30 and 08:30); the 18:46 IST retry and the evening polls repeat anything that failed. Check with
`node scripts/day-plan.mjs --days 6 --from 2026-11-16` and `node scripts/status-engine.mjs plan --from 2026-11-16 --to 2026-11-21`.

## Manual: WhatsApp forward (copy as is)

```
🙏 *जय श्री श्याम* 🙏

इस बार *खाटू श्याम जन्मोत्सव* (देवउठनी एकादशी) *शुक्रवार, 20 नवंबर 2026* को है।

अपने नाम और चाहें तो अपनी फ़ोटो के साथ बाबा श्याम के जन्मोत्सव का सुंदर शुभकामना कार्ड बनाइए और स्टेटस पर लगाइए। बिल्कुल मुफ़्त, फ़ोटो कहीं अपलोड नहीं होती:
👉 https://sk9836413.github.io/shyam-premi-sn/janmotsav/?utm_source=whatsapp&utm_medium=forward&utm_campaign=janmotsav2026

रोज़ बाबा के दर्शन: https://www.youtube.com/@shyampremi-by1tb

सभी श्याम प्रेमियों तक यह संदेश पहुँचाएँ। 🌹 जय श्री श्याम 🌹
```
