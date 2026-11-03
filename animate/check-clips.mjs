// Automatic reject check for the animated clips (no human in the loop). For each clip:
//  - deity/murti scenes (scene.deity === true, or the prompt says murti/idol/deity/"darshan of"): the centre crop
//    of the first, middle and last frame is compared with the FLUX start frame (SSIM); a face that drifts fails;
//  - every clip: a frame-difference spike (flash, flicker, a jump cut) or colours that were not in the start frame
//    (a rainbow/blue streak in a warm scene) fail.
// Accepted clips get `video` set on their scene in the spec, so the renderer animates them; rejected scenes keep
// the FLUX still + zoompan. Prints one JSON line and, with --summary <file>, appends a Markdown table.
//   node animate/check-clips.mjs <scenes.json> --clips <dir> [--plan plan.json] [--summary file] [--dry-run]
// Thresholds were tuned on the 3 Nov pilot: temple, petals and murti clips pass, the aarti clip with a
// rainbow streak by the diya fails.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const FF = process.env.FFMPEG_PATH || 'E:/tools/ffmpeg/bin/ffmpeg.exe';
const S = 128; // analysis size
const LIMITS = { ssim: 0.6, spike: 6, newColour: 0.002 };

const args = process.argv.slice(2);
const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const specFile = path.resolve(args[0]);
const base = path.dirname(specFile);
const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
const clipsDir = path.resolve(opt('--clips') || path.join(base, 'clips'));
const plan = opt('--plan') ? JSON.parse(fs.readFileSync(opt('--plan'), 'utf8')) : null;

