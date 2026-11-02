# Animated Shorts pilot (Kaggle free GPU)

**Status (3 Nov 2026):** code ready hai, par Kaggle ka run ruka hua hai. Account par GPU aur internet dono band
hain, isliye abhi tak koi clip nahi bani aur pilot.mp4 bhi nahi bana.

## 1. Rukawat (owner ko karna hai)
- Kernel 4 baar push kiya, har baar enable_gpu, enable_internet aur NvidiaTeslaT4 ke saath. Har baar
  session CPU image par chala (torch +cpu, cuda False), aur internet bhi blocked tha (DNS fail).
- GPU aur internet ek saath band hone ka matlab: account phone-verified nahi hai.
- **Fix (2 minute):** kaggle.com > Settings > Phone verification.
- GPU use: 0 h, 30 h mein se (quota 7 Nov ko reset hoga).
- Jo bhi bana sab private hai: dataset `sps-animate-inputs`, kernel `sps-animate-pilot`.

## 2. Model: Wan 2.2 TI2V-5B kyun
- Wan 2.2 TI2V-5B (chuna gaya):
  - Licence Apache-2.0: commercial use OK, koi revenue limit nahi.
  - Image-to-video hai, yaani hamari FLUX image se shuru hota hai, isliye Shyam ji ka roop har clip mein same rehta hai.
  - T4 (16 GB) par fp16 mein fit hona chahiye.
- Wan 2.1 T2V-1.3B: sirf text-to-video hai, isliye har clip mein character badal jayega. Sirf background shots ke liye theek.
- LTX-Video 2B distilled: sabse tez, par licence $10M revenue tak hi free hai, aur bf16 wala model T4 par test nahi hua. Ye Plan B hai.
- Pilot settings: 704x704, 121 frames @24 fps (5 s), 30 steps. T4 x2 par 2 clip ek saath.

## 3. GPU time (abhi andaza hai, asli run ke baad kaggle-out/results.json se update karna)
- Session setup (34 GB model download + load): ~12–15 min
- Ek 5 s clip: ek T4 par ~10–12 min, T4 x2 par ~5–6 min session time
- Ek Short (4 clip): ~35–40 min, yaani ~0.6–0.7 GPU-hour
- Sasta option: 81 frames, 640x640 ya 20 steps. Isse ek clip ~3 min ki ho jati hai.

## 4. ~20 GPU hours/week mein kitna banega
- Lagbhag 14 animated Shorts (subah + shaam) aur ~60 long-video scenes, ya bina long video ke ~30 Shorts.
- Baaki ~10 h Kaggle account ke doosre project ke liye bachenge.

## 5. Quality notes
- FLUX start frames achhe bane: diyon wala mandir, girti pankhudiyan, Shyam ji darshan (shyam rang, mor-pankh
  mukut) aur aarti karta bhakt.
- Galat iconography wali murti (peela chehra, safed daadhi) reject ki.
- Wan ke jokhim: chehra badal jana, haath bigadna, flicker.
- Reject niyam: har clip ka pehla, beech ka aur aakhri frame dekho. Chehra badla, ungliyan galat hain ya koi
  text dikhe to clip hata do. Us scene ke liye renderer apne aap purana tarika (FLUX still + zoompan) laga dega.

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
