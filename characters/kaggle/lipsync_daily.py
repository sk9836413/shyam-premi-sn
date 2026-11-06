# Kaggle GPU kernel (sps-char-shyam / sps-char-epifive): lip-syncs the daily two-character dialogue Short.
# Pushed by animate/kaggle.mjs (SPS_SLOT=char-<channel>); never holds any secret.
#
# Model: MuseTalk 1.5 (code MIT, weights "any purpose incl. commercial"; VAE sd-vae-ft-mse MIT; Whisper-tiny MIT).
# MuseTalk's face-landmark step (mmpose/DWPose) and its BiSeNet face-parsing blend are NOT used: each job carries the
# face box measured once on the library clip's start frame, OpenCV template matching follows the head, and a
# feathered ellipse blends the new mouth back in. No face-restore network (GFPGAN ships NVIDIA StyleGAN2 NC code and
# FFHQ-trained weights; CodeFormer is NC): instead a licence-free pass matches the mouth region's colour (LAB mean/std)
# and detail (unsharp mask until its Laplacian variance reaches the original frame's) before blending.
#
# Input (flat dataset, built by characters/dialogue.py dataset): jobs.json, clip-<id>.mp4 (library clips, cut from the
# canonical character sheet by image-to-video), line-NN.wav (one padded voice line each).
# Output: /kaggle/working/clips/<job>.mp4 (silent, 24 fps, as long as the line; Real-ESRGAN-upscaled to 1080 px by
# enhance.py when the dataset carries it, settings.upscale=false turns that off) + results.json (stamp, timings).
# Both T4s work at once: one MuseTalk process per GPU, jobs split by audio length.
import glob, json, os, subprocess, sys, time

SPS_CHAR_LIPSYNC_KERNEL = True  # marker used by self_path()
EXPECT_STAMP = None  # set by animate/kaggle.mjs push: the dataset version this run must use
START_BY = None  # set by push: epoch seconds; a session that was queued past this exits without using the GPU

WORK = "/kaggle/working"
TMP = "/kaggle/tmp" if os.path.isdir("/kaggle/tmp") else "/tmp"
REPO = f"{TMP}/MuseTalk"
VENV = f"{TMP}/venv-mt"
MUSETALK_COMMIT = "main"  # cloned shallow; the pinned pip versions below are what the 4 Nov 2026 pilot used


def sh(cmd, check=True):
    print("+", cmd, flush=True)
    return subprocess.run(cmd, shell=True, check=check)


