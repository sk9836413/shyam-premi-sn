// Ramayan Ke Rochak Tathya (owner, 24 Nov 2026; STORY.md section 11): the series file, the spec rules (the item's hook and
// fact word for word, the source line on screen, no science-proof / NASA / BCE / invented numbers, the visual rules) and
// the plan (the facts slot on Wed/Thu/Sat; festivals, the day status and the evening darshan win).
// Run: node --test scripts/ramayan-series.test.mjs
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadSeries, nextItem, parseSeries, sourceParts } from './ramayan-series.mjs';
import { checkRamayanSpec, checkSeries, visualProblems } from './ramayan-rules.mjs';
import { RAMAYAN_DAYS, RAMAYAN_FROM, planDay } from './day-plan.mjs';
import { placements } from './status-engine.mjs';

const items = loadSeries('.');
const sample = () => JSON.parse(fs.readFileSync('scripts/fixtures/ramayan-sample.json', 'utf8'));
const has = (e, re) => e.some((x) => re.test(x));

describe('series file', () => {
  test('automation/ramayan-series.md passes its own rules', () => {
    assert.deepEqual(checkSeries(items), []);
    assert.ok(items.length >= 40 && items.length <= 60);
  });
  test('every source line names a primary text, kand and sarga/doha', () => {
    for (const it of items) {
      const p = sourceParts(it.source);
      assert.ok(p, it.source);
      assert.ok(p.work === 'Valmiki Ramayan' ? p.unit === 'Sarga' : p.unit === 'Doha', it.source);
    }
  });
  test('parse + next item in order (never skips back)', () => {
    const s = parseSeries('## Items\n### 1. A\n- id: ramayan-01-a\n- hook: x\n### 2. B\n- id: ramayan-02-b\n');
    assert.deepEqual(s.map((x) => x.id), ['ramayan-01-a', 'ramayan-02-b']);
    assert.equal(nextItem(items, new Set()).n, 1);
    assert.equal(nextItem(items, new Set([1, 2, 5])).n, 6);
    assert.equal(nextItem(items, new Set(items.map((x) => x.n))), null);
  });
  test('the checker catches bad items', () => {
    const bad = { ...items[0], source: 'Ramayan, Sundar Kand', fact_hi: 'एक 2 तीन', hook: 'NASA ne bhi maana Ramayan ki baat!' };
    const e = checkSeries([bad, ...items.slice(1)]);
    assert.ok(has(e, /source/));
    assert.ok(has(e, /numbers as words/));
    assert.ok(has(e, /scientific-proof/));
  });
});

describe('spec rules', () => {
  test('the sample spec of item 1 passes', () => assert.deepEqual(checkRamayanSpec(sample(), items), []));
  test('the fact beat may not add or change a word', () => {
    const s = sample();
    s.scenes[1].tts = s.scenes[1].tts.replace('एक दृश्य देखा', 'एक दुखद दृश्य देखा');
    assert.ok(has(checkRamayanSpec(s, items), /fact beat: its tts/));
    const r = sample();
    r.scenes[2].sub += ' Yeh duniya ka pehla shlok tha.';
    assert.ok(has(checkRamayanSpec(r, items), /fact beat: its sub/));
  });
  test('the source line must be on screen and match the item', () => {
    const s = sample();
    delete s.scenes[3].source_line;
    assert.ok(has(checkRamayanSpec(s, items), /source_line/));
    const r = sample();
    r.source = 'Valmiki Ramayan, Bal Kand, Sarga 3';
    assert.ok(has(checkRamayanSpec(r, items), /source: exactly/));
  });
  test('no "scientific proof", NASA or BCE years; no invented numbers', () => {
    const s = sample();
    s.youtube_description = s.youtube_description.replace('Chitra AI', 'NASA ne bhi ise maana. Chitra AI');
    assert.ok(has(checkRamayanSpec(s, items), /NASA/));
    const r = sample();
    r.scenes[4].sub = 'Yeh 5000 BC ki baat hai.';
    const e = checkRamayanSpec(r, items);
    assert.ok(has(e, /BCE/));
    assert.ok(has(e, /numbers not in the item.*5000/));
    const q = sample();
    q.scenes[4].tts = 'सच्ची करुणा से ही महान रचना जन्म लेती है, वैज्ञानिक प्रमाण भी यही कहते हैं।';
    assert.ok(has(checkRamayanSpec(q, items), /scientific proof/));
  });
  test('beats in order: hook, fact, source, lesson, end card', () => {
    const s = sample();
    [s.scenes[3], s.scenes[4]] = [s.scenes[4], s.scenes[3]];
    assert.ok(has(checkRamayanSpec(s, items), /beats in order/));
  });
  test('title and kicker carry the series number', () => {
    const s = sample();
    s.youtube_title = 'Pehla shlok kaise bana? | पहला श्लोक #Shorts';
    s.kicker = 'Ramayan Tathya';
    const e = checkRamayanSpec(s, items);
    assert.ok(has(e, /youtube_title/));
    assert.ok(has(e, /kicker/));
  });
});

