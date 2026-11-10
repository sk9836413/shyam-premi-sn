# "Kalyug ke Bhagwan" (STORY.md section 8): 30-60 s vertical Shorts in which a cute 3D cartoon deity (Bal Ganesh,
# Bal Krishna, Mahadev, Maa Parvati, Bal Hanuman) meets a child or parent in an everyday modern situation (exam stress,
# phone addiction, anger...) and gives a short lesson rooted in a well-known katha or shloka. Spec =
# story/kalyug/<release>-<topic>.json ("format": "kalyug"); characters = characters/kalyug/cast.json (one canonical
# portrait + one base clip + one voice each, reused by every episode). Every GPU step is ONE Kaggle session on the same
# kernel code as the mini-movies (story/movie_kernel.py, kernel sps-kalyug): FLUX.1-schnell frames, Wan 2.2 TI2V-5B
# clips, RIFE + Real-ESRGAN, MuseTalk 1.5 lip-sync (deities included: cartoon faces, manual face box per character),
# Whisper pronunciation check. Workers AI neurons: zero.
#
#   python -I story/kalyug.py cast    --ids a,b|missing --seeds 3 [--spec P --frame-seeds 2] --out DIR   portraits (+ scene frames)
#   python -I story/kalyug.py pick    --kaggle DIR --choose bal-ganesh=1,chintu=0                       canonical portraits
#   python -I story/kalyug.py sheet                                                                    character sheet PNG
#   python -I story/kalyug.py voice   --spec P --out W/voice                                           edge-tts per line + fx
#   python -I story/kalyug.py dataset --spec P --voice W/voice --out DIR [--frames DIR] [--clips 2]    Kaggle inputs
#   python -I story/kalyug.py render  --spec P --voice W/voice --kaggle W/kaggle --out OUT.mp4 [--meta M] [--small S]
#   python -I story/kalyug.py keep    --kaggle W/kaggle                                                new base clips -> library
#   python -I story/kalyug.py due     [--today YYYY-MM-DD]                                             next episode day (JSON)
#
# Shots: the first line of a scene shows the scene (its Wan clip, else its still with a slow camera move); every other
# line cuts to the speaker's close-up: the lip-synced clip (if its mouth passes the sharpness check), else the base clip,
# else the portrait. NO silent title beat: the hook line starts at 0 s (STORY.md: hook in the first 2 s) with the
# title as an overlay. Subtitles Devanagari (speaker's colour) + Roman; music, ambience and SFX synthesized with ffmpeg.
import argparse, asyncio, datetime, glob, json, math, os, shutil, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import movie as M  # noqa: E402  (shared renderer pieces; CAST_DIR is pointed at the kalyug library below)

KDIR = os.path.join(ROOT, "characters", "kalyug")
M.CAST_DIR = KDIR
from dialogue import edge_say, ff, human_pause, human_voices, hexrgb, kokoro_say, wav_len, wrap  # noqa: E402

W, H, FPS = M.W, M.H, M.FPS
FW, FH = M.FW, M.FH
WINDOWS = os.environ.get("KALYUG_WINDOWS", "09:00-11:30,18:30-21:00")  # never start a session inside these (IST)
DAYS = (1, 3, 5)  # Python weekday(): Tue, Thu, Sat


def load(p):
    return json.load(open(p, encoding="utf-8"))


def cast():
    return load(os.path.join(KDIR, "cast.json"))


def fresh(out):
    if os.path.isdir(out):
        shutil.rmtree(out)
    os.makedirs(out)


def portrait_prompt(c, lib):
    return f"{c['description']}. {lib['portrait'].format(bg=c.get('bg', 'soft warm golden bokeh lights'))}. {lib['style']}"


def scene_prompt(sc, spec, chars):
    who = [chars[c]["wide"] for c in sc.get("cast", []) if c in chars and chars[c].get("wide")]
    people = f" Characters: {'; '.join(who)}." if who else ""
    return f"{sc['prompt']}.{people} Vertical 9:16 frame, the main characters in the middle of the frame. {cast()['style']}"


def motion(sc):
    cam = {"in": "the camera slowly and smoothly dollies in", "out": "the camera slowly and smoothly pulls back",
           "pan": "the camera slowly tracks sideways", "still": "a locked-off camera"}.get(sc.get("motion", "in"), "the camera slowly dollies in")
    return (f"{sc['prompt']}. {cam}, steady and continuous, no cut, no shake. Motion: {sc.get('animate', 'gentle natural movement')}. "
            "The characters keep exactly the same faces, colours and costumes throughout, with subtle cute natural movement such as "
            "breathing and blinking; no new characters appear. 3D animated family movie, soft warm light, smooth natural motion")


