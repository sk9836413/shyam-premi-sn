#!/usr/bin/env node
// Automatic comment replies for Shyam Premi SN (owner, 14 Nov 2026: "har comment ka reply karo automation me").
// Rules for the reply writer (Claude): automation/COMMENTS.md. Run by .github/workflows/comments.yml, which photos.yml
// calls on each of the scheduler Worker's dispatches (09:13, 10:13, 10:43, 18:46, 19:46 IST) when the repo variable
// COMMENT_REPLIES=on. No cron of its own.
//
//   node scripts/comments.mjs collect --out <pending.json> [--since YYYY-MM-DD] [--include-answered] [--platform yt,fb,ig]
//        Reads new TOP-LEVEL comments: YouTube (commentThreads allThreadsRelatedToChannelId), the Facebook Page's posts,
//        Reels and videos, the Instagram media. Skips the channel's own comments, comments the channel already answered
//        (checked on the platform itself: a reply by the channel / Page / IG account) and comments already handled in
//        automation/comments/state.json. Classifies each one: spam/scam/abuse (hide, no reply), political/communal and
//        complaints (no reply, flagged for the owner), service/collab requests (a neutral thank-you, flagged), Rani Sati
//        content (a neutral thank-you only, never a jaikara), very short comments (deterministic templates), the rest
//        (Claude writes the reply; a template is the fallback). Writes <pending.json>; GitHub outputs total= and ai=.
//        --since/--include-answered are for DRY RUNS only (older or answered comments as samples; never posted).
//   node scripts/comments.mjs check --in <pending.json> --replies <replies.json>
//        Checks Claude's replies against the rules (language/script, jaikara for the deity, no links/money/promises/
//        EpiFive/owner names, no sati praise, 1-2 short lines, not used in the last 7 days). Exit 1 = fix and re-run.
//   node scripts/comments.mjs post --in <pending.json> [--replies <replies.json>] [--dry-run]
//        Posts the replies (Claude's when they pass the check, else the template), likes the Facebook comment it answered
//        (the YouTube API has no hearts, Instagram has no comment likes), hides spam (reversible: FB is_hidden, IG hide,
//        YouTube heldForReview; nothing is ever deleted), records everything in automation/comments/state.json.
//        Caps: 50 replies a run, 40 YouTube replies a day (comments.insert = 50 quota units of the project shared with
//        EpiFive), 12-25 s between replies; a rate-limit / spam / quota error stops that platform for the run.
//   node scripts/comments.mjs run --dry-run [collect options]   collect + post --dry-run with templates only (local)
//   node scripts/comments.mjs digest [--hours 24]                flagged comments as Markdown (the share kit adds it)
//
// Env (GitHub secrets) or %USERPROFILE%\.shyampremisk\youtube.env / social.env: YT_CLIENT_ID, YT_CLIENT_SECRET,
// YT_REFRESH_TOKEN (SHYAM_YT_* override, like youtube.mjs), META_PAGE_ID, META_PAGE_TOKEN, IG_USER_ID, META_API_VERSION.
// The YouTube token has youtube.force-ssl (commentThreads.list, comments.insert, setModerationStatus); the Page token has
// pages_read_user_content, pages_manage_engagement, instagram_manage_comments (debug_token, 14 Nov 2026).
// Tokens are never printed. Exit 0 unless `check` finds problems.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const STATE_FILE = path.join(ROOT, 'automation', 'comments', 'state.json');
export const LIMITS = { perRun: 50, ytPerDay: 40, maxAgeDays: 60, reuseDays: 7, keepDays: 120, flagDays: 21, delayMs: [12e3, 25e3], maxChars: 200 };
const IST = 5.5 * 3600e3;
export const istDate = (now = Date.now()) => new Date(now + IST).toISOString().slice(0, 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- deity / festival of the video

// Order matters: Rani Sati first (sati rule), Chhath before the general Devi row, Khatu before Krishna.
// "Shyam Premi SN" (the brand) is removed before matching, and hashtags are ignored (old posts carried #KhatuShyam on
// every topic), so "Shyam" only counts when the video is about Khatu Shyam ji.
export const DEITIES = {
  sati: { re: /rani\s*sati|(?<![ऀ-ॿ])सती(?![ऀ-ॿ])|dhandhan|ढांढण|narayani\s*dadi|sati\s*dadi|dadi\s*(ji\s*)?(rani|sati)|jhunjhunu\s*(wali|dham|mandir)|झुंझुनू/i },
  chhath: { re: /chhath|chhathi|छठ|kharna|खरना|nahay\s*khay|नहाय|arghya|अर्घ्य/i, jai: { hi: ['जय छठी मइया 🙏'], rom: ['Jai Chhathi Maiya 🙏'] }, name: { hi: 'छठी मइया', rom: 'Chhathi Maiya', en: 'Chhathi Maiya' } },
  khatu: { re: /khatu|\bshyam\b|baba\s*shyam|barbarik|janmotsav|gyaras|lakhdatar|haare\s*ka\s*sahara|खाटू|श्याम|बर्बरीक|ग्यारस/i, jai: { hi: ['जय श्री श्याम 🙏', 'हारे का सहारा, बाबा श्याम हमारा 🙏'], rom: ['Jai Shree Shyam 🙏', 'Haare ka sahara, Baba Shyam hamara 🙏'] }, name: { hi: 'बाबा श्याम', rom: 'Baba Shyam', en: 'Baba Shyam' } },
  shiv: { re: /shiv|mahadev|bhole|jyotirling|somnath|mahakal|kedarnath|omkareshwar|mallikarjun|vishwanath|pradosh|somvar|namah\s*shivay|शिव|महादेव|भोले|ज्योतिर्लिंग|महाकाल/i, jai: { hi: ['हर हर महादेव 🙏', 'ॐ नमः शिवाय 🙏'], rom: ['Har Har Mahadev 🙏', 'Om Namah Shivaya 🙏'] }, name: { hi: 'महादेव', rom: 'Mahadev', en: 'Mahadev' } },
  hanuman: { re: /hanuman|bajrang|balaji|salasar|mehandipur|sankat\s*mochan|mangalvar|हनुमान|बजरंग|बालाजी|सालासर/i, jai: { hi: ['जय बजरंगबली 🙏', 'जय श्री हनुमान 🙏'], rom: ['Jai Bajrangbali 🙏', 'Jai Shree Hanuman 🙏'] }, name: { hi: 'बजरंगबली', rom: 'Bajrangbali', en: 'Hanuman ji' } },
  ganesh: { re: /ganesh|ganpati|vinayak|sankashti|bappa|morya|गणेश|गणपति|विनायक|बप्पा/i, jai: { hi: ['गणपति बप्पा मोरया 🙏', 'जय श्री गणेश 🙏'], rom: ['Ganpati Bappa Morya 🙏', 'Jai Shree Ganesh 🙏'] }, name: { hi: 'गणपति बप्पा', rom: 'Ganpati Bappa', en: 'Ganpati Bappa' } },
  ram: { re: /\bram\b|\bshri\s*ram|ayodhya|siya\s*ram|sitaram|vivah\s*panchami|राम|अयोध्या|सियाराम/i, jai: { hi: ['जय श्री राम 🙏', 'जय सियाराम 🙏'], rom: ['Jai Shree Ram 🙏', 'Jai Siyaram 🙏'] }, name: { hi: 'प्रभु श्री राम', rom: 'Prabhu Shri Ram', en: 'Shri Ram' } },
  krishna: { re: /krishna|kanha|govind|gopal|bihari|vrindavan|shrinath|nathdwara|govardhan|gopashtami|dwarka|radhe|कृष्ण|कान्हा|गोविंद|गोपाल|बिहारी|वृंदावन|गोवर्धन|राधे/i, jai: { hi: ['जय श्री कृष्ण 🙏', 'राधे राधे 🙏'], rom: ['Jai Shree Krishna 🙏', 'Radhe Radhe 🙏'] }, name: { hi: 'श्री कृष्ण', rom: 'Shri Krishna', en: 'Shri Krishna' } },
  vishnu: { re: /vishnu|narayan|ekadashi|tulsi|vaikunth|satyanarayan|विष्णु|नारायण|एकादशी|तुलसी/i, jai: { hi: ['ॐ नमो नारायणाय 🙏', 'जय श्री हरि 🙏'], rom: ['Om Namo Narayanaya 🙏', 'Jai Shree Hari 🙏'] }, name: { hi: 'श्री हरि', rom: 'Shri Hari', en: 'Shri Hari' } },
  lakshmi: { re: /lakshmi|laxmi|dhanteras|diwali|deepawali|लक्ष्मी|धनतेरस|दिवाली|दीपावली/i, jai: { hi: ['जय माँ लक्ष्मी 🙏'], rom: ['Jai Maa Lakshmi 🙏'] }, name: { hi: 'माँ लक्ष्मी', rom: 'Maa Lakshmi', en: 'Maa Lakshmi' } },
  devi: { re: /mata\b|mata\s*rani|devi|durga|navratri|karwa|करवा|ahoi|अहोई|teej|तीज|gauri|गौरी|parvati|पार्वती|santoshi|vaishno|karni|jeen\s*mata|shakambhari|kaila|ambe|माता|देवी|दुर्गा|नवरात्र|वैष्णो|अम्बे/i, jai: { hi: ['जय माता दी 🙏', 'जय माँ अम्बे 🙏'], rom: ['Jai Mata Di 🙏', 'Jai Maa Ambe 🙏'] }, name: { hi: 'माता रानी', rom: 'Mata Rani', en: 'Mata Rani' } },
  shani: { re: /shani|शनि/i, jai: { hi: ['जय शनिदेव 🙏'], rom: ['Jai Shani Dev 🙏'] }, name: { hi: 'शनिदेव', rom: 'Shani Dev', en: 'Shani Dev' } },
  surya: { re: /surya|suraj\s*dev|sankranti|सूर्य|संक्रांति/i, jai: { hi: ['जय सूर्य देव 🙏', 'ॐ सूर्याय नमः 🙏'], rom: ['Jai Surya Dev 🙏', 'Om Suryaya Namah 🙏'] }, name: { hi: 'सूर्य देव', rom: 'Surya Dev', en: 'Surya Dev' } },
  bhairav: { re: /bhairav|भैरव/i, jai: { hi: ['जय काल भैरव 🙏'], rom: ['Jai Kaal Bhairav 🙏'] }, name: { hi: 'काल भैरव', rom: 'Kaal Bhairav', en: 'Kaal Bhairav' } },
  general: { re: /$^/, jai: { hi: ['जय हो 🙏', 'हरि ॐ 🙏'], rom: ['Jai ho 🙏', 'Hari Om 🙏'] }, name: { hi: 'प्रभु', rom: 'Prabhu', en: 'God' } },
};
const KHATU_WORDS = /जय\s*श्री\s*श्याम|jai\s*shr?e+\s*shyam|बाबा\s*श्याम|baba\s*shyam|श्याम\s*बाबा|shyam\s*baba|हारे\s*का\s*सहारा|haare\s*ka\s*sahara/i;

/** Brand, hashtags, mentions and links removed: what the video / comment is really about. */
export const cleanText = (t) => String(t || '').replace(/shyam\s*premi\s*(sn|ska)?|श्याम\s*प्रेमी/gi, ' ').replace(/#[\p{L}\p{N}_]+/gu, ' ').replace(/@[\w.]+/g, ' ').replace(/https?:\S+/g, ' ').replace(/\s+/g, ' ').trim();

/** Deity key of a text (title/caption or comment): sati | chhath | khatu | shiv ... | null. */
export function deityOf(text) {
  const t = cleanText(text);
  for (const [key, d] of Object.entries(DEITIES)) if (key !== 'general' && d.re.test(t)) return key;
  return null;
}

/** The deity a reply must honour: the video's; when the video is unknown (a quote card, a general post), the comment's.
 *  The title (first line) decides before the description: descriptions end with a "जय श्री श्याम" sign-off on every topic. */
export function contextDeity(contentText, commentText) {
  const [first, ...rest] = String(contentText || '').split(/\r?\n/);
  const c = deityOf(first) || deityOf(rest.join('\n'));
  if (c) return c;
  const m = deityOf(commentText);
  return m === 'sati' ? 'sati' : m || 'general';
}

export const isBhajanText = (t) => /bhajan|geet|\bsong\b|jukebox|nonstop|aarti|भजन|गीत|आरती/i.test(cleanText(t));

// ---------------------------------------------------------------- language of the comment

const HINGLISH = new Set(('jai jay jaya shree shri sri shyam baba ji hai hain ho hoga ki ka ke ko mata maa maiya radhe ram sita siya om namah namo shivay shivaya ' +
  'mahadev bholenath bhole har bolo bappa morya ganpati bajrangbali hanuman krishna kanha prabhu bhagwan kripa ashirwad aashirwad sada bahut bhut ' +
  'accha acha achha sundar badhiya mast aap aapka aapki apke aapke sab sabka sabki kalyan mere mera meri hamare humare dham darshan bhajan katha aarti ' +
  'kya kab kaise kaun kahan kitne kyun kyon hum tum nahi nahin haan dhanyavad dhanyawad dhanyavaad pranam naman kijiye karo karna raho rahe wale wala ' +
  'vale khatu salasar balaji dadi chhath chhathi puja pooja bhagat bhakt sanatan dev devi shubh badhai shubhkamnaye shubhkamnayein hare govind ' +
  'gopal bihari sanwariya sawariya shyamdhani lakhdatar haare sahara mandir ghar parivar din aaj kal subah shaam hamesha bana bani banaye kar ' +
  'jaiho jaishreeshyam jaishreeram radheradhe harharmahadev').split(/\s+/));

/** 'hi' (Devanagari), 'hinglish' (Hindi in Roman letters) or 'en'. Emoji-only comments get 'hi' (the channel's language). */
export function langOf(text) {
  const t = String(text || '');
  const dev = (t.match(/[ऀ-ॿ]/g) || []).length;
  const lat = (t.match(/[A-Za-z]/g) || []).length;
  if (!lat || dev >= lat) return 'hi';
  const words = t.toLowerCase().match(/[a-z]+/g) || [];
  const hits = words.filter((w) => HINGLISH.has(w)).length;
  return hits && hits / words.length >= 0.2 ? 'hinglish' : 'en';
}

// ---------------------------------------------------------------- classification (the spam filter)

const RX = {
  link: /https?:\/\/|www\.|\b[a-z0-9-]{2,}\.(com|in|net|org|xyz|link|ly|io|site|online|shop|app)\b|wa\.me|t\.me\/|bit\.ly/i,
  phone: /(\+?91[\s-]?)?\b[6-9]\d{9}\b|\b\d{3,5}[\s-]\d{3,5}[\s-]?\d{3,5}\b/,
  scam: /whats\s?app\s*(me|karo|kare|number|no)|telegram|crypto|bitcoin|forex|invest(ment)?\s|trading\s*(tips|signal)|lottery|lucky\s*draw|you\s*(have\s*)?won|winner|giveaway|free\s*recharge|instant\s*loan|paise?\s*kama|पैसे\s*कमा|ghar\s*baithe\s*(kamaye|earn)|earn\s*(money|daily|\d)|work\s*from\s*home|vashikaran|वशीकरण|love\s*problem|black\s*magic|kala\s*jadu|काला\s*जादू|tantrik|तांत्रिक|dm\s*me|inbox\s*me|message\s*me\s*on/i,
  promo: /subscribe\s*(my|to\s*my|mere|meri|kar\s*do\s*mere)|check\s*(out\s*)?my\s*(channel|page|video)|mere\s*(channel|page)|मेरे\s*(चैनल|पेज)|sub\s*4\s*sub|sub4sub|follow\s*(me|back)|visit\s*my|my\s*new\s*video/i,
  follow: /(follow|subscribe)\s*(bhi\s*)?(kar\s*(do|dijiye|dena|lo|dijie)|kijiye|karo)|(फॉलो|सब्सक्राइब)\s*(भी\s*)?(कर\s*(दो|दीजिए|देना|लो)|कीजिए|करो)/i,
  abuse: /madarchod|maderchod|behen?chod|bhenchod|chutiy|bhosd|gandu|randi|harami|haramkhor|kutta\s*kamina|fuck|bitch|bastard|asshole|मादरचोद|बहनचोद|भेनचोद|चूतिय|भोसड़|गांडू|रंडी|हरामी|हरामखोर/i,
  political: /\b(modi|bjp|congress|rahul\s*gandhi|kejriwal|owaisi|amit\s*shah|chunav|election|vote\s*(do|dena|for))\b|मोदी|भाजपा|कांग्रेस|राहुल\s*गांधी|चुनाव|jihad|जिहाद|mull[ae]|मुल्ले|मुल्ला|katu(a|e)|कटुआ|sanghi|संघी|andh\s*bhakt|अंधभक्त|khalistan|खालिस्तान|hindu\s*-?\s*muslim|हिंदू\s*-?\s*मुस्लिम|murdabad|मुर्दाबाद/i,
  complaint: /copyright|कॉपीराइट|mera\s*video|मेरा\s*वीडियो|meri\s*(photo|video|awaaz)|chori|चोरी|\bfake\b|फेक|नकली|nakli|bakwas|बकवास|bekar|बेकार|\breport\b|misleading|disrespect|अपमान|apmaan|galat\s*(jankari|information|info|hai|bataya)|गलत\s*(जानकारी|है|बताया)|wrong\s*(info|information|fact)|ai\s*(se\s*bana|generated|video\s*hai)|unsubscribe/i,
  service: /booking|book\s*(karna|kare|karni)|bhajan\s*sandhya|भजन\s*संध्या|jagran|जागरण|kirtan\s*(program|booking|ke\s*liye)|program\s*(karna|chahiye|book)|(contact|mobile|phone)\s*(number|no)|number\s*(do|dijiye|chahiye|bhejo)|नंबर\s*(दो|दीजिए|चाहिए|भेजो)|price|charges?\b|kitne\s*(paise|rupaye|ka\s*hai)|order\s*(karna|kaise)|kharid|खरीद|video\s*banwana|वीडियो\s*बनवाना|custom\s*video|apna\s*bhajan|mera\s*bhajan\s*(daal|dal|upload)|singer\s*(chahiye|hu|hoon)/i,
  collab: /collab|कोलैब|promotion|promote|sponsor|paid\s*promo|business\s*(inquiry|enquiry|email)|partnership|brand\s*deal|work\s*together|saath\s*(kaam|kam)\s*kar/i,
  question: /\?|^\s*(are|is|do|does|can|could|should|will)\s|\b(kya|kab|kaise|kaun|kahan|kahaan|kitne|kitna|kyun|kyon|how|when|where|what|which|why|who)\b|क्या|कब|कैसे|कौन|कहाँ|कहां|कितन|क्यों/i,
  jaikara: /\b(jai|jay|jaya|shree|shri|radhe|om|namah|namo|har\s*har|mahadev|bolo|ram|shyam|baba|mata|maiya|bappa|morya|bajrang\w*|haare|sahara|pranam|naman|dhok|ki\s*jai|hare\s*krishna|hari\s*om|ram\s*ram|jaiho)\b|जय|श्री|राधे|ॐ|नमः|हर\s*हर|महादेव|बोलो|राम|श्याम|बाबा|माता|मइया|बप्पा|मोरया|प्रणाम|नमन|ढोक|हारे/i,
  greet: /^(hi+|hello|hlw|helo|hey|namaste|namaskar|नमस्ते|नमस्कार|good\s*(morning|night|evening))$/i,
  praise: /nice|good|great|beautiful|awesome|super|wow|lovely|amazing|\bbest\b|sundar|सुंदर|sunder|bahut\s*(accha|acha|achha|badhiya|sundar|pyara)|बहुत\s*(अच्छा|बढ़िया|सुंदर|प्यारा)|badhiya|बढ़िया|\bmast\b|\bwah\b|वाह|adbhut|अद्भुत|manmohak|मनमोहक|❤|♥|💖|💕|😍|🥰|💯|👌|👍/i,
  wish: /happy|shubh|शुभ|शुभकामना|shubhkamna|badhai|बधाई|mubarak|wishes|greetings/i,
};
const letters = (t) => String(t).replace(/[^\p{L}\p{M}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

/**
 * {kind, reason}: kind = spam | scam | abuse | political | complaint | service | collab | question | wish | praise |
 * jaikara | long. spam/scam/abuse are hidden, political/complaint flagged without a reply, service/collab get a neutral
 * thank-you and are flagged, wish/praise/jaikara are "very short" (templates), question/long go to Claude.
 */
export function classify(text) {
  const t = String(text || '').trim();
  if (RX.link.test(t)) return { kind: 'spam', reason: 'link' };
  if (RX.phone.test(t)) return { kind: 'spam', reason: 'phone number' };
  if (RX.scam.test(t)) return { kind: 'scam', reason: 'scam / money words' };
  if (RX.promo.test(t)) return { kind: 'spam', reason: 'self-promotion' };
  if (RX.follow.test(t)) return { kind: 'promo', reason: 'asks to follow / subscribe back' };
  if (RX.abuse.test(t)) return { kind: 'abuse', reason: 'abusive words' };
  if (RX.political.test(t)) return { kind: 'political', reason: 'political / communal' };
  if (RX.complaint.test(t)) return { kind: 'complaint', reason: 'complaint' };
  if (RX.collab.test(t)) return { kind: 'collab', reason: 'collab / promotion request' };
  if (RX.service.test(t)) return { kind: 'service', reason: 'asks about a service' };
  const words = letters(t).split(' ').filter(Boolean);
  const question = RX.question.test(t);
  if (!question && words.length <= 6) {
    if (RX.wish.test(t)) return { kind: 'wish', reason: 'short wish' };
    if (!words.length || RX.jaikara.test(t) || RX.greet.test(letters(t))) return { kind: 'jaikara', reason: words.length ? 'short jaikara' : 'emoji only' };
    if (RX.praise.test(t)) return { kind: 'praise', reason: 'short praise' };
  }
  // "Jai shree shyam" with a long emoji tail, or "Nice video jai ho" up to 8 words without a question.
  if (!question && words.length <= 8 && (RX.jaikara.test(t) || RX.praise.test(t)) && !/[.,।]\s*\S+\s+\S+\s+\S+/.test(t)) {
    return { kind: RX.wish.test(t) ? 'wish' : RX.jaikara.test(t) ? 'jaikara' : 'praise', reason: 'short' };
  }
  return { kind: question ? 'question' : 'long', reason: question ? 'question' : 'longer comment' };
}

export const ACTION = {
  spam: 'hide', scam: 'hide', abuse: 'hide', political: 'flag', complaint: 'flag', promo: 'flag',
  service: 'thanks+flag', collab: 'thanks+flag', question: 'ai', long: 'ai', wish: 'template', praise: 'template', jaikara: 'template',
};

// ---------------------------------------------------------------- templates

const BLESS = {
  hi: ['{n} की कृपा आप और आपके परिवार पर सदा बनी रहे।', '{n} का आशीर्वाद सदा आपके साथ रहे।', '{n} आपके घर में सुख-शांति बनाए रखें।',
    '{n} आपको सदा प्रसन्न रखें।', '{n} की कृपा से आपका हर दिन मंगलमय हो।', 'आप और आपके परिवार पर {n} की कृपा बरसती रहे।',
    '{n} आपकी भक्ति सदा बनाए रखें।', 'आपके घर-आँगन में {n} की कृपा बनी रहे।', '{n} आपके जीवन में सदा उजाला रखें।'],
  rom: ['{n} ki kripa aap aur aapke parivar par sada bani rahe.', '{n} ka aashirwad sada aapke saath rahe.', '{n} aapke ghar mein sukh-shanti banaye rakhein.',
    '{n} aapko sada prasann rakhein.', '{n} ki kripa se aapka har din mangalmay ho.', 'Aap aur aapke parivar par {n} ki kripa barasti rahe.',
    '{n} aapki bhakti sada banaye rakhein.', 'Aapke ghar-aangan mein {n} ki kripa bani rahe.', '{n} aapke jeevan mein sada ujala rakhein.'],
  en: ['May {n} bless you and your family always.', 'May {n} keep your home full of peace and joy.', 'May {n}\'s grace be with you every day.',
    'May {n} always keep you happy.', 'Wishing you and your family {n}\'s blessings.', 'May {n} light up every day of your life.', 'May {n} keep you and your loved ones safe and happy.', "May {n}'s blessings always stay with your family."],
};
const THANKS = {
  hi: ['बहुत-बहुत धन्यवाद 🙏', 'आपका हृदय से आभार 🙏', 'आपके प्रेम के लिए धन्यवाद 🙏', 'इतने सुंदर शब्दों के लिए धन्यवाद 🙏'],
  rom: ['Bahut-bahut dhanyavaad 🙏', 'Aapka dil se aabhaar 🙏', 'Aapke pyaar ke liye dhanyavaad 🙏', 'Itne sundar shabdon ke liye dhanyavaad 🙏'],
  en: ['Thank you so much 🙏', 'Thank you for the love 🙏', 'Grateful for your kind words 🙏', 'So happy you liked it 🙏'],
};
const WISH = {
  hi: ['आपको और आपके परिवार को भी हार्दिक शुभकामनाएं 🙏', 'आपको भी बहुत-बहुत शुभकामनाएं 🙏', 'आपको भी मंगलमय शुभकामनाएं 🙏'],
  rom: ['Aapko aur aapke parivar ko bhi hardik shubhkamnayein 🙏', 'Aapko bhi bahut-bahut shubhkamnayein 🙏'],
  en: ['Wishing you and your family the same 🙏', 'Warm wishes to you and your family too 🙏'],
};
// Service / collab / unanswerable questions: thanks, no promise, no contact details.
const NOTED = {
  hi: ['आपके संदेश के लिए धन्यवाद।', 'आपने लिखा, इसके लिए आभार।', 'आपकी बात के लिए धन्यवाद, ऐसे ही जुड़े रहिए।'],
  rom: ['Aapke sandesh ke liye dhanyavaad.', 'Aapne likha, iske liye aabhaar.', 'Aapki baat ke liye dhanyavaad, aise hi jude rahiye.'],
  en: ['Thank you for your message.', 'Thank you for writing to us.', 'Thanks for your message, stay connected.'],
};
// Rani Sati content (Commission of Sati (Prevention) Act 1987; owner 2 Nov 2026): a neutral thank-you, no jaikara, no praise.
export const SATI_THANKS = {
  hi: ['आपका बहुत-बहुत धन्यवाद 🙏', 'वीडियो देखने के लिए आपका धन्यवाद 🙏', 'साथ जुड़े रहने के लिए धन्यवाद 🙏', 'आपका आभार 🙏', 'आपके कमेंट के लिए धन्यवाद 🙏', 'धन्यवाद, आपका दिन शुभ हो 🙏'],
  rom: ['Aapka bahut-bahut dhanyavaad 🙏', 'Video dekhne ke liye dhanyavaad 🙏', 'Saath jude rehne ke liye dhanyavaad 🙏', 'Aapka aabhaar 🙏', 'Comment ke liye dhanyavaad 🙏'],
  en: ['Thank you for watching 🙏', 'Thank you for your comment 🙏', 'Thanks for being with us 🙏', 'Thank you, have a good day 🙏'],
};
export const BHAJAN_CTA = { hi: 'पूरा भजन चैनल पर सुनें।', rom: 'Poora bhajan channel par sunein.', en: 'Listen to the full bhajan on the channel.' };

const key3 = (lang) => (lang === 'hi' ? 'hi' : lang === 'en' ? 'en' : 'rom');
/** Normalised text for the 7-day reuse check: letters only, so an emoji difference is still "the same reply". */
export const norm = (t) => letters(String(t).toLowerCase()).replace(/\s+/g, ' ').trim();

/** Every template reply for one comment, in a shuffled order (rng injectable for tests). */
export function templateCandidates({ deity = 'general', lang = 'hi', kind = 'jaikara', bhajan = false, platform = 'yt', rng = Math.random }) {
  const L = key3(lang);
  if (deity === 'sati') return shuffle(SATI_THANKS[L], rng);
  const d = DEITIES[deity] || DEITIES.general;
  const n = d.name[L === 'rom' ? 'rom' : L] || d.name.rom;
  const jai = d.jai[L === 'hi' ? 'hi' : 'rom'];
  const bless = BLESS[L].map((b) => b.replace('{n}', n)).map((b) => (L === 'en' ? b : b[0].toUpperCase() + b.slice(1)));
  let out = [];
  if (kind === 'wish') out = WISH[L].flatMap((w) => [w, ...(L === 'en' ? bless.map((b) => `${w} ${b}`) : jai.map((j) => `${j} ${w.replace(/\s*🙏$/, L === 'hi' ? '।' : '.')}`))]);
  else if (kind === 'praise' || kind === 'long') out = THANKS[L].flatMap((t) => bless.map((b) => `${t} ${b}`));
  else if (kind === 'service' || kind === 'collab' || kind === 'question') out = jai.flatMap((j) => NOTED[L].map((x) => `${j} ${x}`));
  else out = jai.flatMap((j) => bless.flatMap((b) => [`${j} ${b}`, `${b} ${j}`]));
  out = shuffle(out, rng);
  // An occasional pointer to the full bhajan (YouTube bhajan videos only, about 1 in 5).
  if (bhajan && platform === 'yt' && !['service', 'collab'].includes(kind) && rng() < 0.2) out = out.map((x) => `${x}\n${BHAJAN_CTA[L]}`);
  return out;
}

function shuffle(list, rng) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** The first template not used in the last 7 days (normalised, so an emoji difference still counts as the same text);
 *  null when every one was used (then Claude writes a fresh one, or the comment is flagged). */
export function pickTemplate(opts, recent = new Set()) {
  return templateCandidates(opts).find((x) => !recent.has(norm(x))) || null;
}

// ---------------------------------------------------------------- the reply check (Claude's replies and templates)

const OWNER_NAMES = /suraj\s*kumar|सूरज\s*कुमार|niharika|निहारिका|sk9836413|knack/i;
const NO = [
  [/https?:|www\.|\.com\b|\.in\b|bit\.ly|wa\.me|t\.me|youtu\.?be/i, 'a link'],
  [/@[\w.]{2,}/, 'an @handle'],
  [/\d{5,}/, 'a number (phone?)'],
  [/epi\s*five|एपी\s*फाइव/i, 'EpiFive'],
  [OWNER_NAMES, 'an owner / family name'],
  [/₹|\brs\.?\s*\d|rupe|रुपय|रुपए|paisa|paise|पैसे|donat|डोनेशन|दान\s*(करें|दें|कीजिए|दीजिए)|daan\s*(karein|kare|dein)|\bupi\b|paytm|phonepe|gpay|payment|भुगतान|contribute|support\s*us|sponsor/i, 'money'],
  [/वादा|promise|guarantee|गारंटी|पक्का\s*(बना|डाल|ला)|(ज़|ज)रूर\s*(बनाएं|बनाएँ|डालें|लाएं|लाएँ)गे|जल्द(ी)?\s*(ही)?\s*[^।]{0,25}(बनाएंगे|डालेंगे|लाएंगे|आएगा|आएगी|अपलोड)|will\s*(make|upload|post|bring|create|share)|zaroor\s*(banayenge|dalenge|layenge)|jald(i)?\s*(hi)?\s*\w*\s*(banayenge|dalenge|aayega|aayegi|upload)|coming\s*soon/i, 'a promise'],
  [/subscribe|सब्सक्राइब|सब्स्क्राइब|\blike\b|लाइक|\bshare\b|शेयर|follow|फॉलो|bell\s*icon|घंटी/i, 'a like/share/subscribe ask'],
  [/(?<![ऀ-ॿ])सती(?![ऀ-ॿ])|\bsati\b|जौहर|jauhar/i, 'sati'], // a word of its own: बरसती is fine
  [RX.political, 'politics'],
];

/**
 * Problems of one reply for one pending item ([] = fine). ctx: {lang, deity, sati}. recent: Set of norm() texts of the
 * last 7 days (replies of this run included).
 */
export function checkReply(reply, ctx, recent = new Set()) {
  const r = String(reply || '').trim();
  const p = [];
  if (!r) return ['empty'];
  const lines = r.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length > 2) p.push('more than 2 lines');
  if ([...r].length > LIMITS.maxChars) p.push(`longer than ${LIMITS.maxChars} characters`);
  const cta = Object.values(BHAJAN_CTA).find((c) => r.includes(c));
  const body = cta ? r.replace(cta, '') : r;
  if (/चैनल|channel/i.test(body)) p.push('mentions the channel (only "पूरा भजन चैनल पर सुनें" is allowed)');
  for (const [re, what] of NO) if (re.test(body)) p.push(`contains ${what}`);
  if (ctx.sati) {
    const ok = Object.values(SATI_THANKS).flat().map(norm);
    if (!ok.includes(norm(r))) p.push('Rani Sati content: only a neutral thank-you from the fixed list');
  } else if (ctx.deity && !['khatu', 'general'].includes(ctx.deity) && KHATU_WORDS.test(r)) {
    p.push(`"जय श्री श्याम" / Baba Shyam on ${ctx.deity} content (use ${DEITIES[ctx.deity]?.jai?.hi?.[0] || 'the matching jaikara'})`);
  }
  const dev = (r.match(/[ऀ-ॿ]/g) || []).length;
  const lat = (r.match(/[A-Za-z]/g) || []).length;
  if (ctx.lang === 'hi' && dev < lat) p.push('the comment is in Devanagari: reply in Devanagari');
  if ((ctx.lang === 'hinglish' || ctx.lang === 'en') && dev > 0) p.push(`the comment is in Roman letters: reply in ${ctx.lang === 'en' ? 'English' : 'Hinglish (Roman)'}`);
  if (recent.has(norm(r))) p.push('the same reply was used in the last 7 days: vary the wording');
  return p;
}

// ---------------------------------------------------------------- state

export function loadState(file = STATE_FILE) {
  try { return { handled: {}, recent: [], flags: [], daily: {}, ...JSON.parse(fs.readFileSync(file, 'utf8')) }; } catch { return { handled: {}, recent: [], flags: [], daily: {} }; }
}

export function pruneState(state, now = Date.now()) {
  const keep = now - LIMITS.keepDays * 864e5;
  state.handled = Object.fromEntries(Object.entries(state.handled || {}).filter(([, v]) => Date.parse(v.at) > keep));
  state.recent = (state.recent || []).filter((x) => Date.parse(x.at) > now - (LIMITS.reuseDays + 1) * 864e5);
  state.flags = (state.flags || []).filter((x) => Date.parse(x.at) > now - LIMITS.flagDays * 864e5);
  const today = istDate(now);
  state.daily = Object.fromEntries(Object.entries(state.daily || {}).filter(([d]) => d >= istDate(now - 7 * 864e5) || d === today));
  return state;
}

/** norm() texts of the replies of the last 7 days. */
export function recentSet(state, now = Date.now()) {
  return new Set((state.recent || []).filter((x) => Date.parse(x.at) > now - LIMITS.reuseDays * 864e5).map((x) => norm(x.text)));
}

// ---------------------------------------------------------------- the plan (pure: normalised comments in, actions out)

/**
 * comments: [{platform, id, key, text, author, at, own, answered, title, url}] (normalised by the fetchers).
 * Returns {items, skipped}: items = [{...comment, kind, reason, action, deity, lang, sati, bhajan, reply (template or
 * null), needsAi}]. Never more than LIMITS.perRun reply items (hide/flag items are not capped).
 */
export function planComments(comments, state, { now = Date.now(), maxAgeDays = LIMITS.maxAgeDays, since = null, includeAnswered = false, rng = Math.random, hasAi = true } = {}) {
  const items = [];
  const skipped = { own: 0, answered: 0, handled: 0, old: 0, duplicate: 0, cap: 0 };
  const oldest = since ? Date.parse(since) : now - maxAgeDays * 864e5;
  const recent = recentSet(state, now);
  const seen = new Set();
  let replies = 0;
  // Newest first: under the cap the fresh comments are answered now, a backlog over the next runs.
  for (const c of [...comments].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))) {
    if (seen.has(c.key)) { skipped.duplicate++; continue; }
    seen.add(c.key);
    if (c.own) { skipped.own++; continue; }
    if (!includeAnswered && c.answered) { skipped.answered++; continue; }
    const h = state.handled?.[c.key];
    if (!includeAnswered && h && !(h.action === 'error' && (h.tries || 0) < 2)) { skipped.handled++; continue; }
    if (Date.parse(c.at) < oldest) { skipped.old++; continue; }
    const { kind, reason } = classify(c.text);
    let action = ACTION[kind];
    const deity = contextDeity(c.title, c.text);
    const sati = deity === 'sati' || DEITIES.sati.re.test(cleanText(c.text)) || DEITIES.sati.re.test(cleanText(c.title)); // any sati mention: safe side
    const lang = langOf(c.text);
    const bhajan = isBhajanText(c.title);
    const item = { ...c, kind, reason, action, deity: sati ? 'sati' : deity, lang, sati, bhajan, reply: null, needsAi: false };
    if (action === 'hide' || action === 'flag') { items.push(item); continue; }
    if (replies >= LIMITS.perRun) { skipped.cap++; continue; }
    replies++;
    // Rani Sati content never goes to Claude: a fixed neutral thank-you.
    if (action === 'ai' && !sati && hasAi) item.needsAi = true;
    const tKind = sati ? 'jaikara' : action === 'ai' ? (kind === 'question' ? 'question' : 'long') : kind;
    item.reply = pickTemplate({ deity: item.deity, lang, kind: tKind, bhajan, platform: c.platform, rng }, recent);
    if (item.reply) recent.add(norm(item.reply));
    else if (!sati && hasAi) item.needsAi = true; // every template used this week: Claude writes a fresh one
    items.push(item);
  }
  return { items, skipped };
}

// ---------------------------------------------------------------- platform clients

const readEnv = (file) => (fs.existsSync(file)
  ? Object.fromEntries(fs.readFileSync(file, 'utf8').split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]))
  : {});
