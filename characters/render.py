# Renders a character-dialogue pilot Short (1080x1920, 24 fps) from:
#   script.json (lines, speakers), audio/final/NN-who.wav (one padded wav per line),
#   lipsync/<line>.mp4 (MuseTalk output per line) or, as fallback, the Wan clip of that shot,
#   a story-panel visual per line (Shyam: AI images; EpiFive: illustrated UI mock-ups drawn here).
# Layout: title bar (0-150) | story panel (150-840, subtitles at its bottom) | character panel (840-1920).
# Usage: python -I render.py shyam|epifive [--no-lipsync]
# One ffmpeg process at a time (the PC is low on RAM).
import json, os, subprocess, sys, wave
from PIL import Image, ImageDraw, ImageFilter, ImageFont

FF = "ffmpeg"
W, H, FPS = 1080, 1920, 24
TOP, STORY_Y, STORY_H, CHAR_Y = 150, 150, 690, 840
FB = "C:/Windows/Fonts/segoeuib.ttf"
FR = "C:/Windows/Fonts/segoeui.ttf"
FS = "C:/Windows/Fonts/seguisb.ttf"
font = lambda p, s: ImageFont.truetype(p, s)

PILOT = sys.argv[1]
NO_LIPSYNC = "--no-lipsync" in sys.argv
if PILOT == "shyam":
    ROOT = "E:/shyampremisk/characters"
    CFG = dict(bg=(34, 12, 10), bar=(24, 8, 6), title_col=(255, 231, 168), kicker="Dadi ki Kahani", logo="E:/shyampremisk/brand/logo.png",
               label="AI chitra (sanketik)", out=f"{ROOT}/pilot-dadi-chhotu.mp4", clips=f"{ROOT}/kaggle-out/anim/clips",
               story={"hook": ("visuals/temple.png", (0, 120, 1024, 775)), "temple": ("visuals/temple.png", (0, 200, 1024, 855)),
                      "field": ("visuals/field2.png", (0, 230, 1024, 885)), "dream": ("visuals/dream.png", (0, 360, 1024, 1015)),
                      "cart": ("visuals/cart.png", (0, 250, 1024, 905)), "mela": ("visuals/mela.png", (0, 40, 1024, 695)),
                      "end": ("visuals/temple.png", (0, 120, 1024, 775))},
               shots=["chhotu-a", "dadi-a", "chhotu-b", "dadi-b", "two", "chhotu-a", "dadi-b", "chhotu-b", "dadi-a", "two", "chhotu-a", "two"],
               prefix="p1", music="drone")
else:
    ROOT = "E:/epifive-characters"
    CFG = dict(bg=(245, 246, 244), bar=(255, 255, 255), title_col=(20, 24, 29), kicker="EpiFive", logo=None,
               label="Illustrated mock-up", out=f"{ROOT}/pilot-max-riya.mp4", clips="E:/shyampremisk/characters/kaggle-out/anim/clips",
               story=None, shots=["riya-a", "max-a", "max-b", "two", "max-a", "riya-b", "two"], prefix="p2", music="pad")
SPEC = json.load(open(f"{ROOT}/script.json", encoding="utf-8"))
CFG["clips"] = os.environ.get("CLIPS_DIR", CFG["clips"])
ONLY = [int(x) for x in os.environ["ONLY"].split(",")] if os.environ.get("ONLY") else None
BUILD = f"{ROOT}/build/render"
os.makedirs(BUILD, exist_ok=True)
hexrgb = lambda h: tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def run(args):
    r = subprocess.run([FF, "-v", "error", "-y", *args], capture_output=True, text=True)
    if r.returncode:
        raise SystemExit(r.stderr[-2000:])


def wav_len(p):
    with wave.open(p) as w:
        return w.getnframes() / w.getframerate()


def wrap(d, text, f, maxw):
    out, cur = [], ""
    for word in text.split():
        t = f"{cur} {word}".strip()
        if d.textlength(t, font=f) <= maxw:
            cur = t
        else:
            out.append(cur); cur = word
    return out + [cur] if cur else out


