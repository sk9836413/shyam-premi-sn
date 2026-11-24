// scripts/day-plan.mjs: the day's Shorts by priority (owner, 16 Nov 2026: movie > festival status > day status >
// darshan > Ramayan > Kailash / POV > facts) under the daily cap (3 until 24 Nov 2026; 8 from 25 Nov 2026, owner 24 Nov
// 2026 "8 ka limit rakho daily": a ceiling, every slot keeps its own days and switches), the day status Short every
// non-festival day at 06:00, facts at most 2 a week until the 25 Nov review, and the long slot without the plain katha
// (mantra jaap / festival jukebox only).
// Run: node --test scripts/day-plan.test.mjs
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { decide } from './upload-guard.mjs';
import { AT, CAP, CAP_BEFORE, CAP_FROM, DAWN, DAWN_LONG_KINDS, FACTS_PER_WEEK, LONG_CAP, addDays, bhajanAt, capFor, dawnUploads, factsInWeek, factsState, festTokens, isPlanned, istToday, jukeboxFor, loadInputs, longSubject, minuteOf, planDay } from './day-plan.mjs';
import { DAILY_CAP, DAILY_CAP_BEFORE, DAILY_CAP_FROM } from './upload-guard.mjs';
import { placements } from './status-engine.mjs';
import { factsReview, factsReviewSection, median } from './growth-compare.mjs';

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
const song = (id, festival, seconds = 150, deity = 'devi') => ({ id, festival, deity, seconds });

