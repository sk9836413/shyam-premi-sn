// scripts/day-plan.mjs: the 3-a-day plan by priority (status Shorts first; owner, 11 Nov 2026) and the Kalyug ke
// Bhagwan days. Run: node --test scripts/day-plan.test.mjs
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { decide } from './upload-guard.mjs';
import { CAP, addDays, isPlanned, loadInputs, planDay } from './day-plan.mjs';
import { placements } from './status-engine.mjs';

const fest = (date, key, tier = 'status', theme = 'ekadashi', extra = {}) => ({
  date, key, tier, theme, label: key, names: [{ en: `${key} a`, hi: 'क' }, { en: `${key} b`, hi: 'ख' }, { en: `${key} c`, hi: 'ग' }], sources: [], ...extra,
});
const synth = (list, o = {}) => ({
  festivals: new Map(list.map((f) => [f.date, { name: f.label, tier: f.tier, key: f.key, theme: f.theme }])),
  placements: placements(list), movies: new Map([['2026-11-17', 'k part 1']]), kalyug: true, kalyugLogged: new Set(), ...o,
});
const slots = (p) => p.uploads.map((u) => u.slot);

describe('cap and priority', () => {
  test(`never more than ${CAP} uploads on any day of the real calendar (11 Nov 2026 - 31 Jan 2027), KALYUG on`, () => {
    const prev = process.env.KALYUG;
    process.env.KALYUG = 'on';
    const inputs = loadInputs('.');
    process.env.KALYUG = prev;
    for (let d = '2026-11-11'; d <= '2027-01-31'; d = addDays(d, 1)) {
      const p = planDay(d, inputs);
      assert.ok(p.uploads.length <= CAP, `${d}: ${slots(p)}`);
      assert.equal(new Set(slots(p)).size, p.uploads.length, `${d}: a slot twice`);
    }
  });
  test('normal days: Mon day status + long + temple; Tue kalyug + day status + temple; Wed + noon; Sun 2', () => {
    const i = synth([]);
    assert.deepEqual(slots(planDay('2026-11-30', i)), ['morning', 'long', 'evening']);
    assert.equal(planDay('2026-11-30', i).uploads[0].kind, 'daystatus');
    assert.deepEqual(slots(planDay('2026-12-01', i)), ['kalyug', 'morning', 'evening']);
    assert.deepEqual(slots(planDay('2026-12-02', i)), ['morning', 'noon', 'evening']);
    assert.deepEqual(slots(planDay('2026-12-06', i)), ['morning', 'evening']);
  });
  test('status Shorts push out kalyug, long and noon, never the movie', () => {
    const i = synth([fest('2026-12-02', 'x'), fest('2026-11-18', 'y')]);
    assert.deepEqual(slots(planDay('2026-12-01', i)), ['morning', 'evening', 'eve']);
    assert.deepEqual(planDay('2026-12-01', i).dropped, ['kalyug']);
    assert.deepEqual(slots(planDay('2026-12-02', i)), ['status', 'morning', 'evening']);
    assert.deepEqual(slots(planDay('2026-11-17', i)), ['movie', 'evening', 'eve']);
  });
  test('two status Shorts on a day: the evening temple Short makes way', () => {
    const i = synth([fest('2026-12-07', 'shivratri'), fest('2026-12-08', 'amavasya', 'status', 'amavasya')]);
    assert.deepEqual(slots(planDay('2026-12-07', i)), ['status', 'morning', 'eve']);
    assert.deepEqual(planDay('2026-12-07', i).dropped, ['evening']);
  });
  test('big festival: 00:30 + 08:30 variants replace the morning Short; the evening before gets one too', () => {
    const i = synth([fest('2026-11-24', 'dev-deepawali', 'big', 'devdeepawali')]);
    assert.deepEqual(slots(planDay('2026-11-24', i)), ['status', 'statusday', 'evening']);
    assert.deepEqual(slots(planDay('2026-11-23', i)), ['morning', 'evening', 'eve']);
  });
  test('an already scheduled kalyug episode always counts', () => {
    const i = synth([fest('2026-12-02', 'x')], { kalyug: false, kalyugLogged: new Set(['2026-12-01']) });
    assert.deepEqual(slots(planDay('2026-12-01', i)), ['kalyug', 'morning', 'eve']);
  });
});

