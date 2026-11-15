# Gemini TTS provider (owner, 15 Nov 2026: "the pilots are good but the sound isn't enjoyable"): expressive AI voices
# for the new formats (Krishna POV, Kailash Parivar, facts narration, veer jaikara) from Google's prebuilt Gemini voices,
# steered by a natural-language style prompt per character ("as Mahadev, deep, calm, majestic..."). Never a cloned or
# famous voice: only the 30 prebuilt voices. Model gemini-2.5-flash-preview-tts (free tier; the Pro TTS model answered
# 429). 24 kHz mono 16-bit PCM.
#
# Fallback is automatic and per CHARACTER (voice/humanize.py): quota / 429 / any API error, no key, or a failed Whisper
# name check on any of that character's lines -> the whole character uses its fixed edge-tts voice for the episode.
# The Kaggle/facts pronunciation gates stay exactly as strict as before (owner rule: never loosened); the name check
# here is an EXTRA pre-check so a Gemini mispronunciation never reaches them.
#
# Free tier: requests are spaced (GEMINI_TTS_RPM, default 3/min) and counted per model and Pacific day in the cache's
# state file (GEMINI_TTS_RPD, default 10 = the measured free quota; it resets at midnight Pacific = 13:30 IST); a 429
# marks that model's day as spent. Cache: one WAV per sha256(model|voice|style|text) in GEMINI_TTS_CACHE (default ~/.cache/sps-gemini-tts), so a
# re-render never asks again. The key comes from GEMINI_API_KEY or ~/.epifive/gemini.env and is never printed.
#
#   python voice/gemini_tts.py say --role krishna --text "..." --out x.wav       (or --voice Charon --style "...")
#   python voice/gemini_tts.py ab-synth --out DIR [--max-req 15]                 voice test: 30 voices, 2 per request
#   python voice/gemini_tts.py ab-score --dir DIR [--model large-v3]             Whisper CER + name check per voice
import base64
import datetime
import hashlib
import json
import os
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.request
import wave

import numpy as np

SR = 24000
HERE = os.path.dirname(os.path.abspath(__file__))
MODEL = os.environ.get("GEMINI_TTS_MODEL", "gemini-2.5-flash-preview-tts")
# Free-tier quotas are per model (15 Nov 2026: GenerateRequestsPerDayPerProjectPerModel-FreeTier = 10 for 2.5 Flash TTS),
# so a role whose primary model is spent for the day may use the next model of this chain (all of ONE episode's lines
# of a role always come from one model). gemini-3.8-flash-tts is NOT in it: it read the style prompt aloud (15 Nov test).
MODELS = [m.strip() for m in (os.environ.get("GEMINI_TTS_MODELS") or f"{MODEL},gemini-3.1-flash-tts-preview").split(",") if m.strip()]
CACHE = os.environ.get("GEMINI_TTS_CACHE") or os.path.join(os.path.expanduser("~"), ".cache", "sps-gemini-tts")
RPM = float(os.environ.get("GEMINI_TTS_RPM") or 3)
RPD = int(os.environ.get("GEMINI_TTS_RPD") or 10)
PROFILES = os.path.join(HERE, "gemini-voices.json")
URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

# The 30 prebuilt voices (Google's own one-word descriptions) with the gender they read as.
VOICES = {
    "Zephyr": ("f", "Bright"), "Puck": ("m", "Upbeat"), "Charon": ("m", "Informative"), "Kore": ("f", "Firm"),
    "Fenrir": ("m", "Excitable"), "Leda": ("f", "Youthful"), "Orus": ("m", "Firm"), "Aoede": ("f", "Breezy"),
    "Callirrhoe": ("f", "Easy-going"), "Autonoe": ("f", "Bright"), "Enceladus": ("m", "Breathy"), "Iapetus": ("m", "Clear"),
    "Umbriel": ("m", "Easy-going"), "Algieba": ("m", "Smooth"), "Despina": ("f", "Smooth"), "Erinome": ("f", "Clear"),
    "Algenib": ("m", "Gravelly"), "Rasalgethi": ("m", "Informative"), "Laomedeia": ("f", "Upbeat"), "Achernar": ("f", "Soft"),
    "Alnilam": ("m", "Firm"), "Schedar": ("m", "Even"), "Gacrux": ("f", "Mature"), "Pulcherrima": ("f", "Forward"),
    "Achird": ("m", "Friendly"), "Zubenelgenubi": ("m", "Casual"), "Vindemiatrix": ("f", "Gentle"), "Sadachbia": ("m", "Lively"),
    "Sadaltager": ("m", "Knowledgeable"), "Sulafat": ("f", "Warm"),
}

