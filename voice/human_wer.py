# Whisper check for the human-voice A/B (voice/human_ab.py): transcribes old.mp3, new.mp3 and
# old-chain-new-script.mp3 (the full mixes, ambience included) with Whisper large-v3 (faster-whisper, CPU int8) and
# scores each against its own script: WER and CER after Hindi normalisation (punctuation, nukta, chandrabindu).
#   python voice/human_wer.py --dir DIR [--model large-v3]   -> DIR/wer.json + a Markdown table on stdout
import argparse
import json
import re
import unicodedata


def norm(t):
    t = unicodedata.normalize("NFD", t)
    t = t.replace("\u093c", "").replace("\u0901", "\u0902").replace("\u200c", "").replace("\u200d", "")
    t = re.sub(r"[।॥!?,.…\"'“”‘’:;()\-–—]", " ", t)
    return re.sub(r"\s+", " ", t).strip().lower()


def dist(a, b):
    d = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        prev, d[0] = d[0], i
        for j in range(1, len(b) + 1):
            cur = min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] != b[j - 1]))
            prev, d[j] = d[j], cur
    return d[len(b)]


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--dir", required=True)
    p.add_argument("--model", default="large-v3")
    a = p.parse_args()
    from faster_whisper import WhisperModel
    refs = json.load(open(f"{a.dir}/refs.json", encoding="utf-8"))["refs"]
    m = WhisperModel(a.model, device="cpu", compute_type="int8")
    rows = {}
    for name, ref in refs.items():
        segs, _ = m.transcribe(f"{a.dir}/{name}.mp3", language="hi", beam_size=5, condition_on_previous_text=False)
        hyp = " ".join(s.text.strip() for s in segs)
        r, h = norm(ref), norm(hyp)
        rows[name] = {"wer": round(dist(r.split(), h.split()) / max(1, len(r.split())), 4),
                      "cer": round(dist(r.replace(" ", ""), h.replace(" ", "")) / max(1, len(r.replace(" ", ""))), 4),
                      "ref": ref, "hyp": hyp}
        print(f"{name}: WER {rows[name]['wer']:.3f} CER {rows[name]['cer']:.3f}\n  heard: {hyp}", flush=True)
    json.dump({"model": a.model, "rows": rows}, open(f"{a.dir}/wer.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("\n| File | WER | CER | Whisper heard |\n|---|---|---|---|")
    for k, v in rows.items():
        print(f"| {k} | {v['wer']:.3f} | {v['cer']:.3f} | {v['hyp']} |")


if __name__ == "__main__":
    main()
