// voice/humanize.py gemini_prepass + split_at_pauses: the Gemini TTS provider falls back to edge-tts per character on
// quota / 429 / errors / a missed deity name / a bad cut (owner rule: the pronunciation gates are never loosened).
// A fake provider stands in for voice/gemini_tts.py, so nothing goes to the network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const PY = process.env.PYTHON || 'python';
const probe = spawnSync(PY, ['-c', 'import numpy']);
const skip = probe.status !== 0 && 'no python + numpy';

const FAKE = `
import sys, os, json, tempfile, numpy as np
sys.path.insert(0, "voice")
import humanize as H
SR = H.SR
class Unavailable(Exception): pass
def take(n, secs=1.2, gap=0.8):
    t = np.arange(int(secs * SR)) / SR
    tone = 0.3 * np.sin(2 * np.pi * 220 * t)
    parts = []
    for k in range(n):
        parts += [tone, np.zeros(int(gap * SR))]
    return np.concatenate([np.zeros(int(0.2 * SR))] + parts)
class G:
    Unavailable = Unavailable
    def __init__(self, mode): self.mode, self.calls = mode, 0
    def enabled(self): return self.mode != "off"
    def role(self, r):
        if r == "nobody": raise Unavailable("no profile")
        return {"voice": "Charon", "style": "warm"}
    def models_for(self, prof): return ["m1", "m2"]
    def cached(self, *a, **k): return False
    def budget_left(self, model): return 0 if self.mode == "budget" or (self.mode == "m1spent" and model == "m1") else 10
    def synth(self, text, voice, style, model=None):
        self.model = model
        self.calls += 1
        if self.mode == "429": raise Unavailable("Gemini TTS 429 (quota)")
        n = len(text.split("\\n\\n"))
        self.last = text.split("\\n\\n")
        return take(n if self.mode != "badcut" else 1)
    def read_wav(self, x): return x
    def transcribe(self, f):
        self.k = getattr(self, "k", -1) + 1
        line = self.last[self.k % len(self.last)]
        return line.replace("महादेव", "महा देव") if self.mode == "missname" else line
    def missed(self, names, heard): return [n for n in names if n not in heard]
    def cer(self, a, b): return 0.0 if a == b else 0.3
items = [{"text": "महादेव, आप ही बताइए।", "gemini": "mahadev", "voice": {"edge": "hi-IN-MadhurNeural"}},
         {"text": "माँ, ये फल मुझे चाहिए!", "gemini": "ganesh", "voice": {"edge": "hi-IN-MadhurNeural"}},
         {"text": "सच कहा, पुत्र। यह फल तुम्हारा हुआ।", "gemini": "mahadev", "voice": {"edge": "hi-IN-MadhurNeural"}},
         {"text": "मैं इतनी दूर गया!", "voice": {"edge": "hi-IN-MadhurNeural"}}]
plans = [({"edge": "x"}, None, [], ["calm"], []) for _ in items]
out = {}
for mode in sys.argv[1].split(","):
    g = G(mode)
    with tempfile.TemporaryDirectory() as d:
        made, rep = H.gemini_prepass(items, plans, d, g)
    out[mode] = {"made": sorted(made), "roles": {r: v["engine"] for r, v in rep.get("roles", {}).items()}, "calls": g.calls,
                 "models": sorted({v.get("model") for v in rep.get("roles", {}).values() if v.get("model")})}
# split_at_pauses on a 5-line take with uneven lines
x = np.concatenate([np.zeros(4800)] + sum([[0.3 * np.sin(np.arange(int(s * SR)) / SR * 2 * np.pi * 200), np.zeros(int(0.7 * SR))] for s in (1.0, 2.5, 0.8, 1.8, 1.2)], []))
cuts = H.split_at_pauses(x, 5, [10, 25, 8, 18, 12])
out["cuts_s"] = [round((b - a) / SR, 2) for a, b in cuts]
out["too_few"] = H.split_at_pauses(x, 9, [1] * 9)
print(json.dumps(out))
`;

function run(modes) {
  const r = spawnSync(PY, ['-c', FAKE, modes], { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout.trim().split('\n').pop());
}

test('Gemini voices: made when the provider works; edge-tts per character on 429, budget, missed name, bad cut, off', { skip }, () => {
  const o = run('ok,429,budget,missname,badcut,off,m1spent');
  assert.deepEqual(o.ok.made, [0, 1, 2]);                       // Mahadev (2 lines, ONE request) + Ganesh; line 3 has no role
  assert.equal(o.ok.calls, 2);
  assert.deepEqual(o.ok.roles, { mahadev: 'gemini Charon', ganesh: 'gemini Charon' });
  assert.deepEqual(o['429'].made, []);
  assert.equal(o['429'].roles.mahadev, 'edge-tts (fallback)');
  assert.deepEqual(o.budget.made, []);
  assert.equal(o.budget.calls, 0);                              // never asks when the day's budget cannot cover the role
  assert.deepEqual(o.missname.made, [1]);                       // Mahadev's name misheard -> ALL his lines on edge-tts
  assert.equal(o.missname.roles.mahadev, 'edge-tts (fallback)');
  assert.deepEqual(o.badcut.made, [1]);                         // a 2-line take that cannot be cut in 2 -> edge for him
  assert.deepEqual(o.off.made, []);
  assert.deepEqual(o.off.roles, {});
  assert.deepEqual(o.ok.models, ['m1']);
  assert.deepEqual(o.m1spent.made, [0, 1, 2]);                  // primary model spent today -> the next model, per role
  assert.deepEqual(o.m1spent.models, ['m2']);
});

test('split_at_pauses cuts a take at the pauses that match the lines', { skip }, () => {
  const o = run('off');
  assert.equal(o.cuts_s.length, 5);
  // each piece = its line + about half of the pauses around it
  [1.0, 2.5, 0.8, 1.8, 1.2].forEach((s, k) => assert.ok(Math.abs(o.cuts_s[k] - s - 0.7) < 0.45, `piece ${k}: ${o.cuts_s[k]} vs ${s}`));
  assert.equal(o.too_few, null);
});
