#!/usr/bin/env node
// Darshan inbox (owner, 20 Nov 2026: "email se automate kar do: main images aur video mail kar dunga, waha se utha le
// aur use karne lage"). The owner mails his OWN darshan photos / videos to the inbox account with a subject that starts
// with the word "Shyam" (any case): "Shyam Baidyanath dham deoghar", "Shyam chath puja", "Shyam laddu gopal". The rest
// of the subject is the place / occasion / deity, in his own words. daily.yml's evening run (.github/workflows/inbox.yml,
// no cron of its own) reads the mails, and:
//   photos (jpg/png/heic)  -> EXIF rotation, max 1080 px long side, light contrast/colour only (no AI, the deity is never
//                             altered), sharpness / size check, no close-up visitor faces -> footage/<slug>/ + licence.json
//                             (source "own"); Shyam Baba darshan photos also join the real-stills bank of
//                             scripts/shyam-darshan.mjs (licence `bank: "shyam-darshan"`).
//   videos (mp4/mov/3gp)   -> mail attachments (max 25 MB) or Google Drive links shared "Anyone with the link" (max
//                             1.5 GB, streamed to disk): autorotate, HDR tone-mapped to SDR, 30 fps; blurred / shaky
//                             stretches dropped; 12-30 s cuts at scene changes (max 4 per video); cuts with close-up
//                             visitor faces avoided; deshake, light colour, logo, 0.5 s fades, 1080x1920; original
//                             sound dropped, one licence-checked CC0 instrumental (music/library cc-*) at -14 LUFS
//                             (scripts/owner-footage.mjs prepareClip); assets of the lane's GitHub release; appended to
//                             automation/owner-footage.json, so the owner-footage lane posts ONE a day (its time, skip
//                             list automation/owner-footage-skip.txt, upload-guard cap `owner`). Real footage: no AI
//                             label (scripts/ai-disclosure.mjs).
// Then ONE Hinglish receipt per mail (what came, what it is used for, what was rejected and why) and the Gmail label
// "shyam-ingested". Drive files that are still private wait (label-less) up to `waiting_days` and are picked up as soon as
// they are shared; the receipt says how. A reply "NOT MINE" in the thread takes that mail's reels / photos out again.
// Only allowed senders (repo secret INBOX_ALLOWED_SENDERS + the inbox account itself, DKIM/SPF/DMARC checked); everyone
// else is labelled "shyam-ignored" and never answered. A mail body that says the media is someone else's is rejected.
// Nothing here ever names the inbox account or a sender in logs, commits or public files.
//
//   node scripts/inbox.mjs run [--dry-run | --deep] [--pending <file>] [--work <dir>]   read + process (--dry-run: only list
//        the mails, files and Drive access; --deep: also download and check them: watermark OCR, cut plan; no writes)
//   node scripts/inbox.mjs count                                                how many mails match (no download)
//   node scripts/inbox.mjs notify --pending <file>                              after the push: labels + receipts
//   node scripts/inbox.mjs try --subject "Shyam ..." --files a.mov,b.jpg [--out <dir>]   local preview, no mail / repo writes
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { categoryOfText, fbHashtags } from './fb.mjs';
import { PLAN_FILE, SKIP_FILE, assetName, buildSpec, checkSpec, istDate, loadPlan, prepareClip, publishedClips, skipped } from './owner-footage.mjs';
import { aiDisclosure } from './ai-disclosure.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CONFIG_FILE = path.join(ROOT, 'automation', 'inbox.json');
export const LOG_FILE = path.join(ROOT, 'automation', 'inbox-log.json');
const FOOTAGE = path.join(ROOT, 'footage');
const LOGO = path.join(ROOT, 'brand', 'logo.png');
const read = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '');
export const loadConfig = (file = CONFIG_FILE) => JSON.parse(fs.readFileSync(file, 'utf8'));
export const loadLog = (file = LOG_FILE) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { mails: {} });

// ============================================================ mail parsing

