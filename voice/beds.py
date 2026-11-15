# Music / ambience beds for the new formats (owner, 15 Nov 2026: "the sound isn't enjoyable"; the viral references all
# have a soft emotional bed under the voice). EVERYTHING here is synthesized with numpy (no samples, no downloaded or
# copyrighted music), seeded, so a re-render gives the same bed:
#   pov     Krishna POV: tanpura (Sa-Pa drone with jawari bloom) + a bansuri-like breathy flute playing slow pentatonic
#           phrases (Bhupali notes) + a soft string pad; a hall reverb.
#   kailash Kailash Parivar: deep tanpura drone + soft pad + mountain wind (the old bed, fuller and audible when ducked).
#   facts   "Kya aap jaante hain?" facts: cinematic tension pad (low cluster, slow pulse), a riser + swell into the
#           reveal, a whoosh + boom on the hook and the cover, a temple bell at the moral.
#   veer    veer jaikara: dhol-like hits (dagga bass + tilli slap) in a steady chaal, a big boom on the jaikara.
# Events (seconds) place the one-shot sounds: {"whoosh": [..], "boom": [..], "swell": [..], "bell": [..], "chime": [..]}.
# The renderers duck the bed under the voice with a sidechain compressor and bring the mix to -14 LUFS; the bed itself
# is written at a fixed level (BED_RMS) so every format's voice/bed balance is set by one number in its renderer.
#   python -I voice/beds.py --kind pov --dur 60 [--events '{"bell":[55]}'] [--seed 7] [--bpm 100] --out bed.wav
import argparse
import json
import math
import wave

import numpy as np

SR = 48000
SA = 138.59  # C#3: the channel's drone key (render-story.mjs / kailash.py use 138.59 / 207.65 / 277.18)
BED_RMS = 10 ** (-24 / 20)  # whole bed RMS (stereo mean) before the renderer's own volume


def _t(n):
    return np.arange(n) / SR


def _env(n, a, r, sustain=1.0):
    """attack a s, release r s (cosine shapes), flat in between."""
    e = np.full(n, sustain, dtype=np.float64)
    na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    if na:
        e[:na] *= 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, na))
    if nr:
        e[n - nr:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, nr))
    return e


def _noise(rng, n, lo, hi):
    """Band-limited noise (FFT brickwall with soft edges)."""
    x = rng.standard_normal(n)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    shape = 1 / (1 + (lo / np.maximum(f, 1)) ** 4) / (1 + (f / hi) ** 4)
    y = np.fft.irfft(X * shape, n)
    return y / (np.sqrt(np.mean(y ** 2)) + 1e-12)


def _conv(x, ir):
    m = len(x) + len(ir) - 1
    L = 1 << (m - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(ir, L), L)[:len(x)]


def _hall(rng, rt60=2.2, pre=0.02):
    n = int(rt60 * 1.1 * SR)
    t = _t(n)
    tail = rng.standard_normal(n) * np.exp(-6.9 * t / rt60)
    tail = np.convolve(tail, np.ones(12) / 12, mode="same")  # damped highs
    ir = np.zeros(n)
    p = int(pre * SR)
    ir[p:] = tail[: n - p]
    return ir / np.sqrt(np.sum(ir ** 2))


def _reverb(st, rng, wet=0.35, rt60=2.2):
    out = np.empty_like(st)
    for c in range(2):
        ir = _hall(rng, rt60)
        out[:, c] = st[:, c] + wet * _conv(st[:, c], ir)
    return out


def _place(buf, x, at, pan=0.0, gain=1.0):
    """Add mono x into stereo buf at time at (s) with a constant-power pan (-1..1)."""
    i = int(at * SR)
    if i >= len(buf) or i + len(x) <= 0:
        return
    a, b = max(0, i), min(len(buf), i + len(x))
    seg = x[a - i:b - i] * gain
    th = (pan + 1) * np.pi / 4
    buf[a:b, 0] += seg * np.cos(th)
    buf[a:b, 1] += seg * np.sin(th)


# --------------------------------------------------------------------------------------------- instruments --
def tanpura_pluck(f0, dur, rng, bright=1.0):
    """One tanpura string: 24 harmonics, the upper ones bloom late (jawari), slow beating between two detuned copies."""
    n = int(dur * SR)
    t = _t(n)
    x = np.zeros(n)
    for k in range(1, 25):
        fk = f0 * k * (1 + 0.0004 * k * k / 24)
        if fk > 9000:
            break
        amp = (1 / k ** 0.85) * bright ** (k / 8)
        tau = 5.5 / (1 + 0.08 * k)
        bloom = 0.05 + 0.04 * k  # s to peak: the jawari buzz grows into the higher harmonics
        env = (1 - np.exp(-t / bloom)) * np.exp(-t / tau)
        ph = rng.uniform(0, 2 * np.pi)
        x += amp * env * (np.sin(2 * np.pi * fk * t + ph) + 0.6 * np.sin(2 * np.pi * fk * 1.0012 * t + ph * 0.7))
    x *= _env(n, 0.004, 0.6)
    return x / (np.max(np.abs(x)) + 1e-9)


