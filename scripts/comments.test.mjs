// Comment replies (scripts/comments.mjs): dedupe, skip rules, language + jaikara mapping, spam filter, the reply check.
// No network. Run: node --test scripts/comments.test.mjs
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BHAJAN_CTA, DEITIES, LIMITS, SATI_THANKS, checkReply, classify, contextDeity, deityOf, digestMarkdown, graphStops, langOf, norm,
  pickTemplate, planComments, pruneState, recentSet, resolveReplies, templateCandidates,
} from './comments.mjs';

const NOW = Date.parse('2026-11-14T12:00:00Z');
const seeded = (seed = 7) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const empty = () => ({ handled: {}, recent: [], flags: [], daily: {} });
const c = (o) => ({ platform: 'yt', id: o.key?.slice(3) || 'x', key: 'yt:x', text: 'Jai shree shyam', author: 'a', at: '2026-11-14T10:00:00Z', own: false, answered: false, title: 'Khatu Shyam ji Darshan', url: '', ...o });

describe('dedupe and skip rules', () => {
  test('own comments, comments the channel already answered and handled ones are skipped', () => {
    const state = empty();
    state.handled['yt:3'] = { at: '2026-11-13T10:00:00Z', action: 'replied' };
    const { items, skipped } = planComments([
      c({ key: 'yt:1', own: true }), c({ key: 'yt:2', answered: true }), c({ key: 'yt:3' }), c({ key: 'yt:4' }), c({ key: 'yt:4' }),
    ], state, { now: NOW, rng: seeded() });
    assert.deepEqual(items.map((x) => x.key), ['yt:4']);
    assert.deepEqual({ own: skipped.own, answered: skipped.answered, handled: skipped.handled, duplicate: skipped.duplicate }, { own: 1, answered: 1, handled: 1, duplicate: 1 });
  });
  test('a failed reply is retried once, then left alone', () => {
    const state = empty();
    state.handled['yt:5'] = { at: '2026-11-14T09:00:00Z', action: 'error', tries: 1 };
    state.handled['yt:6'] = { at: '2026-11-14T09:00:00Z', action: 'error', tries: 2 };
    const { items } = planComments([c({ key: 'yt:5' }), c({ key: 'yt:6' })], state, { now: NOW, rng: seeded() });
    assert.deepEqual(items.map((x) => x.key), ['yt:5']);
  });
  test('comments older than the window are skipped; --since/--include-answered (dry runs) take them', () => {
    const old = c({ key: 'yt:7', at: '2025-01-01T00:00:00Z', answered: true });
    assert.equal(planComments([old], empty(), { now: NOW }).items.length, 0);
    assert.equal(planComments([old], empty(), { now: NOW, since: '2024-01-01', includeAnswered: true, rng: seeded() }).items.length, 1);
  });
  test(`at most ${LIMITS.perRun} replies a run; hide/flag items are not capped`, () => {
    const many = Array.from({ length: 60 }, (_, i) => c({ key: `yt:r${i}`, at: new Date(NOW - (60 - i) * 60e3).toISOString() }));
    const spam = c({ key: 'yt:spam', text: 'Earn money daily, whatsapp me 9876543210' });
    const { items, skipped } = planComments([...many, spam], empty(), { now: NOW, rng: seeded() });
    assert.equal(items.filter((x) => x.action !== 'hide').length, LIMITS.perRun);
    assert.equal(skipped.cap, 10);
    assert.ok(items.some((x) => x.key === 'yt:spam' && x.action === 'hide'));
  });
  test('no reply text twice within 7 days (normalised: emoji differences count as the same)', () => {
    const many = Array.from({ length: 30 }, (_, i) => c({ key: `yt:k${i}`, at: new Date(NOW - (30 - i) * 60e3).toISOString() }));
    const { items } = planComments(many, empty(), { now: NOW, rng: seeded(3) });
    const texts = items.filter((x) => x.reply).map((x) => norm(x.reply));
    assert.ok(texts.length >= 28, String(texts.length));
    assert.equal(new Set(texts).size, texts.length);
    const state = empty();
    state.recent = items.map((x) => ({ text: x.reply, at: '2026-11-13T00:00:00Z' }));
    assert.ok(recentSet(state, NOW).has(norm(items[0].reply)));
    const again = planComments([c({ key: 'yt:new' })], state, { now: NOW, rng: seeded(3) }).items[0];
    assert.ok(!texts.includes(norm(again.reply)));
  });
  test('when every template was used this week Claude writes a fresh one', () => {
    const state = empty();
    const all = templateCandidates({ deity: 'khatu', lang: 'hinglish', kind: 'jaikara', rng: seeded() });
    state.recent = all.map((text) => ({ text, at: '2026-11-13T00:00:00Z' }));
    const it = planComments([c({ key: 'yt:full' })], state, { now: NOW, rng: seeded() }).items[0];
    assert.equal(it.reply, null);
    assert.equal(it.needsAi, true);
  });
  test('old state is pruned', () => {
    const s = pruneState({ handled: { a: { at: '2026-01-01T00:00:00Z' }, b: { at: '2026-11-10T00:00:00Z' } }, recent: [{ text: 'x', at: '2026-10-01T00:00:00Z' }], flags: [], daily: { '2026-10-01': {}, '2026-11-14': {} } }, NOW);
    assert.deepEqual(Object.keys(s.handled), ['b']);
    assert.equal(s.recent.length, 0);
    assert.deepEqual(Object.keys(s.daily), ['2026-11-14']);
  });
});

