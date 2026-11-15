#!/usr/bin/env node
// Which "Kailash Parivar" episode (STORY.md section 9) the `kailash` job should make now. One JSON line; in GitHub
// Actions also the same keys as step outputs (and the chosen bank idea in $RUNNER_TEMP/kailash-idea.json).
//   node scripts/kailash-due.mjs [--spec story/kailash/<file>.json] [--today YYYY-MM-DD]
// The episode for TOMORROW (IST) is made the evening before (after the evening run, outside the 09:00-11:30 and
// 18:30-21:00 IST Kaggle windows) and scheduled for its release day at publish_at (08:00).
// produce: --spec given, or tomorrow has a kailash slot (scripts/day-plan.mjs: KAILASH=on, the pilot approved), it is
//          not scheduled yet ("<date> | kailash |" in automation/log.md) and story/kailash/<date>-*.json exists
// write:   the same, but no spec file yet: Claude writes it from the chosen bank idea (`idea`)
// none:    KAILASH is not on / not approved, tomorrow is not a kailash day, or it is already scheduled
import fs from 'node:fs';
import path from 'node:path';
import { addDays, istToday, loadInputs, planDay } from './day-plan.mjs';
import { loadBank, pickEpisode, usedIds } from './kailash-plan.mjs';

const args = process.argv.slice(2);
const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : '');
const out = (o) => {
  console.log(JSON.stringify(o));
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(o).map(([k, v]) => `${k}=${String(v).replace(/\n/g, ' ')}\n`).join(''));
  process.exit(0);
};
const info = (file) => {
  const s = JSON.parse(fs.readFileSync(file, 'utf8'));
  return { mode: 'produce', file, slug: s.slug, release: s.release, publish_at: s.publish_at || '08:00', lead: s.lead, episode: s.episode_id || '' };
};

if (opt('--spec')) out(info(opt('--spec')));
const bank = loadBank('.');
if (bank.approved !== true) out({ mode: 'none', why: 'automation/kailash-episodes.json is not approved by the owner yet (pilot review)' });
const today = opt('--today') || istToday();
const day = addDays(today, 1);
const inputs = loadInputs('.');
if (!inputs.kailash) out({ mode: 'none', why: 'repo variable KAILASH is not on' });
const plan = planDay(day, inputs);
if (!plan.uploads.some((u) => u.slot === 'kailash')) out({ mode: 'none', why: `${day} is a ${plan.day} ${plan.type} day: no Kailash Parivar episode` });
const log = fs.existsSync('automation/log.md') ? fs.readFileSync('automation/log.md', 'utf8') : '';
if (new RegExp(`^${day} \\| kailash \\|`, 'm').test(log)) out({ mode: 'none', why: `${day} episode already scheduled` });
const dir = 'story/kailash';
const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
const f = files.filter((x) => x.startsWith(`${day}-`) && x.endsWith('.json')).sort()[0];
if (f) out(info(path.posix.join(dir, f)));
const idea = pickEpisode(day, bank, usedIds(log, files, bank));
if (!idea) out({ mode: 'none', why: 'the episode bank is used up: add ideas to automation/kailash-episodes.json' });
if (process.env.RUNNER_TEMP) fs.writeFileSync(path.join(process.env.RUNNER_TEMP, 'kailash-idea.json'), JSON.stringify(idea, null, 1));
out({ mode: 'write', release: day, publish_at: '08:00', idea: idea.id, idea_title: idea.title });
