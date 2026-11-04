# Character Shorts: "Dadi aur Chhotu" (Shyam Premi SN) aur "Max & Riya" (EpiFive)

**Status (4 Nov 2026):** owner ne format approve kiya ("YES sahi h"). Ab daily production mein:
- **Shyam:** roz `noon` slot (scheduler 10:13 IST dispatch, 18:46 IST retry), 90-120 s, turant publish. Pehla asli run: **5 Nov 2026**.
- **EpiFive:** din ka doosra share "Max & Riya" dialogue (60-120 s), **sirf jab** repo variable `CHAR_SHORTS=on` (epifive-automation).
  Abhi variable set nahi hai, isliye EpiFive ke Shorts pehle jaise hain.

## Production kaise chalta hai (code: `dialogue.py`, `ui_cards.py`, `kaggle/lipsync_daily.py`, `library/`)
1. Claude spec likhta hai: Shyam `story/today/scenes.json` (`"format": "dialogue"`, STORY.md section 6), EpiFive
   `<draft>/dialogue.json` (SOCIAL.md). Validator dono ke niyam jaanchta hai (length, Chhotu ke sawaal, facts, sati rule...).
2. `dialogue.py voice`: edge-tts, har line alag wav. Dadi = Swara **-15%** (pilot mein Dadi tez bolti thi), Chhotu = Madhur
   +45 Hz (bachche jaisi), Max/Riya = Andrew/Ava. **Turn ke beech pause**: speaker badle to 0.55 s (sawaal ke baad 0.67), same
   speaker 0.3 s. 172 s se lamba ho to sab 10% tez (Shorts 3 min tak).
3. `images` (Shyam): 3-6 FLUX story chitra; `real: true` wale ke liye `footage/<temple>/` mein licence-wali asli video ho to wahi
   (REAL-FOOTAGE.md). EpiFive: `visuals.json` se mock-up cards (`ui_cards.py`).
4. `plan`: har line ka shot. Shuru, aakhri do lines aur chhote jawab = **two-shot** (dono saath), lambi baat = close-up.
5. Kaggle (`sps-char-shyam` / `sps-char-epifive`): MuseTalk 1.5 lip-sync library clips par, **dono T4 saath**, phir munh par
   colour + detail match pass. Same lock/queue jo animate kernels ka hai (ek waqt mein hamara ek session).
6. `render`: upar story panel, neeche bolta character; speaker ki taraf name-tag, subtitle uske rang mein, sunne wala thoda dhundhla.
   Lip-sync na mile (secret nahi, GPU busy, fail): **still two-shot + speaker highlight + chhota live waveform**. Post kabhi nahi rukta.
   Music + SFX sab ffmpeg se: Shyam = tanpura drone, ghanti (shuru/aakhir), halki hawa + jheengur; EpiFive = soft pad, room tone, screen badalne par whoosh.

## Characters ki pehchaan (consistency)
`library/<channel>/master.png` = canonical identity, kabhi dobara generate nahi. Har clip isi sheet se image-to-video (Wan 2.2):
4 Nov ko 4 naye clips banaye (40 GPU-min): `chhotu-c` (frames 0-52 rakhe) aur `riya-d` pass; `riya-c` (sir 55 px ghooma) aur
`max-c` (haath frame mein aaya) reject. Pilot ke `chhotu-b`, `riya-a/b`, `max-b` bhi reject (library.json `rejected`).

## Munh ki quality (enhancement test)
- **GFPGAN nahi:** uski LICENSE mein NVIDIA StyleGAN2 code (NC: "non-commercially") aur DFDNet (CC BY-NC-SA) shaamil hain, weights
  FFHQ (NC dataset) par trained. CodeFormer bhi NC. Dono commercial channel ke liye risky.
