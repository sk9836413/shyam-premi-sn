# Kaggle GPU kernel `sps-music`: one batch of original music with ACE-Step 1.5 (MIT code + weights; the model card says
# generated music may be used commercially). Pushed by music/gen.mjs with the jobs inlined below (JOBS = ...).
#   - instrumental jobs: devotional Indian instrumentals for the music library (music/library/)
#   - vocal jobs: original Hindi bhajans (our own lyrics, or public-domain texts such as Tulsidas's Hanuman Chalisa)
# QA per track (results.json): duration, integrated loudness / true peak (ffmpeg loudnorm), clipped-sample share, and for
# vocal jobs Demucs (MIT) vocal stem -> Whisper large-v3 (MIT) Hindi transcript -> character error rate vs the lyrics,
# plus an ECAPA speaker embedding (SpeechBrain, Apache-2.0) so the same "singer" can be compared across songs.
# Budget: the whole session stops generating at DEADLINE_MIN and always writes results.json.
import json, os, re, subprocess, sys, time, traceback, unicodedata

T0 = time.time()
DEADLINE_MIN = float(os.environ.get('SPS_MUSIC_DEADLINE', '38'))
OUT = '/kaggle/working/out'
os.makedirs(OUT, exist_ok=True)
JOBS = json.loads(r'''__JOBS__''')
QA_URLS = json.loads(r'''__QA__''')  # earlier tracks to re-check (instrument / vocal-leak check): [{id, url, kind}]
results = {'model': 'ACE-Step 1.5 (acestep-v15-turbo + acestep-5Hz-lm-1.7B)', 'licence': 'MIT', 'tracks': [], 'log': []}


def log(msg):
    line = f'[{(time.time() - T0) / 60:5.1f} min] {msg}'
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
    # Kaggle's image (Python 3.13, its own CUDA torch) is outside ace-step's pinned Python/torch range: keep Kaggle's
    # torch/torchaudio and install the rest; the package itself is used from the clone (sys.path), not pip-installed.
    deps = ['transformers>=4.51.0,<4.58.0', 'diffusers>=0.37.0', 'loguru', 'einops', 'accelerate>=1.12.0', 'numba',
            'vector-quantize-pytorch>=1.27.15', 'toml', 'modelscope', 'peft>=0.18.0', 'lycoris-lora', 'lightning', 'diskcache',
            'pytorch-wavelets', 'pywavelets', 'soundfile', 'scipy', 'typer-slim', 'safetensors', 'matplotlib']
    log(sh('python -c "import sys, torch, torchaudio; print(sys.version.split()[0], torch.__version__, torchaudio.__version__, torch.version.cuda)"', check=False).strip())
    out = sh('pip install -q ' + ' '.join(f'"{d}"' for d in deps) + ' 2>&1', check=False)
    log(out[-1500:])
    sys.path.insert(0, '/kaggle/working/ace')
    log(sh('python -c "import torch, torchaudio; print(torch.__version__, torchaudio.__version__)"', check=False).strip())


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


def norm_text(s):
    s = unicodedata.normalize('NFC', s)
    s = re.sub(r'\[[^\]]*\]', ' ', s)
    s = re.sub(r'[^\wऀ-ॿ]+', '', s)
    return s.replace('़', '')  # nukta-insensitive


def cer(ref, hyp):
    a, b = norm_text(ref), norm_text(hyp)
    if not a:
        return None
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return round(prev[-1] / len(a), 3)