function frames(file, fps) {
  const r = spawnSync(FF, ['-v', 'error', '-i', file, ...(fps ? ['-vf', `fps=${fps},scale=${S}:${S}`] : ['-frames:v', '1', '-vf', `scale=${S}:${S}`]),
    '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`ffmpeg ${file}: ${r.stderr}`);
  const n = S * S * 3, out = [];
  for (let o = 0; o + n <= r.stdout.length; o += n) out.push(r.stdout.subarray(o, o + n));
  return out;
}

const gray = (f, x, y) => { const i = (y * S + x) * 3; return 0.299 * f[i] + 0.587 * f[i + 1] + 0.114 * f[i + 2]; };

// Mean SSIM over 8x8 windows of the central half of the frame (where the face/murti is), on a 2x2-averaged
// copy so a slow camera push-in barely counts while a changed face or eyes still do.
function ssimCentre(a, b) {
  const n0 = S / 4, size = S / 4; // central 64x64 -> 32x32
  const small = (f) => Float64Array.from({ length: size * size }, (_, k) => {
    const x = n0 + 2 * (k % size), y = n0 + 2 * Math.floor(k / size);
    return (gray(f, x, y) + gray(f, x + 1, y) + gray(f, x, y + 1) + gray(f, x + 1, y + 1)) / 4;
  });
  const A = small(a), B = small(b), C1 = 6.5025, C2 = 58.5225;
  let sum = 0, n = 0;
  for (let y = 0; y < size; y += 8) for (let x = 0; x < size; x += 8) {
    let ma = 0, mb = 0, va = 0, vb = 0, cov = 0;
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { ma += A[(y + j) * size + x + i]; mb += B[(y + j) * size + x + i]; }
    ma /= 64; mb /= 64;
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
      const da = A[(y + j) * size + x + i] - ma, db = B[(y + j) * size + x + i] - mb;
      va += da * da; vb += db * db; cov += da * db;
    }
    va /= 63; vb /= 63; cov /= 63;
    sum += ((2 * ma * mb + C1) * (2 * cov + C2)) / ((ma * ma + mb * mb + C1) * (va + vb + C2)); n++;
  }
  return sum / n;
}

// Hue bin (12 bins of 30 degrees) of a coloured, not-dark pixel, else -1.
function hueBin(f, p) {
  const r = f[p] / 255, g = f[p + 1] / 255, b = f[p + 2] / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (mx < 0.25 || d / mx < 0.2) return -1;
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return Math.floor((((h * 60) + 360) % 360) / 30);
}

function hist(f) {
  const h = new Array(12).fill(0);
  for (let p = 0; p < f.length; p += 3) { const k = hueBin(f, p); if (k >= 0) h[k]++; }
  return h;
}

function analyse(clip, start, deity) {
  const fr = frames(clip, 8);
  const diffs = [];
  for (let t = 1; t < fr.length; t++) {
    let d = 0;
    for (let i = 0; i < fr[t].length; i++) d += Math.abs(fr[t][i] - fr[t - 1][i]);
    diffs.push(d / fr[t].length);
  }
  const med = [...diffs].sort((a, b) => a - b)[Math.floor(diffs.length / 2)] || 0;
  const spike = Math.max(...diffs) / (med + 0.5);
  // New colours: pixels whose hue family (the bin and both neighbours) is absent from the start frame and the
  // clip's first frame, e.g. a cyan/blue streak appearing in a warm orange aarti scene.
  const h0 = hist(start), h1 = hist(fr[0]);
  const ref = h0.map((v, k) => v + h1[k]);
  const absent = (k) => ref[(k + 11) % 12] + ref[k] + ref[(k + 1) % 12] < 0.0005 * 2 * S * S;
  let newColour = 0;
  for (const f of fr) {
    const h = hist(f);
    newColour = Math.max(newColour, h.reduce((a, v, k) => a + (absent(k) ? v : 0), 0) / (S * S));
  }
  // Drift: SSIM of the centre (face) against the clip's own first frame, which image-to-video keeps equal to
  // the start image, at the middle and the end of the clip.
  const ssim = deity ? Math.min(...[fr[Math.floor(fr.length / 2)], fr[fr.length - 1]].map((f) => ssimCentre(fr[0], f))) : null;
  const why = [];
  if (deity && ssim < LIMITS.ssim) why.push(`face drift (SSIM ${ssim.toFixed(2)} < ${LIMITS.ssim})`);
  if (spike > LIMITS.spike) why.push(`flicker/jump (diff spike ${spike.toFixed(1)}x > ${LIMITS.spike}x)`);
  if (newColour > LIMITS.newColour) why.push(`colour streak (${(newColour * 100).toFixed(2)}% new-colour pixels > ${LIMITS.newColour * 100}%)`);
  return { frames: fr.length, deity, ssim: ssim && +ssim.toFixed(3), spike: +spike.toFixed(2), newColour: +newColour.toFixed(4), ok: why.length === 0, why };
}

const isDeity = (s) => process.env.CHECK_ALL_DEITY === '1' || s.deity === true || /\b(murti|idol|deity|darshan of)\b/i.test(s.prompt || '');
const results = [];
for (const [i, scene] of spec.scenes.entries()) {
  if (scene.endcard) continue;
  const clip = scene.clip ? path.resolve(base, scene.clip) : path.join(clipsDir, `${i}.mp4`);
  if (!fs.existsSync(clip)) continue;
  const img = plan?.scenes?.find((p) => p.i === i)?.image || (scene.image && path.resolve(base, scene.image));
  try {
    const r = analyse(clip, frames(img)[0], isDeity(scene));
    results.push({ scene: i, clip: path.relative(base, clip).replace(/\\/g, '/'), ...r });
    if (r.ok) scene.video = path.relative(base, clip).replace(/\\/g, '/');
    else delete scene.video;
  } catch (e) {
    results.push({ scene: i, ok: false, why: [`check failed: ${e.message.split('\n')[0]}`] });
    delete scene.video;
  }
}
if (!args.includes('--dry-run')) fs.writeFileSync(specFile, `${JSON.stringify(spec, null, 2)}\n`);
if (opt('--summary')) {
  fs.appendFileSync(opt('--summary'), ['### Animated clips (automatic check)', '', '| Scene | Result | SSIM (deity) | Diff spike | New colour | Why |', '|---|---|---|---|---|---|',
    ...results.map((r) => `| ${r.scene} | ${r.ok ? 'animated' : 'REJECTED -> zoompan'} | ${r.ssim ?? '-'} | ${r.spike ?? '-'} | ${r.newColour ?? '-'} | ${(r.why || []).join('; ') || '-'} |`), ''].join('\n') + '\n');
}
console.log(JSON.stringify({ accepted: results.filter((r) => r.ok).length, rejected: results.filter((r) => !r.ok).length, results }));
