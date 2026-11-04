# Final per-line audio + A/B sample for a pilot.
#   python -I prep_audio.py <root> <variant_dir> <ab_out.mp3> [n_ab_lines]
# root/script.json lines -> root/audio/final/NN-who.wav: silence trimmed, 0.08 s head + 0.25 s tail, -19 LUFS, 24 kHz mono.
# A/B: the first n lines with edge-tts (root/audio/edge), a short beep, then the same lines with <variant_dir>.
import json, os, subprocess, sys

root, variant, ab, n_ab = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]) if len(sys.argv) > 4 else 4
spec = json.load(open(f"{root}/script.json", encoding="utf-8"))
fin = f"{root}/audio/final"
os.makedirs(fin, exist_ok=True)
CLEAN = ("silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,"
         "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,"
         "loudnorm=I=-19:TP=-2:LRA=11,aresample=24000,adelay=80:all=1,apad=pad_dur=0.25")


def ff(*a):
    r = subprocess.run(["ffmpeg", "-v", "error", "-y", *a], capture_output=True, text=True)
    if r.returncode:
        raise SystemExit(r.stderr[-1500:])


for i, l in enumerate(spec["lines"]):
    name = f"{i:02d}-{l['who']}.wav"
    ff("-i", f"{variant}/{name}", "-af", CLEAN, "-ac", "1", "-ar", "24000", f"{fin}/{name}")
# A/B sample
parts = []
for src in (f"{root}/audio/edge", variant):
    for i, l in enumerate(spec["lines"][:n_ab]):
        parts.append(f"{src}/{i:02d}-{l['who']}.wav")
    parts.append("BEEP")
inputs, labels = [], []
for k, p in enumerate(parts[:-1]):
    if p == "BEEP":
        inputs += ["-f", "lavfi", "-t", "1.2", "-i", "sine=f=880:d=0.25,apad=pad_dur=0.95,volume=0.3,aresample=24000"]
    else:
        inputs += ["-i", p]
    labels.append(f"[{k}:a]aresample=24000,aformat=sample_fmts=fltp:channel_layouts=mono,apad=pad_dur=0.25[p{k}]")
fg = ";".join(labels) + ";" + "".join(f"[p{k}]" for k in range(len(parts) - 1)) + f"concat=n={len(parts) - 1}:v=0:a=1,loudnorm=I=-16[a]"
ff(*inputs, "-filter_complex", fg, "-map", "[a]", "-b:a", "160k", ab)
print("ok", fin, ab)
