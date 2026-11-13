// scripts/day-plan.mjs: the 3-Shorts-a-day plan by priority (status Shorts first; owner, 11 Nov 2026), the daily long
// video outside that cap (owner, 13 Nov 2026) and the Kalyug ke Bhagwan days. Run: node --test scripts/day-plan.test.mjs
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { decide } from './upload-guard.mjs';
import { CAP, LONG_CAP, addDays, festTokens, isPlanned, istToday, loadInputs, longSubject, planDay } from './day-plan.mjs';
import { placements } from './status-engine.mjs';

const fest = (date, key, tier = 'status', theme = 'ekadashi', extra = {}) => ({
  date, key, tier, theme, label: key, names: [{ en: `${key} a`, hi: 'क' }, { en: `${key} b`, hi: 'ख' }, { en: `${key} c`, hi: 'ग' }], sources: [], ...extra,
});
const synth = (list, o = {}) => ({
  festivals: new Map(list.map((f) => [f.date, { name: f.label, tier: f.tier, key: f.key, theme: f.theme }])),
  placements: placements(list), movies: new Map([['2026-11-17', 'k part 1']]), kalyug: true, kalyugLogged: new Set(), ...o,
});
const slots = (p) => p.uploads.map((u) => u.slot);
const shorts = (p) => p.uploads.filter((u) => u.slot !== 'long');
const realInputs = () => {
  const prev = process.env.KALYUG;
  process.env.KALYUG = 'on';
  const inputs = loadInputs('.');
  if (prev === undefined) delete process.env.KALYUG; else process.env.KALYUG = prev;
  return inputs;
};

describe('cap and priority', () => {
  test(`never more than ${CAP} Shorts + exactly ${LONG_CAP} long video on every day of the real calendar (11 Nov 2026 - 31 Jan 2027), KALYUG on`, () => {
    const inputs = realInputs();
    for (let d = '2026-11-11'; d <= '2027-01-31'; d = addDays(d, 1)) {
      const p = planDay(d, inputs);
      assert.ok(shorts(p).length <= CAP, `${d}: ${slots(p)}`);
      assert.equal(p.uploads.filter((u) => u.slot === 'long').length, LONG_CAP, `${d}: ${slots(p)}`);
      assert.equal(new Set(slots(p)).size, p.uploads.length, `${d}: a slot twice`);
      assert.ok(!p.dropped.includes('long'), `${d}: long dropped`);
    }
  });
  test('a long video at 12:30 IST on every one of the next 30 days (festival, movie and normal days alike)', () => {
    const inputs = realInputs();
    for (const from of ['2026-11-13', istToday()]) {
      for (let i = 0; i < 30; i++) {
        const d = addDays(from, i);
        const r = isPlanned(d, 'long', inputs);
        assert.equal(r.planned, true, `${d}: ${r.why}`);
        assert.equal(r.upload.at, '12:30', d);
        assert.match(r.upload.what, /long katha video/, d);
      }
    }
  });
  test('normal days: Mon day status + long + temple; Tue kalyug + day status + long + temple; Wed + noon; Sun', () => {
    const i = synth([]);
    assert.deepEqual(slots(planDay('2026-11-30', i)), ['morning', 'long', 'evening']);
    assert.equal(planDay('2026-11-30', i).uploads[0].kind, 'daystatus');
    assert.deepEqual(slots(planDay('2026-12-01', i)), ['kalyug', 'morning', 'long', 'evening']);
    assert.deepEqual(slots(planDay('2026-12-02', i)), ['morning', 'long', 'noon', 'evening']);
    assert.deepEqual(slots(planDay('2026-12-06', i)), ['morning', 'long', 'evening']);
  });
  test('status Shorts push out kalyug and noon, never the movie or the long video', () => {
    const i = synth([fest('2026-12-02', 'x'), fest('2026-11-18', 'y')]);
    assert.deepEqual(slots(planDay('2026-12-01', i)), ['morning', 'long', 'evening', 'eve']);
    assert.deepEqual(planDay('2026-12-01', i).dropped, ['kalyug']);
    assert.deepEqual(slots(planDay('2026-12-02', i)), ['status', 'morning', 'long', 'evening']);
    assert.deepEqual(slots(planDay('2026-11-17', i)), ['movie', 'long', 'evening', 'eve']);
  });
  test('two status Shorts on a day: the evening temple Short makes way', () => {
    const i = synth([fest('2026-12-07', 'shivratri'), fest('2026-12-08', 'amavasya', 'status', 'amavasya')]);
    assert.deepEqual(slots(planDay('2026-12-07', i)), ['status', 'morning', 'long', 'eve']);
    assert.deepEqual(planDay('2026-12-07', i).dropped, ['evening']);
  });
  test('big festival: 00:30 + 08:30 variants replace the morning Short; the evening before gets one too', () => {
    const i = synth([fest('2026-11-24', 'dev-deepawali', 'big', 'devdeepawali')]);
    assert.deepEqual(slots(planDay('2026-11-24', i)), ['status', 'statusday', 'long', 'evening']);
    assert.deepEqual(slots(planDay('2026-11-23', i)), ['morning', 'long', 'evening', 'eve']);
  });
  test('an already scheduled kalyug episode always counts', () => {
    const i = synth([fest('2026-12-02', 'x')], { kalyug: false, kalyugLogged: new Set(['2026-12-01']) });
    assert.deepEqual(slots(planDay('2026-12-01', i)), ['kalyug', 'morning', 'long', 'eve']);
  });
});

