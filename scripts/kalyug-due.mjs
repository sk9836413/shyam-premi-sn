#!/usr/bin/env node
// Which "Kalyug ke Bhagwan" episode (STORY.md section 8) the `kalyug` job should make now. Prints one JSON line and, in
// GitHub Actions, the same keys as step outputs.
//   node scripts/kalyug-due.mjs [--spec story/kalyug/<file>.json] [--today YYYY-MM-DD]
// The episode for TOMORROW (IST) is made the evening before (after the evening run, outside the 09:00-11:30 and
// 18:30-21:00 IST Kaggle windows) and scheduled for its release day at publish_at (08:00) as that day's morning Short.
// produce: --spec given, or tomorrow is a kalyug day (scripts/day-plan.mjs with KALYUG=on), it is not scheduled yet
//          ("<date> | kalyug |" in automation/log.md) and story/kalyug/<date>-*.json exists (written earlier)
// write:   the same, but no spec file yet: Claude writes it first
// none:    KALYUG is not on, tomorrow is not a kalyug day (festival / movie / other weekday), or it is already scheduled
import fs from 'node:fs';
import path from 'node:path';
import { addDays, istToday, loadInputs, planDay } from './day-plan.mjs';

const args = process.argv.slice(2);
const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : '');
const out = (o) => {
  console.log(JSON.stringify(o));
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(o).map(([k, v]) => `${k}=${v}\n`).join(''));
  process.exit(0);
};
const info = (file) => {
  const s = JSON.parse(fs.readFileSync(file, 'utf8'));
  return { mode: 'produce', file, slug: s.slug, release: s.release, publish_at: s.publish_at || '08:00', lead: s.lead };
};

if (opt('--spec')) out(info(opt('--spec')));
const today = opt('--today') || istToday();
const day = addDays(today, 1);
const inputs = loadInputs('.');
if (!inputs.kalyug) out({ mode: 'none', why: 'repo variable KALYUG is not on' });
const plan = planDay(day, inputs);
if (!plan.uploads.some((u) => u.slot === 'kalyug')) out({ mode: 'none', why: `${day} is a ${plan.day} ${plan.type} day: no episode` });
const log = fs.existsSync('automation/log.md') ? fs.readFileSync('automation/log.md', 'utf8') : '';
if (new RegExp(`^${day} \\| kalyug \\|`, 'm').test(log)) out({ mode: 'none', why: `${day} episode already scheduled` });
const dir = 'story/kalyug';
const f = (fs.existsSync(dir) ? fs.readdirSync(dir) : []).filter((x) => x.startsWith(`${day}-`) && x.endsWith('.json')).sort()[0];
if (f) out(info(path.posix.join(dir, f)));
out({ mode: 'write', release: day, publish_at: '08:00' });
