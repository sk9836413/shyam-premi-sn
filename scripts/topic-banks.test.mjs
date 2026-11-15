// node --test scripts/topic-banks.test.mjs  (the 15 Nov 2026 topic banks: kinds and their validator rules, ideas, series)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { checkFactsSpec, checkTopicBank, kindProblems, loadTopics, pickTopic, tooNear, topicAllowed } from './facts.mjs';
import { BANKS, bankIdeaProblems, citationFilled, ideaProblems, loadBank, promoteProblems, serializeBank, seriesOutlineProblems, SERIES_FILES } from './topic-banks.mjs';

const topics = loadTopics('.');
const clone = (x) => JSON.parse(JSON.stringify(x));
const has = (list, re) => list.some((e) => re.test(e));
const byKind = (k) => topics.filter((t) => t.kind === k);

test('the new banks are in the facts bank with real citations', () => {
  assert.deepEqual(checkTopicBank(topics), []);
  assert.ok(byKind('astra').length >= 5, 'दिव्य अस्त्र');
  assert.ok(byKind('garuda').length >= 4, 'Garuda Purana');
  assert.ok(byKind('kaliyug').length >= 8, 'कलियुग कनेक्शन');
  assert.ok(byKind('lokdevta').length >= 8, 'लोक देवता / संत चमत्कार');
  assert.ok(byKind('kaliyug').filter((t) => t.deity === 'khatu').length >= 3, 'Khatu Shyam ji = Kaliyug ke devta, 3-5 topics');
  for (const t of [...byKind('astra'), ...byKind('garuda'), ...byKind('kaliyug'), ...byKind('lokdevta')]) {
    assert.ok(!/TODO/i.test(`${t.cite.work} ${t.cite.ref}`), t.id);
    assert.ok(t.sources.length >= 1, t.id);
  }
  for (const t of byKind('garuda')) assert.match(t.cite.ref, /adhyay \d/, t.id);
  for (const t of byKind('lokdevta')) assert.ok(['tradition', 'temple'].includes(t.label), t.id);
  // the Khatu Kaliyug topics come first among the Khatu topics (priority from the Janmotsav week)
  assert.equal(topics.findIndex((t) => t.kind === 'kaliyug' && t.deity === 'khatu'), 1);
});

test('kind rules: astra (modern interpretation, never "proven"), garuda (no fear, good karma), kaliyug (no dates), lokdevta (labelled)', () => {
  const astra = clone(topics.find((t) => t.id === 'astra-brahmastra-parmanu'));
  assert.deepEqual(kindProblems(astra), []);
  assert.ok(has(kindProblems({ ...astra, angle: 'Sauptika Parva: the brahmashira and Arjuna, Narada and Vyasa between the weapons.' }), /modern interpretation/));
  assert.ok(has(kindProblems({ ...astra, hook: 'Brahmastra proven nuclear bomb' }), /proven/));
  assert.ok(has(kindProblems({ ...astra, hook_hi: 'वैज्ञानिकों ने माना ब्रह्मास्त्र परमाणु बम था' }), /proven/));
  assert.deepEqual(kindProblems({ ...astra, angle: `${astra.angle} It is not proven.` }), [], '"not proven" is fine');
  const garuda = clone(byKind('garuda')[0]);
  assert.deepEqual(kindProblems(garuda), []);
  assert.ok(has(kindProblems({ ...garuda, hook_hi: 'यमलोक की डरावनी सज़ा' }), /fear/));
  assert.ok(has(kindProblems({ ...garuda, angle: 'Only the punishments, one by one, in detail.' }), /good-karma/));
  assert.ok(has(kindProblems({ ...garuda, cite: { work: 'Garuda Purana', ref: 'Pretakhand' } }), /chapter/));
  const kali = clone(topics.find((t) => t.id === 'kaliyug-kalki-shambhal'));
  assert.deepEqual(kindProblems(kali), []);
  assert.ok(has(kindProblems({ ...kali, hook: 'Kalki avtaar 2032 mein?', numbers_ok: ['2032'] }), /no doomsday/));
  assert.ok(has(kindProblems({ ...kali, hook_hi: 'कलियुग कब खत्म होगा?' }), /no doomsday/));
  const lok = clone(byKind('lokdevta')[0]);
  assert.ok(has(kindProblems({ ...lok, label: 'scripture' }), /lokdevta: label/));
  assert.ok(has(kindProblems({ ...lok, hook_hi: 'गोगाजी के दर्शन से साँप का ज़हर उतर जाता है' }), /cure/));
  assert.ok(has(kindProblems({ ...lok, kind: 'magic' }), /kind:/));
});

