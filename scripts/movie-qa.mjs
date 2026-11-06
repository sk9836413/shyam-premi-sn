#!/usr/bin/env node
// One summary line from the movie kernel's pronunciation check (story/movie_kernel.py: Whisper large-v3-turbo transcribes
// every voice line; CER = character error rate against the written Hindi; missed_names = a name in the line that the
// transcript does not contain, e.g. "श्याम" heard as "शाम").
//   node scripts/movie-qa.mjs <work>/kaggle/qa.json
import fs from 'node:fs';

const f = process.argv[2];
if (!f || !fs.existsSync(f)) { console.log('- Pronunciation check: no qa.json'); process.exit(0); }
const q = JSON.parse(fs.readFileSync(f, 'utf8'));
if (q.error) { console.log(`- Pronunciation check failed: ${q.error}`); process.exit(0); }
const lines = q.lines || [];
const worst = [...lines].sort((a, b) => b.cer - a.cer).slice(0, 3).map((l) => `${l.id} ${l.who} ${l.cer} heard "${l.heard}"`);
const names = lines.filter((l) => l.missed_names?.length).map((l) => `${l.id}: ${l.missed_names.join(', ')}`);
console.log(`- Pronunciation (Whisper CER, ${lines.length} lines): mean ${q.mean_cer}; worst: ${worst.join('; ')}${names.length ? `; names not heard: ${names.join('; ')}` : '; every name heard'}`);