const dec64 = (d) => Buffer.from(String(d || '').replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
const walk = (p, out = []) => { if (p) { out.push(p); for (const c of p.parts || []) walk(c, out); } return out; };
export const addressOf = (s) => (String(s || '').match(/<([^<>\s]+@[^<>\s]+)>/)?.[1] || String(s || '').match(/[^\s<>",;]+@[^\s<>",;]+/)?.[0] || '').toLowerCase();
const htmlDecode = (s) => String(s || '').replace(/&amp;/g, '&').replace(/&#61;/g, '=').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

/** A Gmail API message (format=full) -> the fields the inbox needs. */
export function parseMessage(msg) {
  const headers = Object.create(null);
  for (const h of msg.payload?.headers || []) {
    const k = h.name.toLowerCase();
    headers[k] = headers[k] ? `${headers[k]}\n${h.value}` : h.value;
  }
  const parts = walk(msg.payload);
  const text = parts.filter((p) => p.mimeType === 'text/plain' && !p.filename && p.body?.data).map((p) => dec64(p.body.data)).join('\n');
  const html = parts.filter((p) => p.mimeType === 'text/html' && !p.filename && p.body?.data).map((p) => dec64(p.body.data)).join('\n');
  const attachments = parts.filter((p) => p.filename && (p.body?.attachmentId || p.body?.data)).map((p) => ({
    name: p.filename, mime: p.mimeType || '', size: Number(p.body?.size || 0), attachmentId: p.body?.attachmentId || null, data: p.body?.data || null,
  }));
  const date = Number(msg.internalDate) ? new Date(Number(msg.internalDate)) : new Date(headers.date || Date.now());
  return {
    id: msg.id, threadId: msg.threadId, labels: msg.labelIds || [],
    subject: (headers.subject || '').trim(), from: addressOf(headers.from), messageId: headers['message-id'] || null,
    date: date.toISOString(), day: istDate(date.getTime()), auth: headers['authentication-results'] || '',
    receipt: /receipt/i.test(headers['x-shyam-inbox'] || ''), text, html, attachments, drive: driveLinks(text, html),
  };
}

// Drive file ids in every form Gmail / phones produce: /file/d/<id>, open?id=, uc?id= / uc?export=download&id=,
// drive.usercontent.google.com/download?id=, docs.google.com/uc?id=, google.com/url?q=<encoded>; folders are reported.
const DRIVE_ID = /(?:drive|docs)\.google\.com\/(?:a\/[^/\s]+\/)?(?:file\/d\/|open\?(?:[^\s"'<>]*&)?id=|uc\?(?:[^\s"'<>]*&)?id=)([A-Za-z0-9_-]{20,})|drive\.usercontent\.google\.com\/(?:download|u\/\d+\/uc)\?(?:[^\s"'<>]*&)?id=([A-Za-z0-9_-]{20,})/g;
const DRIVE_FOLDER = /drive\.google\.com\/(?:drive\/(?:u\/\d+\/)?folders\/|folderview\?(?:[^\s"'<>]*&)?id=)([A-Za-z0-9_-]{20,})/g;

/**
 * Drive files of a mail: [{ id, name }] (id null = a Drive chip without a link: the phone's upload never finished),
 * plus { folder: true } entries. Names come from Gmail's Drive chips (title="IMG_2305.mov") or the text part.
 */
export function driveLinks(text = '', html = '') {
  const norm = (s) => { let t = htmlDecode(s); for (let i = 0; i < 2; i++) { try { t = t.replace(/%[0-9A-Fa-f]{2}/g, (m) => decodeURIComponent(m)); } catch { /* keep */ } } return t; };
  const out = new Map();
  const add = (id, name = null) => { if (!out.has(id)) out.set(id, { id, name }); else if (name && !out.get(id).name) out.get(id).name = name; };
  // Gmail Drive chips in the HTML: one per file, a title with the name, a link only when the upload finished
  const chips = String(html).split(/class="[^"]*gmail_drive_chip(?:\s[^"]*)?"/).slice(1);
  let missing = 0;
  for (const chip of chips) {
    const name = htmlDecode(chip.match(/title="([^"]+)"/)?.[1] || '') || null;
    const ids = [...norm(chip).matchAll(DRIVE_ID)].map((m) => m[1] || m[2]);
    if (ids.length) add(ids[0], name);
    else out.set(`missing-${++missing}`, { id: null, name });
  }
  // every other link, text and HTML (the text part repeats the chips as "<url>\r\nNAME\r\n<url>")
  const body = norm(`${text}\n${html}`);
  for (const m of body.matchAll(DRIVE_ID)) add(m[1] || m[2]);
  for (const m of norm(text).matchAll(/<?https?:\/\/(?:drive|docs)\.google\.com\/\S*?(?:file\/d\/|id=)([A-Za-z0-9_-]{20,})\S*?>?\s*\r?\n([^\r\n<>]+\.[A-Za-z0-9]{2,5})\s*\r?\n/g)) add(m[1], m[2].trim());
  // text-only chips ("[image: Video file]\r\nNAME" with no link) when the HTML had none
  if (!chips.length) {
    for (const m of String(text).matchAll(/\[image: [^\]]*file\]\s*\r?\n(?!<?https?:)([^\r\n<>]+\.[A-Za-z0-9]{2,5})\s*\r?\n(?!<?https?:)/g)) {
      if (![...out.values()].some((f) => f.name === m[1].trim())) out.set(`missing-${++missing}`, { id: null, name: m[1].trim() });
    }
  }
  for (const m of body.matchAll(DRIVE_FOLDER)) out.set(`folder-${m[1]}`, { id: m[1], name: null, folder: true });
  return [...out.values()];
}

/** The text the sender wrote (quoted replies and signatures-after-"On ... wrote:" cut off). */
export function ownText(text = '') {
  const lines = [];
  for (const l of String(text).split(/\r?\n/)) {
    if (/^\s*On .+wrote:\s*$/.test(l) || /^-{5,}\s*(Forwarded|Original) message/i.test(l)) break;
    if (/^\s*>/.test(l)) continue;
    lines.push(l);
  }
  return lines.join('\n').trim();
}

// ============================================================ sender allow-list (spam / abuse protection)

/** Allowed senders: the config list + INBOX_ALLOWED_SENDERS (comma / space separated) + the inbox account itself. */
export function allowedSenders(cfg, env = process.env, account = '') {
  return new Set([...(cfg.allowed_senders || []), ...String(env.INBOX_ALLOWED_SENDERS || '').split(/[\s,;]+/), account].map((s) => String(s).trim().toLowerCase()).filter((s) => s.includes('@')));
}

/** Gmail's Authentication-Results says the From domain really sent it (DMARC pass, or DKIM / SPF pass for that domain). */
export function authenticated(auth = '', from = '') {
  const domain = from.split('@')[1] || '';
  if (!domain) return false;
  const a = String(auth).toLowerCase().replace(/\s+/g, ' ');
  const esc = domain.replace(/\./g, '\\.');
  if (new RegExp(`dmarc=pass[^;]*header\\.from=${esc}\\b`).test(a)) return true;
  if (new RegExp(`dkim=pass[^;]*header\\.(?:i|d)=@?(?:[\\w.-]+\\.)?${esc}\\b`).test(a)) return true;
  return new RegExp(`spf=pass[^;]*smtp\\.mailfrom=[^;\\s]*@${esc}\\b`).test(a);
}

/** { ok, why } for a parsed mail: an allowed address AND (authenticated, or written by the inbox account itself). */
export function senderAllowed(m, allowed, account = '') {
  if (!m.from || !allowed.has(m.from)) return { ok: false, why: 'sender not on the allow-list' };
  if (account && m.from === account.toLowerCase() && m.labels.includes('SENT')) return { ok: true, why: 'the inbox account itself' };
  if (!authenticated(m.auth, m.from)) return { ok: false, why: 'sender not authenticated (DMARC / DKIM / SPF)' };
  return { ok: true, why: 'allowed sender, authenticated' };
}

// The body says the media is not his own (or is copied from somewhere): the whole mail is rejected.
export const NOT_OWN = /\bnot\s+mine\b|\bnot\s+my\s+(own\s+)?(video|photo|recording|clip)|someone\s+else'?s?|somebody\s+else'?s?|\bkisi\s+aur\s+(ka|ki|ke|ne)\b|\b(dusre|doosre|dusron|doosron|kisi\s+dost)\s+(ka|ki|ke|ne)\b|\bmera\s+nahi\b|\bmeri\s+nahi\b|\b(youtube|insta(gram)?|facebook|fb|reels?|whatsapp\s+status|internet|google)\s+(se|par\s+se)\s+(liya|li|download|uthaya|mila|mili)|\bdownload(ed)?\s+(kiya|ki|from)\b|\bcredits?\s*(to|:)|\bcourtesy\b|©/i;
export const RETRACT = /\bnot\s+mine\b|\bmera\s+nahi\b|\bmeri\s+nahi\b|\bkisi\s+aur\s+k[aie]\b|\bhata\s+do\b|\bremove\b|\bdelete\b/i;

// ============================================================ subject -> place / deity / slug

const FILLER = new Set(['darshan', 'darshana', 'darsan', 'ke', 'ki', 'ka', 'se', 'me', 'mein', 'main', 'aaj', 'today', 'live', 'new', 'latest', 'video', 'videos', 'photo', 'photos', 'pic', 'pics', 'image', 'images', 'clip', 'clips', 'ai', 'the', 'of', 'and', 'at', 'in', 'from', 'hd', '4k']);
const SPELL = { chath: 'chhath', chhat: 'chhath', chat: 'chhath', chhatt: 'chhath', dhaam: 'dham', baidhyanath: 'baidyanath', vaidhyanath: 'vaidyanath', baijnath: 'baijnath', ladoo: 'laddu', laddoo: 'laddu', ladu: 'laddu', ganpati: 'ganpati', pooja: 'puja' };
// words that name a deity / form, not a place
const DEITY_WORDS = new Set(['shyam', 'baba', 'ji', 'shri', 'shree', 'sri', 'laddu', 'gopal', 'kanha', 'krishna', 'radha', 'bihari', 'thakur', 'shiv', 'shiva', 'mahadev', 'bholenath', 'bhole', 'hanuman', 'bajrang', 'bajrangbali', 'balaji', 'ganesh', 'ganpati', 'vinayak', 'mata', 'maa', 'maiya', 'durga', 'devi', 'rani', 'ram', 'sita', 'lakshmi', 'vishnu', 'narayan', 'surya', 'shani', 'bhairav', 'prabhu', 'bhagwan', 'shringar', 'sringar', 'aarti', 'arti', 'jyot', 'bhog', 'murti', 'sheesh']);
// words that describe what is shown, not where (a pandal is kept in the place: "Kolkata Pandal")
const TOPIC_WORDS = new Set(['sajavat', 'kirtan', 'bhajan', 'jagran', 'mela', 'yatra', 'nishan', 'bheed', 'crowd', 'utsav', 'puja', 'abhishek', 'shobha', 'jhanki', 'pandal',
  'safed', 'white', 'gulab', 'laal', 'lal', 'red', 'rose', 'roses', 'phool', 'phoolon', 'mogra', 'peela', 'kesariya', 'hara', 'neela', 'sunehra']);
const SEPARATE_AFTER = new Set(['dham', 'mandir', 'temple', 'ghat', 'dwar', 'pandal', 'darbar', 'tirth']);
const HI = {
  baidyanath: 'बैद्यनाथ', vaidyanath: 'वैद्यनाथ', dham: 'धाम', deoghar: 'देवघर', chhath: 'छठ', puja: 'पूजा', laddu: 'लड्डू', gopal: 'गोपाल',
  baba: 'बाबा', salasar: 'सालासर', khatu: 'खाटू', shyam: 'श्याम', pandal: 'पंडाल', mandir: 'मंदिर', vrindavan: 'वृंदावन', mathura: 'मथुरा',
  kashi: 'काशी', ayodhya: 'अयोध्या', ujjain: 'उज्जैन', mahakal: 'महाकाल', kolkata: 'कोलकाता', jaipur: 'जयपुर', sikar: 'सीकर', ringas: 'रींगस',
  ganga: 'गंगा', ghat: 'घाट', aarti: 'आरती', shringar: 'श्रृंगार', jyot: 'ज्योत', darbar: 'दरबार', kirtan: 'कीर्तन', bhajan: 'भजन', radha: 'राधा',
  krishna: 'कृष्ण', kanha: 'कान्हा', hanuman: 'हनुमान', balaji: 'बालाजी', ganesh: 'गणेश', mata: 'माता', rani: 'रानी', durga: 'दुर्गा', ji: 'जी',
  shiv: 'शिव', mahadev: 'महादेव', bihari: 'बिहारी', banke: 'बांके', thakur: 'ठाकुर', mehandipur: 'मेहंदीपुर', haridwar: 'हरिद्वार', rishikesh: 'ऋषिकेश',
  prayagraj: 'प्रयागराज', patna: 'पटना', delhi: 'दिल्ली', mumbai: 'मुंबई', sajavat: 'सजावट', mela: 'मेला', ekadashi: 'एकादशी', gyaras: 'ग्यारस',
};
export const DEITIES = {
  shyam: { en: 'Shyam Baba', hi: 'श्याम बाबा', jai: 'Jai Shree Shyam', name: 'Khatu Shyam ji', tags: ['#KhatuShyam', '#JaiShreeShyam', '#ShyamBaba', '#KhatuShyamDarshan'],
    lines: ['श्याम बाबा के पावन दर्शन 🙏', 'हारे का सहारा, बाबा श्याम हमारा 🙏', 'जय श्री श्याम, बाबा के दर्शन 🙏'],
    questions: ['आपने आख़िरी बार बाबा के दर्शन कब किए थे?', 'बाबा के दर्शन करते समय आप मन में क्या माँगते हैं?', 'बाबा श्याम से आपका रिश्ता कितने साल पुराना है?'] },
  shiv: { en: 'Mahadev', hi: 'महादेव', jai: 'Har Har Mahadev', name: 'Shiv ji', tags: ['#HarHarMahadev', '#Mahadev', '#Bholenath'],
    lines: ['हर हर महादेव 🙏 पावन दर्शन', 'बम बम भोले 🙏 महादेव के दर्शन', 'ॐ नमः शिवाय 🙏'],
    questions: ['आप आख़िरी बार महादेव के दर्शन करने कब गए थे?', 'महादेव का कौन सा धाम आपको सबसे प्यारा है?', 'इन दर्शन से आपके मन में क्या भाव आया?'] },
  krishna: { en: 'Shri Krishna', hi: 'श्री कृष्ण', jai: 'Jai Shree Krishna', name: 'Shri Krishna', tags: ['#JaiShreeKrishna', '#RadheRadhe', '#Kanha'],
    lines: ['जय श्री कृष्ण 🙏 प्यारे दर्शन', 'राधे राधे 🙏 कान्हा के दर्शन', 'नंद के आनंद भयो, जय कन्हैया लाल की 🙏'],
    questions: ['आपको कान्हा का कौन सा रूप सबसे प्यारा लगता है?', 'आपके घर में ठाकुर जी कैसे विराजते हैं?', 'इन दर्शन से आपके मन में क्या भाव आया?'] },
  hanuman: { en: 'Hanuman ji', hi: 'हनुमान जी', jai: 'Jai Bajrangbali', name: 'Hanuman ji', tags: ['#JaiHanuman', '#Bajrangbali', '#Balaji'],
    lines: ['जय बजरंगबली 🙏 पावन दर्शन', 'जय श्री राम, जय हनुमान 🙏', 'संकटमोचन के दर्शन 🙏'],
    questions: ['आप हनुमान जी के दर्शन करने किस दिन जाते हैं?', 'हनुमान चालीसा की आपकी प्रिय पंक्ति कौन सी है?', 'इन दर्शन से आपके मन में क्या भाव आया?'] },
  ganesh: { en: 'Ganesh ji', hi: 'गणेश जी', jai: 'Ganpati Bappa Morya', name: 'Ganesh ji', tags: ['#GanpatiBappaMorya', '#Ganesh', '#Ganpati'],
    lines: ['गणपति बप्पा मोरया 🙏', 'विघ्नहर्ता के पावन दर्शन 🙏', 'जय श्री गणेश 🙏'],
    questions: ['आप हर शुभ काम से पहले बप्पा को कैसे याद करते हैं?', 'बप्पा का कौन सा रूप आपको सबसे प्यारा है?', 'इन दर्शन से आपके मन में क्या भाव आया?'] },
  devi: { en: 'Mata Rani', hi: 'माता रानी', jai: 'Jai Mata Di', name: 'Mata Rani', tags: ['#JaiMataDi', '#MataRani', '#Durga'],
    lines: ['जय माता दी 🙏 पावन दर्शन', 'माता रानी के दर्शन 🙏', 'सच्चे दरबार की जय 🙏'],
    questions: ['माता रानी का कौन सा धाम आपको सबसे प्यारा है?', 'आप माँ से क्या माँगते हैं?', 'इन दर्शन से आपके मन में क्या भाव आया?'] },
  ram: { en: 'Shri Ram', hi: 'श्री राम', jai: 'Jai Shree Ram', name: 'Shri Ram', tags: ['#JaiShreeRam', '#Ram', '#JaiSiyaRam'],
    lines: ['जय श्री राम 🙏 पावन दर्शन', 'सियावर रामचंद्र की जय 🙏', 'राम राम 🙏'],
    questions: ['रामायण का कौन सा प्रसंग आपको सबसे प्यारा है?', 'आप दिन में कितनी बार राम नाम लेते हैं?', 'इन दर्शन से आपके मन में क्या भाव आया?'] },
  vishnu: { en: 'Shri Hari', hi: 'श्री हरि', jai: 'Jai Shree Hari', name: 'Shri Vishnu', tags: ['#JaiShreeHari', '#Vishnu', '#Narayan'],
    lines: ['ॐ नमो भगवते वासुदेवाय 🙏', 'श्री हरि के पावन दर्शन 🙏', 'जय श्री हरि 🙏'],
    questions: ['आप एकादशी का व्रत रखते हैं?', 'श्री हरि का कौन सा नाम आप सबसे ज़्यादा जपते हैं?', 'इन दर्शन से आपके मन में क्या भाव आया?'] },
  surya: { en: 'Surya Dev', hi: 'सूर्य देव', jai: 'Jai Surya Dev', name: 'Surya Dev', tags: ['#SuryaDev', '#Surya', '#JaiSuryaDev'],
    lines: ['ॐ सूर्याय नमः 🙏', 'सूर्य देव को प्रणाम 🙏', 'जय सूर्य देव 🙏'],
    questions: ['आप सूर्य देव को रोज़ जल चढ़ाते हैं?', 'इन दर्शन से आपके मन में क्या भाव आया?', 'आपकी सुबह कैसे शुरू होती है?'] },
  shani: { en: 'Shani Dev', hi: 'शनि देव', jai: 'Jai Shani Dev', name: 'Shani Dev', tags: ['#ShaniDev', '#JaiShaniDev', '#Shani'],
    lines: ['जय शनि देव 🙏', 'शनि देव के दर्शन 🙏', 'ॐ शं शनैश्चराय नमः 🙏'],
    questions: ['आप शनिवार को क्या करते हैं?', 'इन दर्शन से आपके मन में क्या भाव आया?', 'आप शनि देव के दर्शन कहाँ करते हैं?'] },
  bhairav: { en: 'Kaal Bhairav', hi: 'काल भैरव', jai: 'Jai Kaal Bhairav', name: 'Kaal Bhairav', tags: ['#KaalBhairav', '#Bhairav', '#JaiKaalBhairav'],
    lines: ['जय काल भैरव 🙏', 'काल भैरव के दर्शन 🙏', 'जय बाबा भैरवनाथ 🙏'],
    questions: ['इन दर्शन से आपके मन में क्या भाव आया?', 'आप भैरव बाबा के दर्शन कहाँ करते हैं?', 'आपके शहर में भैरव मंदिर कहाँ है?'] },
};
// Festivals named in a subject: festival footage (not a deity still for any bank).
export const FESTIVALS = [
  { re: /\bchhath\b/, key: 'chhath', en: 'Chhath Puja', hi: 'छठ पूजा', jai: 'Jai Chhathi Maiya', name: 'Chhathi Maiya aur Surya Dev', tags: ['#ChhathPuja', '#ChhathiMaiya', '#Chhath'],
    lines: ['छठी मैया की जय 🙏 छठ पूजा के पावन पल', 'छठ पूजा, आस्था का महापर्व 🙏', 'उगते सूर्य को अर्घ्य, जय छठी मैया 🙏'],
    questions: ['आप छठ पूजा कहाँ मनाते हैं?', 'छठ का कौन सा पल आपको सबसे प्यारा लगता है?', 'छठ के गीतों में आपका प्रिय गीत कौन सा है?'] },
  { re: /\b(diwali|deepawali|dipawali)\b/, key: 'diwali', en: 'Diwali', hi: 'दीपावली', jai: 'Shubh Deepawali', name: 'Maa Lakshmi', tags: ['#Diwali', '#ShubhDeepawali', '#MaaLakshmi'],
    lines: ['शुभ दीपावली 🪔', 'दीपों का पावन पर्व 🪔', 'माँ लक्ष्मी की कृपा बनी रहे 🪔'],
    questions: ['आपके घर दीपावली पर क्या ख़ास होता है?', 'दीपावली की आपकी सबसे प्यारी याद कौन सी है?', 'आप कितने दीये जलाते हैं?'] },
  { re: /\bholi\b/, key: 'holi', en: 'Holi', hi: 'होली', jai: 'Radhe Radhe', name: 'Radha Krishna', tags: ['#Holi', '#RadheRadhe', '#HoliHai'],
    lines: ['होली के रंग, भक्ति के संग 🙏', 'रंगों का पावन पर्व 🙏', 'राधे राधे, होली है 🙏'],
    questions: ['आपकी होली कहाँ मनती है?', 'होली की आपकी सबसे प्यारी याद कौन सी है?', 'आप होली पर कौन सा भजन गाते हैं?'] },
  { re: /\b(navratri|navratra|durga\s+puja)\b/, key: 'navratri', en: 'Navratri', hi: 'नवरात्रि', jai: 'Jai Mata Di', name: 'Maa Durga', tags: ['#Navratri', '#JaiMataDi', '#MaaDurga'],
    lines: ['जय माता दी 🙏 नवरात्रि के पावन दिन', 'माँ दुर्गा के दर्शन 🙏', 'शेरावाली की जय 🙏'],
    questions: ['आप नवरात्रि में व्रत रखते हैं?', 'माँ का कौन सा रूप आपको सबसे प्यारा है?', 'इन दर्शन से आपके मन में क्या भाव आया?'] },
  { re: /\b(janmashtami|janmasthami)\b/, key: 'janmashtami', en: 'Janmashtami', hi: 'जन्माष्टमी', jai: 'Jai Shree Krishna', name: 'Shri Krishna', tags: ['#Janmashtami', '#JaiShreeKrishna', '#Kanha'],
    lines: ['नंद के आनंद भयो 🙏', 'जन्माष्टमी के पावन पल 🙏', 'जय कन्हैया लाल की 🙏'],
    questions: ['आपके घर जन्माष्टमी कैसे मनती है?', 'कान्हा का कौन सा रूप आपको सबसे प्यारा है?', 'आप कान्हा को क्या भोग लगाते हैं?'] },
  { re: /\b(shivratri|mahashivratri)\b/, key: 'shivratri', en: 'Mahashivratri', hi: 'महाशिवरात्रि', jai: 'Har Har Mahadev', name: 'Shiv ji', tags: ['#Mahashivratri', '#HarHarMahadev', '#Mahadev'],
    lines: ['हर हर महादेव 🙏 महाशिवरात्रि', 'बम बम भोले 🙏', 'ॐ नमः शिवाय 🙏'],
    questions: ['आप शिवरात्रि पर क्या करते हैं?', 'महादेव का कौन सा धाम आपको सबसे प्यारा है?', 'इन दर्शन से आपके मन में क्या भाव आया?'] },
  { re: /\b(phalgun|lakkhi)\s+mela\b|\bnishan\s+yatra\b/, key: 'phalgun-mela', en: 'Phalgun Mela', hi: 'फाल्गुन मेला', jai: 'Jai Shree Shyam', name: 'Khatu Shyam ji', tags: ['#KhatuShyamMela', '#PhalgunMela', '#JaiShreeShyam'],
    lines: ['जय श्री श्याम 🙏 फाल्गुन मेले की रौनक', 'निशान लेकर चले श्याम के भक्त 🙏', 'हारे का सहारा, बाबा श्याम हमारा 🙏'],
    questions: ['आप फाल्गुन मेले में कितनी बार गए हैं?', 'आपका निशान कितने किलोमीटर चला?', 'मेले की आपकी सबसे प्यारी याद कौन सी है?'] },
];
// A famous temple is claimed ONLY when the subject names it: every distinctive word of the temple's key or of one of its
// aliases (footage/temples.json), or one of these unambiguous names.
const TEMPLE_ALIASES = { baidyanath: 'baidyanath-dham', vaidyanath: 'baidyanath-dham', salasar: 'salasar-balaji', khatu: 'khatu-shyam-mandir' };
const TEMPLE_TITLES = {
  'baidyanath-dham': { en: 'Baba Baidyanath Dham', hi: 'बाबा बैद्यनाथ धाम', deity: 'shiv', name: 'Shiv ji (Baba Baidyanath)' },
  'khatu-shyam-mandir': { en: 'Khatu Shyam ji', hi: 'खाटू श्याम जी', deity: 'shyam', name: 'Khatu Shyam ji' },
  'salasar-balaji': { en: 'Salasar Balaji', hi: 'सालासर बालाजी', deity: 'hanuman', name: 'Salasar Balaji (Hanuman ji)' },
};
const GENERIC = /^(mandir|temple|dham|mata|ji|devi|shri|shree|sri|baba|darshan|dadi|the|of|and|jyotirlinga|kovil|sun|maa)$/;
let templesCache = null;
const loadTemples = () => (templesCache ||= JSON.parse(fs.readFileSync(path.join(FOOTAGE, 'temples.json'), 'utf8')));

export function templeOf(words, temples = loadTemples()) {
  const have = new Set(words);
  for (const w of words) if (TEMPLE_ALIASES[w] && temples[TEMPLE_ALIASES[w]]) return TEMPLE_ALIASES[w];
  for (const [key, t] of Object.entries(temples)) {
    if (key.startsWith('_')) continue;
    for (const name of [key, ...(t.aliases || [])]) {
      const need = name.split('-').filter((w) => w.length > 2 && !GENERIC.test(w));
      if (need.length >= (name === key ? 1 : 1) && need.every((w) => have.has(w)) && (need.length > 1 || need[0].length >= 6)) return key;
    }
  }
  return null;
}

const title = (w) => (w.length <= 2 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1));
export const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/**
 * The subject: { ok, rest, label (owner's words, formatted), kind: shyam | deity | temple | festival, deity (DEITIES key),
 * temple (footage/temples.json key or null), festival, place (null = not named), city, slug, en, hi, jai, bank }.
 */
export function parseSubject(subject, { temples } = {}) {
  const s = String(subject || '').replace(/\s+/g, ' ').trim();
  const m = s.match(/^shyam(?![\p{L}\p{N}])[\s:,.\-–|]*(.*)$/iu);
  if (!m) return { ok: false, why: 'subject does not start with the word "Shyam"' };
  const rest = m[1].trim();
  const raw = rest.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean).map((w) => SPELL[w] || w);
  const words = raw.filter((w) => !FILLER.has(w));
  const ascii = words.filter((w) => /^[a-z0-9]+$/.test(w));
  const joined = words.join(' ');
  const fest = FESTIVALS.find((f) => f.re.test(joined)) || null;
  const temple = fest ? null : templeOf(ascii, temples || loadTemples());
  const tt = temple ? TEMPLE_TITLES[temple] : null;
  const catKey = categoryOfText(joined)?.[0] || null;
  const deity = tt?.deity || (catKey === 'khatu' || !catKey ? 'shyam' : DEITIES[catKey] ? catKey : 'shyam');
  // label: the owner's words, title-cased, "Baidyanath Dham, Deoghar"
  const fmt = (ws) => { const out = []; ws.forEach((w, i) => { out.push(title(w)); if (SEPARATE_AFTER.has(w) && i < ws.length - 1) out.push(','); }); return out.join(' ').replace(/ ,/g, ',') || null; };
  const label = fmt(words);
  const deityOnly = words.length > 0 && words.every((w) => DEITY_WORDS.has(w) || TOPIC_WORDS.has(w));
  const kind = fest ? 'festival' : temple ? 'temple' : words.length && deity !== 'shyam' ? 'deity' : 'shyam';
  const placeWords = words.filter((w) => !DEITY_WORDS.has(w) && (!TOPIC_WORDS.has(w) || w === 'pandal'));
  const place = fest ? null : placeWords.some((w) => w !== 'pandal') ? fmt(placeWords) : placeWords.length ? `${DEITIES[deity].en} pandal` : null;
  const city = place && place.includes(',') ? place.split(',').slice(1).join(',').trim() : null;
  const head = place && place.includes(',') ? place.split(',')[0].trim() : place;
  const hiOf = (txt) => { const ws = String(txt || '').toLowerCase().split(/[\s,]+/).filter(Boolean); return ws.length && ws.every((w) => HI[w]) ? ws.map((w) => HI[w]).join(' ') : null; };
  const D = DEITIES[deity];
  let en; let hi;
  if (fest) { en = fest.en; hi = fest.hi; }
  else if (tt) { en = tt.en; hi = tt.hi; }
  else if (kind === 'deity' && deityOnly && words.every((w) => DEITY_WORDS.has(w))) { en = label; hi = hiOf(label) || D.hi; }
  else if (placeWords.length === 1 && placeWords[0] === 'pandal') { en = `${D.en} Pandal`; hi = `${D.hi} पंडाल`; }
  else { en = D.en; hi = D.hi; }
  const slugWords = (words.length ? ascii : ['shyam', 'baba']).concat(fest || ascii.includes('darshan') ? [] : ['darshan']);
  if (kind === 'shyam' && !slugWords.includes('shyam')) slugWords.unshift('shyam');
  return {
    ok: true, rest, words, label, kind, deity, temple, festival: fest?.key || null, place, head, city, deity_only: deityOnly,
    place_named: placeWords.some((w) => w !== 'pandal'), en, hi, head_hi: head ? hiOf(head) : null, jai: fest?.jai || D.jai, deity_name: fest?.name || tt?.name || (kind === 'deity' && label ? `${label} (${D.name})` : D.name),
    slug: `${slugify(slugWords.join(' ')) || 'shyam-baba-darshan'}-own`,
    pandal: /\bpandal\b/.test(joined),
    // a Shyam Baba darshan picture (not a festival / other deity): joins the real-stills bank of scripts/shyam-darshan.mjs
    bank: deity === 'shyam' && !fest,
  };
}

/** The place for licence.json ("unknown — set by owner" when the subject names none) and its display form. */
export function placeOf(subj) {
  return {
    place: subj.place || 'unknown — set by owner',
    place_label: subj.place || (subj.kind === 'shyam' ? 'Shyam Baba darshan (owner recording)' : `${subj.en} (owner recording)`),
    ...(subj.festival ? { occasion: subj.en } : {}),
  };
}

// ============================================================ file rules

export const extOf = (name) => String(name || '').toLowerCase().match(/\.([a-z0-9]{2,5})$/)?.[1] || '';

/** { kind: photo | video | null, ok, why } for one attachment / Drive file. `drive` = Drive link (bigger limit). */
export function classifyFile({ name, mime = '', size = 0 }, cfg, { drive = false } = {}) {
  const ext = extOf(name);
  const kind = cfg.photo.types.includes(ext) || (/^image\//.test(mime) && !ext) ? 'photo' : cfg.video.types.includes(ext) || (/^video\//.test(mime) && !ext) ? 'video' : null;
  if (!kind) return { kind: null, ok: false, why: `file type .${ext || '?'} nahi chalta (photo: ${cfg.photo.types.join('/')}, video: ${cfg.video.types.join('/')})` };
  const mb = size / 1e6;
  const limit = drive ? cfg.max_drive_mb : cfg.max_attachment_mb;
  if (size && mb > limit) return { kind, ok: false, why: `${mb.toFixed(0)} MB hai, limit ${limit} MB${drive ? '' : ' (Gmail attachment)'}` };
  return { kind, ok: true, why: '' };
}

// ============================================================ other people's marks (OCR texts from inbox_media.py marks)

const PLATFORM = /\b(instagram|tik\s?tok|sharechat|snapchat|likee|roposo|takatak|youtube\.com|facebook\.com|fb\.watch)\b/i;
/**
 * { checked, foreign, handle, platform }: an "@handle" seen in 2+ sampled frames (1 for a photo / a 1-frame list) or a
 * platform name anywhere = someone else's video / photo (a downloaded reel). Our own channel's handle does not count.
 */
export function marksVerdict(m) {
  if (!m || !m.ocr) return { checked: false, foreign: false, handle: null, platform: null };
  const seen = new Map();
  let platform = null;
  for (const t of m.texts || []) {
    const hs = new Set((String(t).match(/@[A-Za-z0-9_.]{4,30}/g) || []).map((h) => h.toLowerCase().replace(/[._]+$/, '')).filter((h) => !/^@shyampremi/.test(h)));
    for (const h of hs) seen.set(h, (seen.get(h) || 0) + 1);
    if (!platform) platform = String(t).match(PLATFORM)?.[1]?.toLowerCase() || null;
  }
  const need = Math.min(2, (m.texts || []).length || 1);
  const handle = [...seen.entries()].sort((a, b) => b[1] - a[1]).find(([, n]) => n >= need)?.[0] || null;
  return { checked: true, foreign: Boolean(handle || platform), handle, platform };
}

// ============================================================ video cut planner (pure: numbers from scripts/inbox_media.py)

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : 0; };
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))] : 0; };

