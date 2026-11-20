// scripts/inbox.mjs: mail parsing, sender allow-list, subject -> place / deity / slug, file rules, cut planner, queue
// append, marks, receipts. No network, no ffmpeg: fixtures in scripts/fixtures/inbox/. Run: node --test scripts/inbox.test.mjs
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  NOT_OWN, RETRACT, allowedSenders, appendClips, authenticated, classifyFile, driveLinks, finishClip, loadConfig, makeClip, marksVerdict,
  nextId, ownText, parseMessage, parseSubject, pickMusic, placeOf, planCuts, queuedBefore, receiptText, retract, retractText, senderAllowed, stillTarget,
} from './inbox.mjs';
import { KHATU_PLACE_CLAIM } from './shyam-darshan.mjs';
import { buildSpec, loadPlan } from './owner-footage.mjs';
import { aiDisclosure } from './ai-disclosure.mjs';

const FIX = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'inbox');
const fx = (f) => JSON.parse(fs.readFileSync(path.join(FIX, f), 'utf8'));
const cfg = loadConfig();
const plan = loadPlan();
const human = { id: 'cc-temple-bells-tabla', title: 'Temple bells', licence: 'original arrangement of CC0 / public-domain-dedicated recordings (Shyam Premi SN, music/build-library.mjs)', kind: 'instrumental' };
const OWNER = 'owner@gmail.com';
const ACCOUNT = 'inbox@gmail.com';
const allowed = allowedSenders(cfg, { INBOX_ALLOWED_SENDERS: `${OWNER}, second@example.org` }, ACCOUNT);

describe('mail parsing', () => {
  test('Drive chip with a link: id and file name', () => {
    const m = parseMessage(fx('drive-one.json'));
    assert.equal(m.subject, 'Shyam Baidyanath dham deoghar');
    assert.equal(m.from, OWNER);
    assert.equal(m.day, '2026-11-20'); // 18:29 UTC = 23:59 IST on 20 Nov
    assert.deepEqual(m.drive, [{ id: '1AbCdEfGhIjKlMnOpQrStUvWxYz012345', name: 'IMG_2305.mov' }]);
    assert.equal(m.attachments.length, 0);
  });
  test('two Drive files, one behind a google.com/url redirect (open?id=, URL-encoded, &amp;)', () => {
    const m = parseMessage(fx('drive-two.json'));
    assert.deepEqual(m.drive.map((d) => [d.id, d.name]), [['1ZyXwVuTsRqPoNmLkJiHgFeDcBa987654', 'IMG_2315.mov'], ['1QwErTyUiOpAsDfGhJkLzXcVbNm111222', 'IMG_2314.mov']]);
  });
  test('Drive chips without a link (the phone upload never finished) are reported by name', () => {
    const m = parseMessage(fx('chips-no-link.json'));
    assert.equal(m.drive.length, 3);
    assert.ok(m.drive.every((d) => d.id === null && /\.mov$/.test(d.name)));
  });
  test('every Drive URL form', () => {
    const id = '1AbCdEfGhIjKlMnOpQrStUvWxYz012345';
    for (const u of [`https://drive.google.com/file/d/${id}/view?usp=drive_web`, `https://drive.google.com/open?id=${id}`, `https://drive.google.com/uc?export=download&amp;id=${id}`,
      `https://drive.google.com/uc?id=${id}&export=download`, `https://docs.google.com/uc?id=${id}`, `https://drive.usercontent.google.com/download?id=${id}&export=download`,
      `https://drive.google.com/a/example.org/file/d/${id}/view`, `https://www.google.com/url?q=https%3A%2F%2Fdrive.google.com%2Ffile%2Fd%2F${id}%2Fview&sa=D`]) {
      assert.deepEqual(driveLinks(`see ${u} ok`).map((d) => d.id), [id], u);
    }
    assert.equal(driveLinks('https://drive.google.com/drive/folders/1FoLdErIdIsHere12345678')[0].folder, true);
  });
  test('attachments: name, type, size', () => {
    const m = parseMessage(fx('attachment.json'));
    assert.deepEqual(m.attachments.map((a) => a.name), ['5062b0bb-b7e7-412f-a97e-3ff49bcffa0d.mp4', 'IMG_0001.HEIC', 'IMG_0002.MOV', 'bill.pdf']);
    assert.equal(m.attachments[0].size, 3497569);
  });
  test('our own receipts are recognised (never read as a new mail)', () => assert.equal(parseMessage(fx('receipt.json')).receipt, true));
  test('ownText cuts the quoted part of a reply', () => assert.equal(ownText('NOT MINE\r\n\r\nOn Sat, 21 Nov 2026 at 18:00, X wrote:\r\n> remove'), 'NOT MINE'));
});