const YT_KEYS = ['YT_CLIENT_ID', 'YT_CLIENT_SECRET', 'YT_REFRESH_TOKEN'];
const META_KEYS = ['META_PAGE_ID', 'META_PAGE_TOKEN', 'IG_USER_ID', 'META_API_VERSION'];
function loadEnv() {
  const env = {
    ...readEnv(path.join(os.homedir(), '.shyampremisk', 'youtube.env')),
    ...readEnv(path.join(os.homedir(), '.shyampremisk', 'social.env')),
    ...Object.fromEntries([...YT_KEYS, ...META_KEYS].filter((k) => process.env[k]).map((k) => [k, process.env[k]])),
  };
  if (YT_KEYS.every((k) => process.env[`SHYAM_${k}`])) YT_KEYS.forEach((k) => { env[k] = process.env[`SHYAM_${k}`]; });
  return env;
}
const ENV = loadEnv();
const SECRETS = [ENV.META_PAGE_TOKEN, ENV.YT_REFRESH_TOKEN, ENV.YT_CLIENT_SECRET].filter(Boolean);
const redact = (s) => SECRETS.reduce((t, x) => t.split(x).join('<secret>'), String(s ?? ''));

/** Errors that stop a platform for the rest of the run (rate limit, spam block, quota, token). */
export class StopError extends Error {}