/**
 * Cuts of one video from its samples ({t, sharp, shift, scene, faces}, 4 a second):
 *  - a sample is usable when it is not blurred (sharpness >= max(blur_abs, blur_rel x the video's 75th percentile)) and
 *    the camera is not jerking (median shift over ~2 s <= shake_px); gaps up to bridge_s are bridged (deshake fixes those)
 *  - usable stretches under min_cut are dropped (the shaky start / end goes this way)
 *  - longer stretches are split into min_cut..max_cut cuts at the strongest scene change in the allowed window
 *  - cuts where close-up visitor faces show in more than face_share of the samples are dropped when a face-free cut exists;
 *    when every cut has them the video is held (privacy)
 * Returns { cuts: [{start, end, seconds, faces}], dropped: [{start, end, why}], held: bool, why }.
 */
export function planCuts(a, v) {
  const S = a.samples || [];
  if (!S.length) return { cuts: [], dropped: [], held: false, why: 'video padh nahi paaye' };
  const step = S.length > 1 ? (S.at(-1).t - S[0].t) / (S.length - 1) : 0.25;
  const thr = Math.max(v.blur_abs, v.blur_rel * pct(S.map((x) => x.sharp), 0.75));
  const half = Math.max(1, Math.round(1 / step)); // ~1 s each side: phase correlation is noisy on garlands, one spike is no shake
  const good = S.map((x, i) => x.sharp >= thr && median(S.slice(Math.max(0, i - half), i + half + 1).map((y) => y.shift)) <= v.shake_px);
  const gap = Math.round((v.bridge_s ?? 2) / step);
  // runs of usable samples, bridging short gaps (deshake and the cut's own fades smooth those)
  const runs = [];
  let start = -1; let last = -1;
  good.forEach((g, i) => {
    if (!g) return;
    if (start < 0) start = i;
    else if (i - last > gap) { runs.push([start, last]); start = i; }
    last = i;
  });
  if (start >= 0) runs.push([start, last]);
  const dropped = [];
  const cuts = [];
  const end = (i) => Math.min(a.duration || S.at(-1).t + step, S[i].t + step);
  for (const [i0, i1] of runs) {
    const s = S[i0].t; const e = end(i1);
    if (e - s < v.min_cut) { dropped.push({ start: s, end: +e.toFixed(2), why: `sirf ${(e - s).toFixed(1)} s saaf hissa` }); continue; }
    let cur = s;
    while (e - cur > v.max_cut) {
      const lo = cur + v.min_cut; const hi = Math.min(cur + v.max_cut, e - v.min_cut);
      const cand = S.filter((x) => x.t >= lo && x.t <= hi);
      const best = cand.reduce((b, x) => (!b || x.scene > b.scene + 1e-9 || (Math.abs(x.scene - b.scene) <= 1e-9 && Math.abs(x.t - (cur + 22)) < Math.abs(b.t - (cur + 22))) ? x : b), null);
      const t = best ? best.t : Math.min(cur + v.max_cut, e - v.min_cut);
      cuts.push([cur, t]); cur = t;
    }
    cuts.push([cur, e]);
  }
  const withFaces = cuts.map(([s, e]) => {
    const inCut = S.filter((x) => x.t >= s && x.t < e);
    const faceShare = inCut.length ? inCut.filter((x) => x.faces > 0).length / inCut.length : 0;
    return { start: +s.toFixed(2), end: +e.toFixed(2), seconds: +(e - s).toFixed(2), faces: faceShare > v.face_share };
  });
  const clean = withFaces.filter((c) => !c.faces);
  const faceCuts = withFaces.filter((c) => c.faces);
  if (withFaces.length && !clean.length) return { cuts: [], dropped: [...dropped, ...faceCuts.map((c) => ({ ...c, why: 'logon ke chehre paas se' }))], held: true, why: 'har hisse mein logon ke chehre paas se dikh rahe hain' };
  for (const c of faceCuts) dropped.push({ start: c.start, end: c.end, why: 'logon ke chehre paas se' });
  const keep = clean.slice(0, v.max_cuts_per_video);
  for (const c of clean.slice(v.max_cuts_per_video)) dropped.push({ start: c.start, end: c.end, why: `ek video se max ${v.max_cuts_per_video} reels` });
  return { cuts: keep, dropped, held: false, why: keep.length ? '' : 'koi 12 s ka saaf (bina hilta / dhundhla) hissa nahi mila' };
}

