# Kaggle GPU kernel: turns FLUX start frames into short animated clips with Wan 2.2 TI2V-5B
# (Apache-2.0) image-to-video, fp16 on Kaggle's T4 x2 (one clip per GPU at a time).
# Input: a private dataset with jobs.json + the start images (+ still-<i>.jpg for the zoompan scenes, and the helper
# modules enhance.py / flux_frames.py). Output: /kaggle/working/clips/<id>.mp4, stills/<i>.jpg and results.json (GPU
# seconds per clip). Pushed by animate/kaggle.mjs; never holds any secret.
# Quality pipeline (Nov 2026, animate/REPORT.md section 10), each step optional and falling back to the old path:
#   settings.flux    : start frames re-made here with FLUX.1-schnell Q8 at 1024 px / 8 steps (flux_frames.py)
#   settings.stills  : every start frame and still upscaled to 2160 px with Real-ESRGAN (sharper zoompan scenes)
#   settings.enhance : every clip RIFE-interpolated to 30 fps at its scene's length and Real-ESRGAN-upscaled to 1080 px
import glob, json, os, subprocess, sys, time

SPS_ANIMATE_KERNEL = True  # marker used by self_path()
EXPECT_STAMP = None  # set by animate/kaggle.mjs push: the dataset version this run must use
START_BY = None  # set by push: epoch seconds; a session that was queued past this exits without using the GPU

MID = "Wan-AI/Wan2.2-TI2V-5B-Diffusers"
WORK = "/kaggle/working"
TMP = "/kaggle/tmp" if os.path.isdir("/kaggle/tmp") else "/tmp"
os.environ.setdefault("HF_HOME", f"{TMP}/hf")
NEG = ("text, letters, words, watermark, logo, subtitles, deformed face, distorted face, asymmetric eyes, "
       "extra fingers, deformed hands, extra limbs, blurry, low quality, jpeg artifacts, flicker, static frame, "
       "overexposed, ugly, morphing, melting, sudden flash, scene cut, camera shake, rainbow streaks, colour banding, "
       "statue moving its body, changing face, "
       "色调艳丽，过曝，静态，细节模糊不清，字幕，风格，作品，画作，画面，静止，整体发灰，最差质量，低质量，JPEG压缩残留，"
       "丑陋的，残缺的，多余的手指，画得不好的手部，画得不好的脸部，畸形的，毁容的，形态畸形的肢体，手指融合，"
       "静止不动的画面，杂乱的背景，三条腿，背景人很多，倒着走")


def sh(*cmd, check=True, shell=False):
    print("+", " ".join(cmd), flush=True)
    try:
        subprocess.run(cmd[0] if shell else cmd, check=check, shell=shell)
    except FileNotFoundError as e:
        if check:
            raise
        print(e, flush=True)


def find_input():
    if os.environ.get("SPS_INPUT"):  # story/movie_kernel.py runs this script on a prepared folder
        return os.environ["SPS_INPUT"]
    hits = glob.glob("/kaggle/input/**/jobs.json", recursive=True)
    if not hits:
        raise SystemExit("jobs.json not found under /kaggle/input")
    return os.path.dirname(hits[0])


def encode_prompts(jobs, n_gpu):
    """UMT5-XXL in fp32 split over both T4s (fp16 T5 can overflow); embeddings are saved, then freed."""
    import torch
    from transformers import AutoTokenizer, UMT5EncoderModel
    tok = AutoTokenizer.from_pretrained(MID, subfolder="tokenizer")
    kw = dict(torch_dtype=torch.float32, device_map="balanced") if n_gpu > 1 else dict(torch_dtype=torch.float16, device_map="cuda")
    te = UMT5EncoderModel.from_pretrained(MID, subfolder="text_encoder", **kw).eval()
    dev = next(te.parameters()).device

    def enc(text):
        t = tok([text], padding="max_length", max_length=512, truncation=True, add_special_tokens=True,
                return_attention_mask=True, return_tensors="pt")
        n = int(t.attention_mask.sum())
        with torch.no_grad():
            e = te(t.input_ids.to(dev), t.attention_mask.to(dev)).last_hidden_state[0, :n].float().cpu()
        return torch.cat([e, e.new_zeros(512 - n, e.size(1))])[None]

    neg = enc(NEG)
    out = {j["id"]: {"pos": enc(j["prompt"]), "neg": neg} for j in jobs}
    assert all(torch.isfinite(v["pos"]).all() for v in out.values()), "text encoder produced NaN/inf"
    torch.save(out, f"{TMP}/emb.pt")
    del te
    torch.cuda.empty_cache()


