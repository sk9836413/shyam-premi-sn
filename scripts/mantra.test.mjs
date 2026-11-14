// Weekly mantra-jaap long video (automation/mantras.json, scripts/mantra.mjs, music/mantra-takes.mjs,
// scripts/mantra-long.mjs). Run: node --test scripts/mantra.test.mjs
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { addDays, loadInputs, planDay } from './day-plan.mjs';
import {
  REPS, arrange, checkMantraSpec, chooseMalas, counterEvents, findLoop, isEkadashi, loadMantras, malaPlan, mantraDescription,
  mantraFor, mantraSchedule, mantraSlug, mantraTitle, mondayOf, pickPictures, pickTakes, usedIds, weekday,
} from './mantra.mjs';
import { recordUse, timeline } from './mantra-long.mjs';
import { buildBatch, gateTake, mantraNameCheck, needs, stylesFor, sungUnit, takeJob } from '../music/mantra-takes.mjs';
import { hasSearchedPhrase, isBhajanVideo } from './bhakti-seo.mjs';
import { metaFromScenes, syntheticMedia, uploadStatus } from './youtube.mjs';

const cat = loadMantras('.');
const M = (id) => ({ ...cat.mantras[id], id });
const real = () => loadInputs('.');
const isLongMantra = (p) => p.uploads.some((u) => u.slot === 'long' && u.kind === 'mantra');
const fest = (name, theme, tier = 'status', key = name.toLowerCase().replace(/\W+/g, '-')) => ({ name, theme, tier, key });
const synth = (days = {}, o = {}) => ({ festivals: new Map(Object.entries(days)), movies: new Map(), mantras: cat, ...o });

