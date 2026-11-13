// node --test music/bhajan.test.mjs  (AI-sung bhajans: spelling, lyrics rules, QA gate, selection, timelines, disclosure)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BHAJAN_LINE, bhajanFor, deityOf, discloseBhajan, festivalOf, longTimeline, modeFor, overlaps, pickBhajan, shortTimeline } from './bhajan.mjs';
import { buildBatch, cer, checkLyrics, checkSong, chorusAt, gate, nameCheck, nameOccurrences, planWeek, plain, singLyrics } from './bhajan-batch.mjs';
import { musicFor, sha256, windowAhead } from './engine.mjs';
import { prune } from './weekly.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ZWJ = '‍';
// The owner-approved chorus (pron-ab-001) and what Whisper large-v3 heard in its takes (pron-ab-001.qa.json).
const CHORUS = '[chorus]\nजय श्री श्याम, जय श्री श्याम\nखाटू वाले श्याम धणी, हारे का सहारा तू\nभोले भक्तों की सुन ले, जय श्री श्याम\n\n[chorus]\nजय श्री श्याम, जय श्री श्याम\nखाटू वाले श्याम धणी, हारे का सहारा तू\nभोले भक्तों की सुन ले, जय श्री श्याम';
const HEARD = {
  liked: 'जय श्रीश्याम जय श्रीश्याम खटूबल श्याम धनिहारे का सहारा तू भौले भक्तों की सुनले जय श्रीश्याम जय श्रीश्याम जय श्रीश्याम खटूबल श्याम धनिहारे का सहारा तू भगतों की सुनले जय श्रीश्यम जय श्रीश्यम जय श्रीश्यम', // zwj-hi seed 2222
  shaam: 'जय शीषम जय शीषम खटू वाले शाम धनि हारे का सहार तू भोले भक्तों की सुनले जय शीषम जय शीशाम जय शीशाम खटू वाले शाम धनी हरे का साधारप भोले गप्तों की सुनने जय शीशाम', // deva-hi seed 3333
  bole: 'जय शी शयाम जय शी शयाम खाटू वाले शयाम उधानी हारे का सहारतु बोले भक्तों की सुनले जय शी शयाम जय शी शयाम जय शी शयाम खाटू वाले शयाम उधानी हारे का सहारतु भूले बक्तों की सुने चाये शीश्या', // zwj-hi seed 1111
};

// ---------------------------------------------------------------- spelling
test('spelling: Shyam is sung with the ZWJ, Bhole and everything else stay plain', () => {
  const sung = singLyrics('खाटू वाले श्याम धणी\nभोले भक्तों की सुन ले, जय शिव शंकर');
  assert.ok(sung.includes(`श्${ZWJ}याम`));
  assert.ok(sung.includes('भोले') && !sung.includes(`भो${ZWJ}`));
  assert.equal(sung.match(new RegExp(ZWJ, 'g')).length, 1);
  assert.equal(singLyrics(`श्${ZWJ}याम भो${ZWJ}ले`), `श्${ZWJ}याम भोले`, 'a stray ZWJ is removed, the rule applied once');
  assert.equal(singLyrics(singLyrics('श्याम')), singLyrics('श्याम'), 'idempotent');
  assert.equal(plain(singLyrics('मेरे श्याम')), 'मेरे श्याम');
});

test('names: positions right after श्री are not checked', () => {
  const occ = nameOccurrences(CHORUS);
  const shyam = occ.filter((o) => o.word === 'श्याम');
  assert.equal(shyam.length, 8);
  assert.equal(shyam.filter((o) => !o.sri).length, 2, 'only "खाटू वाले श्याम" (twice)');
  assert.equal(occ.filter((o) => o.word === 'भोले').length, 2);
  assert.equal(nameOccurrences('जय श्रीश्याम').filter((o) => !o.sri).length, 0, 'written together too');
});