describe('cap and priority', () => {
  test('the cap: 3 Shorts until 24 Nov 2026, 8 from 25 Nov 2026 (owner, 24 Nov 2026); the upload guard has the same numbers', () => {
    assert.deepEqual([CAP, CAP_BEFORE, CAP_FROM], [8, 3, '2026-11-25']);
    assert.deepEqual([DAILY_CAP, DAILY_CAP_BEFORE, DAILY_CAP_FROM], [CAP, CAP_BEFORE, CAP_FROM]);
    assert.deepEqual([capFor('2026-11-24'), capFor('2026-11-25'), capFor('2027-01-31')], [3, 8, 8]);
  });
  test(`never more than the day's cap (${CAP_BEFORE} / ${CAP}) Shorts + at most ${LONG_CAP} long video on every day of the real calendar (11 Nov 2026 - 31 Jan 2027), KALYUG on`, () => {
    const inputs = realInputs();
    for (let d = '2026-11-11'; d <= '2027-01-31'; d = addDays(d, 1)) {
      const p = planDay(d, inputs);
      assert.ok(shorts(p).length <= capFor(d), `${d}: ${slots(p)}`);
      assert.ok(p.uploads.filter((u) => u.slot === 'long').length <= LONG_CAP, `${d}: ${slots(p)}`);
      assert.equal(new Set(slots(p)).size, p.uploads.length, `${d}: a slot twice`);
      assert.ok(!p.dropped.includes('long'), `${d}: long dropped`);
    }
  });
  test('no plain katha (owner, 16 Nov 2026): from 17 Nov every long video is a mantra jaap or a jukebox at 05:30, other days have none', () => {
    const inputs = realInputs();
    let n = 0;
    for (const from of ['2026-11-17', istToday() > '2026-11-17' ? istToday() : '2026-11-17']) {
      for (let i = 0; i < 30; i++) {
        const d = addDays(from, i);
        const r = isPlanned(d, 'long', inputs);
        if (!r.planned) { assert.match(r.why, /plain long katha is stopped/, d); continue; }
        n++;
        assert.ok(DAWN_LONG_KINDS.includes(r.upload.kind), `${d} ${r.upload.kind}`);
        assert.equal(r.upload.at, DAWN.long, d);
        assert.doesNotMatch(r.upload.what, /long katha video/, d);
      }
    }
    assert.ok(n >= 4, 'the weekly mantra jaap is still there');
  });
  test('EVERY non-festival day (movie days too) has the day status Short at 06:00, made the evening before; never replaced', () => {
    const inputs = realInputs();
    inputs.series = { kailash: { on: true, logged: new Set(), tieIns: new Map() }, pov: { on: true, logged: new Set(), tieIns: new Map() } };
    for (let d = '2026-11-17'; d <= '2027-01-31'; d = addDays(d, 1)) {
      const f = inputs.festivals.get(d);
      if (f && f.tier !== 'info') continue;
      const m = planDay(d, inputs).uploads.find((u) => u.slot === 'morning');
      assert.ok(m, `${d}: no morning Short: ${slots(planDay(d, inputs))}`);
      assert.deepEqual([m.kind, m.at, m.dawn], ['daystatus', DAWN.daystatus, true], d);
      assert.match(m.what, /स्टेटस पर लगाएं 📲/);
    }
    assert.equal(DAWN.daystatus, '06:00');
  });
  test('normal days: day status 06:00 + evening darshan (+ kalyug / noon where the cap has room); no long video', () => {
    const i = synth([]);
    assert.deepEqual(slots(planDay('2026-11-30', i)), ['morning', 'evening']);
    assert.deepEqual(planDay('2026-11-30', i).uploads.map((u) => `${u.kind} ${u.at}`), ['daystatus 06:00', 'temple 19:00']);
    assert.deepEqual(slots(planDay('2026-12-01', i)), ['morning', 'kalyug', 'evening']);
    assert.deepEqual(slots(planDay('2026-12-02', i)), ['morning', 'noon', 'evening']);
    assert.deepEqual(slots(planDay('2026-12-06', i)), ['morning', 'evening']);
  });
  test('the evening darshan names the high-retention temples', () => {
    const e = planDay('2026-11-30', synth([])).uploads.find((u) => u.slot === 'evening');
    for (const t of ['Khatu Shyam', 'Salasar', 'Mehandipur', 'Shakambhari', 'Jeen Mata', 'Rani Sati', 'sati-temple rules']) assert.match(e.what, new RegExp(t), t);
  });
  // History (cap 3 until 24 Nov 2026): the ranking that still decides a day whose cap is full.
  test('cap 3 (until 24 Nov 2026): status Shorts push out kalyug and noon; a movie day keeps the movie part AND the day status (the evening darshan makes way)', () => {
    const i = synth([fest('2026-11-11', 'x'), fest('2026-11-18', 'y')]);
    assert.deepEqual(slots(planDay('2026-11-10', i)), ['morning', 'evening', 'eve']);
    assert.deepEqual(planDay('2026-11-10', i).dropped, ['kalyug']);
    assert.deepEqual(slots(planDay('2026-11-11', i)), ['status', 'morning', 'evening']);
    assert.deepEqual(slots(planDay('2026-11-17', i)), ['morning', 'movie', 'eve']);
    assert.deepEqual(planDay('2026-11-17', i).dropped, ['evening']);
  });
  test('cap 8: an eve-status day keeps the day status, Kalyug (14:30), facts and the darshan; a movie day keeps the movie part, the day status AND the evening darshan', () => {
    const i = synth([fest('2026-12-02', 'x'), fest('2026-12-09', 'y')], { movies: new Map([['2026-12-08', 'k part 2']]), facts: true });
    const tue = planDay('2026-12-01', i);
    assert.deepEqual(tue.uploads.map((u) => `${u.slot} ${u.at}`), ['morning 06:00', 'kalyug 14:30', 'facts 17:00', 'evening 19:00', 'eve 20:00']);
    assert.deepEqual(tue.dropped, []);
    assert.deepEqual(slots(planDay('2026-12-02', i)), ['status', 'morning', 'evening']); // a festival Wednesday: no Dadi-Chhotu
    const movie = planDay('2026-12-08', i);
    // movie day (a Tuesday): no Kalyug, POV, Ramayan, facts or noon; the evening darshan is no longer cut
    assert.deepEqual(movie.uploads.map((u) => `${u.slot} ${u.at}`), ['morning 06:00', 'movie 07:00', 'evening 19:00', 'eve 20:00']);
    assert.deepEqual([movie.type, movie.dropped], ['movie', []]);
  });
  test('two status Shorts on a day: cap 3 cut the evening darshan (until 24 Nov 2026); cap 8 keeps it (the Gyaras day status stays)', () => {
    const old = synth([fest('2026-11-09', 'shivratri'), fest('2026-11-10', 'amavasya', 'status', 'amavasya')]);
    assert.deepEqual(slots(planDay('2026-11-09', old)), ['status', 'morning', 'eve']);
    assert.deepEqual(planDay('2026-11-09', old).dropped, ['evening']);
    const i = synth([fest('2026-12-07', 'shivratri'), fest('2026-12-08', 'amavasya', 'status', 'amavasya')]);
    assert.deepEqual(slots(planDay('2026-12-07', i)), ['status', 'morning', 'evening', 'eve']);
    assert.equal(planDay('2026-12-07', i).uploads.find((u) => u.slot === 'morning').theme, 'gyaras');
    assert.deepEqual(planDay('2026-12-07', i).dropped, []);
  });
  test('a festival day (not Ekadashi) keeps the festival-morning temple darshan; a festival movie day has no morning Short', () => {
    const i = synth([fest('2026-12-03', 'sankashti', 'status', 'sankashti'), fest('2026-11-17', 'gopashtami', 'status', 'gopashtami')]);
    assert.equal(planDay('2026-12-03', i).uploads.find((u) => u.slot === 'morning').kind, 'temple');
    assert.ok(!slots(planDay('2026-11-17', i)).includes('morning'));
  });
  test('big festival: 00:30 + 08:30 variants replace the morning Short; the evening before gets one too', () => {
    const i = synth([fest('2026-11-24', 'dev-deepawali', 'big', 'devdeepawali')]);
    assert.deepEqual(slots(planDay('2026-11-24', i)), ['status', 'statusday', 'evening']);
    assert.deepEqual(slots(planDay('2026-11-23', i)), ['morning', 'evening', 'eve']);
  });
  test('an already scheduled kalyug episode always counts (first under a full cap; KALYUG off)', () => {
    const old = synth([fest('2026-11-11', 'x')], { kalyug: false, kalyugLogged: new Set(['2026-11-10']) });
    assert.deepEqual(slots(planDay('2026-11-10', old)), ['morning', 'kalyug', 'eve']);
    const i = synth([fest('2026-12-02', 'x')], { kalyug: false, kalyugLogged: new Set(['2026-12-01']) });
    assert.deepEqual(slots(planDay('2026-12-01', i)), ['morning', 'kalyug', 'evening', 'eve']);
  });
  test('Kailash / POV keep their days below the day status and the evening darshan (cap 3: facts made way, an eve status dropped the episode)', () => {
    const series = { kailash: { on: true, logged: new Set(), tieIns: new Map() }, pov: { on: true, logged: new Set(), tieIns: new Map() } };
    const i = synth([], { series, facts: true });
    const mon = planDay('2026-11-23', i);
    assert.deepEqual(slots(mon), ['morning', 'kailash', 'evening']);
    assert.ok(!mon.uploads.some((u) => u.replaces), 'no Short replaced');
    assert.ok(mon.dropped.includes('facts'));
    assert.deepEqual(slots(planDay('2026-11-24', i)), ['morning', 'pov', 'evening']);
    const j = synth([fest('2026-11-24', 'x', 'status', 'pradosh')], { series });
    assert.deepEqual(slots(planDay('2026-11-23', j)), ['morning', 'evening', 'eve']);
    assert.ok(planDay('2026-11-23', j).dropped.includes('kailash'));
  });
  test('cap 8: Kailash / POV go out beside the day status, the facts Short and the evening darshan; an eve status drops nothing', () => {
    const series = { kailash: { on: true, logged: new Set(), tieIns: new Map() }, pov: { on: true, logged: new Set(), tieIns: new Map() } };
    const i = synth([], { series, facts: true });
    const mon = planDay('2026-11-30', i);
    assert.deepEqual(mon.uploads.map((u) => `${u.slot} ${u.at}`), ['morning 06:00', 'kailash 08:00', 'facts 17:00', 'evening 19:00']);
    assert.ok(!mon.uploads.some((u) => u.replaces), 'no Short replaced');
    assert.deepEqual(planDay('2026-12-01', i).uploads.map((u) => `${u.slot} ${u.at}`), ['morning 06:00', 'pov 08:00', 'kalyug 14:30', 'facts 17:00', 'evening 19:00']);
    const j = synth([fest('2026-12-01', 'x', 'status', 'pradosh')], { series });
    assert.deepEqual(slots(planDay('2026-11-30', j)), ['morning', 'kailash', 'evening', 'eve']);
    assert.deepEqual(planDay('2026-11-30', j).dropped, []);
  });
});

