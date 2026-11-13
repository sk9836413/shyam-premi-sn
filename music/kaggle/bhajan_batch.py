# Kaggle GPU kernel `sps-music`, weekly AI-bhajan batch (pushed by `node music/gen.mjs push --code music/kaggle/bhajan_batch.py`
# with the jobs of `node music/bhajan-batch.mjs batch` inlined below). ACE-Step 1.5 (MIT code + weights; the model card
# allows commercial use of generated music): every song x 3 seeds, DiT fp32 on cuda:0 (fp16 gave NaN latents with
# lyrics on the T4), 5Hz LM 1.7B fp32 on cuda:1. The SUNG lyrics already carry the spelling rules (श्‍याम with a ZWJ).
# Measurements per take (the keep/drop decision is made in Node, music/bhajan-batch.mjs gate(), so it is unit-tested):
#   seconds, loudness / true peak (ffmpeg loudnorm), clipped-sample share,
#   CLAP zero-shot (laion/clap-htsat-unfused, Apache-2.0) on the full mix: Indian devotional vs western rock/pop labels,
#   Demucs htdemucs (MIT) vocal stem -> Whisper large-v3 (MIT, language=hi): transcript + segments (chorus timestamp).
# Budget (owner: <= ~60 GPU min a week): no new take after GEN_DEADLINE min, QA stops at QA_DEADLINE; results.json is
# always written; takes are mp3 (192 kb/s) in /kaggle/working/out.
import json, os, re, subprocess, sys, time, traceback

T0 = time.time()
GEN_DEADLINE = float(os.environ.get('SPS_GEN_DEADLINE', '34'))
QA_DEADLINE = float(os.environ.get('SPS_QA_DEADLINE', '50'))
OUT = '/kaggle/working/out'
os.makedirs(OUT, exist_ok=True)
JOBS = json.loads(r'''__JOBS__''')
results = {'model': 'ACE-Step 1.5 (acestep-v15-turbo DiT fp32 + acestep-5Hz-lm-1.7B fp32)', 'licence': 'MIT', 'experiment': 'bhajan-weekly', 'takes': [], 'log': []}
CLAP_LABELS = ['Indian devotional bhajan', 'Hindi devotional song with harmonium and dholak', 'Indian folk song with dhol drums',
               'Indian classical music', 'Bollywood song', 'western rock music', 'heavy metal music', 'electronic dance music',
               'western pop song', 'orchestral film score', 'jazz music', 'country music']


def mins():
    return (time.time() - T0) / 60


def log(msg):
    line = f'[{mins():5.1f} min] {msg}'
    print(line, flush=True)
    results['log'].append(line)