describe('language and jaikara mapping', () => {
  test('language and script of the comment', () => {
    assert.equal(langOf('जय श्री श्याम'), 'hi');
    assert.equal(langOf('Jai shree shyam 🙏'), 'hinglish');
    assert.equal(langOf('Baba ki kripa sab par bani rahe'), 'hinglish');
    assert.equal(langOf('Beautiful video, thank you'), 'en');
    assert.equal(langOf('🙏🙏❤️'), 'hi');
  });
  test('deity of the video; brand and hashtags do not count', () => {
    assert.equal(deityOf('Khatu Shyam ji ke Darshan | खाटू श्याम'), 'khatu');
    assert.equal(deityOf('Shiv ji ki Jataon mein Ganga ki Katha'), 'shiv');
    assert.equal(deityOf('Chhath Puja Geet 2026 Nonstop'), 'chhath');
    assert.equal(deityOf('Salasar Balaji Darshan'), 'hanuman');
    assert.equal(deityOf('Rani Sati Dadi Mandir Jhunjhunu'), 'sati');
    assert.equal(deityOf('Aaj ka vichar | Shyam Premi SN #KhatuShyam #JaiShreeShyam'), null);
    assert.equal(deityOf('कृपा बरसती रहे'), null, 'बरसती is not sati');
    assert.equal(contextDeity('Aaj ka vichar', 'Har Har Mahadev'), 'shiv');
    assert.equal(contextDeity('Aaj ka vichar', 'ok'), 'general');
    assert.equal(contextDeity('Shiv ji ki Katha', 'Jai shree shyam'), 'shiv', 'the video decides');
  });
  test('templates use the matching jaikara and the commenter\'s script; Khatu words only on Khatu content', () => {
    for (const [deity, d] of Object.entries(DEITIES)) {
      if (deity === 'sati') continue;
      for (const lang of ['hi', 'hinglish', 'en']) {
        for (const kind of ['jaikara', 'praise', 'wish', 'long', 'question', 'service']) {
          for (const t of templateCandidates({ deity, lang, kind, bhajan: true, platform: 'yt', rng: seeded() })) {
            assert.deepEqual(checkReply(t, { deity, lang, sati: false }), [], `${deity}/${lang}/${kind}: ${t}`);
          }
        }
      }
      if (deity !== 'khatu' && deity !== 'general') {
        const t = templateCandidates({ deity, lang: 'hi', kind: 'jaikara', rng: seeded() });
        assert.ok(t.some((x) => d.jai.hi.some((j) => x.includes(j.replace(' 🙏', '')))), deity);
        assert.ok(!t.some((x) => /श्याम/.test(x)), deity);
      }
    }
    const shiv = pickTemplate({ deity: 'shiv', lang: 'hinglish', kind: 'jaikara', rng: seeded() });
    assert.match(shiv, /Mahadev|Shivaya/);
    assert.doesNotMatch(shiv, /[ऀ-ॿ]/);
  });
  test('Rani Sati content: a neutral thank-you only, never to Claude', () => {
    const [it] = planComments([c({ key: 'yt:s', text: 'Jai Shree Dadi Rani Sati Ji Jhunjhunu Dham. 💯💯', title: 'Rani Sati Dadi Mandir Jhunjhunu' })], empty(), { now: NOW, rng: seeded() }).items;
    assert.equal(it.sati, true);
    assert.equal(it.needsAi, false);
    assert.ok(Object.values(SATI_THANKS).flat().includes(it.reply), it.reply);
    const q = planComments([c({ key: 'yt:s2', text: 'Dadi ji ka mela kab hai?', title: 'Rani Sati Dadi Mandir Jhunjhunu' })], empty(), { now: NOW, rng: seeded() }).items[0];
    assert.equal(q.needsAi, false);
    assert.ok(checkReply('जय दादी जी की 🙏', { deity: 'sati', lang: 'hi', sati: true }).length);
  });
  test('the bhajan pointer only on YouTube bhajan videos', () => {
    const yes = templateCandidates({ deity: 'khatu', lang: 'hi', kind: 'jaikara', bhajan: true, platform: 'yt', rng: () => 0.05 });
    assert.ok(yes.every((x) => x.endsWith(BHAJAN_CTA.hi)));
    const no = templateCandidates({ deity: 'khatu', lang: 'hi', kind: 'jaikara', bhajan: true, platform: 'fb', rng: () => 0.05 });
    assert.ok(no.every((x) => !x.includes('चैनल')));
  });
});

