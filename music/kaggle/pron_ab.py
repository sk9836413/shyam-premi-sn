# Kaggle GPU kernel `sps-music` (pronunciation A/B, pushed by `node music/gen.mjs push --code music/kaggle/pron_ab.py`).
# One short ORIGINAL chorus sung by ACE-Step 1.5 (MIT) with lyric spelling variants for "Shyam" / "Bhole", vocal_language
# hi vs en, LM on/off, LM 1.7B vs 4B; 3 seeds each (batched). Every take is measured: Demucs (MIT) vocal stem ->
# Whisper large-v3 (MIT, language=hi) -> is "श्याम" heard (vs "शाम"/"स्याम"...), does "भोले" keep its aspirate
# (vs "बोले"), CER against the Devanagari chorus, duration / clipping / loudness. A spoken edge-tts take of the same
# chorus is the positive control (proves Whisper writes श्याम when it is said).
# Budget: no new generation after GEN_DEADLINE min, QA stops at QA_DEADLINE min; results.json is always written.
import json, os, re, subprocess, sys, time, traceback, unicodedata

T0 = time.time()
GEN_DEADLINE = float(os.environ.get('SPS_GEN_DEADLINE', '27'))
TAIL_START_MAX = float(os.environ.get('SPS_TAIL_MAX', '19'))  # the 4B-LM tail only starts before this minute
QA_DEADLINE = float(os.environ.get('SPS_QA_DEADLINE', '40'))
OUT = '/kaggle/working/out'
os.makedirs(OUT, exist_ok=True)
JOBS = json.loads(r'''__JOBS__''')
results = {'model': 'ACE-Step 1.5 (acestep-v15-turbo DiT fp32 + 5Hz LM)', 'licence': 'MIT', 'experiment': 'pron-ab', 'takes': [], 'log': []}


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


# --- measurement -------------------------------------------------------------------------------------------------
def nfc(s):
    return unicodedata.normalize('NFC', s).replace('़', '').replace('‍', '').replace('‌', '')


def norm_text(s):
    s = nfc(s)
    s = re.sub(r'\[[^\]]*\]', ' ', s)
    return re.sub(r'[^\wऀ-ॿ]+', '', s)


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


SHYAM_BAD = re.compile(r'(?:श्री|श्रि|श्र|रि|री)?[शषस]्?ि?य?ा?म्?')


def names(text):
    """Deity-name check on a Hindi transcript: correct vs wrong renderings of Shyam / Bhole / Bhakt."""
    words = re.findall(r'[ऀ-ॿ]+', nfc(text))
    sg = sum('श्याम' in w for w in words)
    sb = [w for w in words if 'श्याम' not in w and SHYAM_BAD.fullmatch(w)]
    bg = sum(w.startswith('भोल') for w in words)
    bb = [w for w in words if re.fullmatch(r'[बपवह]ोले?ं?', w)]
    kg = sum(w.startswith(('भक्त', 'भगत')) for w in words)
    kb = [w for w in words if re.match(r'[बखपफ]क्त|[बखपफ]गत', w)]
    return {'shyam': sg, 'shyam_wrong': sb, 'bhole': bg, 'bhole_wrong': bb, 'bhakt': kg, 'bhakt_wrong': kb}


def khatu_slot(text):
    """The word Whisper heard in the "खाटू वाले ___ धणी" slot. Calibration (pron-ab-001 control): on a correctly spoken
    edge-tts take Whisper large-v3 writes "जय श्री शाम" 6 of 6 times (its own prior), but "खाटू वाले श्याम" 2 of 2 times,
    so only this slot separates a sung "Shyaam" from "Shaam"; the "श्री ___" slot only exposes other wrong forms."""
    w = re.findall(r'[ऀ-ॿ]+', nfc(text))
    return [w[i + 1] for i, x in enumerate(w[:-1]) if re.search(r'(वाले|वाल|वले|बले|आले|वल)$', x)]


def verdict(n, expect):
    e = expect or {}
    return {'shyam_ok': not n['shyam_wrong'] and n['shyam'] >= 0.75 * e.get('श्याम', 1),
            'bhole_ok': not n['bhole_wrong'] and n['bhole'] >= max(1, 0.5 * e.get('भोले', 1)),
            'bhakt_ok': not n['bhakt_wrong'] and n['bhakt'] >= max(1, 0.5 * e.get('भक्त', 1))}


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