describe('visual rules', () => {
  test('Shri Ram is dark / blue-complexioned, never fair', () => {
    assert.ok(has(visualProblems('close-up of Lord Rama holding his bow in a forest at dawn, soft light, no text'), /dark blue-complexioned/));
    assert.ok(has(visualProblems('close-up of fair-skinned Lord Rama with a blue sky behind, soft light, no text'), /never fair/));
    assert.deepEqual(visualProblems('close-up of dark blue-complexioned Shri Ram holding his bow in a forest at dawn, no text'), []);
    assert.deepEqual(visualProblems('the stone Ram Setu stretching across a calm blue ocean at sunrise, no text'), []);
  });
  test('Hanuman ji traditional, Ravan never comic, no text in the picture', () => {
    assert.ok(has(visualProblems('Hanuman ji flying over the ocean towards Lanka at sunset, no text'), /clean-shaven/));
    assert.ok(has(visualProblems('a comical Ravan with ten heads tripping over in his court, no text'), /never comic/));
    assert.ok(has(visualProblems('a temple wall with the title Ramayan written in gold letters, warm light'), /never ask for text/));
  });
});

describe('plan', () => {
  const inputs = (o = {}) => ({ festivals: new Map(), placements: placements([]), movies: new Map(), kalyug: false, kalyugLogged: new Set(),
    ramayan: { on: true, total: 60, left: 60, next: items[0], logged: new Set() }, ...o });
  test('Wed/Thu/Sat from RAMAYAN_FROM: the facts slot is the Ramayan Short', () => {
    assert.deepEqual(RAMAYAN_DAYS, [0, 1, 2, 3, 4, 5, 6]);
    const thu = planDay('2026-11-26', inputs());
    assert.equal(thu.uploads.find((u) => u.slot === 'facts')?.kind, 'ramayan');
    assert.equal(planDay("2026-11-27", inputs()).uploads.find((u) => u.slot === "facts")?.kind, "ramayan"); // Friday too (daily since 24 Nov)
    assert.ok(!planDay('2026-11-19', inputs()).uploads.some((u) => u.kind === 'ramayan')); // before RAMAYAN_FROM
    assert.ok(RAMAYAN_FROM <= '2026-11-26');
  });
  test('RAMAYAN=off, a finished series or a movie day: no Ramayan Short', () => {
    assert.ok(!planDay('2026-11-26', inputs({ ramayan: { on: false, total: 60, left: 60, logged: new Set() } })).uploads.some((u) => u.kind === 'ramayan'));
    assert.ok(!planDay('2026-11-26', inputs({ ramayan: { on: true, total: 60, left: 0, logged: new Set() } })).uploads.some((u) => u.kind === 'ramayan'));
    assert.ok(!planDay('2026-11-26', inputs({ movies: new Map([['2026-11-26', 'x part 1']]) })).uploads.some((u) => u.kind === 'ramayan'));
  });
  test('festival days still win (status + festival darshan + evening fill the cap)', () => {
    const f = { date: '2026-11-26', key: 'test-fest', tier: 'status', theme: 'shiv', label: 'Test', names: [{ en: 'T', hi: 'ट' }, { en: 'U', hi: 'उ' }, { en: 'V', hi: 'व' }], sources: [] };
    const p = planDay('2026-11-26', inputs({ festivals: new Map([[f.date, { name: f.label, tier: f.tier, key: f.key, theme: f.theme }]]), placements: placements([f]) }));
    assert.ok(!p.uploads.some((u) => u.kind === 'ramayan'));
    assert.ok(p.dropped.includes('facts'));
  });
});