- **Licence-free pass (sirf OpenCV):** MuseTalk ka munh 256 px se upscale hota hai, isliye dhundhla. Ab blend se pehle munh ka rang
  (LAB mean/std) aur detail (unsharp, jab tak Laplacian variance asli frame jitni na ho) match karte hain. Pilot frames par: munh ki
  sharpness asli ka **~45% se ~100%** (Dadi 15.6 -> 34.4 vs asli 35.2; Chhotu 11.2 -> 31.8 vs 34.2), seam ka rang-farak kam.
  Lips ka "asli" sa look poora nahi jaata (MuseTalk ki seema).

## GPU (Kaggle T4 x2)
- Library clip: ~16 min/clip (2 saath). Har naye Short mein naye clip nahi banenge.
- Lip-sync Short: setup ~3-4 min + ~4.3 GPU-min per minute of speech, ab 2 GPU par baant kar ~half: **~8-12 min per Short**
  (2 min Short). Roz Shyam + EpiFive = ~20 min/din = **~2.5 h/hafta**. Morning + evening animation ~15 h: kul ~17.5 h / 30 h.

## Voice
edge-tts hi rahega. Chatterbox v3 reject (Shyam -> "Shaam"). Indic Parler-TTS A/B: `voice/parler_ab.py` + workflow
"Voice test (Parler vs edge)" taiyaar; owner `HF_TOKEN` secret set kare, phir run. Switch tabhi jab Parler saaf behtar ho
(CER 2 point kam aur koi naam galat nahi).

## Pilot (4 Nov 2026, history)

## Files
- `pilot-dadi-chhotu.mp4`: 1080x1920, 58 s, Hindi. Chhotu sawaal poochta hai, Dadi Salasar Balaji Dham ki kahani sunati hai.
- `voice-ab-hindi.mp3`: A/B. Pehle 4 lines **edge-tts** (abhi wali awaaz), beep, phir wahi 4 lines **Chatterbox v3** (naya).
- `sheet/character-sheet.png` + `sheet/characters.json` + `sheet/prompts.json`: character sheet, exact prompts, seed, crop boxes, voice settings.
  `sheet/master.png`, `sheet/dadi-closeup.png`, `sheet/chhotu-closeup.png` = **canonical images** (inhe kabhi badalna nahi).
- `script.json`: dialogue + har fact ke 2 sources. `visuals/`: AI story images + prompts.
- Code: `gen-images.mjs` (FLUX), `edge_lines.py`, `prep_audio.py`, `render.py`, `make_sheet.py`,
  `kaggle/` (voice.py, anim.py, lipsync.py, build_dataset.py, build_lipsync.py). Kaggle outputs: `kaggle-out/`.

## 1. Kaise bana
1. **Characters:** FLUX.1-schnell (shyam-premi-media Worker, 4 steps) se 3 two-shot variants bane, v3 chuna (dono chehre saaf).
   Close-ups usi master image se crop kiye, isliye video mein Dadi/Chhotu bilkul same dikhte hain.
2. **Seed ke baare mein sach:** Worker sirf `prompt` + `steps` aage bhejta hai, **seed apply nahi hota**. Isliye consistency ka
   asli tareeka: `master.png` + close-up PNG hi source of truth hain. Har naya clip inhi PNG se image-to-video banega,
   kabhi naya text-to-image nahi. (Agar seed chahiye to Worker mein ek line ka change: `seed` bhi forward karna. Maine
   Worker nahi chheda.)
3. **Motion:** Wan 2.2 TI2V-5B (Kaggle T4 x2), 704x704, 81 frames, 25 steps. 5 clips: Dadi x2, Chhotu x2, two-shot x1.
4. **Awaaz:** Chatterbox Multilingual v3 (MIT), Hindi. Reference = hamari apni edge-tts lines (owner ki permission ke
   hisaab se "our own TTS output"); kisi asli insaan ki awaaz clone nahi ki.
