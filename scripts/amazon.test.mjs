// Amazon.in Associates section (scripts/amazon.mjs, automation/amazon-products.json). Run: node --test scripts/amazon.test.mjs
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DISCLOSURE, FORBIDDEN, SAMAGRI_LINE, TAG, amazonEligible, amazonGroup, amazonOn, amazonProducts, amazonSection, amazonUrl, checkAmazonText, loadProducts, samagriEligible, withAmazon, withSamagri } from './amazon.mjs';
import { metaFromScenes } from './youtube.mjs';
import { captions, fbLongPost, fbShortText } from './meta.mjs';
import { checkFbCaption } from './fb.mjs';
import { aiDisclosure } from './ai-disclosure.mjs';

const ON = {};
const OFF = { AMAZON_LINKS: 'off' };
const map = loadProducts();
const mantra = (id = 'hare-krishna', extra = {}) => ({
  slug: `2026-11-29-long-mantra-${id}`, format: 'long', kind: 'mantra', mantra: id, date: '2026-11-29', deity: 'Shri Krishna / Shri Ram',
  youtube_title: 'हरे कृष्ण हरे राम महामंत्र 108 बार | Krishna Mantra Jaap', bhajan: { mode: 'mantra', id: 'a,b' },
  youtube_description: 'मंत्र जाप।\n\nAise hi mantra jaap ke liye subscribe karein: Shyam Premi SN 🙏\n\n#MantraJaap #KrishnaMantra #BhaktiGeet', ...extra,
});
const urls = (t) => String(t).match(/https:\/\/www\.amazon\.in\/[^\s]+/g) || [];

describe('product map', () => {
  test('every link is an amazon.in search link with tag shyam0414-21, rebuilt from its query', () => {
    assert.equal(map.tag, 'shyam0414-21');
    assert.equal(TAG, 'shyam0414-21');
    for (const [g, v] of Object.entries(map.groups)) {
      assert.ok(v.products.length >= 2 && v.products.length <= 3, `${g}: 2-3 products`);
      for (const p of v.products) {
        assert.equal(p.url, amazonUrl(p.q), `${g}: ${p.label}`);
        const u = new URL(p.url);
        assert.equal(u.hostname, 'www.amazon.in');
        assert.equal(u.pathname, '/s');
        assert.equal(u.searchParams.get('tag'), TAG);
        assert.ok(p.label && !FORBIDDEN.test(`${p.label} ${p.q}`), `${g}: no claims, prices or murti/idol (${p.label})`);
      }
    }
    assert.doesNotMatch(JSON.stringify(map), /epifive|epifive-21/i);
  });
  test('amazonUrl encodes the query and always carries the tag', () => {
    assert.equal(amazonUrl('Tulsi Jaap Mala 108'), 'https://www.amazon.in/s?k=tulsi+jaap+mala+108&tag=shyam0414-21');
    assert.equal(new URL(amazonUrl('a&tag=epifive-21')).searchParams.getAll('tag').join(), TAG);
  });
});

describe('deity matching', () => {
  const g = (spec) => amazonGroup(spec, map);
  test('mantra ids map to their group', () => {
    assert.equal(g({ mantra: 'hare-krishna' }), 'krishna');
    assert.equal(g({ mantra: 'vasudev' }), 'krishna');
    assert.equal(g({ mantra: 'shiv' }), 'shiv');
    assert.equal(g({ mantra: 'ganesh' }), 'ganesh');
    assert.equal(g({ mantra: 'ram' }), 'ram');
  });
  test('festival / deity / temple / title', () => {
    assert.equal(g({ festival: 'Chhath Puja 2026', deity: 'Chhathi Maiya / Surya dev', kind: 'jukebox' }), 'chhath');
    assert.equal(g({ deity: 'Khatu Shyam ji', youtube_title: 'Barbarik ki katha' }), 'khatu-shyam');
    assert.equal(g({ deity: 'Bhagwan Shiv / Mahadev' }), 'shiv');
    assert.equal(g({ temple: 'salasar-balaji', deity: 'Hanuman ji' }), 'hanuman');
    assert.equal(g({ youtube_title: 'Gita Jayanti katha', deity: 'Shri Krishna' }), 'krishna');
    assert.equal(g({ deity: 'Shakambhari Mata' }), 'devi');
    assert.equal(g({ deity: 'Pauranik facts (sankalan)' }), 'general');
  });
  test('2-3 products, the jaap items for a Krishna mantra', () => {
    const { group, products } = amazonProducts(mantra(), map);
    assert.equal(group, 'krishna');
    assert.ok(products.length >= 2 && products.length <= 3);
    assert.match(products.map((p) => p.label).join(' | '), /Tulsi.*jaap mala[\s\S]*Bhagavad Gita \(Gita Press\)/i);
  });
  test('Khatu Shyam: photo frame and bhajan book; Shiv: rudraksha mala; Chhath: soop and daura', () => {
    assert.match(amazonProducts({ deity: 'Khatu Shyam ji' }, map).products.map((p) => p.label).join(), /photo frame.*bhajan pustak/i);
    assert.match(amazonProducts({ mantra: 'shiv' }, map).products[0].label, /Rudraksha/);
    assert.match(amazonProducts({ festival: 'Chhath Puja' }, map).products.map((p) => p.label).join(), /soop.*daura/i);
  });
});

