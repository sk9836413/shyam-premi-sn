// scripts/upload-guard.mjs decisions (no git, no network). Run: node --test scripts/upload-guard.test.mjs
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { DAILY_CAP, DAILY_CAP_BEFORE, DAILY_CAP_FROM, LONG_CAP, OWNER_CAP, UPLOAD_CALLS_PER_DAY, claimLine, dailyCap, decide, extraUploads, kindOf, shortsCap } from './upload-guard.mjs';

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
  test('daily cap: a 4th upload of the day is skipped', () => {
    const d = { ...base, day: '2026-11-11', slot: 'evening', slug: '2026-11-11-evening-x' };
    const log = '2026-11-11 | status | 2026-11-11-status-bhai-dooj | Bhai Dooj | s\n2026-11-11 | morning | 2026-11-11-morning-a | x | y\n';
    assert.equal(decide({ ...d, log }).go, true);
    const pub = '- 2026-11-11-noon-b | youtube: https://youtube.com/shorts/abc\n';
    const r = decide({ ...d, log, pub });
    assert.equal(r.go, false); assert.equal(r.cap, true); assert.match(r.reason, /noon/);
    // a live claim of another slot counts too; another day's uploads do not
    const claim = `${claimLine({ ...d, slot: 'kalyug', slug: '2026-11-11-kalyug-c', run: '5.1', now: NOW - 60e3 })}\n`;
    assert.equal(decide({ ...d, log, pub: claim }).go, false);
    // a live claim of the long video does not (it has its own cap)
    const longClaim = `${claimLine({ ...d, slot: 'long', slug: '2026-11-11-long-c', run: '5.1', now: NOW - 60e3 })}\n`;
    assert.equal(decide({ ...d, log, pub: longClaim }).go, true);
    assert.equal(decide({ ...d, log, pub: pub.replace('11-11', '11-12') }).go, true);
  });
  test('daily cap: a movie day counts the movie part once (morning line repeats its slug)', () => {
    const d = { ...base, day: '2026-11-20', slot: 'evening', slug: '2026-11-20-evening-x' };
    const log = '2026-11-20 | movie | 2026-11-20-movie-k-part-4 | K | m\n2026-11-20 | morning | 2026-11-20-movie-k-part-4 | K | m\n2026-11-20 | status | 2026-11-20-status-j | J | s\n';
    assert.equal(decide({ ...d, log }).go, true);
  });
  test('daily cap: festival status variants count on their public day (eve the evening before, status 00:30 on the day)', () => {
    const d = { ...base, day: '2026-11-19', slot: 'evening', slug: '2026-11-19-evening-x' };
    const pub = '- 2026-11-19-eve-khatu-shyam-janmotsav | youtube: https://youtube.com/shorts/a\n- 2026-11-20-status-dev-uthani-ekadashi | youtube: https://youtube.com/shorts/b\n';
    const log = '2026-11-19 | movie | 2026-11-19-movie-k-part-3 | K | m\n';
    assert.equal(decide({ ...d, log, pub }).go, true); // movie + eve = 2 on 19 Nov; the 20 Nov status does not count here
    assert.equal(decide({ ...d, log: `${log}2026-11-19 | statusday | 2026-11-19-statusday-z | z | z\n`, pub }).go, false);
  });
});