5. **Lip-sync:** **haan, kiya.** MuseTalk 1.5 (code MIT, weights commercial-OK). Uska mmpose/DWPose landmark step aur
   BiSeNet face-parsing (Google Drive weights) hata diye: har shot ka face box start frame se naapa (nose/chin/jaw),
   OpenCV template matching se head follow kiya, aur naya munh feathered ellipse se blend kiya. Wav2Lip (non-commercial)
   aur LivePortrait/LatentSync (InsightFace non-commercial models) jaan-boojh kar **nahi** liye.
6. **Render:** `render.py` (ffmpeg, ek process). Upar story panel (AI chitra, "AI chitra (sanketik)" label), neeche
   bolne wala character, subtitle ka rang speaker ke hisaab se (Dadi = sunehra, Chhotu = aasmani), naam-tag + rangeen line.
   Music: ffmpeg se banaya tanpura-jaisa drone (koi label music nahi).

## 2. Asli mandir footage: nahi mili (licence-safe)
- **Wikimedia Commons:** Salasar Balaji ki 5 photos hain, **sab CC BY-SA** (3.0/4.0): "Salasar Hanuman Mandir - panoramio"
  (Indrapal Jangid), "Salasar balaji 01/02" (Dausaanoop), "Salasar, rajisthan" (ANUJ SHARMA), "Salasar.jpg"
  (Hemantagarwal99), "Salasar Balaji.jpg" (Urvashi9). Koi video nahi, koi CC0/PD/CC BY nahi. Niyam ke hisaab se CC BY-SA
  **use nahi kiya**. Dhyan: Commons ki "Salasar Balaji Temple" category mein **Odisha (Athgarh) ka alag mandir** bhi hai,
  use kabhi Salasar mat bataana.
- **Pexels / Pixabay:** dono site bot ko block karti hain (Cloudflare 403), isliye seedha browse nahi ho paya. Search
  index mein Salasar ka koi video page nahi mila (Pixabay par "salasar balaji" image search mein ~1 result, wo bhi
  Tirupati ke saath mila hua).
- **Isliye:** video mein **sirf AI chitra**, har frame par label "AI chitra (sanketik)". Description mein likhna:
  "Chitra AI dwara banaye gaye hain (sanketik)".
- **Asli footage ka sabse achha raasta:** (a) owner khud Salasar mein phone se shoot kare (apna copyright), ya
  (b) Shree Salasar Balaji Mandir trust (salasarbalaji.org) se likhit permission. Pexels/Pixabay par khud (browser se)
  "Salasar" video search karke dekh lein; mile to licence commercial-OK hai, bas mandir sahi hona chahiye.

## 3. Licence notes
| Cheez | Licence | Commercial | Note |
| --- | --- | --- | --- |
| FLUX.1-schnell (Workers AI) | Apache-2.0 | Haan | Cloudflare free neurons; ~170/image @4 steps |
| Wan 2.2 TI2V-5B | Apache-2.0 | Haan | |
| Chatterbox Multilingual v3 (Resemble AI) | MIT | Haan | Har output mein **PerTh watermark** (sunai nahi deta); hata nahi sakte |
| Parler-TTS mini v1 (sirf EpiFive refs ke liye) | Apache-2.0 | Haan | |
| MuseTalk 1.5 | Code MIT, weights "any purpose incl. commercial" | Haan | Deps: sd-vae-ft-mse (MIT), whisper-tiny (MIT). Unka mmpose/DWPose aur BiSeNet step use **nahi** kiya |
| edge-tts voices | Microsoft ki free endpoint | Abhi ke Shorts jaisa | Pehle se channel par use ho raha hai |
| Wav2Lip | Non-commercial | **Nahi** | Use nahi kiya |
| LivePortrait | Code MIT, par InsightFace models non-commercial | Risky | Use nahi kiya (aur ye audio se nahi chalta) |
| LatentSync | Code Apache-2.0, par face detection InsightFace | Risky | Use nahi kiya |
| Indic Parler-TTS | Apache-2.0 | Haan | Gated model (HF login chahiye), isliye is pilot mein test nahi hua |
| Footage | - | - | Koi third-party footage nahi. Sab AI + apna |

