# Kaggle GPU kernel (sps-movie): every GPU step of one "movie" part (story/movies/<series>/part-<n>.json, STORY.md
# section 7) in ONE session on T4 x2, so a part pays the queue and the model downloads once. Pushed by
# animate/kaggle.mjs (SPS_SLOT=movie); the dataset is built by story/movie.py dataset. Never holds any secret.
#
# Stages (each optional, each failure leaves the renderer's fallback: still + camera move, or the portrait still):
#   1. images : scene start frames + the teaser frame (and new cast portraits) with FLUX.1-schnell on the GPU
#               (animate/kaggle/flux_frames.py, Apache-2.0, 576x1024 vertical). No Workers AI neurons are used: the
#               free 10,000 a day already run out on busy days (6 Nov 2026), and the daily Shorts need them.
#   2. clips  : Wan 2.2 TI2V-5B image-to-video for the key scenes (animate/kaggle/animate.py, vertical 576x1024,
#               RIFE 30 fps + Real-ESRGAN 1080x1920), optionally one hero clip with Wan 2.2 I2V-A14B (hero14b.py), and
#               the base clip of any speaking character that has none yet in characters/cast/clips/.
#   3. lips   : MuseTalk 1.5 lip-sync of each human character's close-up line on that character's base clip
#               (characters/kaggle/lipsync_daily.py). The face box is found here on the clip's first frame (OpenCV
#               Haar cascades), or given per job as `box_frac` (cartoon faces, story/kalyug.py; + an optional blend
#               ellipse `mask`); no face found = no lip-sync for that character (gentle motion only).
#   4. qa     : Whisper large-v3-turbo (MIT) transcribes every voice line: a pronunciation check (CER per line, names).
# Output (/kaggle/working): frames/<id>.png, stills/<id>.jpg, clips/<id>.mp4, lip/<id>.mp4, qa.json, results.json.
import glob, json, os, shutil, subprocess, sys, time

SPS_MOVIE_KERNEL = True
EXPECT_STAMP = None  # set by animate/kaggle.mjs push
START_BY = None
WORK = "/kaggle/working"
TMP = "/kaggle/tmp" if os.path.isdir("/kaggle/tmp") else "/tmp"
os.environ.setdefault("HF_HOME", f"{TMP}/hf")


def sh(cmd, check=False):
    print("+", cmd, flush=True)
    return subprocess.run(cmd, shell=True, check=check)


def find_input():
    hits = glob.glob("/kaggle/input/**/movie.json", recursive=True)
    if not hits:
        raise SystemExit("movie.json not found under /kaggle/input")
    return os.path.dirname(hits[0])


def left(T0, cfg):
    return cfg["max_minutes"] * 60 - (time.time() - T0)


def stage_images(inp, spec, cfg):
    jobs = [{"id": j["id"], "flux_prompt": j["prompt"], "seed": j.get("seed", 42), "w": j.get("w", 576), "h": j.get("h", 1024)}
            for j in spec.get("images", [])]
    if not jobs:
        return None
    d = f"{TMP}/flux"
    os.makedirs(d, exist_ok=True)
    json.dump({"jobs": jobs}, open(f"{d}/jobs.json", "w"))
    s = time.time()
    r = subprocess.run([sys.executable, f"{inp}/flux_frames.py", d, f"{WORK}/frames", json.dumps(cfg.get("flux", {"size": 1024, "steps": 6}))])
    made = sorted(os.path.basename(f)[:-4] for f in glob.glob(f"{WORK}/frames/*.png"))
    return {"seconds": round(time.time() - s), "exit": r.returncode, "made": len(made), "asked": len(jobs)}


def image_for(inp, name):
    for p in (f"{WORK}/frames/{name}.png", f"{inp}/{name}", f"{inp}/{name}.png", f"{inp}/{name}.jpg"):
        if os.path.exists(p):
            return p
    return None


