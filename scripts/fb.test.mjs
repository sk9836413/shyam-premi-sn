// Facebook reach plan (owner, 11 Nov 2026: monetization challenge): scripts/fb.mjs (plan, times, caption template),
// the Facebook side of meta.mjs and photos.mjs, and scripts/fb-daily.mjs (insights progress, share kit rotation).
// Run: node --test scripts/fb.test.mjs
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FB_TIMES, assemble, checkFbCaption, fbDay, fbDecision, fbLongText, fbPhotoCaption, fbVideoCaption, hindiName, istAt, splitCaption } from './fb.mjs';
import { addDays, loadInputs } from './day-plan.mjs';
import { placements } from './status-engine.mjs';
import { fbAtOption, planShort } from './meta.mjs';
import { SLOTS, checkFbPost, slotsToBuild } from './photos.mjs';
import { groupsFor, metaDay, progress, todaysVideos, fbSlugs, shareLine } from './fb-daily.mjs';

const fest = (date, key, tier = 'status', theme = 'ekadashi') => ({
  date, key, tier, theme, label: key, names: [{ en: `${key} a`, hi: 'क' }, { en: `${key} b`, hi: 'ख' }], sources: [],
});
const synth = (list, o = {}) => ({
  festivals: new Map(list.map((f) => [f.date, { name: f.label, tier: f.tier, key: f.key, theme: f.theme }])),
  placements: placements(list), movies: new Map(), kalyug: true, kalyugLogged: new Set(), ...o,
});
const vids = (d) => d.videos.map((v) => `${v.slot} ${v.at}`);
const at = (date, hm) => istAt(date, hm);

describe('the Facebook day plan: at most 2 videos + 1 photo', () => {
  test('normal day: day-status Reel 07:30, evening darshan 20:30, photo 06:30', () => {
    const d = fbDay('2026-12-10', synth([]));
    assert.deepEqual(vids(d), ['morning 07:30', 'evening 20:30']);
    assert.equal(d.photo.at, '06:30');
  });
  test('festival eve: the status Reel at 20:00, the evening darshan moves to 18:00; the day-status Short stays off Facebook', () => {
    const d = fbDay('2026-12-03', synth([fest('2026-12-04', 'x')]));
    assert.deepEqual(vids(d), ['evening 18:00', 'eve 20:00']);
  });
  test('festival day: the 00:30 status Reel + evening darshan; the morning temple Short and statusday are off Facebook', () => {
    const d = fbDay('2026-12-04', synth([fest('2026-12-04', 'x', 'big')]));
    assert.deepEqual(vids(d), ['status 00:30', 'evening 20:30']);
  });
  test('two festivals on one date: the big one wins Reel 1; no evening Short -> the other status fills Reel 2', () => {
    const i = synth([fest('2026-12-06', 'small'), fest('2026-12-07', 'large', 'big')]);
    const d = fbDay('2026-12-06', i);
    assert.equal(d.videos.length, 2);
    assert.ok(d.videos.every((v) => v.kind === 'status' || v.kind === 'temple'));
  });
  test('movie day: the movie part (Page video) 07:30 + evening darshan', () => {
    const d = fbDay('2026-12-15', synth([], { movies: new Map([['2026-12-15', 's part 1']]) }));
    assert.deepEqual(vids(d), ['movie 07:30', 'evening 20:30']);
    assert.equal(d.videos[0].type, 'video');
  });
  test('the real calendar (11 Nov 2026 - 31 Jan 2027): never more than 2 videos, never two at the same time, 2 h apart', () => {
    const inputs = loadInputs('.');
    for (let d = '2026-11-11'; d <= '2027-01-31'; d = addDays(d, 1)) {
      const p = fbDay(d, inputs);
      assert.ok(p.videos.length <= 2, `${d}: ${vids(p)}`);
      if (p.videos.length === 2) {
        const [a, b] = p.videos.map((v) => at(d, v.at));
        assert.ok(Math.abs(a - b) >= 2 * 3600e3, `${d}: ${vids(p)}`);
      }
      assert.ok(!p.videos.some((v) => ['kalyug', 'long', 'noon', 'statusday'].includes(v.slot)), `${d}: ${vids(p)}`);
      // + the daily long katha as a feed Page video at 12:30, outside the 2 Reels (owner, 13 Nov 2026)
      assert.deepEqual(p.feed.map((v) => `${v.slot} ${v.at} ${v.type} ${v.role}`), ['long 12:30 video feed'], d);
    }
  });
});

