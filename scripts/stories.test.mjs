// Story plan, caps and dedupe of scripts/stories.mjs (no network). Run: node --test scripts/stories.test.mjs
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { CAP, MIN_GAP, VIDEO_MAX, dayPlan, expectedTiers, istAt, nextDue, pickShort, platformNeed, shortsOf, storyHtml, storyVideoArgs, tierOf, used } from './stories.mjs';

const D = '2026-11-14';
const at = (h) => istAt(D, h);
const img = (n) => `https://media.example/m/photo-${D}-${n}-1.jpg`;
const photos = (kinds) => ({ date: D, posts: kinds.map((kind, i) => ({ n: i + 1, kind, images: [img(i + 1)] })) });
const NORMAL = photos(['darshan', 'vichar', 'facts', 'aarti']);
const CHHATH = photos(['festival', 'festival', 'facts', 'festival']);
const PUB = [
  `- ${D}-status-chhath-kharna | claim: ${D} status by run 1.1 at 2026-11-13T13:00:00.000Z`,
  `- ${D}-status-chhath-kharna | youtube: https://youtube.com/shorts/aaa (public at 2026-11-13T19:00:00.000Z) | status video`,
  `- ${D}-morning-chhath-kharna-geet | youtube: https://youtube.com/shorts/bbb | social: fb: x`,
  `- ${D}-evening-salasar-darshan | youtube: https://youtube.com/shorts/ccc (public at ${new Date(at('19:00')).toISOString()})`,
  `- ${D}-long-chhath-kharna-katha | youtube: https://youtu.be/ddd (public at 12:30 IST) | long 6:00`,
  `- 2026-11-13-bhajan-chhath-nahay-khay-geet | youtube: https://youtube.com/shorts/eee (public at 2026-11-13T14:15:00.000Z)`,
  `- ${D}-status-chhath-kharna | instagram: https://www.instagram.com/reel/x/`,
].join('\n');

describe('which Short becomes the video story', () => {
  test('tiers: status > bhajan/eve > morning > evening; long/noon/kalyug/movie never', () => {
    assert.equal(tierOf(`${D}-status-x`), 1);
    assert.equal(tierOf(`${D}-statusday-x`), 1);
    assert.equal(tierOf(`${D}-bhajan-x`), 2);
    assert.equal(tierOf(`${D}-morning-chhath-kharna-geet`), 2);
    assert.equal(tierOf(`${D}-eve-x`), 2);
    assert.equal(tierOf(`${D}-morning-x`), 3);
    assert.equal(tierOf(`${D}-evening-x`), 4);
    for (const s of ['long', 'noon', 'kalyug', 'movie', 'jukebox', 'mantra']) assert.equal(tierOf(`${D}-${s}-x`), null, s);
  });
  test('only today\'s YouTube lines, best first, public times read', () => {
    const s = shortsOf(PUB, D);
    assert.deepEqual(s.map((x) => x.slug), [`${D}-status-chhath-kharna`, `${D}-morning-chhath-kharna-geet`, `${D}-evening-salasar-darshan`]);
    assert.equal(s[0].public, Date.parse('2026-11-13T19:00:00.000Z'));
    assert.equal(s[2].public, at('19:00'));
  });
  test('waits for a better Short day-plan still expects, then gives up at its deadline', () => {
    const morning = [{ slug: `${D}-morning-x`, tier: 3, public: at('10:00') }];
    const exp = expectedTiers([{ slot: 'morning' }, { slot: 'bhajan', kind: 'bhajan' }], D);
    assert.equal(pickShort(morning, exp, at('10:30')), null);
    assert.equal(pickShort(morning, exp, at('21:31')).slug, `${D}-morning-x`);
    assert.equal(pickShort(morning, [], at('10:30')).slug, `${D}-morning-x`);
    assert.equal(pickShort(morning, [], at('09:00')), null, 'not public yet');
  });
});

describe('daily plan', () => {
  test('normal day: morning darshan 06:45, video, evening aarti 19:30 with Hindi-first headers', () => {
    const plan = dayPlan({ date: D, photos: NORMAL, pubText: `- ${D}-morning-x | youtube: https://youtube.com/shorts/z`, now: at('11:00') });
    assert.deepEqual(plan.map((p) => p.key), ['morning', 'video', 'evening']);
    assert.equal(plan[0].from, at('06:45'));
    assert.equal(plan[0].image, img(1));
    assert.match(plan[0].head[0], /^आज के दर्शन/);
    assert.equal(plan[0].head[1], 'Jai Shree Shyam');
    assert.equal(plan[1].from, at('07:30'));
    assert.equal(plan[2].from, at('19:30'));
    assert.match(plan[2].head[0], /^संध्या आरती दर्शन/);
  });
  test('Chhath day: festival greeting in the morning, a second festival card, the status Short, at most 4', () => {
    const plan = dayPlan({ date: D, photos: CHHATH, pubText: PUB, now: at('08:00') });
    assert.deepEqual(plan.map((p) => p.key), ['morning', 'video', 'festival', 'evening']);
    assert.ok(plan.length <= CAP);
    assert.match(plan[0].head[0], /^आज का पर्व/);
    assert.equal(plan[1].slug, `${D}-status-chhath-kharna`);
    assert.equal(plan[2].image, img(2));
    assert.match(plan[3].head[0], /^शुभ संध्या/);
  });
  test('no photo state and no Short: nothing planned; nothing posts twice from the same card', () => {
    assert.deepEqual(dayPlan({ date: D, photos: null, pubText: '', now: at('12:00') }), []);
    const plan = dayPlan({ date: D, photos: CHHATH, pubText: PUB, now: at('08:00') });
    const srcs = plan.map((p) => p.image || p.slug);
    assert.equal(new Set(srcs).size, srcs.length);
  });
  test('no text on the card is bait or another brand', () => {
    const html = storyHtml({ image: '/tmp/x.jpg', head: ['आज के दर्शन 🙏', 'Jai Shree Shyam'] });
    assert.doesNotMatch(html, /epifive|share|like|subscribe|comment|follow/i);
    assert.match(html, /आज के दर्शन/);
  });
});

