# "Kailash Parivar" (STORY.md section 9): 55-75 s vertical Shorts of warm Kailash family slice-of-life stories with
# Mahadev, Mata Parvati, Bal Ganesh, Kartikeya ji, Nandi, Mushak and sometimes Narad ji, in a REALISTIC-CINEMATIC divine
# style (not cartoon), lip-synced, with big Hinglish subtitles. An emotional or light-hearted family conflict resolves
# with love, then a short moral and the like/subscribe ask. Spec = story/kailash/<release>-<topic>.json ("format":
# "kailash"; ideas in automation/kailash-episodes.json); characters = characters/kailash/cast.json (one canonical master
# portrait + one base clip + one voice each, reused by every episode; character-sheet.png = the master sheet).
# Every GPU step is ONE Kaggle session on the movie kernel (story/movie_kernel.py, kernel sps-kailash, SPS_SLOT=kailash):
# FLUX.1-schnell frames (true-CFG negative prompt against actor likeness), Wan 2.2 TI2V-5B clips, RIFE + Real-ESRGAN,
# MuseTalk 1.5 lip-sync (realistic faces: the face box is found automatically), Whisper pronunciation check.
# The shot logic, lip-sync reject gate (beard/blur), clip reject check and audio chain are story/kalyug.py's; this file
# changes the look (realistic prompts, cover frame, big Hinglish subtitles, Kailash header) and adds the QA gate.
#
#   python -I characters/kailash/kailash.py cast    --ids a,b|missing --seeds 2 [--neg-seeds 2] [--spec P --frame-seeds 2] --out DIR
#   python -I characters/kailash/kailash.py pick    --kaggle DIR --choose mahadev=1,parvati=3 [--out FRAMES]   master portraits
#   python -I characters/kailash/kailash.py sheet                                                           master sheet PNG
#   python -I characters/kailash/kailash.py voice   --spec P --out W/voice                                  edge-tts + human chain
#   python -I characters/kailash/kailash.py dataset --spec P --voice W/voice --out DIR [--frames DIR] [--clips 2]
#   python -I characters/kailash/kailash.py render  --spec P --voice W/voice --kaggle W/kaggle --out OUT.mp4 [--meta M] [--small S]
#   python -I characters/kailash/kailash.py qa      --spec P --kaggle W/kaggle --meta M --out QA.json     publish gate (exit 1 = skip)
#   python -I characters/kailash/kailash.py keep    --kaggle W/kaggle                                       new base clips -> library
#   python -I characters/kailash/kailash.py gate    --quota Q.json                                          Kaggle window + quota
#   python -I characters/kailash/kailash.py gpu     --kaggle W/kaggle [--kaggle W2 ...]                       GPU minutes used
import argparse, datetime, glob, hashlib, json, math, os, shutil, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, "story"))
import kalyug as K  # noqa: E402  (shared episode renderer; pointed at the Kailash library below)
import movie as M  # noqa: E402

KDIR = HERE
K.KDIR = KDIR
M.CAST_DIR = KDIR
from dialogue import ff, hexrgb, wrap  # noqa: E402

W, H, FPS = M.W, M.H, M.FPS
FW, FH = M.FW, M.FH
SERIES_DAYS = "Somvar, Guruvar aur Shanivar"
TRUE_CFG = float(os.environ.get("KAILASH_TRUE_CFG", "1.5"))  # negative prompt strength (1 = off)
# Deity names the Whisper gate must hear exactly in every line that says them (owner rule: never loosened).
DEITY_NAMES = ["महादेव", "पार्वती", "गणेश", "कार्तिकेय", "नंदी", "नारद", "शिव", "भोलेनाथ", "गणपति"]
MAX_MEAN_CER = 0.15  # the Kalyug pilot measured 4.6 %; a mean above this means garbled audio
MIN_LIP_SHARE = 0.5  # at least half of the lip-syncable close-up lines must really be lip-synced
LEN_RANGE = (55, 76)  # seconds (a 75 s spec renders up to ~76 s)
MINI_RANGE = (25, 41)  # "variant": "mini" episodes (scripts/kailash-rules.mjs MINI)
CUTE3D_DIR = os.path.join(ROOT, "characters", "kalyug")  # "style": "cute-3d": the Kalyug ke Bhagwan cartoon cast


def use_library(spec_path):
    """Point every module at the spec's character library: characters/kailash (realistic, the default) or, for
    "style": "cute-3d", the Kalyug cartoon cast (3D look, its own master portraits, base clips and voices)."""
    global KDIR, LEN_RANGE
    try:
        spec = load(spec_path) if spec_path else {}
    except Exception:  # noqa: BLE001
        spec = {}
    if spec.get("style") == "cute-3d":
        KDIR = K.KDIR = M.CAST_DIR = CUTE3D_DIR
    if spec.get("variant") == "mini":
        LEN_RANGE = MINI_RANGE


def load(p):
    return json.load(open(p, encoding="utf-8"))


def cast():
    return load(os.path.join(KDIR, "cast.json"))


def has_portrait(who):
    return os.path.exists(os.path.join(KDIR, f"{who}.png"))


def portrait_prompt(c, lib):
    return f"{c['description']}. {lib['portrait'].format(bg=c.get('bg', 'snowy Kailash peaks in soft light'))}. {lib['style']}"


def scene_prompt(sc, chars):
    who = [chars[c]["wide"] for c in sc.get("cast", []) if c in chars and chars[c].get("wide")]
    people = f" Characters: {'; '.join(who)}." if who else ""
    return f"{sc['prompt']}.{people} Vertical 9:16 frame, the main characters in the middle of the frame. {cast()['style']}"


def motion(sc):
    cam = {"in": "the camera slowly and smoothly dollies in", "out": "the camera slowly and smoothly pulls back",
           "pan": "the camera slowly tracks sideways", "still": "a locked-off camera"}.get(sc.get("motion", "in"), "the camera slowly dollies in")
    return (f"{sc['prompt']}. {cam}, steady and continuous, no cut, no shake. Motion: {sc.get('animate', 'gentle natural movement')}. "
            "The characters keep exactly the same faces, skin colours and costumes throughout, with subtle natural movement such as "
            "breathing and blinking; snow drifts softly; no new characters appear. Realistic cinematic devotional film, warm divine light")


