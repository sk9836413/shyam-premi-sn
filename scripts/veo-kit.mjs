// Daily "Veo kit" for 1-2 hand-made hero Shorts. YouTube's own AI video tool (Veo in the YouTube app's Shorts
// camera, the sparkle icon, and the YouTube Create app: text-to-video and "Ingredients to video" from up to 3 images)
// has no API, so every morning a person gets a ready kit and makes the Shorts on a phone in about 5 minutes.
//
// For 2 hero ideas (festival first from automation/calendar.md, then today's trends file, then Khatu Shyam ji and the
// weekday deity; never a subject one of today's automated slots in automation/log.md already covers):
//   - 3 "ingredient" images, 9:16: our own FLUX images (media Worker /ai/flux) or licence-safe real temple photos from
//     footage/<temple>/ with their credit, hosted on the media Worker (/m/, 7 days) so they download on a phone;
//   - the English Veo prompt (subject, setting, camera, light, mood, audio, 8 s, no on-screen text) + 2 alternatives;
//   - YouTube title (max 60 characters), description, 10 hashtags, Instagram and Facebook captions (STORY.md rules);
//   - simple Hinglish steps for the YouTube app.
// Delivered as a phone-friendly page on the media Worker (/kit/<date>.html, copy buttons and image downloads), an email
// to epifive2@gmail.com (Resend, when RESEND_API_KEY is set), a CRM checklist task (crm.epifive.com
// /api/ingest/task, when INGEST_TOKEN is set) and the GitHub run summary. Fail-soft: always exits 0.
//
//   node scripts/veo-kit.mjs [--date YYYY-MM-DD] [--force] [--dry] [--no-send]
//   --dry      choose the ideas and write the page locally only (no FLUX, no upload, no email/CRM)
//   --force    rebuild even if /kit/<date>.json already exists on the Worker
//   --no-send  build and host the kit but send no email and no CRM task
//   --reuse    reuse images already in story/veo-kit/<date>/ (no new FLUX images; for page fixes)
// Env: MEDIA_URL, MEDIA_TOKEN (else ~/.shyampremisk/media-token.txt), RESEND_API_KEY, INGEST_TOKEN, CRM_URL,
//      KIT_TO, FFMPEG_PATH, KIT_FLUX_STEPS (default 6), GITHUB_STEP_SUMMARY.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { fallbackImage } from '../animate/frames.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };

const istToday = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
const DATE = opt('date') || istToday();
const DRY = flag('dry');
const MEDIA_URL = (process.env.MEDIA_URL || 'https://shyam-premi-media.sk9836413.workers.dev').replace(/\/$/, '');
const homeFile = (...p) => { try { return fs.readFileSync(path.join(os.homedir(), ...p), 'utf8'); } catch { return ''; } };
const MEDIA_TOKEN = process.env.MEDIA_TOKEN || homeFile('.shyampremisk', 'media-token.txt').trim();
const CRM_URL = (process.env.CRM_URL || 'https://crm.epifive.com').replace(/\/$/, '');
const INGEST_TOKEN = process.env.INGEST_TOKEN || (process.env.CI ? '' : (homeFile('.epifive', 'crm-ingest.env').match(/^INGEST_TOKEN=(.+)$/m)?.[1] || '').trim());
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const TO = process.env.KIT_TO || 'epifive2@gmail.com';
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const STEPS = Number(process.env.KIT_FLUX_STEPS || 6);
const OUT = path.join(ROOT, 'story', 'veo-kit', DATE);
const PAGE_URL = `${MEDIA_URL}/kit/${DATE}.html`;
const CRM_TASK = 'Aaj ke 2 Veo hero Shorts banao';

// ---------- dates ----------
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Ravivar', 'Somvar', 'Mangalvar', 'Budhvar', 'Guruvar', 'Shukravar', 'Shanivar'];
const addDays = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86400e3).toISOString().slice(0, 10);
const dayDiff = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400e3);
const weekday = (d) => new Date(`${d}T00:00:00Z`).getUTCDay();
const nice = (d) => `${Number(d.slice(8))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`;
const niceYear = (d) => `${nice(d)} ${d.slice(0, 4)}`;
const whenWord = (n, d) => (n === 0 ? 'Aaj' : n === 1 ? 'Kal' : `${nice(d)} ko`);

// ---------- inputs ----------
const read = (p) => { try { return fs.readFileSync(path.join(ROOT, p), 'utf8'); } catch { return ''; } };
const calendar = read('automation/calendar.md').split('\n')
  .map((l) => l.match(/^\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*(.+?)\s*\|\s*$/)).filter(Boolean)
  .map((m) => ({ date: m[1], text: m[2].replace(/\*\*/g, '') }));
// Today's automated slots (the story job may already have added the morning line): what NOT to repeat.
const todayLog = read('automation/log.md').split('\n').filter((l) => l.startsWith(`${DATE} |`))
  .map((l) => l.split('|').slice(2).join(' ').replace(/agla:.*$/i, ''));
let statusText = '';
try { const s = JSON.parse(read(`story/status/${DATE}.json`)); statusText = `${s.slug} ${s.festival || ''} ${s.youtube_title || ''}`; } catch {}
const busy = [...todayLog, statusText].join(' \n ');

function trendItems() {
  let file = `automation/trends/${DATE}.md`;
  if (!read(file)) {
    const dir = path.join(ROOT, 'automation/trends');
    const all = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.md') && f <= `${DATE}.md`).sort() : [];
    file = all.length ? `automation/trends/${all.at(-1)}` : '';
  }
  return read(file).split('\n')
    .map((l) => l.match(/^\d+\.\s+\*\*(.+?)\*\*\s+\((.+?)\):\s+`([^`]+)`(?:\s*\|\s*`([^`]+)`)?/)).filter(Boolean)
    .map((m, i) => ({ rank: i + 1, format: m[1], when: m[2], roman: m[3], dev: m[4] || '' }));
}

let temples = {};
try { temples = JSON.parse(read('footage/temples.json')); delete temples._about; } catch {}
function templePhotos(slug) {
  const dir = path.join(ROOT, 'footage', slug);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => /\.(jpe?g|png)$/i.test(f) && fs.existsSync(path.join(dir, f.replace(/\.\w+$/, '.licence.json'))))
    .map((f) => ({ file: path.join(dir, f), licence: JSON.parse(fs.readFileSync(path.join(dir, f.replace(/\.\w+$/, '.licence.json')), 'utf8')) }))
    .filter((p) => /^(CC0|PD|public domain|CC BY(?!-SA))/i.test(p.licence.licence || '')); // never share-alike or NC
}
function templeFor(phrase) {
  const p = ` ${phrase.toLowerCase()} `;
  for (const [slug, t] of Object.entries(temples)) {
    const names = [slug.replace(/-/g, ' '), ...(t.aliases || []).map((a) => a.replace(/-/g, ' ')), t.name.split(',')[0].toLowerCase()];
    if (names.some((n) => n.length > 4 && p.includes(` ${n.replace(/ (mandir|temple|dham|ji)$/, '')} `.replace(/\s+/g, ' ')))) return slug;
  }
  return null;
}

// ---------- the idea library (iconography is the traditional, commonly depicted form) ----------
const STYLE = 'Respectful traditional Hindu devotional art, highly detailed 3D render with a soft painterly finish, warm cinematic lighting, tall vertical composition with the main subject centred, no text, no letters, no words, no watermark, no logo';
// Owner, 6 Nov 2026: Baba Shyam is worshipped as the SHEESH (head) only: no body, no flute, no arms.
const KHATU = 'Shri Khatu Shyam ji in his shringar darshan form exactly as worshipped at Khatu Dham, Rajasthan: ONLY the sacred head (sheesh), no body, no neck, no shoulders, no arms, no hands, no flute; a large divine face with big wide expressive eyes and a curled moustache, a tilak on the forehead, a tall ornate golden mukut with peacock feathers and golden sun-ray motifs, the head set inside an oval frame of layered flower garlands in white, pink, blue and orange marigold with gold jewellery, a richly decorated temple sanctum behind';
const VISHNU = 'Bhagwan Vishnu with a blue complexion and exactly four arms: the upper right hand holds the spinning Sudarshan chakra, the upper left a white shankh (conch), the lower right a golden gada (mace), the lower left a pink lotus; a yellow silk pitambar, a tall golden kirit mukut, a vertical Vaishnav tilak and a Vaijayanti garland';
const LAKSHMI = 'Maa Lakshmi in a red and gold silk saree with gold jewellery, seated on a large pink lotus, holding lotus flowers, one hand raised in blessing and gold coins flowing gently from the other';
const GANESH = 'Ganesh ji with an elephant head, one broken tusk, a round belly and four arms holding a modak, an axe and a noose, one hand raised in blessing, wearing red and yellow silk and a golden crown, his small mouse (mushak) at his feet';
// Multi-armed forms come out with extra or missing arms in FLUX (5 Nov test: a six-armed Vishnu), so their ingredient
// picture is a chest-up darshan portrait with the hands out of frame; the Veo prompt still describes the full form.
const PORTRAIT = (who) => `Close-up chest-up darshan portrait of ${who}, a calm gentle smile, a glowing golden halo behind the head, hands out of frame`;
const VISHNU_FACE = 'Bhagwan Vishnu with a blue complexion, a tall golden kirit mukut with jewels, a red and white Vaishnav tilak, golden earrings, a yellow silk pitambar on the shoulders and a Vaijayanti flower garland';
const KRISHNA = 'Shri Krishna with a blue complexion, a peacock feather in his golden crown, a yellow silk pitambar and a Vaijayanti garland';
const HARE_KRISHNA = { dev: 'हरे कृष्ण हरे कृष्ण, कृष्ण कृष्ण हरे हरे। हरे राम हरे राम, राम राम हरे हरे॥', roman: 'Hare Krishna Hare Krishna, Krishna Krishna Hare Hare, Hare Rama Hare Rama, Rama Rama Hare Hare' };
const VISHNU_MANTRA = { dev: 'ॐ नमो भगवते वासुदेवाय', roman: 'Om Namo Bhagavate Vasudevaya' };
const LAKSHMI_MANTRA = { dev: 'ॐ श्री महालक्ष्म्यै नमः', roman: 'Om Shri Mahalakshmyai Namah' };
const SHYAM_MANTRA = { dev: 'ॐ श्री श्याम देवाय नमः', roman: 'Om Shri Shyam Devaya Namah' };
const DEITY_REFS = ['the deity\'s exact appearance and iconography', 'the setting', 'the offering in the foreground'];
const TWO_DEITY_REFS = (a, b) => [`${a}'s exact appearance and iconography`, `${b}'s exact appearance and iconography, beside ${a}`, 'the setting'];
const PEOPLE_REFS = ['the people and their clothes', 'the setting', 'the puja items in the foreground'];
const TEMPLE_AUDIO = 'soft temple bells, a distant conch, the gentle crackle of diya flames and a calm temple ambience';