// ============================================================ queue (automation/owner-footage.json)

export const nextId = (plan) => String(Math.max(0, ...plan.clips.map((c) => Number(c.id) || 0)) + 1).padStart(2, '0');

/** Licence-checked CC0 instrumentals (music/library cc-*), the least used in the queue first (ties: by id). */
export function pickMusic(plan, ids, offset = 0) {
  const use = new Map(ids.map((id) => [id, 0]));
  plan.clips.forEach((c, i) => { if (use.has(c.music)) use.set(c.music, use.get(c.music) + 1 + i / 1000); });
  const sorted = [...use.entries()].sort((x, y) => x[1] - y[1] || x[0].localeCompare(y[0])).map(([id]) => id);
  if (!sorted.length) throw new Error('no licence-checked cc-* instrumental in music/library');
  return sorted[offset % sorted.length];
}

const VARIANTS = {
  temple: [['Darshan', 'दर्शन'], ['Ke Pavan Darshan', 'के पावन दर्शन'], ['Ki Jhanki', 'की झांकी'], ['Ke Divya Darshan', 'के दिव्य दर्शन']],
  deity: [['Darshan', 'के दर्शन'], ['Ke Pavan Darshan', 'के पावन दर्शन'], ['Ki Jhanki', 'की झांकी'], ['Ke Divya Darshan', 'के दिव्य दर्शन']],
  festival: [['Ki Jhalak', 'की झलक'], ['Ke Pavan Pal', 'के पावन पल'], ['Ki Ronak', 'की रौनक'], ['Ka Utsav', 'का उत्सव']],
};
const clampTitle = (t) => (t.length <= 100 ? t : t.replace(/ \| [^|]+ \| /, ' | '));