## 4. GPU time (asli, Kaggle results se)
Sab Kaggle T4 x2 par, private kernels `sps-char-voice`, `sps-char-anim`, `sps-char-lipsync`, dataset `sps-char-inputs`.
Dono pilots ek saath chale:

| Kernel | Session | Kya hua |
| --- | --- | --- |
| sps-char-voice v1 | 578 s | Parler refs, Dia A/B, check. Chatterbox PyPI version mein v3 nahi tha (fail, 75 s) |
| sps-char-voice v2 | 692 s | Chatterbox v3 (GitHub se), 4 variants x lines, Whisper + UTMOS check |
| sps-char-anim | 5,518 s | Wan 2.2, 10 clips (har clip ~16-17 min ek T4 par, 2 saath), setup ~5.5 min |
| sps-char-lipsync | 557 s | MuseTalk, 19 lines (102 s audio), setup ~2 min |
| **Kul** | **7,345 s = 2.04 h** | 8 h budget ke andar |

- **Is video (Dadi-Chhotu) ka hissa: ~57 GPU-min** (anim 5 clips ~46 + voice ~6 + lip-sync ~5).
- **Chatterbox:** ~62 GPU-sec per minute of speech (T4 par lagbhag real-time) + har session ~4 min setup (install + load).
  Dia: ~5 GPU-min per minute of speech (84 s mein 17 s audio).
- **Lip-sync:** ~4.3 GPU-min per minute of speech + ~2 min setup.
- Kaggle quota is session mein 3.52 h se 6.92 h hua; usme ek doosre project ka saath chal raha session bhi gina gaya.
- Neurons (FLUX): characters 3 + story 6 images Shyam ke, 3 EpiFive ke = 12 images, ~2,040 neurons (2,500 limit ke andar).

**Roz ka production fit hoga?** Haan, agar clips dobara use karein:
- Lip-sync munh khud badal deta hai, isliye Dadi/Chhotu ke 5 Wan clips ek **clip library** ban jaate hain jo har
  video mein reuse ho sakti hai. Tab har naye video ka kharcha sirf awaaz + lip-sync = **~12-15 GPU-min**.
- Dono channels ka roz 1 character Short (ek hi session mein): ~25 min/din = **~3 h/hafta**. Hafte mein 2-3 naye Wan
  clips (variety ke liye) ~1 h. Kul ~4 h/hafta.
- Pehle se plan: 2 animated Shorts/din ~15 h/hafta. Saath mein ~19 h / 30 h. **Fit hai**, ~11 h buffer.
- Agar har video ke liye naye Wan clips banayein (~57 min/video): 14 video/hafta = ~13 h, kul ~28 h/30. Bahut tight,
  recommend nahi.
- Kaggle par ek waqt mein **sirf 2 GPU sessions** chal sakte hain (aaj ek baar ye limit lagi). Character job ko
  evening animate job se alag time par rakhna hoga.

## 5. Quality verdict aur risks
**Verdict: format kaam karta hai, pilot dekhne layak hai. Studio quality nahi, par phone par saaf Short.**
- Characters: sundar, original 3D look, poori video mein same (ek hi master se). Motion natural: palak, sir hilana, muskaan.
- Wan drift: `p1-chhotu-b` mein Chhotu aankh band karke aage aata hai aur chehra thoda badalta hai (lines 3 aur 8 mein
  dikhega). Baaki 4 Shyam clips stable.
- Lip-sync: munh awaaz ke saath khulta-band hota hai. Par munh wala hissa baaki chehre se **thoda dhundhla** hai (MuseTalk
  256 px banata hai), cartoon par lips thode "asli" lagte hain, kuch frames mein thodi si seam dikhti hai.
