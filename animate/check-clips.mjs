// Automatic reject check for the animated clips (no human in the loop). For each clip:
//  - deity/murti scenes (scene.deity === true, or the prompt says murti/idol/deity/"darshan of"): the centre crop
//    of the first, middle and last frame is compared with the FLUX start frame (SSIM); a face that drifts fails;
//  - every clip: a frame-difference spike (flash, flicker, a jump cut) or colours that were not in the start frame
//    (a rainbow/blue streak in a warm scene) fail.
// Accepted clips get `video` set on their scene in the spec, so the renderer animates them; rejected scenes keep
// the FLUX still + zoompan. Prints one JSON line and, with --summary <file>, appends a Markdown table.
//   node animate/check-clips.mjs <scenes.json> --clips <dir> [--plan plan.json] [--stills dir] [--summary file] [--dry-run]
// Thresholds were tuned on the 3 Nov pilot: temple, petals and murti clips pass, the aarti clip with a
// rainbow streak by the diya fails. 5 Nov retune (animate/REPORT.md section 10): the evening's two good Krishna murti
// clips were rejected - one for a slow sideways camera drift (plain centre SSIM 0.34), one for a marigold petal
// crossing the lens (a local change read as a "flicker"). Now the face check searches the camera move (zoom 0.9-1.2x,
// shift up to 12%) before comparing, and a frame-difference spike only counts when it covers >= 25% of the frame
// (a cut or a flash does; a petal, a flame or smoke does not).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const FF = process.env.FFMPEG_PATH || 'E:/tools/ffmpeg/bin/ffmpeg.exe';
const S = 128; // analysis size
const LIMITS = { ssim: 0.6, spike: 6, spikeCover: 0.25, newColour: 0.002 };

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
// Bilinear grey sample at a fractional position (clamped to the frame).
function graySample(f, x, y) {
  x = Math.max(0, Math.min(S - 1.001, x)); y = Math.max(0, Math.min(S - 1.001, y));
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  return gray(f, x0, y0) * (1 - fx) * (1 - fy) + gray(f, x0 + 1, y0) * fx * (1 - fy) + gray(f, x0, y0 + 1) * (1 - fx) * fy + gray(f, x0 + 1, y0 + 1) * fx * fy;
}

// SSIM of the first frame's centre against the best camera-move-aligned view of a later frame: the later frame is
// sampled at centre + (p - centre) * zoom + shift, over zoom 0.9-1.2 and shifts up to 16 px (of 128).
function ssimAligned(a, b) {
  let best = -1, at = null;
  for (const z of [0.9, 0.95, 1, 1.05, 1.1, 1.15, 1.2]) {
    for (let dy = -16; dy <= 16; dy += 4) for (let dx = -16; dx <= 16; dx += 4) {
      const v = ssimCentre(a, b, (x, y) => graySample(b, S / 2 + (x - S / 2) * z + dx, S / 2 + (y - S / 2) * z + dy));
      if (v > best) { best = v; at = [z, dx, dy]; }
    }
  }
  // refine around the best grid point
  const [z0, dx0, dy0] = at;
  for (const z of [z0 - 0.025, z0, z0 + 0.025]) for (const dy of [dy0 - 2, dy0, dy0 + 2]) for (const dx of [dx0 - 2, dx0, dx0 + 2]) {
    const v = ssimCentre(a, b, (x, y) => graySample(b, S / 2 + (x - S / 2) * z + dx, S / 2 + (y - S / 2) * z + dy));
    if (v > best) best = v;
  }
  return best;
}

// Mean SSIM over 8x8 windows of the central half of the frame (where the face/murti is), on a 2x2-averaged
// copy so a slow camera push-in barely counts while a changed face or eyes still do.
function ssimCentre(a, b, sampleB) {
  const n0 = S / 4, size = S / 4; // central 64x64 -> 32x32
  const small = (g) => Float64Array.from({ length: size * size }, (_, k) => {
    const x = n0 + 2 * (k % size), y = n0 + 2 * Math.floor(k / size);
    return (g(x, y) + g(x + 1, y) + g(x, y + 1) + g(x + 1, y + 1)) / 4;
  });
  const A = small((x, y) => gray(a, x, y)), B = small(sampleB || ((x, y) => gray(b, x, y))), C1 = 6.5025, C2 = 58.5225;
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
  const diffs = [], cover = [];
  for (let t = 1; t < fr.length; t++) {
    let d = 0, c = 0;
    for (let p = 0; p < fr[t].length; p += 3) {
      const e = Math.abs(fr[t][p] - fr[t - 1][p]) + Math.abs(fr[t][p + 1] - fr[t - 1][p + 1]) + Math.abs(fr[t][p + 2] - fr[t - 1][p + 2]);
      d += e;
      if (e > 60) c++;
    }
    diffs.push(d / fr[t].length);
    cover.push(c / (S * S));
  }
  const med = [...diffs].sort((a, b) => a - b)[Math.floor(diffs.length / 2)] || 0;
  // The worst transition that changes a large part of the frame at once (cut / flash), as a multiple of the median.
  const ratios = diffs.map((d) => d / (med + 0.5));
  const spike = Math.max(0, ...ratios.filter((_, k) => cover[k] >= LIMITS.spikeCover));
  const spikeLocal = Math.max(...ratios);
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
  const ssim = deity ? Math.min(...[fr[Math.floor(fr.length / 2)], fr[fr.length - 1]].map((f) => ssimAligned(fr[0], f))) : null;
  const why = [];
  if (deity && ssim < LIMITS.ssim) why.push(`face drift (SSIM ${ssim.toFixed(2)} < ${LIMITS.ssim})`);
  if (spike > LIMITS.spike) why.push(`flicker/jump (diff spike ${spike.toFixed(1)}x > ${LIMITS.spike}x)`);
  if (newColour > LIMITS.newColour) why.push(`colour streak (${(newColour * 100).toFixed(2)}% new-colour pixels > ${LIMITS.newColour * 100}%)`);
  return { frames: fr.length, deity, ssim: ssim && +ssim.toFixed(3), spike: +spike.toFixed(2), spikeLocal: +spikeLocal.toFixed(2), newColour: +newColour.toFixed(4), ok: why.length === 0, why };
}

const isDeity = (s) => process.env.CHECK_ALL_DEITY === '1' || s.deity === true || /\b(murti|idol|deity|darshan of)\b/i.test(s.prompt || '');
const results = [];
for (const [i, scene] of spec.scenes.entries()) {
  if (scene.endcard) continue;
  const clip = scene.clip ? path.resolve(base, scene.clip) : path.join(clipsDir, `${i}.mp4`);
  if (!fs.existsSync(clip)) continue;
  // The kernel's own start frame (FLUX on Kaggle, upscaled into --stills) when there is one, else the plan's image.
  const own = opt('--stills') && path.join(path.resolve(opt('--stills')), `${i}.jpg`);
  const img = (own && fs.existsSync(own) && own) || plan?.scenes?.find((p) => p.i === i)?.image || (scene.image && path.resolve(base, scene.image));
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