describe('schedule: once a week, on the right day, never displacing Chhath / Janmotsav / movie days', () => {
  test('the real calendar 16 Nov 2026 - 31 Jan 2027: exactly one mantra video per Mon-Sun week from 22 Nov, the long video of that day', () => {
    const inputs = real();
    const byWeek = new Map();
    for (let d = '2026-11-09'; d <= '2027-01-31'; d = addDays(d, 1)) {
      const m = mantraFor(d, inputs);
      const p = planDay(d, inputs);
      const longs = p.uploads.filter((u) => u.slot === 'long');
      assert.equal(longs.length, 1, `${d}: one long video`);
      assert.equal(isLongMantra(p), !!m, `${d}: plan and mantraFor agree`);
      if (!m) continue;
      assert.ok(d >= '2026-11-22', `${d}: none before the start`);
      assert.equal(longs[0].at, '05:30'); // a dawn upload (owner, 14 Nov 2026), made the evening before
      assert.match(longs[0].what, /mantra jaap/);
      assert.match(longs[0].what, /long katha video/, 'the katha fallback is described');
      const wk = mondayOf(d);
      assert.ok(!byWeek.has(wk), `${d}: a second mantra in the week of ${wk}`);
      byWeek.set(wk, m.id);
      const f = inputs.festivals.get(d);
      assert.ok(weekday(d) === 0 || (isEkadashi(f) && m.group === 'krishna' && d >= cat.ekadashi_from), `${d}: Sunday, or a Krishna week's Ekadashi`);
    }
    const weeks = [...byWeek.keys()];
    assert.equal(weeks[0], '2026-11-16');
    for (let i = 1; i < weeks.length; i++) assert.equal(weeks[i], addDays(weeks[i - 1], 7), `a week without a mantra after ${weeks[i - 1]}`);
  });
  test('the first four: 22 Nov vasudev, 29 Nov Hare Krishna, 6 Dec Om Namah Shivaya, 13 Dec Ganesh; consecutive weeks differ', () => {
    const s = mantraSchedule('2026-11-16', 10, real());
    assert.deepEqual(s.slice(0, 4).map((w) => [w.date, w.mantra]), [['2026-11-22', 'vasudev'], ['2026-11-29', 'hare-krishna'], ['2026-12-06', 'shiv'], ['2026-12-13', 'ganesh']]);
    assert.equal(s[4].mantra, 'ram');
    for (let i = 1; i < s.length; i++) assert.notEqual(s[i].mantra, s[i - 1].mantra);
  });
  test('Chhath (13-16 Nov), the movie days (17-20 Nov), Janmotsav (20 Nov) and the override dates keep their own long video', () => {
    const inputs = real();
    for (let d = '2026-11-13'; d <= '2026-11-20'; d = addDays(d, 1)) {
      assert.equal(mantraFor(d, inputs), null, d);
      assert.ok(!isLongMantra(planDay(d, inputs)), d);
    }
    for (const d of Object.keys(inputs.override?.days || {})) assert.equal(mantraFor(d, inputs), null, d);
    for (const [d, f] of inputs.festivals) if (['chhath', 'janmotsav'].includes(f.theme) || f.tier === 'big') assert.equal(mantraFor(d, inputs), null, `${d} ${f.name}`);
  });
  test('a Vishnu/Krishna mantra moves to an Ekadashi of its week from 23 Nov; Shiv/Ganesh/Ram stay on Sunday', () => {
    // week of Mon 23 Nov (week 1 = hare-krishna): an Ekadashi on Wed 25 Nov
    const i1 = synth({ '2026-11-25': fest('Test Ekadashi', 'ekadashi') });
    assert.equal(mantraFor('2026-11-25', i1)?.id, 'hare-krishna');
    assert.equal(mantraFor('2026-11-29', i1), null);
    // week 2 = shiv: an Ekadashi on Fri 4 Dec does not move it
    const i2 = synth({ '2026-12-04': fest('Utpanna Ekadashi', 'ekadashi') });
    assert.equal(mantraFor('2026-12-04', i2), null);
    assert.equal(mantraFor('2026-12-06', i2)?.id, 'shiv');
    // Gita Jayanti / Mokshada Ekadashi counts as an Ekadashi
    assert.ok(isEkadashi(fest('Gita Jayanti; Mokshada Ekadashi', 'gita')));
  });
  test('before 23 Nov no Ekadashi move; Janmotsav (Dev Uthani Ekadashi) is never "an Ekadashi" for the mantra', () => {
    const i = synth({ '2026-11-20': fest('Khatu Shyam Baba Janmotsav = Dev Uthani (Prabodhini) Ekadashi', 'janmotsav', 'big', 'khatu-shyam-janmotsav'), '2026-11-19': fest('Some Ekadashi', 'ekadashi') });
    assert.ok(!isEkadashi(i.festivals.get('2026-11-20')));
    assert.equal(mantraFor('2026-11-19', i), null);
    assert.equal(mantraFor('2026-11-22', i)?.id, 'vasudev');
  });
  test('a protected Ekadashi (movie part) falls back to Sunday; a protected Sunday means no mantra that week', () => {
    const i = synth({ '2026-11-25': fest('Test Ekadashi', 'ekadashi') }, { movies: new Map([['2026-11-25', 'x part 1']]) });
    assert.equal(mantraFor('2026-11-25', i), null);
    assert.equal(mantraFor('2026-11-29', i)?.id, 'hare-krishna');
    const j = synth({}, { movies: new Map([['2026-12-06', 'x part 2']]) });
    assert.equal(mantraFor('2026-12-06', j), null);
    assert.equal(mantraSchedule('2026-11-30', 1, j)[0].date, null);
    const k = synth({ '2026-12-13': fest('Big Day', 'x', 'big') });
    assert.equal(mantraFor('2026-12-13', k), null, 'big festivals keep their katha');
    const o = synth({}, { override: { days: { '2026-12-20': { long: { what: 'x' } } } } });
    assert.equal(mantraFor('2026-12-20', o), null, 'a date-scoped override long');
  });
});