def generate():
    import torch
    from acestep.handler import AceStepHandler
    from acestep.llm_inference import LLMHandler
    from acestep.inference import GenerationParams, GenerationConfig, generate_music
    from acestep.model_downloader import ensure_main_model
    ck = '/kaggle/working/ace/checkpoints'
    ok, msg = ensure_main_model(ck)
    log(f'models: {ok} {msg}')
    dit = AceStepHandler()
    # Vocal jobs: fp16 on the T4 gave NaN latents for every song with lyrics (batch-001 v2), so the DiT runs in float32
    # (ace-step's own ROCm path: ACESTEP_ROCM_DTYPE, default float32) and the LM moves to the second T4.
    fp32 = any(j['kind'] == 'vocal' for j in JOBS)
    from acestep import gpu_config
    real_rocm = gpu_config.is_rocm_available
    if fp32:
        os.environ['ACESTEP_ROCM_DTYPE'] = 'float32'
        gpu_config.is_rocm_available = lambda: True
    try:
        msg, ok = dit.initialize_service(project_root='/kaggle/working/ace', config_path='acestep-v15-turbo', device='cuda')
    finally:
        gpu_config.is_rocm_available = real_rocm
    results['dit_dtype'] = str(getattr(dit, 'dtype', '?'))
    log(f'DiT: {ok} {msg[:300]}')
    if not ok:
        raise RuntimeError('DiT init failed')
    lm = LLMHandler()
    # The T4 has no native bfloat16: keep the 1.7B LM in float32 (fp16 can overflow on bf16-trained weights).
    lm_dev = 'cuda:1' if fp32 and torch.cuda.device_count() > 1 else 'cuda'
    msg, ok = lm.initialize(checkpoint_dir=ck, lm_model_path='acestep-5Hz-lm-1.7B', backend='pt', device=lm_dev, dtype=torch.float32)
    log(f'LM: {ok} {msg[:300]}')
    if not ok:
        raise RuntimeError('LM init failed')
    for job in JOBS:
        if (time.time() - T0) / 60 > DEADLINE_MIN:
            log(f'deadline reached, skipping {job["id"]}')
            results['tracks'].append({'id': job['id'], 'skipped': 'deadline'})
            continue
        t = time.time()
        rec = {'id': job['id'], 'kind': job['kind'], 'caption': job['caption'], 'bpm': job.get('bpm'), 'seed': job.get('seed', 1234),
               'duration_req': job.get('duration', 60), 'lyrics': job.get('lyrics', '[Instrumental]'), 'language': job.get('language', 'hi')}
        try:
            inst = job['kind'] == 'instrumental'
            p = GenerationParams(task_type='text2music', thinking=True, caption=job['caption'],
                                 lyrics='[Instrumental]' if inst else job['lyrics'], instrumental=inst,
                                 vocal_language='unknown' if inst else job.get('language', 'hi'), bpm=job.get('bpm'),
                                 keyscale=job.get('key', ''), timesignature='4', duration=job.get('duration', 60),
                                 inference_steps=8, guidance_scale=1.0, seed=job.get('seed', 1234),
                                 use_cot_caption=False, use_cot_language=False, fade_out_duration=2.0)
            c = GenerationConfig(batch_size=1, audio_format='wav', use_random_seed=False, seeds=[job.get('seed', 1234)])
            r = generate_music(dit, lm, params=p, config=c, save_dir=OUT)
            if not r.success or not r.audios:
                raise RuntimeError(r.status_message if hasattr(r, 'status_message') else 'no audio')
            wav = r.audios[0]['path']
            dst = os.path.join(OUT, f'{job["id"]}.wav')
            os.replace(wav, dst)
            rec['wav'] = dst
            rec['gen_seconds'] = round(time.time() - t, 1)
            rec['clip_share'], rec['seconds'] = clip_share(dst)
            rec['lufs'], rec['true_peak'] = lufs(dst)
            log(f'{job["id"]}: {rec["seconds"]:.1f}s audio in {rec["gen_seconds"]}s, {rec["lufs"]} LUFS, TP {rec["true_peak"]}')
        except Exception as e:
            rec['error'] = f'{type(e).__name__}: {e}'
            log(f'{job["id"]} FAILED {rec["error"]}\n{traceback.format_exc()[-1500:]}')
        results['tracks'].append(rec)
        save()
    del dit, lm
    import gc
    gc.collect()
    torch.cuda.empty_cache()