describe('where it applies', () => {
  test('long videos only, switch on by default', () => {
    assert.equal(amazonOn({}), true);
    assert.equal(amazonOn({ AMAZON_LINKS: 'on' }), true);
    for (const v of ['off', 'OFF', '0', 'false', 'no']) assert.equal(amazonOn({ AMAZON_LINKS: v }), false);
    assert.equal(amazonEligible(mantra(), { env: ON }).ok, true);
    assert.equal(amazonEligible(mantra(), { env: OFF }).ok, false);
  });
  test('never on Shorts, status Shorts or owner footage', () => {
    assert.equal(amazonSection({ ...mantra(), format: undefined }, { env: ON }), '');
    assert.equal(amazonSection({ slug: '2026-11-29-morning-x', deity: 'Shri Krishna' }, { env: ON }), '');
    assert.equal(amazonSection({ slug: '2026-11-30-status-gita', format: 'status', theme: 'gita', deity: 'Shri Krishna' }, { env: ON }), '');
    assert.equal(amazonSection({ ...mantra(), share_line: 'स्टेटस पर लगाएं' }, { env: ON }), '');
    assert.equal(amazonSection({ ...mantra(), slug: '2026-11-29-owner-khatu-darshan' }, { env: ON }), '');
  });
  test('never on Rani Sati Dadi or any sati theme', () => {
    for (const extra of [{ deity: 'Rani Sati Dadi' }, { temple: 'rani-sati-dadi' }, { youtube_title: 'रानी सती दादी दर्शन' },
      { youtube_title: 'Dhandhan Dham Sati Dadi' }, { series: 'teda-gela' }, { summary: 'Jhunjhunu mandir' }]) {
      const s = { ...mantra('vasudev'), ...extra };
      assert.equal(amazonEligible(s, { env: ON }).ok, false, JSON.stringify(extra));
      assert.equal(withAmazon(s.youtube_description, s, { env: ON }), s.youtube_description);
    }
  });
});

describe('section', () => {
  test('heading, 2-3 links, then the disclosure line; before the hashtags', () => {
    const s = mantra();
    const d = withAmazon(s.youtube_description, s, { env: ON });
    const lines = d.split('\n');
    assert.equal(lines.at(-1), '#MantraJaap #KrishnaMantra #BhaktiGeet');
    const h = lines.indexOf('🛕 Is jaap ke liye (Amazon):');
    assert.ok(h > 0);
    const n = urls(d).length;
    assert.ok(n >= 2 && n <= 3);
    assert.equal(lines[h + n + 1], DISCLOSURE);
    assert.ok(lines.indexOf(DISCLOSURE) < lines.length - 1);
    assert.deepEqual(checkAmazonText(d), []);
    assert.equal(withAmazon(d, s, { env: ON }), d, 'idempotent');
  });
  test('the disclosure is always there with links, and the tag is always shyam0414-21', () => {
    const specs = [mantra(), mantra('shiv'), mantra('ganesh'), mantra('ram'), mantra('vasudev'),
      { slug: '2026-11-14-long-chhath-geet-nonstop', format: 'long', kind: 'jukebox', festival: 'Chhath Puja 2026', youtube_description: 'x\n\n#ChhathPuja' },
      { slug: '2026-12-01-long-barbarik', format: 'long', deity: 'Khatu Shyam ji', youtube_description: 'katha' },
      { slug: '2026-12-02-long-facts', format: 'long', kind: 'compilation', deity: 'Pauranik facts (sankalan)', youtube_description: 'facts' }];
    for (const s of specs) {
      const d = withAmazon(s.youtube_description, s, { env: ON });
      assert.ok(urls(d).length >= 2, s.slug);
      assert.ok(d.includes(DISCLOSURE), s.slug);
      for (const u of urls(d)) assert.equal(new URL(u).searchParams.get('tag'), 'shyam0414-21');
      assert.doesNotMatch(d, /epifive/i);
      assert.deepEqual(checkAmazonText(d), []);
    }
  });
  test('headings per kind', () => {
    assert.match(amazonSection(mantra(), { env: ON }), /^🛕 Is jaap ke liye \(Amazon\):/);
    assert.match(amazonSection({ format: 'long', kind: 'jukebox', festival: 'Chhath' }, { env: ON }), /^🛕 Puja aur bhajan ke liye/);
    assert.match(amazonSection({ format: 'long', deity: 'Khatu Shyam ji' }, { env: ON }), /^🛕 Puja ke liye \(Amazon\):/);
  });
  test('no hashtags: at the end; too long: left out', () => {
    const s = mantra('vasudev', { youtube_description: 'line one\nline two' });
    assert.match(withAmazon(s.youtube_description, s, { env: ON }), new RegExp(`line two\\n\\n🛕[\\s\\S]*${DISCLOSURE.replace(/\./g, '\\.')}$`));
    const long = 'x'.repeat(4900);
    assert.equal(withAmazon(long, s, { env: ON }), long);
  });
  test('checkAmazonText catches a wrong tag, a product page and a missing disclosure', () => {
    assert.deepEqual(checkAmazonText('no links'), []);
    assert.match(checkAmazonText(`a https://www.amazon.in/s?k=x&tag=epifive-21\n${DISCLOSURE}`).join(), /tag must be/);
    assert.match(checkAmazonText(`a https://www.amazon.in/dp/B000?tag=${TAG}\n${DISCLOSURE}`).join(), /search link/);
    assert.match(checkAmazonText(`a ${amazonUrl('x')}`).join(), /missing/);
  });
});