// ---------------------------------------------------------------- QA: deity names, CER, chorus
test('names: the owner-liked take passes, a "Shaam" take fails; Bhole is checked in Shiv songs only', () => {
  const liked = nameCheck(CHORUS, HEARD.liked, 'khatu');
  assert.equal(liked.ok, true, JSON.stringify(liked));
  assert.ok(liked.own >= 2);
  const shaam = nameCheck(CHORUS, HEARD.shaam, 'khatu');
  assert.equal(shaam.ok, false);
  assert.ok(shaam.wrong.some((w) => w.word === 'श्याम' && w.heard.startsWith('शा')), JSON.stringify(shaam.wrong));
  // In this Khatu chorus "भोले भक्तों" = innocent devotees (not Bhole Baba): only श्याम is checked, and शयाम has the y-glide.
  assert.equal(nameCheck(CHORUS, HEARD.bole, 'khatu').ok, true);
  const SHIV = '[chorus]\nभोले बाबा मेरे भोले, डमरू वाले शिव\nहर हर बोले भक्त सारे, जय जय भोले शिव';
  assert.equal(nameCheck(SHIV, 'भोले बाबा मेरे भोले डमरू वाले शिव हर हर बोले भक्त सारे जय जय भोले शिव', 'shiv').ok, true);
  const bole = nameCheck(SHIV, 'बोले बाबा मेरे भोले डमरू वाले शिव हर हर बोले भक्त सारे जय जय भोले शिव', 'shiv');
  assert.equal(bole.ok, false);
  assert.ok(bole.wrong.some((w) => w.word === 'भोले' && w.heard.startsWith('ब')), JSON.stringify(bole.wrong));
});

test('names: a final line cut off at the end is not "wrong", a garbled middle is', () => {
  const lyr = '[chorus]\nखाटू वाले श्याम धणी\nहारे का सहारा मेरा श्याम';
  assert.equal(nameCheck(lyr, 'खाटू वाले श्याम धणी', 'khatu').ok, true);
  assert.equal(nameCheck(lyr, 'खाटू वाले', 'khatu').ok, false, 'no checked position heard at all');
  assert.equal(nameCheck(lyr, 'खाटू वाले शाम धणी हारे का सहारा मेरा श्याम', 'khatu').ok, false);
});

test('cer and chorus timestamp', () => {
  assert.equal(cer('जय श्री श्याम', 'जय श्री श्याम'), 0);
  assert.ok(cer('खाटू वाले श्याम', 'खटू वाले शाम') > 0.1);
  assert.equal(cer(`श्${ZWJ}याम`, 'श्याम'), 0, 'ZWJ-insensitive');
  const segs = [{ start: 0, end: 1.5, text: 'आ', no_speech_prob: 0.9 }, { start: 1.8, end: 5, text: 'जय श्री श्याम जय श्री श्याम' }, { start: 5, end: 9, text: 'खाटू वाले श्याम धणी' }];
  assert.equal(chorusAt(segs, CHORUS), 1.8);
  assert.equal(chorusAt([], CHORUS), 0);
});

const job = (id, over = {}) => ({ id, kind: 'vocal', deity: 'khatu', mood: 'bhaavuk', lyrics_devanagari: CHORUS, lyrics: singLyrics(CHORUS), seeds: [1, 2, 3], ...over });
const GOOD_CLAP = { 'Indian devotional bhajan': 0.5, 'Hindi devotional song with harmonium and dholak': 0.2, 'western rock music': 0.05, 'electronic dance music': 0.05 };
const take = (j, seed, whisper, over = {}) => ({ job: j, seed, file: `${j}__${seed}.mp3`, seconds: 60, lufs: -15, true_peak: -1, clip_share: 0, whisper, segments: [{ start: 0.5, end: 3, text: 'जय श्री श्याम' }], clap: GOOD_CLAP, ...over });

