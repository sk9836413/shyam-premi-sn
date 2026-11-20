#!/usr/bin/env python3
"""Media checks for the darshan inbox (scripts/inbox.mjs). No AI, nothing generated: measurements and light corrections.

  python scripts/inbox_media.py still <in> <out.jpg>   photo (jpg/png/heic) -> jpg, EXIF rotation applied and EXIF/GPS
        stripped, long side max 1080 px (Lanczos), light contrast/colour only. Prints JSON {w, h, src_w, src_h, sharp,
        faces, out}. The deity is never altered: no retouch, no generated pixels.
  python scripts/inbox_media.py video <in.mp4>         per-sample measurements (4 a second) for the cut planner:
        {duration, w, h, fps, samples: [{t, sharp, shift, scene, faces}]}
        sharp = variance of the Laplacian (focus), shift = global camera movement since the last sample (px at 320 px
        width, phase correlation), scene = HSV histogram change since the last sample (0..1), faces = close-up
        visitor faces (best effort: Haar frontal face outside the central darshan zone + skin share of its core).
  python scripts/inbox_media.py marks <file>           OCR of a few frames (or the photo) for other people's marks: an
        "@handle" or a platform watermark (Instagram / TikTok / Moj ... reels downloaded from someone). Prints
        {ocr: bool, engine, texts: [per-frame text]}; scripts/inbox.mjs marksVerdict() decides. Engine: the tesseract
        CLI (apt tesseract-ocr in Actions) or rapidocr_onnxruntime when installed; {ocr: false} when neither is there.
Needs opencv-python-headless, numpy, pillow (pillow-heif for .heic).
"""
import json
import sys

import cv2
import numpy as np

SAMPLE_FPS = 4
WORK_W = 320  # analysis width for sharpness / motion / scene
FACE_W = 640  # analysis width for faces
_CASCADE = []  # loaded on first use (OpenCV 4.x; .github/workflows/inbox.yml pins opencv-python-headless<5)


