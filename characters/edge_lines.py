# edge-tts baseline (A/B "before" voice) for a pilot script: one mp3 + wav per line, plus a ~10 s reference
# clip per speaker. Usage: python -I edge_lines.py <script.json> <out_dir>
import asyncio, json, os, subprocess, sys
import edge_tts

FF = "ffmpeg"
spec = json.load(open(sys.argv[1], encoding="utf-8"))
out = sys.argv[2]
os.makedirs(out, exist_ok=True)

async def say(text, sp, path):
    if os.path.exists(path[:-4] + ".wav"):
        return
    for attempt in range(6):  # the free endpoint sometimes answers 503
        try:
            c = edge_tts.Communicate(text, sp["edge"], rate=sp.get("edge_rate", "+0%"), pitch=sp.get("edge_pitch", "+0Hz"))
            await c.save(path)
            break
        except Exception as e:
            print("retry", attempt, type(e).__name__)
            await asyncio.sleep(5 * (attempt + 1))
    else:
        raise SystemExit("edge-tts failed")
    subprocess.run([FF, "-v", "error", "-y", "-i", path, "-ar", "24000", "-ac", "1", path[:-4] + ".wav"], check=True)

async def main():
    for i, l in enumerate(spec["lines"]):
        await say(l["tts"], spec["speakers"][l["who"]], f"{out}/{i:02d}-{l['who']}.mp3")
    for who, sp in spec["speakers"].items():  # reference clip: all of this speaker's lines joined
        text = " ".join(l["tts"] for l in spec["lines"] if l["who"] == who)
        await say(text, sp, f"{out}/ref-{who}.mp3")

asyncio.run(main())
print("ok", len(spec["lines"]))
