// node --test scripts/stats-now.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, isDate, mdTable, pick, SECTIONS } from './stats-now.mjs';

test('mdTable escapes and aligns', () => {
  const t = mdTable(['Name', 'Views'], [['a|b', 5]]).split('\n');
  assert.equal(t[1], '| --- | ---: |');
  assert.equal(t[2], '| a\\|b | 5 |');
  assert.match(mdTable(['A'], []), /no rows/);
});

test('dates', () => {
  assert.ok(isDate('2026-11-24'));
  assert.ok(!isDate('2026-11-24;x'));
  assert.equal(addDays('2026-12-01', -1), '2026-11-30');
});

test('pick', () => {
  assert.deepEqual(pick('all'), SECTIONS);
  assert.deepEqual(pick('social'), ['social']);
  assert.throws(() => pick('website'));
});