def worker(gpu, ids, inp, cfg):
    """One process per GPU: Wan 2.2 TI2V-5B transformer fp16 + VAE fp32, image-to-video per job."""
    import numpy as np, torch
    from diffusers import AutoencoderKLWan, WanImageToVideoPipeline, WanTransformer3DModel
    from diffusers.utils import export_to_video, load_image
    jobs = {j["id"]: j for j in json.load(open(f"{TMP}/jobs.json"))["jobs"]}  # main() may have set frames from the voice
    emb = torch.load(f"{TMP}/emb.pt")
    t0 = time.time()
    tr = WanTransformer3DModel.from_pretrained(MID, subfolder="transformer", torch_dtype=torch.float16)
    if cfg.get("fp8", True):
        # 5B weights in fp16 (10 GB) + activations do not fit a 15 GB T4: store weights as fp8 (5 GB) and
        # compute each layer in fp16. Norms and embeddings stay fp16 (diffusers' default skip list).
        tr.enable_layerwise_casting(storage_dtype=torch.float8_e4m3fn, compute_dtype=torch.float16)
    vae = AutoencoderKLWan.from_pretrained(MID, subfolder="vae", torch_dtype=torch.float32)
    pipe = WanImageToVideoPipeline.from_pretrained(MID, transformer=tr, vae=vae, text_encoder=None,
                                                   image_encoder=None, image_processor=None, torch_dtype=torch.float16)
    pipe.vae.enable_tiling()
    pipe.enable_model_cpu_offload()  # the VAE leaves the GPU while denoising, the transformer while decoding
    open(f"{TMP}/ready-{gpu}", "w").write(str(time.time() - t0))
    print(f"[gpu{gpu}] loaded in {time.time() - t0:.0f}s", flush=True)
    os.makedirs(f"{WORK}/clips", exist_ok=True)
    per_frame = 1750 / 121
    enh = None
    for cid in ids:
        j = jobs[cid]
        frames_n = int(j.get("frames", cfg["frames"]))
        # Do not start a clip that cannot finish inside the budget (estimate: the last clip on this GPU, scaled
        # by frame count; ~29 min for 121 frames on a T4 before any was measured).
        est = per_frame * frames_n + (90 if cfg.get("enhance", True) else 0)
        if time.time() + est > cfg["deadline"]:
            print(f"[gpu{gpu}] time budget: skipping {cid} (~{est / 60:.0f} min)", flush=True)
            continue
        # Square by default; settings.width/height (multiples of 32) for the vertical movie clips (576x1024).
        cw, ch = int(cfg.get("width", cfg["size"])), int(cfg.get("height", cfg["size"]))
        img = load_image(j.get("start") or f"{inp}/{j['image']}").convert("RGB").resize((cw, ch))
        torch.cuda.reset_peak_memory_stats()
        torch.cuda.synchronize(); s = time.time()
        try:
            frames = pipe(image=img, prompt_embeds=emb[cid]["pos"].to("cuda", torch.float16),
                          negative_prompt_embeds=emb[cid]["neg"].to("cuda", torch.float16),
                          height=ch, width=cw, num_frames=frames_n,
                          num_inference_steps=cfg["steps"], guidance_scale=cfg["guidance"],
                          generator=torch.Generator("cuda").manual_seed(j.get("seed", 42)), output_type="np").frames[0]
        except Exception as e:  # one failed clip must not lose the others
            print(f"[gpu{gpu}] clip {cid} failed: {type(e).__name__}: {str(e)[:300]}", flush=True)
            torch.cuda.empty_cache()
            continue
        torch.cuda.synchronize(); secs = time.time() - s
        per_frame = secs / frames_n * 1.1
        bad = bool(np.isnan(frames).any() or frames.max() < 0.02)
        frames = np.nan_to_num(frames)
        os.makedirs(f"{WORK}/raw", exist_ok=True)
        export_to_video(list(frames), f"{WORK}/raw/{cid}.mp4", fps=cfg["fps"])
        rec = {"id": cid, "gpu": gpu, "seconds": round(secs, 1), "frames": frames_n, "fps": cfg["fps"],
               "size": cfg["size"], "steps": cfg["steps"], "bad_output": bad,
               "peak_vram_gb": round(torch.cuda.max_memory_allocated() / 2**30, 2)}
        # Post-processing (enhance.py): RIFE to 30 fps at the scene's length + Real-ESRGAN to 1080 px. Any failure
        # keeps the raw 24 fps clip (the renderer slows/upscales it as before).
        try:
            if not cfg.get("enhance", True):
                raise RuntimeError("off")
            if enh is None:
                sys.path.insert(0, inp)
                from enhance import Enhancer
                enh = Enhancer()
            rec.update(enh.process(frames, cfg["fps"], f"{WORK}/clips/{cid}.mp4", seconds=j.get("seconds"),
                                   fps=cfg.get("out_fps", 30), size=cfg.get("out_size", 1080)))
        except Exception as e:
            print(f"[gpu{gpu}] enhance {cid}: {type(e).__name__}: {str(e)[:200]}; keeping the raw clip", flush=True)
            import shutil
            shutil.copy(f"{WORK}/raw/{cid}.mp4", f"{WORK}/clips/{cid}.mp4")
        del frames
        print(f"[gpu{gpu}] {json.dumps(rec)}", flush=True)
        with open(f"{WORK}/results-gpu{gpu}.jsonl", "a") as f:
            f.write(json.dumps(rec) + "\n")


