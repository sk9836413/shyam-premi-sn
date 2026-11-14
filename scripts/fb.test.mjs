// Facebook reach plan (owner, 11 Nov 2026: monetization challenge): scripts/fb.mjs (plan, times, caption template),
// the Facebook side of meta.mjs and photos.mjs, and scripts/fb-daily.mjs (insights progress, share kit rotation).
// Run: node --test scripts/fb.test.mjs
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GAP_MIN, assemble, checkFbCaption, fbDay, fbDecision, fbHashtags, fbLongText, fbPhotoCaption, fbPosted, fbSubject, fbVideoCaption, hindiName, igHashtags, igTagList, istAt, splitCaption } from './fb.mjs';
import { addDays, loadInputs, planDay } from './day-plan.mjs';
import { placements } from './status-engine.mjs';
import { fbAtOption, planShort } from './meta.mjs';
import { SLOTS, checkFbPost, slotsToBuild } from './photos.mjs';
import { bestVideos, groupsFor, metaDay, progress, todaysVideos, fbSlugs, shareLine } from './fb-daily.mjs';

const fest = (date, key, tier = 'status', theme = 'ekadashi') => ({
  date, key, tier, theme, label: key, names: [{ en: `${key} a`, hi: 'क' }, { en: `${key} b`, hi: 'ख' }], sources: [],
});
const synth = (list, o = {}) => ({
  festivals: new Map(list.map((f) => [f.date, { name: f.label, tier: f.tier, key: f.key, theme: f.theme }])),
  placements: placements(list), movies: new Map(), kalyug: true, kalyugLogged: new Set(), ...o,
});
const vids = (d) => d.videos.map((v) => `${v.slot} ${v.at}`);
const at = (date, hm) => istAt(date, hm);

describe('the Facebook day plan: every Short is a Facebook Reel, 90 min apart (owner, 13 Nov 2026)', () => {
  test('normal day: day-status Reel 10:30 (on render), evening darshan 20:30, photo 06:30', () => {
    const d = fbDay('2026-12-11', synth([]));
    assert.deepEqual(vids(d), ['morning 10:30', 'evening 20:30']);
    assert.equal(d.photo.at, '06:30');
  });
  test('festival eve: the status Reel keeps 20:00, the evening darshan moves to 18:30; the day-status Short is a Reel too', () => {
    const d = fbDay('2026-12-03', synth([fest('2026-12-04', 'x')]));
    assert.deepEqual(vids(d), ['morning 10:30', 'evening 18:30', 'eve 20:00']);
  });
  test('big festival day: 00:30 status + 08:30 statusday + evening darshan, all three', () => {
    const d = fbDay('2026-12-04', synth([fest('2026-12-04', 'x', 'big')]));
    assert.deepEqual(vids(d), ['status 00:30', 'statusday 08:30', 'evening 20:30']);
  });
  test('Kalyug and the Dadi-Chhotu noon Short (a Page video, over 90 s) are on Facebook now', () => {
    const tue = fbDay('2026-12-08', synth([]));
    assert.deepEqual(vids(tue), ['kalyug 08:00', 'morning 10:30', 'evening 20:30']);
    const wed = fbDay('2026-12-09', synth([], { kalyug: false }));
    assert.deepEqual(wed.videos.map((v) => `${v.slot} ${v.at} ${v.type}`), ['morning 10:30 reel', 'noon 15:00 video', 'evening 20:30 reel']);
  });
  test('movie day: the movie part (Page video) 07:30 + evening darshan', () => {
    const d = fbDay('2026-12-15', synth([], { movies: new Map([['2026-12-15', 's part 1']]) }));
    assert.deepEqual(vids(d), ['movie 07:30', 'evening 20:30']);
    assert.equal(d.videos[0].type, 'video');
  });
  test('a crowded morning: statusday 08:30 keeps its time, the movie part moves 90 min away (07:00)', () => {
    const d = fbDay('2026-12-04', synth([fest('2026-12-04', 'x', 'big')], { movies: new Map([['2026-12-04', 's part 1']]) }));
    assert.deepEqual(vids(d), ['status 00:30', 'movie 07:00', 'statusday 08:30']);
  });
  test('the real calendar (11 Nov 2026 - 31 Jan 2027): every YouTube Short is on Facebook, 90 min apart, the long one as a feed video (12:30; bhajan / mantra long 05:30)', () => {
    const inputs = loadInputs('.');
    for (let d = '2026-11-11'; d <= '2027-01-31'; d = addDays(d, 1)) {
      const p = fbDay(d, inputs);
      const shorts = planDay(d, inputs).uploads.filter((u) => u.slot !== 'long').map((u) => u.slot).sort();
      assert.deepEqual(p.videos.map((v) => v.slot).sort(), shorts, d);
      const times = p.videos.map((v) => at(d, v.at)).sort((a, b) => a - b);
      for (let i = 1; i < times.length; i++) assert.ok(times[i] - times[i - 1] >= GAP_MIN * 60e3, `${d}: ${vids(p)}`);
      const next = fbDay(addDays(d, 1), inputs).videos.filter((v) => v.slot === 'status');
      if (next.length && times.length) assert.ok(at(addDays(d, 1), '00:30') - times.at(-1) >= GAP_MIN * 60e3, `${d}: ${vids(p)} / next day 00:30`);
      const long = planDay(d, inputs).uploads.find((u) => u.slot === 'long');
      assert.deepEqual(p.feed.map((v) => `${v.slot} ${v.at} ${v.type} ${v.role}`), [`long ${long.dawn ? '05:30' : '12:30'} video feed`], d);
      // nothing but a dawn bhajan Reel (06:00) or a 00:30 status Reel is planned between 01:00 and 07:00
      for (const v of p.videos) if (v.at >= '01:00' && v.at < '07:00') assert.ok(v.at === '06:00' && planDay(d, inputs).uploads.find((u) => u.slot === v.slot)?.dawn, `${d}: ${vids(p)}`);
    }
  });
});