def tanpura(dur, rng, cycle=4.4, sa=SA, gain=1.0):
    """Pa - Sa' - Sa' - Sa (lower), the classic cycle, each string ringing ~6 s over the next ones; stereo spread."""
    n = int(dur * SR)
    buf = np.zeros((n, 2))
    strings = [(sa * 3 / 4, -0.35), (sa, 0.15), (sa, 0.25), (sa / 2, -0.1)]  # Pa (below Sa), Sa, Sa, kharaj Sa
    plucks = {}
    t = 0.0
    j = 0
    while t < dur:
        f, pan = strings[j % 4]
        key = (round(f, 2), j % 4)
        if key not in plucks:
            plucks[key] = tanpura_pluck(f, 7.0, rng, bright=0.9 if f < sa else 1.0)
        _place(buf, plucks[key], t + rng.uniform(-0.02, 0.02), pan, gain * (0.9 if j % 4 == 3 else 0.75))
        t += cycle / 4
        j += 1
    return buf


def flute_note(f, dur, rng, vib=True):
    """Bansuri-like: a soft near-sine with weak 2nd/3rd harmonics, breath noise around the tone, delayed vibrato,
    a breathy attack."""
    n = int(dur * SR)
    t = _t(n)
    vibr = (0.006 * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.5) / 0.6, 0, 1)) if vib else 0
    ph = 2 * np.pi * np.cumsum(f * (1 + vibr)) / SR
    tone = np.sin(ph) + 0.18 * np.sin(2 * ph + 0.3) + 0.06 * np.sin(3 * ph + 1.1)
    breath = _noise(rng, n, f * 0.8, f * 4) * 0.10 + _noise(rng, n, 1500, 6000) * 0.035
    att = np.clip(t / 0.18, 0, 1)
    breath *= 0.6 + 1.4 * (1 - att)  # more air at the start of the note
    x = (tone * (0.85 + 0.15 * np.sin(2 * np.pi * 0.7 * t)) + breath) * _env(n, 0.16, min(0.5, dur / 3))
    return x


def bansuri(dur, rng, sa=SA * 2, gain=1.0, start=1.5):
    """Slow Bhupali phrases (Sa Re Ga Pa Dha), long notes and rests: a meditative line, never a tune that competes with
    the voice; each phrase ends on Sa or Pa."""
    ratios = {"S": 1, "R": 9 / 8, "G": 5 / 4, "P": 3 / 2, "D": 5 / 3, "S'": 2, "d": 5 / 6, "p": 3 / 4}
    phrases = [["G", "R", "S"], ["P", "G", "R", "G"], ["D", "P", "G"], ["S'", "D", "P"], ["G", "P", "D", "P"], ["R", "G", "R", "S"],
               ["d", "S", "R", "S"], ["P", "D", "S'", "D", "P"]]
    n = int(dur * SR)
    buf = np.zeros((n, 2))
    t = start
    while t < dur - 2:
        ph = phrases[int(rng.integers(len(phrases)))]
        for k, note in enumerate(ph):
            d = rng.uniform(1.4, 2.4) if k < len(ph) - 1 else rng.uniform(2.6, 3.8)
            x = flute_note(sa * ratios[note], d + 0.35, rng)
            _place(buf, x, t, rng.uniform(-0.15, 0.15), gain)
            t += d
        t += rng.uniform(2.5, 4.5)  # rest between phrases
    return buf


def pad(dur, rng, freqs, gain=1.0, breathe=0.08):
    """Soft string-like pad: detuned additive saw (6 harmonics, rolled off), slow swells."""
    n = int(dur * SR)
    t = _t(n)
    buf = np.zeros((n, 2))
    for i, f in enumerate(freqs):
        for c, det in enumerate((0.997, 1.003)):
            x = np.zeros(n)
            for k in range(1, 7):
                x += np.sin(2 * np.pi * f * det * k * t + rng.uniform(0, 6.28)) / (k ** 1.6)
            sw = 1 + breathe * 3 * np.sin(2 * np.pi * (0.05 + 0.02 * i) * t + rng.uniform(0, 6.28))
            buf[:, c] += x * sw * gain / len(freqs)
    return buf * _env(n, 2.5, 2.5)[:, None]


