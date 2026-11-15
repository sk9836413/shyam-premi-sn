// node --test scripts/kailash-rules.test.mjs   ("Kailash Parivar" validator rules, STORY.md section 9)
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { checkKailashSpec, nameVoiceProblems, coverProblems, descriptionProblems, lineSeconds, loadContext, titleProblems, toneProblems } from './kailash-rules.mjs';

const pilot = JSON.parse(fs.readFileSync('story/kailash/pilot-ep1.json', 'utf8'));
const ctx = { ...loadContext('.'), hasPortrait: () => true };
const clone = (o) => JSON.parse(JSON.stringify(o));
const run = (s, c = ctx) => checkKailashSpec(s, c).problems;
const has = (ps, re) => ps.some((p) => re.test(p));

describe('pilot spec', () => {
  test('passes every rule, 55-75 s and 10-16 lines', () => {
    const r = checkKailashSpec(pilot, ctx);
    assert.deepEqual(r.problems, []);
    assert.ok(r.seconds >= 55 && r.seconds <= 75, `${r.seconds}`);
    assert.ok(r.lines >= 10 && r.lines <= 16);
  });
  test('a missing master portrait fails', () => {
    assert.ok(has(run(pilot, { ...ctx, hasPortrait: (c) => c !== 'narad' }), /narad.*no master portrait/));
  });
});

describe('title formula', () => {
  test('accepts the formula and its verbs', () => {
    assert.deepEqual(titleProblems('😱 एक फल पर दो भाइयों में होड़! फिर महादेव ने जो किया… 🔱❤️ | Mahadev Parvati'), []);
    assert.deepEqual(titleProblems('😱 गणेश जी को तुलसी क्यों नहीं चढ़ती? फिर माता पार्वती ने जो बताया… 🔱❤️ | Mahadev Parvati'), []);
    assert.deepEqual(titleProblems('😱 नन्हा मूषक बना सवारी! फिर जो हुआ… 🔱❤️ | Mahadev Parvati'), []);
  });
  test('rejects other shapes and over-long titles', () => {
    assert.equal(titleProblems('Mahadev Parvati ki kahani | महादेव #Shorts').length, 1);
    assert.equal(titleProblems('😱 एक फल पर होड़! फिर महादेव ने जो किया 🔱❤️ | Mahadev Parvati').length, 1); // no ellipsis
    assert.equal(titleProblems('एक फल पर होड़! फिर महादेव ने जो किया… 🔱❤️ | Mahadev Parvati').length, 1); // no emoji first
    assert.ok(has(titleProblems(`😱 ${'बहुत '.repeat(18)}! फिर महादेव ने जो किया… 🔱❤️ | Mahadev Parvati`), /max 100/));
  });
});

describe('cover frame', () => {
  test('2-4 Devanagari words, max 24 characters', () => {
    assert.deepEqual(coverProblems('एक फल, दो भाई'), []);
    assert.equal(coverProblems('नीलकंठ').length, 1);
    assert.equal(coverProblems('Ek phal do bhai').length, 1);
    assert.equal(coverProblems('एक बहुत लंबा कवर जो पढ़ा नहीं जाएगा').length, 1);
  });
});