- Awaaz: maine sun kar judge **nahi** kiya (mere paas kaan nahi). Automatic proxy: UTMOS (naturalness) Chatterbox 3.65 vs
  edge 3.52, Whisper error 5.7% vs 4.7%. Chatterbox ki Hindi Dadi edge se **tez** bolti hai (dadi jaisi dheemi nahi), aur
  "मूँछ" ek jagah "मोच" jaisa suna gaya. **Owner `voice-ab-hindi.mp3` sun kar decide karein**; edge pasand ho to:
  `prep_audio.py` ko edge folder par chalao, lip-sync kernel dobara (~10 GPU-min), phir `render.py shyam`.
  Chatterbox ki "own voice" (pitch-shift) wali koshish kharab nikli (UTMOS 2.0, ek line mein hallucination), use nahi ki.
- Story panel: AI chitra theek. "Sapna" wale image mein Balaji ka roop sahi iconography wala nahi tha, isliye sirf
  sote hue bhakt wala hissa dikhaya. Mela image mein nakli watermark tha, crop kar diya.

**Risks**
- YouTube: templated/repetitive content (inauthentic content policy), har video mein kahani + facts alag rakhna zaroori.
  Upload par `containsSyntheticMedia: true` aur description: "Chitra AI dwara banaye gaye hain (sanketik). Awaaz aur
  animation AI se."
- Hindi voice reference hamari edge-tts clip hai (owner/coordinator ne allow kiya). Lambe samay ke liye behtar: ghar ke
  kisi member ki apni recorded awaaz (likhit consent ke saath) ya Indic Parler-TTS (HF login ke baad) se reference.
- Asli Salasar footage nahi hai; viewers "asli darshan" maang sakte hain. Kabhi doosre mandir ki footage Salasar
  bata kar mat lagana.
- Kaggle: 2-session limit, 30 h/hafta, GitHub Chatterbox version badal sakta hai (version pin karna hoga).

## 6. Daily pipeline mein kaise judega
Abhi kisi existing file ko nahi chheda. Plug-in plan (owner approve kare to):
1. **Ek baar:** clip library dataset `sps-char-library` (10 clips + face boxes + voice refs) Kaggle par.
2. **STORY.md mein naya slot** "Dadi ki Kahani" (Mandir Itihas temple Shorts mein hafte mein 2-3 baar): Claude
   `script.json` jaisa spec likhe (lines, `top` visual, `facts` 2 sources ke saath; legends "manyata hai").
3. **daily.yml:** FLUX 3-5 story images → Kaggle **ek kernel** mein voice (Chatterbox, saved refs) + lip-sync (library
   clips) → `render.py` runner par (Linux fonts ka path badalna: DejaVu/Noto) → wahi YouTube upload step.
4. Validate step: subtitles <= 3 lines, kul 45-60 s, har legend line mein "manyata/kehte hain".
5. Fallback: Kaggle fail ho to `--no-lipsync` (Wan clip ping-pong), uske bhi fail par purana zoompan Short.

## 7. Facts (mandir-series rules)
`script.json` → `facts`: har fact ke 2 sources (Rajasthan Tourism, Wikipedia/temple trust, Webdunia, Amar Ujala).
Kathayein "manyata hai" / "kehte hain" ke saath. Saal: sirf "Samvat 1811" bola (AD saal par sources mein 1754/1755 ka
mat-bhed hai).

## 8. Dobara banana ho to (commands)
```
node characters/gen-images.mjs characters/sheet/prompts.json        # sirf missing images banata hai
python -I characters/edge_lines.py characters/script.json characters/audio/edge
python -I characters/kaggle/build_dataset.py                        # phir: kaggle datasets version -p kaggle/dataset -r zip
kaggle kernels push -p characters/kaggle/push-voice                 # / push-anim / push-lipsync (T4)
python -I characters/prep_audio.py <root> <chosen voice dir> <ab.mp3> 4
python -I characters/kaggle/build_lipsync.py                        # dataset version, phir push-lipsync
python -I characters/render.py shyam        # ya: epifive; --no-lipsync = sirf Wan clips
python -I characters/make_sheet.py shyam
```
`build/pilot-dadi-chhotu-nolipsync.mp4` = bina lip-sync wala version (comparison ke liye).
