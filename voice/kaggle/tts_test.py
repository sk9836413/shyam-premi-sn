# Kaggle test kernel (sps-tts-test): Chatterbox Multilingual v3 Hindi quality + speed, GPU and CPU.
# Reference voices are model-generated (Kokoro-82M, Apache-2.0: hm_omega male, hf_alpha female), never a real person.
import json, os, subprocess, sys, time, urllib.request

W = "/kaggle/working"
LINES = [
    "खाटू श्याम बाबा, हारे का सहारा, बाबा श्याम हमारा।",
    "बर्बरीक ने श्रीकृष्ण को अपना शीश दान कर दिया।",
    "सालासर बालाजी के दरबार में भक्तों की भीड़ लगी है।",
    "ॐ श्री श्याम देवाय नमः।",
    "जय श्री श्याम! कथा अच्छी लगी हो तो लाइक, शेयर और सब्सक्राइब करें।",
]
REF = {
    "male": ("hm_omega", "श्याम बाबा के दरबार में आज बड़ी शांति है। दीपक जल रहे हैं, और भक्त प्रेम से भजन गा रहे हैं।"),
    "female": ("hf_alpha", "माँ के दरबार में आज बड़ी शांति है। दीपक जल रहे हैं, और भक्त प्रेम से आरती गा रहे हैं।"),
}


def sh(cmd):
    print("+", cmd, flush=True)
    return subprocess.run(cmd, shell=True).returncode


def main():
    res = {}
    t = time.time()
    sh(f"{sys.executable} -m pip install -q --no-deps git+https://github.com/resemble-ai/chatterbox.git")
    sh(f"{sys.executable} -m pip install -q librosa==0.11.0 s3tokenizer conformer==0.3.2 pyloudnorm omegaconf pykakasi==2.3.0 "
       f"'git+https://github.com/resemble-ai/Perth.git@master' kokoro-onnx==0.6.1 soundfile edge-tts")
    res["install_s"] = round(time.time() - t)
    # Reference voices from Kokoro (model voices, Apache-2.0).
    base = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0"
    for f in ("kokoro-v1.0.onnx", "voices-v1.0.bin"):
        urllib.request.urlretrieve(f"{base}/{f}", f"/tmp/{f}")
    import soundfile as sf
    from kokoro_onnx import Kokoro
    k = Kokoro("/tmp/kokoro-v1.0.onnx", "/tmp/voices-v1.0.bin")
    for name, (voice, text) in REF.items():
        s, r = k.create(text, voice=voice, speed=0.9, lang="hi")
        sf.write(f"{W}/ref-{name}.wav", s, r)
    # edge-tts for the A/B (same lines).
    for i, line in enumerate(LINES):
        sh(f"{sys.executable} -m edge_tts --voice hi-IN-MadhurNeural --rate=+0% --text '{line}' --write-media {W}/edge-{i}.mp3")
    import torch, torchaudio
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    print("cpu cores", os.cpu_count(), "torch", torch.__version__, flush=True)
    for device in ["cuda", "cpu"]:
        if device == "cuda" and not torch.cuda.is_available():
            continue
        if device == "cpu":
            torch.set_num_threads(4)  # like a GitHub Actions ubuntu-latest runner (4 vCPU)
        t = time.time()
        m = ChatterboxMultilingualTTS.from_pretrained(device=device, t3_model="v3")
        load = time.time() - t
        m.prepare_conditionals(f"{W}/ref-male.wav", exaggeration=0.4)
        out = []
        lines = LINES if device == "cuda" else LINES[:2]
        for i, line in enumerate(lines):
            torch.manual_seed(1234)
            t = time.time()
            wav = m.generate(line, language_id="hi", exaggeration=0.4, cfg_weight=0.5, temperature=0.7)
            gen = time.time() - t
            secs = wav.shape[-1] / m.sr
            torchaudio.save(f"{W}/cb-{device}-male-{i}.wav", wav, m.sr)
            out.append({"line": i, "audio_s": round(secs, 2), "gen_s": round(gen, 1), "rtf": round(gen / secs, 2)})
            print(device, out[-1], flush=True)
        if device == "cuda":
            m.prepare_conditionals(f"{W}/ref-female.wav", exaggeration=0.4)
            torch.manual_seed(1234)
            torchaudio.save(f"{W}/cb-cuda-female-0.wav", m.generate(LINES[0], language_id="hi", exaggeration=0.4, cfg_weight=0.5, temperature=0.7), m.sr)
        res[device] = {"load_s": round(load), "lines": out}
        del m
        if device == "cuda":
            torch.cuda.empty_cache()
    json.dump(res, open(f"{W}/tts-results.json", "w"), indent=2)
    print(json.dumps(res, indent=2))


main()
