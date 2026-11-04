# Narration with Chatterbox Multilingual v3 (Resemble AI, MIT licence), Hindi. Runs on a Kaggle GPU inside the
# animate/TTS kernel; the renderers fall back to edge-tts when its output is missing.
#   python chatterbox_tts.py <lines.json> <out_dir> [--device cuda]
# lines.json: {"refs": {"hm_omega": "ref-male.wav", "hf_alpha": "ref-female.wav"},
#              "lines": [{"i": 0, "text": "<Devanagari>", "voice": "hm_omega"}, ...]}  (paths relative to lines.json)
# Writes voice-<i>.wav per line and voice.json {"engine", "lines": [{"i", "seconds", "ok"}], "gen_s"}.
# One fixed narrator: the reference clips are model-generated speech (Kokoro-82M, Apache-2.0 voices hm_omega and
# hf_alpha), never a real person; fixed seed and settings, so the voice sounds the same every day.
# Chatterbox adds Resemble's inaudible PerTh watermark to every clip; it is left in on purpose.
import json, os, re, sys, time

SEED, EXAGGERATION, CFG, TEMPERATURE = 1234, 0.4, 0.5, 0.7


def normalise(text):
    # The tokenizer drops "ॐ" (the 4 Nov test lost it in a mantra): spell it out. Danda/visarga are kept.
    text = text.replace("ॐ", "ओम्")
    return re.sub(r"\s+", " ", text).strip()


def plausible(text, seconds):
    # Hindi narration runs ~8-20 characters a second; outside that the model skipped or babbled.
    n = len(re.sub(r"[\s।,!?.\-]", "", text))
    return n / 22 <= seconds <= max(1.5, n / 6)


def main():
    import torch, torchaudio
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    spec_file, out = sys.argv[1], sys.argv[2]
    device = sys.argv[sys.argv.index("--device") + 1] if "--device" in sys.argv else ("cuda" if torch.cuda.is_available() else "cpu")
    base = os.path.dirname(os.path.abspath(spec_file))
    spec = json.load(open(spec_file, encoding="utf-8"))
    os.makedirs(out, exist_ok=True)
    t0 = time.time()
    model = ChatterboxMultilingualTTS.from_pretrained(device=device, t3_model="v3")
    load_s = time.time() - t0
    result, current = [], None
    for line in spec["lines"]:
        ref = os.path.join(base, spec["refs"].get(line.get("voice") or "hm_omega", spec["refs"]["hm_omega"]))
        if ref != current:
            model.prepare_conditionals(ref, exaggeration=EXAGGERATION)
            current = ref
        text, rec = normalise(line["text"]), {"i": line["i"], "ok": False}
        for attempt in range(3):
            torch.manual_seed(SEED + attempt)
            try:
                wav = model.generate(text, language_id="hi", exaggeration=EXAGGERATION, cfg_weight=CFG, temperature=TEMPERATURE)
            except Exception as e:  # one bad line must not lose the others
                rec["error"] = str(e)[:200]
                continue
            seconds = wav.shape[-1] / model.sr
            rec.update(seconds=round(seconds, 3), attempt=attempt)
            if plausible(text, seconds):
                torchaudio.save(os.path.join(out, f"voice-{line['i']}.wav"), wav, model.sr)
                rec["ok"] = True
                break
        result.append(rec)
        print(json.dumps(rec), flush=True)
    summary = {"engine": "chatterbox-mtl-v3", "device": device, "load_s": round(load_s, 1),
               "gen_s": round(time.time() - t0 - load_s, 1), "lines": result}
    json.dump(summary, open(os.path.join(out, "voice.json"), "w"), indent=2)
    print(json.dumps({k: v for k, v in summary.items() if k != "lines"}), flush=True)


if __name__ == "__main__":
    main()