// YouTube ---------------------------------------------------------
let ytToken = null;
let ytUnits = 0;
async function yt(method, endpoint, params = {}, body = null) {
  if (!ytToken) {
    const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ client_id: ENV.YT_CLIENT_ID, client_secret: ENV.YT_CLIENT_SECRET, refresh_token: ENV.YT_REFRESH_TOKEN, grant_type: 'refresh_token' }) });
    const j = await r.json().catch(() => ({}));
    if (!j.access_token) throw new StopError(`YouTube token refresh: ${j.error_description || j.error || r.status}`);
    ytToken = j.access_token;
  }
  const url = `https://www.googleapis.com/youtube/v3/${endpoint}?${new URLSearchParams(params)}`;
  const res = await fetch(url, { method, headers: { Authorization: `Bearer ${ytToken}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(60e3) });
  if (res.status === 204) return {};
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.error) {
    const reason = j.error?.errors?.[0]?.reason || '';
    const msg = `YouTube ${method} ${endpoint}: ${j.error?.message || res.statusText} (HTTP ${res.status}${reason ? `, ${reason}` : ''})`;
    if (res.status === 429 || res.status === 401 || /quota|rateLimit|userRateLimit|dailyLimit|spam|tooMany/i.test(`${reason} ${j.error?.message}`)) throw new StopError(msg);
    throw new Error(msg);
  }
  return j;
}

async function ytComments({ oldest, includeAnswered }) {
  const me = (await yt('GET', 'channels', { part: 'id', mine: 'true' })).items?.[0]?.id;
  ytUnits += 1;
  if (!me) throw new Error('YouTube: no channel for this token');
  const threads = [];
  let pageToken = '';
  for (let i = 0; i < 10; i++) {
    const j = await yt('GET', 'commentThreads', { part: 'snippet,replies', allThreadsRelatedToChannelId: me, maxResults: '100', order: 'time', textFormat: 'plainText', ...(pageToken ? { pageToken } : {}) });
    ytUnits += 1;
    threads.push(...(j.items || []));
    const last = j.items?.at(-1)?.snippet?.topLevelComment?.snippet?.publishedAt;
    if (!j.nextPageToken || (last && Date.parse(last) < oldest)) break;
    pageToken = j.nextPageToken;
  }
  const ids = [...new Set(threads.map((t) => t.snippet.videoId).filter(Boolean))];
  const titles = {};
  for (let i = 0; i < ids.length; i += 50) {
    const j = await yt('GET', 'videos', { part: 'snippet', id: ids.slice(i, i + 50).join(',') });
    ytUnits += 1;
    for (const v of j.items || []) titles[v.id] = `${v.snippet.title}\n${String(v.snippet.description || '').slice(0, 300)}`;
  }
  const out = [];
  for (const t of threads) {
    const s = t.snippet.topLevelComment.snippet;
    if (Date.parse(s.publishedAt) < oldest) continue;
    const own = s.authorChannelId?.value === me;
    let answered = (t.replies?.comments || []).some((c) => c.snippet.authorChannelId?.value === me);
    if (!answered && !own && !includeAnswered && t.snippet.totalReplyCount > (t.replies?.comments?.length || 0)) {
      const j = await yt('GET', 'comments', { part: 'snippet', parentId: t.id, maxResults: '100', textFormat: 'plainText' });
      ytUnits += 1;
      answered = (j.items || []).some((c) => c.snippet.authorChannelId?.value === me);
    }
    out.push({ platform: 'yt', id: t.id, key: `yt:${t.id}`, text: s.textOriginal || s.textDisplay || '', author: s.authorDisplayName, at: s.publishedAt, own, answered,
      canReply: t.snippet.canReply !== false, title: titles[s.videoId] || '', url: `https://www.youtube.com/watch?v=${s.videoId}&lc=${t.id}` });
  }
  return out.filter((c) => c.canReply || c.own);
}

const ytReply = (c, text) => yt('POST', 'comments', { part: 'snippet' }, { snippet: { parentId: c.id, textOriginal: text } }).then((j) => { ytUnits += 50; return j.id; });
const ytHide = (c) => yt('POST', 'comments/setModerationStatus', { id: c.id, moderationStatus: 'heldForReview' }).then(() => { ytUnits += 50; });

// Facebook + Instagram (Graph API) -------------------------------
const GRAPH = () => `https://graph.facebook.com/${ENV.META_API_VERSION || 'v27.0'}`;
// 4/17/32/613 = rate limits, 368 = temporarily blocked (spam), 190/102 = token, 10/200-299 = permission, 80001-80014 = BUC.
export const graphStops = (code, msg = '') => [4, 17, 32, 368, 613, 190, 102, 10].includes(code) || (code >= 200 && code < 300) || (code >= 80000 && code < 80100)
  || /rate limit|too many|spam|blocked|misus|limit reached/i.test(msg);
async function graph(method, endpoint, params = {}) {
  const body = new URLSearchParams({ ...params, access_token: ENV.META_PAGE_TOKEN });
  const res = await (method === 'GET' ? fetch(`${GRAPH()}/${endpoint}?${body}`, { signal: AbortSignal.timeout(60e3) })
    : fetch(`${GRAPH()}/${endpoint}`, { method, body, signal: AbortSignal.timeout(60e3) }));
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.error) {
    const e = j.error || {};
    const msg = redact(`${method} /${endpoint.split('?')[0]}: ${e.message || res.statusText} (code ${e.code ?? res.status}${e.error_subcode ? `/${e.error_subcode}` : ''})`);
    throw graphStops(e.code, e.message) ? new StopError(msg) : new Error(msg);
  }
  return j;
}
async function graphAll(endpoint, params, oldest, timeField, maxPages = 6) {
  const out = [];
  let after = '';
  for (let i = 0; i < maxPages; i++) {
    const j = await graph('GET', endpoint, { ...params, ...(after ? { after } : {}) });
    out.push(...(j.data || []));
    const last = j.data?.at(-1)?.[timeField];
    after = j.paging?.cursors?.after;
    if (!j.paging?.next || !after || (last && Date.parse(last) < oldest)) break;
  }
  return out;
}

