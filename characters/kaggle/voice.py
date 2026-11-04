# Kaggle GPU kernel (sps-char-voice): natural-voice test for the character pilots. Never holds a secret.
# Stages (each in its own uv venv so their pinned dependencies never clash; one failing stage never stops the rest):
#   1. parler  : Parler-TTS mini v1 (Apache-2.0) makes model-generated English reference voices for Max and Riya.
#   2. cbx     : Chatterbox Multilingual v3 (MIT) speaks every pilot line.
#                Hindi refs: (own) Chatterbox's built-in voice, pitch/tempo-shifted per character; (edge) our edge-tts clips.
#                English refs: (parler) stage 1 voices; (edge) our edge-tts clips.
#   3. dia     : Dia 1.6B (Apache-2.0) two-speaker English sample (first 3 lines), A/B only.
#   4. check   : Whisper large-v3-turbo transcript (CER/WER vs script) + UTMOS22 naturalness score per file.
# Input: dataset with voice_jobs.json + edge/<pilot>/*.wav. Output: /kaggle/working/voice/... + voice_results.json
import glob, json, os, subprocess, sys, time

SPS_CHAR_VOICE_KERNEL = True
STAGES = ["parler", "cbx", "dia", "check"]  # push may narrow this
WORK = "/kaggle/working"
TMP = "/kaggle/tmp" if os.path.isdir("/kaggle/tmp") else "/tmp"
os.environ.setdefault("HF_HOME", f"{TMP}/hf")
OUT = f"{WORK}/voice"
RES = {"stages": {}}


def sh(cmd, check=True):
    print("+", cmd, flush=True)
    return subprocess.run(cmd, shell=True, check=check)


def venv(name, pkgs):
    d = f"{TMP}/venv-{name}"
    if not os.path.exists(f"{d}/bin/python"):
        sh(f"uv venv -q -p 3.11 {d}")
    sh(f"uv pip install -q -p {d}/bin/python {pkgs}")
    return f"{d}/bin/python"


def stage(name, pkgs, code, inp):
    if name not in STAGES:
        return
    s = time.time()
    try:
        py = venv(name, pkgs)
        t_install = time.time() - s
        f = f"{TMP}/stage_{name}.py"
        open(f, "w").write(code)
        g = time.time()
        sh(f"{py} {f} {inp} {OUT}")
        RES["stages"][name] = {"ok": True, "install_s": round(t_install), "run_s": round(time.time() - g)}
    except Exception as e:
        RES["stages"][name] = {"ok": False, "error": str(e)[:300], "s": round(time.time() - s)}
    print(name, RES["stages"][name], flush=True)
    json.dump(RES, open(f"{WORK}/voice_results.json", "w"), indent=2)


PARLER = r'''
import json, sys, time, torch, soundfile as sf
from parler_tts import ParlerTTSForConditionalGeneration
from transformers import AutoTokenizer
inp, out = sys.argv[1], sys.argv[2]
jobs = json.load(open(f"{inp}/voice_jobs.json"))
mid = "parler-tts/parler-tts-mini-v1"
m = ParlerTTSForConditionalGeneration.from_pretrained(mid).to("cuda")
tok = AutoTokenizer.from_pretrained(mid)
import os; os.makedirs(f"{out}/refs", exist_ok=True)
log = {}
for who, r in jobs["parler_refs"].items():
    torch.manual_seed(r["seed"])
    d = tok(r["description"], return_tensors="pt").to("cuda"); p = tok(r["text"], return_tensors="pt").to("cuda")
    s = time.time()
    g = m.generate(input_ids=d.input_ids, attention_mask=d.attention_mask, prompt_input_ids=p.input_ids, prompt_attention_mask=p.attention_mask)
    a = g.cpu().numpy().squeeze()
    sf.write(f"{out}/refs/parler-{who}.wav", a, m.config.sampling_rate)
    log[who] = {"gen_s": round(time.time() - s, 1), "audio_s": round(len(a) / m.config.sampling_rate, 1)}
    print(who, log[who], flush=True)
json.dump(log, open(f"{out}/refs/parler_log.json", "w"))
'''

