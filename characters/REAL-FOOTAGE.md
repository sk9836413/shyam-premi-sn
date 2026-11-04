# Asli mandir footage: kahan se, kaise, aur kya nahi

Owner aur manager ke liye. Abhi har mandir ka chitra AI se banta hai (video par label "AI chitra (sanketik)").
Agar kisi mandir ki **asli video** mil jaye to "Dadi aur Chhotu" Short usi mandir ke liye apne aap asli video dikhayega
aur description mein credit likhega. Bas niche ke niyam se folder mein daalna hai.

## 1. Kahan se laayein (sirf ye raaste legal hain)

| Raasta | Kitna achha | Kya karna hai |
| --- | --- | --- |
| **Apni phone video** (owner, manager ya team mandir jaakar khud shoot kare) | **Sabse achha.** Video hamari, copyright hamara | Mandir ke andar shoot ki permission ho to hi andar shoot karein (kai mandiron mein garbh-griha ki video mana hai). Bahar ka drishya, shikhar, darwaza, aarti ki awaaz, mela: sab theek |
| **Bhakton ki video, likhit permission ke saath** | Achha | WhatsApp/email par likhit "haan" lein: "Main <naam> apni video Shyam Premi SN ko YouTube/Instagram/Facebook par istemal karne ki permission deta/deti hoon." Uska screenshot `licence.json` ke saath rakhein (repo mein nahi, apne paas) |
| **Mandir trust ki permission** | Achha | Trust ki official video ya photo, likhit permission (letter ya email) ke saath |
| **Pixabay / Pexels** (browser se khud search) | Theek | Dono ka licence commercial use allow karta hai, credit zaroori nahi par hum dete hain. **Dhyan:** video sach mein usi mandir ki ho (title, location dekhein). Doosre mandir ki video kabhi is mandir ki batakar mat lagana |
| **Wikimedia Commons** | Kabhi kabhi | Sirf **CC0**, **Public Domain** ya **CC BY** (2.0/3.0/4.0). Author ka naam credit mein jaata hai |

## 2. Kya NAHI lena (copyright strike ka khatra)

- Doosron ke **YouTube, Instagram, Facebook, Reels** ke video ya screenshot, chahe "credit" de dein. Credit dena permission nahi hai.
- **Google Images** ya kisi website se uthaye photo/video.
- Wikimedia par **CC BY-SA** (ShareAlike), **NC** (NonCommercial) ya **ND** (NoDerivatives) wale. Salasar ki Commons photos sab CC BY-SA hain, isliye nahi.
- TV channel, news channel, film ke clip, bhajan wali video (gaane ka copyright alag hota hai).
- Video jisme kisi ka chehra saaf dikhe aur us insaan ne permission na di ho (khaaskar bachche).

## 3. Folder mein kaise daalein

Repo `shyam-premi-sn` mein: `footage/<mandir-slug>/`. Slug wahi jo video ke `temple` field mein hota hai,
jaise `salasar-balaji`, `jeen-mata`, `khatu-shyam-mandir`, `mehandipur-balaji`.

Har video ke saath **usi naam ki `.licence.json`** file:

```
footage/salasar-balaji/shikhar-subah.mp4
footage/salasar-balaji/shikhar-subah.licence.json
```

`shikhar-subah.licence.json`:

```json
{
  "source": "own",
  "author": "Shyam Premi SN team",
  "licence": "own",
  "attribution": "Shyam Premi SN",
  "url": "",
  "shot_on": "2026-11-20",
  "notes": "Mandir ke bahar se, subah ki aarti"
}
```

`licence` mein sirf ye chalte hain (baaki ko renderer apne aap chhod deta hai):
`own`, `permission` (bhakt ya trust ki likhit permission), `Pixabay Content License`, `Pexels License`,
`CC0`, `Public Domain`, `CC BY 4.0` / `CC BY 3.0` / `CC BY 2.0`.
`source` aur `author` zaroori hain. Pixabay/Pexels/Commons ke liye `url` mein us video ka page link daalein.

**Video ka size:** 720p ya 1080p, 5-20 second, bina music (aawaz hata dein; hamara music aur awaaz upar lagta hai),
ek clip 20 MB se chhoti. Vertical ya horizontal dono chalega (renderer beech ka hissa kaat leta hai).

**Dhyan:** ye repo **public** hai: jo video yahan daali, use koi bhi download kar sakta hai. Apni video ke liye theek hai.
Bhakt ya trust ki video daalne se pehle unse ye bhi pooch lein ki public repo mein rakhna theek hai; nahi to us video
ko mat daalein, owner ko batayein (private storage ka intezaam alag se karna hoga).

## 4. Video mein kya hota hai

- Story ke jo chitra `real: true` hain (mandir, murti, darshan), wahan asli clip chalta hai, label "Asli drishya: <author>".
  Kahani wale drishya (sapna, khet, bailgaadi) AI chitra hi rehte hain, label "AI chitra (sanketik)".
- Description aur captions ke end mein credit apne aap judta hai: `Asli mandir drishya: <attribution> (<licence>, <url>)`.
- Folder khaali ho ya licence galat ho: video AI chitra se banta hai, post kabhi nahi rukta.