describe('fbDecision: the flag each workflow step passes', () => {
  const i = synth([fest('2026-12-04', 'x')]);
  test('evening darshan made at noon -> scheduled 20:30; on an eve day 18:00', () => {
    assert.deepEqual(fbDecision({ date: '2026-12-10', slot: 'evening', now: at('2026-12-10', '12:00'), inputs: i }).at, '2026-12-10T20:30');
    assert.equal(fbDecision({ date: '2026-12-03', slot: 'evening', now: at('2026-12-03', '12:00'), inputs: i }).at, '2026-12-03T18:00');
  });
  test('eve day, evening Short ready only at 18:46 -> 21:30 (after the 20:00 status)', () => {
    assert.equal(fbDecision({ date: '2026-12-03', slot: 'evening', now: at('2026-12-03', '18:46'), inputs: i }).at, '2026-12-03T21:30');
  });
  test('day-status Short ready at 10:15 (07:30 passed) -> now; at 17:00 -> not on Facebook', () => {
    assert.equal(fbDecision({ date: '2026-12-10', slot: 'morning', now: at('2026-12-10', '10:15'), inputs: i }).at, 'now');
    assert.equal(fbDecision({ date: '2026-12-10', slot: 'morning', now: at('2026-12-10', '17:00'), inputs: i }).post, false);
  });
  test('status variants: only the chosen one, at its own time', () => {
    assert.equal(fbDecision({ date: '2026-12-04', slot: 'status', festivalDate: '2026-12-04', now: at('2026-12-03', '19:00'), inputs: i }).at, '2026-12-04T00:30');
    assert.equal(fbDecision({ date: '2026-12-03', slot: 'eve', festivalDate: '2026-12-04', now: at('2026-12-03', '12:30'), inputs: i }).at, '2026-12-03T20:00');
    assert.equal(fbDecision({ date: '2026-12-04', slot: 'statusday', now: at('2026-12-03', '19:00'), inputs: i }).post, false);
  });
  test('noon and kalyug never go to Facebook', () => {
    for (const slot of ['noon', 'kalyug']) assert.equal(fbDecision({ date: '2026-12-02', slot, now: at('2026-12-02', '10:00'), inputs: i }).post, false, slot);
  });
  test('the long katha: a 12:30 feed video every day, on top of the 2 Reels (normal, festival and movie days)', () => {
    const m = synth([fest('2026-12-04', 'x', 'big')], { movies: new Map([['2026-12-15', 's part 1']]) });
    for (const d of ['2026-12-02', '2026-12-04', '2026-12-15']) {
      const day = fbDay(d, m);
      assert.equal(day.videos.length, 2, d);
      assert.deepEqual(day.feed, [{ slot: 'long', at: '12:30', kind: 'long', role: 'feed', type: 'video' }], d);
      assert.deepEqual(fbDecision({ date: d, slot: 'long', now: at(d, '10:00'), inputs: m }), { post: true, at: `${d}T12:30`, why: 'feed 12:30 IST' });
    }
  });
  test('the long katha after 12:30: straight away up to 6 h late, then not at all', () => {
    assert.equal(fbDecision({ date: '2026-12-02', slot: 'long', now: at('2026-12-02', '12:20'), inputs: i }).at, 'now');
    assert.equal(fbDecision({ date: '2026-12-02', slot: 'long', now: at('2026-12-02', '18:00'), inputs: i }).at, 'now');
    assert.equal(fbDecision({ date: '2026-12-02', slot: 'long', now: at('2026-12-02', '18:45'), inputs: i }).post, false);
  });
  test('the long katha Facebook text: no like/share/subscribe line, the 3 template hashtags', () => {
    const yt = 'Chhath Puja ke chaar din.\nYe katha lok manyata ke anusar hai.\nJai Shree Shyam 🙏\nVideo achha laga ho to Like, Share aur Shyam Premi SN ko Subscribe karein.\n#ChhathPuja #NahayKhay #ChhathiMaiya';
    const t = fbLongText(yt);
    assert.doesNotMatch(t, /Like|Share|Subscribe/);
    assert.equal(t.split('\n').at(-1), '#KhatuShyam #JaiShreeShyam #ChhathPuja');
    assert.match(t, /^Chhath Puja ke chaar din\.\nYe katha/);
    assert.equal(fbLongText('Katha.\n#JaiShreeShyam #KhatuShyam').split('\n').at(-1), '#KhatuShyam #JaiShreeShyam #Bhakti');
  });
});