CBX = r'''
import json, os, sys, time, inspect, numpy as np, torch, librosa, soundfile as sf
from chatterbox.mtl_tts import ChatterboxMultilingualTTS
inp, out = sys.argv[1], sys.argv[2]
jobs = json.load(open(f"{inp}/voice_jobs.json"))
m = ChatterboxMultilingualTTS.from_pretrained(device="cuda", t3_model="v3")
SR = m.sr
print("generate signature:", inspect.signature(m.generate), flush=True)
os.makedirs(f"{out}/refs", exist_ok=True)

def gen(text, lang, ref, ex, cfg, seed, temp=0.8):
    torch.manual_seed(seed); np.random.seed(seed)
    kw = dict(language_id=lang, exaggeration=ex, cfg_weight=cfg)
    if "temperature" in inspect.signature(m.generate).parameters: kw["temperature"] = temp
    if ref: kw["audio_prompt_path"] = ref
    w = m.generate(text, **kw)
    return w.squeeze().detach().cpu().numpy()

# Hindi "own" refs: the model's built-in voice, shifted per character (no outside voice is cloned).
base = gen(jobs["own_ref_text_hi"], "hi", None, 0.5, 0.5, 11)
sf.write(f"{out}/refs/own-base-hi.wav", base, SR)
for who, fx in jobs["own_ref_fx"].items():
    y = librosa.effects.pitch_shift(base, sr=SR, n_steps=fx["semitones"])
    if fx.get("tempo", 1.0) != 1.0:
        y = librosa.effects.time_stretch(y, rate=fx["tempo"])
    sf.write(f"{out}/refs/own-{who}.wav", y, SR)

log = []
for v in jobs["variants"]:
    pilot = v["pilot"]
    d = f"{out}/{pilot}/{v['name']}"; os.makedirs(d, exist_ok=True)
    for i, l in enumerate(jobs["pilots"][pilot]["lines"]):
        ref = v["refs"][l["who"]].replace("{inp}", inp).replace("{out}", out)
        p = v["params"][l["who"]]
        s = time.time()
        try:
            a = gen(l["tts"], jobs["pilots"][pilot]["lang"], ref, p["ex"], p["cfg"], 100 + i, p.get("temp", 0.8))
        except Exception as e:
            print("FAIL", pilot, v["name"], i, e, flush=True); continue
        torch.cuda.synchronize()
        f = f"{d}/{i:02d}-{l['who']}.wav"
        sf.write(f, a, SR)
        rec = {"file": os.path.relpath(f, out), "gen_s": round(time.time() - s, 2), "audio_s": round(len(a) / SR, 2)}
        log.append(rec); print(rec, flush=True)
json.dump(log, open(f"{out}/cbx_log.json", "w"), indent=1)
'''

DIA = r'''
import json, os, sys, time, numpy as np, torch
from dia.model import Dia
inp, out = sys.argv[1], sys.argv[2]
jobs = json.load(open(f"{inp}/voice_jobs.json"))
os.makedirs(f"{out}/dia", exist_ok=True)
m = Dia.from_pretrained("nari-labs/Dia-1.6B-0626", compute_dtype="float16")
log = []
for k, text in enumerate(jobs["dia_texts"]):
    for seed in (7, 21):
        torch.manual_seed(seed); np.random.seed(seed)
        s = time.time()
        a = m.generate(text, use_torch_compile=False, verbose=False, cfg_scale=3.0, temperature=1.8, top_p=0.90, cfg_filter_top_k=50)
        f = f"{out}/dia/dia-{k}-seed{seed}.wav"
        m.save_audio(f, a)
        rec = {"file": os.path.relpath(f, out), "gen_s": round(time.time() - s, 1), "audio_s": round(len(a) / 44100, 1)}
        log.append(rec); print(rec, flush=True)
json.dump(log, open(f"{out}/dia_log.json", "w"))
'''