# ----------------------------------------------------------------- cast ----
def cmd_cast(a):
    """Kaggle inputs that draw character portraits (several seeds to choose from) and, with --spec, that episode's scene
    frames (--frame-seeds each), so a person picks both before the clip session."""
    lib = cast()
    chars = lib["characters"]
    ids = [k for k, c in chars.items() if c["kind"] != "voice" and not os.path.exists(os.path.join(KDIR, f"{k}.png"))] \
        if a.ids == "missing" else [i for i in a.ids.split(",") if i]
    fresh(a.out)
    images = []
    for k in ids:
        n = int(a.seeds) * (3 if k == "bal-hanuman" else 1)  # FLUX keeps adding a beard to Hanuman: many more tries
        for s in range(n):
            images.append({"id": f"cast-{k}-{s}", "prompt": portrait_prompt(chars[k], lib), "seed": 2000 + 97 * s + len(k), "w": FW, "h": FH})
    if a.spec:
        spec = load(a.spec)
        for si, sc in enumerate(spec["scenes"]):
            for s in range(int(a.frame_seeds)):
                images.append({"id": f"s{si}-{s}", "prompt": scene_prompt(sc, spec, chars), "seed": int(sc.get("seed", 7 + 13 * si)) + 101 * s, "w": FW, "h": FH})
    stamp = f"kalyug-cast-{int(time.time())}"
    json.dump({"stamp": stamp, "settings": {"tier": "cast", "max_minutes": 60, "flux": {"size": 1024, "steps": 6}}, "images": images},
              open(f"{a.out}/movie.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    M.helpers(a.out)
    print(json.dumps({"stamp": stamp, "characters": ids, "images": len(images)}))


def cmd_pick(a):
    """A person chose the portraits (and scene frames): --choose bal-ganesh=1,chintu=0 copies <kaggle>/frames/cast-<id>-<n>.png
    to characters/kalyug/<id>.png (the canonical identity from then on), then redraws the character sheet. Scene frames:
    --choose s0=1 copies frames/s0-1.png to --out/s0.png (the clip session then skips FLUX for that scene)."""
    for pair in filter(None, (a.choose or "").split(",")):
        who, n = pair.split("=")
        if who[0] == "s" and who[1:].isdigit():
            os.makedirs(a.out, exist_ok=True)
            shutil.copy(os.path.join(a.kaggle, "frames", f"{who}-{n}.png"), os.path.join(a.out, f"{who}.png"))
            continue
        dst = os.path.join(KDIR, f"{who}.png")
        if os.path.exists(dst) and not a.force:
            raise SystemExit(f"{dst} exists: a canonical portrait is never replaced (use --force only with the owner's ok)")
        shutil.copy(os.path.join(a.kaggle, "frames", f"cast-{who}-{n}.png"), dst)
    cmd_sheet(a)


def cmd_sheet(a):
    """characters/kalyug/character-sheet.png: every canonical portrait with its name (Roman + Devanagari) and voice."""
    from PIL import Image, ImageDraw
    lib = cast()
    items = [(k, c) for k, c in lib["characters"].items() if os.path.exists(os.path.join(KDIR, f"{k}.png"))]
    if not items:
        return
    cols, tw, th = min(4, len(items)), 360, 640
    rows = math.ceil(len(items) / cols)
    sheet = Image.new("RGB", (cols * tw, rows * (th + 110) + 110), (30, 14, 40))
    d = ImageDraw.Draw(sheet)
    f = M.Fonts()
    d.text((24, 20), "Kalyug ke Bhagwan", font=f.get("bold", 46), fill=(255, 214, 102))
    d.text((24, 74), "Shyam Premi SN: canonical character sheet (identity = these PNGs; voices fixed)", font=f.get("bold", 22), fill=(230, 220, 255))
    for i, (k, c) in enumerate(items):
        x, y = (i % cols) * tw, 110 + (i // cols) * (th + 110)
        sheet.paste(Image.open(os.path.join(KDIR, f"{k}.png")).convert("RGB").resize((tw - 10, th - 10)), (x + 5, y + 5))
        d.text((x + 12, y + th + 2), c["name"], font=f.get("bold", 30), fill=hexrgb(c["color"]))
        if c.get("dev") and f.raqm:
            d.text((x + 12, y + th + 38), c["dev"], font=f.get("dev", 30), fill=hexrgb(c["color"]))
        v = c.get("voice", {})
        d.text((x + 12, y + th + 78), f"{c['kind']} | {v.get('edge', '').replace('hi-IN-', '').replace('Neural', '')} {v.get('pitch', '')} {v.get('rate', '')} {v.get('fx', '')}".strip(),
               font=f.get("bold", 18), fill=(220, 220, 220))
    out = os.path.join(KDIR, "character-sheet.png")
    sheet.save(out, optimize=True)
    print(json.dumps({"sheet": out, "characters": [k for k, _ in items]}))


# ---------------------------------------------------------------- voice ----
def all_lines(spec):
    """Every spoken line in order: the scenes' lines, then the end line (subscribe ask). (scene index | 'end', line)."""
    out = [(si, l) for si, sc in enumerate(spec["scenes"]) for l in sc["lines"]]
    out.append(("end", {"who": spec.get("lead", "narrator"), **spec["endcard"]}))
    return out


def cmd_voice(a):
    spec, chars = load(a.spec), cast()["characters"]
    os.makedirs(a.out, exist_ok=True)
    lines, engine, meta = all_lines(spec), "edge-tts", []
    # Human chain (voice/humanize.py, 10 Nov 2026): each character keeps its fixed edge voice/pitch/rate, modulated by
    # the line's mood; 50-150 ms between speakers, longer at scene changes and after emotional lines.
    human_on = os.environ.get("SPS_HUMAN_VOICE", "1") != "0"
    pauses = []
    for i, (si, l) in enumerate(lines):
        nxt = lines[i + 1] if i + 1 < len(lines) else None
        if human_on and nxt is not None:
            pauses.append(human_pause(f"{i}|{l['tts']}", nxt[1]["who"] == l["who"], l["tts"], l.get("mood"), scene_change=nxt[0] != si))
            continue
        if nxt is None:
            pause = 1.2
        elif nxt[0] != si:
            pause = 0.55  # scene change (a Short: brisk)
        elif nxt[1]["who"] != l["who"]:
            pause = 0.35 + (0.12 if l["tts"].rstrip().endswith("?") else 0)
        else:
            pause = 0.22
        pauses.append(pause)
    made = human_voices([{"text": l["tts"], "voice": chars[l["who"]]["voice"], "mood": l.get("mood"), "out": f"{a.out}/line-{i:02d}.wav",
                          "lead": 0.06, "pause": pauses[i], "fx": M.FX.get(chars[l["who"]]["voice"].get("fx", ""), ""), "seed": f"{l['who']}|{i}|{l['tts']}"}
                         for i, (si, l) in enumerate(lines)]) if human_on else {}
    if made:
        engine = "edge-tts (human chain)"
    for i, (si, l) in enumerate(lines):
        v = chars[l["who"]]["voice"]
        raw, out = f"{a.out}/{i:02d}-raw", f"{a.out}/line-{i:02d}.wav"
        pause = pauses[i]
        if i not in made:
            try:
                asyncio.run(edge_say(l["tts"], v, raw + ".mp3")); src = raw + ".mp3"
            except Exception:
                kokoro_say(l["tts"], {"kokoro": "hf_alpha" if "Swara" in v["edge"] else "hm_omega"}, raw + ".wav", "hi"); src = raw + ".wav"
                engine = "kokoro (edge-tts failed)"
            fx = M.FX.get(v.get("fx", ""), "")
            ff("-i", src, "-af",
               "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,"
               "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,"
               f"loudnorm=I=-18:TP=-2:LRA=11{',' + fx if fx else ''},aresample=24000,adelay=60:all=1,apad=pad_dur={pause:.2f}",
               "-ac", "1", "-ar", "24000", out)
            for f in (raw + ".mp3", raw + ".wav"):
                if os.path.exists(f):
                    os.remove(f)
        secs = wav_len(out)
        meta.append({"i": i, "scene": si, "who": l["who"], "file": os.path.basename(out), "seconds": round(secs, 3),
                     "speech_s": round(secs - pause - 0.06, 3), "pause_s": pause})
    total = sum(m["seconds"] for m in meta)
    json.dump({"engine": engine, "total_s": round(total, 2), "lines": meta}, open(f"{a.out}/voice.json", "w"), indent=1)
    print(json.dumps({"voice": engine, "lines": len(meta), "total_s": round(total, 1)}))


# -------------------------------------------------------------- dataset ----
def has_portrait(who):
    return os.path.exists(os.path.join(KDIR, f"{who}.png"))


def shot_of(si, l, spec, chars):
    """wide = the scene's picture (a scene's first line, narrator, characters without a portrait), close = the speaker."""
    if si == "end":
        return "close" if has_portrait(l["who"]) else "wide"
    if l.get("shot") in ("wide", "close"):
        return l["shot"] if l["shot"] == "wide" or has_portrait(l["who"]) else "wide"
    if chars.get(l["who"], {}).get("kind") in (None, "voice") or spec["scenes"][si]["lines"][0] is l:
        return "wide"
    return "close" if has_portrait(l["who"]) else "wide"


def cmd_dataset(a):
    spec, lib = load(a.spec), cast()
    chars = lib["characters"]
    voice = load(f"{a.voice}/voice.json")["lines"]
    fresh(a.out)
    images, clips, lips, qa = [], [], [], []
    for si, sc in enumerate(spec["scenes"]):  # picked frames (cast session) win; else FLUX on the GPU
        pf = os.path.join(a.frames, f"s{si}.png") if a.frames else ""
        if pf and os.path.exists(pf):
            shutil.copy(pf, f"{a.out}/s{si}.png")
        else:
            images.append({"id": f"s{si}", "prompt": scene_prompt(sc, spec, chars), "seed": int(sc.get("seed", 7 + 13 * si)), "w": FW, "h": FH})
    lines = all_lines(spec)
    marked = [si for si, sc in enumerate(spec["scenes"]) if sc.get("animate")][:int(a.clips)]
    for si in marked:
        sc = spec["scenes"][si]
        wide = sum(v["seconds"] for v, (s2, l) in zip(voice, lines) if s2 == si and shot_of(s2, l, spec, chars) == "wide")
        secs = min(6.5, max(3.5, wide))
        clips.append({"id": f"s{si}", "image": f"s{si}", "prompt": motion(sc), "frames": 81, "seconds": round(secs, 2), "seed": 42 + si})
    stills = [f"s{si}" for si in range(len(spec["scenes"])) if si not in marked]
    speaking = []
    for i, (si, l) in enumerate(lines):
        c = chars.get(l["who"], {})
        shutil.copy(f"{a.voice}/line-{i:02d}.wav", f"{a.out}/line-{i:02d}.wav")
        if c.get("lipsync") and shot_of(si, l, spec, chars) == "close":
            lips.append({"id": f"lip-{i:02d}", "who": l["who"], "audio": f"line-{i:02d}.wav", "seconds": voice[i]["seconds"],
                         **({"box_frac": c["face_box"]} if c.get("face_box") else {}), **({"mask": c["mouth"]} if c.get("mouth") else {})})
            if l["who"] not in speaking:
                speaking.append(l["who"])
        qa.append({"id": f"{i:02d}", "who": l["who"], "audio": f"line-{i:02d}.wav", "text": l["tts"],
                   "names": [n for n in spec.get("names", []) if n in l["tts"]]})
    shutil.copy(f"{a.voice}/voice.json", f"{a.out}/voice.json")
    new_base = []
    extra_ids = [w for w in (a.base or "").split(",") if w and w not in speaking]  # --base: fill the library ahead
    for who in speaking + extra_ids:  # base clip: from the library, else made now from the canonical portrait (once, then kept)
        lib_clip = os.path.join(KDIR, "clips", f"{who}.mp4")
        if os.path.exists(lib_clip):
            if who in speaking:
                shutil.copy(lib_clip, f"{a.out}/castclip-{who}.mp4")
        elif has_portrait(who):
            shutil.copy(os.path.join(KDIR, f"{who}.png"), f"{a.out}/cast-{who}.png")
            extra = {"bal-ganesh": ", the big soft ears sway very gently", "bal-hanuman": ", the tail curls gently",
                     "mahadev": ", the tiny Ganga stream flows gently and the small cobra moves slowly"}.get(who, "")
            clips.append({"id": f"cast-{who}", "image": f"cast-{who}.png", "frames": 81, "seconds": 4.2, "seed": 5,
                          "prompt": f"{chars[who]['description']}. A locked-off static camera, no zoom, no camera movement. Motion: the character "
                                    f"breathes calmly and blinks naturally, the head stays still and faces the camera, the mouth stays closed{extra}. "
                                    "The face keeps exactly the same identity throughout. 3D animated family movie, soft warm light"})
            new_base.append(who)
    # A "talk" clip (cast.json "talk": true): the character talking (mouth/trunk moving), for faces MuseTalk cannot
    # lip-sync (Bal Ganesh's mouth sits under the trunk). Played on that character's close-ups while it speaks.
    closeups = [l["who"] for si, l in lines if shot_of(si, l, spec, chars) == "close"]
    for who in dict.fromkeys(closeups + extra_ids):
        if chars.get(who, {}).get("talk") and has_portrait(who) and not os.path.exists(os.path.join(KDIR, "clips", f"{who}-talk.mp4")):
            if not os.path.exists(f"{a.out}/cast-{who}.png"):
                shutil.copy(os.path.join(KDIR, f"{who}.png"), f"{a.out}/cast-{who}.png")
            clips.append({"id": f"cast-{who}-talk", "image": f"cast-{who}.png", "frames": 81, "seconds": 4.2, "seed": 7,
                          "prompt": f"{chars[who]['description']}. A locked-off static camera, no zoom, no camera movement. Motion: "
                                    f"{chars[who]['talk']} The head stays facing the camera and the face keeps exactly the same identity "
                                    "throughout. 3D animated family movie, soft warm light"})
            new_base.append(f"{who}-talk")
    for who in filter(None, (a.draw or "").split(",")):  # --draw: new portrait candidates for a person to pick
        for n in range(int(a.seeds)):
            images.append({"id": f"cast-{who}-{n}", "prompt": portrait_prompt(chars[who], lib), "seed": 2000 + 97 * (n + int(a.seed_offset)) + len(who), "w": FW, "h": FH})
    settings = {"tier": "kalyug", "max_minutes": int(a.max_minutes), "flux": {"size": 1024, "steps": 6}, "reserve_minutes": 12 if lips else 5,
                "qa_minutes": 3, "anim": {"width": FW, "height": FH, "steps": 25, "hero14b": False}}
    stamp = f"{spec['slug']}-{int(time.time())}"
    json.dump({"stamp": stamp, "settings": settings, "images": images, "clips": clips, "stills": stills, "lips": lips, "qa": qa},
              open(f"{a.out}/movie.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    M.helpers(a.out)
    print(json.dumps({"stamp": stamp, "images": len(images), "clips": [c["id"] for c in clips], "new_base_clips": new_base,
                      "lips": len(lips), "qa": len(qa)}))


def cmd_keep(a):
    """New base clips made in this session go into the library (characters/kalyug/clips/<who>.mp4)."""
    os.makedirs(os.path.join(KDIR, "clips"), exist_ok=True)
    kept = []
    for f in glob.glob(f"{a.kaggle}/clips/cast-*.mp4"):
        who = os.path.basename(f)[5:-4]
        dst = os.path.join(KDIR, "clips", f"{who}.mp4")
        if not os.path.exists(dst) and os.path.getsize(f) > 20000:
            ff("-i", f, "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p", dst)
            kept.append(who)
    print(json.dumps({"kept": kept}))


def cmd_gate(a):
    """May a Kaggle session start now? Never inside the daily jobs' windows (09:00-11:30 and 18:30-21:00 IST) and only
    when it ends (~80 min incl. queue) before the next one opens; and only with the daily Shorts' hours kept until the
    weekly reset (story/movie.py pick_tier: ~2.4 h a day + 1 h; the episode replaces the morning Short). Episode cost
    ~40-45 GPU-min (animate/REPORT.md section 14)."""
    now = datetime.datetime.now(datetime.timezone.utc)
    ist = now + datetime.timedelta(hours=5, minutes=30)
    m = ist.hour * 60 + ist.minute
    spans = [(int(w[:2]) * 60 + int(w[3:5]), int(w[6:8]) * 60 + int(w[9:11])) for w in filter(None, WINDOWS.split(","))]
    inside = any(x <= m < y for x, y in spans)
    nxt = min([x - m for x, _ in spans if x > m] + [x + 1440 - m for x, _ in spans] or [10 ** 6])
    q = load(a.quota) if a.quota and os.path.exists(a.quota) else {}
    left = float(q.get("left", 0) or 0)
    try:
        reset = datetime.datetime.fromisoformat(q["refreshAt"].replace("Z", "+00:00"))
        days = max(1, math.ceil((reset - now).total_seconds() / 86400))
    except Exception:
        days = 7
    spare = round(left - (2.4 * days + 1.0), 2)
    why = "inside a daily Kaggle window" if inside else f"only {nxt} min to the next daily window" if nxt < 80 else \
        f"quota: {left} h left, {spare} h spare after the daily Shorts' reserve" if spare < 0.8 else ""
    print(json.dumps({"go": not why, "why": why, "left_h": left, "spare_h": spare, "days_to_reset": days, "ist": ist.strftime("%H:%M")}))
    if os.environ.get("GITHUB_OUTPUT"):
        open(os.environ["GITHUB_OUTPUT"], "a").write(f"go={'true' if not why else 'false'}\nwhy={why}\n")


# --------------------------------------------------------------- render ----
SERIES_DAYS = "Har Mangal, Guru aur Shani"


class Episode(M.Movie):
    """The movie renderer's shots (wide tracks, lip-synced close-ups with the mouth check, subtitles) with a Short's
    pacing: no silent title beat, the title is an overlay on the hook, a subscribe end card on the lead's close-up."""

    def lead_color(self):
        return hexrgb(self.chars.get(self.spec.get("lead"), {}).get("color", "FFD666"))

    def kfile(self, *parts):
        p = super().kfile(*parts)
        if p and parts[0] == "clips" and parts[-1].startswith("s") and not self.clip_ok(p):
            return None  # rejected scene clip: the scene's still with a camera move instead
        return p

    def talk_clip(self, who):
        p = os.path.join(KDIR, "clips", f"{who}-talk.mp4")
        return self.kfile("clips", f"cast-{who}-talk.mp4") or (p if os.path.exists(p) else None)

    def close_shot(self, i, who, dur):
        """Lip-synced clip (mouth check) > the character's talk clip (cartoon faces MuseTalk cannot do) > base clip > portrait."""
        lip = self.kfile("lip", f"lip-{i:02d}.mp4")
        if lip and self.lip_ok(lip, who):
            return super().close_shot(i, who, dur)
        talk = self.talk_clip(who)
        if not talk:
            return super().close_shot(i, who, dur)
        out = f"{self.build}/close-{i:02d}.mp4"
        n = max(1, round(dur * FPS))
        push = f"zoompan=z='1.04+0.06*on/{n}':x='iw/2-(iw/zoom/2)':y='ih*0.42-(ih/zoom*0.42)':d=1:s={W}x{H}:fps={FPS}"
        rev = f"{self.build}/talk-{who}-pp.mp4"
        if not os.path.exists(rev):  # ping-pong loop: never a jump back to the first frame
            ff("-i", talk, "-filter_complex", "[0:v]split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0[v]", "-map", "[v]", "-an",
               "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", rev)
        ff("-stream_loop", "-1", "-i", rev, "-filter_complex",
           f"[0:v]fps={FPS},scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1,trim=duration={dur:.3f},{push},format=yuv420p[v]",
           "-map", "[v]", "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-t", f"{dur:.3f}", out)
        self.used["talk"] = self.used.get("talk", 0) + 1
        return out

    def clip_ok(self, path):
        """Automatic reject check for a scene clip, the same rules as animate/check-clips.mjs (no person in the loop):
        a frame-to-frame change over 6x the median that covers >= 25% of the frame (a flash, cut or flicker), or a hue
        family absent from the first frame on > 0.2% of the pixels (a rainbow/blue streak) rejects it."""
        import numpy as np
        if not hasattr(self, "_clip_ok"):
            self._clip_ok, self.clip_checks = {}, {}
        if path in self._clip_ok:
            return self._clip_ok[path]
        S = 128
        r = subprocess.run([os.environ.get("FFMPEG_PATH", "ffmpeg"), "-v", "error", "-i", path, "-vf", f"fps=8,scale={S}:{S}", "-f", "rawvideo",
                            "-pix_fmt", "rgb24", "-"], capture_output=True)
        fr = np.frombuffer(r.stdout, np.uint8)
        n = len(fr) // (S * S * 3)
        ok = True
        if n >= 4:
            v = fr[:n * S * S * 3].reshape(n, S * S, 3).astype(np.float32)
            e = np.abs(np.diff(v, axis=0)).sum(axis=2)
            diffs, cover = e.mean(axis=1) / 3, (e > 60).mean(axis=1)
            med = float(np.sort(diffs)[len(diffs) // 2])
            ratios = diffs / (med + 0.5)
            spike = float(max([0.0] + [ratios[k] for k in range(len(ratios)) if cover[k] >= 0.25]))
            c = v / 255
            mx, mn = c.max(axis=2), c.min(axis=2)
            d = mx - mn
            valid = (mx >= 0.25) & (d / np.maximum(mx, 1e-6) >= 0.2)
            R, G, B = c[..., 0], c[..., 1], c[..., 2]
            dd = np.maximum(d, 1e-6)
            h = np.where(mx == R, np.mod((G - B) / dd, 6), np.where(mx == G, (B - R) / dd + 2, (R - G) / dd + 4))
            bins = (np.mod(h * 60 + 360, 360) // 30).astype(int)
            hist = np.stack([np.bincount(bins[k][valid[k]], minlength=12)[:12] for k in range(n)])
            ref = hist[0] * 2
            absent = [(ref[(k + 11) % 12] + ref[k] + ref[(k + 1) % 12]) < 0.0005 * 2 * S * S for k in range(12)]
            new = float(max((hist[k][absent].sum() if any(absent) else 0) / (S * S) for k in range(n)))
            why = (f"flicker/jump {spike:.1f}x" if spike > 6 else "") or (f"colour streak {new * 100:.2f}%" if new > 0.002 else "")
            ok = not why
            self.clip_checks[os.path.basename(path)] = {"ok": ok, "why": why, "spike": round(spike, 2), "new_colour": round(new, 4)}
        self._clip_ok[path] = ok
        return ok

    # Devanagari needs complex shaping. Pillow does it with libraqm (the CI runner); where raqm is missing (a Windows PC)
    # the rows are drawn by ffmpeg's drawtext (HarfBuzz shaping) into transparent PNGs instead, so subtitles and the title
    # are never Roman-only.
    def dev_row(self, text, size, color, stroke=3):
        from PIL import Image, ImageDraw
        if self.f.raqm:
            fd = self.f.get("dev", size)
            im = Image.new("RGBA", (W * 2, int(size * 2.2)), (0, 0, 0, 0))
            ImageDraw.Draw(im).text((20, size // 3), text, font=fd, fill=tuple(color[:3]), stroke_width=stroke, stroke_fill=(0, 0, 0))
            bb = im.getbbox()
            return im.crop(bb) if bb else im
        key = f"dev-{abs(hash((text, size, color, stroke)))}"
        png = os.path.join(self.build, key + ".png")
        if not os.path.exists(png):
            if not os.path.exists(os.path.join(self.build, "dev.ttf")):
                shutil.copy(M.FONT_DEV, os.path.join(self.build, "dev.ttf"))
            open(os.path.join(self.build, key + ".txt"), "w", encoding="utf-8").write(text)
            col = "0x%02X%02X%02X" % tuple(color[:3])
            r = subprocess.run([os.environ.get("FFMPEG_PATH", "ffmpeg"), "-v", "error", "-y", "-f", "lavfi", "-i",
                                f"color=c=0x00000000:s={W * 2}x{int(size * 2.2)},format=rgba", "-vf",
                                f"drawtext=fontfile=dev.ttf:textfile={key}.txt:fontsize={size}:fontcolor={col}:borderw={stroke}:"
                                f"bordercolor=black:x=20:y=(h-th)/2", "-frames:v", "1", key + ".png"], cwd=self.build, capture_output=True, text=True)
            if r.returncode:
                raise RuntimeError(r.stderr[-500:])
        im = Image.open(png).convert("RGBA")
        bb = im.getbbox()
        return im.crop(bb) if bb else im

    def dev_rows(self, text, size, color, maxw):
        rows, cur = [], ""
        for w_ in text.split():
            cand = f"{cur} {w_}".strip()
            if cur and self.dev_row(cand, size, color).width > maxw:
                rows.append(self.dev_row(cur, size, color))
                cur = w_
            else:
                cur = cand
        if cur:
            rows.append(self.dev_row(cur, size, color))
        return rows

    def subtitle(self, line, name):
        if self.f.raqm:
            return super().subtitle(line, name)
        from PIL import Image, ImageDraw
        col = hexrgb(self.chars[line["who"]]["color"])
        im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        rows_d = self.dev_rows(line["tts"], 58, col, W - 220)
        fr = self.f.get("bold", 36)
        rows_r = wrap(d, line["sub"], fr, W - 260)
        rh = sum(r.height + 12 for r in rows_d) + 48 * len(rows_r)
        y0 = H - 330 - rh
        for y in range(y0 - 120, H):
            d.line([0, y, W, y], fill=(0, 0, 0, int(min(185, 185 * (y - y0 + 120) / 220))))
        if name:
            nf = self.f.get("bold", 36)
            tw = d.textlength(name, font=nf)
            d.rounded_rectangle([46, y0 - 70, 46 + tw + 70, y0 - 14], 28, fill=col + (235,))
            d.ellipse([62, y0 - 52, 82, y0 - 32], fill=(255, 255, 255))
            d.text((92, y0 - 66), name, font=nf, fill=(20, 20, 20))
        y = y0
        for r in rows_d:
            im.alpha_composite(r, ((W - r.width) // 2, y))
            y += r.height + 12
        for t in rows_r:
            d.text(((W - d.textlength(t, font=fr)) // 2, y + 4), t, font=fr, fill=(235, 235, 235), stroke_width=2, stroke_fill=(0, 0, 0))
            y += 48
        return im

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
        t = "KALYUG KE BHAGWAN"
        tw = d.textlength(t, font=bf)
        d.rounded_rectangle([140, 44, 140 + tw + 40, 104], 30, fill=self.lead_color() + (235,))
        d.text((160, 52), t, font=bf, fill=(30, 16, 10))
        lf = self.f.get("bold", 22)
        t = "AI animation (sanketik)"
        d.text((W - d.textlength(t, font=lf) - 28, 60), t, font=lf, fill=(255, 255, 255, 170))
        return im

    def title_card(self):
        """Overlay on the hook (first ~2.6 s): the deity-first title, Roman + Devanagari, on a soft panel; the hook
        picture stays visible."""
        from PIL import Image, ImageDraw
        im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        tf = self.f.get("bold", 70)
        rows = wrap(d, self.spec["title"], tf, W - 140)
        dev = self.dev_rows(self.spec["title_dev"], 62, (255, 245, 225), W - 160) if self.spec.get("title_dev") else []
        h = 90 * len(rows) + sum(r.height + 14 for r in dev) + 60
        y0 = 250
        d.rounded_rectangle([50, y0, W - 50, y0 + h], 46, fill=(20, 8, 30, 175))
        y = y0 + 28
        for t in rows:
            d.text(((W - d.textlength(t, font=tf)) // 2, y), t, font=tf, fill=self.lead_color(), stroke_width=4, stroke_fill=(20, 8, 0))
            y += 90
        for r in dev:
            im.alpha_composite(r, ((W - r.width) // 2, y))
            y += r.height + 14
        return im

    def end_card(self):
        from PIL import Image, ImageDraw
        im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        # Right under the header and small, so the speaker's face stays visible.
        y = 150
        f = self.f.get("bold", 54)
        t = "SUBSCRIBE"
        tw = d.textlength(t, font=f)
        d.rounded_rectangle([(W - tw) // 2 - 50, y, (W + tw) // 2 + 50, y + 92], 46, fill=(204, 0, 0, 240))
        d.text(((W - tw) // 2, y + 14), t, font=f, fill=(255, 255, 255))
        y += 104
        ft = self.f.get("bold", 34)
        t = f"Naya episode: {SERIES_DAYS}"
        d.text(((W - d.textlength(t, font=ft)) // 2, y), t, font=ft, fill=(255, 230, 160), stroke_width=3, stroke_fill=(0, 0, 0))
        return im

    def run(self):
        lines = all_lines(self.spec)
        hdr = self.header()
        plan = [(i, si, l, shot_of(si, l, self.spec, self.chars), self.voice[i]["seconds"]) for i, (si, l) in enumerate(lines)]
        wide_need = {}
        for i, si, l, kind, d in plan:
            if kind == "wide":
                wide_need[si] = wide_need.get(si, 0) + d
        tracks = {si: [self.wide_track(si, d), 0.0] for si, d in wide_need.items()}
        title_png = f"{self.build}/title.png"
        self.title_card().save(title_png)
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
            if i == 0:  # the title rides on the hook, it never delays it
                inputs += ["-loop", "1", "-framerate", str(FPS), "-t", "2.8", "-i", title_png]
                fg += "[a1];[2:v]fade=t=out:st=2.3:d=0.5:alpha=1[tt];[a1][tt]overlay=0:0:enable='lt(t,2.8)'"
            ff(*inputs, "-filter_complex", f"{fg},format=yuv420p[v]", "-map", "[v]", "-c:v", "libx264", "-preset", "veryfast",
               "-crf", "18", "-r", str(FPS), "-t", f"{d:.3f}", seg)
            segs.append(seg)
            srt.append((t0 + 0.06, t0 + d - self.voice[i]["pause_s"] + 0.05, l["sub"], name))
            t0 += d
        lst = f"{self.build}/segs.txt"
        open(lst, "w").write("".join(f"file '{os.path.abspath(s)}'\n" for s in segs))
        joined = f"{self.build}/joined.mp4"
        ff("-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", joined)
        vt = f"{self.build}/voice.wav"
        vl = f"{self.build}/voice.txt"
        open(vl, "w").write("".join(f"file '{os.path.abspath(os.path.join(self.a.voice, self.voice[i]['file']))}'\n" for i, *_ in plan))
        ff("-f", "concat", "-safe", "0", "-i", vl, "-ar", "48000", "-ac", "2", vt)
        self.mix(joined, vt, t0, plan)
        if self.a.srt:
            ts = lambda x: f"{int(x // 3600):02d}:{int(x % 3600 // 60):02d}:{int(x % 60):02d},{int(round(x % 1 * 1000)) % 1000:03d}"
            open(self.a.srt, "w", encoding="utf-8").write("".join(
                f"{k + 1}\n{ts(a0)} --> {ts(b0)}\n{(n + ': ') if n else ''}{txt}\n\n" for k, (a0, b0, txt, n) in enumerate(srt)))
        meta = {"seconds": round(t0, 2), "shots": len(plan), "animated_scenes": sorted(set(self.used["clips"])), "lip_lines": self.used["lip"],
                "closeups_no_lip": self.used["closeups"], "talk_lines": self.used.get("talk", 0), "still_tracks": self.used["stills"], "devanagari_subtitles": self.f.raqm,
                "lip_check": self.lip_scores, "clip_checks": getattr(self, "clip_checks", {})}
        if self.a.meta:
            json.dump(meta, open(self.a.meta, "w"), indent=1)
        if self.a.small:
            self.small_copy(t0)
        if not self.a.keep_build:
            shutil.rmtree(self.build, ignore_errors=True)
        print(json.dumps({"out": self.a.out, **meta}))

    def mix(self, video, voice, total, plan):
        """Light synthesized score (playful: a soft pentatonic pluck over a warm pad; calm: the tanpura drone), a
        magic chime when the lead deity first appears, a soft bell on scene changes; ducked under the voices, -14 LUFS."""
        T = f"{total + 0.5:.2f}"
        pad = (f"aevalsrc='0.07*sin(2*PI*130.81*t)*(1+0.2*sin(2*PI*0.2*t))+0.05*sin(2*PI*196*t)*(1+0.2*sin(2*PI*0.27*t))"
               f"+0.03*sin(2*PI*261.63*t)|0.07*sin(2*PI*130.81*t+0.5)+0.05*sin(2*PI*196*t+0.3)+0.03*sin(2*PI*261.63*t+0.2)':s=48000:d={T}")
        step = 0.42
        k = f"floor(mod(t,{8 * step:.2f})/{step})"
        semis = [0, 4, 7, 9, 12, 9, 7, 4]
        n = "+".join(f"{s_}*eq({k},{j})" for j, s_ in enumerate(semis) if s_)
        pluck = f"aevalsrc='0.10*sin(2*PI*523.25*pow(2,({n})/12)*t)*exp(-7*mod(t,{step}))':s=48000:d={T}"
        drone = (f"aevalsrc='0.09*sin(2*PI*138.59*t)*(1+0.25*sin(2*PI*0.18*t))+0.06*sin(2*PI*207.65*t)*(1+0.2*sin(2*PI*0.23*t))|"
                 f"0.09*sin(2*PI*138.59*t+0.4)+0.06*sin(2*PI*207.65*t+0.3)':s=48000:d={T}")
        room = f"anoisesrc=d={T}:c=brown:a=0.5:r=48000,lowpass=f=380"
        music = self.spec.get("music", "playful")
        beds, vols = ([pad, pluck, room], [0.55, 0.30, 0.05]) if music == "playful" else ([drone, pad, room], [0.40, 0.25, 0.06])
        bell = "aevalsrc='0.45*sin(2*PI*1046*t)*exp(-2.2*t)+0.25*sin(2*PI*2093*t)*exp(-3.5*t)+0.15*sin(2*PI*1568*t)*exp(-2.8*t)':s=48000:d=4"
        chime = ("aevalsrc='0.22*sin(2*PI*(1318+900*t)*t)*exp(-3*t)+0.18*sin(2*PI*1760*t)*exp(-4*mod(t,0.12))*lt(t,0.6)"
                 "+0.15*sin(2*PI*2637*t)*exp(-2.5*t)':s=48000:d=2.5")
        sfx, t, prev, deity_seen = [(bell, 0.0, 0.35)], 0.0, None, False
        lead = self.spec.get("lead")
        for i, si, l, kind, d in plan:
            if si != prev and isinstance(si, int):
                appears = not deity_seen and lead in self.spec["scenes"][si].get("cast", [])
                if appears:
                    sfx.append((chime, max(0, t - 0.15), 0.8))
                    deity_seen = True
                elif si > 0:
                    sfx.append((bell, t, 0.18))
            if si == "end" and prev != "end":
                sfx.append((chime, t, 0.6))
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


def main():
    p = argparse.ArgumentParser()
    p.add_argument("cmd")
    for o in ("--spec", "--out", "--voice", "--kaggle", "--frames", "--meta", "--srt", "--small", "--today", "--choose", "--quota"):
        p.add_argument(o)
    p.add_argument("--ids", default="missing"); p.add_argument("--seeds", default=3); p.add_argument("--frame-seeds", default=2)
    p.add_argument("--clips", default=2); p.add_argument("--max-minutes", default=60); p.add_argument("--keep-build", action="store_true")
    p.add_argument("--force", action="store_true"); p.add_argument("--base", default=""); p.add_argument("--draw", default="")
    p.add_argument("--seed-offset", default=0)
    a = p.parse_args()
    fn = globals().get(f"cmd_{a.cmd}")
    if not fn:
        raise SystemExit(f"unknown command {a.cmd}")
    fn(a)


if __name__ == "__main__":
    main()