// Owner, 13 Nov 2026: 3 Shorts + 1 long video per IST date; the long video never counts against the Shorts cap.
// (14 Nov 2026 is before DAILY_CAP_FROM: the cap of 3 of that time.)
describe('daily cap per kind: 3 Shorts + 1 long (until 24 Nov 2026)', () => {
  const day = '2026-11-14';
  const three = `${day} | morning | ${day}-morning-a | x | y\n${day} | evening | ${day}-evening-b | x | y\n${day} | eve | ${day}-eve-c | x | y\n`;
  const longLine = `${day} | long | ${day}-long-mandir-part-1 | x | y\n`;
  const at = (slot, slug, o = {}) => decide({ day, slot, slug, run: '7.1', now: NOW, ...o });
  test('kinds: only `long` is a long video, `owner` its own; status/morning/evening/noon/kalyug/kailash/pov/facts/movie are Shorts', () => {
    assert.equal(kindOf('long'), 'long');
    assert.equal(kindOf('owner'), 'owner');
    for (const s of ['status', 'eve', 'statusday', 'morning', 'evening', 'noon', 'kalyug', 'kailash', 'pov', 'facts', 'movie']) assert.equal(kindOf(s), 'short', s);
    assert.equal(dailyCap(day), 3);
    assert.equal(LONG_CAP, 1);
  });
  test('3 Shorts + 1 long are allowed (in either order)', () => {
    assert.equal(at('long', `${day}-long-mandir-part-1`, { log: three }).go, true);
    const twoAndLong = `${day} | morning | ${day}-morning-a | x | y\n${longLine}`;
    assert.equal(at('evening', `${day}-evening-b`, { log: twoAndLong, pub: `- ${day}-eve-c | youtube: https://youtube.com/shorts/c\n` }).go, true);
  });
  test('a 4th Short is blocked, also after the long video', () => {
    const r = at('noon', `${day}-noon-d`, { log: three + longLine });
    assert.equal(r.go, false);
    assert.equal(r.cap, true);
    assert.equal(r.kind, 'short');
    assert.doesNotMatch(r.reason, /long/);
  });
  test('a 2nd long video the same day is blocked (log line, published.md line or live claim)', () => {
    assert.equal(at('long', `${day}-long-other`, { log: longLine }).go, false);
    const viaPub = at('long', `${day}-long-other`, { pub: `- ${day}-long-first | youtube: https://youtu.be/x\n` });
    assert.equal(viaPub.go, false);
    assert.equal(viaPub.cap, true);
    assert.equal(viaPub.kind, 'long');
    assert.match(viaPub.reason, /max 1 long video a day/);
    const viaClaim = at('long', `${day}-long-other`, { pub: `${claimLine({ day, slot: 'long', slug: `${day}-long-first`, run: '8.1', now: NOW - 60e3 })}\n` });
    assert.equal(viaClaim.go, false);
  });
  test("another day's long video does not count", () => {
    assert.equal(at('long', `${day}-long-x`, { pub: '- 2026-11-13-long-chhath | youtube: https://youtu.be/y\n' }).go, true);
  });
  test('EXTRA_UPLOAD_DAY adds one Short that date only; the long video keeps its own cap of 1', () => {
    assert.equal(shortsCap(day, day), 4);
    assert.equal(shortsCap(day, ' 2026-11-14 '), 4);
    assert.equal(shortsCap(day, '2026-11-13'), 3);
    assert.equal(shortsCap(day, ''), 3);
    assert.equal(shortsCap(day, undefined), 3);
    assert.equal(at('noon', `${day}-noon-d`, { log: three + longLine, cap: shortsCap(day, day) }).go, true);
    const four = `${three}${day} | noon | ${day}-noon-d | x | y\n`;
    assert.equal(at('kalyug', `${day}-kalyug-e`, { log: four + longLine, cap: shortsCap(day, day) }).go, false);
    assert.equal(at('long', `${day}-long-2`, { pub: `- ${day}-long-1 | youtube: https://youtu.be/x\n`, log: four, cap: shortsCap(day, day) }).go, false);
  });
  test('13 Nov 2026 (EXTRA_UPLOAD_DAY): status + morning + evening Shorts and the Chhath long video all go', () => {
    const d13 = '2026-11-13';
    const log = `${d13} | status | ${d13}-status-chhath | c | s\n${d13} | morning | ${d13}-morning-deo | d | m\n${d13} | evening | ${d13}-evening-vaishno | v | e\n`;
    assert.equal(decide({ day: d13, slot: 'long', slug: `${d13}-long-chhath-nahay-khay`, run: '9.1', now: NOW, log, cap: shortsCap(d13, d13) }).go, true);
    assert.equal(decide({ day: d13, slot: 'noon', slug: `${d13}-noon-x`, run: '9.1', now: NOW, log, cap: shortsCap(d13, d13) }).go, true);
  });
});

