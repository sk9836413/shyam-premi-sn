# Daily photo posts (Instagram feed + Facebook Page)

The owner wants 3-4 photo posts a day for interaction on Instagram. **Facebook gets ONE photo a day** (owner, 11 Nov
2026, Facebook monetization challenge; scripts/fb.mjs): post 1 at 06:30 IST, with its own Facebook text (`fb_caption`).
Posts 2-4 are Instagram only. `scripts/photos.mjs` chooses the pictures, temples, quote and
times; Claude only writes the texts into `story/photos/<date>/posts.json`. Then the script validates, renders the cards
(headless Chrome, brand/fonts), hosts them on the media Worker, SCHEDULES Facebook and queues Instagram (`.github/workflows/photos.yml`).

| # | Post | Facebook | Instagram |
|---|---|---|---|
| 1 | Suprabhat darshan (real temple photo, rotated by weekday deity) or the festival greeting on festival days | 06:30 IST | 09:13 IST |
| 2 | Aaj ka vichar (quote card from automation/vichar.json) | - | 10:43 |
| 3 | Mandir carousel: real photos + "3 baatein" fact slides | - | 18:46 |
| 4 | Sandhya aarti darshan of Khatu Shyam ji + a genuine question | - | 19:46 |

Instagram has no scheduled publishing, so it posts at the scheduler Worker's existing trigger times.

## What you write

Read `story/photos/<date>/plan.json` (one entry per post: `n`, `kind`, the temple/festival/quote chosen, and
`write`: exactly which fields you must write). Write `story/photos/<date>/posts.json`:

```json
{ "date": "2026-11-07", "posts": { "1": { ... }, "2": { ... }, "3": { ... }, "4": { ... } } }
```

Write only the posts listed in plan.json. Fields (all strings unless shown):
- `caption`: the post text without hashtags, 3-7 short lines, Hinglish (Roman) with one or two Devanagari lines,
  ending with ONE genuine question to the reader (a real question about their experience or devotion, e.g. "Aap Khatu
  Dham kab gaye the?", "Aapke ghar mein aaj kaunsi aarti hui?"). 120-900 characters.
- `hashtags`: array of 5-10 relevant hashtags that MATCH THE SUBJECT (owner, 13 Nov 2026): Khatu Shyam ji posts (and
  vichar / sandhya aarti) include `#JaiShreeShyam` or `#KhatuShyam`; a post about another deity, temple or festival uses
  its own tags (`#Somnath`, `#HarHarMahadev`, `#ChhathPuja`, `#Diwali2026` ...) and NO Khatu Shyam tags (the script drops
  them there). No banned or unrelated trending tags.
- darshan / festival (post 1) also goes to Facebook, so it has `fb_caption`: the Facebook template of
  automation/STORY.md "Facebook caption": line 1 = a Hindi (Devanagari) bhaav line + ONE genuine question ending in `?`
  (e.g. `सुप्रभात 🙏 हर हर महादेव। क्या आपने कभी सोमनाथ ज्योतिर्लिंग के दर्शन किए हैं?`), then 1-2 context lines (mostly
  Devanagari), then a blank line and exactly 3 hashtags matching the subject (scripts/fb.mjs fbHashtags): Khatu Shyam ji
  `#KhatuShyam #JaiShreeShyam #<topical>`; a festival not about Khatu `#ChhathPuja #ChhathiMaiya #Bhakti`; a deity/temple
  `#Mahadev #HarHarMahadev #Somnath` (never the Khatu tags on a non-Khatu post). No URL, no credit or
  AI line (the script adds them), no asks of any kind (like/share/comment/tag/follow/"likhein"/"bhejein").
- darshan / festival (post 1): `big` (Devanagari, max 16 characters, e.g. `सुप्रभात`, `शुभ दीपावली`), `line` (max 30, e.g.
  `जय श्री श्याम 🙏`), `place` (temple name in Devanagari, max 34, e.g. `सोमनाथ ज्योतिर्लिंग, गुजरात`; festival: a short
  festival line), `text` (a short Devanagari blessing, max 70).
- vichar (post 2): only `caption` and `hashtags`. The quote, its source and meaning are fixed by plan.json: quote them
  exactly as given, never change or add a quote.
- facts (post 3): `title` (Devanagari temple name, max 24), `line` (e.g. `3 बातें जो शायद आप नहीं जानते`, max 34),
  `facts`: exactly 3 objects `{ "dev": "...", "roman": "..." }` (Devanagari max 110 characters, the same fact in Hinglish
  max 130), and `sources`: at least 2 URLs on different sites that you actually opened and that confirm the facts.
- aarti (post 4): `big` (e.g. `शुभ संध्या`), `line` (e.g. `संध्या आरती 🪔 जय श्री श्याम`), `question` (the caption's question
  in Devanagari, max 70).

## Rules (hard; `node scripts/photos.mjs validate --date <date>` checks them)
- **Facts:** the accuracy rules of automation/mandir-series.md: every fact confirmed by two independent sources
  (temple trust, state tourism or district site, ASI, established news; Wikipedia only as a pointer). Legends are
  labelled ("manyata hai ki…", "मान्यता है कि…"). If sources differ, leave the fact out. No timings or prices.
  Prefer surprising but solid facts (architecture, history, the deity's form, a unique tradition).
- **Sati temples:** never chosen for photo posts. If one appears anyway, follow mandir-series.md (no mela/yatra, no praise).
- **No engagement bait** (Meta demotes it): no "share karo", "type karo Jai Shree Shyam", "comment YES", "like karo",
  "tag karo", "forward karo", no "warna/nahi to" threats, no money, luck or miracle promises. A genuine question is fine.
- **Honest pictures:** posts 1 and 3 use REAL photos (credited automatically). Post 4 and festival cards may be AI
  pictures: the script adds "AI चित्र (सांकेतिक)" on the image and "Chitra AI dwara banaya gaya hai (sanketik)." in the
  caption. Never write "asli darshan", "live darshan", "real photo" or "aaj ki taaza tasveer" for an AI picture, and
  never say a real photo was taken today.
- **Khatu Shyam ji** is worshipped as the SHEESH (head) only: never describe him with a body, arms or a flute.
- Festival dates come from automation/calendar.md only. The script adds the festival links (the card pages on the
  channel's own site, site/) and the photo credits itself: do not write URLs in captions.
- Tone: warm, respectful, simple. Hinglish spelled out ("hai", not "h"). Emojis at most 3 per caption.