/** One queue entry for a reel of a mail (texts honest: the owner's own recording, the place only as he named it). */
export function makeClip(subj, { id, music, variant = 0, day, mail, source, seconds }) {
  const name = `${subj.slug.replace(/-own$/, '')}-${id}`;
  const D = DEITIES[subj.deity];
  const F = subj.festival ? FESTIVALS.find((f) => f.key === subj.festival) : null;
  const V = (subj.festival ? VARIANTS.festival : subj.kind === 'temple' ? VARIANTS.temple : VARIANTS.deity)[variant % 4];
  const city = subj.kind === 'temple' && subj.city ? `, ${subj.city}` : '';
  const placeEn = (subj.kind === 'deity' || subj.kind === 'shyam') && subj.place_named ? `, ${subj.place}` : '';
  const youtube_title = clampTitle(`${subj.en} ${V[0]}${city}${placeEn} | ${subj.hi} ${V[1]} | ${subj.jai} #Shorts`);
  const lines = F?.lines || D.lines; const qs = F?.questions || D.questions;
  const where = subj.place ? ` (${subj.place})` : '';
  const what = subj.festival ? 'video' : 'darshan video';
  const tags = (F?.tags || D.tags).slice(0, 4);
  if (subj.temple && !F && tags.length < 5) { const t = `#${subj.temple.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join('')}`; if (!tags.includes(t)) tags.push(t); }
  const clip = {
    id, file: `${id}-${subj.slug}.mp4`, name, music,
    title: youtube_title,
    line: lines[variant % lines.length],
    roman: `${subj.label || subj.en} ${subj.festival ? 'ke pavan pal' : 'ke darshan'}.`,
    question: qs[variant % qs.length],
    source: 'inbox', added: day, mail, from_file: source, seconds,
    deity: subj.deity_name, deity_key: subj.deity, kind: subj.kind, place: subj.place || null, ...(subj.festival ? { festival: subj.festival } : {}),
    temple: subj.temple || (subj.deity === 'shyam' ? 'khatu-shyam-mandir' : null),
    tags,
    credit_yt: `Ye asli ${what} hai: Shyam Premi SN ne khud record kiya${where}.`,
    credit_ig: `${subj.festival ? 'Video' : 'Darshan'}: Shyam Premi SN ne khud record kiya${where} 🙏`,
    credit_fb: subj.festival ? 'ये वीडियो Shyam Premi SN ने खुद रिकॉर्ड किया है।' : 'ये दर्शन Shyam Premi SN ने खुद रिकॉर्ड किए हैं।',
    youtube_tags: [...new Set([subj.label, subj.en, `${subj.en} darshan`, subj.hi, D.en, D.hi, subj.jai, 'Shyam Premi SN'].filter(Boolean))].join(', '),
    ...(subj.deity === 'shyam' && !subj.festival ? {} : { playlist: null }),
  };
  return clip;
}

/** Finishes a clip against buildSpec / checkSpec: the Facebook hashtags from fb.mjs for its subject. Returns problems. */
export function finishClip(plan, clip, { track, day = '2026-12-01', otherPlaylist = null } = {}) {
  if (clip.playlist === null && otherPlaylist) clip.playlist = otherPlaylist;
  const probe = { ...plan, clips: [...plan.clips.filter((c) => c.id !== clip.id), clip] };
  const spec = buildSpec(probe, clip.id, day, { track });
  clip.fb_tags = fbHashtags({ ...spec, facebook_caption: '', instagram_caption: '', youtube_description: '' });
  const spec2 = buildSpec(probe, clip.id, day, { track }); // clip (same object) now has its Facebook tags
  const ai = aiDisclosure(spec2);
  const problems = checkSpec(spec2);
  if (ai.youtube || ai.meta) problems.push('real footage + CC0 music must carry no AI flag');
  return problems;
}

/** The plan with the clips appended (ids must be new). */
export function appendClips(plan, clips) {
  const have = new Set(plan.clips.map((c) => c.id));
  const names = new Set(plan.clips.map((c) => c.name));
  for (const c of clips) {
    if (have.has(c.id) || names.has(c.name)) throw new Error(`clip ${c.id} / ${c.name} already in the plan`);
    have.add(c.id); names.add(c.name);
  }
  return { ...plan, clips: [...plan.clips, ...clips] };
}

/** How many clips are still waiting (not published, not skipped) before position `index`. */
export function queuedBefore(plan, { log = '', pub = '', skip = '', index = plan.clips.length } = {}) {
  const done = publishedClips(plan, { log, pub });
  const sk = skipped(skip);
  return plan.clips.slice(0, index).filter((c) => !done.has(c.id) && !sk.has(c.id)).length;
}

// ============================================================ stills

/** Where a still goes and its licence.json. */
export function stillTarget(subj, { mail, day, k, src, size, faces }) {
  const dir = subj.temple && subj.temple !== 'khatu-shyam-mandir' ? subj.temple : subj.slug;
  const base = `${subj.temple && subj.temple !== 'khatu-shyam-mandir' ? 'own-' : ''}${day.replace(/-/g, '')}-${mail.slice(-6)}-${String(k).padStart(2, '0')}`;
  const P = placeOf(subj);
  const who = subj.place ? subj.place : subj.kind === 'shyam' ? 'Shyam Baba' : subj.en;
  const label = `Asli ${subj.festival ? 'photo' : 'darshan'}: ${who}, Shyam Premi SN`;
  const kind = /\b(safed|white|mogra|jasmine)\b/.test(subj.words.join(' ')) ? 'safed' : /\b(gulab|laal|lal|red|rose)\b/.test(subj.words.join(' ')) ? 'gulab' : /\bjyot\b/.test(subj.words.join(' ')) ? 'jyot' : null;
  const licence = {
    source: 'own', author: 'Shyam Premi SN', licence: 'own',
    attribution: `Asli ${subj.festival ? 'photo' : 'darshan'}: ${who}, Shyam Premi SN ne khud record kiya`,
    label: label.length <= 60 ? label : `Asli darshan, Shyam Premi SN`,
    url: '', recorded_by: 'Shyam Premi SN', ...P, date: day,
    deity: subj.deity_name, ...(kind ? { kind } : {}), view: 'unknown',
    ...(subj.bank ? { bank: 'shyam-darshan', deity_face: !/\b(jyot|sajavat|bhajan|kirtan|bheed|crowd|nishan|yatra|mela)\b/.test(subj.words.join(' ')), pandal: subj.pandal } : {}),
    focus: { x: 0.5, y: 0.45 }, size,
    from: `owner mail ${day}, file ${src}`,
    processing: 'EXIF rotation, max 1080 px long side (Lanczos), light contrast/colour; no AI, deity unaltered; EXIF/GPS removed',
    faces: faces ? 'close-up visitor faces found' : 'no close-up visitor faces found (automatic check)',
    ai: false,
    inbox: { mail: mail.slice(-6) },
  };
  return { dir, base, licence };
}

// ============================================================ receipt (Hinglish)

const fmtDay = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const addDays = (d, n) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

/**
 * The receipt. r = { subject, day, subj, notOwn, items: [{name, kind, status, why, reels: [{id, seconds}], faces}],
 * planAt, ahead, firstDay, waitingDays, update }.
 */
export function receiptText(r) {
  const L = [];
  L.push('Jai Shree Shyam 🙏', '');
  if (r.update) L.push(`Aapke mail "${r.subject}" (${fmtDay(r.day)}) ka update:`);
  else L.push(`Aapka mail mila: "${r.subject}" (${fmtDay(r.day)}).`);
  if (r.notOwn) {
    L.push('', 'Is mail ka kuch bhi use NAHI hoga: mail mein likha hai ki ye media kisi aur ka hai / kahin se liya gaya hai.', 'Hum sirf aapki apni khud ki recording use karte hain (kisi aur ka video ya photo kabhi nahi).');
    return L.join('\n');
  }
  const s = r.subj;
  if (!r.update && r.items.some((i) => i.status !== 'rejected')) {
    if (s.festival) L.push(`Samjha: ${s.en} ka video/photo (tyohar).${s.place ? ` Jagah: ${s.place}.` : ''}`);
    else if (s.place) L.push(`Samjha: ${s.place}, ${DEITIES[s.deity].en} ke darshan (jagah aapke subject se).`);
    else L.push(`Samjha: ${s.label && s.deity_only ? s.label : DEITIES[s.deity].en} ke darshan. Jagah subject mein nahi thi, isliye "${placeOf(s).place_label}" likha jayega (naam chahiye to subject mein likhein, jaise "Shyam darshan Salasar").`);
  }
  const ok = r.items.filter((i) => i.status === 'queued' || i.status === 'bank' || i.status === 'stored');
  const bad = r.items.filter((i) => i.status === 'rejected' || i.status === 'held');
  const wait = r.items.filter((i) => i.status === 'waiting');
  L.push('', 'Kya hua:');
  for (const i of ok) {
    if (i.status === 'queued') L.push(`✓ ${i.name}: ${i.reels.length} reel${i.reels.length > 1 ? 's' : ''} bani (${i.reels.map((x) => `${Math.round(x.seconds)} s`).join(', ')}), queue no. ${i.reels.map((x) => x.id).join(', ')}${i.faces ? '; jin hisson mein logon ke chehre paas se the, wo chhod diye' : ''}${i.dropped ? `; hilta / dhundhla hissa kaat diya` : ''}`);
    if (i.status === 'bank') L.push(`✓ ${i.name}: Shyam Baba ke asli darshan photo bank mein (Shorts aur photo posts mein asli photo, AI nahi)`);
    if (i.status === 'stored') L.push(`✓ ${i.name}: asli photo ke roop mein save (${s.temple ? `${s.en} wale videos/posts mein` : 'aage ke posts ke liye'})`);
  }
  for (const i of bad) L.push(`✗ ${i.name || 'file'}: ${i.why}`);
  for (const i of wait) L.push(`⏳ ${i.name || 'Drive file'}: ${i.why}`);
  if (!r.items.length) L.push('- is mail mein koi photo / video nahi mila.');
  const reels = ok.flatMap((i) => i.reels || []);
  if (reels.length || ok.some((i) => i.status !== 'queued')) {
    L.push('', 'Kahan aur kab:');
    if (reels.length) {
      L.push(`- Reels: YouTube Shorts + Facebook + Instagram, roz ek (${r.planAt} IST). Aapki reels se pehle queue mein ${r.ahead} reel${r.ahead === 1 ? '' : 's'} hain, to lagbhag ${fmtDay(r.firstDay)} se shuru.`);
      L.push('- Video ki asli awaaz hata di (bheed / bajte gaane ka copyright); hamari apni CC0 instrumental dhun lagti hai. Asli recording hai, isliye AI label nahi lagega.');
    }
    if (ok.some((i) => i.status === 'bank' || i.status === 'stored')) L.push('- Photos: halka sa colour/contrast, 1080 px; GPS/EXIF hata diya; murti par koi AI badlav nahi.');
  }
  if (wait.some((i) => /private|Anyone/i.test(i.why || ''))) L.push('', `Private Drive files: Drive mein file kholein -> Share -> General access -> "Anyone with the link" (Viewer). Dobara mail ki zarurat nahi: agle ${r.waitingDays} din tak har shaam (5:30-11 baje IST) check hoga aur file milte hi utha lenge.`);
  L.push('', 'Zaroori: ye photo/video aapne khud record kiye hain na? Agar koi file kisi aur ki hai, isi mail ke reply mein sirf NOT MINE likh dein, hum is mail ki sab reels/photos hata denge.');
  L.push('', 'Bhejne ka tareeka: subject "Shyam ..." se shuru (jaise "Shyam Baidyanath dham deoghar"), baaki subject mein jagah / tyohar. Photo: jpg/png/heic. Video: mp4/mov. Attachment 25 MB tak; bada video Google Drive link se ("Anyone with the link", 1.5 GB tak) ya video ko 2-3 hisson mein kaat kar alag mail.');
  return L.join('\n');
}

