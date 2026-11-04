// Small summary lines for daily.yml (kept out of the YAML so the quoting stays simple).
//   node characters/summary.mjs <fetch.json>   -> "18 lines, session 640 s, fresh true" (Kaggle lip-sync result)
//   node characters/summary.mjs --record       -> the published.md suffix for today's Short (animated or dialogue)
import fs from 'node:fs';

const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const arg = process.argv[2];
if (arg === '--record') {
  const j = read('story/today/scenes.json') || {};
  if (j.format === 'dialogue') {
    const m = read('story/today/char/meta.json') || {};
    console.log(` | dialogue ${m.mode || '?'}, lip-synced ${m.lipsync_lines || 0}/${m.lines || 0}, ${Math.round(m.seconds || 0)} s${m.footage?.length ? `, real footage ${m.footage.length}` : ''}`);
  } else {
    const s = j.scenes || [];
    const n = s.filter((x) => x.video).length;
    console.log(n ? ` | animated ${n}/${s.filter((x) => !x.endcard).length}` : '');
  }
} else {
  const f = read(arg) || {};
  console.log(`${(f.clips || []).length} lines, session ${f.session_s ?? '?'} s, fresh ${f.fresh}`);
}
