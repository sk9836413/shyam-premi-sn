// ACE-Step takes for the weekly mantra-jaap long video (owner, 13 Nov 2026; automation/mantras.json, scripts/mantra.mjs).
// One take per mala (a different raag / tempo / instruments each: slow - medium - slow), made on Kaggle by the same
// kernel as the weekly bhajans (music/kaggle/bhajan_batch.py: ACE-Step 1.5, CLAP, Demucs + Whisper large-v3), in
// music-weekly.yml job `mantra` (Mondays 02:10 IST after the bhajans; the first video's takes on Sat 21 Nov 2026 05:45
// IST, after the movie series' GPU days and right after the weekly quota reset).
//
//   node music/mantra-takes.mjs plan --today YYYY-MM-DD [--days 7] [--hours-left H] --out batch.json
//        the mantra videos of today+1 .. today+days (day-plan rules) that lack unused QA-passed takes; per video
//        malas + 2 spare takes (with under 12 GPU hours left: 3 malas + 1 spare); nothing before mantras.json
//        generate_from. Writes the Kaggle batch (no file when nothing is needed); GITHUB_OUTPUT need=true|false.
//   node music/mantra-takes.mjs import --from <kaggle out dir> --batch batch.json [--report qa.json]
//        Whisper/CLAP gate (gateTake) per take, then the loop (scripts/mantra.mjs findLoop) on the loudness-normalised
//        take; passing takes -> music/mantra/takes/<take>.ogg + music/mantra/takes.json (status ok, loop, style).
//
// Gate per take (all must hold): audio >= 40 s, no clipping (<= 0.1 % samples, true peak <= +0.5 dBTP), -35..-5 LUFS;
// the deity name (वासुदेव / कृष्ण + राम / शिव / गणपत(ये) / राम) heard right in >= 80 % of the checked positions (never the
// one right after "श्री") and in at least 2; whole-text CER <= 0.5 against the chant repeated as often as Whisper heard
// it; CLAP Indian devotional >= 0.30 and western rock/pop <= 0.30; then a steady loop of a divisor of 108 chants.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cer, clapShares, dice, nameCheck, norm, singLyrics } from './bhajan-batch.mjs';
import { normaliseLoudness, sha256 } from './engine.mjs';
import { addDays, analyzeTake, loadLedger, loadMantras, saveLedger, usedIds } from '../scripts/mantra.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(DIR, '..');
export const TAKES_DIR = path.join(DIR, 'mantra', 'takes');
export const SPARE = 2;
export const TIGHT_HOURS = 12;
export const NAME_SHARE = 0.8;
export const CER_MAX = 0.5;
export const MODEL = 'ACE-Step 1.5 (acestep-v15-turbo DiT fp32 + acestep-5Hz-lm-1.7B)';

/** The chant as ACE-Step reads it (spelling.json rules) and the name rules of nameCheck for this mantra. */
export const sungUnit = (m) => singLyrics(m.sing || m.text);
export const nameRules = (m) => ({ names: Object.fromEntries(Object.entries(m.names).map(([w, r]) => [w, { deity: m.id, ok: r.ok }])) });

/** Whisper check on the deity name of a repetitive chant: the written text is the chant repeated as often as Whisper
 *  heard it, aligned character by character (bhajan-batch.mjs nameCheck); positions right after श्री are skipped. */
export function mantraNameCheck(m, heard) {
  const unit = sungUnit(m);
  const reps = Math.max(1, Math.min(200, Math.round([...norm(heard)].length / Math.max(1, [...norm(unit)].length))));
  const ref = Array(reps).fill(unit).join('\n');
  const r = nameCheck(ref, heard, m.id, nameRules(m));
  return { ...r, reps, share: r.checked ? +(r.right / r.checked).toFixed(3) : 0, cer: cer(ref, heard), ok: r.checked >= 2 && r.right >= 2 && r.right / r.checked >= NAME_SHARE };
}

/** The keep/drop decision for one Kaggle take (before the loop): { ok, why[], names, clap }. */
export function gateTake(take, m) {
  const why = [];
  if (take.error || !take.file) why.push(take.error || 'no audio');
  if (!(take.seconds >= 40)) why.push(`too short (${take.seconds} s)`);
  if (take.clip_share == null || take.clip_share > 0.001) why.push(`clipping (${take.clip_share})`);
  if (take.true_peak != null && take.true_peak > 0.5) why.push(`true peak ${take.true_peak} dBTP`);
  if (take.lufs != null && (take.lufs < -35 || take.lufs > -5)) why.push(`loudness ${take.lufs} LUFS`);
  let names = null;
  if (take.whisper == null) why.push('no Whisper transcript');
  else {
    names = mantraNameCheck(m, take.whisper);
    if (!names.ok) why.push(`deity name right in ${names.right}/${names.checked} checked positions (needs >= ${NAME_SHARE * 100} % and 2): ${names.wrong.slice(0, 3).map((w) => `${w.word}->"${w.heard}"`).join(', ')}`);
    if (names.cer == null || names.cer > CER_MAX) why.push(`CER ${names.cer} > ${CER_MAX}`);
  }
  const clap = clapShares(take.clap, 'bhaavuk');
  if (!clap) why.push('no CLAP score');
  else {
    if (clap.indian < 0.3) why.push(`CLAP hears little Indian devotional music (${clap.indian})`);
    if (clap.western > 0.3) why.push(`CLAP hears western rock/pop (${clap.western})`);
  }
  return { ok: !why.length, why, names, clap };
}

