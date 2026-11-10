# Khatu Shyam Janmotsav 2026: card tool promotion

Janmotsav = Dev Uthani (Prabodhini) Ekadashi, **Friday 20 Nov 2026** (Drik Panchang, New Delhi: Ekadashi 20 Nov 07:15 to
21 Nov 06:31, parana 21 Nov 13:11-15:18; Prokerala, Ujjain: 20 Nov, 07:16 to 06:32).

Tool: https://www.epifive.com/tools/khatu-shyam-janmotsav-greeting-card (free card with name and photo, 1080x1920 status
and 1080x1080 post, WhatsApp share; the photo never leaves the phone).

## Automatic (no action needed), 17-20 Nov 2026

`scripts/festival-links.mjs` adds one line with the link, tagged `utm_source=youtube|instagram|facebook`,
`utm_medium=social`, `utm_campaign=janmotsav2026`, `utm_content=<slot or photo kind>`, only while the page returns 200:

- Videos (daily.yml): YouTube description, Instagram caption and Facebook caption of every upload whose day is 17-20 Nov:
  morning/evening/noon Shorts, the 20 Nov status Short, long videos, Khatu movie parts (by release day) and Kalyug parts.
  The line goes after the first paragraph (visible before "...more").
- Photo posts (photos.yml via scripts/photos.mjs): the morning darshan post, the Khatu sandhya aarti post and any
  calendar-festival post (the 20 Nov Janmotsav greeting), on Facebook and Instagram.

Upload counts, slots and scheduler crons are unchanged.

## Manual: WhatsApp forward (copy as is)

```
🙏 *जय श्री श्याम* 🙏

इस बार *खाटू श्याम जन्मोत्सव* (देवउठनी एकादशी) *शुक्रवार, 20 नवंबर 2026* को है।

अपने नाम और चाहें तो अपनी फ़ोटो के साथ बाबा श्याम के जन्मोत्सव का सुंदर शुभकामना कार्ड बनाइए और स्टेटस पर लगाइए। बिल्कुल मुफ़्त, फ़ोटो कहीं अपलोड नहीं होती:
👉 https://www.epifive.com/tools/khatu-shyam-janmotsav-greeting-card?utm_source=whatsapp&utm_medium=forward&utm_campaign=janmotsav2026

रोज़ बाबा के दर्शन: https://www.youtube.com/@shyampremi-by1tb

सभी श्याम प्रेमियों तक यह संदेश पहुँचाएँ। 🌹 जय श्री श्याम 🌹
```