export function retractText({ subject, clips = [], stills = 0, published = [] }) {
  const L = ['Jai Shree Shyam 🙏', '', `"${subject}" wala media hata diya:`];
  if (clips.length) L.push(`- reels ${clips.join(', ')} ab post nahi hongi (skip list)`);
  if (stills) L.push(`- ${stills} photo bank se hata di`);
  if (published.length) L.push(`- ye pehle hi post ho chuki hain, inhe YouTube / Facebook / Instagram se haath se hatana hoga: ${published.join(', ')}`);
  if (!clips.length && !stills && !published.length) L.push('- is mail ka kuch bhi use nahi hua tha.');
  return L.join('\n');
}

// ============================================================ IO: ffmpeg / python / Drive / gh

const FF = process.env.FFMPEG_PATH || 'ffmpeg';
const FP = FF.replace(/ffmpeg(\.exe)?$/, 'ffprobe$1');
const PY = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const PY_SCRIPT = path.join(ROOT, 'scripts', 'inbox_media.py');
const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, ...opts });
  if (r.status !== 0) throw new Error(`${path.basename(cmd)} failed: ${(r.stderr || r.error?.message || '').slice(-600)}`);
  return r.stdout;
};

export function probe(file) {
  const j = JSON.parse(run(FP, ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file]));
  const v = (j.streams || []).find((s) => s.codec_type === 'video');
  if (!v) throw new Error('no video stream');
  return { duration: Number(j.format?.duration || v.duration || 0), width: v.width, height: v.height, codec: v.codec_name, transfer: v.color_transfer || '', primaries: v.color_primaries || '' };
}
let zscale = null;
const hasZscale = () => (zscale ??= /\bzscale\b/.test(spawnSync(FF, ['-hide_banner', '-filters'], { encoding: 'utf8' }).stdout || ''));
export const isHdr = (p) => /smpte2084|arib-std-b67/.test(p.transfer) || (/bt2020/.test(p.primaries) && /bt2020|smpte2084|arib/.test(p.transfer));

