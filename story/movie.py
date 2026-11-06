# "Movie" format: a temple's or a deity's katha told as a 2-4 part mini film of vertical Shorts (STORY.md section 7),
# spec = story/movies/<series>/part-<n>.json ("format": "movie"), series plan = story/movies/<series>/series.json,
# characters = characters/cast/cast.json (one canonical portrait + one base clip + one voice per character, reused by
# every series). Runs on the CI runner; every GPU step is one Kaggle session (story/movie_kernel.py).
#
#   python -I story/movie.py cast    --ids a,b|missing --seeds 2 --out animate/dataset        portraits to pick (GPU)
#   python -I story/movie.py voice   --spec P --out W/voice                                     edge-tts per line + fx
#   python -I story/movie.py tier    --spec P --quota quota.json                                 full|standard|lite|stills|none
#   python -I story/movie.py dataset --spec P --voice W/voice --tier T --out animate/dataset    Kaggle inputs (movie.json)
#   python -I story/movie.py render  --spec P --voice W/voice --kaggle W/kaggle --out OUT.mp4 [--meta M.json] [--small S.mp4]
#   python -I story/movie.py keep    --kaggle W/kaggle                                         new cast base clips -> library
#
# Shots: a narrator line shows the scene (its Wan clip, else its still with a slow camera move); a character's line
# cuts to that character's close-up: the lip-synced clip (humans), else the character's base clip / portrait with a
# gentle push-in (deities: never lip-sync; Khatu Shyam ji only as the sheesh). Subtitles: Devanagari (speaker's colour)
# + Roman Hinglish below; "Part n/N" title card; "Agle part mein..." teaser and a subscribe end card. Music and
# ambience are synthesized with ffmpeg (no third-party audio), ducked under the voices, -14 LUFS.
import argparse, asyncio, datetime, glob, json, math, os, re, shutil, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CAST_DIR = os.path.join(ROOT, "characters", "cast")
sys.path.insert(0, os.path.join(ROOT, "characters"))
from dialogue import edge_say, ff, find_font, hexrgb, kokoro_say, wav_len, wrap  # noqa: E402

W, H, FPS = 1080, 1920, 30
FW, FH = 576, 1024  # Kaggle frames (FLUX) and Wan clips: vertical, multiples of 32
FX = {  # per-character voice colour, after loudnorm (ffmpeg only)
    "divine": "aecho=0.8:0.6:45|75:0.22|0.14,equalizer=f=180:t=q:w=1:g=2",
    "deep": "equalizer=f=120:t=q:w=1:g=4,equalizer=f=3200:t=q:w=1:g=-2",
}
# Kaggle tiers (GPU minutes measured on the 6 Nov 2026 pilot are in animate/REPORT.md section 11).
TIERS = {
    "full": {"clips": 4, "hero": True, "lips": True},
    "standard": {"clips": 4, "hero": False, "lips": True},
    "lite": {"clips": 2, "hero": False, "lips": True},
    "stills": {"clips": 0, "hero": False, "lips": True},
}


def load(p):
    return json.load(open(p, encoding="utf-8"))


def cast():
    return load(os.path.join(CAST_DIR, "cast.json"))


def portrait_prompt(c, lib):
    if c["kind"] == "sheesh":  # STORY.md: Khatu Shyam ji only as the sheesh, the whole garland oval in frame
        frame = "vertical composition, front view, perfectly centred and symmetrical, the whole oval flower-garland frame visible"
    else:
        frame = lib["portrait"].format(bg=c.get("bg", "warm soft light"))
    return f"{c['description']}. {frame}. {lib['style']}"


def helpers(out):
    """The kernel's helper scripts and weights (flat: Kaggle skips sub-folders of a dataset)."""
    for f in ("animate/kaggle/flux_frames.py", "animate/kaggle/animate.py", "animate/kaggle/hero14b.py", "animate/kaggle/enhance.py",
              "characters/kaggle/lipsync_daily.py"):
        shutil.copy(os.path.join(ROOT, f), os.path.join(out, os.path.basename(f)))


def fresh(out):
    if os.path.isdir(out):
        shutil.rmtree(out)
    os.makedirs(out)


# ----------------------------------------------------------------- cast ----
def cmd_cast(a):
    """Kaggle inputs that only draw character portraits (seeds to choose from); `keep-portrait` stores the chosen one."""
    lib = cast()
    chars = lib["characters"]
    ids = [k for k, c in chars.items() if c["kind"] != "voice" and not os.path.exists(os.path.join(CAST_DIR, f"{k}.png"))] \
        if a.ids == "missing" else a.ids.split(",")
    fresh(a.out)
    images = []
    for k in ids:
        n = int(a.seeds) + (1 if chars[k]["kind"] in ("deity", "sheesh") else 0)  # iconography matters most: one more try
        for s in range(n):
            images.append({"id": f"cast-{k}-{s}", "prompt": portrait_prompt(chars[k], lib), "seed": 1000 + 97 * s + len(k), "w": FW, "h": FH})
    stamp = f"cast-{int(time.time())}"
    json.dump({"stamp": stamp, "settings": {"tier": "cast", "max_minutes": 60, "flux": {"size": 1024, "steps": 6}}, "images": images},
              open(f"{a.out}/movie.json", "w"), indent=1)
    helpers(a.out)
    print(json.dumps({"stamp": stamp, "characters": ids, "images": len(images)}))


# ---------------------------------------------------------------- voice ----
def all_lines(spec):
    """Every spoken line in order: scenes' lines, then the teaser and the end card. (scene index, line)."""
    out = []
    for si, sc in enumerate(spec["scenes"]):
        for l in sc["lines"]:
            out.append((si, l))
    out.append(("teaser", {"who": "narrator", **spec["teaser"]}))
    out.append(("end", {"who": "narrator", **spec["endcard"]}))
    return out


