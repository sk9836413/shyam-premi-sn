# A/B for the human-voice chain (voice/humanize.py, 10 Nov 2026): the same Khatu Shyam ji idea twice, as a ~35 s
# morning-Short soundtrack (story/render-story.mjs timing + its temple ambience bed, sidechain ducking, -14 LUFS):
#   old.mp3  the old way: a bookish, Sanskritized script, one edge-tts request per scene at --rate=+0%
#   new.mp3  the new way: a conversational script (STORY.md "Spoken style"), sentence-by-sentence prosody, pauses,
#            breaths, EQ / de-ess / compression / small room (humanize.py)
#   old-chain-new-script.mp3   the new script through the old chain (isolates the chain's effect on pronunciation)
# plus refs.json (the reference texts for the Whisper WER check in .github/workflows/voice-human-ab.yml).
#   python -I voice/human_ab.py --out DIR
import argparse
import asyncio
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import humanize as H  # noqa: E402

FF = H.FF
OLD = [  # bookish: long Sanskritized sentences (how the Shorts read before)
    "खाटू श्याम जी महाभारत काल में घटोत्कच के पुत्र बर्बरीक के रूप में अवतरित हुए थे।",
    "बर्बरीक ने कठोर तपस्या द्वारा तीन अमोघ बाण प्राप्त किए, जिनसे संपूर्ण युद्ध क्षणभर में समाप्त हो सकता था।",
    "युद्ध से पूर्व श्री कृष्ण ने ब्राह्मण वेश में बर्बरीक से शीश का दान माँगा, जिसे उन्होंने निःसंकोच समर्पित कर दिया।",
    "प्रसन्न होकर श्री कृष्ण ने उन्हें कलियुग में श्याम नाम से पूजे जाने का वरदान दिया।",
    "जय श्री श्याम! कथा अच्छी लगी हो तो लाइक, शेयर और सब्सक्राइब करें।",
]
NEW = [  # conversational: short spoken sentences, a question, pauses marked with commas and "…"
    ("खाटू श्याम जी… हारे का सहारा। पर क्या आप जानते हैं, वो पहले कौन थे?", None),
    ("वो थे बर्बरीक, घटोत्कच के बेटे। तपस्या से मिले तीन बाण। सोचो… सिर्फ़ तीन बाण, और पूरा युद्ध खत्म!", None),
    ("फिर युद्ध से पहले, श्री कृष्ण ब्राह्मण बनकर आए। और माँग लिया… उनका शीश।", "serious"),
    ("बर्बरीक ने एक पल नहीं सोचा। हँसते-हँसते शीश दान कर दिया।", "emotional"),
    ("तभी तो कृष्ण ने वरदान दिया, कलियुग में तुम श्याम नाम से पूजे जाओगे!", None),
    ("अच्छा लगा हो तो लाइक, शेयर, सब्सक्राइब करना। जय खाटू श्याम!", None),
]
FADE, VOICE_START, PAD = 0.4, 0.12, 0.7  # story/render-story.mjs
VOICE = "hi-IN-MadhurNeural"


def ff(*a):
    r = subprocess.run([FF, "-v", "error", "-y", *a], capture_output=True, text=True)
    if r.returncode:
        raise SystemExit(r.stderr[-1500:])


def dur(p):
    probe = os.path.join(os.path.dirname(FF), os.path.basename(FF).replace("ffmpeg", "ffprobe"))
    r = subprocess.run([probe, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p],
                       capture_output=True, text=True)
    return float(r.stdout.strip())


def old_lines(texts, out):
    async def go():
        import edge_tts
        for i, t in enumerate(texts):
            for attempt in range(6):  # the free endpoint sometimes answers NoAudioReceived / 503
                try:
                    await edge_tts.Communicate(t, VOICE, rate="+0%").save(f"{out}/old-{i}.mp3")
                    break
                except Exception as e:  # noqa: BLE001
                    print(f"edge-tts retry {attempt} {type(e).__name__}", file=sys.stderr, flush=True)
                    await asyncio.sleep(3 * (attempt + 1))
            else:
                raise SystemExit(f"edge-tts failed: {t[:40]}")
    asyncio.run(go())
    return [{"file": f"{out}/old-{i}.mp3", "speech": dur(f"{out}/old-{i}.mp3"), "lead": 0.0} for i in range(len(texts))]