describe('festival dates (automation/festivals.json)', () => {
  const inputs = loadInputs('.');
  const on = (d) => planDay(d, inputs).uploads;
  const has = (d, slot, key) => on(d).some((u) => u.slot === slot && u.festival === key);
  test('Janmotsav week 17-20 Nov 2026: movie at 07:00 every day + 4 Janmotsav status variants', () => {
    for (const d of ['2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20']) assert.ok(on(d).some((u) => u.slot === 'movie' && u.at === '07:00'), d);
    assert.ok(has('2026-11-18', 'eve', 'khatu-shyam-janmotsav'));
    assert.ok(has('2026-11-19', 'eve', 'khatu-shyam-janmotsav'));
    assert.deepEqual(on('2026-11-20').map((u) => `${u.slot} ${u.at}`), ['status 00:30', 'movie 07:00', 'statusday 08:30']);
    assert.ok(has('2026-11-20', 'status', 'khatu-shyam-janmotsav') && has('2026-11-20', 'statusday', 'khatu-shyam-janmotsav'));
  });
  test('verified dates pick the right days (00:30 on the day, 20:00 the evening before)', () => {
    for (const [d, key] of [['2026-11-24', 'dev-deepawali'], ['2026-12-04', 'utpanna-ekadashi'], ['2026-12-20', 'gita-jayanti'],
      ['2026-12-14', 'vivah-panchami'], ['2027-01-14', 'lohri'], ['2027-01-15', 'makar-sankranti'], ['2027-01-25', 'sakat-chauth']]) {
      assert.ok(has(d, 'status', key), `${d} ${key} at 00:30`);
      assert.ok(has(addDays(d, -1), 'eve', key), `${key} the evening before`);
    }
    assert.ok(has('2027-01-15', 'statusday', 'makar-sankranti'));
    assert.ok(has('2026-11-24', 'statusday', 'dev-deepawali'));
    assert.ok(!on('2027-01-31').some((u) => u.kind === 'status'));
  });
  test('Ekadashi mornings are the Gyaras Khatu Shyam status; other festival mornings a temple darshan', () => {
    const m = (d) => on(d).find((u) => u.slot === 'morning');
    assert.equal(m('2026-12-04').theme, 'gyaras');
    assert.equal(m('2026-12-14').kind, 'temple');
    assert.equal(m('2026-11-12').theme, 4);
  });
});

describe('kalyug days', () => {
  test('off: Thursday has no episode', () => assert.ok(!slots(planDay('2026-12-03', synth([], { kalyug: false }))).includes('kalyug')));
  test('festival and movie days keep their content', () => {
    const i = synth([fest('2026-12-03', 'x')]);
    assert.ok(!slots(planDay('2026-12-03', i)).includes('kalyug'));
    assert.ok(!slots(planDay('2026-11-17', i)).includes('kalyug'));
  });
  test('the morning slot is its own upload beside the episode', () => {
    assert.equal(isPlanned('2026-12-03', 'morning', synth([])).planned, true);
    assert.equal(isPlanned('2026-12-03', 'kalyug', synth([])).planned, true);
  });
  test('a capped slot says why', () => {
    const r = isPlanned('2026-12-01', 'kalyug', synth([fest('2026-12-02', 'x')]));
    assert.equal(r.planned, false);
    assert.match(r.why, /cap/);
  });
  test('cap: the episode and its repeated morning line count once', () => {
    const log = '2026-11-12 | kalyug | 2026-11-12-kalyug-x | Bal Ganesh | s\n2026-11-12 | morning | 2026-11-12-kalyug-x | Bal Ganesh | s\n';
    assert.equal(decide({ day: '2026-11-12', slot: 'evening', slug: '2026-11-12-evening-y', run: '1.1', log }).go, true);
  });
});
