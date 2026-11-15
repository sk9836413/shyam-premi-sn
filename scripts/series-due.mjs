#!/usr/bin/env node
// Which episode of a character series (scripts/series-plan.mjs: kailash = "Kailash Parivar", STORY.md section 9;
// pov = "Shri Krishna kehte hain", section 10) its workflow should make now. One JSON line; in GitHub Actions also the
// same keys as step outputs (and the chosen bank idea in $RUNNER_TEMP/<slot>-idea.json).
//   node scripts/series-due.mjs --series kailash|pov [--spec story/<dir>/<file>.json] [--today YYYY-MM-DD]
// The episode for TOMORROW (IST) is made the evening before (after the evening run, outside the 09:00-11:30 and
// 18:30-21:00 IST Kaggle windows) and scheduled for its release day at publish_at (08:00).
// produce: --spec given, or tomorrow has the series slot (day-plan: the pilot approved, <ENV> not off), it is not
//          scheduled yet ("<date> | <slot> |" in automation/log.md) and story/<dir>/<date>-*.json exists
// write:   the same, but no spec file yet: Claude writes it from the chosen bank idea (`idea`)
// none:    not approved / paused, tomorrow is not a series day, or it is already scheduled
import fs from 'node:fs';
import path from 'node:path';
import { addDays, istToday, loadInputs, planDay } from './day-plan.mjs';
import { loadBank, pickEpisode, seriesOf, usedIds } from './series-plan.mjs';

const args = process.argv.slice(2);
const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : '');
const cfg = seriesOf(opt('--series') || 'kailash');
if (!cfg) throw new Error('--series kailash|pov');
const DIR = { kailash: 'story/kailash', pov: 'story/krishna-pov' }[cfg.slot];
const out = (o) => {
  console.log(JSON.stringify(o));
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(o).map(([k, v]) => `${k}=${String(v).replace(/\n/g, ' ')}\n`).join(''));
  process.exit(0);
};
const info = (file) => {
  const s = JSON.parse(fs.readFileSync(file, 'utf8'));
  return { mode: 'produce', file, slug: s.slug, release: s.release, publish_at: s.publish_at || cfg.at, lead: s.lead || '', episode: s.episode_id || s.topic_id || '' };
};

if (opt('--spec')) out(info(opt('--spec')));
const bank = loadBank(cfg, '.');
if (bank.approved !== true) out({ mode: 'none', why: `${cfg.bank} is not approved by the owner yet (pilot review)` });
const today = opt('--today') || istToday();
const day = addDays(today, 1);
const inputs = loadInputs('.');
if (!inputs.series?.[cfg.slot]?.on) out({ mode: 'none', why: `${cfg.name} is paused (repo variable ${cfg.env}=off)` });
const plan = planDay(day, inputs);
const up = plan.uploads.find((u) => u.slot === cfg.slot);
if (!up) out({ mode: 'none', why: `${day} is a ${plan.day} ${plan.type} day: no ${cfg.name} episode` });
const log = fs.existsSync('automation/log.md') ? fs.readFileSync('automation/log.md', 'utf8') : '';
if (new RegExp(`^${day} \\| ${cfg.slot} \\|`, 'm').test(log)) out({ mode: 'none', why: `${day} episode already scheduled` });
const files = fs.existsSync(DIR) ? fs.readdirSync(DIR) : [];
const f = files.filter((x) => x.startsWith(`${day}-`) && x.endsWith('.json')).sort()[0];
if (f) out(info(path.posix.join(DIR, f)));
const idea = pickEpisode(day, bank, usedIds(cfg.slot, log, files, bank), up.tieIn || '');
if (!idea) out({ mode: 'none', why: `the idea bank is used up: add ideas to ${cfg.bank}` });
if (process.env.RUNNER_TEMP) fs.writeFileSync(path.join(process.env.RUNNER_TEMP, `${cfg.slot}-idea.json`), JSON.stringify(idea, null, 1));
out({ mode: 'write', release: day, publish_at: cfg.at, idea: idea.id, idea_title: idea.title });