def new_lines(items, out):
    lead = 0.3  # scenes after the first may open with a breath (render-story places the voice 0.3 s earlier)
    res = H.render([{"text": t, "voice": {"edge": VOICE}, "mood": m, "out": f"{out}/new-{i}.wav", "lead": 0 if i == 0 else lead}
                    for i, (t, m) in enumerate(items)])
    bad = [r for r in res if "error" in r]
    if bad:
        raise SystemExit(bad)
    return [{"file": r["file"], "speech": r["speech_s"], "lead": r["lead"]} for r in res]


def mix(lines, out_mp3):
    """render-story.mjs timing (scene = voice + 0.7 s, 0.4 s crossfades) and its "temple" ambience bed, ducked."""
    starts, t = [], 0.0
    for i, l in enumerate(lines):
        starts.append(t)
        t += max(2.6, l["speech"] + PAD) - FADE
    total = t + FADE
    T = f"{total:.2f}"
    beds = [
        f"aevalsrc='0.09*sin(2*PI*138.59*t)*(1+0.25*sin(2*PI*0.18*t))+0.06*sin(2*PI*207.65*t)*(1+0.25*sin(2*PI*0.23*t))+0.045*sin(2*PI*277.18*t)|0.09*sin(2*PI*138.59*t+0.4)*(1+0.25*sin(2*PI*0.21*t))+0.06*sin(2*PI*207.65*t+0.3)+0.045*sin(2*PI*277.18*t+0.2)':s=48000:d={T},volume=0.5",
        f"anoisesrc=color=brown:amplitude=0.6:seed=7:d={T},lowpass=f=380,tremolo=f=0.11:d=0.55,volume=0.09",
        f"anoisesrc=color=pink:amplitude=0.5:seed=11:d={T},bandpass=f=520:width_type=h:w=520,tremolo=f=3.3:d=0.55,tremolo=f=0.31:d=0.6,lowpass=f=1400,volume=0.07",
        f"aevalsrc='if(lt(random(0),0.0004),(random(1)-0.5)*1.4,0)':s=48000:d={T},highpass=f=1800,lowpass=f=7500,volume=0.3",
    ]
    ins, f = [], []
    for k, l in enumerate(lines):
        ins += ["-i", l["file"]]
        ms = max(0, round((starts[k] + (VOICE_START if k == 0 else FADE + 0.15) - l["lead"]) * 1000))
        f.append(f"[{k}:a]aresample=48000,aformat=channel_layouts=stereo,volume=1.7,adelay={ms}|{ms}[v{k}]")
    n = len(lines)
    for j, b in enumerate(beds):
        ins += ["-f", "lavfi", "-i", b]
        f.append(f"[{n + j}:a]aformat=sample_rates=48000:channel_layouts=stereo[b{j}]")
    f.append("".join(f"[v{k}]" for k in range(n)) + f"amix=inputs={n}:duration=longest:normalize=0,apad=whole_dur={T},asplit=2[vox][key]")
    f.append("".join(f"[b{j}]" for j in range(len(beds))) + f"amix=inputs={len(beds)}:duration=first:normalize=0[bed]")
    f.append("[bed][key]sidechaincompress=threshold=0.02:ratio=5:attack=25:release=450:makeup=1[duck]")
    f.append(f"[duck][vox]amix=inputs=2:duration=first:normalize=0,atrim=duration={T},afade=t=out:st={total - 2:.2f}:d=2,"
             "loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]")
    ff(*ins, "-filter_complex", ";".join(f), "-map", "[a]", "-c:a", "libmp3lame", "-b:a", "160k", "-ar", "48000", out_mp3)
    return round(total, 1)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--out", required=True)
    a = p.parse_args()
    w = os.path.join(a.out, "work")
    os.makedirs(w, exist_ok=True)
    secs = {
        "old": mix(old_lines(OLD, w), f"{a.out}/old.mp3"),
        "new": mix(new_lines(NEW, w), f"{a.out}/new.mp3"),
    }
    os.makedirs(f"{w}/ocn", exist_ok=True)
    secs["old-chain-new-script"] = mix(old_lines([t for t, _ in NEW], f"{w}/ocn"), f"{a.out}/old-chain-new-script.mp3")
    refs = {"old": " ".join(OLD), "new": " ".join(t for t, _ in NEW), "old-chain-new-script": " ".join(t for t, _ in NEW)}
    json.dump({"seconds": secs, "refs": refs}, open(f"{a.out}/refs.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(json.dumps(secs))


if __name__ == "__main__":
    main()