describe('sender allow-list', () => {
  test('allowed + DKIM/SPF/DMARC pass', () => assert.equal(senderAllowed(parseMessage(fx('drive-one.json')), allowed, ACCOUNT).ok, true));
  test('a forged From (authentication fails) is refused', () => {
    const r = senderAllowed(parseMessage(fx('spoofed.json')), allowed, ACCOUNT);
    assert.equal(r.ok, false);
    assert.match(r.why, /authenticated/);
  });
  test('anyone else is refused', () => {
    const m = { ...parseMessage(fx('drive-one.json')), from: 'stranger@gmail.com' };
    assert.equal(senderAllowed(m, allowed, ACCOUNT).ok, false);
  });
  test('the inbox account writing to itself (SENT label) needs no Authentication-Results', () => {
    assert.equal(senderAllowed({ from: ACCOUNT, labels: ['SENT', 'INBOX'], auth: '' }, allowed, ACCOUNT).ok, true);
    assert.equal(senderAllowed({ from: ACCOUNT, labels: ['INBOX'], auth: '' }, allowed, ACCOUNT).ok, false);
  });
  test('the allow-list comes from the secret + the account; the public config lists no address', () => {
    assert.deepEqual(cfg.allowed_senders, []);
    assert.deepEqual([...allowed].sort(), [ACCOUNT, OWNER, 'second@example.org'].sort());
    assert.doesNotMatch(fs.readFileSync(path.join(FIX, '..', '..', '..', 'automation', 'inbox.json'), 'utf8'), /@/);
  });
  test('authenticated(): DMARC / DKIM / SPF for the From domain only', () => {
    assert.equal(authenticated('mx.google.com; dkim=pass header.i=@example.org header.s=x', 'a@example.org'), true);
    assert.equal(authenticated('mx.google.com; dkim=pass header.i=@other.org; spf=pass smtp.mailfrom=a@other.org; dmarc=fail header.from=example.org', 'a@example.org'), false);
    assert.equal(authenticated('mx.google.com; spf=pass (x) smtp.mailfrom=bounce@example.org', 'a@example.org'), true);
  });
  test('"not mine" in the body rejects the mail; retraction words in a reply', () => {
    assert.match(ownText(parseMessage(fx('not-own.json')).text), NOT_OWN);
    assert.doesNotMatch('Jai Shree Shyam, aaj ke darshan, maine khud record kiya', NOT_OWN);
    assert.match(ownText(parseMessage(fx('retract.json')).text), RETRACT);
  });
});

