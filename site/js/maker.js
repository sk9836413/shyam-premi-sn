// Greeting card editor for the Shyam Premi SN card pages (plain ES module, no build step, no framework).
// A page mounts it with <div id="maker" data-kit="janmotsav|diwali" data-lang="hi|en"></div>.
// Everything happens in the browser: photos are read into a canvas on this device and never uploaded, and a shared link
// carries only the names, the occasion, the design and the message number.
import { CARD_SIZES, DESIGNS, drawFrame, loadCardFonts, paintCard } from './diwali-card.js';
import { FESTIVALS, LINES, TITLES, messagesFor } from './diwali-messages.js';
import { JANMOTSAV_DESIGNS } from './janmotsav-card.js';
import { JANMOTSAV_LINES, OCCASION_TITLES, OCCASIONS, janmotsavMessages } from './janmotsav-messages.js';

const UI = {
  en: {
    from: 'Your name',
    fromHint: 'shown as the sender',
    fromPh: 'e.g. Priya Sharma',
    to: 'Send to',
    toHint: 'optional',
    toPh: 'e.g. Mummy, Rahul, Sharma family',
    festival: 'Festival',
    language: 'Card language',
    format: 'Size',
    story: 'Status 9:16',
    square: 'Post 1:1',
    design: 'Design',
    next: 'Next message',
    of: 'of',
    edit: 'Write or edit the message yourself',
    reset: 'Back to the ready-made message',
    png: 'Download PNG',
    share: 'Share on WhatsApp',
    linkOnly: 'Send only the link on WhatsApp',
    copy: 'Copy card link',
    copied: 'Link copied',
    video: 'Download video',
    recording: 'Recording',
    shareVideo: 'Share video',
    loading: 'Loading the card fonts…',
    received: (n) => `${n} sent you Diwali wishes.`,
    receivedSub: 'This card was made with your name. Send one back with your own name.',
    makeOwn: 'Make your own card',
    preview: 'Diwali card preview',
    note: 'Tip: for WhatsApp status, choose Status 9:16. The video is a 5-second loop with flickering diyas.',
    photo: 'Your photo',
    addPhoto: 'Add a photo',
    addSecond: 'Add a second photo',
    remove: 'Remove',
    zoom: 'Zoom',
    frame: 'Photo frame',
    frames: { circle: 'Circle', arch: 'Arch', flame: 'Diya' },
    drag: 'Drag the photo on the card to move it inside the frame.',
    photoPrivacy: 'Your photo stays on your phone and is never uploaded. (Aapki photo sirf aapke phone mein rehti hai, kahin upload nahi hoti.)',
    photoError: 'This photo could not be opened. Try a JPG or PNG.',
    photoN: (n) => `Photo ${n}`,
  },
  hi: {
    from: 'आपका नाम',
    fromHint: 'भेजने वाले के रूप में दिखेगा',
    fromPh: 'जैसे: प्रिया शर्मा',
    to: 'किसे भेजना है',
    toHint: 'वैकल्पिक',
    toPh: 'जैसे: मम्मी, राहुल, शर्मा परिवार',
    festival: 'त्योहार',
    language: 'कार्ड की भाषा',
    format: 'साइज़',
    story: 'स्टेटस 9:16',
    square: 'पोस्ट 1:1',
    design: 'डिज़ाइन',
    next: 'अगला संदेश',
    of: '/',
    edit: 'संदेश खुद लिखें या बदलें',
    reset: 'तैयार संदेश पर वापस जाएँ',
    png: 'PNG डाउनलोड करें',
    share: 'व्हाट्सऐप पर भेजें',
    linkOnly: 'व्हाट्सऐप पर सिर्फ़ लिंक भेजें',
    copy: 'कार्ड का लिंक कॉपी करें',
    copied: 'लिंक कॉपी हो गया',
    video: 'वीडियो डाउनलोड करें',
    recording: 'रिकॉर्ड हो रहा है',
    shareVideo: 'वीडियो भेजें',
    loading: 'कार्ड के फ़ॉन्ट लोड हो रहे हैं…',
    received: (n) => `${n} ने आपको दीपावली की शुभकामनाएँ भेजी हैं।`,
    receivedSub: 'यह कार्ड आपके नाम से बना है। अपने नाम से एक कार्ड वापस भेजें।',
    makeOwn: 'अपना कार्ड बनाएँ',
    preview: 'दीपावली कार्ड का प्रीव्यू',
    note: 'व्हाट्सऐप स्टेटस के लिए स्टेटस 9:16 चुनें। वीडियो 5 सेकंड का है, जिसमें दीये टिमटिमाते हैं।',
    photo: 'आपकी फ़ोटो',
    addPhoto: 'फ़ोटो जोड़ें',
    addSecond: 'दूसरी फ़ोटो जोड़ें',
    remove: 'हटाएँ',
    zoom: 'ज़ूम',
    frame: 'फ़ोटो फ़्रेम',
    frames: { circle: 'गोल', arch: 'मेहराब', flame: 'दीया' },
    drag: 'फ़ोटो को फ़्रेम के अंदर खिसकाने के लिए कार्ड पर उसे खींचें।',
    photoPrivacy: 'आपकी फ़ोटो सिर्फ़ आपके फ़ोन में रहती है, कहीं अपलोड नहीं होती।',
    photoError: 'यह फ़ोटो नहीं खुल पाई। JPG या PNG फ़ोटो आज़माएँ।',
    photoN: (n) => `फ़ोटो ${n}`,
  },
};

