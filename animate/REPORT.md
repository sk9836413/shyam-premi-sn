# Animated Shorts pilot (Kaggle free GPU)

**Status (4 Nov 2026):** teeno Shorts animated: **subah** (6-8 scenes mein se 1-4 `animate` wale scenes), **shaam** aur
**noon** (4 scenes tak). 3 Nov data: animated Shakambhari noon Short 154 views / 17 likes (channel ka best), zoompan
darshan 13 views. `KAGGLE_API_TOKEN` secret set hai. Pilot: `animate/pilot.mp4`.

## 1. Rukawat (hal ho gayi)
- Pehle account phone-verified nahi tha, isliye GPU aur internet band the. Owner ne phone verify kiya, ab T4 x2 + internet chal raha hai.
- Pehle 2 GPU run memory (VRAM) kam padne se fail hue (~0.6 h gaye). Fix: text encoder alag process mein, aur transformer ke weights
  fp8 mein store (compute fp16) - peak VRAM 10.3 GB.
- Jo bhi bana sab private hai: dataset `sps-animate-inputs`, kernel `sps-animate-pilot`.

## 2. Model: Wan 2.2 TI2V-5B kyun
- Wan 2.2 TI2V-5B (chuna gaya):
  - Licence Apache-2.0: commercial use OK, koi revenue limit nahi.
  - Image-to-video hai, yaani hamari FLUX image se shuru hota hai, isliye Shyam ji ka roop har clip mein same rehta hai.
  - T4 (16 GB) par chalta hai: weights fp8 mein store, compute fp16 (fp16 weights + activations 15 GB se zyada the).
- Wan 2.1 T2V-1.3B: sirf text-to-video hai, isliye har clip mein character badal jayega. Sirf background shots ke liye theek.
- LTX-Video 2B distilled: sabse tez, par licence $10M revenue tak hi free hai, aur bf16 wala model T4 par test nahi hua. Ye Plan B hai.
- Pilot settings: 704x704, 121 frames @24 fps (5 s), 30 steps. T4 x2 par 2 clip ek saath.

## 3. GPU time (asli, kaggle-out/results.json se)
Settings: 704x704, 121 frames @24 fps (5 s), 30 steps, guidance 5, weights fp8-store/fp16-compute, T4 x2.
- Session setup: model download 153 s + text encoder 77 s + model load ~90 s = **~5.5 min**
- **Ek 5 s clip = ~1,720 s = ~28.7 min ek T4 par.** Dono T4 saath chalte hain, to session time ~14.4 min per clip.
- **Ek Short (4 clip) = 3,939 s session = ~66 min = ~1.1 GPU-hour.**
- Is hafte kul use: 1.71 h (30 h mein se; isme ~0.6 h fail runs ke). Pilot budget 8 h ke andar.
- Andaza (test nahi kiya): 81 frames + 640x640 + 20 steps se clip ~4x sasti (~7 min ek T4 par), quality thodi kam.

## 4. ~20 GPU hours/week mein kitna banega
- Abhi wali settings par: ~1.1 h per Short, yaani **sirf animated Shorts banayein to ~18 Shorts/hafta**.
- Mix: roz shaam ka darshan Short animated (7 x 1.1 = ~7.7 h) + bache ~12 h mein ~20-23 long-video scenes
  (16:9 1280x704 clip ~2x mehenga, ~30 min session per clip), yaani har long video mein sirf 3 animated scenes.
- Sasti settings (upar) se ye lagbhag 3-4 guna ho sakta hai: pehle ek test run karke quality dekhni hogi.
- Kaggle total 30 h/hafta hai; baaki ~10 h doosre project ke liye.

## 5. Quality notes
- FLUX start frames achhe bane; galat iconography wali murti (peela chehra, safed daadhi) pehle hi reject ki.
- Clip 0 (mandir + diye): achha. Camera dheere andar jata hai, imaarat stable, diye chamakte hain. ACCEPT.
- Clip 1 (pankhudiyan): asli girti pankhudiyon ki dhaar; aakhir mein thodi ghani ho jaati hai, par sundar lagti hai. ACCEPT.
- Clip 2 (Shyam ji murti): chehra poori clip mein bilkul same aur sahi, koi bigaad nahi. Motion bahut halka
  (lagbhag still + halka zoom), yani safe hai par "wow" kam. ACCEPT.
- Clip 3 (aarti): bhakt ka chehra theek, lekin 2.5 s ke baad diye ke paas neela/rainbow dhuen jaisi lakeer aati hai
  aur thali gol nahi ghoomti. **REJECT** (animate/clips-rejected/). Renderer ne us scene ke liye apne aap
  FLUX still + zoompan lagaya: fallback kaam karta hai.
- Narration lambi hone se clip (5 s) scene (6-7.5 s) se chhoti padi: renderer ne 1.3x slow kiya aur aakhri ~1 s
  frame roka. Aage: clips 7 s (169 frames) ki banayein, ya narration chhoti rakhein.