// Owner, 24 Nov 2026: "8 ka limit rakho daily" so that the daily Ramayan Tathya Short (17:00, from 26 Nov) AND the
// Kailash Parivar series (Mon/Thu/Sat 08:00) go out beside the day status and the evening darshan. A ceiling: every slot
// still needs its own day and switch, and the publish times stay spread.
describe('the 8-Shorts cap (from 25 Nov 2026)', () => {
  const at = (p) => p.uploads.map((u) => `${u.slot} ${u.at}`);
  const kinds = (p) => p.uploads.map((u) => `${u.slot}:${u.kind || '-'}`);
  const seriesOn = () => ({ kailash: { on: true, logged: new Set(), tieIns: new Map() }, pov: { on: true, logged: new Set(), tieIns: new Map() } });
  const ramayanOn = () => ({ on: true, left: 50, total: 60, next: { n: 3, id: 'r3' }, logged: new Set() });
  test('Thu 26 / Sat 28 Nov 2026 (Kailash days): day status 06:00, Kailash 08:00, Kalyug 14:30, Ramayan 17:00, darshan 19:00, nothing dropped', () => {
    const inputs = realInputs();
    for (const d of ['2026-11-26', '2026-11-28']) {
      const p = planDay(d, inputs);
      assert.deepEqual(at(p), ['morning 06:00', 'kailash 08:00', 'kalyug 14:30', 'facts 17:00', 'evening 19:00'], d);
      assert.deepEqual(kinds(p), ['morning:daystatus', 'kailash:-', 'kalyug:-', 'facts:ramayan', 'evening:temple'], d);
      assert.deepEqual(p.dropped, [], d);
    }
  });
  test('Mon 30 Nov 2026: Kailash + Ramayan + darshan + the Kaal Bhairav Jayanti eve status 20:00', () => {
    const p = planDay('2026-11-30', realInputs());
    assert.deepEqual(at(p), ['morning 06:00', 'kailash 08:00', 'facts 17:00', 'evening 19:00', 'eve 20:00']);
    assert.equal(p.uploads.find((u) => u.slot === 'facts').kind, 'ramayan');
    assert.equal(p.uploads.find((u) => u.slot === 'eve').festival, 'kaal-bhairav-jayanti');
  });
  test('Tue / Fri: POV 08:00 + Ramayan 17:00 (Fri 27 Nov 2026, a Sankashti: festival status 00:30 + the festival-morning darshan too)', () => {
    const inputs = realInputs();
    const fri27 = planDay('2026-11-27', inputs);
    assert.deepEqual(at(fri27), ['status 00:30', 'pov 08:00', 'morning on render, ~10:30', 'facts 17:00', 'evening 19:00']);
    assert.deepEqual(kinds(fri27), ['status:status', 'pov:-', 'morning:temple', 'facts:ramayan', 'evening:temple']);
    assert.ok(!fri27.uploads.some((u) => u.replaces), 'nobody replaced: there is room');
    assert.deepEqual(at(planDay('2026-12-11', inputs)), ['morning 06:00', 'pov 08:00', 'facts 17:00', 'evening 19:00']);
    assert.deepEqual(at(planDay('2026-12-15', inputs)), ['morning 06:00', 'pov 08:00', 'kalyug 14:30', 'facts 17:00', 'evening 19:00']);
  });
  test('big festival (Makar Sankranti, Fri 15 Jan 2027): 00:30 + 07:30 status, POV 08:00, Ramayan 17:00, darshan 19:00; no morning Short', () => {
    const p = planDay('2027-01-15', realInputs());
    assert.deepEqual(at(p), ['status 00:30', 'statusday 07:30', 'pov 08:00', 'facts 17:00', 'evening 19:00']);
    assert.ok(p.uploads.filter((u) => u.kind === 'status').every((u) => u.festival === 'makar-sankranti'));
    assert.ok(!slots(p).includes('morning'));
    // and the evening before (14 Jan, Lohri, a Kailash Thursday): Lohri status + Kailash + festival-morning darshan + Ramayan + darshan + Makar eve
    assert.deepEqual(slots(planDay('2027-01-14', realInputs())), ['status', 'kailash', 'morning', 'facts', 'evening', 'eve']);
  });
  test('a Chhath-like override day (a Kailash Thursday): only the override bhajan Shorts, the festival status and nothing off-theme', () => {
    const ov = { days: { '2026-12-10': { slots: { morning: { kind: 'bhajan', title: 'Geet A', day: 'kharna' }, evening: { kind: 'bhajan', title: 'Geet B', day: 'sandhya', at: '19:00' } } } } };
    const i = synth([fest('2026-12-10', 'chhath-x', 'status', 'chhath'), fest('2026-12-11', 'chhath-y', 'status', 'chhath')],
      { override: ov, series: seriesOn(), ramayan: ramayanOn(), facts: true, kalyug: true });
    const p = planDay('2026-12-10', i);
    assert.deepEqual(at(p), ['status 00:30', 'morning 05:45', 'evening 19:00', 'eve 20:00']);
    assert.deepEqual(kinds(p), ['status:status', 'morning:bhajan', 'evening:bhajan', 'eve:status']);
    assert.deepEqual(p.dropped, []); // no Kailash, Ramayan, Kalyug, facts or noon on an override day: not left out, not there
    // the day after (no override): Ramayan back, POV on its Friday
    assert.deepEqual(slots(planDay('2026-12-11', i)), ['status', 'pov', 'morning', 'facts', 'evening']);
  });
  test('a movie day: the movie part 07:00 beside the day status and the darshan; no series, Ramayan, facts or Kalyug', () => {
    const i = synth([], { movies: new Map([['2026-12-12', 'kp part 1']]), series: seriesOn(), ramayan: ramayanOn(), facts: true, kalyug: true });
    const p = planDay('2026-12-12', i); // a Saturday: Kailash, Kalyug and Ramayan would all be due
    assert.deepEqual(at(p), ['morning 06:00', 'movie 07:00', 'evening 19:00']);
    assert.deepEqual(p.dropped, []);
    assert.equal(p.type, 'movie');
  });
  test('the cap is a ceiling: the generic facts Short never takes a second slot beside the Ramayan Short; noon only on normal Wednesdays; Kalyug only Tue/Thu/Sat', () => {
    const inputs = realInputs();
    for (let d = CAP_FROM; d <= '2027-01-31'; d = addDays(d, 1)) {
      const p = planDay(d, inputs);
      const wd = new Date(`${d}T12:00:00Z`).getUTCDay();
      assert.ok(p.uploads.filter((u) => u.slot === 'facts').length <= 1, d);
      if (slots(p).includes('noon')) assert.equal(wd, 3, d);
      if (slots(p).includes('kalyug')) assert.ok([2, 4, 6].includes(wd), d);
      if (slots(p).includes('kailash')) assert.ok([1, 4, 6].includes(wd) || inputs.series.kailash.tieIns.has(d), d);
      if (slots(p).includes('pov')) assert.ok([2, 5].includes(wd) || inputs.series.pov.tieIns.has(d), d);
      assert.ok(shorts(p).length < CAP, `${d}: ${slots(p)} (room left: the cap is not a target)`);
      assert.deepEqual(p.dropped, [], d);
    }
  });
  test('publish times are spread: no two Shorts in the same minute, at least 30 min apart, every day 25 Nov 2026 - 31 Jan 2027 (KALYUG on)', () => {
    const inputs = realInputs();
    for (let d = CAP_FROM; d <= '2027-01-31'; d = addDays(d, 1)) {
      const mins = shorts(planDay(d, inputs)).map(minuteOf).sort((a, b) => a - b);
      for (let k = 1; k < mins.length; k++) assert.ok(mins[k] - mins[k - 1] >= 30, `${d}: ${shorts(planDay(d, inputs)).map((u) => `${u.slot} ${u.at}`)}`);
    }
  });
});

