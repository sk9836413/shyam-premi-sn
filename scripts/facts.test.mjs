// node --test scripts/facts.test.mjs  (the facts Short rules: topic bank, picker, validator, Whisper name gate)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { artFor, checkFactsSpec, checkTopicBank, estimateSeconds, inKaggleWindow, lineNames, loadTopics, pickTopic, qaGate, topicAllowed, variantFor } from './facts.mjs';

const topics = loadTopics('.');
const pilot = JSON.parse(fs.readFileSync('story/facts/2026-11-17-khatu-baba-ke-naam.json', 'utf8'));
const clone = (x) => JSON.parse(JSON.stringify(x));
const has = (list, re) => list.some((e) => re.test(e));

test('the topic bank: 60+ original topics, each with a citation and a source, no sati topic, no invented numbers', () => {
  assert.deepEqual(checkTopicBank(topics), []);
  assert.ok(topics.length >= 60);
  assert.ok(topics.filter((t) => t.deity === 'khatu').length >= 10, 'Khatu Shyam ji / Barbarik first');
  const t = clone(topics[0]);
  assert.ok(has(checkTopicBank([...topics, { ...t, id: 'x-guna', hook: 'Sampati 10 guna shaktishali' }]), /guna|number "10"/));
  assert.ok(has(checkTopicBank([...topics, { ...t, id: 'rani-sati-x', name: 'Rani Sati Dadi' }]), /no sati/));
  assert.ok(has(checkTopicBank([...topics, { ...t, id: 'no-cite', cite: { work: '' } }]), /cite/));
  assert.ok(has(checkTopicBank([...topics, { ...t, id: 'no-src', sources: [] }]), /source URL/));
  // "ek" / "एक" is the article "a"; दोस्त is not दो
  assert.ok(!has(checkTopicBank(topics.filter((x) => ['matsya-manu-naav', 'gita-6-5', 'ganesh-ekdant'].includes(x.id))), /number/));
});

test('variant rotation story -> kyun -> list, Sunday = gita; art alternates', () => {
  assert.equal(variantFor('2026-11-17', []), 'story');
  assert.equal(variantFor('2026-11-25', [{ date: '2026-11-17', variant: 'story' }]), 'kyun');
  assert.equal(variantFor('2026-11-28', [{ date: '2026-11-17', variant: 'story' }, { date: '2026-11-25', variant: 'kyun' }]), 'list');
  assert.equal(variantFor('2026-11-29', [{ date: '2026-11-17', variant: 'story' }]), 'gita'); // a Sunday
  assert.equal(artFor('2026-11-17', []), 'cinematic');
  assert.equal(artFor('2026-11-25', [{ date: '2026-11-17', art: 'cinematic' }]), 'illustrated');
  assert.equal(artFor('2026-11-28', [{ date: '2026-11-25', art: 'illustrated' }]), 'cinematic');
});

test('picker: Khatu Shyam ji first while under 2 a week, `after` dates respected, used topics never again', () => {
  const p = pickTopic('2026-11-17', { topics, history: [], log: '' });
  assert.equal(p.variant, 'story');
  assert.equal(p.topic.deity, 'khatu');
  assert.ok(!p.topic.after || p.topic.after <= '2026-11-17', 'the movie-week topics wait until after 21 Nov');
  const used = [{ date: '2026-11-17', topic: p.topic.id, variant: 'story' }];
  const q = pickTopic('2026-11-24', { topics, history: [...used, { date: '2026-11-23', topic: 'khatu-gyaras', variant: 'list' }], log: '' });
  assert.notEqual(q.topic.id, p.topic.id);
  // the keyword repeat rule: a story told in log.md within 60 days is not picked
  const t = topics.find((x) => x.id === 'khatu-shyam-kund');
  assert.equal(topicAllowed(t, '2026-11-25', { log: '2026-11-18 | evening | x | Khatu | Shyam Kund darshan\n' }), false);
  assert.equal(topicAllowed(t, '2026-11-25', { log: '' }), true);
  // festival topics only near their festival
  const ch = topics.find((x) => x.id === 'chhath-shashthi-devi');
  assert.equal(topicAllowed(ch, '2026-12-10', { festivals: [{ date: '2026-11-15', key: 'chhath-sandhya-arghya' }] }), false);
  assert.equal(topicAllowed(ch, '2026-11-13', { festivals: [{ date: '2026-11-15', key: 'chhath-sandhya-arghya' }] }), true);
  // Sunday: a Bhagavad Gita topic
  const g = pickTopic('2026-11-29', { topics, history: used, log: '' });
  assert.equal(g.variant, 'gita');
  assert.equal(g.topic.variant_only, 'gita');
  // list day: a countdown topic
  const l = pickTopic('2026-11-28', { topics, history: [...used, { date: '2026-11-25', variant: 'kyun', topic: 'kartikeya-brahma-bandi' }], log: '' });
  assert.equal(l.variant, 'list');
  assert.equal(l.topic.variant_only, 'list');
});