def stage_clips(inp, spec, cfg, T0):
    clips = spec.get("clips", [])
    stills = spec.get("stills", [])
    if not clips and not stills:
        return None
    d = f"{TMP}/anim"
    os.makedirs(d, exist_ok=True)
    jobs = []
    for j in clips:
        src = image_for(inp, j["image"])
        if not src:
            print(f"clip {j['id']}: no start image {j['image']}", flush=True)
            continue
        ext = os.path.splitext(src)[1]
        shutil.copy(src, f"{d}/{j['id']}{ext}")
        jobs.append({**j, "image": f"{j['id']}{ext}"})
    for sid in stills:  # upscaled to 2160 px by animate.py's stills step (the scenes that stay stills)
        src = image_for(inp, sid)
        if src:
            from PIL import Image
            Image.open(src).convert("RGB").save(f"{d}/still-{sid}.jpg", quality=96)
    for f in ("enhance.py", "hero14b.py", "realesr-general-x4v3.pth"):
        if os.path.exists(f"{inp}/{f}"):
            shutil.copy(f"{inp}/{f}", f"{d}/{f}")
    budget = max(10, int(left(T0, cfg) / 60) - cfg.get("reserve_minutes", 25))
    a = cfg.get("anim", {})
    settings = {"size": a.get("width", 576), "width": a.get("width", 576), "height": a.get("height", 1024),
                "frames": 81, "fps": 24, "steps": a.get("steps", 25), "guidance": 5.0, "enhance": True, "stills": bool(stills),
                "flux": False, "out_size": [1920, 1080], "max_minutes": budget,
                "hero14b": a.get("hero14b") or False}
    json.dump({"stamp": spec.get("stamp"), "settings": settings, "jobs": jobs}, open(f"{d}/jobs.json", "w"), indent=1)
    s = time.time()
    r = subprocess.run([sys.executable, f"{inp}/animate.py"], env={**os.environ, "SPS_INPUT": d})
    # Hand the folder back clean for the next stage (lipsync_daily.py writes the same file names).
    for f in glob.glob(f"{WORK}/results-gpu*.jsonl"):
        os.remove(f)
    if os.path.exists(f"{WORK}/results.json"):
        os.replace(f"{WORK}/results.json", f"{WORK}/results-anim.json")
    shutil.rmtree(f"{WORK}/raw", ignore_errors=True)
    made = sorted(os.path.basename(f)[:-4] for f in glob.glob(f"{WORK}/clips/*.mp4"))
    return {"seconds": round(time.time() - s), "exit": r.returncode, "made": made, "asked": [j["id"] for j in jobs], "budget_min": budget}


def face_box(clip):
    """Largest face on the first frame (OpenCV Haar cascades, BSD) as a MuseTalk-style box: jaw width, from about the
    eyebrows to just under the chin. None when no face is found (then the character gets no lip-sync)."""
    import cv2
    cap = cv2.VideoCapture(clip)
    ok, f = cap.read()
    cap.release()
    if not ok:
        return None, None
    g = cv2.equalizeHist(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY))
    H, W = g.shape
    best = None
    for name in ("haarcascade_frontalface_alt2.xml", "haarcascade_frontalface_default.xml", "haarcascade_profileface.xml"):
        cc = cv2.CascadeClassifier(os.path.join(cv2.data.haarcascades, name))
        for (x, y, w, h) in cc.detectMultiScale(g, 1.08, 5, minSize=(int(W * 0.18), int(W * 0.18))):
            if best is None or w * h > best[2] * best[3]:
                best = (x, y, w, h)
        if best is not None:
            break
    if best is None:
        return None, W
    x, y, w, h = [int(v) for v in best]
    return [max(0, x), max(0, int(y + 0.12 * h)), min(W, x + w), min(H, int(y + 1.06 * h))], W


def frac_box(clip, frac):
    """A face box given as fractions of the frame [x1, y1, x2, y2] -> pixels on the clip's first frame."""
    import cv2
    cap = cv2.VideoCapture(clip)
    W, H = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cap.release()
    if not W:
        return None, None
    x1, y1, x2, y2 = frac
    return [int(x1 * W), int(y1 * H), int(x2 * W), int(y2 * H)], W


def stage_lips(inp, spec, cfg, T0):
    lips = spec.get("lips", [])
    if not lips:
        return None
    if left(T0, cfg) < 9 * 60:
        return {"skipped": "time budget"}
    d = f"{TMP}/lip"
    os.makedirs(d, exist_ok=True)
    boxes, jobs = {}, []
    for j in lips:
        who = j["who"]
        if who not in boxes:
            base = next((p for p in (f"{WORK}/clips/cast-{who}.mp4", f"{inp}/castclip-{who}.mp4") if os.path.exists(p)), None)
            if base and j.get("box_frac"):  # measured by a person on the portrait (cartoon faces: Haar finds no face)
                box, W = frac_box(base, j["box_frac"])
            else:
                box, W = face_box(base) if base else (None, None)
            boxes[who] = {"clip": base, "box": box, "W": W}
            if base and box:
                shutil.copy(base, f"{d}/base-{who}.mp4")
        b = boxes[who]
        if not (b["clip"] and b["box"]) or not os.path.exists(f"{inp}/{j['audio']}"):
            continue
        shutil.copy(f"{inp}/{j['audio']}", f"{d}/{j['audio']}")
        jobs.append({"id": j["id"], "clip": f"base-{who}.mp4", "audio": j["audio"], "box": b["box"], "box_frame": b["W"],
                     "seconds": j.get("seconds", 3), **({"mask": j["mask"]} if j.get("mask") else {})})
    if not jobs:
        return {"skipped": "no base clip with a detectable face", "boxes": boxes}
    if os.path.exists(f"{inp}/enhance.py"):
        shutil.copy(f"{inp}/enhance.py", f"{d}/enhance.py")
    minutes = max(8, int(left(T0, cfg) / 60) - cfg.get("qa_minutes", 5))
    json.dump({"stamp": spec.get("stamp"), "settings": {"enhance": True, "upscale": False, "max_minutes": minutes}, "jobs": jobs},
              open(f"{d}/jobs.json", "w"), indent=1)
    os.makedirs(f"{WORK}/clips", exist_ok=True)
    s = time.time()
    r = subprocess.run([sys.executable, f"{inp}/lipsync_daily.py"], env={**os.environ, "SPS_INPUT": d})
    os.makedirs(f"{WORK}/lip", exist_ok=True)
    for j in jobs:
        f = f"{WORK}/clips/{j['id']}.mp4"
        if os.path.exists(f):
            os.replace(f, f"{WORK}/lip/{j['id']}.mp4")
    for f in glob.glob(f"{WORK}/results-gpu*.jsonl"):
        os.remove(f)
    if os.path.exists(f"{WORK}/results.json"):
        os.replace(f"{WORK}/results.json", f"{WORK}/results-lip.json")
    return {"seconds": round(time.time() - s), "exit": r.returncode, "made": len(glob.glob(f"{WORK}/lip/*.mp4")), "asked": len(jobs),
            "boxes": {k: v["box"] for k, v in boxes.items()}}


