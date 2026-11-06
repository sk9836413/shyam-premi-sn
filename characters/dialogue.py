# Two-character dialogue Shorts, shared by both channels (runs on the CI runner; the GPU part is
# characters/kaggle/lipsync_daily.py on Kaggle):
#   Shyam Premi SN: "Dadi aur Chhotu" (Hindi, temple stories), spec = story/today/scenes.json with "format": "dialogue"
#   EpiFive: "Max & Riya" (English, Microsoft 365 fixes), spec = <draft>/dialogue.json (+ visuals.json)
#
#   python -I characters/dialogue.py voice   --spec S --channel shyam|epifive --out DIR      edge-tts, one wav per line + pauses
#   python -I characters/dialogue.py images  --spec S --out DIR                               Shyam: FLUX story images (media Worker)
#   python -I characters/dialogue.py plan    --spec S --channel C --voice DIR --out plan.json  shot per line (close-up / two-shot)
#   python -I characters/dialogue.py dataset --plan plan.json --voice DIR --out animate/dataset   flat Kaggle dataset + jobs.json
#   python -I characters/dialogue.py render  --spec S --channel C --plan plan.json --voice DIR --out OUT.mp4
#          [--lipsync DIR] [--images DIR] [--visuals visuals.json] [--srt OUT.srt] [--meta OUT.json] [--footage DIR]
#
# Characters: library/<channel>/ holds the canonical sheet (master.png = the identity, never regenerated) and the clip
# library (Wan 2.2 image-to-video clips made from those sheet images; library.json lists them with face boxes). Each line
# is lip-synced on a library clip (Kaggle); a line without a lip-sync clip uses the still two-shot with a speaker
# highlight, so a post is never skipped. Two-shot framing for quick back-and-forth, close-ups for explanations.
# Story panel: Shyam = FLUX images labelled "AI chitra (sanketik)", or licence-checked real temple footage from
# footage/<temple>/ (credited in the description); EpiFive = illustrated mock-ups drawn from visuals.json.
# Audio: edge-tts voices, music and ambient SFX synthesized here with ffmpeg (no third-party audio).
import argparse, asyncio, glob, json, math, os, re, shutil, subprocess, sys, time, urllib.request, wave

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FF = os.environ.get("FFMPEG_PATH", "ffmpeg")
W, H, FPS = 1080, 1920, 24
TOP, STORY_Y, STORY_H, CHAR_Y = 150, 150, 690, 840
MAX_TOTAL = 172.0  # YouTube Shorts allow up to 3 min; keep a margin


