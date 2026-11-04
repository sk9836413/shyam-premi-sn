# Kaggle GPU kernel (sps-char-lipsync): audio-driven lip-sync for the character pilots with MuseTalk 1.5
# (code MIT, weights "any purpose incl. commercial"; VAE sd-vae-ft-mse MIT; Whisper-tiny MIT).
# MuseTalk's own face-landmark step (mmpose/DWPose) and face-parsing blend (BiSeNet from a Google Drive link) are
# NOT used: each job gives the face box (from the start frame: nose/chin/jaw, MuseTalk's crop rule), OpenCV
# template matching follows the head through the clip, and a feathered ellipse blends the new mouth/jaw back in.
# Input: dataset sps-char-inputs (lipsync/lipsync_jobs.json + lipsync/audio/*.wav) and kernel output sps-char-anim
# (clips/*.mp4). Output: /kaggle/working/lipsync/<job>.mp4 (silent, clip fps) + lipsync_results.json.
import glob, json, os, subprocess, sys, time

SPS_CHAR_LIPSYNC_KERNEL = True
WORK = "/kaggle/working"
TMP = "/kaggle/tmp" if os.path.isdir("/kaggle/tmp") else "/tmp"
REPO = f"{TMP}/MuseTalk"


def sh(cmd, check=True):
    print("+", cmd, flush=True)
    return subprocess.run(cmd, shell=True, check=check)


RUN = r'''
import glob, json, os, sys, time, cv2, numpy as np, torch
REPO, inp, clips_dir, out = sys.argv[1:5]
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
jobs = json.load(open(f"{inp}/lipsync_jobs.json"))
os.makedirs(out, exist_ok=True)

def read(path):
    cap = cv2.VideoCapture(path); fr = []
    while True:
        ok, f = cap.read()
        if not ok: break
        fr.append(f)
    fps = cap.get(cv2.CAP_PROP_FPS); cap.release()
    return fr, fps

def track(frames, box, scale):
    # Follow the face box with template matching on a grey, slightly larger patch; median-smooth the path.
    x1, y1, x2, y2 = [int(round(v * scale)) for v in box]
    H, W = frames[0].shape[:2]
    pad = int(0.15 * (x2 - x1))
    tx1, ty1, tx2, ty2 = max(0, x1 - pad), max(0, y1 - pad), min(W, x2 + pad), min(H, y2 + pad)
    g0 = cv2.cvtColor(frames[0], cv2.COLOR_BGR2GRAY)
    tpl = g0[ty1:ty2, tx1:tx2]
    R = int(0.25 * (x2 - x1)) + 8
    sx1, sy1 = max(0, tx1 - R), max(0, ty1 - R)
    sx2, sy2 = min(W, tx2 + R), min(H, ty2 + R)
    dx, dy, sc = [], [], []
    for f in frames:
        g = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)[sy1:sy2, sx1:sx2]
        r = cv2.matchTemplate(g, tpl, cv2.TM_CCOEFF_NORMED)
        _, mx, _, loc = cv2.minMaxLoc(r)
        dx.append(sx1 + loc[0] - tx1); dy.append(sy1 + loc[1] - ty1); sc.append(mx)
    k = 5
    sm = lambda a: [int(np.median(a[max(0, i - k // 2): i + k // 2 + 1])) for i in range(len(a))]
    dx, dy = sm(dx), sm(dy)
    return [(x1 + a, y1 + b, x2 + a, y2 + b) for a, b in zip(dx, dy)], float(np.mean(sc)), max(map(abs, dx)), max(map(abs, dy))

def blend_mask(w, h):
    m = np.zeros((h, w), np.float32)
    cv2.ellipse(m, (w // 2, int(h * 0.74)), (int(w * 0.40), int(h * 0.30)), 0, 0, 360, 1.0, -1)
    k = max(3, int(w * 0.12) | 1)
    return cv2.GaussianBlur(m, (k, k), 0)[..., None]

res = []
for job in jobs:
    t0 = time.time()
    frames, fps = read(f"{clips_dir}/{job['clip']}.mp4")
    H, W = frames[0].shape[:2]
    boxes, match, mdx, mdy = track(frames, job["box"], W / job.get("box_frame", 704))
    feats, n = ap.get_audio_feature(f"{inp}/audio/{job['audio']}")
    chunks = ap.get_whisper_chunk(feats, dev, torch.float16, whisper, n, fps=fps,
                                  audio_padding_length_left=2, audio_padding_length_right=2)
    lat, crops = [], []
    for f, (x1, y1, x2, y2) in zip(frames, boxes):
        y2 = min(H, y2 + 10)
        c = cv2.resize(f[y1:y2, x1:x2], (256, 256), interpolation=cv2.INTER_LANCZOS4)
        lat.append(vae.get_latents_for_unet(c))
    fc = frames + frames[::-1]; bc = boxes + boxes[::-1]; lc = lat + lat[::-1]
    outs = []
    with torch.no_grad():
        for wb, lb in datagen(whisper_chunks=chunks, vae_encode_latents=lc, batch_size=16, delay_frame=0, device=dev):
            af = pe(wb.to(dev))
            pred = unet.model(lb.to(dev, dtype=torch.float16), ts, encoder_hidden_states=af).sample
            outs.extend(vae.decode_latents(pred))
    path = f"{out}/{job['id']}.mp4"
    vw = cv2.VideoWriter(f"{out}/{job['id']}-raw.avi", cv2.VideoWriter_fourcc(*"MJPG"), fps, (W, H))
    for i, face in enumerate(outs):
        f = fc[i % len(fc)].copy(); x1, y1, x2, y2 = bc[i % len(bc)]; y2 = min(H, y2 + 10)
        face = cv2.resize(face.astype(np.uint8), (x2 - x1, y2 - y1), interpolation=cv2.INTER_CUBIC)
        m = blend_mask(x2 - x1, y2 - y1)
        f[y1:y2, x1:x2] = (face * m + f[y1:y2, x1:x2] * (1 - m)).astype(np.uint8)
        vw.write(f)
    vw.release()
    os.system(f"ffmpeg -v error -y -i {out}/{job['id']}-raw.avi -c:v libx264 -crf 17 -pix_fmt yuv420p {path} && rm {out}/{job['id']}-raw.avi")
    torch.cuda.synchronize()
    r = {"id": job["id"], "frames": len(outs), "fps": fps, "seconds": round(time.time() - t0, 1),
         "audio_s": round(n / 16000, 2), "track_match": round(match, 3), "max_shift": [mdx, mdy]}
    res.append(r); print(r, flush=True)
json.dump(res, open(f"{out}/lipsync_log.json", "w"), indent=1)
'''