/** Original (any phone format) -> SDR H.264, autorotated, 30 fps, long side 1920: what the planner and the cuts read. */
export function mezzanine(src, dst) {
  const p = probe(src);
  const tone = isHdr(p) && hasZscale() ? 'zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,' : '';
  run(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-map', '0:v:0', '-an', '-sn', '-dn',
    '-vf', `${tone}scale=w='if(gte(iw,ih),min(1920,iw),-2)':h='if(gte(iw,ih),-2,min(1920,ih))':flags=lanczos,fps=30,format=yuv420p,setsar=1`,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', dst]);
  return { ...p, hdr: isHdr(p), tonemapped: Boolean(tone) };
}

/** One muted 1080x1920 reel cut: deshake, light colour, logo, 0.5 s fades (like E:\SK\shyam\own-videos\make-reels.sh). */
export function encodeCut(mezz, cut, dst, { width, height }) {
  const d = cut.end - cut.start;
  const look = 'eq=saturation=1.08:contrast=1.04:brightness=0.01,unsharp=5:5:0.4';
  const portrait = height / width >= 1.6;
  const base = portrait
    ? `[0:v]scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920,deshake,${look}[b]`
    : `[0:v]deshake,split[a][f];[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=24:2,eq=brightness=-0.08[bg];[f]scale=1080:1920:force_original_aspect_ratio=decrease:flags=lanczos,${look}[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2[b]`;
  const fc = `${base};[b]setsar=1,fps=30,fade=t=in:st=0:d=0.5,fade=t=out:st=${(d - 0.5).toFixed(2)}:d=0.5[v];[1:v]scale=150:150,format=rgba,colorchannelmixer=aa=0.9[l];[v][l]overlay=W-w-40:60,format=yuv420p[o]`;
  run(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(cut.start), '-to', String(cut.end), '-i', mezz, '-i', LOGO, '-filter_complex', fc, '-map', '[o]', '-an',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', dst]);
}

export const py = (args) => JSON.parse(run(PY, [PY_SCRIPT, ...args]));

/**
 * A public Drive file: { status: 'ok', file, name, size } | { status: 'private' | 'too-big' | 'error', why }.
 * Streams to disk; handles the virus-scan page of large files (drive.usercontent.google.com ... confirm=t / uuid).
 * `probeOnly`: stop after the headers (dry run).
 */
export async function driveDownload(id, dir, { maxMb = 1500, probeOnly = false } = {}) {
  const urls = [`https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`];
  for (let attempt = 0; attempt < 3 && urls.length; attempt++) {
    const url = urls.shift();
    const r = await fetch(url, { redirect: 'follow' });
    const final = r.url || url;
    if (/accounts\.google\.com|ServiceLogin/.test(final) || r.status === 401 || r.status === 403) { r.body?.cancel(); return { status: 'private', why: 'Drive file private hai ("Anyone with the link" nahi)' }; }
    if (r.status === 404) { r.body?.cancel(); return { status: 'private', why: 'Drive file nahi mili (delete ho gayi ya private hai)' }; }
    const type = r.headers.get('content-type') || '';
    if (/text\/html/.test(type)) {
      const html = await r.text();
      if (/ServiceLogin|accounts\.google\.com\/(v3\/)?signin/.test(html)) return { status: 'private', why: 'Drive file private hai ("Anyone with the link" nahi)' };
      if (/quota|too many users/i.test(html)) return { status: 'error', why: 'Drive ki download limit (thodi der baad dobara koshish hogi)' };
      const form = html.match(/<form[^>]+action="([^"]+)"[\s\S]*?<\/form>/);
      if (form) {
        const params = new URLSearchParams();
        for (const m of form[0].matchAll(/<input[^>]+name="([^"]+)"[^>]+value="([^"]*)"/g)) params.set(m[1], htmlDecode(m[2]));
        urls.push(`${htmlDecode(form[1])}?${params}`);
        continue;
      }
      return { status: 'error', why: 'Drive ne file ki jagah page diya' };
    }
    if (!r.ok) { r.body?.cancel(); return { status: 'error', why: `Drive HTTP ${r.status}` }; }
    const cd = r.headers.get('content-disposition') || '';
    const name = decodeURIComponent(cd.match(/filename\*=UTF-8''([^;]+)/i)?.[1] || '') || cd.match(/filename="([^"]+)"/i)?.[1] || `${id}.bin`;
    const size = Number(r.headers.get('content-length') || 0);
    if (size && size / 1e6 > maxMb) { r.body?.cancel(); return { status: 'too-big', name, size, why: `${(size / 1e6).toFixed(0)} MB hai, limit ${maxMb} MB` }; }
    if (probeOnly) { r.body?.cancel(); return { status: 'ok', name, size }; }
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${id}-${name.replace(/[^\w.-]+/g, '_')}`);
    let got = 0;
    const counter = new TransformStream({ transform(chunk, ctl) { got += chunk.byteLength; if (got / 1e6 > maxMb) ctl.error(new Error('too big')); else ctl.enqueue(chunk); } });
    try { await pipeline(Readable.fromWeb(r.body.pipeThrough(counter)), fs.createWriteStream(file)); } catch (e) { fs.rmSync(file, { force: true }); return { status: e.message === 'too big' ? 'too-big' : 'error', name, why: e.message === 'too big' ? `${maxMb} MB se bada` : `download toota: ${e.message}` }; }
    return { status: 'ok', file, name, size: got };
  }
  return { status: 'error', why: 'Drive download nahi hua' };
}

// ============================================================ processing one mail

const music = () => import('../music/engine.mjs').then((m) => m.loadLibrary().filter((t) => t.id.startsWith('cc-') && t.kind === 'instrumental').map((t) => t.id));

/**
 * Processes the files of one mail into `work`. `files` = [{ key, name, path, kind }]. Writes stills into footage/,
 * returns { items, clips (not yet appended), assets (files to upload) }.
 */
export async function processFiles({ subj, mail, day, files, work, plan, cfg, musicIds, dryRun = false, writeStills = true, requireOcr = true, analyzeOnly = false }) {
  const items = []; const clips = []; const assets = [];
  // other people's marks (an "@handle" / a platform watermark): never their footage
  const foreign = (file, f, kind) => {
    const v = marksVerdict(py(['marks', file]));
    if (!v.checked && requireOcr) throw new Error('OCR (tesseract) missing: the watermark check cannot run');
    if (!v.foreign) return v.checked ? null : 'unchecked';
    items.push({ key: f.key, name: f.name, kind, status: 'rejected', why: `${kind === 'photo' ? 'photo' : 'video'} par kisi aur ka ${v.handle ? 'handle (@...)' : `${v.platform} watermark`} hai: ye aapki apni recording nahi lagti, isliye use nahi hoga` });
    return 'foreign';
  };
  let id = Number(nextId(plan));
  let k = 0;
  let reelsLeft = cfg.video.max_reels_per_mail;
  for (const f of files) {
    try {
      if (f.kind === 'photo') {
        k++;
        const t = stillTarget(subj, { mail, day, k, src: f.name, size: [0, 0], faces: false });
        const dir = path.join(FOOTAGE, t.dir);
        const out = path.join(work, `${t.base}.jpg`);
        const res = py(['still', f.path, out]);
        const fm = foreign(out, f, 'photo');
        if (fm === 'foreign') continue;
        if (Math.min(res.src_w, res.src_h) < cfg.photo.min_side) { items.push({ key: f.key, name: f.name, kind: 'photo', status: 'rejected', why: `photo bahut chhoti hai (${res.src_w}x${res.src_h}, kam se kam ${cfg.photo.min_side} px)` }); continue; }
        if (res.sharp < cfg.photo.min_sharp) { items.push({ key: f.key, name: f.name, kind: 'photo', status: 'rejected', why: 'photo dhundhli hai (focus / hilne se), use nahi hogi' }); continue; }
        if (res.faces > 0) { items.push({ key: f.key, name: f.name, kind: 'photo', status: 'held', why: 'photo mein logon ke chehre paas se dikh rahe hain (privacy), isliye use nahi ki' }); continue; }
        const lic = stillTarget(subj, { mail, day, k, src: f.name, size: [res.w, res.h], faces: false }).licence;
        if (writeStills && !dryRun) {
          fs.mkdirSync(dir, { recursive: true });
          fs.copyFileSync(out, path.join(dir, `${t.base}.jpg`));
          fs.writeFileSync(path.join(dir, `${t.base}.licence.json`), `${JSON.stringify(lic, null, 2)}\n`);
        }
        items.push({ key: f.key, name: f.name, kind: 'photo', status: subj.bank ? 'bank' : 'stored', still: path.relative(ROOT, path.join(dir, `${t.base}.jpg`)).split(path.sep).join('/') });
        continue;
      }
      // video
      if (reelsLeft <= 0) { items.push({ key: f.key, name: f.name, kind: 'video', status: 'rejected', why: `ek mail se max ${cfg.video.max_reels_per_mail} reels; ye video agle mail mein bhejein` }); continue; }
      const mezz = path.join(work, `${path.basename(f.path)}.mezz.mp4`);
      const info = mezzanine(f.path, mezz);
      const fm = foreign(mezz, f, 'video');
      if (fm === 'foreign') continue;
      const a = py(['video', mezz]);
      const p = planCuts(a, cfg.video);
      if (!p.cuts.length) { items.push({ key: f.key, name: f.name, kind: 'video', status: p.held ? 'held' : 'rejected', why: p.why }); continue; }
      if (analyzeOnly) { items.push({ key: f.key, name: f.name, kind: 'video', status: 'would queue', cuts: p.cuts, dropped: p.dropped, hdr: info.hdr, size: [info.width, info.height], seconds: info.duration, ...(fm === 'unchecked' ? { note: 'watermark check not run (no OCR here)' } : {}) }); continue; }
      const reels = [];
      for (const [i, cut] of p.cuts.slice(0, reelsLeft).entries()) {
        const cid = String(id++).padStart(2, '0');
        const clip = makeClip(subj, { id: cid, music: pickMusic({ clips: [...plan.clips, ...clips] }, musicIds), variant: clips.length + i, day, mail: mail.slice(-6), source: f.name, seconds: +cut.seconds.toFixed(1) });
        const muted = path.join(work, 'muted', clip.file);
        fs.mkdirSync(path.dirname(muted), { recursive: true });
        encodeCut(mezz, cut, muted, { width: a.w, height: a.h });
        const res = prepareClip(clip, { src: path.dirname(muted), out: path.join(work, 'out') });
        if (res.status !== 'ok') throw new Error(`prepare ${clip.id}: ${res.status} ${res.why || ''}`);
        if (res.mb > 25) throw new Error(`reel ${clip.id} is ${res.mb} MB (media Worker limit 25 MB)`);
        clips.push(clip); assets.push(res.file);
        reels.push({ id: cid, seconds: cut.seconds });
      }
      reelsLeft -= reels.length;
      items.push({ key: f.key, name: f.name, kind: 'video', status: 'queued', reels, faces: p.dropped.some((d) => /chehre/.test(d.why)), dropped: p.dropped.some((d) => !/chehre|max/.test(d.why)), hdr: info.hdr });
    } catch (e) {
      // a failure of ours (tools, network): tried again on the next runs, rejected after waiting_days
      console.error(`inbox: ${f.name}: ${e.message}`);
      items.push({ key: f.key, name: f.name, kind: f.kind, status: 'waiting', why: 'abhi process nahi ho paya; agli shaam apne aap dobara koshish hogi', error: true });
    }
  }
  return { items, clips, assets };
}

// ============================================================ the run

async function gmailApi() { return import('./inbox-gmail.mjs'); }

export async function runInbox({ dryRun = false, deep = false, pendingFile = null, work = path.join(os.tmpdir(), 'shyam-inbox'), now = Date.now() } = {}) {
  const cfg = loadConfig();
  const g = await gmailApi();
  if (!g.hasCredentials()) return { status: 'skipped', reason: 'inbox Gmail secrets are not set' };
  const account = String((await g.profile()).emailAddress || '').toLowerCase();
  const allowed = allowedSenders(cfg, process.env, account);
  const log = loadLog();
  let plan = loadPlan();
  const pending = [];
  const report = [];
  const assets = [];
  const today = istDate(now);
  const musicIds = dryRun && !deep ? [] : await music();
  if ((!dryRun || deep) && process.env.INBOX_REQUIRE_OCR !== '0' && !py(['ocr-check']).ocr) return { status: 'error', error: 'OCR (tesseract) missing: the watermark check cannot run, nothing processed' };
  const listed = await g.listMessages(cfg.query, 50);
  // oldest first, so the queue follows the order he sent them
  const msgs = [];
  for (const { id } of listed) msgs.push(parseMessage(await g.getMessage(id)));
  msgs.sort((x, y) => x.date.localeCompare(y.date));
  let handled = 0;
  for (const m of msgs) {
    const entry = log.mails[m.id];
    const who = senderAllowed(m, allowed, account);
    const short = { mail: m.id.slice(-6), subject: m.subject, day: m.day };
    if (m.receipt) { report.push({ ...short, action: 'ignore', why: 'our own receipt' }); pending.push({ id: m.id, label: cfg.label_ignored }); continue; }
    if (!who.ok) { report.push({ ...short, action: 'ignore', why: who.why }); pending.push({ id: m.id, label: cfg.label_ignored }); continue; }
    // a reply in a thread we processed: "NOT MINE" takes that mail's media out again
    if (/^\s*(re|aw)\s*:/i.test(m.subject)) {
      const orig = Object.entries(log.mails).find(([, e]) => e.thread === m.threadId);
      if (orig && RETRACT.test(ownText(m.text))) {
        report.push({ ...short, action: 'retract', of: orig[0].slice(-6) });
        if (!dryRun) {
          const r = retract(orig[1], plan);
          orig[1].retracted = today;
          pending.push({ id: m.id, label: cfg.label_done, reply: { to: m.from, subject: m.subject, text: retractText({ subject: orig[1].subject, ...r }), threadId: m.threadId, inReplyTo: m.messageId } });
        }
      } else { report.push({ ...short, action: 'ignore', why: 'a reply without NOT MINE' }); pending.push({ id: m.id, label: cfg.label_ignored }); }
      continue;
    }
    const subj = parseSubject(m.subject);
    if (!subj.ok) { report.push({ ...short, action: 'ignore', why: subj.why }); pending.push({ id: m.id, label: cfg.label_ignored }); continue; }
    if (handled >= cfg.max_mails_per_run) { report.push({ ...short, action: 'later', why: `max ${cfg.max_mails_per_run} mails a run` }); continue; }
    handled++;
    const e = entry || { subject: m.subject, day: m.day, thread: m.threadId, first_seen: today, subj: { kind: subj.kind, deity: subj.deity, place: subj.place, festival: subj.festival, temple: subj.temple, slug: subj.slug }, files: {}, clips: [], stills: [], receipts: 0 };
    const notOwn = NOT_OWN.test(ownText(m.text)) ? 'the mail says the media is not his own' : null;
    // the files: attachments + Drive links
    const want = [];
    for (const a of m.attachments) want.push({ key: `att:${a.name}:${a.size}`, name: a.name, src: 'att', a, cls: classifyFile(a, cfg) });
    for (const d of m.drive) {
      if (d.folder) { want.push({ key: `folder:${d.id}`, name: 'Drive folder', src: 'folder' }); continue; }
      if (!d.id) { want.push({ key: `nolink:${d.name}`, name: d.name, src: 'nolink' }); continue; }
      want.push({ key: `drive:${d.id}`, name: d.name, src: 'drive', d, cls: d.name ? classifyFile({ name: d.name }, cfg, { drive: true }) : null });
    }
    const items = [];
    const toProcess = [];
    for (const w of want.slice(0, cfg.max_files_per_mail)) {
      const prev = e.files[w.key];
      if (prev && prev.status !== 'waiting') continue; // done before (queued / bank / rejected)
      if (notOwn) { items.push({ key: w.key, name: w.name, status: 'rejected', why: 'mail ke hisaab se aapki apni recording nahi' }); continue; }
      if (w.src === 'folder') { items.push({ key: w.key, name: w.name, status: 'rejected', why: 'Drive folder ka link nahi chalta; har file ka alag link bhejein' }); continue; }
      if (w.src === 'nolink') { items.push({ key: w.key, name: w.name, status: 'rejected', why: 'mail mein iska Drive link nahi aaya (phone se upload poora nahi hua tha). Dobara bhejein' }); continue; }
      if (w.cls && !w.cls.ok) { items.push({ key: w.key, name: w.name, status: 'rejected', why: w.cls.why }); continue; }
      toProcess.push(w);
    }
    for (const w of want.slice(cfg.max_files_per_mail)) items.push({ key: w.key, name: w.name, status: 'rejected', why: `ek mail mein max ${cfg.max_files_per_mail} files` });
    if (dryRun && !deep) {
      for (const w of toProcess) {
        if (w.src === 'drive') {
          const pr = await driveDownload(w.d.id, null, { maxMb: cfg.max_drive_mb, probeOnly: true });
          const cls = pr.name ? classifyFile({ name: pr.name, size: pr.size }, cfg, { drive: true }) : null;
          items.push({ key: w.key, name: pr.name || w.name, status: pr.status === 'ok' ? (cls?.ok ? `would process (${cls.kind}, ${(pr.size / 1e6).toFixed(0)} MB)` : 'rejected') : pr.status === 'private' ? 'waiting' : 'rejected', why: pr.status === 'ok' ? cls?.why || '' : pr.why });
        } else items.push({ key: w.key, name: w.name, status: `would process (${w.cls.kind}, ${(w.a.size / 1e6).toFixed(1)} MB)` });
      }
      report.push({ ...short, action: 'process', notOwn, subject: { kind: subj.kind, deity: subj.deity, place: subj.place, festival: subj.festival, temple: subj.temple, slug: subj.slug, label: subj.label, bank: subj.bank }, files: items.map(({ name, status, why }) => ({ name, status, ...(why ? { why } : {}) })), sample_title: makeClip(subj, { id: nextId(plan), music: 'cc-x', day: today, mail: m.id.slice(-6), source: '', seconds: 20 }).title });
      continue;
    }
    // download + process
    const mwork = path.join(work, m.id);
    fs.mkdirSync(mwork, { recursive: true });
    const ready = [];
    for (const w of toProcess) {
      if (w.src === 'att') {
        const file = path.join(mwork, w.name.replace(/[^\w.-]+/g, '_'));
        fs.writeFileSync(file, w.a.attachmentId ? await g.attachment(m.id, w.a.attachmentId) : Buffer.from(String(w.a.data).replace(/-/g, '+').replace(/_/g, '/'), 'base64'));
        ready.push({ key: w.key, name: w.name, path: file, kind: w.cls.kind });
      } else {
        const dl = await driveDownload(w.d.id, mwork, { maxMb: cfg.max_drive_mb });
        if (dl.status === 'private') { items.push({ key: w.key, name: w.name || dl.name, status: 'waiting', why: `${dl.why}. Share -> "Anyone with the link" kar dein, apne aap utha lenge` }); continue; }
        if (dl.status !== 'ok') { items.push({ key: w.key, name: w.name || dl.name, status: dl.status === 'error' ? 'waiting' : 'rejected', why: dl.why }); continue; }
        const cls = classifyFile({ name: dl.name, size: dl.size }, cfg, { drive: true });
        if (!cls.ok) { fs.rmSync(dl.file, { force: true }); items.push({ key: w.key, name: dl.name, status: 'rejected', why: cls.why }); continue; }
        ready.push({ key: w.key, name: w.name || dl.name, path: dl.file, kind: cls.kind });
      }
    }
    const requireOcr = process.env.INBOX_REQUIRE_OCR !== '0';
    if (dryRun) { // deep dry run: downloaded and checked (marks, cut plan), nothing encoded or written
      const res = await processFiles({ subj, mail: m.id, day: m.day, files: ready, work: mwork, plan, cfg, musicIds, dryRun: true, analyzeOnly: true, writeStills: false, requireOcr });
      report.push({ ...short, action: 'process', notOwn, subject: { kind: subj.kind, deity: subj.deity, place: subj.place, festival: subj.festival, slug: subj.slug, bank: subj.bank }, files: [...items, ...res.items].map(({ name, status, why, cuts, dropped, note }) => ({ name, status, ...(why ? { why } : {}), ...(cuts ? { cuts } : {}), ...(dropped?.length ? { dropped } : {}), ...(note ? { note } : {}) })) });
      continue;
    }
    const res = await processFiles({ subj, mail: m.id, day: m.day, files: ready, work: mwork, plan, cfg, musicIds, requireOcr });
    for (const c of res.clips) {
      const problems = finishClip(plan, c, { otherPlaylist: cfg.other_playlist });
      if (problems.length) throw new Error(`clip ${c.id} texts: ${problems.join('; ')}`);
    }
    plan = appendClips(plan, res.clips);
    assets.push(...res.assets);
    items.push(...res.items);
    for (const it of items) e.files[it.key] = { name: it.name, status: it.status, ...(it.why ? { why: it.why } : {}), ...(it.reels ? { clips: it.reels.map((r) => r.id) } : {}), ...(it.still ? { still: it.still } : {}) };
    e.clips.push(...res.clips.map((c) => c.id));
    e.stills.push(...res.items.filter((i) => i.still).map((i) => i.still));
    const waiting = Object.values(e.files).some((f) => f.status === 'waiting');
    const expired = waiting && (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${e.first_seen}T00:00:00Z`)) / 864e5 >= cfg.waiting_days;
    if (expired) {
      for (const [key, f] of Object.entries(e.files)) {
        if (f.status !== 'waiting') continue;
        f.status = 'rejected'; f.why = `${cfg.waiting_days} din tak file nahi mil payi (Drive private / process nahi hui); dobara bhejein`;
        const it = items.find((i) => i.key === key);
        if (it) Object.assign(it, { status: 'rejected', why: f.why }); else items.push({ key, name: f.name, status: 'rejected', why: f.why });
      }
    }
    e.status = notOwn ? 'rejected' : waiting && !expired ? 'waiting' : 'done';
    log.mails[m.id] = e;
    const newSomething = items.some((i) => i.status !== 'waiting') || !e.receipts;
    const firstIdx = res.clips.length ? plan.clips.findIndex((c) => c.id === res.clips[0].id) : -1;
    const ahead = firstIdx >= 0 ? queuedBefore(plan, { log: read(path.join(ROOT, 'automation', 'log.md')), pub: read(path.join(ROOT, 'automation', 'published.md')), skip: read(SKIP_FILE), index: firstIdx }) : 0;
    const startDay = addDays(today, 1); // the lane uploads tomorrow's reel in the evening
    const text = receiptText({ subject: m.subject, day: m.day, subj, notOwn, items: e.receipts ? items : Object.entries(e.files).map(([key, f]) => ({ key, ...f, reels: (f.clips || []).map((id) => ({ id, seconds: res.clips.find((c) => c.id === id)?.seconds || 0 })) })), planAt: plan.at, ahead, firstDay: addDays(startDay, ahead), waitingDays: cfg.waiting_days, update: e.receipts > 0 });
    report.push({ ...short, action: 'process', status: e.status, items: items.map(({ name, status, why, reels }) => ({ name, status, ...(why ? { why } : {}), ...(reels ? { reels: reels.map((r) => r.id) } : {}) })) });
    pending.push({ id: m.id, label: e.status === 'waiting' ? null : cfg.label_done, ...(newSomething ? { reply: { to: m.from, subject: /^re:/i.test(m.subject) ? m.subject : `Re: ${m.subject}`, text, threadId: m.threadId, inReplyTo: m.messageId } } : {}) });
    if (newSomething) e.receipts = (e.receipts || 0) + 1;
  }
  if (dryRun) return { status: 'dry-run', mails: report };
  // release assets, plan, log (the workflow commits and pushes, then runs `notify`)
  if (assets.length) run('gh', ['release', 'upload', plan.release, ...assets, '--clobber']);
  fs.writeFileSync(PLAN_FILE, `${JSON.stringify(plan, null, 2)}\n`);
  if (pending.length || Object.keys(log.mails).length) fs.writeFileSync(LOG_FILE, `${JSON.stringify(log, null, 2)}\n`);
  if (pendingFile) fs.writeFileSync(pendingFile, JSON.stringify(pending));
  return { status: 'ok', mails: report, assets: assets.map((a) => path.basename(a)), pending: pending.length };
}