def wind(dur, rng, gain=1.0):
    n = int(dur * SR)
    t = _t(n)
    buf = np.zeros((n, 2))
    for c in range(2):
        x = _noise(rng, n, 180, 900)
        gust = 0.55 + 0.45 * np.sin(2 * np.pi * 0.07 * t + c) * np.sin(2 * np.pi * 0.023 * t + 1.3 * c)
        buf[:, c] = x * gust * gain
    return buf


def whoosh(rng, dur=0.9):
    """Air sweep: band-passed noise whose centre rises 250 -> 3500 Hz, swelling into the hit."""
    n = int(dur * SR)
    t = _t(n)
    x = rng.standard_normal(n)
    out = np.zeros(n)
    blk = 1024
    for i in range(0, n, blk):
        seg = x[i:i + blk]
        fc = 250 * (14 ** (min(1, (i + blk / 2) / n)))
        X = np.fft.rfft(seg, blk)
        f = np.fft.rfftfreq(blk, 1 / SR)
        sh = np.exp(-0.5 * ((np.log(f + 1) - np.log(fc)) / 0.45) ** 2)
        out[i:i + blk] = np.fft.irfft(X * sh, blk)[: len(seg)]
    env = (t / dur) ** 2.2 * _env(n, 0.01, 0.08)
    out = out * env
    return out / (np.max(np.abs(out)) + 1e-9)


def boom(rng, dur=2.2):
    """Cinematic hit: a sub sine falling 110 -> 38 Hz, a short noise transient, a long decay."""
    n = int(dur * SR)
    t = _t(n)
    f = 38 + 72 * np.exp(-t / 0.12)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.75)
    click = _noise(rng, n, 80, 2500) * np.exp(-t / 0.025) * 0.5
    body = np.sin(2 * np.pi * 62 * t) * np.exp(-t / 0.35) * 0.4
    x = np.tanh(1.6 * (sub + click + body))
    return x / (np.max(np.abs(x)) + 1e-9)


def bell(rng, dur=5.0, f0=587.0):
    """Temple bell: inharmonic partials (the render-story.mjs bell2 ratios) with long, different decays."""
    n = int(dur * SR)
    t = _t(n)
    x = np.zeros(n)
    for ratio, amp, tau in ((1.0, 0.5, 1.9), (2.76, 0.3, 1.2), (5.40, 0.17, 0.7), (8.93, 0.10, 0.45), (0.5, 0.18, 2.6)):
        x += amp * np.sin(2 * np.pi * f0 * ratio * t + rng.uniform(0, 6.28)) * np.exp(-t / tau) * (1 + 0.04 * np.sin(2 * np.pi * 3.1 * t))
    x *= _env(n, 0.002, 0.3)
    return x / (np.max(np.abs(x)) + 1e-9)


def chime(rng, dur=3.0):
    n = int(dur * SR)
    t = _t(n)
    x = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t / d) for f, a, d in ((1318.5, 0.5, 1.2), (1760, 0.35, 0.9), (2637, 0.25, 0.7)))
    return x / (np.max(np.abs(x)) + 1e-9)


def riser(rng, dur=3.0):
    """Tension riser into a reveal: noise swell + a sine gliding up an octave."""
    n = int(dur * SR)
    t = _t(n)
    f = SA * (2 ** (t / dur))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.5 + np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR) * 0.25
    x = (tone + _noise(rng, n, 400, 5000) * 0.35) * (t / dur) ** 2.5
    x *= _env(n, 0.05, 0.05)
    return x / (np.max(np.abs(x)) + 1e-9)


def dagga(rng, dur=0.9):
    """Dhol bass side: a pitched membrane (95 -> 58 Hz), stick noise, a little drive."""
    n = int(dur * SR)
    t = _t(n)
    f = 58 + 40 * np.exp(-t / 0.05)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.28) + _noise(rng, n, 100, 1800) * np.exp(-t / 0.018) * 0.6
    x = np.tanh(2.2 * x)
    return x / (np.max(np.abs(x)) + 1e-9)


def tilli(rng, dur=0.35):
    """Dhol treble side (the thin stick): a bright slap around 420 Hz + crack."""
    n = int(dur * SR)
    t = _t(n)
    x = np.sin(2 * np.pi * 420 * t) * np.exp(-t / 0.06) * 0.6 + _noise(rng, n, 900, 7000) * np.exp(-t / 0.03)
    return x / (np.max(np.abs(x)) + 1e-9)