describe('subject -> place / deity / slug', () => {
  const p = (s) => parseSubject(s);
  test('only a leading word "Shyam" (any case)', () => {
    for (const s of ['Shyam chath puja', 'SHYAM darshan Salasar', 'shyam', 'Shyam: darshan']) assert.equal(p(s).ok, true, s);
    for (const s of ['Shyamlal ji', 'Fwd: Shyam darshan', 'Re: Shyam darshan', 'darshan Shyam', '']) assert.equal(p(s).ok, false, s);
  });
  test('"Shyam Baidyanath dham deoghar": Baba Baidyanath Dham, Deoghar, Shiv (not the Shyam bank)', () => {
    const s = p('Shyam Baidyanath dham deoghar');
    assert.equal(s.place, 'Baidyanath Dham, Deoghar');
    assert.equal(s.city, 'Deoghar');
    assert.equal(s.kind, 'temple');
    assert.equal(s.temple, 'baidyanath-dham');
    assert.equal(s.deity, 'shiv');
    assert.equal(s.bank, false);
    assert.equal(s.slug, 'baidyanath-dham-deoghar-darshan-own');
  });
  test('"Shyam chath puja": Chhath Puja festival footage, no place claimed', () => {
    const s = p('Shyam chath puja');
    assert.equal(s.kind, 'festival');
    assert.equal(s.label, 'Chhath Puja');
    assert.equal(s.place, null);
    assert.equal(s.bank, false);
    assert.equal(s.slug, 'chhath-puja-own');
    assert.equal(placeOf(s).place, 'unknown — set by owner');
    assert.equal(placeOf(s).occasion, 'Chhath Puja');
  });
  test('"SHYAM darshan Salasar" -> salasar-darshan-own; "Shyam laddu gopal" is a deity form, not a place', () => {
    assert.equal(p('SHYAM darshan Salasar').slug, 'salasar-darshan-own');
    assert.equal(p('SHYAM darshan Salasar').place, 'Salasar');
    const l = p('Shyam laddu gopal');
    assert.equal(l.deity, 'krishna');
    assert.equal(l.place, null);
    assert.equal(l.en, 'Laddu Gopal');
  });
  test('no place named: the default place, Shyam Baba, the real-stills bank; never a famous temple', () => {
    for (const s of ['Shyam', 'Shyam darshan', 'Shyam baba safed shringar', 'Shyam pandal sajavat']) {
      const x = p(s);
      assert.equal(x.deity, 'shyam', s);
      assert.equal(x.temple, null, s);
      assert.equal(x.bank, true, s);
      assert.equal(x.place_named, false, s);
    }
    assert.equal(placeOf(p('Shyam')).place_label, 'Shyam Baba darshan (owner recording)');
    assert.equal(placeOf(p('Shyam')).place, 'unknown — set by owner');
    // Khatu only when the subject says Khatu
    assert.equal(p('Shyam khatu darshan').temple, 'khatu-shyam-mandir');
    assert.equal(p('Shyam darshan Kolkata pandal').temple, null);
    assert.equal(p('Shyam Deoghar pandal').temple, null, 'a city alone is not the famous temple');
    for (const s of ['Shyam', 'Shyam darshan Kolkata pandal', 'Shyam baba gulab shringar']) {
      const c = makeClip(p(s), { id: '11', music: 'cc-x', day: '2026-11-21', mail: 'abcdef', source: 'a.mov', seconds: 20 });
      const text = [c.title, c.line, c.roman, c.credit_yt, c.credit_ig, c.credit_fb].join('\n');
      assert.doesNotMatch(text, KHATU_PLACE_CLAIM, s);
      assert.doesNotMatch(text, /khatu\s*(dham|mandir)|sikar|salasar|खाटू\s*धाम/i, s);
    }
  });
  test('"live", "today", "AI" never get into a place or title', () => {
    const s = p('Shyam: Live darshan today AI Kolkata pandal');
    assert.equal(s.place, 'Kolkata Pandal');
    assert.doesNotMatch(makeClip(s, { id: '11', music: 'cc-x', day: '2026-11-21', mail: 'abcdef', source: 'a', seconds: 20 }).title, /live|today|\bAI\b/i);
  });
});

describe('file rules', () => {
  test('types and sizes (attachment 25 MB, Drive 1.5 GB)', () => {
    assert.deepEqual(classifyFile({ name: 'IMG_1.HEIC', size: 3e6 }, cfg), { kind: 'photo', ok: true, why: '' });
    assert.equal(classifyFile({ name: 'a.png', size: 1e6 }, cfg).kind, 'photo');
    assert.equal(classifyFile({ name: 'IMG_2305.mov', size: 20e6 }, cfg).kind, 'video');
    assert.equal(classifyFile({ name: 'clip.3gp', size: 2e6 }, cfg).ok, true);
    assert.equal(classifyFile({ name: 'x.MOV', size: 31e6 }, cfg).ok, false);
    assert.match(classifyFile({ name: 'x.MOV', size: 31e6 }, cfg).why, /25 MB/);
    assert.equal(classifyFile({ name: 'x.mov', size: 900e6 }, cfg, { drive: true }).ok, true);
    assert.equal(classifyFile({ name: 'x.mov', size: 1600e6 }, cfg, { drive: true }).ok, false);
    assert.equal(classifyFile({ name: 'bill.pdf', size: 1e3 }, cfg).kind, null);
    assert.equal(classifyFile({ name: 'song.mp3', size: 1e3 }, cfg).ok, false);
  });
  test('stills: folder, name and licence (own, place as named, bank only for Shyam Baba darshan)', () => {
    const t = stillTarget(parseSubject('Shyam baba gulab shringar'), { mail: '1a1fa3a1936dea36', day: '2026-11-21', k: 1, src: 'IMG_1.HEIC', size: [810, 1080], faces: false });
    assert.equal(t.dir, 'shyam-baba-gulab-shringar-darshan-own');
    assert.equal(t.base, '20261121-6dea36-01');
    assert.equal(t.licence.source, 'own');
    assert.equal(t.licence.recorded_by, 'Shyam Premi SN');
    assert.equal(t.licence.place, 'unknown — set by owner');
    assert.equal(t.licence.date, '2026-11-21');
    assert.equal(t.licence.bank, 'shyam-darshan');
    assert.equal(t.licence.kind, 'gulab');
    assert.equal(t.licence.deity_face, true);
    assert.equal(t.licence.ai, false);
    assert.ok(t.licence.label.length <= 60);
    const b = stillTarget(parseSubject('Shyam Baidyanath dham deoghar'), { mail: '1a1fa38f0694b97e', day: '2026-11-21', k: 2, src: 'x.jpg', size: [1080, 810] });
    assert.equal(b.dir, 'baidyanath-dham'); // the temple's own real-photo folder (scripts/real-photos.mjs photosFor)
    assert.match(b.base, /^own-20261121-/);
    assert.equal(b.licence.bank, undefined);
    assert.equal(b.licence.place, 'Baidyanath Dham, Deoghar');
  });
});