/** "NOT MINE": the mail's clips go on the skip list, its stills are deleted. */
export function retract(entry, plan, { skipFile = SKIP_FILE, root = ROOT } = {}) {
  const pub = read(path.join(root, 'automation', 'published.md'));
  const log = read(path.join(root, 'automation', 'log.md'));
  const done = publishedClips(plan, { log, pub });
  const clips = (entry.clips || []).filter((id) => !done.has(id));
  const published = (entry.clips || []).filter((id) => done.has(id)).map((id) => `${done.get(id)}-owner-${plan.clips.find((c) => c.id === id)?.name}`);
  if (clips.length) fs.appendFileSync(skipFile, `${read(skipFile).endsWith('\n') || !read(skipFile) ? '' : '\n'}# inbox: retracted by the owner ("NOT MINE")\n${clips.join('\n')}\n`);
  let stills = 0;
  for (const s of entry.stills || []) {
    const f = path.join(root, s);
    if (fs.existsSync(f)) { fs.rmSync(f); fs.rmSync(f.replace(/\.jpg$/, '.licence.json'), { force: true }); stills++; }
  }
  return { clips, stills, published };
}

export async function notify(pendingFile) {
  const g = await gmailApi();
  const list = JSON.parse(fs.readFileSync(pendingFile, 'utf8'));
  let replies = 0; let labels = 0;
  for (const p of list) {
    if (p.reply) { await g.reply(p.reply); replies++; }
    if (p.label) { await g.addLabel(p.id, p.label); labels++; }
  }
  return { status: 'ok', replies, labels };
}

/** Local preview: process files on disk with a subject, nothing written to the repo, the release or the mailbox. */
export async function tryLocal({ subject, files, out }) {
  const cfg = loadConfig();
  const subj = parseSubject(subject);
  if (!subj.ok) throw new Error(subj.why);
  const plan = loadPlan();
  fs.mkdirSync(out, { recursive: true });
  const ready = files.map((f) => ({ key: f, name: path.basename(f), path: f, kind: classifyFile({ name: f, size: fs.statSync(f).size }, cfg, { drive: true }).kind })).filter((f) => f.kind);
  const res = await processFiles({ subj, mail: 'local0', day: istDate(), files: ready, work: out, plan, cfg, musicIds: await music(), writeStills: false, requireOcr: false });
  const problems = res.clips.map((c) => [c.id, finishClip(plan, c, { otherPlaylist: cfg.other_playlist })]).filter(([, p]) => p.length);
  return { subject: subj, items: res.items, clips: res.clips.map((c) => ({ id: c.id, title: c.title, music: c.music, seconds: c.seconds })), assets: res.assets, problems, receipt: receiptText({ subject, day: istDate(), subj, items: res.items, planAt: plan.at, ahead: 0, firstDay: addDays(istDate(), 1), waitingDays: cfg.waiting_days }) };
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
  if (args[0] === 'run') return runInbox({ dryRun: args.includes('--dry-run') || args.includes('--deep'), deep: args.includes('--deep'), pendingFile: opt('--pending') || null, ...(opt('--work') ? { work: opt('--work') } : {}) });
  if (args[0] === 'notify') return notify(opt('--pending'));
  if (args[0] === 'count') { // cheap: are there mails to look at? (the workflow installs ffmpeg / OCR only then)
    const g = await gmailApi();
    if (!g.hasCredentials()) return { status: 'skipped', count: 0, reason: 'inbox Gmail secrets are not set' };
    return { status: 'ok', count: (await g.listMessages(loadConfig().query, 50)).length };
  }
  if (args[0] === 'try') return tryLocal({ subject: opt('--subject'), files: String(opt('--files') || '').split(',').filter(Boolean), out: opt('--out') || path.join(os.tmpdir(), 'shyam-inbox-try') });
  throw new Error('Usage: inbox.mjs run [--dry-run] [--pending f] | notify --pending f | try --subject "Shyam ..." --files a,b [--out dir]');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().then((r) => console.log(JSON.stringify(r, null, 1))).catch((e) => { console.log(JSON.stringify({ status: 'error', error: e.message })); process.exitCode = 1; });
}
