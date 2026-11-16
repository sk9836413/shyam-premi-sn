// scripts/status-engine.mjs: festival status variants, titles, de-dup, what the status job makes now, and that every
// generated spec passes scripts/validate.mjs. Run: node --test scripts/status-engine.test.mjs
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { addDays, loadInputs, planDay } from './day-plan.mjs';
import { SHARE_LINE, buildFamily, buildVariant, dayStatus, dayStatusDue, due, hookFor, loadFestivals, placements, slugOf, titleOf } from './status-engine.mjs';
import { withShareLine } from './youtube.mjs';
import { checkFbCaption } from './fb.mjs';

const festivals = loadFestivals('.');
const inputs = loadInputs('.');
const planned = placements(festivals).filter((p) => planDay(p.date, inputs).uploads.some((u) => u.slot === p.slot && u.festival === p.festival.key && u.k === p.k));
const PATTERN = /^.+ Status 20(26|27) \| .+ स्टेटस वीडियो #Shorts$/;

describe('calendar', () => {
  test('every festival has a date, a tier, two sources and enough names for its variants', () => {
    for (const f of festivals) {
      assert.match(f.date, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(['big', 'status', 'info'].includes(f.tier), f.key);
      assert.ok(f.sources.length >= 2, `${f.key}: two sources`);
      if (f.tier !== 'info') {
        const n = (f.variants || []).length || (f.tier === 'big' ? 3 : 2);
        assert.ok(f.names.length >= n, `${f.key}: ${n} names`);
        assert.ok(f.spec || f.theme, `${f.key}: spec or theme`);
      }
    }
  });
  test('the window ends 31 Jan 2027; Mauni Amavasya and Basant Panchami (Feb 2027) are not in it', () => {
    assert.ok(festivals.every((f) => f.date <= '2027-01-31'));
    assert.ok(!festivals.some((f) => /mauni|basant|vasant/i.test(f.key)));
  });
});

describe('titles', () => {
  test('every status title follows the winning pattern', () => {
    for (const p of placements(festivals)) assert.match(titleOf(p), PATTERN, titleOf(p));
  });
  test('the variants of one festival never share a title', () => {
    for (const f of festivals) {
      const t = placements([f]).map(titleOf);
      assert.equal(new Set(t).size, t.length, `${f.key}: ${t.join(' / ')}`);
    }
  });
  test('no title repeats within 7 days, and no slug repeats at all', () => {
    const seen = new Map();
    for (const p of planned) {
      const t = titleOf(p);
      if (seen.has(t)) assert.ok((Date.parse(p.date) - Date.parse(seen.get(t))) / 864e5 > 7, `"${t}" on ${seen.get(t)} and ${p.date}`);
      seen.set(t, p.date);
    }
    const slugs = planned.map(slugOf);
    assert.equal(new Set(slugs).size, slugs.length);
  });
  test('day status titles rotate weekly: no repeat within 7 days', () => {
    const seen = new Map();
    for (let d = '2026-11-11'; d <= '2027-01-31'; d = addDays(d, 1)) {
      const t = dayStatus(d).youtube_title;
      if (seen.has(t)) assert.ok((Date.parse(d) - Date.parse(seen.get(t))) / 864e5 >= 7, t);
      seen.set(t, d);
    }
  });
  test('hooks: kal / parson / aaj / badhai', () => {
    const j = placements(festivals.filter((f) => f.key === 'khatu-shyam-janmotsav'));
    assert.deepEqual(j.map((p) => hookFor(p).hi), ['परसों है श्याम बाबा जन्मोत्सव 🙏', 'कल है खाटू श्याम जन्मोत्सव 🙏', 'आज है देवउठनी एकादशी 🙏', 'खाटू श्याम जन्मदिन की बधाई 🙏']);
  });
  test('a variant `hook` replaces the default one (Gopashtami 2026: only the 00:30 Short, its own greeting)', () => {
    const g = placements(festivals.filter((f) => f.key === 'gopashtami'));
    assert.deepEqual(g.map((p) => `${p.date} ${p.slot} ${p.at}`), ['2026-11-17 status 00:30']);
    assert.deepEqual(hookFor(g[0]), { hi: 'गोपाष्टमी की शुभकामनाएं 🐄', say: 'गोपाष्टमी की शुभकामनाएं!', roman: 'Gopashtami ki shubhkamnayein 🐄' });
    assert.equal(titleOf(g[0]), 'Gopashtami Status 2026 | गोपाष्टमी स्टेटस वीडियो #Shorts');
    const v = buildVariant(buildFamily(g[0].festival, '.'), g[0]);
    assert.equal(v.scenes[0].big, 'गोपाष्टमी की शुभकामनाएं 🐄');
    assert.equal(v.playlist, 'Vishnu ji aur Krishna ki Kathayein');
    assert.ok(planDay('2026-11-17', inputs).uploads.some((u) => u.slot === 'status' && u.festival === 'gopashtami'));
    assert.ok(planDay('2026-11-17', inputs).uploads.some((u) => u.slot === 'movie'));
  });
});

describe('what the status job makes now (due)', () => {
  const log = '';
  const planFor = (d) => planDay(d, inputs);
  const at = (iso) => Date.parse(iso);
  test('19 Nov 10:43 IST: the Janmotsav eve (today 20:00) + 00:30 + 08:30 variants of 20 Nov, one family', () => {
    const r = due({ today: '2026-11-19', now: at('2026-11-19T10:43:00+05:30'), log, festivals, planFor });
    assert.equal(r.family, '2026-11-20');
    assert.deepEqual(r.variants.map((p) => `${p.date} ${p.slot}`), ['2026-11-19 eve', '2026-11-20 status', '2026-11-20 statusday']);
  });
  test('18 Nov: only the 2-days-before Janmotsav variant', () => {
    const r = due({ today: '2026-11-18', now: at('2026-11-18T18:46:00+05:30'), log, festivals, planFor });
    assert.deepEqual(r.variants.map((p) => `${p.date} ${p.slot} ${p.k}`), ['2026-11-18 eve 0']);
  });
  test('logged variants and the cap-dropped Tulsi Vivah eve are skipped', () => {
    const r = due({ today: '2026-11-20', now: at('2026-11-20T18:46:00+05:30'), log: '2026-11-21 | status | x | y | z\n', festivals, planFor });
    assert.equal(r.variants.length, 0);
    assert.ok(r.skipped.some((s) => /cap/.test(s)));
    assert.ok(r.skipped.some((s) => /log\.md/.test(s)));
  });
  test('an eve variant is not made after 22:30 IST', () => {
    const r = due({ today: '2026-12-03', now: at('2026-12-03T22:40:00+05:30'), log, festivals, planFor });
    assert.deepEqual(r.variants.map((p) => p.slot), ['status']);
  });
  test('family mode (slot=status + status_date) with dry: every variant of that festival', () => {
    const r = due({ today: '2026-11-11', log, festivals, planFor, family: '2026-11-20', dry: true });
    assert.equal(r.variants.length, 4);
  });
  // owner, 16 Nov 2026: a status Short every day, public 06:00 IST, made the evening before
  test('no festival variant due: the family is TOMORROW\'s day status Short (06:00, morning slot)', () => {
    const r = due({ today: '2026-11-17', now: at('2026-11-17T18:46:00+05:30'), log, festivals, planFor });
    assert.equal(r.family, '2026-11-18');
    assert.deepEqual(r.daystatus, { date: '2026-11-18', theme: 3, at: '06:00' });
    assert.deepEqual(r.variants, []);
  });
  test('festival variants go first; a logged morning slot, a festival morning or family mode give no day status', () => {
    assert.equal(due({ today: '2026-11-19', now: at('2026-11-19T10:43:00+05:30'), log, festivals, planFor }).daystatus, undefined);
    const logged = due({ today: '2026-11-17', now: at('2026-11-17T18:46:00+05:30'), log: '2026-11-18 | morning | 2026-11-18-morning-budhvar-ganesh | g | s\n', festivals, planFor });
    assert.equal(logged.family, null);
    assert.ok(logged.skipped.some((x) => /already in log\.md/.test(x)));
    assert.match(dayStatusDue({ today: '2026-11-20', planFor }).skip, /no day status/); // 21 Nov Tulsi Vivah: festival darshan morning
    assert.equal(due({ today: '2026-11-17', log, festivals, planFor, family: '2026-11-20', dry: true }).daystatus, undefined);
  });
});

describe('share push (owner, 16 Nov 2026)', () => {
  test('every status Short (festival variants and the day status) carries the share line; YouTube puts it LAST', () => {
    const v = buildVariant(buildFamily(festivals.find((x) => x.key === 'khatu-shyam-janmotsav'), '.'), placements(festivals).find((p) => p.festival.key === 'khatu-shyam-janmotsav'));
    for (const spec of [v, dayStatus('2026-11-18')]) {
      assert.equal(spec.share_line, SHARE_LINE);
      const d = withShareLine(`${spec.youtube_description}\n\nStatus video download karein: https://x\n\nभजन: मौलिक रचना`, spec);
      assert.equal(d.split('\n').at(-1), SHARE_LINE);
      assert.equal(d.split(SHARE_LINE).length, 2, 'once');
      assert.equal(withShareLine(d, spec), d, 'idempotent');
    }
    assert.match(SHARE_LINE, /WhatsApp स्टेटस/);
    assert.equal(withShareLine('x', {}), 'x', 'other videos unchanged');
  });
  test('Facebook never gets it: the bait rule forbids "शेयर", and the status FB caption does not contain it', () => {
    assert.ok(checkFbCaption(`जय श्री श्याम 🙏 आज किसके दर्शन किए?\nखाटू वाले श्याम\n${SHARE_LINE}\n#KhatuShyam #JaiShreeShyam #Bhakti`).some((e) => /bait/.test(e)));
    assert.doesNotMatch(dayStatus('2026-11-18').facebook_caption, /शेयर/);
  });
});

describe('specs pass scripts/validate.mjs', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'status-engine-'));
  const check = (spec) => {
    const f = path.join(dir, `${spec.slug}.json`);
    fs.writeFileSync(f, JSON.stringify(spec));
    const r = spawnSync(process.execPath, ['scripts/validate.mjs', f], { encoding: 'utf8' });
    assert.equal(r.status, 0, `${spec.slug}\n${r.stdout}${r.stderr}`);
  };
  test('every festival variant: loop, hook first, status ask, no end card', () => {
    for (const p of placements(festivals).filter((x) => x.festival.key !== 'bhai-dooj')) {
      const spec = buildVariant(buildFamily(p.festival, '.'), p);
      assert.equal(spec.loop, true);
      assert.equal(spec.scenes[0].big, hookFor(p).hi);
      assert.ok(!spec.scenes.some((s) => s.endcard));
      assert.match(JSON.stringify(spec), /स्टेटस पर लगाएं/);
      check(spec);
    }
  });
  test('big festivals: each variant opens on a different picture', () => {
    for (const key of ['khatu-shyam-janmotsav', 'dev-deepawali', 'makar-sankranti']) {
      const f = festivals.find((x) => x.key === key);
      const firsts = placements([f]).map((p) => buildVariant(buildFamily(f, '.'), p).scenes[0].prompt);
      assert.equal(new Set(firsts).size, firsts.length, key);
    }
  });
  test('Khatu Shyam ji is the sheesh only in every variant prompt', () => {
    for (const p of placements(festivals)) {
      if (p.festival.key === 'bhai-dooj') continue;
      for (const s of buildVariant(buildFamily(p.festival, '.'), p).scenes) {
        if (/khatu shyam ji|shyam baba|baba shyam/i.test(s.prompt) && !/temple|devotees/i.test(s.prompt)) assert.match(s.prompt, /sheesh|head only/i, s.prompt);
      }
    }
  });
  test('day status Shorts for every weekday and Gyaras', () => {
    for (let i = 0; i < 7; i++) check(dayStatus(addDays('2026-11-16', i)));
    check(dayStatus('2026-12-04', { theme: 'gyaras' }));
  });
});
