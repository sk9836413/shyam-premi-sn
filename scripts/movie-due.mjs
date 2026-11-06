#!/usr/bin/env node
// Which mini-movie part (STORY.md section 7) the `movie` job should make now. Prints one JSON line and, in GitHub
// Actions, the same keys as step outputs.
//   node scripts/movie-due.mjs [--part story/movies/<series>/part-<n>.json] [--today YYYY-MM-DD] [--daily on]
// produce: a part already written (story/movies/<series>/part-<n>.json) whose produce_from day has come and whose
//          release day has not passed, earliest release first, not yet scheduled ("<release> | movie |" in
//          automation/log.md) and, for a series the owner has not approved yet, not yet rendered for review
//          ("- <slug> | review" in automation/published.md).
// write:   nothing due, the daily movie pipeline is on (repo variable MOVIE_DAILY=on) and tomorrow has no movie yet:
//          Claude writes tomorrow's part of the active series in automation/movie-series.md (STORY.md section 7).
// none:    nothing to do.
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : '');
const ist = (d = 0) => new Date(Date.now() + 5.5 * 3600e3 + d * 86400e3).toISOString().slice(0, 10);
const today = opt('--today') || ist();
const tomorrow = new Date(Date.parse(today) + 86400e3).toISOString().slice(0, 10);
const log = fs.existsSync('automation/log.md') ? fs.readFileSync('automation/log.md', 'utf8') : '';
const pub = fs.existsSync('automation/published.md') ? fs.readFileSync('automation/published.md', 'utf8') : '';
const scheduled = (slug, release) => new RegExp(`^${release} \\| movie \\| ${slug} `, 'm').test(log);
const reviewed = (slug) => pub.includes(`- ${slug} | review`);

function out(o) {
  const line = JSON.stringify(o);
  console.log(line);
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(o).map(([k, v]) => `${k}=${v}\n`).join(''));
  }
  process.exit(0);
}

function partInfo(file) {
  const spec = JSON.parse(fs.readFileSync(file, 'utf8'));
  const series = JSON.parse(fs.readFileSync(path.posix.join(path.dirname(file), 'series.json'), 'utf8'));
  return { mode: 'produce', file, slug: spec.slug, release: spec.release, publish_at: spec.publish_at || '07:00',
    series: spec.series, part: spec.part, parts: spec.parts, approved: series.approved === true };
}

if (opt('--part')) out(partInfo(opt('--part')));

const due = [];
const root = 'story/movies';
for (const dir of fs.existsSync(root) ? fs.readdirSync(root) : []) {
  const sf = path.posix.join(root, dir, 'series.json');
  if (!fs.existsSync(sf)) continue;
  const series = JSON.parse(fs.readFileSync(sf, 'utf8'));
  if (!['scheduled', 'active'].includes(series.status)) continue;
  for (const p of series.parts || []) {
    const file = path.posix.join(root, dir, p.file || `part-${p.part}.json`);
    if (!fs.existsSync(file) || !p.release || (p.produce_from || p.release) > today || p.release < today) continue;
    const info = partInfo(file);
    if (scheduled(info.slug, info.release) || (!info.approved && reviewed(info.slug))) continue;
    due.push(info);
  }
}
due.sort((a, b) => a.release.localeCompare(b.release));
if (due.length) out(due[0]);
if (opt('--daily') === 'on' && !new RegExp(`^${tomorrow} \\| movie \\|`, 'm').test(log)) {
  out({ mode: 'write', release: tomorrow, publish_at: '07:00' });
}
out({ mode: 'none', today });