const LANGS = [
  ['hi', 'हिन्दी'],
  ['en', 'English'],
  ['hing', 'Hinglish'],
];

const OPEN_LINE = { hi: 'अपना कार्ड खोलें', en: 'Open your card', hing: 'Apna card kholein' };
const VIDEO_TYPES = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
const VIDEO_SECONDS = 5;
const MAX_NAME = 40;
const MAX_PHOTO = 1600;

/** Festival to preselect on the main Diwali days (local date); otherwise the general "Happy Diwali". */
function festivalForToday() {
  const d = new Date();
  const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  if (key === '2026-11-6') return 'dhanteras';
  if (key === '2026-11-8') return 'diwali';
  return 'season';
}

/** What a card maker is about: its designs, occasions, titles and wishes. */
const KITS = {
  diwali: {
    designs: DESIGNS,
    festivals: FESTIVALS,
    titles: TITLES,
    lines: LINES,
    messagesFor,
    defaultFestival: (shyam) => (shyam ? 'shyam' : festivalForToday()),
    filePrefix: 'diwali-card',
  },
  // Khatu Shyam Janmotsav: Dev Uthani (Prabodhini) Ekadashi, Fri 20 Nov 2026 (Drik Panchang, New Delhi; Prokerala).
  janmotsav: {
    designs: JANMOTSAV_DESIGNS,
    festivals: OCCASIONS,
    titles: OCCASION_TITLES,
    lines: JANMOTSAV_LINES,
    messagesFor: janmotsavMessages,
    defaultFestival: () => 'janmotsav',
    defaultLang: 'hi',
    filePrefix: 'shyam-janmotsav-card',
    ui: {
      en: {
        festival: 'Occasion',
        received: (n) => `${n} sent you Shyam Janmotsav wishes. Jai Shree Shyam!`,
        preview: 'Khatu Shyam Janmotsav card preview',
        note: 'Tip: for WhatsApp status, choose Status 9:16 (1080 × 1920). For a post or a family group, choose Post 1:1. The video is a 5-second loop with glowing diyas.',
      },
      hi: {
        festival: 'अवसर',
        received: (n) => `${n} ने आपको श्याम जन्मोत्सव की बधाई भेजी है। जय श्री श्याम!`,
        preview: 'श्याम जन्मोत्सव कार्ड का प्रीव्यू',
        note: 'व्हाट्सऐप स्टेटस के लिए स्टेटस 9:16 (1080 × 1920) चुनें, पोस्ट या फ़ैमिली ग्रुप के लिए पोस्ट 1:1। वीडियो 5 सेकंड का है, जिसमें दीये जगमगाते हैं।',
      },
    },
  },
};