test('picker: ideas never picked; months, boost and avoid_near respected', () => {
  const t = clone(topics.find((x) => x.id === 'lok-gogaji-gorakh-vardan'));
  assert.equal(topicAllowed(t, '2027-08-20', {}), true);
  assert.equal(topicAllowed(t, '2026-12-02', {}), false, 'only in the mela months');
  assert.equal(topicAllowed({ ...t, months: undefined, status: 'idea' }, '2027-08-20', {}), false, 'an idea is never picked');
  // Ganesh-Tulsi: the top pick in its boost week, and never within 2 days of the Kailash episode on the same subject
  const gt = topics.find((x) => x.id === 'jigyasa-ganesh-tulsi-varjit');
  assert.equal(pickTopic('2026-11-25', { topics, history: [{ date: '2026-11-17', variant: 'story', topic: 'khatu-baba-ke-naam' }], log: '' }).topic.id, gt.id);
  assert.equal(tooNear(gt, '2026-11-23', '2026-11-21 | kailash | 2026-11-21-kailash-tulsi-ganesh-kyun-nahi | Parvati | x\n'), true);
  assert.equal(tooNear(gt, '2026-11-25', '2026-11-21 | kailash | 2026-11-21-kailash-tulsi-ganesh-kyun-nahi | Parvati | x\n'), false);
  assert.equal(tooNear(gt, '2026-11-26', '2026-11-25 | kailash | 2026-11-25-kailash-tulsi-ganesh-kyun-nahi | P | x\n'), true, 'also when the Kailash episode moves');
  assert.equal(topicAllowed(gt, '2026-11-20', {}), false, 'not before 24 Nov');
});

test('spec rules of the kinds (checkFactsSpec)', () => {
  const pilot = JSON.parse(fs.readFileSync('story/facts/2026-11-17-khatu-baba-ke-naam.json', 'utf8'));
  const base = checkFactsSpec(pilot, { topics });
  // every facts Short: no "proven" claims, no cure promises
  const p1 = clone(pilot); p1.scenes[1].tts = 'वैज्ञानिकों ने भी माना है कि यह सच है।';
  assert.ok(has(checkFactsSpec(p1, { topics }), /proven/));
  const p2 = clone(pilot); p2.youtube_description += '\nBaba ke darshan se har bimari ka ilaj.';
  assert.ok(has(checkFactsSpec(p2, { topics }), /cure/));
  // astra: a nuclear comparison must be called a modern interpretation in the narration and the description
  const astraTopics = topics.map((t) => (t.id === pilot.topic ? { ...t, kind: 'astra', label: 'scripture' } : t));
  const a = clone(pilot); a.scenes[0].tts = 'क्या ब्रह्मास्त्र परमाणु बम था?';
  assert.ok(has(checkFactsSpec(a, { topics: astraTopics }), /आधुनिक व्याख्या/));
  a.scenes[2].tts = 'यह तुलना आधुनिक व्याख्या है, प्रमाणित नहीं।';
  a.youtube_description += '\nThe nuclear comparison is a modern interpretation, not proven.';
  assert.ok(!has(checkFactsSpec(a, { topics: astraTopics }), /astra:/));
  // garuda: the moral ends on good karma / naam-jap, no fear words
  const gTopics = topics.map((t) => (t.id === pilot.topic ? { ...t, kind: 'garuda' } : t));
  const g = clone(pilot);
  const m = g.scenes.findIndex((sc) => sc.moral);
  g.scenes[m].tts = 'बस इतना याद रखिए, सब बदल जाता है।';
  assert.ok(has(checkFactsSpec(g, { topics: gTopics }), /good karma/));
  g.scenes[m].tts = 'इसलिए आज से अच्छे कर्म और नाम-जप कीजिए।';
  assert.ok(!has(checkFactsSpec(g, { topics: gTopics }), /good karma/));
  g.title = 'Yamlok ki darawna saza';
  assert.ok(has(checkFactsSpec(g, { topics: gTopics }), /fear/));
  // kaliyug: no predicted years
  const kTopics = topics.map((t) => (t.id === pilot.topic ? { ...t, kind: 'kaliyug' } : t));
  const k = clone(pilot); k.scenes[1].tts = 'कहते हैं सन 2032 में कलियुग बदलेगा।';
  assert.ok(has(checkFactsSpec(k, { topics: kTopics }), /no doomsday/));
  assert.ok(!has(base, /proven|cure|doomsday|astra|garuda/), 'the pilot spec still passes these rules');
});