def main():
    T0 = time.time()
    inp = os.path.dirname(glob.glob("/kaggle/input/**/lipsync_jobs.json", recursive=True)[0])
    clips = os.path.dirname(glob.glob("/kaggle/input/**/clips/*.mp4", recursive=True)[0])
    print("inputs", inp, clips, flush=True)
    sh("nvidia-smi --query-gpu=name,memory.total --format=csv", check=False)
    sh(f"{sys.executable} -m pip install -q uv")
    sh(f"git clone -q --depth 1 https://github.com/TMElyralab/MuseTalk {REPO}")
    v = f"{TMP}/venv-mt"
    sh(f"uv venv -q -p 3.10 {v}")
    sh(f"uv pip install -q -p {v}/bin/python torch==2.0.1 torchvision==0.15.2 --index-url https://download.pytorch.org/whl/cu118")
    sh(f"uv pip install -q -p {v}/bin/python diffusers==0.30.2 accelerate==0.28.0 transformers==4.39.2 huggingface_hub==0.30.2 "
       f"numpy==1.23.5 opencv-python-headless==4.9.0.80 librosa==0.11.0 soundfile einops omegaconf")
    t_install = time.time() - T0
    dl = (f"from huggingface_hub import snapshot_download as s\n"
          f"s('TMElyralab/MuseTalk', local_dir='{REPO}/models', allow_patterns=['musetalkV15/*'])\n"
          f"s('stabilityai/sd-vae-ft-mse', local_dir='{REPO}/models/sd-vae', allow_patterns=['config.json','diffusion_pytorch_model.bin'])\n"
          f"s('openai/whisper-tiny', local_dir='{REPO}/models/whisper', allow_patterns=['config.json','pytorch_model.bin','preprocessor_config.json'])\n")
    open(f"{TMP}/dl.py", "w").write(dl)
    sh(f"{v}/bin/python {TMP}/dl.py")
    sh(f"ls -la {REPO}/models/* | head -30", check=False)
    open(f"{TMP}/run.py", "w").write(RUN)
    s = time.time()
    rc = subprocess.run(f"{v}/bin/python {TMP}/run.py {REPO} {inp} {clips} {WORK}/lipsync", shell=True).returncode
    summary = {"install_s": round(t_install), "run_s": round(time.time() - s), "session_s": round(time.time() - T0), "rc": rc}
    json.dump(summary, open(f"{WORK}/lipsync_results.json", "w"), indent=1)
    print(summary)


if __name__ == "__main__":
    main()