# Mood (voice/humanize.py MOODS) -> a few words appended to the character's style for that line.
MOOD_STYLE = {
    "calm": "", "wonder": " with gentle wonder in the voice", "excitement": " with joyful energy",
    "serious": " seriously, with weight", "emotional": " with deep tender emotion, softly",
    "mantra": " slowly and reverently, every syllable clear",
}


class Unavailable(Exception):
    """Gemini could not make this line (no key, quota, 429, error, empty audio): use edge-tts."""


# ------------------------------------------------------------------------------------------------- key/state --
def api_key():
    k = os.environ.get("GEMINI_API_KEY", "").strip()
    if not k:
        p = os.path.join(os.path.expanduser("~"), ".epifive", "gemini.env")
        if os.path.exists(p):
            m = re.search(r"GEMINI_API_KEY=(.*)", open(p, encoding="utf-8").read())
            k = m.group(1).strip() if m else ""
    return k


def enabled():
    return os.environ.get("SPS_GEMINI_TTS", "on").lower() not in ("0", "off", "false", "no") and bool(api_key())


def pacific_day(now=None):
    now = now or datetime.datetime.now(datetime.timezone.utc)
    # Pacific time (PST/PDT): the quota day; a fixed -8 h is close enough (worst case it resets an hour "late").
    return (now - datetime.timedelta(hours=8)).strftime("%Y-%m-%d")


def _state_path():
    return os.path.join(CACHE, "state.json")


def load_state():
    """{"day": <Pacific date>, "last": <time of the last request>, "models": {model: {"requests", "spent", ...}}}"""
    try:
        s = json.load(open(_state_path(), encoding="utf-8"))
    except Exception:  # noqa: BLE001
        s = {}
    day = pacific_day()
    if s.get("day") != day or "models" not in s:
        s = {"day": day, "last": s.get("last", 0), "models": {}}
    return s


def save_state(s):
    os.makedirs(CACHE, exist_ok=True)
    json.dump(s, open(_state_path(), "w", encoding="utf-8"))


def budget_left(model=MODEL):
    m = load_state()["models"].get(model, {})
    return 0 if m.get("spent") else max(0, RPD - int(m.get("requests", 0)))


# --------------------------------------------------------------------------------------------------- profiles --
def profiles():
    return json.load(open(PROFILES, encoding="utf-8")) if os.path.exists(PROFILES) else {"roles": {}}


def role(name):
    r = profiles().get("roles", {}).get(name)
    if not r or not r.get("voice"):
        raise Unavailable(f"no Gemini profile for role {name!r}")
    return r


def prompt(text, style, mood=None):
    st = (style or "").rstrip(": ").strip()
    st += MOOD_STYLE.get(mood or "calm", "")
    return f"{st}:\n{text}" if st else text


def cache_key(text, voice, style, model=MODEL):
    return hashlib.sha256(f"{model}|{voice}|{style}|{text}".encode("utf-8")).hexdigest()[:32]


