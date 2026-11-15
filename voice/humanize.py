# Human-sounding narration from the free edge-tts Hindi voices (owner, 10 Nov 2026: "too robotic"). No recordings, no
# paid TTS, no GPU: Chatterbox and Indic Parler pronounced Hindi worse (memory / animate/REPORT.md), so this stays on
# hi-IN-MadhurNeural / hi-IN-SwaraNeural and makes them sound less like a "studio robot":
#   1. sentence by sentence: each sentence is its own edge-tts request with its own --rate/--pitch/--volume from its
#      mood (calm, wonder, excitement, serious, emotional, mantra; detected from the words or set by the spec), a small
#      seeded jitter (+-3 % rate, +-2 Hz pitch) so no two lines sound identical, and questions slightly up;
#   2. natural pauses: 200-600 ms between sentences (longer after emotional/serious lines and when the mood changes),
#      with a soft synthesized breath (band-shaped noise under a smooth envelope, ~28 dB under the voice, no clicks)
#      before some of them; no third-party samples;
#   3. polish (ffmpeg + numpy): high-pass 80 Hz, a small 3 kHz presence lift, de-ess, light compression, then a very
#      subtle small-room reverb (synthesized impulse response, ~-19 dB wet) so it is not dry.
# The renderers mix ambience under it with sidechain ducking and bring the whole mix to -14 LUFS.
# Dialogue formats keep each character's fixed edge voice/pitch/rate (cast files) and only modulate around it; child
# voices are clamped to +48 Hz (beyond that edge-tts starts to sound like a chipmunk) and get their speed from --rate.
#
# Python:  from humanize import render;  render([{text, voice, out, mood?, lead?, pause?, seed?, fx?}, ...])
# Node:    python -I voice/humanize.py job.json   (job = {"items": [...], "concurrency": 6}) -> JSON results on stdout
# SPS_HUMAN_VOICE=0 makes every renderer use the old single-request edge-tts chain instead.
#
# GEMINI VOICES (15 Nov 2026, owner: "the sound isn't enjoyable"): a character whose voice has a "gemini" role
# (voice/gemini-voices.json; Kailash Parivar, Krishna POV, facts narrator) is spoken by its Gemini prebuilt voice with
# the role's style prompt (voice/gemini_tts.py): its lines go in ONE request per <= 6 lines (the free tier allows only a
# few requests a day; one take also keeps the delivery consistent), cut at the pauses between lines, and every piece is
# checked by Whisper (all deity names heard exactly, CER <= GEMINI_MAX_CER). Any problem (no key, quota/429, an API
# error, a bad cut, a missed name) puts that WHOLE character back on its fixed edge-tts voice for the item batch. The
# renderers' own pronunciation gates are unchanged (never loosened). SPS_GEMINI_TTS=off = edge-tts only.
import asyncio
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import wave

import numpy as np

SR = 24000
FF = os.environ.get("FFMPEG_PATH") or "ffmpeg"
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # gemini_tts (python -I does not add the script dir)
LAST_REPORT = {}  # the last render()'s Gemini report: {engine, roles: {role: {engine, lines, requests?, why?}}}
ON = os.environ.get("SPS_HUMAN_VOICE", "1") != "0"
EDGE = {"hm_omega": "hi-IN-MadhurNeural", "hf_alpha": "hi-IN-SwaraNeural"}

# mood: rate %, pitch Hz, volume %, base pause after a sentence of this mood (s)
MOODS = {
    "calm": (0, 0, 0, 0.30),
    "wonder": (-3, 3, 0, 0.38),
    "excitement": (6, 4, 6, 0.24),
    "serious": (-5, -3, 0, 0.42),
    "emotional": (-8, -2, -5, 0.50),
    "mantra": (-8, -2, 0, 0.50),
}
PITCH_MIN, PITCH_MAX = -40, 48  # Hz; past ~+50 Hz edge-tts pitch shifting turns into a chipmunk
MANTRA = re.compile(r"ॐ|॥|नमः|नमो|स्वाहा")
EMOTIONAL = re.compile(r"आँसू|आंसू|रोने|रोते|रोई|रोए|रो पड|दुख|दुःख|करुणा|बलिदान|त्याग|शीश|विदा|दर्द|ममता|अकेल|माफ़|माफ|गले लगा|प्यार|भावुक|याद आ")
SERIOUS = re.compile(r"युद्ध|श्राप|शाप|संकट|क्रोध|गुस्स|अंधकार|अँधेर|असुर|राक्षस|प्रतिज्ञा|वचन|मृत्यु|डर|भय|पाप|सावधान|परीक्षा")
WONDER = re.compile(r"अद्भुत|अनोख|कमाल|हैरान|अचरज|सोचो|सोचिए|कल्पना|रहस्य|दिव्य|चमत्कार|वाह|अरे")