describe('uploads', () => {
  const write = (spec, chapters) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'amazon-'));
    const f = path.join(dir, 's.json'), m = path.join(dir, 'm.json');
    fs.writeFileSync(f, JSON.stringify(spec));
    fs.writeFileSync(m, JSON.stringify({ chapters }));
    return { f, m, dir };
  };
  const chapters = [{ title: 'Parichay', start: 0 }, { title: 'Mala 1', start: 50 }, { title: 'Mala 2', start: 900 }, { title: 'Shanti path', start: 1800 }];
  test('YouTube long upload carries it (before the chapters), a Short never', () => {
    const prev = process.env.AMAZON_LINKS;
    delete process.env.AMAZON_LINKS;
    try {
      const { f, m, dir } = write(mantra(), chapters);
      const d = metaFromScenes(f, m).description;
      assert.ok(d.includes(DISCLOSURE) && urls(d).length >= 2);
      assert.ok(d.indexOf(DISCLOSURE) < d.indexOf('Adhyay (Chapters):'));
      assert.ok(d.length <= 5000);
      assert.equal(urls(metaFromScenes(f).description).length, 0, 'no --meta = not a long upload');
      fs.writeFileSync(f, JSON.stringify({ ...mantra(), format: 'short', slug: '2026-11-29-morning-x' }));
      assert.equal(urls(metaFromScenes(f, m).description).length, 0);
      process.env.AMAZON_LINKS = 'off';
      fs.writeFileSync(f, JSON.stringify(mantra()));
      assert.equal(urls(metaFromScenes(f, m).description).length, 0, 'AMAZON_LINKS=off');
      fs.rmSync(dir, { recursive: true, force: true });
    } finally {
      if (prev === undefined) delete process.env.AMAZON_LINKS; else process.env.AMAZON_LINKS = prev;
    }
  });
  test('Facebook Page video copy carries the same section before its 3 hashtags; off with the switch', () => {
    const p = fbLongPost(mantra(), { chapters }, { env: ON });
    const lines = p.description.split('\n');
    assert.match(lines.at(-1), /^#\S+ #\S+ #\S+$/);
    assert.ok(p.description.includes(DISCLOSURE) && urls(p.description).length >= 2);
    assert.ok(lines.indexOf(DISCLOSURE) < lines.length - 1);
    assert.equal(urls(fbLongPost(mantra(), { chapters }, { env: OFF }).description).length, 0);
    assert.equal(urls(fbLongPost({ ...mantra(), deity: 'Rani Sati Dadi' }, { chapters }, { env: ON }).description).length, 0);
  });
  test('the AI disclosure is unchanged by the section', () => {
    const s = mantra();
    const withLinks = { ...s, youtube_description: withAmazon(s.youtube_description, s, { env: ON }) };
    assert.deepEqual(aiDisclosure(withLinks), aiDisclosure(s));
  });
});