RUN = r'''
import json, os, sys, time, cv2, numpy as np, torch
REPO, inp, out, ids, cfg = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4].split(","), json.loads(sys.argv[5])
gpu = os.environ.get("CUDA_VISIBLE_DEVICES", "0")
sys.path.insert(0, REPO); os.chdir(REPO)
from musetalk.utils.utils import load_all_model, datagen
from musetalk.utils.audio_processor import AudioProcessor
from transformers import WhisperModel
dev = torch.device("cuda")
vae, unet, pe = load_all_model(unet_model_path="models/musetalkV15/unet.pth", vae_type="sd-vae",
                               unet_config="models/musetalkV15/musetalk.json", device=dev)
pe = pe.half().to(dev); vae.vae = vae.vae.half().to(dev); unet.model = unet.model.half().to(dev)
ap = AudioProcessor(feature_extractor_path="models/whisper")
whisper = WhisperModel.from_pretrained("models/whisper").to(device=dev, dtype=torch.float16).eval()
ts = torch.tensor([0], device=dev)
jobs = {j["id"]: j for j in json.load(open(f"{inp}/jobs.json"))["jobs"]}
os.makedirs(f"{out}/clips", exist_ok=True)
UP = [None]  # the Real-ESRGAN upscaler, loaded on first use

def read(path):
    cap = cv2.VideoCapture(path); fr = []
    while True:
        ok, f = cap.read()
        if not ok: break
        fr.append(f)
    fps = cap.get(cv2.CAP_PROP_FPS) or 24; cap.release()
    return fr, fps

def track(frames, box, scale):
    # Follow the face box with template matching on a grey, slightly larger patch; median-smooth the path.
    x1, y1, x2, y2 = [int(round(v * scale)) for v in box]
    H, W = frames[0].shape[:2]
    pad = int(0.15 * (x2 - x1))
    tx1, ty1, tx2, ty2 = max(0, x1 - pad), max(0, y1 - pad), min(W, x2 + pad), min(H, y2 + pad)
    tpl = cv2.cvtColor(frames[0], cv2.COLOR_BGR2GRAY)[ty1:ty2, tx1:tx2]
    R = int(0.25 * (x2 - x1)) + 8
    sx1, sy1, sx2, sy2 = max(0, tx1 - R), max(0, ty1 - R), min(W, tx2 + R), min(H, ty2 + R)
    dx, dy, sc = [], [], []
    for f in frames:
        g = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)[sy1:sy2, sx1:sx2]
        _, mx, _, loc = cv2.minMaxLoc(cv2.matchTemplate(g, tpl, cv2.TM_CCOEFF_NORMED))
        dx.append(sx1 + loc[0] - tx1); dy.append(sy1 + loc[1] - ty1); sc.append(mx)
    k = 5
    sm = lambda a: [int(np.median(a[max(0, i - k // 2): i + k // 2 + 1])) for i in range(len(a))]
    dx, dy = sm(dx), sm(dy)
    return [(x1 + a, y1 + b, x2 + a, y2 + b) for a, b in zip(dx, dy)], float(np.mean(sc))

def blend_mask(w, h):
    m = np.zeros((h, w), np.float32)
    cv2.ellipse(m, (w // 2, int(h * 0.74)), (int(w * 0.40), int(h * 0.30)), 0, 0, 360, 1.0, -1)
    k = max(3, int(w * 0.12) | 1)
    return cv2.GaussianBlur(m, (k, k), 0)

def lapvar(img, sel):
    l = cv2.Laplacian(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32), cv2.CV_32F)
    return float(l[sel].var())

def enhance(face, orig, m):
    """Licence-free mouth pass: colour (LAB mean/std) and detail (Laplacian variance) matched to the original frame."""
    sel = m > 0.5
    if sel.sum() < 50:
        return face
    fa = cv2.cvtColor(face, cv2.COLOR_BGR2LAB).astype(np.float32)
    oa = cv2.cvtColor(orig, cv2.COLOR_BGR2LAB).astype(np.float32)
    for c in range(3):
        fm, fs = fa[..., c][sel].mean(), fa[..., c][sel].std() + 1e-3
        om, os_ = oa[..., c][sel].mean(), oa[..., c][sel].std() + 1e-3
        fa[..., c] = (fa[..., c] - fm) * (0.5 + 0.5 * os_ / fs) + om
    f2 = cv2.cvtColor(np.clip(fa, 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR).astype(np.float32)
    target = lapvar(orig, sel)
    blur = cv2.GaussianBlur(f2, (0, 0), 1.4)
    best = f2
    for amt in (0.2, 0.4, 0.6, 0.8, 1.0, 1.3, 1.6, 2.0):
        best = np.clip(f2 + amt * (f2 - blur), 0, 255)
        if lapvar(best.astype(np.uint8), sel) >= target * 0.9:
            break
    return best.astype(np.uint8)

for jid in ids:
    job = jobs[jid]; t0 = time.time()
    try:
        frames, fps = read(f"{inp}/{job['clip']}")
        H, W = frames[0].shape[:2]
        boxes, match = track(frames, job["box"], W / job.get("box_frame", 704))
        feats, n = ap.get_audio_feature(f"{inp}/{job['audio']}")
        chunks = ap.get_whisper_chunk(feats, dev, torch.float16, whisper, n, fps=fps,
                                      audio_padding_length_left=2, audio_padding_length_right=2)
        lat = []
        for f, (x1, y1, x2, y2) in zip(frames, boxes):
            y2 = min(H, y2 + 10)
            lat.append(vae.get_latents_for_unet(cv2.resize(f[y1:y2, x1:x2], (256, 256), interpolation=cv2.INTER_LANCZOS4)))
        fc = frames + frames[::-1]; bc = boxes + boxes[::-1]; lc = lat + lat[::-1]  # ping-pong: never a jump
        outs = []
        with torch.no_grad():
            for wb, lb in datagen(whisper_chunks=chunks, vae_encode_latents=lc, batch_size=16, delay_frame=0, device=dev):
                pred = unet.model(lb.to(dev, dtype=torch.float16), ts, encoder_hidden_states=pe(wb.to(dev))).sample
                outs.extend(vae.decode_latents(pred))
        raw = f"{out}/clips/{jid}-raw.avi"
        vw = cv2.VideoWriter(raw, cv2.VideoWriter_fourcc(*"MJPG"), fps, (W, H))
        for i, face in enumerate(outs):
            f = fc[i % len(fc)].copy(); x1, y1, x2, y2 = bc[i % len(bc)]; y2 = min(H, y2 + 10)
            face = cv2.resize(face.astype(np.uint8), (x2 - x1, y2 - y1), interpolation=cv2.INTER_LANCZOS4)
            m = blend_mask(x2 - x1, y2 - y1)
            if cfg.get("enhance", True):
                face = enhance(face, f[y1:y2, x1:x2], m)
            mm = m[..., None]
            f[y1:y2, x1:x2] = (face * mm + f[y1:y2, x1:x2] * (1 - mm)).astype(np.uint8)
            vw.write(f)
        vw.release()
        os.system(f"ffmpeg -v error -y -i {raw} -c:v libx264 -crf 17 -pix_fmt yuv420p {out}/clips/{jid}.mp4 && rm {raw}")
        torch.cuda.synchronize()
        rec = {"id": jid, "ok": os.path.exists(f"{out}/clips/{jid}.mp4"), "gpu": gpu, "frames": len(outs), "fps": fps,
               "seconds": round(time.time() - t0, 1), "audio_s": round(n / 16000, 2), "track_match": round(match, 3)}
        # Real-ESRGAN to 1080 px (enhance.py, BSD-3; no frame interpolation: a lip-synced mouth must not be blended).
        # Any failure keeps the 704 px clip; the renderer scales it up as before.
        if rec["ok"] and cfg.get("upscale", True) and os.path.exists(f"{inp}/enhance.py") and W < 1000:
            try:
                if UP[0] is None:
                    sys.path.insert(0, inp)
                    from enhance import Enhancer
                    UP[0] = Enhancer(rife=False)
                r = UP[0].process_file(f"{out}/clips/{jid}.mp4", f"{out}/clips/{jid}-up.mp4", size=1080, crf=17)
                os.replace(f"{out}/clips/{jid}-up.mp4", f"{out}/clips/{jid}.mp4")
                rec.update(upscaled=True, upscale_s=r["enhance_s"])
            except Exception as e:
                rec.update(upscaled=False, upscale_error=f"{type(e).__name__}: {str(e)[:200]}")
                os.chdir(REPO)
    except Exception as e:  # one failed line must not lose the others (the renderer falls back for that line)
        rec = {"id": jid, "ok": False, "gpu": gpu, "error": f"{type(e).__name__}: {str(e)[:300]}"}
        torch.cuda.empty_cache()
    print(json.dumps(rec), flush=True)
    with open(f"{out}/results-gpu{gpu}.jsonl", "a") as fh:
        fh.write(json.dumps(rec) + "\n")
'''