def cmd_voice(a):
    spec, chars = load(a.spec), cast()["characters"]
    os.makedirs(a.out, exist_ok=True)
    lines, engine = all_lines(spec), "edge-tts"
    meta = []
    for i, (si, l) in enumerate(lines):
        v = chars[l["who"]]["voice"]
        raw, out = f"{a.out}/{i:02d}-raw", f"{a.out}/line-{i:02d}.wav"
        try:
            asyncio.run(edge_say(l["tts"], v, raw + ".mp3")); src = raw + ".mp3"
        except Exception:
            kokoro_say(l["tts"], {"kokoro": "hf_alpha" if "Swara" in v["edge"] else "hm_omega"}, raw + ".wav", "hi"); src = raw + ".wav"
            engine = "kokoro (edge-tts failed)"
        nxt = lines[i + 1] if i + 1 < len(lines) else None
        if nxt is None:
            pause = 1.4
        elif nxt[0] != si:
            pause = 0.75  # scene change
        elif nxt[1]["who"] != l["who"]:
            pause = 0.5 + (0.12 if l["tts"].rstrip().endswith("?") else 0)
        else:
            pause = 0.3
        fx = FX.get(v.get("fx", ""), "")
        ff("-i", src, "-af",
           "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,"
           "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,"
           f"loudnorm=I=-18:TP=-2:LRA=11{',' + fx if fx else ''},aresample=24000,adelay=90:all=1,apad=pad_dur={pause:.2f}",
           "-ac", "1", "-ar", "24000", out)
        for f in (raw + ".mp3", raw + ".wav"):
            if os.path.exists(f):
                os.remove(f)
        secs = wav_len(out)
        meta.append({"i": i, "scene": si, "who": l["who"], "file": os.path.basename(out), "seconds": round(secs, 3),
                     "speech_s": round(secs - pause - 0.09, 3), "pause_s": pause})
    total = sum(m["seconds"] for m in meta) + 2.0  # + the title beat
    json.dump({"engine": engine, "total_s": round(total, 2), "lines": meta}, open(f"{a.out}/voice.json", "w"), indent=1)
    print(json.dumps({"voice": engine, "lines": len(meta), "total_s": round(total, 1)}))


# ----------------------------------------------------------------- tier ----
def pick_tier(q, hero_ok, now=None):
    """GPU tier for this part from the Kaggle quota, keeping the daily Shorts' hours until the weekly reset:
    evening darshan ~1.33 h, status ~0.5 h on festival days, noon Dadi-Chhotu ~0.15 h, so ~2.4 h a day is reserved
    (the morning Short is the movie itself). Measured costs per tier: animate/REPORT.md section 11."""
    now = now or datetime.datetime.now(datetime.timezone.utc)
    left = float(q.get("left", 0))
    try:
        reset = datetime.datetime.fromisoformat(q["refreshAt"].replace("Z", "+00:00"))
        days = max(1, math.ceil((reset - now).total_seconds() / 86400))
    except Exception:
        days = 7
    spare = left - (2.4 * days + 1.0)
    for tier, need in (("full", 1.9), ("standard", 1.4), ("lite", 0.95), ("stills", 0.5)):
        if tier == "full" and not hero_ok:
            continue
        if spare >= need:
            return tier, round(spare, 2), days
    return "none", round(spare, 2), days


def cmd_tier(a):
    spec = load(a.spec)
    q = load(a.quota)
    tier, spare, days = pick_tier(q, bool(spec.get("hero_clip")))
    if a.force:
        tier = a.force
    print(json.dumps({"tier": tier, "spare_h": spare, "days_to_reset": days, "left_h": q.get("left")}))


# -------------------------------------------------------------- dataset ----
def scene_prompt(sc, spec, chars):
    who = [chars[c]["wide"] for c in sc.get("cast", []) if c in chars and chars[c].get("wide")]
    people = f" Characters: {'; '.join(who)}." if who else ""
    return (f"{sc['prompt']}.{people} Vertical 9:16 cinematic frame, the main subject in the middle of the frame. "
            f"{spec.get('style') or cast()['style']}")


def motion(sc, chars):
    deity = any(chars.get(c, {}).get("kind") in ("deity", "sheesh") for c in sc.get("cast", [])) or sc.get("deity")
    cam = {"in": "the camera slowly and smoothly dollies in", "out": "the camera slowly and smoothly pulls back",
           "pan": "the camera slowly tracks sideways"}.get(sc.get("motion", "in"), "the camera slowly dollies in")
    if deity:
        cam = "a very slow, steady push-in"
    guard = ("Divine figures stay perfectly still and serene: their faces, eyes, hands and ornaments do not move or change shape; "
             "only light, cloth, petals and smoke move") if deity else \
        "Faces stay the same people throughout, with subtle natural movement such as breathing and blinking; no new people appear"
    return (f"{sc['prompt']}. {cam}, steady and continuous, no cut, no shake. Motion: {sc.get('animate', 'gentle natural movement')}. "
            f"{guard}. 3D animated mythological film, cinematic warm key light and soft rim light, smooth natural motion")


def frames_for(seconds):
    return min(97, max(81, 4 * math.ceil((math.ceil(seconds / 1.25 * 24) - 1) / 4) + 1))  # 97 = 4 s raw, ~5 s after RIFE