/** Whisper segment starts that sound like the chant (loop start candidates). */
export const chantStarts = (m, segments = []) => segments.filter((s) => s && typeof s.start === 'number' && (dice(sungUnit(m), s.text) >= 0.3 || Object.keys(m.names).some((w) => norm(s.text).includes(norm(w))))).map((s) => s.start);

const hash = (s) => [...String(s)].reduce((a, c) => (a * 131 + c.charCodeAt(0)) % 2147483629, 17);

/** The arrangement of each take of a video: slow, medium, slow, medium, slow, then the spares (slow, medium); styles
 *  used least by earlier takes of this mantra first, never twice in one video. */
export function stylesFor(cat, ledger, mantra, count, salt = '') {
  const uses = new Map();
  for (const t of ledger.takes || []) if (t.mantra === mantra) uses.set(t.style, (uses.get(t.style) || 0) + 1);
  const order = (tempo) => cat.styles.filter((s) => s.tempo === tempo).sort((a, b) => (uses.get(a.id) || 0) - (uses.get(b.id) || 0) || hash(a.id + salt) - hash(b.id + salt));
  const pools = { slow: order('slow'), medium: order('medium') };
  const out = [];
  for (let i = 0; i < count; i++) {
    const tempo = i % 2 === 0 ? 'slow' : 'medium';
    const p = pools[tempo].length ? pools[tempo] : pools[tempo === 'slow' ? 'medium' : 'slow'];
    out.push(p.shift());
  }
  return out;
}

/** The Kaggle job of one take (music/kaggle/bhajan_batch.py fields). */
export function takeJob(cat, m, { date, n, style }) {
  const mid = (m.sec_per_rep[0] + m.sec_per_rep[1]) / 2;
  const reps = Math.max(6, Math.ceil(110 / mid));
  const unit = sungUnit(m);
  const id = `m-${date}-${m.id}-${n}`;
  return {
    id, kind: 'vocal', mantra: m.id, video: date, mala: n, style: style.id, tempo: style.tempo, raag: style.raag,
    title_roman: `${m.roman} (${style.raag})`, title_hi: m.short || m.text, deity: m.id, public_domain_text: m.source_en,
    lyrics: `[verse]\n${Array(reps).fill(unit).join('\n')}`, lyrics_devanagari: Array(reps).fill(unit).join('\n'),
    language: 'hi', singer: 'male', caption: `${style.caption}, ${cat.caption_suffix}`, bpm: style.bpm,
    duration: Math.max(75, Math.min(150, Math.round(reps * mid) + 8)), seeds: [100000 + (hash(id) % 800000)],
  };
}

/** The takes to make: [{ date, mantra, have, need }] for the videos of today+1 .. today+days. */
export function needs({ cat, inputs, ledger, today, days = 7, hoursLeft = null, mantraFor }) {
  if (today < (cat.generate_from || '0000')) return [];
  const used = usedIds(ledger);
  const out = [];
  for (let i = 1; i <= days; i++) {
    const d = addDays(today, i);
    const m = mantraFor(d, inputs, cat);
    if (!m) continue;
    const tight = hoursLeft != null && hoursLeft < TIGHT_HOURS;
    const want = tight ? Math.min(m.malas, 3) + 1 : m.malas + SPARE;
    const have = (ledger.takes || []).filter((t) => t.mantra === m.id && t.status === 'ok' && !t.used_in && !used.has(t.id) && (t.for === d || t.for < today)).length;
    if (have < (tight ? Math.min(m.malas, 3) : m.malas)) out.push({ date: d, mantra: m.id, have, make: want - have, tight });
  }
  return out;
}

export function buildBatch(cat, ledger, plan, today) {
  const jobs = [];
  for (const v of plan) {
    const m = cat.mantras[v.mantra];
    const styles = stylesFor(cat, ledger, v.mantra, v.make, v.date);
    styles.forEach((style, i) => jobs.push(takeJob(cat, m, { date: v.date, n: v.have + i + 1, style })));
  }
  if (jobs.length) Object.assign(jobs[0], { gen_deadline: 30, qa_deadline: 46 });
  return { batch: `mantra-${today}`, kind: 'mantra', note: 'Mantra-jaap takes (music/mantra-takes.mjs): public-domain mantras, original arrangements, ACE-Step 1.5 (MIT), one take per mala.', videos: plan, jobs };
}

