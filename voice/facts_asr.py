# Whisper transcripts of a rendered Short's narration, one per scene, for the deity-name gate of the facts Shorts
# (scripts/facts.mjs qaGate; owner rule 14 Nov 2026: never loosen the pronunciation gate).
#   python voice/facts_asr.py --spec <scenes.json> --voices <build dir with voice-<i>.wav|mp3> --out asr.json [--model large-v3]
# Whisper large-v3 through faster-whisper on the CPU (int8), the same model the human-voice A/B used (voice/human_wer.py),
# language Hindi, beam 5, no previous-text conditioning; each scene's clean voice file (no music, no ambience) is
# transcribed on its own, so a 30 s window edge never drops a name. Writes {"model", "seconds", "lines": [{"i", "heard"}]}.
import argparse
import json
import os
import time


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--spec", required=True)
    p.add_argument("--voices", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--model", default="large-v3")
    a = p.parse_args()
    from faster_whisper import WhisperModel
    spec = json.load(open(a.spec, encoding="utf-8"))
    t0 = time.time()
    m = WhisperModel(a.model, device="cpu", compute_type="int8")
    lines = []
    for i, sc in enumerate(spec["scenes"]):
        f = next((os.path.join(a.voices, f"voice-{i}.{ext}") for ext in ("wav", "mp3") if os.path.exists(os.path.join(a.voices, f"voice-{i}.{ext}"))), None)
        if not f or not (sc.get("tts") or "").strip():
            continue
        segs, _ = m.transcribe(f, language="hi", beam_size=5, condition_on_previous_text=False, temperature=0)
        heard = " ".join(s.text.strip() for s in segs)
        lines.append({"i": i, "heard": heard})
        print(f"scene {i + 1}: {heard}", flush=True)
    json.dump({"model": f"faster-whisper {a.model} int8", "seconds": round(time.time() - t0), "lines": lines},
              open(a.out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