def frames_for(seconds):
    """Same rule as animate/kaggle.mjs framesFor: 4k+1 frames, at most a 1.1x slow-down fills the scene, 81-169."""
    import math
    return min(169, max(81, 4 * math.ceil((math.ceil(seconds / 1.1 * 24) - 1) / 4) + 1))


def narrate(inp, spec):
    """Chatterbox narration for every scene on GPU 0 (voice/chatterbox_tts.py), before Wan needs the GPUs. The clip
    lengths then follow the real narration. Any failure leaves no voice.json: the renderer falls back to edge-tts."""
    s = time.time()
    try:
        sh(f"{sys.executable} -m pip install -q --no-deps git+https://github.com/resemble-ai/chatterbox.git && "
           f"{sys.executable} -m pip install -q librosa==0.11.0 s3tokenizer conformer==0.3.2 pyloudnorm omegaconf "
           f"pykakasi==2.3.0 'git+https://github.com/resemble-ai/Perth.git@master'", shell=True)
        subprocess.run([sys.executable, f"{inp}/chatterbox_tts.py", f"{inp}/{spec['voice']['lines']}", f"{WORK}/voice"],
                       check=True, timeout=60 * spec["voice"].get("max_minutes", 20),
                       env={**os.environ, "CUDA_VISIBLE_DEVICES": "0"})
        lines = {str(l["i"]): l for l in json.load(open(f"{WORK}/voice/voice.json"))["lines"]}
        for j in spec["jobs"]:
            v = lines.get(j["id"])
            if v and v.get("ok"):
                j["frames"] = frames_for(v["seconds"] + spec["voice"].get("pad", 0.7))
    except Exception as e:
        print(f"narration failed (edge-tts fallback): {e}", flush=True)
        if os.path.exists(f"{WORK}/voice/voice.json"):
            os.remove(f"{WORK}/voice/voice.json")
    return round(time.time() - s)


