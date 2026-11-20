# Start frames for the animated scenes, made on the Kaggle GPU instead of Cloudflare Workers AI (run by animate.py when
# jobs.json settings.flux is on): FLUX.1-schnell (Apache-2.0) at a higher resolution and more steps than Workers AI
# allows, with a fixed seed. NOT FLUX.1-dev (non-commercial licence).
#   transformer: city96/FLUX.1-schnell-gguf Q6_K (Apache-2.0; 6-bit k-quant, 9.8 GB: Q8_0's 12.7 GB plus activations
#                did not fit a 15 GB T4 in the 5 Nov test)
#   text encoders, VAE, tokenizers, configs: lzyvegetable/FLUX.1-schnell, an un-gated Apache-2.0 copy of
#   black-forest-labs/FLUX.1-schnell (the original repo is gated, and the kernel holds no Hugging Face token).
# T5-XXL runs in fp32 split over both T4s (fp16 T5 overflows), the transformer computes in fp16 on GPU 0 and the VAE
# decodes in fp32 on GPU 1. Any failure leaves no frames: animate.py then uses the dataset's Workers-AI images.
#   python flux_frames.py <input_dir> <out_dir> <cfg_json>   -> <out_dir>/<id>.png + flux.json (timings)
import json, os, sys, time

MIRROR = "lzyvegetable/FLUX.1-schnell"
GGUF = ("city96/FLUX.1-schnell-gguf", "flux1-schnell-Q6_K.gguf")


def encode(inp, out):
    """CLIP-L + T5-XXL (fp32 over both GPUs) in their own process: the GPUs are fully free when it exits."""
    import torch
    from diffusers import FluxPipeline
    from transformers import CLIPTextModel, T5EncoderModel
    jobs = [j for j in json.load(open(f"{inp}/jobs.json"))["jobs"] if j.get("flux_prompt")]
    clip = CLIPTextModel.from_pretrained(MIRROR, subfolder="text_encoder", torch_dtype=torch.float16).to("cuda:0")
    t5 = T5EncoderModel.from_pretrained(MIRROR, subfolder="text_encoder_2", torch_dtype=torch.float32, device_map="balanced")
    tp = FluxPipeline.from_pretrained(MIRROR, transformer=None, vae=None, text_encoder=clip, text_encoder_2=t5, torch_dtype=torch.float16)
    emb = {}
    with torch.no_grad():
        for j in jobs:
            pe, pooled, _ = tp.encode_prompt(prompt=j["flux_prompt"], prompt_2=None, device=torch.device("cuda:0"), max_sequence_length=256)
            assert torch.isfinite(pe).all() and torch.isfinite(pooled).all(), "text encoder produced NaN/inf"
            emb[j["id"]] = (pe.float().clamp(-65000, 65000).half().cpu(), pooled.half().cpu())
            if j.get("negative"):  # optional negative prompt (true CFG, cfg "true_cfg" > 1; Kailash Parivar cast/frames)
                ne, npooled, _ = tp.encode_prompt(prompt=j["negative"], prompt_2=None, device=torch.device("cuda:0"), max_sequence_length=256)
                emb[j["id"] + "__neg"] = (ne.float().clamp(-65000, 65000).half().cpu(), npooled.half().cpu())
    torch.save(emb, f"{out}/flux-emb.pt")


def reference_latents(pipe, vae, file, w, h, focus=None):
    """Packed FLUX latents (cuda:0, fp16) of a reference picture, cover-cropped to w x h around `focus` [x, y] (0-1)."""
    import numpy as np
    import torch
    from PIL import Image
    im = Image.open(file).convert("RGB")
    k = max(w / im.width, h / im.height)
    im = im.resize((max(w, round(im.width * k)), max(h, round(im.height * k))), Image.LANCZOS)
    fx, fy = (focus or [0.5, 0.5])[:2]
    x = min(max(0, round(fx * im.width - w / 2)), im.width - w)
    y = min(max(0, round(fy * im.height - h / 2)), im.height - h)
    im = im.crop((x, y, x + w, y + h))
    t = torch.from_numpy(np.asarray(im).astype("float32") / 127.5 - 1.0).permute(2, 0, 1)[None].to("cuda:1")
    with torch.no_grad():
        lat = vae.encode(t).latent_dist.mode()
    lat = ((lat - vae.config.shift_factor) * vae.config.scaling_factor).to("cuda:0", torch.float16)
    return pipe._pack_latents(lat, 1, lat.shape[1], lat.shape[2], lat.shape[3])


