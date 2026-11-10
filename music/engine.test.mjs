// node --test music/
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { checkLibrary, historyFrom, istWindowBlocked, loadLibrary, moodFor, musicFor, pickTrack, sha256, validateLicence } from './engine.mjs';
import { passesQa, resolveJobs } from './gen.mjs';

const T = (id, moods) => ({ id, moods });
const lib = [T('a-calm', ['calm']), T('b-calm', ['calm']), T('c-festive', ['festive']), T('d-aarti', ['aarti', 'festive']), T('e-emo', ['emotional'])];

function tmpLib(entries) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'music-lib-'));
  for (const [name, content] of Object.entries(entries)) fs.writeFileSync(path.join(dir, name), content);
  return dir;
}
function goodLicence(dir, id) {
  const file = path.join(dir, `${id}.ogg`);
  return {
    id, title: id, moods: ['calm'], source: 'cc0-excerpt', licence: 'CC0 1.0 (excerpt)', licence_url: 'https://creativecommons.org/publicdomain/zero/1.0/',
    components: [{ source_url: 'https://freesound.org/x/', download_url: 'https://cdn.freesound.org/x.mp3', licence: 'CC0 1.0 Universal', author: 'someone', sha256: 'a'.repeat(64) }],
    attribution: null, redistributable: true, checked: '2026-11-11', sha256: sha256(file),
  };
}

test('mood: festival/status -> festive, darshan -> calm, katha -> emotional, aarti -> aarti, override wins', () => {
  assert.equal(moodFor({ slug: '2026-11-20-status-khatu-janmotsav', format: 'status' }), 'festive');
  assert.equal(moodFor({ slug: '2026-11-11-evening-salasar-darshan' }), 'calm');
  assert.equal(moodFor({ slug: '2026-11-11-morning-dhruv-katha' }), 'emotional');
  assert.equal(moodFor({ slug: '2026-11-11-evening-sandhya-aarti' }), 'aarti');
  assert.equal(moodFor({ slug: '2026-11-11-morning-x', festival: 'Bhai Dooj' }), 'festive');
  assert.equal(moodFor({ slug: '2026-11-11-morning-x-katha', music_mood: 'calm' }), 'calm');
  assert.equal(moodFor({ slug: 'whatever' }), 'calm');
});

test('selector: picks the mood, stable per slug', () => {
  const a = pickTrack(lib, { mood: 'festive', date: '2026-11-11', slug: 's1' });
  assert.ok(a.track.moods.includes('festive'));
  assert.deepEqual(pickTrack(lib, { mood: 'festive', date: '2026-11-11', slug: 's1' }), a);
});

test('selector: no repeat within 7 days, allowed again on day 7', () => {
  const history = [{ date: '2026-11-05', id: 'a-calm' }, { date: '2026-11-10', id: 'b-calm' }];
  const p = pickTrack(lib, { mood: 'calm', date: '2026-11-11', slug: 'x', history });
  assert.equal(p.mood, 'emotional'); // both calm tracks used in the last 7 days -> neighbouring mood
  assert.equal(p.track.id, 'e-emo');
  const later = pickTrack(lib, { mood: 'calm', date: '2026-11-12', slug: 'x', history });
  assert.equal(later.track.id, 'a-calm'); // 7 days after 5 Nov
  for (let d = 0; d < 30; d++) { // a run of daily picks never repeats inside 7 days
    const hist = [];
    for (let i = 0; i < 14; i++) {
      const date = `2026-12-${String(i + 1).padStart(2, '0')}`;
      const big = Array.from({ length: 9 }, (_, k) => T(`t${k}`, ['festive']));
      const r = pickTrack(big, { mood: 'festive', date, slug: `${date}-status-${d}`, history: hist });
      const clash = hist.find((h) => h.id === r.track.id && (Date.parse(date) - Date.parse(h.date)) / 864e5 < 7);
      assert.equal(clash, undefined, `${r.track.id} repeated on ${date}`);
      hist.push({ date, id: r.track.id, slug: `${date}-status-${d}` });
    }
  }
});

test('selector: same slug re-render keeps its own pick; all used -> least recently used, flagged', () => {
  const history = [{ date: '2026-11-11', id: 'c-festive', slug: 'same' }];
  assert.equal(pickTrack([T('c-festive', ['festive'])], { mood: 'festive', date: '2026-11-11', slug: 'same', history }).track.id, 'c-festive');
  const used = [{ date: '2026-11-09', id: 'c-festive' }, { date: '2026-11-10', id: 'd-aarti' }, { date: '2026-11-10', id: 'a-calm' },
    { date: '2026-11-10', id: 'b-calm' }, { date: '2026-11-08', id: 'e-emo' }];
  const p = pickTrack(lib, { mood: 'festive', date: '2026-11-11', slug: 'new', history: used });
  assert.equal(p.reused, true);
  assert.equal(p.track.id, 'c-festive');
  assert.equal(pickTrack([], { mood: 'calm', date: '2026-11-11' }), null);
});

test('history comes from story/published specs with spec.music.id', () => {
  const dir = tmpLib({
    '2026-11-10-evening-x.json': JSON.stringify({ slug: '2026-11-10-evening-x', music: { id: 'a-calm' } }),
    '2026-11-10-long-y.meta.json': JSON.stringify({ music: { id: 'nope' } }),
    '2026-11-09-morning-z.json': JSON.stringify({ slug: '2026-11-09-morning-z' }),
  });
  assert.deepEqual(historyFrom(dir), [{ date: '2026-11-10', id: 'a-calm', slug: '2026-11-10-evening-x' }]);
});

