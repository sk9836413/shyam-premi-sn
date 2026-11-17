// scripts/retention.mjs: retention curve maths, format grouping and the growth-report table (no API).
// Run: node --test scripts/retention.test.mjs
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { curveStats, feedFormat, retentionSection, summarize, watchAt } from './retention.mjs';

// A made-up 18 s status Short shaped like Chhath Sandhya Arghya Status 2026 (14 Nov): 107% at the start, ~67% at 3 s, 7% at the end.
const rows = [[0.01, 1.071, 0.2], [0.05, 1.03, 0.2], [0.1, 0.9, 0.19], [0.2, 0.55, 0.17], [0.5, 0.3, 0.15], [1, 0.071, 0.1]];

describe('retention curve', () => {
  test('watchAt interpolates on the ratio of the video length', () => {
    assert.equal(watchAt(rows, 0, 18), 1.071);
    assert.ok(Math.abs(watchAt(rows, 1.8, 18) - 0.9) < 1e-9); // 1.8 s of 18 s = ratio 0.1
    assert.ok(Math.abs(watchAt(rows, 2.7, 18) - 0.725) < 1e-9); // halfway between 0.1 and 0.2
    assert.ok(Math.abs(watchAt(rows, 99, 18) - 0.071) < 1e-9);
    assert.equal(watchAt([], 3, 18), null);
  });
  test('curveStats: kept at 0 / 3 s, the drop in the first 3 s, the end (replays push it over 100)', () => {
    const c = curveStats(rows, 18);
    assert.equal(c.start, 107.1);
    assert.equal(c.at3, 66.7); // 3 s of 18 s = ratio 0.167
    assert.equal(c.drop3, 40.4);
    assert.equal(c.end, 7.1);
    assert.equal(curveStats([], 18), null);
  });
});

describe('formats', () => {
  test('the title decides first; the slug and spec next', () => {
    assert.equal(feedFormat('', {}, 'Gopashtami Status 2026 | गोपाष्टमी स्टेटस वीडियो #Shorts'), 'status');
    assert.equal(feedFormat('2026-10-28-evening-ganesh-parikrama', {}, 'Ganesh ji ki Parikrama Katha | गणेश जी की कथा #Shorts'), 'katha');
    assert.equal(feedFormat('2026-10-30-evening-khatu-shyam-moravinandan', {}, 'Moravinandan Khatu Shyam ji Darshan'), 'darshan');
    assert.equal(feedFormat('2026-10-29-evening-khatu-shyam-haare-ka-sahara', {}, 'Haare ka Sahara Baba Shyam'), 'darshan');
    assert.equal(feedFormat('2026-11-17-movie-khatu-shyam-amar-katha-part-1', {}, 'Khatu Shyam ji ki Amar Katha Part 1'), 'movie');
    assert.equal(feedFormat('2026-11-16-facts-chhath-chhathi-naam-kyun', { variant: 'kyun' }, 'Chhathi Maiya ko Chhathi kyun kehte 😱 #facts'), 'facts');
    assert.equal(feedFormat('2026-11-16-evening-chhath-parana-geet', { bhajan_short: true }, 'Chhath Parana Geet 2026'), 'bhajan');
    assert.equal(feedFormat('', {}, '3 March 2025'), 'other (manual upload)');
  });
});

describe('growth report section', () => {
  const short = (format, views, avp, curve, sources = {}) => ({ format, seconds: 20, views, avp, curve, sources, likes: 1, comments: 0, shares: 1, subs: 0 });
  test('per format: means, search and feed shares of the traffic', () => {
    const s = summarize([
      short('status', 200, 20, curveStats(rows, 18), { YT_SEARCH: 180, SHORTS: 20 }),
      short('status', 100, 40, null, { YT_SEARCH: 50, SHORTS: 50 }),
      short('darshan', 150, 70, curveStats([[0.01, 1.2, 0.4], [1, 0.3, 0.4]], 24), { SHORTS: 140, YT_SEARCH: 10 }),
    ]);
    const st = s.find((r) => r.format === 'status');
    assert.equal(st.n, 2);
    assert.equal(st.curves, 1);
    assert.equal(st.avp, 30);
    assert.equal(st.searchPct, 76.7);
    assert.equal(st.feedPct, 23.3);
    assert.equal(s[0].format, 'status'); // most views first
    assert.equal(s.find((r) => r.format === 'darshan').feedPct, 93.3);
  });
  test('the markdown has a row per format, or a note when there is no data', () => {
    const md = retentionSection({ end: '2026-11-23', shorts: [short('status', 10, 30, curveStats(rows, 18))] }).join('\n');
    assert.match(md, /### Retention \(Shorts feed\)/);
    assert.match(md, /\| status \| 1 \(1\) \|/);
    assert.match(retentionSection({ shorts: [], note: 'Retention report failed: x' }).join('\n'), /failed: x/);
  });
});