async function fbComments({ oldest }) {
  const page = ENV.META_PAGE_ID;
  const sub = 'comments.limit(25){from}';
  const cf = `id,message,from,created_time,permalink_url,comment_count,${sub}`;
  const since = String(Math.floor(oldest / 1000));
  const [posts, reels, videos] = await Promise.all([
    graphAll(`${page}/published_posts`, { fields: `id,message,created_time,permalink_url,comments.filter(toplevel).limit(100){${cf}}`, since, limit: '50' }, oldest, 'created_time'),
    graphAll(`${page}/video_reels`, { fields: `id,description,created_time,permalink_url,comments.filter(toplevel).limit(100){${cf}}`, since, limit: '50' }, oldest, 'created_time').catch(() => []),
    graphAll(`${page}/videos`, { fields: `id,title,description,created_time,permalink_url,comments.filter(toplevel).limit(100){${cf}}`, since, limit: '50' }, oldest, 'created_time').catch(() => []),
  ]);
  const byKey = new Map();
  for (const p of [...reels, ...videos, ...posts]) {
    const title = [p.title, p.description, p.message].filter(Boolean).join('\n').slice(0, 400);
    for (const c of p.comments?.data || []) {
      const key = `fb:${String(c.id).split('_').pop()}`;
      const prev = byKey.get(key);
      if (prev) { if (!prev.title && title) prev.title = title; continue; }
      byKey.set(key, { platform: 'fb', id: c.id, key, text: c.message || '', author: c.from?.name || '', at: new Date(c.created_time).toISOString(),
        own: c.from?.id === page, answered: (c.comments?.data || []).some((r) => r.from?.id === page), title, url: c.permalink_url || p.permalink_url || '' });
    }
  }
  return [...byKey.values()];
}
const fbReply = (c, text) => graph('POST', `${c.id}/comments`, { message: text }).then((j) => j.id);
const fbLike = (c) => graph('POST', `${c.id}/likes`);
const fbHide = (c) => graph('POST', c.id, { is_hidden: 'true' });

