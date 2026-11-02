// Makes the FLUX start frames for the animated scenes of a spec (the same FLUX.1-schnell as the daily
// renderer, through the shyam-premi-media Worker), so image-to-video keeps the channel's look:
//   node animate/gen-images.mjs animate/scenes.json [--variants 2] [--steps 8]
// Writes each scene's `image` path (e.g. input/0.jpg); extra variants go to input/0-v2.jpg ... so a bad
// face or hand can be swapped out by hand before animating. Existing files are kept.
// Env: MEDIA_URL, MEDIA_TOKEN (locally: %USERPROFILE%\.shyampremisk\media-token.txt).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? Number(args[i + 1]) : def; };
const specFile = path.resolve(args.find((a) => a.endsWith('.json')) || 'animate/scenes.json');
const variants = opt('--variants', 1), steps = opt('--steps', 8);
const base = path.dirname(specFile);
const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
const MEDIA_URL = process.env.MEDIA_URL || 'https://shyam-premi-media.sk9836413.workers.dev';
const TOKEN = process.env.MEDIA_TOKEN
  || fs.readFileSync(path.join(os.homedir(), '.shyampremisk', 'media-token.txt'), 'utf8').trim();

for (const [i, scene] of spec.scenes.entries()) {
  if (!scene.prompt || !scene.image) continue;
  for (let v = 1; v <= variants; v++) {
    const file = path.resolve(base, v === 1 ? scene.image : scene.image.replace(/(\.\w+)$/, `-v${v}$1`));
    if (fs.existsSync(file)) continue;
    const res = await fetch(`${MEDIA_URL}/ai/flux`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: `${scene.prompt}. ${spec.style}`, steps }),
    });
    const j = await res.json();
    if (!j.success) throw new Error(`scene ${i}: ${JSON.stringify(j.errors)}`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from(j.result.image, 'base64'));
    console.log(`scene ${i} -> ${path.relative(base, file)}`);
  }
}