describe('spam filter and classification', () => {
  const kind = (t) => classify(t).kind;
  test('spam, scams and abuse are hidden', () => {
    assert.equal(kind('Visit https://bit.ly/xyz for blessings'), 'spam');
    assert.equal(kind('Contact 9876543210 for puja'), 'spam');
    assert.equal(kind('Ghar baithe paise kamaye, whatsapp me'), 'scam');
    assert.equal(kind('Love problem solution vashikaran specialist'), 'scam');
    assert.equal(kind('Please subscribe my channel'), 'spam');
    assert.equal(kind('Maine kar Diya h aap bhi follow kar dijiye'), 'promo');
    assert.notEqual(kind('subscribe kar diya ji, jai shree shyam'), 'promo', 'telling us they subscribed is fine');
    assert.equal(kind('chutiya video'), 'abuse');
  });
  test('political / communal fights and complaints are flagged, not answered', () => {
    assert.equal(kind('Modi ji ki jai, congress murdabad'), 'political');
    assert.equal(kind('ye galat jankari hai'), 'complaint');
    assert.equal(kind('Copyright mera video hai'), 'complaint');
    assert.equal(planComments([c({ text: 'Modi ji ki jai, congress murdabad' })], empty(), { now: NOW }).items[0].action, 'flag');
  });
  test('service questions and collab requests: a neutral thank-you, flagged for the owner', () => {
    assert.equal(kind('Bhajan sandhya booking ke liye kaise contact kare'), 'service');
    assert.equal(kind('Collab karoge? paid promotion'), 'collab');
    const it = planComments([c({ text: 'Collab karoge?' })], empty(), { now: NOW, rng: seeded() }).items[0];
    assert.equal(it.action, 'thanks+flag');
    assert.equal(it.needsAi, false);
    assert.deepEqual(checkReply(it.reply, it), []);
  });
  test('very short comments get templates; questions and longer ones go to Claude', () => {
    for (const t of ['Jai shree shyam', 'जय श्री श्याम 🙏🙏', '🙏', '❤️❤️❤️', 'Nice❤', 'hlw', 'Happy karwa chauth', '❤️🌹🙏Om Namah Shiva 🙏🌹❤️']) {
      assert.ok(['jaikara', 'praise', 'wish'].includes(kind(t)), t);
    }
    assert.equal(kind('Khatu dham kab jana chahiye'), 'question');
    assert.equal(kind('Are they dasmahavidya'), 'question');
    assert.equal(kind('Mere papa ki tabiyat theek nahi hai, baba se prarthana hai ki sab theek ho jaye'), 'long');
  });
  test('rate-limit / spam errors stop the platform', () => {
    for (const code of [4, 17, 32, 368, 613, 190, 200]) assert.equal(graphStops(code), true, String(code));
    assert.equal(graphStops(100, 'Invalid parameter'), false);
    assert.equal(graphStops(1, 'You are commenting too fast, temporarily blocked'), true);
  });
});