async function igComments({ oldest }) {
  const ig = ENV.IG_USER_ID;
  const me = (await graph('GET', ig, { fields: 'username' })).username;
  const media = await graphAll(`${ig}/media`, { fields: 'id,caption,timestamp,permalink,comments_count,comments.limit(50){id,text,username,from,timestamp,hidden,replies.limit(25){from,username}}', limit: '50' }, oldest, 'timestamp');
  const out = [];
  for (const m of media) {
    if (!m.comments_count) continue;
    for (const c of m.comments?.data || []) {
      if (c.hidden) continue;
      const own = c.from?.id === ig || c.username === me;
      const answered = (c.replies?.data || []).some((r) => r.from?.id === ig || r.username === me);
      out.push({ platform: 'ig', id: c.id, key: `ig:${c.id}`, text: c.text || '', author: c.username || '', at: new Date(c.timestamp).toISOString(), own, answered,
        title: String(m.caption || '').slice(0, 400), url: m.permalink || '' });
    }
  }
  return out;
}
const igReply = (c, text) => graph('POST', `${c.id}/replies`, { message: text }).then((j) => j.id);
const igHide = (c) => graph('POST', c.id, { hide: 'true' });

const CLIENTS = {
  yt: { name: 'YouTube', ready: () => YT_KEYS.every((k) => ENV[k]), fetch: ytComments, reply: ytReply, hide: ytHide },
  fb: { name: 'Facebook', ready: () => Boolean(ENV.META_PAGE_TOKEN && ENV.META_PAGE_ID), fetch: fbComments, reply: fbReply, like: fbLike, hide: fbHide },
  ig: { name: 'Instagram', ready: () => Boolean(ENV.META_PAGE_TOKEN && ENV.IG_USER_ID), fetch: igComments, reply: igReply, hide: igHide },
};