describe('fbDecision: the flag each workflow step passes', () => {
  const i = synth([fest('2026-12-04', 'x')]);
  test('evening darshan made at noon -> scheduled 20:30; on an eve day 18:30', () => {
    assert.deepEqual(fbDecision({ date: '2026-12-10', slot: 'evening', now: at('2026-12-10', '12:00'), inputs: i }).at, '2026-12-10T20:30');
    assert.equal(fbDecision({ date: '2026-12-03', slot: 'evening', now: at('2026-12-03', '12:00'), inputs: i }).at, '2026-12-03T18:30');
  });
  test('eve day, evening Short ready only at 18:46 -> 21:30 (90 min after the 20:00 status)', () => {
    assert.equal(fbDecision({ date: '2026-12-03', slot: 'evening', now: at('2026-12-03', '18:46'), inputs: i }).at, '2026-12-03T21:30');
  });
  test('day-status Short ready at 10:15 -> 10:30; at 11:00 -> now; ready at 17:00 -> still posted (no grace cut-off), 90 min before the 20:30 Reel', () => {
    assert.equal(fbDecision({ date: '2026-12-10', slot: 'morning', now: at('2026-12-10', '10:00'), inputs: i }).at, '2026-12-10T10:30');
    assert.equal(fbDecision({ date: '2026-12-10', slot: 'morning', now: at('2026-12-10', '11:00'), inputs: i }).at, 'now');
    const late = fbDecision({ date: '2026-12-10', slot: 'morning', now: at('2026-12-10', '17:00'), inputs: i });
    assert.equal(late.post, true);
    assert.equal(late.at, 'now');
    const later = fbDecision({ date: '2026-12-10', slot: 'morning', now: at('2026-12-10', '19:30'), inputs: i });
    assert.equal(later.at, '2026-12-10T22:00', later.why); // 20:30 + 90 min
  });
  test('two Shorts ready close together: the second is SCHEDULED 90 min after the first (published.md)', () => {
    const md = [
      '- 2026-12-10-morning-x | claim: 2026-12-10 morning by run 1 at 2026-12-10T05:00:00.000Z',
      '- 2026-12-10-morning-x | youtube: https://youtube.com/shorts/a | social: fb: https://www.facebook.com/reel/111 | ig: https://ig',
    ].join('\n');
    const posted = fbPosted(md);
    assert.deepEqual(posted, [{ slug: '2026-12-10-morning-x', date: '2026-12-10', slot: 'morning', at: Date.parse('2026-12-10T05:00:00.000Z') }]);
    // the morning Reel went out at 10:30 IST; a replacement Short of another slot ready at 10:40 -> 12:00
    const d = fbDecision({ date: '2026-12-10', slot: 'kalyug', now: at('2026-12-10', '10:40'), inputs: i, posted });
    assert.equal(d.at, '2026-12-10T12:00', d.why);
  });
  test('a Reel scheduled for 20:30 already (published.md) pushes a late Short to 22:00', () => {
    const md = '- 2026-12-10-evening-x | youtube: y | social: fb: https://www.facebook.com/reel/222 (scheduled 2026-12-10T15:00:00.000Z) | ig: pending z';
    const d = fbDecision({ date: '2026-12-10', slot: 'morning', now: at('2026-12-10', '20:00'), inputs: i, posted: fbPosted(md) });
    assert.equal(d.at, '2026-12-10T22:00', d.why);
  });
  test('status variants at their own time; statusday, noon and kalyug go to Facebook too', () => {
    assert.equal(fbDecision({ date: '2026-12-04', slot: 'status', festivalDate: '2026-12-04', now: at('2026-12-03', '19:00'), inputs: i }).at, '2026-12-04T00:30');
    assert.equal(fbDecision({ date: '2026-12-03', slot: 'eve', festivalDate: '2026-12-04', now: at('2026-12-03', '12:30'), inputs: i }).at, '2026-12-03T20:00');
    const big = synth([fest('2026-12-04', 'x', 'big')]);
    assert.equal(fbDecision({ date: '2026-12-04', slot: 'statusday', now: at('2026-12-03', '19:00'), inputs: big }).at, '2026-12-04T08:30');
    assert.equal(fbDecision({ date: '2026-12-09', slot: 'noon', now: at('2026-12-09', '13:00'), inputs: synth([]) }).at, '2026-12-09T15:00');
    assert.equal(fbDecision({ date: '2026-12-08', slot: 'kalyug', now: at('2026-12-07', '21:00'), inputs: synth([]) }).at, '2026-12-08T08:00');
  });
  test('a Short not in the plan (a replacement) still goes to Facebook, at a free time', () => {
    const d = fbDecision({ date: '2026-12-10', slot: 'bhajan', now: at('2026-12-10', '12:00'), inputs: i });
    assert.equal(d.post, true);
    assert.equal(d.at, '2026-12-10T19:00', d.why); // wanted 19:45, but the 20:30 evening Reel is 45 min away
  });
  test('the long katha: a 12:30 feed video every day, on top of the Reels (normal, festival and movie days)', () => {
    const m = synth([fest('2026-12-04', 'x', 'big')], { movies: new Map([['2026-12-15', 's part 1']]) });
    for (const d of ['2026-12-02', '2026-12-04', '2026-12-15']) {
      const day = fbDay(d, m);
      assert.ok(day.videos.length >= 2, d);
      assert.deepEqual(day.feed, [{ slot: 'long', at: '12:30', kind: 'long', role: 'feed', type: 'video' }], d);
      assert.deepEqual(fbDecision({ date: d, slot: 'long', now: at(d, '10:00'), inputs: m }), { post: true, at: `${d}T12:30`, why: 'feed 12:30 IST' });
    }
  });
  test('the long katha after 12:30: straight away up to 6 h late, then not at all', () => {
    assert.equal(fbDecision({ date: '2026-12-02', slot: 'long', now: at('2026-12-02', '12:20'), inputs: i }).at, 'now');
    assert.equal(fbDecision({ date: '2026-12-02', slot: 'long', now: at('2026-12-02', '18:00'), inputs: i }).at, 'now');
    assert.equal(fbDecision({ date: '2026-12-02', slot: 'long', now: at('2026-12-02', '18:45'), inputs: i }).post, false);
  });
  test('the long katha Facebook text: no like/share/subscribe line, the subject\'s 3 hashtags', () => {
    const yt = 'Chhath Puja ke chaar din.\nYe katha lok manyata ke anusar hai.\nJai Shree Shyam 🙏\nVideo achha laga ho to Like, Share aur Shyam Premi SN ko Subscribe karein.\n#ChhathPuja #NahayKhay #ChhathiMaiya';
    const t = fbLongText(yt);
    assert.doesNotMatch(t, /Like|Share|Subscribe/);
    assert.equal(t.split('\n').at(-1), '#ChhathPuja #ChhathiMaiya #Bhakti'); // Chhath: no Khatu Shyam tags
    assert.match(t, /^Chhath Puja ke chaar din\.\nYe katha/);
    assert.equal(fbLongText('Khatu Shyam ji ki katha.\n#KhatuShyam #Barbarik').split('\n').at(-1), '#KhatuShyam #JaiShreeShyam #Barbarik');
    assert.equal(fbLongText('Somnath ki katha.\nJai Shree Shyam 🙏\n#Somnath #Jyotirlinga', { deity: 'Mahadev (Somnath)', temple: 'somnath' }).split('\n').at(-1), '#Mahadev #HarHarMahadev #Somnath');
  });
});