describe('the reply check (Claude\'s replies)', () => {
  const ctx = { deity: 'shiv', lang: 'hi', sati: false };
  test('rejects links, money, promises, EpiFive, owner names, CTAs, wrong jaikara and wrong script', () => {
    const bad = {
      'हर हर महादेव 🙏 https://youtu.be/x': 'a link',
      'हर हर महादेव 🙏 दान करें': 'money',
      'हर हर महादेव 🙏 जल्द ही नया वीडियो डालेंगे': 'a promise',
      'हर हर महादेव 🙏 EpiFive': 'EpiFive',
      'हर हर महादेव 🙏 सूरज कुमार': 'owner',
      'हर हर महादेव 🙏 चैनल को सब्सक्राइब करें': 'channel',
      'जय श्री श्याम 🙏 महादेव की कृपा बनी रहे': 'जय श्री श्याम',
      'Har Har Mahadev 🙏': 'Devanagari',
      'एक\nदो\nतीन': 'more than 2 lines',
    };
    for (const [reply, what] of Object.entries(bad)) assert.ok(checkReply(reply, ctx).some((p) => p.includes(what)), `${reply} -> ${what}`);
    assert.deepEqual(checkReply('हर हर महादेव 🙏 महादेव की कृपा आप पर सदा बनी रहे।', ctx), []);
    assert.deepEqual(checkReply('हर हर महादेव 🙏 महादेव की कृपा बनी रहे।\nपूरा भजन चैनल पर सुनें।', ctx), []);
  });
  test('Claude\'s reply is used when it passes, else the template; SKIP flags the comment', () => {
    const items = [
      { key: 'a', needsAi: true, reply: 'हर हर महादेव 🙏 आपकी बात के लिए धन्यवाद।', deity: 'shiv', lang: 'hi', sati: false },
      { key: 'b', needsAi: true, reply: 'हर हर महादेव 🙏 आपके संदेश के लिए धन्यवाद।', deity: 'shiv', lang: 'hi', sati: false },
      { key: 'c', needsAi: true, reply: 'हर हर महादेव 🙏 आपने लिखा, इसके लिए आभार।', deity: 'shiv', lang: 'hi', sati: false },
    ];
    const { final, problems } = resolveReplies(items, { a: 'हर हर महादेव 🙏 सावन में सोमवार का व्रत बहुत शुभ माना जाता है।', b: 'जय श्री श्याम 🙏', c: 'SKIP: political' });
    assert.equal(final.get('a').source, 'claude');
    assert.equal(final.get('b').source, 'template');
    assert.ok(problems.b.length);
    assert.equal(final.get('c').source, 'skip');
    assert.equal(final.get('c').text, null);
  });
});

describe('owner digest', () => {
  test('flagged comments of the last 24 h, with the reply count', () => {
    const state = empty();
    state.handled = { 'yt:1': { action: 'replied', at: '2026-11-14T08:00:00Z' }, 'yt:2': { action: 'replied', at: '2026-11-01T08:00:00Z' } };
    state.flags = [{ key: 'fb:1', at: '2026-11-14T09:00:00Z', platform: 'fb', author: '', text: 'Bhajan sandhya booking?', reason: 'asks about a service', url: 'https://fb.com/x' },
      { key: 'fb:0', at: '2026-11-10T09:00:00Z', platform: 'fb', text: 'old', reason: 'x' }];
    const md = digestMarkdown(state, { now: NOW });
    assert.match(md, /1 comment\(s\) answered automatically\. 1 need your eyes/);
    assert.match(md, /Facebook · asks about a service: "Bhajan sandhya booking\?" https:\/\/fb\.com\/x/);
    assert.doesNotMatch(md, /old/);
    assert.equal(digestMarkdown(empty(), { now: NOW }), '');
  });
});