describe('due, caps and dedupe', () => {
  const plan = dayPlan({ date: D, photos: CHHATH, pubText: PUB, now: at('08:00') });
  const ok = (key, h) => ({ key, fb: { id: `f-${key}`, at: new Date(at(h)).toISOString() }, ig: { id: `i-${key}`, at: new Date(at(h)).toISOString() } });

  test('before 06:45 nothing; at 06:50 the morning story on both platforms', () => {
    assert.equal(nextDue({ plan, state: { stories: [] }, now: at('06:30') }).item, null);
    const d = nextDue({ plan, state: { stories: [] }, now: at('06:50') });
    assert.equal(d.item.key, 'morning');
    assert.deepEqual(d.platforms, ['fb', 'ig']);
  });
  test('a posted story is never due again (dedupe), the next one waits for the gap', () => {
    const state = { stories: [ok('morning', '06:50')] };
    assert.equal(nextDue({ plan, state, now: at('07:00') }).item, null, 'gap');
    assert.ok(MIN_GAP >= 20 * 60e3);
    assert.equal(nextDue({ plan, state, now: at('07:40') }).item.key, 'video');
  });
  test('only the platform that failed is retried, at most twice', () => {
    const state = { stories: [{ key: 'morning', fb: { id: 'f1', at: new Date(at('06:50')).toISOString() }, ig: { attempts: 1, error: 'x' } }] };
    const d = nextDue({ plan, state, now: at('07:20') });
    assert.equal(d.item.key, 'morning');
    assert.deepEqual(d.platforms, ['ig']);
    state.stories[0].ig = { attempts: 2, error: 'x', gaveUp: true };
    assert.notEqual(nextDue({ plan, state, now: at('07:20') }).item?.key, 'morning');
  });
  test('claims: a fresh claim means another run is posting (skip), a stale one is checked first (recover)', () => {
    const now = at('07:00');
    assert.equal(platformNeed({ claim: { run: '9', at: new Date(now - 5 * 60e3).toISOString() } }, now), null);
    assert.equal(platformNeed({ claim: { run: '9', at: new Date(now - 30 * 60e3).toISOString() } }, now), 'recover');
    assert.equal(platformNeed({ id: 'x' }, now), null);
    assert.equal(platformNeed({ attempts: 1, error: 'e' }, now), 'post');
    assert.equal(platformNeed(undefined, now), 'post');
  });
  test('cap: at most 4 stories per platform per day, claims included', () => {
    const now = at('22:00');
    const state = { stories: ['a', 'b', 'c'].map((k) => ok(k, '08:00')).concat([{ key: 'd', fb: { id: 'f-d', at: new Date(at('09:00')).toISOString() }, ig: { attempts: 2, error: 'x', gaveUp: true } }]) };
    assert.equal(used(state, 'fb', now), 4);
    assert.equal(used({ stories: [{ key: 'e', fb: { claim: { run: '1', at: new Date(now - 60e3).toISOString() } } }] }, 'fb', now), 1, 'a live claim counts');
    assert.equal(used(state, 'ig', now), 3);
    const big = [...plan, { key: 'extra', type: 'image', from: at('20:00'), until: at('23:30'), image: 'x', head: ['a', 'b'] }];
    const d = nextDue({ plan: big, state, now });
    assert.equal(d.item.key, 'video');
    assert.deepEqual(d.platforms, ['ig'], 'Facebook is full');
  });
  test('a window that closed is not posted late', () => {
    const d = nextDue({ plan, state: { stories: [] }, now: at('23:45') });
    assert.equal(d.item, null);
    assert.ok(d.notes.some((n) => /window closed/.test(n)));
  });
});

describe('video story copy', () => {
  test('a 75 s bhajan Short is cut to the story limit with a fade, 1080x1920 H.264 + AAC 48 kHz', () => {
    const a = storyVideoArgs('in.mp4', 'out.mp4', { seconds: 75, audio: true });
    assert.equal(a[a.indexOf('-t') + 1], String(VIDEO_MAX));
    assert.ok(VIDEO_MAX <= 60);
    assert.match(a[a.indexOf('-vf') + 1], /scale=1080:1920.*fade=t=out/);
    assert.ok(a.includes('libx264') && a.includes('48000') && a.includes('+faststart'));
  });
  test('a 22 s status Short keeps its length, no fade', () => {
    const a = storyVideoArgs('in.mp4', 'out.mp4', { seconds: 22, audio: true });
    assert.equal(a[a.indexOf('-t') + 1], '22');
    assert.doesNotMatch(a.join(' '), /fade/);
  });
});
