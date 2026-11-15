// node --test scripts/viral-radar.test.mjs  (Viral Radar: the viral filter, quota budget, classifier, analysis checks)
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  analysisProblems, classify, rescoreDay, strongOf, COPY_MAX, median, medianBudget, modeFor, overlap, QUERIES, queriesFor, quotaUnits, RADAR_CAP,
  reuploadSignals, SEARCHES, seconds, THRESH, viralCheck, weeklyPlan, workingLines,
} from './viral-radar.mjs';

test('median of a channel\'s recent Shorts', () => {
  assert.equal(median([]), null);
  assert.equal(median([5, 1, 3]), 3);
  assert.equal(median([1, 2, 3, 10]), 2.5);
  assert.equal(seconds('PT1M5S'), 65);
  assert.equal(seconds('PT59S'), 59);
  assert.equal(seconds('P0D'), 0);
});

test('viral = absolute threshold AND 5x the channel median (with 3+ other Shorts)', () => {
  // 1.46 crore on a channel whose other "why" Shorts get 8-31k: viral
  assert.equal(viralCheck({ views: 14600000, ageDays: 6 }, median([8000, 12000, 31000, 15000]), 4).viral, true);
  // big channel, 3 lakh against a 2 lakh median: a normal day for them, not an outlier
  const big = viralCheck({ views: 300000, ageDays: 5 }, 200000, 30);
  assert.equal(big.viral, false);
  assert.match(big.why.join(' '), /1\.5x the channel median/);
  // exactly 5x passes, just under fails
  assert.equal(viralCheck({ views: 100000, ageDays: 5 }, 20000, 10).viral, true);
  assert.equal(viralCheck({ views: 99999, ageDays: 5 }, 10000, 10).viral, false, 'under 100k after 3 days');
  // fast: 30k within 3 days counts, 30k after 4 days does not
  assert.equal(viralCheck({ views: 30000, ageDays: 2.5 }, 1000, 10).viral, true);
  assert.equal(viralCheck({ views: 30000, ageDays: 4 }, 1000, 10).viral, false);
  // a lottery one-off on a channel with too few Shorts for a median
  const lone = viralCheck({ views: 500000, ageDays: 5 }, 100, 2);
  assert.equal(lone.viral, false);
  assert.match(lone.why.join(' '), /only 2 other Shorts/);
  assert.equal(THRESH.multiple, 5);
  assert.equal(THRESH.views, 100000);
});

test('likely reuploads: two signals of tiny / new channel, random topics, spammy title', () => {
  const now = Date.parse('2026-11-15T12:00:00Z');
  const devotional = ['जय श्री राम', 'महादेव की कथा', 'खाटू श्याम भजन', 'हनुमान चालीसा', 'राधा कृष्ण'];
  const random = ['funny cat', 'cricket highlights', 'prank video', 'movie scene', 'jai mahadev'];
  assert.deepEqual(reuploadSignals({ views: 2e6, title: 'महादेव' }, { subs: 50000, titles: devotional, created: '2020-01-01T00:00:00Z' }, now), { signals: [], likely: false, offTopic: false });
  const r = reuploadSignals({ views: 2e6, title: 'Mahadev #viral' }, { subs: 300, titles: random, created: '2026-10-20T00:00:00Z' }, now);
  assert.deepEqual(r.signals, ['tiny channel', 'new channel', 'random topics', 'spammy title']);
  assert.equal(r.likely, true);
  assert.deepEqual(reuploadSignals({ views: 5e6, title: 'x' }, { subs: 10000, titles: devotional }, now).signals, ['views far beyond subscribers']);
  assert.equal(reuploadSignals({ views: 5e6, title: 'x' }, { subs: 10000, titles: devotional }, now).likely, false, 'one signal is not enough');
  // off topic: a vlog / fun / kids channel or random topics is not counted even with one signal
  const fam = reuploadSignals({ views: 6e6, title: 'Mata Rani', channel: 'The Family Funny' }, { subs: 156000, dev_share: { n: 20, share: 0.6 } }, now);
  assert.deepEqual([fam.signals, fam.likely, fam.offTopic], [['non-devotional channel'], false, true]);
  // the channel cache keeps only the devotional share, not other channels' titles
  assert.deepEqual(reuploadSignals({ views: 2e6, title: 'x' }, { subs: 50000, dev_share: { n: 10, share: 0.2 } }, now).signals, ['random topics']);
});