test('the pilot spec passes every facts rule', () => {
  assert.deepEqual(checkFactsSpec(pilot, { topics }), []);
  const s = estimateSeconds(pilot.scenes);
  assert.ok(s >= 110 && s <= 165, `story variant 2-2.5 min (estimated ${s})`);
});

test('validator: citation, facts sources, folk label, numbers, iconography and respect rules', () => {
  const v = (mut) => { const s = clone(pilot); mut(s); return checkFactsSpec(s, { topics }); };
  assert.ok(has(v((s) => { s.youtube_description = s.youtube_description.replace(s.source, 'x'); }), /exact "source"/));
  assert.ok(has(v((s) => { s.facts[0].sources = ['https://en.wikipedia.org/wiki/Barbarika', 'https://x.blogspot.com/a']; }), /Wikipedia and blogs/));
  assert.ok(has(v((s) => { s.facts[0].sources = ['https://www.wisdomlib.org/a']; }), /2 independent source URLs/));
  assert.ok(has(v((s) => { s.scenes.forEach((sc) => { sc.tts = sc.tts.replace(/मान्यता है,?|लोककथा के अनुसार,?|परंपरा|श्रद्धा है/g, ''); }); }), /मान्यता/));
  assert.ok(has(v((s) => { s.hook = 'Barbarik 10 guna shaktishali'; }), /guna|number/));
  assert.ok(has(v((s) => { s.youtube_title = s.youtube_title.replace('5 naam', '11 naam'); }), /number "11"/));
  assert.ok(has(v((s) => { s.scenes[1].prompt = 'A cinematic portrait of Hanuman ji with a mace on a mountain at sunrise, golden light'; }), /no beard/));
  assert.equal(has(v((s) => { s.scenes[1].prompt = 'A cinematic portrait of Hanuman ji, clean-shaven vanara face, no beard, mace, sunrise'; }), /no beard/), false);
  assert.ok(has(v((s) => { s.scenes[7].prompt = 'Barbarik beheaded, blood on the ground, cinematic'; }), /gore/));
  assert.ok(has(v((s) => { s.hook = 'Yamraj ne Hanuman ko laat maari'; s.scenes[0].tts = 'यमराज ने हनुमान जी को लात मार दी!'; }), /respect rule/));
  assert.ok(has(v((s) => { s.style = 'Pixar quality 3D, no text'; }), /studio/));
  assert.ok(has(v((s) => { s.scenes[0].tts = 'खाटू श्याम बाबा के पाँच नाम'; }), /hook in the first/));
  assert.ok(has(v((s) => { s.scenes.forEach((sc) => delete sc.moral); }), /moral/));
  assert.ok(has(v((s) => { s.youtube_title = 'Khatu Shyam ke naam | खाटू श्याम'; }), /#facts/));
  assert.ok(has(v((s) => { s.scenes = s.scenes.slice(0, 6).concat(s.scenes.slice(-1)); }), /estimated length|scenes/));
});

test('kyun variant: the question is the title and line 1, the answer lands at 55-85 %', () => {
  const s = clone(pilot);
  Object.assign(s, { variant: 'kyun', topic: 'kartikeya-brahma-bandi', slug: '2026-11-25-facts-kartikeya-brahma-bandi', release: '2026-11-25',
    hook: 'Kartikeya ne Brahma ko kyun roka?', cover_lines: ['कार्तिकेय ने', 'ब्रह्मा जी को', 'बंदी क्यों बनाया?'] });
  s.source = 'Lok katha / Skanda parampara (Swamimalai)';
  s.youtube_description = `${s.youtube_description}\n${s.source}`;
  s.youtube_title = 'Kartikeya ne Brahma ko kyun roka? 😱 #facts | Shiv Parivar Katha | कार्तिकेय की कथा';
  s.scenes = [
    { ...pilot.scenes[0], tts: 'कार्तिकेय ने ब्रह्मा जी को बंदी क्यों बनाया? जानिए!', sub: 'Kartikeya ne Brahma ji ko bandi kyun banaya? Jaaniye!' },
    ...pilot.scenes.slice(1, 4).map((x) => ({ ...x, animate: undefined })),
    { ...pilot.scenes[4], animate: undefined, reveal: true },
    { ...pilot.scenes[12] },
    pilot.scenes.at(-1),
  ];
  const e = checkFactsSpec(s, { topics });
  assert.ok(!has(e, /reveal/), e.join('\n'));
  s.scenes[4].reveal = false; s.scenes[1].reveal = true;
  assert.ok(has(checkFactsSpec(s, { topics }), /reveal/));
  s.cover_lines[2] = 'बंदी बनाया';
  assert.ok(has(checkFactsSpec(s, { topics }), /cover_lines/));
});

test('list variant: 3-5 numbered items, one citation each', () => {
  const s = clone(pilot);
  Object.assign(s, { variant: 'list', topic: 'ravan-ko-harane-wale', slug: '2026-11-28-facts-ravan-ko-harane-wale', release: '2026-11-28',
    hook: 'Ravan ko harane wale 4 yoddha', source: 'Valmiki Ramayan, Uttara Kand' });
  s.youtube_description += `\n${s.source}`;
  s.youtube_title = 'Ravan ko harane wale 4 yoddha 😱 #facts | Ramayan Katha | रावण को हराने वाले योद्धा';
  const item = (n, cite) => ({ ...pilot.scenes[1], item: n, cite, tts: 'रावण को एक राजा ने बंदी बना लिया था। कहते हैं, पूरी सेना देखती रह गई।', sub: 'Ravan ko ek raja ne bandi bana liya tha.' });
  s.scenes = [pilot.scenes[0], item(1, 'Uttara Kand 32'), item(2, 'Uttara Kand 34'), item(3, 'Uttara Kand 16'), { ...pilot.scenes[12] }, pilot.scenes.at(-1)];
  assert.ok(!has(checkFactsSpec(s, { topics }), /list/), checkFactsSpec(s, { topics }).join('\n'));
  s.scenes[2].item = 5;
  assert.ok(has(checkFactsSpec(s, { topics }), /numbered/));
  s.scenes[2].item = 2; delete s.scenes[3].cite;
  assert.ok(has(checkFactsSpec(s, { topics }), /cite/));
});

test('gita variant: a real shloka with chapter.verse, its Hindi meaning as fallback, the gita title', () => {
  const s = clone(pilot);
  const shloka = 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।';
  Object.assign(s, { variant: 'gita', topic: 'gita-2-47', slug: '2026-11-29-facts-gita-2-47', release: '2026-11-29', source: 'Shrimad Bhagavad Gita, adhyay 2, shlok 47',
    shloka: { text: shloka, ref: 'Bhagavad Gita 2.47', sources: ['https://www.gitasupersite.iitk.ac.in/srimad?language=dv&field_chapter_value=2&field_nsutra_value=47', 'https://www.holy-bhagavad-gita.org/chapter/2/verse/47'] },
    youtube_title: 'Karm karo, phal nahi: Gita ka gyaan 😱 | Bhagavad Gita 2.47 #gita #krishna' });
  s.youtube_description = s.youtube_description.replace('#facts', '#gita #krishna') + `\n${s.source}`;
  s.scenes = [pilot.scenes[0], { ...pilot.scenes[8], shloka: true, tts: `श्री कृष्ण कहते हैं, ${shloka}`, tts_meaning: 'तुम्हारा अधिकार सिर्फ़ कर्म पर है, फल पर नहीं।' }, pilot.scenes[2], pilot.scenes[4], pilot.scenes[5], pilot.scenes[12], pilot.scenes.at(-1)];
  const e = checkFactsSpec(s, { topics });
  assert.ok(!has(e, /gita/), e.join('\n'));
  s.youtube_title = 'Karm karo 😱 #facts | Krishna Katha';
  assert.ok(has(checkFactsSpec(s, { topics }), /gita title/));
  delete s.scenes[1].tts_meaning;
  assert.ok(has(checkFactsSpec(s, { topics }), /tts_meaning/));
});

test('Whisper name gate: names heard right pass, "शाम" for श्याम fails, positions after श्री are skipped', () => {
  assert.deepEqual(lineNames('खाटू श्याम बाबा के पाँच नाम', 'खाटू श्याम बाबा के पांच नाम').wrong, []);
  assert.equal(lineNames('बाबा श्याम का नाम', 'बाबा शाम का नाम').wrong[0]?.word, 'श्याम');
  assert.equal(lineNames('जय श्री श्याम', 'जय श्री शाम').checked, 0, 'श्री श्याम: Whisper writes शाम by itself, not checked');
  assert.equal(lineNames('महाबली भीम के पोते', 'महाबली बीम के पोते').wrong[0]?.word, 'भीम', 'lost aspirate = wrong');
  assert.deepEqual(lineNames('हनुमान जी', 'हनूमान जी').wrong, [], 'a spelling variant with the same sound passes');
  const spec = { scenes: [{ tts: 'खाटू श्याम बाबा के पाँच नाम!' }, { tts: 'बर्बरीक भीम के पोते थे।' }, { endcard: true, tts: 'जय श्री श्याम!' }] };
  const good = { lines: [{ i: 0, heard: 'खाटू श्याम बाबा के पांच नाम' }, { i: 1, heard: 'बर्बरीक भीम के पोते थे' }, { i: 2, heard: 'जय श्री शाम' }] };
  assert.equal(qaGate(spec, good).ok, true);
  const bad = clone(good); bad.lines[1].heard = 'बबरीक भीम के पोते थे';
  const r = qaGate(spec, bad);
  assert.equal(r.ok, false);
  assert.match(r.why.join(' '), /बर्बरीक/);
  const missing = { lines: good.lines.slice(0, 1) };
  assert.equal(qaGate(spec, missing).ok, false, 'a scene without a transcript never passes');
});

test('the gita shloka is judged like a mantra take: CER <= 0.5, else the Hindi meaning is spoken', () => {
  const shloka = 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन';
  const spec = { shloka: { text: shloka }, scenes: [{ tts: 'श्री कृष्ण अर्जुन से कहते हैं!' }, { shloka: true, tts: shloka, tts_meaning: 'कर्म पर अधिकार है' }] };
  const ok = qaGate(spec, { lines: [{ i: 0, heard: 'श्री कृष्ण अर्जुन से कहते हैं' }, { i: 1, heard: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन' }] });
  assert.equal(ok.shloka.ok, true);
  const bad = qaGate(spec, { lines: [{ i: 0, heard: 'श्री कृष्ण अर्जुन से कहते हैं' }, { i: 1, heard: 'कर्म नए वादी कारस्ते' }] });
  assert.equal(bad.ok, false);
  assert.match(bad.why.join(' '), /shloka/);
});

test('Kaggle windows of the coordinator', () => {
  assert.equal(inKaggleWindow('10:00'), true);
  assert.equal(inKaggleWindow('12:30'), false);
  assert.equal(inKaggleWindow('18:46'), true);
  assert.equal(inKaggleWindow('21:15'), false);
});

test('"धर्म की जिज्ञासा" questions: 35-47 s, a cited answer, never pseudo-science or health claims', () => {
  const j = topics.filter((t) => t.kind === 'jigyasa');
  assert.ok(j.length >= 20, `about 20 jigyasa topics (has ${j.length})`);
  assert.ok(j.slice(0, 5).every((t) => t.deity === 'khatu'), 'Khatu Shyam ji questions first (Janmotsav)');
  assert.ok(j.every((t) => t.variant_only === 'kyun' && t.length[0] === 35));
  const s = clone(pilot);
  Object.assign(s, { variant: 'kyun', topic: 'jigyasa-mandir-ghanti', slug: '2026-11-25-facts-jigyasa-mandir-ghanti', release: '2026-11-25',
    hook: 'Mandir mein ghanti kyun bajate hain?', source: 'Puja paddhati (Ghanta puja mantra); Agama parampara',
    cover_lines: ['मंदिर में', 'घंटी', 'क्यों बजाते हैं?'], youtube_title: 'Mandir mein ghanti kyun bajate hain? 😱 #facts | Bhakti Katha | मंदिर में घंटी क्यों' });
  s.youtube_description += `\n${s.source}`;
  s.scenes = [{ ...pilot.scenes[0], tts: 'मंदिर में घंटी क्यों बजाते हैं? जानिए!', sub: 'Mandir mein ghanti kyun bajate hain? Jaaniye!' },
    { ...pilot.scenes[1], tts: 'परंपरा के अनुसार, घंटी पूजा का पहला स्वर है। इससे देवताओं का आवाहन होता है।' },
    { ...pilot.scenes[5], tts: 'घंटी का नाद मन को पूजा में लगाता है। भक्त कहते हैं, अब भगवान के सामने हूँ।' },
    { ...pilot.scenes[4], animate: undefined, reveal: true, tts: 'पूजा पद्धति का श्लोक कहता है, घंटी देवताओं को बुलाने के लिए बजती है।' },
    { ...pilot.scenes[12] }, pilot.scenes.at(-1)];
  const ok = checkFactsSpec(s, { topics });
  assert.ok(!ok.some((e) => /estimated length|scenes/.test(e)), ok.join('\n'));
  s.scenes[1].tts = 'वैज्ञानिक कारण: घंटी की आवाज़ से बैक्टीरिया मर जाते हैं।';
  assert.ok(checkFactsSpec(s, { topics }).some((e) => /pseudo-science/.test(e)));
});

test('weekly compilation: Saturdays only, 4+ uncompiled facts Shorts, a curiosity listicle title, links and sources', async () => {
  const { compileTitle, compileSpec, pendingShorts } = await import('./facts-compile.mjs');
  const os = await import('node:os');
  const path = await import('node:path');
  const mk = (topic, deity, source) => ({ spec: { topic, deity, source, title: topic, hook: topic } });
  assert.match(compileTitle([mk('khatu-baba-ke-naam', 'Khatu Shyam ji'), mk('khatu-nishan', 'Khatu Shyam ji')]).hi, /^खाटू श्याम जी के दो रहस्य/);
  assert.match(compileTitle([mk('jatayu-sampati-surya', 'Sampati', 'Valmiki Ramayan'), mk('ram-setu-nal', 'Ram Setu', 'Valmiki Ramayan')]).hi, /^रामायण की/);
  assert.match(compileTitle([mk('jatayu-sampati-surya', 'Sampati', 'Valmiki Ramayan'), mk('shiv-neelkanth', 'Shiv', 'Bhagavata Purana')]).hi, /^पौराणिक कथाओं के/);
  // a temp repo: log.md facts lines, published.md links, saved specs; one Short already compiled
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'compile-'));
  fs.mkdirSync(path.join(root, 'automation')); fs.mkdirSync(path.join(root, 'story/published'), { recursive: true });
  const days = ['2026-11-17', '2026-11-20', '2026-11-22', '2026-11-25', '2026-11-26'];
  fs.writeFileSync(path.join(root, 'automation/log.md'), days.map((d, i) => `${d} | facts | ${d}-facts-t${i} | Khatu | x (variant story, art cinematic, ${100 + i} s)`).join('\n') + '\n');
  fs.writeFileSync(path.join(root, 'automation/published.md'), days.map((d, i) => `- ${d}-facts-t${i} | youtube: https://youtube.com/shorts/abcdef${i}`).join('\n') + '\n');
  days.forEach((d, i) => fs.writeFileSync(path.join(root, `story/published/${d}-facts-t${i}.json`), JSON.stringify({ topic: `khatu-t${i}`, deity: 'Khatu Shyam ji', title: `T${i}`, source: 'Lok katha' })));
  fs.writeFileSync(path.join(root, 'story/published/2026-11-21-long-facts-x.json'), JSON.stringify({ compile: [{ slug: '2026-11-17-facts-t0' }] }));
  const p = pendingShorts('2026-11-28', root);
  assert.deepEqual(p.map((x) => x.slug), ['2026-11-20-facts-t1', '2026-11-22-facts-t2', '2026-11-25-facts-t3', '2026-11-26-facts-t4']);
  const s = compileSpec('2026-11-28', p);
  assert.ok(s.youtube_title.length <= 100 && /रहस्य/.test(s.youtube_title));
  assert.ok(p.every((x) => s.youtube_description.includes(x.url)), 'links to every Short');
  assert.equal(s.compile.length, 4);
  assert.match(s.slug, /^2026-11-28-long-facts-/);
});