describe('long video subject', () => {
  const long = (d, i) => planDay(d, i).uploads.find((u) => u.slot === 'long');
  test('a festival day tells the festival katha/vidhi', () => {
    const u = long('2026-12-02', synth([fest('2026-12-02', 'kaal-bhairav-jayanti', 'status', 'bhairav')]));
    assert.equal(u.topic, 'kaal-bhairav-jayanti');
    assert.match(u.what, /kaal-bhairav-jayanti|katha or vidhi/);
  });
  test('a normal day follows STORY.md section 5 (the Mandir Itihas series)', () => {
    const u = long('2026-12-03', synth([]));
    assert.equal(u.topic, 'series');
    assert.match(u.what, /Mandir Itihas/);
  });
  test('a festival told by a long video in the last 30 days falls back to the series; 31+ days ago it is told again', () => {
    const f = [fest('2026-12-02', 'kaal-bhairav-jayanti', 'status', 'bhairav')];
    const recent = synth(f, { longs: [{ date: '2026-11-10', text: '2026-11-10-long-kaal-bhairav-jayanti-katha | kaal bhairav | ...' }] });
    assert.equal(long('2026-12-02', recent).topic, 'series');
    assert.match(long('2026-12-02', recent).what, /2026-11-10 already told it/);
    const old = synth(f, { longs: [{ date: '2026-11-01', text: '2026-11-01-long-kaal-bhairav-jayanti-katha' }] });
    assert.equal(long('2026-12-02', old).topic, 'kaal-bhairav-jayanti');
  });
  test('the same festival in another month (ravi-pradosh-nov / -dec) within 30 days is told once', () => {
    assert.deepEqual(festTokens('ravi-pradosh-nov'), ['ravi', 'pradosh']);
    const i = synth([fest('2026-11-22', 'ravi-pradosh-nov', 'status', 'pradosh'), fest('2026-12-06', 'ravi-pradosh-dec', 'status', 'pradosh')], { today: '2026-11-13' });
    assert.equal(long('2026-11-22', i).topic, 'ravi-pradosh-nov');
    assert.equal(long('2026-12-06', i).topic, 'series');
    assert.equal(longSubject('2026-12-06', i).covered, '2026-11-22');
  });
  test('movie days keep the movie part and add the long video with a different story', () => {
    const p = planDay('2026-11-17', synth([]));
    assert.deepEqual(slots(p), ['movie', 'long', 'evening']);
    assert.match(p.uploads[1].what, /not the story of the movie part/);
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
    assert.deepEqual(on('2026-11-20').map((u) => `${u.slot} ${u.at}`), ['status 00:30', 'movie 07:00', 'statusday 08:30', 'long 12:30']);
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