/** Read a photo upright (EXIF orientation) and shrink it to at most 1600 px. It stays in memory on this device. */
async function loadPhoto(file) {
  let src;
  let url = '';
  try {
    src = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    url = URL.createObjectURL(file);
    src = await new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = url;
    });
  }
  const iw = src instanceof HTMLImageElement ? src.naturalWidth : src.width;
  const ih = src instanceof HTMLImageElement ? src.naturalHeight : src.height;
  const k = Math.min(1, MAX_PHOTO / Math.max(iw, ih));
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(iw * k));
  cv.height = Math.max(1, Math.round(ih * k));
  cv.getContext('2d').drawImage(src, 0, 0, cv.width, cv.height);
  if ('close' in src) src.close();
  if (url) URL.revokeObjectURL(url);
  return cv;
}

/** Keep a dragged photo covering its frame: x and y are fractions of the frame size. */
function clampPhoto(ph, w, h) {
  const sc = Math.max(w / ph.img.width, h / ph.img.height) * ph.zoom;
  const mx = (ph.img.width * sc - w) / 2 / w;
  const my = (ph.img.height * sc - h) / 2 / h;
  return { ...ph, x: Math.max(-mx, Math.min(mx, ph.x)), y: Math.max(-my, Math.min(my, ph.y)) };
}

const clean = (v) => (v ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
const fileSlug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);

/** Save a Blob as a file. Works on Android Chrome and iOS Safari (opens the share/save sheet). */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Tiny element helper: h('button', { class: 'button', onclick: fn }, 'Text'). */
function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'hidden') el[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat()) if (c !== undefined && c !== null && c !== false) el.append(c);
  return el;
}

let uid = 0;
const nextId = (p) => `${p}-${++uid}`;

/** Radio buttons styled as a segmented control (keyboard and screen-reader friendly). */
function segmented(legend, options, onChange) {
  const name = nextId('seg');
  const inputs = options.map(([v]) => h('input', { type: 'radio', name, value: v, onchange: () => onChange(v) }));
  const el = h('fieldset', { class: 'tool-segmented' }, h('legend', {}, legend), options.map(([, label], i) => h('label', {}, inputs[i], h('span', {}, label))));
  return { el, set: (value) => inputs.forEach((inp) => (inp.checked = inp.value === value)) };
}

