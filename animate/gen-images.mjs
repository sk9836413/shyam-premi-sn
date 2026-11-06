// Makes the FLUX start frames for the animated scenes of a pilot spec, so image-to-video keeps the channel's look:
//   node animate/gen-images.mjs animate/scenes.json [--variants 2] [--workers-ai]
// Writes each scene's `image` path (e.g. input/0.jpg); extra variants go to input/0-v2.jpg ... so a bad
// face or hand can be swapped out by hand before animating. Existing files are kept.
// Neuron budget (6 Nov 2026): pilots and experiments make their pictures on the Kaggle GPU (FLUX.1-schnell, private kernel
// sps-frames-pilot, animate/frames.mjs), never with Workers AI, whose 10,000 free daily neurons belong to the scheduled
// Shorts / status / long videos. --workers-ai is only for a one-off the owner asked for.
// Env: KAGGLE_CLI / ~/.kaggle (Kaggle), or MEDIA_URL + MEDIA_TOKEN with --workers-ai.
import fs from 'node:fs';
import path from 'node:path';
import { ensureImages, iconography } from './frames.mjs';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? Number(args[i + 1]) : def; };
const specFile = path.resolve(args.find((a) => a.endsWith('.json')) || 'animate/scenes.json');
const variants = opt('--variants', 1);
const base = path.dirname(specFile);
const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));

const jobs = [];
for (const [i, scene] of spec.scenes.entries()) {
  if (!scene.prompt || !scene.image) continue;
  for (let v = 1; v <= variants; v++) {
    const out = path.resolve(base, v === 1 ? scene.image : scene.image.replace(/(\.\w+)$/, `-v${v}$1`));
    jobs.push({ id: `s${i}v${v}`, out, prompt: `${iconography(scene.prompt)}. ${spec.style}`, seed: (scene.seed || 42) + v - 1 });
  }
}
const ledger = await ensureImages(jobs, { kaggleFirst: !args.includes('--workers-ai'), slot: 'pilot', waitMin: 60 });
console.log(JSON.stringify(ledger));
