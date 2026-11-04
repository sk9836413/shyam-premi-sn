# Adds lipsync/lipsync_jobs.json + lipsync/audio/*.wav to the dataset folder (one job per pilot line).
# Face boxes are in 704x704 start-frame pixels, measured from the start frames with MuseTalk's crop rule:
# x = jaw width, y1 = nose - (chin - nose), y2 = chin (the kernel adds a 10 px margin).
import json, os, shutil

D = "E:/shyampremisk/characters/kaggle/dataset/lipsync"
os.makedirs(f"{D}/audio", exist_ok=True)
BOX = {"dadi": [230, 130, 560, 470], "chhotu": [175, 220, 530, 480], "riya": [200, 245, 500, 515], "max": [180, 155, 505, 525],
       "dadi@two": [164, 253, 309, 401], "chhotu@two": [400, 278, 555, 392], "riya@two": [169, 313, 300, 432], "max@two": [421, 267, 563, 429]}
SHOTS = {"shyam": ("E:/shyampremisk/characters", "p1", ["chhotu-a", "dadi-a", "chhotu-b", "dadi-b", "two", "chhotu-a", "dadi-b", "chhotu-b", "dadi-a", "two", "chhotu-a", "two"]),
         "epifive": ("E:/epifive-characters", "p2", ["riya-a", "max-a", "max-b", "two", "max-a", "riya-b", "two"])}
jobs = []
for pilot, (root, prefix, shots) in SHOTS.items():
    spec = json.load(open(f"{root}/script.json", encoding="utf-8"))
    for i, (l, shot) in enumerate(zip(spec["lines"], shots)):
        name = f"{i:02d}-{l['who']}.wav"
        shutil.copy(f"{root}/audio/final/{name}", f"{D}/audio/{prefix}-{name}")
        key = f"{l['who']}@two" if shot == "two" else l["who"]
        jobs.append({"id": f"{prefix}-{i:02d}", "clip": f"{prefix}-{shot}", "audio": f"{prefix}-{name}", "box": BOX[key], "box_frame": 704})
json.dump(jobs, open(f"{D}/lipsync_jobs.json", "w"), indent=1)
print(len(jobs), "jobs")