describe('caption template', () => {
  const good = 'हर हर महादेव 🙏 क्या आपने कभी सोमनाथ ज्योतिर्लिंग के दर्शन किए हैं?\nप्रभास पाटन में समुद्र किनारे बारह ज्योतिर्लिंगों में पहला (मान्यता)।\nSomnath Jyotirlinga, Gujarat ke darshan.\n\n#KhatuShyam #JaiShreeShyam #Somnath';
  test('the STORY.md example passes', () => assert.deepEqual(checkFbCaption(good, { draft: true }), []));
  test('bait in Hinglish or Hindi fails', () => {
    for (const bad of ['Like, Share aur Follow karein.', 'कमेंट में जय श्री श्याम लिखें', 'Apno ko bhejein 🙏', 'Share karo warna']) {
      const t = good.replace('Somnath Jyotirlinga, Gujarat ke darshan.', bad);
      assert.ok(checkFbCaption(t).some((e) => /bait/.test(e)), bad);
    }
  });
  test('hashtags: exactly 3, the two base tags, only on the last line', () => {
    assert.ok(checkFbCaption(good.replace('#Somnath', '#Somnath #Mahadev')).length);
    assert.ok(checkFbCaption(good.replace('#KhatuShyam', '#Shiv')).length);
    assert.ok(checkFbCaption(good.replace('(मान्यता)।', '#Somnath')).length);
  });
  test('line 1 needs Devanagari and a question; 1-2 context lines; mostly Devanagari; no URL in a draft', () => {
    assert.ok(checkFbCaption(good.replace('क्या आपने कभी सोमनाथ ज्योतिर्लिंग के दर्शन किए हैं?', 'सोमनाथ दर्शन।')).some((e) => /question/.test(e)));
    assert.ok(checkFbCaption('Har Har Mahadev 🙏 Kya aap Somnath gaye hain?\nSomnath ke darshan.\n\n#KhatuShyam #JaiShreeShyam #Somnath').length);
    assert.ok(checkFbCaption(good.replace('\n\n#', '\nएक\nदो\n\n#')).some((e) => /context/.test(e)));
    assert.ok(checkFbCaption(good.replace('\n\n#', '\nhttps://x.com\n\n#'), { draft: true }).some((e) => /URL/.test(e)));
  });
  test('link, AI line and credits go between the body and the hashtags', () => {
    const t = assemble({ lines: good.split('\n').slice(0, 3), tag: '#Somnath', links: ['🙏 card: https://sk9836413.github.io/shyam-premi-sn/janmotsav/?utm_source=facebook'], credits: ['📷 Photo: A, CC BY 4.0, via Wikimedia Commons'], ai: true });
    assert.deepEqual(checkFbCaption(t), []);
    assert.equal(splitCaption(t).links.length, 1);
  });
  test('composed captions of real published specs pass (status, darshan, morning)', () => {
    for (const f of fs.readdirSync('story/published').filter((x) => /^2026-11-1[01]-.*\.json$/.test(x) && !x.endsWith('.meta.json'))) {
      const spec = JSON.parse(fs.readFileSync(`story/published/${f}`, 'utf8'));
      const r = fbVideoCaption(spec);
      assert.deepEqual(checkFbCaption(r.text), [], `${f}:\n${r.text}`);
      assert.ok(!/download karein/i.test(r.text), `${f}: the status download link stays off Facebook`);
    }
  });
  test('hindiName strips the format words', () => {
    assert.equal(hindiName({ youtube_title: 'Bhai Dooj Status 2026 | भाई दूज स्टेटस वीडियो #Shorts' }), 'भाई दूज');
    assert.equal(hindiName({ youtube_title: 'Somnath Darshan | सोमनाथ ज्योतिर्लिंग के दर्शन #Shorts' }), 'सोमनाथ ज्योतिर्लिंग');
  });
  test('photo post 1: composed darshan and festival texts pass; a good fb_caption is used as written', () => {
    const d = fbPhotoCaption({ kind: 'darshan', date: '2026-11-13', temple: 'somnath', templeName: 'Somnath Temple, Gujarat', place: 'सोमनाथ ज्योतिर्लिंग, गुजरात', blessing: 'आपका दिन मंगलमय हो', hashtags: ['#JaiShreeShyam', '#HarHarMahadev'] },
      { credits: ['📷 Photo: A, CC0, via Wikimedia Commons: https://commons.wikimedia.org/x'] });
    assert.deepEqual(checkFbCaption(d.text), [], d.text);
    const f = fbPhotoCaption({ kind: 'festival', date: '2026-11-20', festival: { key: 'janmotsav', big: 'श्याम जन्मोत्सव', line: 'जय श्री श्याम 🙏', blessing: 'बाबा श्याम के जन्मोत्सव की हार्दिक शुभकामनाएं' }, hashtags: ['#KhatuShyamJanmotsav'] }, { ai: true });
    assert.deepEqual(checkFbCaption(f.text), [], f.text);
    assert.match(f.text, /#KhatuShyamJanmotsav$/);
    const own = fbPhotoCaption({ kind: 'darshan', date: '2026-11-13', fbCaption: good }, {});
    assert.equal(own.source, 'claude');
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
  test('share lines are Hindi, personal, no asks', () => {
    const spec = JSON.parse(fs.readFileSync('story/published/2026-11-11-evening-somnath-jyotirlinga-darshan.json', 'utf8'));
    const l = shareLine(spec, spec.slug);
    assert.match(l, /[ऀ-ॿ]/);
    assert.ok(!/share|like|comment|शेयर|लाइक|कमेंट|भेजें/i.test(l), l);
  });
});
