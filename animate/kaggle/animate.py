# Kaggle GPU kernel: turns FLUX start frames into short animated clips with Wan 2.2 TI2V-5B
# (Apache-2.0) image-to-video, fp16 on Kaggle's T4 x2 (one clip per GPU at a time).
# Input: a private dataset with jobs.json + the start images. Output: /kaggle/working/clips/<id>.mp4
# and results.json (GPU seconds per clip). Pushed by animate/kaggle.mjs; never holds any secret.
import glob, json, os, subprocess, sys, time

SPS_ANIMATE_KERNEL = True  # marker used by self_path()

MID = "Wan-AI/Wan2.2-TI2V-5B-Diffusers"
WORK = "/kaggle/working"
TMP = "/kaggle/tmp" if os.path.isdir("/kaggle/tmp") else "/tmp"
os.environ.setdefault("HF_HOME", f"{TMP}/hf")
NEG = ("text, letters, words, watermark, logo, subtitles, deformed face, distorted face, asymmetric eyes, "
       "extra fingers, deformed hands, extra limbs, blurry, low quality, jpeg artifacts, flicker, static frame, "
       "overexposed, ugly, morphing, melting, "
       "色调艳丽，过曝，静态，细节模糊不清，字幕，风格，作品，画作，画面，静止，整体发灰，最差质量，低质量，JPEG压缩残留，"
       "丑陋的，残缺的，多余的手指，画得不好的手部，画得不好的脸部，畸形的，毁容的，形态畸形的肢体，手指融合，"
       "静止不动的画面，杂乱的背景，三条腿，背景人很多，倒着走")


def sh(*cmd, check=True):
    print("+", " ".join(cmd), flush=True)
    try:
        subprocess.run(cmd, check=check)
    except FileNotFoundError as e:
        if check:
            raise
        print(e, flush=True)


def find_input():
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
    jobs = {j["id"]: j for j in json.load(open(f"{inp}/jobs.json"))["jobs"]}
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
    for cid in ids:
        j = jobs[cid]
        if time.time() > cfg["deadline"]:
            print(f"[gpu{gpu}] deadline reached, skipping {cid}", flush=True)
            continue
        img = load_image(f"{inp}/{j['image']}").convert("RGB").resize((cfg["size"], cfg["size"]))
        torch.cuda.reset_peak_memory_stats()
        torch.cuda.synchronize(); s = time.time()
        try:
            frames = pipe(image=img, prompt_embeds=emb[cid]["pos"].to("cuda", torch.float16),
                          negative_prompt_embeds=emb[cid]["neg"].to("cuda", torch.float16),
                          height=cfg["size"], width=cfg["size"], num_frames=cfg["frames"],
                          num_inference_steps=cfg["steps"], guidance_scale=cfg["guidance"],
                          generator=torch.Generator("cuda").manual_seed(j.get("seed", 42)), output_type="np").frames[0]
        except Exception as e:  # one failed clip must not lose the others
            print(f"[gpu{gpu}] clip {cid} failed: {type(e).__name__}: {str(e)[:300]}", flush=True)
            torch.cuda.empty_cache()
            continue
        torch.cuda.synchronize(); secs = time.time() - s
        bad = bool(np.isnan(frames).any() or frames.max() < 0.02)
        export_to_video(list(np.nan_to_num(frames)), f"{WORK}/clips/{cid}.mp4", fps=cfg["fps"])
        rec = {"id": cid, "gpu": gpu, "seconds": round(secs, 1), "frames": cfg["frames"], "fps": cfg["fps"],
               "size": cfg["size"], "steps": cfg["steps"], "bad_output": bad,
               "peak_vram_gb": round(torch.cuda.max_memory_allocated() / 2**30, 2)}
        print(f"[gpu{gpu}] {json.dumps(rec)}", flush=True)
        with open(f"{WORK}/results-gpu{gpu}.jsonl", "a") as f:
            f.write(json.dumps(rec) + "\n")


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
    inp = find_input()
    spec = json.load(open(f"{inp}/jobs.json"))
    cfg = {"size": 704, "frames": 121, "fps": 24, "steps": 30, "guidance": 5.0, **spec.get("settings", {})}
    cfg["deadline"] = T0 + 60 * cfg.get("max_minutes", 150)
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
    sh(sys.executable, "-m", "pip", "install", "-q", "-U", "diffusers>=0.35.1", "transformers>=4.51", "accelerate", "ftfy", "imageio-ffmpeg")
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
    procs = []
    for g in range(max(1, n_gpu)):
        mine = ids[g::max(1, n_gpu)]
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
    summary = {"model": MID, "gpus": n_gpu, "gpu_name": torch.cuda.get_device_name(0), "settings": cfg,
               "download_s": round(t_dl), "text_encoder_s": round(t_te), "session_s": round(time.time() - T0),
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