describe('hashtags match the subject (owner, 13 Nov 2026)', () => {
  test('Khatu Shyam content: #KhatuShyam #JaiShreeShyam + 1 topical', () => {
    assert.deepEqual(fbHashtags({ youtube_title: 'Khatu Shyam Mandir Darshan | खाटू श्याम मंदिर #Shorts', temple: 'khatu-shyam-mandir' }), ['#KhatuShyam', '#JaiShreeShyam', '#KhatuShyamMandir']);
    assert.deepEqual(fbHashtags({ format: 'status', festival: 'Khatu Shyam Janmotsav', youtube_title: 'Khatu Shyam Janmotsav Status 2026 | श्याम जन्मोत्सव स्टेटस #Shorts' }), ['#KhatuShyam', '#JaiShreeShyam', '#KhatuShyamJanmotsav']);
    assert.deepEqual(fbHashtags({ format: 'status', festival: 'Gyaras (Dev Uthani Ekadashi)', deity: 'Khatu Shyam ji' }), ['#KhatuShyam', '#JaiShreeShyam', '#Gyaras']);
  });
  test('a festival not about Khatu Shyam ji: the festival tag + 2 generic ones (Chhath bhajan, Chhath status)', () => {
    const bhajan = JSON.parse(fs.readFileSync('story/published/2026-11-13-bhajan-chhath-nahay-khay-geet.json', 'utf8'));
    assert.deepEqual(fbHashtags(bhajan), ['#ChhathPuja', '#ChhathGeet', '#Bhakti']);
    assert.deepEqual(fbHashtags({ format: 'status', festival: 'Chhath Puja (Nahay Khay)' }), ['#ChhathPuja', '#ChhathiMaiya', '#Bhakti']);
    assert.deepEqual(fbHashtags({ format: 'status', festival: 'Masik Shivratri' }), ['#Shivratri', '#HarHarMahadev', '#Bhakti']);
    assert.deepEqual(fbHashtags({ format: 'status', festival: 'Gopashtami' }), ['#Gopashtami', '#JaiShreeKrishna', '#Bhakti']);
    // the 13 Nov Reel: its caption kept the Khatu tags; the Facebook text now gets the Chhath ones
    const fb = fbVideoCaption({ ...bhajan, bhajan: { id: bhajan.bhajan_id } }).text;
    assert.equal(fb.split('\n').at(-1), '#ChhathPuja #ChhathGeet #Bhakti');
    assert.doesNotMatch(fb, /#KhatuShyam|#JaiShreeShyam/);
  });
  test('deity / temple content: the deity tag + its greeting + the temple or #Bhakti', () => {
    assert.deepEqual(fbHashtags({ deity: 'Mahadev', youtube_title: 'Mahadev Status | महादेव #Shorts' }), ['#Mahadev', '#HarHarMahadev', '#Bhakti']);
    assert.deepEqual(fbHashtags({ temple: 'somnath-jyotirlinga', youtube_title: 'Somnath Jyotirlinga Darshan | सोमनाथ #Shorts' }), ['#Mahadev', '#HarHarMahadev', '#SomnathJyotirlinga']);
    assert.deepEqual(fbHashtags({ format: 'status', day_status: 'guruvar-vishnu', festival: 'Guruvar Vishnu ji', deity: 'Vishnu ji / Sai Baba (Guruvar)' }), ['#VishnuJi', '#JaiShreeHari', '#Bhakti']);
    assert.deepEqual(fbHashtags({ temple: 'vaishno-devi', youtube_title: 'Vaishno Devi Darshan | वैष्णो देवी #Shorts' }), ['#MataRani', '#JaiMataDi', '#VaishnoDevi']);
  });
  test('the check: Khatu tags on a non-Khatu post fail; the subject\'s own tags pass', () => {
    const chhath = { format: 'status', festival: 'Chhath Puja (Kharna)', bhajan_short: true };
    const body = 'जय छठी मइया 🙏 खरना की खीर आपके घर किस चूल्हे पर बनती है?\nछठ का दूसरा दिन खरना, गुड़ की खीर और रोटी का प्रसाद।';
    assert.ok(checkFbCaption(`${body}\n\n#KhatuShyam #JaiShreeShyam #ChhathPuja`, { draft: true, subject: chhath }).some((e) => /not about Khatu/.test(e)));
    assert.deepEqual(checkFbCaption(`${body}\n\n#ChhathPuja #ChhathGeet #Bhakti`, { draft: true, subject: chhath }), []);
    assert.deepEqual(checkFbCaption(`${body}\n\n#Chhath2026 #ChhathiMaiya #Bhakti`, { draft: true, subject: chhath }), []);
    assert.ok(checkFbCaption(`${body}\n\n#Bhakti #Devotion #Hindu`, { draft: true, subject: chhath }).some((e) => /name the subject/.test(e)));
    const khatu = { temple: 'khatu-shyam-mandir' };
    const kb = 'हारे का सहारा, बाबा श्याम हमारा 🙏 क्या आप कभी खाटू धाम गए हैं?\nसीकर, राजस्थान में बाबा श्याम का धाम।';
    assert.deepEqual(checkFbCaption(`${kb}\n\n#KhatuShyam #JaiShreeShyam #KhatuDham`, { draft: true, subject: khatu }), []);
    assert.ok(checkFbCaption(`${kb}\n\n#ShyamBaba #KhatuDham #Bhakti`, { draft: true, subject: khatu }).some((e) => /#KhatuShyam #JaiShreeShyam/.test(e)));
    // without a subject the caption's own text decides (the sign-off "जय श्री श्याम" alone does not make it Khatu content)
    assert.ok(checkFbCaption(`${body} जय श्री श्याम\n\n#KhatuShyam #JaiShreeShyam #ChhathPuja`).some((e) => /not about Khatu/.test(e)));
  });
  test('Instagram: same subject-matching (Khatu-only tags swapped on non-Khatu posts; Khatu posts unchanged)', () => {
    const chhath = { festival: 'Chhath Puja' };
    assert.deepEqual(igTagList(['#JaiShreeShyam', '#KhatuShyam', '#ShyamBaba', '#ChhathiMaiya', '#SuryaDev'], chhath), ['#ChhathPuja', '#ChhathiMaiya', '#SuryaDev']);
    assert.deepEqual(igTagList(['#KhatuShyam', '#JaiShreeShyam', '#KhatuDham'], { temple: 'khatu-shyam-mandir' }), ['#KhatuShyam', '#JaiShreeShyam', '#KhatuDham']);
    const cap = 'Somnath ke darshan 🙏\nJai Shree Shyam\n\n#KhatuShyam #Somnath #JaiShreeShyam #HarHarMahadev #Jyotirlinga';
    assert.equal(igHashtags(cap, { temple: 'somnath', youtube_title: 'Somnath Darshan' }), 'Somnath ke darshan 🙏\nJai Shree Shyam\n\n#Mahadev #Somnath #HarHarMahadev #Jyotirlinga');
    assert.equal(igHashtags(cap.replace('Somnath', 'Khatu'), { temple: 'khatu-shyam-mandir' }), cap.replace('Somnath', 'Khatu'));
  });
  test('fbSubject reads a spec with no known deity from its own texts', () => {
    const s = JSON.parse(fs.readFileSync('story/published/2026-11-11-morning-yamunotri-bhai-dooj-darshan.json', 'utf8'));
    assert.notEqual(fbSubject(s).kind, 'khatu');
    assert.doesNotMatch(fbVideoCaption(s).text.split('\n').at(-1), /#KhatuShyam/);
  });
});

describe('caption template', () => {
  const good = 'हर हर महादेव 🙏 क्या आपने कभी सोमनाथ ज्योतिर्लिंग के दर्शन किए हैं?\nप्रभास पाटन में समुद्र किनारे बारह ज्योतिर्लिंगों में पहला (मान्यता)।\nSomnath Jyotirlinga, Gujarat ke darshan.\n\n#Mahadev #HarHarMahadev #Somnath';
  const somnath = { temple: 'somnath', youtube_title: 'Somnath Jyotirlinga Darshan | सोमनाथ ज्योतिर्लिंग #Shorts' };
  test('the STORY.md example passes', () => assert.deepEqual(checkFbCaption(good, { draft: true, subject: somnath }), []));
  test('bait in Hinglish or Hindi fails', () => {
    for (const bad of ['Like, Share aur Follow karein.', 'कमेंट में जय श्री श्याम लिखें', 'Apno ko bhejein 🙏', 'Share karo warna']) {
      const t = good.replace('Somnath Jyotirlinga, Gujarat ke darshan.', bad);
      assert.ok(checkFbCaption(t).some((e) => /bait/.test(e)), bad);
    }
  });
  test('hashtags: exactly 3, relevant to the subject, only on the last line', () => {
    assert.ok(checkFbCaption(good.replace('#Somnath', '#Somnath #Jyotirlinga')).length);
    assert.ok(checkFbCaption(good.replace('#Mahadev #HarHarMahadev', '#KhatuShyam #JaiShreeShyam'), { subject: somnath }).some((e) => /not about Khatu/.test(e)));
    assert.ok(checkFbCaption(good.replace('#Mahadev', '#HarHarMahadev')).some((e) => /3 different/.test(e)));
    assert.ok(checkFbCaption(good.replace('(मान्यता)।', '#Somnath')).length);
  });
  test('line 1 needs Devanagari and a question; 1-2 context lines; mostly Devanagari; no URL in a draft', () => {
    assert.ok(checkFbCaption(good.replace('क्या आपने कभी सोमनाथ ज्योतिर्लिंग के दर्शन किए हैं?', 'सोमनाथ दर्शन।')).some((e) => /question/.test(e)));
    assert.ok(checkFbCaption('Har Har Mahadev 🙏 Kya aap Somnath gaye hain?\nSomnath ke darshan.\n\n#Mahadev #HarHarMahadev #Somnath').length);
    assert.ok(checkFbCaption(good.replace('\n\n#', '\nएक\nदो\n\n#')).some((e) => /context/.test(e)));
    assert.ok(checkFbCaption(good.replace('\n\n#', '\nhttps://x.com\n\n#'), { draft: true }).some((e) => /URL/.test(e)));
  });
  test('link, AI line and credits go between the body and the hashtags', () => {
    const t = assemble({ lines: good.split('\n').slice(0, 3), tags: ['#Mahadev', '#HarHarMahadev', '#Somnath'], links: ['🙏 card: https://sk9836413.github.io/shyam-premi-sn/janmotsav/?utm_source=facebook'], credits: ['📷 Photo: A, CC BY 4.0, via Wikimedia Commons'], ai: true });
    assert.deepEqual(checkFbCaption(t, { subject: somnath }), []);
    assert.equal(splitCaption(t).links.length, 1);
  });
  test('composed captions of real published specs pass with their subject (status, darshan, morning, bhajan, long)', () => {
    for (const f of fs.readdirSync('story/published').filter((x) => /^2026-11-1[0-3]-.*\.json$/.test(x) && !x.endsWith('.meta.json'))) {
      const spec = JSON.parse(fs.readFileSync(`story/published/${f}`, 'utf8'));
      const r = fbVideoCaption(spec);
      assert.deepEqual(checkFbCaption(r.text, { subject: spec }), [], `${f}:\n${r.text}`);
      assert.ok(!/download karein/i.test(r.text), `${f}: the status download link stays off Facebook`);
    }
  });
  test('hindiName strips the format words', () => {
    assert.equal(hindiName({ youtube_title: 'Bhai Dooj Status 2026 | भाई दूज स्टेटस वीडियो #Shorts' }), 'भाई दूज');
    assert.equal(hindiName({ youtube_title: 'Somnath Darshan | सोमनाथ ज्योतिर्लिंग के दर्शन #Shorts' }), 'सोमनाथ ज्योतिर्लिंग');
  });
  test('photo post 1: composed darshan and festival texts pass with the subject\'s tags; a good fb_caption is used as written', () => {
    const p = { kind: 'darshan', date: '2026-11-13', temple: 'somnath', templeName: 'Somnath Temple, Gujarat', place: 'सोमनाथ ज्योतिर्लिंग, गुजरात', blessing: 'आपका दिन मंगलमय हो', hashtags: ['#JaiShreeShyam', '#HarHarMahadev'] };
    const d = fbPhotoCaption(p, { credits: ['📷 Photo: A, CC0, via Wikimedia Commons: https://commons.wikimedia.org/x'] });
    assert.deepEqual(checkFbCaption(d.text, { subject: p }), [], d.text);
    assert.match(d.text, /#Mahadev #HarHarMahadev #Somnath$/);
    const f = fbPhotoCaption({ kind: 'festival', date: '2026-11-20', festival: { key: 'janmotsav', big: 'श्याम जन्मोत्सव', line: 'जय श्री श्याम 🙏', blessing: 'बाबा श्याम के जन्मोत्सव की हार्दिक शुभकामनाएं' }, hashtags: ['#KhatuShyamJanmotsav'] }, { ai: true });
    assert.deepEqual(checkFbCaption(f.text), [], f.text);
    assert.match(f.text, /#KhatuShyam #JaiShreeShyam #KhatuShyamJanmotsav$/);
    const c = fbPhotoCaption({ kind: 'festival', date: '2026-11-15', festival: { key: 'chhath', big: 'छठ पूजा', line: 'जय छठी मइया 🙏', blessing: 'छठी मइया सबकी मनोकामना पूरी करें' }, hashtags: ['#JaiShreeShyam', '#ChhathPuja'] }, { ai: true });
    assert.match(c.text, /#ChhathPuja #ChhathiMaiya #Bhakti$/, c.text);
    const own = fbPhotoCaption({ kind: 'darshan', date: '2026-11-13', temple: 'somnath', fbCaption: good }, {});
    assert.equal(own.source, 'claude');
    assert.equal(fbPhotoCaption({ kind: 'darshan', date: '2026-11-13', temple: 'somnath', fbCaption: good.replace('#Mahadev #HarHarMahadev', '#KhatuShyam #JaiShreeShyam') }, {}).source, 'composed');
  });
});

describe('meta.mjs: Facebook time separate from YouTube/Instagram', () => {
  const now = Date.parse('2026-12-10T06:30:00Z'); // 12:00 IST
  const v = { seconds: 25, width: 1080, height: 1920, now };
  test('--fb-at 20:30 schedules Facebook at 20:30 while Instagram stays queued for 19:00', () => {
    const p = planShort({ ...v, publishAt: Date.parse('2026-12-10T13:30:00Z'), fbAt: Date.parse('2026-12-10T15:00:00Z') });
    assert.equal(p.fbSchedule.scheduled_publish_time, String(Date.parse('2026-12-10T15:00:00Z') / 1000));
    assert.equal(p.igAt, '2026-12-10T13:30:00.000Z');
  });
  test('--no-fb skips Facebook only; --fb-at now posts at once; no flag = as before', () => {
    assert.equal(planShort({ ...v, publishAt: Date.parse('2026-12-10T13:30:00Z'), fbAt: 'skip' }).fb, 'skip');
    assert.deepEqual(planShort({ ...v, fbAt: null }).fbSchedule, {});
    assert.equal(planShort({ ...v, publishAt: Date.parse('2026-12-10T13:30:00Z') }).fbSchedule.video_state, 'SCHEDULED');
    assert.equal(fbAtOption(undefined, true), 'skip');
    assert.equal(fbAtOption('now'), null);
    assert.equal(fbAtOption(undefined), undefined);
    assert.equal(fbAtOption('2026-12-10T20:30', false, now), Date.parse('2026-12-10T15:00:00Z'));
    assert.equal(fbAtOption('2026-12-10T07:30', false, now), null); // past -> now
  });
});

describe('photos.mjs: one Facebook photo a day', () => {
  test('only post 1 has a Facebook time (06:30); Instagram times unchanged', () => {
    assert.deepEqual(SLOTS.map((s) => [s.n, s.fb, s.ig]), [[1, '06:30', '09:13'], [2, null, '10:43'], [3, null, '18:46'], [4, null, '19:46']]);
  });
  test('slotsToBuild still builds every Instagram slot ahead', () => {
    assert.deepEqual(slotsToBuild('2026-12-11', Date.parse('2026-12-10T13:16:00Z')), [1, 2, 3, 4]);
  });
  test('post 1 needs a template fb_caption; other posts none', () => {
    assert.ok(checkFbPost({}, { n: 1, fbAt: 'x' }).length);
    assert.deepEqual(checkFbPost({}, { n: 2, fbAt: null }), []);
  });
});

describe('fb-daily.mjs: insights and share kit', () => {
  test('Meta day = the date before end_time', () => assert.equal(metaDay('2026-11-12T08:00:00+0000'), '2026-11-11'));
  test('30-day progress toward 1,000,000', () => {
    const p = progress({ '2026-11-10': { page_media_view: 999 }, '2026-11-11': { page_media_view: 1000 }, '2026-11-12': { page_media_view: 3000 } }, { now: Date.parse('2026-11-12T12:00:00Z') });
    assert.equal(p.total, 4000);
    assert.equal(p.day, 2);
    assert.equal(p.end, '2026-12-10');
    assert.equal(p.daysLeft, 29);
    assert.equal(p.needPerDay, Math.ceil(996000 / 29));
    assert.match(p.line, /4,000 \/ 1,000,000/);
  });
  test('groups rotate: each group every second day, 15 split 8/7', () => {
    const g = Array.from({ length: 15 }, (_, i) => ({ id: i }));
    const a = groupsFor(g, '2026-11-12').map((x) => x.id);
    const b = groupsFor(g, '2026-11-13').map((x) => x.id);
    assert.equal(a.length + b.length, 15);
    assert.equal(new Set([...a, ...b]).size, 15);
    assert.deepEqual(groupsFor(g, '2026-11-14').map((x) => x.id), a);
  });
  test('the groups file has 15 groups with a URL and a checked date', () => {
    const j = JSON.parse(fs.readFileSync('automation/fb-groups.json', 'utf8'));
    assert.equal(j.groups.length, 15);
    for (const x of j.groups) {
      assert.match(x.url, /^https:\/\/www\.facebook\.com\/groups\/[\w.]+\/$/);
      assert.match(x.checked, /^\d{4}-\d{2}-\d{2}$/);
    }
  });
  test("today's Facebook videos come from published.md (scheduled time decides the date)", () => {
    const md = [
      '- 2026-11-12-evening-x | youtube: y | social: fb: https://www.facebook.com/reel/111 (scheduled 2026-11-12T15:00:00.000Z) | ig: pending z',
      '- 2026-11-13-status-x | youtube: y | social: fb: https://www.facebook.com/reel/222 (scheduled 2026-11-12T19:00:00.000Z) | ig: pending z',
      '- 2026-11-12-morning-x | youtube: y | social: fb: skipped (not in the Facebook plan) | ig: https://ig',
    ].join('\n');
    assert.deepEqual(todaysVideos(md, '2026-11-12').map((x) => x.url), ['https://www.facebook.com/reel/111']);
    assert.deepEqual(todaysVideos(md, '2026-11-13').map((x) => x.url), ['https://www.facebook.com/reel/222']);
    assert.deepEqual(fbSlugs(md), { 111: '2026-11-12-evening-x', 222: '2026-11-13-status-x' });
  });
  test('share kit: every Short is a Reel now, so it lists the best 2 (festival status, then bhajan / Khatu darshan, then plays)', () => {
    const v = (slug, id, at) => ({ slug, url: `https://www.facebook.com/reel/${id}`, at });
    const day = [
      v('2026-12-10-morning-somvar-mahadev', 1, '2026-12-10T05:00:00.000Z'),
      v('2026-12-10-evening-somnath-darshan', 2, '2026-12-10T15:00:00.000Z'),
      v('2026-12-10-kalyug-ep-3', 3, '2026-12-10T02:30:00.000Z'),
      v('2026-12-10-evening-khatu-shyam-mandir-darshan', 4, '2026-12-10T13:00:00.000Z'),
      v('2026-12-10-eve-utpanna-ekadashi', 5, '2026-12-10T14:30:00.000Z'),
    ];
    const specOf = (slug) => (/somvar/.test(slug) ? { day_status: 'somvar' } : null);
    assert.deepEqual(bestVideos(day, { specOf }).slice(0, 2).map((x) => x.url.split('/').pop()), ['5', '4']);
    // same format: more plays first
    assert.deepEqual(bestVideos(day.slice(0, 2).concat(v('2026-12-10-morning-salasar', 6, null)), { specOf, reels: { 6: { fb_reels_total_plays: 40 }, 2: { fb_reels_total_plays: 3 } } }).map((x) => x.url.split('/').pop()), ['6', '2', '1']);
  });
  test('share lines are Hindi, personal, no asks', () => {
    const spec = JSON.parse(fs.readFileSync('story/published/2026-11-11-evening-somnath-jyotirlinga-darshan.json', 'utf8'));
    const l = shareLine(spec, spec.slug);
    assert.match(l, /[ऀ-ॿ]/);
    assert.ok(!/share|like|comment|शेयर|लाइक|कमेंट|भेजें/i.test(l), l);
  });
});

// Owner, 14 Nov 2026: "Bhajan subah subah hi bajate h log". Dawn bhajan Short: YouTube 05:45, Facebook Reel 06:00,
// Instagram queued 06:00; bhajan / mantra long video: YouTube + Facebook feed 05:30. Katha long video: 12:30.
describe('dawn uploads on Facebook', () => {
  const real = loadInputs('.');
  test('15 / 16 Nov 2026: 00:30 status Reel, 06:00 dawn bhajan Reel (5.5 h apart), the rest of the day unchanged', () => {
    assert.deepEqual(vids(fbDay('2026-11-15', real)), ['status 00:30', 'morning 06:00', 'eve 20:00']);
    assert.deepEqual(vids(fbDay('2026-11-16', real)), ['status 00:30', 'morning 06:00', 'evening 20:30']);
    assert.ok(at('2026-11-15', '06:00') - at('2026-11-15', '00:30') >= GAP_MIN * 60e3);
  });
  test('rendered the evening before (18:46 IST): Facebook scheduled for 06:00 of the publish day', () => {
    const pub = fs.readFileSync('automation/published.md', 'utf8');
    for (const d of ['2026-11-15', '2026-11-16']) {
      const r = fbDecision({ date: d, slot: 'morning', now: at(addDays(d, -1), '18:46'), inputs: real, posted: fbPosted(pub) });
      assert.equal(r.at, `${d}T06:00`, r.why);
    }
  });
  test('the evening render failed: made by the morning run (09:20) -> posted now', () => {
    assert.equal(fbDecision({ date: '2026-11-15', slot: 'morning', now: at('2026-11-15', '09:20'), inputs: real }).at, 'now');
  });
  test('a synthetic dawn day: a movie / kalyug / statusday Reel is never pulled into 01:00-07:00 by the 06:00 bhajan', () => {
    const big = synth([fest('2026-12-04', 'x')], { movies: new Map([['2026-12-04', 's part 1']]),
      override: { days: { '2026-12-04': { slots: { morning: { kind: 'bhajan', day: 'x', title: 't' } } } } } });
    const d = fbDay('2026-12-04', big);
    assert.deepEqual(vids(d), ['status 00:30', 'morning 06:00', 'movie 07:30']);
    const k = fbDay('2026-12-08', synth([], { override: { days: { '2026-12-08': { slots: { morning: { kind: 'bhajan', day: 'x', title: 't' } } } } } }));
    assert.deepEqual(vids(k), ['morning 06:00', 'kalyug 08:00', 'evening 20:30']);
    for (const v of d.videos) assert.ok(v.at === '00:30' || v.at === '06:00' || v.at >= '07:00', vids(d).join(', '));
    const times = d.videos.map((v) => at('2026-12-04', v.at)).sort((a, b) => a - b);
    for (let k = 1; k < times.length; k++) assert.ok(times[k] - times[k - 1] >= GAP_MIN * 60e3, vids(d).join(', '));
  });
  test('upload-time scheduling never moves a normal Reel into the night (01:00-07:00)', () => {
    const i = synth([]);
    // a morning Short ready at 23:50 the day before its date (made early): 10:30, not 01:00-07:00
    const r = fbDecision({ date: '2026-12-11', slot: 'morning', now: at('2026-12-10', '23:50'), inputs: i });
    assert.equal(r.at, '2026-12-11T10:30', r.why);
  });
  test('feed video: the mantra jaap / jukebox at 05:30, made the evening before; the katha keeps 12:30 (--at 12:30)', () => {
    assert.deepEqual(fbDecision({ date: '2026-11-22', slot: 'long', now: at('2026-11-21', '18:50'), inputs: real }), { post: true, at: '2026-11-22T05:30', why: 'feed 05:30 IST' });
    // morning fallback: the mantra made at 09:40 goes out at once (never later than 12:30 + grace)
    assert.equal(fbDecision({ date: '2026-11-22', slot: 'long', now: at('2026-11-22', '09:40'), inputs: real }).at, 'now');
    // the long job's katha on a mantra day (the mantra failed): 12:30 like YouTube
    assert.equal(fbDecision({ date: '2026-11-22', slot: 'long', now: at('2026-11-22', '10:30'), inputs: real, at: '12:30' }).at, '2026-11-22T12:30');
    assert.equal(fbDay('2026-11-22', real).feed[0].at, '05:30');
    assert.equal(fbDay('2026-11-21', real).feed[0].at, '12:30');
  });
  test('Instagram: --ig-at gives the queue its own time (YouTube 05:45, Instagram 06:00); past = at once', () => {
    const now = at('2026-11-14', '18:50');
    const p = planShort({ seconds: 88, width: 1080, height: 1920, publishAt: at('2026-11-15', '05:45'), fbAt: at('2026-11-15', '06:00'), igAt: at('2026-11-15', '06:00'), now });
    assert.equal(p.igAt, new Date(at('2026-11-15', '06:00')).toISOString());
    assert.equal(p.fbSchedule.scheduled_publish_time, String(at('2026-11-15', '06:00') / 1000));
    const late = planShort({ seconds: 88, width: 1080, height: 1920, publishAt: null, fbAt: null, igAt: null, now: at('2026-11-15', '09:20') });
    assert.equal(late.igAt, null);
    const plain = planShort({ seconds: 88, width: 1080, height: 1920, publishAt: at('2026-11-15', '19:00'), now });
    assert.equal(plain.igAt, new Date(at('2026-11-15', '19:00')).toISOString(), 'without --ig-at Instagram follows YouTube');
  });
});