def find_input():
    if os.environ.get("SPS_INPUT"):  # story/movie_kernel.py runs this script on a prepared folder
        return os.environ["SPS_INPUT"]
    hits = glob.glob("/kaggle/input/**/jobs.json", recursive=True)
    if not hits:
        raise SystemExit("jobs.json not found under /kaggle/input")
    return os.path.dirname(hits[0])


def main():
    T0 = time.time()
    if START_BY and T0 > START_BY:
        raise SystemExit(f"session started {T0 - START_BY:.0f}s after START_BY: the workflow already fell back to stills")
    inp = find_input()
    spec = json.load(open(f"{inp}/jobs.json"))
    if EXPECT_STAMP and spec.get("stamp") != EXPECT_STAMP:
        raise SystemExit(f"stale dataset: jobs.json is {spec.get('stamp')}, expected {EXPECT_STAMP}")
    cfg = {"enhance": True, "max_minutes": 35, **spec.get("settings", {})}
    sh("nvidia-smi --query-gpu=name,memory.total --format=csv", check=False)
    sh(f"{sys.executable} -m pip install -q uv")
    sh(f"git clone -q --depth 1 https://github.com/TMElyralab/MuseTalk {REPO}")
    sh(f"uv venv -q -p 3.10 {VENV}")
    sh(f"uv pip install -q -p {VENV}/bin/python torch==2.0.1 torchvision==0.15.2 --index-url https://download.pytorch.org/whl/cu118")
    sh(f"uv pip install -q -p {VENV}/bin/python diffusers==0.30.2 accelerate==0.28.0 transformers==4.39.2 huggingface_hub==0.30.2 "
       f"numpy==1.23.5 opencv-python-headless==4.9.0.80 librosa==0.11.0 soundfile einops omegaconf")
    dl = (f"from huggingface_hub import snapshot_download as s\n"
          f"s('TMElyralab/MuseTalk', local_dir='{REPO}/models', allow_patterns=['musetalkV15/*'])\n"
          f"s('stabilityai/sd-vae-ft-mse', local_dir='{REPO}/models/sd-vae', allow_patterns=['config.json','diffusion_pytorch_model.bin'])\n"
          f"s('openai/whisper-tiny', local_dir='{REPO}/models/whisper', allow_patterns=['config.json','pytorch_model.bin','preprocessor_config.json'])\n")
    open(f"{TMP}/dl.py", "w").write(dl)
    sh(f"{VENV}/bin/python {TMP}/dl.py")
    t_setup = time.time() - T0
    open(f"{TMP}/run.py", "w").write(RUN)
    # Split the lines over the GPUs by audio length (longest first, to the least-loaded GPU).
    n_gpu = max(1, int(subprocess.run("nvidia-smi -L | wc -l", shell=True, capture_output=True, text=True).stdout.strip() or 1))
    jobs = sorted(spec["jobs"], key=lambda j: -j.get("seconds", 1))
    load, parts = [0.0] * n_gpu, [[] for _ in range(n_gpu)]
    for j in jobs:
        g = load.index(min(load)); parts[g].append(j["id"]); load[g] += j.get("seconds", 1)
    s = time.time()
    procs = [subprocess.Popen([f"{VENV}/bin/python", f"{TMP}/run.py", REPO, inp, WORK, ",".join(p), json.dumps(cfg)],
                              env={**os.environ, "CUDA_VISIBLE_DEVICES": str(g)}) for g, p in enumerate(parts) if p]
    deadline = T0 + 60 * cfg["max_minutes"]
    while any(p.poll() is None for p in procs) and time.time() < deadline:
        time.sleep(10)
    for p in procs:
        if p.poll() is None:
            p.kill()  # over budget: the renderer uses the still fallback for the missing lines
    res = []
    for f in glob.glob(f"{WORK}/results-gpu*.jsonl"):
        res += [json.loads(l) for l in open(f)]
    summary = {"stamp": spec.get("stamp"), "model": "MuseTalk 1.5", "gpus": n_gpu, "setup_s": round(t_setup),
               "run_s": round(time.time() - s), "session_s": round(time.time() - T0), "enhance": cfg["enhance"],
               "ok": sum(1 for r in res if r.get("ok")), "jobs": len(spec["jobs"]), "clips": sorted(res, key=lambda r: r["id"])}
    json.dump(summary, open(f"{WORK}/results.json", "w"), indent=2)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