def start_frames(inp, spec, cfg):
    """settings.flux: re-make the animated scenes' start frames with FLUX.1-schnell here (flux_frames.py); then
    settings.stills: upscale every start frame + still to 2160 px (enhance.py stills). Both fall back silently."""
    import shutil
    t_flux = t_stills = None
    if cfg.get("flux") and os.path.exists(f"{inp}/flux_frames.py") and any(j.get("flux_prompt") for j in spec["jobs"]):
        s = time.time()
        r = subprocess.run([sys.executable, f"{inp}/flux_frames.py", inp, f"{WORK}/frames", json.dumps(cfg["flux"] if isinstance(cfg["flux"], dict) else {})])
        made = 0
        for j in spec["jobs"]:
            f = f"{WORK}/frames/{j['id']}.png"
            if r.returncode == 0 and os.path.exists(f):
                j["start"] = f
                made += 1
        t_flux = {"seconds": round(time.time() - s), "frames": made, "exit": r.returncode}
    if cfg.get("stills", True) and os.path.exists(f"{inp}/enhance.py"):
        s = time.time()
        src = f"{TMP}/stills-in"
        os.makedirs(src, exist_ok=True)
        for f in glob.glob(f"{inp}/still-*.jpg"):
            shutil.copy(f, src)
        for j in spec["jobs"]:
            if j.get("start"):
                from PIL import Image
                Image.open(j["start"]).convert("RGB").save(f"{src}/{j['id']}.jpg", quality=97)
            else:
                shutil.copy(f"{inp}/{j['image']}", f"{src}/{j['id']}.jpg")
        r = subprocess.run([sys.executable, f"{inp}/enhance.py", "stills", src, f"{WORK}/stills"], env={**os.environ, "CUDA_VISIBLE_DEVICES": "0"})
        t_stills = {"seconds": round(time.time() - s), "exit": r.returncode}
    return t_flux, t_stills


def hero(inp, spec, cfg, ids):
    """settings.hero14b: the job marked `hero` (one darshan shot) is made with Wan 2.2 I2V-A14B + the Lightning 4-step
    LoRA on both T4s (hero14b.py), before the 5B clips; it is then removed from `ids`. Any failure or an over-budget
    session leaves it in `ids`, so the 5B model makes it as before."""
    h = cfg.get("hero14b")
    hid = [j["id"] for j in spec["jobs"] if j.get("hero")][:1]
    if not h or not hid or not os.path.exists(f"{inp}/hero14b.py"):
        return None
    s = time.time()
    hc = {"quant": "Q4_K_S", "sizes": [640], "frames": 81, "steps": 4, "lora": True, "max_minutes": 30,
          **(h if isinstance(h, dict) else {}), "emb": f"{TMP}/emb.pt", "hard_deadline": cfg["deadline"] - 45 * 60}
    r = subprocess.run([sys.executable, f"{inp}/hero14b.py", "run", inp, ",".join(hid), json.dumps(hc)])
    made = [i for i in hid if r.returncode == 0 and os.path.exists(f"{WORK}/clips/{i}.mp4")]
    for i in made:
        ids.remove(i)
    rec = {"seconds": round(time.time() - s), "made": made, "exit": r.returncode}
    if os.path.exists(f"{WORK}/results-hero.json"):
        rec["detail"] = json.load(open(f"{WORK}/results-hero.json")).get("clips")
    return rec


def self_path():
    """This script's own path, so each GPU worker can be started as a separate process."""
    f = globals().get("__file__")
    if f and os.path.exists(f):
        return os.path.abspath(f)
    for c in glob.glob("/kaggle/src/**/*.py", recursive=True) + glob.glob("/kaggle/**/*.py", recursive=True):
        if "SPS_ANIMATE_KERNEL" in open(c, errors="ignore").read():
            return c
    raise SystemExit("cannot locate this script for the GPU workers")


