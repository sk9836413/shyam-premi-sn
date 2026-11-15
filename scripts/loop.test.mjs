// node --test scripts/loop.test.mjs  (bhajan loop / veer Shorts: QA-passed bhajans only, variety, rotation)
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSpec, checkLoopSpec, chorusWindows, LOOP_SECONDS, passedBhajans, pickLoop, VEER_SECONDS } from './loop.mjs';
import { dawnUploads, planDay } from './day-plan.mjs';

const bhajans = passedBhajans('.');

test('only bhajans that passed the existing QA gate (all names right, CER <= 0.40); the Khatu owner take is out', () => {
  assert.ok(bhajans.length >= 3);
  assert.ok(bhajans.every((b) => b.deity !== 'khatu'), 'no Khatu bhajan has passed the name gate yet');
  assert.ok(!bhajans.some((b) => b.id === 'bhajan-khatu-haare-ka-sahara-owner'));
});

test('chorus windows: 12-15 s for a loop, 30-40 s for veer, each starting on a written chorus line', () => {
  for (const b of bhajans.filter((x) => !x.festival)) {
    for (const w of chorusWindows(b, LOOP_SECONDS)) {
      assert.ok(w.dur >= 12 && w.dur <= 15, `${b.id} ${w.dur}`);
      assert.ok(b.lyrics.includes(w.line));
    }
    for (const w of chorusWindows(b, VEER_SECONDS)) assert.ok(w.dur >= 30 && w.dur <= 40);
  }
});

test('rotation picks: Monday veer Mahakal, Wednesday loop, Saturday veer Hanuman (library bed: no Hanuman bhajan passed)', () => {
  const mon = pickLoop('2026-11-23', { bhajans });
  assert.equal(mon.kind, 'veer');
  assert.equal(mon.deity, 'shiv');
  const wed = pickLoop('2026-11-25', { bhajans });
  assert.equal(wed.kind, 'loop');
  assert.ok(wed.bhajan && wed.window.dur >= 12 && wed.window.dur <= 15);
  const sat = pickLoop('2026-11-28', { bhajans });
  assert.equal(sat.kind, 'veer');
  assert.equal(sat.deity, 'hanuman');
  assert.equal(pickLoop('2026-11-24', { bhajans }), null, 'Tuesday keeps the day status Short');
});

test('variety: the same bhajan at most once in 3 days, a different chorus window than its last use, a new artwork', () => {
  const a = pickLoop('2026-11-25', { bhajans, kind: 'loop' });
  const h1 = [{ date: '2026-11-24', kind: 'loop', bhajan: a.bhajan.id, from: a.window.from, seed: a.seed }];
  const b = pickLoop('2026-11-25', { bhajans, kind: 'loop', history: h1 });
  assert.notEqual(b.bhajan.id, a.bhajan.id, 'used yesterday: another bhajan');
  const h2 = [{ date: '2026-11-20', kind: 'loop', bhajan: a.bhajan.id, from: a.window.from, seed: 1 }];
  const c = pickLoop('2026-11-25', { bhajans, kind: 'loop', deity: a.bhajan.deity, history: h2 });
  assert.ok(c.bhajan.id !== a.bhajan.id || c.window.from !== a.window.from, 'a different chorus window');
  const spec = buildSpec('2026-11-25', a);
  assert.deepEqual(checkLoopSpec(spec, { history: [] }), []);
  assert.ok(checkLoopSpec(spec, { history: [{ date: '2026-11-24', slug: 'x', bhajan: a.bhajan.id, from: 0, seed: 1 }] }).some((e) => /3 days/.test(e)));
});

test('spec rules: titles, disclosure, Hanuman never bearded, Khatu = sheesh only', () => {
  const v = buildSpec('2026-11-28', pickLoop('2026-11-28', { bhajans }), { bed: { id: 'bed', file: 'x.ogg', licence: 'CC0 1.0', title: 'bed' } });
  assert.match(v.youtube_title, /^जय बजरंगबली 🙏 #hanuman #bhakti$/);
  assert.match(v.scenes[0].prompt, /no beard/);
  assert.match(v.youtube_description, /Sangeet:/);
  assert.deepEqual(checkLoopSpec(v), []);
  const bad = JSON.parse(JSON.stringify(v));
  bad.scenes[0].prompt = 'Lord Hanuman heroic close-up with a mace, no text';
  assert.ok(checkLoopSpec(bad).some((e) => /no beard/.test(e)));
  const l = buildSpec('2026-11-25', pickLoop('2026-11-25', { bhajans }));
  assert.match(l.youtube_title, / 🙏 .*#bhaktisong #भक्तिभाव #shorts$/);
  assert.match(l.youtube_description, /AI द्वारा गाया गया/);
  bad.scenes[0].prompt = 'Khatu Shyam baba full body with a flute, no text';
  assert.ok(checkLoopSpec(bad).some((e) => /sheesh/.test(e)));
});

test('day plan: the morning slot alternates with loop / veer on normal days only, public at dawn', () => {
  const inputs = { loops: true, festivals: new Map(), placements: [] };
  const mon = planDay('2026-11-23', inputs).uploads.find((u) => u.slot === 'morning');
  assert.equal(mon.kind, 'veer');
  assert.equal(mon.at, '05:45');
  assert.equal(planDay('2026-11-24', inputs).uploads.find((u) => u.slot === 'morning').kind, 'daystatus');
  const fest = { ...inputs, festivals: new Map([['2026-11-23', { name: 'X Vrat', tier: 'status', key: 'x', theme: 'x' }]]) };
  assert.notEqual(planDay('2026-11-23', fest).uploads.find((u) => u.slot === 'morning').kind, 'veer', 'festival days keep their morning Short');
  assert.equal(planDay('2026-11-23', { festivals: new Map(), placements: [] }).uploads.find((u) => u.slot === 'morning').kind, 'daystatus', 'off unless loadInputs turns it on');
  assert.deepEqual(dawnUploads('2026-11-23', inputs).loops, [{ day: '2026-11-23', slot: 'morning', kind: 'veer' }]);
  assert.equal(dawnUploads('2026-11-23', inputs, '2026-11-23 | morning | x |').loops, undefined);
});
