// scripts/upload-guard.mjs decisions (no git, no network). Run: node --test scripts/upload-guard.test.mjs
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { claimLine, decide } from './upload-guard.mjs';

const NOW = Date.parse('2026-11-07T13:17:05Z');
const base = { day: '2026-11-08', slot: 'status', slug: '2026-11-08-status-diwali', run: '42376221296.1', now: NOW };

describe('decide', () => {
  test('nothing yet: go', () => assert.equal(decide(base).go, true));
  test('slot already in log.md', () => {
    const log = '2026-11-08 | status | 2026-11-08-status-diwali | Diwali | WhatsApp status Short\n';
    assert.equal(decide({ ...base, log }).go, false);
    assert.equal(decide({ ...base, log: '2026-11-08 | morning | x | y | z\n' }).go, true);
  });
  test('slug already on YouTube in published.md', () => {
    const pub = '- 2026-11-08-status-diwali | youtube: https://youtube.com/shorts/cxLIaA38kKE (public at …)\n';
    assert.equal(decide({ ...base, pub }).go, false);
  });
  test('the 7 Nov race: the schedule run claimed first, the dispatch run must skip', () => {
    const pub = `${claimLine({ ...base, run: '42375969316.1', now: NOW - 60e3 })}\n`;
    const d = decide({ ...base, pub });
    assert.equal(d.go, false);
    assert.match(d.reason, /42375969316/);
  });
  test('same day+slot with another slug (Claude-written slots) also blocks', () => {
    const pub = `${claimLine({ ...base, day: '2026-11-07', slot: 'evening', slug: '2026-11-07-evening-a', run: '1.1', now: NOW - 60e3 })}\n`;
    assert.equal(decide({ ...base, slot: 'evening', slug: '2026-11-07-evening-b' }).go, true);
    assert.equal(decide({ ...base, day: '2026-11-07', slot: 'evening', slug: '2026-11-07-evening-b', pub }).go, false);
  });
  test('own claim (or an earlier attempt of the same run) does not block', () => {
    const pub = `${claimLine({ ...base, run: '42376221296.1', now: NOW - 60e3 })}\n`;
    assert.equal(decide({ ...base, run: '42376221296.2', pub }).go, true);
  });
  test('released or expired claims do not block', () => {
    const c = claimLine({ ...base, run: '9.1', now: NOW - 60e3 });
    const released = `${c}\n- ${base.slug} | claim released: ${base.day} ${base.slot} by run 9.1 (upload failed)\n`;
    assert.equal(decide({ ...base, pub: released }).go, true);
    assert.equal(decide({ ...base, pub: `${claimLine({ ...base, run: '9.1', now: NOW - 3 * 3600e3 })}\n` }).go, true);
  });
});
