// scripts/day-plan.mjs: the Kalyug ke Bhagwan days (owner, 9 Nov 2026). Run: node --test scripts/day-plan.test.mjs
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { decide } from './upload-guard.mjs';
import { isPlanned, planDay } from './day-plan.mjs';

const inputs = (o = {}) => ({ festivals: new Map([['2026-11-13', 'Chhath']]), status: new Set(), movies: new Map([['2026-11-17', 'k part 1']]),
  kalyug: true, kalyugLogged: new Set(), ...o });

describe('kalyug days', () => {
  test('off: Thursday is a normal day', () => assert.equal(planDay('2026-11-12', inputs({ kalyug: false })).type, 'normal'));
  test('on: Tue/Thu/Sat normal days get the episode instead of the morning Short (2 uploads)', () => {
    for (const d of ['2026-11-12', '2026-11-14', '2026-11-24']) {
      const p = planDay(d, inputs());
      assert.equal(p.type, 'kalyug', d);
      assert.deepEqual(p.uploads.map((u) => u.slot), ['kalyug', 'evening']);
    }
  });
  test('festival and movie days keep their content', () => {
    assert.equal(planDay('2026-11-13', inputs()).type, 'festival');
    assert.equal(planDay('2026-11-17', inputs()).type, 'movie');
  });
  test('Mon/Fri long and Wed noon are untouched', () => {
    assert.ok(planDay('2026-11-23', inputs()).uploads.some((u) => u.slot === 'long'));
    assert.ok(planDay('2026-11-25', inputs()).uploads.some((u) => u.slot === 'noon'));
  });
  test('a logged episode makes the day a kalyug day even with the variable off', () => {
    assert.equal(planDay('2026-11-12', inputs({ kalyug: false, kalyugLogged: new Set(['2026-11-12']) })).type, 'kalyug');
  });
  test('the morning slot stays allowed as the fallback when the episode failed', () => {
    assert.equal(isPlanned('2026-11-12', 'morning', inputs()).planned, true);
  });
  test('cap: the episode and its repeated morning line count once', () => {
    const log = '2026-11-12 | kalyug | 2026-11-12-kalyug-x | Bal Ganesh | s\n2026-11-12 | morning | 2026-11-12-kalyug-x | Bal Ganesh | s\n';
    assert.equal(decide({ day: '2026-11-12', slot: 'evening', slug: '2026-11-12-evening-y', run: '1.1', log }).go, true);
  });
});