// ---------------------------------------------------------------- commands

const args = process.argv.slice(2);
const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const ghOut = (k, v) => { if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`); };
const short = (t, n = 70) => { const s = String(t).replace(/\s+/g, ' ').trim(); return [...s].length > n ? `${[...s].slice(0, n).join('')}…` : s; };

/** The next festivals (21 days) from automation/festivals.json: certain dates Claude may use to answer questions. */
export function upcoming(now = Date.now(), file = path.join(ROOT, 'automation', 'festivals.json')) {
  try {
    const today = istDate(now);
    const end = istDate(now + 21 * 864e5);
    return (JSON.parse(fs.readFileSync(file, 'utf8')).festivals || []).filter((f) => f.date >= today && f.date <= end)
      .map((f) => ({ date: f.date, name: f.label, hi: f.names?.[0]?.hi || '' }));
  } catch { return []; }
}

async function collect() {
  const out = opt('--out') || path.join(ROOT, '.comments-work', 'pending.json');
  const since = opt('--since');
  const includeAnswered = args.includes('--include-answered');
  const platforms = (opt('--platform') || 'yt,fb,ig').split(',').map((s) => s.trim()).filter((p) => CLIENTS[p]);
  const now = Date.now();
  const oldest = since ? Date.parse(since) : now - LIMITS.maxAgeDays * 864e5;
  const state = pruneState(loadState(), now);
  const comments = [];
  const errors = {};
  for (const p of platforms) {
    const cl = CLIENTS[p];
    if (!cl.ready()) { errors[p] = 'not configured'; continue; }
    try { comments.push(...await cl.fetch({ oldest, includeAnswered })); } catch (e) { errors[p] = redact(e.message); }
  }
  const hasAi = process.env.HAS_CLAUDE !== 'false';
  const { items, skipped } = planComments(comments, state, { now, since, includeAnswered, hasAi });
  const pending = { generatedAt: new Date(now).toISOString(), dryRun: Boolean(since || includeAnswered) || args.includes('--dry-run'), upcoming: upcoming(now), errors, skipped, ytUnitsRead: ytUnits, items };
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(pending, null, 2)}\n`);
  const ai = items.filter((x) => x.needsAi).length;
  ghOut('total', items.length);
  ghOut('ai', ai);
  const by = (k) => items.filter((x) => x.action.startsWith(k)).length;
  console.log(`### Comments: ${comments.length} read (${platforms.map((p) => `${p} ${comments.filter((c) => c.platform === p).length}`).join(', ')}), ${items.length} to act on`);
  console.log(`replies ${items.filter((x) => x.reply || x.needsAi).length} (Claude ${ai}, templates ${items.filter((x) => x.reply && !x.needsAi).length}), hide ${by('hide')}, flag ${by('flag') + by('thanks')}; skipped ${JSON.stringify(skipped)}; YouTube read units ${ytUnits}`);
  for (const [p, e] of Object.entries(errors)) console.log(`::warning::comments ${p}: ${e}`);
  return pending;
}

