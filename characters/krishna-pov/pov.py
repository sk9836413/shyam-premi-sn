# "Shri Krishna kehte hain" / Shyam POV (STORY.md section 10): 45-60 s vertical Shorts in which ONE character, our own
# 2D illustrated Shri Krishna, talks straight to the camera in first person: a festival tie-in + a modern relatable
# question, answered with a gentle, positive message in the spirit of the Gita (a real verse only with chapter.verse).
# Spec = story/krishna-pov/<release>-<topic>.json ("format": "krishna-pov"; ideas in automation/krishna-pov-topics.json);
# character = characters/krishna-pov/cast.json (one master portrait + base clip + fixed voice).
# The engine is characters/kailash/kailash.py pointed at this library (same Kaggle kernel code: story/movie_kernel.py,
# kernel sps-krishna-pov): most lines are lip-synced close-ups (MuseTalk on the flat face; when OpenCV finds no face on
# 2D art the face box is measured on the portrait, cast.json face_box/mouth); a few lines may run over an illustrated
# B-roll picture (scenes[].prompt, a FLUX frame with a slow camera move). A small text label (spec.label) sits on top.
#   python -I characters/krishna-pov/pov.py cast|pick|sheet|voice|dataset|render|qa|keep|gate|gpu  (as kailash.py)
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, "characters", "kailash"))
import kailash as KL  # noqa: E402

K, M = KL.K, KL.M
KL.KDIR = K.KDIR = M.CAST_DIR = HERE
KL.SERIES_DAYS = "Mangal, Shukra aur tyohar"
KL.DEITY_NAMES = ["कृष्ण", "श्याम", "श्रीकृष्ण", "कान्हा", "गोविंद", "गीता", "खाटू", "राधा", "तुलसी", "राम"]
KL.LEN_RANGE = (45, 62)
from dialogue import hexrgb  # noqa: E402

W, H = M.W, M.H


class Episode(KL.Episode):
    def header(self):
        """Logo, the series pill and the small topic label (spec.label, e.g. "Ghar ke buzurg"), AI line."""
        from PIL import Image, ImageDraw
        im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        for y in range(0, 260):
            d.line([0, y, W, y], fill=(0, 0, 0, int(130 * (1 - y / 260))))
        logo = os.path.join(ROOT, "brand", "logo.png")
        if os.path.exists(logo):
            im.alpha_composite(Image.open(logo).convert("RGBA").resize((96, 96)), (28, 28))
        bf = self.f.get("bold", 32)
        t = "SHRI KRISHNA KEHTE HAIN"
        tw = d.textlength(t, font=bf)
        d.rounded_rectangle([140, 44, 140 + tw + 40, 102], 29, fill=(79, 195, 247, 235))
        d.text((160, 52), t, font=bf, fill=(10, 20, 40))
        lab = (self.spec.get("label") or "").strip()
        if lab:
            lf = self.f.get("bold", 40)
            lw = d.textlength(lab, font=lf)
            x0 = (W - lw) // 2 - 30
            d.rounded_rectangle([x0, 130, x0 + lw + 60, 196], 33, fill=(255, 255, 255, 230))
            d.text((x0 + 30, 138), lab, font=lf, fill=(30, 30, 60))
        sf = self.f.get("bold", 22)
        t = "AI chitra (sanketik)"
        d.text((W - d.textlength(t, font=sf) - 28, 60), t, font=sf, fill=(255, 255, 255, 170))
        return im


def cmd_render(a):
    Episode(a).run()


_kailash_sheet = KL.cmd_sheet


def cmd_sheet(a):
    _kailash_sheet(a)
    p = os.path.join(HERE, "character-sheet.png")
    if os.path.exists(p):  # retitle the master sheet
        from PIL import Image, ImageDraw
        im = Image.open(p).convert("RGB")
        d = ImageDraw.Draw(im)
        d.rectangle([0, 0, im.width, 108], fill=(14, 22, 40))
        f = M.Fonts()
        d.text((24, 20), "Shri Krishna kehte hain", font=f.get("bold", 46), fill=(255, 214, 102))
        d.text((24, 74), "Shyam Premi SN: master character sheet (original 2D design; voice fixed)", font=f.get("bold", 22), fill=(220, 230, 255))
        im.save(p, optimize=True)


def cmd_pick(a):
    for pair in filter(None, (a.choose or "").split(",")):
        who, n = pair.split("=")
        if who[0] == "s" and who[1:].isdigit():
            continue
        dst = os.path.join(HERE, f"{who}.png")
        if os.path.exists(dst) and not a.force:
            raise SystemExit(f"{dst} exists: a master portrait is never replaced (use --force only with the owner's ok)")
    import shutil
    for pair in filter(None, (a.choose or "").split(",")):
        who, n = pair.split("=")
        if who[0] == "s" and who[1:].isdigit():
            os.makedirs(a.out, exist_ok=True)
            shutil.copy(os.path.join(a.kaggle, "frames", f"{who}-{n}.png"), os.path.join(a.out, f"{who}.png"))
        else:
            shutil.copy(os.path.join(a.kaggle, "frames", f"cast-{who}-{n}.png"), os.path.join(HERE, f"{who}.png"))
    cmd_sheet(a)


for name in ("cast", "voice", "dataset", "qa", "keep", "gate", "gpu"):
    globals()[f"cmd_{name}"] = getattr(KL, f"cmd_{name}")

if __name__ == "__main__":
    KL.cmd_render, KL.cmd_sheet, KL.cmd_pick = cmd_render, cmd_sheet, cmd_pick
    KL.main()
