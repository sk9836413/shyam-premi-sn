// "One subject per day" (scripts/topics.mjs), on the real 5-9 Nov 2026 uploads. Run: node --test scripts/topics.test.mjs
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { clashes, topic } from './topics.mjs';

const v = (slug, title) => topic({ slug, title: `${title} | देवनागरी #Shorts` });
const day = [
  v('2026-11-08-status-diwali', 'Diwali Status 2026'),
  v('2026-11-08-morning-diwali-lakshmi-ganesh-puja', 'Diwali Lakshmi Puja, Shubh Diwali'),
  v('2026-11-08-long-bhai-dooj-yamraj-yamuna-katha', 'Bhai Dooj ki Kahani, Yamraj Yamuna ki Katha'),
  v('2026-11-08-evening-diwali-khatu-shyam-darshan', 'Khatu Shyam Diwali Darshan'),
  v('2026-11-07-long-govardhan-puja-katha', 'Govardhan Puja ki Katha'),
  v('2026-11-07-morning-choti-diwali-yam-deepak', 'Choti Diwali Katha, Yam Deepak'),
  v('2026-11-05-long-diwali-ram-ayodhya-vapsi', 'Diwali ki Katha: Shri Ram ki Ayodhya Vapsi'),
];

describe('one subject per day', () => {
  test('8 Nov noon "Diwali ki Katha, Lakshmi Puja" clashes with the morning "Diwali Lakshmi Puja"', () => {
    const c = clashes(v('2026-11-08-noon-diwali-lakshmi-puja-katha', 'Diwali ki Katha, Lakshmi Puja'), day);
    assert.deepEqual(c.map((x) => x.other.slug), ['2026-11-08-morning-diwali-lakshmi-ganesh-puja']);
  });
  test('a bare "Diwali ki Katha" clashes with the Diwali status Short', () => {
    assert.equal(clashes(v('2026-11-08-noon-diwali-katha', 'Diwali ki Katha'), day)[0].other.slot, 'status');
  });
  test('9 Nov noon repeats the 7 Nov long title; 7 Nov noon retells the 5 Nov long story', () => {
    assert.equal(clashes(v('2026-11-09-noon-govardhan-puja-katha', 'Govardhan Puja ki Katha'), day)[0].when, '2 days ago');
    assert.equal(clashes(v('2026-11-07-noon-diwali-ram-ayodhya-deep', 'Diwali ki Kahani'), day)[0].why, 'the same subject');
  });
  test('different angles on a festival day pass', () => {
    assert.deepEqual(clashes(v('2026-11-07-evening-choti-diwali-krishna-darshan', 'Choti Diwali Shri Krishna Darshan'), day), []);
    assert.deepEqual(clashes(v('2026-11-08-noon-diwali-kuber-katha', 'Diwali par Kuber ji ki Katha'), day), []);
  });
  test('a re-run of the same slot and older uploads are ignored', () => {
    assert.deepEqual(clashes(v('2026-11-08-morning-diwali-lakshmi-puja', 'Diwali Lakshmi Puja'), day), []);
    assert.deepEqual(clashes(v('2026-11-11-noon-govardhan-puja-katha', 'Govardhan Puja ki Katha'), day), []);
  });
});