test('QA gate: best passing take wins; wrong name, CER above median, clipping and rock are dropped; none passing = none kept', () => {
  const batch = { batch: 't', jobs: [job('a'), job('b'), job('c')] };
  const res = { takes: [
    take('a', 1, HEARD.liked), // passes
    take('a', 2, HEARD.shaam), // Shaam
    take('a', 3, HEARD.liked, { clip_share: 0.01 }), // clipping
    take('b', 1, HEARD.shaam), // Shaam
    take('b', 2, HEARD.liked, { clap: { 'western rock music': 0.6, 'Indian devotional bhajan': 0.2 } }), // rock
    take('b', 3, 'जय', {}), // CER far above the median
    take('c', 1, HEARD.liked, { true_peak: 1.2 }),
    take('c', 2, HEARD.liked, { error: 'OOM', file: null }),
  ] };
  const g = gate(batch, res);
  const [a, b, c] = g.songs;
  assert.equal(a.winner?.seed, 1);
  assert.match(a.takes[1].why.join(' '), /deity name wrong/);
  assert.match(a.takes[2].why.join(' '), /clipping/);
  assert.equal(b.winner, null, 'no take of b passes, so b keeps none');
  assert.match(b.takes[0].why.join(' '), /श्याम->"शा/);
  assert.match(b.takes[1].why.join(' '), /western/);
  assert.match(b.takes[2].why.join(' '), /CER/);
  assert.equal(c.winner, null);
  assert.ok(a.winner.chorus_at === 0.5);
});

test('QA gate: a take whose deity name is wrong never wins, even with the lowest CER', () => {
  const lyr = '[chorus]\nखाटू वाले श्याम धणी\nमेरे श्याम धणी\n[chorus]\nखाटू वाले श्याम धणी';
  const batch = { batch: 't', jobs: [job('x', { lyrics_devanagari: lyr })] };
  const g = gate(batch, { takes: [take('x', 1, 'खाटू वाले शाम धणी मेरे श्याम धणी खाटू वाले श्याम धणी'), take('x', 2, 'खटू वाले श्याम धनी मेरे श्याम धणी खाटू वाले श्याम धणी')] });
  assert.equal(g.songs[0].winner?.seed, 2);
});

// ---------------------------------------------------------------- lyrics rules
const SONG = { slot: 1, deity: 'khatu', mood: 'thaath', festival: null, title_hi: 'खाटू वाले श्याम धणी', title_roman: 'Khatu Wale Shyam Dhani', public_domain_text: null,
  lyrics: '[chorus]\nखाटू वाले श्याम धणी, तेरी जय जयकार\nनीले घोड़े चढ़कर आजा, सुन ले मेरी पुकार\n\n[verse]\nहारा हारा फिरता था मैं, मिल गया तेरा द्वार\nशीश के दानी तूने थामा, सपनों का संसार\n\n[chorus]\nखाटू वाले श्याम धणी, तेरी जय जयकार\nनीले घोड़े चढ़कर आजा, सुन ले मेरी पुकार' };

test('lyrics rules: a good song passes; the hard rules catch the rest', () => {
  assert.deepEqual(checkSong(SONG), []);
  const bad = (patch) => checkSong({ ...SONG, ...patch }).join(' | ');
  assert.match(bad({ lyrics: SONG.lyrics.replace('[chorus]\nखाटू वाले', '[verse]\nखाटू वाले') }), /chorus first/);
  assert.match(bad({ lyrics: SONG.lyrics.replaceAll('खाटू वाले श्याम धणी', 'जय श्री श्याम') }), /NOT right after "श्री"/);
  assert.match(bad({ lyrics: SONG.lyrics.replace('सपनों का संसार', 'रानी सती दादी') }), /Rani Sati/);
  assert.match(bad({ lyrics: SONG.lyrics.replace('सपनों का संसार', 'मुरली वाले श्याम') }), /sheesh only/);
  assert.match(bad({ lyrics: SONG.lyrics.replace('सपनों का संसार', 'हारा हूँ बाबा पर तुझपे भरोसा है') }), /existing bhajan/);
  assert.match(bad({ lyrics: SONG.lyrics.replace('श्याम', `श्${ZWJ}याम`) }), /plain Devanagari/);
  assert.match(bad({ lyrics: SONG.lyrics.replace('सपनों का संसार', 'Shyam Baba') }), /Devanagari only/);
  assert.match(bad({ mood: 'dj' }), /thaath \| bhaavuk/);
  assert.equal(checkSong({ ...SONG, deity: 'krishna', lyrics: SONG.lyrics.replace('खाटू वाले श्याम धणी, तेरी', 'मुरली वाले कान्हा मेरे, तेरी') }).some((e) => /sheesh/.test(e)), false, 'Krishna may have the flute');
});

test('lyrics rules: plan slots must match and chorus first lines must be new', () => {
  const plan = { songs: [{ slot: 1, deity: 'khatu', mood: 'thaath', festival: null }, { slot: 2, deity: 'shiv', mood: 'bhaavuk', festival: null }] };
  const r = checkLyrics({ songs: [SONG, { ...SONG, slot: 2 }] }, plan, []);
  assert.deepEqual(r.ok.map((s) => s.slot), [1]);
  assert.match(r.bad[0].problems.join(' '), /deity must be shiv/);
  const again = checkLyrics({ songs: [SONG] }, plan, ['खाटू वाले श्याम धणी, तेरी जय जयकार']);
  assert.match(again.bad[0].problems.join(' '), /repeats/);
});

test('plan: the week of 14 Nov 2026 = Janmotsav, Chhath, Tulsi Vivah + Khatu-heavy base, 13 songs', () => {
  const festivals = JSON.parse(fs.readFileSync(path.join(DIR, '..', 'automation', 'festivals.json'), 'utf8')).festivals;
  const p = planWeek({ from: '2026-11-14', festivals });
  assert.equal(p.count, 13);
  assert.equal(p.batch, 'bhajan-2026w46');
  const by = (d) => p.songs.filter((s) => s.deity === d).length;
  assert.ok(by('khatu') >= 5 && by('khatu') === Math.max(...['khatu', 'shiv', 'hanuman', 'krishna', 'ganesh', 'devi', 'vishnu'].map(by)));
  for (const d of ['shiv', 'hanuman', 'krishna', 'ganesh']) assert.ok(by(d) >= 1, d);
  assert.deepEqual([...new Set(p.songs.filter((s) => s.festival).map((s) => s.festival))].sort(), ['chhath', 'janmotsav', 'tulsi']);
  assert.ok(p.songs.every((s) => (s.mood === 'thaath' ? s.bpm >= 120 && s.bpm <= 135 : s.bpm < 90)));
  assert.ok(!p.songs.some((s) => /sati/i.test(JSON.stringify(s))));
});

test('batch: sung lyrics carry the ZWJ, the reference stays plain, 3 seeds, 45-75 s', () => {
  const p = { batch: 'bhajan-2026w46', songs: [{ slot: 1, bpm: 128 }] };
  const b = buildBatch(p, [SONG]);
  const j = b.jobs[0];
  assert.ok(j.lyrics.includes(`श्${ZWJ}याम`) && !j.lyrics_devanagari.includes(ZWJ));
  assert.equal(j.seeds.length, 3);
  assert.equal(j.seeds[0], 2222, 'the owner-liked seed first');
  assert.ok(j.duration >= 45 && j.duration <= 75);
  assert.equal(b.singer.male.includes('tenor'), true);
  assert.doesNotMatch(JSON.stringify(b), /Mittal|Kanhaiya|Lakkha|Narula|Sonu|Arijit/i, 'never a real singer in the prompt');
});

// ---------------------------------------------------------------- selection
const lib = [
  { id: 'bhajan-a-khatu', bhajan: { deity: 'khatu', mood: 'thaath', festival: null } },
  { id: 'bhajan-b-khatu', bhajan: { deity: 'khatu', mood: 'bhaavuk', festival: null } },
  { id: 'bhajan-c-janm', bhajan: { deity: 'khatu', mood: 'thaath', festival: 'janmotsav' } },
  { id: 'bhajan-d-shiv', bhajan: { deity: 'shiv', mood: 'thaath', festival: null } },
];
test('selection: festival first, then deity; no match = null (instrumental engine)', () => {
  assert.equal(pickBhajan(lib, { deity: 'khatu', festival: 'janmotsav', date: '2026-11-20', slug: 's' }).track.id, 'bhajan-c-janm');
  assert.equal(pickBhajan(lib, { deity: 'shiv', date: '2026-11-20', slug: 's' }).track.id, 'bhajan-d-shiv');
  assert.equal(pickBhajan(lib, { deity: 'khatu', mood: 'bhaavuk', date: '2026-11-20', slug: 's' }).track.id, 'bhajan-b-khatu');
  assert.equal(pickBhajan(lib, { deity: 'devi', date: '2026-11-20', slug: 's' }), null);
  assert.equal(pickBhajan(lib, { deity: null, date: '2026-11-20', slug: 's' }), null);
});

test('selection: never the same bhajan within 5 days; a re-render keeps its pick', () => {
  const h = (date, id, slug = 'other') => ({ date, id, slug });
  const only = [lib[3]];
  assert.equal(pickBhajan(only, { deity: 'shiv', date: '2026-11-20', slug: 's', history: [h('2026-11-16', 'bhajan-d-shiv')] }), null, '4 days ago');
  assert.equal(pickBhajan(only, { deity: 'shiv', date: '2026-11-20', slug: 's', history: [h('2026-11-20', 'bhajan-d-shiv')] }), null, 'same day');
  assert.equal(pickBhajan(only, { deity: 'shiv', date: '2026-11-20', slug: 's', history: [h('2026-11-15', 'bhajan-d-shiv')] }).track.id, 'bhajan-d-shiv', '5 days ago is fine');
  assert.equal(pickBhajan(only, { deity: 'shiv', date: '2026-11-20', slug: 's', history: [h('2026-11-20', 'bhajan-d-shiv', 's')] }).track.id, 'bhajan-d-shiv', 're-render');
  const r = pickBhajan(lib, { deity: 'khatu', festival: 'janmotsav', date: '2026-11-20', slug: 's', history: [h('2026-11-19', 'bhajan-c-janm')] });
  assert.equal(r.match, 'deity', 'festival song used yesterday: another Khatu bhajan');
});

test('deity / festival / mode of real specs', () => {
  const pub = (f) => JSON.parse(fs.readFileSync(path.join(DIR, '..', 'story', 'published', f), 'utf8'));
  const festivals = JSON.parse(fs.readFileSync(path.join(DIR, '..', 'automation', 'festivals.json'), 'utf8')).festivals;
  const khatu = pub('2026-11-12-evening-khatu-shyam-mandir-darshan.json');
  assert.equal(deityOf(khatu), 'khatu');
  assert.equal(modeFor(khatu), 'outro');
  const chhath = pub('2026-11-13-status-chhath-puja-nahay-khay.json');
  assert.equal(deityOf(chhath), 'devi');
  assert.equal(festivalOf(chhath, festivals), 'chhath');
  assert.equal(modeFor(chhath), 'status');
  assert.equal(modeFor(pub('2026-11-12-morning-guruvar-vishnu.json')), 'outro', 'day status Shorts keep their narration');
  assert.equal(deityOf(pub('2026-11-12-morning-guruvar-vishnu.json')), 'vishnu');
  assert.equal(modeFor(pub('2026-11-13-long-chhath-nahay-khay-kaddu-bhaat-katha.json')), 'long');
  assert.equal(deityOf({ title: 'Vaishno Devi Darshan', signoff: 'Jai Shree Shyam', youtube_title: 'x | Shyam Premi SN' }), 'devi', 'the sign-off and channel name do not make it a Khatu video');
  assert.equal(festivalOf({ slug: '2026-11-19-eve-khatu-shyam-janmotsav', family: '2026-11-20-status-khatu-shyam-janmotsav' }, festivals), 'janmotsav');
});

// ---------------------------------------------------------------- timelines: the voice never overlaps the singing
const TRACK = { chorus_at: 0.4, seconds: 40, bpm: 96 };
test('status Short: bhajan only, hook in second 1, length rounded up to whole bars', () => {
  const t = shortTimeline({ mode: 'status', total: 17.3, track: TRACK });
  assert.equal(t.voice, false);
  assert.equal(t.start, 0);
  assert.ok(TRACK.chorus_at - t.from <= 0.5 && t.from <= TRACK.chorus_at, 'the chorus is sung within the first second');
  const bar = 240 / 96;
  assert.ok(Math.abs(t.total / bar - Math.round(t.total / bar)) < 0.01, 'whole bars');
  assert.ok(t.total >= 17.3 && t.total - 17.3 < bar);
  assert.equal(t.extend, Math.round((t.total - 17.3) * 100) / 100);
  assert.equal(shortTimeline({ mode: 'status', total: 45, track: TRACK }), null, 'the song must last the whole video');
});

test('narrated Short: the chorus starts after the last line, 8-15 s, never over the voice', () => {
  const t = shortTimeline({ mode: 'outro', voiceEnd: 27.4, total: 28.2, track: TRACK });
  assert.ok(t.start >= 27.4 + 0.4);
  assert.ok(t.dur >= 8 && t.dur <= 15);
  assert.ok(t.bedFadeAt + 1.2 <= t.start + 1e-9, 'the instrumental bed is gone when the singing starts');
  assert.equal(overlaps([[0, 27.4]], [[t.start, t.start + t.dur]]), false);
  assert.ok(Math.abs(t.total - (t.start + t.dur)) < 0.02);
  assert.equal(t.extend, Math.round((t.total - 28.2) * 100) / 100);
  assert.equal(shortTimeline({ mode: 'outro', voiceEnd: 53, total: 54, track: TRACK }), null, 'no room under 59 s: instrumental only');
  assert.equal(shortTimeline({ mode: 'outro', voiceEnd: 10, total: 11, track: { chorus_at: 35, seconds: 40 } }), null, 'not enough song after the chorus');
});

test('long video: chorus intro before the katha, the whole song after it, narration only in between', () => {
  const t = longTimeline({ katha: 412.6, track: TRACK });
  assert.ok(t.intro >= 20 && t.intro <= 30);
  assert.equal(t.kathaStart, t.intro);
  assert.equal(t.outroDur, 40);
  assert.ok(t.outroStart > t.kathaEnd);
  assert.equal(overlaps([[t.kathaStart, t.kathaEnd]], [[0, t.intro], [t.outroStart, t.total]]), false);
  assert.equal(Math.round((t.total - t.outroStart) * 100) / 100, 40);
  assert.equal(longTimeline({ katha: 300, track: { chorus_at: 30, seconds: 40 } }), null);
  assert.equal(overlaps([[0, 10]], [[9, 20]]), true);
});

test('renderers: the Short and long renderers place the bhajan by these timelines (no other path adds vocals)', () => {
  const rs = fs.readFileSync(path.join(DIR, '..', 'story', 'render-story.mjs'), 'utf8');
  assert.match(rs, /shortTimeline\(/);
  assert.match(rs, /adelay=\$\{ms\}\|\$\{ms\}/);
  assert.match(rs, /BH_SONG \? silentVoices\(\) : tts\(\)/, 'no narration under a status bhajan');
  assert.match(rs, /const ms = Math\.round\(bhPlan\.start \* 1000\)/);
  const rl = fs.readFileSync(path.join(DIR, '..', 'story', 'render-long.mjs'), 'utf8');
  assert.match(rl, /longTimeline\(/);
  assert.match(rl, /\[1:a\]aformat=sample_rates=48000:channel_layouts=stereo\$\{at0\(OFFMS\)\}/, 'narration shifted to the katha start');
  assert.match(rl, /adelay=\$\{Math\.round\(bh\.outroStart \* 1000\)\}/);
});

// ---------------------------------------------------------------- library + renderer hooks
function tmpLibrary() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bhajan-lib-'));
  const add = (id, extra) => {
    fs.writeFileSync(path.join(dir, `${id}.ogg`), `fake audio ${id}`);
    fs.writeFileSync(path.join(dir, `${id}.licence.json`), JSON.stringify({
      id, title: id, moods: ['festive'], source: 'original', licence: 'original, generated by ACE-Step 1.5 (MIT)', licence_url: 'https://huggingface.co/ACE-Step/Ace-Step1.5',
      model: 'ACE-Step 1.5', model_licence: 'MIT', attribution: null, redistributable: true, checked: '2026-11-13', sha256: sha256(path.join(dir, `${id}.ogg`)), ...extra,
    }));
  };
  add('gen-i-festive-x', { kind: 'instrumental' });
  add('bhajan-x-khatu', { kind: 'vocal', bhajan: { deity: 'khatu', mood: 'thaath', festival: null, chorus_at: 0.4, seconds: 50 } });
  return dir;
}

test('bhajanFor: off unless BHAJAN_VOCALS=on; picks a matching library bhajan; the instrumental engine never picks a vocal', () => {
  const dir = tmpLibrary();
  const pubDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pub-'));
  const spec = { slug: '2026-11-14-evening-khatu-shyam-mandir-darshan', title: 'Khatu Shyam Mandir Darshan' };
  assert.equal(bhajanFor(spec, { env: {}, library: dir, publishedDir: pubDir, festivals: [] }), null);
  const b = bhajanFor(spec, { env: { BHAJAN_VOCALS: 'on' }, library: dir, publishedDir: pubDir, festivals: [] });
  assert.equal(b.meta.id, 'bhajan-x-khatu');
  assert.equal(b.mode, 'outro');
  assert.equal(bhajanFor({ ...spec, title: 'Somnath Darshan', slug: '2026-11-14-evening-somnath' }, { env: { BHAJAN_VOCALS: 'on' }, library: dir, publishedDir: pubDir, festivals: [] }), null);
  fs.writeFileSync(path.join(pubDir, '2026-11-12-morning-x.json'), JSON.stringify({ slug: '2026-11-12-morning-x', bhajan: { id: 'bhajan-x-khatu' } }));
  assert.equal(bhajanFor(spec, { env: { BHAJAN_VOCALS: 'on' }, library: dir, publishedDir: pubDir, festivals: [] }), null, 'used 2 days ago');
  for (let k = 0; k < 6; k++) {
    const m = musicFor({ slug: `2026-11-14-status-x${k}`, format: 'status' }, { library: dir, publishedDir: pubDir, env: { MUSIC_ENGINE: 'on' } });
    assert.equal(m.meta.id, 'gen-i-festive-x');
  }
  const kept = prune(dir, 0, 'bhajan-');
  assert.deepEqual(kept, ['bhajan-x-khatu']);
});

test('the owner-approved take is in the library, valid and protected from pruning', () => {
  const j = JSON.parse(fs.readFileSync(path.join(DIR, 'library', 'bhajan-khatu-haare-ka-sahara-owner.licence.json'), 'utf8'));
  assert.equal(j.licence, 'original, generated by ACE-Step 1.5 (MIT)');
  assert.equal(j.kind, 'vocal');
  assert.equal(j.bhajan.deity, 'khatu');
  assert.ok(j.bhajan.approved_by);
  assert.ok(j.bhajan.lyrics_sung.includes(`श्${ZWJ}याम`));
  assert.equal(sha256(path.join(DIR, 'library', 'bhajan-khatu-haare-ka-sahara-owner.ogg')), j.sha256);
});

// ---------------------------------------------------------------- disclosure + Kaggle windows
test('disclosure: the line goes into the YouTube description and Instagram caption once; Facebook keeps 3 hashtags', async () => {
  const spec = { youtube_description: 'Darshan.\n#KhatuShyam', instagram_caption: 'Jai Shree Shyam', facebook_caption: '' };
  discloseBhajan(discloseBhajan(spec));
  assert.equal(spec.youtube_description.split(BHAJAN_LINE).length, 2);
  assert.equal(spec.instagram_caption.split(BHAJAN_LINE).length, 2);
  const { fbVideoCaption, checkFbCaption } = await import('../scripts/fb.mjs');
  const pub = JSON.parse(fs.readFileSync(path.join(DIR, '..', 'story', 'published', '2026-11-13-evening-vaishno-devi-darshan.json'), 'utf8'));
  const fb = fbVideoCaption({ ...pub, bhajan: { id: 'bhajan-x' } });
  assert.ok(fb.text.includes(BHAJAN_LINE));
  assert.deepEqual(checkFbCaption(fb.text), []);
  assert.equal((fb.text.match(/#[\p{L}\p{N}_]+/gu) || []).length, 3);
  assert.ok(!fbVideoCaption(pub).text.includes(BHAJAN_LINE), 'no bhajan, no line');
  assert.doesNotMatch(BHAJAN_LINE, /share|like|subscribe|#/i, 'no bait, no hashtag');
});

test('YouTube: every upload with a bhajan declares altered/synthetic content (status.containsSyntheticMedia)', async () => {
  const yt = await import('../scripts/youtube.mjs');
  assert.equal(yt.syntheticMedia({ bhajan: { id: 'x' } }), true);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yt-'));
  const f = path.join(dir, 's.json');
  fs.writeFileSync(f, JSON.stringify({ youtube_title: 'Khatu Shyam Darshan #Shorts', youtube_description: `x\n\n${BHAJAN_LINE}`, youtube_tags: 'a,b', bhajan: { id: 'bhajan-x' } }));
  const meta = yt.metaFromScenes(f);
  assert.equal(meta.synthetic, true);
  const st = yt.uploadStatus(meta, {});
  assert.equal(st.containsSyntheticMedia, true);
  assert.equal(st.selfDeclaredMadeForKids, false);
  assert.equal(yt.uploadStatus(meta, { publishAt: '2026-11-14T13:30:00.000Z' }).privacyStatus, 'private');
});

test('Kaggle: a 60-min bhajan session must also END before the blocked IST windows', () => {
  const ist = (h, m) => new Date(Date.UTC(2026, 10, 14, h, m) - 330 * 60e3);
  assert.equal(windowAhead(ist(6, 0), 60), null);
  assert.equal(windowAhead(ist(8, 15), 60), '09:00-11:30');
  assert.equal(windowAhead(ist(17, 45), 60), '18:30-21:00');
  assert.equal(windowAhead(ist(2, 10), 60), null, 'Monday 02:10 IST slot');
});

// Chhath 2026 (bhajan-chhath26): छठी / छठ / सूरज are devi names; a de-aspirated "चटी" is wrong; a bhajan Short names
// its song (bhajan_id) and is built 45-90 s from the chorus.
import { nameCheck as chhathNames } from './bhajan-batch.mjs';
import { buildSpec, chooseBhajan } from '../scripts/bhajan-short.mjs';
test('Chhath names: छठी right, चटी wrong; सूरज checked in devi songs', () => {
  const lyr = '[chorus]\nनहाय खाय के पावन दिन, छठी मइया आईं\nसूरज देव के किरन संग\n[chorus]\nनहाय खाय के पावन दिन, छठी मइया आईं';
  assert.equal(chhathNames(lyr, 'नहाय खाय के पावन दिन छठी मैया आई सूरज देव के किरन संग नहाय खाय के पावन दिन छठी मैया आई', 'devi').ok, true);
  const bad = chhathNames(lyr, 'नहाय खाय के पावन दिन चटी मैया आई सूरज देव के किरन संग नहाय खाय के पावन दिन छठी मैया आई', 'devi');
  assert.equal(bad.ok, false);
  assert.equal(bad.wrong[0].word, 'छठी');
});
test('bhajan Short: the day song first, 45-90 s from the chorus, disclosure + FB template', () => {
  const mk = (id, day, cer) => ({ id, title: id, qa: { cer }, bhajan: { festival: 'chhath', day, chorus_at: 4, seconds: 70, lyrics: '[chorus]\nछठी मइया आईं\n', title_hi: 'गीत', title_roman: 'Geet' } });
  const lib = [mk('bhajan-a', 'kharna', 0.2), mk('bhajan-b', 'nahay-khay', 0.3), mk('bhajan-c', 'nahay-khay', 0.25)];
  assert.equal(chooseBhajan(lib, { festival: 'chhath', day: 'nahay-khay', date: '2026-11-13' }).id, 'bhajan-c');
  assert.equal(chooseBhajan(lib, { festival: 'chhath', day: 'nahay-khay', date: '2026-11-13', history: [{ date: '2026-11-12', id: 'bhajan-c' }] }).id, 'bhajan-b');
  const o = { day: 'nahay-khay', title: 'Chhath Puja Song 2026 | X | छठ गीत #Shorts', hook: 'नहाय खाय 🙏', kicker: 'Chhath', festival: 'Chhath Puja', intro_hi: 'आज नहाय खाय है।', question_hi: 'आपके घर कद्दू भात कौन बनाता है?', images: [1, 2] };
  const bank = ['p-1.jpg', 'p-2.jpg', 'p-3.jpg', 'p-4.jpg', 'p-5.jpg', 'p-6.jpg'];
  const s = buildSpec({ date: '2026-11-13', slot: 'bhajan', o, track: lib[2], bank });
  const secs = s.scenes.reduce((a, sc, i) => a + sc.hold - (i ? 0.4 : 0), 0);
  assert.ok(secs >= 45 && secs <= 66.3 - 0.5, `${secs}`); // the song lasts 66.3 s after the chorus lead-in
  assert.equal(s.bhajan_id, 'bhajan-c');
  assert.match(s.youtube_description, /भजन: मौलिक रचना, AI द्वारा गाया गया \(ACE-Step\)/);
  assert.match(s.facebook_caption.split('\n').pop(), /^#KhatuShyam #JaiShreeShyam #ChhathPuja$/);
});
test('a festival bhajan (Chhath geet, deity devi) is not used for another devi video', () => {
  const b = (id, festival) => ({ id, bhajan: { deity: 'devi', mood: 'thaath', festival, chorus_at: 1 } });
  const lib = [b('bhajan-chhath', 'chhath')];
  assert.equal(pickBhajan(lib, { deity: 'devi', festival: null, date: '2026-11-13', slug: 'x-vaishno-devi' }), null);
  assert.equal(pickBhajan(lib, { deity: 'devi', festival: 'chhath', date: '2026-11-14', slug: 'x-chhath' }).track.id, 'bhajan-chhath');
});