describe('cut planner', () => {
  const a = fx('video-samples.json');
  const r = planCuts(a, cfg.video);
  test('the shaky / blurred start and the blurred middle are cut; 12-30 s cuts at scene changes; face cuts avoided', () => {
    assert.equal(r.held, false);
    assert.ok(r.cuts.length >= 2);
    for (const c of r.cuts) {
      assert.ok(c.seconds >= cfg.video.min_cut && c.seconds <= cfg.video.max_cut, JSON.stringify(c));
      assert.ok(c.start >= 3, 'no blurred start');
      assert.ok(!(c.start < 44 && c.end > 40), 'not over the blurred middle');
      assert.equal(c.faces, false);
    }
    assert.equal(r.cuts[0].start, 3);
    assert.equal(r.cuts[0].end, 18, 'split at the scene change');
    assert.ok(r.dropped.some((d) => /chehre/.test(d.why)), 'the cut with visitor faces is dropped');
  });
  test('all cuts with faces: the video is held', () => {
    const b = { ...a, samples: a.samples.map((x) => ({ ...x, faces: 1 })) };
    const h = planCuts(b, cfg.video);
    assert.equal(h.held, true);
    assert.equal(h.cuts.length, 0);
  });
  test('too short / all blurred: nothing', () => {
    const s = { duration: 8, samples: Array.from({ length: 32 }, (_, i) => ({ t: i / 4, sharp: 500, shift: 2, scene: 0.1, faces: 0 })) };
    assert.equal(planCuts(s, cfg.video).cuts.length, 0);
    const blur = { duration: 40, samples: Array.from({ length: 160 }, (_, i) => ({ t: i / 4, sharp: 5, shift: 2, scene: 0.1, faces: 0 })) };
    assert.equal(planCuts(blur, cfg.video).cuts.length, 0);
  });
  test('max 4 reels a video', () => {
    const long = { duration: 300, samples: Array.from({ length: 1200 }, (_, i) => ({ t: i / 4, sharp: 500, shift: 2, scene: i % 80 === 0 ? 0.9 : 0.1, faces: 0 })) };
    assert.equal(planCuts(long, cfg.video).cuts.length, cfg.video.max_cuts_per_video);
  });
});