- Verdict: asli motion zoompan se kaafi behtar dikhta hai (mandir aur phool wale shots), murti safe hai. Lekin
  T4 par mehenga hai (~29 min per clip), aur 4 mein se 1 clip reject hui, to human review zaroori hai.

## 6. Phone verify ke baad pilot banane ke steps
1. `set KAGGLE_CLI=<kaggle.exe ka path>`
2. `node animate/kaggle.mjs push` (lagbhag 40 min chalega)
3. `node animate/kaggle.mjs status`, jab tak COMPLETE na ho
4. `node animate/kaggle.mjs fetch`
5. Clips check karo (upar ka reject niyam)
6. `node story/render-story.mjs animate/scenes.json`
7. Output ko `animate/pilot.mp4` par copy karo. YouTube par upload nahi karna, pehle owner dekhega.

## 7. daily.yml mein kaise juda hai (3 Nov 2026 se)
- **Timing:** scheduler Worker 10:43 IST par `slot=evening` dispatch karta hai (pehle 18:46/19:46). Animation ~66 min,
  render, phir YouTube upload **private + publishAt 19:00 IST**: YouTube khud 19:00 baje public karega. 18:46 IST wala
  dispatch retry hai: agar log.md mein aaj ka evening already hai to kuch nahi karta (double post nahi).
- **Evening job:** Claude scenes likhta hai (evening scenes mein `animate` + `deity`, tts <= 60 akshar) -> FLUX images +
  narration ki lambai (`render-story.mjs --prepare`) -> private dataset `sps-animate-inputs` ka naya version ->
  private kernel `sps-animate-daily` (T4 x2, max 4 scenes, clip ki lambai scene jitni, 81-169 frames) -> 100 min tak
  wait -> clips fetch -> automatic reject check -> render (animated + har scene ka zoompan fallback) -> upload.
- **Fallback:** secret nahi, Kaggle fail/time out, ya hafte mein 10 GPU-hour se kam bache -> sab scenes zoompan.
- **Automatic reject check** (`animate/check-clips.mjs`, run summary mein table):
  - deity/murti scene: beech aur aakhri frame ke chehre (centre) ka SSIM pehle frame se; 0.6 se kam = reject.
  - har clip: frame-difference spike (> 6x median = flicker/jump) aur nayi rang ki lakeer (start frame mein na ho
    aisa hue > 0.2% pixels) = reject.
  - Pilot par tune kiya: mandir, phool, murti pass (murti SSIM 0.82); aarti wali rainbow lakeer fail (0.73%);
    ek nakli "chehra badla" clip bhi fail (SSIM 0.40).
- **GPU kharcha:** ~66 min (~1.1 h) per shaam ka Short, yaani ~7.7 h/hafta. Kaggle 30 h/hafta; 10 h se kam bache to skip.
- **Abhi bhi baaki:** Instagram/Facebook (Make) wala step evening Short ko turant (dopahar) bhejta hai, 19:00 ko nahi;
  Make abhi chalu nahi hai, chalu karte waqt ise 19:00 par shift karna hoga.

## 8. Subah ka Short bhi animated (4 Nov 2026)
- Claude subah ke 1-4 sabse sundar scenes (murti darshan, mandir, katha ka mukhya pal) par `animate` lagata hai; unka
  tts <= 80 akshar (clip max 7 s). Baaki scenes zoompan. validate.mjs ye jaanchta hai; shaam ke niyam same hain.
- Subah turant publish hota hai (publishAt nahi). Animation ki wajah se subah ka Short ~70-90 min der se aata hai
  (09:13 IST dispatch -> ~10:30-10:45 IST), aur long video bhi utna baad mein banta hai (12:30 publish tab bhi theek).
- **Kaggle concurrency:** ek account par ~2 batch GPU sessions ek saath (Kaggle forum ke anusaar). Isliye:
  - har slot ka apna kernel (`sps-animate-morning/-evening/-noon`) aur apna dataset (`sps-animate-inputs-<slot>`):
    ek run doosre ke inputs/outputs nahi bigaad sakta (dataset version race khatam);
  - `lock`: ek waqt mein hamara ek hi session; shaam 45 min tak, subah/noon 15 min tak intezaar, phir zoompan;
  - session 20 min se zyada queue mein raha to workflow zoompan par chala jata hai, aur kernel (START_BY) der se
    shuru hone par turant band ho jata hai, taaki GPU hours bekaar na jaayein.
- **Quota guard:** BlessVision apne account par ja raha hai, isliye ab: subah ko kam se kam 5 GPU-hour bache hon,
  shaam/noon ko 3. Kharcha ~2 x 1.1-1.4 h/din = ~16-20 h/hafta (30 mein se).
- **Dry run (4 Nov):** sample subah scenes.json (4 `animate` scenes) validate OK; 5+ marked, 0 marked, aur 90-akshar tts
  sahi tarah fail; `render-story.mjs --prepare` ne plan banaya; `kaggle.mjs prepare --dry-run` ne sirf marked scenes
  (0,1,2,6) chune, frames 93/117/101/121 (scene ki lambai ke hisaab se). Live lock/quota check OK (26.5 h bache).