def chunks(sub, limit=64):
    """Split a long subtitle at sentence/comma breaks into pieces of <= limit characters."""
    parts, cur = [], ""
    for seg in sub.replace(". ", ".|").replace("? ", "?|").replace("! ", "!|").replace(", ", ",|").split("|"):
        if cur and len(cur) >= 22 and len(cur) + len(seg) + 1 > limit:
            parts.append(cur); cur = seg
        else:
            cur = f"{cur} {seg}".strip()
    return parts + [cur] if cur else parts


# ---------- static base layer (title bar, panel frames) ----------
def base_layer():
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, TOP], fill=CFG["bar"] + (255,))
    x = 40
    if CFG["logo"]:
        lg = Image.open(CFG["logo"]).convert("RGBA").resize((112, 112))
        im.alpha_composite(lg, (30, 19)); x = 160
    else:  # EpiFive pentagon mark
        cx, cy, r = 78, 75, 40
        import math
        pts = [(cx + r * math.cos(math.radians(-90 + 72 * k)), cy + r * math.sin(math.radians(-90 + 72 * k))) for k in range(5)]
        d.polygon(pts, outline=(10, 117, 96), width=8); d.ellipse([cx - 9, cy - 4, cx + 9, cy + 14], fill=(10, 117, 96)); x = 140
    d.text((x, 30), CFG["kicker"], font=font(FS, 34), fill=(255, 194, 74) if PILOT == "shyam" else (10, 117, 96))
    d.text((x, 72), SPEC["title"], font=font(FB, 46 if len(SPEC["title"]) < 30 else 40), fill=CFG["title_col"])
    return im


def line_overlay(i, line, sub_text):
    sp = SPEC["speakers"][line["who"]]
    col = hexrgb(sp["color"])
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # subtitle band at the bottom of the story panel
    f = font(FB, 46)
    lines = wrap(d, sub_text, f, W - 120)
    bh = 70 + 58 * len(lines)
    y0 = CHAR_Y - bh - 12
    band = Image.new("RGBA", (W - 40, bh), (8, 10, 18, 205))
    m = Image.new("L", band.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, band.width - 1, bh - 1], 26, fill=255)
    im.paste(band, (20, y0), m)
    d.text((50, y0 + 12), sp["name"], font=font(FS, 32), fill=col)
    for k, t in enumerate(lines):
        d.text((50, y0 + 54 + 58 * k), t, font=f, fill=col, stroke_width=2, stroke_fill=(0, 0, 0))
    # speaker indicator on the character panel: coloured rule + name tag
    d.rectangle([0, CHAR_Y - 4, W, CHAR_Y + 4], fill=col + (255,))
    nf = font(FB, 40)
    tw = d.textlength(sp["name"], font=nf)
    d.rounded_rectangle([28, CHAR_Y + 26, 28 + tw + 88, CHAR_Y + 90], 32, fill=col + (240,))
    d.ellipse([46, CHAR_Y + 46, 68, CHAR_Y + 68], fill=(255, 255, 255))  # "speaking" dot
    d.text((80, CHAR_Y + 31), sp["name"], font=nf, fill=(20, 20, 20))
    # label on the story panel
    lf = font(FS, 26)
    lw = d.textlength(CFG["label"], font=lf)
    d.rounded_rectangle([W - lw - 56, STORY_Y + 18, W - 20, STORY_Y + 62], 20, fill=(0, 0, 0, 150))
    d.text((W - lw - 38, STORY_Y + 23), CFG["label"], font=lf, fill=(255, 255, 255))
    return im


# ---------- EpiFive mock-ups (plain text names only, no logos) ----------
def card(d, box, title=None):
    x0, y0, x1, y1 = box
    d.rounded_rectangle([x0 + 6, y0 + 10, x1 + 6, y1 + 10], 28, fill=(214, 218, 214))
    d.rounded_rectangle(box, 28, fill=(255, 255, 255), outline=(217, 221, 216), width=2)
    if title:
        d.text((x0 + 36, y0 + 26), title, font=font(FS, 30), fill=(90, 98, 108))
        d.line([x0 + 30, y0 + 78, x1 - 30, y0 + 78], fill=(230, 232, 229), width=2)


