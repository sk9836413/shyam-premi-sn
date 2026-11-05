# Hero clip with the bigger video model: Wan 2.2 I2V-A14B (Apache-2.0) on Kaggle's T4 x2.
# The two 14B experts are GGUF Q4_K_S quantisations (QuantStack/Wan2.2-I2V-A14B-GGUF, Apache-2.0): the high-noise
# expert lives on GPU 0, the low-noise expert + VAE on GPU 1 (8.75 GB each; Q4_K_M + the VAE on one T4 ran out of
# memory in the 5 Nov test), so nothing is swapped through the 31 GB of RAM.
# Speed: the Wan2.2-Lightning 4-step LoRAs (lightx2v, Apache-2.0), guidance 1 (no CFG pass). Text: UMT5-XXL in fp32
# split over both GPUs in a separate process (as animate.py). Output: enhanced 30 fps 1080 px clip (enhance.py).
#   python hero14b.py <input_dir> <ids,comma> <cfg_json>     (run by animate.py, or as the kernel's main for a test)
# cfg: sizes [640] (square), frames 81 (16 fps, 5 s), steps 4, lora true, max_minutes, seconds per id, baseline_steps
# (test only: time a few steps without the LoRA at guidance 3.5 to extrapolate the plain 40-step cost).
import glob, json, os, subprocess, sys, time

SPS_HERO14B = True
MID = "Wan-AI/Wan2.2-I2V-A14B-Diffusers"
GGUF = ("QuantStack/Wan2.2-I2V-A14B-GGUF", "HighNoise/Wan2.2-I2V-A14B-HighNoise-{q}.gguf", "LowNoise/Wan2.2-I2V-A14B-LowNoise-{q}.gguf")
LORA = ("lightx2v/Wan2.2-Lightning", "Wan2.2-I2V-A14B-4steps-lora-rank64-Seko-V1/high_noise_model.safetensors",
        "Wan2.2-I2V-A14B-4steps-lora-rank64-Seko-V1/low_noise_model.safetensors")
WORK = "/kaggle/working"
TMP = "/kaggle/tmp" if os.path.isdir("/kaggle/tmp") else "/tmp"
os.environ.setdefault("HF_HOME", f"{TMP}/hf")
os.environ.setdefault("PYTORCH_CUDA_ALLOC_CONF", "expandable_segments:True")
EXPECT_STAMP = None
START_BY = None
NEG = ("text, letters, watermark, logo, subtitles, deformed face, distorted face, changing face, asymmetric eyes, extra fingers, "
       "extra limbs, blurry, low quality, jpeg artifacts, flicker, sudden flash, scene cut, camera shake, rainbow streaks, colour banding, "
       "morphing, melting, statue moving its body, "
       "色调艳丽，过曝，静态，细节模糊不清，字幕，风格，作品，画作，画面，静止，整体发灰，最差质量，低质量，JPEG压缩残留，"
       "丑陋的，残缺的，多余的手指，画得不好的手部，画得不好的脸部，畸形的，毁容的，形态畸形的肢体，手指融合，"
       "静止不动的画面，杂乱的背景，三条腿，背景人很多，倒着走")


def sh(cmd):
    print("+", cmd, flush=True)
    subprocess.run(cmd, shell=True, check=True)


def encode(inp, ids):
    import torch
    from transformers import AutoTokenizer, UMT5EncoderModel
    jobs = {j["id"]: j for j in json.load(open(f"{inp}/jobs.json"))["jobs"]}
    tok = AutoTokenizer.from_pretrained(MID, subfolder="tokenizer")
    te = UMT5EncoderModel.from_pretrained(MID, subfolder="text_encoder", torch_dtype=torch.float32, device_map="balanced").eval()
    dev = next(te.parameters()).device

    def enc(text):
        t = tok([text], padding="max_length", max_length=512, truncation=True, return_attention_mask=True, return_tensors="pt")
        n = int(t.attention_mask.sum())
        with torch.no_grad():
            e = te(t.input_ids.to(dev), t.attention_mask.to(dev)).last_hidden_state[0, :n].float().cpu()
        return torch.cat([e, e.new_zeros(512 - n, e.size(1))])[None]

    neg = enc(NEG)
    torch.save({i: {"pos": enc(jobs[i].get("prompt14b") or jobs[i]["prompt"]), "neg": neg} for i in ids}, f"{TMP}/emb14.pt")