def main(inp, out, cfg):
    import torch
    from huggingface_hub import hf_hub_download, snapshot_download
    T0 = time.time()
    os.makedirs(out, exist_ok=True)
    jobs = [j for j in json.load(open(f"{inp}/jobs.json"))["jobs"] if j.get("flux_prompt")]
    size, steps = int(cfg.get("size", 1024)), int(cfg.get("steps", 8))
    rec = {"size": size, "steps": steps, "frames": []}
    s = time.time()
    snapshot_download(MIRROR, allow_patterns=["model_index.json", "scheduler/*", "tokenizer/*", "tokenizer_2/*", "text_encoder/*",
                                              "text_encoder_2/*", "vae/*", "transformer/config.json"])
    gguf = hf_hub_download(*GGUF)
    rec["download_s"] = round(time.time() - s)

    import subprocess
    s = time.time()
    subprocess.run([sys.executable, os.path.abspath(__file__), "encode", inp, out], check=True)
    emb = {k: (a.to("cuda:0"), b.to("cuda:0")) for k, (a, b) in torch.load(f"{out}/flux-emb.pt").items()}
    os.remove(f"{out}/flux-emb.pt")
    rec["text_s"] = round(time.time() - s)
    from diffusers import AutoencoderKL, FluxPipeline, FluxTransformer2DModel, GGUFQuantizationConfig

    s = time.time()
    tr = FluxTransformer2DModel.from_single_file(gguf, quantization_config=GGUFQuantizationConfig(compute_dtype=torch.float16),
                                                 config=MIRROR, subfolder="transformer", torch_dtype=torch.float16)
    pipe = FluxPipeline.from_pretrained(MIRROR, transformer=tr, vae=None, text_encoder=None, text_encoder_2=None,
                                        tokenizer=None, tokenizer_2=None, torch_dtype=torch.float16)
    pipe.transformer.to("cuda:0")
    vae = AutoencoderKL.from_pretrained(MIRROR, subfolder="vae", torch_dtype=torch.float32).to("cuda:1")
    rec["load_s"] = round(time.time() - s)
    from PIL import Image
    for j in jobs:
        s = time.time()
        pe, pooled = emb[j["id"]]
        w, h = int(j.get("w", size)), int(j.get("h", size))  # per-job size (vertical movie frames 576x1024), else square
        # True CFG with a negative prompt only when the job has one and cfg true_cfg > 1 (twice the transformer time);
        # every other caller is unchanged (guidance 0, no negative).
        neg = emb.get(j["id"] + "__neg") if float(cfg.get("true_cfg", 1) or 1) > 1 else None
        extra = {"negative_prompt_embeds": neg[0], "negative_pooled_prompt_embeds": neg[1], "true_cfg_scale": float(cfg["true_cfg"])} if neg else {}
        # Reference image (img2img; Shyam Baba's real darshan still, animate/frames.mjs with SPS_SHYAM_REF=1): the job's
        # `init_image` is VAE-encoded and noised to `strength`, and FLUX.1-schnell (Apache-2.0) denoises only the last
        # part of the schedule, so the picture keeps the real roop's layout and colours. Any failure = text-only, as before.
        n_steps = steps
        if j.get("init_image"):
            try:
                ref = reference_latents(pipe, vae, os.path.join(inp, j["init_image"]), w, h, j.get("ref_focus"))
                sig = [1.0 - k * (1.0 - 1.0 / steps) / max(1, steps - 1) for k in range(steps)]  # = np.linspace(1, 1/steps, steps)
                start = min(steps - 1, int(round(steps * (1.0 - float(j.get("strength", 0.6))))))
                sig = sig[start:]
                noise = torch.randn(ref.shape, generator=torch.Generator("cuda:0").manual_seed(int(j.get("seed", 42))), device="cuda:0", dtype=ref.dtype)
                extra = {**extra, "latents": sig[0] * noise + (1.0 - sig[0]) * ref, "sigmas": sig}
                n_steps = len(sig)
                print(f"[flux] {j['id']}: reference {j['init_image']} strength {j.get('strength', 0.6)} ({n_steps} of {steps} steps)", flush=True)
            except Exception as e:  # noqa: BLE001
                print(f"[flux] {j['id']}: reference image failed ({e}); text-only", flush=True)
                extra.pop("latents", None); extra.pop("sigmas", None); n_steps = steps
        with torch.no_grad():
            lat = pipe(prompt_embeds=pe, pooled_prompt_embeds=pooled, width=w, height=h, num_inference_steps=n_steps, **extra,
                       guidance_scale=0.0, max_sequence_length=256, output_type="latent",
                       generator=torch.Generator("cuda:0").manual_seed(int(j.get("seed", 42)))).images
            lat = pipe._unpack_latents(lat, h, w, pipe.vae_scale_factor).to("cuda:1", torch.float32)
            lat = lat / vae.config.scaling_factor + vae.config.shift_factor
            img = vae.decode(lat, return_dict=False)[0][0]
        if not torch.isfinite(img).all() or img.float().std() < 0.02:
            print(f"[flux] frame {j['id']} is blank/NaN: keeping the Workers-AI image", flush=True)
            continue
        arr = ((img.float().clamp(-1, 1) + 1) * 127.5).round().byte().permute(1, 2, 0).cpu().numpy()
        Image.fromarray(arr).save(f"{out}/{j['id']}.png")
        rec["frames"].append({"id": j["id"], "seconds": round(time.time() - s, 1), **({"true_cfg": extra["true_cfg_scale"]} if extra else {})})
        print(f"[flux] {j['id']}: {time.time() - s:.0f}s", flush=True)
    rec["flux_s"] = round(time.time() - T0)
    json.dump(rec, open(f"{out}/flux.json", "w"), indent=2)
    print(json.dumps(rec), flush=True)


if __name__ == "__main__":
    if sys.argv[1] == "encode":
        encode(sys.argv[2], sys.argv[3])
    else:
        main(sys.argv[1], sys.argv[2], json.loads(sys.argv[3]))