// Owner, 24 Nov 2026: "8 ka limit rakho daily". From 25 Nov 2026 the guard lets 8 Shorts a day through (the day plan
// fills them only with Shorts that have their own day), the long video and the owner Short keep their own caps of 1.
describe('daily cap of 8 Shorts (from 25 Nov 2026)', () => {
  const day = '2026-11-26';
  const line = (slot) => `${day} | ${slot} | ${day}-${slot}-x | x | y\n`;
  const at = (slot, o = {}) => decide({ day, slot, slug: `${day}-${slot}-new`, run: '7.1', now: NOW, ...o });
  test('3 until 24 Nov 2026, 8 from 25 Nov 2026; EXTRA_UPLOAD_DAY still adds 1', () => {
    assert.deepEqual([DAILY_CAP, DAILY_CAP_BEFORE, DAILY_CAP_FROM], [8, 3, '2026-11-25']);
    assert.deepEqual([dailyCap('2026-11-24'), dailyCap('2026-11-25'), dailyCap('2027-01-15')], [3, 8, 8]);
    assert.equal(shortsCap('2026-11-24', ''), 3);
    assert.equal(shortsCap(day, ''), 8);
    assert.equal(shortsCap(day, day), 9);
  });
  test('a Kailash Thursday: day status, Kailash, Kalyug, Ramayan facts and the evening darshan all go (the 4th and 5th are no longer capped)', () => {
    let log = '';
    for (const slot of ['morning', 'kailash', 'kalyug', 'facts', 'evening']) {
      assert.equal(at(slot, { log }).go, true, slot);
      log += line(slot);
    }
    assert.equal(at('eve', { log }).go, true); // a 6th would still fit
  });
  test('the 9th Short of a day is capped; the long video and the owner Short keep their own caps beside 8 Shorts', () => {
    const eight = ['status', 'morning', 'kailash', 'statusday', 'kalyug', 'facts', 'evening', 'eve'].map(line).join('');
    const r = at('noon', { log: eight });
    assert.deepEqual([r.go, r.cap, r.kind, r.max], [false, true, 'short', 8]);
    assert.match(r.reason, /max 8 Shorts a day/);
    assert.equal(at('long', { log: eight }).go, true);
    assert.equal(at('owner', { log: eight }).go, true);
    assert.equal(at('noon', { log: eight, cap: shortsCap(day, day) }).go, true); // the owner's one-day exception: 9
  });
  test('a claim made the evening before counts on its publish day (25 Nov 2026 is the first 8-cap day)', () => {
    const d = '2026-11-25';
    const log = ['morning', 'noon', 'facts'].map((s) => `${d} | ${s} | ${d}-${s}-x | x | y\n`).join('');
    assert.equal(decide({ day: d, slot: 'evening', slug: `${d}-evening-y`, run: '1.1', now: NOW, log }).go, true);
    const d24 = '2026-11-24';
    const log24 = ['status', 'statusday', 'evening'].map((s) => `${d24} | ${s} | ${d24}-${s}-x | x | y\n`).join('');
    assert.equal(decide({ day: d24, slot: 'pov', slug: `${d24}-pov-y`, run: '1.1', now: NOW, log: log24 }).cap, true); // 24 Nov: still 3
  });
  test('YouTube upload bucket: the most uploads a day (8 + EXTRA_UPLOAD_DAY + EXTRA_UPLOADS 3 + long + owner) x 2 attempts stays under the 100 videos.insert calls', () => {
    const most = shortsCap(day, day, `${day}:3`) + LONG_CAP + OWNER_CAP;
    assert.equal(most, 14);
    assert.ok(most * 2 < UPLOAD_CALLS_PER_DAY);
  });
});

// Owner, 14 Nov 2026: dawn uploads (05:30 / 05:45 IST) are rendered and claimed the evening before; they count on the
// IST date they go public (the claim's --day and the log.md line carry it), never on the render day.
describe('dawn uploads count on their publish day', () => {
  const NOW14 = Date.parse('2026-11-14T13:20:00Z'); // 18:50 IST on 14 Nov
  test('a claim made on 14 Nov evening for the 15 Nov 05:45 bhajan blocks a second one for 15 Nov, not 14 Nov uploads', () => {
    const claim = `${claimLine({ day: '2026-11-15', slot: 'morning', slug: '2026-11-15-morning-chhath-sandhya-arghya-geet', run: '11.1', now: NOW14 })}\n`;
    assert.equal(decide({ day: '2026-11-15', slot: 'morning', slug: '2026-11-15-morning-chhath-sandhya-arghya-geet', run: '12.1', now: NOW14 + 60e3, pub: claim }).go, false);
    const log14 = '2026-11-14 | morning | 2026-11-14-morning-chhath-kharna-geet | c | x\n2026-11-14 | evening | 2026-11-14-evening-chhath-geet | c | x\n';
    assert.equal(decide({ day: '2026-11-14', slot: 'eve', slug: '2026-11-14-eve-chhath-sandhya', run: '12.1', now: NOW14 + 60e3, log: log14, pub: claim }).go, true);
  });
  test('15 Nov: status 00:30 + the dawn bhajan + eve 20:00 = 3 Shorts; a 4th is capped; the 05:30-style long has its own cap', () => {
    const log = '2026-11-15 | status | 2026-11-15-status-chhath | c | x\n2026-11-15 | morning | 2026-11-15-morning-chhath-sandhya-arghya-geet | c | x\n';
    assert.equal(decide({ day: '2026-11-15', slot: 'eve', slug: '2026-11-15-eve-chhath-usha', run: '1.1', now: NOW14, log }).go, true);
    const full = `${log}2026-11-15 | eve | 2026-11-15-eve-chhath-usha | c | x\n`;
    assert.equal(decide({ day: '2026-11-15', slot: 'evening', slug: '2026-11-15-evening-x', run: '1.1', now: NOW14, log: full }).cap, true);
    assert.equal(decide({ day: '2026-11-15', slot: 'long', slug: '2026-11-15-long-chhath-vrat-katha', run: '1.1', now: NOW14, log: full }).go, true);
    // a mantra long made on 21 Nov evening for 22 Nov 05:30 counts on 22 Nov only
    const m = '- 2026-11-22-long-mantra-vasudev | youtube: https://youtu.be/m (public at 2026-11-22T00:00:00.000Z)\n';
    assert.equal(decide({ day: '2026-11-21', slot: 'long', slug: '2026-11-21-long-x', run: '1.1', now: NOW14, pub: m }).go, true);
    assert.equal(decide({ day: '2026-11-22', slot: 'long', slug: '2026-11-22-long-y', run: '1.1', now: NOW14, pub: m }).go, false);
  });
});

