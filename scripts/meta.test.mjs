// Payload/plan building for scripts/meta.mjs (no network). Run: node --test scripts/meta.test.mjs
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { captions, fbVideoResumable, igQueue, istAt, longPost, planShort, sameText, summarize } from './meta.mjs';

// 2026-11-05 10:43 IST
const NOW = Date.UTC(2026, 10, 5, 5, 13);

describe('istAt', () => {
  test('HH:MM is today in IST', () => assert.equal(istAt('19:00', NOW), Date.UTC(2026, 10, 5, 13, 30)));
  test('a festival day', () => assert.equal(istAt('2026-11-06T06:00', NOW), Date.UTC(2026, 10, 6, 0, 30)));
  test('past or under 15 minutes away = now (null), like youtube.mjs', () => {
    assert.equal(istAt('10:50', NOW), null);
    assert.equal(istAt('09:00', NOW), null);
    assert.equal(istAt(undefined, NOW), null);
  });
  test('bad value throws', () => assert.throws(() => istAt('7pm', NOW)));
});

describe('planShort', () => {
  test('morning Short (vertical, 45 s, now): FB Reel + IG Reel now', () => {
    assert.deepEqual(planShort({ seconds: 45, width: 1080, height: 1920, now: NOW }), { fb: 'reel', ig: 'reel', fbSchedule: {}, igAt: null });
  });
  test('evening Short for 19:00 IST: FB Reel SCHEDULED, IG queued for 19:00', () => {
    const p = planShort({ seconds: 58, width: 1080, height: 1920, publishAt: istAt('19:00', NOW), now: NOW });
    assert.equal(p.fb, 'reel');
    assert.deepEqual(p.fbSchedule, { video_state: 'SCHEDULED', scheduled_publish_time: String(Date.UTC(2026, 10, 5, 13, 30) / 1000) });
    assert.equal(p.igAt, '2026-11-05T13:30:00.000Z');
  });
  test('Dadi aur Chhotu 114 s: FB normal Page video, IG Reel (API allows 15 min)', () => {
    const p = planShort({ seconds: 114, width: 1080, height: 1920, now: NOW });
    assert.equal(p.fb, 'video');
    assert.equal(p.ig, 'reel');
  });
  test('scheduled Page video uses published=false', () => {
    const p = planShort({ seconds: 100, width: 1080, height: 1920, publishAt: istAt('19:00', NOW), now: NOW });
    assert.equal(p.fbSchedule.published, 'false');
  });
  test('90 s is still a Reel, landscape never is, over 15 min skips IG', () => {
    assert.equal(planShort({ seconds: 90, width: 1080, height: 1920, now: NOW }).fb, 'reel');
    assert.equal(planShort({ seconds: 30, width: 1920, height: 1080, now: NOW }).fb, 'video');
    assert.equal(planShort({ seconds: 901, width: 1080, height: 1920, now: NOW }).ig, 'skip');
  });
});

describe('longPost', () => {
  const spec = {
    slug: '2026-11-05-long-diwali-ram-ayodhya-vapsi',
    youtube_title: 'Diwali ki Katha: Shri Ram ki Ayodhya Vapsi | दिवाली की कथा | Sampoorn Katha',
    youtube_description: 'Diwali kyun manayi jaati hai?\nदिवाली की कथा: श्री राम की अयोध्या वापसी।\nChitra AI dwara banaye gaye hain (sanketik). Awaaz aur animation AI se.\nJai Shree Shyam 🙏\n#Diwali #ShriRam',
    youtube_tags: 'Diwali ki katha, दिवाली की कथा, भरत मिलाप, Shyam Premi SN',
  };
  const meta = { chapters: [{ title: 'Ayodhya ke Deepak', start: 0 }, { title: 'Ravan ka Ant', start: 21.23 }, { title: 'Bharat Milap', start: 134.03 }] };
  test('title, chapters, new Devanagari keywords before the hashtags, AI line kept once', () => {
    const p = longPost(spec, meta);
    assert.equal(p.title, spec.youtube_title);
    assert.match(p.description, /Adhyay \(Chapters\):\n0:00 Ayodhya ke Deepak\n0:21 Ravan ka Ant\n2:14 Bharat Milap/);
    assert.match(p.description, /\nभरत मिलाप\n/);
    assert.ok(!/\| दिवाली की कथा/.test(p.description.split('Adhyay')[1]), 'keywords already in the text are not repeated');
    assert.equal(p.description.match(/Chitra AI/g).length, 1);
    assert.ok(p.description.endsWith('\n\n#Diwali #ShriRam'));
  });
  test('the AI disclaimer is added when missing', () => {
    const p = longPost({ ...spec, youtube_description: 'Katha.' }, {});
    assert.match(p.description, /Chitra AI dwara banaye gaye hain \(sanketik\)/);
    assert.ok(!p.description.includes('Adhyay'));
  });
});