function readJson(file, fallback) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } }

/** Claude's replies: {"<key>": "reply" | "SKIP: reason"}. Returns {final: Map(key -> {text, source}), problems: {key: [..]}}. */
export function resolveReplies(items, replies = {}, recent = new Set()) {
  const final = new Map();
  const problems = {};
  const used = new Set(recent);
  for (const it of items) {
    if (!(it.reply || it.needsAi)) continue;
    const ai = it.needsAi ? replies[it.key] : undefined;
    if (typeof ai === 'string' && /^SKIP\b/i.test(ai.trim())) { final.set(it.key, { text: null, source: 'skip', note: ai.trim() }); continue; }
    if (typeof ai === 'string' && ai.trim()) {
      const pr = checkReply(ai, it, used);
      if (!pr.length) { final.set(it.key, { text: ai.trim(), source: 'claude' }); used.add(norm(ai)); continue; }
      problems[it.key] = pr;
    } else if (it.needsAi) problems[it.key] = ['no reply written'];
    const tpl = it.reply && !checkReply(it.reply, it, new Set()).length ? it.reply : null;
    final.set(it.key, { text: tpl, source: tpl ? 'template' : 'none' });
    if (tpl) used.add(norm(tpl));
  }
  return { final, problems };
}

function check() {
  const pending = readJson(opt('--in'), { items: [] });
  const replies = readJson(opt('--replies'), {});
  const state = loadState();
  const { problems } = resolveReplies(pending.items.filter((x) => x.needsAi), replies, recentSet(state));
  const keys = Object.keys(problems);
  for (const k of keys) console.log(`${k}: ${problems[k].join('; ')}`);
  console.log(keys.length ? `${keys.length} reply(s) need fixing (others pass)` : `all ${pending.items.filter((x) => x.needsAi).length} replies pass`);
  if (keys.length) process.exitCode = 1;
}

