# Character sheet PNG + characters.json for a pilot: chosen FLUX master, the close-up crops used as Wan start
# frames, each character's fixed description, the exact prompt + style + seed, and the crop boxes.
# Usage: python -I make_sheet.py shyam|epifive
import json, sys, textwrap
from PIL import Image, ImageDraw, ImageFont

F = lambda s, b=False: ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf" if b else "C:/Windows/Fonts/segoeui.ttf", s)
P = sys.argv[1]
if P == "shyam":
    D = "E:/shyampremisk/characters/sheet"; title = "Shyam Premi SN: Dadi Maa & Chhotu"
    crops = {"dadi": (93, 285), "chhotu": (470, 265)}
    names = {"dadi": "Dadi Maa (dadi, ~70)", "chhotu": "Chhotu (pota, ~8 saal)"}
    colors = {"dadi": "#FFC24A", "chhotu": "#7FD8FF"}
    voices = {"dadi": "Chatterbox v3 hi, ref voice-ref-dadi.wav (our edge Swara clip), ex 0.55 cfg 0.4, seed 100+line",
              "chhotu": "Chatterbox v3 hi, ref voice-ref-chhotu.wav (our edge Madhur +40Hz clip), ex 0.7 cfg 0.45, seed 100+line"}
else:
    D = "E:/epifive-characters/sheet"; title = "EpiFive: Max & Riya"
    crops = {"riya": (118, 300), "max": (498, 290)}
    names = {"max": "Max (IT admin, early 30s)", "riya": "Riya (office worker, late 20s)"}
    colors = {"max": "#6FE3B4", "riya": "#FF8FB1"}
    voices = {"max": "Chatterbox v3 en, ref voice-ref-max.wav (Parler mini 'Jon', seed 1), ex 0.5 cfg 0.5, seed 100+line",
              "riya": "Chatterbox v3 en, ref voice-ref-riya.wav (Parler mini 'Laura', seed 2), ex 0.65 cfg 0.45, seed 100+line"}
pr = json.load(open(f"{D}/prompts.json", encoding="utf-8"))
master = next(i for i in pr["images"] if i["file"] == "master-v3.png")
meta = {
    "canonical_master": "master.png (FLUX.1-schnell, Workers AI via shyam-premi-media /ai/flux, 4 steps, 1024x1024)",
    "master_prompt": master["prompt"], "style": pr["style"], "seed_requested": master["seed"],
    "seed_note": "The media Worker forwards only prompt+steps, so this seed was NOT applied by FLUX. The saved master.png and "
                 "close-up PNGs are the source of truth: every future clip starts from these files (Wan image-to-video), "
                 "never from a fresh text-to-image generation.",
    "characters": {k: {"name": names[k], "description": pr["characters"][k], "closeup": f"{k}-closeup.png",
                       "crop_box_in_master": [x, y, x + 448, y + 448], "subtitle_color": colors[k], "voice": voices[k]}
                   for k, (x, y) in crops.items()},
    "rejected_variants": ["master-v1.png", "master-v2.png"],
}
json.dump(meta, open(f"{D}/characters.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)

S = Image.new("RGB", (2000, 1500), (250, 248, 244))
d = ImageDraw.Draw(S)
d.text((40, 24), title + "  |  character sheet", font=F(48, True), fill=(30, 30, 30))
S.paste(Image.open(f"{D}/master.png").convert("RGB").resize((760, 760)), (40, 100))
d.text((40, 870), "Master (canonical) = master.png", font=F(26, True), fill=(60, 60, 60))
x = 840
for k in crops:
    S.paste(Image.open(f"{D}/{k}-closeup.png").convert("RGB").resize((540, 540)), (x, 100))
    d.rectangle([x, 650, x + 540, 664], fill=meta["characters"][k]["subtitle_color"])
    d.text((x, 674), names[k], font=F(30, True), fill=(30, 30, 30))
    y = 716
    for ln in textwrap.wrap(pr["characters"][k], 52)[:6]:
        d.text((x, y), ln, font=F(21), fill=(70, 70, 70)); y += 28
    x += 580
y = 930
d.text((40, y), f"Master prompt (seed requested {master['seed']}, not applied by the Worker; PNG is canonical):", font=F(24, True), fill=(30, 30, 30)); y += 38
for ln in textwrap.wrap(master["prompt"] + " || STYLE: " + pr["style"], 150):
    d.text((40, y), ln, font=F(20), fill=(60, 60, 60)); y += 27
y += 12
for k in crops:
    d.text((40, y), f"{names[k]} voice: {voices[k]}", font=F(21), fill=(60, 60, 60)); y += 30
S.save(f"{D}/character-sheet.png")
print("ok", f"{D}/character-sheet.png")
