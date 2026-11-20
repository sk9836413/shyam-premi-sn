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

## 5. Asli photos apne aap (Wikimedia Commons, 5 Nov 2026 se)

`scripts/real-photos.mjs` har mandir ke liye Wikimedia Commons se **sirf CC0, Public Domain ya CC BY** photos laata hai
(licence file ke apne extmetadata se padha jata hai; CC BY-SA, NC, ND, GFDL, "fair use", anjaan licence, ya bina author
naam wali file: sab reject). Sirf **usi mandir** ki file: mandir ki apni Commons category (`footage/temples.json`) mein ho,
aur title/category mein mandir ka naam ho; milte-julte naam wale doosre mandir (`not`) hata diye jaate hain. Photo
`footage/<mandir>/commons-<naam>.jpg` (1600 px, ~q80, 500 KB se kam) + `.licence.json` (source, author, licence,
licence_url, attribution, url) mein aati hai, `search.json` mein likha rehta hai kya mila aur kyun chhoda.

- Daily workflow: video ke `temple` ka folder khaali ho to render se pehle apne aap fetch (30 din mein ek baar search).
- Renderer: `real: true` wale mandir ke scenes par asli photo, dheere zoom/pan (Ken Burns) ke saath, label "Asli photo:
  <author>". Katha/legend wale scenes AI chitra hi rehte hain.
- Description mein apne aap: `Photo: <author>, <licence>, via Wikimedia Commons (<file ka page>)`.
- Galat photo dikhe: uska Commons title `footage/temples.json` mein us mandir ke `skip` mein daalein aur file hata dein.
- Naya mandir: `node scripts/real-photos.mjs --find "<naam>"` se category dhoondhein, temples.json mein jodein.

## 6. Shyam Baba ke asli darshan stills (owner, 20 Nov 2026)

Owner ne ek **Shyam Baba pandal (sajavat)** mein khud darshan record kiye (5 video + 5 photo). Ye Khatu Shyam ji ka
Sikar wala mandir **nahi** hai, isliye folder ka naam alag hai: `footage/shyam-baba-pandal-darshan/`
(kabhi `khatu-shyam-mandir` mein mat daalna).

- 23 JPEG (video frames 1080 px chaude, 1350 px photos, har ek 400 KB se kam): `safed-shringar-01..08` (safed phool
  shringar), `gulab-shringar-01..08` (laal gulab shringar), `akhand-jyot-01..02`, `pandal-darbar-01..05` (owner ki
  photos, decorator ka board aur zyada-tar log crop kiye). Frame sharpness (Laplacian) se chune, kisi bhakt ka chehra
  nahi; sirf Lanczos upscale + halka levels, **koi AI badlav nahi**.
- Har `<naam>.licence.json`: `source`/`licence` "own", `author`/`recorded_by` "Shyam Premi SN", `place` "Shyam Baba
  pandal (sajavat), not the Khatu mandir", `date` "2026-11", `kind` (safed / gulab / jyot / pandal), `view`,
  `deity_face`, `focus` (chehra kahan hai: crop isi ke aas-paas), `size`, `from` (kaun si video, kaunsa second).
- Pipeline (`scripts/shyam-darshan.mjs`): Shorts aur status ke har Shyam Baba darshan scene par, photo post 4 (Sandhya
  aarti) aur Khatu festival card (Janmotsav, Ekadashi) par, long video ke darshan image par yahi asli still aata hai,
  AI chitra nahi. Label: "Asli darshan: Shyam Baba pandal, Shyam Premi SN". Credit line: "Asli darshan: Shyam Baba ka
  pandal (sajavat), Shyam Premi SN ne khud record kiya; Khatu mandir nahi". Inpar "AI chitra" label nahi lagta
  (`scripts/ai-disclosure.mjs`, scene ka `real_image`). Katha ke scene (Barbarik, sheesh daan, mandir ki imaarat, bheed)
  AI chitra hi rehte hain. Band karna ho to `SPS_SHYAM_REAL=0`.
- Naye still jodne hon: isi folder mein `<naam>.jpg` + `<naam>.licence.json` (upar jaise fields), sirf owner ki apni
  recording. Kisi aur ki video/photo kabhi nahi.