def main():
    T0 = time.time()
    if START_BY and T0 > START_BY:
        raise SystemExit(f"session started {T0 - START_BY:.0f}s after START_BY: the workflow already fell back to zoompan")
    inp = find_input()
    spec = json.load(open(f"{inp}/jobs.json"))
    if EXPECT_STAMP and spec.get("stamp") != EXPECT_STAMP:
        raise SystemExit(f"stale dataset: jobs.json is {spec.get('stamp')}, expected {EXPECT_STAMP}")
    cfg = {"size": 704, "frames": 121, "fps": 24, "steps": 30, "guidance": 5.0, **spec.get("settings", {})}
    cfg["deadline"] = T0 + 60 * cfg.get("max_minutes", 95)
    sh("nvidia-smi", check=False)
    sh("df", "-h", TMP, WORK, check=False)
    import torch
    print("torch", torch.__version__, "cuda", torch.cuda.is_available(), torch.cuda.device_count(), flush=True)
    if not torch.cuda.is_available():
        import urllib.request
        try:
            urllib.request.urlopen("https://huggingface.co", timeout=20)
            print("internet: ok", flush=True)
        except Exception as e:
            print("internet: blocked", e, flush=True)
        raise SystemExit("no GPU in this session")
    t_voice = narrate(inp, spec) if spec.get("voice") else None
    json.dump(spec, open(f"{TMP}/jobs.json", "w"))
    if not spec["jobs"]:  # narration only (the long video)
        json.dump({"stamp": spec.get("stamp"), "voice_s": t_voice, "session_s": round(time.time() - T0), "clips": []},
                  open(f"{WORK}/results.json", "w"), indent=2)
        return
    sh(sys.executable, "-m", "pip", "install", "-q", "-U", "diffusers>=0.35.1", "transformers>=4.51", "accelerate", "ftfy", "imageio-ffmpeg",
       *(["gguf>=0.10.0"] if cfg.get("flux") else []))
    t_flux, t_stills = start_frames(inp, spec, cfg)
    json.dump(spec, open(f"{TMP}/jobs.json", "w"))
    from huggingface_hub import snapshot_download
    s = time.time()
    snapshot_download(MID, allow_patterns=["model_index.json", "scheduler/*", "tokenizer/*", "text_encoder/*", "transformer/*", "vae/*"])
    t_dl = time.time() - s
    n_gpu = torch.cuda.device_count()
    s = time.time()
    # In its own process: CUDA memory held by the text encoder is only fully returned when the process exits.
    subprocess.run([sys.executable, self_path(), "encode", inp, str(n_gpu)], check=True)
    t_te = time.time() - s
    ids = [j["id"] for j in spec["jobs"]]
    t_hero = hero(inp, spec, cfg, ids)
    # Longest clip first to the least-loaded GPU (by frames), so both T4s finish at about the same time.
    frames_of = {j["id"]: int(j.get("frames", cfg["frames"])) for j in spec["jobs"]}
    load, parts = [0] * max(1, n_gpu), [[] for _ in range(max(1, n_gpu))]
    for i in sorted(ids, key=lambda i: -frames_of[i]):
        g = load.index(min(load)); parts[g].append(i); load[g] += frames_of[i]
    procs = []
    for g in range(max(1, n_gpu)):
        mine = parts[g]
        if not mine:
            continue
        env = {**os.environ, "CUDA_VISIBLE_DEVICES": str(g)}
        procs.append(subprocess.Popen([sys.executable, self_path(), "worker", str(g), ",".join(mine), inp, json.dumps(cfg)], env=env))
        while procs[-1].poll() is None and not os.path.exists(f"{TMP}/ready-{g}"):
            time.sleep(5)  # load one worker at a time so CPU RAM never holds two fp32 checkpoints at once
    codes = [p.wait() for p in procs]
    results = []
    for f in glob.glob(f"{WORK}/results-gpu*.jsonl"):
        results += [json.loads(l) for l in open(f)]
    summary = {"stamp": spec.get("stamp"), "model": MID, "gpus": n_gpu, "gpu_name": torch.cuda.get_device_name(0), "settings": cfg,
               "voice_s": t_voice, "flux": t_flux, "stills": t_stills, "hero14b": t_hero, "download_s": round(t_dl), "text_encoder_s": round(t_te), "session_s": round(time.time() - T0),
               "exit_codes": codes, "clips": sorted(results, key=lambda r: r["id"])}
    json.dump(summary, open(f"{WORK}/results.json", "w"), indent=2)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "encode":
        encode_prompts(json.load(open(f"{sys.argv[2]}/jobs.json"))["jobs"], int(sys.argv[3]))
    elif len(sys.argv) > 1 and sys.argv[1] == "worker":
        worker(int(sys.argv[2]), sys.argv[3].split(","), sys.argv[4], json.loads(sys.argv[5]))
    else:
        main()