describe('tone rules (hard)', () => {
  const said = (tts, sub = 'x') => ({ scenes: [{ prompt: 'p', lines: [{ who: 'mahadev', tts, sub }] }] });
  test('no bhang or intoxication, even as a joke', () => {
    assert.ok(has(toneProblems(said('महादेव ने भांग पी ली')), /intoxication/));
    assert.ok(has(toneProblems(said('x', 'Bholenath ka bhang wala mood')), /intoxication/));
    assert.ok(has(toneProblems(said('x', 'chillum ka dhuan')), /intoxication/));
    assert.deepEqual(toneProblems(said('x', 'Shri Ram ne dhanush-bhang kiya')), []); // bhang = "toda", not the drink
  });
  test('no mocking, romance, vulgarity, violence, politics', () => {
    assert.ok(has(toneProblems(said('गणेश जी तो बुद्धू हैं')), /mock/));
    assert.ok(has(toneProblems(said('x', 'Mahadev ne Parvati ko kiss kiya')), /romance/));
    assert.ok(has(toneProblems(said('x', 'item song')), /vulgar/));
    assert.ok(has(toneProblems(said('असुर का सिर काट दिया')), /violence/));
    assert.ok(has(toneProblems(said('x', 'election ki baat')), /politics/));
  });
  test('Devanagari words that only contain a banned piece are fine (कैलाश is not लाश)', () => {
    assert.deepEqual(toneProblems(said('कैलाश पर बर्फ़ गिरी, दर्शन हुए')), []);
  });
  test("never the reference channel's plots", () => {
    assert.ok(has(toneProblems({ youtube_title: '😱 पार्वती मायके गईं! फिर महादेव ने जो किया… 🔱❤️ | Mahadev Parvati' }), /original stories/));
    assert.ok(has(toneProblems({ summary: 'Mahadev ne Parvati ko rulaya' }), /original stories/));
  });
  test('the pilot with an intoxication joke fails as a whole spec', () => {
    const s = clone(pilot);
    s.scenes[2].lines[0].sub = 'Mushak ji ne bhang ke laddoo kha liye!';
    assert.ok(has(run(s), /intoxication/));
  });
});

describe('description: source or fiction label, synthetic media', () => {
  test('fictional episodes say "काल्पनिक प्रस्तुति / भक्तिभाव से बनाई गई कहानी"', () => {
    const s = { ...clone(pilot), story_type: 'fictional' };
    assert.ok(has(descriptionProblems(s), /काल्पनिक प्रस्तुति/));
    s.youtube_description += '\nकाल्पनिक प्रस्तुति / भक्तिभाव से बनाई गई कहानी';
    assert.ok(!has(descriptionProblems(s), /काल्पनिक/));
  });
  test('scripture episodes cite the source in the description', () => {
    const s = clone(pilot);
    s.youtube_description = s.youtube_description.replace(/Katha ka strot:[^\n]*\n/, '');
    assert.ok(has(descriptionProblems(s), /source line/));
  });
  test('the AI (synthetic media) line is required, EpiFive never appears', () => {
    const s = clone(pilot);
    s.youtube_description = s.youtube_description.replace(/Chitra, awaaz[^\n]*\n/, '');
    assert.ok(has(descriptionProblems(s), /synthetic-media/));
    s.youtube_description += '\nepifive.com';
    assert.ok(has(descriptionProblems(s), /EpiFive/));
  });
  test('scripture/parampara needs facts with 2 URLs each', () => {
    const s = clone(pilot);
    s.facts[0].sources = ['https://example.org/a'];
    assert.ok(has(run(s), /fact 1: a claim and 2 independent source URLs/));
  });
});

describe('length, lines, hook, endcard, names', () => {
  test('too short an episode fails (55-75 s, 10-16 lines)', () => {
    const s = clone(pilot);
    s.scenes = s.scenes.slice(0, 3);
    const ps = run(s);
    assert.ok(has(ps, /estimated length/));
    assert.ok(has(ps, /spoken lines/));
  });
  test('a greeting as the hook fails', () => {
    const s = clone(pilot);
    s.scenes[0].lines[0] = { who: 'narad', tts: 'नमस्ते भक्तों, आज सुनिए एक कथा', sub: 'Namaste bhakto, aaj suniye ek katha' };
    assert.ok(has(run(s), /hook/));
  });
  test('the endcard asks for Like and Subscribe', () => {
    const s = clone(pilot);
    s.endcard.sub = 'Mata-pita ki seva hi sabse badi parikrama hai.';
    assert.ok(has(run(s), /Like and Subscribe/));
  });
  test('a spoken deity name must be in names (Whisper gate)', () => {
    const s = clone(pilot);
    s.names = s.names.filter((n) => n !== 'महादेव');
    assert.ok(has(run(s), /names: add "महादेव"/));
  });
  test('episode_id must be in the bank; festival episodes air in their window', () => {
    const s = clone(pilot);
    s.episode_id = 'not-in-bank';
    assert.ok(has(run(s), /episode_id/));
    const f = { ...clone(pilot), release: '2026-12-30', slug: '2026-12-30-kailash-x', episode_id: 'dev-deepawali-tripurari' };
    assert.ok(has(run(f, { ...ctx, planned: () => true }), /release within 2026-11-22\.\.2026-11-24/));
  });
  test('a release day that is not a kailash day fails', () => {
    const s = { ...clone(pilot), release: '2026-11-18', slug: '2026-11-18-kailash-parikrama' };
    assert.ok(has(run(s, { ...ctx, planned: () => false }), /kailash day/));
  });
  test('speaking-time estimate scales with the voice rate', () => {
    assert.ok(lineSeconds('क'.repeat(40), { edge: 'hi-IN-MadhurNeural', rate: '-14%' }) > lineSeconds('क'.repeat(40), { edge: 'hi-IN-MadhurNeural', rate: '+0%' }));
    assert.ok(lineSeconds('क'.repeat(40), { edge: 'hi-IN-SwaraNeural' }) > lineSeconds('क'.repeat(40), { edge: 'hi-IN-MadhurNeural' }));
  });
});