describe('108 count', () => {
  test('every divisor loop gives exactly 108 chants; other loop sizes are refused', () => {
    for (const reps of [1, 2, 3, 4, 6, 9, 12]) {
      const p = malaPlan({ reps, length: reps * 5.2 });
      assert.equal(p.count, REPS);
      assert.equal(p.copies * p.reps, REPS);
      assert.ok(Math.abs(p.seconds - 108 * 5.2) < 1e-6);
    }
    for (const reps of [5, 7, 8, 10, 0]) assert.throws(() => malaPlan({ reps, length: 30 }));
  });
  test('the on-screen counter: 1..108 in order, no gaps or overlaps, ending with the mala', () => {
    const p = malaPlan({ reps: 4, length: 22 });
    const c = counterEvents(p);
    assert.equal(c.length, 108);
    c.forEach((e, i) => { assert.equal(e.n, i + 1); assert.ok(e.end > e.start); if (i) assert.equal(e.start, c[i - 1].end); });
    assert.equal(c[0].start, 0);
    assert.equal(c.at(-1).end, p.seconds);
  });
  test('findLoop: a chant every 5.3 s after a 6 s intro -> the period, a divisor of 108, a start in the gap', () => {
    const fps = 100, dur = 120, P = 5.3;
    const env = new Float64Array(dur * fps).map((_, i) => {
      const t = i / fps;
      if (t < 6) return -40 + Math.sin(i) * 0.5;
      const ph = (t - 6) % P;
      return (ph < 3.4 ? -12 + 3 * Math.sin(ph * 2) : -38) + Math.sin(i * 1.7) * 0.4;
    });
    const r = findLoop({ env, fps, estPeriod: 6 });
    assert.ok(!r.error, r.error);
    assert.ok(Math.abs(r.period - P) < 0.05, `period ${r.period}`);
    assert.equal(REPS % r.reps, 0);
    assert.ok(r.start >= 0.12 * dur);
    const ph = (r.start - 6) % P;
    assert.ok(ph >= 3.3 || ph < 0.05, `start ${r.start} is in a gap (phase ${ph.toFixed(2)})`);
    assert.ok(r.start + r.length < 0.92 * dur);
  });
  test('findLoop refuses noise without a chant rhythm and too-short takes', () => {
    let s = 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    assert.ok(findLoop({ env: new Float64Array(9000).map(() => -30 + rnd() * 20), fps: 100, estPeriod: 6 }).error);
    assert.ok(findLoop({ env: new Float64Array(500), fps: 100, estPeriod: 6 }).error);
  });
  test('timeline: intro, malas with 6 s bridges, ending; chapters one per mala', () => {
    const tl = timeline({ introLen: 45, malaPlans: [{ seconds: 600 }, { seconds: 500 }, { seconds: 700 }], endingLen: 40 });
    assert.deepEqual(tl.malas.map((m) => m.start), [45, 651, 1157]);
    assert.deepEqual(tl.malas.map((m) => m.chapter), [45, 645, 1151]);
    assert.equal(tl.ending, 1857);
    assert.equal(tl.total, 1897);
  });
});