describe('facts Shorts: max 2 a week until the 25 Nov 2026 review', () => {
  const base = (o = {}) => synth([], { facts: true, kalyug: false, ...o });
  const week = (i, mon) => Array.from({ length: 7 }, (_, k) => addDays(mon, k)).filter((d) => slots(planDay(d, i)).includes('facts'));
  test(`at most ${FACTS_PER_WEEK} a Mon-Sun week, the first days with room`, () => {
    const i = base();
    assert.deepEqual(week(i, '2026-11-30'), ['2026-11-30', '2026-12-01']);
    assert.equal(factsInWeek('2026-12-03', i), 2);
    assert.match(factsState('2026-12-03', i).why, /max 2 a week/);
  });
  test('a logged facts Short of the week counts first (even a later day)', () => {
    const i = base({ factsLogged: new Set(['2026-12-04']) });
    assert.deepEqual(week(i, '2026-11-30'), ['2026-11-30', '2026-12-04']);
  });
  test('the review: verdict "off" stops facts from its date, "on" ends the weekly limit; FACTS=off stops them', () => {
    const off = base({ factsReview: { date: '2026-12-02', verdict: 'off', median: 4 } });
    assert.deepEqual(week(off, '2026-11-30'), ['2026-11-30', '2026-12-01']);
    assert.deepEqual(week(off, '2026-12-07'), []);
    assert.match(factsState('2026-12-07', off).why, /median 4/);
    const on = base({ factsReview: { date: '2026-11-30', verdict: 'on', median: 25 } });
    assert.equal(week(on, '2026-11-30').length, 7);
    assert.deepEqual(week(base({ facts: false }), '2026-11-30'), []);
  });
  test('real calendar: never more than 2 facts Shorts in a Mon-Sun week before a review', () => {
    const inputs = realInputs();
    inputs.factsReview = null;
    for (let mon = '2026-11-16'; mon <= '2027-01-25'; mon = addDays(mon, 7)) {
      // the Ramayan series Short (Wed/Thu/Sat, owner 24 Nov 2026) uses the facts slot but is outside the facts weekly limit
    const n = Array.from({ length: 7 }, (_, k) => addDays(mon, k)).filter((d) => planDay(d, inputs).uploads.some((u) => u.slot === 'facts' && u.kind !== 'ramayan')).length;
      assert.ok(n <= FACTS_PER_WEEK, `week of ${mon}: ${n}`);
    }
  });
  test('the review (growth-compare --facts-review): median of the public facts Shorts >= 2 days old; under 20 = off', () => {
    const pub = ['- 2026-11-15-facts-a | youtube: https://youtube.com/shorts/AAAAAAA1 (x)', '- 2026-11-16-facts-b | youtube: https://youtube.com/shorts/BBBBBBB2 (x)',
      '- 2026-11-17-facts-c | youtube: https://youtube.com/shorts/CCCCCCC3 (x)', '- 2026-11-24-facts-d | youtube: https://youtube.com/shorts/DDDDDDD4 (x)',
      '- 2026-11-17-evening-e | youtube: https://youtube.com/shorts/EEEEEEE5 (x)'].join('\n');
    const v = (id, day, views) => ({ id, day, views, title: id });
    const vids = [v('AAAAAAA1', '2026-11-15', 3), v('BBBBBBB2', '2026-11-16', 7), v('CCCCCCC3', '2026-11-17', 60), v('DDDDDDD4', '2026-11-24', 900), v('EEEEEEE5', '2026-11-17', 500)];
    const r = factsReview(vids, pub, { date: '2026-11-25' });
    assert.deepEqual([r.n, r.median, r.verdict], [3, 7, 'off']); // 24 Nov too young, the evening Short is not facts
    assert.match(factsReviewSection(r), /^## Facts review 2026-11-25[\s\S]*OFF/);
    assert.equal(factsReview(vids.map((x) => ({ ...x, views: x.views + 30 })), pub, { date: '2026-11-25' }).verdict, 'on');
    assert.equal(factsReview([], pub, { date: '2026-11-25' }).verdict, null);
    assert.equal(median([1, 9, 3, 7]), 5);
  });
});

describe('long video: mantra jaap / festival jukebox only', () => {
  const chhath = (o = {}) => synth([fest('2027-11-07', 'chhath-sandhya', 'status', 'chhath')], o);
  const lib = (n, seconds = 150) => Array.from({ length: n }, (_, k) => song(`c${k}`, 'chhath', seconds));
  test('a festival with >= 4 full-length QA-passed bhajans of its jukebox kind gets a jukebox at 05:30', () => {
    const u = planDay('2027-11-07', chhath({ library: lib(5) })).uploads.find((x) => x.slot === 'long');
    assert.deepEqual([u.kind, u.at, u.dawn, u.jukebox], ['jukebox', '05:30', true, 'chhath']);
    assert.deepEqual(dawnUploads('2027-11-07', chhath({ library: lib(5) }), '').long, 'jukebox');
  });
  test('too few or too short songs, a jukebox of it in the last 30 days, or no jukebox kind: no long video, with the reason', () => {
    assert.match(jukeboxFor('2027-11-07', chhath({ library: lib(3) })).why, /only 3 full-length/);
    assert.match(jukeboxFor('2027-11-07', chhath({ library: lib(6, 45) })).why, /only 0 full-length/);
    const recent = chhath({ library: lib(5), longs: [{ date: '2027-10-20', text: '2027-10-20-long-chhath-geet-nonstop | c | jukebox' }] });
    assert.match(jukeboxFor('2027-11-07', recent).why, /went out on 2027-10-20/);
    assert.ok(!planDay('2027-11-07', recent).uploads.some((u) => u.slot === 'long'));
    const r = isPlanned('2027-11-07', 'long', chhath({ library: lib(2) }));
    assert.equal(r.planned, false);
    assert.match(r.why, /plain long katha is stopped.*only 2 full-length/);
  });
  test('Khatu Janmotsav 20 Nov 2026: no Khatu jukebox (2 QA-passed Khatu songs of 45 s, no jukebox kind yet), so no long video', () => {
    const inputs = realInputs();
    assert.ok(!planDay('2026-11-20', inputs).uploads.some((u) => u.slot === 'long'));
    assert.match(isPlanned('2026-11-20', 'long', inputs).why, /no jukebox kind/);
    assert.ok(inputs.library.filter((b) => b.deity === 'khatu').every((b) => b.seconds < 100));
  });
  test('the weekly mantra jaap stays (Sunday 22 Nov 2026, 05:30), and never falls back to a katha', () => {
    const m = planDay('2026-11-22', realInputs()).uploads.find((u) => u.slot === 'long');
    assert.deepEqual([m.kind, m.at, m.dawn], ['mantra', '05:30', true]);
    assert.match(m.what, /no katha instead/);
  });
});

describe('longSubject (date-scoped override long videos)', () => {
  test('a festival day names the festival', () => {
    assert.equal(longSubject('2026-12-02', synth([fest('2026-12-02', 'kaal-bhairav-jayanti', 'status', 'bhairav')])).festival, 'kaal-bhairav-jayanti');
    assert.equal(longSubject('2026-12-03', synth([])).festival, null);
  });
  test('a festival told by a long video in the last 30 days is covered; 31+ days ago it is told again', () => {
    const f = [fest('2026-12-02', 'kaal-bhairav-jayanti', 'status', 'bhairav')];
    const recent = synth(f, { longs: [{ date: '2026-11-10', text: '2026-11-10-long-kaal-bhairav-jayanti-katha | kaal bhairav | ...' }] });
    assert.equal(longSubject('2026-12-02', recent).covered, '2026-11-10');
    const old = synth(f, { longs: [{ date: '2026-11-01', text: '2026-11-01-long-kaal-bhairav-jayanti-katha' }] });
    assert.equal(longSubject('2026-12-02', old).festival, 'kaal-bhairav-jayanti');
  });
  test('festTokens: the same festival in another month matches', () => {
    assert.deepEqual(festTokens('ravi-pradosh-nov'), ['ravi', 'pradosh']);
  });
});

describe('festival dates (automation/festivals.json)', () => {
  const inputs = loadInputs('.');
  const on = (d) => planDay(d, inputs).uploads;
  const has = (d, slot, key) => on(d).some((u) => u.slot === slot && u.festival === key);
  test('Janmotsav week 17-20 Nov 2026: movie at 07:00 every day + 4 Janmotsav status variants + Akshaya Navami 00:30 on 18 (17 Nov 2026: info -> status) + the 06:00 day status on 19', () => {
    for (const d of ['2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20']) assert.ok(on(d).some((u) => u.slot === 'movie' && u.at === '07:00'), d);
    assert.ok(has('2026-11-18', 'eve', 'khatu-shyam-janmotsav'));
    assert.ok(has('2026-11-19', 'eve', 'khatu-shyam-janmotsav'));
    assert.ok(has('2026-11-18', 'status', 'akshaya-navami'));
    assert.deepEqual(on('2026-11-18').map((u) => `${u.slot} ${u.at}`), ['status 00:30', 'movie 07:00', 'eve 20:00']);
    assert.deepEqual(on('2026-11-19').map((u) => `${u.slot} ${u.at}`), ['morning 06:00', 'movie 07:00', 'eve 20:00']);
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
    // 14 Dec is a Kailash day: once the series is approved (24 Nov 2026) its episode takes the festival-morning darshan
    const d14 = on('2026-12-14');
    assert.ok(m('2026-12-14')?.kind === 'temple' || d14.some((u) => u.slot === 'kailash'));
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
  test('a capped slot says why (cap 3, 10 Nov 2026); with the cap of 8 the same kind of day keeps it', () => {
    const r = isPlanned('2026-11-10', 'kalyug', synth([fest('2026-11-11', 'x')]));
    assert.equal(r.planned, false);
    assert.match(r.why, /left out by the 3-Shorts-a-day cap/);
    assert.equal(isPlanned('2026-12-01', 'kalyug', synth([fest('2026-12-02', 'x')])).planned, true);
  });
  test('Kalyug goes out at 14:30 (08:00 is the Kailash / POV time); not on a date-scoped override day', () => {
    assert.equal(AT.kalyug, '14:30');
    assert.equal(planDay('2026-12-03', synth([])).uploads.find((u) => u.slot === 'kalyug').at, '14:30');
    const ov = { days: { '2026-12-03': { slots: { morning: { kind: 'bhajan', title: 'x', day: 'd' } } } } };
    assert.ok(!slots(planDay('2026-12-03', synth([], { override: ov }))).includes('kalyug'));
  });
  test('cap: the episode and its repeated morning line count once', () => {
    const log = '2026-11-12 | kalyug | 2026-11-12-kalyug-x | Bal Ganesh | s\n2026-11-12 | morning | 2026-11-12-kalyug-x | Bal Ganesh | s\n';
    assert.equal(decide({ day: '2026-11-12', slot: 'evening', slug: '2026-11-12-evening-y', run: '1.1', log }).go, true);
  });
});

describe('Chhath 2026 override (automation/chhath-2026.json)', () => {
  test('14-16 Nov: morning/evening Shorts become Chhath bhajan Shorts within the cap; long subjects are Chhath; other dates untouched', () => {
    const inputs = realInputs();
    for (const [d, want] of [['2026-11-14', ['morning', 'evening']], ['2026-11-15', ['morning']], ['2026-11-16', ['morning', 'evening']]]) {
      const p = planDay(d, inputs);
      assert.ok(shorts(p).length <= capFor(d), `${d}: ${slots(p)}`);
      for (const s of want) assert.equal(p.uploads.find((u) => u.slot === s)?.kind, 'bhajan', `${d} ${s}`);
      assert.match(p.uploads.find((u) => u.slot === 'long').what, /CHHATH OVERRIDE/);
    }
    assert.ok(!planDay('2026-11-17', inputs).uploads.some((u) => u.kind === 'bhajan'));
  });
  test('13 Nov: the extra bhajan slot only fits with EXTRA_UPLOAD_DAY', () => {
    const inputs = realInputs();
    assert.ok(!slots(planDay('2026-11-13', { ...inputs, extraDay: '' })).includes('bhajan'));
    const p = planDay('2026-11-13', { ...inputs, extraDay: '2026-11-13' });
    assert.ok(slots(p).includes('bhajan'));
    assert.equal(shorts(p).length, capFor('2026-11-13') + 1); // 3 + 1 (the cap of 3 until 24 Nov 2026)
  });
});

// Owner, 14 Nov 2026: "Bhajan subah subah hi bajate h log". Bhajan Shorts at 05:45, bhajan / mantra long videos at 05:30
// (rendered the evening before), katha long videos stay at 12:30; the IST publish date stays the upload's date.
describe('dawn uploads (bhajan Short 05:45, bhajan / mantra long video 05:30)', () => {
  test('bhajanAt: own "at" wins (null = on render), else the morning / extra bhajan slot is a dawn upload', () => {
    assert.deepEqual(bhajanAt('morning', {}), { at: '05:45', dawn: true });
    assert.deepEqual(bhajanAt('bhajan', {}), { at: '05:45', dawn: true });
    assert.deepEqual(bhajanAt('evening', {}), { at: null, dawn: false });
    assert.deepEqual(bhajanAt('morning', { at: null }), { at: null, dawn: false }); // 14 Nov 2026 (on render) unchanged
    assert.deepEqual(bhajanAt('morning', { at: '05:45' }), { at: '05:45', dawn: true });
    assert.deepEqual(bhajanAt('evening', { at: '19:00' }), { at: '19:00', dawn: false });
    assert.deepEqual(bhajanAt('bhajan', { at: '19:45' }), { at: '19:45', dawn: false });
  });
  test('15 and 16 Nov 2026: the morning Chhath bhajan Short is public 05:45 (Sandhya / Usha Arghya), the 16 Nov evening one stays 19:00', () => {
    const inputs = realInputs();
    for (const [d, day] of [['2026-11-15', 'sandhya-arghya'], ['2026-11-16', 'usha-arghya']]) {
      const u = planDay(d, inputs).uploads.find((x) => x.slot === 'morning');
      assert.deepEqual([u.kind, u.day, u.at, u.dawn], ['bhajan', day, '05:45', true], d);
      assert.deepEqual(dawnUploads(d, inputs, '').bhajans, [{ day: d, slot: 'morning', at: '05:45' }], d);
    }
    const eve16 = planDay('2026-11-16', inputs).uploads.find((x) => x.slot === 'evening');
    assert.deepEqual([eve16.kind, eve16.at, Boolean(eve16.dawn)], ['bhajan', '19:00', false]);
    const m14 = planDay('2026-11-14', inputs).uploads.find((x) => x.slot === 'morning');
    assert.ok(!m14.dawn && !/^\d/.test(m14.at), '14 Nov morning (already being made today) keeps "on render"');
    // the katha long videos of 15 / 16 Nov stay 12:30
    for (const d of ['2026-11-15', '2026-11-16']) assert.equal(planDay(d, inputs).uploads.find((x) => x.slot === 'long').at, '12:30', d);
  });
  test('dawn uploads come first in the time order (00:30 status, 05:30 long, 05:45 bhajan) and stay within the caps', () => {
    const inputs = realInputs();
    assert.deepEqual(slots(planDay('2026-11-15', inputs)).slice(0, 2), ['status', 'morning']);
    assert.deepEqual(planDay('2026-11-22', inputs).uploads.map((u) => `${u.slot} ${u.at}`).slice(0, 2), ['status 00:30', 'long 05:30']);
    for (const d of ['2026-11-15', '2026-11-16', '2026-11-22']) {
      const p = planDay(d, inputs);
      assert.ok(shorts(p).length <= capFor(d), d);
      assert.equal(p.uploads.filter((u) => u.slot === 'long').length, LONG_CAP, d);
    }
  });
  test('the jukebox (override long kind) and the weekly mantra jaap are dawn long videos (05:30), a katha is not', () => {
    const inputs = realInputs();
    const j = planDay('2026-11-14', inputs).uploads.find((u) => u.slot === 'long');
    assert.deepEqual([j.kind, j.at, j.dawn], ['jukebox', '05:30', true]);
    const m = planDay('2026-11-22', inputs).uploads.find((u) => u.slot === 'long');
    assert.deepEqual([m.kind, m.at, m.dawn], ['mantra', '05:30', true]);
    assert.match(m.what, /public 05:30 IST/);
    assert.deepEqual(dawnUploads('2026-11-22', inputs, ''), { date: '2026-11-22', bhajans: [], long: 'mantra', longAt: '05:30' });
    assert.ok(!planDay('2026-11-17', inputs).uploads.some((u) => u.slot === 'long'), '17 Nov: no katha long (owner, 16 Nov 2026)');
    assert.deepEqual(dawnUploads('2026-11-17', inputs, ''), { date: '2026-11-17', bhajans: [], long: '', longAt: '' });
    // a non-festival day reports its 06:00 day status Short (made by the status job), unless log.md has the morning slot
    assert.deepEqual(dawnUploads('2026-11-25', inputs, '').daystatus, { day: '2026-11-25', slot: 'morning', at: '06:00' });
    assert.equal(dawnUploads('2026-11-25', inputs, '2026-11-25 | morning | 2026-11-25-morning-budhvar-ganesh | g | s\n').daystatus, undefined);
  });
  test('dawnUploads leaves out what log.md already has (the evening run renders only what is missing)', () => {
    const inputs = realInputs();
    const log = '2026-11-15 | morning | 2026-11-15-morning-chhath-sandhya-arghya-geet | Chhath | x\n2026-11-22 | long | 2026-11-22-long-mantra-x | Vishnu | y\n';
    assert.deepEqual(dawnUploads('2026-11-15', inputs, log).bhajans, []);
    assert.equal(dawnUploads('2026-11-22', inputs, log).long, '');
    assert.equal(dawnUploads('2026-11-14', inputs, '2026-11-14 | long | 2026-11-14-long-chhath-geet-nonstop | c | j\n').long, '');
  });
  test('a Short rendered the evening before counts on its publish day (upload guard), not on the render day', () => {
    // 14 Nov evening: the 15 Nov 05:45 bhajan is claimed and logged under 2026-11-15
    const log = '2026-11-14 | evening | 2026-11-14-evening-chhath-chhath-geet | c | x\n2026-11-14 | eve | 2026-11-14-eve-chhath | c | x\n2026-11-14 | morning | 2026-11-14-morning-chhath-kharna-geet | c | x\n'
      + '2026-11-15 | morning | 2026-11-15-morning-chhath-sandhya-arghya-geet | c | x\n';
    assert.equal(decide({ day: '2026-11-15', slot: 'eve', slug: '2026-11-15-eve-chhath-usha', run: '1.1', log }).go, true); // 15 Nov: 2nd Short
    const log15 = `${log}2026-11-15 | status | 2026-11-15-status-chhath | c | x\n2026-11-15 | eve | 2026-11-15-eve-chhath-usha | c | x\n`;
    assert.equal(decide({ day: '2026-11-15', slot: 'evening', slug: '2026-11-15-evening-y', run: '1.1', log: log15 }).cap, true); // 4th on 15 Nov
  });
});
