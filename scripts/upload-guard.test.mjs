// scripts/upload-guard.mjs decisions (no git, no network). Run: node --test scripts/upload-guard.test.mjs
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { DAILY_CAP, LONG_CAP, claimLine, decide, kindOf, shortsCap } from './upload-guard.mjs';

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
describe('daily cap per kind: 3 Shorts + 1 long', () => {
  const day = '2026-11-14';
  const three = `${day} | morning | ${day}-morning-a | x | y\n${day} | evening | ${day}-evening-b | x | y\n${day} | eve | ${day}-eve-c | x | y\n`;
  const longLine = `${day} | long | ${day}-long-mandir-part-1 | x | y\n`;
  const at = (slot, slug, o = {}) => decide({ day, slot, slug, run: '7.1', now: NOW, ...o });
  test('kinds: only `long` is a long video; status/morning/evening/noon/kalyug/movie are Shorts', () => {
    assert.equal(kindOf('long'), 'long');
    for (const s of ['status', 'eve', 'statusday', 'morning', 'evening', 'noon', 'kalyug', 'movie']) assert.equal(kindOf(s), 'short', s);
    assert.equal(DAILY_CAP, 3);
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