export function mount(root, kitName = 'diwali', lang = 'hi') {
  const kit = KITS[kitName] ?? KITS.diwali;
  const t = { ...UI[lang], ...(kit.ui?.[lang] ?? {}) };
  const ALL = kit.designs;
  const SHYAM_FIRST = [...ALL.filter((d) => d.shyam), ...ALL.filter((d) => !d.shyam)];

  // ---- state, read from a shared link (?to=&from=&f=&d=&l=&m=&size=&theme=) ----
  const q = new URLSearchParams(window.location.search);
  const shyamTheme = q.get('theme') === 'shyam';
  const qf = q.get('f');
  const ql = q.get('l');
  const qd = q.get('d');
  const qm = Number(q.get('m'));
  const S = {
    from: q.get('from') ? clean(q.get('from')) : '',
    to: q.get('to') ? clean(q.get('to')) : '',
    festival: kit.festivals.some((f) => f.id === qf) ? qf : kit.defaultFestival(shyamTheme),
    cardLang: ql === 'hi' || ql === 'en' || ql === 'hing' ? ql : shyamTheme ? 'hi' : kit.defaultLang ?? (lang === 'hi' ? 'hi' : 'en'),
    designId: ALL.some((d) => d.id === qd) ? qd : shyamTheme ? SHYAM_FIRST[0].id : ALL[0].id,
    format: q.get('size') === 'square' ? 'square' : 'story',
    msgIndex: Number.isInteger(qm) && qm > 0 && qm < 60 ? qm : 0,
    custom: null,
    received: q.get('from') ? clean(q.get('from')) : null,
    fontsReady: false,
    recording: 0,
    video: null,
    copied: false,
    photos: [],
    frame: 'circle',
    photoError: false,
  };
  const shyamFirst = shyamTheme;
  const designs = shyamFirst ? SHYAM_FIRST : ALL;
  let videoMime = null;
  if (typeof MediaRecorder !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function') {
    videoMime = VIDEO_TYPES.find((m) => MediaRecorder.isTypeSupported(m)) ?? null;
  }
  let card = null;

  // ---- derived values ----
  const design = () => ALL.find((d) => d.id === S.designId) ?? ALL[0];
  const messages = () => kit.messagesFor(S.festival, S.cardLang);
  const message = () => S.custom ?? messages()[S.msgIndex % messages().length];
  const titles = () => kit.titles[S.festival][S.cardLang];
  const toName = () => clean(S.to);
  const fromName = () => clean(S.from);
  const cardText = () => {
    const [title, subtitle] = titles();
    return {
      greeting: toName() ? kit.lines[S.cardLang].dear(toName()) : undefined,
      title,
      subtitle,
      message: message(),
      signoff: fromName() ? kit.lines[S.cardLang].signoff : undefined,
      from: fromName() || undefined,
      photos: S.photos,
      frame: S.frame,
    };
  };
  const baseName = () => `${kit.filePrefix}-${fileSlug(fromName()) || 'shyam-premi'}-${S.format === 'story' ? '1080x1920' : '1080x1080'}`;

  function cardLink() {
    const p = new URLSearchParams();
    if (toName()) p.set('to', toName());
    if (fromName()) p.set('from', fromName());
    p.set('f', S.festival);
    p.set('l', S.cardLang);
    p.set('d', design().id);
    if (S.custom === null && S.msgIndex) p.set('m', String(S.msgIndex % messages().length));
    if (S.format === 'square') p.set('size', 'square');
    if (shyamFirst || S.festival === 'shyam' || design().shyam) p.set('theme', 'shyam');
    return `${window.location.origin}${window.location.pathname}?${p}`;
  }

  function shareText() {
    const [title] = titles();
    const head = `${title}${toName() ? `, ${toName()}` : ''}!`;
    return `${head}\n${message()}${fromName() ? `\n- ${fromName()}` : ''}\n\n${OPEN_LINE[S.cardLang]}: ${cardLink()}`;
  }

  // ---- DOM ----
  const ids = { from: nextId('from'), to: nextId('to'), fest: nextId('fest'), msg: nextId('msg') };
  const set = (patch) => {
    Object.assign(S, patch);
    update();
  };

  const receivedTitle = h('p', { class: 'dw-received__title' });
  const receivedBox = h(
    'div',
    { class: 'dw-received', role: 'status', hidden: true },
    receivedTitle,
    h('p', {}, t.receivedSub),
    h('button', { type: 'button', class: 'button', onclick: makeOwn }, t.makeOwn),
  );

  const fromInput = h('input', { id: ids.from, class: 'input', maxlength: MAX_NAME, placeholder: t.fromPh, autocomplete: 'name', oninput: (e) => set({ from: e.target.value }) });
  const toInput = h('input', { id: ids.to, class: 'input', maxlength: MAX_NAME, placeholder: t.toPh, autocomplete: 'off', oninput: (e) => set({ to: e.target.value }) });

  const photoRows = h('div', { class: 'dw-photo__rows' });
  const fileInput = h('input', {
    type: 'file',
    accept: 'image/*',
    onchange: (e) => {
      addPhoto(e.target.files?.[0]);
      e.target.value = '';
    },
  });
  const fileText = document.createTextNode('');
  const fileLabel = h('label', { class: 'button button--ghost button--small dw-file' }, fileText, fileInput);
  const frameSeg = segmented(t.frame, [['circle', t.frames.circle], ['arch', t.frames.arch], ['flame', t.frames.flame]], (v) => set({ frame: v }));
  const frameBox = h('div', { class: 'dw-photo__frame' }, frameSeg.el, h('p', { class: 'meta' }, t.drag));
  const photoErr = h('p', { class: 'tool-error', hidden: true }, t.photoError);

  const festSelect = h(
    'select',
    {
      id: ids.fest,
      class: 'input',
      onchange: (e) => set({ festival: e.target.value, msgIndex: 0, custom: null }),
    },
    kit.festivals.map((f) => h('option', { value: f.id }, f[lang])),
  );
  const langSeg = segmented(t.language, LANGS, (v) => set({ cardLang: v, custom: null }));
  const formatSeg = segmented(t.format, [['story', t.story], ['square', t.square]], (v) => set({ format: v }));
  const msgArea = h('textarea', { id: ids.msg, 'aria-label': t.edit, class: 'tool-textarea', rows: 4, maxlength: 240, oninput: (e) => set({ custom: e.target.value }) });
  const resetBtn = h('button', { type: 'button', class: 'button button--ghost button--small', style: 'margin-top:0.5rem', onclick: () => set({ custom: null }) }, t.reset);
  const details = h('details', { class: 'dw-edit' }, h('summary', {}, t.edit), h('label', { class: 'tool-label', for: ids.msg, style: 'margin-top:0.6rem' }, msgArea), resetBtn);

  const form = h(
    'form',
    { class: 'tool-form dw-form', onsubmit: (e) => e.preventDefault() },
    h(
      'div',
      { class: 'tool-form__row' },
      h('label', { class: 'tool-label', for: ids.from }, t.from, ' ', h('span', { class: 'meta' }, t.fromHint), fromInput),
      h('label', { class: 'tool-label', for: ids.to }, t.to, ' ', h('span', { class: 'meta' }, t.toHint), toInput),
    ),
    h(
      'fieldset',
      { class: 'dw-photo' },
      h('legend', {}, t.photo, ' ', h('span', { class: 'meta' }, t.toHint)),
      photoRows,
      fileLabel,
      frameBox,
      photoErr,
      h('p', { class: 'tool-privacy dw-photo__privacy' }, t.photoPrivacy),
    ),
    h('label', { class: 'tool-label', for: ids.fest }, t.festival, festSelect),
    langSeg.el,
    formatSeg.el,
    details,
  );

  const [W0, H0] = CARD_SIZES[S.format];
  const canvas = h('canvas', { width: W0, height: H0, class: 'dw-canvas', role: 'img' });
  const loading = h('p', { class: 'dw-loading' }, t.loading);
  const stage = h('div', { class: 'dw-stage' }, loading, canvas);
  const counter = h('span', { class: 'meta' });
  const nextBtn = h(
    'button',
    {
      type: 'button',
      class: 'button button--ghost',
      onclick: () => set({ custom: null, msgIndex: (S.msgIndex + 1) % messages().length }),
    },
    t.next,
  );
  const thumbs = {};
  const designBtns = designs.map((d) => {
    const cv = h('canvas', { width: 144, height: 144, 'aria-hidden': 'true' });
    thumbs[d.id] = cv;
    return h('button', { type: 'button', role: 'radio', class: 'dw-design', 'data-id': d.id, onclick: () => set({ designId: d.id }) }, cv, h('span', {}, lang === 'hi' ? d.nameHi : d.name));
  });
  const shareBtn = h('button', { type: 'button', class: 'button dw-share', onclick: shareImage }, t.share);
  const pngBtn = h('button', { type: 'button', class: 'button button--ghost', onclick: downloadPng }, t.png);
  const videoBtn = videoMime ? h('button', { type: 'button', class: 'button button--ghost', onclick: recordVideo }) : null;
  const shareVideoBtn = h('button', { type: 'button', class: 'button button--ghost', hidden: true, onclick: () => S.video && shareFile(S.video) }, t.shareVideo);
  const copyBtn = h('button', { type: 'button', class: 'button button--ghost button--small', onclick: copyLink });
  const linkOnly = h(
    'a',
    {
      class: 'text-link',
      href: 'https://wa.me/',
      target: '_blank',
      rel: 'noopener noreferrer',
      onclick: (e) => {
        e.preventDefault();
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText())}`, '_blank', 'noopener');
      },
    },
    t.linkOnly,
  );

  const preview = h(
    'div',
    { class: 'dw-preview' },
    stage,
    h('div', { class: 'tool-actions dw-next' }, nextBtn, counter),
    h('p', { class: 'dw-label' }, t.design),
    h('div', { class: 'dw-designs', role: 'radiogroup', 'aria-label': t.design }, designBtns),
    h('div', { class: 'tool-actions dw-actions' }, shareBtn, pngBtn, videoBtn, shareVideoBtn),
    h('div', { class: 'tool-actions', style: 'margin-top:0.6rem' }, linkOnly, copyBtn),
    h('p', { class: 'tool-note' }, t.note),
  );

  root.replaceChildren(h('div', { class: 'tool dw' }, receivedBox, h('div', { class: 'dw-grid' }, form, preview)));

  // ---- render ----
  let painted = null;
  let thumbsFor = '';
  let rowsFor = -1;

  function renderPhotoRows() {
    if (rowsFor === S.photos.length) {
      photoRows.querySelectorAll('input[type=range]').forEach((r, i) => {
        if (S.photos[i] && Number(r.value) !== S.photos[i].zoom) r.value = String(S.photos[i].zoom);
      });
      return;
    }
    rowsFor = S.photos.length;
    photoRows.replaceChildren(
      ...S.photos.map((ph, i) =>
        h(
          'div',
          { class: 'dw-photo__row' },
          h('span', { class: 'dw-photo__name' }, t.photoN(i + 1)),
          h(
            'label',
            { class: 'dw-photo__zoom' },
            t.zoom,
            h('input', {
              type: 'range',
              min: 1,
              max: 3,
              step: 0.05,
              value: ph.zoom,
              oninput: (e) => {
                const zoom = Number(e.target.value);
                set({ photos: S.photos.map((p, k) => (k === i ? { ...p, zoom } : p)) });
              },
            }),
          ),
          h('button', { type: 'button', class: 'button button--ghost button--small', onclick: () => set({ photos: S.photos.filter((_, k) => k !== i) }) }, t.remove),
        ),
      ),
    );
  }

  function update() {
    const d = design();
    const text = cardText();
    const msgs = messages();

    receivedBox.hidden = !S.received;
    if (S.received) receivedTitle.textContent = t.received(S.received);
    if (fromInput.value !== S.from) fromInput.value = S.from;
    if (toInput.value !== S.to) toInput.value = S.to;

    renderPhotoRows();
    fileLabel.hidden = S.photos.length >= 2;
    fileText.textContent = S.photos.length ? t.addSecond : t.addPhoto;
    frameBox.hidden = S.photos.length === 0;
    frameSeg.set(S.frame);
    photoErr.hidden = !S.photoError;

    festSelect.value = S.festival;
    langSeg.set(S.cardLang);
    formatSeg.set(S.format);
    if (msgArea.value !== text.message) msgArea.value = text.message;
    if (S.custom !== null) details.open = true;
    resetBtn.hidden = S.custom === null;

    stage.dataset.format = S.format;
    loading.hidden = S.fontsReady;
    if (S.photos.length) canvas.dataset.photos = String(S.photos.length);
    else delete canvas.dataset.photos;
    canvas.setAttribute('aria-label', `${t.preview}: ${text.title}. ${text.message}`);
    counter.textContent = `${(S.msgIndex % msgs.length) + 1} ${t.of} ${msgs.length}`;
    designBtns.forEach((b) => b.setAttribute('aria-checked', String(b.dataset.id === d.id)));

    shareBtn.disabled = pngBtn.disabled = !S.fontsReady;
    if (videoBtn) {
      videoBtn.disabled = !S.fontsReady || S.recording > 0;
      videoBtn.textContent = S.recording ? `${t.recording}… ${S.recording}` : `${t.video} (${videoMime.startsWith('video/mp4') ? 'MP4' : 'WebM'})`;
    }
    shareVideoBtn.hidden = !(S.video && navigator.canShare?.({ files: [S.video] }));
    copyBtn.textContent = S.copied ? t.copied : t.copy;

    if (!S.fontsReady) return;

    // Paint the card when an input that shows on it changed.
    const sig = JSON.stringify([d.id, S.format, text.greeting, text.title, text.subtitle, text.message, text.signoff, text.from, S.frame]);
    if (!painted || painted.sig !== sig || painted.photos !== S.photos) {
      painted = { sig, photos: S.photos };
      card = paintCard(d, S.format, text);
      canvas.width = card.base.width;
      canvas.height = card.base.height;
      drawFrame(canvas.getContext('2d'), card, 0.4);
      S.video = null;
      shareVideoBtn.hidden = true;
    }

    // Small previews of each design, with the current title.
    const tsig = `${text.title}|${text.subtitle}`;
    if (thumbsFor !== tsig) {
      thumbsFor = tsig;
      for (const dd of ALL) {
        const cv = thumbs[dd.id];
        if (!cv) continue;
        const tc = paintCard(dd, 'square', { title: text.title, subtitle: text.subtitle, message: '' }, cv.width, true);
        drawFrame(cv.getContext('2d'), tc, 0.4);
      }
    }
  }

  // ---- actions ----
  async function addPhoto(file) {
    if (!file) return;
    set({ photoError: false });
    try {
      const img = await loadPhoto(file);
      set({ photos: [...S.photos, { img, zoom: 1, x: 0, y: 0 }].slice(0, 2) });
    } catch {
      set({ photoError: true });
    }
  }

  const pngBlob = () => new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));

  async function downloadPng() {
    const blob = await pngBlob();
    if (blob) downloadBlob(blob, `${baseName()}.png`);
  }

  async function shareFile(file) {
    const text = shareText();
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text });
      } catch {
        // cancelled
      }
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  }

  async function shareImage() {
    const blob = await pngBlob();
    if (blob) await shareFile(new File([blob], `${baseName()}.png`, { type: 'image/png' }));
  }

  async function recordVideo() {
    if (!card || !videoMime || S.recording) return;
    const c0 = card;
    const name = baseName();
    const cv = document.createElement('canvas');
    cv.width = c0.base.width;
    cv.height = c0.base.height;
    const ctx = cv.getContext('2d');
    drawFrame(ctx, c0, 0);
    const stream = cv.captureStream(30);
    const rec = new MediaRecorder(stream, { mimeType: videoMime, videoBitsPerSecond: 6_000_000 });
    const chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const stopped = new Promise((resolve) => (rec.onstop = resolve));
    set({ recording: VIDEO_SECONDS });
    rec.start(250);
    const t0 = performance.now();
    await new Promise((resolve) => {
      const tick = () => {
        const sec = (performance.now() - t0) / 1000;
        drawFrame(ctx, c0, sec);
        const left = Math.max(1, Math.ceil(VIDEO_SECONDS - sec));
        if (left !== S.recording) set({ recording: left });
        if (sec < VIDEO_SECONDS) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
    rec.stop();
    await stopped;
    stream.getTracks().forEach((tr) => tr.stop());
    const type = videoMime.split(';')[0];
    const file = new File(chunks, `${name}.${type === 'video/mp4' ? 'mp4' : 'webm'}`, { type });
    set({ recording: 0, video: file });
    downloadBlob(file, file.name);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(cardLink());
      set({ copied: true });
      setTimeout(() => set({ copied: false }), 2000);
    } catch {
      // clipboard blocked: nothing to do
    }
  }

  function makeOwn() {
    const was = S.received;
    set({ received: null, to: was ?? '', from: toName() });
    window.history.replaceState(null, '', window.location.pathname);
    fromInput.focus();
    fromInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ---- drag a photo inside its frame (mouse or one finger) and pinch to zoom; other touches still scroll ----
  {
    let drag = null;
    let raf = 0;
    let pending = null;
    const point = (cx, cy) => {
      const r = canvas.getBoundingClientRect();
      return [((cx - r.left) * canvas.width) / r.width, ((cy - r.top) * canvas.height) / r.height];
    };
    const commit = (i, ph) => {
      pending = ph;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const next = pending;
        if (next) set({ photos: S.photos.map((p, k) => (k === i ? next : p)) });
      });
    };
    const begin = (cx, cy) => {
      const rects = card?.photoRects ?? [];
      const [px, py] = point(cx, cy);
      const i = rects.findIndex((r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h);
      if (i < 0 || !S.photos[i]) return false;
      drag = { i, sx: px, sy: py, start: S.photos[i], w: rects[i].w, h: rects[i].h, dist: 0 };
      return true;
    };
    const move = (cx, cy) => {
      if (!drag) return;
      const [px, py] = point(cx, cy);
      const d = drag;
      commit(d.i, clampPhoto({ ...d.start, x: d.start.x + (px - d.sx) / d.w, y: d.start.y + (py - d.sy) / d.h }, d.w, d.h));
    };
    const gap = (e) => Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    canvas.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches.length === 1 && begin(e.touches[0].clientX, e.touches[0].clientY)) e.preventDefault();
        else if (e.touches.length === 2 && drag) {
          e.preventDefault();
          drag = { ...drag, start: S.photos[drag.i], dist: gap(e) };
        }
      },
      { passive: false },
    );
    canvas.addEventListener(
      'touchmove',
      (e) => {
        if (!drag) return;
        e.preventDefault();
        if (e.touches.length === 2 && drag.dist) {
          const zoom = Math.max(1, Math.min(3, (drag.start.zoom * gap(e)) / drag.dist));
          commit(drag.i, clampPhoto({ ...drag.start, zoom }, drag.w, drag.h));
        } else if (e.touches.length === 1) move(e.touches[0].clientX, e.touches[0].clientY);
      },
      { passive: false },
    );
    canvas.addEventListener('touchend', (e) => {
      if (e.touches.length === 0) drag = null;
    });
    canvas.addEventListener('mousedown', (e) => {
      if (begin(e.clientX, e.clientY)) e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => move(e.clientX, e.clientY));
    window.addEventListener('mouseup', () => (drag = null));
  }

  // ---- start ----
  update();
  loadCardFonts().then(() => {
    set({ fontsReady: true });
    // Flicker the diyas in the preview while it is on screen (skipped for reduced motion).
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let visible = true;
    let last = 0;
    new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);
    const ctx = canvas.getContext('2d');
    const tick = (now) => {
      requestAnimationFrame(tick);
      if (!visible || document.hidden || now - last < 50 || !card) return;
      last = now;
      drawFrame(ctx, card, now / 1000);
    };
    requestAnimationFrame(tick);
  });
}

const el = document.getElementById('maker');
if (el) mount(el, el.dataset.kit, el.dataset.lang === 'en' ? 'en' : 'hi');
