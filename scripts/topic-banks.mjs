#!/usr/bin/env node
// Idea entries of the topic banks + the series outlines (owner, 15 Nov 2026; scripts/viral-radar.mjs writes the ideas).
//
// A bank keeps its usable items where its picker reads them (facts-topics.json `topics`, kailash-episodes.json
// `episodes`, krishna-pov-topics.json `topics`) and its IDEAS apart, in an `ideas` array: radar ideas (citation
// placeholder "TODO: verify ...") and reference ideas (real citation, not yet checked by the bank's own validator).
// No picker reads `ideas`, and scripts/facts.mjs also skips any topic that still says "status": "idea".
// Promotion = the citation is filled AND the bank's own validator passes on the item; then it moves into the picker's
// array without "status".
//
//   node scripts/topic-banks.mjs check                        every bank's ideas + the series outlines (exit 1 on problems)
//   node scripts/topic-banks.mjs promote --bank facts --id X  check X with the bank's validator and move it into use
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkTopicBank, kindProblems } from './facts.mjs';

export const BANKS = {
  facts: { file: 'automation/facts-topics.json', items: 'topics' },
  kailash: { file: 'automation/kailash-episodes.json', items: 'episodes' },
  pov: { file: 'automation/krishna-pov-topics.json', items: 'topics' },
};
export const SERIES_FILES = ['automation/series-bhakt-katha.json', 'automation/series-sheesh-mahabharat.json'];
export const TODO = /^TODO\b/i;
const DEVANAGARI = /[ऀ-ॿ]/;
const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } };

/** The citation of an idea: facts `cite` {work, ref}; kailash / pov `source`. */
const citation = (bank, x) => (bank === 'facts' ? `${x.cite?.work || ''} ${x.cite?.ref || ''}` : String(x.source || ''));
export const citationFilled = (bank, x) => {
  if (bank !== 'facts' && x.story_type === 'fictional') return true;
  const c = citation(bank, x).trim();
  return c.length >= 10 && !/TODO/i.test(c) && (bank !== 'facts' || (x.sources || []).some((u) => /^https?:\/\/\S+$/.test(u)));
};

/** Problems of one idea entry (empty = a well-formed idea; a TODO citation is allowed here, not at promotion). */
export function ideaProblems(bank, x, used = new Set()) {
  const e = [];
  const n = `${bank} idea ${x?.id || '?'}`;
  if (!/^[a-z0-9-]+$/.test(x?.id || '')) e.push(`${n}: id a-z0-9-`);
  if (used.has(x?.id)) e.push(`${n}: duplicate id`);
  if (x?.status !== 'idea') e.push(`${n}: "status": "idea"`);
  if (!x?.from || !x.from.source || !Array.isArray(x.from.refs)) e.push(`${n}: from {source, refs: [reference URLs]}`);
  if (bank === 'facts') {
    const placeholder = TODO.test(x.cite?.work || '') || TODO.test(x.cite?.ref || '');
    // the bank's own topic rules, minus what a placeholder citation cannot have yet
    const own = checkTopicBank([{ ...x, status: undefined }]).filter((m) => !/needs 60\+/.test(m) && !(placeholder && /cite|source URL/.test(m)) && !/status/.test(m));
    e.push(...own.map((m) => m.replace(/^topic /, `${bank} idea `)));
    if (!x.cite || !x.cite.work || !x.cite.ref) e.push(`${n}: cite {work, ref} (a "TODO: verify ..." placeholder until checked)`);
  } else {
    if (!x.title || !DEVANAGARI.test(`${x.title} ${x.cover || ''}`)) e.push(`${n}: title + cover (the series formula)`);
    if (!['scripture', 'parampara', 'fictional'].includes(x.story_type)) e.push(`${n}: story_type scripture | parampara | fictional`);
    if (x.story_type !== 'fictional' && !String(x.source || '').trim()) e.push(`${n}: source (a "TODO: verify ..." placeholder until checked)`);
    if (bank === 'kailash' && !(Array.isArray(x.cast) && x.cast.includes(x.lead))) e.push(`${n}: lead and cast`);
    if (bank === 'pov' && !(x.hook && x.message)) e.push(`${n}: hook and message`);
  }
  return e;
}

