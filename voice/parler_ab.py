# A/B pronunciation test: Indic Parler-TTS (ai4bharat/indic-parler-tts, Apache-2.0, gated: needs HF_TOKEN) vs the
# channel's edge-tts voices, on the words the channel lives on (Shyam, Ganesh, Salasar, Barbarik, mantras).
# Whisper large-v3 (MIT) transcribes every clip; the character error rate (CER) and a per-name check decide.
#   python voice/parler_ab.py --out out      (CPU is fine: 7 short lines; .github/workflows/voice-test.yml runs it)
# Writes out/voice-ab-parler.mp3 (all edge lines, a beep, the same lines with Parler) and out/parler-ab.json.
import argparse, asyncio, json, os, re, subprocess

LINES = [
    ("shyam", "खाटू श्याम बाबा, हारे का सहारा, बाबा श्याम हमारा।", "male", ["श्याम"]),
    ("ganesh", "गणेश जी ने महाभारत लिखी, और वे एकदंत कहलाए।", "female", ["गणेश"]),
    ("salasar", "सालासर बालाजी के दरबार में भक्तों की भीड़ लगी है।", "female", ["सालासर"]),
    ("barbarik", "बर्बरीक ने श्रीकृष्ण को अपना शीश दान कर दिया।", "male", ["बर्बरीक"]),
    ("mantra-shyam", "ॐ श्री श्याम देवाय नमः।", "male", ["श्याम", "देवाय"]),
    ("mantra-ganesh", "ॐ गं गणपतये नमः।", "female", ["गणपतये"]),
    ("dadi", "हाँ बेटा! राजस्थान के चूरू ज़िले में, सालासर बालाजी धाम में।", "female", ["सालासर", "चूरू"]),
]
EDGE = {"male": ("hi-IN-MadhurNeural", "+0%", "+0Hz"), "female": ("hi-IN-SwaraNeural", "-12%", "-6Hz")}
PARLER = {"male": "Rohit speaks at a moderate pace with a warm, clear voice. The recording is very clear with no background noise.",
          "female": "Divya speaks slowly and gently in a warm, calm voice. The recording is very clear with no background noise."}
norm = lambda s: re.sub(r"[\s।,!?.\-'\"ःँं़्]+", "", s.replace("ॐ", "ओम").replace("ओम्", "ओम"))


def cer(ref, hyp):
    a, b = norm(ref), norm(hyp)
    d = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        p, d[0] = d[0], i
        for j in range(1, len(b) + 1):
            p, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] != b[j - 1]))
    return d[len(b)] / max(1, len(a))


def ff(*a):
    subprocess.run(["ffmpeg", "-v", "error", "-y", *a], check=True)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--out", default="out"); a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    import edge_tts, soundfile as sf, torch
    from transformers import AutoTokenizer, pipeline
    from parler_tts import ParlerTTSForConditionalGeneration

    async def edge_all():
        for k, text, role, _ in LINES:
            v, r, p = EDGE[role]
            await edge_tts.Communicate(text, v, rate=r, pitch=p).save(f"{a.out}/edge-{k}.mp3")
    asyncio.run(edge_all())
    for k, *_ in LINES:
        ff("-i", f"{a.out}/edge-{k}.mp3", "-ar", "24000", "-ac", "1", f"{a.out}/edge-{k}.wav")

    dev = "cuda" if torch.cuda.is_available() else "cpu"
    mid = "ai4bharat/indic-parler-tts"  # the token comes from the HF_TOKEN environment variable (never printed)
    model = ParlerTTSForConditionalGeneration.from_pretrained(mid).to(dev).eval()
    tok = AutoTokenizer.from_pretrained(mid)
    dtok = AutoTokenizer.from_pretrained(model.config.text_encoder._name_or_path)
    for k, text, role, _ in LINES:
        torch.manual_seed(7)
        d, p = dtok(PARLER[role], return_tensors="pt").to(dev), tok(text, return_tensors="pt").to(dev)
        with torch.no_grad():
            g = model.generate(input_ids=d.input_ids, attention_mask=d.attention_mask,
                               prompt_input_ids=p.input_ids, prompt_attention_mask=p.attention_mask)
        sf.write(f"{a.out}/parler-{k}.wav", g.cpu().numpy().squeeze(), model.config.sampling_rate)
        print("parler", k, flush=True)
    del model

    asr = pipeline("automatic-speech-recognition", model="openai/whisper-large-v3", device=dev,
                   torch_dtype=torch.float16 if dev == "cuda" else torch.float32)
    rows = []
    for k, text, role, names in LINES:
        for eng in ("edge", "parler"):
            hyp = asr(f"{a.out}/{eng}-{k}.wav", generate_kwargs={"language": "hi", "task": "transcribe"})["text"].strip()
            rows.append({"line": k, "engine": eng, "ref": text, "hyp": hyp, "cer": round(cer(text, hyp), 3),
                         "names_ok": all(norm(n) in norm(hyp) for n in names)})
            print(json.dumps(rows[-1], ensure_ascii=False), flush=True)
    summ = {}
    for eng in ("edge", "parler"):
        r = [x for x in rows if x["engine"] == eng]
        summ[eng] = {"mean_cer": round(sum(x["cer"] for x in r) / len(r), 3), "names_ok": sum(x["names_ok"] for x in r), "lines": len(r)}
    e, p = summ["edge"], summ["parler"]
    # "Clearly better": at least 2 CER points lower and no name the edge voice got right gone wrong.
    regress = [x["line"] for x in rows if x["engine"] == "parler" and not x["names_ok"]
               and next(y for y in rows if y["engine"] == "edge" and y["line"] == x["line"])["names_ok"]]
    verdict = "switch" if p["mean_cer"] <= e["mean_cer"] - 0.02 and not regress else "keep edge-tts"
    json.dump({"summary": summ, "name_regressions": regress, "verdict": verdict, "rows": rows}, open(f"{a.out}/parler-ab.json", "w"), ensure_ascii=False, indent=1)
    # A/B sample: every edge line, a beep, then the same lines with Parler.
    parts = [f"{a.out}/edge-{k}.wav" for k, *_ in LINES] + ["BEEP"] + [f"{a.out}/parler-{k}.wav" for k, *_ in LINES]
    ins, lab = [], []
    for i, f in enumerate(parts):
        ins += ["-f", "lavfi", "-t", "1.2", "-i", "sine=f=880:d=0.25"] if f == "BEEP" else ["-i", f]
        lab.append(f"[{i}:a]aresample=24000,aformat=sample_fmts=fltp:channel_layouts=mono,apad=pad_dur=0.5[p{i}]")
    ff(*ins, "-filter_complex", ";".join(lab) + ";" + "".join(f"[p{i}]" for i in range(len(parts))) +
       f"concat=n={len(parts)}:v=0:a=1,loudnorm=I=-16[o]", "-map", "[o]", "-b:a", "160k", f"{a.out}/voice-ab-parler.mp3")
    print(json.dumps({"summary": summ, "name_regressions": regress, "verdict": verdict}))


if __name__ == "__main__":
    main()