def load(cfg):
    import torch
    from accelerate.hooks import AlignDevicesHook, add_hook_to_module
    from diffusers import (AutoencoderKLWan, FlowMatchEulerDiscreteScheduler, GGUFQuantizationConfig,
                           WanImageToVideoPipeline, WanTransformer3DModel)
    from huggingface_hub import hf_hub_download
    q = GGUFQuantizationConfig(compute_dtype=torch.float16)
    t = {}
    s = time.time()
    hi = WanTransformer3DModel.from_single_file(hf_hub_download(GGUF[0], GGUF[1].format(q=cfg["quant"])), quantization_config=q,
                                                config=MID, subfolder="transformer", torch_dtype=torch.float16)
    lo = WanTransformer3DModel.from_single_file(hf_hub_download(GGUF[0], GGUF[2].format(q=cfg["quant"])), quantization_config=q,
                                                config=MID, subfolder="transformer_2", torch_dtype=torch.float16)
    vae = AutoencoderKLWan.from_pretrained(MID, subfolder="vae", torch_dtype=torch.float32)
    pipe = WanImageToVideoPipeline.from_pretrained(MID, transformer=hi, transformer_2=lo, vae=vae, text_encoder=None,
                                                   image_encoder=None, image_processor=None, torch_dtype=torch.float16)
    t["load_s"] = round(time.time() - s)
    t["lora"] = False
    if cfg.get("lora", True):
        try:
            pipe.load_lora_weights(LORA[0], weight_name=LORA[1], adapter_name="light")
            pipe.load_lora_weights(LORA[0], weight_name=LORA[2], adapter_name="light2", load_into_transformer_2=True)
            t["lora"] = True
        except Exception as e:
            print(f"LoRA failed: {type(e).__name__}: {str(e)[:400]}", flush=True)
    pipe.scheduler = FlowMatchEulerDiscreteScheduler.from_config(pipe.scheduler.config, shift=cfg.get("shift", 5.0))
    hi.to("cuda:0"); vae.to("cuda:1"); lo.to("cuda:1")
    add_hook_to_module(hi, AlignDevicesHook(execution_device="cuda:0", io_same_device=True))
    add_hook_to_module(lo, AlignDevicesHook(execution_device="cuda:1", io_same_device=True))
    type(pipe)._execution_device = property(lambda self: torch.device("cuda:1"))
    pipe.vae.enable_tiling()
    return pipe, t