def cmd_dataset(a):
    spec, lib = load(a.spec), cast()
    chars = lib["characters"]
    voice = load(f"{a.voice}/voice.json")["lines"]
    tier = TIERS.get(a.tier)
    if not tier:
        raise SystemExit(f"tier {a.tier}: no GPU work")
    fresh(a.out)
    images, clips, stills, lips, qa = [], [], [], [], []
    # Scene frames (+ the teaser's), all on the GPU with FLUX.1-schnell.
    for si, sc in enumerate(spec["scenes"]):
        images.append({"id": f"s{si}", "prompt": scene_prompt(sc, spec, chars), "seed": int(sc.get("seed", 7 + 13 * si)), "w": FW, "h": FH})
    images.append({"id": "teaser", "prompt": scene_prompt(spec["teaser"], spec, chars), "seed": 77, "w": FW, "h": FH})
    # Animated scenes: the ones marked `animate`, the `hero` first, up to the tier's count; the rest are upscaled stills.
    secs = {}
    for v in voice:
        if isinstance(v["scene"], int):
            secs[v["scene"]] = secs.get(v["scene"], 0) + v["seconds"]
    marked = [si for si, sc in enumerate(spec["scenes"]) if sc.get("animate")]
    marked.sort(key=lambda si: not spec["scenes"][si].get("hero"))
    picked = marked[:tier["clips"]]
    for si in picked:
        sc = spec["scenes"][si]
        wide = sum(v["seconds"] for v, (s2, l) in zip(voice, all_lines(spec)) if s2 == si and shot_of(l, sc, chars, lib_has_portrait) == "wide")
        clips.append({"id": f"s{si}", "image": f"s{si}", "prompt": motion(sc, chars), "frames": frames_for(min(6.5, max(3.5, wide))),
                      "seconds": round(min(6.5, max(3.5, wide)), 2), "seed": 42 + si, **({"hero": True} if sc.get("hero") and tier["hero"] else {})})
    stills = [f"s{si}" for si in range(len(spec["scenes"])) if si not in picked] + ["teaser"]
    # Close-up lines of characters with lip-sync: their base clip comes from the library, or is made now from the portrait.
    speaking = []
    for i, (si, l) in enumerate(all_lines(spec)):
        c = chars.get(l["who"], {})
        sc = spec["scenes"][si] if isinstance(si, int) else {}
        if tier["lips"] and c.get("lipsync") and isinstance(si, int) and shot_of(l, sc, chars, lib_has_portrait) == "close":
            lips.append({"id": f"lip-{i:02d}", "who": l["who"], "audio": f"line-{i:02d}.wav", "seconds": voice[i]["seconds"]})
            shutil.copy(f"{a.voice}/line-{i:02d}.wav", f"{a.out}/line-{i:02d}.wav")
            if l["who"] not in speaking:
                speaking.append(l["who"])
        names = [n for n in spec.get("names", []) if n in l["tts"]]
        qa.append({"id": f"{i:02d}", "who": l["who"], "audio": f"line-{i:02d}.wav", "text": l["tts"], "names": names})
        if not os.path.exists(f"{a.out}/line-{i:02d}.wav"):
            shutil.copy(f"{a.voice}/line-{i:02d}.wav", f"{a.out}/line-{i:02d}.wav")
    shutil.copy(f"{a.voice}/voice.json", f"{a.out}/voice.json")
    for who in speaking + [c for c in spec.get("cast", []) if chars.get(c, {}).get("kind") in ("deity", "sheesh")]:
        lib_clip = os.path.join(CAST_DIR, "clips", f"{who}.mp4")
        portrait = os.path.join(CAST_DIR, f"{who}.png")
        if os.path.exists(lib_clip):
            if who in speaking:
                shutil.copy(lib_clip, f"{a.out}/castclip-{who}.mp4")
        elif os.path.exists(portrait) and tier["clips"] > 0 and not any(c["id"] == f"cast-{who}" for c in clips):
            shutil.copy(portrait, f"{a.out}/cast-{who}.png")
            deity = chars[who]["kind"] in ("deity", "sheesh")
            act = ("only the soft divine glow, the flower garlands and the diya light move gently; the face stays perfectly still"
                   if deity else "the person breathes calmly and blinks naturally, the head stays still and faces the camera, the mouth stays closed")
            clips.append({"id": f"cast-{who}", "image": f"cast-{who}.png", "frames": 81, "seconds": 4.2, "seed": 5,
                          "prompt": f"{chars[who]['description']}. A locked-off camera, a very slow subtle push-in. Motion: {act}, "
                                    "hair and cloth stir slightly. The face keeps the same identity throughout. 3D animated film, warm cinematic light"})
    settings = {"tier": a.tier, "max_minutes": int(a.max_minutes), "flux": {"size": 1024, "steps": 6}, "reserve_minutes": 14 if lips else 6,
                "anim": {"width": FW, "height": FH, "steps": 25,
                         "hero14b": {"quant": "Q4_K_S", "sizes": [[480, 832]], "steps": 4, "out_size": [1920, 1080]} if tier["hero"] else False}}
    stamp = f"{spec['slug']}-{int(time.time())}"
    json.dump({"stamp": stamp, "settings": settings, "images": images, "clips": clips, "stills": stills, "lips": lips, "qa": qa},
              open(f"{a.out}/movie.json", "w"), ensure_ascii=False, indent=1)
    helpers(a.out)
    print(json.dumps({"stamp": stamp, "tier": a.tier, "images": len(images), "clips": [c["id"] for c in clips], "lips": len(lips), "qa": len(qa)}))


def lib_has_portrait(who):
    return os.path.exists(os.path.join(CAST_DIR, f"{who}.png"))