def toggle(d, x, y, on, label):
    d.rounded_rectangle([x, y, x + 96, y + 50], 25, fill=(10, 117, 96) if on else (176, 182, 188))
    cx = x + 71 if on else x + 25
    d.ellipse([cx - 19, y + 6, cx + 19, y + 44], fill=(255, 255, 255))
    d.text((x + 116, y + 4), label, font=font(FB, 34), fill=(20, 24, 29))


def check(d, cx, cy, r, col, w=6):
    d.line([(cx - r * 0.55, cy + r * 0.02), (cx - r * 0.12, cy + r * 0.45), (cx + r * 0.6, cy - r * 0.45)], fill=col, width=w, joint="curve")


def pill(d, x, y, text, bg, fg=(255, 255, 255), size=30):
    f = font(FB, size)
    w = d.textlength(text, font=f)
    d.rounded_rectangle([x, y, x + w + 40, y + size + 26], (size + 26) // 2, fill=bg)
    d.text((x + 20, y + 9), text, font=f, fill=fg)


def mock(kind):
    im = Image.new("RGB", (W, STORY_H), (236, 240, 237))
    d = ImageDraw.Draw(im)
    for gx in range(0, W, 40):
        d.line([gx, 0, gx, STORY_H], fill=(230, 234, 231))
    G, R, A, T = (10, 117, 96), (200, 55, 55), (214, 140, 20), (20, 24, 29)
    big, mid = font(FB, 40), font(FR, 32)
    if kind == "problem":
        card(d, (60, 70, W - 60, 470), "Entra admin center  ›  Properties")
        toggle(d, 100, 175, True, "Security defaults: Enabled")
        d.text((100, 258), "Exclusions:", font=mid, fill=T); pill(d, 300, 252, "Not offered", R)
        d.text((100, 330), "Conditional Access:", font=mid, fill=T); pill(d, 410, 324, "Business Premium includes it", G)
        pill(d, 250, 400, "All-or-nothing for the whole tenant", A, size=28)
    elif kind == "vs":
        card(d, (50, 80, 520, 470)); card(d, (560, 80, W - 50, 470))
        d.text((90, 110), "Security defaults", font=big, fill=T)
        for k, t in enumerate(["Free baseline", "On or off only", "No exclusions"]):
            d.text((100, 190 + 62 * k), "•  " + t, font=mid, fill=(70, 78, 88))
        d.text((600, 110), "Conditional Access", font=big, fill=T)
        for k, t in enumerate(["Entra ID P1 / Bus. Premium", "Per-user, per-app rules", "Exclusions + report-only"]):
            d.text((610, 190 + 62 * k), "•  " + t, font=mid, fill=(70, 78, 88))
        pill(d, 360, 400, "You can't run both side by side", R, size=30)
    elif kind == "step1":
        pill(d, 60, 40, "STEP 1", G, size=34)
        card(d, (60, 120, W - 60, 480), "Emergency access (break-glass) accounts")
        for k, n in enumerate(["breakglass-01", "breakglass-02"]):
            y = 225 + 110 * k
            d.ellipse([100, y, 160, y + 60], fill=(220, 236, 231)); check(d, 130, y + 30, 22, G)
            d.text((185, y - 4), n, font=big, fill=T)
            d.text((185, y + 42), "Global Administrator  ·  cloud-only", font=font(FR, 26), fill=(110, 118, 128))
            pill(d, 700, y + 4, "Excluded", G, size=28)
    elif kind == "step2":
        pill(d, 60, 40, "STEP 2", G, size=34)
        card(d, (60, 120, W - 60, 490), "Conditional Access  ›  Policies")
        rows = ["Block legacy authentication", "Require MFA for admins", "Require MFA for all users"]
        for k, r in enumerate(rows):
            y = 220 + 70 * k
            d.text((95, y), "Microsoft-managed: " + r, font=font(FR, 28), fill=T)
            pill(d, 805, y - 6, "Report-only", (120, 128, 138), size=24)
        pill(d, 95, 428, "Excluded identities: break-glass", A, size=26)
        pill(d, 640, 428, "Policy impact: reviewed", G, size=26)
    elif kind == "step3":
        pill(d, 60, 40, "STEP 3", G, size=34)
        card(d, (60, 120, W - 60, 490), "Switch with no gap")
        toggle(d, 100, 215, False, "Security defaults: Disabled")
        d.text((140, 290), "↓  right away", font=font(FB, 34), fill=A)
        toggle(d, 100, 350, True, "Conditional Access policies: On")
        pill(d, 660, 420, "Then check sign-in logs", G, size=26)
    elif kind == "done":
        card(d, (140, 110, W - 140, 470))
        d.ellipse([W // 2 - 70, 150, W // 2 + 70, 290], fill=G)
        check(d, W // 2, 220, 52, (255, 255, 255), w=14)
        t = "No gap. No lockout."
        d.text(((W - d.textlength(t, font=font(FB, 54))) // 2, 320), t, font=font(FB, 54), fill=T)
    elif kind == "end":
        card(d, (110, 110, W - 110, 470))
        t1, t2 = "Full guide on", "epifive.com"
        d.text(((W - d.textlength(t1, font=font(FS, 48))) // 2, 170), t1, font=font(FS, 48), fill=(90, 98, 108))
        d.text(((W - d.textlength(t2, font=font(FB, 92))) // 2, 240), t2, font=font(FB, 92), fill=G)
        pill(d, 330, 390, "Like  ·  Subscribe  for more fixes", A, size=28)
    # keep the content in the top ~430 px so subtitles at the panel bottom never cover it
    out = Image.new("RGB", (W, STORY_H), (236, 240, 237))
    out.paste(im.crop((0, 20, W, 510)).resize((int(W * 0.86), int(490 * 0.86)), Image.LANCZOS), (int(W * 0.07), 8))
    return out


def story_image(kind):
    p = f"{BUILD}/story-{kind}.png"
    if os.path.exists(p):
        return p
    if CFG["story"]:
        src, box = CFG["story"][kind]
        img = Image.open(f"{ROOT}/{src}").convert("RGB").crop(box).resize((W, STORY_H), Image.LANCZOS)
        if kind == "end":
            d = ImageDraw.Draw(img)
            img = Image.blend(img, Image.new("RGB", img.size, (20, 8, 4)), 0.35); d = ImageDraw.Draw(img)
            t = "Like  |  Share  |  Subscribe"
            d.text(((W - d.textlength(t, font=font(FB, 64))) // 2, 230), t, font=font(FB, 64), fill=(255, 216, 119), stroke_width=3, stroke_fill=(0, 0, 0))
    else:
        img = mock(kind)
    img.save(p)
    return p


def main():
    base = base_layer()
    segs = []
    lip_dir = f"{ROOT}/lipsync"
    for i, line in enumerate(SPEC["lines"]):
        if ONLY is not None and i not in ONLY:
            continue
        audio = f"{ROOT}/audio/final/{i:02d}-{line['who']}.wav"
        dur = wav_len(audio)
        shot = CFG["shots"][i]
        lip = f"{lip_dir}/{i:02d}.mp4"
        use_lip = os.path.exists(lip) and not NO_LIPSYNC
        clip = lip if use_lip else f"{CFG['clips']}/{CFG['prefix']}-{shot}.mp4"
        # overlays: one per subtitle chunk, timed by character share
        parts = chunks(line["sub"])
        total = sum(len(p) for p in parts)
        ovs, t = [], 0.0
        for k, ptxt in enumerate(parts):
            o = base.copy(); o.alpha_composite(line_overlay(i, line, ptxt))
            f = f"{BUILD}/ov-{i:02d}-{k}.png"; o.save(f)
            span = dur * len(ptxt) / total
            ovs.append((f, t, t + span if k < len(parts) - 1 else dur + 1)); t += span
        story = story_image(line["top"])
        inputs = ["-f", "lavfi", "-i", f"color=c=0x{''.join(f'{c:02x}' for c in CFG['bg'])}:s={W}x{H}:r={FPS}:d={dur:.3f}",
                  "-loop", "1", "-framerate", str(FPS), "-t", f"{dur:.3f}", "-i", story]
        if use_lip:
            inputs += ["-i", clip]
            charf = f"[2:v]fps={FPS},scale=1080:1080:flags=lanczos,tpad=stop_mode=clone:stop_duration=2,trim=duration={dur:.3f},setpts=PTS-STARTPTS[ch]"
        else:  # ping-pong the Wan clip so it never jumps
            inputs += ["-i", clip]
            charf = (f"[2:v]fps={FPS},scale=1080:1080:flags=lanczos,split[a][b];[b]reverse[r];[a][r]concat=n=2,"
                     f"loop=loop=-1:size=400,trim=duration={dur:.3f},setpts=PTS-STARTPTS[ch]")
        for f, _, _ in ovs:
            inputs += ["-loop", "1", "-framerate", str(FPS), "-t", f"{dur:.3f}", "-i", f]
        inputs += ["-i", audio]
        # slow push-in on the story panel (scale up 8% over the line)
        z = f"[1:v]scale={W * 2}:{STORY_H * 2},zoompan=z='min(1+0.08*on/({dur:.3f}*{FPS}),1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s={W}x{STORY_H}:fps={FPS}[st]"
        fg = [z, charf, f"[0:v][st]overlay=0:{STORY_Y}[v0]", f"[v0][ch]overlay=0:{CHAR_Y}[v1]"]
        last = "v1"
        for k, (_, a, b) in enumerate(ovs):
            fg.append(f"[{last}][{3 + k}:v]overlay=0:0:enable='between(t,{a:.3f},{b:.3f})'[o{k}]"); last = f"o{k}"
        fg.append(f"[{last}]format=yuv420p[vout]")
        seg = f"{BUILD}/seg-{i:02d}.mp4"
        run([*inputs, "-filter_complex", ";".join(fg), "-map", "[vout]", "-map", f"{3 + len(ovs)}:a",
             "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
             "-t", f"{dur:.3f}", seg])
        segs.append(seg)
        print(f"seg {i:02d} {dur:.2f}s {'lipsync' if use_lip else 'wan-clip'} {shot}", flush=True)
    if ONLY is not None:
        return
    lst = f"{BUILD}/segs.txt"
    open(lst, "w").write("".join(f"file '{s}'\n" for s in segs))
    joined = f"{BUILD}/joined.mp4"
    run(["-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", joined])
    total = sum(wav_len(f"{ROOT}/audio/final/{i:02d}-{l['who']}.wav") for i, l in enumerate(SPEC["lines"]))
    if CFG["music"] == "drone":  # synthesized tanpura-like drone (Sa-Pa) + soft bell at start: no third-party music
        music = (f"sine=f=130.81:d={total:.2f},volume=0.5[s1];sine=f=196.0:d={total:.2f},volume=0.35[s2];"
                 f"sine=f=261.63:d={total:.2f},volume=0.25[s3];[s1][s2][s3]amix=inputs=3,tremolo=f=0.25:d=0.4,"
                 f"lowpass=f=900,volume=0.12,afade=t=in:d=1.5,afade=t=out:st={total - 2:.2f}:d=2[m]")
    else:  # soft synth pad for EpiFive
        music = (f"sine=f=220:d={total:.2f},volume=0.4[s1];sine=f=277.18:d={total:.2f},volume=0.3[s2];"
                 f"sine=f=329.63:d={total:.2f},volume=0.3[s3];[s1][s2][s3]amix=inputs=3,tremolo=f=0.5:d=0.3,"
                 f"lowpass=f=1200,volume=0.07,afade=t=in:d=1.5,afade=t=out:st={total - 2:.2f}:d=2[m]")
    run(["-i", joined, "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-filter_complex",
         f"{music};[0:a][m]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]",
         "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", CFG["out"]])
    print("done", CFG["out"], f"{total:.1f}s")


if __name__ == "__main__":
    main()
