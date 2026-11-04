// FLUX.1-schnell images through the shyam-premi-media Worker (/ai/flux), for the character pilots.
//   node characters/gen-images.mjs <prompts.json> [--steps 4]
// prompts.json: { "style": "...", "images": [ { "file": "sheet/x.png", "prompt": "...", "seed": 101 } ] }
// Paths are relative to the prompts file. Existing files are kept (so re-running never spends neurons twice).
// Note: the Worker only forwards `prompt` and `steps` to Workers AI, so `seed` is recorded but NOT applied;
// the saved PNG itself is the canonical reference for every later clip.
// Token: MEDIA_TOKEN or %USERPROFILE%\.shyampremisk\media-token.txt (never printed).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const file = path.resolve(args[0]);
const steps = args.includes('--steps') ? Number(args[args.indexOf('--steps') + 1]) : 4;
const spec = JSON.parse(fs.readFileSync(file, 'utf8'));
const base = path.dirname(file);
const URL = process.env.MEDIA_URL || 'https://shyam-premi-media.sk9836413.workers.dev';
const TOKEN = process.env.MEDIA_TOKEN || fs.readFileSync(path.join(os.homedir(), '.shyampremisk', 'media-token.txt'), 'utf8').trim();
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
let made = 0;
for (const img of spec.images) {
  const out = path.resolve(base, img.file);
  if (fs.existsSync(out) || (only && !only.some((o) => img.file.includes(o)))) continue;
  const res = await fetch(`${URL}/ai/flux`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: `${img.prompt}. ${spec.style}`, steps, seed: img.seed }),
  });
  const j = await res.json().catch(() => ({ success: false, errors: [`HTTP ${res.status}`] }));
  if (!j.success) { console.error(`${img.file}: ${JSON.stringify(j.errors)}`); continue; }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(j.result.image, 'base64'));
  made++;
  console.log(`${img.file} ok`);
}
console.log(`made ${made} images (~${made * 170} neurons at ${steps} steps)`);