# --- generation --------------------------------------------------------------------------------------------------
def init_lm(lm, ck, name, dtype, dev):
    from acestep.model_downloader import ensure_lm_model
    if name != 'acestep-5Hz-lm-1.7B':
        ok, msg = ensure_lm_model(name, ck)
        log(f'{name} download: {ok} {str(msg)[:200]}')
    msg, ok = lm.initialize(checkpoint_dir=ck, lm_model_path=name, backend='pt', device=dev, dtype=dtype)
    log(f'LM {name} {dtype}: {ok} {msg[:200]}')
    return ok


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
    # fp16 on the T4 gave NaN latents with lyrics (batch-001 v2): DiT in float32 via ace-step's ROCm dtype path.
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
    lm_dev = 'cuda:1' if torch.cuda.device_count() > 1 else 'cuda'
    lm = LLMHandler()
    cur_lm = 'acestep-5Hz-lm-1.7B'
    if not init_lm(lm, ck, cur_lm, torch.float32, lm_dev):
        raise RuntimeError('LM init failed')
    main = [j for j in JOBS if not j.get('lm')]
    tail = [j for j in JOBS if j.get('lm')]
    for job in main + tail:
        if mins() > GEN_DEADLINE or (job.get('lm') and job['lm'] != cur_lm and mins() > TAIL_START_MAX):
            log(f'time: skipping {job["id"]}')
            results['takes'].append({'variant': job['id'], 'skipped': 'deadline'})
            continue
        if job.get('lm') and job['lm'] != cur_lm:
            try:  # free the 1.7B, load the 4B in fp16 (fp32 would not fit a 16 GB T4)
                del lm
                import gc
                gc.collect()
                torch.cuda.empty_cache()
                lm = LLMHandler()
                cur_lm = job['lm']
                if not init_lm(lm, ck, cur_lm, torch.float16, lm_dev):
                    raise RuntimeError('LM init failed')
            except Exception as e:
                log(f'4B LM unavailable: {e}')
                for j in tail:
                    results['takes'].append({'variant': j['id'], 'skipped': f'4B LM: {e}'})
                break
        seeds = job.get('seeds') or [job.get('seed', 1234)]
        t = time.time()
        p = GenerationParams(task_type='text2music', thinking=job.get('thinking', True), caption=job['caption'], lyrics=job['lyrics'],
                             instrumental=False, vocal_language=job.get('language', 'hi'), bpm=job.get('bpm'), keyscale='',
                             timesignature='4', duration=job.get('duration', 40), inference_steps=8, guidance_scale=1.0,
                             seed=seeds[0], use_cot_caption=False, use_cot_language=False, fade_out_duration=1.5)
        audios = []
        try:
            # ace-step clamps the batch to the GPU tier's max (2 on a 16 GB T4 with the LM), so keep what came back
            # (matched by the seed in each audio's params) and make only the missing seeds one by one.
            c = GenerationConfig(batch_size=len(seeds), allow_lm_batch=True, audio_format='wav', use_random_seed=False, seeds=seeds)
            r = generate_music(dit, lm, params=p, config=c, save_dir=OUT)
            audios = [(a.get('params', {}).get('seed'), a['path']) for a in (r.audios or []) if a.get('path')]
            audios = [(s, w) for s, w in audios if s in seeds]
        except Exception as e:  # batch failed (e.g. OOM): one seed at a time
            log(f'{job["id"]}: batch failed ({type(e).__name__}: {str(e)[:200]})')
            torch.cuda.empty_cache()
        if len(audios) < len(seeds):
            done = {s for s, _ in audios}
            for s in [s for s in seeds if s not in done]:
                try:
                    c = GenerationConfig(batch_size=1, audio_format='wav', use_random_seed=False, seeds=[s])
                    r = generate_music(dit, lm, params=p, config=c, save_dir=OUT)
                    if r.success and r.audios:
                        audios.append((s, r.audios[0]['path']))
                except Exception as e2:
                    log(f'{job["id"]} seed {s} FAILED {type(e2).__name__}: {str(e2)[:300]}')
        dt = round(time.time() - t, 1)
        for s, wav in audios:
            dst = os.path.join(OUT, f'{job["id"]}__{s}.wav')
            os.replace(wav, dst)
            rec = {'variant': job['id'], 'seed': s, 'wav': dst, 'lyrics': job['lyrics'], 'language': job.get('language', 'hi'),
                   'thinking': job.get('thinking', True), 'lm': cur_lm if job.get('thinking', True) else None,
                   'caption': job['caption'], 'gen_seconds_batch': dt, 'duration_req': job.get('duration', 40)}
            rec['clip_share'], rec['seconds'] = clip_share(dst)
            rec['lufs'], rec['true_peak'] = lufs(dst)
            results['takes'].append(rec)
        log(f'{job["id"]}: {len(audios)}/{len(seeds)} takes in {dt}s')
        save()
    del dit, lm
    import gc
    gc.collect()
    torch.cuda.empty_cache()


