# Animated Shorts pilot (Kaggle free GPU)

**Status (5 Nov 2026):** quality upgrade live (section 10: RIFE 30 fps, Real-ESRGAN, 14B hero, ambience). **Pehle (4 Nov):** teeno Shorts animated: **subah** (6-8 scenes mein se 1-4 `animate` wale scenes), **shaam** aur
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

## 9. Chatterbox voice test (4 Nov 2026): abhi switch NAHI kiya
- **Model:** Chatterbox Multilingual v3 (Resemble AI, MIT), Hindi. Narrator ki reference awaaz model-generated hai
  (Kokoro-82M ke Apache-2.0 voices hm_omega / hf_alpha, `voice/ref-male.wav`, `voice/ref-female.wav`): kisi asli
  insaan ya kathavachak ki nakal nahi. Seed 1234, exaggeration 0.4, cfg 0.5, temperature 0.7 fix.
- **Speed:** CPU (4 core, GitHub runner jaisa) par RTF ~8.2: 60 s Short = ~8-9 min + install/model ~3 min = ~11 min,
  long video (5-6 min) = ~45 min: dono target se bahar. Kaggle T4 par RTF ~1: ek Short (38 s awaaz) = 67 s generate +
  33 s load + 20 s install = **~2.5 min GPU**; long video ~6-8 min. Isliye plan: animate kernel ke andar pehle awaaz,
  phir clips (clip ki lambai asli awaaz se); long video ke liye chhota kernel `sps-tts-long`.