test('licence check: a valid library passes', () => {
  const dir = tmpLib({ 'cc-one.ogg': 'audio-bytes' });
  fs.writeFileSync(path.join(dir, 'cc-one.licence.json'), JSON.stringify(goodLicence(dir, 'cc-one')));
  assert.deepEqual(checkLibrary(dir), { ok: true, tracks: 1, errors: [] });
  assert.equal(loadLibrary(dir).length, 1);
});

test('licence check: the build fails when a track has no licence JSON', () => {
  const dir = tmpLib({ 'cc-one.ogg': 'audio', 'cc-two.ogg': 'audio2' });
  fs.writeFileSync(path.join(dir, 'cc-one.licence.json'), JSON.stringify(goodLicence(dir, 'cc-one')));
  const r = checkLibrary(dir);
  assert.equal(r.ok, false);
  assert.match(r.errors.join('\n'), /cc-two\.ogg: no licence JSON/);
  assert.equal(loadLibrary(dir).length, 1); // the unlicensed file is never picked
});

test('licence check: invalid / disallowed licences, wrong checksum, orphans, empty library', () => {
  const dir = tmpLib({ 'cc-one.ogg': 'audio' });
  const bad = (patch) => validateLicence({ ...goodLicence(dir, 'cc-one'), ...patch }, path.join(dir, 'cc-one.ogg'));
  assert.match(bad({ licence: 'CC BY-NC 4.0' }).join(), /not allowed/);
  assert.match(bad({ licence: 'CC BY-SA 4.0', licence_url: 'https://creativecommons.org/licenses/by-sa/4.0/' }).join(), /not allowed/);
  assert.match(bad({ checked: '' }).join(), /checked/);
  assert.match(bad({ attribution: undefined }).join(), /attribution/);
  assert.match(bad({ moods: ['party'] }).join(), /moods/);
  assert.match(bad({ redistributable: false }).join(), /redistributable/);
  assert.match(bad({ sha256: 'b'.repeat(64) }).join(), /does not match/);
  assert.match(bad({ components: [] }).join(), /components/);
  assert.match(bad({ components: [{ source_url: 'https://x', download_url: 'https://y', licence: 'CC BY 4.0', author: 'a', sha256: 'a'.repeat(64) }] }).join(), /not CC0\/PD/);
  assert.match(bad({ source: 'original', components: undefined, licence: 'original, generated by ACE-Step 1.5 (MIT)' }).join(), /model/);
  assert.deepEqual(bad({ source: 'original', components: undefined, licence: 'original, generated by ACE-Step 1.5 (MIT)', model: 'ACE-Step 1.5', model_licence: 'MIT' }), []);
  fs.writeFileSync(path.join(dir, 'cc-one.licence.json'), '{not json');
  assert.match(checkLibrary(dir).errors.join(), /unreadable/);
  const orphan = tmpLib({ 'x-y.licence.json': '{}' });
  assert.match(checkLibrary(orphan).errors.join(), /library is empty|no audio file/);
  assert.equal(checkLibrary(path.join(dir, 'missing')).ok, false);
});

test('the committed library is valid and covers every mood', () => {
  const r = checkLibrary();
  assert.equal(r.ok, true, r.errors.join('\n'));
  const tracks = loadLibrary();
  for (const m of ['calm', 'emotional', 'aarti', 'festive']) assert.ok(tracks.filter((t) => t.moods.includes(m)).length >= 3, `mood ${m}`);
});

test('musicFor: off by default, on with MUSIC_ENGINE=on', () => {
  const spec = { slug: '2026-11-20-status-khatu-janmotsav', format: 'status' };
  assert.equal(musicFor(spec, { env: {} }), null);
  const m = musicFor(spec, { env: { MUSIC_ENGINE: 'on' }, publishedDir: path.join(os.tmpdir(), 'none') });
  assert.equal(m.meta.mood, 'festive');
  assert.deepEqual(m.input.slice(0, 3), ['-stream_loop', '-1', '-i']);
  assert.match(m.filter, /volume=-2dB/);
});

test('Kaggle windows: 09:00-11:30 and 18:30-21:00 IST are blocked', () => {
  const ist = (h, m) => new Date(Date.UTC(2026, 10, 11, h, m) - 330 * 60e3);
  assert.equal(istWindowBlocked(ist(9, 0)), '09:00-11:30');
  assert.equal(istWindowBlocked(ist(11, 29)), '09:00-11:30');
  assert.equal(istWindowBlocked(ist(11, 30)), null);
  assert.equal(istWindowBlocked(ist(18, 45)), '18:30-21:00');
  assert.equal(istWindowBlocked(ist(1, 0)), null);
});

test('batch jobs and QA gate', () => {
  const jobs = resolveJobs({ singer: { male: 'male voice' }, jobs: [
    { id: 'a', kind: 'vocal', singer: 'male', caption: 'bhajan', lyrics: 'L1' },
    { id: 'b', kind: 'vocal', singer: 'male', caption: 'bhajan', lyrics: 'SAME_AS:a', lyrics_devanagari_of: 'a' }] });
  assert.equal(jobs[0].caption, 'bhajan, male voice');
  assert.equal(jobs[1].lyrics, 'L1');
  const ok = { file: 'x.mp3', seconds: 60, lufs: -12, true_peak: -1, clip_share: 0, kind: 'instrumental' };
  assert.deepEqual(passesQa(ok), []);
  assert.match(passesQa({ ...ok, clip_share: 0.01 }).join(), /clipping/);
  assert.match(passesQa({ ...ok, kind: 'vocal', cer: 0.2 }).join(), /not enabled/);
  assert.deepEqual(passesQa({ ...ok, kind: 'vocal', cer: 0.2 }, { vocals: true }), []);
  assert.match(passesQa({ ...ok, kind: 'vocal', cer: 0.6 }, { vocals: true }).join(), /CER/);
});
