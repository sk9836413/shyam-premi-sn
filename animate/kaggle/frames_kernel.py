# Kaggle GPU kernel (T4 x2): start frames / story images with FLUX.1-schnell (Apache-2.0) when Cloudflare Workers AI
# cannot make them (daily 10k-neuron allocation used up: error 4006). Pushed by animate/frames.mjs through
# animate/kaggle.mjs (SPS_SLOT=frames-<slot>: kernel sps-frames-<slot>, dataset sps-frames-inputs-<slot>).
# Input: jobs.json { stamp, settings.flux {size, steps}, jobs: [{ id, flux_prompt, seed, w?, h? }] } + flux_frames.py.
# Output: /kaggle/working/frames/<id>.png, results.json { stamp, flux: timings }. Never holds any secret.
# ~5.5 min setup (pip, download, text encoder, load) + ~55 s per 1024 px frame (animate/REPORT.md section 10).
import glob, json, os, subprocess, sys, time

EXPECT_STAMP = None  # set by animate/kaggle.mjs push: the dataset version this run must use
START_BY = None  # set by push: a session that only starts after this exits without using the GPU

WORK = "/kaggle/working"
TMP = "/kaggle/tmp" if os.path.isdir("/kaggle/tmp") else "/tmp"
os.environ.setdefault("HF_HOME", f"{TMP}/hf")


def main():
    T0 = time.time()
    if START_BY and T0 > START_BY:
        raise SystemExit(f"session started {T0 - START_BY:.0f}s after START_BY: the workflow already used its fallback")
    hits = glob.glob("/kaggle/input/**/jobs.json", recursive=True)
    if not hits:
        raise SystemExit("jobs.json not found under /kaggle/input")
    inp = os.path.dirname(hits[0])
    spec = json.load(open(f"{inp}/jobs.json"))
    if EXPECT_STAMP and spec.get("stamp") != EXPECT_STAMP:
        raise SystemExit(f"stale dataset: jobs.json is {spec.get('stamp')}, expected {EXPECT_STAMP}")
    subprocess.run(["nvidia-smi"], check=False)
    subprocess.run([sys.executable, "-m", "pip", "install", "-q", "-U", "diffusers>=0.35.1", "transformers>=4.51",
                    "accelerate", "gguf>=0.10.0", "sentencepiece", "protobuf"], check=True)
    cfg = (spec.get("settings") or {}).get("flux") or {"size": 1024, "steps": 8}
    r = subprocess.run([sys.executable, f"{inp}/flux_frames.py", inp, f"{WORK}/frames", json.dumps(cfg)])
    made = sorted(os.path.basename(f)[:-4] for f in glob.glob(f"{WORK}/frames/*.png"))
    rec = {}
    if os.path.exists(f"{WORK}/frames/flux.json"):
        rec = json.load(open(f"{WORK}/frames/flux.json"))
    out = {"stamp": spec.get("stamp"), "exit": r.returncode, "frames": made, "asked": len(spec["jobs"]),
           "flux": rec, "session_s": round(time.time() - T0)}
    json.dump(out, open(f"{WORK}/results.json", "w"), indent=2)
    print(json.dumps(out), flush=True)


if __name__ == "__main__":
    main()
