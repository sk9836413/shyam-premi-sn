# Animated Shorts pilot (Kaggle free GPU)

**Status (3 Nov 2026):** pilot ban gaya: `animate/pilot.mp4` (1080x1920, 33 s, 3 animated scenes + 1 zoompan
fallback scene + end card). YouTube par upload NAHI kiya; owner pehle dekhenge.

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

## 7. daily.yml se jodna (agla kadam)
1. Kaggle token ko GitHub secret banana owner ka faisla hai. Repo public hai, isliye token sirf secret mein rahe.
2. Alag `animate.yml` banana jo pichhli raat ~21:00 IST par Kaggle job push kare, aur ek ghante baad clips fetch
   karke media Worker par rakhe.
3. daily.yml: clips mil gayi to scenes mein `video` jodo. Na milein to zoompan fallback chalega, post kabhi nahi rukegi.
4. Quota guard: 10 h se kam GPU bache to animation skip karo.
