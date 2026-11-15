// node --test scripts/krishna-pov-rules.test.mjs   ("Shri Krishna kehte hain" validator rules, STORY.md section 10)
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { checkSpec, loadContext, povToneProblems, titleProblems } from './krishna-pov-rules.mjs';
import { coverProblems } from './kailash-rules.mjs';

const pilot = JSON.parse(fs.readFileSync('story/krishna-pov/pilot-ep1.json', 'utf8'));
const ctx = { ...loadContext('.'), hasPortrait: () => true };
const clone = (o) => JSON.parse(JSON.stringify(o));
const run = (s, c = ctx) => checkSpec(s, c).problems;
const has = (ps, re) => ps.some((p) => re.test(p));

test('the pilot passes: 45-60 s, POV monologue', () => {
  const r = checkSpec(pilot, ctx);
  assert.deepEqual(r.problems, []);
  assert.ok(r.seconds >= 45 && r.seconds <= 60, `${r.seconds}`);
});

describe('hard tone rules', () => {
  test('never question, mock or tell people to drop a ritual', () => {
    for (const t of ['Karwa Chauth ka real meaning kya hai', 'ye sab andhvishwas hai', 'यह परंपरा गलत है', 'Diwali par puja band karo', 'vrat rakhna bekaar hai']) {
      assert.ok(has(povToneProblems({}, [t]), /ritual/), t);
    }
    assert.deepEqual(povToneProblems({}, ['raat ko phone band karo aur so jao']), []); // turning a phone off is fine
    assert.deepEqual(povToneProblems({}, ['पूजा भी करो, और साथ में सेवा भी करो']), []);
  });
  test('no caste or gender debates; "aati-jaati" (comes and goes) is not caste', () => {
    assert.ok(has(povToneProblems({}, ['gender equality ka paath']), /caste or gender/));
    assert.ok(has(povToneProblems({}, ['दहेज की बात']), /caste or gender/));
    assert.deepEqual(povToneProblems({}, ['sardi-garmi aati-jaati hain']), []);
  });
  test('no health or astrology claims', () => {
    for (const t of ['manglik hai to ped se shaadi', 'kundli dekh ke', 'ये उपाय करो, बीमारी ठीक']) assert.ok(has(povToneProblems({}, [t]), /health or astrology/), t);
  });
  test('the spec-level rules include the shared Kailash tone rules (no intoxication)', () => {
    const s = clone(pilot);
    s.scenes[0].lines[1].sub = 'Bhang pi kar mat jaana';
    assert.ok(has(run(s), /intoxication/));
  });
});

describe('scripture: a real Gita verse or none', () => {
  test('"Gita mein..." needs the shloka with chapter.verse, 2 sources and the verse in the description', () => {
    const s = clone(pilot);
    delete s.shloka;
    assert.ok(has(run(s), /shloka.text/));
    const t = clone(pilot);
    t.shloka.ref = 'Gita';
    assert.ok(has(run(t), /shloka.ref/));
    const u = clone(pilot);
    u.youtube_description = u.youtube_description.replace('9.26', '');
    assert.ok(has(run(u), /name the Gita verse/));
  });
  test('the disclosure line is required', () => {
    const s = clone(pilot);
    s.youtube_description = s.youtube_description.replace('भक्तिभाव से बनाई गई काल्पनिक प्रस्तुति', '');
    assert.ok(has(run(s), /काल्पनिक प्रस्तुति/));
  });
});

describe('format', () => {
  test('title "<Hinglish question>? 👀 | <Festival> Special #krishna #shorts"', () => {
    assert.deepEqual(titleProblems('Khatu ja rahe ho, par maa ka aashirwad liya? 👀 | Khatu Janmotsav Special #krishna #shorts'), []);
    assert.equal(titleProblems('Was Vibhishan Right? | Dussehra Special 👀🔥').length, 1);
    assert.equal(titleProblems('खाटू जा रहे हो? 👀 | Janmotsav Special #krishna #shorts').length, 1);
  });
  test('one speaker: every line is Shri Krishna; the hook is a question to camera', () => {
    const s = clone(pilot);
    s.scenes[0].lines[1].who = 'narrator';
    assert.ok(has(run(s), /monologue/));
    const t = clone(pilot);
    t.scenes[0].lines[0].shot = 'wide';
    assert.ok(has(run(t), /hook/));
  });
  test('the label is short Roman text (no emoji: it is drawn on the video)', () => {
    const s = clone(pilot);
    s.label = 'Ghar Ka Vibhishan 👀';
    assert.ok(has(run(s), /label/));
  });
  test("not the reference channel's night-sky look", () => {
    const s = clone(pilot);
    s.scenes[0].prompt = 'Shri Krishna under a starry night sky with a full moon and clouds, medium close shot';
    assert.ok(has(run(s), /night-sky/));
  });
  test('a spoken name must be in names (Whisper gate)', () => {
    const s = clone(pilot);
    s.names = s.names.filter((n) => n !== 'श्याम');
    assert.ok(has(run(s), /names: add "श्याम"/));
  });
});

describe('topic bank (automation/krishna-pov-topics.json)', () => {
  const bank = JSON.parse(fs.readFileSync('automation/krishna-pov-topics.json', 'utf8'));
  test('20+ unique topics, waiting for the owner', () => {
    assert.ok(bank.topics.length >= 20);
    assert.equal(new Set(bank.topics.map((t) => t.id)).size, bank.topics.length);
    assert.equal(typeof bank.approved, 'boolean');
  });
  test('every topic: title formula, cover, positive tone, label', () => {
    for (const t of bank.topics) {
      assert.deepEqual([...titleProblems(t.title), ...coverProblems(t.cover), ...povToneProblems({}, [t.title, t.message, t.hook, t.label])], [], t.id);
      assert.match(t.label, /^[A-Za-z0-9 ,'?!.-]{3,26}$/, t.id);
      if (t.gita) assert.match(t.gita, /^Bhagavad Gita \d{1,2}\.\d{1,3}$/, t.id);
    }
  });
  test('Gita Jayanti 2026 is 20 Dec in the calendar (not 1 Dec)', () => {
    const fest = JSON.parse(fs.readFileSync('automation/festivals.json', 'utf8'));
    assert.equal((fest.festivals || fest).find((f) => f.key === 'gita-jayanti').date, '2026-12-20');
  });
});