def fresh(out):
    if os.path.isdir(out):
        shutil.rmtree(out)
    os.makedirs(out)


def flux_settings():
    return {"size": 1024, "steps": 6, **({"true_cfg": TRUE_CFG} if TRUE_CFG > 1 else {})}


# ----------------------------------------------------------------- cast ----
def cmd_cast(a):
    """Kaggle inputs that draw master-portrait candidates: --seeds plain (no CFG) and --neg-seeds with the negative prompt
    (true CFG), so a person compares both and picks; with --spec also that episode's scene frames (--frame-seeds each)."""
    lib = cast()
    chars = lib["characters"]
    ids = [k for k, c in chars.items() if c["kind"] != "voice" and not has_portrait(k)] if a.ids == "missing" else [i for i in a.ids.split(",") if i]
    fresh(a.out)
    images = []
    for k in ids:
        for s in range(int(a.seeds) + int(a.neg_seeds)):
            neg = s >= int(a.seeds)
            images.append({"id": f"cast-{k}-{s}", "prompt": portrait_prompt(chars[k], lib), "seed": 3100 + 89 * s + len(k), "w": FW, "h": FH,
                           **({"negative": lib["negative"]} if neg else {})})
    if a.spec:
        spec = load(a.spec)
        for si, sc in enumerate(spec["scenes"]):
            for s in range(int(a.frame_seeds)):
                images.append({"id": f"s{si}-{s}", "prompt": scene_prompt(sc, chars), "seed": int(sc.get("seed", 7 + 13 * si)) + 101 * s,
                               "w": FW, "h": FH, **({"negative": lib["negative"]} if s % 2 else {})})
    stamp = f"kailash-cast-{int(time.time())}"
    json.dump({"stamp": stamp, "settings": {"tier": "cast", "max_minutes": int(a.max_minutes), "flux": {"size": 1024, "steps": 6, "true_cfg": max(TRUE_CFG, 1.5)}},
               "images": images}, open(f"{a.out}/movie.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    M.helpers(a.out)
    print(json.dumps({"stamp": stamp, "characters": ids, "images": len(images)}))


def cmd_pick(a):
    """--choose mahadev=1,parvati=3 copies <kaggle>/frames/cast-<id>-<n>.png to characters/kailash/<id>.png (the master
    portrait from then on, never replaced without the owner's ok), then redraws the master sheet. Scene frames:
    --choose s0=1 copies frames/s0-1.png to --out/s0.png (the episode session then skips FLUX for that scene)."""
    for pair in filter(None, (a.choose or "").split(",")):
        who, n = pair.split("=")
        if who[0] == "s" and who[1:].isdigit():
            os.makedirs(a.out, exist_ok=True)
            shutil.copy(os.path.join(a.kaggle, "frames", f"{who}-{n}.png"), os.path.join(a.out, f"{who}.png"))
            continue
        dst = os.path.join(KDIR, f"{who}.png")
        if os.path.exists(dst) and not a.force:
            raise SystemExit(f"{dst} exists: a master portrait is never replaced (use --force only with the owner's ok)")
        shutil.copy(os.path.join(a.kaggle, "frames", f"cast-{who}-{n}.png"), dst)
    cmd_sheet(a)


def cmd_sheet(a):
    """characters/kailash/character-sheet.png: the master sheet (every canonical portrait, its name and voice)."""
    from PIL import Image, ImageDraw
    lib = cast()
    items = [(k, c) for k, c in lib["characters"].items() if has_portrait(k)]
    if not items:
        return
    cols, tw, th = min(4, len(items)), 360, 640
    rows = math.ceil(len(items) / cols)
    sheet = Image.new("RGB", (cols * tw, rows * (th + 110) + 110), (14, 22, 40))
    d = ImageDraw.Draw(sheet)
    f = M.Fonts()
    d.text((24, 20), "Kailash Parivar", font=f.get("bold", 46), fill=(255, 214, 102))
    d.text((24, 74), "Shyam Premi SN: master character sheet (identity = these PNGs; voices fixed; original faces)",
           font=f.get("bold", 22), fill=(220, 230, 255))
    for i, (k, c) in enumerate(items):
        x, y = (i % cols) * tw, 110 + (i // cols) * (th + 110)
        sheet.paste(Image.open(os.path.join(KDIR, f"{k}.png")).convert("RGB").resize((tw - 10, th - 10)), (x + 5, y + 5))
        d.text((x + 12, y + th + 2), c["name"], font=f.get("bold", 30), fill=hexrgb(c["color"]))
        v = c.get("voice", {})
        d.text((x + 12, y + th + 44), f"{'lip-sync' if c.get('lipsync') else 'talk clip'} | {v.get('edge', '').replace('hi-IN-', '').replace('Neural', '')} "
               f"{v.get('pitch', '')} {v.get('rate', '')} {v.get('fx', '')}".strip(), font=f.get("bold", 18), fill=(220, 220, 220))
    out = os.path.join(KDIR, "character-sheet.png")
    sheet.save(out, optimize=True)
    print(json.dumps({"sheet": out, "characters": [k for k, _ in items]}))


# -------------------------------------------------------------- dataset ----
def shot_of(si, l, spec, chars):
    return K.shot_of(si, l, spec, chars)


def cmd_dataset(a):
    spec, lib = load(a.spec), cast()
    chars = lib["characters"]
    voice = load(f"{a.voice}/voice.json")["lines"]
    fresh(a.out)
    images, clips, lips, qa = [], [], [], []
    for si, sc in enumerate(spec["scenes"]):  # picked frames win; else FLUX on the GPU (with the negative prompt)
        pf = os.path.join(a.frames, f"s{si}.png") if a.frames else ""
        if pf and os.path.exists(pf):
            shutil.copy(pf, f"{a.out}/s{si}.png")
        else:
            images.append({"id": f"s{si}", "prompt": scene_prompt(sc, chars), "seed": int(sc.get("seed", 7 + 13 * si)), "w": FW, "h": FH,
                           **({"negative": lib["negative"]} if TRUE_CFG > 1 else {})})
    lines = K.all_lines(spec)
    marked = [si for si, sc in enumerate(spec["scenes"]) if sc.get("animate")][:int(a.clips)]
    for si in marked:
        sc = spec["scenes"][si]
        wide = sum(v["seconds"] for v, (s2, l) in zip(voice, lines) if s2 == si and shot_of(s2, l, spec, chars) == "wide")
        clips.append({"id": f"s{si}", "image": f"s{si}", "prompt": motion(sc), "frames": 81, "seconds": round(min(6.5, max(3.5, wide)), 2), "seed": 42 + si})
    stills = [f"s{si}" for si in range(len(spec["scenes"])) if si not in marked]
    speaking, closeups = [], []
    for i, (si, l) in enumerate(lines):
        c = chars.get(l["who"], {})
        shutil.copy(f"{a.voice}/line-{i:02d}.wav", f"{a.out}/line-{i:02d}.wav")
        if shot_of(si, l, spec, chars) == "close":
            closeups.append(l["who"])
            if c.get("lipsync"):
                lips.append({"id": f"lip-{i:02d}", "who": l["who"], "audio": f"line-{i:02d}.wav", "seconds": voice[i]["seconds"],
                             **({"box_frac": c["face_box"]} if c.get("face_box") else {}), **({"mask": c["mouth"]} if c.get("mouth") else {})})
                if l["who"] not in speaking:
                    speaking.append(l["who"])
        qa.append({"id": f"{i:02d}", "who": l["who"], "audio": f"line-{i:02d}.wav", "text": l["tts"],
                   "names": [n for n in dict.fromkeys(spec.get("names", []) + DEITY_NAMES) if n in l["tts"]]})
    shutil.copy(f"{a.voice}/voice.json", f"{a.out}/voice.json")
    new_base = []
    extra_ids = [w for w in (a.base or "").split(",") if w and w not in speaking]
    for who in speaking + [w for w in extra_ids if chars.get(w, {}).get("lipsync")]:  # base clip: library, else made once now
        lib_clip = os.path.join(KDIR, "clips", f"{who}.mp4")
        if os.path.exists(lib_clip):
            if who in speaking:
                shutil.copy(lib_clip, f"{a.out}/castclip-{who}.mp4")
        elif has_portrait(who):
            shutil.copy(os.path.join(KDIR, f"{who}.png"), f"{a.out}/cast-{who}.png")
            extra = {"mahadev": ", the thin Ganga stream flows gently and the cobra moves slowly"}.get(who, "")
            clips.append({"id": f"cast-{who}", "image": f"cast-{who}.png", "frames": 81, "seconds": 4.2, "seed": 5,
                          "prompt": f"{chars[who]['description']}. A locked-off static camera, no zoom, no camera movement. Motion: the "
                                    f"character breathes calmly and blinks naturally, the head stays still and faces the camera, the mouth "
                                    f"stays closed{extra}. The face keeps exactly the same identity throughout. Realistic cinematic devotional film, warm divine light"})
            new_base.append(who)
    for who in dict.fromkeys(closeups + extra_ids):  # talk clips: faces MuseTalk cannot lip-sync (elephant head, bull, mouse)
        if chars.get(who, {}).get("talk") and has_portrait(who) and not os.path.exists(os.path.join(KDIR, "clips", f"{who}-talk.mp4")):
            if not os.path.exists(f"{a.out}/cast-{who}.png"):
                shutil.copy(os.path.join(KDIR, f"{who}.png"), f"{a.out}/cast-{who}.png")
            clips.append({"id": f"cast-{who}-talk", "image": f"cast-{who}.png", "frames": 81, "seconds": 4.2, "seed": 7,
                          "prompt": f"{chars[who]['description']}. A locked-off static camera, no zoom, no camera movement. Motion: {chars[who]['talk']} "
                                    "The head stays facing the camera and the face keeps exactly the same identity throughout. Realistic cinematic devotional film, warm divine light"})
            new_base.append(f"{who}-talk")
    for who in filter(None, (a.draw or "").split(",")):  # --draw: new master-portrait candidates for a person to pick
        for n in range(int(a.seeds) + int(a.neg_seeds)):
            images.append({"id": f"cast-{who}-{n}", "prompt": portrait_prompt(chars[who], lib), "seed": 4100 + 89 * n + len(who), "w": FW, "h": FH,
                           **({"negative": lib["negative"]} if n >= int(a.seeds) else {})})
    settings = {"tier": "kailash", "max_minutes": int(a.max_minutes), "flux": flux_settings(), "reserve_minutes": 14 if lips else 5,
                "qa_minutes": 3, "anim": {"width": FW, "height": FH, "steps": 25, "hero14b": False}}
    stamp = f"{spec['slug']}-{int(time.time())}"
    json.dump({"stamp": stamp, "settings": settings, "images": images, "clips": clips, "stills": stills, "lips": lips, "qa": qa},
              open(f"{a.out}/movie.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    M.helpers(a.out)
    print(json.dumps({"stamp": stamp, "images": len(images), "clips": [c["id"] for c in clips], "new_base_clips": new_base,
                      "lips": len(lips), "qa": len(qa)}))


# --------------------------------------------------------------- render ----
class Episode(K.Episode):
    """Kalyug's episode renderer (wide tracks, lip-synced close-ups with the mouth check, clip reject check) with the
    Kailash look: a 2-4 word cover on the first 0.4 s, the title overlay to 2.8 s, big Hinglish subtitles, a
    "KAILASH PARIVAR" header and a calm drone + mountain wind bed."""

    def header(self):
        from PIL import Image, ImageDraw
        im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        for y in range(0, 210):
            d.line([0, y, W, y], fill=(0, 0, 0, int(140 * (1 - y / 210))))
        logo = os.path.join(ROOT, "brand", "logo.png")
        if os.path.exists(logo):
            im.alpha_composite(Image.open(logo).convert("RGBA").resize((96, 96)), (28, 28))
        bf = self.f.get("bold", 34)
        t = "KAILASH PARIVAR"
        tw = d.textlength(t, font=bf)
        d.rounded_rectangle([140, 44, 140 + tw + 40, 104], 30, fill=(255, 214, 102, 235))
        d.text((160, 52), t, font=bf, fill=(30, 16, 10))
        lf = self.f.get("bold", 22)
        t = "AI chitra (sanketik)"
        d.text((W - d.textlength(t, font=lf) - 28, 60), t, font=lf, fill=(255, 255, 255, 170))
        return im

    def cover(self):
        """The cover frame (first 0.4 s = the Short's thumbnail): spec.cover, 2-4 huge Devanagari words on a dark band."""
        from PIL import Image, ImageDraw
        im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        rows = self.dev_rows(self.spec["cover"], 150, (255, 222, 89), W - 120)
        h = sum(r.height + 24 for r in rows) + 60
        y0 = 330
        d.rounded_rectangle([30, y0, W - 30, y0 + h], 50, fill=(10, 6, 24, 190))
        y = y0 + 30
        for r in rows:
            im.alpha_composite(r, ((W - r.width) // 2, y))
            y += r.height + 24
        return im

    def subtitle(self, line, name):
        """Big Hinglish (Roman) first, 56 px in the speaker's colour; the Devanagari line smaller under it."""
        from PIL import Image, ImageDraw
        col = hexrgb(self.chars[line["who"]]["color"])
        im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        fr = self.f.get("bold", 56)
        rows_r = wrap(d, line["sub"], fr, W - 140)
        rows_d = self.dev_rows(line["tts"], 40, (240, 240, 240), W - 200)
        rh = 72 * len(rows_r) + sum(r.height + 8 for r in rows_d)
        y0 = H - 300 - rh
        for y in range(y0 - 120, H):
            d.line([0, y, W, y], fill=(0, 0, 0, int(min(190, 190 * (y - y0 + 120) / 220))))
        if name:
            nf = self.f.get("bold", 36)
            tw = d.textlength(name, font=nf)
            d.rounded_rectangle([46, y0 - 74, 46 + tw + 70, y0 - 18], 28, fill=col + (235,))
            d.ellipse([62, y0 - 56, 82, y0 - 36], fill=(255, 255, 255))
            d.text((92, y0 - 70), name, font=nf, fill=(20, 20, 20))
        y = y0
        for t in rows_r:
            d.text(((W - d.textlength(t, font=fr)) // 2, y), t, font=fr, fill=col, stroke_width=4, stroke_fill=(0, 0, 0))
            y += 72
        y += 6
        for r in rows_d:
            im.alpha_composite(r, ((W - r.width) // 2, y))
            y += r.height + 8
        return im

    def end_card(self):
        from PIL import Image, ImageDraw
        im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        y = 150
        f = self.f.get("bold", 54)
        t = "LIKE + SUBSCRIBE"
        tw = d.textlength(t, font=f)
        d.rounded_rectangle([(W - tw) // 2 - 50, y, (W + tw) // 2 + 50, y + 92], 46, fill=(204, 0, 0, 240))
        d.text(((W - tw) // 2, y + 14), t, font=f, fill=(255, 255, 255))
        y += 104
        ft = self.f.get("bold", 34)
        t = f"Naya episode: {SERIES_DAYS}"
        d.text(((W - d.textlength(t, font=ft)) // 2, y), t, font=ft, fill=(255, 230, 160), stroke_width=3, stroke_fill=(0, 0, 0))
        return im

    def run(self):
        lines = K.all_lines(self.spec)
        hdr = self.header()
        plan = [(i, si, l, shot_of(si, l, self.spec, self.chars), self.voice[i]["seconds"]) for i, (si, l) in enumerate(lines)]
        wide_need = {}
        for i, si, l, kind, d in plan:
            if kind == "wide":
                wide_need[si] = wide_need.get(si, 0) + d
        tracks = {si: [self.wide_track(si, d), 0.0] for si, d in wide_need.items()}
        title_png, cover_png = f"{self.build}/title.png", f"{self.build}/cover.png"
        self.title_card().save(title_png)
        self.cover().save(cover_png)
        segs, srt, t0 = [], [], 0.0
        for i, si, l, kind, d in plan:
            c = self.chars[l["who"]]
            name = None if l["who"] == "narrator" else c["name"]
            ov = hdr.copy()
            if si == "end":
                ov.alpha_composite(self.end_card())
            ov.alpha_composite(self.subtitle(l, name))
            ovp = f"{self.build}/ov-{i:02d}.png"
            ov.save(ovp)
            if kind == "wide":
                src, off = tracks[si]
                tracks[si][1] += d
                vis = f"{self.build}/cut-{i:02d}.mp4"
                ff("-ss", f"{off:.3f}", "-i", src, "-t", f"{d:.3f}", "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-an", vis)
            else:
                vis = self.close_shot(i, l["who"], d)
            seg = f"{self.build}/seg-{i:02d}.mp4"
            inputs = ["-i", vis, "-loop", "1", "-framerate", str(FPS), "-t", f"{d:.3f}", "-i", ovp]
            fg = "[0:v][1:v]overlay=0:0"
            if i == 0:  # cover 0-0.4 s (the thumbnail frame; no subtitle under it), then the title to 2.8 s
                inputs += ["-loop", "1", "-framerate", str(FPS), "-t", "2.8", "-i", title_png, "-loop", "1", "-framerate", str(FPS), "-t", "0.4", "-i", cover_png]
                fg = ("[0:v][1:v]overlay=0:0:enable='gte(t,0.4)'[a1];"
                      "[2:v]fade=t=out:st=2.3:d=0.5:alpha=1[tt];[a1][tt]overlay=0:0:enable='between(t,0.4,2.8)'[a2];"
                      "[a2][3:v]overlay=0:0:enable='lt(t,0.4)'")
            ff(*inputs, "-filter_complex", f"{fg},format=yuv420p[v]", "-map", "[v]", "-c:v", "libx264", "-preset", "veryfast",
               "-crf", "18", "-r", str(FPS), "-t", f"{d:.3f}", seg)
            segs.append(seg)
            srt.append((t0 + 0.06, t0 + d - self.voice[i]["pause_s"] + 0.05, l["sub"], name))
            t0 += d
        lst = f"{self.build}/segs.txt"
        open(lst, "w").write("".join(f"file '{os.path.abspath(s)}'\n" for s in segs))
        joined = f"{self.build}/joined.mp4"
        ff("-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", joined)
        vt, vl = f"{self.build}/voice.wav", f"{self.build}/voice.txt"
        open(vl, "w").write("".join(f"file '{os.path.abspath(os.path.join(self.a.voice, self.voice[i]['file']))}'\n" for i, *_ in plan))
        ff("-f", "concat", "-safe", "0", "-i", vl, "-ar", "48000", "-ac", "2", vt)
        self.mix(joined, vt, t0, plan)
        if self.a.srt:
            ts = lambda x: f"{int(x // 3600):02d}:{int(x % 3600 // 60):02d}:{int(x % 60):02d},{int(round(x % 1 * 1000)) % 1000:03d}"
            open(self.a.srt, "w", encoding="utf-8").write("".join(
                f"{k + 1}\n{ts(a0)} --> {ts(b0)}\n{(n + ': ') if n else ''}{txt}\n\n" for k, (a0, b0, txt, n) in enumerate(srt)))
        lipable = [i for i, si, l, kind, d in plan if kind == "close" and self.chars.get(l["who"], {}).get("lipsync")]
        meta = {"seconds": round(t0, 2), "shots": len(plan), "animated_scenes": sorted(set(self.used["clips"])), "lip_lines": self.used["lip"],
                "lipsync_expected": len(lipable), "closeups_no_lip": self.used["closeups"], "talk_lines": self.used.get("talk", 0),
                "still_tracks": self.used["stills"], "lip_check": self.lip_scores, "lip_rejected": [w for w, v in self.lip_verdict.items() if v is False],
                "clip_checks": getattr(self, "clip_checks", {}), "scene_clips_rejected": [k for k, v in getattr(self, "clip_checks", {}).items() if not v["ok"]]}
        if self.a.meta:
            json.dump(meta, open(self.a.meta, "w"), indent=1)
        if self.a.small:
            self.small_copy(t0)
        if not self.a.keep_build:
            shutil.rmtree(self.build, ignore_errors=True)
        print(json.dumps({"out": self.a.out, **meta}))

    BED_KIND = "kailash"  # voice/beds.py kind (Krishna POV: "pov")
    BED_GAIN = 0.85       # bed under the voice: ~19 dB below the speech while speaking, ~13 dB below in the pauses (measured 15 Nov)

    def bed_events(self, plan):
        """Bell at scene changes, a chime when the lead first appears and at the end card (seconds)."""
        ev, t, prev, seen = {"bell": [0.0], "chime": []}, 0.0, None, False
        lead = self.spec.get("lead")
        for i, si, l, kind, d in plan:
            if si != prev and isinstance(si, int):
                if not seen and lead in self.spec["scenes"][si].get("cast", []):
                    ev["chime"].append(max(0, t - 0.15))
                    seen = True
                elif si > 0:
                    ev["bell"].append(t)
            if si == "end" and prev != "end":
                ev["chime"].append(t)
            prev = si
            t += d
        return ev

    def mix(self, video, voice, total, plan):
        """Synthesized music bed (voice/beds.py: Kailash = tanpura drone + pad + mountain wind; Krishna POV = tanpura +
        bansuri-like flute + pad), bells/chimes at scene changes; ducked under the voices (sidechain), -14 LUFS.
        SOUND_BEDS=off = the old aevalsrc drone bed (owner A/B, 15 Nov 2026)."""
        if os.environ.get("SOUND_BEDS", "on") == "off":
            return self.mix_old(video, voice, total, plan)
        bed = f"{self.build}/bed.wav"
        sys.path.insert(0, os.path.join(ROOT, "voice"))
        import beds  # noqa: E402
        beds.write(bed, beds.make_bed(self.BED_KIND, total + 0.5, self.bed_events(plan),
                                      seed=int(hashlib.sha1(self.spec.get("slug", "x").encode()).hexdigest()[:6], 16)))
        f = [f"[2:a]aformat=sample_rates=48000:channel_layouts=stereo,volume={self.BED_GAIN},atrim=duration={total:.2f},"
             f"afade=t=out:st={max(0, total - 1.5):.2f}:d=1.5[bed]",
             "[1:a]aformat=sample_rates=48000:channel_layouts=stereo,asplit=2[vo][sc]",
             # ~9 dB of ducking while someone speaks, back up in the pauses (release 600 ms: no pumping between words)
             "[bed][sc]sidechaincompress=threshold=0.025:ratio=4:attack=30:release=600:knee=4[duck]",
             "[vo][duck]amix=inputs=2:duration=first:normalize=0,aresample=48000[a]"]
        raw, norm = f"{self.build}/mix-raw.wav", f"{self.build}/mix.wav"
        ff("-i", voice, "-i", voice, "-i", bed, "-filter_complex", ";".join(f), "-map", "[a]", "-t", f"{total:.3f}", "-c:a", "pcm_s16le", raw)
        beds.loudnorm_2pass(raw, norm, ffmpeg=os.environ.get("FFMPEG_PATH") or "ffmpeg")  # exactly -14 LUFS
        ff("-i", video, "-i", norm, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
           "-movflags", "+faststart", "-t", f"{total:.3f}", self.a.out)

    def mix_old(self, video, voice, total, plan):
        """(Before 15 Nov 2026) Calm tanpura-like drone + soft pad + mountain wind (all synthesized, no recorded music), a soft bell on scene
        changes and a chime when the lead first appears; ducked under the voices (sidechain), -14 LUFS."""
        T = f"{total + 0.5:.2f}"
        drone = (f"aevalsrc='0.09*sin(2*PI*138.59*t)*(1+0.25*sin(2*PI*0.18*t))+0.06*sin(2*PI*207.65*t)*(1+0.2*sin(2*PI*0.23*t))|"
                 f"0.09*sin(2*PI*138.59*t+0.4)+0.06*sin(2*PI*207.65*t+0.3)':s=48000:d={T}")
        pad = (f"aevalsrc='0.06*sin(2*PI*277.18*t)*(1+0.2*sin(2*PI*0.21*t))+0.04*sin(2*PI*415.3*t)*(1+0.2*sin(2*PI*0.17*t))|"
               f"0.06*sin(2*PI*277.18*t+0.5)+0.04*sin(2*PI*415.3*t+0.2)':s=48000:d={T}")
        wind = f"anoisesrc=d={T}:c=pink:a=0.5:r=48000,bandpass=f=420:w=380,volume='0.6+0.4*sin(2*PI*0.07*t)':eval=frame"
        beds, vols = [drone, pad, wind], [0.42, 0.22, 0.10]
        bell = "aevalsrc='0.45*sin(2*PI*1046*t)*exp(-2.2*t)+0.25*sin(2*PI*2093*t)*exp(-3.5*t)+0.15*sin(2*PI*1568*t)*exp(-2.8*t)':s=48000:d=4"
        chime = ("aevalsrc='0.22*sin(2*PI*(1318+900*t)*t)*exp(-3*t)+0.18*sin(2*PI*1760*t)*exp(-4*mod(t,0.12))*lt(t,0.6)"
                 "+0.15*sin(2*PI*2637*t)*exp(-2.5*t)':s=48000:d=2.5")
        sfx, t, prev, seen = [(bell, 0.0, 0.35)], 0.0, None, False
        lead = self.spec.get("lead")
        for i, si, l, kind, d in plan:
            if si != prev and isinstance(si, int):
                if not seen and lead in self.spec["scenes"][si].get("cast", []):
                    sfx.append((chime, max(0, t - 0.15), 0.7))
                    seen = True
                elif si > 0:
                    sfx.append((bell, t, 0.16))
            if si == "end" and prev != "end":
                sfx.append((chime, t, 0.55))
            prev = si
            t += d
        nb = len(beds)
        ins = sum((["-f", "lavfi", "-i", s_] for s_ in beds + [x[0] for x in sfx]), [])
        f = [f"[{j + 2}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume={vols[j]}[m{j}]" for j in range(nb)]
        for j, (_, at, vol) in enumerate(sfx):
            ms = int(at * 1000)
            f.append(f"[{nb + 2 + j}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume={vol},adelay={ms}|{ms}[s{j}]")
        f.append("".join(f"[m{j}]" for j in range(nb)) + "".join(f"[s{j}]" for j in range(len(sfx))) +
                 f"amix=inputs={nb + len(sfx)}:duration=longest:normalize=0,atrim=duration={total:.2f},afade=t=in:d=0.4,"
                 f"afade=t=out:st={max(0, total - 1.5):.2f}:d=1.5[bed]")
        f.append("[1:a]aformat=sample_rates=48000:channel_layouts=stereo,asplit=2[vo][sc]")
        f.append("[bed][sc]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=350[duck]")
        f.append("[vo][duck]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]")
        ff("-i", video, "-i", voice, *ins, "-filter_complex", ";".join(f), "-map", "0:v", "-map", "[a]", "-c:v", "copy",
           "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", "-t", f"{total:.3f}", self.a.out)


def cmd_render(a):
    Episode(a).run()


# ------------------------------------------------------------------- QA ----
def _frame(path, t=0.5):
    """One RGB frame (numpy, 576x1024) of a video or image."""
    import numpy as np
    from PIL import Image
    if path.lower().endswith((".png", ".jpg", ".jpeg")):
        im = Image.open(path).convert("RGB")
    else:
        r = subprocess.run([os.environ.get("FFMPEG_PATH", "ffmpeg"), "-v", "error", "-ss", f"{t:.2f}", "-i", path, "-frames:v", "1",
                            "-vf", f"scale={FW}:{FH}:force_original_aspect_ratio=increase,crop={FW}:{FH}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                           capture_output=True)
        if len(r.stdout) < FW * FH * 3:
            return None
        return np.frombuffer(r.stdout[:FW * FH * 3], np.uint8).reshape(FH, FW, 3)
    return np.asarray(im.resize((FW, FH)))


def _ssim(a, b):
    """Global-window SSIM over 8x8 blocks (grayscale, numpy only)."""
    import numpy as np
    a, b = a.astype(np.float64), b.astype(np.float64)
    h, w = (min(a.shape[0], b.shape[0]) // 8) * 8, (min(a.shape[1], b.shape[1]) // 8) * 8
    A = a[:h, :w].reshape(h // 8, 8, w // 8, 8).transpose(0, 2, 1, 3).reshape(-1, 64)
    B = b[:h, :w].reshape(h // 8, 8, w // 8, 8).transpose(0, 2, 1, 3).reshape(-1, 64)
    ma, mb = A.mean(1), B.mean(1)
    va, vb = A.var(1), B.var(1)
    cov = ((A - ma[:, None]) * (B - mb[:, None])).mean(1)
    c1, c2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2
    return float((((2 * ma * mb + c1) * (2 * cov + c2)) / ((ma ** 2 + mb ** 2 + c1) * (va + vb + c2))).mean())


def _lab(rgb):
    """Mean CIE-Lab of an RGB patch (numpy)."""
    import numpy as np
    c = rgb.reshape(-1, 3).astype(np.float64) / 255
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    xyz = c @ np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]]).T / np.array([0.9505, 1.0, 1.089])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    lab = np.stack([116 * f[:, 1] - 16, 500 * (f[:, 0] - f[:, 1]), 200 * (f[:, 1] - f[:, 2])], 1)
    return np.median(lab, 0)


FACE = (0.22, 0.22, 0.78, 0.62)  # where the master portrait prompt puts the face (fractions x1, y1, x2, y2)
SKIN = (0.40, 0.34, 0.60, 0.48)  # cheeks/forehead patch inside it: the skin colour


def _crop(img, box):
    h, w = img.shape[:2]
    return img[int(box[1] * h):int(box[3] * h), int(box[0] * w):int(box[2] * w)]


def identity(img, master):
    """How close a close-up frame is to the master portrait: SSIM of the face region (grayscale) and the skin-colour
    distance (CIE76 delta-E of the median Lab of the cheek/forehead patch)."""
    import numpy as np
    g = lambda x: (x[..., 0] * 0.299 + x[..., 1] * 0.587 + x[..., 2] * 0.114)
    s = _ssim(g(_crop(img, FACE)), g(_crop(master, FACE)))
    de = float(np.linalg.norm(_lab(_crop(img, SKIN)) - _lab(_crop(master, SKIN))))
    return round(s, 3), round(de, 1)


def scene_faces(img):
    """Faces (OpenCV Haar, BSD) on a scene frame: list of skin Lab medians; [] when none is found or OpenCV is missing."""
    try:
        import cv2
    except Exception:
        return None
    g = cv2.equalizeHist(cv2.cvtColor(img[..., ::-1].copy(), cv2.COLOR_BGR2GRAY))
    out = []
    for name in ("haarcascade_frontalface_alt2.xml", "haarcascade_frontalface_default.xml"):
        cc = cv2.CascadeClassifier(os.path.join(cv2.data.haarcascades, name))
        for (x, y, w, h) in cc.detectMultiScale(g, 1.08, 6, minSize=(int(FW * 0.09), int(FW * 0.09))):
            patch = img[y + int(0.3 * h):y + int(0.55 * h), x + int(0.3 * w):x + int(0.7 * w)]
            if patch.size:
                out.append(_lab(patch))
        if out:
            break
    return out


ID_MIN_SSIM, ID_MAX_DE, SCENE_MAX_DE = 0.45, 12.0, 22.0


def consistency(spec, kaggle, meta):
    """Character-consistency check against the master sheet (characters/kailash/<id>.png):
    1. close-ups: every speaking character's base clip (library or new) must match its master portrait (face SSIM >=
       ID_MIN_SSIM, skin delta-E <= ID_MAX_DE): a drifted base clip would put a different face on every line.
    2. scenes: on each scene picture (Wan clip first frame, else the still) the faces OpenCV finds are matched to the
       scene's lip-sync (human-faced) cast by skin colour; a cast member with a face found but none within SCENE_MAX_DE
       (e.g. Mahadev drawn without his ash-blue skin) fails. No face found = unchecked (small faces in wide shots).
    Returns {ok, why[], closeups{}, scenes{}}."""
    import numpy as np
    chars = cast()["characters"]
    why, closeups, scenes = [], {}, {}
    masters = {k: _frame(os.path.join(KDIR, f"{k}.png")) for k in chars if has_portrait(k)}
    speakers = {l["who"] for _, l in K.all_lines(spec) if chars.get(l["who"], {}).get("kind") != "voice"}
    for who in sorted(speakers):
        if who not in masters:
            why.append(f"{who}: no master portrait"); continue
        for kind, p in (("base", os.path.join(kaggle, "clips", f"cast-{who}.mp4")), ("base", os.path.join(KDIR, "clips", f"{who}.mp4")),
                        ("talk", os.path.join(KDIR, "clips", f"{who}-talk.mp4"))):
            if not os.path.exists(p):
                continue
            fr = _frame(p, 0.3)
            if fr is None:
                continue
            s, de = identity(fr, masters[who])
            ok = s >= ID_MIN_SSIM and de <= ID_MAX_DE
            closeups[f"{who}:{kind}"] = {"ssim": s, "deltaE": de, "ok": ok}
            if not ok:
                why.append(f"{who} {kind} clip drifted from the master portrait (SSIM {s} < {ID_MIN_SSIM} or skin dE {de} > {ID_MAX_DE})")
            break
    human = {k for k, c in chars.items() if c.get("lipsync")}
    for si, sc in enumerate(spec["scenes"]):
        src = next((p for p in (os.path.join(kaggle, "clips", f"s{si}.mp4"), os.path.join(kaggle, "stills", f"s{si}.jpg"),
                                os.path.join(kaggle, "frames", f"s{si}.png")) if os.path.exists(p)), None)
        expect = [c for c in sc.get("cast", []) if c in human and c in masters]
        if not src or not expect:
            scenes[f"s{si}"] = {"checked": False}; continue
        img = _frame(src, 0.1)
        faces = scene_faces(img) if img is not None else None
        if not faces:
            scenes[f"s{si}"] = {"checked": False, "faces": 0}; continue
        res = {}
        for c in expect:
            ref = _lab(_crop(masters[c], SKIN))
            best = min(float(np.linalg.norm(f - ref)) for f in faces)
            res[c] = round(best, 1)
        # only judge when there are at least as many faces as expected characters (else some are too small to find)
        judged = len(faces) >= len(expect)
        bad = [c for c, d in res.items() if d > SCENE_MAX_DE] if judged else []
        scenes[f"s{si}"] = {"checked": judged, "faces": len(faces), "deltaE": res, "ok": not bad}
        for c in bad:
            why.append(f"scene {si + 1}: {chars[c]['name']}'s look drifted (no face within skin dE {SCENE_MAX_DE}; best {res[c]})")
    return {"ok": not why, "why": why, "closeups": closeups, "scenes": scenes}


def pronunciation(qa):
    """The Whisper gate (story/movie_kernel.py qa.json): every deity name in a line must be heard exactly (never
    loosened, feedback-bhajan-quality), and the mean CER must stay under MAX_MEAN_CER."""
    if not qa or qa.get("error") or not qa.get("lines"):
        return {"ok": False, "why": [f"no Whisper check ({(qa or {}).get('error', 'qa.json missing')})"]}
    why, notes = [], []
    for l in qa["lines"]:
        miss = l.get("missed_names", [])
        deity = [n for n in miss if any(d in n or n in d for d in DEITY_NAMES)]
        if deity:
            why.append(f"line {l['id']} ({l.get('who')}): {', '.join(deity)} not heard (Whisper: \"{l.get('heard', '')[:60]}\")")
        if set(miss) - set(deity):
            notes.append(f"line {l['id']}: {', '.join(sorted(set(miss) - set(deity)))} not heard (not a deity name: note only)")
    if qa.get("mean_cer", 1) > MAX_MEAN_CER:
        why.append(f"mean CER {qa.get('mean_cer')} > {MAX_MEAN_CER}")
    return {"ok": not why, "why": why, "notes": notes, "mean_cer": qa.get("mean_cer")}


def lipsync_gate(meta):
    exp, got = meta.get("lipsync_expected", 0), meta.get("lip_lines", 0)
    why = []
    if exp and got / exp < MIN_LIP_SHARE:
        why.append(f"only {got}/{exp} lip-syncable close-ups are lip-synced (reject gate: {', '.join(meta.get('lip_rejected', [])) or 'no lip clips'})")
    return {"ok": not why, "why": why, "lip_lines": got, "expected": exp, "rejected": meta.get("lip_rejected", [])}


def cmd_qa(a):
    """Publish gate: pronunciation (Whisper, deity names), lip-sync share (beard/blur reject gate), character consistency,
    length 55-75 s. Writes --out and exits 1 when any check fails (the workflow then skips publishing and logs why)."""
    spec = load(a.spec)
    meta = load(a.meta) if a.meta and os.path.exists(a.meta) else {}
    qa = load(os.path.join(a.kaggle, "qa.json")) if os.path.exists(os.path.join(a.kaggle, "qa.json")) else None
    rec = {"pronunciation": pronunciation(qa), "lipsync": lipsync_gate(meta), "consistency": consistency(spec, a.kaggle, meta)}
    secs = meta.get("seconds", 0)
    lo, hi = LEN_RANGE
    rec["length"] = {"ok": lo <= secs <= hi, "seconds": secs, "why": [] if lo <= secs <= hi else [f"length {secs} s outside {lo}-{hi} s"]}
    rec["ok"] = all(v["ok"] for v in rec.values() if isinstance(v, dict))
    rec["why"] = [w for v in rec.values() if isinstance(v, dict) for w in v.get("why", [])]
    if a.out:
        json.dump(rec, open(a.out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(json.dumps({"ok": rec["ok"], "why": rec["why"]}, ensure_ascii=False))
    if os.environ.get("GITHUB_OUTPUT"):
        open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8").write(f"ok={'true' if rec['ok'] else 'false'}\nwhy={'; '.join(rec['why'])[:900]}\n")
    sys.exit(0 if rec["ok"] else 1)


def cmd_gpu(a):
    """GPU minutes of the finished session(s): results.json session_s (T4 x2 counts once per session on Kaggle's clock)."""
    tot, parts = 0, []
    for d in a.kaggle_dirs:
        r = load(os.path.join(d, "results.json"))
        s = r.get("session_s", 0)
        tot += s
        parts.append({"dir": d, "minutes": round(s / 60, 1), **{k: (r.get(k) or {}).get("seconds") for k in ("images", "clips", "lips", "qa")}})
    print(json.dumps({"gpu_minutes": round(tot / 60, 1), "sessions": parts}))


def cmd_voice(a):
    # Fixed voice per character (cast.json): Gemini role (voice/gemini-voices.json) or edge-tts + the human chain
    # (voice/humanize.py). The Gemini pre-check hears the same names as this format's gate (spec names + DEITY_NAMES).
    os.environ["GEMINI_CHECK_NAMES"] = json.dumps(list(dict.fromkeys(load(a.spec).get("names", []) + DEITY_NAMES)), ensure_ascii=False)
    K.cmd_voice(a)
    # Gemini voices speak slower than edge-tts: an episode they push past the length gate is voiced with edge-tts instead
    # (a Short that fails QA publishes nothing). The takes stay cached, so a shorter script later costs no request.
    v = load(os.path.join(a.out, "voice.json"))
    if v.get("total_s", 0) > LEN_RANGE[1] - 1 and os.environ.get("SPS_GEMINI_TTS", "on") != "off":
        print(json.dumps({"gemini": f"{v['total_s']} s is over {LEN_RANGE[1] - 1} s: edge-tts voices instead"}), file=sys.stderr)
        os.environ["SPS_GEMINI_TTS"] = "off"
        shutil.rmtree(a.out, ignore_errors=True)
        K.cmd_voice(a)


def cmd_keep(a):
    K.cmd_keep(a)


def cmd_gate(a):
    K.cmd_gate(a)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("cmd")
    for o in ("--spec", "--out", "--voice", "--frames", "--meta", "--srt", "--small", "--choose", "--quota"):
        p.add_argument(o)
    p.add_argument("--kaggle", action="append", dest="kaggle_dirs", default=[])
    p.add_argument("--ids", default="missing"); p.add_argument("--seeds", default=2); p.add_argument("--neg-seeds", default=2)
    p.add_argument("--frame-seeds", default=2); p.add_argument("--clips", default=2); p.add_argument("--max-minutes", default=75)
    p.add_argument("--keep-build", action="store_true"); p.add_argument("--force", action="store_true"); p.add_argument("--base", default=""); p.add_argument("--draw", default="")
    a = p.parse_args()
    a.kaggle = a.kaggle_dirs[0] if a.kaggle_dirs else ""
    if a.spec and KDIR == HERE:  # (Krishna POV points KDIR at its own library first)
        use_library(a.spec)
    fn = globals().get(f"cmd_{a.cmd}")
    if not fn:
        raise SystemExit(f"unknown command {a.cmd}")
    fn(a)


if __name__ == "__main__":
    main()