test('bank ideas: schema, placeholders allowed until promotion, promotion needs a real citation', async () => {
  for (const b of Object.keys(BANKS)) assert.deepEqual(bankIdeaProblems(b, loadBank(b)), [], b);
  const facts = loadBank('facts');
  assert.ok(facts.ideas.length >= 8 && facts.ideas.every((x) => x.status === 'idea'));
  const radar = { id: 'radar-x-durva', status: 'idea', p: 2, deity: 'ganesh', name: 'Ganesh ji aur durva', playlist: 'Ganesh ji ki Kathayein', label: 'scripture',
    hook: 'Ganesh ji ko durva kyun priya?', hook_hi: 'गणेश जी को दूर्वा क्यों प्रिय है?', angle: 'The Analasura story and why durva is offered; to verify before use.',
    cite: { work: 'TODO: verify', ref: 'TODO: verify' }, sources: [], keywords: ['durva'], from: { source: 'viral-radar 2026-11-15', refs: [] } };
  assert.deepEqual(ideaProblems('facts', radar), []);
  assert.equal(citationFilled('facts', radar), false);
  assert.ok(has(await promoteProblems('facts', radar, facts), /fill the citation/));
  const filled = { ...radar, cite: { work: 'Ganesh Purana', ref: 'Krida Khand (Analasura prasang)' }, sources: ['https://www.wisdomlib.org/'] };
  assert.deepEqual(await promoteProblems('facts', filled, facts), []);
  assert.ok(has(ideaProblems('facts', { ...radar, status: undefined }), /status/));
  const kid = { id: 'radar-k', status: 'idea', kind: 'evergreen', story_type: 'parampara', lead: 'parvati', cast: ['parvati', 'ganesh'],
    title: '😱 गणेश जी ने दूर्वा क्यों माँगी? फिर माता पार्वती ने जो बताया… 🔱❤️ | Mahadev Parvati', cover: 'दूर्वा क्यों?', premise: 'p', resolution: 'r', moral: 'm',
    source: 'TODO: verify', from: { source: 'viral-radar', refs: [] } };
  assert.deepEqual(ideaProblems('kailash', kid), []);
  assert.ok(has(await promoteProblems('kailash', kid, loadBank('kailash')), /fill the citation/));
});

test('series outlines: approved false, title format, payoff part, recap and cliffhangers', () => {
  for (const f of SERIES_FILES) assert.deepEqual(seriesOutlineProblems(JSON.parse(fs.readFileSync(f, 'utf8'))), [], f);
  const b = JSON.parse(fs.readFileSync('automation/series-bhakt-katha.json', 'utf8'));
  assert.equal(b.order[0], 'sudama');
  assert.equal(b.kathas[0].id, 'sudama');
  assert.ok(b.kathas[0].parts.length >= 4 && b.kathas[0].parts.some((p) => p.payoff));
  const s = JSON.parse(fs.readFileSync('automation/series-sheesh-mahabharat.json', 'utf8'));
  assert.equal(s.episodes.length, 12);
  const bad = clone(b);
  bad.approved = true;
  bad.kathas[0].parts[3].title = 'Part 4 😱 🙏 सुदामा कथा पार्ट 4';
  delete bad.kathas[0].parts[2].cliffhanger;
  delete bad.kathas[0].parts[1].recap;
  const e = seriesOutlineProblems(bad);
  for (const re of [/approved/, /never just "Part N"/, /cliffhanger/, /recap/]) assert.ok(has(e, re), String(re));
});

test('bank serializer keeps the one-item-a-line style of the series banks', () => {
  for (const b of ['kailash', 'pov']) {
    const t = fs.readFileSync(BANKS[b].file, 'utf8').replace(/\r\n/g, '\n');
    assert.equal(serializeBank(b, JSON.parse(t)), t, b);
  }
});