test('captions fall back to the YouTube description', () => {
  assert.deepEqual(captions({ facebook_caption: 'fb', instagram_caption: 'ig' }), { facebook: 'fb', instagram: 'ig' });
  assert.equal(captions({ youtube_description: 'yt' }).instagram, 'yt');
});

describe('igQueue', () => {
  const log = [
    '- a | youtube: x (public at 2026-11-05T13:30:00.000Z) | social: fb: https://f (scheduled 2026-11-05T13:30:00.000Z) | ig: pending 2026-11-05T13:30:00.000Z | animated 2/4',
    '- b | youtube: y | social: fb: https://f | ig: https://i',
    '- c | youtube: z | status video | social: fb: https://f | ig: pending 2026-11-06T00:30:00.000Z',
    '- d | social: ig: pending 2026-11-04T13:30:00.000Z',
    '- d | instagram: https://www.instagram.com/reel/x',
    '- e | social: ig: pending 2026-11-04T13:30:00.000Z',
    '- e | instagram: error timeout',
    '- f | social: ig: pending 2026-11-04T13:30:00.000Z',
    '- f | instagram: error one',
    '- f | instagram: error two',
  ].join('\n');
  test('pending, minus published and twice-failed', () => {
    assert.deepEqual(igQueue(log), [
      { slug: 'a', at: '2026-11-05T13:30:00.000Z', attempts: 0 },
      { slug: 'c', at: '2026-11-06T00:30:00.000Z', attempts: 0 },
      { slug: 'e', at: '2026-11-04T13:30:00.000Z', attempts: 1 },
    ]);
  });
});

test('summarize', () => {
  assert.equal(summarize({ status: 'ok', facebook: { url: 'https://f', scheduled: 'T' }, instagram: { pending: '2026-11-05T13:30:00.000Z' } }),
    'fb: https://f (scheduled T) | ig: pending 2026-11-05T13:30:00.000Z');
  assert.equal(summarize({ status: 'partial-failure', facebook: { error: 'boom' } }), 'fb: error boom | ig: skipped');
});

describe('duplicate guard', () => {
  test('sameText ignores case, spaces, emoji and punctuation', () => {
    assert.equal(sameText('Shubh Deepawali! 🪔✨\nMaa Lakshmi aur Ganesh ji ki kripa', 'shubh deepawali  Maa Lakshmi aur Ganesh ji ki kripa'), true);
    assert.equal(sameText('शुभ दीपावली! माँ लक्ष्मी', 'शुभ दीपावली माँ लक्ष्मी'), true);
    assert.equal(sameText('Shubh Diwali! Khatu Shyam ji ke darshan', 'Shubh Diwali! Lakshmi-Ganesh puja aur deepon ki parampara'), false);
    assert.equal(sameText('', ''), false);
  });
  test('summary marks a post that already existed', () => {
    assert.equal(summarize({ facebook: { url: 'https://www.facebook.com/reel/1', duplicate: true }, instagram: { pending: '2026-11-08T00:30:00.000Z' } }),
      'fb: https://www.facebook.com/reel/1 (already posted, not repeated) | ig: pending 2026-11-08T00:30:00.000Z');
  });
});