def run(inp, ids, cfg):
    sys.path.insert(0, inp)
    T0 = time.time()
    deadline = T0 + 60 * cfg.get("max_minutes", 60)
    jobs = {j["id"]: j for j in json.load(open(f"{inp}/jobs.json"))["jobs"]}
    sh(f"{sys.executable} -m pip install -q -U 'diffusers>=0.35.1' 'transformers>=4.51' accelerate ftfy imageio-ffmpeg 'gguf>=0.10.0' peft && "
       f"({sys.executable} -m pip uninstall -y -q torchao || true)")  # peft refuses the image's old torchao
    # diffusers is imported only after this install, so it sees gguf (it checks for it once, at import).
    import numpy as np, torch
    from diffusers.utils import export_to_video, load_image
    from huggingface_hub import hf_hub_download, snapshot_download
    s = time.time()
    snapshot_download(MID, allow_patterns=["model_index.json", "scheduler/*", "tokenizer/*", "text_encoder/*", "vae/*", "transformer/config.json", "transformer_2/config.json"])
    for f in GGUF[1:]:
        hf_hub_download(GGUF[0], f.format(q=cfg["quant"]))
    for f in LORA[1:]:
        hf_hub_download(LORA[0], f)
    rec = {"download_s": round(time.time() - s)}
    s = time.time()
    # animate.py already encoded every prompt with the same UMT5-XXL (identical weights in both Wan 2.2 repos).
    ef = cfg.get("emb")
    if not (ef and os.path.exists(ef)):
        me = f"{inp}/hero14b.py" if os.path.exists(f"{inp}/hero14b.py") else os.path.abspath(__file__)
        subprocess.run([sys.executable, me, "encode", inp, ",".join(ids)], check=True)
        ef = f"{TMP}/emb14.pt"
    rec["text_encoder_s"] = round(time.time() - s)
    pipe, t = load(cfg)
    rec.update(t)
    emb = torch.load(ef)
    from enhance import Enhancer
    enh = None
    os.makedirs(f"{WORK}/clips", exist_ok=True); os.makedirs(f"{WORK}/raw", exist_ok=True)
    rec["clips"] = []
    steps = cfg.get("steps", 4) if rec["lora"] else cfg.get("steps_no_lora", 20)
    guidance = 1.0 if rec["lora"] else 3.5
    for cid in ids:
        j = jobs[cid]
        for size in cfg.get("sizes", [640]):
            est = {640: 20, 720: 28, 960: 60}.get(size, 40) * 60
            if time.time() + est > deadline or time.time() + est > cfg.get("hard_deadline", 1e12):
                print(f"time budget: skipping {cid}@{size}", flush=True)
                continue
            img = load_image(f"{inp}/{j['image']}").convert("RGB").resize((size, size))
            for g in (0, 1):
                torch.cuda.reset_peak_memory_stats(g)
            torch.cuda.synchronize(0); torch.cuda.synchronize(1)
            s = time.time()
            try:
                fr = pipe(image=img, prompt_embeds=emb[cid]["pos"].to("cuda:1", torch.float16),
                          negative_prompt_embeds=emb[cid]["neg"].to("cuda:1", torch.float16), height=size, width=size,
                          num_frames=cfg.get("frames", 81), num_inference_steps=steps, guidance_scale=guidance, guidance_scale_2=guidance,
                          generator=torch.Generator("cpu").manual_seed(j.get("seed", 42)), output_type="np").frames[0]
            except Exception as e:
                print(f"clip {cid}@{size} failed: {type(e).__name__}: {str(e)[:400]}", flush=True)
                torch.cuda.empty_cache()
                rec["clips"].append({"id": cid, "size": size, "error": f"{type(e).__name__}: {str(e)[:200]}"})
                continue
            secs = time.time() - s
            name = cid if len(cfg.get("sizes", [640])) == 1 else f"{cid}-{size}"
            export_to_video(list(np.nan_to_num(fr)), f"{WORK}/raw/{name}.mp4", fps=16)
            r = {"id": cid, "size": size, "frames": len(fr), "steps": steps, "lora": rec["lora"], "seconds": round(secs, 1),
                 "bad_output": bool(np.isnan(fr).any() or fr.max() < 0.02),
                 "peak_vram_gb": [round(torch.cuda.max_memory_allocated(g) / 2**30, 2) for g in (0, 1)]}
            try:
                enh = enh or Enhancer("cuda:0")
                r.update(enh.process(fr, 16, f"{WORK}/clips/{name}.mp4", seconds=j.get("seconds"), fps=30, size=1080))
            except Exception as e:
                print(f"enhance failed: {e}", flush=True)
                os.replace(f"{WORK}/raw/{name}.mp4", f"{WORK}/clips/{name}.mp4")
            print(json.dumps(r), flush=True)
            rec["clips"].append(r)
    # Test only: the plain model's cost (no LoRA, CFG 3.5), timed over a few steps and extrapolated to 40.
    b = cfg.get("baseline_steps", 0)
    if b and rec["lora"] and time.time() + 15 * 60 < deadline:
        try:
            pipe.disable_lora()
            j = jobs[ids[0]]; size = cfg.get("sizes", [640])[0]
            img = load_image(f"{inp}/{j['image']}").convert("RGB").resize((size, size))
            s = time.time()
            pipe(image=img, prompt_embeds=emb[ids[0]]["pos"].to("cuda:1", torch.float16),
                 negative_prompt_embeds=emb[ids[0]]["neg"].to("cuda:1", torch.float16), height=size, width=size,
                 num_frames=cfg.get("frames", 81), num_inference_steps=b, guidance_scale=3.5, guidance_scale_2=3.5, output_type="latent")
            rec["baseline"] = {"size": size, "steps": b, "seconds": round(time.time() - s, 1),
                               "est_40_steps_min": round((time.time() - s) / b * 40 / 60, 1)}
        except Exception as e:
            rec["baseline"] = {"error": f"{type(e).__name__}: {str(e)[:200]}"}
    rec["session_part_s"] = round(time.time() - T0)
    return rec


def main():
    T0 = time.time()
    if START_BY and T0 > START_BY:
        raise SystemExit("queued past START_BY")
    hits = glob.glob("/kaggle/input/**/jobs.json", recursive=True)
    inp = os.path.dirname(hits[0])
    spec = json.load(open(f"{inp}/jobs.json"))
    if EXPECT_STAMP and spec.get("stamp") != EXPECT_STAMP:
        raise SystemExit("stale dataset")
    subprocess.run("nvidia-smi; free -g; df -h /kaggle/tmp /tmp", shell=True)
    cfg = {"quant": "Q4_K_S", "sizes": [640], "frames": 81, "steps": 4, "lora": True, "max_minutes": 80, **spec.get("hero14b", {})}
    ids = [j["id"] for j in spec["jobs"] if j.get("hero") or spec.get("hero_all")]
    rec = {"stamp": spec.get("stamp"), "model": "Wan2.2-I2V-A14B GGUF " + cfg["quant"], "cfg": cfg, **run(inp, ids, cfg)}
    rec["session_s"] = round(time.time() - T0)
    json.dump(rec, open(f"{WORK}/results.json", "w"), indent=2)
    print(json.dumps(rec, indent=2))


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "encode":
        encode(sys.argv[2], sys.argv[3].split(","))
    elif len(sys.argv) > 3 and sys.argv[1] == "run":
        r = run(sys.argv[2], sys.argv[3].split(","), json.loads(sys.argv[4]))
        json.dump(r, open(f"{WORK}/results-hero.json", "w"), indent=2)
    else:
        main()