// ---------------------------------------------------------------- CLI
const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const writeJson = (f, j) => { fs.mkdirSync(path.dirname(path.resolve(f)), { recursive: true }); fs.writeFileSync(f, `${JSON.stringify(j, null, 1)}\n`); };
const out = (k, v) => { if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`); };

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const cmd = args[0];
  const cat = loadMantras(ROOT);
  const ledger = loadLedger(ROOT);
  if (cmd === 'plan') {
    const { loadInputs } = await import('../scripts/day-plan.mjs');
    const { mantraFor } = await import('../scripts/mantra.mjs');
    const today = opt('--today') || new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
    const hoursLeft = opt('--hours-left') ? Number(opt('--hours-left')) : null;
    const plan = needs({ cat, inputs: loadInputs(ROOT), ledger, today, days: Number(opt('--days', 7)), hoursLeft, mantraFor });
    if (!plan.length) { console.log(`no mantra takes needed (today ${today}${today < cat.generate_from ? `, generation starts ${cat.generate_from}` : ''})`); out('need', 'false'); process.exit(0); }
    const b = buildBatch(cat, ledger, plan, today);
    writeJson(opt('--out'), b);
    out('need', 'true');
    out('batch', b.batch);
    console.log(`${b.batch}: ${plan.map((v) => `${v.date} ${v.mantra} (${v.have} usable, +${v.make}${v.tight ? ', quota tight: 3 malas' : ''})`).join('; ')}; ${b.jobs.length} takes, ${b.jobs.reduce((s, j) => s + j.duration, 0)} s of audio`);
  } else if (cmd === 'import') {
    const from = path.resolve(opt('--from'));
    const batch = JSON.parse(fs.readFileSync(opt('--batch'), 'utf8'));
    const res = JSON.parse(fs.readFileSync(path.join(from, 'results.json'), 'utf8'));
    const jobs = Object.fromEntries(batch.jobs.map((j) => [j.id, j]));
    const today = new Date().toISOString().slice(0, 10);
    const report = { batch: batch.batch, run: res.run || null, minutes: res.minutes ?? null, takes: [] };
    fs.mkdirSync(TAKES_DIR, { recursive: true });
    for (const t of res.takes || []) {
      const j = jobs[t.job];
      if (!j) continue;
      const m = { ...cat.mantras[j.mantra], id: j.mantra };
      const id = `${t.job}-s${t.seed}`;
      const g = gateTake(t, m);
      let loop = null;
      let file = null;
      if (g.ok) {
        const src = [path.join(from, t.file), path.join(from, 'out', t.file)].find((f) => fs.existsSync(f));
        if (!src) g.why.push('audio file missing');
        else {
          file = path.join(TAKES_DIR, `${id}.ogg`);
          normaliseLoudness(src, file, { fadeIn: 0, fadeOut: 0 });
          loop = analyzeTake(file, { estPeriod: (m.sec_per_rep[0] + m.sec_per_rep[1]) / 2, segStarts: chantStarts(m, t.segments) });
          if (loop.error) { g.why.push(`loop: ${loop.error}`); fs.rmSync(file, { force: true }); file = null; }
        }
      }
      const ok = g.ok && !g.why.length;
      report.takes.push({ id, mantra: j.mantra, for: j.video, style: j.style, ok, why: g.why, names: g.names && { checked: g.names.checked, right: g.names.right, cer: g.names.cer }, clap: g.clap, loop, whisper: String(t.whisper || '').slice(0, 200) });
      if (!ok) continue;
      ledger.takes = (ledger.takes || []).filter((x) => x.id !== id);
      ledger.takes.push({
        id, mantra: j.mantra, for: j.video, mala: j.mala, style: j.style, tempo: j.tempo, raag: j.raag, seed: t.seed, batch: batch.batch,
        file: path.relative(ROOT, file).replace(/\\/g, '/'), sha256: sha256(file), seconds: t.seconds, status: 'ok', checked: today,
        model: MODEL, licence: 'original arrangement, generated by ACE-Step 1.5 (MIT); the mantra text is public domain',
        qa: { names: { checked: g.names.checked, right: g.names.right }, cer: g.names.cer, clap: g.clap, lufs: t.lufs ?? null, true_peak: t.true_peak ?? null },
        loop, used_in: null,
      });
    }
    saveLedger(ledger, ROOT);
    if (opt('--report')) writeJson(opt('--report'), report);
    const kept = report.takes.filter((x) => x.ok);
    console.log(`${batch.batch}: ${kept.length}/${report.takes.length} takes passed (Whisper deity name, CLAP, loop)`);
    for (const x of report.takes) console.log(`- ${x.id}: ${x.ok ? `KEPT, loop ${x.loop.reps} chants x ${108 / x.loop.reps} = 108, ${x.loop.period} s each` : x.why.join('; ')}`);
  } else {
    console.log('usage: plan | import (see the header)');
    process.exit(2);
  }
}