describe('episode bank (automation/kailash-episodes.json)', () => {
  const bank = JSON.parse(fs.readFileSync('automation/kailash-episodes.json', 'utf8'));
  test('40+ unique ideas, waiting for the owner (approved: false until the pilot is approved)', () => {
    assert.ok(bank.episodes.length >= 40);
    assert.equal(new Set(bank.episodes.map((e) => e.id)).size, bank.episodes.length);
    assert.equal(typeof bank.approved, 'boolean');
  });
  test('every idea: title formula, cover, tone, cast in the library, a source unless fictional', () => {
    for (const e of bank.episodes) {
      assert.deepEqual([...titleProblems(e.title), ...coverProblems(e.cover), ...toneProblems({ title: e.title, summary: `${e.premise} ${e.resolution}`, moral: e.moral })], [], e.id);
      for (const c of e.cast) assert.ok(ctx.lib[c], `${e.id}: ${c}`);
      assert.ok(e.cast.includes(e.lead), e.id);
      assert.ok(['scripture', 'parampara', 'fictional'].includes(e.story_type), e.id);
      if (e.story_type !== 'fictional') assert.ok((e.source || '').length >= 20, `${e.id}: source`);
    }
  });
  test('festival ideas point at calendar festivals with a window', () => {
    const fest = JSON.parse(fs.readFileSync('automation/festivals.json', 'utf8'));
    const keys = new Set((fest.festivals || fest).map((f) => f.key));
    for (const e of bank.episodes.filter((x) => x.kind === 'festival')) {
      assert.ok(keys.has(e.festival), `${e.id}: ${e.festival}`);
      assert.ok(Array.isArray(e.window) && e.window[0] <= e.window[1], e.id);
    }
  });
});