def fetch_qa_tracks():
    for q in QA_URLS:
        dst = os.path.join(OUT, f'{q["id"]}.wav')
        try:
            sh(f'curl -sfL "{q["url"]}" -o /tmp/qa.mp3 && ffmpeg -hide_banner -loglevel error -y -i /tmp/qa.mp3 -ar 48000 -ac 2 "{dst}"')
            results['tracks'].append({'id': q['id'], 'kind': q.get('kind', 'instrumental'), 'wav': dst, 'qa_only': True})
        except Exception as e:
            log(f'qa fetch {q["id"]}: {e}')


def read_mono(path, sr):
    import numpy as np
    import soundfile as sf
    x, r = sf.read(path, always_2d=True)
    x = x.mean(1)
    if r != sr:
        import scipy.signal as ss
        x = ss.resample_poly(x, sr, r)
    return np.asarray(x, dtype='float32')


def qa():
    tracks = [r for r in results['tracks'] if r.get('wav')]
    if not tracks:
        return
    sh('pip install -q demucs openai-whisper speechbrain 2>&1 | tail -2', check=False)
    import soundfile as sf
    import torch
    # CLAP zero-shot (laion/clap-htsat-unfused, Apache-2.0): which instruments, and is anybody singing?
    labels = ['solo bansuri flute', 'sitar', 'santoor', 'tabla drums', 'dhol drums', 'harmonium', 'shehnai', 'veena',
              'temple bells', 'a man singing', 'a woman singing', 'a choir singing', 'electronic dance music',
              'western rock music', 'orchestral film score', 'piano']
    try:
        from transformers import ClapModel, ClapProcessor
        cm = ClapModel.from_pretrained('laion/clap-htsat-unfused').cuda().eval()
        cp = ClapProcessor.from_pretrained('laion/clap-htsat-unfused')
        for r in tracks:
            x = read_mono(r['wav'], 48000)
            segs = [x[i:i + 480000] for i in range(0, max(1, len(x) - 240000), 480000)][:6]
            inp = cp(text=labels, audios=segs, sampling_rate=48000, return_tensors='pt', padding=True)
            with torch.no_grad():
                out = cm(**{k: v.cuda() for k, v in inp.items()})
            pr = out.logits_per_audio.softmax(-1).mean(0).cpu().numpy()
            top = sorted(zip(labels, pr), key=lambda z: -z[1])[:4]
            r['clap_top'] = [[l, round(float(p), 3)] for l, p in top]
            r['clap'] = {l: round(float(p), 4) for l, p in zip(labels, pr)}
            r['clap_singing'] = round(float(sum(p for l, p in zip(labels, pr) if 'singing' in l)), 3)
            log(f'{r["id"]}: CLAP {r["clap_top"]} singing={r["clap_singing"]}')
        del cm
        torch.cuda.empty_cache()
    except Exception as e:
        log(f'CLAP failed: {e}\n{traceback.format_exc()[-800:]}')
    vocal = [r for r in tracks if r.get('kind') == 'vocal']
    if vocal:  # Demucs vocal stem (python API with soundfile I/O, so no torchaudio backend is needed)
        try:
            from demucs.pretrained import get_model
            from demucs.apply import apply_model
            dm = get_model('htdemucs').cuda().eval()
            for r in vocal:
                x, sr = sf.read(r['wav'], always_2d=True)
                wav = torch.tensor(x.T, dtype=torch.float32)
                ref = wav.mean(0)
                mu, sd = ref.mean(), ref.std() + 1e-8
                with torch.no_grad():
                    src = apply_model(dm, ((wav - mu) / sd)[None].cuda(), device='cuda', split=True, overlap=0.25)[0]
                v = (src[dm.sources.index('vocals')].cpu() * sd + mu).numpy().T
                r['vocals'] = r['wav'][:-4] + '.vocals.wav'
                sf.write(r['vocals'], v, sr)
            del dm
            torch.cuda.empty_cache()
        except Exception as e:
            log(f'demucs failed: {e}\n{traceback.format_exc()[-800:]}')
    try:  # Whisper large-v3: lyric intelligibility (vocal) / leaked words (instrumental)
        import whisper
        model = whisper.load_model('large-v3', device='cuda')
        for r in tracks:
            src = r.get('vocals') or r['wav']
            out = model.transcribe(src, language='hi', task='transcribe', temperature=0, condition_on_previous_text=False)
            r['whisper'] = out['text'].strip()
            if r.get('kind') == 'vocal':
                ref = next((j.get('lyrics_devanagari') or j['lyrics'] for j in JOBS if j['id'] == r['id']), '')
                r['cer'] = cer(ref, r['whisper'])
                log(f'{r["id"]}: CER {r["cer"]} | {r["whisper"][:160]}')
            else:
                segs = [sg for sg in out.get('segments', []) if sg.get('no_speech_prob', 1) < 0.5]
                r['whisper_words'] = len(' '.join(sg['text'] for sg in segs).split())
                log(f'{r["id"]}: words heard {r["whisper_words"]} | {r["whisper"][:80]}')
        del model
        torch.cuda.empty_cache()
    except Exception as e:
        log(f'whisper failed: {e}')
    try:  # ECAPA speaker embeddings (SpeechBrain, Apache-2.0): is it the same "singer" across songs?
        from speechbrain.inference.speaker import EncoderClassifier
        enc = EncoderClassifier.from_hparams(source='speechbrain/spkrec-ecapa-voxceleb', savedir='/kaggle/working/ecapa', run_opts={'device': 'cuda'})
        embs = {}
        for r in vocal:
            if r.get('vocals'):
                w = torch.tensor(read_mono(r['vocals'], 16000))[None].cuda()
                embs[r['id']] = enc.encode_batch(w).squeeze().float()
        ids = list(embs)
        results['speaker_similarity'] = {f'{a}|{b}': round(float(torch.nn.functional.cosine_similarity(embs[a], embs[b], dim=0)), 3)
                                         for i, a in enumerate(ids) for b in ids[i + 1:]}
        log(f'speaker similarity: {results["speaker_similarity"]}')
    except Exception as e:
        log(f'speaker embedding failed: {e}')