describe('Shorts: the samagri line (text only, no URL)', () => {
  const darshan = (extra = {}) => ({
    slug: '2026-11-24-morning-salasar-balaji', temple: 'salasar-balaji', deity: 'Hanuman ji',
    youtube_title: 'Salasar Balaji ke Darshan | सालासर बालाजी दर्शन #Shorts',
    youtube_description: 'Salasar Balaji ke aaj ke darshan.\nसालासर बालाजी के दर्शन, जय बजरंगबली।\nJai Shree Shyam 🙏\nDarshan achhe lage hon to Like, Share aur Subscribe karein.\n#SalasarBalaji #JaiHanuman #Shorts',
    instagram_caption: 'Salasar Balaji ke darshan 🙏\n#SalasarBalaji #JaiHanuman',
    facebook_caption: 'जय बजरंगबली 🙏 आज सालासर बालाजी के दर्शन किए क्या?\nसालासर बालाजी के आज के दर्शन।\n\n#SalasarBalaji #JaiHanuman #HanumanJi', ...extra,
  });
  const katha = (extra = {}) => ({ ...darshan(), slug: '2026-11-24-evening-barbarik-katha', format: 'katha', temple: undefined, deity: 'Khatu Shyam ji',
    youtube_title: 'Barbarik ki Katha | बर्बरीक की कथा #Shorts', youtube_description: 'Barbarik ki katha.\nबर्बरीक की कथा।\nJai Shree Shyam 🙏\n#KhatuShyam #Barbarik #Shorts',
    facebook_caption: 'हारे का सहारा, बाबा श्याम हमारा 🙏 बर्बरीक की कथा आपने सुनी है क्या?\nबर्बरीक ने अपना शीश दान किया।\n\n#KhatuShyam #JaiShreeShyam #Barbarik', ...extra });
  const write = (spec) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'samagri-'));
    const f = path.join(dir, 's.json');
    fs.writeFileSync(f, JSON.stringify(spec));
    return { f, dir };
  };
  const ytShort = (spec, env = {}) => {
    const prev = process.env.AMAZON_LINKS;
    if (env.AMAZON_LINKS === undefined) delete process.env.AMAZON_LINKS; else process.env.AMAZON_LINKS = env.AMAZON_LINKS;
    const { f, dir } = write(spec);
    try { return metaFromScenes(f).description; } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      if (prev === undefined) delete process.env.AMAZON_LINKS; else process.env.AMAZON_LINKS = prev;
    }
  };
  const count = (t) => String(t).split(SAMAGRI_LINE).length - 1;
  const esc = (t) => t.replace(/[.?*+^$()[\]{}|\\]/g, '\\$&');

  test('the line has no URL and names the samagri links on the channel', () => {
    assert.doesNotMatch(SAMAGRI_LINE, /https?:|www\.|amazon/i);
    assert.match(SAMAGRI_LINE, /puja samagri ke links channel par/);
  });
  test('a normal darshan / katha Short: once, just before the hashtags, on YouTube and Facebook', () => {
    for (const s of [darshan(), katha(), darshan({ format: 'loop', kind: 'loop' }), katha({ format: 'facts' })]) {
      assert.equal(samagriEligible(s, { env: ON }).ok, true, s.slug);
      const yt = ytShort(s).split('\n');
      assert.equal(count(yt.join('\n')), 1, s.slug);
      assert.match(yt.at(-1), /^#/);
      assert.equal(yt.at(-3), SAMAGRI_LINE);
      assert.equal(yt.at(-2), '');
      assert.equal(urls(yt.join('\n')).length, 0, 'no Amazon URL in a Short');
      const fb = fbShortText(s, { env: ON }).text;
      assert.equal(count(fb), 1, s.slug);
      assert.match(fb, new RegExp(`${esc(SAMAGRI_LINE)}\\n\\n#\\S+ #\\S+ #\\S+$`));
      assert.ok(fb.length <= 1500);
      assert.equal(urls(fb).length, 0);
      assert.deepEqual(checkFbCaption(fb, { subject: s }), [], 'the final Facebook text still passes the template');
    }
  });
  test('never duplicated (idempotent, also on a text that already carries it)', () => {
    const s = darshan();
    const once = withSamagri(s.youtube_description, s, { env: ON });
    assert.equal(count(once), 1);
    assert.equal(withSamagri(once, s, { env: ON }), once);
    assert.equal(count(ytShort({ ...s, youtube_description: once })), 1);
    const fb = fbShortText(s, { env: ON }).text;
    assert.equal(withSamagri(fb, s, { env: ON }), fb);
    assert.equal(count(fbShortText({ ...s, facebook_caption: fb }, { env: ON }).text), 1);
  });
  test('absent on status Shorts, owner footage, Rani Sati / sati themes and long videos', () => {
    const no = [
      { ...darshan(), slug: '2026-11-30-status-gita', format: 'status', share_line: 'स्टेटस पर लगाएं 🙏' },
      { ...darshan(), format: 'status', day_status: 'ekadashi' },
      { ...darshan(), format: 'status', bhajan_short: true, slug: '2026-11-24-dawn-bhajan' },
      { ...darshan(), slug: '2026-11-24-owner-pandal-darshan', format: 'owner-footage', real_footage: true },
      { ...darshan(), real_footage: true },
      { ...darshan(), deity: 'Rani Sati Dadi', temple: 'rani-sati-dadi' },
      { ...darshan(), youtube_title: 'रानी सती दादी दर्शन #Shorts' },
      { ...darshan(), summary: 'Jhunjhunu mandir' },
      { ...darshan(), series: 'teda-gela' },
      mantra(),
    ];
    for (const s of no) {
      assert.equal(samagriEligible(s, { env: ON }).ok, false, s.slug);
      assert.equal(withSamagri(s.youtube_description, s, { env: ON }), s.youtube_description, s.slug);
      assert.equal(count(fbShortText(s, { env: ON }).text), 0, s.slug);
      if (s.format !== 'long') assert.equal(count(ytShort(s)), 0, s.slug);
    }
  });
  test('absent when AMAZON_LINKS is off', () => {
    for (const v of ['off', '0', 'false', 'no']) {
      assert.equal(count(ytShort(darshan(), { AMAZON_LINKS: v })), 0, v);
      assert.equal(count(fbShortText(darshan(), { env: { AMAZON_LINKS: v } }).text), 0, v);
    }
    assert.equal(count(ytShort(darshan(), { AMAZON_LINKS: 'on' })), 1);
  });
  test('never on Instagram; long videos keep their section without the line', () => {
    const s = darshan();
    assert.equal(count(captions(s).instagram), 0);
    assert.equal(count(captions({ ...s, instagram_caption: undefined }).instagram), 0);
    assert.equal(count(fbLongPost(mantra(), {}, { env: ON }).description), 0);
  });
  test('platform limits: left out when it would not fit', () => {
    const s = darshan();
    const full = 'x'.repeat(4990);
    assert.equal(withSamagri(full, s, { env: ON }), full);
    const fb = 'y'.repeat(1490);
    assert.equal(withSamagri(fb, s, { env: ON, max: 1500 }), fb);
    assert.ok(ytShort({ ...s, youtube_description: 'z'.repeat(4990) }).length <= 5000);
  });
  test('the AI disclosure is unchanged (YouTube flag, Meta label, Facebook AI line)', () => {
    for (const s of [darshan(), katha({ bhajan: { id: 'x', mode: 'bhajan' } })]) {
      const withLine = { ...s, youtube_description: withSamagri(s.youtube_description, s, { env: ON }) };
      assert.deepEqual(aiDisclosure(withLine), aiDisclosure(s));
      const { f, dir } = write(s);
      const m = metaFromScenes(f);
      fs.rmSync(dir, { recursive: true, force: true });
      assert.equal(m.synthetic, aiDisclosure(s).youtube);
      const before = fbShortText(s, { env: OFF }).text, after = fbShortText(s, { env: ON }).text;
      assert.equal(after.replace(`${SAMAGRI_LINE}\n\n`, ''), before);
    }
  });
});

describe('card site', () => {
  test('the puja samagri section has the #puja-samagri anchor', () => {
    const html = fs.readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');
    assert.match(html, /<h2 id="puja-samagri">पूजा सामग्री<\/h2>/);
    assert.equal(html.split('id="puja-samagri"').length - 1, 1);
  });

  test('site/index.html: every Amazon link is a search link with tag shyam0414-21, sponsored, and the disclosure is shown', () => {
    const html = fs.readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');
    const links = [...html.matchAll(/<a href="(https:\/\/www\.amazon\.in[^"]+)"([^>]*)>/g)];
    assert.ok(links.length >= 3);
    for (const [, href, attrs] of links) {
      const u = new URL(href.replace(/&amp;/g, '&'));
      assert.equal(u.pathname, '/s');
      assert.equal(u.searchParams.get('tag'), TAG);
      assert.match(attrs, /rel="sponsored/);
    }
    assert.ok(html.split(DISCLOSURE).length - 1 >= 2, 'disclosure under the list and in the footer');
    assert.doesNotMatch(html, /epifive/i);
  });
});