describe('queue append (automation/owner-footage.json)', () => {
  const subjects = ['Shyam Baidyanath dham deoghar', 'Shyam chath puja', 'Shyam laddu gopal', 'Shyam', 'SHYAM darshan Salasar', 'Shyam hanuman ji jaipur'];
  test('honest titles under 100 characters with #Shorts, valid specs, no AI flag, no AI wording', () => {
    for (const s of subjects) {
      for (const v of [0, 1, 2, 3]) {
        const c = makeClip(parseSubject(s), { id: '91', music: human.id, variant: v, day: '2026-11-21', mail: 'abcdef', source: 'a.mov', seconds: 20 });
        assert.ok(c.title.length <= 100 && /#Shorts$/.test(c.title), c.title);
        assert.doesNotMatch(`${c.title} ${c.line} ${c.roman}`, /\bAI\b|live|aaj ki|today/i);
        assert.deepEqual(finishClip(plan, c, { track: human, otherPlaylist: cfg.other_playlist }), [], `${s} v${v}`);
        const spec = buildSpec({ ...plan, clips: [...plan.clips, c] }, '91', '2026-12-01', { track: human });
        assert.equal(aiDisclosure(spec).youtube, false);
        assert.equal(aiDisclosure(spec).meta, false);
        assert.equal(spec.real_footage, true);
      }
    }
  });
  test('Baidyanath reel: the coordinator\'s title, Shiv hashtags, its own playlist, no Khatu temple', () => {
    const c = makeClip(parseSubject('Shyam Baidyanath dham deoghar'), { id: '11', music: human.id, day: '2026-11-21', mail: 'abcdef', source: 'IMG_2305.mov', seconds: 20 });
    finishClip(plan, c, { track: human, otherPlaylist: cfg.other_playlist });
    assert.equal(c.title, 'Baba Baidyanath Dham Darshan, Deoghar | बाबा बैद्यनाथ धाम दर्शन | Har Har Mahadev #Shorts');
    const spec = buildSpec({ ...plan, clips: [...plan.clips, c] }, '11', '2026-12-01', { track: human });
    assert.equal(spec.temple, 'baidyanath-dham');
    assert.equal(spec.playlist, cfg.other_playlist);
    assert.match(spec.facebook_caption, /#HarHarMahadev/);
    assert.doesNotMatch(`${spec.youtube_description}${spec.instagram_caption}`, /#KhatuShyam/);
    assert.match(spec.youtube_description, /khud record kiya \(Baidyanath Dham, Deoghar\)/);
  });
  test('Chhath reel: festival texts, no temple', () => {
    const c = makeClip(parseSubject('Shyam chath puja'), { id: '12', music: human.id, day: '2026-11-21', mail: 'abcdef', source: 'IMG_2315.mov', seconds: 20 });
    finishClip(plan, c, { track: human, otherPlaylist: cfg.other_playlist });
    const spec = buildSpec({ ...plan, clips: [...plan.clips, c] }, '12', '2026-12-01', { track: human });
    assert.equal(spec.temple, undefined);
    assert.match(spec.youtube_title, /^Chhath Puja/);
    assert.match(spec.facebook_caption, /#ChhathPuja/);
  });
  test('ids continue after the plan, names are unique, the order is kept; a duplicate is refused', () => {
    const id = nextId(plan);
    assert.equal(Number(id), Math.max(...plan.clips.map((c) => Number(c.id))) + 1);
    const s = parseSubject('Shyam chath puja');
    const a = makeClip(s, { id, music: human.id, day: '2026-11-21', mail: 'abcdef', source: 'x', seconds: 20 });
    const b = makeClip(s, { id: String(Number(id) + 1).padStart(2, '0'), music: human.id, variant: 1, day: '2026-11-21', mail: 'abcdef', source: 'x', seconds: 20 });
    const p2 = appendClips(plan, [a, b]);
    assert.deepEqual(p2.clips.slice(-2).map((c) => c.id), [a.id, b.id]);
    assert.equal(p2.clips.length, plan.clips.length + 2);
    assert.notEqual(a.title, b.title, 'two reels of one mail get different titles (youtube.mjs dedupes equal titles)');
    assert.throws(() => appendClips(p2, [a]), /already/);
    assert.equal(plan.clips.length, loadPlan().clips.length, 'the input plan is not changed');
    assert.equal(queuedBefore(p2, { index: p2.clips.length - 2 }), plan.clips.length);
    assert.equal(queuedBefore(p2, { index: p2.clips.length - 2, skip: '01\n08\n' }), plan.clips.length - 2);
  });
  test('music: a cc-* instrumental, the least used in the queue first', () => {
    const ids = ['cc-a', 'cc-b', 'cc-c'];
    assert.equal(pickMusic({ clips: [{ music: 'cc-a' }, { music: 'cc-b' }] }, ids), 'cc-c');
    assert.equal(pickMusic({ clips: [{ music: 'cc-a' }, { music: 'cc-b' }, { music: 'cc-c' }, { music: 'cc-a' }] }, ids), 'cc-b');
  });
});

describe('other people\'s marks (OCR)', () => {
  test('an @handle on 2+ frames or a platform name = not his own', () => {
    assert.equal(marksVerdict({ ocr: true, texts: ['@NINI_CUTIE890 Watch', 'x @nini_cutie890', 'nothing'] }).handle, '@nini_cutie890');
    assert.equal(marksVerdict({ ocr: true, texts: ['Instagram'] }).foreign, true);
    assert.equal(marksVerdict({ ocr: true, texts: ['@someone', 'clean', 'clean'] }).foreign, false, 'one noisy frame is not enough');
    assert.equal(marksVerdict({ ocr: true, texts: ['@someone_x'] }).foreign, true, 'a photo: one frame');
    assert.equal(marksVerdict({ ocr: true, texts: ['@ShyamPremiSN', '@shyampremisn'] }).foreign, false, 'our own handle');
    assert.equal(marksVerdict({ ocr: true, texts: ['जय श्री श्याम', 'Shyam Baba pandal 2026'] }).foreign, false);
    assert.equal(marksVerdict({ ocr: false, texts: [] }).checked, false);
  });
});

describe('receipt', () => {
  const s = parseSubject('Shyam chath puja');
  const base = { subject: 'Shyam chath puja', day: '2026-11-21', subj: s, planAt: '07:15', ahead: 9, firstDay: '2026-12-01', waitingDays: 10 };
  test('Hinglish: what came, use, rejects with reasons, own-recording question, how to send', () => {
    const t = receiptText({ ...base, items: [
      { name: 'IMG_2315.mov', status: 'queued', reels: [{ id: '11', seconds: 18.4 }, { id: '12', seconds: 25 }], faces: true },
      { name: 'IMG_2314.mov', status: 'waiting', why: 'Drive file private hai' },
      { name: 'x.MOV', status: 'rejected', why: '31 MB hai, limit 25 MB (Gmail attachment)' },
      { name: 'r.mp4', status: 'rejected', why: 'video par kisi aur ka handle (@x) hai' },
    ] });
    assert.match(t, /Aapka mail mila: "Shyam chath puja"/);
    assert.match(t, /2 reels bani \(18 s, 25 s\), queue no\. 11, 12/);
    assert.match(t, /chehre/);
    assert.match(t, /✗ x\.MOV: 31 MB/);
    assert.match(t, /Anyone with the link/);
    assert.match(t, /NOT MINE/);
    assert.match(t, /25 MB/);
    assert.match(t, /1 Dec 2026/);
    assert.match(t, /AI label nahi/);
    assert.doesNotMatch(t, /@[a-z0-9.-]+\.[a-z]{2,}/i, 'no mail address in the text');
  });
  test('a mail that says the media is someone else\'s: nothing used', () => {
    const t = receiptText({ ...base, notOwn: 'x', items: [] });
    assert.match(t, /use NAHI hoga/);
  });
  test('retraction text lists what went and what is already public', () => {
    assert.match(retractText({ subject: 'Shyam laddu gopal', clips: ['11'], stills: 1, published: ['2026-11-25-owner-laddu-gopal-darshan-11'] }), /11[\s\S]*1 photo[\s\S]*haath se/);
  });
});

describe('retract ("NOT MINE")', () => {
  test('unpublished clips go on the skip list, stills are deleted, published ones are listed', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'inbox-retract-'));
    fs.mkdirSync(path.join(root, 'automation'));
    fs.mkdirSync(path.join(root, 'footage', 'x-own'), { recursive: true });
    fs.writeFileSync(path.join(root, 'footage', 'x-own', 'a.jpg'), 'j');
    fs.writeFileSync(path.join(root, 'footage', 'x-own', 'a.licence.json'), '{}');
    fs.writeFileSync(path.join(root, 'automation', 'published.md'), '- 2026-11-25-owner-x-11 | youtube: https://youtube.com/shorts/q (public at …)\n');
    const skip = path.join(root, 'automation', 'owner-footage-skip.txt');
    fs.writeFileSync(skip, '# list\n');
    const p = { clips: [{ id: '11', name: 'x-11' }, { id: '12', name: 'x-12' }] };
    const r = retract({ clips: ['11', '12'], stills: ['footage/x-own/a.jpg'] }, p, { skipFile: skip, root });
    assert.deepEqual(r.clips, ['12']);
    assert.deepEqual(r.published, ['2026-11-25-owner-x-11']);
    assert.equal(r.stills, 1);
    assert.match(fs.readFileSync(skip, 'utf8'), /^12$/m);
    assert.equal(fs.existsSync(path.join(root, 'footage', 'x-own', 'a.licence.json')), false);
  });
});