async function post({ pending, replies = {}, dryRun }) {
  const now = Date.now();
  const state = pruneState(loadState(), now);
  const today = istDate(now);
  state.daily[today] ||= { yt: 0, fb: 0, ig: 0 };
  const { final, problems } = resolveReplies(pending.items, replies, recentSet(state, now));
  const stopped = {};
  const report = [];
  let posted = 0;
  let first = true;
  const flag = (it, reason) => {
    if (dryRun || state.flags.some((f) => f.key === it.key)) return;
    state.flags.push({ key: it.key, at: new Date().toISOString(), platform: it.platform, author: it.author, text: short(it.text, 300), reason, url: it.url, title: short(it.title, 80) });
  };
  const mark = (it, action, extra = {}) => { if (!dryRun) state.handled[it.key] = { at: new Date().toISOString(), action, ...extra }; };
  for (const it of pending.items) {
    const cl = CLIENTS[it.platform];
    const row = { platform: it.platform, comment: short(it.text, 60), deity: it.deity, lang: it.lang, kind: it.kind };
    if (stopped[it.platform]) { report.push({ ...row, result: `not done (${cl.name} stopped this run)` }); continue; }
    try {
      if (it.action === 'hide') {
        if (!dryRun) await cl.hide(it);
        flag(it, `hidden: ${it.reason}`);
        mark(it, 'hidden', { reason: it.reason });
        report.push({ ...row, result: `${dryRun ? 'would hide' : 'hidden'} (${it.reason})` });
        continue;
      }
      if (it.action === 'flag') {
        flag(it, it.reason);
        mark(it, 'flagged', { reason: it.reason });
        report.push({ ...row, result: `left for the owner (${it.reason})` });
        continue;
      }
      const r = final.get(it.key);
      if (!r?.text) {
        flag(it, r?.source === 'skip' ? `Claude: ${r.note}` : `no safe reply (${(problems[it.key] || []).join('; ') || 'no template left'})`);
        mark(it, 'flagged', { reason: 'no reply' });
        report.push({ ...row, result: `no reply, flagged (${r?.note || (problems[it.key] || []).join('; ') || 'no template'})` });
        continue;
      }
      if (it.platform === 'yt' && state.daily[today].yt >= LIMITS.ytPerDay) { report.push({ ...row, reply: r.text, result: 'not done (YouTube daily cap)' }); continue; }
      if (it.action === 'thanks+flag') flag(it, it.reason);
      if (dryRun) { report.push({ ...row, reply: r.text, source: r.source, result: 'dry run' }); continue; }
      if (!first) await sleep(LIMITS.delayMs[0] + Math.random() * (LIMITS.delayMs[1] - LIMITS.delayMs[0]));
      first = false;
      const id = await cl.reply(it, r.text);
      posted++;
      state.daily[today][it.platform] = (state.daily[today][it.platform] || 0) + 1;
      state.recent.push({ text: r.text, at: new Date().toISOString() });
      mark(it, 'replied', { reply: r.text, source: r.source, replyId: id });
      let liked = '';
      if (cl.like) { try { await cl.like(it); liked = ' + liked'; } catch (e) { if (e instanceof StopError) stopped[it.platform] = e.message; } }
      report.push({ ...row, reply: r.text, source: r.source, result: `replied${liked}` });
      fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
      fs.writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 1)}\n`); // after every reply: a crash never loses one
    } catch (e) {
      const msg = redact(e.message);
      if (e instanceof StopError) stopped[it.platform] = msg;
      else if (!dryRun) state.handled[it.key] = { at: new Date().toISOString(), action: 'error', error: msg, tries: (state.handled[it.key]?.tries || 0) + 1 };
      report.push({ ...row, result: `error: ${msg}` });
    }
  }
  if (!dryRun) {
    state.lastRun = new Date().toISOString();
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 1)}\n`);
  }
  console.log(`### Comment replies ${dryRun ? '(DRY RUN: nothing posted)' : ''}`);
  console.log(`${posted} posted; YouTube units this run ~${ytUnits}${Object.keys(stopped).length ? `; stopped: ${Object.entries(stopped).map(([p, m]) => `${p} (${m})`).join(', ')}` : ''}`);
  console.log('');
  console.log('| platform | comment | deity / lang | reply | result |');
  console.log('|---|---|---|---|---|');
  const cell = (t) => String(t ?? '').replace(/\|/g, '/').replace(/\r?\n/g, ' ⏎ ');
  for (const r of report) console.log(`| ${r.platform} | ${cell(r.comment)} | ${r.deity} / ${r.lang} (${r.kind}) | ${cell(r.reply || '')}${r.source ? ` _(${r.source})_` : ''} | ${cell(r.result)} |`);
  return { posted, stopped, report };
}

/** Markdown for the owner (share kit): comments flagged in the last `hours`. */
export function digestMarkdown(state = loadState(), { hours = 24, now = Date.now() } = {}) {
  const flags = (state.flags || []).filter((f) => Date.parse(f.at) > now - hours * 3600e3);
  const replied = Object.values(state.handled || {}).filter((h) => h.action === 'replied' && Date.parse(h.at) > now - hours * 3600e3).length;
  if (!flags.length && !replied) return '';
  const name = { yt: 'YouTube', fb: 'Facebook', ig: 'Instagram' };
  const L = ['## Comments (automatic replies)', '', `Last ${hours} h: ${replied} comment(s) answered automatically.${flags.length ? ` ${flags.length} need your eyes:` : ''}`];
  for (const f of flags) L.push(`- ${name[f.platform] || f.platform}${f.author ? ` · ${f.author}` : ''} · ${f.reason}: "${short(f.text, 160)}"${f.url ? ` ${f.url}` : ''}`);
  if (flags.length) L.push('', 'Hidden comments are only hidden (FB/IG hide, YouTube "held for review"): un-hide them on the platform if one was fine. Nothing is deleted.');
  return `${L.join('\n')}\n`;
}

async function main() {
  const cmd = args[0];
  if (cmd === 'collect') { await collect(); return; }
  if (cmd === 'check') { check(); return; }
  if (cmd === 'post') {
    const pending = readJson(opt('--in'), null);
    if (!pending) { console.log('comments: no pending file, nothing to post'); return; }
    await post({ pending, replies: readJson(opt('--replies'), {}), dryRun: args.includes('--dry-run') || pending.dryRun });
    return;
  }
  if (cmd === 'run') {
    if (!args.includes('--dry-run')) throw new Error('run is for local dry runs: add --dry-run');
    const pending = await collect();
    await post({ pending, dryRun: true });
    return;
  }
  if (cmd === 'digest') { console.log(digestMarkdown(loadState(), { hours: Number(opt('--hours') || 24) }) || 'No comment activity.'); return; }
  throw new Error('Usage: comments.mjs collect | check | post | run --dry-run | digest (see the header)');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((e) => { console.log(`::warning::comments: ${redact(e.message)}`); });
}