describe('schedule helpers (scripts/kailash-plan.mjs)', async () => {
  const { kailashCandidate, kailashInputs, makeRoomForKailash, pickEpisode, usedIds } = await import('./kailash-plan.mjs');
  const fest = JSON.parse(fs.readFileSync('automation/festivals.json', 'utf8'));
  const list = fest.festivals || fest;
  test('off until the owner approves the pilot; KAILASH=off pauses it', () => {
    const bank = JSON.parse(fs.readFileSync('automation/kailash-episodes.json', 'utf8'));
    assert.equal(kailashInputs('.', list, '', {}).kailash, bank.approved === true);
    assert.equal(kailashInputs('.', list, '', { KAILASH: 'off' }).kailash, false);
  });
  test('Mon/Thu/Sat only, never on movie or override days; a logged episode always counts', () => {
    const inputs = { kailash: true, kailashLogged: new Set(['2026-11-24']), kailashTieIns: new Map() };
    assert.ok(kailashCandidate('2026-11-23', inputs, { wd: 1 }));
    assert.equal(kailashCandidate('2026-11-25', inputs, { wd: 3 }), null);
    assert.equal(kailashCandidate('2026-11-19', inputs, { wd: 4, movie: 'khatu part 3' }), null);
    assert.equal(kailashCandidate('2026-11-16', inputs, { wd: 1, override: { slots: {} } }), null);
    assert.ok(kailashCandidate('2026-11-24', { kailash: false, kailashLogged: inputs.kailashLogged }, { wd: 2 }).logged);
  });
  test('under the cap it replaces the weekday day-status morning Short, never status or the evening darshan', () => {
    const P = { status: 1, eve: 1, morning: 2, evening: 3, facts: 3.5, kailash: 3.6, kalyug: 4 };
    const rank = (c) => c.rank ?? P[c.slot];
    const cands = [{ slot: 'eve' }, { slot: 'morning', kind: 'daystatus', theme: 1 }, { slot: 'evening', kind: 'temple' }, { slot: 'facts' }, { slot: 'kailash' }];
    makeRoomForKailash(cands, 3, rank);
    const kept = [...cands].sort((a, b) => rank(a) - rank(b)).slice(0, 3).map((c) => c.slot);
    assert.deepEqual(kept.sort(), ['eve', 'evening', 'kailash']);
    const gyaras = [{ slot: 'status' }, { slot: 'morning', kind: 'daystatus', theme: 'gyaras' }, { slot: 'evening' }, { slot: 'kailash' }];
    makeRoomForKailash(gyaras, 3, rank);
    assert.ok(gyaras.some((c) => c.slot === 'morning')); // the Khatu Gyaras status Short stays
  });
  test('3-4 a week: at most one extra festival tie-in day per week, never a big festival', () => {
    const k = kailashInputs('.', list, '', {});
    const extra = [...k.kailashTieIns.keys()].filter((d) => ![1, 4, 6].includes(new Date(`${d}T12:00:00Z`).getUTCDay()));
    const weeks = extra.map((d) => { const t = Date.parse(`${d}T12:00:00Z`); return new Date(t - ((new Date(t).getUTCDay() + 6) % 7) * 864e5).toISOString().slice(0, 10); });
    assert.equal(new Set(weeks).size, weeks.length);
    const big = new Set(list.filter((f) => f.tier === 'big').map((f) => f.date));
    assert.ok(extra.every((d) => !big.has(d)));
  });
  test('idea picking: the biggest festival in its window, else the next evergreen; used ids are skipped', () => {
    const bank = JSON.parse(fs.readFileSync('automation/kailash-episodes.json', 'utf8'));
    assert.equal(pickEpisode('2026-11-23', bank).id, 'dev-deepawali-tripurari');
    assert.equal(pickEpisode('2026-11-21', bank, new Set(), 'tulsi-ganesh-kyun-nahi').id, 'tulsi-ganesh-kyun-nahi');
    const ever = pickEpisode('2026-12-10', bank);
    assert.equal(ever.kind, 'evergreen');
    assert.notEqual(ever.id, 'parikrama-gyan-phal'); // the pilot is never re-made
    const used = usedIds('2026-12-10 | kailash | 2026-12-10-kailash-parvati-tapasya | Parvati | x\n', [], bank);
    assert.ok(used.has('parvati-tapasya'));
    assert.notEqual(pickEpisode('2026-12-12', bank, used).id, 'parvati-tapasya');
  });
});

describe('names Whisper mishears in some voices (measured; the gate itself is never loosened)', () => {
  test('गणेश only in the Swara voice; कार्तिकेय / स्कंद / गणपति never spoken', () => {
    const lib = ctx.lib;
    assert.deepEqual(nameVoiceProblems([{ who: 'parvati', tts: 'मेरे गणेश ने कहा।' }], lib), []);
    assert.equal(nameVoiceProblems([{ who: 'mahadev', tts: 'सच कहा, गणेश।' }], lib).length, 1);
    assert.equal(nameVoiceProblems([{ who: 'parvati', tts: 'कार्तिकेय, आओ।' }], lib).length, 1);
    assert.equal(nameVoiceProblems([{ who: 'mushak', tts: 'गणपति बप्पा!' }], lib).length, 1);
    assert.deepEqual(nameVoiceProblems([{ who: 'mahadev', tts: 'गजानन, तुमने ठीक कहा।' }], lib), []);
  });
  test('the rule is part of the spec check', () => {
    const s = clone(pilot);
    s.scenes[3].lines[2].tts = 'सच कहा, गणेश। यह ज्ञान-फल तुम्हारा हुआ।';
    assert.ok(has(run(s), /गजानन/));
  });
});