// Facebook Page videos (long katha, movie parts) go up in chunks: one 5-8 min video in a single POST failed with
// "Request Entity Too Large (code 413)" on 7-9 Nov 2026. A fake Graph endpoint checks the start/transfer/finish session.
describe('fbVideoResumable', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'meta-test-'));
  const file = path.join(tmp, 'long.mp4');
  const data = Buffer.from(Array.from({ length: 2500 }, (_, i) => i % 251));
  fs.writeFileSync(file, data);
  const fakeGraph = ({ chunk = 1000, failOnce = -1, failAlways = -1 } = {}) => {
    const calls = [];
    const got = [];
    let failed = false;
    const post = async (fields, blobs = {}) => {
      calls.push({ ...fields, blobs: Object.keys(blobs) });
      assert.ok(!('source' in fields) && !blobs.source, 'never the whole file in one request');
      if (fields.upload_phase === 'start') return { upload_session_id: 's1', video_id: 'v1', start_offset: '0', end_offset: String(Math.min(chunk, Number(fields.file_size))) };
      if (fields.upload_phase === 'transfer') {
        const from = Number(fields.start_offset);
        if (from === failAlways || (from === failOnce && !failed)) { failed = true; const e = new Error('POST /videos (transfer): try again (code 6001)'); e.code = 6001; throw e; }
        const buf = Buffer.from(await blobs.video_file_chunk.blob.arrayBuffer());
        assert.ok(buf.length <= chunk, 'chunk no bigger than Facebook asked');
        got.push([from, buf]);
        const next = from + buf.length;
        return { start_offset: String(next), end_offset: String(Math.min(next + chunk, data.length)) };
      }
      if (fields.upload_phase === 'finish') return { success: true };
      if (fields.upload_phase === 'cancel') return { success: true };
      throw new Error(`unexpected ${fields.upload_phase}`);
    };
    return { post, calls, got };
  };
  const at = { published: 'false', scheduled_publish_time: '1763101800' };
  test('start -> 3 transfers -> finish; the chunks rebuild the file; title, description and schedule go with finish', async () => {
    const g = fakeGraph();
    const r = await fbVideoResumable(file, { title: 'T', description: 'D', schedule: at }, { post: g.post, wait: async () => {} });
    assert.deepEqual(g.calls.map((c) => c.upload_phase), ['start', 'transfer', 'transfer', 'transfer', 'finish']);
    assert.equal(g.calls[0].file_size, data.length);
    assert.deepEqual(Buffer.concat(g.got.sort((a, b) => a[0] - b[0]).map((x) => x[1])), data);
    const fin = g.calls.at(-1);
    assert.equal(fin.upload_session_id, 's1');
    assert.equal(fin.title, 'T');
    assert.equal(fin.description, 'D');
    assert.equal(fin.published, 'false');
    assert.equal(fin.scheduled_publish_time, '1763101800');
    assert.equal(r.id, 'v1');
    assert.equal(r.chunks, 3);
    assert.equal(r.type, 'video');
  });
  test('a failed chunk is retried from the same offset', async () => {
    const g = fakeGraph({ failOnce: 1000 });
    await fbVideoResumable(file, { description: 'D' }, { post: g.post, wait: async () => {} });
    assert.deepEqual(g.calls.filter((c) => c.upload_phase === 'transfer').map((c) => c.start_offset), [0, 1000, 1000, 2000]);
  });
  test('a chunk that keeps failing cancels the session and reports the byte offset', async () => {
    const g = fakeGraph({ failAlways: 2000 });
    await assert.rejects(fbVideoResumable(file, { description: 'D' }, { post: g.post, wait: async () => {} }), /at byte 2000 of 2500.*cancelled/);
    assert.equal(g.calls.at(-1).upload_phase, 'cancel');
    assert.ok(!g.calls.some((c) => c.upload_phase === 'finish'));
  });
  test('a small file in one chunk', async () => {
    const g = fakeGraph({ chunk: 1e6 });
    const r = await fbVideoResumable(file, { description: 'D' }, { post: g.post, wait: async () => {} });
    assert.equal(r.chunks, 1);
  });
});
