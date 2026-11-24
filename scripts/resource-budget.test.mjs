// scripts/resource-budget.mjs: the Workers AI neuron and Kaggle GPU guards for the 8-Shorts day (owner, 24 Nov 2026:
// "8 ka limit rakho daily"). Run: node --test scripts/resource-budget.test.mjs
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  BEFORE_EVENING, DAILY_RESERVE_H, EPISODE_H, EVENING_RESERVE_IMAGES, IMAGES_PER_DAY, NEURONS_PER_IMAGE, PHOTO_TOPUP_IMAGES, RESERVE_BASE_H,
  STATUS_IMAGES, WORKERS_AI_MARKER, daysToReset, gpuNeed, neuronDay, workersAiAllowance, workersAiHeld, writeWorkersAiMarker,
} from './resource-budget.mjs';
import { CAP_FROM, addDays, loadInputs, planDay } from './day-plan.mjs';
import { ensureImages } from '../animate/frames.mjs';

const IST = (date, hm) => Date.parse(`${date}T${hm}:00+05:30`);

describe('Workers AI neurons: the evening darshan keeps its share', () => {
  test('the morning-window allowances + the photo topup + a status base spec + the evening reserve fit in one day (10,000 neurons, 326 each)', () => {
    assert.equal(IMAGES_PER_DAY, 30);
    // the festival-morning darshan and the Wednesday Dadi-Chhotu never share a day (next test), so only the larger counts
    const morning = Math.max(BEFORE_EVENING.morning, BEFORE_EVENING.noon);
    const used = morning + BEFORE_EVENING.photos + BEFORE_EVENING.veo + PHOTO_TOPUP_IMAGES + STATUS_IMAGES + EVENING_RESERVE_IMAGES;
    assert.ok(used <= IMAGES_PER_DAY, `${used} images x ${NEURONS_PER_IMAGE} neurons`);
  });
  test('real calendar (KALYUG on): a festival-morning darshan and a Dadi-Chhotu noon Short are never planned the same day', () => {
    const prev = process.env.KALYUG;
    process.env.KALYUG = 'on';
    const inputs = loadInputs('.');
    if (prev === undefined) delete process.env.KALYUG; else process.env.KALYUG = prev;
    for (let d = CAP_FROM; d <= '2027-01-31'; d = addDays(d, 1)) {
      const u = planDay(d, inputs).uploads;
      assert.ok(!(u.some((x) => x.slot === 'noon') && u.some((x) => x.slot === 'morning' && x.kind === 'temple')), d);
    }
  });
  test('the neuron day is the UTC date (reset 05:30 IST)', () => {
    assert.equal(neuronDay(IST('2026-11-26', '05:40')), '2026-11-26');
    assert.equal(neuronDay(IST('2026-11-26', '04:30')), '2026-11-25');
    assert.equal(neuronDay(IST('2026-11-26', '23:50')), '2026-11-26');
  });
  test('evening darshan and festival status: never limited; before the evening darshan is made only the morning-window slots get a few', () => {
    const now = IST('2026-11-26', '09:20');
    assert.equal(workersAiAllowance('evening', { now }).max, Infinity);
    assert.equal(workersAiAllowance('status', { now }).max, Infinity);
    assert.equal(workersAiAllowance('morning', { now }).max, 6);
    assert.equal(workersAiAllowance('noon', { now }).max, 6);
    for (const s of ['facts', 'long', 'loop', 'something-new']) assert.equal(workersAiAllowance(s, { now }).max, 0, s);
    assert.match(workersAiAllowance('facts', { now }).why, /evening darshan not made yet/);
  });
  test('after the day\'s evening darshan is in log.md every slot gets its per-run ceiling (yesterday\'s line does not count)', () => {
    const now = IST('2026-11-26', '18:50');
    const log = '2026-11-26 | evening | 2026-11-26-evening-salasar | Salasar Balaji | darshan\n';
    assert.equal(workersAiAllowance('facts', { now, log }).max, 6);
    assert.equal(workersAiAllowance('long', { now, log }).max, 8);
    assert.equal(workersAiAllowance('facts', { now, log: log.replace(/2026-11-26/g, '2026-11-25') }).max, 0);
  });
  test('the marker tells the renderers to keep their hands off Workers AI today only', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rb-'));
    const now = IST('2026-11-26', '19:10');
    assert.equal(workersAiHeld(dir, now), false);
    writeWorkersAiMarker(dir, { slot: 'facts' }, now);
    assert.ok(fs.existsSync(path.join(dir, WORKERS_AI_MARKER)));
    assert.equal(workersAiHeld(dir, now), true);
    assert.equal(workersAiHeld(dir, IST('2026-11-27', '09:00')), false);
    fs.rmSync(dir, { recursive: true, force: true });
  });
  test('animate/frames.mjs ensureImages stops at the allowance and leaves the marker (no Kaggle, Workers AI mocked)', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rb-img-'));
    const env = { url: process.env.MEDIA_URL, token: process.env.MEDIA_TOKEN };
    const realFetch = globalThis.fetch;
    let calls = 0;
    process.env.MEDIA_URL = 'https://media.invalid';
    process.env.MEDIA_TOKEN = 'test';
    globalThis.fetch = async () => { calls++; return { status: 200, json: async () => ({ success: true, result: { image: Buffer.from('jpg').toString('base64') } }) }; };
    try {
      const jobs = [0, 1, 2, 3].map((i) => ({ id: String(i), out: path.join(dir, 'images', `s-${i}.jpg`), prompt: `p ${i}` }));
      const ledger = await ensureImages(jobs, { kaggle: false, allowance: 2, log: () => {} });
      assert.deepEqual([calls, ledger.workers_ai, ledger.missing], [2, 2, 2]);
      assert.ok(ledger.held >= 1);
      assert.equal(workersAiHeld(path.join(dir, 'images')), true);
    } finally {
      globalThis.fetch = realFetch;
      if (env.url === undefined) delete process.env.MEDIA_URL; else process.env.MEDIA_URL = env.url;
      if (env.token === undefined) delete process.env.MEDIA_TOKEN; else process.env.MEDIA_TOKEN = env.token;
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('Kaggle GPU: lower-priority animations keep the daily Shorts\' reserve', () => {
  const now = Date.parse('2026-11-24T13:30:00Z'); // Tue 19:00 IST; the weekly quota resets Sat 05:30 IST
  const refreshAt = '2026-11-28T00:00:00Z';
  test('days to the reset, as story/kalyug.py counts them (and the same 2.4 h a day + 1 h reserve)', () => {
    assert.equal(daysToReset(refreshAt, now), 4);
    assert.equal(daysToReset('', now), 7);
    assert.match(fs.readFileSync('story/kalyug.py', 'utf8'), /spare = round\(left - \(2\.4 \* days \+ 1\.0\), 2\)/);
    assert.deepEqual([DAILY_RESERVE_H, RESERVE_BASE_H], [2.4, 1.0]);
  });
  test('the festival-morning darshan / facts clips animate only above the reserve + the Kailash / POV episodes still due; else zoompan', () => {
    const r = gpuNeed({ left: 12, refreshAt, now, min: 5, episodes: 2 });
    assert.equal(r.need, 2.4 * 4 + 1 + 2 * EPISODE_H); // 13.1
    assert.equal(r.ok, false);
    assert.match(r.why, /2 Kailash\/POV episode/);
    assert.equal(gpuNeed({ left: 14, refreshAt, now, min: 5, episodes: 2 }).ok, true);
    // the fixed minimum still applies near the reset
    assert.equal(gpuNeed({ left: 5.5, refreshAt: '2026-11-25T00:00:00Z', now, min: 6 }).ok, false);
  });
  test('a full week: the daily Shorts\' reserve + Kailash (3) + POV (2) episodes leave room in the ~30 GPU h, so the cut falls on the zoompan-able animations', () => {
    const week = DAILY_RESERVE_H * 7 + RESERVE_BASE_H + EPISODE_H * 5;
    assert.ok(week < 30, `${week} h`);
  });
});
