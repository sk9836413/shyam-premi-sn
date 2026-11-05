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
    torch.save(emb, f"{out}/flux-emb.pt")


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
        with torch.no_grad():
            lat = pipe(prompt_embeds=pe, pooled_prompt_embeds=pooled, width=size, height=size, num_inference_steps=steps,
                       guidance_scale=0.0, max_sequence_length=256, output_type="latent",
                       generator=torch.Generator("cuda:0").manual_seed(int(j.get("seed", 42)))).images
            lat = pipe._unpack_latents(lat, size, size, pipe.vae_scale_factor).to("cuda:1", torch.float32)
            lat = lat / vae.config.scaling_factor + vae.config.shift_factor
            img = vae.decode(lat, return_dict=False)[0][0]
        if not torch.isfinite(img).all() or img.float().std() < 0.02:
            print(f"[flux] frame {j['id']} is blank/NaN: keeping the Workers-AI image", flush=True)
            continue
        arr = ((img.float().clamp(-1, 1) + 1) * 127.5).round().byte().permute(1, 2, 0).cpu().numpy()
        Image.fromarray(arr).save(f"{out}/{j['id']}.png")
        rec["frames"].append({"id": j["id"], "seconds": round(time.time() - s, 1)})
        print(f"[flux] {j['id']}: {time.time() - s:.0f}s", flush=True)
    rec["flux_s"] = round(time.time() - T0)
    json.dump(rec, open(f"{out}/flux.json", "w"), indent=2)
    print(json.dumps(rec), flush=True)


if __name__ == "__main__":
    if sys.argv[1] == "encode":
        encode(sys.argv[2], sys.argv[3])
    else:
        main(sys.argv[1], sys.argv[2], json.loads(sys.argv[3]))