def ff(*args):
    r = subprocess.run([FF, "-v", "error", "-y", *args], capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(r.stderr[-2500:])


def wav_len(p):
    with wave.open(p) as w:
        return w.getnframes() / w.getframerate()


def load_json(p):
    return json.load(open(p, encoding="utf-8"))


def library(channel):
    lib = load_json(os.path.join(HERE, "library", channel, "library.json"))
    lib["dir"] = os.path.join(HERE, "library", channel)
    return lib


def load_spec(path, channel):
    """Both channels' specs as one shape: lines [{who, tts, sub, top, step}] and visuals {key: {...}}."""
    s = load_json(path)
    if channel == "shyam":
        lines = [{"who": l["who"], "tts": l["tts"], "sub": l["sub"], "top": l.get("top"), "step": None} for l in s["lines"]]
        return {**s, "lines": lines, "visuals": s.get("visuals", {})}
    lines, last = [], "v0"
    for l in s["lines"]:
        top = f"v{l['visual']}" if isinstance(l.get("visual"), int) else last
        last = top
        lines.append({"who": l["who"], "tts": l["text"], "sub": l["text"], "top": top, "step": l.get("step")})
    lines[-1]["top"] = "end"
    return {**s, "lines": lines, "visuals": {}}


# ---------------------------------------------------------------- voice ----
def spoken(text, lang):
    if lang == "en":
        text = re.sub(r"\bepifive\.com\b", "EpiFive dot com", text, flags=re.I)
        text = re.sub(r"https?://\S+", "", text)
    return text


async def edge_say(text, v, mp3):
    import edge_tts
    for attempt in range(6):  # the free endpoint sometimes answers 503
        try:
            await edge_tts.Communicate(text, v["edge"], rate=v.get("rate", "+0%"), pitch=v.get("pitch", "+0Hz")).save(mp3)
            if os.path.getsize(mp3) > 1000:
                return
        except Exception as e:
            print("edge-tts retry", attempt, type(e).__name__, flush=True)
        await asyncio.sleep(4 * (attempt + 1))
    raise RuntimeError("edge-tts failed")


def kokoro_say(text, v, wav, lang):
    """Fallback voice (Kokoro-82M, Apache-2.0) when edge-tts is down; model files in $KOKORO_DIR."""
    import soundfile as sf
    from kokoro_onnx import Kokoro
    d = os.environ.get("KOKORO_DIR", os.path.expanduser("~/kokoro"))
    k = Kokoro(f"{d}/kokoro-v1.0.onnx", f"{d}/voices-v1.0.bin")
    a, sr = k.create(text, voice=v["kokoro"], speed=v.get("kokoro_speed", 1.0), lang="hi" if lang == "hi" else "en-us")
    sf.write(wav, a, sr)


def bump(rate, pct):
    n = int(rate.replace("%", "")) + pct
    return f"{'+' if n >= 0 else ''}{n}%"


def cmd_voice(a):
    lib, spec = library(a.channel), load_spec(a.spec, a.channel)
    lang, sp, pz = lib["lang"], lib["speakers"], lib["pauses"]
    os.makedirs(a.out, exist_ok=True)
    faster = 0
    for attempt in range(2):
        lines, engine = [], "edge-tts"
        for i, l in enumerate(spec["lines"]):
            v = dict(sp[l["who"]]["voice"])
            v["rate"] = bump(v.get("rate", "+0%"), faster)
            raw, out = f"{a.out}/{i:02d}-raw", f"{a.out}/{i:02d}.wav"
            text = spoken(l["tts"], lang)
            try:
                asyncio.run(edge_say(text, v, raw + ".mp3")); src = raw + ".mp3"
            except Exception:
                kokoro_say(text, v, raw + ".wav", lang); src = raw + ".wav"; engine = "kokoro (edge-tts failed)"
            nxt = spec["lines"][i + 1]["who"] if i + 1 < len(spec["lines"]) else None
            # Pauses between turns (the pilot's Dadi ran on without breathing): longer when the speaker changes,
            # a beat more after a question, a long hold after the last line.
            pause = pz["end"] if nxt is None else (pz["switch"] + (0.12 if l["tts"].rstrip().endswith("?") else 0)) if nxt != l["who"] else pz["same"]
            ff("-i", src, "-af",
               "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,"
               "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,"
               f"loudnorm=I=-18:TP=-2:LRA=11,aresample=24000,adelay=90:all=1,apad=pad_dur={pause:.2f}",
               "-ac", "1", "-ar", "24000", out)
            for f in (raw + ".mp3", raw + ".wav"):
                if os.path.exists(f):
                    os.remove(f)
            secs = wav_len(out)
            lines.append({"i": i, "who": l["who"], "file": f"{i:02d}.wav", "seconds": round(secs, 3),
                          "speech_s": round(secs - pause - 0.09, 3), "pause_s": pause})
        total = sum(x["seconds"] for x in lines)
        if total <= MAX_TOTAL or attempt:
            break
        faster = 10  # over the Shorts limit: one more pass, everyone 10% faster
        print(f"voice: {total:.1f}s is over {MAX_TOTAL}s, speaking 10% faster", flush=True)
    meta = {"engine": engine, "total_s": round(total, 2), "faster_pct": faster, "lines": lines}
    json.dump(meta, open(f"{a.out}/voice.json", "w"), indent=1)
    print(json.dumps({"voice": engine, "lines": len(lines), "total_s": meta["total_s"]}))


# --------------------------------------------------------------- images ----
def temple_slug(temple):
    """The registry slug for a temple (footage/temples.json aliases), as scripts/real-photos.mjs resolves it."""
    try:
        reg = load_json(os.path.join(ROOT, "footage", "temples.json"))
    except Exception:
        return temple
    if temple in reg:
        return temple
    return next((k for k, v in reg.items() if isinstance(v, dict) and temple in v.get("aliases", [])), temple)


def footage_for(temple, root=None):
    """Real temple clips and photos with a valid licence sidecar: footage/<temple>/<name>.mp4|.jpg + <name>.licence.json.
    Photos come from scripts/real-photos.mjs (Wikimedia Commons, CC0 / PD / CC BY only) and get a slow Ken Burns move."""
    if not temple:
        return []
    ok = re.compile(r"^(own|permission|pixabay|pexels|cc0|public domain|cc by( [\d.]+)?)", re.I)
    out = []
    folder = os.path.join(root or os.path.join(ROOT, "footage"), temple_slug(temple))
    for clip in sorted(glob.glob(os.path.join(folder, "*.mp4")) + glob.glob(os.path.join(folder, "*.jpg"))):
        side = os.path.splitext(clip)[0] + ".licence.json"
        if not os.path.exists(side):
            print(f"footage: {clip} has no licence file, skipped", flush=True); continue
        lic = load_json(side)
        name = str(lic.get("licence", ""))
        if not ok.match(name) or re.search(r"\b(sa|nc|nd)\b|share.?alike|non.?commercial|no.?deriv", name, re.I):
            print(f"footage: {clip} licence '{name}' not allowed, skipped", flush=True); continue
        if not lic.get("author") or not lic.get("source"):
            print(f"footage: {clip} needs source and author, skipped", flush=True); continue
        out.append({"file": clip, "kind": "photo" if clip.endswith(".jpg") else "video", **{k: v for k, v in lic.items() if k != "kind"}})
    return out


def cmd_images(a):
    spec = load_json(a.spec)
    os.makedirs(a.out, exist_ok=True)
    real = footage_for(spec.get("temple"), a.footage)
    made, failed = 0, []
    for key, v in spec.get("visuals", {}).items():
        f = f"{a.out}/{key}.jpg"
        if os.path.exists(f) or (v.get("real") and real):
            continue
        try:
            req = urllib.request.Request(f"{os.environ['MEDIA_URL']}/ai/flux", method="POST",
                                         data=json.dumps({"prompt": f"{v['prompt']}. {spec.get('style', '')}", "steps": 4}).encode(),
                                         # Cloudflare answers Python's default User-Agent with 403 (error 1010)
                                         headers={"Authorization": f"Bearer {os.environ['MEDIA_TOKEN']}", "Content-Type": "application/json",
                                                  "User-Agent": "shyam-premi-sn/1.0 (+https://github.com/sk9836413/shyam-premi-sn)"})
            j = json.load(urllib.request.urlopen(req, timeout=120))
            if not j.get("success"):
                raise RuntimeError(str(j.get("errors"))[:200])
            import base64
            open(f, "wb").write(base64.b64decode(j["result"]["image"])); made += 1
        except Exception as e:  # the renderer falls back to a calm background for this visual
            failed.append(key); print(f"image {key} failed: {e}", flush=True)
    print(json.dumps({"images": made, "failed": failed, "footage_clips": len(real)}))


# ----------------------------------------------------------------- plan ----
def cmd_plan(a):
    lib, spec, voice = library(a.channel), load_spec(a.spec, a.channel), load_json(f"{a.voice}/voice.json")
    clips = lib["clips"]
    two_clips = [c for c in clips if c["who"] == "both"]
    turn, last, out, run_two = {}, {}, [], 0
    n = len(spec["lines"])
    for i, l in enumerate(spec["lines"]):
        v, who = voice["lines"][i], l["who"]
        prev = spec["lines"][i - 1]["who"] if i else None
        # Two-shot when both are talking: the opening, the closing exchange and quick replies after the other speaker.
        two = bool(two_clips) and (i == 0 or i >= n - 2 or (prev not in (None, who) and v["speech_s"] <= 3.2))
        if two and run_two >= 2:
            two = False
        if not any(c["who"] == who for c in clips):  # no close-up clip for this speaker yet: two-shot
            two = bool(two_clips)
        if two:
            c = two_clips[turn.get("both", 0) % len(two_clips)]; turn["both"] = turn.get("both", 0) + 1
            box = c["boxes"][who]; run_two += 1
        else:
            mine = [c for c in clips if c["who"] == who]
            k = turn.get(who, 0)
            c = mine[k % len(mine)]
            if len(mine) > 1 and c["id"] == last.get(who):
                k += 1; c = mine[k % len(mine)]
            turn[who] = k + 1; last[who] = c["id"]; box = c["box"]; run_two = 0
        out.append({"i": i, "who": who, "seconds": v["seconds"], "speech_s": v["speech_s"], "audio": v["file"],
                    "clip": c["id"], "clip_file": c["file"], "two": two, "box": box})
    json.dump({"channel": a.channel, "lines": out}, open(a.out, "w"), indent=1)
    print(json.dumps({"lines": n, "two_shots": sum(1 for x in out if x["two"]), "seconds": round(sum(x["seconds"] for x in out), 1)}))


def cmd_dataset(a):
    plan = load_json(a.plan)
    lib = library(plan["channel"])
    if os.path.isdir(a.out):
        shutil.rmtree(a.out)
    os.makedirs(a.out)
    jobs = []
    for p in plan["lines"]:
        clip = f"clip-{p['clip']}.mp4"
        if not os.path.exists(f"{a.out}/{clip}"):
            shutil.copy(os.path.join(lib["dir"], p["clip_file"]), f"{a.out}/{clip}")
        shutil.copy(f"{a.voice}/{p['audio']}", f"{a.out}/line-{p['i']:02d}.wav")
        jobs.append({"id": f"{p['i']:02d}", "clip": clip, "audio": f"line-{p['i']:02d}.wav", "box": p["box"],
                     "box_frame": lib.get("clip_size", 704), "seconds": p["seconds"]})
    stamp = f"char-{plan['channel']}-{int(time.time())}"
    json.dump({"stamp": stamp, "settings": {"enhance": True, "max_minutes": int(a.max_minutes)}, "jobs": jobs},
              open(f"{a.out}/jobs.json", "w"), indent=1)
    print(json.dumps({"stamp": stamp, "jobs": len(jobs), "audio_s": round(sum(j["seconds"] for j in jobs), 1)}))


# --------------------------------------------------------------- render ----
def find_font(*names):
    roots = ["/usr/share/fonts", "C:/Windows/Fonts", os.path.expanduser("~/.fonts")]
    for n in names:
        if n and os.path.exists(n):
            return n
        for r in roots:
            hit = glob.glob(f"{r}/**/{n}", recursive=True) if n else []
            if hit:
                return hit[0]
    return None


def fonts():
    from PIL import ImageFont
    pick = {
        "bold": find_font(os.environ.get("CHAR_FONT_BOLD"), "DejaVuSans-Bold.ttf", "Inter-Bold.otf", "Inter-Bold.ttf", "segoeuib.ttf"),
        "semi": find_font(os.environ.get("CHAR_FONT_SEMI"), "DejaVuSans-Bold.ttf", "Inter-SemiBold.otf", "seguisb.ttf"),
        "reg": find_font(os.environ.get("CHAR_FONT_REG"), "DejaVuSans.ttf", "Inter-Regular.otf", "segoeui.ttf"),
        "mono": find_font("DejaVuSansMono.ttf", "consola.ttf", "DejaVuSans.ttf"),
    }
    cache = {}

    def get(kind, size):
        k = (kind, size)
        if k not in cache:
            p = pick.get(kind) or pick["bold"]
            cache[k] = ImageFont.truetype(p, size) if p else ImageFont.load_default(size)
        return cache[k]
    return get


hexrgb = lambda h: tuple(int(h.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4))


def wrap(d, text, f, maxw):
    out, cur = [], ""
    for word in str(text).split():
        t = f"{cur} {word}".strip()
        if d.textlength(t, font=f) <= maxw:
            cur = t
        else:
            if cur:
                out.append(cur)
            cur = word
    return out + [cur] if cur else out


def sub_chunks(sub, limit=66):
    parts, cur = [], ""
    for seg in re.split(r"(?<=[.?!,;])\s+", sub.strip()):
        if cur and len(cur) >= 22 and len(cur) + len(seg) + 1 > limit:
            parts.append(cur); cur = seg
        else:
            cur = f"{cur} {seg}".strip()
    return parts + [cur] if cur else parts


class Renderer:
    def __init__(self, a):
        from PIL import Image
        self.a, self.channel = a, a.channel
        self.lib, self.spec = library(a.channel), load_spec(a.spec, a.channel)
        self.raw = load_json(a.spec)
        self.plan = load_json(a.plan)["lines"]
        self.voice = load_json(f"{a.voice}/voice.json")["lines"]
        self.f = fonts()
        self.st = self.lib["style"]
        self.build = os.path.join(os.path.dirname(os.path.abspath(a.out)), f"build-{os.path.basename(a.out)[:-4]}")
        os.makedirs(self.build, exist_ok=True)
        self.master = Image.open(os.path.join(self.lib["dir"], self.lib["master"])).convert("RGB")
        self.footage = footage_for(self.raw.get("temple"), a.footage) if self.channel == "shyam" else []
        self.ev = json.load(open(a.visuals, encoding="utf-8")) if a.visuals and os.path.exists(a.visuals) else []
        self.used_footage, self.ai_visuals = [], set()

    # ---- static layers ----
    def base_layer(self):
        from PIL import Image, ImageDraw
        im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        d.rectangle([0, 0, W, TOP], fill=hexrgb(self.st["bar"]) + (255,))
        x = 40
        logo = self.lib.get("logo") and os.path.join(ROOT, self.lib["logo"])
        if logo and os.path.exists(logo):
            im.alpha_composite(Image.open(logo).convert("RGBA").resize((112, 112)), (30, 19)); x = 160
        else:  # EpiFive pentagon mark
            cx, cy, r = 78, 75, 40
            pts = [(cx + r * math.cos(math.radians(-90 + 72 * k)), cy + r * math.sin(math.radians(-90 + 72 * k))) for k in range(5)]
            d.polygon(pts, outline=(10, 117, 96), width=8); d.ellipse([cx - 9, cy - 4, cx + 9, cy + 14], fill=(10, 117, 96)); x = 140
        d.text((x, 28), self.spec.get("kicker") or self.st["kicker"], font=self.f("semi", 34), fill=hexrgb(self.st["kicker_color"]))
        title = self.spec["title"]
        size = 46
        while size > 30 and d.textlength(title, font=self.f("bold", size)) > W - x - 30:
            size -= 2
        d.text((x, 72), title, font=self.f("bold", size), fill=hexrgb(self.st["title"]))
        return im

    def line_overlay(self, line, plan, text, label):
        from PIL import Image, ImageDraw
        sp = self.lib["speakers"][line["who"]]
        col = hexrgb(sp["color"])
        im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        f = self.f("bold", 46)
        lines = wrap(d, text, f, W - 120)
        bh = 70 + 58 * len(lines)
        y0 = CHAR_Y - bh - 12
        d.rounded_rectangle([20, y0, W - 20, y0 + bh], 26, fill=(8, 10, 18, 205))
        d.text((50, y0 + 12), sp["name"], font=self.f("semi", 32), fill=col)
        for k, t in enumerate(lines):
            d.text((50, y0 + 54 + 58 * k), t, font=f, fill=col, stroke_width=2, stroke_fill=(0, 0, 0))
        # speaker indicator: coloured rule + name tag on the speaker's side of the frame
        d.rectangle([0, CHAR_Y - 4, W, CHAR_Y + 4], fill=col + (255,))
        nf = self.f("bold", 40)
        tw = d.textlength(sp["name"], font=nf)
        right = plan["two"] and sp.get("side") == "right"
        x0 = W - 28 - (tw + 88) if right else 28
        d.rounded_rectangle([x0, CHAR_Y + 26, x0 + tw + 88, CHAR_Y + 90], 32, fill=col + (240,))
        d.ellipse([x0 + 18, CHAR_Y + 46, x0 + 40, CHAR_Y + 68], fill=(255, 255, 255))
        d.text((x0 + 52, CHAR_Y + 31), sp["name"], font=nf, fill=(20, 20, 20))
        if label:
            lf = self.f("semi", 26)
            lw = d.textlength(label, font=lf)
            d.rounded_rectangle([W - lw - 56, STORY_Y + 18, W - 20, STORY_Y + 62], 20, fill=(0, 0, 0, 150))
            d.text((W - lw - 38, STORY_Y + 23), label, font=lf, fill=(255, 255, 255))
        if line.get("step"):
            sf = self.f("bold", 34)
            t = f"STEP {line['step']}"
            sw = d.textlength(t, font=sf)
            d.rounded_rectangle([28, STORY_Y + 16, 28 + sw + 44, STORY_Y + 76], 30, fill=(10, 117, 96, 255))
            d.text((50, STORY_Y + 24), t, font=sf, fill=(255, 255, 255))
        return im

    def hook_overlay(self, text):
        from PIL import Image, ImageDraw
        im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        f = self.f("bold", 78)
        lines = wrap(d, text, f, W - 160)
        hh = 40 + 96 * len(lines)
        y0 = STORY_Y + (STORY_H - hh) // 2 - 40
        d.rounded_rectangle([50, y0, W - 50, y0 + hh], 34, fill=(26, 11, 0, 190))
        for k, t in enumerate(lines):
            d.text(((W - d.textlength(t, font=f)) // 2, y0 + 20 + 96 * k), t, font=f, fill=(255, 226, 122), stroke_width=3, stroke_fill=(0, 0, 0))
        return im

    # ---- character panel ----
    def highlight(self, who):
        """RGBA layer for the 1080 square: darkens the listener's half, warms the speaker's face."""
        from PIL import Image, ImageDraw, ImageFilter
        p = f"{self.build}/hl-{who}.png"
        if os.path.exists(p):
            return p
        side = self.lib["speakers"][who].get("side", "left")
        g = Image.new("L", (W, W), 0)
        d = ImageDraw.Draw(g)
        for x in range(W):
            t = x / W if side == "left" else 1 - x / W
            d.line([x, 0, x, W], fill=int(140 * min(1, max(0, (t - 0.35) / 0.4))))
        layer = Image.new("RGBA", (W, W), (0, 0, 0, 0))
        layer.putalpha(g)
        cx, cy = [v * W / self.master.width for v in self.lib["face_centre_master"][who]]
        glow = Image.new("L", (W, W), 0)
        ImageDraw.Draw(glow).ellipse([cx - 230, cy - 260, cx + 230, cy + 260], fill=60)
        glow = glow.filter(ImageFilter.GaussianBlur(70))
        warm = Image.new("RGBA", (W, W), (255, 214, 150, 0)); warm.putalpha(glow)
        layer.alpha_composite(warm)
        layer.save(p)
        return p

    def still(self, who):
        """Still two-shot (the canonical master) with the speaker highlighted: the fallback when no lip-sync clip exists."""
        from PIL import Image
        p = f"{self.build}/still-{who}.png"
        if not os.path.exists(p):
            im = self.master.resize((W, W), Image.LANCZOS).convert("RGBA")
            im.alpha_composite(Image.open(self.highlight(who)))
            im.convert("RGB").resize((3 * W // 2, 3 * W // 2), Image.LANCZOS).save(p)
        return p

    # ---- story panel ----
    def story(self, key, i):
        """(kind, file, label): kind image|video."""
        from PIL import Image, ImageDraw, ImageFilter
        if self.channel == "epifive":
            p = f"{self.build}/story-{key}.png"
            if not os.path.exists(p):
                from ui_cards import draw_visual
                v = {"type": "end"} if key == "end" else (self.ev[int(key[1:])] if key.startswith("v") and int(key[1:]) < len(self.ev) else {"type": "end"})
                draw_visual(v, self.f, W, STORY_H).save(p)
            return "image", p, self.st["label"]
        if key == "end":
            p = f"{self.build}/story-end.png"
            if not os.path.exists(p):
                im = Image.new("RGB", (W, STORY_H), (40, 10, 8))
                d = ImageDraw.Draw(im)
                logo = os.path.join(ROOT, self.lib["logo"])
                if os.path.exists(logo):
                    im.paste(Image.open(logo).convert("RGBA").resize((250, 250)), (W // 2 - 125, 40), Image.open(logo).convert("RGBA").resize((250, 250)))
                t = "Like  |  Share  |  Subscribe"
                d.text(((W - d.textlength(t, font=self.f("bold", 62))) // 2, 330), t, font=self.f("bold", 62), fill=(255, 216, 119), stroke_width=3, stroke_fill=(0, 0, 0))
                if self.raw.get("next"):
                    t2 = f"Kal: {self.raw['next']}"
                    d.text(((W - d.textlength(t2, font=self.f("bold", 50))) // 2, 430), t2, font=self.f("bold", 50), fill=(255, 255, 255))
                im.save(p)
            return "image", p, None
        vis = self.spec["visuals"].get(key, {})
        if vis.get("real") and self.footage:
            clip = self.footage[i % len(self.footage)]
            if clip not in self.used_footage:
                self.used_footage.append(clip)
            if clip["kind"] == "photo":
                return "photo", clip["file"], f"Asli photo: {clip['author']}"[:44]
            return "video", clip["file"], f"Asli drishya: {clip['author']}"[:44]
        img = os.path.join(self.a.images or "", f"{key}.jpg")
        if not os.path.exists(img):  # FLUX failed: a blurred, darkened master as a calm background
            img = f"{self.build}/story-fallback.jpg"
            if not os.path.exists(img):
                self.master.resize((W, W)).crop((0, 180, W, 180 + STORY_H)).filter(ImageFilter.GaussianBlur(18)).point(lambda v: int(v * 0.6)).save(img)
            return "image", img, None
        self.ai_visuals.add(key)
        return "image", img, self.st["label"]

    # ---- one segment per line ----
    def segment(self, i, line, plan, base):
        from PIL import Image
        dur = self.voice[i]["seconds"]
        audio = f"{self.a.voice}/{self.voice[i]['file']}"
        kind, story_file, label = self.story(line["top"] or "end", i)
        lip = os.path.join(self.a.lipsync or "", f"{i:02d}.mp4")
        use_lip = bool(self.a.lipsync) and os.path.exists(lip) and os.path.getsize(lip) > 10000
        parts = sub_chunks(line["sub"])
        total = sum(len(p) for p in parts) or 1
        speech = max(0.5, self.voice[i]["speech_s"])
        ovs, t = [], 0.0
        for k, ptxt in enumerate(parts):
            o = base.copy(); o.alpha_composite(self.line_overlay(line, plan, ptxt, label))
            f = f"{self.build}/ov-{i:02d}-{k}.png"; o.save(f)
            span = speech * len(ptxt) / total
            ovs.append((f, t, t + span if k < len(parts) - 1 else dur + 1)); self.srt.append((self.t0 + t + 0.09, self.t0 + min(dur, t + span + 0.09), ptxt, line["who"])); t += span
        inputs = ["-f", "lavfi", "-i", f"color=c=0x{self.st['bg']}:s={W}x{H}:r={FPS}:d={dur:.3f}"]
        if kind == "photo":  # real temple photo: cover the panel, then a slow Ken Burns move (zoom in or out, drifting)
            inputs += ["-loop", "1", "-framerate", str(FPS), "-t", f"{dur:.3f}", "-i", story_file]
            n = max(1, round(dur * FPS))
            z = f"1+0.10*on/{n}" if i % 2 == 0 else f"1.10-0.10*on/{n}"
            sf = (f"[1:v]scale={W * 3 // 2}:{STORY_H * 3 // 2}:force_original_aspect_ratio=increase,crop={W * 3 // 2}:{STORY_H * 3 // 2},setsar=1,"
                  f"zoompan=z='{z}':x='(iw-iw/zoom)*({0.3 if i % 3 else 0.7}+0.2*on/{n})':y='(ih-ih/zoom)/2':d=1:s={W}x{STORY_H}:fps={FPS}[st]")
        elif kind == "video":
            inputs += ["-stream_loop", "-1", "-ss", f"{(i * 3.7) % 4:.2f}", "-t", f"{dur:.3f}", "-i", story_file]
            sf = f"[1:v]fps={FPS},scale={W}:{STORY_H}:force_original_aspect_ratio=increase,crop={W}:{STORY_H},setsar=1,trim=duration={dur:.3f},setpts=PTS-STARTPTS[st]"
        else:
            inputs += ["-loop", "1", "-framerate", str(FPS), "-t", f"{dur:.3f}", "-i", story_file]
            z = 0.06 if self.channel == "shyam" else 0.03
            sf = (f"[1:v]scale={W * 3 // 2}:{STORY_H * 3 // 2},zoompan=z='min(1+{z}*on/({dur:.3f}*{FPS}),{1 + z})':x='iw/2-(iw/zoom/2)':"
                  f"y='ih/2-(ih/zoom/2)':d=1:s={W}x{STORY_H}:fps={FPS}[st]")
        hl = None
        if use_lip:
            inputs += ["-i", lip]
            cf = f"[2:v]fps={FPS},scale={W}:{W}:flags=lanczos,tpad=stop_mode=clone:stop_duration=3,trim=duration={dur:.3f},setpts=PTS-STARTPTS[ch0]"
            if plan["two"]:
                hl = self.highlight(line["who"])
        else:
            inputs += ["-loop", "1", "-framerate", str(FPS), "-t", f"{dur:.3f}", "-i", self.still(line["who"])]
            # A slow camera: wide on short replies, a push in towards the speaker on longer lines.
            cx, cy = [v / self.master.width for v in self.lib["face_centre_master"][line["who"]]]
            zmax = 1.06 if plan["two"] else 1.32
            cf = (f"[2:v]zoompan=z='min(1+{zmax - 1:.2f}*on/({min(dur, 3.5):.3f}*{FPS}),{zmax})':"
                  f"x='max(0,min(iw-iw/zoom,{cx:.3f}*iw-iw/zoom/2))':y='max(0,min(ih-ih/zoom,{cy:.3f}*ih-ih/zoom/2))':d=1:s={W}x{W}:fps={FPS}[ch0]")
        n_in = 3
        if hl:
            inputs += ["-loop", "1", "-framerate", str(FPS), "-t", f"{dur:.3f}", "-i", hl]
            cf += f";[ch0][{n_in}:v]overlay=0:0[ch]"; n_in += 1
        else:
            cf += ";[ch0]null[ch]"
        hook_txt = self.spec.get("hook") if i == 0 else None
        first_ov = n_in
        for f, _, _ in ovs:
            inputs += ["-loop", "1", "-framerate", str(FPS), "-t", f"{dur:.3f}", "-i", f]
        n_in += len(ovs)
        if hook_txt:
            hp = f"{self.build}/hook.png"; self.hook_overlay(hook_txt).save(hp)
            inputs += ["-loop", "1", "-framerate", str(FPS), "-t", f"{dur:.3f}", "-i", hp]; hook_in = n_in; n_in += 1
        # Cover frame (story/cover.mjs --dialogue): 2-4 huge Devanagari words over the first 0.4 s, so the opening
        # frame is thumbnail-grade; everything under it already moves.
        cover = getattr(self.a, "cover", None) if i == 0 else None
        cover = cover if cover and os.path.exists(cover) else None
        if cover:
            inputs += ["-loop", "1", "-framerate", str(FPS), "-t", "1", "-i", cover]; cover_in = n_in; n_in += 1
        inputs += ["-i", audio]
        fg = [sf, cf, f"[0:v][st]overlay=0:{STORY_Y}[v0]", f"[v0][ch]overlay=0:{CHAR_Y}[v1]"]
        last = "v1"
        if not use_lip:  # still mode: a small live waveform under the name tag shows who is talking
            col = self.lib["speakers"][line["who"]]["color"]
            right = plan["two"] and self.lib["speakers"][line["who"]].get("side") == "right"
            fg.append(f"[{n_in}:a]asplit[aout][aw];[aw]showwaves=s=300x64:mode=cline:scale=sqrt:draw=full:rate={FPS}:colors=0x{col},format=rgba[wv]")
            fg.append(f"[{last}][wv]overlay={W - 340 if right else 40}:{CHAR_Y + 100}[vw]"); last = "vw"
            amap = "[aout]"
        else:
            amap = f"{n_in}:a"
        for k, (_, a0, b0) in enumerate(ovs):
            fg.append(f"[{last}][{first_ov + k}:v]overlay=0:0:enable='between(t,{a0:.3f},{b0:.3f})'[o{k}]"); last = f"o{k}"
        if hook_txt:
            fg.append(f"[{last}][{hook_in}:v]overlay=0:0:enable='between(t,{0.36 if cover else 0},2.6)'[hk]"); last = "hk"
        if cover:
            fg.append(f"[{cover_in}:v]format=rgba,fade=t=out:st=0.4:d=0.08:alpha=1[cov]")
            fg.append(f"[{last}][cov]overlay=0:0:eof_action=pass[cv]"); last = "cv"
        fg.append(f"[{last}]format=yuv420p[vout]")
        seg = f"{self.build}/seg-{i:02d}.mp4"
        ff(*inputs, "-filter_complex", ";".join(fg), "-map", "[vout]", "-map", amap, "-c:v", "libx264", "-preset", "veryfast",
           "-crf", "20", "-r", str(FPS), "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-t", f"{dur:.3f}", seg)
        return seg, use_lip

    def run(self):
        base = self.base_layer()
        self.srt, self.t0 = [], 0.0
        segs, lips, starts = [], 0, []
        for i, line in enumerate(self.spec["lines"]):
            starts.append(self.t0)
            seg, used = self.segment(i, line, self.plan[i], base)
            segs.append(seg); lips += used; self.t0 += self.voice[i]["seconds"]
            print(f"seg {i:02d} {self.voice[i]['seconds']:.2f}s {'lipsync' if used else 'still'} {'two' if self.plan[i]['two'] else self.plan[i]['clip']}", flush=True)
        total = self.t0
        lst = f"{self.build}/segs.txt"
        open(lst, "w").write("".join(f"file '{os.path.abspath(s)}'\n" for s in segs))
        joined = f"{self.build}/joined.mp4"
        ff("-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", joined)
        music, sfx = self.soundtrack(total, starts)
        ff("-i", joined, *sum((["-f", "lavfi", "-i", s] for s in music + [x[0] for x in sfx]), []), "-filter_complex",
           self.mix(len(music), sfx, total), "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
           "-ar", "48000", "-movflags", "+faststart", self.a.out)
        if self.a.srt:
            ts = lambda t: f"{int(t // 3600):02d}:{int(t % 3600 // 60):02d}:{int(t % 60):02d},{int(round(t % 1 * 1000)) % 1000:03d}"
            open(self.a.srt, "w", encoding="utf-8").write("".join(
                f"{k + 1}\n{ts(a0)} --> {ts(b0)}\n{self.lib['speakers'][who]['name']}: {txt}\n\n" for k, (a0, b0, txt, who) in enumerate(self.srt)))
        mode = "lipsync" if lips == len(segs) else "stills" if lips == 0 else "mixed"
        meta = {"seconds": round(total, 2), "lines": len(segs), "lipsync_lines": lips, "mode": mode,
                "two_shots": sum(1 for p in self.plan if p["two"]), "ai_visuals": sorted(self.ai_visuals),
                "footage": [{k: c.get(k) for k in ("file", "source", "author", "licence", "attribution", "url")} for c in self.used_footage]}
        if self.a.meta:
            json.dump(meta, open(self.a.meta, "w"), indent=1)
        if self.a.credits and self.used_footage:
            self.add_credits()
        if not self.a.keep_build:
            shutil.rmtree(self.build, ignore_errors=True)
        print(json.dumps({"out": self.a.out, **{k: meta[k] for k in ("seconds", "mode", "lipsync_lines", "lines", "two_shots")}, "footage_clips": len(self.used_footage)}))

    def add_credits(self):
        """Real footage was shown: credit every clip in the YouTube description and the captions (in the spec file)."""
        lines = []
        for c in self.used_footage:
            if c.get("kind") == "photo":  # "Photo: <author>, <licence>, via Wikimedia Commons (<file page>)"
                lines.append(f"{c.get('attribution') or 'Photo: ' + c.get('author', '')}{' (' + c['url'] + ')' if c.get('url') else ''}")
                continue
            who = c.get("attribution") or c.get("author")
            lines.append(f"Asli mandir drishya: {who} ({c.get('licence')}{', ' + c['url'] if c.get('url') else ''})")
        credit = "\n".join(lines)
        spec = load_json(self.a.spec)
        for k in ("youtube_description", "instagram_caption", "facebook_caption"):
            if spec.get(k) and credit not in spec[k]:
                spec[k] = f"{spec[k].rstrip()}\n\n{credit}"
        json.dump(spec, open(self.a.spec, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        print(f"credits added: {len(lines)} clip(s)", flush=True)

    # ---- music + ambient SFX, all synthesized ----
    def soundtrack(self, total, starts):
        T = f"{total + 0.5:.2f}"
        if self.st["music"] == "drone":  # tanpura-like drone (Sa-Pa-Sa) + temple bells + evening ambience
            music = [f"aevalsrc='0.09*sin(2*PI*138.59*t)*(1+0.25*sin(2*PI*0.18*t))+0.06*sin(2*PI*207.65*t)*(1+0.25*sin(2*PI*0.23*t))+0.045*sin(2*PI*277.18*t)|"
                     f"0.09*sin(2*PI*138.59*t+0.4)*(1+0.25*sin(2*PI*0.21*t))+0.06*sin(2*PI*207.65*t+0.3)+0.045*sin(2*PI*277.18*t+0.2)':s=48000:d={T}",
                     f"anoisesrc=d={T}:c=brown:a=0.5:r=48000,lowpass=f=420,tremolo=f=0.12:d=0.6",  # soft evening wind
                     f"anoisesrc=d={T}:c=white:a=0.5:r=48000,bandpass=f=4700:width_type=h:w=700,tremolo=f=13:d=1,tremolo=f=0.31:d=0.9"]  # crickets
            bell = "aevalsrc='0.45*sin(2*PI*1046*t)*exp(-2.2*t)+0.25*sin(2*PI*2093*t)*exp(-3.5*t)+0.15*sin(2*PI*1568*t)*exp(-2.8*t)':s=48000:d=4"
            sfx = [(bell, 0.2, 0.8), (bell, starts[-1], 0.6)]
        else:  # soft synth pad + quiet room tone + a whoosh whenever the screen changes
            music = [f"aevalsrc='0.05*sin(2*PI*220*t)*(1+0.3*sin(2*PI*0.5*t))+0.035*sin(2*PI*277.18*t)+0.035*sin(2*PI*329.63*t)|"
                     f"0.05*sin(2*PI*220*t+0.3)*(1+0.3*sin(2*PI*0.45*t))+0.035*sin(2*PI*277.18*t+0.2)+0.035*sin(2*PI*329.63*t+0.1)':s=48000:d={T}",
                     f"anoisesrc=d={T}:c=brown:a=0.4:r=48000,lowpass=f=260"]
            whoosh = "anoisesrc=d=0.7:c=pink:a=0.7:r=48000,highpass=f=700,lowpass=f=5200,afade=t=in:d=0.28,afade=t=out:st=0.3:d=0.4"
            sfx, prev = [], None
            for i, l in enumerate(self.spec["lines"]):
                if l["top"] != prev and i:
                    sfx.append((whoosh, max(0, starts[i] - 0.2), 0.35))
                prev = l["top"]
        return music, sfx

    def mix(self, n_music, sfx, total):
        vols = [0.42, 0.10, 0.035] if self.st["music"] == "drone" else [0.30, 0.05]
        f = [f"[{k + 1}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume={vols[k]}[m{k}]" for k in range(n_music)]
        for j, (_, at, vol) in enumerate(sfx):
            ms = int(at * 1000)
            f.append(f"[{n_music + 1 + j}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume={vol},adelay={ms}|{ms}[s{j}]")
        ins = "".join(f"[m{k}]" for k in range(n_music)) + "".join(f"[s{j}]" for j in range(len(sfx)))
        f.append(f"{ins}amix=inputs={n_music + len(sfx)}:duration=longest:normalize=0,atrim=duration={total:.2f},"
                 f"afade=t=in:d=1.2,afade=t=out:st={max(0, total - 2):.2f}:d=2[bed]")
        f.append(f"[0:a][bed]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]")
        return ";".join(f)


def cmd_render(a):
    sys.path.insert(0, HERE)
    Renderer(a).run()


def main():
    p = argparse.ArgumentParser()
    p.add_argument("cmd", choices=["voice", "images", "plan", "dataset", "render"])
    p.add_argument("--spec"); p.add_argument("--channel", choices=["shyam", "epifive"]); p.add_argument("--out")
    p.add_argument("--voice"); p.add_argument("--plan"); p.add_argument("--lipsync"); p.add_argument("--images")
    p.add_argument("--visuals"); p.add_argument("--srt"); p.add_argument("--meta"); p.add_argument("--footage")
    p.add_argument("--max-minutes", default=30); p.add_argument("--keep-build", action="store_true")
    p.add_argument("--cover", help="render: transparent 1080x1920 PNG shown over the first 0.4 s (story/cover.mjs --dialogue)")
    p.add_argument("--credits", action="store_true", help="render: add real-footage credits to the spec's description/captions")
    a = p.parse_args()
    {"voice": cmd_voice, "images": cmd_images, "plan": cmd_plan, "dataset": cmd_dataset, "render": cmd_render}[a.cmd](a)


if __name__ == "__main__":
    main()