describe('takes: never reused, arranged slow - medium - slow', () => {
  const take = (id, o = {}) => ({ id, mantra: 'vasudev', status: 'ok', for: '2026-11-22', tempo: 'slow', style: id, file: `music/mantra/takes/${id}.ogg`, loop: { reps: 4, length: 26, start: 10 }, used_in: null, ...o });
  test('pickTakes skips used takes (used_in or in a video), other mantras, failed takes and takes without a loop', () => {
    const ledger = {
      takes: [take('a'), take('b', { used_in: '2026-11-15-long-mantra-vasudev' }), take('c'), take('d', { mantra: 'shiv' }), take('e', { status: 'rejected' }), take('f', { loop: { error: 'x' } }), take('g', { tempo: 'medium' })],
      videos: [{ slug: 'old', takes: ['c'] }],
    };
    assert.deepEqual(pickTakes(ledger, { mantra: 'vasudev', date: '2026-11-22' }).map((t) => t.id).sort(), ['a', 'g']);
    assert.deepEqual([...usedIds(ledger)].sort(), ['b', 'c']);
  });
  test('recordUse marks the takes used, logs the video, deletes the audio and refuses a second use', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mantra-'));
    fs.mkdirSync(path.join(root, 'music/mantra/takes'), { recursive: true });
    for (const id of ['a', 'b']) fs.writeFileSync(path.join(root, `music/mantra/takes/${id}.ogg`), 'x');
    const ledger = { takes: [take('a'), take('b', { tempo: 'medium' })], videos: [] };
    const spec = { slug: '2026-11-22-long-mantra-vasudev', date: '2026-11-22', mantra: 'vasudev', pictures: ['p1'], malas: [{ take: 'a', style: 'a' }, { take: 'b', style: 'b' }] };
    recordUse(ledger, spec, { root });
    assert.deepEqual(ledger.takes.map((t) => t.used_in), [spec.slug, spec.slug]);
    assert.ok(!fs.existsSync(path.join(root, 'music/mantra/takes/a.ogg')));
    assert.equal(ledger.videos.length, 1);
    assert.equal(pickTakes(ledger, { mantra: 'vasudev', date: '2026-11-22' }).length, 0);
    assert.throws(() => recordUse(ledger, { ...spec, slug: 'again' }, { root }), /already used/);
    fs.rmSync(root, { recursive: true, force: true });
  });
  test('arrange: slow, medium, slow, medium, slow; never the same arrangement twice in a row', () => {
    const t = [take('s1'), take('s2'), take('s3'), take('m1', { tempo: 'medium' }), take('m2', { tempo: 'medium' })];
    assert.deepEqual(arrange(t).map((x) => x.tempo), ['slow', 'medium', 'slow', 'medium', 'slow']);
    const a = arrange([take('x', { style: 'same' }), take('y', { style: 'same' }), take('z', { tempo: 'medium', style: 'other' })]);
    for (let i = 1; i < a.length; i++) assert.notEqual(a[i].style, a[i - 1].style);
  });
  test('chooseMalas: as many takes as fit in 62 min (max 5); none when under 18 min', () => {
    const mk = (n, len, reps = 4) => Array.from({ length: n }, (_, i) => take(`t${i}`, { loop: { reps, length: len } }));
    assert.equal(chooseMalas(mk(5, 4 * 6), { cat }).malas, 5); // 5 x 10.8 min = 54 min
    assert.equal(chooseMalas(mk(5, 4 * 8), { cat }).malas, 4); // 14.4 min a mala
    assert.equal(chooseMalas(mk(1, 4 * 3), { cat }), null); // 5.4 min
    assert.equal(chooseMalas(mk(1, 4 * 3), { cat, sample: true }).malas, 1);
    assert.equal(chooseMalas(mk(2, 4 * 16), { cat }).malas, 2); // Hare Krishna at 16 s: 2 x 28.8 min + intro/ending = 59 min
    assert.equal(chooseMalas(mk(2, 4 * 18), { cat }).malas, 1); // at 18 s two malas would be 66 min
  });
  test('the Kaggle batch: one take per mala + spares, different arrangements, the sung spelling, unique ids and seeds', () => {
    const ledger = { takes: [], videos: [] };
    const plan = needs({ cat, inputs: real(), ledger, today: '2026-11-21', mantraFor });
    assert.deepEqual(plan.map((v) => [v.date, v.mantra, v.make]), [['2026-11-22', 'vasudev', cat.mantras.vasudev.malas + 2]]);
    const b = buildBatch(cat, ledger, plan, '2026-11-21');
    assert.equal(new Set(b.jobs.map((j) => j.style)).size, b.jobs.length);
    assert.deepEqual(b.jobs.map((j) => j.tempo), ['slow', 'medium', 'slow', 'medium', 'slow']);
    assert.equal(new Set(b.jobs.map((j) => j.seeds[0])).size, b.jobs.length);
    for (const j of b.jobs) {
      assert.match(j.lyrics, /^\[verse\]\n/);
      assert.ok(j.lyrics.includes(sungUnit(M('vasudev'))));
      assert.ok(j.duration >= 75 && j.duration <= 150);
      assert.match(j.caption, /raag/);
    }
    assert.deepEqual(needs({ cat, inputs: real(), ledger, today: '2026-11-16', mantraFor }), [], 'nothing before generate_from (after the movie GPU days)');
    const tight = needs({ cat, inputs: real(), ledger, today: '2026-11-23', hoursLeft: 8, mantraFor });
    assert.equal(tight[0].make, Math.min(cat.mantras[tight[0].mantra].malas, 3) + 1);
    const used = stylesFor(cat, { takes: b.jobs.map((j) => ({ mantra: 'vasudev', style: j.style })) }, 'vasudev', 3, 'x');
    assert.ok(used.every((s) => !b.jobs.slice(0, 3).some((j) => j.style === s.id) || cat.styles.length < 8), 'next week prefers unused arrangements');
    assert.equal(takeJob(cat, M('shiv'), { date: '2026-12-06', n: 1, style: cat.styles[0] }).id, 'm-2026-12-06-shiv-1');
  });
  test('pictures: each week the least-used photos first, so two weeks of the same deity get different sets', () => {
    const pool = Array.from({ length: 30 }, (_, i) => `p${i}`);
    const w1 = pickPictures(pool, { videos: [] }, { n: 15 });
    const w2 = pickPictures(pool, { videos: [{ pictures: w1 }] }, { n: 15 });
    assert.equal(w2.filter((p) => w1.includes(p)).length, 0);
  });
});