def dhol(dur, rng, bpm=100, start=0.0, gain=1.0):
    """Steady chaal over 8th notes: D . t D . t D t | D . t D t . D t  (D = dagga, t = tilli), small humanising."""
    n = int(dur * SR)
    buf = np.zeros((n, 2))
    step = 60 / bpm / 2
    pat = "D.tD.tDtD.tDt.Dt"
    D, T = dagga(rng), tilli(rng)
    t, k = start, 0
    while t < dur:
        c = pat[k % len(pat)]
        accent = 1.0 if k % 8 == 0 else 0.8
        if c == "D":
            _place(buf, D, t + rng.uniform(-0.006, 0.006), -0.1, gain * accent)
        elif c == "t":
            _place(buf, T, t + rng.uniform(-0.006, 0.006), 0.25, gain * 0.45 * accent)
        t += step
        k += 1
    return buf


# --------------------------------------------------------------------------------------------------- beds --
def make_bed(kind, dur, events=None, seed=7, bpm=100):
    rng = np.random.default_rng(seed)
    ev = events or {}
    n = int(dur * SR)
    if kind == "pov":
        bed = tanpura(dur, rng, gain=0.55) + bansuri(dur, rng, gain=0.30) + pad(dur, rng, [SA, SA * 1.5, SA * 2], gain=0.22)
        bed = _reverb(bed, rng, wet=0.45, rt60=2.6)
    elif kind == "kailash":
        bed = tanpura(dur, rng, cycle=5.2, gain=0.5) + pad(dur, rng, [SA / 2, SA, SA * 1.5], gain=0.35) + wind(dur, rng, gain=0.16)
        bed = _reverb(bed, rng, wet=0.35, rt60=3.0)
    elif kind == "facts":
        t = _t(n)
        low = pad(dur, rng, [SA / 2, SA / 2 * 2 ** (1 / 12), SA * 0.75], gain=0.6, breathe=0.15)  # C#2 D2 G#2: unresolved
        high = pad(dur, rng, [SA * 2, SA * 3], gain=0.12, breathe=0.2)
        pulse = np.zeros((n, 2))
        hb = np.sin(2 * np.pi * 55 * _t(int(0.3 * SR))) * np.exp(-_t(int(0.3 * SR)) / 0.07)
        k = 0.0
        while k < dur:  # a quiet heartbeat-like double pulse, 70 bpm
            _place(pulse, hb, k, 0, 0.35)
            _place(pulse, hb, k + 0.22, 0, 0.22)
            k += 60 / 70
        bed = low + high + pulse
        bed *= (0.8 + 0.2 * np.sin(2 * np.pi * 0.04 * t))[:, None]
        bed = _reverb(bed, rng, wet=0.3, rt60=2.4)
    elif kind == "veer":
        bed = dhol(dur, rng, bpm=bpm, start=float(ev.get("dhol_from", [1.2])[0]) if ev.get("dhol_from") else 1.2, gain=0.9)
        bed += pad(dur, rng, [SA / 2, SA * 0.75], gain=0.35)
        bed = _reverb(bed, rng, wet=0.18, rt60=1.6)
    else:
        raise SystemExit(f"unknown bed kind {kind}")
    bed = bed[:n] if len(bed) >= n else np.pad(bed, ((0, n - len(bed)), (0, 0)))
    # level the music part, then add the one-shots on top (they are meant to stand out a little)
    bed *= BED_RMS / (np.sqrt(np.mean(bed ** 2)) + 1e-12)
    shots = np.zeros_like(bed)
    for at in ev.get("whoosh", []):
        w = whoosh(rng)
        _place(shots, w, max(0, at - len(w) / SR), 0, 0.30)
    for at in ev.get("boom", []):
        _place(shots, boom(rng), at, 0, 0.55)
    for at in ev.get("swell", []):  # a riser that lands on `at` (the reveal)
        r = riser(rng)
        _place(shots, r, max(0, at - len(r) / SR), 0, 0.16)
    for at in ev.get("bell", []):
        _place(shots, bell(rng), at, 0.2, 0.32)
    for at in ev.get("chime", []):
        _place(shots, chime(rng), at, -0.2, 0.18)
    shots = _reverb(shots, rng, wet=0.25, rt60=2.0) if np.any(shots) else shots
    bed = bed + shots
    bed *= _env(n, 0.3, 1.2)[:, None]
    pk = np.max(np.abs(bed))
    return bed * (0.95 / pk) if pk > 0.95 else bed


def write(path, st):
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(st, -1, 1) * 32767).astype("<i2").tobytes())


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--kind", required=True, choices=["pov", "kailash", "facts", "veer"])
    p.add_argument("--dur", type=float, required=True)
    p.add_argument("--events", default="{}")
    p.add_argument("--seed", type=int, default=7)
    p.add_argument("--bpm", type=float, default=100)
    p.add_argument("--out", required=True)
    a = p.parse_args()
    write(a.out, make_bed(a.kind, a.dur, json.loads(a.events or "{}"), a.seed, a.bpm))
    print(json.dumps({"out": a.out, "kind": a.kind, "seconds": a.dur}))


if __name__ == "__main__":
    main()