def norm(t):
    import re, unicodedata
    t = unicodedata.normalize("NFC", t)
    t = re.sub(r"[।,.!?;:\"'()\-–—…]", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def cer(ref, hyp):
    a, b = norm(ref).replace(" ", ""), norm(hyp).replace(" ", "")
    if not a:
        return 0.0
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return round(prev[-1] / len(a), 4)


def stage_qa(inp, spec, cfg, T0):
    lines = spec.get("qa", [])
    if not lines or left(T0, cfg) < 4 * 60:
        return None
    s = time.time()
    try:
        import torch
        from transformers import pipeline
        asr = pipeline("automatic-speech-recognition", model="openai/whisper-large-v3-turbo", torch_dtype=torch.float16, device="cuda:0")
        out = []
        for l in lines:
            f = f"{inp}/{l['audio']}"
            if not os.path.exists(f):
                continue
            text = asr(f, generate_kwargs={"language": "hindi", "task": "transcribe"})["text"]
            names = [n for n in l.get("names", []) if norm(n) and norm(n) not in norm(text)]
            out.append({"id": l["id"], "who": l.get("who"), "cer": cer(l["text"], text), "heard": text.strip(), "missed_names": names})
        mean = round(sum(o["cer"] for o in out) / max(1, len(out)), 4)
        rec = {"model": "openai/whisper-large-v3-turbo", "lines": out, "mean_cer": mean, "seconds": round(time.time() - s)}
    except Exception as e:
        rec = {"error": f"{type(e).__name__}: {str(e)[:300]}", "seconds": round(time.time() - s)}
    json.dump(rec, open(f"{WORK}/qa.json", "w"), ensure_ascii=False, indent=1)
    return {k: v for k, v in rec.items() if k != "lines"}


def main():
    T0 = time.time()
    if START_BY and T0 > START_BY:
        raise SystemExit(f"session started {T0 - START_BY:.0f}s after START_BY: the workflow already fell back to stills")
    inp = find_input()
    spec = json.load(open(f"{inp}/movie.json"))
    if EXPECT_STAMP and spec.get("stamp") != EXPECT_STAMP:
        raise SystemExit(f"stale dataset: movie.json is {spec.get('stamp')}, expected {EXPECT_STAMP}")
    cfg = {"max_minutes": 100, **spec.get("settings", {})}
    sh("nvidia-smi --query-gpu=name,memory.total --format=csv")
    os.makedirs(f"{WORK}/frames", exist_ok=True)
    # The exact voice lines the lip-sync is made from go back with the output, so the renderer uses the same audio.
    if os.path.exists(f"{inp}/voice.json"):
        os.makedirs(f"{WORK}/voice", exist_ok=True)
        for f in glob.glob(f"{inp}/line-*.wav") + [f"{inp}/voice.json"]:
            shutil.copy(f, f"{WORK}/voice/")
    rec = {"stamp": spec.get("stamp"), "tier": cfg.get("tier")}
    if spec.get("images"):
        sh(f"{sys.executable} -m pip install -q -U 'diffusers>=0.35.1' 'transformers>=4.51' accelerate ftfy imageio-ffmpeg 'gguf>=0.10.0'")
    for name, fn in (("images", lambda: stage_images(inp, spec, cfg)), ("clips", lambda: stage_clips(inp, spec, cfg, T0)),
                     ("lips", lambda: stage_lips(inp, spec, cfg, T0)), ("qa", lambda: stage_qa(inp, spec, cfg, T0))):
        s = time.time()
        try:
            rec[name] = fn()
        except Exception as e:  # one stage failing never loses the others
            rec[name] = {"error": f"{type(e).__name__}: {str(e)[:300]}"}
        print(f"[movie] {name}: {round(time.time() - s)}s {json.dumps(rec[name])[:400]}", flush=True)
        json.dump({**rec, "session_s": round(time.time() - T0)}, open(f"{WORK}/results.json", "w"), indent=2)
    rec["session_s"] = round(time.time() - T0)
    json.dump(rec, open(f"{WORK}/results.json", "w"), indent=2)
    print(json.dumps(rec, indent=2), flush=True)


if __name__ == "__main__":
    main()