describe('Whisper gate on the deity name (non-श्री positions)', () => {
  const rep = (s, n) => Array(n).fill(s).join(' ');
  const t = (whisper, o = {}) => ({ file: 'x.mp3', seconds: 110, clip_share: 0, true_peak: -1.2, lufs: -16, whisper, clap: { 'Indian devotional bhajan': 0.4, 'Indian classical music': 0.2, 'western rock music': 0.02 }, ...o });
  test('वासुदेव heard right passes; बासुदेव (v -> b) fails', () => {
    assert.ok(gateTake(t(rep('ओम नमो भगवते वासुदेवाय', 14)), M('vasudev')).ok);
    const bad = mantraNameCheck(M('vasudev'), rep('ओम नमो भगवते बासुदेवाय', 12));
    assert.equal(bad.ok, false);
    assert.equal(gateTake(t(rep('ओम नमो भगवते बासुदेवाय', 12)), M('vasudev')).ok, false);
  });
  test('the 80 % rule: 12 of 14 right passes, 10 of 14 fails', () => {
    assert.ok(mantraNameCheck(M('vasudev'), `${rep('ओम नमो भगवते वासुदेवाय', 12)} ${rep('ओम नमो भगवते बासुदेवाय', 2)}`).ok);
    assert.equal(mantraNameCheck(M('vasudev'), `${rep('ओम नमो भगवते वासुदेवाय', 10)} ${rep('ओम नमो भगवते बासुदेवाय', 4)}`).ok, false);
  });
  test('शिवाय right, सिवाय wrong; गणपतये / गनपतये right; कृष्ण + राम in the maha-mantra', () => {
    assert.ok(mantraNameCheck(M('shiv'), rep('ओम नमः शिवाय', 30)).ok);
    assert.equal(mantraNameCheck(M('shiv'), rep('ओम नमः सिवाय', 30)).ok, false);
    assert.ok(mantraNameCheck(M('ganesh'), rep('ओम गं गणपतये नमः', 20)).ok);
    assert.ok(mantraNameCheck(M('ganesh'), rep('ओम गं गनपतये नमः', 20)).ok);
    assert.ok(mantraNameCheck(M('hare-krishna'), rep('हरे कृष्ण हरे कृष्ण कृष्ण कृष्ण हरे हरे हरे राम हरे राम राम राम हरे हरे', 7)).ok);
    assert.equal(mantraNameCheck(M('hare-krishna'), rep('हरे किसन हरे किसन किसन किसन हरे हरे हरे राम हरे राम राम राम हरे हरे', 7)).ok, false);
  });
  test('राम right after श्री is never checked (Whisper bias), the other two राम are', () => {
    const r = mantraNameCheck(M('ram'), rep('श्री शाम जय राम जय जय राम', 15));
    assert.ok(r.ok);
    assert.equal(r.checked, 30);
    assert.equal(mantraNameCheck(M('ram'), rep('श्री राम जय नाम जय जय नाम', 15)).ok, false);
  });
  test('clipping, a missing transcript or western-sounding music fail the take', () => {
    const ok = rep('ओम नमः शिवाय', 30);
    assert.equal(gateTake(t(ok, { clip_share: 0.01 }), M('shiv')).ok, false);
    assert.equal(gateTake(t(null), M('shiv')).ok, false);
    assert.equal(gateTake(t(ok, { clap: { 'Indian devotional bhajan': 0.1, 'western rock music': 0.6 } }), M('shiv')).ok, false);
    assert.ok(gateTake(t(ok), M('shiv')).ok);
  });
});