# ---------------------------------------------------------------------------------------------------- request --
def _post(body, model=MODEL, timeout=120):
    key = api_key()
    if not key:
        raise Unavailable("no GEMINI_API_KEY")
    req = urllib.request.Request(URL.format(model=model), data=json.dumps(body).encode("utf-8"), method="POST",
                                 headers={"x-goog-api-key": key, "content-type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            j = json.loads(e.read().decode("utf-8"))
        except Exception:  # noqa: BLE001
            j = {}
        return e.code, j
    except Exception as e:  # noqa: BLE001
        return 0, {"error": {"message": f"{type(e).__name__}: {str(e)[:200]}"}}


def _quota_info(j):
    """The free-tier limit Google reports with a 429 (quotaId / quotaValue), for the logs; never the key."""
    out = []
    for d in (j.get("error") or {}).get("details", []) or []:
        for v in d.get("violations", []) or []:
            out.append(f"{v.get('quotaId', '')}={v.get('quotaValue', '')}")
        if d.get("retryDelay"):
            out.append(f"retry {d['retryDelay']}")
    return ", ".join(out)


def _request(body, model=MODEL):
    """One paced request -> PCM bytes. Counts against the model's day budget; a 429 marks that model's day spent."""
    s = load_state()
    m = s["models"].setdefault(model, {"requests": 0, "spent": False})
    if m.get("spent") or int(m.get("requests", 0)) >= RPD:
        raise Unavailable(f"Gemini TTS daily budget spent for {model} ({m.get('requests', 0)}/{RPD} on {s['day']} Pacific)")
    wait = s.get("last", 0) + 60.0 / max(RPM, 0.1) + 1 - time.time()
    if wait > 0:
        time.sleep(wait)
    status, j = 0, {}
    for attempt in range(3):
        s["last"] = time.time()
        m["requests"] = int(m.get("requests", 0)) + 1
        save_state(s)
        status, j = _post(body, model)
        if status == 200:
            break
        if status == 429:
            m["spent"] = True
            m["why"] = ((j.get("error") or {}).get("message", "") or "")[:200]
            m["quota"] = _quota_info(j)
            save_state(s)
            raise Unavailable(f"Gemini TTS 429 (quota) {model}: {m['quota'] or m['why'][:120]}")
        if status in (500, 502, 503, 504, 0) and attempt < 2:
            time.sleep(15 * (attempt + 1))
            continue
        break
    if status != 200:
        raise Unavailable(f"Gemini TTS HTTP {status}: {((j.get('error') or {}).get('message') or '')[:160]}")
    parts = ((j.get("candidates") or [{}])[0].get("content") or {}).get("parts") or []
    b64 = next((p.get("inlineData", {}).get("data") for p in parts if p.get("inlineData")), None)
    if not b64:
        raise Unavailable(f"Gemini TTS: no audio ({(j.get('candidates') or [{}])[0].get('finishReason', 'unknown')})")
    pcm = base64.b64decode(b64)
    if len(pcm) < SR * 2 * 0.3:
        raise Unavailable("Gemini TTS: audio under 0.3 s")
    return pcm


def write_wav(path, pcm, sr=SR):
    os.makedirs(os.path.dirname(os.path.abspath(path)) or ".", exist_ok=True)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm)


def read_wav(path):
    with wave.open(path, "rb") as w:
        return np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float64) / 32768.0


def cached(text, voice, style="", mood=None, model=MODEL):
    """True when synth() would answer from the cache (no request)."""
    f = os.path.join(CACHE, f"{cache_key(prompt(text, style, mood), voice, '', model)}.wav")
    return os.path.exists(f) and os.path.getsize(f) > 1000


