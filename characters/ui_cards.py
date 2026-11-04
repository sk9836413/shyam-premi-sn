# Illustrated mock-ups for the EpiFive "Max & Riya" story panel, drawn from the draft's visuals.json (the same types
# the motion reel uses, already checked against the article by scripts/social/validate.mjs). Plain text product names
# only: no Microsoft logos or icons. draw_visual(v, font, W, H) -> PIL image W x H.
from PIL import Image, ImageDraw

G, R, A, T, MUTED = (10, 117, 96), (200, 55, 55), (214, 140, 20), (20, 24, 29), (90, 98, 108)
BG = (236, 240, 237)


def _wrap(d, text, f, maxw):
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


def _card(d, box, title=None, font=None):
    x0, y0, x1, y1 = box
    d.rounded_rectangle([x0 + 6, y0 + 10, x1 + 6, y1 + 10], 28, fill=(214, 218, 214))
    d.rounded_rectangle(box, 28, fill=(255, 255, 255), outline=(217, 221, 216), width=2)
    if title:
        d.text((x0 + 36, y0 + 24), title, font=font("semi", 32), fill=MUTED)
        d.line([x0 + 30, y0 + 78, x1 - 30, y0 + 78], fill=(230, 232, 229), width=2)


def _pill(d, x, y, text, bg, font, fg=(255, 255, 255), size=30):
    f = font("bold", size)
    w = d.textlength(text, font=f)
    d.rounded_rectangle([x, y, x + w + 40, y + size + 26], (size + 26) // 2, fill=bg)
    d.text((x + 20, y + 9), text, font=f, fill=fg)
    return x + w + 40


def _check(d, cx, cy, r, col, w=6):
    d.line([(cx - r * 0.55, cy + r * 0.02), (cx - r * 0.12, cy + r * 0.45), (cx + r * 0.6, cy - r * 0.45)], fill=col, width=w, joint="curve")


def _cross(d, cx, cy, r, col, w=6):
    d.line([cx - r * 0.45, cy - r * 0.45, cx + r * 0.45, cy + r * 0.45], fill=col, width=w)
    d.line([cx - r * 0.45, cy + r * 0.45, cx + r * 0.45, cy - r * 0.45], fill=col, width=w)


def draw_visual(v, font, W=1080, H=690):
    im = Image.new("RGB", (W, 560), BG)
    d = ImageDraw.Draw(im)
    for gx in range(0, W, 40):
        d.line([gx, 0, gx, 560], fill=(230, 234, 231))
    t = v.get("type")
    if t == "terminal":
        d.rounded_rectangle([60, 70, W - 60, 500], 22, fill=(18, 22, 30))
        d.rounded_rectangle([60, 70, W - 60, 126], 22, fill=(38, 44, 56)); d.rectangle([60, 104, W - 60, 126], fill=(38, 44, 56))
        for k, c in enumerate([(237, 106, 94), (245, 191, 79), (98, 197, 84)]):
            d.ellipse([88 + 34 * k, 88, 108 + 34 * k, 108], fill=c)
        d.text((210, 82), v.get("title") or "PowerShell", font=font("semi", 28), fill=(200, 206, 214))
        y, mono = 150, font("mono", 30)
        for line in v.get("lines", [])[:4]:
            (k, text), = line.items()
            col = {"cmd": (240, 240, 240), "out": (170, 178, 189), "err": (255, 120, 110), "ok": (110, 220, 150)}[k]
            rows = _wrap(d, ("PS> " if k == "cmd" else "") + text, mono, W - 200)
            for r in rows[:3]:
                d.text((96, y), r, font=mono, fill=col); y += 44
            y += 10
    elif t == "alert":
        col = R if v.get("level", "error") == "error" else A
        _card(d, (70, 80, W - 70, 490))
        d.rounded_rectangle([70, 80, W - 70, 100], 10, fill=col)
        d.ellipse([110, 140, 190, 220], fill=col)
        d.text((141, 146), "!", font=font("bold", 56), fill=(255, 255, 255))
        y = 140
        for r in _wrap(d, v.get("title", ""), font("bold", 42), W - 340)[:2]:
            d.text((220, y), r, font=font("bold", 42), fill=T); y += 54
        y = max(y + 20, 270)
        for r in _wrap(d, v.get("text", ""), font("reg", 34), W - 260)[:4]:
            d.text((120, y), r, font=font("reg", 34), fill=(60, 66, 76)); y += 46
    elif t == "toggle":
        _card(d, (60, 50, W - 60, 510), v.get("title"), font)
        y = 150
        for it in v.get("items", [])[:4]:
            on = str(it.get("to", "")).lower() in ("on", "enabled", "yes", "allowed", "required", "report-only")
            d.rounded_rectangle([100, y, 196, y + 50], 25, fill=G if on else (176, 182, 188))
            cx = 171 if on else 125
            d.ellipse([cx - 19, y + 6, cx + 19, y + 44], fill=(255, 255, 255))
            d.text((216, y + 6), it.get("name", ""), font=font("bold", 32), fill=T)
            if it.get("to"):
                x = W - 100 - d.textlength(f"{it.get('from', '')}  →  {it['to']}", font=font("reg", 28)) - 20
                d.text((x, y + 10), f"{it.get('from', '')}  →  {it['to']}" if it.get("from") else it["to"], font=font("reg", 28), fill=MUTED)
            y += 88
    elif t == "checklist":
        _card(d, (60, 50, W - 60, 510), v.get("title"), font)
        y = 150
        for it in v.get("items", [])[:4]:
            d.ellipse([100, y, 156, y + 56], fill=(220, 236, 231)); _check(d, 128, y + 28, 20, G)
            d.text((180, y + 6), it, font=font("bold", 34), fill=T); y += 88
    elif t == "compare":
        for k, (box, label, text, good) in enumerate([((50, 70, 525, 500), v.get("badLabel", "Don't"), v.get("bad", ""), False),
                                                       ((555, 70, W - 50, 500), v.get("goodLabel", "Do"), v.get("good", ""), True)]):
            _card(d, box)
            col = G if good else R
            d.ellipse([box[0] + 30, 100, box[0] + 96, 166], fill=col)
            (_check if good else _cross)(d, box[0] + 63, 133, 26, (255, 255, 255), 8)
            d.text((box[0] + 116, 108), label, font=font("bold", 40), fill=col)
            y = 200
            for r in _wrap(d, text, font("reg", 34), box[2] - box[0] - 70)[:6]:
                d.text((box[0] + 36, y), r, font=font("reg", 34), fill=T); y += 46
    elif t == "stat":
        _card(d, (110, 70, W - 110, 500))
        val = str(v.get("value", ""))
        size = 150
        while size > 70 and d.textlength(val, font=font("bold", size)) > W - 300:
            size -= 10
        d.text(((W - d.textlength(val, font=font("bold", size))) // 2, 120), val, font=font("bold", size), fill=G)
        y = 330
        for r in _wrap(d, v.get("label", ""), font("semi", 36), W - 320)[:3]:
            d.text(((W - d.textlength(r, font=font("semi", 36))) // 2, y), r, font=font("semi", 36), fill=MUTED); y += 48
    elif t == "steps":
        items = v.get("items", [])[:4]
        y = 70
        for k, it in enumerate(items):
            d.ellipse([90, y, 160, y + 70], fill=G)
            n = str(k + 1)
            d.text((125 - d.textlength(n, font=font("bold", 40)) / 2, y + 10), n, font=font("bold", 40), fill=(255, 255, 255))
            d.rounded_rectangle([190, y, W - 80, y + 70], 20, fill=(255, 255, 255), outline=(217, 221, 216), width=2)
            d.text((216, y + 14), it, font=font("bold", 34), fill=T)
            if k < len(items) - 1:
                d.line([125, y + 74, 125, y + 104], fill=G, width=6)
            y += 110
    else:  # end card
        _card(d, (110, 90, W - 110, 480))
        t1, t2 = "Full guide on", "epifive.com"
        d.text(((W - d.textlength(t1, font=font("semi", 48))) // 2, 150), t1, font=font("semi", 48), fill=MUTED)
        d.text(((W - d.textlength(t2, font=font("bold", 92))) // 2, 220), t2, font=font("bold", 92), fill=G)
        t3 = "Like  ·  Subscribe  for more fixes"
        x = (W - d.textlength(t3, font=font("bold", 28)) - 40) // 2
        _pill(d, x, 380, t3, A, font, size=28)
    out = Image.new("RGB", (W, H), BG)
    # the subtitle band covers the panel's lower part, so the card stays in the top ~470 px
    out.paste(im.resize((int(W * 0.8), int(560 * 0.8)), Image.LANCZOS), (int(W * 0.1), 18))
    return out
