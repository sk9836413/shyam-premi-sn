# Post-processing for every generated clip, on the Kaggle GPU (imported by animate.py, hero14b.py and
# characters/kaggle/lipsync_daily.py; shipped inside each private dataset next to jobs.json).
#
#   retime : RIFE v4.25 frame interpolation (Practical-RIFE, MIT; the author's README says the model downloads are
#            "under the same MIT license"). Turns Wan's 24 fps (14B: 16 fps) into 30 fps and, when the scene is longer
#            than the clip, stretches it smoothly (real in-between frames instead of the renderer's duplicated frames).
#   upscale: Real-ESRGAN realesr-general-x4v3 (BSD-3-Clause, xinntao/Real-ESRGAN release v0.2.5.0), then an
#            anti-aliased downscale to the renderer's 1080 px square: real detail instead of a lanczos blow-up.
# Code: Practical-RIFE is cloned (git, MIT) for its model/ helpers; the RIFE 4.25 weights come from an unofficial
# Hugging Face mirror of the official Google Drive zip (Bash2X/RIFE-Models) and are checked against a pinned SHA-256.
# The SRVGGNetCompact network below is re-implemented from Real-ESRGAN (BSD-3-Clause, Copyright (c) 2021 Xintao Wang).
# No GFPGAN/CodeFormer (non-commercial parts) anywhere.
#
# CLI:  python enhance.py stills <in_dir> <out_dir> [size]   -> every still-*.jpg / <n>.jpg upscaled to <size> px (2160)
import glob, hashlib, json, os, subprocess, sys, time, zipfile

TMP = "/kaggle/tmp" if os.path.isdir("/kaggle/tmp") else "/tmp"
RIFE_REPO = f"{TMP}/Practical-RIFE"
RIFE_ZIP = ("Bash2X/RIFE-Models", "RIFE_v4.25.zip", "e63d481b7ae5d4a4e6ad7ac5b410ff78f3bf7be3b51b2e38ca8152747abde5b4")
ESR_URL = "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-general-x4v3.pth"
ESR_SHA = "8dc7edb9ac80ccdc30c3a5dca6616509367f05fbc184ad95b731f05bece96292"