// Owner, 15 Nov 2026 ("Isi format me chath ka 4-5 video aaj live karo"): a one-off EXTRA_UPLOADS="<date>:<n>,..." exception.
describe('EXTRA_UPLOADS one-off exception', () => {
  test('parses date:n pairs; other dates, malformed entries and n > 3 are safe', () => {
    assert.equal(extraUploads('2026-11-15', '2026-11-15:3,2026-11-16:2'), 3);
    assert.equal(extraUploads('2026-11-16', ' 2026-11-15:3 , 2026-11-16:2 '), 2);
    assert.equal(extraUploads('2026-11-17', '2026-11-15:3,2026-11-16:2'), 0);
    assert.equal(extraUploads('2026-11-15', '2026-11-15'), 0);
    assert.equal(extraUploads('2026-11-15', '2026-11-15:x'), 0);
    assert.equal(extraUploads('2026-11-15', '2026-11-15:9'), 3);
    assert.equal(extraUploads('2026-11-15', ''), 0);
    assert.equal(extraUploads('2026-11-15', undefined), 0);
  });
  test('adds to the cap, together with EXTRA_UPLOAD_DAY', () => {
    assert.equal(shortsCap('2026-11-15', '', '2026-11-15:3'), 3 + 3);
    assert.equal(shortsCap('2026-11-15', '2026-11-15', '2026-11-15:2'), 3 + 3);
    assert.equal(shortsCap('2026-11-18', '', '2026-11-15:3'), 3);
    assert.equal(shortsCap('2026-12-05', '', '2026-12-05:2'), DAILY_CAP + 2);
  });
  test('15 Nov: status + morning + eve + 3 Chhath facts Shorts go, a 7th is capped', () => {
    const d = '2026-11-15';
    let log = `${d} | status | ${d}-status-chhath-puja | c | x
${d} | morning | ${d}-morning-chhath-geet | c | x
${d} | eve | ${d}-eve-chhath-usha-arghya | c | x
`;
    const cap = shortsCap(d, '2026-11-13', '2026-11-15:3,2026-11-16:2');
    for (const k of [2, 3, 4]) {
      const slug = `${d}-facts-chhath-${k}`;
      assert.equal(decide({ day: d, slot: `facts${k}`, slug, run: '1.1', now: NOW, log, cap }).go, true, slug);
      log += `${d} | facts${k} | ${slug} | c | x
`;
    }
    assert.equal(decide({ day: d, slot: 'facts5', slug: `${d}-facts-chhath-5`, run: '1.1', now: NOW, log, cap }).cap, true);
    // the same extra slot twice: blocked by the log line, not by the cap
    assert.equal(decide({ day: d, slot: 'facts2', slug: `${d}-facts-other`, run: '1.1', now: NOW, log, cap: 99 }).go, false);
  });
});

describe('withheld uploads (taken back before going public) do not count', () => {
  test('a withheld Short frees its place in the cap', () => {
    const d = '2026-11-15';
    const log = `${d} | status | ${d}-status-a | c | x\n${d} | morning | ${d}-morning-b | c | x\n`;
    const pub = `${claimLine({ day: d, slot: 'facts4', slug: `${d}-facts-x`, run: '5.1', now: NOW - 60e3 })}\n- ${d}-facts-x | youtube: https://youtube.com/shorts/abc\n`;
    assert.equal(decide({ day: d, slot: 'facts5', slug: `${d}-facts-y`, run: '6.1', now: NOW, log, pub, cap: 3 }).go, false);
    const pub2 = `${pub}- ${d}-facts-x | withheld: pronunciation gate failed\n`;
    assert.equal(decide({ day: d, slot: 'facts5', slug: `${d}-facts-y`, run: '6.1', now: NOW, log, pub: pub2, cap: 3 }).go, true);
  });
});
