#!/usr/bin/env node
// Festival status engine (owner, 11 Nov 2026): the channel's only format that went viral is the festival "status" Short
// (Choti Diwali Status 2026: 798 views; Dhanteras Status 456; Govardhan Puja Status 56 within hours of 00:30), released
// the night before or early on the day, when people pick tomorrow's WhatsApp status. So every festival in
// automation/festivals.json (two panchang sources each) gets 15-25 s loopable status Shorts:
//   status tier: the evening before at 20:00 IST (slot `eve`) and 00:30 IST on the day (slot `status`)
//   big tier:    + 08:30 IST on the day (slot `statusday`), each variant with its own 3 pictures; Janmotsav also 2 days
//                before (festivals.json `variants`)
// and the morning slot of normal days is a weekday "day status" Short (Somvar Mahadev, Mangalvar Salasar Balaji, ...;
// Ekadashi: Gyaras Khatu Shyam). scripts/day-plan.mjs decides which of them fit the 3-uploads-a-day cap.
// Titles: "<Festival> Status <year> | <Hindi> स्टेटस वीडियो #Shorts", one festivals.json name per variant, so no two
// uploads share a title. The first frame is a bold Hindi hook ("कल है खाटू श्याम जन्मोत्सव 🙏"), every scene asks
// "स्टेटस पर लगाएं", and the video ends on its own first frame (render-story.mjs `loop`), so it replays seamlessly.
//
//   node scripts/status-engine.mjs due [--today D] [--family D] [--dry] --out <dir>   what the `status` job makes now:
//        writes <dir>/family.json (the base spec: story/status/<date>.json or the theme) and <dir>/due.json
//   node scripts/status-engine.mjs variants --base <W>/scenes.json --due <dir>/due.json   writes <W>/v-<slug>.json for
//        each due variant (pictures and Kaggle clips of the base reused) and prints one line per variant:
//        <file>\t<slug>\t<day>\t<slot>\t<at>
//   node scripts/status-engine.mjs day --date D --out story/today/scenes.json [--log automation/log.md]   the morning
//        day status Short (the story job runs it instead of Claude when day-plan says kind=daystatus)
//   node scripts/status-engine.mjs plan [--from D] [--to D]    every planned status upload with its title (dry run)
//   node scripts/status-engine.mjs calendar                    rewrite automation/calendar.md from festivals.json
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DAY_THEMES, DEFAULT_PICKS, MANTRA, THEMES } from './status-themes.mjs';

export const STYLE = '3D animated devotional movie style, Pixar quality, soft cinematic lighting, rich warm festive colours, glowing diyas, vertical friendly centred composition, no text, no letters, no writing';
export const CTA = 'स्टेटस पर लगाएं 📲';
const LAST_LINE = 'अपनों को भेजें, सब्सक्राइब करें 🙏';
const LAST_SAY = 'स्टेटस पर लगाएं, और सबको भेजें।';
const LAST_SUB = 'Status par lagayein, sabko bhejein! Subscribe: Shyam Premi SN';
export const DEFAULT_VARIANTS = {
  status: [{ slot: 'eve', offset: -1, at: '20:00' }, { slot: 'status', offset: 0, at: '00:30' }],
  big: [{ slot: 'eve', offset: -1, at: '20:00' }, { slot: 'status', offset: 0, at: '00:30' }, { slot: 'statusday', offset: 0, at: '08:30' }],
};
export const STATUS_SLOTS = ['eve', 'status', 'statusday'];
// How late a variant may still be made (after its publish time): later, it is skipped (the next variant covers it).
const GRACE_MIN = { eve: 150, status: 8 * 60, statusday: 3 * 60 };

