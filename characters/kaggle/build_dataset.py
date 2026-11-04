# Builds the private Kaggle dataset folder sps-char-inputs for the character pilots:
#   voice_jobs.json + edge/<pilot>/*.wav  (voice kernel)    anim_jobs.json + start images (Wan kernel)
#   lipsync/ (added later by build_lipsync.py)
# Usage: python -I build_dataset.py   -> writes characters/kaggle/dataset/
import json, os, shutil, time

SP = "E:/shyampremisk/characters"
EP = "E:/epifive-characters"
D = f"{SP}/kaggle/dataset"
os.makedirs(D, exist_ok=True)
shyam = json.load(open(f"{SP}/script.json", encoding="utf-8"))
epi = json.load(open(f"{EP}/script.json", encoding="utf-8"))

for pilot, root in (("shyam", SP), ("epifive", EP)):
    dst = f"{D}/edge/{pilot}"
    os.makedirs(dst, exist_ok=True)
    for f in os.listdir(f"{root}/audio/edge"):
        if f.endswith(".wav"):
            shutil.copy(f"{root}/audio/edge/{f}", dst)

voice = {
    "pilots": {
        "shyam": {"lang": "hi", "lines": [{"who": l["who"], "tts": l["tts"]} for l in shyam["lines"]]},
        "epifive": {"lang": "en", "lines": [{"who": l["who"], "tts": l["tts"]} for l in epi["lines"]]},
    },
    "own_ref_text_hi": "नमस्ते बच्चों। आज मैं तुम्हें एक बहुत पुरानी और सुंदर कहानी सुनाऊँगी। ध्यान से सुनना, क्योंकि इसमें बहुत प्यारी बातें हैं।",
    "own_ref_fx": {"dadi": {"semitones": -1.5, "tempo": 0.92}, "chhotu": {"semitones": 4.0, "tempo": 1.06}},
    "parler_refs": {
        "max": {"seed": 1, "description": "Jon's voice is warm, friendly and confident, at a moderate pace with a slightly low pitch, very clear audio with no background noise.",
                "text": "Hey, no worries, I've got you. Let's walk through it together, one step at a time, and you'll be done before lunch."},
        "riya": {"seed": 2, "description": "Laura's voice is expressive and lively, slightly fast, with a moderately high pitch, very clear audio with no background noise.",
                 "text": "Okay, so I've been trying to fix this all morning and nothing works. Can you please take a look? I really need it today."},
    },
    "variants": [
        {"pilot": "shyam", "name": "cbx-own", "refs": {"dadi": "{out}/refs/own-dadi.wav", "chhotu": "{out}/refs/own-chhotu.wav"},
         "params": {"dadi": {"ex": 0.55, "cfg": 0.4}, "chhotu": {"ex": 0.7, "cfg": 0.45}}},
        {"pilot": "shyam", "name": "cbx-edge", "refs": {"dadi": "{inp}/edge/shyam/ref-dadi.wav", "chhotu": "{inp}/edge/shyam/ref-chhotu.wav"},
         "params": {"dadi": {"ex": 0.55, "cfg": 0.4}, "chhotu": {"ex": 0.7, "cfg": 0.45}}},
        {"pilot": "epifive", "name": "cbx-parler", "refs": {"max": "{out}/refs/parler-max.wav", "riya": "{out}/refs/parler-riya.wav"},
         "params": {"max": {"ex": 0.5, "cfg": 0.5}, "riya": {"ex": 0.65, "cfg": 0.45}}},
        {"pilot": "epifive", "name": "cbx-edge", "refs": {"max": "{inp}/edge/epifive/ref-max.wav", "riya": "{inp}/edge/epifive/ref-riya.wav"},
         "params": {"max": {"ex": 0.5, "cfg": 0.5}, "riya": {"ex": 0.65, "cfg": 0.45}}},
    ],
    "dia_texts": [
        "[S1] Max, help! We pay for Business Premium, but security defaults are all or nothing. Can I just add Conditional Access on top? "
        "[S2] Nope. You can't run both side by side. You switch from one to the other, in three steps. "
        "Step one. Create two emergency access accounts, and exclude them from every policy. That's your way back in."
    ],
}
json.dump(voice, open(f"{D}/voice_jobs.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

LOOK1 = "stylized 3D animated film, soft warm lamp lighting, smooth natural motion, consistent face"
LOOK2 = "modern 3D cartoon, clean bright office lighting, smooth natural motion, consistent face"
anim = [
    ("p1-dadi-a", f"{SP}/sheet/dadi-closeup.png", 11, "The elderly grandmother with round gold glasses talks warmly to the boy beside her, her mouth opening and closing as she speaks, gentle head nods, natural eye blinks, soft smile, the camera stays still", LOOK1),
    ("p1-dadi-b", f"{SP}/sheet/dadi-closeup.png", 23, "The elderly grandmother tells an old story with expressive eyebrows, mouth moving as she speaks, a slight head tilt, natural blinks, warm light flickering softly, static camera", LOOK1),
    ("p1-chhotu-a", f"{SP}/sheet/chhotu-closeup.png", 31, "The 8-year-old boy asks a curious question, mouth moving as he talks, eyebrows raised, a small head tilt, natural blinking, static camera", LOOK1),
    ("p1-chhotu-b", f"{SP}/sheet/chhotu-closeup.png", 37, "The boy listens with wonder, his eyes widen, then he smiles happily and nods, natural blinking, static camera", LOOK1),
    ("p1-two", f"{SP}/sheet/master.png", 41, "The grandmother and her grandson sit together, the grandmother talks gently while the boy looks at her and listens, a lamp flame flickers, subtle breathing motion, static camera", LOOK1),
    ("p2-riya-a", f"{EP}/sheet/riya-closeup.png", 51, "The young woman in a mustard blazer talks anxiously, mouth moving as she speaks, worried eyebrows, slight head shake, natural blinking, static camera", LOOK2),
    ("p2-riya-b", f"{EP}/sheet/riya-closeup.png", 57, "The young woman relaxes and smiles with relief, nodding happily, natural blinking, static camera", LOOK2),
    ("p2-max-a", f"{EP}/sheet/max-closeup.png", 61, "The friendly man with glasses and a beard explains something calmly, mouth moving as he speaks, gentle head movement, natural blinking, static camera", LOOK2),
    ("p2-max-b", f"{EP}/sheet/max-closeup.png", 67, "The friendly man with glasses nods and keeps talking with a reassuring smile, mouth moving, natural blinking, static camera", LOOK2),
    ("p2-two", f"{EP}/sheet/master.png", 71, "Two coworkers sit at a desk, the woman listens while the man beside her talks and smiles, subtle natural movement, soft office light, static camera", LOOK2),
]
jobs = []
for cid, img, seed, motion, look in anim:
    name = f"{cid}.png"
    shutil.copy(img, f"{D}/{name}")
    jobs.append({"id": cid, "image": name, "seed": seed, "prompt": f"{motion}. {look}"})
stamp = f"char-pilot-{int(time.time())}"
json.dump({"stamp": stamp, "settings": {"size": 704, "frames": 81, "steps": 25, "guidance": 5.0, "max_minutes": 115}, "jobs": jobs},
          open(f"{D}/anim_jobs.json", "w"), indent=1)
json.dump({"title": "sps-char-inputs", "id": "sk9846413/sps-char-inputs", "licenses": [{"name": "other"}]}, open(f"{D}/dataset-metadata.json", "w"))
print(stamp, len(jobs), "anim jobs;", sum(len(p["lines"]) for p in voice["pilots"].values()), "lines")