def save():
    with open('/kaggle/working/results.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=1)


def sh(cmd, check=True):
    log('$ ' + cmd[:160])
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if r.returncode and check:
        log((r.stdout + r.stderr)[-2000:])
        raise RuntimeError(f'command failed: {cmd[:80]}')
    return r.stdout + r.stderr


def setup():
    sh('git clone -q --depth 1 https://github.com/ace-step/ACE-Step-1.5 /kaggle/working/ace')
    results['ace_commit'] = sh('git -C /kaggle/working/ace log -1 --format=%H', check=False).strip()[-40:]
    deps = ['transformers>=4.51.0,<4.58.0', 'diffusers>=0.37.0', 'loguru', 'einops', 'accelerate>=1.12.0', 'numba',
            'vector-quantize-pytorch>=1.27.15', 'toml', 'modelscope', 'peft>=0.18.0', 'lycoris-lora', 'lightning', 'diskcache',
            'pytorch-wavelets', 'pywavelets', 'soundfile', 'scipy', 'typer-slim', 'safetensors', 'matplotlib']
    log(sh('pip install -q ' + ' '.join(f'"{d}"' for d in deps) + ' 2>&1', check=False)[-800:])
    sys.path.insert(0, '/kaggle/working/ace')


def lufs(path):
    out = sh(f'ffmpeg -hide_banner -nostats -i "{path}" -af loudnorm=I=-14:TP=-1:print_format=json -f null - 2>&1', check=False)
    m = re.search(r'\{[^{}]*"input_i"[^{}]*\}', out, re.S)
    if not m:
        return None, None
    j = json.loads(m.group(0))
    return float(j['input_i']), float(j['input_tp'])


def clip_share(path):
    import soundfile as sf
    import numpy as np
    x, sr = sf.read(path, always_2d=True)
    return float((np.abs(x) >= 0.999).mean()), len(x) / sr


def read_mono(path, sr):
    import numpy as np
    import soundfile as sf
    x, r = sf.read(path, always_2d=True)
    x = x.mean(1)
    if r != sr:
        import scipy.signal as ss
        x = ss.resample_poly(x, sr, r)
    return np.asarray(x, dtype='float32')


def generate():
    import torch
    from acestep.handler import AceStepHandler
    from acestep.llm_inference import LLMHandler
    from acestep.inference import GenerationParams, GenerationConfig, generate_music
    from acestep.model_downloader import ensure_main_model
    from acestep import gpu_config
    ck = '/kaggle/working/ace/checkpoints'
    ok, msg = ensure_main_model(ck)
    log(f'models: {ok} {msg}')
    dit = AceStepHandler()
    real_rocm = gpu_config.is_rocm_available
    os.environ['ACESTEP_ROCM_DTYPE'] = 'float32'
    gpu_config.is_rocm_available = lambda: True
    try:
        msg, ok = dit.initialize_service(project_root='/kaggle/working/ace', config_path='acestep-v15-turbo', device='cuda')
    finally:
        gpu_config.is_rocm_available = real_rocm
    log(f'DiT: {ok} {msg[:200]}')
    if not ok:
        raise RuntimeError('DiT init failed')
    lm = LLMHandler()
    lm_dev = 'cuda:1' if torch.cuda.device_count() > 1 else 'cuda'
    msg, ok = lm.initialize(checkpoint_dir=ck, lm_model_path='acestep-5Hz-lm-1.7B', backend='pt', device=lm_dev, dtype=torch.float32)
    log(f'LM: {ok} {msg[:200]}')
    if not ok:
        raise RuntimeError('LM init failed')
    for job in JOBS:  # priority order (festival songs first): a deadline drops the tail, never half a song's takes
        need = len(job['seeds']) * job.get('duration', 60) / 60 * 0.75  # ~0.75 GPU min per minute of audio, measured
        if mins() + need > GEN_DEADLINE:
            log(f'time: skipping {job["id"]}')
            results['takes'].append({'job': job['id'], 'skipped': 'deadline'})
            continue
        for s in job['seeds']:
            t = time.time()
            rec = {'job': job['id'], 'seed': s}
            try:
                p = GenerationParams(task_type='text2music', thinking=True, caption=job['caption'], lyrics=job['lyrics'], instrumental=False,
                                     vocal_language=job.get('language', 'hi'), bpm=job.get('bpm'), keyscale='', timesignature='4',
                                     duration=job.get('duration', 60), inference_steps=8, guidance_scale=1.0, seed=s,
                                     use_cot_caption=False, use_cot_language=False, fade_out_duration=2.0)
                c = GenerationConfig(batch_size=1, audio_format='wav', use_random_seed=False, seeds=[s])
                r = generate_music(dit, lm, params=p, config=c, save_dir=OUT)
                if not r.success or not r.audios:
                    raise RuntimeError(getattr(r, 'status_message', 'no audio'))
                dst = os.path.join(OUT, f'{job["id"]}__{s}.wav')
                os.replace(r.audios[0]['path'], dst)
                rec['wav'] = dst
                rec['gen_seconds'] = round(time.time() - t, 1)
                rec['clip_share'], rec['seconds'] = clip_share(dst)
                rec['lufs'], rec['true_peak'] = lufs(dst)
                log(f'{job["id"]} s{s}: {rec["seconds"]:.0f}s audio in {rec["gen_seconds"]}s, {rec["lufs"]} LUFS, TP {rec["true_peak"]}')
            except Exception as e:
                rec['error'] = f'{type(e).__name__}: {str(e)[:300]}'
                log(f'{job["id"]} s{s} FAILED {rec["error"]}')
                torch.cuda.empty_cache()
            results['takes'].append(rec)
            save()
    del dit, lm
    import gc
    gc.collect()
    torch.cuda.empty_cache()


def qa():
    takes = [r for r in results['takes'] if r.get('wav')]
    if not takes:
        return
    sh('pip install -q demucs openai-whisper 2>&1 | tail -2', check=False)
    import soundfile as sf
    import torch
    try:  # CLAP on the full mix (the listener hears the mix, not the stem)
        from transformers import ClapModel, ClapProcessor
        cm = ClapModel.from_pretrained('laion/clap-htsat-unfused').cuda().eval()
        cp = ClapProcessor.from_pretrained('laion/clap-htsat-unfused')
        for r in takes:
            x = read_mono(r['wav'], 48000)
            segs = [x[i:i + 480000] for i in range(0, max(1, len(x) - 240000), 480000)][:6]
            inp = cp(text=CLAP_LABELS, audios=segs, sampling_rate=48000, return_tensors='pt', padding=True)
            inp = {k: v.cuda() for k, v in inp.items()}
            with torch.no_grad():
                pr = cm(**inp).logits_per_audio.softmax(-1).mean(0).cpu().tolist()
            r['clap'] = {l: round(p, 4) for l, p in zip(CLAP_LABELS, pr)}
        del cm
        torch.cuda.empty_cache()
    except Exception as e:
        log(f'CLAP failed: {e}\n{traceback.format_exc()[-800:]}')
    log('clap done')
    try:
        from demucs.pretrained import get_model
        from demucs.apply import apply_model
        dm = get_model('htdemucs').cuda().eval()
        for r in takes:
            x, sr = sf.read(r['wav'], always_2d=True)
            wav = torch.tensor(x.T, dtype=torch.float32)
            if wav.shape[0] == 1:
                wav = wav.repeat(2, 1)
            m = wav.mean(0)
            mu, sd = m.mean(), m.std() + 1e-8
            with torch.no_grad():
                src = apply_model(dm, ((wav - mu) / sd)[None].cuda(), device='cuda', split=True, overlap=0.25)[0]
            v = (src[dm.sources.index('vocals')].cpu() * sd + mu).numpy().T
            r['vocals'] = r['wav'][:-4] + '.vocals.wav'
            sf.write(r['vocals'], v, sr)
        del dm
        torch.cuda.empty_cache()
    except Exception as e:
        log(f'demucs failed: {e}\n{traceback.format_exc()[-800:]}')
    log('demucs done')
    import whisper
    model = whisper.load_model('large-v3', device='cuda')
    for r in takes:
        if mins() > QA_DEADLINE:
            r['qa_skipped'] = 'deadline'
            continue
        out = model.transcribe(r.get('vocals') or r['wav'], language='hi', task='transcribe', temperature=0, condition_on_previous_text=False)
        r['whisper'] = out['text'].strip()
        r['segments'] = [{'start': round(s['start'], 2), 'end': round(s['end'], 2), 'text': s['text'].strip(),
                          'no_speech_prob': round(s.get('no_speech_prob', 0), 3)} for s in out.get('segments', [])]
        log(f'{r["job"]} s{r["seed"]}: {r["whisper"][:120]}')
        save()
    del model
    torch.cuda.empty_cache()


def to_mp3():
    for r in results['takes']:
        if r.get('vocals') and os.path.exists(r['vocals']):
            os.remove(r.pop('vocals'))
        if r.get('wav'):
            mp3 = r['wav'][:-4] + '.mp3'
            sh(f'ffmpeg -hide_banner -loglevel error -y -i "{r["wav"]}" -c:a libmp3lame -b:a 192k "{mp3}"', check=False)
            if os.path.exists(mp3):
                r['file'] = os.path.basename(mp3)
            os.remove(r.pop('wav'))


try:
    log(f'jobs: {len(JOBS)} songs, {sum(len(j["seeds"]) for j in JOBS)} takes')
    sh('nvidia-smi --query-gpu=name,memory.total --format=csv', check=False)
    setup()
    generate()
except Exception as e:
    results['fatal'] = f'{type(e).__name__}: {e}'
    log(traceback.format_exc()[-3000:])
try:
    qa()
except Exception as e:
    results['qa_fatal'] = f'{type(e).__name__}: {e}'
    log(traceback.format_exc()[-2000:])
finally:
    try:
        to_mp3()
    except Exception as e:
        log(f'mp3: {e}')
    results['minutes'] = round(mins(), 1)
    save()
    sh('rm -rf /kaggle/working/ace', check=False)