const addDays = (date, n) => new Date(Date.parse(`${date}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const istNow = (now = Date.now()) => new Date(now + 5.5 * 3600e3).toISOString();
const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } };
const slugify = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const noEmoji = (t) => String(t).replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').replace(/\s+/g, ' ').trim();
const clone = (o) => JSON.parse(JSON.stringify(o));

// ---------------------------------------------------------------- calendar

/** automation/festivals.json entries, by date. */
export function loadFestivals(root = '.') {
  const j = JSON.parse(read(path.join(root, 'automation/festivals.json')) || '{"festivals":[]}');
  return (j.festivals || []).slice().sort((a, b) => a.date.localeCompare(b.date));
}

export const variantsOf = (f) => f.variants || DEFAULT_VARIANTS[f.tier] || [];

/** Every status upload the calendar asks for: [{ date (public day), slot, at, k, festival, name, picks, tier }]. */
export function placements(festivals) {
  const out = [];
  for (const f of festivals) {
    variantsOf(f).forEach((v, k) => {
      const names = f.names || [{ en: f.label, hi: f.label }];
      out.push({ date: addDays(f.date, v.offset), slot: v.slot, at: v.at, offset: v.offset, k, festival: f, name: names[k % names.length], picks: v.picks, tier: f.tier });
    });
  }
  return out.sort((a, b) => `${a.date}T${a.at}`.localeCompare(`${b.date}T${b.at}`));
}

/** The bold Hindi hook of the first frame (and its spoken and Roman forms). */
export function hookFor(p) {
  const { hi, en } = p.name;
  if (p.slot === 'eve') {
    const [h, r] = p.offset <= -2 ? ['परसों है', 'Parson hai'] : ['कल है', 'Kal hai'];
    return { hi: `${h} ${hi} 🙏`, say: `${h} ${hi}!`, roman: `${r} ${en} 🙏` };
  }
  if (p.slot === 'statusday') return { hi: `${hi} की बधाई 🙏`, say: `${hi} की बधाई!`, roman: `${en} ki badhai 🙏` };
  return { hi: `आज है ${hi} 🙏`, say: `आज है ${hi}!`, roman: `Aaj hai ${en} 🙏` };
}

export const statusTitle = (name, year) => `${name.en} Status ${year} | ${name.hi} स्टेटस वीडियो #Shorts`;
export const dayTitle = (name) => `${name.en} Status | ${name.hi} स्टेटस वीडियो #Shorts`;
export const slugOf = (p) => `${p.date}-${p.slot}-${slugify(p.name.en)}`;
export const titleOf = (p) => statusTitle(p.name, p.festival.date.slice(0, 4));

// ---------------------------------------------------------------- specs

/** The family's base spec: a hand-written story/status/<date>.json (festivals.json `spec`) or one built from the theme. */
export function buildFamily(f, root = '.') {
  if (f.spec && fs.existsSync(path.join(root, f.spec))) return JSON.parse(read(path.join(root, f.spec)));
  const t = THEMES[f.theme];
  if (!t) throw new Error(`festival ${f.date} ${f.key}: unknown theme "${f.theme}" and no spec`);
  return {
    slug: `${f.date}-status-${f.key}`, format: 'status', date: f.date, festival: f.label, theme: f.theme,
    title: 'Shyam Premi SN', kicker: kicker(f.names?.[0]?.en || f.label), playlist: t.playlist, voice: t.voice, signoff: 'Jai Shree Shyam', style: STYLE,
    desc: t.desc, deity: t.deity, hashtags: t.hashtags, tags: t.tags, scenes: clone(t.scenes),
  };
}

const kicker = (t) => {
  if (t.length <= 22) return t;
  let k = '';
  for (const w of t.split(/\s+/)) { if (`${k} ${w}`.trim().length > 22) break; k = `${k} ${w}`.trim(); }
  return k || t.slice(0, 22);
};
const joinTts = (a, b) => (`${a} ${b}`.length <= 110 ? `${a} ${b}` : a.length <= 110 ? a : a.slice(0, 110));
const mantraSource = (scenes, fallback) => {
  const m = scenes.find((s) => s.mantra)?.mantra;
  if (!m) return null;
  return Object.values(MANTRA).find(([t]) => t === m)?.[1] || fallback || 'parampara';
};
const dateText = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** The 3 pictures (base scene indices) of variant k. */
export function picksFor(content, p) {
  if (p.picks) return p.picks;
  const n = content.length;
  if (n >= 6) return DEFAULT_PICKS[6][p.k % 3];
  return [0, 1, 2].map((i) => (i + p.k) % Math.min(n, 3));
}

/** Points a variant scene at the base's picture / Kaggle clip (relative to the work dir), when they exist. */
function reuseAssets(scene, j, base, dir) {
  if (!dir) return scene;
  for (const rel of [`stills/${j}.jpg`, `images/${base.slug}-${j}.jpg`]) {
    if (fs.existsSync(path.join(dir, rel))) { scene.image = rel; break; }
  }
  if (base.scenes[j]?.video && fs.existsSync(path.join(dir, base.scenes[j].video))) scene.video = base.scenes[j].video;
  else delete scene.video;
  return scene;
}

/** Shared by festival variants and day status Shorts: hook on the first frame, the status ask on the last, loop. */
function compose({ base, scenes, hook, slug, date, title, name, desc, hashtags, tags, festival, extra = {} }) {
  const s = scenes.map((x) => { const c = clone(x); delete c.endcard; c.hold = c.hold || 6; return c; });
  const first = s[0], last = s[s.length - 1];
  if (first.big && first.big.length <= 48) first.line = first.big; // the blessing moves under the hook
  first.big = hook.hi;
  first.tts = joinTts(hook.say, first.tts);
  first.sub = `${noEmoji(hook.roman)}! ${first.sub}`;
  last.line = LAST_LINE;
  last.tts = joinTts(last.tts, LAST_SAY);
  last.sub = `${last.sub} ${LAST_SUB}`;
  const mantraSrc = mantraSource(s, base.mantra_source);
  const year = (date || '').slice(0, 4);
  const firstRoman = noEmoji(hook.roman);
  const description = [
    `${firstRoman}! ${desc}. WhatsApp status ke liye sundar video.`,
    `${hook.hi} ${noEmoji(s[0].line || '')}`.trim(),
    ...(mantraSrc ? [`Mantra: ${s.find((x) => x.mantra).mantra} (${mantraSrc})`] : []),
    '',
    'Is status video ko download karke apne WhatsApp / Instagram status par lagayein.',
    '',
    'Shyam Premi SN ki taraf se aapko aur aapke parivaar ko dher saari shubhkamnayein. Jai Shree Shyam 🙏',
    'Achha lage to Like karein, apno ko bhejein aur channel Subscribe karein.',
    hashtags.join(' '),
    ...(festival ? [`Tithi: Drik Panchang aur Prokerala (New Delhi), ${dateText(festival)}.`] : []),
    'Chitra AI dwara banaye gaye hain (sanketik). Awaaz AI se.',
  ].join('\n');
  const allTags = [...new Set([`${name.en} status`, ...(festival ? [`${name.en} status ${year}`] : []), `${name.hi} स्टेटस`, `${name.en} whatsapp status`, ...tags, 'Shyam Premi SN'])].slice(0, 15);
  const caption = (n) => [`${hook.roman}`, s[0].sub.replace(/^[^!]*!\s*/, ''), 'Status par lagayein, apno ko bhejein 🙏', hashtags.slice(0, n).join(' ')].join('\n');
  return {
    slug, format: 'status', loop: true, date, ...(festival ? { festival_date: festival } : {}), festival: base.festival || name.en,
    family: base.slug, title: 'Shyam Premi SN', kicker: kicker(name.en), playlist: base.playlist, voice: base.voice || 'hf_alpha',
    signoff: base.signoff || 'Jai Shree Shyam', style: base.style || STYLE, cta: CTA,
    ...(mantraSrc ? { mantra_source: mantraSrc } : {}), ...extra,
    scenes: s,
    youtube_title: title, youtube_description: description, youtube_tags: allTags.join(', '),
    instagram_caption: caption(6), facebook_caption: caption(4),
  };
}

/** One festival variant (placement p) from the family's base spec; dir = the work dir with the base's pictures/clips. */
export function buildVariant(base, p, { dir } = {}) {
  const content = base.scenes.filter((s) => !s.endcard);
  const picks = picksFor(content, p);
  const scenes = picks.map((j) => reuseAssets(clone(content[j]), j, base, dir));
  const f = p.festival;
  const t = THEMES[f.theme] || {};
  const desc = base.desc || t.desc || String(base.youtube_description || '').split('\n')[0].replace(/\.?\s*WhatsApp status ke liye\.?$/i, '');
  const hashtags = base.hashtags || t.hashtags || (String(base.youtube_description || '').match(/#[A-Za-z0-9]+/g) || []).slice(0, 6);
  const tags = base.tags || t.tags || String(base.youtube_tags || '').split(',').map((x) => x.trim()).filter(Boolean);
  return compose({
    base, scenes, hook: hookFor(p), slug: slugOf(p), date: p.date, title: titleOf(p), name: p.name, desc, hashtags, tags,
    festival: f.date, extra: { publish_at: p.at, variant: p.k + 1, slot: p.slot },
  });
}

const weekNo = (date) => Math.floor(Date.parse(`${date}T00:00:00Z`) / (7 * 864e5));

/** The morning "day status" Short: weekday theme (or `gyaras` on an Ekadashi), names/hooks/first picture rotate weekly. */
export function dayStatus(date, { theme } = {}) {
  const wd = new Date(`${date}T12:00:00Z`).getUTCDay();
  const t = DAY_THEMES[theme ?? wd];
  if (!t) throw new Error(`no day status theme ${theme ?? wd}`);
  const w = weekNo(date);
  const name = t.names[w % t.names.length];
  const lead = name.lead ?? (w % 3);
  const order = [0, 1, 2].map((i) => (i + lead) % 3);
  const hi = t.hooks[w % t.hooks.length];
  const hook = { hi, say: noEmoji(hi).replace(/:/g, ',').replace(/!?$/, '!'), roman: `${name.en} 🙏` };
  const base = { slug: `day-${t.key}`, festival: name.en, playlist: t.playlist, voice: t.voice, signoff: 'Jai Shree Shyam', style: STYLE };
  return compose({
    base, scenes: order.map((i) => t.scenes[i]), hook, slug: `${date}-morning-${t.key}`, date, title: dayTitle(name), name,
    desc: t.desc, hashtags: t.hashtags, tags: t.tags, extra: { deity: t.deity, day_status: t.key },
  });
}

// ---------------------------------------------------------------- what the status job makes now

/**
 * The variants of ONE family (festival) to make in this run. eve variants publish today (evening), status/statusday
 * variants tomorrow; with `family` every not-yet-logged variant of that festival from today on (dry: all of them).
 * planFor(date) = scripts/day-plan.mjs planDay: a variant the 3-a-day cap dropped is not made.
 */
export function due({ today, now = Date.now(), log = '', festivals, planFor, family = '', dry = false }) {
  const tomorrow = addDays(today, 1);
  const skipped = [];
  const ok = [];
  for (const p of placements(festivals)) {
    if (family ? p.festival.date !== family : !((p.slot === 'eve' && p.date === today) || (p.slot !== 'eve' && p.date === tomorrow))) continue;
    const id = `${p.date} ${p.slot} ${p.festival.key}`;
    const planned = planFor(p.date).uploads.some((u) => u.slot === p.slot && u.festival === p.festival.key && u.k === p.k);
    if (!planned) { skipped.push(`${id}: dropped by the 3-a-day cap (scripts/day-plan.mjs)`); continue; }
    if (dry) { ok.push(p); continue; }
    if (new RegExp(`^${p.date} \\| ${p.slot} \\|`, 'm').test(log)) { skipped.push(`${id}: already in log.md`); continue; }
    const at = Date.parse(`${p.date}T${p.at}:00+05:30`);
    if (now > at + GRACE_MIN[p.slot] * 60e3) { skipped.push(`${id}: too late (public time ${p.at} passed)`); continue; }
    ok.push(p);
  }
  if (!ok.length) return { family: null, variants: [], skipped };
  const fam = ok[0].festival;
  const variants = ok.filter((p) => p.festival.key === fam.key);
  return { family: fam.date, key: fam.key, festival: fam, variants, skipped };
}

const brief = (p) => ({ slug: slugOf(p), day: p.date, slot: p.slot, at: p.at, k: p.k, title: titleOf(p), festival: p.festival.key });

// ---------------------------------------------------------------- calendar.md

export function calendarMarkdown(festivals, isPlanned = () => true) {
  const plan = placements(festivals);
  const rows = festivals.map((f) => {
    const ps = plan.filter((p) => p.festival.key === f.key);
    const when = ps.map((p) => `${p.slot} ${p.date.slice(5)} ${p.at}${isPlanned(p) ? '' : ' dropped by the 3-a-day cap'}`).join(', ');
    const status = f.tier === 'info' ? 'no status Short' : `${f.tier === 'big' ? 'BIG, ' : ''}status Shorts: ${when}`;
    const names = (f.names || []).map((n) => n.en).filter((n) => n !== f.label).join('; ');
    return `| ${f.date} | ${f.label}${names ? `; ${names}` : ''} (${status}). Sources: ${f.sources.join('; ')} |`;
  });
  return rows.join('\n');
}

// ---------------------------------------------------------------- CLI

async function main() {
  const args = process.argv.slice(2);
  const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : '');
  const [cmd] = args;
  const out = (o) => { console.log(typeof o === 'string' ? o : JSON.stringify(o)); };
  const festivals = loadFestivals('.');
  const dp = await import('./day-plan.mjs');
  if (cmd === 'due') {
    const today = opt('--today') || dp.istToday();
    const inputs = dp.loadInputs('.');
    const r = due({ today, log: read('automation/log.md'), festivals, planFor: (d) => dp.planDay(d, inputs), family: opt('--family'), dry: args.includes('--dry') });
    const dir = opt('--out') || '.';
    fs.mkdirSync(dir, { recursive: true });
    const res = { today, now_ist: istNow().slice(0, 16), family: r.family, key: r.key || '', variants: r.variants.map(brief), skipped: r.skipped };
    if (r.family) {
      const base = buildFamily(r.festival, '.');
      fs.writeFileSync(path.join(dir, 'family.json'), `${JSON.stringify(base, null, 2)}\n`);
      res.base_slug = base.slug;
    }
    fs.writeFileSync(path.join(dir, 'due.json'), `${JSON.stringify(res, null, 2)}\n`);
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `day=${r.family || ''}\ncount=${r.variants.length}\n`);
    return out(res);
  }
  if (cmd === 'variants') {
    const baseFile = opt('--base');
    const dir = path.dirname(path.resolve(baseFile));
    const base = JSON.parse(read(baseFile));
    const d = JSON.parse(read(opt('--due')));
    const all = placements(festivals);
    for (const v of d.variants) {
      const p = all.find((x) => x.festival.key === v.festival && x.k === v.k);
      const spec = buildVariant(base, p, { dir });
      const file = path.join(dir, `v-${spec.slug}.json`);
      fs.writeFileSync(file, `${JSON.stringify(spec, null, 2)}\n`);
      console.log([file, spec.slug, p.date, p.slot, p.at].join('\t'));
    }
    return;
  }
  if (cmd === 'day') {
    const date = opt('--date') || dp.istToday();
    const plan = dp.planDay(date, dp.loadInputs('.'));
    const m = plan.uploads.find((u) => u.slot === 'morning');
    const spec = dayStatus(date, { theme: m?.theme });
    const file = opt('--out') || 'story/today/scenes.json';
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(spec, null, 2)}\n`);
    if (opt('--log')) fs.appendFileSync(opt('--log'), `${date} | morning | ${spec.slug} | ${spec.deity} | Day status Short "${spec.youtube_title.split(' | ')[0]}" (status engine, 15-25 s loop)\n`);
    return out({ slug: spec.slug, title: spec.youtube_title, file });
  }
  if (cmd === 'plan') {
    const from = opt('--from') || dp.istToday();
    const to = opt('--to') || '2027-01-31';
    const inputs = dp.loadInputs('.');
    for (const p of placements(festivals).filter((x) => x.date >= from && x.date <= to)) {
      const planned = dp.planDay(p.date, inputs).uploads.some((u) => u.slot === p.slot && u.festival === p.festival.key && u.k === p.k);
      console.log(`${p.date} ${p.at} ${p.slot.padEnd(9)} ${planned ? '   ' : 'CAP'} ${titleOf(p)}`);
    }
    return;
  }
  if (cmd === 'calendar') {
    const file = 'automation/calendar.md';
    const text = read(file);
    const start = '<!-- status-engine:begin -->', end = '<!-- status-engine:end -->';
    const inputs = dp.loadInputs('.');
    const ok = (p) => dp.planDay(p.date, inputs).uploads.some((u) => u.slot === p.slot && u.festival === p.festival.key && u.k === p.k);
    const block = `${start}\n${calendarMarkdown(festivals, ok)}\n${end}`;
    const next = text.includes(start) ? text.replace(new RegExp(`${start}[\\s\\S]*?${end}`), block) : `${text.trimEnd()}\n${block}\n`;
    fs.writeFileSync(file, next);
    return out({ file, festivals: festivals.length });
  }
  throw new Error('usage: status-engine.mjs due|variants|day|plan|calendar (see the header)');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((e) => { console.error(`status-engine: ${e.message}`); process.exit(1); });
}
