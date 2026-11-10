// Builds music/library/cc-*.ogg (+ .licence.json) from the CC0 / public-domain recordings in music/sources.json and the
// arrangements in music/recipes.json. Sources are fetched from their official URLs into a cache outside the repo and
// must match the sha256 recorded when the licence was checked (a changed file is refused). Only needed when sources or
// recipes change: the built library is committed (CC0/PD allow redistribution), so CI never downloads anything.
//   node music/build-library.mjs [--only <id>] [--cache <dir>]
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LIBRARY, normaliseLoudness, sha256, validateLicence } from './engine.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const cache = path.resolve(opt('--cache', path.join(os.tmpdir(), 'sps-music-cache')));
const { sources } = JSON.parse(fs.readFileSync(path.join(DIR, 'sources.json'), 'utf8'));
const { tracks } = JSON.parse(fs.readFileSync(path.join(DIR, 'recipes.json'), 'utf8'));
const byId = Object.fromEntries(sources.map((s) => [s.id, s]));

async function source(id) {
  const s = byId[id];
  if (!s) throw new Error(`unknown source ${id}`);
  const file = path.join(cache, `${id}${path.extname(new URL(s.download_url).pathname) || '.mp3'}`);
  if (!fs.existsSync(file) || sha256(file) !== s.sha256) {
    fs.mkdirSync(cache, { recursive: true });
    const res = await fetch(s.download_url, { headers: { 'User-Agent': 'shyam-premi-sn music library (sk9836413@gmail.com)' } });
    if (!res.ok) throw new Error(`${id}: HTTP ${res.status}`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  if (sha256(file) !== s.sha256) throw new Error(`${id}: sha256 mismatch, the source file changed since its licence was checked`);
  return file;
}

async function build(t) {
  const ins = [], f = [];
  for (const [k, l] of t.layers.entries()) {
    const file = await source(l.src);
    ins.push(...(l.loop ? ['-stream_loop', '-1'] : []), '-ss', String(l.start || 0), ...(l.loop ? [] : ['-t', String(l.dur)]), '-i', file);
    const delay = Math.round((l.delay || 0) * 1000);
    f.push(`[${k}:a]aresample=48000,aformat=sample_rates=48000:channel_layouts=stereo${l.loop ? `,atrim=duration=${t.length}` : ''},afade=t=in:d=0.3,volume=${l.gain || 0}dB${delay ? `,adelay=${delay}|${delay}` : ''}[l${k}]`);
  }
  f.push(`${t.layers.map((_, k) => `[l${k}]`).join('')}amix=inputs=${t.layers.length}:duration=longest:normalize=0,atrim=duration=${t.length},alimiter=limit=0.95[a]`);
  const tmp = path.join(cache, `${t.id}.wav`);
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...ins, '-filter_complex', f.join(';'), '-map', '[a]', '-t', String(t.length), tmp], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`${t.id}: ${r.stderr}`);
  const out = path.join(LIBRARY, `${t.id}.ogg`);
  normaliseLoudness(tmp, out, { fadeIn: 1, fadeOut: 2.5 });
  fs.rmSync(tmp, { force: true });
  const comps = [...new Set(t.layers.map((l) => l.src))].map((id) => {
    const s = byId[id];
    return { id, title: s.title, author: s.author, platform: s.platform, source_url: s.source_url, download_url: s.download_url, licence: s.licence,
      licence_url: s.licence_url, sha256: s.sha256, evidence: s.evidence, checked: s.checked,
      used: t.layers.filter((l) => l.src === id).map((l) => ({ start: l.start || 0, seconds: l.dur, loop: !!l.loop })) };
  });
  const single = comps.length === 1 && t.layers.length === 1;
  const lic = {
    id: t.id, title: t.title, moods: t.moods, kind: 'instrumental', source: single ? 'cc0-excerpt' : 'cc0-arrangement',
    licence: single ? `${comps[0].licence.startsWith('Public Domain') ? 'Public Domain Dedication' : 'CC0 1.0'} (excerpt, loudness-normalised; ${comps[0].platform})`
      : 'original arrangement of CC0 / public-domain-dedicated recordings (Shyam Premi SN, music/build-library.mjs)',
    licence_url: comps[0].licence_url, components: comps, attribution: null, redistributable: true,
    content_id: 'performer-uploaded CC0/PD recordings; not label releases', checked: comps.map((c) => c.checked).sort().pop(), sha256: sha256(out),
  };
  const problems = validateLicence(lic, out);
  if (problems.length) throw new Error(`${t.id}: ${problems.join('; ')}`);
  fs.writeFileSync(path.join(LIBRARY, `${t.id}.licence.json`), `${JSON.stringify(lic, null, 2)}\n`);
  return lic;
}

const only = opt('--only');
for (const t of tracks.filter((x) => !only || x.id === only)) {
  const lic = await build(t);
  const kb = Math.round(fs.statSync(path.join(LIBRARY, `${t.id}.ogg`)).size / 1024);
  console.log(`${t.id}: ${t.length}s, ${kb} KB, ${lic.moods.join('/')}`);
}