def cascade():
    if not _CASCADE:
        _CASCADE.append(cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml"))
    return _CASCADE[0]


def visitor_faces(bgr):
    """Close-up visitor faces (best effort): a Haar frontal face at least 10% of the frame height, outside the central
    darshan zone where the murti is, whose core is mostly human-skin coloured."""
    h, w = bgr.shape[:2]
    scale = FACE_W / float(w)
    img = cv2.resize(bgr, (FACE_W, max(1, int(h * scale))), interpolation=cv2.INTER_AREA) if w > FACE_W else bgr
    ih = img.shape[0]
    gray = cv2.equalizeHist(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY))
    min_side = max(24, int(0.10 * ih))
    found = cascade().detectMultiScale(gray, scaleFactor=1.1, minNeighbors=6, minSize=(min_side, min_side))
    n = 0
    ycc = cv2.cvtColor(img, cv2.COLOR_BGR2YCrCb)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    iw = img.shape[1]
    for (x, y, fw, fh) in found:
        # the darshan zone (centre of the frame) holds the murti: a painted deity face there is not a visitor
        fx, fy = (x + fw / 2.0) / iw, (y + fh / 2.0) / ih
        if abs(fx - 0.5) < 0.22 and 0.10 < fy < 0.70:
            continue
        # the core of the box (where cheeks, nose and forehead are): a murti's dark sheesh, red roses or a golden mukut
        # are not skin; human skin is orange-ish (hue 0-25), moderately saturated and not dark
        cx, cy = x + fw // 4, y + fh // 5
        core_ycc = ycc[cy:cy + fh * 3 // 5, cx:cx + fw // 2]
        core_hsv = hsv[cy:cy + fh * 3 // 5, cx:cx + fw // 2]
        cr, cb = core_ycc[:, :, 1], core_ycc[:, :, 2]
        hh, ss, vv = core_hsv[:, :, 0], core_hsv[:, :, 1], core_hsv[:, :, 2]
        skin = ((cr >= 135) & (cr <= 175) & (cb >= 85) & (cb <= 130) & (hh <= 25) & (ss >= 35) & (ss <= 170) & (vv >= 70)).mean()
        if skin >= 0.45:
            n += 1
    return n


def sharpness(bgr, width=WORK_W):
    h, w = bgr.shape[:2]
    small = cv2.resize(bgr, (width, max(1, int(h * width / float(w)))), interpolation=cv2.INTER_AREA)
    return float(cv2.Laplacian(cv2.cvtColor(small, cv2.COLOR_BGR2GRAY), cv2.CV_64F).var())


def still(src, out):
    from PIL import Image, ImageEnhance, ImageOps
    if src.lower().endswith((".heic", ".heif")):
        import pillow_heif  # noqa: F401  (registers the HEIF opener)
        pillow_heif.register_heif_opener()
    im = Image.open(src)
    im = ImageOps.exif_transpose(im).convert("RGB")  # phone rotation; the EXIF (GPS) is not copied
    sw, sh = im.size
    long_side = max(sw, sh)
    if long_side > 1080:
        k = 1080.0 / long_side
        im = im.resize((max(1, round(sw * k)), max(1, round(sh * k))), Image.LANCZOS)
    # light correction only: a touch of contrast and colour, never a filter or retouch
    im = ImageEnhance.Contrast(im).enhance(1.04)
    im = ImageEnhance.Color(im).enhance(1.06)
    bgr = cv2.cvtColor(np.asarray(im), cv2.COLOR_RGB2BGR)
    res = {"w": im.size[0], "h": im.size[1], "src_w": sw, "src_h": sh, "sharp": round(sharpness(bgr, 540), 1), "faces": visitor_faces(bgr)}
    if out:
        im.save(out, "JPEG", quality=90, optimize=True, progressive=True)
        res["out"] = out
    return res


def video(src):
    cap = cv2.VideoCapture(src)
    if not cap.isOpened():
        raise SystemExit(json.dumps({"error": "cannot open video"}))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    step = max(1, int(round(fps / SAMPLE_FPS)))
    samples, prev_gray, prev_hist = [], None, None
    w = h = 0
    i = 0
    while True:
        ok = cap.grab()
        if not ok:
            break
        if i % step == 0:
            ok, frame = cap.retrieve()
            if not ok:
                break
            h, w = frame.shape[:2]
            small = cv2.resize(frame, (WORK_W, max(1, int(h * WORK_W / float(w)))), interpolation=cv2.INTER_AREA)
            gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
            hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV)
            hist = cv2.calcHist([hsv], [0, 1], None, [32, 16], [0, 180, 0, 256])
            cv2.normalize(hist, hist)
            shift = 0.0
            scene = 0.0
            if prev_gray is not None:
                (dx, dy), _ = cv2.phaseCorrelate(np.float32(prev_gray), np.float32(gray))
                shift = float(np.hypot(dx, dy))
                scene = float(cv2.compareHist(prev_hist, hist, cv2.HISTCMP_BHATTACHARYYA))
            faces = visitor_faces(frame) if len(samples) % 2 == 0 else (samples[-1]["faces"] if samples else 0)
            samples.append({"t": round(i / fps, 3), "sharp": round(float(cv2.Laplacian(gray, cv2.CV_64F).var()), 1),
                            "shift": round(shift, 2), "scene": round(scene, 3), "faces": int(faces)})
            prev_gray, prev_hist = gray, hist
        i += 1
    cap.release()
    duration = (count / fps) if count else (samples[-1]["t"] + 1.0 / SAMPLE_FPS if samples else 0)
    return {"duration": round(duration, 3), "w": w, "h": h, "fps": round(fps, 3), "samples": samples}


def _ocr_engine():
    import shutil
    tess = shutil.which("tesseract")
    if tess:
        return "tesseract", tess
    try:
        from rapidocr_onnxruntime import RapidOCR
        return "rapidocr", RapidOCR()
    except Exception:  # noqa: BLE001
        return None, None


def _ocr(engine, handle, img):
    import os
    import subprocess
    import tempfile
    if engine == "rapidocr":
        res, _ = handle(img)
        return " ".join(r[1] for r in (res or []))
    fd, tmp = tempfile.mkstemp(suffix=".png")
    os.close(fd)
    try:
        cv2.imwrite(tmp, img)
        r = subprocess.run([handle, tmp, "stdout", "--psm", "11", "-l", "eng"], capture_output=True, text=True, timeout=60)
        return r.stdout
    finally:
        os.remove(tmp)


def _ocr_views(bgr):
    """The frame for OCR: grey (upscaled to >= 1080 px wide) and a mask of white overlay text (watermarks are white)."""
    h, w = bgr.shape[:2]
    if w < 1080:
        bgr = cv2.resize(bgr, (1080, int(h * 1080.0 / w)), interpolation=cv2.INTER_CUBIC)
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    white = np.where((hsv[:, :, 2] > 200) & (hsv[:, :, 1] < 45), 0, 255).astype(np.uint8)  # black text on white
    return [gray, white]


def marks(src, every=2.0, max_frames=10):
    engine, handle = _ocr_engine()
    if not engine:
        return {"ocr": False, "engine": None, "texts": []}
    frames = []
    img = cv2.imread(src) if src.lower().endswith((".jpg", ".jpeg", ".png")) else None
    if img is not None:
        frames.append(img)
    else:
        cap = cv2.VideoCapture(src)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        dur = n / fps if n else 0
        t = 0.5
        while t < max(dur, 0.6) and len(frames) < max_frames:
            cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
            ok, frame = cap.read()
            if ok:
                frames.append(frame)
            t += every if dur <= every * max_frames else dur / max_frames
        cap.release()
    texts = []
    for f in frames:
        texts.append(" | ".join(" ".join(_ocr(engine, handle, v).split()) for v in _ocr_views(f)))
    return {"ocr": True, "engine": engine, "texts": texts}


if __name__ == "__main__":
    if len(sys.argv) == 2 and sys.argv[1] == "ocr-check":
        print(json.dumps({"ocr": _ocr_engine()[0] is not None}))
        raise SystemExit(0)
    if len(sys.argv) < 3 or sys.argv[1] not in ("still", "video", "marks"):
        raise SystemExit(__doc__)
    if sys.argv[1] == "still":
        print(json.dumps(still(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)))
    elif sys.argv[1] == "marks":
        print(json.dumps(marks(sys.argv[2])))
    else:
        print(json.dumps(video(sys.argv[2])))