test('quota: at most 8 searches a day, the radar under its 900-unit cap, ~2,100 units a week', () => {
  assert.equal(SEARCHES.sweep, 8);
  assert.ok(SEARCHES.daily <= 3);
  assert.equal(quotaUnits({ searches: 8 }), 800);
  assert.equal(quotaUnits({ searches: 2, videoIds: 100, channels: 51, medianChannels: 4 }), 200 + 2 + 2 + 8);
  const p = weeklyPlan();
  assert.ok(p.sweep <= RADAR_CAP && p.daily <= RADAR_CAP, JSON.stringify(p));
  assert.ok(p.week <= 2500, JSON.stringify(p));
  assert.equal(medianBudget(814), 43);
  assert.equal(medianBudget(950), 0);
});

test('queries: sweep = festivals + base (Khatu always), daily = 2 rotating; a week covers every base query', () => {
  const fest = [{ date: '2026-11-20', tier: 'big', key: 'khatu-shyam-janmotsav', names: [{ hi: 'श्याम बाबा जन्मोत्सव' }] },
    { date: '2026-12-30', tier: 'big', key: 'far', names: [{ hi: 'दूर' }] }, { date: '2026-11-18', tier: 'info', key: 'x', names: [{ hi: 'जानकारी' }] }];
  const sweep = queriesFor('2026-11-16', 'sweep', fest);
  assert.equal(sweep.length, 8);
  assert.equal(sweep[0], 'श्याम बाबा जन्मोत्सव');
  assert.ok(!sweep.includes('दूर') && !sweep.includes('जानकारी'), 'only status/big festivals of the next 10 days');
  assert.ok(sweep.includes('खाटू श्याम'));
  const seen = new Set(sweep);
  for (let d = 17; d <= 22; d++) {
    const q = queriesFor(`2026-11-${d}`, 'daily', fest);
    assert.equal(q.length, 2);
    q.forEach((x) => seen.add(x));
  }
  for (const q of QUERIES) assert.ok(seen.has(q), `week covers ${q}`);
});

test('sweep on Mondays, or the first run after a missed sweep', () => {
  assert.equal(modeFor('2026-11-16', []), 'sweep'); // Monday
  assert.equal(modeFor('2026-11-17', [{ date: '2026-11-16', mode: 'sweep' }]), 'daily');
  assert.equal(modeFor('2026-11-18', [{ date: '2026-11-10', mode: 'sweep' }]), 'sweep', 'missed Monday');
});

test('classifier: hook types incl. वर्जित क्यों, Kaliyug connection, sant chamatkar, series, जब, फिर जो किया', () => {
  assert.equal(classify('श्री गणेश की पूजा में तुलसी क्यों है वर्जित? जानिए पौराणिक रहस्य', 60).hook, 'varjit');
  assert.equal(classify('Duryodhana is an Avatar of Kali purush? Pandav will return in kaliyug?', 120).hook, 'kaliyug');
  assert.equal(classify('🚩जब गुरु गोरखनाथ के गुस्से से सूख गई गंगा! देखिए चमत्कार। 🙏 #Gorakhnath #Gogaji', 50).hook, 'chamatkar');
  assert.ok(classify('🚩जब गुरु गोरखनाथ के गुस्से से सूख गई गंगा! देखिए चमत्कार।', 50).hooks.includes('jab'));
  const s = classify('जहाँ थी सुदामा की झोपड़ी, वहाँ खड़ा था भव्य महल! 😱 🙏 सुदामा कथा पार्ट 4', 141);
  assert.deepEqual([s.hook, s.format, s.deity, s.length], ['series', 'series', 'krishna', '121-180 s']);
  assert.equal(classify('😱 ठंड में माता पार्वती का अर्घ्य! फिर महादेव ने जो किया… 🔱❤️ | Mahadev Parvati', 60).hook, 'phir-jo-kiya');
  assert.equal(classify('😱 ठंड में माता पार्वती का अर्घ्य! फिर महादेव ने जो किया…', 60).format, 'kailash');
  assert.equal(classify('Brahmastra was a Nuclear Bomb?', 60).hook, 'modern-question');
  assert.equal(classify('रावण को हराने वाले 4 योद्धा', 50).hook, 'listicle');
  assert.equal(classify('Jabalpur ka mandir', 30).hook, 'name', '"Jab" only as a word');
  assert.equal(classify('x', 25).length, '<=30 s');
  assert.equal(classify('What Are Elephants Doing on Kumbhakarna 😱?', 35).hook, 'strange-visual');
  assert.equal(classify('कुंभकर्ण पर हाथी क्या कर रहे हैं? 😱', 35).hook, 'strange-visual');
});