const FEST_DEV = {
  'rama ekadashi': 'रमा एकादशी', 'dev uthani ekadashi': 'देवउठनी एकादशी', 'prabodhini ekadashi': 'प्रबोधिनी एकादशी', 'dhanteras': 'धनतेरस',
  'choti diwali': 'छोटी दिवाली', 'diwali': 'दिवाली', 'govardhan puja': 'गोवर्धन पूजा', 'bhai dooj': 'भाई दूज', 'chhath puja': 'छठ पूजा', 'tulsi vivah': 'तुलसी विवाह',
};
const festName = (text) => text.split(/[(;:]/)[0].trim();

// Each entry: match (calendar row, trend phrase, log line), group (variety), fest (calendar-driven), and make(ctx) ->
// { titles[], hook, lines[2], dev, mantra?, tags[6], refs, images[3] (FLUX prompts), veo{} }.
const ENTRIES = [
  {
    id: 'khatu-janmotsav', group: 'khatu', match: /janmotsav/i,
    when: (c) => c.janmotsav && c.janmotsavDays >= 0 && c.janmotsavDays <= 30,
    make: (c) => {
      const n = c.janmotsavDays;
      return {
        topic: n ? `Khatu Shyam Janmotsav countdown (${n} din baaki)` : 'Khatu Shyam Baba Janmotsav',
        titles: n ? [`Khatu Shyam Janmotsav ${n} din baaki | खाटू श्याम जन्मोत्सव`, `Khatu Shyam Janmotsav | खाटू श्याम जन्मोत्सव ${n} दिन`, 'Khatu Shyam Janmotsav | खाटू श्याम जन्मोत्सव']
          : ['Khatu Shyam Janmotsav | खाटू श्याम जन्मोत्सव', 'Khatu Shyam Janmotsav'],
        hook: n > 1 ? `Baba Shyam ke Janmotsav mein bas ${n} din! 🙏` : n === 1 ? 'Kal hai Baba Shyam ka Janmotsav! 🙏' : 'Aaj hai Baba Shyam ka Janmotsav! 🙏',
        lines: [`Kartik Shukla Ekadashi (Dev Uthani Ekadashi) par Khatu Shyam Baba ka Janmotsav manaya jata hai: is saal ${niceYear(c.janmotsav)} ko.`,
          'Shringar, nishan aur kirtan ke saath bhakt Baba ka swagat karte hain. Haare ka Sahara, Baba Shyam hamara.'],
        dev: 'खाटू श्याम बाबा का जन्मोत्सव, देवउठनी एकादशी।', mantra: SHYAM_MANTRA,
        tags: ['KhatuShyamJanmotsav', 'KhatuShyam', 'ShyamBaba', 'KhatuShyamJi', 'HaareKaSahara', 'DevUthaniEkadashi'],
        refs: DEITY_REFS,
        images: [`${KHATU}, front-facing darshan, an ornate silver and gold arch behind, soft diya glow`,
          'an ornate white marble temple sanctum decorated for a festival, with a carved silver arch, marigold strings, saffron flags, warm fairy lights and rows of clay diyas, no people',
          'a saffron nishan flag with a bundle of peacock feathers, red rose garlands and a lit brass diya on a decorated brass puja thali, close-up, soft bokeh of lights behind'],
        veo: { shot: 'Slow, steady push-in from the decorated temple doorway toward the darshan', shot2: 'A gentle upward crane from the glowing diyas and the saffron nishan to the darshan face',
          subject: KHATU, motion: 'diya flames flicker, red rose petals drift down slowly, saffron flags ripple in a soft breeze, incense smoke curls',
          setting: 'a festive white marble temple sanctum decorated for the Janmotsav with marigold strings, saffron flags and warm lights', light: 'warm golden diya light with a soft rim light and a gentle glow behind the mukut',
          mood: 'joyful, reverent and festive', audio: `${TEMPLE_AUDIO}, a soft festive dhol far away` },
      };
    },
  },
  {
    id: 'khatu-darshan', group: 'khatu', match: /khatu|shyam baba|barbarik|sheesh/i,
    make: () => ({
      topic: 'Khatu Shyam Baba darshan',
      titles: ['Khatu Shyam Baba Darshan | खाटू श्याम बाबा दर्शन', 'Khatu Shyam Darshan | खाटू श्याम दर्शन'],
      hook: 'Haare ka Sahara, Baba Shyam hamara 🙏',
      lines: ['Aaj ke darshan: Khatu Shyam Baba (Barbarik), Khatu Dham, Sikar, Rajasthan.',
        'Mahabharat ki lok katha ke anusar Barbarik ne Shri Krishna ko sheesh daan diya aur Shyam naam ka vardaan paaya.'],
      dev: 'खाटू श्याम बाबा के दर्शन, खाटू धाम (सीकर)।', mantra: SHYAM_MANTRA,
      tags: ['KhatuShyam', 'KhatuShyamJi', 'ShyamBaba', 'HaareKaSahara', 'KhatuDham', 'Rajasthan'],
      refs: DEITY_REFS,
      images: [`${KHATU}, front-facing darshan, an ornate silver and gold arch behind, soft diya glow`,
        'an ornate temple sanctum with carved silver doors and arches, hanging marigold strings, brass bells, incense smoke and warm diya glow, no people',
        'a bundle of peacock feathers (morchhadi) with red rose garlands, a lit brass diya and incense on a decorated brass puja thali, close-up, soft bokeh'],
      veo: { shot: 'Slow, steady push-in from the sanctum doorway toward the darshan', shot2: 'A gentle upward crane from the glowing diyas to the darshan face',
        subject: KHATU, motion: 'diya flames flicker, red rose petals drift down slowly, incense smoke curls, the peacock feathers sway slightly',
        setting: 'an ornate temple sanctum with carved silver arches, hanging marigold strings and brass bells', light: 'warm golden diya light with a soft rim light and a gentle glow behind the mukut',
        mood: 'peaceful, reverent and devotional', audio: TEMPLE_AUDIO },
    }),
  },
  {
    id: 'ekadashi', group: 'vishnu', fest: true, match: /(?<!dev uthani |prabodhini )ekadashi/i, notMatch: /dev uthani|prabodhini/i,
    make: (c) => {
      const f = c.festName || 'Ekadashi'; const fd = FEST_DEV[f.toLowerCase()] || 'एकादशी';
      return {
        topic: `${f}: Shri Vishnu aur Maa Lakshmi darshan`,
        titles: [`${f} Vishnu Lakshmi Darshan | ${fd}`, `${f} | ${fd}`, f],
        hook: `${f} ki shubhkamnayein 🙏`,
        lines: [`${whenWord(c.dayOffset, c.festDate)} ${f} hai: Bhagwan Vishnu aur Maa Lakshmi ki pooja ka din.`,
          /rama/i.test(f) ? 'Kartik Krishna Ekadashi ko Rama Ekadashi kehte hain: Rama Maa Lakshmi ka hi ek naam hai, aur yeh Diwali se pehle aati hai.'
            : 'Ekadashi par vrat, Vishnu naam ka jaap aur Tulsi ki pooja ki parampara hai.'],
        dev: `${fd} पर श्री हरि विष्णु और माँ लक्ष्मी के दर्शन।`, mantra: VISHNU_MANTRA,
        tags: [f.replace(/\s+/g, ''), 'Ekadashi', 'Vishnu', 'MaaLakshmi', 'ShriHari', 'Kartik'],
        refs: TWO_DEITY_REFS('Bhagwan Vishnu', 'Maa Lakshmi'),
        images: [PORTRAIT(VISHNU_FACE), `${LAKSHMI}, front-facing darshan, soft divine halo`,
          'the Kshir Sagar, a calm divine ocean of milk at dawn with the coils and raised hoods of the multi-hooded serpent Sheshnag forming a seat, pink lotus flowers and soft golden mist, no people'],
        veo: { shot: 'Slow, steady push-in across the ocean of milk toward the divine couple', shot2: 'A slow arc around the lotus flowers revealing the darshan',
          subject: `${VISHNU}, with ${LAKSHMI.replace(', seated on a large pink lotus', '')} beside him, both seated on the coils of Sheshnag`, motion: 'lotus flowers bob gently on the milky waves, golden mist drifts, a soft divine glow pulses, Sheshnag\'s hoods sway very slightly',
          setting: 'the Kshir Sagar, a divine ocean of milk at dawn with pink lotus flowers', light: 'soft golden dawn light with a divine glow behind both crowns',
          mood: 'serene, divine and auspicious', audio: 'gentle waves, soft temple bells, a distant conch and a calm ambience' },
      };
    },
  },
  {
    id: 'dev-uthani', group: 'vishnu', fest: true, match: /dev uthani|devuthani|prabodhini/i,
    make: (c) => ({
      topic: 'Dev Uthani Ekadashi: Shri Hari ka jaagran',
      titles: ['Dev Uthani Ekadashi | देवउठनी एकादशी', 'Dev Uthani Ekadashi'],
      hook: 'Dev Uthani Ekadashi: Shri Hari ka jaagran 🙏',
      lines: ['Manyata hai ki chaturmas ke baad is Ekadashi par Bhagwan Vishnu yog nidra se jaagte hain.',
        `${whenWord(c.dayOffset, c.festDate)} se shubh kaam phir shuru hote hain, aur kai jagah Tulsi Vivah bhi hota hai.`],
      dev: 'देवउठनी एकादशी, श्री हरि विष्णु का जागरण।', mantra: VISHNU_MANTRA,
      tags: ['DevUthaniEkadashi', 'PrabodhiniEkadashi', 'Vishnu', 'ShriHari', 'Tulsi', 'Kartik'],
      refs: DEITY_REFS,
      images: [`${PORTRAIT(VISHNU_FACE)}, eyes gently opening as if waking from yoga nidra`,
        'the Kshir Sagar, a calm divine ocean of milk at dawn with pink lotus flowers and soft golden mist, no people',
        'a tulsi plant in a decorated clay pot with sugarcane stalks, marigold garlands and lit diyas around it, close-up'],
      veo: { shot: 'Slow push-in toward Shri Vishnu reclining on Sheshnag', shot2: 'A slow crane down from the dawn sky to the ocean of milk and the divine form',
        subject: `${VISHNU}, reclining on Sheshnag, with Maa Lakshmi at his feet`, motion: 'his eyes open slowly and peacefully, golden light grows, lotus flowers bob on the milky waves, mist drifts',
        setting: 'the Kshir Sagar at dawn with pink lotus flowers', light: 'dawn light slowly brightening into a soft golden divine glow', mood: 'serene, auspicious, an awakening',
        audio: 'gentle waves, a slow conch, soft temple bells, birds waking at dawn', still: false },
    }),
  },
  {
    id: 'dhanteras', group: 'diwali-week', fest: true, match: /dhanteras|dhanvantari|dhantrayodashi/i,
    make: (c) => ({
      topic: 'Dhanteras: Bhagwan Dhanvantari aur deep',
      titles: ['Dhanteras ki Shubhkamnayein | धनतेरस की शुभकामनाएं', 'Dhanteras | धनतेरस की शुभकामनाएं', 'Dhanteras | धनतेरस'],
      hook: 'Dhanteras ki hardik shubhkamnayein 🪔',
      lines: [`${whenWord(c.dayOffset, c.festDate)} Dhanteras hai: manyata hai ki Samudra Manthan se Bhagwan Dhanvantari amrit kalash lekar prakat hue the.`,
        'Shaam ko Maa Lakshmi aur Dhanvantari ji ki pooja hoti hai aur ghar ke dwaar par deep jalaya jata hai.'],
      dev: 'धनतेरस: भगवान धन्वंतरि और माँ लक्ष्मी की पूजा।', mantra: { dev: 'ॐ धन्वंतरये नमः', roman: 'Om Dhanvantaraye Namah' },
      tags: ['Dhanteras', 'HappyDhanteras', 'Dhanvantari', 'Diwali2026', 'MaaLakshmi', 'Deepawali'],
      refs: DEITY_REFS,
      images: ['Chest-up darshan portrait of Bhagwan Dhanvantari, a radiant divine form with a golden crown and yellow silk, holding a glowing golden amrit kalash close to his chest, the ocean of milk behind, a soft golden halo',
        'the doorway of a traditional Indian home at dusk with rows of lit clay diyas, a marigold toran and a colourful rangoli, no people',
        'shining new brass and copper utensils and a brass kalash beside lit clay diyas and marigold flowers on a red cloth, close-up'],
      veo: { shot: 'Slow push-in toward Bhagwan Dhanvantari rising from the ocean of milk', shot2: 'Start on a row of lit diyas at a home doorway, then a slow rise to the divine form in the sky',
        subject: 'Bhagwan Dhanvantari, a radiant four-armed divine form in yellow silk and a golden crown, holding a golden amrit kalash, a conch, a chakra and herbs', motion: 'the milky waves ripple, golden light glows from the amrit kalash, diya flames flicker, marigold petals drift',
        setting: 'the ocean of milk at dusk, with a festive home doorway of lit diyas in the foreground', light: 'warm diya light and a golden divine glow', mood: 'auspicious, festive and healing',
        audio: 'gentle waves, soft temple bells, a distant conch and the crackle of diya flames' },
    }),
  },
  {
    id: 'choti-diwali', group: 'diwali-week', fest: true, match: /choti diwali|narak|naraka|roop chaudas|roop chaturdashi/i,
    make: (c) => ({
      topic: 'Choti Diwali (Narak Chaturdashi): Shri Krishna aur deep',
      titles: ['Choti Diwali | छोटी दिवाली की शुभकामनाएं', 'Choti Diwali | छोटी दिवाली'],
      hook: 'Choti Diwali ki shubhkamnayein 🪔',
      lines: [`${whenWord(c.dayOffset, c.festDate)} Choti Diwali (Narak Chaturdashi) hai.`,
        'Manyata hai ki is din Shri Krishna ne Narakasur ka ant karke bandi kanyaon ko mukt kiya tha: ghar-ghar deep jalte hain.'],
      dev: 'छोटी दिवाली (नरक चतुर्दशी) की शुभकामनाएं।', mantra: HARE_KRISHNA,
      tags: ['ChotiDiwali', 'NarakChaturdashi', 'ShriKrishna', 'HappyDiwali', 'Diwali2026', 'Deepawali'],
      refs: DEITY_REFS,
      images: [`${KRISHNA}, holding the Sudarshan chakra raised in blessing, a calm victorious smile, front-facing darshan with a soft golden halo`,
        'an old Indian haveli courtyard at night with hundreds of lit clay diyas on the steps and parapets, no people',
        'a circle of lit clay diyas among marigold and rose petals on a stone floor, close-up, soft bokeh'],
      veo: { shot: 'Slow push-in through the courtyard of glowing diyas toward Shri Krishna', shot2: 'A slow sideways glide along rows of diyas that reveals Shri Krishna in the centre',
        subject: `${KRISHNA}, holding the Sudarshan chakra raised in blessing`, motion: 'hundreds of diya flames flicker, a soft breeze moves the marigold strings, petals drift down, the chakra glows softly',
        setting: 'an old Indian haveli courtyard at night lit by hundreds of clay diyas', light: 'warm golden diya light against a deep blue night', mood: 'victorious, joyful and devotional',
        audio: 'crackling diya flames, soft temple bells, a distant conch and festive night ambience' },
    }),
  },
  {
    id: 'diwali', group: 'diwali-week', fest: true, match: /(?<!choti )diwali|deepawali|lakshmi puja|deepotsav/i, notMatch: /choti diwali/i,
    make: (c) => ({
      topic: 'Diwali: Maa Lakshmi aur Ganesh ji darshan',
      titles: ['Diwali Lakshmi Ganesh Darshan | दिवाली लक्ष्मी गणेश', 'Happy Diwali | दीपावली की शुभकामनाएं'],
      hook: 'Shubh Deepawali 🪔',
      lines: [`${whenWord(c.dayOffset, c.festDate)} Diwali hai: Maa Lakshmi aur Ganesh ji ki pooja ka parv.`, 'Ghar mein deep jalayein aur apno ke saath khushiyan baantein.'],
      dev: 'दीपावली पर माँ लक्ष्मी और गणेश जी की पूजा।', mantra: LAKSHMI_MANTRA,
      tags: ['Diwali', 'HappyDiwali', 'Diwali2026', 'LakshmiPuja', 'GaneshJi', 'Deepawali'],
      refs: TWO_DEITY_REFS('Maa Lakshmi', 'Ganesh ji'),
      images: [`${LAKSHMI}, front-facing darshan, soft divine halo`, `${GANESH}, seated on a lotus throne, front-facing darshan`,
        'a home puja altar decorated for Diwali with marigold torans, many lit clay diyas, a colourful rangoli and soft fairy lights, no people'],
      veo: { shot: 'Slow push-in over the rangoli and diyas toward Maa Lakshmi and Ganesh ji', shot2: 'A slow crane down from a night sky with gentle fireworks to the glowing puja altar',
        subject: `${LAKSHMI}, beside ${GANESH}`, motion: 'diya flames flicker, marigold petals drift down, soft fairy lights twinkle, incense smoke curls',
        setting: 'a home puja altar decorated for Diwali with marigold torans, diyas and a rangoli', light: 'warm golden diya light with soft sparkles', mood: 'auspicious, joyful and warm',
        audio: 'soft temple bells, crackling diyas, distant gentle fireworks and a festive ambience' },
    }),
  },
  {
    id: 'govardhan', group: 'krishna', fest: true, match: /govardhan|annakut/i,
    make: (c) => ({
      topic: 'Govardhan Puja: Shri Krishna ne parvat uthaya',
      titles: ['Govardhan Puja | गोवर्धन पूजा की शुभकामनाएं', 'Govardhan Puja | गोवर्धन पूजा'],
      hook: 'Govardhan Puja ki shubhkamnayein 🙏',
      lines: [`${whenWord(c.dayOffset, c.festDate)} Govardhan Puja hai.`,
        'Shri Krishna ne Indra ki barish se Braj ko bachane ke liye Govardhan parvat ko apni chhoti ungli par uthaya tha: aaj Annakut ka bhog lagta hai.'],
      dev: 'गोवर्धन पूजा और अन्नकूट।', mantra: HARE_KRISHNA,
      tags: ['GovardhanPuja', 'Annakut', 'ShriKrishna', 'Govardhan', 'Braj', 'JaiShreeKrishna'],
      refs: DEITY_REFS,
      images: [`young ${KRISHNA}, calmly lifting the Govardhan hill on the little finger of his left hand, gentle smile`,
        'the green Braj countryside in heavy rain, villagers of Gokul and their cows sheltering safely under a lifted hill, soft light under the hill',
        'Annakut: a small hill of many traditional sweets and dishes arranged on banana leaves with lit diyas, close-up'],
      veo: { shot: 'Slow push-in from the rainy fields toward Shri Krishna holding the hill', shot2: 'A slow upward tilt from the sheltered cows and villagers to the hill on Krishna\'s finger',
        subject: `young ${KRISHNA}, lifting the Govardhan hill on the little finger of his left hand`, motion: 'heavy rain falls around the hill while everyone underneath stays dry, cows settle calmly, Krishna smiles and keeps the hill perfectly steady',
        setting: 'the Braj countryside in a storm, villagers and cows sheltering under the hill', light: 'cool stormy light outside and a warm golden glow under the hill', mood: 'protective, joyful and divine',
        audio: 'steady rain and distant thunder, cow bells, a soft flute-like breeze; no melody with words', still: false },
    }),
  },
  {
    id: 'bhai-dooj', group: 'diwali-week', fest: true, match: /bhai dooj|bhaiya dooj|yam dwitiya/i,
    make: (c) => ({
      topic: 'Bhai Dooj: tilak aur bhai-behen ka prem',
      titles: ['Bhai Dooj ki Shubhkamnayein | भाई दूज की शुभकामनाएं', 'Bhai Dooj | भाई दूज'],
      hook: 'Bhai Dooj ki shubhkamnayein 🙏',
      lines: [`${whenWord(c.dayOffset, c.festDate)} Bhai Dooj hai: behen bhai ko tilak lagakar uski lambi umar ki kamna karti hai.`,
        'Lok katha ke anusar is din Yamuna ji ne apne bhai Yamraj ko ghar bulakar tilak kiya tha.'],
      dev: 'भाई दूज: भाई-बहन के प्रेम का पर्व।',
      tags: ['BhaiDooj', 'HappyBhaiDooj', 'BhaiyaDooj', 'Diwali2026', 'BhaiBehan', 'Tyohar'],
      refs: PEOPLE_REFS,
      images: ['an Indian sister in a festive saree applying a red roli tilak on her smiling brother\'s forehead, the brother in a kurta, both seated on a decorated floor, warm and joyful',
        'a home courtyard at evening with lit clay diyas, marigold garlands and a small rangoli, no people',
        'a brass puja thali with roli, rice grains, a lit diya, sweets and a coconut, close-up, soft bokeh'],
      veo: { shot: 'Slow push-in toward the sister and brother', shot2: 'Start close on the puja thali, then a slow pull back revealing the tilak moment',
        subject: 'an Indian sister in a festive saree and her brother in a kurta, seated together on a decorated floor', motion: 'the sister gently applies a red tilak on her brother\'s forehead and offers him a sweet, both smile warmly, the diya flame flickers',
        setting: 'a home courtyard at evening with lit diyas and marigold garlands', light: 'warm golden diya light', mood: 'loving, warm and festive',
        audio: 'soft home ambience, a small bell, the crackle of the diya and gentle laughter; no dialogue', still: false },
    }),
  },
  {
    id: 'chhath', group: 'surya', fest: true, match: /chhath/i,
    make: (c) => {
      const evening = /sandhya/i.test(c.festText || '');
      const sun = evening ? 'the setting sun' : 'the rising sun';
      return {
        topic: `Chhath Puja: ${evening ? 'Sandhya' : 'Usha'} Arghya`,
        titles: ['Chhath Puja Surya Arghya | छठ पूजा सूर्य अर्घ्य', 'Chhath Puja | छठ पूजा'],
        hook: 'Jai Chhathi Maiya 🙏',
        lines: [`${whenWord(c.dayOffset, c.festDate)} ${festName(c.festText || 'Chhath Puja')} hai.`,
          'Chhath mein Surya dev aur Chhathi Maiya ki pooja hoti hai: vrati paani mein khade hokar doobte aur ugte Suraj ko arghya dete hain.'],
        dev: 'छठ पूजा: सूर्य देव और छठी मैया की उपासना।', mantra: { dev: 'ॐ सूर्याय नमः', roman: 'Om Suryaya Namah' },
        tags: ['ChhathPuja', 'ChhathiMaiya', 'SuryaArghya', 'Chhath2026', 'SuryaDev', 'Bihar'],
        refs: PEOPLE_REFS,
        images: [`a woman devotee in a yellow and orange saree standing waist-deep in a calm river, holding a bamboo soop of fruits and thekua toward ${sun} as arghya, seen from the side, reverent`,
          `a river ghat with sugarcane canopies, clay diyas and families in festive clothes on the steps at ${evening ? 'sunset' : 'sunrise'}`,
          'a bamboo soop with bananas, coconut, sugarcane, thekua and a lit diya, close-up, soft bokeh'],
        veo: { shot: `Slow push-in across the water toward the devotee and ${sun}`, shot2: 'A slow low glide over the river surface with floating diyas toward the ghat',
          subject: 'a woman devotee in a yellow and orange saree standing waist-deep in a calm river with a bamboo soop of fruits', motion: `she slowly raises the soop toward ${sun} as arghya, the water ripples gently, diyas float on the river`,
          setting: 'a river ghat with sugarcane canopies and clay diyas', light: `${evening ? 'warm orange sunset' : 'soft golden sunrise'} light reflecting on the water`, mood: 'pure, devotional and peaceful',
          audio: 'gentle river water, distant temple bells and soft morning birds; no singing', still: false },
      };
    },
  },
  {
    id: 'tulsi-vivah', group: 'vishnu', fest: true, match: /tulsi vivah/i,
    make: (c) => ({
      topic: 'Tulsi Vivah: Tulsi ji aur Shaligram ji',
      titles: ['Tulsi Vivah | तुलसी विवाह की शुभकामनाएं', 'Tulsi Vivah | तुलसी विवाह'],
      hook: 'Tulsi Vivah ki shubhkamnayein 🙏',
      lines: [`${whenWord(c.dayOffset, c.festDate)} Tulsi Vivah hai.`, 'Is din Tulsi ji ka vivah Shaligram ji (Bhagwan Vishnu ka swaroop) ke saath karaya jata hai.'],
      dev: 'तुलसी विवाह: तुलसी जी और शालिग्राम जी।', mantra: VISHNU_MANTRA,
      tags: ['TulsiVivah', 'Tulsi', 'Shaligram', 'Kartik', 'Vishnu', 'DevUthaniEkadashi'],
      refs: ['the decorated tulsi plant and Shaligram', 'the setting', 'the puja items in the foreground'],
      images: ['a tulsi plant in a decorated tulsi chaura, dressed like a bride with a red chunari and small gold ornaments, a black Shaligram stone on a small silver throne beside it',
        'a courtyard wedding mandap made of sugarcane stalks with marigold garlands and lit diyas at night, no people',
        'a puja thali with sindoor, red bangles, a red chunari, flowers and a lit diya, close-up'],
      veo: { shot: 'Slow push-in through the sugarcane mandap toward the decorated tulsi plant', shot2: 'A slow circular move around the tulsi chaura',
        subject: 'a tulsi plant dressed as a bride with a red chunari, with a Shaligram stone on a small silver throne beside it', motion: 'diya flames flicker, marigold petals drift down, the red chunari moves softly in the breeze',
        setting: 'a courtyard wedding mandap of sugarcane stalks with marigold garlands', light: 'warm diya light at night', mood: 'auspicious, festive and devotional', audio: `${TEMPLE_AUDIO}, a soft shehnai-like breeze tone; no singing` },
    }),
  },
  {
    id: 'shiv', group: 'shiv', match: /shiv|mahadev|bholenath|somnath|mahakal|kedar|jyotirling/i,
    make: () => ({
      topic: 'Mahadev darshan', titles: ['Mahadev Darshan | महादेव दर्शन', 'Har Har Mahadev | हर हर महादेव'],
      hook: 'Har Har Mahadev 🙏', lines: ['Aaj ke darshan: Devadhidev Mahadev, Kailashpati.', 'Shiv ji ko jal aur bel patra chadhane ki parampara hai.'],
      dev: 'देवों के देव महादेव के दर्शन।', mantra: { dev: 'ॐ नमः शिवाय', roman: 'Om Namah Shivaya' },
      tags: ['Mahadev', 'OmNamahShivaya', 'HarHarMahadev', 'Bholenath', 'ShivJi', 'Somvar'],
      refs: DEITY_REFS,
      images: ['Bhagwan Shiv seated in calm meditation, a pale ash-blue complexion, matted jata with the crescent moon and the Ganga flowing from it, a third eye, rudraksha malas, a serpent around his neck, a trishul with a damru beside him, a tiger-skin seat',
        'the snow peaks of Mount Kailash at sunrise above a sea of clouds, no people',
        'a black stone Shivling with bel patra, white flowers and a copper kalash pouring water, close-up'],
      veo: { shot: 'Slow push-in through the clouds toward Shiv ji in meditation', shot2: 'A slow crane up from the Shivling to Mount Kailash',
        subject: 'Bhagwan Shiv in calm meditation, ash-blue complexion, matted jata with the crescent moon and the Ganga, rudraksha, a serpent around his neck, the trishul and damru beside him',
        motion: 'clouds drift past, the Ganga flows softly from his jata, snow sparkles, a faint glow pulses from the third eye', setting: 'Mount Kailash at sunrise above the clouds',
        light: 'cool dawn light with a warm golden rim', mood: 'deep, calm and powerful', audio: 'mountain wind, a slow damru far away, a soft conch and a deep calm drone' },
    }),
  },
  {
    id: 'hanuman', group: 'hanuman', match: /hanuman|bajrang|sankat mochan/i,
    make: () => ({
      topic: 'Hanuman ji darshan', titles: ['Hanuman ji Darshan | हनुमान जी दर्शन', 'Jai Bajrangbali | जय बजरंगबली'],
      hook: 'Jai Shree Ram, Jai Hanuman 🙏', lines: ['Aaj ke darshan: Sankat Mochan Hanuman ji.', 'Ram bhakti, bal aur buddhi ke data Bajrangbali ko sindoor aur chola chadhaya jata hai.'],
      dev: 'संकट मोचन हनुमान जी के दर्शन।', mantra: { dev: 'ॐ हं हनुमते नमः', roman: 'Om Ham Hanumate Namah' },
      tags: ['HanumanJi', 'JaiShreeRam', 'Bajrangbali', 'Hanuman', 'SankatMochan', 'Mangalvar'],
      refs: DEITY_REFS,
      images: ['Hanuman ji with a sindoor-orange complexion and a kind, devoted face, golden crown and earrings, a golden gada (mace) resting on his shoulder, a saffron dhoti, hands folded in devotion, front-facing darshan',
        'a hilltop temple courtyard at sunrise with saffron flags and brass bells, no people',
        'a golden gada leaning beside a marigold garland, a bowl of sindoor and a lit clay diya, close-up'],
      veo: { shot: 'Slow push-in toward Hanuman ji in the temple courtyard', shot2: 'A slow upward tilt from the saffron flags to Hanuman ji\'s face',
        subject: 'Hanuman ji with a sindoor-orange complexion, golden crown, a golden gada on his shoulder and a saffron dhoti, hands folded in devotion',
        motion: 'saffron flags ripple in the wind, the diya flame flickers, marigold petals drift, the sunrise grows brighter', setting: 'a hilltop temple courtyard at sunrise with saffron flags',
        light: 'golden sunrise light with a warm rim', mood: 'strong, devoted and reassuring', audio: 'temple bells, wind over the hill, a distant conch' },
    }),
  },
  {
    id: 'ganesh', group: 'ganesh', match: /ganesh|ganpati|vinayak|moti dungri/i,
    make: () => ({
      topic: 'Ganesh ji darshan', titles: ['Ganesh ji Darshan | गणेश जी दर्शन', 'Ganpati Bappa Morya | गणपति बप्पा मोरया'],
      hook: 'Ganpati Bappa Morya 🙏', lines: ['Aaj ke darshan: Pratham Pujya Ganesh ji.', 'Har shubh kaam se pehle Ganesh ji ki pooja hoti hai: unhe modak aur durva priya hain.'],
      dev: 'प्रथम पूज्य गणेश जी के दर्शन।', mantra: { dev: 'ॐ गं गणपतये नमः', roman: 'Om Gam Ganapataye Namah' },
      tags: ['GaneshJi', 'Ganpati', 'GanpatiBappaMorya', 'Vinayak', 'Ganesh', 'Budhvar'],
      refs: DEITY_REFS,
      images: [PORTRAIT('Ganesh ji with an elephant head, one broken tusk, a red tilak, a golden crown, red and yellow silk and a flower garland'),
        'a temple hall with marigold garlands, brass bells and soft diya light, no people',
        'a brass plate of modaks with durva grass, red hibiscus flowers and a lit diya, close-up'],
      veo: { shot: 'Slow push-in toward Ganesh ji on his golden throne', shot2: 'A slow arc from the plate of modaks up to Ganesh ji',
        subject: GANESH, motion: 'diya flames flicker, red hibiscus petals drift down, the brass bells sway gently, the little mouse twitches its nose',
        setting: 'a temple hall with marigold garlands and brass bells', light: 'warm golden diya light', mood: 'joyful, auspicious and gentle', audio: TEMPLE_AUDIO },
    }),
  },
  {
    id: 'vishnu', group: 'vishnu', match: /vishnu|narayan|shri hari/i,
    make: () => ({
      topic: 'Shri Hari Vishnu darshan', titles: ['Shri Hari Vishnu Darshan | श्री हरि विष्णु दर्शन', 'Vishnu ji Darshan | विष्णु जी दर्शन'],
      hook: 'Om Namo Narayanaya 🙏', lines: ['Aaj ke darshan: Shri Hari Vishnu, Kshir Sagar mein Sheshnag par.', 'Guruvar ko Vishnu ji ki pooja aur peele phool chadhane ki parampara hai.'],
      dev: 'क्षीर सागर में श्री हरि विष्णु के दर्शन।', mantra: VISHNU_MANTRA,
      tags: ['Vishnu', 'ShriHari', 'Narayan', 'OmNamoNarayanaya', 'Guruvar', 'Vaikunth'],
      refs: DEITY_REFS,
      images: [PORTRAIT(VISHNU_FACE),
        'the Kshir Sagar, a calm divine ocean of milk at dawn with pink lotus flowers and soft golden mist, no people',
        'a brass puja thali with yellow flowers, tulsi leaves, a lit ghee diya and incense on a yellow silk cloth, close-up'],
      veo: { shot: 'Slow push-in across the ocean of milk toward Shri Vishnu', shot2: 'A slow arc around the lotus flowers revealing the darshan',
        subject: `${VISHNU}, seated on the coils of Sheshnag`, motion: 'lotus flowers bob on the milky waves, golden mist drifts, Sheshnag\'s hoods sway very slightly, the diya flame flickers',
        setting: 'the Kshir Sagar at dawn', light: 'soft golden dawn light with a divine glow', mood: 'serene and divine', audio: 'gentle waves, soft temple bells and a distant conch' },
    }),
  },
  {
    id: 'lakshmi', group: 'lakshmi', match: /lakshmi|laxmi/i,
    make: () => ({
      topic: 'Maa Lakshmi darshan', titles: ['Maa Lakshmi Darshan | माँ लक्ष्मी दर्शन', 'Jai Maa Lakshmi | जय माँ लक्ष्मी'],
      hook: 'Jai Maa Lakshmi 🙏', lines: ['Aaj ke darshan: Maa Lakshmi, kamal par virajmaan.', 'Shukravar ko Maa Lakshmi ki pooja ki parampara hai.'],
      dev: 'कमल पर विराजमान माँ लक्ष्मी के दर्शन।', mantra: LAKSHMI_MANTRA,
      tags: ['MaaLakshmi', 'Lakshmi', 'Mahalakshmi', 'JaiMaaLakshmi', 'Shukravar', 'Kamala'],
      refs: DEITY_REFS,
      images: [`${LAKSHMI}, two white elephants beside her raising their trunks, front-facing darshan`,
        'a calm lotus pond at dawn with pink lotus flowers and soft golden mist, no people',
        'a brass diya thali with pink lotus flowers, kumkum and a lit diya, close-up'],
      veo: { shot: 'Slow push-in across the lotus pond toward Maa Lakshmi', shot2: 'A slow crane down from the sky to Maa Lakshmi on the lotus',
        subject: LAKSHMI, motion: 'the white elephants gently shower water from their trunks, lotus flowers sway on the water, golden light sparkles, the diya flame flickers',
        setting: 'a lotus pond at dawn', light: 'soft golden light with a divine glow', mood: 'auspicious, graceful and calm', audio: 'gentle water, soft temple bells, a distant conch' },
    }),
  },
  {
    id: 'surya', group: 'surya', match: /surya|suraj/i,
    make: () => ({
      topic: 'Surya Dev darshan', titles: ['Surya Dev Darshan | सूर्य देव दर्शन', 'Om Suryaya Namah | ॐ सूर्याय नमः'],
      hook: 'Om Suryaya Namah 🙏', lines: ['Aaj ke darshan: Surya Dev, saat ghodon ke rath par.', 'Ravivar ko ugte Suraj ko jal (arghya) dene ki parampara hai.'],
      dev: 'सात घोड़ों के रथ पर सूर्य देव के दर्शन।', mantra: { dev: 'ॐ सूर्याय नमः', roman: 'Om Suryaya Namah' },
      tags: ['SuryaDev', 'Surya', 'OmSuryayaNamah', 'Ravivar', 'Aditya', 'Arghya'],
      refs: DEITY_REFS,
      images: ['Surya Dev with a radiant golden form, a golden crown and lotuses in his hands, riding a golden chariot pulled by seven white horses across the sky',
        'a river at sunrise with golden clouds and the sun just above the horizon, no people',
        'a copper lota pouring a stream of water as arghya with red flowers, the sunrise behind, close-up'],
      veo: { shot: 'Slow push-in toward Surya Dev\'s golden chariot rising over the river', shot2: 'Start on the water stream from a copper lota, then a slow tilt up to the sun and Surya Dev',
        subject: 'Surya Dev with a radiant golden form and crown, holding lotuses, on a golden chariot pulled by seven white horses', motion: 'the chariot glides slowly upward, the horses\' manes flow, golden clouds part, light sparkles on the river',
        setting: 'the sky above a river at sunrise', light: 'brilliant golden sunrise light', mood: 'radiant, powerful and hopeful', audio: 'morning birds, gentle river water and a soft conch', still: false },
    }),
  },
  {
    id: 'krishna', group: 'krishna', match: /krishna|kanha|banke bihari|vrindavan|govind dev|shrinathji/i,
    make: () => ({
      topic: 'Shri Krishna darshan', titles: ['Shri Krishna Darshan | श्री कृष्ण दर्शन', 'Radhe Radhe | श्री कृष्ण दर्शन'],
      hook: 'Radhe Radhe 🙏', lines: ['Aaj ke darshan: Shri Krishna, Vrindavan ke Kanha.', 'Murli ki dhun, mor mukut aur peetambar: Jai Shree Krishna.'],
      dev: 'वृंदावन के श्री कृष्ण के दर्शन।', mantra: HARE_KRISHNA,
      tags: ['ShriKrishna', 'Krishna', 'JaiShreeKrishna', 'RadheRadhe', 'Vrindavan', 'Kanha'],
      refs: DEITY_REFS,
      images: [`${KRISHNA}, playing the bansuri flute in a graceful tribhanga posture, gentle smile`,
        'a Vrindavan forest by the Yamuna river at golden hour with cows and peacocks, no people',
        'a decorated bansuri flute with a peacock feather, makhan in a small clay pot and tulsi leaves, close-up'],
      veo: { shot: 'Slow push-in through the Vrindavan trees toward Shri Krishna', shot2: 'A slow glide along the Yamuna bank that reveals Shri Krishna under a kadamb tree',
        subject: `${KRISHNA}, playing the bansuri flute in tribhanga posture`, motion: 'he plays the flute gently, leaves and petals drift, peacocks spread their feathers, cows turn toward the sound, the river shimmers',
        setting: 'Vrindavan by the Yamuna at golden hour', light: 'warm golden-hour light through the trees', mood: 'loving, playful and peaceful',
        audio: 'a soft bansuri flute melody, birds, cow bells and the gentle river; no singing', still: false },
    }),
  },
];
const WEEKDAY = ['surya', 'shiv', 'hanuman', 'ganesh', 'vishnu', 'lakshmi', 'hanuman'];

// A temple with licence-safe real photos in footage/<slug>/ (the trend named it): 2 real photos + 1 FLUX offering.
function templeEntry(slug, item) {
  const t = temples[slug]; const name = t.name.split(',')[0]; const place = t.name.split(',')[1]?.trim();
  const photos = templePhotos(slug).slice(0, 2);
  return {
    id: `temple-${slug}`, group: `temple-${slug}`, match: new RegExp(slug.replace(/-/g, '[ -]?'), 'i'), photos,
    make: () => ({
      topic: `${name} darshan (asli mandir photos)`,
      titles: [`${name} Darshan | ${item.dev || name}`, `${name} Darshan`],
      hook: `${name} ke darshan 🙏`,
      lines: [`Aaj ke darshan: ${name}${place ? `, ${place}` : ''}.`, 'Asli mandir ki photo par bana AI video (sanketik): photo credit neeche.'],
      dev: item.dev ? `${item.dev} के दर्शन।` : '',
      tags: [name.replace(/[^A-Za-z]/g, ''), 'MandirDarshan', 'IndianTemples', 'Mandir', 'Darshan', 'Temple'],
      refs: ['the temple\'s exact architecture (keep it unchanged)', 'the temple from another angle', 'the offering in the foreground'],
      images: [null, null, 'a brass diya thali with marigold flowers, incense and a lit diya on temple steps, close-up, soft bokeh'],
      veo: { shot: 'Slow cinematic glide toward the temple entrance', shot2: 'A slow rising drone-like move from the offering on the steps up to the temple shikhar',
        subject: `the real ${name} temple exactly as in the reference photos`, motion: 'flags flutter, birds fly across the sky, diya flames flicker on the steps, soft clouds drift', stillText: 'The temple architecture stays exactly as in the photos; only the surroundings move',
        setting: `${name}${place ? `, ${place}` : ''}`, light: 'warm golden-hour light', mood: 'peaceful, devotional and grand', audio: 'temple bells, birds, a soft breeze and a distant conch' },
    }),
  };
}

// ---------- choose 2 ideas ----------
function choose() {
  const jRow = calendar.find((r) => /janmotsav/i.test(r.text) && r.date >= DATE);
  const base = { janmotsav: jRow?.date, janmotsavDays: jRow ? dayDiff(DATE, jRow.date) : -1 };
  const byId = Object.fromEntries(ENTRIES.map((e) => [e.id, e]));
  const recent = new Set(); // ideas in the last 2 kits (filled by main from the Worker)
  const cands = [];
  // 1. Festivals today .. +3 days (nearest first).
  for (let d = 0; d <= 3; d++) {
    for (const row of calendar.filter((r) => r.date === addDays(DATE, d))) {
      for (const part of row.text.split(/;\s*/)) {
        const name = festName(part);
        const e = ENTRIES.find((x) => x.fest && x.match.test(name) && !(x.notMatch && x.notMatch.test(name)));
        if (e) cands.push({ e, fest: true, why: `Tyohar ${d === 0 ? 'aaj' : d === 1 ? 'kal' : nice(row.date)}: ${festName(part)}`, ctx: { ...base, dayOffset: d, festDate: row.date, festName: festName(part), festText: part } });
      }
    }
  }
  // 2. Trends (darshan items first: a Veo Short is an 8-second visual darshan).
  const items = trendItems();
  for (const it of [...items.filter((i) => /darshan/i.test(i.format)), ...items.filter((i) => !/darshan/i.test(i.format))]) {
    const slug = templeFor(it.roman);
    if (slug && templePhotos(slug).length >= 2) { cands.push({ e: templeEntry(slug, it), why: `Trend #${it.rank}: "${it.roman}"`, ctx: base }); continue; }
    // Festival phrases are covered by the calendar above; only darshan-type entries come from trends.
    const e = ENTRIES.find((x) => !x.fest && (!x.when || x.when(base)) && x.match.test(it.roman));
    if (e) cands.push({ e, why: `Trend #${it.rank}: "${it.roman}"`, ctx: base });
  }
  // 3. Khatu Shyam ji (the channel's main deity), then the weekday deity.
  if (byId['khatu-janmotsav'].when(base)) cands.push({ e: byId['khatu-janmotsav'], why: `Khatu Shyam Janmotsav ${niceYear(base.janmotsav)} (${base.janmotsavDays} din baaki)`, ctx: base });
  cands.push({ e: byId['khatu-darshan'], why: 'Channel ke mukhya devta: Khatu Shyam ji', ctx: base });
  cands.push({ e: byId[WEEKDAY[weekday(DATE)]], why: `${DAYS[weekday(DATE)]} ke devta`, ctx: base });
  for (const id of ['krishna', 'ganesh', 'shiv', 'lakshmi']) cands.push({ e: byId[id], why: 'Sada-bahar darshan', ctx: base });
  return { cands, recent };
}

function pick(cands, recent) {
  // Khatu Shyam Baba's Janmotsav is the channel's biggest day: a hero Short on the day itself even though every slot covers it.
  const janmotsavDay = (c) => c.e.id === 'khatu-janmotsav' && c.ctx.janmotsavDays === 0;
  const ok = (c) => (!c.e.match.test(busy) || janmotsavDay(c)) && !(c.e.when && !c.e.when(c.ctx))
    && !(recent.has(c.e.id) && !(c.fest && c.ctx.dayOffset === 0) && !(c.e.id === 'khatu-janmotsav' && c.ctx.janmotsavDays <= 5));
  const skipped = [...new Set(cands.filter((c) => c.e.match.test(busy)).map((c) => c.e.id))];
  const first = cands.find((c) => janmotsavDay(c) && ok(c)) || cands.find(ok);
  const second = cands.find((c) => ok(c) && c !== first && c.e.group !== first?.e.group && !c.fest)
    || cands.find((c) => ok(c) && c !== first && c.e.group !== first?.e.group);
  return { picks: [first, second].filter(Boolean), skipped };
}

// ---------- texts ----------
const clen = (s) => [...s].length;
const fit = (titles, max = 60) => titles.find((t) => clen(t) <= max) || [...titles.at(-1)].slice(0, max).join('');
function hashtags(own) {
  const all = [...own, 'JaiShreeShyam', 'ShyamPremiSN', 'Bhakti', 'SanatanDharma', 'Shorts', 'HinduDharma', 'Devotional'];
  return [...new Set(all)].slice(0, 10).map((t) => `#${t}`);
}
function veoPrompts(v, refs) {
  const still = v.stillText || (v.still === false ? '' : 'The divine figures stay perfectly still and serene, like decorated temple murtis, with calm gentle expressions; only the surroundings move');
  const tail = `Lighting: ${v.light}. Mood and style: ${v.mood}; cinematic devotional art, rich detail, shallow depth of field, smooth natural motion, respectful and accurate traditional iconography. Audio: ${v.audio}; no dialogue, no narration, no singing. Keep the frame clean: no on-screen text, captions, subtitles, logos or watermarks.`;
  const motion = still ? `${still}: ${v.motion}.` : `Action: ${v.motion}.`;
  return {
    main: `Vertical 9:16 video, 8 seconds, one continuous shot. Camera: ${v.shot}. Use the reference images for ${refs[0]} (image 1), ${refs[1]} (image 2) and ${refs[2]} (image 3). Subject: ${v.subject}. ${motion} Setting: ${v.setting}. ${tail}`,
    photo: `Vertical 9:16, 8 seconds. Bring this photo gently to life without changing the ${refs[0].replace(/^the /, '').replace(/ \(.*$/, '')}. Camera: ${v.shot2}. ${motion} ${tail}`,
    text: `Vertical 9:16 video, 8 seconds, one continuous shot. Camera: ${v.shot2}. Subject: ${v.subject}. ${motion} Setting: ${v.setting}. ${tail}`,
  };
}
function texts(m, credits) {
  const tags = hashtags(m.tags);
  const ai = 'Yeh video AI (YouTube Veo) se bana sanketik chitran hai.';
  const credit = credits.length ? `\n${credits.join('\n')}` : '';
  const mantra = m.mantra ? `${m.mantra.dev}\n` : '';
  const title = fit(m.titles);
  return {
    title,
    description: `${m.hook}\n${m.lines.join('\n')}\n${m.dev ? `${m.dev}\n` : ''}${mantra}Jai Shree Shyam 🙏\nAchha laga ho to Like, Share karein aur Shyam Premi SN ko Subscribe karein.\n${ai}${credit}\n\n${tags.join(' ')}`,
    hashtags: tags.join(' '),
    instagram: `${m.hook}\n\n${m.lines.join('\n')}\n\n${m.mantra ? `${m.mantra.roman}\n` : ''}Jai Shree Shyam 🙏\nLike, share aur follow karein: Shyam Premi SN.\n${ai}${credit}\n\n${tags.slice(0, 10).join(' ')}`,
    facebook: `${m.hook}\n${m.lines[0]}\nJai Shree Shyam 🙏 Achha laga ho to Like, Share aur Follow karein.\n${ai}${credit}\n${tags.slice(0, 4).join(' ')}`,
  };
}

const STEPS_HI = [
  'Is page par Hero 1 ki teeno photos download karo (Download button, ya photo ko daba ke rakho → Save/Download image). Pehle photo dekh lo: roop sahi ho (mukut, tilak, haath). Koi photo galat lage to use chhod do, ya Alternative 2 (bina photo) prompt use karo.',
  'YouTube app kholo → neeche + dabao → Short (Create a Short) chuno.',
  'Sparkle ✨ (AI) icon dabao. "Veo", "Ingredients to video", "Photo to video" ya "Generate video" jaisa jo option dikhe, sabse milta-julta chuno: naam phone, desh aur app version ke hisaab se alag ho sakta hai. YouTube Create app mein bhi yahi option milta hai.',
  'Teeno photos upload karo (Photo 1, 2, 3). Sirf 1 photo ka option ho to Photo 1 lo aur "Alternative 1" prompt use karo. Photo ka option hi na ho to "Alternative 2" (sirf text) prompt use karo.',
  'Main prompt Copy karo → prompt box mein paste karo → Generate dabao. 1-2 minute ruko.',
  'Jo version sabse sundar aur sahi lage wahi chuno: chehra, mukut, haath aur roop sahi hon, koi likha hua text na ho. Theek na lage to dobara Generate karo.',
  'Next → Title mein kit ka Title paste karo. Description aur hashtags ka box ho to woh bhi paste karo (warna baad mein YouTube Studio mein daal dena).',
  'Upload/Post Short dabao. "AI generated / altered content" ka sawal aaye to Yes chuno.',
  'Instagram/Facebook: computer par studio.youtube.com → Content → video ke ⋮ → Download (ya phone mein bani copy) → Instagram Reel aur Facebook Reel par wahi video daalo aur kit ka IG/FB caption paste karo. (Hero videos ka FB/IG abhi khud post karna hai.)',
  'Hero 2 ke liye yahi dohraao. Kaam ho jaye to CRM (crm.epifive.com) mein "Aaj ke 2 Veo hero Shorts banao" tick karo.',
];

// ---------- images ----------
// FLUX.2 [klein] 9B draws a true 9:16 picture (and kept Khatu Shyam ji's iconography best in the 5 Nov test);
// FLUX.1 schnell (square) is the fallback. Returns true when the picture is square.
async function flux(prompt, file) {
  let last = '';
  for (const body of [{ model: 'flux-2-klein-9b', width: 720, height: 1280 }, { steps: STEPS }]) {
    const r = await fetch(`${MEDIA_URL}/ai/flux`, {
      method: 'POST', headers: { Authorization: `Bearer ${MEDIA_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: `${prompt}. ${STYLE}`, ...body }), signal: AbortSignal.timeout(120e3),
    }).catch((e) => ({ status: e.message, json: async () => ({}) }));
    const j = await r.json().catch(() => ({}));
    if (j.success && j.result?.image) { fs.writeFileSync(file, Buffer.from(j.result.image, 'base64')); return !body.model; }
    last = `FLUX ${body.model || 'schnell'} ${r.status}: ${JSON.stringify(j.errors || j).slice(0, 200)}`;
    console.log(`::warning::${last}`);
  }
  throw new Error(last);
}
function toPortrait(src, dst, square) {
  // A square FLUX.1 picture keeps its centre 9:16 strip (prompts centre the subject); others are cover-cropped to 720x1280.
  const vf = square ? 'crop=ih*9/16:ih,scale=720:1280:flags=lanczos,setsar=1' : 'scale=720:1280:force_original_aspect_ratio=increase:flags=lanczos,crop=720:1280,setsar=1';
  const r = spawnSync(FFMPEG, ['-y', '-v', 'error', '-i', src, '-vf', vf, '-q:v', '2', dst], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffmpeg: ${(r.stderr || r.error?.message || '').slice(0, 200)}`);
}
async function put(name, body, type) {
  const r = await fetch(`${MEDIA_URL}/${name}`, { method: 'PUT', headers: { Authorization: `Bearer ${MEDIA_TOKEN}`, 'Content-Type': type }, body, signal: AbortSignal.timeout(60e3) });
  if (!r.ok) throw new Error(`upload ${name}: HTTP ${r.status}`);
  return (await r.json()).url;
}

// ---------- page / email / summary ----------
const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
function page(kit) {
  let n = 0;
  const block = (label, text) => {
    const id = `t${++n}`;
    return `<div class="blk"><div class="bh"><b>${esc(label)}</b><button data-copy="${id}">Copy</button></div><pre id="${id}">${esc(text)}</pre></div>`;
  };
  const heroes = kit.heroes.map((h, i) => `
<section class="card">
  <h2>Hero ${i + 1}: ${esc(h.topic)}</h2>
  <p class="why">${esc(h.why)}</p>
  <div class="imgs">${h.images.map((im, k) => `<figure><a href="${esc(im.url)}" target="_blank"><img src="${esc(im.url)}" alt="Photo ${k + 1}" loading="lazy"></a>
    <figcaption>Photo ${k + 1}: ${esc(im.label)}</figcaption><a class="dl" href="${esc(im.url)}" download="${esc(im.name)}">Download</a></figure>`).join('')}</div>
  ${h.credits.length ? `<p class="credit">${h.credits.map(esc).join('<br>')}</p>` : ''}
  ${block('Veo prompt (3 photos ke saath) - yahi paste karo', h.prompts.main)}
  <details><summary>Alternative prompts</summary>
  ${block('Alternative 1: sirf Photo 1 ke saath ("Photo to video")', h.prompts.photo)}
  ${block('Alternative 2: bina photo (sirf text se video)', h.prompts.text)}
  </details>
  ${block(`YouTube title (${clen(h.title)}/60)`, h.title)}
  ${block('YouTube description', h.description)}
  ${block('10 hashtags', h.hashtags)}
  ${block('Instagram caption', h.instagram)}
  ${block('Facebook caption', h.facebook)}
</section>`).join('');
  return `<!doctype html><html lang="hi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Veo kit ${esc(kit.date)} · Shyam Premi SN</title>
<style>
:root{--bg:#0d1630;--card:#16224a;--gold:#f2c14e;--txt:#f4f1e8;--mut:#b9c0d8}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--txt);font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans Devanagari",sans-serif}
main{max-width:760px;margin:0 auto;padding:14px}h1{font-size:1.35rem;color:var(--gold);margin:.3em 0}h2{font-size:1.15rem;color:var(--gold);margin:.2em 0}
.card{background:var(--card);border-radius:14px;padding:14px;margin:14px 0;box-shadow:0 2px 10px #0006}
.why,.credit,.note{color:var(--mut);font-size:.9rem}.imgs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
figure{margin:0;text-align:center}img{width:100%;aspect-ratio:9/16;object-fit:cover;border-radius:8px;background:#0008}
figcaption{font-size:.75rem;color:var(--mut);line-height:1.2;margin:4px 0}
.dl,button{display:inline-block;background:var(--gold);color:#1b1b1b;border:0;border-radius:8px;padding:8px 12px;font-weight:700;font-size:.9rem;text-decoration:none;cursor:pointer}
.blk{margin:12px 0}.bh{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px}
pre{white-space:pre-wrap;word-wrap:break-word;background:#0b1226;border:1px solid #2b3a6b;border-radius:8px;padding:10px;margin:0;font:inherit;font-size:.92rem}
details{margin:8px 0}summary{cursor:pointer;color:var(--gold);font-weight:700}
ol{padding-left:1.3em}li{margin:6px 0}button.ok{background:#7bd88f}
</style></head><body><main>
<h1>Aaj ke 2 Veo hero Shorts · ${esc(nice(kit.date))} ${esc(kit.date.slice(0, 4))} (${esc(DAYS[weekday(kit.date)])})</h1>
<p class="note">Shyam Premi SN · YouTube app ke AI video (Veo) se ~5 minute mein. Photos aur page 7 din tak rahenge.</p>
<details class="card"><summary>📱 Kaise banayein: ${STEPS_HI.length} aasaan steps (yahan dabao)</summary><ol>${STEPS_HI.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></details>
${heroes}
<p class="note">Banaya: scripts/veo-kit.mjs · ${esc(kit.made)}</p>
</main><script>
document.addEventListener('click',async function(e){var b=e.target.closest('[data-copy]');if(!b)return;var t=document.getElementById(b.dataset.copy).textContent;
try{await navigator.clipboard.writeText(t)}catch(_){var a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();document.execCommand('copy');a.remove()}
b.textContent='Copied ✓';b.classList.add('ok');setTimeout(function(){b.textContent='Copy';b.classList.remove('ok')},1600)});
</script></body></html>`;
}
function emailHtml(kit) {
  const btn = `<a href="${esc(kit.page)}" style="display:inline-block;background:#f2c14e;color:#1b1b1b;padding:12px 18px;border-radius:8px;font-weight:700;text-decoration:none">Kit page kholo (photos + copy buttons)</a>`;
  return `<div style="font-family:system-ui,Segoe UI,Roboto,sans-serif;max-width:640px;line-height:1.5">
<h2 style="color:#16224a">Aaj ke 2 Veo hero Shorts · ${esc(nice(kit.date))}</h2><p>${btn}</p>
${kit.heroes.map((h, i) => `<h3>Hero ${i + 1}: ${esc(h.topic)}</h3><p style="color:#555">${esc(h.why)}</p>
<p>${h.images.map((im) => `<img src="${esc(im.url)}" width="120" style="border-radius:6px;margin-right:6px">`).join('')}</p>
<p><b>Title:</b> ${esc(h.title)}</p><p><b>Veo prompt:</b><br><span style="background:#f4f1e8;display:block;padding:8px;border-radius:6px">${esc(h.prompts.main)}</span></p>`).join('')}
<h3>Steps</h3><ol>${STEPS_HI.map((s) => `<li>${esc(s)}</li>`).join('')}</ol><p>${btn}</p></div>`;
}
function summary(kit, status, ownerSteps) {
  const md = [`## Veo kit ${kit.date}`, '', `Page: ${kit.page}`, '', ...status.map((s) => `- ${s}`), ''];
  if (ownerSteps.length) md.push('**Owner steps:**', ...ownerSteps.map((s) => `- ${s}`), '');
  kit.heroes.forEach((h, i) => {
    md.push(`### Hero ${i + 1}: ${h.topic}`, `_${h.why}_`, '', ...h.images.map((im, k) => `- Photo ${k + 1} (${im.label}): ${im.url}`), ...h.credits.map((c) => `- ${c}`), '',
      '**Veo prompt (3 photos):**', '```', h.prompts.main, '```', '**Alt 1 (1 photo):**', '```', h.prompts.photo, '```', '**Alt 2 (text only):**', '```', h.prompts.text, '```',
      `**Title:** ${h.title}`, '', '**Description:**', '```', h.description, '```', '**Instagram:**', '```', h.instagram, '```', '**Facebook:**', '```', h.facebook, '```', '');
  });
  md.push('**Steps:**', ...STEPS_HI.map((s, i) => `${i + 1}. ${s}`), '');
  return md.join('\n');
}

// ---------- main ----------
async function main() {
  if (!DRY && !flag('force')) {
    const r = await fetch(`${MEDIA_URL}/kit/${DATE}.json`, { signal: AbortSignal.timeout(20e3) }).catch(() => null);
    if (r?.ok) { console.log(`Veo kit ${DATE} already made: ${PAGE_URL}`); return; }
  }
  if (!DRY && !MEDIA_TOKEN) throw new Error('no MEDIA_TOKEN');
  const { cands, recent } = choose();
  for (const d of [1, 2]) {
    const r = await fetch(`${MEDIA_URL}/kit/${addDays(DATE, -d)}.json`, { signal: AbortSignal.timeout(20e3) }).catch(() => null);
    if (r?.ok) for (const h of (await r.json().catch(() => ({}))).heroes || []) recent.add(h.id);
  }
  const { picks, skipped } = pick(cands, recent);
  if (!picks.length) throw new Error('no idea left after the no-repeat rules');
  console.log(`Ideas: ${picks.map((p) => `${p.e.id} (${p.why})`).join(' + ')}${skipped.length ? `; skipped (today's slots): ${skipped.join(', ')}` : ''}`);
  fs.mkdirSync(OUT, { recursive: true });

  const heroes = [];
  for (const [i, p] of picks.entries()) {
    const m = p.e.make(p.ctx);
    const labels = m.refs.map((r) => (/setting/.test(r) ? 'Jagah (setting)' : /offering|puja items/.test(r) ? 'Puja saamagri' : /^the deity/.test(r) ? 'Darshan (mukhya roop)'
      : /^the people/.test(r) ? 'Bhakt (log)' : /temple/.test(r) ? 'Mandir' : r.replace(/^the /, '').replace(/'s exact.*$/, '')));
    const images = []; const credits = [];
    for (let k = 0; k < 3; k++) {
      const name = `veo-${DATE}-h${i + 1}-${k + 1}.jpg`;
      const local = path.join(OUT, name);
      const photo = p.e.photos?.[k];
      if (DRY) { images.push({ url: `https://placehold.co/720x1280?text=Photo+${k + 1}`, name, label: labels[k], prompt: m.images[k] }); continue; }
      if (flag('reuse') && fs.existsSync(local)) {
        if (photo) credits.push(`Photo ${k + 1}: ${photo.licence.attribution} (${photo.licence.url})`);
      } else if (photo) {
        toPortrait(photo.file, local, false);
        credits.push(`Photo ${k + 1}: ${photo.licence.attribution} (${photo.licence.url})`);
      } else {
        const prompt = m.images[k] || m.images[2];
        const raw = path.join(OUT, `${name}.raw.jpg`);
        try {
          toPortrait(raw, local, await flux(prompt, raw));
        } catch (e) {
          // Workers AI out of neurons (4006) or down: a picture-bank / real-photo stand-in, so the kit is never skipped
          // (animate/frames.mjs fallbackImage; Khatu Shyam ji = the sheesh bank pictures).
          const fb = fallbackImage({ temple: p.e.temple || p.ctx?.temple }, prompt, k, OUT);
          console.log(`::warning::Veo kit image ${k + 1}: ${e.message.slice(0, 120)}; using ${fb.source}`);
          toPortrait(fb.file, local, false);
          if (fb.photo) credits.push(`Photo ${k + 1}: ${fb.photo.attribution || `${fb.photo.author}, ${fb.photo.licence}`} (${fb.photo.url || fb.photo.source})`);
        }
        fs.rmSync(raw, { force: true });
      }
      images.push({ url: await put(`m/${name}`, fs.readFileSync(local), 'image/jpeg'), name, label: photo ? `${labels[k]} (asli photo)` : labels[k], prompt: m.images[k] || null });
    }
    heroes.push({ id: p.e.id, why: p.why, topic: m.topic, images, credits, prompts: veoPrompts(m.veo, m.refs), ...texts(m, credits) });
  }

  const kit = { date: DATE, made: new Date().toISOString(), page: PAGE_URL, heroes };
  const html = page(kit);
  fs.writeFileSync(path.join(OUT, `${DATE}.html`), html);
  fs.writeFileSync(path.join(OUT, `${DATE}.json`), JSON.stringify(kit, null, 2));
  const status = []; const ownerSteps = [];
  if (DRY) { console.log(`Dry run: ${path.join(OUT, `${DATE}.html`)}`); return; }
  await put(`kit/${DATE}.json`, JSON.stringify(kit), 'application/json');
  await put(`kit/${DATE}.html`, html, 'text/html; charset=utf-8');
  status.push(`Kit page hosted: ${PAGE_URL}`);

  const send = !flag('no-send');
  if (!send) status.push('Email/CRM: skipped (--no-send)');
  else if (!RESEND_API_KEY) {
    status.push('Email: not sent (no RESEND_API_KEY secret); the kit is in this run summary');
    ownerSteps.push('Add the Resend key: `gh secret set RESEND_API_KEY -R sk9836413/shyam-premi-sn` (same key as epifive-automation; from resend.com → API Keys).');
  } else {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'Shyam Premi SN <newsletter@epifive.com>', to: TO.split(',').map((s) => s.trim()),
        subject: `Aaj ke 2 Veo hero Shorts (${nice(DATE)}): ${heroes.map((h) => h.topic.split(':')[0]).join(' + ')}`,
        html: emailHtml(kit), text: `Kit page: ${PAGE_URL}\n\n${summary(kit, [], [])}` }),
      signal: AbortSignal.timeout(30e3),
    }).catch((e) => ({ ok: false, status: e.message }));
    status.push(`Email to ${TO}: ${r.ok ? 'sent' : `failed (${r.status})`}`);
  }
  if (send) {
    if (!INGEST_TOKEN) {
      status.push('CRM task: not added (no INGEST_TOKEN secret)');
      ownerSteps.push('Add the CRM ingest token: `grep ^INGEST_TOKEN= ~/.epifive/crm-ingest.env | cut -d= -f2- | gh secret set INGEST_TOKEN -R sk9836413/shyam-premi-sn`.');
    } else {
      const r = await fetch(`${CRM_URL}/api/ingest/task`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Ingest-Token': INGEST_TOKEN },
        body: JSON.stringify({ title: CRM_TASK, cadence: 'daily', role: 'manager', link: PAGE_URL,
          details: `${nice(DATE)} ka Veo kit: ${PAGE_URL}\n${heroes.map((h, i) => `${i + 1}) ${h.title}`).join('\n')}\nYouTube app → + → Short → ✨ → 3 photos + prompt → Generate → title → Post. Phir IG/FB.` }),
        signal: AbortSignal.timeout(30e3),
      }).catch((e) => ({ ok: false, status: e.message }));
      status.push(`CRM task "${CRM_TASK}": ${r.ok ? (r.status === 201 ? 'added' : 'updated') : `failed (${r.status}${r.status === 404 ? ': deploy the CRM with /api/ingest/task' : ''})`}`);
    }
  }
  status.forEach((s) => console.log(s));
  ownerSteps.forEach((s) => console.log(`Owner step: ${s}`));
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary(kit, status, ownerSteps)}\n`);
}

main().catch((e) => {
  console.log(`::warning::Veo kit skipped: ${e.message}`);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n- Veo kit skipped: ${e.message}\n`);
});