def _sha(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def _ffmpeg():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"


class Enhancer:
    """Loads RIFE + Real-ESRGAN once per process (both ~30 MB, < 2 GB VRAM while running)."""

    def __init__(self, device="cuda", rife=True):
        import torch
        self.torch, self.dev = torch, torch.device(device)
        torch.backends.cudnn.benchmark = True
        self.esr = self._load_esrgan()
        self.rife = None
        try:
            self.rife = self._load_rife() if rife else None
        except Exception as e:  # upscale still works without interpolation
            print(f"[enhance] RIFE unavailable: {type(e).__name__}: {str(e)[:200]}", flush=True)

    # ---- Real-ESRGAN (SRVGGNetCompact, realesr-general-x4v3) ----
    def _load_esrgan(self):
        import torch, torch.nn as nn, torch.nn.functional as F
        import urllib.request

        class SRVGGNetCompact(nn.Module):
            def __init__(self, num_feat=64, num_conv=32, upscale=4):
                super().__init__()
                self.upscale = upscale
                body = [nn.Conv2d(3, num_feat, 3, 1, 1), nn.PReLU(num_parameters=num_feat)]
                for _ in range(num_conv):
                    body += [nn.Conv2d(num_feat, num_feat, 3, 1, 1), nn.PReLU(num_parameters=num_feat)]
                body.append(nn.Conv2d(num_feat, 3 * upscale * upscale, 3, 1, 1))
                self.body = nn.ModuleList(body)
                self.upsampler = nn.PixelShuffle(upscale)

            def forward(self, x):
                out = x
                for layer in self.body:
                    out = layer(out)
                return self.upsampler(out) + F.interpolate(x, scale_factor=self.upscale, mode="nearest")

        # The dataset ships the weights (animate/kaggle.mjs); else download them, retrying (GitHub sometimes 504s).
        path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "realesr-general-x4v3.pth")
        if not (os.path.exists(path) and _sha(path) == ESR_SHA):
            path = f"{TMP}/realesr-general-x4v3.pth"
            for k in range(4):
                try:
                    if not os.path.exists(path):
                        urllib.request.urlretrieve(ESR_URL, path)
                    break
                except Exception as e:
                    print(f"[enhance] weights download try {k + 1}: {e}", flush=True)
                    time.sleep(15)
        if _sha(path) != ESR_SHA:
            raise RuntimeError("Real-ESRGAN weights: SHA-256 mismatch")
        sd = torch.load(path, map_location="cpu", weights_only=True)
        sd = sd.get("params_ema", sd.get("params", sd))
        net = SRVGGNetCompact()
        net.load_state_dict(sd, strict=True)
        return net.eval().half().to(self.dev)

    # ---- RIFE 4.25 ----
    def _load_rife(self):
        import torch
        from huggingface_hub import hf_hub_download
        if not os.path.isdir(f"{RIFE_REPO}/model"):
            subprocess.run(["git", "clone", "-q", "--depth", "1", "https://github.com/hzwer/Practical-RIFE", RIFE_REPO], check=True)
        z = hf_hub_download(RIFE_ZIP[0], RIFE_ZIP[1])
        if _sha(z) != RIFE_ZIP[2]:
            raise RuntimeError("RIFE weights: SHA-256 mismatch")
        with zipfile.ZipFile(z) as zf:
            for n in zf.namelist():
                if n.startswith("train_log/") and (n.endswith(".py") or n.endswith(".pkl")):
                    zf.extract(n, RIFE_REPO)
        if RIFE_REPO not in sys.path:
            sys.path.insert(0, RIFE_REPO)
        cwd = os.getcwd()
        os.chdir(RIFE_REPO)
        try:
            from train_log.RIFE_HDv3 import Model
        finally:
            os.chdir(cwd)
        m = Model()
        sd = torch.load(f"{RIFE_REPO}/train_log/flownet.pkl", map_location="cpu", weights_only=True)
        sd = {k.replace("module.", ""): v for k, v in sd.items()}
        missing, _ = m.flownet.load_state_dict(sd, strict=False)
        if len(missing) > 0:
            raise RuntimeError(f"RIFE weights: {len(missing)} missing keys")
        m.eval()
        m.flownet.to(self.dev)
        return m

    # ---- per-frame helpers (torch, NCHW float on the GPU) ----
    def _t(self, frame):
        t = self.torch.from_numpy(frame).to(self.dev, non_blocking=True)
        return t.permute(2, 0, 1)[None].float()

    def _mid(self, a, b, t):
        torch = self.torch
        h, w = a.shape[2:]
        ph, pw = (64 - h % 64) % 64, (64 - w % 64) % 64
        pad = lambda x: torch.nn.functional.pad(x, (0, pw, 0, ph))
        with torch.no_grad():
            return self.rife.inference(pad(a), pad(b), timestep=float(t), scale=1.0)[:, :, :h, :w].clamp(0, 1)

    def _up(self, x, size):
        torch, F = self.torch, self.torch.nn.functional
        with torch.no_grad():
            y = self.esr(x.half()).float().clamp(0, 1)
            if size:
                y = F.interpolate(y, size=(size, size) if isinstance(size, int) else size, mode="bicubic",
                                  antialias=True, align_corners=False).clamp(0, 1)
        return y

    def process(self, frames, src_fps, out_path, seconds=None, fps=30, size=1080, max_slow=1.3, crf=14):
        """frames: list/array of HxWx3 floats in [0, 1] (or uint8). Writes an H.264 clip of `seconds` (default: the
        clip's own length) at `fps`, each frame RIFE-interpolated at its exact source time, then upscaled."""
        import numpy as np
        torch = self.torch
        t0 = time.time()
        src = [np.ascontiguousarray(f if f.dtype != np.uint8 else f.astype(np.float32) / 255, dtype=np.float32) for f in frames]
        n_src = len(src)
        own = (n_src - 1) / src_fps
        # Longer scene: slow the clip down smoothly (at most max_slow); shorter scene: play at speed and stop early.
        speed = max(1.0, min(max_slow, seconds / own)) if seconds else 1.0
        dur = min(seconds, own * speed) if seconds else own
        n_out = max(2, int(round(dur * fps)) + 1)
        h, w = src[0].shape[:2]
        H, W = (size, size) if isinstance(size, int) else size
        cmd = [_ffmpeg(), "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(fps), "-i", "-",
               "-c:v", "libx264", "-preset", "medium", "-crf", str(crf), "-pix_fmt", "yuv420p", "-movflags", "+faststart", out_path]
        enc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        cache = {}

        def get(i):
            if i not in cache:
                if len(cache) > 3:
                    cache.pop(min(cache))
                cache[i] = self._t(src[i])
            return cache[i]

        interp = 0
        for k in range(n_out):
            p = min(n_src - 1, k / fps * src_fps / speed)
            i0 = min(int(p), n_src - 2)
            frac = p - i0
            if self.rife is None or frac < 0.04 or frac > 0.96:
                x = get(i0 if frac < 0.5 else i0 + 1)
            else:
                x = self._mid(get(i0), get(i0 + 1), frac)
                interp += 1
            y = self._up(x, (H, W))
            enc.stdin.write((y[0].permute(1, 2, 0) * 255 + 0.5).clamp(0, 255).byte().cpu().numpy().tobytes())
        enc.stdin.close()
        if enc.wait() != 0:
            raise RuntimeError("ffmpeg encode failed")
        torch.cuda.synchronize()
        return {"enhanced": True, "rife": self.rife is not None, "out_frames": n_out, "out_fps": fps, "out_size": [W, H],
                "interpolated": interp, "out_seconds": round((n_out - 1) / fps, 2), "enhance_s": round(time.time() - t0, 1)}

    def process_file(self, path, out_path, **kw):
        """Same as process() for an existing clip file (decoded with ffmpeg)."""
        import numpy as np
        probe = subprocess.run([_ffmpeg(), "-i", path], capture_output=True, text=True).stderr
        import re
        m = re.search(r"Video:.*?, (\d{2,5})x(\d{2,5})[ ,\[].*?, ([\d.]+) fps", probe)
        w, h, fps = int(m.group(1)), int(m.group(2)), float(m.group(3))
        raw = subprocess.run([_ffmpeg(), "-v", "error", "-i", path, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
        n = w * h * 3
        frames = [np.frombuffer(raw[o:o + n], np.uint8).reshape(h, w, 3) for o in range(0, len(raw) - n + 1, n)]
        return self.process(frames, fps, out_path, **kw)

    def still(self, src, dst, size=2160):
        """One image -> Real-ESRGAN x4 -> anti-aliased resize so the longer side is `size` px (JPEG q95)."""
        import numpy as np
        from PIL import Image
        im = np.asarray(Image.open(src).convert("RGB"), dtype=np.float32) / 255
        h, w = im.shape[:2]
        s = size / max(h, w)
        y = self._up(self._t(im), (round(h * s), round(w * s)))
        Image.fromarray((y[0].permute(1, 2, 0) * 255 + 0.5).clamp(0, 255).byte().cpu().numpy()).save(dst, quality=95)


def stills(inp, out, size=2160):
    """Upscale every start frame / still in the dataset (so zoompan scenes and rejected clips' fallbacks are sharp)."""
    os.makedirs(out, exist_ok=True)
    t0 = time.time()
    e = Enhancer()
    done = []
    for f in sorted(glob.glob(f"{inp}/*.jpg")):
        name = os.path.basename(f)
        i = name[6:-4] if name.startswith("still-") else name[:-4]
        # Scene numbers for the Shorts; the movie kernel names its stills s<n> / teaser (story/movie_kernel.py).
        if not (i.isdigit() or (i.replace("-", "").isalnum() and i.islower())):
            continue
        e.still(f, f"{out}/{i}.jpg", size)
        done.append(int(i) if i.isdigit() else i)
    rec = {"stills": sorted(done, key=str), "stills_s": round(time.time() - t0, 1)}
    print(json.dumps(rec), flush=True)
    return rec


if __name__ == "__main__":
    if len(sys.argv) > 3 and sys.argv[1] == "stills":
        rec = stills(sys.argv[2], sys.argv[3], int(sys.argv[4]) if len(sys.argv) > 4 else 2160)
        json.dump(rec, open(os.path.join(sys.argv[3], "stills.json"), "w"))
