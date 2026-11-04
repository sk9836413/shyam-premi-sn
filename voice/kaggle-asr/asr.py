# Kaggle kernel (sps-tts-asr): objective A/B of the sps-tts-test voices. Whisper large-v3 transcribes every clip
# (Hindi); the character error rate against the source line shows how well each voice pronounces it.
import glob, json, re, subprocess, sys
import torch
from transformers import pipeline

LINES = [
    "खाटू श्याम बाबा, हारे का सहारा, बाबा श्याम हमारा।",
    "बर्बरीक ने श्रीकृष्ण को अपना शीश दान कर दिया।",
    "सालासर बालाजी के दरबार में भक्तों की भीड़ लगी है।",
    "ॐ श्री श्याम देवाय नमः।",
    "जय श्री श्याम! कथा अच्छी लगी हो तो लाइक, शेयर और सब्सक्राइब करें।",
]
norm = lambda s: re.sub(r"[\s।,!?.\-'\"]+", "", s).replace("ॐ", "ओम").replace("ओम्", "ओम")


def cer(ref, hyp):
    a, b = norm(ref), norm(hyp)
    d = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        p, d[0] = d[0], i
        for j in range(1, len(b) + 1):
            p, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] != b[j - 1]))
    return d[len(b)] / max(1, len(a))


asr = pipeline("automatic-speech-recognition", model="openai/whisper-large-v3", torch_dtype=torch.float16, device="cuda")
src = [p for p in glob.glob("/kaggle/input/**/*", recursive=True) if re.search(r"(edge|cb-cuda-male|cb-cuda-female|cb-cpu-male)-\d\.(mp3|wav)$", p)]
out = []
for p in sorted(src):
    i = int(re.search(r"-(\d)\.\w+$", p).group(1))
    hyp = asr(p, generate_kwargs={"language": "hi", "task": "transcribe"})["text"].strip()
    out.append({"file": p.split("/")[-1], "ref": LINES[i], "hyp": hyp, "cer": round(cer(LINES[i], hyp), 3)})
    print(json.dumps(out[-1], ensure_ascii=False), flush=True)
summary = {}
for o in out:
    k = re.sub(r"-\d\.\w+$", "", o["file"])
    summary.setdefault(k, []).append(o["cer"])
summary = {k: round(sum(v) / len(v), 3) for k, v in summary.items()}
json.dump({"summary": summary, "clips": out}, open("/kaggle/working/asr.json", "w"), ensure_ascii=False, indent=2)
print(json.dumps(summary))
