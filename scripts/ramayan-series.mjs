#!/usr/bin/env node
// "Ramayan Ke Rochak Tathya" series (owner, 24 Nov 2026: "abhi Ramayan se related facts video bahut viral ho rhe h").
// A numbered facts Short ("Ramayan Tathya 7/60: ...") made by the `facts` job in the facts slot (17:00 IST, made the
// evening before) on RAMAYAN_DAYS (scripts/day-plan.mjs). Every item lives in automation/ramayan-series.md with its
// hook, the fact (Roman + Devanagari), a PRIMARY source line (Valmiki Ramayan kand + sarga, or Shri Ramcharitmanas kand
// + doha) and a one-line lesson; the Short speaks the item's hook and fact word for word (scripts/ramayan-rules.mjs).
// This module has no facts.mjs import (day-plan.mjs reads it; facts.mjs imports day-plan.mjs).
//
//   node scripts/ramayan-series.mjs check          the series file's own rules (exit 1 on problems)
//   node scripts/ramayan-series.mjs next           the next item (after the ones in log.md / story/facts)
//   node scripts/ramayan-series.mjs show <n>       one item as JSON
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const SERIES_FILE = 'automation/ramayan-series.md';
export const PLAYLIST = 'Ramayan Ke Rochak Tathya';
export const KICKER = (n, total) => `Ramayan Tathya ${n}/${total}`;
// The two primary texts and their kands (Roman as on the source line -> Devanagari, spoken on the source beat).
export const WORKS = { 'Valmiki Ramayan': { hi: 'वाल्मीकि रामायण', unit: 'Sarga' }, 'Shri Ramcharitmanas': { hi: 'रामचरितमानस', unit: 'Doha' } };
export const KANDS = { Bal: 'बालकांड', Ayodhya: 'अयोध्याकांड', Aranya: 'अरण्यकांड', Kishkindha: 'किष्किंधाकांड', Sundar: 'सुंदरकांड', Yuddha: 'युद्धकांड', Lanka: 'लंकाकांड', Uttar: 'उत्तरकांड' };
// "Valmiki Ramayan, Sundar Kand, Sarga 49" | "Shri Ramcharitmanas, Ayodhya Kand, Doha 100-101" | "... Sarga 74 aur 102"
export const SOURCE_RE = /^(Valmiki Ramayan|Shri Ramcharitmanas), (Bal|Ayodhya|Aranya|Kishkindha|Sundar|Yuddha|Lanka|Uttar) Kand, (Sarga|Doha) (\d{1,3})(?:-(\d{1,3})| aur (\d{1,3}))?$/;
const FIELDS = ['id', 'deity', 'hook', 'hook_hi', 'fact', 'fact_hi', 'source', 'verify', 'lesson'];

const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } };

/** Items of the series file: [{ n, title, id, deity, hook, hook_hi, fact, fact_hi, source, verify, lesson }]. */
export function parseSeries(text) {
  const items = [];
  let cur = null;
  for (const line of String(text).split(/\r?\n/)) {
    const h = line.match(/^### (\d{1,3})\. (.+?)\s*$/);
    if (h) { cur = { n: Number(h[1]), title: h[2] }; items.push(cur); continue; }
    if (/^#{1,2} /.test(line)) { cur = null; continue; }
    const f = cur && line.match(/^- ([a-z_]+): (.+?)\s*$/);
    if (f && FIELDS.includes(f[1])) cur[f[1]] = f[2];
  }
  return items;
}

export const loadSeries = (root = '.') => parseSeries(read(path.join(root, SERIES_FILE)));

/** Parts of an item's source line: { work, kand, unit, nums: [..], workHi, kandHi } or null. */
export function sourceParts(source) {
  const m = String(source || '').match(SOURCE_RE);
  if (!m) return null;
  return { work: m[1], kand: m[2], unit: m[3], nums: [m[4], m[5], m[6]].filter(Boolean).map(Number), workHi: WORKS[m[1]].hi, kandHi: KANDS[m[2]] };
}

/** Series numbers already made: from the facts slugs in log.md and the spec files in story/facts (written ahead). */
export function doneNumbers(root = '.') {
  const nums = new Set();
  for (const m of read(path.join(root, 'automation/log.md')).matchAll(/^\d{4}-\d{2}-\d{2} \| facts\d? \| \S*-facts-ramayan-(\d{2,3})-/gm)) nums.add(Number(m[1]));
  const dir = path.join(root, 'story/facts');
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    const m = f.match(/^\d{4}-\d{2}-\d{2}-ramayan-(\d{2,3})-.+\.json$/);
    if (m) nums.add(Number(m[1]));
  }
  return nums;
}

/** Dates whose facts upload is a Ramayan item (log.md lines). */
export const ramayanLogDates = (log = '') => new Set([...String(log).matchAll(/^(\d{4}-\d{2}-\d{2}) \| facts\d? \| \S*-facts-ramayan-\d/gm)].map((m) => m[1]));

/** The next item: the first one numbered above the highest made (the series runs in order; never skips back). */
export function nextItem(items, done = new Set()) {
  const top = Math.max(0, ...done);
  return [...items].sort((a, b) => a.n - b.n).find((x) => x.n > top) || null;
}

/** The series state for the planner: { on, total, done, left, next } (repo variable RAMAYAN=off pauses it). */
export function seriesState(root = '.', env = process.env) {
  const items = loadSeries(root);
  const done = doneNumbers(root);
  const next = nextItem(items, done);
  return { on: env.RAMAYAN !== 'off' && items.length > 0, total: items.length, done: done.size, left: next ? items.filter((x) => x.n >= next.n).length : 0, next };
}

function main() {
  const [cmd, arg] = process.argv.slice(2);
  const items = loadSeries('.');
  if (cmd === 'check') {
    import('./ramayan-rules.mjs').then(({ checkSeries }) => {
      const e = checkSeries(items);
      console.log(e.length ? e.map((x) => `- ${x}`).join('\n') : `OK: ${items.length} items (${items.filter((x) => /^Valmiki/.test(x.source)).length} Valmiki Ramayan, ${items.filter((x) => /^Shri Ramcharitmanas/.test(x.source)).length} Shri Ramcharitmanas)`);
      process.exit(e.length ? 1 : 0);
    });
    return;
  }
  if (cmd === 'next') { console.log(JSON.stringify(seriesState('.'), null, 1)); return; }
  if (cmd === 'show') { console.log(JSON.stringify(items.find((x) => x.n === Number(arg)) || null, null, 1)); return; }
  console.log('usage: node scripts/ramayan-series.mjs check | next | show <n>');
  process.exit(2);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