/** Problems of every idea in a bank object. */
export function bankIdeaProblems(bank, data) {
  const used = new Set((data[BANKS[bank].items] || []).map((x) => x.id));
  const e = [];
  for (const x of data.ideas || []) { e.push(...ideaProblems(bank, x, used)); used.add(x.id); }
  for (const x of data[BANKS[bank].items] || []) if (x.status === 'idea') e.push(`${bank} ${x.id}: an idea inside "${BANKS[bank].items}" (move it to "ideas")`);
  return e;
}

/** What blocks promotion of an idea (the bank's own validator on the item, with a real citation). */
export async function promoteProblems(bank, x, data, root = '.') {
  const e = [];
  if (!citationFilled(bank, x)) e.push(`${x.id}: fill the citation first (no "TODO"; facts: cite {work, ref} + a source URL), after checking it in the text`);
  const item = { ...x };
  delete item.status; delete item.from; delete item.art_hint;
  if (bank === 'facts') {
    e.push(...checkTopicBank([...(data.topics || []), item]).filter((m) => m.includes(`topic ${x.id}:`)));
  } else if (bank === 'kailash') {
    const k = await import('./kailash-rules.mjs');
    let lib = {};
    try { lib = JSON.parse(read(path.join(root, 'characters/kailash/cast.json'))).characters || {}; } catch { /* no library */ }
    e.push(...k.titleProblems(item.title), ...k.coverProblems(item.cover), ...k.toneProblems({ title: item.title, summary: `${item.premise} ${item.resolution}`, moral: item.moral }));
    for (const c of item.cast || []) if (!lib[c]) e.push(`${x.id}: cast "${c}" is not in characters/kailash/cast.json`);
    if (!['evergreen', 'festival'].includes(item.kind)) e.push(`${x.id}: kind evergreen | festival`);
  } else if (bank === 'pov') {
    const p = await import('./krishna-pov-rules.mjs');
    const k = await import('./kailash-rules.mjs');
    e.push(...p.titleProblems(item.title), ...k.coverProblems(item.cover), ...p.povToneProblems({}, [item.title, item.message, item.hook, item.label]));
    if (!/^[A-Za-z0-9 ,'?!.-]{3,26}$/.test(item.label || '')) e.push(`${x.id}: label (3-26 Roman characters)`);
  }
  return e;
}

// ---------------------------------------------------------------- files

/** Write a bank in its own style: facts = JSON with 1-space indent; kailash / pov = 2-space top level, one item a line. */
export function serializeBank(bank, data) {
  if (bank === 'facts') return JSON.stringify(data, null, 1) + '\n';
  const inline = (v) => (Array.isArray(v) ? `[${v.map(inline).join(', ')}]`
    : v && typeof v === 'object' ? `{${Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${inline(x)}`).join(', ')}}` : JSON.stringify(v));
  const top = Object.entries(data).map(([k, v]) => {
    if (Array.isArray(v) && v.length && v.every((x) => x && typeof x === 'object' && !Array.isArray(x))) return `  ${JSON.stringify(k)}: [\n${v.map((x) => `    ${inline(x)}`).join(',\n')}\n  ]`;
    return `  ${JSON.stringify(k)}: ${Array.isArray(v) ? inline(v) : JSON.stringify(v, null, 2).replace(/\n/g, '\n  ')}`;
  });
  return `{\n${top.join(',\n')}\n}\n`;
}
export const loadBank = (bank, root = '.') => JSON.parse(read(path.join(root, BANKS[bank].file)) || '{}');
export const saveBank = (bank, data, root = '.') => fs.writeFileSync(path.join(root, BANKS[bank].file), serializeBank(bank, data));

/** Append ideas to a bank (skips ids already used); returns the ids added. */
export function addIdeas(bank, ideas, root = '.') {
  if (!ideas.length) return [];
  const data = loadBank(bank, root);
  const used = new Set([...(data[BANKS[bank].items] || []), ...(data.ideas || [])].map((x) => x.id));
  const fresh = ideas.filter((x) => !used.has(x.id));
  if (!fresh.length) return [];
  data.ideas = [...(data.ideas || []), ...fresh];
  saveBank(bank, data, root);
  return fresh.map((x) => x.id);
}

// ---------------------------------------------------------------- series outlines (automation/series-*.json)

const PART_TITLE = /^(.+?) 😱 🙏 (.+?) पार्ट (\d+)$/u;
const EP_TITLE = /^(.+?) 😱 🙏 (.+?) EP (\d+)$/u;
const GENERIC = /^(part|पार्ट|भाग|episode|ep|एपिसोड)\b/i;

/** Problems of a series outline file: approved false until the owner says so, titles in the format, a payoff part per
 *  katha, recaps from part 2, cliffhangers on every part but the last, sources. */
export function seriesOutlineProblems(s) {
  const e = [];
  if (s.approved !== false) e.push(`${s.series}: "approved": false until the owner approves a pilot`);
  const groups = s.kathas ? s.kathas.map((k) => ({ id: k.id, name: k.name, items: k.parts, sources: k.sources, re: PART_TITLE }))
    : [{ id: s.series, name: s.series_title, items: s.episodes, sources: s.sources, re: EP_TITLE }];
  for (const g of groups) {
    const n = `${s.series}/${g.id}`;
    if (!Array.isArray(g.items) || !g.items.length) { e.push(`${n}: no parts`); continue; }
    if (!(g.sources || []).some((x) => /^https?:\/\//.test(x.url || ''))) e.push(`${n}: sources [{work, ref, url}]`);
    if (!g.items.some((p) => p.payoff === true)) e.push(`${n}: at least one payoff part ("payoff": true; its title states the payoff)`);
    g.items.forEach((p, i) => {
      const m = String(p.title || '').match(g.re);
      if (p.n !== i + 1) e.push(`${n} ${i + 1}: n in order`);
      if (!m || +m[3] !== p.n || m[2] !== g.name) e.push(`${n} ${p.n}: title "<hook> 😱 🙏 ${g.name} ${s.kathas ? 'पार्ट' : 'EP'} ${p.n}" (is "${p.title}")`);
      else if (GENERIC.test(m[1].trim()) || m[1].trim().length < 8) e.push(`${n} ${p.n}: the hook part of the title must say what happens, never just "Part N"`);
      if (p.n > 1 && !DEVANAGARI.test(p.recap || '')) e.push(`${n} ${p.n}: recap (one Devanagari line, so the part works on its own)`);
      if (i < g.items.length - 1 && !DEVANAGARI.test(p.cliffhanger || '')) e.push(`${n} ${p.n}: cliffhanger`);
      if (!(String(p.outline || '').length >= 40)) e.push(`${n} ${p.n}: outline`);
    });
  }
  return e;
}

// ---------------------------------------------------------------- CLI

async function main() {
  const args = process.argv.slice(2);
  const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
  if (args[0] === 'check') {
    const e = [];
    for (const b of Object.keys(BANKS)) e.push(...bankIdeaProblems(b, loadBank(b)));
    for (const f of SERIES_FILES) if (fs.existsSync(f)) e.push(...seriesOutlineProblems(JSON.parse(read(f))));
    const ideas = Object.keys(BANKS).map((b) => `${b} ${(loadBank(b).ideas || []).length}`).join(', ');
    console.log(e.length ? e.map((x) => `- ${x}`).join('\n') : `OK: ideas ${ideas}; series outlines ${SERIES_FILES.filter((f) => fs.existsSync(f)).length}`);
    process.exit(e.length ? 1 : 0);
  }
  if (args[0] === 'promote') {
    const bank = opt('--bank'), id = opt('--id');
    if (!BANKS[bank] || !id) { console.log('usage: promote --bank facts|kailash|pov --id <idea id>'); process.exit(2); }
    const data = loadBank(bank);
    const x = (data.ideas || []).find((i) => i.id === id);
    if (!x) { console.log(`no idea "${id}" in ${BANKS[bank].file}`); process.exit(1); }
    const e = await promoteProblems(bank, x, data);
    if (e.length) { console.log(e.map((m) => `- ${m}`).join('\n')); process.exit(1); }
    const item = { ...x };
    delete item.status;
    data[BANKS[bank].items].push(item);
    data.ideas = data.ideas.filter((i) => i.id !== id);
    saveBank(bank, data);
    console.log(`promoted ${id} into ${BANKS[bank].file} ${BANKS[bank].items}`);
    return;
  }
  console.log('usage: node scripts/topic-banks.mjs check | promote --bank facts|kailash|pov --id <id>');
  process.exit(2);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
export { kindProblems };