test('analysis check: enums, our own words (no copied titles), idea schema, per-bank limits', () => {
  const pending = { items: [{ id: 'abc', title: 'श्री गणेश की पूजा में तुलसी क्यों है वर्जित? जानिए पौराणिक रहस्य' }] };
  const good = { hook_type: 'varjit', hooks: ['varjit', 'kyon'], format: 'facts', deity: 'ganesh', art_style: 'cinematic', topic: 'Ganesh and Tulsi', cover_style: 'close-up, 3 text bands' };
  assert.deepEqual(analysisProblems({ items: { abc: good }, ideas: [] }, pending), []);
  assert.ok(analysisProblems({ items: { abc: { ...good, hook_type: 'clickbait' } } }, pending).some((e) => /hook_type/.test(e)));
  assert.ok(analysisProblems({ items: { abc: { ...good, art_style: 'pixar' } } }, pending).some((e) => /art_style/.test(e)));
  const idea = { bank: 'facts', id: 'radar-test-durva-ganesh', p: 2, deity: 'ganesh', name: 'Ganesh ji aur durva', playlist: 'Ganesh ji ki Kathayein', label: 'scripture',
    hook: 'Ganesh ji ko durva kyun priya?', hook_hi: 'गणेश जी को दूर्वा क्यों प्रिय है?', angle: 'The Analasura story and why durva is offered; to verify in the Purana before use.',
    cite: { work: 'TODO: verify', ref: 'TODO: verify' }, sources: [], keywords: ['durva'], from: { source: 'viral-radar', refs: ['https://youtube.com/shorts/abc'] } };
  assert.deepEqual(analysisProblems({ items: {}, ideas: [idea] }, pending), []);
  const copy = { ...idea, id: 'radar-test-copy', hook: 'Ganesh puja Tulsi varjit', hook_hi: 'श्री गणेश की पूजा में तुलसी क्यों है वर्जित?' };
  assert.ok(analysisProblems({ ideas: [copy] }, pending).some((e) => /too close to a reference title/.test(e)));
  assert.ok(overlap('श्री गणेश की पूजा में तुलसी क्यों है वर्जित?', pending.items[0].title) >= COPY_MAX);
  assert.ok(analysisProblems({ ideas: [{ ...idea, hook: 'Ganesh ji ko durva kyun priya hai, aur kya kehte hain shastra?' }] }, pending).some((e) => /hook Roman, max 38/.test(e)));
  const many = Array.from({ length: 5 }, (_, i) => ({ ...idea, id: `radar-test-${i}`, keywords: [`k${i}`] }));
  assert.ok(analysisProblems({ ideas: many }, pending).some((e) => /at most 4 facts/.test(e)));
  assert.ok(analysisProblems({ ideas: [{ ...idea, id: 'khatu-baba-ke-naam' }] }, pending).some((e) => /duplicate id/.test(e)), 'an id already in a bank');
});

test('what\'s working lines for the Monday growth report', () => {
  const files = [{ date: '2026-11-15', viral: [{ id: 'a', title: 'गणेश तुलसी क्यों वर्जित', url: 'u', views: 1460000, multiple: 50, heuristic: { length: '31-60 s' }, analysis: { hook_type: 'varjit', format: 'facts', deity: 'ganesh', art_style: 'cinematic' } }], ideas_added: ['facts:x'] }];
  const l = workingLines(files, '2026-11-16').join('\n');
  assert.match(l, /1 truly viral/);
  assert.match(l, /वर्जित क्यों/);
  assert.match(l, /facts:x/);
  assert.match(workingLines([], '2026-11-16')[0], /no truly viral/);
});

test('strong channels: one per channel, no signals; rescore re-applies the filter without API calls', () => {
  const r = (id, ch, views, extra = {}) => ({ id, channelId: ch, channel: ch, views, viral: false, strong_channel: true, reupload: [], ...extra });
  const s = strongOf([r('a', 'c1', 9e5), r('b', 'c1', 8e5), r('c', 'c2', 7e5), r('d', 'c3', 6e5, { reupload: ['non-devotional channel'] })]);
  assert.deepEqual(s.map((x) => x.id), ['a', 'c']);
  const day = { date: '2026-11-15', counts: {}, reuploads: [], strong: [],
    viral: [{ id: 'v1', title: 'माता रानी', channel: 'The kids fun', channelId: 'k', views: 7e6, ageDays: 5, subs: 11600, median: 8e4, n_shorts: 20, multiple: 87, seconds: 6 },
      { id: 'v2', title: 'माँ दुर्गा प्रकट', channel: 'BhaktiVerse 3D', channelId: 'b', views: 3.2e6, ageDays: 6, subs: 36100, median: 1700, n_shorts: 20, multiple: 1855, seconds: 44 }] };
  const out = rescoreDay(day, { k: { dev_share: { n: 20, share: 1 } }, b: { dev_share: { n: 20, share: 0.85 } } });
  assert.deepEqual(out.viral.map((x) => x.id), ['v2']);
  assert.ok(out.reuploads.some((x) => x.id === 'v1'));
});