def to_mp3():
    for r in results['tracks']:
        if r.get('qa_only') and r.get('wav'):
            os.remove(r.pop('wav'))
            continue
        if r.get('wav'):
            mp3 = r['wav'][:-4] + '.mp3'
            sh(f'ffmpeg -hide_banner -loglevel error -y -i "{r["wav"]}" -c:a libmp3lame -b:a 192k "{mp3}"')
            r['file'] = os.path.basename(mp3)
            os.remove(r['wav'])
            r.pop('wav')
            if r.get('vocals'):
                v = r.pop('vocals')
                sh(f'ffmpeg -hide_banner -loglevel error -y -i "{v}" -c:a libmp3lame -b:a 128k "{OUT}/{r["id"]}.vocals.mp3"', check=False)
                os.remove(v)


try:
    log(f'jobs: {len(JOBS)}')
    sh('nvidia-smi --query-gpu=name,memory.total --format=csv', check=False)
    setup()
    if JOBS:
        generate()
    fetch_qa_tracks()
    qa()
except Exception as e:
    results['fatal'] = f'{type(e).__name__}: {e}'
    log(traceback.format_exc()[-3000:])
finally:
    try:
        to_mp3()
    except Exception as e:
        log(f'mp3: {e}')
    results['minutes'] = round((time.time() - T0) / 60, 1)
    save()
    sh('rm -rf /kaggle/working/ace /kaggle/working/ecapa /kaggle/working/req.txt', check=False)