CHECK = r'''
import glob, json, os, re, sys, unicodedata, torch, librosa
from transformers import pipeline
inp, out = sys.argv[1], sys.argv[2]
jobs = json.load(open(f"{inp}/voice_jobs.json"))
asr = pipeline("automatic-speech-recognition", model="openai/whisper-large-v3-turbo", torch_dtype=torch.float16, device=0)
try:
    mos = torch.hub.load("tarepan/SpeechMOS:v1.2.0", "utmos22_strong", trust_repo=True).cuda().eval()
except Exception as e:
    print("utmos unavailable", e); mos = None

def norm(s):
    s = unicodedata.normalize("NFC", s.lower())
    s = re.sub(r"[^\w\s]", " ", s)
    return re.sub(r"\s+", " ", s).strip()

def ed(a, b):
    prev = list(range(len(b) + 1))
    for i, x in enumerate(a, 1):
        cur = [i]
        for j, y in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x != y)))
        prev = cur
    return prev[-1]

files = []
for pilot, p in jobs["pilots"].items():
    for f in sorted(glob.glob(f"{out}/{pilot}/*/*.wav")) + sorted(glob.glob(f"{inp}/edge/{pilot}/[0-9]*.wav")):
        i = int(os.path.basename(f)[:2]); files.append((pilot, f, p["lines"][i]["tts"], p["lang"]))
res = []
for pilot, f, ref, lang in files:
    y, sr = librosa.load(f, sr=16000)
    t = asr({"raw": y, "sampling_rate": 16000}, generate_kwargs={"language": "hindi" if lang == "hi" else "english", "task": "transcribe"})["text"]
    a, b = norm(ref), norm(t)
    cer = ed(a, b) / max(1, len(a))
    score = None
    if mos is not None:
        with torch.no_grad():
            score = float(mos(torch.from_numpy(y).unsqueeze(0).cuda(), 16000).item())
    r = {"pilot": pilot, "file": f.replace(out + "/", "").replace(inp + "/", "input/"), "cer": round(cer, 3), "utmos": None if score is None else round(score, 2), "heard": t}
    res.append(r); print(r, flush=True)
for f in sorted(glob.glob(f"{out}/dia/*.wav")):
    y, sr = librosa.load(f, sr=16000)
    score = None
    if mos is not None:
        with torch.no_grad():
            score = float(mos(torch.from_numpy(y).unsqueeze(0).cuda(), 16000).item())
    t = asr({"raw": y, "sampling_rate": 16000}, generate_kwargs={"language": "english"}, return_timestamps=True)["text"]
    res.append({"pilot": "dia", "file": f.replace(out + "/", ""), "utmos": score, "heard": t})
json.dump(res, open(f"{out}/check.json", "w"), indent=1, ensure_ascii=False)
'''


def main():
    T0 = time.time()
    src = os.path.dirname(glob.glob("/kaggle/input/**/voice_jobs.json", recursive=True)[0])
    inp = f"{TMP}/inp"  # normalised copy: voice_jobs.json + edge/<pilot>/*.wav (however Kaggle unpacked the folders)
    os.makedirs(inp, exist_ok=True)
    sh(f"cp {src}/voice_jobs.json {inp}/")
    for w in glob.glob("/kaggle/input/**/*.wav", recursive=True):
        pilot = "shyam" if "/shyam/" in w else "epifive" if "/epifive/" in w else None
        if pilot:
            os.makedirs(f"{inp}/edge/{pilot}", exist_ok=True)
            sh(f"cp '{w}' {inp}/edge/{pilot}/", check=False)
    for z in glob.glob("/kaggle/input/**/edge.zip", recursive=True):
        sh(f"cd {inp} && unzip -o -q '{z}'", check=False)
    sh(f"ls -R {inp} | head -40", check=False)
    os.makedirs(OUT, exist_ok=True)
    sh("nvidia-smi --query-gpu=name,memory.total --format=csv", check=False)
    sh(f"{sys.executable} -m pip install -q uv")
    stage("parler", "git+https://github.com/huggingface/parler-tts.git soundfile", PARLER, inp)
    stage("cbx", "git+https://github.com/resemble-ai/chatterbox.git librosa soundfile", CBX, inp)
    stage("dia", "git+https://github.com/nari-labs/dia.git soundfile", DIA, inp)
    stage("check", "torch torchaudio transformers accelerate librosa soundfile", CHECK, inp)
    RES["session_s"] = round(time.time() - T0)
    json.dump(RES, open(f"{WORK}/voice_results.json", "w"), indent=2)
    print(json.dumps(RES, indent=2))


if __name__ == "__main__":
    main()