def mood_of(sentence, given=None):
    s = sentence.strip()
    if MANTRA.search(s):
        return "mantra"
    if given in MOODS:
        return given
    if s.endswith("!") and "जय" in s:
        return "excitement"  # a jaikara
    if EMOTIONAL.search(s):
        return "emotional"
    if SERIOUS.search(s):
        return "serious"
    if WONDER.search(s):
        return "wonder"
    if s.endswith("!"):
        return "excitement"
    return "calm"


def sentences(text):
    """Split at । ! ? . ॥ (not at "…" or commas: those stay inside the sentence as edge-tts's own short pauses).
    Fragments under 8 letters ("हाँ।", "सुनो…") are joined to their neighbour so no request is a lone word."""
    t = re.sub(r"\.{3,}", "…", str(text or "").strip())
    parts = [p.strip() for p in re.findall(r"[^।!?.॥]+(?:[।!?.॥]+|$)", t) if p.strip(" ।!?.॥")]
    out = []
    for p in parts:
        if out and len(re.sub(r"[\s।!?.॥…,]", "", out[-1])) < 8:
            out[-1] = f"{out[-1]} {p}"
        else:
            out.append(p)
    if len(out) > 1 and len(re.sub(r"[\s।!?.॥…,]", "", out[-1])) < 8:
        out[-2:] = [f"{out[-2]} {out[-1]}"]
    return out or [t]


def line_moods(text, mood=None):
    return [mood_of(x, mood) for x in sentences(text)]


def _num(v, unit):
    m = re.match(r"^([+-]?\d+)", str(v or f"+0{unit}"))
    return int(m.group(1)) if m else 0


def _fmt(n, unit):
    return f"{'+' if n >= 0 else ''}{int(n)}{unit}"


def prosody(voice, mood, question, rng, jitter=True):
    """edge-tts --rate/--pitch/--volume for one sentence: the voice's fixed profile + mood + seeded jitter."""
    r, p, v, _ = MOODS[mood]
    rate = _num(voice.get("rate"), "%") + r
    pitch = _num(voice.get("pitch"), "Hz") + p
    vol = _num(voice.get("volume"), "%") + v
    if question:
        pitch += 3
        rate += 2
    if jitter and mood != "mantra":
        rate += rng.randint(-3, 3)
        pitch += rng.randint(-2, 2)
    pitch = max(PITCH_MIN, min(PITCH_MAX, pitch))
    return _fmt(max(-40, min(40, rate)), "%"), _fmt(pitch, "Hz"), _fmt(max(-30, min(20, vol)), "%")


def gap_after(mood, next_mood, question, rng):
    g = MOODS[mood][3] + (0.08 if question else 0) + (0.08 if next_mood != mood else 0) + rng.uniform(-0.05, 0.05)
    return max(0.2, min(0.6, g))


class _Rng:
    """Seeded per line (text + voice), so a re-render gives the same take (lip-sync clips stay in sync)."""

    def __init__(self, seed):
        self.r = np.random.default_rng(int(hashlib.sha1(seed.encode("utf-8")).hexdigest()[:12], 16))

    def randint(self, a, b):
        return int(self.r.integers(a, b + 1))

    def uniform(self, a, b):
        return float(self.r.uniform(a, b))

    def normal(self, n):
        return self.r.standard_normal(n)