def shot_of(l, sc, chars, has_portrait):
    """wide = the scene's picture, close = the speaker's close-up."""
    if l.get("shot") in ("wide", "close"):
        return l["shot"] if l["shot"] == "wide" or has_portrait(l["who"]) else "wide"
    c = chars.get(l["who"], {})
    if c.get("kind") in (None, "voice"):
        return "wide"
    if sc and sc.get("lines") and sc["lines"][0] is l and len(sc["lines"]) > 1:
        return "wide"  # establish the place first
    return "close" if has_portrait(l["who"]) else "wide"


# ------------------------------------------------------------- keep ----
def cmd_keep(a):
    """New cast base clips made in this session go into the library (characters/cast/clips/<who>.mp4), so the next part
    and every later series reuse them instead of spending GPU time again."""
    os.makedirs(os.path.join(CAST_DIR, "clips"), exist_ok=True)
    kept = []
    for f in glob.glob(f"{a.kaggle}/clips/cast-*.mp4"):
        who = os.path.basename(f)[5:-4]
        dst = os.path.join(CAST_DIR, "clips", f"{who}.mp4")
        if not os.path.exists(dst) and os.path.getsize(f) > 20000:
            ff("-i", f, "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "21", "-pix_fmt", "yuv420p", dst)
            kept.append(who)
    print(json.dumps({"kept": kept}))


def cmd_pick(a):
    """A person chose the portraits: --choose barbarik=1,krishna=0 copies <kaggle>/frames/cast-<id>-<n>.png to the library
    (characters/cast/<id>.png, the canonical identity from then on), then redraws the character sheet."""
    for pair in a.choose.split(","):
        who, n = pair.split("=")
        src = os.path.join(a.kaggle, "frames", f"cast-{who}-{n}.png")
        dst = os.path.join(CAST_DIR, f"{who}.png")
        if os.path.exists(dst) and not a.force:
            raise SystemExit(f"{dst} exists: a canonical portrait is never replaced (use --force only with the owner's ok)")
        shutil.copy(src, dst)
    cmd_sheet(a)


def cmd_sheet(a):
    """characters/cast/character-sheet.png: every canonical portrait with its name, kind and voice."""
    from PIL import Image, ImageDraw
    lib = cast()
    items = [(k, c) for k, c in lib["characters"].items() if os.path.exists(os.path.join(CAST_DIR, f"{k}.png"))]
    if not items:
        return
    cols, tw, th = 5, 288, 512
    rows = math.ceil(len(items) / cols)
    sheet = Image.new("RGB", (cols * tw, rows * (th + 96) + 90), (24, 10, 6))
    d = ImageDraw.Draw(sheet)
    f = Fonts()
    d.text((24, 22), "Shyam Premi SN: movie character library (canonical portraits)", font=f.get("bold", 38), fill=(255, 214, 102))
    for i, (k, c) in enumerate(items):
        x, y = (i % cols) * tw, 90 + (i // cols) * (th + 96)
        sheet.paste(Image.open(os.path.join(CAST_DIR, f"{k}.png")).convert("RGB").resize((tw - 8, th - 8)), (x + 4, y + 4))
        d.text((x + 10, y + th + 4), c["name"], font=f.get("bold", 26), fill=hexrgb(c["color"]))
        v = c.get("voice", {})
        d.text((x + 10, y + th + 40), f"{c['kind']} | {v.get('edge', '').replace('hi-IN-', '').replace('Neural', '')} {v.get('pitch', '')} {v.get('rate', '')}",
               font=f.get("bold", 18), fill=(220, 220, 220))
    out = os.path.join(CAST_DIR, "character-sheet.png")
    sheet.save(out, optimize=True)
    print(json.dumps({"sheet": out, "characters": [k for k, _ in items]}))


# --------------------------------------------------------------- render ----
FONT_DEV = os.path.join(ROOT, "brand", "fonts", "TiroDevanagariHindi-Regular.ttf")
FONT_TITLE = os.path.join(ROOT, "brand", "fonts", "YatraOne-Regular.ttf")


class Fonts:
    def __init__(self):
        from PIL import ImageFont, features
        self.ImageFont = ImageFont
        self.raqm = features.check("raqm")  # Devanagari needs complex shaping (libraqm + libfribidi on the runner)
        self.bold = find_font(os.environ.get("CHAR_FONT_BOLD"), "DejaVuSans-Bold.ttf", "segoeuib.ttf", "arialbd.ttf")
        self.cache = {}

    def get(self, kind, size):
        k = (kind, size)
        if k not in self.cache:
            path = {"dev": FONT_DEV, "title": FONT_TITLE}.get(kind, self.bold)
            kw = {"layout_engine": self.ImageFont.Layout.RAQM} if kind in ("dev", "title") and self.raqm else {}
            self.cache[k] = self.ImageFont.truetype(path, size, **kw)
        return self.cache[k]


class Movie:
    def __init__(self, a):
        self.a = a
        self.spec, self.lib = load(a.spec), cast()
        self.chars = self.lib["characters"]
        self.voice = load(f"{a.voice}/voice.json")["lines"]
        self.k = a.kaggle or ""
        self.f = Fonts()
        self.build = os.path.join(os.path.dirname(os.path.abspath(a.out)), f"build-{os.path.basename(a.out)[:-4]}")
        os.makedirs(self.build, exist_ok=True)
        self.used = {"clips": [], "lip": 0, "stills": 0, "closeups": 0}
        self.photos = []  # real temple photos shown (credited in the spec's description and captions)

    # ---- assets ----
    def kfile(self, *parts):
        p = os.path.join(self.k, *parts)
        return p if self.k and os.path.exists(p) and os.path.getsize(p) > 1000 else None

    def scene_still(self, key):
        """Upscaled still (2160 px) > raw FLUX frame > a calm gradient."""
        p = self.kfile("stills", f"{key}.jpg") or self.kfile("frames", f"{key}.png")
        if p:
            return p
        from PIL import Image, ImageDraw
        p = f"{self.build}/fallback.png"
        if not os.path.exists(p):
            im = Image.new("RGB", (W, H), (40, 14, 8))
            d = ImageDraw.Draw(im)
            for y in range(H):
                d.line([0, y, W, y], fill=(int(60 - 30 * y / H), int(22 - 10 * y / H), 10))
            im.save(p)
        return p

    def portrait(self, who):
        p = os.path.join(CAST_DIR, f"{who}.png")
        return p if os.path.exists(p) else None

    def base_clip(self, who):
        return self.kfile("clips", f"cast-{who}.mp4") or (lambda p: p if os.path.exists(p) else None)(os.path.join(CAST_DIR, "clips", f"{who}.mp4"))

    # ---- overlays ----
    def header(self):
        from PIL import Image, ImageDraw
        im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        for y in range(0, 230):  # soft top gradient for legibility
            d.line([0, y, W, y], fill=(0, 0, 0, int(150 * (1 - y / 230))))
        logo = os.path.join(ROOT, "brand", "logo.png")
        if os.path.exists(logo):
            im.alpha_composite(Image.open(logo).convert("RGBA").resize((104, 104)), (28, 26))
        d.text((146, 34), self.spec["series_title"], font=self.f.get("bold", 34), fill=(255, 231, 168), stroke_width=2, stroke_fill=(0, 0, 0))
        badge = f"PART {self.spec['part']}/{self.spec['parts']}"
        bf = self.f.get("bold", 34)
        bw = d.textlength(badge, font=bf)
        d.rounded_rectangle([146, 82, 146 + bw + 36, 130], 22, fill=(176, 32, 24, 235))
        d.text((164, 87), badge, font=bf, fill=(255, 255, 255))
        if self.spec.get("ai_label", True):
            lf = self.f.get("bold", 22)
            t = "AI chitra (sanketik)"
            d.text((W - d.textlength(t, font=lf) - 28, 40), t, font=lf, fill=(255, 255, 255, 170))
        return im

    def subtitle(self, line, name):
        from PIL import Image, ImageDraw
        c = self.chars[line["who"]]
        col = hexrgb(c["color"])
        im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        dev = self.f.raqm
        fd, fr = self.f.get("dev", 58), self.f.get("bold", 36)
        rows_d = wrap(d, line["tts"], fd, W - 260) if dev else []
        rows_r = wrap(d, line["sub"], fr if dev else self.f.get("bold", 46), W - 260)
        rh = 74 * len(rows_d) + (48 if dev else 60) * len(rows_r)
        y0 = H - 330 - rh
        for y in range(y0 - 120, H):  # bottom gradient
            d.line([0, y, W, y], fill=(0, 0, 0, int(min(185, 185 * (y - y0 + 120) / 220))))
        if name:
            nf = self.f.get("bold", 36)
            tw = d.textlength(name, font=nf)
            d.rounded_rectangle([46, y0 - 70, 46 + tw + 70, y0 - 14], 28, fill=col + (235,))
            d.ellipse([62, y0 - 52, 82, y0 - 32], fill=(255, 255, 255))
            d.text((92, y0 - 66), name, font=nf, fill=(20, 20, 20))
        y = y0
        for t in rows_d:
            d.text(((W - d.textlength(t, font=fd)) // 2, y), t, font=fd, fill=col, stroke_width=3, stroke_fill=(0, 0, 0))
            y += 74
        rf = fr if dev else self.f.get("bold", 46)
        rcol = (235, 235, 235) if dev else col
        for t in rows_r:
            d.text(((W - d.textlength(t, font=rf)) // 2, y + 4), t, font=rf, fill=rcol, stroke_width=2, stroke_fill=(0, 0, 0))
            y += 48 if dev else 60
        return im

    def title_card(self):
        from PIL import Image, ImageDraw
        im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        d.rectangle([0, 0, W, H], fill=(10, 4, 2, 120))
        tf = self.f.get("title", 92)
        rows = wrap(d, self.spec["series_title"], tf, W - 140)
        y = 640
        for t in rows:
            d.text(((W - d.textlength(t, font=tf)) // 2, y), t, font=tf, fill=(255, 214, 102), stroke_width=4, stroke_fill=(40, 10, 0))
            y += 112
        pf = self.f.get("bold", 64)
        badge = f"PART {self.spec['part']} / {self.spec['parts']}"
        bw = d.textlength(badge, font=pf)
        d.rounded_rectangle([(W - bw) // 2 - 36, y + 30, (W + bw) // 2 + 36, y + 120], 40, fill=(176, 32, 24, 240))
        d.text(((W - bw) // 2, y + 38), badge, font=pf, fill=(255, 255, 255))
        sf = self.f.get("bold", 54)
        for t in wrap(d, self.spec["title"], sf, W - 160):
            y += 76
            d.text(((W - d.textlength(t, font=sf)) // 2, y + 110), t, font=sf, fill=(255, 245, 225), stroke_width=3, stroke_fill=(0, 0, 0))
        return im

    def teaser_card(self, kind):
        from PIL import Image, ImageDraw
        im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        last = self.spec["part"] >= self.spec["parts"]
        if kind == "teaser":
            t = "AGLE PART MEIN..." if not last else "AGLI SERIES MEIN..."
            f = self.f.get("bold", 76)
            d.rounded_rectangle([60, 300, W - 60, 420], 40, fill=(176, 32, 24, 230))
            d.text(((W - d.textlength(t, font=f)) // 2, 316), t, font=f, fill=(255, 255, 255))
            return im
        d.rectangle([0, 0, W, H], fill=(20, 6, 4, 235))
        logo = os.path.join(ROOT, "brand", "logo.png")
        if os.path.exists(logo):
            im.alpha_composite(Image.open(logo).convert("RGBA").resize((360, 360)), ((W - 360) // 2, 330))
        y = 760
        nxt = self.spec.get("next_label") or (f"Part {self.spec['part'] + 1}/{self.spec['parts']}: kal subah 7 baje" if not last else "Nayi series jald")
        for t, size, col in ((nxt, 58, (255, 214, 102)), ("Like  |  Share  |  Subscribe", 62, (255, 255, 255)),
                             ("Shyam Premi SN", 52, (255, 190, 120))):
            f = self.f.get("bold", size)
            for row in wrap(d, t, f, W - 120):
                d.text(((W - d.textlength(row, font=f)) // 2, y), row, font=f, fill=col, stroke_width=3, stroke_fill=(0, 0, 0))
                y += size + 30
            y += 30
        return im

    # ---- visual tracks ----
    def wide_track(self, si, dur):
        """The scene's picture for all its wide shots, as one track: the Wan clip (slowed up to 1.25x, then its last frame
        held with the camera still moving), else the still with a slow Ken Burns move."""
        out = f"{self.build}/wide-{si}.mp4"
        sc = self.spec["scenes"][si] if isinstance(si, int) else self.spec["teaser"]
        key = f"s{si}" if isinstance(si, int) else "teaser"
        clip = self.kfile("clips", f"{key}.mp4") if isinstance(si, int) else None
        n = max(1, round(dur * FPS))
        mv = sc.get("motion", "in")
        if clip:
            cl = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", clip],
                                      capture_output=True, text=True).stdout.strip() or 4)
            k = min(1.25, max(1.0, dur / max(0.5, cl)))
            ff("-i", clip, "-filter_complex",
               f"[0:v]setpts={k:.3f}*PTS,fps={FPS},scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1,"
               f"tpad=stop_mode=clone:stop_duration={dur + 1:.2f},trim=duration={dur:.3f},"
               f"zoompan=z='1+0.05*on/{n}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s={W}x{H}:fps={FPS},format=yuv420p[v]",
               "-map", "[v]", "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", out)
            self.used["clips"].append(key)
            return out
        still = self.scene_still(key)
        if isinstance(si, int) and sc.get("real") and self.spec.get("temple"):
            # Establishing shot of the real temple: a licence-safe photo from footage/<temple>/ (credited on upload).
            from dialogue import footage_for
            photos = [c for c in footage_for(self.spec["temple"]) if c["kind"] == "photo"]
            if photos:
                still = photos[si % len(photos)]["file"]
                self.photos.append(photos[si % len(photos)])
        z = {"in": f"1+0.12*on/{n}", "out": f"1.12-0.12*on/{n}"}.get(mv, "1.10")
        x = f"(iw-iw/zoom)*(0.15+0.7*on/{n})" if mv == "pan" else "iw/2-(iw/zoom/2)"
        ff("-loop", "1", "-framerate", str(FPS), "-t", f"{dur:.3f}", "-i", still, "-filter_complex",
           f"[0:v]scale={W * 2}:{H * 2}:force_original_aspect_ratio=increase,crop={W * 2}:{H * 2},setsar=1,"
           f"zoompan=z='{z}':x='{x}':y='ih/2-(ih/zoom/2)':d=1:s={W}x{H}:fps={FPS},format=yuv420p[v]",
           "-map", "[v]", "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-t", f"{dur:.3f}", out)
        self.used["stills"] += 1
        return out

    def close_shot(self, i, who, dur):
        """Lip-synced clip > base clip (gentle motion) > portrait with a slow push-in."""
        out = f"{self.build}/close-{i:02d}.mp4"
        lip = self.kfile("lip", f"lip-{i:02d}.mp4")
        src, kind = (lip, "lip") if lip else ((self.base_clip(who), "base") if self.base_clip(who) else (self.portrait(who), "still"))
        n = max(1, round(dur * FPS))
        push = f"zoompan=z='1.04+0.06*on/{n}':x='iw/2-(iw/zoom/2)':y='ih*0.42-(ih/zoom*0.42)':d=1:s={W}x{H}:fps={FPS}"
        if kind == "still":
            ff("-loop", "1", "-framerate", str(FPS), "-t", f"{dur:.3f}", "-i", src, "-filter_complex",
               f"[0:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1,{push},format=yuv420p[v]",
               "-map", "[v]", "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-t", f"{dur:.3f}", out)
        else:
            loop = [] if kind == "lip" else ["-stream_loop", "-1"]  # base clip: loop (it is calm); lip clip: exact length
            ff(*loop, "-i", src, "-filter_complex",
               f"[0:v]fps={FPS},scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1,"
               f"tpad=stop_mode=clone:stop_duration={dur + 1:.2f},trim=duration={dur:.3f},{push},format=yuv420p[v]",
               "-map", "[v]", "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", out)
        self.used["lip" if kind == "lip" else "closeups"] += 1
        return out

    # ---- assemble ----
    def run(self):
        from PIL import Image
        lines = all_lines(self.spec)
        hdr = self.header()
        shots = []  # (visual mp4, duration, overlay png)
        # Wide time per scene first, so each scene gets one continuous wide track.
        plan = []
        for i, (si, l) in enumerate(lines):
            sc = self.spec["scenes"][si] if isinstance(si, int) else {}
            kind = "teaser" if si == "teaser" else "end" if si == "end" else shot_of(l, sc, self.chars, lambda w: bool(self.portrait(w)))
            plan.append((i, si, l, kind, self.voice[i]["seconds"]))
        plan[0] = (*plan[0][:4], plan[0][4] + 2.0)  # the title beat rides on the first shot (silence before line 1)
        wide_need = {}
        for i, si, l, kind, d in plan:
            if kind in ("wide", "teaser"):
                wide_need[si] = wide_need.get(si, 0) + d
        tracks = {si: [self.wide_track(si, d), 0.0] for si, d in wide_need.items()}
        title_png = f"{self.build}/title.png"
        t = hdr.copy(); t.alpha_composite(self.title_card()); t.save(title_png)
        srt, t0 = [], 0.0
        segs = []
        for i, si, l, kind, d in plan:
            first = i == 0
            name = None if l["who"] == "narrator" else self.chars[l["who"]]["name"]
            ov = hdr.copy()
            if kind == "end":
                ov.alpha_composite(self.teaser_card("end"))
            elif kind == "teaser":
                ov.alpha_composite(self.teaser_card("teaser"))
            ov.alpha_composite(self.subtitle(l, name))
            ovp = f"{self.build}/ov-{i:02d}.png"; ov.save(ovp)
            if kind in ("wide", "teaser"):
                src, off = tracks[si]
                tracks[si][1] += d
                vis = f"{self.build}/cut-{i:02d}.mp4"
                ff("-ss", f"{off:.3f}", "-i", src, "-t", f"{d:.3f}", "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-an", vis)
            elif kind == "end":
                vis = self.close_or_logo(i, d)
            else:
                vis = self.close_shot(i, l["who"], d)
            seg = f"{self.build}/seg-{i:02d}.mp4"
            inputs = ["-i", vis, "-loop", "1", "-framerate", str(FPS), "-t", f"{d:.3f}", "-i", ovp]
            fg = "[0:v][1:v]overlay=0:0"
            delay = 2.0 if first else 0.0
            if first:
                inputs += ["-loop", "1", "-framerate", str(FPS), "-t", "2.6", "-i", title_png]
                fg += "[a1];[a1][2:v]overlay=0:0:enable='lt(t,2.6)'"
            ff(*inputs, "-filter_complex", f"{fg},format=yuv420p[v]", "-map", "[v]", "-c:v", "libx264", "-preset", "veryfast",
               "-crf", "18", "-r", str(FPS), "-t", f"{d:.3f}", seg)
            segs.append(seg)
            srt.append((t0 + delay + 0.09, t0 + d - self.voice[i]["pause_s"] + 0.05, l["sub"], name))
            t0 += d
        lst = f"{self.build}/segs.txt"
        open(lst, "w").write("".join(f"file '{os.path.abspath(s)}'\n" for s in segs))
        joined = f"{self.build}/joined.mp4"
        ff("-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", joined)
        voice = self.voice_track(plan)
        self.mix(joined, voice, t0, plan)
        if self.a.srt:
            ts = lambda x: f"{int(x // 3600):02d}:{int(x % 3600 // 60):02d}:{int(x % 60):02d},{int(round(x % 1 * 1000)) % 1000:03d}"
            open(self.a.srt, "w", encoding="utf-8").write("".join(
                f"{k + 1}\n{ts(a0)} --> {ts(b0)}\n{(n + ': ') if n else ''}{txt}\n\n" for k, (a0, b0, txt, n) in enumerate(srt)))
        meta = {"seconds": round(t0, 2), "shots": len(plan), "animated_scenes": sorted(set(self.used["clips"])), "lip_lines": self.used["lip"],
                "closeups_no_lip": self.used["closeups"], "still_tracks": self.used["stills"], "devanagari_subtitles": self.f.raqm}
        if self.a.meta:
            json.dump(meta, open(self.a.meta, "w"), indent=1)
        if self.a.small:
            self.small_copy(t0)
        if self.photos:  # "Photo: <author>, <licence>, via Wikimedia Commons (<url>)" lines, like the dialogue Shorts
            nl = chr(10)
            credit = nl.join(sorted({f"{c.get('attribution') or 'Photo: ' + c.get('author', '')}{' (' + c['url'] + ')' if c.get('url') else ''}" for c in self.photos}))
            spec = load(self.a.spec)
            for k in ("youtube_description", "instagram_caption", "facebook_caption"):
                if spec.get(k) and credit not in spec[k]:
                    spec[k] = spec[k].rstrip() + nl + nl + credit
            open(self.a.spec, "w", encoding="utf-8").write(json.dumps(spec, ensure_ascii=False, indent=2) + nl)
            meta["real_photos"] = len(self.photos)
        if not self.a.keep_build:
            shutil.rmtree(self.build, ignore_errors=True)
        print(json.dumps({"out": self.a.out, **meta}))

    def close_or_logo(self, i, d):
        """End card background: the teaser frame, dimmed by the card itself."""
        out = f"{self.build}/endbg-{i:02d}.mp4"
        still = self.scene_still("teaser")
        ff("-loop", "1", "-framerate", str(FPS), "-t", f"{d:.3f}", "-i", still, "-filter_complex",
           f"[0:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1,gblur=sigma=18,format=yuv420p[v]",
           "-map", "[v]", "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-t", f"{d:.3f}", out)
        return out

    def voice_track(self, plan):
        out = f"{self.build}/voice.wav"
        lst = f"{self.build}/voice.txt"
        sil = f"{self.build}/title-silence.wav"
        ff("-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", "2.0", sil)
        files = [sil] + [os.path.join(self.a.voice, self.voice[i]["file"]) for i, *_ in plan]
        open(lst, "w").write("".join(f"file '{os.path.abspath(f)}'\n" for f in files))
        ff("-f", "concat", "-safe", "0", "-i", lst, "-ar", "48000", "-ac", "2", out)
        return out

    def mix(self, video, voice, total, plan):
        """Tanpura-like drone + per-scene ambience (wind/birds, palace hush, battlefield drums, temple bells) + a low
        boom on the cliffhanger, all synthesized; ducked under the voices (sidechain); -14 LUFS."""
        T = f"{total + 0.5:.2f}"
        amb = self.spec.get("music", "devotional")
        beds = [
            f"aevalsrc='0.09*sin(2*PI*138.59*t)*(1+0.25*sin(2*PI*0.18*t))+0.06*sin(2*PI*207.65*t)*(1+0.2*sin(2*PI*0.23*t))+0.04*sin(2*PI*277.18*t)|"
            f"0.09*sin(2*PI*138.59*t+0.4)*(1+0.25*sin(2*PI*0.21*t))+0.06*sin(2*PI*207.65*t+0.3)+0.04*sin(2*PI*277.18*t+0.2)':s=48000:d={T}",
            f"anoisesrc=d={T}:c=brown:a=0.5:r=48000,lowpass=f=420,tremolo=f=0.12:d=0.6",
        ]
        vols = [0.40, 0.08]
        if amb == "epic":  # slow low drum pulse under the story (synthesized, ~66 bpm)
            beds.append(f"aevalsrc='0.5*sin(2*PI*58*t)*exp(-7*mod(t,0.91))+0.25*sin(2*PI*92*t)*exp(-11*mod(t+0.455,0.91))':s=48000:d={T}")
            vols.append(0.16)
        sfx = []
        bell = "aevalsrc='0.45*sin(2*PI*1046*t)*exp(-2.2*t)+0.25*sin(2*PI*2093*t)*exp(-3.5*t)+0.15*sin(2*PI*1568*t)*exp(-2.8*t)':s=48000:d=4"
        boom = "aevalsrc='0.9*sin(2*PI*48*t)*exp(-2.6*t)+0.3*sin(2*PI*96*t)*exp(-4*t)':s=48000:d=3"
        t, prev = 0.0, None
        for i, si, l, kind, d in plan:
            if si != prev:
                if kind == "teaser":
                    sfx.append((boom, max(0, t - 0.1), 0.7))
                elif isinstance(si, int) and si > 0:
                    sfx.append((bell, t, 0.25))
            prev = si
            t += d
        sfx.insert(0, (bell, 0.1, 0.7))
        n = len(beds)
        ins = sum((["-f", "lavfi", "-i", s] for s in beds + [x[0] for x in sfx]), [])
        f = [f"[{k + 2}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume={vols[k]}[m{k}]" for k in range(n)]
        for j, (_, at, vol) in enumerate(sfx):
            ms = int(at * 1000)
            f.append(f"[{n + 2 + j}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume={vol},adelay={ms}|{ms}[s{j}]")
        f.append("".join(f"[m{k}]" for k in range(n)) + "".join(f"[s{j}]" for j in range(len(sfx))) +
                 f"amix=inputs={n + len(sfx)}:duration=longest:normalize=0,atrim=duration={total:.2f},afade=t=in:d=1.0,"
                 f"afade=t=out:st={max(0, total - 2):.2f}:d=2[bed]")
        f.append("[1:a]aformat=sample_rates=48000:channel_layouts=stereo,asplit=2[vo][sc]")
        f.append("[bed][sc]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[duck]")
        f.append("[vo][duck]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]")
        ff("-i", video, "-i", voice, *ins, "-filter_complex", ";".join(f), "-map", "0:v", "-map", "[a]", "-c:v", "copy",
           "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", "-t", f"{total:.3f}", self.a.out)

    def small_copy(self, total):
        """A copy under the media Worker's 25 MB limit (Instagram publishes from that URL): 720x1280 at the bitrate
        that fits 23 MB."""
        kbps = max(600, int(23 * 8192 / max(1.0, total)) - 140)
        ff("-i", self.a.out, "-vf", "scale=720:1280", "-c:v", "libx264", "-preset", "slow", "-b:v", f"{kbps}k", "-maxrate", f"{kbps}k",
           "-bufsize", f"{2 * kbps}k", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", self.a.small)


def cmd_render(a):
    Movie(a).run()


def main():
    p = argparse.ArgumentParser()
    p.add_argument("cmd", choices=["cast", "pick", "sheet", "voice", "tier", "dataset", "render", "keep"])
    p.add_argument("--spec"); p.add_argument("--out"); p.add_argument("--voice"); p.add_argument("--kaggle"); p.add_argument("--quota")
    p.add_argument("--tier", default="standard"); p.add_argument("--force"); p.add_argument("--ids", default="missing")
    p.add_argument("--seeds", default=2); p.add_argument("--max-minutes", default=100); p.add_argument("--meta"); p.add_argument("--srt")
    p.add_argument("--small"); p.add_argument("--keep-build", action="store_true"); p.add_argument("--choose", default="")
    a = p.parse_args()
    {"cast": cmd_cast, "pick": cmd_pick, "sheet": cmd_sheet, "voice": cmd_voice, "tier": cmd_tier, "dataset": cmd_dataset, "render": cmd_render, "keep": cmd_keep}[a.cmd](a)


if __name__ == "__main__":
    main()