def control():
    """Positive control: edge-tts (Microsoft neural voice, spoken) of the same chorus through the same QA chain."""
    try:
        sh('pip install -q edge-tts 2>&1 | tail -1', check=False)
        ref = next(j['lyrics_devanagari'] for j in JOBS)
        txt = re.sub(r'\[[^\]]*\]', ' ', ref).replace('\n', '। ')
        with open('/tmp/control.txt', 'w', encoding='utf-8') as f:
            f.write(txt)
        sh('python -m edge_tts --voice hi-IN-MadhurNeural --file /tmp/control.txt --write-media /tmp/control.mp3')
        dst = os.path.join(OUT, 'control-edge-tts__0.wav')
        sh(f'ffmpeg -hide_banner -loglevel error -y -i /tmp/control.mp3 -ar 48000 -ac 2 "{dst}"')
        rec = {'variant': 'control-edge-tts', 'seed': 0, 'wav': dst, 'control': True}
        rec['clip_share'], rec['seconds'] = clip_share(dst)
        results['takes'].append(rec)
    except Exception as e:
        log(f'control failed: {e}')


def qa():
    takes = [r for r in results['takes'] if r.get('wav')]
    if not takes:
        return
    sh('pip install -q demucs openai-whisper 2>&1 | tail -2', check=False)
    import soundfile as sf
    import torch
    expect = next((j.get('expect') for j in JOBS if j.get('expect')), {})
    ref = next(j['lyrics_devanagari'] for j in JOBS)
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
        out = model.transcribe(r.get('vocals') or r['wav'], language='hi', task='transcribe', temperature=0,
                               condition_on_previous_text=False)
        r['whisper'] = out['text'].strip()
        r['cer'] = cer(ref, r['whisper'])
        r['names'] = names(r['whisper'])
        r.update(verdict(r['names'], expect))
        r['khatu_slot'] = khatu_slot(r['whisper'])
        r['khatu_slot_ok'] = bool(r['khatu_slot']) and all('श्याम' in x for x in r['khatu_slot'])
        r['audio_ok'] = bool(r.get('seconds', 0) >= 0.75 * r.get('duration_req', r.get('seconds', 0)) and (r.get('clip_share') or 0) <= 0.001
                             and (r.get('true_peak') is None or r['true_peak'] <= 0.5))
        log(f'{r["variant"]} s{r["seed"]}: CER {r["cer"]} shyam {r["names"]["shyam"]}/{expect.get("श्याम")} wrong {r["names"]["shyam_wrong"]} '
            f'bhole {r["names"]["bhole"]} wrong {r["names"]["bhole_wrong"]} | {r["whisper"][:120]}')
        save()
    del model
    torch.cuda.empty_cache()


def rank():
    by = {}
    for r in results['takes']:
        if r.get('cer') is None:
            continue
        by.setdefault(r['variant'], []).append(r)
    table = []
    for v, rs in by.items():
        table.append({'variant': v, 'takes': len(rs), 'shyam_ok': sum(r['shyam_ok'] for r in rs), 'bhole_ok': sum(r['bhole_ok'] for r in rs),
                      'bhakt_ok': sum(r['bhakt_ok'] for r in rs), 'cer_mean': round(sum(r['cer'] for r in rs) / len(rs), 3),
                      'cer_max': max(r['cer'] for r in rs), 'audio_ok': sum(r.get('audio_ok', False) for r in rs),
                      'best_seed': min(rs, key=lambda r: (-r['shyam_ok'], -r['bhole_ok'], r['cer']))['seed']})
    table.sort(key=lambda t: (-t['shyam_ok'] / max(1, t['takes']), -t['bhole_ok'] / max(1, t['takes']), t['cer_mean']))
    for t in table:
        t['publishable'] = t['takes'] >= 3 and t['shyam_ok'] == t['takes'] and t['cer_max'] < 0.12 and t['audio_ok'] == t['takes']
    results['ranking'] = table


def to_mp3():
    for r in results['takes']:
        for k in ('vocals',):
            if r.get(k) and os.path.exists(r[k]):
                os.remove(r.pop(k))
        if r.get('wav'):
            mp3 = r['wav'][:-4] + '.mp3'
            sh(f'ffmpeg -hide_banner -loglevel error -y -i "{r["wav"]}" -c:a libmp3lame -b:a 160k "{mp3}"', check=False)
            r['file'] = os.path.basename(mp3)
            os.remove(r.pop('wav'))


try:
    log(f'jobs: {len(JOBS)}')
    sh('nvidia-smi --query-gpu=name,memory.total --format=csv', check=False)
    setup()
    generate()
except Exception as e:
    results['fatal'] = f'{type(e).__name__}: {e}'
    log(traceback.format_exc()[-3000:])
try:
    control()
    qa()
    rank()
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