# ------------------------------------------------------------------------------------------------ edge-tts --
async def _edge(text, voice, rate, pitch, volume, path, sem):
    import edge_tts
    async with sem:
        for attempt in range(6):  # the free endpoint sometimes answers 503
            try:
                await edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, volume=volume).save(path)
                if os.path.getsize(path) > 800:
                    return path
            except Exception as e:  # noqa: BLE001
                print(f"edge-tts retry {attempt} {type(e).__name__}", file=sys.stderr, flush=True)
            await asyncio.sleep(3 * (attempt + 1))
    raise RuntimeError(f"edge-tts failed: {text[:40]}")


def _decode(path):
    r = subprocess.run([FF, "-v", "error", "-i", path, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True)
    if r.returncode:
        raise RuntimeError(r.stderr.decode("utf-8", "ignore")[-400:])
    return np.frombuffer(r.stdout, dtype=np.float32).astype(np.float64)


def _trim(x):
    """Cut edge-tts's leading/trailing silence (keep 20 ms / 40 ms) with short fades, so the pauses are ours."""
    hop = int(0.01 * SR)
    if len(x) < hop * 4:
        return x
    fr = np.sqrt(np.mean(x[: len(x) // hop * hop].reshape(-1, hop) ** 2, axis=1))
    on = np.where(fr > max(fr.max() * 0.01, 1e-4))[0]
    if not len(on):
        return x
    a = max(0, on[0] * hop - int(0.02 * SR))
    b = min(len(x), (on[-1] + 1) * hop + int(0.04 * SR))
    y = x[a:b].copy()
    # an inner pause edge-tts makes on "…" can run ~0.9 s: cap it at 0.45 s (cut in the middle of the silence, faded)
    quiet = fr[a // hop:(b + hop - 1) // hop] <= max(fr.max() * 0.01, 1e-4)
    cuts, run = [], 0
    for j, qv in enumerate(list(quiet) + [False]):
        if qv:
            run += 1
        else:
            if run * hop > 0.55 * SR:
                mid = (j - run // 2) * hop
                cut = run * hop - int(0.45 * SR)
                cuts.append((mid - cut // 2, mid + cut - cut // 2))
            run = 0
    for c0, c1 in reversed(cuts):
        y = np.concatenate([y[:c0], y[c1:]])
    fi, fo = min(len(y) // 4, int(0.008 * SR)), min(len(y) // 4, int(0.03 * SR))
    y[:fi] *= np.linspace(0, 1, fi)
    y[len(y) - fo:] *= np.linspace(1, 0, fo)
    return y


def _active_rms(x):
    hop = int(0.02 * SR)
    fr = np.sqrt(np.mean(x[: len(x) // hop * hop].reshape(-1, hop) ** 2, axis=1)) if len(x) >= hop else np.array([1e-6])
    act = fr[fr > fr.max() * 0.1] if fr.max() > 0 else fr
    return float(np.sqrt(np.mean(act ** 2))) if len(act) else 1e-6


def breath(rng, dur):
    """A soft inhale: noise shaped around ~1.3 kHz (log-Gaussian band, no lows), a smooth rise and a quicker fall."""
    n = int(dur * SR)
    w = rng.normal(n + 1024)
    spec = np.fft.rfft(w)
    f = np.fft.rfftfreq(len(w), 1 / SR)
    shape = np.exp(-0.5 * ((np.log(f + 1) - np.log(1300)) / 0.7) ** 2) * (f > 250)
    x = np.fft.irfft(spec * shape, len(w))[512:512 + n]
    t = np.linspace(0, 1, n)
    env = np.where(t < 0.62, np.sin(np.pi / 2 * t / 0.62) ** 2, np.cos(np.pi / 2 * (t - 0.62) / 0.38) ** 2)
    x = x * env
    return x / (np.sqrt(np.mean(x ** 2)) + 1e-9)


_IR = None


def room_ir():
    """Small-room impulse response (fixed seed): 8 ms pre-delay, a few early reflections and a ~0.3 s RT60 diffuse
    tail with high frequencies damped faster. Energy-normalised."""
    global _IR
    if _IR is None:
        g = np.random.default_rng(20261110)
        n = int(0.35 * SR)
        t = np.arange(n) / SR
        tail = g.standard_normal(n) * np.exp(-6.9 * t / 0.30)
        k = 9  # gentle low-pass on the tail (moving average) = damped highs
        tail = np.convolve(tail, np.ones(k) / k, mode="same")
        ir = np.zeros(n)
        pre = int(0.008 * SR)
        ir[pre:] = tail[: n - pre] * 0.6
        for ms, gain in ((11, 0.55), (17, -0.4), (23, 0.32), (31, -0.25), (41, 0.18)):
            ir[pre + int(ms * SR / 1000)] += gain
        _IR = ir / np.sqrt(np.sum(ir ** 2))
    return _IR


POLISH = ("highpass=f=80,equalizer=f=3000:t=q:w=1.3:g=2.5,deesser=i=0.4:m=0.5:f=0.5:s=o,"
          "acompressor=threshold=0.125:ratio=2.2:attack=12:release=160:knee=4:makeup=1.4,volume=4.8dB")
# (the volume step puts a finished line at about -16.5 LUFS, the level plain edge-tts had, so the renderers' voice/bed
# balance and sidechain thresholds stay as they were)
CHILD_EQ = ",equalizer=f=260:t=q:w=1:g=1.5,equalizer=f=6500:t=q:w=1:g=-1.5"  # warmer, less "squeaky" when pitched up
WET = 0.11  # ~-19 dB room
TAIL = 0.06  # s of reverb tail kept after the last word (faded), so turn gaps stay short


def _polish(x, fx="", child=False):
    chain = POLISH + (CHILD_EQ if child else "") + (f",{fx}" if fx else "")
    r = subprocess.run([FF, "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-af", chain,
                        "-f", "f32le", "-ar", str(SR), "-ac", "1", "-"], input=x.astype(np.float32).tobytes(), capture_output=True)
    if r.returncode:
        raise RuntimeError(r.stderr.decode("utf-8", "ignore")[-400:])
    y = np.frombuffer(r.stdout, dtype=np.float32).astype(np.float64)
    ir = room_ir()
    m = len(y) + len(ir) - 1
    L = 1 << (m - 1).bit_length()
    wet = np.fft.irfft(np.fft.rfft(y, L) * np.fft.rfft(ir, L), L)[:m]
    n = len(y) + int(TAIL * SR)
    out = np.concatenate([y, np.zeros(n - len(y))]) + WET * wet[:n]
    out[len(y):] *= np.linspace(1, 0, n - len(y))
    return out


def _write(path, x, sr):
    pk = np.max(np.abs(x)) if len(x) else 0
    if pk > 0.97:
        x = x * (0.97 / pk)
    if sr != SR:  # resample through ffmpeg (renderers that want 48 kHz)
        r = subprocess.run([FF, "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-ar", str(sr),
                            "-c:a", "pcm_s16le", path], input=x.astype(np.float32).tobytes(), capture_output=True)
        if r.returncode:
            raise RuntimeError(r.stderr.decode("utf-8", "ignore")[-400:])
        return
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype("<i2").tobytes())


def _plan(item):
    v = item["voice"] if isinstance(item["voice"], dict) else {"edge": EDGE.get(item["voice"], item["voice"])}
    rng = _Rng(item.get("seed") or f"{v.get('edge')}|{item['text']}")
    sents = sentences(item["text"])
    moods = [mood_of(s, item.get("mood")) for s in sents]
    pros = [prosody(v, m, s.rstrip().endswith("?"), rng) for s, m in zip(sents, moods)]
    return v, rng, sents, moods, pros


async def _synth_all(plans, tmp, concurrency):
    sem = asyncio.Semaphore(concurrency)
    jobs, keys = [], []
    for i, (v, _, sents, _, pros) in enumerate(plans):
        for k, (s, (rate, pitch, vol)) in enumerate(zip(sents, pros)):
            path = os.path.join(tmp, f"h{i:03d}-{k:02d}.mp3")
            jobs.append(_edge(s, v["edge"], rate, pitch, vol, path, sem))
            keys.append((i, k))
    res = await asyncio.gather(*jobs, return_exceptions=True)
    out = {}
    for key, r in zip(keys, res):
        out[key] = r
    return out


# --------------------------------------------------------------------------------------------- Gemini voices --
GEMINI_MAX_CER = float(os.environ.get("GEMINI_MAX_CER") or 0.25)
GEMINI_LINES_PER_REQ = 6
# Names the Whisper pre-check must hear exactly in a Gemini line (plus the item's own `names`): the Kailash / Krishna
# POV / facts gates' names. A line that says one is checked; the renderers' own gates still run afterwards.
GEMINI_NAMES = ["महादेव", "पार्वती", "गणेश", "नंदी", "नारद", "शिव", "भोलेनाथ", "गणपति", "गजानन", "कृष्ण", "श्याम",
                "श्रीकृष्ण", "कान्हा", "गोविंद", "राधा", "खाटू", "बर्बरीक", "हनुमान", "राम", "सीता", "दुर्गा", "गीता"]


def check_names():
    """The names the renderer's own gate checks (GEMINI_CHECK_NAMES, a JSON list set by e.g. kailash.py voice: the spec's
    names + the format's DEITY_NAMES), else GEMINI_NAMES. The pre-check is never looser than that gate."""
    try:
        v = json.loads(os.environ.get("GEMINI_CHECK_NAMES") or "null")
    except ValueError:
        v = None
    return list(v) if isinstance(v, list) and v else GEMINI_NAMES


def facts_missed(text, heard):
    """Names the facts gate (scripts/facts.mjs lineNames: every deity/character position, the key sound) would reject."""
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    js = ("import('./scripts/facts.mjs').then((m) => { const [t, h] = JSON.parse(process.argv[1]); "
          "console.log(JSON.stringify(m.lineNames(t, h).wrong.map((w) => w.word))); })")
    r = subprocess.run(["node", "-e", js, json.dumps([text, heard], ensure_ascii=False)], cwd=root, capture_output=True,
                       text=True, encoding="utf-8")
    if r.returncode:
        raise RuntimeError(f"facts name check: {r.stderr.strip()[-200:]}")
    return json.loads(r.stdout.strip().splitlines()[-1])


def _tempo(x, t):
    """Speed a piece up (or down) without changing its pitch (ffmpeg atempo; 1.0-1.2 sounds natural)."""
    r = subprocess.run([FF, "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-af", f"atempo={t:.3f}",
                        "-f", "f32le", "-ar", str(SR), "-ac", "1", "-"], input=x.astype(np.float32).tobytes(), capture_output=True)
    if r.returncode:
        raise RuntimeError(r.stderr.decode("utf-8", "ignore")[-300:])
    return np.frombuffer(r.stdout, dtype=np.float32).astype(np.float64)


def _gemini_role(item, v):
    return item.get("gemini") or (v.get("gemini") if isinstance(v, dict) else None)


def split_at_pauses(x, n, weights):
    """Cut one take of n lines (said with pauses between them) into n pieces: choose n-1 pauses (>= 0.18 s of near
    silence) whose positions best match the lines' expected starts (text length shares), longer pauses preferred.
    Returns [(a, b) sample ranges] or None when there are not enough pauses."""
    if n == 1:
        return [(0, len(x))]
    hop = int(0.01 * SR)
    fr = np.sqrt(np.mean(x[: len(x) // hop * hop].reshape(-1, hop) ** 2, axis=1))
    q = fr < max(fr.max() * 0.025, 1e-4)
    gaps, run = [], 0
    for i, quiet in enumerate(list(q) + [False]):
        if quiet:
            run += 1
        else:
            if run >= 18:
                gaps.append((i - run, i))
            run = 0
    on = np.where(~q)[0]
    if not len(on):
        return None
    s0, s1 = on[0], on[-1]
    gaps = [(a, b) for a, b in gaps if a > s0 and b < s1]
    if len(gaps) < n - 1:
        return None
    tot = float(sum(weights))
    exp = [s0 + (s1 - s0) * sum(weights[:k + 1]) / tot for k in range(n - 1)]
    mid = [(a + b) / 2 for a, b in gaps]
    span = max(1, s1 - s0)
    INF = float("inf")
    G = len(gaps)

    def c(k, g):  # squared position error (share of the take) minus a small bonus per 100 ms of pause
        return ((mid[g] - exp[k]) / span) ** 2 - 0.0005 * (gaps[g][1] - gaps[g][0]) / 10

    cost = [[INF] * G for _ in range(n - 1)]
    back = [[-1] * G for _ in range(n - 1)]
    for g in range(G):
        cost[0][g] = c(0, g)
    for k in range(1, n - 1):
        for g in range(k, G):
            h = min(range(k - 1, g), key=lambda j: cost[k - 1][j])
            if cost[k - 1][h] < INF:
                cost[k][g] = cost[k - 1][h] + c(k, g)
                back[k][g] = h
    g = min(range(G), key=lambda j: cost[n - 2][j])
    if cost[n - 2][g] == INF:
        return None
    picks = [g]
    for k in range(n - 2, 0, -1):
        g = back[k][g]
        picks.append(g)
    cuts = [int(mid[p] * hop) for p in sorted(picks)]
    bounds = [0] + cuts + [len(x)]
    return [(bounds[i], bounds[i + 1]) for i in range(n)]


def _chunk_style(prof, n):
    st = prof.get("style", "").rstrip(": ").strip()
    if n > 1:
        st += ". Say each of the following lines as its own sentence, with a clear pause of about one second between lines"
    return st


def _chunk_body(texts):
    return "\n\n".join(t.strip() for t in texts)


def gemini_prepass(items, plans, tmp, G=None):
    """Make every Gemini-role item's speech (no lead/pause/polish yet). Returns ({index: float array}, report).
    G: the provider module (tests pass a fake one)."""
    report = {"roles": {}, "engine": "edge-tts"}
    if G is None:
        try:
            import gemini_tts as G
        except Exception as e:  # noqa: BLE001
            return {}, {**report, "error": f"gemini_tts import: {e}"}
    if not G.enabled():
        return {}, {**report, "off": "SPS_GEMINI_TTS off or no GEMINI_API_KEY"}
    groups = {}
    for i, (it, p) in enumerate(zip(items, plans)):
        r = _gemini_role(it, p[0])
        if r:
            groups.setdefault(r, []).append(i)
    out = {}
    # the role with the most lines first: when the day's free requests run short, the lead characters get them
    for r, idx in sorted(groups.items(), key=lambda kv: -len(kv[1])):
        try:
            prof = G.role(r)
            chunks = [idx[k:k + GEMINI_LINES_PER_REQ] for k in range(0, len(idx), GEMINI_LINES_PER_REQ)]
            model, left, pieces = None, {}, {}
            for m in G.models_for(prof):  # the first model of the chain that can make ALL of this role's lines today
                need = sum(0 if G.cached(_chunk_body([items[i]["text"] for i in c]), prof["voice"], _chunk_style(prof, len(c)), model=m) else 1
                           for c in chunks)
                left[m] = G.budget_left(m)
                if need > left[m]:
                    continue
                try:
                    pieces = {}
                    for c in chunks:
                        texts = [items[i]["text"] for i in c]
                        try:
                            x = G.read_wav(G.synth(_chunk_body(texts), prof["voice"], _chunk_style(prof, len(texts)), model=m))
                        except G.Unavailable as e:
                            if "SAFETY" not in str(e) or len(c) == 1:
                                raise
                            # a safety block on a multi-line take: line by line (a line that is blocked alone -> edge-tts)
                            for i in c:
                                pieces[i] = _trim(G.read_wav(G.synth(items[i]["text"], prof["voice"], _chunk_style(prof, 1), model=m)))
                            continue
                        cuts = split_at_pauses(x, len(c), [max(4, len(re.sub(r"\s", "", t))) for t in texts])
                        if not cuts:
                            raise G.Unavailable(f"could not cut the take into {len(c)} lines")
                        for i, (a_, b_) in zip(c, cuts):
                            pieces[i] = _trim(x[a_:b_])
                    model = m
                    break
                except G.Unavailable as e:  # the quota ran out mid-role (429): the next model makes the WHOLE role again
                    if "429" not in str(e) and "budget" not in str(e):
                        raise
                    left[m] = str(e)[:80]
            if not model:
                raise G.Unavailable(f"needs {len(chunks)} requests; left today: {left}")
            # Whisper pre-check of every piece: names exact (the gates' rule) and CER (a wrong cut shows up here). A line that
            # misses a name is made ONCE more alone, with the names spelled out in the style prompt (GEMINI_LINE_RETRIES).
            checks, retries = [], int(os.environ.get("GEMINI_LINE_RETRIES") or 2)

            def judge(i, piece):
                f = os.path.join(tmp, f"g{i:03d}.wav")
                _write(f, piece / (np.max(np.abs(piece)) + 1e-9) * 0.7, SR)
                heard = G.transcribe(f)
                os.remove(f)
                if os.environ.get("GEMINI_CHECK") == "facts":  # the facts gate's own rule (scripts/facts.mjs lineNames)
                    return heard, facts_missed(items[i]["text"], heard), G.cer(items[i]["text"], heard)
                names = [n for n in dict.fromkeys(list(items[i].get("names") or []) + check_names()) if n in items[i]["text"]]
                return heard, G.missed(names, heard), G.cer(items[i]["text"], heard)

            for i in idx:
                heard, miss, ce = judge(i, pieces[i])
                if miss and retries > 0 and G.budget_left(model) > 0:
                    retries -= 1
                    hint = (_chunk_style(prof, 1) + ". Pronounce these names slowly, fully and exactly as written, every letter clear: "
                            + ", ".join(miss))
                    alt = _trim(G.read_wav(G.synth(items[i]["text"], prof["voice"], hint, model=model)))
                    h2, m2, c2 = judge(i, alt)
                    if not m2 and c2 <= GEMINI_MAX_CER:
                        pieces[i], heard, miss, ce = alt, h2, m2, c2
                checks.append({"i": i, "cer": ce, "missed": miss})
                if miss or ce > GEMINI_MAX_CER:
                    raise G.Unavailable(f"line {i}: {'missed ' + ', '.join(miss) if miss else f'CER {ce}'} (heard: {heard[:60]})")
            tempo = float(prof.get("tempo") or 1.0)
            if abs(tempo - 1.0) > 0.01:  # e.g. the facts narrator: Gemini tells it ~30 % slower than edge-tts
                pieces = {i: _tempo(x, tempo) for i, x in pieces.items()}
            out.update(pieces)
            report["roles"][r] = {"engine": f"gemini {prof['voice']}", "model": model, "lines": len(idx), "requests": len(chunks),
                                  "mean_cer": round(sum(ch["cer"] for ch in checks) / len(checks), 4)}
        except Exception as e:  # noqa: BLE001  (Unavailable, Whisper missing, anything): this role -> edge-tts
            why = f"{type(e).__name__}: {str(e)[:200]}"
            report["roles"][r] = {"engine": "edge-tts (fallback)", "lines": len(idx), "why": why}
            print(f"gemini voice for {r}: falling back to edge-tts ({why})", file=sys.stderr, flush=True)
    if out:
        report["engine"] = "gemini + edge-tts" if len(out) < len(items) else "gemini"
    return out, report


def render(items, concurrency=5, sr=SR, tmp=None, provider=None):
    """items: [{text, voice ({edge, rate, pitch, volume?, child?} or hm_omega/hf_alpha), out (.wav), mood?, lead? (s of
    silence before the voice, default 0), pause? (s of silence after, default 0), seed?, fx? (extra ffmpeg filters)}].
    Returns one dict per item: {file, seconds, speech_s, lead, pause, sentences, moods, last_mood} or {error}."""
    plans = [_plan(it) for it in items]
    own_tmp = tmp is None
    tmp = tmp or os.path.join(os.path.dirname(os.path.abspath(items[0]["out"])) if items else ".", "_human")
    os.makedirs(tmp, exist_ok=True)
    gem, report = gemini_prepass(items, plans, tmp, provider) if any(_gemini_role(it, p[0]) for it, p in zip(items, plans)) else ({}, {})
    LAST_REPORT.clear()
    LAST_REPORT.update(report)
    # edge-tts only for the lines Gemini did not make
    files = asyncio.run(_synth_all([p if i not in gem else (p[0], p[1], [], p[3], []) for i, p in enumerate(plans)], tmp, concurrency))
    results = []
    for i, (it, (v, rng, sents, moods, _)) in enumerate(zip(items, plans)):
        try:
            segs = []
            if i in gem:  # one Gemini piece for the whole line (its own pauses and prosody)
                segs, sents, moods = [gem[i]], [it["text"]], [moods[-1]]
            for k in range(len(sents) if i not in gem else 0):
                f = files[(i, k)]
                if isinstance(f, Exception):
                    raise f
                segs.append(_trim(_decode(f)))
                os.remove(f)
            level = _active_rms(np.concatenate(segs))
            gain = 0.1 / max(level, 1e-6)  # speech at about -20 dBFS RMS before the polish
            lead, pause = float(it.get("lead", 0) or 0), float(it.get("pause", 0) or 0)

            def gap_with_breath(g, before):
                gap = np.zeros(int(g * SR))
                # a breath before about half the sentences that have room for one (never before a mantra)
                if g >= 0.28 and before != "mantra" and rng.uniform(0, 1) < 0.5:
                    b = breath(rng, min(g - 0.08, rng.uniform(0.22, 0.32))) * level * 10 ** (-28 / 20)
                    end = len(gap) - int(0.05 * SR)
                    gap[end - len(b):end] += b
                return gap

            parts = [gap_with_breath(lead, moods[0])]  # the lead (the renderer's room before the line) may hold one too
            for k, seg in enumerate(segs):
                if k:
                    q = sents[k - 1].rstrip().endswith("?")
                    parts.append(gap_with_breath(gap_after(moods[k - 1], moods[k], q, rng), moods[k]))
                parts.append(seg)
            x = _polish(np.concatenate(parts) * gain, it.get("fx", ""), bool(v.get("child")) and i not in gem)
            speech = len(x) / SR - lead
            x = np.concatenate([x, np.zeros(int(pause * SR))])
            _write(it["out"], x, sr)
            results.append({"file": it["out"], "seconds": round(len(x) / SR, 3), "speech_s": round(speech, 3), "lead": lead,
                            "pause": pause, "sentences": len(sents), "moods": moods, "last_mood": moods[-1],
                            "engine": "gemini" if i in gem else "edge-tts"})
        except Exception as e:  # noqa: BLE001
            results.append({"file": it["out"], "error": f"{type(e).__name__}: {str(e)[:300]}"})
    if own_tmp:
        shutil.rmtree(tmp, ignore_errors=True)
    return results


def turn_gap(rng_seed, same_speaker, after_mood="calm", scene_change=False, end=False):
    """Pause after a dialogue line: 50-150 ms when the other character answers (natural turn-taking), 220-340 ms when
    the same one goes on, 0.6-0.8 s at a scene change; +0.12 s after an emotional or serious line."""
    rng = _Rng(rng_seed)
    if end:
        return 1.0
    extra = 0.12 if after_mood in ("emotional", "serious", "mantra") else 0.0
    if scene_change:
        return round(rng.uniform(0.6, 0.8) + extra, 3)
    if same_speaker:
        return round(rng.uniform(0.22, 0.34) + extra, 3)
    return round(rng.uniform(0.05, 0.15) + extra, 3)


def main():
    job = json.load(open(sys.argv[1], encoding="utf-8"))
    res = render(job["items"], concurrency=int(job.get("concurrency", 5)), sr=int(job.get("sr", SR)))
    if LAST_REPORT:
        print(json.dumps({"gemini": LAST_REPORT}, ensure_ascii=False), file=sys.stderr)
    print(json.dumps(res, ensure_ascii=False))


if __name__ == "__main__":
    main()