- **A/B:** `animate/voice-ab.mp3` (pehle edge-tts MadhurNeural, phir Chatterbox; same 3 lines). Whisper large-v3 se
  har line ka transcript nikal kar galti (CER) napi:
  - edge-tts: 5 lines par ~4.8% CER; "श्याम", "खाटू", "बर्बरीक" sab sahi.
  - Chatterbox: asli 50 s morning Short par ~8% CER. **"श्याम" ko baar-baar "शाम"** bola (5 mein se 4 baar, "Shyam Premi
    SN" bhi "Shaam Premi"), **"गणेश" ko "गनेज"** (4/8 lines), aur mantra "ॐ श्री श्याम देवाय नमः" bigad gaya ("ओम सी शाम
    देवाई नमा", 37% CER; ॐ ko "ओम्" likhne ke baad bhi). Naam theek: बर्बरीक, खाटू, सालासर.
  - Female (hf_alpha ref): "खातुश्यान बाबा", "तोर" - aur kamzor.
- **Faisla:** channel ka mukhya shabd "Shyam" hi galat bolta hai, isliye **switch nahi kiya**; edge-tts hi chal raha hai.
  Code taiyaar hai par band hai: repo variable `SHYAM_TTS=chatterbox` se chalu hoga (Shorts: animate kernel mein awaaz;
  long: `sps-tts-long`; koi bhi gadbad ho to edge-tts fallback). Chatterbox har clip mein Resemble ka inaudible PerTh
  watermark daalta hai: use hataya nahi jayega.
- **Agla vikalp: Indic Parler-TTS** (AI4Bharat, Apache-2.0, Hindi speakers Rohit/Divya, 0.9B). Repo "gated" (auto-approve)
  hai: download ke liye Hugging Face account + token chahiye. Owner ka kaam: HF account banakar model page par terms
  accept karein aur ek read token dein; tab wahi A/B (Whisper CER, Shyam/Ganesh/mantra) Parler par chalayenge.

## 10. Quality upgrade, sirf free resources (5 Nov 2026)
Lakshya: YouTube ke in-app Veo jaisa look, bina paid API ke. Sab kuch Kaggle ke free T4 x2 par ya CI/ffmpeg mein.
**A/B (upload NAHI kiya):** `animate/ab-quality/before.mp4` (aaj ka evening Banke Bihari darshan, purani pipeline:
wahi Wan 5B clips jo live hue, 2 deity clips reject hokar zoompan) aur `after.mp4` (wahi scenes, wahi Workers-AI start
frames, nayi pipeline: 4/4 animated, scene 1 = 14B hero clip). `hero-14b.mp4` = 14B clip akela (1080 px, 30 fps),
`after-kaggle-flux-frames.mp4` = Kaggle FLUX start frames wala variant. Dono 30.6 s, -14.2/-14.4 LUFS.

### 10.1 Kya badla (har animated slot mein: subah, shaam, status, noon Dadi-Chhotu)
1. **Post-processing har clip par** (`animate/kaggle/enhance.py`, kernel ke andar):
   - RIFE 4.25 frame interpolation: Wan ke 24 fps (14B: 16 fps) se asli 30 fps, aur scene lambi ho to clip ko 1.3x tak
     smooth slow karta hai (pehle renderer frames duplicate karta tha = jhatka). Har clip ~36-53 s GPU.
   - Real-ESRGAN x4 (realesr-general-x4v3) -> 1080 px: detail (Laplacian variance) purane lanczos+unsharp se
     **1.7-2.0x** (aaj ke 3 clips: 372->643, 221->441, 68->127). Stills (zoompan scenes + reject hui clip ka fallback)
     2160 px tak upscale: 4 images 9-13 s.
   - Renderer (`story/render-story.mjs`): halka warm grade + vignette, subtle temporal film grain, halka sharpen
     (`SPS_LOOK=0` se band). Dadi-Chhotu: lip-sync clips Real-ESRGAN se 1080 px (mouth par interpolation nahi).
   - RIFE ki wajah se Wan ab ~12% kam frames banata hai (1.1x ki jagah 1.25x stretch): yahi bachat baaki kharch bhar deti hai.
2. **Start frames:** Kaggle par FLUX.1-schnell (GGUF Q6_K, 1024 px, 8 steps) test kiya: 4 frames = **7.7 min GPU**
   (download 98 s, text 79 s, load 45 s, ~55 s/frame). 3/4 frames zyada cinematic (scene 4 mein Workers-AI wali kaali
   patti bhi nahi), lekin 1 Krishna murti **gora (fair) ban gaya** = iconography galat. Faisla: default **OFF**
   (`SPS_FLUX=1` se on); naya lighting/lens/composition prompt (`framePrompt`) ab Workers AI par hi lagta hai (neurons
   utne hi), aur STORY.md mein niyam: deity prompt mein rang/iconography saaf likho ("blue-skinned Lord Krishna").
   FLUX.1-dev kahin nahi (non-commercial). Q8_0 T4 par OOM hua, isliye Q6_K.
3. **Bada model: Wan 2.2 I2V-A14B** (GGUF Q4_K_S, high-noise expert GPU0, low-noise + VAE GPU1, Lightning 4-step LoRA):
   - 640x640 (480p ke barabar pixels), 81 frames (5 s): **17.3 min generation** + 2.8 min download + 1.3 min load
     (text encoder 5B wala hi, same weights) = **~22 min per hero clip**. Peak VRAM 12.7/13.2 GB.
   - 960x960 (720p): **T4 par OOM**. LoRA ke bina 40 steps: ~284 min/clip (andaza) = bekaar.
   - Quality: wahi start frame par 5B clip mein haath ke paas petal/flame ka "burst" tha (isi se reject hua); 14B clip
     saaf, murti stable (SSIM 0.86), camera smooth push-in.
   - **Live:** sirf shaam, ek hero clip (scene `hero: true`, warna pehla deity scene), jab hafte mein >= 6 GPU-h bache hon
     (`SPS_HERO14B=0` se band). Fail/budget kam = wahi scene 5B se banta hai.
   - **TPU:** Kaggle ka v3-8 ab retired hai (CLI default TpuV5E8). API se 3 baar TPU kernel push kiya, har baar session
     CPU par chala (jax `CpuDevice`, 4 core, 31 GB). MaxDiffusion (JAX, Apache-2.0) Wan 2.2 I2V chalata hai, par sirf
     v5p/v6e/v7x par tested, aur 2x14B bf16 (54 GB) ko 16 GB/chip par shard karna padega: abhi **practical nahi**.
4. **Sound:** render-story mein ambience bed, sab ffmpeg se synthesize (koi third-party audio nahi, credit ki zaroorat
   nahi): mandir ki hawa (brown noise), door ki bhakt-bheed ki gunjan (band-pass pink noise + modulation), diye ki
   chatak (random clicks), har scene badalne par door ki ghanti. Scene ke shabdon se chunav (aarti/temple/nature/quiet,
   `spec.ambience` override). Music+ambience voice ke neeche **sidechain ducking**, poora mix **-14 LUFS**.
   Dadi-Chhotu mein pehle se apna synthesized SFX + -14 LUFS hai.
5. **Motion prompts + check:** `motionPrompt()` = subject + camera (motion se) + micro-motion + stability guard;
   deity scene mein hamesha seedha push-in aur "murti bilkul sthir, sirf diye/dhuan/phool hilte hain". check-clips:
   face check ab camera move dhundh kar (zoom 0.9-1.2x, shift 12% tak) SSIM nikalta hai, aur flicker tabhi jab frame ka
   >= 25% ek saath badle. Aaj ke 4 clips: **purana check 2/4 accept, naya 4/4** (dono false reject the: ek sideways
   drift SSIM 0.34 -> 0.77, ek petal "spike" 6.6x). Nakli cut (2 clip jode) aur rainbow-streak wali clip ab bhi reject.

### 10.2 GPU minutes per Short (session time, Kaggle T4 x2)
| Short | Pehle (asli) | Ab |
|---|---|---|
| Shaam (4 clips) | 77 min (aaj 4,625 s) | ~80 min (14B hero ~22 + 3 clips 5B ~52 + setup/enhance ~6); hero ke bina ~65 |
| Subah (4 clips) | ~77 min | ~65 min (12% kam frames, +1.6 min enhance, +0.2 min stills) |
| Status (3 clips) | ~77 min (2 clip ek GPU par) | ~65 min |
| Noon Dadi-Chhotu | 6-7.5 min | ~8-9.5 min (Real-ESRGAN) |
| Kaggle FLUX frames (optional) | - | +7.7 min |
A/B session asli: purana 77.1 min, naya (FLUX on, frames purane jitne) 82.8 min; enhance test 3 clips = 2.7 min session.
**Hafta (7 subah + 7 shaam + 7 noon + ~4 status):** pehle ~23.9 h (upper bound), ab ~22.3 h, 30 h quota mein.
Guards wahi: subah >= 5 h, shaam/noon >= 3 h, hero sirf >= 6 h par. Is upgrade ke tests mein ~2.5 GPU-h lage (quota 16.2 h bacha, reset 7 Nov 00:00 UTC).

### 10.3 Licence (sab commercial use OK)
| Component | Licence |
|---|---|
| Wan 2.2 TI2V-5B, Wan 2.2 I2V-A14B (Wan-AI) | Apache-2.0 |
| QuantStack/Wan2.2-I2V-A14B-GGUF | Apache-2.0 |
| lightx2v/Wan2.2-Lightning (4-step LoRA) | Apache-2.0 |
| FLUX.1-schnell (Workers AI; Kaggle: city96 GGUF + lzyvegetable mirror) | Apache-2.0 (FLUX.1-dev NC, use nahi) |
| Real-ESRGAN code + realesr-general-x4v3 weights (xinntao, official release) | BSD-3-Clause (notice enhance.py mein) |
| Practical-RIFE code + v4.25 weights (hzwer; README: downloads "same MIT license") | MIT; weights HF mirror Bash2X/RIFE-Models se, SHA-256 pinned |
| MuseTalk 1.5 (lip-sync, pehle se) | MIT / weights commercial OK |
| ffmpeg filters (grade, grain, ducking, loudnorm), synthesized ambience | tool; output hamara, koi credit nahi |
| edge-tts awaaz (pehle se) | pehle jaisa |
| MaxDiffusion (sirf TPU test) | Apache-2.0, use nahi |
GFPGAN/CodeFormer (NC hisse) ab bhi kahin nahi. Freesound ka koi audio use nahi hua, isliye credits log khaali.

## 12. Workers AI neurons khatam (4006): Kaggle FLUX fallback + neuron budget (6 Nov 2026)
- **Kya hua:** 6 Nov ko Workers AI ke 10,000 free neurons 09:15 IST se pehle hi khatam (`4006: daily free allocation`);
  subah ka Short, long video aur pehla shaam ka try image banate hi fail hue. Asli kharcha ~326 neurons/image (4 steps),
  yaani din mein sirf ~30 images, jabki production ko ~38 chahiye (subah 8, long ~12, noon ~6, shaam ~6, status 3,
  photos 1-2, Veo 3). Quota 00:00 UTC (05:30 IST) par reset hota hai.
- **Ab har image ka rasta** (`animate/frames.mjs`, workflow mein Animate/Render se pehle "Images" step: subah, shaam,
  noon visuals, status, long, photo posts):
  1. Workers AI FLUX.1-schnell (pehle jaisa) jab tak chale;
  2. 4006/koi bhi error: bachi images ek chhote Kaggle session mein FLUX.1-schnell se (Apache-2.0, GGUF Q6_K, 1024 px,
     8 steps; private kernel `sps-frames-<slot>`, `animate/kaggle/frames_kernel.py` + `flux_frames.py`), ~6 min setup +
     ~1 min/image;
  3. phir bhi kuch na mile: renderer khud stand-in lagata hai: Khatu Shyam ji = `brand/photo-bank/khatu` (sheesh roop),
     tyohar = `brand/photo-bank/<festival>`, warna spec ke mandir ki licence-safe asli photo (credit ke saath), warna saada
     garam rang ka background. **Post kabhi skip nahi hota.** Veo kit mein bhi yahi stand-in.
- **Iconography:** prompt mein Khatu Shyam ji ho aur "sheesh/head only" na ho to STORY.md wala sheesh description apne aap
  judta hai (`iconography()`); Barbarik (sheesh daan se pehle) par nahi.
- **Neuron budget:** scheduled production ko Workers AI pehle. Long video ab `--kaggle-first` (Kaggle pehle, phir Workers
  AI), taaki uske ~12 images (~4k neurons) shaam/status ke liye bachen. Har run ke summary mein ledger line:
  "Images (<slot>): N needed, Workers AI x (~y neurons), Kaggle FLUX z, stand-ins w". `force_fallback` workflow input
  Workers AI ko chhod kar fallback test karta hai.
- **Pilots / experiments (movie aur character agent ke liye request):** Workers AI mat use karo. `characters/gen-images.mjs`
  aur koi bhi naya pilot script `animate/frames.mjs --kaggle` (ya `ensureImages(jobs, { kaggleFirst: true, slot: 'pilot' })`)
  se images banaye: kernel `sps-frames-pilot`, Workers AI ka ek bhi neuron nahi. `animate/gen-images.mjs` ab default yahi
  karta hai (`--workers-ai` sirf owner ke kehne par).

## 13. Mini-movies (6 Nov 2026): multi-part katha films, GPU per part, weekly math
Code: `story/movie.py` (CI: voices, tier, dataset, render), `story/movie_kernel.py` (ONE Kaggle session per part, kernel
`sps-movie`: FLUX.1-schnell frames 576x1024 -> Wan 2.2 TI2V-5B clips 576x1024 (+1 hero clip Wan 2.2 I2V-A14B 480x832) ->
RIFE 30 fps + Real-ESRGAN 1080x1920 -> MuseTalk lip-sync -> Whisper large-v3-turbo pronunciation check). Workers AI
neurons: zero. Cast library `characters/cast/` (portraits picked by a person, base clips reused by every series).
Spec/rules: STORY.md section 7, queue `automation/movie-series.md`.

### 13.1 Pilot = Part 1 of "Khatu Shyam ji ki Amar Katha" (E:\SK\movie-pilot\part-1.mp4, NOT uploaded)
136 s, 1080x1920 30 fps, 23 lines, 7 scenes (4 animated incl. the 14B hero), 8 close-ups. Session **8,671 s = 144.5 min**:
| Stage | Seconds | Note |
|---|---|---|
| FLUX frames | 614 | 14 images (8 scene/teaser + 6 Krishna/Hanuman portrait retries), ~3.5 min setup, ~33 s/image |
| Wan setup | ~300 | download 154 s, text encoder 68 s, load |
| 14B hero clip (s1) | 1,523 | 480x832, 81 frames, 4 steps + Lightning; generation 1,257 s, enhance 42 s |
| Wan 5B, 3 scene clips | 1,472-1,622 each | 576x1024, 97 frames, 25 steps (~15.5 s/frame on one T4) |
| Wan 5B, 4 cast base clips (one-time) | 1,140-1,253 each | 81 frames; GPU0 68 min vs GPU1 90 min (7 clips = unbalanced) |
| Lip-sync | 412 | 8 lines, setup 72 s |
| Whisper check | 50 | mean CER 5.1 % (same as the 4 Nov edge-tts baseline); Shyam, Khatu, Kurukshetra right |
One-time costs in that session: 4 base clips (~21 min of session) + 6 portraits. Earlier the same day: 37 cast portraits,
1,353 s (22.5 min).

### 13.2 GPU minutes per part (session time, Kaggle T4 x2), from the pilot's measured stage times
| Tier (story/movie.py) | What | Minutes |
|---|---|---|
| full | 8 frames + hero 14B + 3 Wan clips + lip-sync + check | ~100 |
| standard | 8 frames + 4 Wan clips + lip-sync + check | ~76 |
| lite | 8 frames + 2 Wan clips + lip-sync + check | ~49 |
| stills | 8 frames + lip-sync + check (stills with camera moves) | ~18 |
| + new character | one base clip (81 frames) | +~21 per pair, once |
Wan clips run in pairs (one per T4), so 4 clips cost the same wall time as 3: tiers use even counts.
Khatu series: Part 1 = the pilot (if the owner approves it as is, upload that file and skip the 13 Nov session: -1.7 h);
Part 2 full ~100; Part 3 full + Krishna and Khatu Shyam base clips ~120; Part 4 full + Bheem base clip ~115. Total ~5.6 h
over the weeks of 7-13 and 14-20 Nov.

### 13.3 Weekly math (30 GPU h)
- Before movies (section 10.2): morning 7 x ~65 min = 7.6 h, evening 7 x ~80 = 9.3 h, noon 7 x ~9 = 1.05 h, status ~4 x 65 =
  4.3 h -> **~22.3 h**.
- Daily movies (owner: a part every morning instead of the katha): morning becomes 7 x ~76 min (standard) = 8.9 h ->
  **~23.6 h/week** (+1.3 h), ~6 h buffer. New characters ~0.35 h per pair, once.
- Full tier every day would be 7 x ~100 = 11.7 h -> ~26.4 h: too tight, so `full` (14B hero) only for series with
  `"hero_clip": true` (Khatu Janmotsav), everything else standard.
- **Guards (never starve the daily Shorts):** `pick_tier` keeps 2.4 h per day until the weekly reset + 1 h (evening ~1.33,
  status ~0.5, noon ~0.15) and only spends what is above that; a smaller tier when short (lite, then stills with lip-sync),
  "none" = try at the next trigger. `fit_window`: no movie session starts in 09:00-11:30 or 18:30-21:00 IST (morning/noon/
  evening and status/photo production), and only a tier that ends before the next window (full 165, standard 120, lite 80,
  stills 40 min incl. queue). `animate/kaggle.mjs lock` includes `sps-movie`, so the daily kernels never run in parallel with it.

### 13.4 Quality verdict (pilot)
- Good: characters look the same everywhere they matter (close-ups come from the canonical portraits), 4 real animated
  scenes (the 14B hero clip of the birth scene is the best), Devanagari + Roman subtitles in each speaker's colour, Part 1/4
  title card, "Agle part mein..." teaser, subscribe end card, synthesized score, 136 s.
- Lip-sync: Barbarik (3 lines) and the Brahmin pass; **Ghatotkach (beard: mouth smeared, ratio 0.40) and Morvi (lips blurred,
  0.24) fail** the new mouth-sharpness gate and fall back to their breathing base clip (no mouth movement). Fix later: a
  tighter mouth box for bearded faces, or a beardless redesign of Ghatotkach.
- Wide shots: FLUX draws Barbarik from the text each time, so his face varies a little between scenes (costume consistent).
  Next step: FLUX.2 [klein] 4B (Apache-2.0) with the portrait as a reference image on Kaggle.
- Stills in this pilot were not upscaled (enhance.py skipped non-numeric ids; fixed for the next run).
- Krishna came out as a child and Hanuman with a beard in two portrait runs (FLUX ignores "no beard"); stronger prompts are
  being redrawn; until a person picks a portrait, those characters' lines play over the scene (no close-up).
