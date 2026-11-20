// scripts/shyam-darshan.mjs: the owner's real Shyam Baba darshan stills win over AI pictures (owner, 20 Nov 2026).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';
import {
  KHATU_DARSHAN_PROMPT, KHATU_PLACE_CLAIM, SHEESH_LOOK, SHYAM_REAL_DIR, focusCrop, longImagesFor, realScenesFor, relStill, shyamStills, showsShyamDarshan,
} from './shyam-darshan.mjs';
import { aiDisclosure, aiLook } from './ai-disclosure.mjs';
import { checkPost, fallback, plan } from './photos.mjs';
import { fallbackImage } from '../animate/frames.mjs';

const DARSHAN = `Close-up darshan of ${SHEESH_LOOK}, with a fresh gajra of white flowers`;

describe('the real stills', () => {
  test('15-25 video stills + the photos, licence "own", honest place, never the Khatu mandir, small JPEGs', () => {
    const files = fs.readdirSync(SHYAM_REAL_DIR).filter((f) => f.endsWith('.jpg'));
    assert.ok(files.length >= 20 && files.length <= 30, `${files.length} stills`);
    for (const f of files) {
      const lic = JSON.parse(fs.readFileSync(path.join(SHYAM_REAL_DIR, f.replace(/\.jpg$/, '.licence.json')), 'utf8'));
      assert.equal(lic.source, 'own'); assert.equal(lic.licence, 'own'); assert.equal(lic.recorded_by, 'Shyam Premi SN');
      assert.equal(lic.date, '2026-11'); assert.equal(lic.ai, false);
      assert.match(lic.place, /pandal/i); assert.match(lic.place, /not the Khatu mandir/);
      assert.match(lic.attribution, /Khatu mandir nahi/);
      assert.ok(!KHATU_PLACE_CLAIM.test(lic.attribution) && !KHATU_PLACE_CLAIM.test(lic.label), f);
      assert.ok(fs.statSync(path.join(SHYAM_REAL_DIR, f)).size <= 400 * 1024, `${f} <= 400 KB`);
      assert.ok(Math.min(...lic.size) >= 1080 || lic.size[0] >= 1080, `${f} at least 1080 px wide`);
    }
    assert.ok(shyamStills().length >= 10, 'enough face stills for scenes');
    assert.ok(shyamStills({ face: false, landscape: true }).length >= 2, 'landscape stills for the long video');
  });
});

describe('which scenes get them', () => {
  test('darshan of the sheesh: yes; the katha, places and crowds: no', () => {
    assert.equal(showsShyamDarshan(DARSHAN), true);
    assert.equal(showsShyamDarshan(KHATU_DARSHAN_PROMPT), true);
    assert.equal(showsShyamDarshan('Divine darshan of Shyam Baba in a decorated sanctum with diyas'), true);
    assert.equal(showsShyamDarshan('Young warrior Barbarik with three arrows on a blue horse, before the sheesh daan'), false);
    assert.equal(showsShyamDarshan('A grand white marble Hindu temple in Khatu at night'), false);
    assert.equal(showsShyamDarshan('Devotees with nishan flags walking on the road to Khatu Shyam ji'), false);
    assert.equal(showsShyamDarshan('Bhagwan Shiv in calm meditation, a trident beside him'), false);
  });
  test('different stills on different scenes, the colour the scene asks for, none on the end card', () => {
    const spec = { slug: 's', scenes: [{ prompt: DARSHAN }, { prompt: `Darshan of ${SHEESH_LOOK}, festive red roses` }, { prompt: 'A diya on a brass thali' }, { prompt: DARSHAN, endcard: true }] };
    const m = realScenesFor(spec);
    assert.deepEqual([...m.keys()], [0, 1]);
    assert.equal(m.get(0).kind, 'safed');
    assert.equal(m.get(1).kind, 'gulab');
    assert.notEqual(m.get(0).file, m.get(1).file);
    assert.match(relStill(m.get(0)), /^footage\/shyam-baba-pandal-darshan\/.+\.jpg$/);
    assert.equal(realScenesFor({ ...spec, ai_only: true }).size, 0, 'ai_only keeps the AI pictures');
    assert.ok([...longImagesFor({ slug: 'l', images: [{ prompt: DARSHAN }] }).values()].every((s) => s.size[0] > s.size[1]));
  });
  test('the face stays in the crop', () => {
    assert.deepEqual(focusCrop({ focus: { x: 0.5, y: 0.45 } }, 1080, 1920, 1080, 1080), { x: 0, y: 324 });
    assert.deepEqual(focusCrop({ focus: { x: 0.5, y: 0.05 } }, 1080, 1920, 1080, 1080), { x: 0, y: 0 });
  });
  test('the stand-in picture of a Khatu darshan prompt is a real still before the AI bank', () => {
    const fb = fallbackImage({ slug: 'x' }, DARSHAN, 0);
    assert.equal(fb.source, 'real:shyam-baba-pandal-darshan');
    assert.equal(fb.photo.source, 'own');
  });
});

describe('disclosure and captions', () => {
  test('a scene that showed a real still is not an AI visual; AI voice / music are still disclosed', () => {
    const spec = { format: 'status', style: '3D animated devotional movie style, Pixar quality', scenes: [
      { prompt: `realistic photograph, ${DARSHAN}`, real_image: 'footage/shyam-baba-pandal-darshan/safed-shringar-01.jpg' },
      { prompt: 'realistic photograph of a diya', real_image: 'footage/shyam-baba-pandal-darshan/akhand-jyot-01.jpg' }] };
    assert.equal(aiLook(spec), 'none');
    assert.equal(aiDisclosure(spec).youtube, false);
    assert.equal(aiDisclosure({ ...spec, scenes: [...spec.scenes, { prompt: 'a realistic photograph of a temple' }] }).youtube, true, 'an AI scene left = label');
    assert.equal(aiDisclosure({ ...spec, scenes: [{ ...spec.scenes[0], tts: 'जय श्री श्याम' }] }).meta, true, 'AI voice = Meta label');
  });
  test('photo post 4: the real pandal darshan, never called the Khatu mandir', () => {
    const p = plan('2026-12-05', [4]).posts[0];
    assert.equal(p.kind, 'aarti');
    assert.equal(p.pandal, true);
    assert.equal(p.temple, 'shyam-baba-pandal-darshan');
    assert.ok(!p.bank && !p.flux, 'no AI picture');
    assert.match(p.photos[0].file, /^footage\/shyam-baba-pandal-darshan\//);
    assert.match(p.photos[0].credit, /Khatu mandir nahi/);
    const fb = fallback(p, '2026-12-05');
    assert.match(fb.caption, /asli darshan/i);
    assert.deepEqual(checkPost(fb, p), []);
    const bad = { ...fb, caption: `Khatu Dham se aaj ke live darshan 🪔\nजय श्री श्याम\n\n${fb.caption}` };
    assert.ok(checkPost(bad, p).some((e) => /pandal/.test(e)));
  });
});