describe('title, description and validator rules', () => {
  const spec = (id = 'vasudev', o = {}) => {
    const m = M(id);
    const malas = [0, 1, 2].map((k) => ({ take: `m-2026-11-22-${id}-${k + 1}-s1`, style: cat.styles[k].id, raag: cat.styles[k].raag, tempo: cat.styles[k].tempo, count: 108, reps: 4, copies: 27, period: 6, seconds: 648, start: 45 + k * 654 }));
    return {
      slug: mantraSlug('2026-11-22', id), format: 'long', kind: 'mantra', mantra: id, date: '2026-11-22', deity: m.deity, source: m.source_hi,
      youtube_title: mantraTitle(m), youtube_description: mantraDescription({ m, malas, seconds: 2100, credits: ['Photo: A, CC BY 2.0, via Wikimedia Commons (https://x)'], cat }),
      youtube_tags: m.tags.join(', '), synthetic: true, seconds: 2100, malas,
      chapters: [{ title: 'Parichay', start: 0 }, ...malas.map((x, k) => ({ title: `Mala ${k + 1}`, start: x.start })), { title: 'Shanti path', start: 2060 }],
      pictures: ['a', 'b', 'c', 'd', 'e'], ...o,
    };
  };
  test('titles: the mantra, 108 and a searched phrase; Krishna Mantra only for Krishna/Vishnu mantras', () => {
    assert.equal(mantraTitle(M('vasudev')), 'ॐ नमो भगवते वासुदेवाय 108 बार | Krishna Mantra Jaap | Bhakti Geet');
    for (const id of Object.keys(cat.mantras)) {
      const title = mantraTitle(M(id));
      assert.ok(title.length <= 100 && title.includes('108') && hasSearchedPhrase(title), title);
      assert.equal(/Krishna Mantra/.test(title), cat.mantras[id].group === 'krishna', title);
    }
  });
  test('a full spec passes; every rule fails on its own', () => {
    assert.deepEqual(checkMantraSpec(spec(), cat), []);
    for (const id of Object.keys(cat.mantras)) assert.deepEqual(checkMantraSpec(spec(id), cat), [], id);
    const bad = (o, re) => assert.ok(checkMantraSpec(spec('vasudev', o), cat).some((p) => re.test(p)), JSON.stringify(Object.keys(o)));
    bad({ youtube_title: 'ॐ नमो भगवते वासुदेवाय 108 बार | Shyam Sangeet Studio' }, /other channels/);
    bad({ youtube_title: 'ॐ नमो भगवते वासुदेवाय 108 बार | Jaap' }, /searched generic phrase/);
    bad({ youtube_title: 'ॐ नमो भगवते वासुदेवाय | Krishna Mantra Jaap' }, /108/);
    bad({ synthetic: false }, /synthetic/);
    bad({ youtube_description: spec().youtube_description.replace(cat.disclosure, '') }, /disclosure/);
    bad({ youtube_description: spec().youtube_description.replace(cat.mantras.vasudev.source_hi, 'x') }, /source/);
    bad({ youtube_description: spec().youtube_description.replace(cat.mantras.vasudev.meaning_hi, 'x') }, /meaning/);
    bad({ youtube_description: `${spec().youtube_description}\n0:00 Intro` }, /timestamps/);
    bad({ malas: spec().malas.map((x, k) => (k ? x : { ...x, count: 107 })) }, /exactly 108/);
    bad({ malas: spec().malas.map((x) => ({ ...x, take: 'same' })) }, /different take/);
    bad({ malas: spec().malas.map((x) => ({ ...x, style: 'same' })) }, /different arrangements/);
    bad({ seconds: 600 }, /length/);
    bad({ seconds: 4000 }, /length/);
  });
  test('scripts/validate.mjs: exit 0 on a good spec, 1 on another channel\'s name', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mantra-v-'));
    const good = path.join(dir, 'good.json'), bad = path.join(dir, 'bad.json');
    fs.writeFileSync(good, JSON.stringify(spec()));
    fs.writeFileSync(bad, JSON.stringify(spec('vasudev', { youtube_tags: `${spec().youtube_tags}, ganpati official` })));
    const v = (f) => spawnSync(process.execPath, ['scripts/validate.mjs', '--soft-topics', f], { encoding: 'utf8' });
    const g = v(good);
    assert.equal(g.status, 0, g.stdout);
    assert.equal(v(bad).status, 1);
    fs.rmSync(dir, { recursive: true, force: true });
  });
  test('upload: synthetic media declared, Bhakti Geet playlist, other channels\' names refused, chapters from the meta', () => {
    const s = spec();
    assert.ok(isBhajanVideo(s) && isBhajanVideo({ bhajan: { mode: 'mantra' } }));
    assert.equal(syntheticMedia(s), true);
    assert.equal(uploadStatus({ synthetic: true }, {}).containsSyntheticMedia, true);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mantra-u-'));
    const f = path.join(dir, 's.json'), meta = path.join(dir, 'm.json');
    fs.writeFileSync(f, JSON.stringify(s));
    fs.writeFileSync(meta, JSON.stringify({ chapters: s.chapters }));
    const md = metaFromScenes(f, meta);
    assert.match(md.description, /0:00 Parichay[\s\S]*Mala 3/);
    fs.writeFileSync(f, JSON.stringify({ ...s, youtube_description: `${s.youtube_description} Ganesh Youth Association` }));
    assert.throws(() => metaFromScenes(f, meta), /another channel/);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
