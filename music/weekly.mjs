// Weekly batch for the music library (workflow music-weekly.yml, only with the repo variable MUSIC_GEN=on):
//   node music/weekly.mjs batch --out <file> [--date YYYY-MM-DD] [--count 12]
//        -> a batch JSON of instrumental jobs: the prompts in music/lyrics/instrumental-prompts.json, rotated by ISO week,
//           fresh seeds each week (so every week's tracks are new originals)
//   node music/weekly.mjs prune [--keep 48]
//        -> keeps the newest --keep generated tracks (gen-*) in music/library, deletes older ones (repo size)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);

export function isoWeek(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return { year: d.getUTCFullYear(), week: 1 + Math.round(((d - firstThu) / 864e5 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7) };
}

export function weeklyBatch(prompts, date, count = 12) {
  const { year, week } = isoWeek(date);
  const tag = `${year}w${String(week).padStart(2, '0')}`;
  const start = (week * count) % prompts.length;
  const jobs = Array.from({ length: Math.min(count, prompts.length) }, (_, k) => {
    const p = prompts[(start + k) % prompts.length];
    return { ...p, id: `i-${tag}-${p.id.replace(/^i-/, '')}`, kind: 'instrumental', duration: p.duration || 60, seed: year * 10000 + week * 100 + k };
  });
  return { batch: `weekly-${tag}`, note: 'Weekly instrumental batch (music/weekly.mjs).', jobs };
}

export function prune(dir, keep) {
  const gen = fs.readdirSync(dir).filter((f) => /^gen-.*\.licence\.json$/.test(f)).map((f) => {
    const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    return { stem: f.slice(0, -13), checked: j.checked || '' };
  }).sort((a, b) => b.checked.localeCompare(a.checked) || b.stem.localeCompare(a.stem));
  const gone = gen.slice(keep);
  for (const g of gone) for (const f of fs.readdirSync(dir).filter((x) => x.startsWith(`${g.stem}.`))) fs.rmSync(path.join(dir, f));
  return gone.map((g) => g.stem);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (args[0] === 'batch') {
    const prompts = JSON.parse(fs.readFileSync(path.join(DIR, 'lyrics', 'instrumental-prompts.json'), 'utf8')).prompts;
    const b = weeklyBatch(prompts, opt('--date', new Date().toISOString().slice(0, 10)), Number(opt('--count', 12)));
    fs.writeFileSync(opt('--out'), `${JSON.stringify(b, null, 1)}\n`);
    console.log(`${b.batch}: ${b.jobs.length} jobs`);
  } else if (args[0] === 'prune') {
    console.log(JSON.stringify({ removed: prune(path.join(DIR, 'library'), Number(opt('--keep', 48))) }));
  }
}