def synth(text, voice, style="", out=None, mood=None, model=MODEL, use_cache=True):
    """One line -> a cached WAV path (24 kHz mono). Raises Unavailable (the caller falls back to edge-tts)."""
    if voice not in VOICES:
        raise Unavailable(f"unknown Gemini voice {voice!r}")
    full = prompt(text, style, mood)
    key = cache_key(full, voice, "", model)
    cached = os.path.join(CACHE, f"{key}.wav")
    if not (use_cache and os.path.exists(cached) and os.path.getsize(cached) > 1000):
        body = {"contents": [{"parts": [{"text": full}]}],
                "generationConfig": {"responseModalities": ["AUDIO"],
                                     "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}}}}
        write_wav(cached, _request(body, model))
    if out:
        import shutil
        shutil.copyfile(cached, out)
        return out
    return cached


def synth_role(text, role_name, out=None, mood=None):
    r = role(role_name)
    return synth(text, r["voice"], r.get("style", ""), out=out, mood=mood, model=r.get("model", MODEL))


def models_for(r):
    """The role's model chain: its own model first (voice/gemini-voices.json), then the rest of MODELS."""
    first = r.get("model") or MODELS[0]
    return [first] + [m for m in MODELS if m != first]


# ------------------------------------------------------------------------------------------------ name check --
def norm(t):
    """story/movie_kernel.py norm (the Kaggle gate's): NFC, punctuation to spaces."""
    t = unicodedata.normalize("NFC", t)
    t = re.sub(r"[।,.!?;:\"'()\-–—…॥]", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def cer(ref, hyp):
    a, b = norm(ref).replace(" ", ""), norm(hyp).replace(" ", "")
    if not a:
        return 0.0
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return round(prev[-1] / len(a), 4)


def missed(names, heard):
    """Names not heard exactly (the Kaggle gate's rule: norm(name) must be a substring of norm(transcript))."""
    h = norm(heard)
    return [n for n in names if norm(n) and norm(n) not in h]


_ASR = None


def transcribe(path, model=None):
    """faster-whisper on the CPU (int8), Hindi, beam 5, like voice/facts_asr.py. Default large-v3-turbo (the Kaggle
    gate's model); GEMINI_NAME_MODEL overrides. Raises when faster-whisper is missing (the caller then falls back)."""
    global _ASR
    from faster_whisper import WhisperModel
    name = model or os.environ.get("GEMINI_NAME_MODEL", "large-v3-turbo")
    if _ASR is None or _ASR[0] != name:
        _ASR = (name, WhisperModel(name, device="cpu", compute_type="int8"))
    import subprocess
    ff = os.environ.get("FFMPEG_PATH") or "ffmpeg"
    raw = subprocess.run([ff, "-v", "error", "-i", path, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    segs, _ = _ASR[1].transcribe(x, language="hi", beam_size=5, condition_on_previous_text=False, temperature=0)
    return " ".join(s.text.strip() for s in segs)


# ---------------------------------------------------------------------------------------------- voice A/B test --
AB_TEXT = ("महादेव और माता पार्वती के पास गणेश, नंदी और नारद जी बैठे थे। तभी श्रीकृष्ण ने राधा और कान्हा की बात छेड़ी, "
           "और खाटू श्याम बाबा, यानी बर्बरीक की कथा सुनकर भोलेनाथ मुस्कुराए।")
AB_NAMES = ["महादेव", "पार्वती", "गणेश", "नंदी", "नारद", "श्रीकृष्ण", "राधा", "कान्हा", "खाटू", "श्याम", "बर्बरीक", "भोलेनाथ"]


def _split_turns(x):
    """Two speakers' turns -> (first, second): cut at the longest pause in the middle 25-75 % of the clip."""
    hop = int(0.02 * SR)
    fr = np.sqrt(np.mean(x[: len(x) // hop * hop].reshape(-1, hop) ** 2, axis=1))
    q = fr < max(fr.max() * 0.02, 1e-4)
    a, b = int(len(fr) * 0.25), int(len(fr) * 0.75)
    best, run, start, cut = 0, 0, 0, len(fr) // 2
    for i in range(a, b):
        if q[i]:
            run = run + 1 if run else 1
            start = i - run + 1
            if run > best:
                best, cut = run, start + run // 2
        else:
            run = 0
    return x[: cut * hop], x[cut * hop:], round(best * 0.02, 2)


def cmd_ab_synth(a):
    os.makedirs(a.out, exist_ok=True)
    done = {f[:-4] for f in os.listdir(a.out) if f.endswith(".wav")}
    order = [v.strip() for v in (a.voices or "").split(",") if v.strip() in VOICES] or list(VOICES)
    names = [v for v in order if v not in done]
    log = []
    for i in range(0, len(names), 2):
        if a.max_req and len(log) >= a.max_req:
            break
        pair = names[i:i + 2]
        if len(pair) == 1:
            pair = pair + [next(v for v in VOICES if v != pair[0])]
        sp = ["Ravi", "Meera"]
        text = (f"A reading test in clear Hindi. {sp[0]} reads the WHOLE text below, from the first word to the last; then, "
                f"after a pause, {sp[1]} reads the SAME whole text again from the beginning. Calm, natural pace.\n"
                f"{sp[0]}: {AB_TEXT}\n{sp[1]}: {AB_TEXT}")
        body = {"contents": [{"parts": [{"text": text}]}],
                "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": {"multiSpeakerVoiceConfig": {"speakerVoiceConfigs": [
                    {"speaker": sp[k], "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": pair[k]}}} for k in range(2)]}}}}
        try:
            pcm = _request(body)
        except Unavailable as e:
            log.append({"pair": pair, "error": str(e)})
            print(f"{pair}: {e}", flush=True)
            if "429" in str(e) or "budget" in str(e):
                break
            continue
        x = np.frombuffer(pcm, dtype="<i2").astype(np.float64) / 32768.0
        first, second, gap = _split_turns(x)
        for v, seg in zip(pair, (first, second)):
            if v not in done:
                write_wav(os.path.join(a.out, f"{v}.wav"), (np.clip(seg, -1, 1) * 32767).astype("<i2").tobytes())
                done.add(v)
        log.append({"pair": pair, "seconds": round(len(x) / SR, 2), "split_gap_s": gap})
        print(f"{pair}: {len(x) / SR:.1f} s, split at a {gap} s pause", flush=True)
    json.dump({"model": MODEL, "text": AB_TEXT, "requests": log, "state": load_state()["models"].get(MODEL, {})},
              open(os.path.join(a.out, "synth.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)


def cmd_ab_score(a):
    rows = {}
    for f in sorted(os.listdir(a.dir)):
        if not f.endswith(".wav") or f[:-4] not in VOICES:
            continue
        v = f[:-4]
        heard = transcribe(os.path.join(a.dir, f), a.model)
        miss = missed(AB_NAMES, heard)
        nospace = [n for n in miss if norm(n).replace(" ", "") not in norm(heard).replace(" ", "")]
        secs = len(read_wav(os.path.join(a.dir, f))) / SR
        rows[v] = {"gender": VOICES[v][0], "kind": VOICES[v][1], "cer": cer(AB_TEXT, heard), "names_ok": len(AB_NAMES) - len(miss),
                   "names": len(AB_NAMES), "missed": miss, "missed_ignoring_spaces": nospace, "seconds": round(secs, 2), "heard": heard}
        print(f"{v} ({VOICES[v][0]}): CER {rows[v]['cer']:.3f}, names {rows[v]['names_ok']}/{len(AB_NAMES)} missed {miss}", flush=True)
    rank = sorted(rows, key=lambda v: (len(rows[v]["missed"]), rows[v]["cer"]))
    json.dump({"model": a.model or os.environ.get("GEMINI_NAME_MODEL", "large-v3-turbo"), "tts_model": MODEL, "text": AB_TEXT,
               "names": AB_NAMES, "rank": rank, "rows": rows}, open(os.path.join(a.dir, "ab.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print("\n| Voice | M/F | Kind | CER | Names | Missed | Whisper heard |\n|---|---|---|---|---|---|---|")
    for v in rank:
        r = rows[v]
        print(f"| {v} | {r['gender']} | {r['kind']} | {r['cer']:.3f} | {r['names_ok']}/{r['names']} | {', '.join(r['missed']) or '-'} | {r['heard'][:90]} |")


def cmd_say(a):
    if a.role:
        p = synth_role(a.text, a.role, out=a.out, mood=a.mood)
    else:
        p = synth(a.text, a.voice, a.style or "", out=a.out, mood=a.mood, model=a.tts_model)
    print(json.dumps({"out": p, "seconds": round(len(read_wav(p)) / SR, 2), "budget_left": budget_left(a.tts_model)}))


def main():
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("cmd", choices=["say", "ab-synth", "ab-score", "budget"])
    p.add_argument("--text"); p.add_argument("--voice", default="Charon"); p.add_argument("--style"); p.add_argument("--role")
    p.add_argument("--mood"); p.add_argument("--out"); p.add_argument("--dir"); p.add_argument("--model")
    p.add_argument("--max-req", type=int, default=0); p.add_argument("--voices", default="")
    p.add_argument("--tts-model", default=MODEL)
    a = p.parse_args()
    if a.cmd == "budget":
        print(json.dumps({"left": {m: budget_left(m) for m in MODELS}, "state": load_state(), "enabled": enabled()}))
        return
    {"say": cmd_say, "ab-synth": cmd_ab_synth, "ab-score": cmd_ab_score}[a.cmd](a)


if __name__ == "__main__":
    sys.exit(main())
