// Scene templates for the status engine (scripts/status-engine.mjs): festival themes (automation/festivals.json `theme`)
// and the weekday "day status" Shorts of the morning slot. Every text is original; pictures are FLUX (no text in the
// image, the Hindi is drawn by story/status-overlays.mjs); music and voice are synthesized (render-story.mjs).
// A scene: prompt (English, no text), animate (gentle motion, 1-3 per theme; the Kaggle clip), motion (in|out|pan),
// big (Hindi blessing, max 26), line (max 48), tts (Devanagari, max ~70 so the hook fits in front), sub (Roman).
// Big themes have 6 scenes; each variant shows its own 3 (festivals.json `picks`, else DEFAULT_PICKS).
// Khatu Shyam ji is always the SHEESH only (owner, 6 Nov 2026): every prompt says so.

const SHEESH = 'the divine Sheesh (head only, no body, no arms, no flute) of Shri Khatu Shyam ji: a big divine dark face with large wide eyes and a curled moustache, a tall ornate golden mukut with peacock-feather and sun-ray motifs, framed in an oval of layered white, pink, blue and orange flower garlands and jewels';
const VISHNU = 'Bhagwan Vishnu with four arms holding conch, chakra, mace and lotus, blue complexion, golden crown and yellow silk dhoti, serene face';
const SHIV = 'Bhagwan Shiv in calm meditation, blue-grey complexion, crescent moon and the Ganga in his matted hair, rudraksha malas, a trident beside him, serene closed eyes';
const GANESH = 'Shri Ganesh ji with an elephant head and one broken tusk, four arms, red and gold silk, a bowl of modak, his mouse vahan at his feet, gentle smiling eyes';

export const MANTRA = {
  shiv: ['ॐ नमः शिवाय', 'Shiv Panchakshar mantra (Shri Rudram, Krishna Yajurveda parampara)'],
  vishnu: ['ॐ नमो भगवते वासुदेवाय', 'Bhagwan Vishnu ka dwadashakshar mantra (Shrimad Bhagwat parampara)'],
  ganesh: ['ॐ गं गणपतये नमः', 'Ganesh beej mantra (Ganapati Atharvashirsha parampara)'],
  surya: ['ॐ सूर्याय नमः', 'Surya dev ka naam mantra (Surya Namaskar parampara)'],
  shani: ['ॐ शं शनैश्चराय नमः', 'Shani dev ka beej mantra (Navagraha puja parampara)'],
  lakshmi: ['ॐ श्रीं महालक्ष्म्यै नमः', 'Maa Lakshmi ka mantra (Lakshmi puja parampara)'],
  bhairav: ['ॐ कालभैरवाय नमः', 'Kaal Bhairav naam mantra (Kashi parampara)'],
  gita: ['कर्मण्येवाधिकारस्ते मा फलेषु कदाचन', 'Shrimad Bhagavad Gita, adhyay 2, shlok 47'],
  ram: ['श्री राम जय राम जय जय राम', 'Shri Ram jap (Samarth Ramdas parampara)'],
  saraswati: ['ॐ ऐं सरस्वत्यै नमः', 'Maa Saraswati ka beej mantra (Saraswati puja parampara)'],
};

// The forwardable greeting of the last 2-3 s (owner research 20 Nov 2026, ALGO-RESEARCH-2026-11.md: Instagram ranks
// SENDS per reach highest for non-followers; festival wishes are what families forward). `wish` = [small line, big
// line]; {name} = the variant's Hindi festival name. Default: "आपको और आपके परिवार को" / "<name> की शुभकामनाएं 🙏".
export const DEFAULT_WISH = ['आपको और आपके परिवार को', '{name} की शुभकामनाएं 🙏'];

const T = (o) => ({ playlist: 'Tyohar aur Vrat Kathayein', voice: 'hf_alpha', ...o });

/** Festival themes (status-engine buildFamily). */
export const THEMES = {
  ekadashi: T({
    playlist: 'Vishnu ji aur Krishna ki Kathayein', deity: 'Bhagwan Vishnu / Khatu Shyam ji', mantra: 'vishnu',
    desc: 'Ekadashi par Bhagwan Shri Hari Vishnu ki pooja hoti hai, aur Khatu parampara mein Gyaras Baba Shyam ka din hai',
    hashtags: ['#Ekadashi', '#EkadashiStatus', '#JaiShreeHari', '#KhatuShyam', '#Gyaras'],
    tags: ['Ekadashi status', 'Ekadashi whatsapp status', 'एकादशी स्टेटस', 'एकादशी की शुभकामनाएं', 'Gyaras Khatu Shyam', 'ग्यारस', 'Jai Shree Hari', 'Vishnu ji status'],
    scenes: [
      { prompt: `Divine darshan of ${VISHNU}, standing on a pink lotus, a soft golden halo, tulsi leaves and lit clay diyas in the foreground, a decorated temple sanctum`, animate: 'a very slow gentle camera push-in, the face stays still and serene, diya flames flicker softly', deity: true, motion: 'in', hold: 6, big: 'जय श्री हरि', line: 'एकादशी की शुभकामनाएं', tts: 'भगवान श्री हरि की कृपा आप पर सदा बनी रहे।', sub: 'Bhagwan Shri Hari ki kripa aap par sada bani rahe.' },
      { prompt: `Darshan of ${SHEESH}, in a decorated sanctum glowing with diyas and fresh red roses, devotional evening light`, animate: 'the diya light gently pulses and a few rose petals drift in the foreground, the face stays still', deity: true, motion: 'out', hold: 6, big: 'हारे का सहारा', line: 'ग्यारस पर बाबा श्याम के दर्शन', tts: 'ग्यारस पर बाबा श्याम के दर्शन। हारे का सहारा, बाबा श्याम हमारा!', sub: 'Gyaras par Baba Shyam ke darshan. Haare ka sahara, Baba Shyam hamara!' },
      { prompt: 'A green tulsi plant in a decorated clay pot on a temple courtyard at dawn, lit diyas around it, yellow marigold flowers and a small brass kalash, calm golden light', motion: 'pan', hold: 6, big: 'ॐ नमो नारायणाय', mantra: 'ॐ नमो भगवते वासुदेवाय', tts: 'ॐ नमो भगवते वासुदेवाय।', sub: 'Om Namo Bhagavate Vasudevaya.' },
    ],
  }),
  gita: T({
    playlist: 'Vishnu ji aur Krishna ki Kathayein', deity: 'Shri Krishna', mantra: 'gita',
    desc: 'Margashirsha Shukla Ekadashi (Mokshada Ekadashi) ko Gita Jayanti manayi jati hai: parampara ke anusar isi din Kurukshetra mein Shri Krishna ne Arjun ko Gita ka updesh diya',
    hashtags: ['#GitaJayanti', '#MokshadaEkadashi', '#BhagavadGita', '#ShriKrishna', '#JaiShreeKrishna'],
    tags: ['Gita Jayanti status', 'Gita Jayanti 2026', 'Mokshada Ekadashi status', 'गीता जयंती', 'गीता जयंती स्टेटस', 'मोक्षदा एकादशी', 'Bhagavad Gita status', 'Krishna Arjun status'],
    scenes: [
      { prompt: 'Shri Krishna with a peacock feather in his crown and blue complexion, seated on the front of a golden chariot with white horses on the Kurukshetra battlefield at sunrise, Arjun kneeling with folded hands, divine golden light', animate: 'the horses toss their manes gently, the chariot flag flutters, golden light rays shimmer, the faces stay still', deity: true, motion: 'in', hold: 6, big: 'जय श्री कृष्ण', line: 'गीता जयंती की शुभकामनाएं', tts: 'गीता का ज्ञान हर दिन हमें सही राह दिखाए।', sub: 'Gita ka gyaan har din humein sahi raah dikhaye.' },
      { prompt: 'A close-up darshan of Shri Krishna with a peacock feather crown, blue complexion and a gentle smile, a soft golden halo, lotus flowers and a lit diya in the foreground', animate: 'a very slow push-in, the diya flame flickers and soft light glows around the halo, the face stays still', deity: true, motion: 'out', hold: 6, big: 'कर्म करो', line: 'फल की चिंता प्रभु पर छोड़ो', tts: 'कर्म करते रहो, फल की चिंता प्रभु पर छोड़ दो।', sub: 'Karm karte raho, phal ki chinta Prabhu par chhod do.' },
      { prompt: 'An old palm-leaf manuscript of the Bhagavad Gita on a carved wooden stand wrapped in red cloth, a lit brass diya, tulsi leaves and a peacock feather beside it, warm temple light', motion: 'pan', hold: 6, big: 'श्रीमद्भगवद्गीता', mantra: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन', tts: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।', sub: 'Karmanye vadhikaraste ma phaleshu kadachana.' },
    ],
  }),
  pradosh: T({
    playlist: 'Shiv ji ki Kathayein', deity: 'Shiv ji', mantra: 'shiv',
    desc: 'Pradosh vrat Trayodashi tithi ko sandhya ke samay Bhagwan Shiv aur Maa Parvati ki pooja ka vrat hai',
    hashtags: ['#PradoshVrat', '#Mahadev', '#HarHarMahadev', '#OmNamahShivaya', '#ShivJi'],
    tags: ['Pradosh Vrat status', 'Pradosh vrat whatsapp status', 'प्रदोष व्रत', 'प्रदोष व्रत स्टेटस', 'Mahadev status', 'महादेव स्टेटस', 'Har Har Mahadev', 'Om Namah Shivaya'],
    scenes: [
      { prompt: 'A black stone Shivling at dusk with a silver crescent, white flowers, bel leaves and a stream of milk being offered, brass diyas glowing around it, a temple courtyard in soft evening light', animate: 'the milk stream flows slowly, the diya flames flicker and soft incense smoke rises', deity: true, motion: 'in', hold: 6, big: 'हर हर महादेव', line: 'प्रदोष व्रत की शुभकामनाएं', tts: 'संध्या की इस बेला में भोलेनाथ सबकी झोली भरें।', sub: 'Sandhya ki is bela mein Bholenath sabki jholi bharein.' },
      { prompt: `${SHIV}, with Maa Parvati beside him on Mount Kailash at golden sunset, Nandi resting in front, peaceful snow peaks`, animate: 'the snow mist drifts slowly and the sunset light glows, the faces stay still', deity: true, motion: 'out', hold: 6, big: 'शिव-पार्वती', line: 'आपके परिवार पर कृपा करें', tts: 'शिव पार्वती की कृपा से घर में सुख शांति बनी रहे।', sub: 'Shiv Parvati ki kripa se ghar mein sukh shanti bani rahe.' },
      { prompt: 'A brass Nandi statue facing a Shiv temple sanctum at twilight, rows of lit clay diyas, bel leaves and a temple bell, devotional calm mood', motion: 'pan', hold: 6, big: 'ॐ नमः शिवाय', mantra: 'ॐ नमः शिवाय', tts: 'ॐ नमः शिवाय।', sub: 'Om Namah Shivaya.' },
    ],
  }),
  shivratri: T({
    playlist: 'Shiv ji ki Kathayein', deity: 'Shiv ji', mantra: 'shiv',
    desc: 'Har mahine Krishna Paksha ki Chaturdashi ko Masik Shivratri ka vrat aur Bhagwan Shiv ki raat ki pooja hoti hai',
    hashtags: ['#MasikShivratri', '#Shivratri', '#Mahadev', '#HarHarMahadev', '#OmNamahShivaya'],
    tags: ['Masik Shivratri status', 'Shivratri status', 'मासिक शिवरात्रि', 'शिवरात्रि स्टेटस', 'Mahadev status', 'महादेव', 'Bholenath status', 'Om Namah Shivaya'],
    scenes: [
      { prompt: `${SHIV}, seated on a tiger skin under a starry night sky on Mount Kailash, a soft blue glow, a crescent moon above`, animate: 'the stars twinkle softly and a gentle mist drifts, the face stays still and serene', deity: true, motion: 'in', hold: 6, big: 'जय भोलेनाथ', line: 'शिवरात्रि की शुभकामनाएं', tts: 'भोलेनाथ आपके हर संकट को हर लें।', sub: 'Bholenath aapke har sankat ko har lein.' },
      { prompt: 'A Shivling decorated with bel leaves, white dhatura flowers and rudraksha at night, many small diyas glowing around it, a quiet temple at midnight', animate: 'the diya flames flicker gently and incense smoke curls upward', deity: true, motion: 'out', hold: 6, big: 'हर हर महादेव', line: 'रात भर शिव का ध्यान', tts: 'आज की रात शिव का ध्यान, मन को शांति देता है।', sub: 'Aaj ki raat Shiv ka dhyaan, man ko shanti deta hai.' },
      { prompt: 'A temple trident with a small damru tied to it against a deep blue night sky with a crescent moon, a Shiv temple spire glowing with lamps below', motion: 'pan', hold: 6, big: 'ॐ नमः शिवाय', mantra: 'ॐ नमः शिवाय', tts: 'ॐ नमः शिवाय।', sub: 'Om Namah Shivaya.' },
    ],
  }),
  sankashti: T({
    playlist: 'Ganesh ji ki Kathayein', deity: 'Ganesh ji', mantra: 'ganesh',
    desc: 'Sankashti Chaturthi par Ganesh ji ka vrat rakha jata hai aur raat ko chandrama ko arghya dekar vrat khola jata hai',
    hashtags: ['#SankashtiChaturthi', '#GaneshJi', '#GanpatiBappaMorya', '#Sankashti', '#VighnaharGanesh'],
    tags: ['Sankashti Chaturthi status', 'Sankashti status', 'संकष्टी चतुर्थी', 'संकष्टी चतुर्थी स्टेटस', 'Ganesh ji status', 'गणेश जी स्टेटस', 'Ganpati Bappa Morya', 'Vighnaharta'],
    scenes: [
      { prompt: `Divine darshan of ${GANESH}, seated on a lotus throne in a temple decorated with red hibiscus and durva grass, warm golden light`, animate: 'a very slow camera push-in, diya flames flicker softly, the face stays still', deity: true, motion: 'in', hold: 6, big: 'गणपति बप्पा मोरया', line: 'संकष्टी चतुर्थी की शुभकामनाएं', tts: 'विघ्नहर्ता गणेश जी आपके हर विघ्न को दूर करें।', sub: 'Vighnaharta Ganesh ji aapke har vighn ko door karein.' },
      { prompt: 'A bright full moon rising over a quiet village rooftop at night, a brass lota of water and a lit diya on a small puja thali in the foreground, red hibiscus flowers', animate: 'the moon glows softly and thin clouds drift, the diya flame flickers', motion: 'out', hold: 6, big: 'चंद्र दर्शन', line: 'अर्घ्य देकर व्रत पूरा', tts: 'रात को चंद्रमा को अर्घ्य देकर व्रत पूरा होता है।', sub: 'Raat ko Chandrama ko arghya dekar vrat poora hota hai.' },
      { prompt: 'A silver plate of modak sweets with durva grass, red hibiscus flowers and a lit diya before a small Ganesh idol, festive warm home altar', motion: 'pan', hold: 6, big: 'ॐ गं गणपतये नमः', mantra: 'ॐ गं गणपतये नमः', tts: 'ॐ गं गणपतये नमः।', sub: 'Om Gam Ganapataye Namah.' },
    ],
  }),
  sakat: T({
    playlist: 'Ganesh ji ki Kathayein', deity: 'Ganesh ji / Sakat Mata', mantra: 'ganesh',
    desc: 'Magh Krishna Chaturthi ko Sakat Chauth (Lambodara Sankashti) par mataen santan ki lambi umr ke liye Ganesh ji ka vrat rakhti hain aur til-gud ka bhog lagta hai',
    hashtags: ['#SakatChauth', '#SankashtiChaturthi', '#GaneshJi', '#TilkutChauth', '#GanpatiBappaMorya'],
    tags: ['Sakat Chauth status', 'Sakat Chauth 2027', 'सकट चौथ', 'सकट चौथ स्टेटस', 'Tilkut Chauth', 'तिलकुट चौथ', 'Sankashti Chaturthi status', 'Ganesh ji status'],
    scenes: [
      { prompt: `Divine darshan of ${GANESH}, on a red throne decorated with marigolds, a plate of sesame and jaggery laddoos before him, warm winter evening light`, animate: 'a very slow push-in, diya flames flicker softly, the face stays still', deity: true, motion: 'in', hold: 6, big: 'जय गणेश देवा', line: 'सकट चौथ की शुभकामनाएं', tts: 'गणेश जी आपके बच्चों को लंबी उम्र और खुशियाँ दें।', sub: 'Ganesh ji aapke bachchon ko lambi umr aur khushiyan dein.' },
      { prompt: 'A mother in a red saree offering water to the rising full moon from a brass lota on a village rooftop at night, a puja thali with til laddoos and a diya beside her, back view, peaceful', animate: 'the moonlight glows softly, the water stream sparkles and the diya flame flickers', motion: 'out', hold: 6, big: 'चंद्र अर्घ्य', line: 'माँ का व्रत, संतान का सुख', tts: 'माँ का यह व्रत, संतान के सुख की कामना है।', sub: 'Maa ka yeh vrat, santaan ke sukh ki kaamna hai.' },
      { prompt: 'A brass plate of sesame and jaggery tilkut, til laddoos, durva grass and red flowers before a small Ganesh idol, a lit diya, cosy winter home altar', motion: 'pan', hold: 6, big: 'ॐ गं गणपतये नमः', mantra: 'ॐ गं गणपतये नमः', tts: 'ॐ गं गणपतये नमः।', sub: 'Om Gam Ganapataye Namah.' },
    ],
  }),
  amavasya: T({
    playlist: 'Tyohar aur Vrat Kathayein', deity: 'Pitru / Shiv ji', mantra: 'shiv',
    wish: ['आप और आपके परिवार पर', 'पितरों का आशीर्वाद बना रहे 🙏'],
    desc: 'Amavasya par snan, daan aur pitron ko yaad karne ki parampara hai; shaam ko deep jalaya jata hai',
    hashtags: ['#Amavasya', '#AmavasyaStatus', '#Pitru', '#HarHarMahadev', '#Daan'],
    tags: ['Amavasya status', 'Amavasya whatsapp status', 'अमावस्या', 'अमावस्या स्टेटस', 'Amavasya 2026', 'Pitru status', 'पितरों का आशीर्वाद', 'Snan daan'],
    scenes: [
      { prompt: 'A calm holy river at dawn with stone ghats, devotees offering water to the rising sun with folded hands seen from behind, marigold flowers floating on the water, soft mist', animate: 'the river ripples softly, mist drifts and the flowers float slowly', motion: 'in', hold: 6, big: 'अमावस्या स्नान', line: 'स्नान, दान और प्रार्थना का दिन', tts: 'आज स्नान, दान और प्रार्थना का दिन है।', sub: 'Aaj snan, daan aur prarthana ka din hai.' },
      { prompt: 'A single clay diya glowing under a huge old peepal tree at dusk, the tree trunk tied with red sacred thread, quiet village temple behind, peaceful twilight', animate: 'the diya flame flickers and the peepal leaves sway gently in the breeze', motion: 'out', hold: 6, big: 'पितरों को नमन', line: 'उनका आशीर्वाद सदा बना रहे', tts: 'अपने पितरों को नमन। उनका आशीर्वाद सदा बना रहे।', sub: 'Apne pitron ko naman. Unka ashirwad sada bana rahe.' },
      { prompt: `${SHIV}, on a moonless starry night with a calm blue glow, lamps glowing in a small temple below the mountain`, deity: true, motion: 'pan', hold: 6, big: 'ॐ नमः शिवाय', mantra: 'ॐ नमः शिवाय', tts: 'ॐ नमः शिवाय।', sub: 'Om Namah Shivaya.' },
    ],
  }),
  purnima: T({
    playlist: 'Vishnu ji aur Krishna ki Kathayein', deity: 'Bhagwan Vishnu / Satyanarayan', mantra: 'vishnu',
    desc: 'Purnima par snan, daan, Satyanarayan katha aur chandrama ko arghya dene ki parampara hai',
    hashtags: ['#Purnima', '#PurnimaStatus', '#Satyanarayan', '#JaiShreeHari', '#FullMoon'],
    tags: ['Purnima status', 'Purnima whatsapp status', 'पूर्णिमा', 'पूर्णिमा स्टेटस', 'Purnima 2026', 'Satyanarayan katha', 'सत्यनारायण', 'Jai Shree Hari'],
    scenes: [
      { prompt: 'A huge bright full moon rising over a calm holy river with stone ghats, rows of lit diyas on the steps and floating on the water, a temple spire, serene night', animate: 'the moonlight shimmers on the gently rippling water and the floating diyas drift slowly', motion: 'in', hold: 6, big: 'पूर्णिमा की शुभकामनाएं', line: 'चाँद सी रोशनी आपके घर आए', tts: 'पूर्णिमा का यह चाँद आपके घर में रोशनी और सुख लाए।', sub: 'Purnima ka yeh chaand aapke ghar mein roshni aur sukh laaye.' },
      { prompt: `Divine darshan of ${VISHNU} as Shri Satyanarayan, seated on a golden throne decorated with banana leaves and flowers, a puja kalash and panchamrit before him`, animate: 'a very slow push-in, the diya flames flicker and flower petals drift, the face stays still', deity: true, motion: 'out', hold: 6, big: 'जय श्री हरि', line: 'सत्यनारायण भगवान की जय', tts: 'सत्यनारायण भगवान की कृपा से हर काम शुभ हो।', sub: 'Satyanarayan Bhagwan ki kripa se har kaam shubh ho.' },
      { prompt: 'A brass puja thali with a lit diya, kumkum, rice, tulsi leaves and a lota of water under the full moon on a quiet courtyard, soft silver moonlight', motion: 'pan', hold: 6, big: 'ॐ नमो नारायणाय', mantra: 'ॐ नमो भगवते वासुदेवाय', tts: 'ॐ नमो भगवते वासुदेवाय।', sub: 'Om Namo Bhagavate Vasudevaya.' },
    ],
  }),
  shakambhari: T({
    playlist: 'Maa Durga aur Devi ki Kathayein', deity: 'Maa Shakambhari', mantra: null,
    desc: 'Paush Purnima ko Shakambhari Purnima bhi kehte hain: Maa Durga ke Shakambhari roop ki jayanti, jinhone akaal mein saag-sabzi aur phal se sansaar ka paalan kiya (manyata). Isi din se Magh snan shuru hota hai',
    hashtags: ['#PaushPurnima', '#ShakambhariPurnima', '#ShakambhariMata', '#JaiMataDi', '#MaghSnan'],
    tags: ['Paush Purnima status', 'Shakambhari Purnima status', 'पौष पूर्णिमा', 'शाकंभरी पूर्णिमा', 'Shakambhari Mata status', 'शाकंभरी माता', 'Jai Mata Di', 'Magh snan'],
    scenes: [
      { prompt: 'Divine darshan of Maa Shakambhari, a gentle Hindu goddess in a green and red saree with a golden crown, surrounded by fresh green vegetables, fruits and grains, seated on a lotus, a decorated temple sanctum, warm golden light', animate: 'a very slow push-in, diya flames flicker and green leaves sway gently, the face stays still', deity: true, motion: 'in', hold: 6, big: 'जय माँ शाकंभरी', line: 'शाकंभरी पूर्णिमा की शुभकामनाएं', tts: 'माँ शाकंभरी आपका घर अन्न और सुख से भर दें।', sub: 'Maa Shakambhari aapka ghar ann aur sukh se bhar dein.' },
      { prompt: 'A huge bright full moon over a calm holy river at the sangam with stone ghats, rows of lit diyas on the steps, a winter mist, serene night', animate: 'the moonlight shimmers on the rippling water and the mist drifts slowly', motion: 'out', hold: 6, big: 'पौष पूर्णिमा', line: 'आज से माघ स्नान आरंभ', tts: 'पौष पूर्णिमा से माघ स्नान का पावन समय शुरू होता है।', sub: 'Paush Purnima se Magh snan ka paavan samay shuru hota hai.' },
      { prompt: 'A temple in a green Aravalli valley at dawn decorated with marigold garlands and saffron flags, baskets of fresh vegetables and fruits offered on the steps, soft mist', motion: 'pan', hold: 6, big: 'जय माता दी', line: 'माँ की कृपा सदा बनी रहे', tts: 'जय माता दी! माँ की कृपा सदा बनी रहे।', sub: 'Jai Mata Di! Maa ki kripa sada bani rahe.' },
    ],
  }),
  bhairav: T({
    playlist: 'Shiv ji ki Kathayein', deity: 'Kaal Bhairav', mantra: 'bhairav',
    desc: 'Margashirsha Krishna Ashtami ko Kaal Bhairav Jayanti manayi jati hai; Kashi mein Kaal Bhairav ko nagar ka kotwal mana jata hai (manyata)',
    hashtags: ['#KaalBhairavJayanti', '#KaalBhairav', '#Kashi', '#HarHarMahadev', '#Bhairav'],
    tags: ['Kaal Bhairav Jayanti status', 'Kalbhairav Jayanti 2026', 'काल भैरव जयंती', 'काल भैरव स्टेटस', 'Kaal Bhairav status', 'Bhairav baba', 'भैरव बाबा', 'Kashi ke kotwal'],
    scenes: [
      { prompt: 'Divine darshan of Shri Kaal Bhairav, a powerful but benevolent Hindu deity with a dark complexion, a trident and a damru, a silver crown, a calm protective gaze, a black dog sitting beside him, an ancient Kashi temple sanctum with oil lamps', animate: 'a very slow push-in, the oil lamps flicker and incense smoke drifts, the face stays still', deity: true, motion: 'in', hold: 6, big: 'जय काल भैरव', line: 'काल भैरव जयंती की शुभकामनाएं', tts: 'काल भैरव बाबा आपकी और आपके परिवार की रक्षा करें।', sub: 'Kaal Bhairav Baba aapki aur aapke parivaar ki raksha karein.' },
      { prompt: 'The narrow lanes of old Varanasi at dusk leading to a small temple with a glowing orange flag, oil lamps on the steps, a black dog resting near the gate, devotional mood', animate: 'the flag flutters gently and the lamp flames flicker', motion: 'out', hold: 6, big: 'काशी के कोतवाल', line: 'भैरव बाबा की जय', tts: 'काशी के कोतवाल, भैरव बाबा की जय!', sub: 'Kashi ke kotwal, Bhairav Baba ki jai!' },
      { prompt: 'A mustard oil lamp, black sesame, red flowers and a coconut offered before a small Bhairav shrine with a trident at night, warm flickering light', motion: 'pan', hold: 6, big: 'ॐ कालभैरवाय नमः', mantra: 'ॐ कालभैरवाय नमः', tts: 'ॐ कालभैरवाय नमः।', sub: 'Om Kaalbhairavaya Namah.' },
    ],
  }),
  ramsita: T({
    playlist: 'Vishnu ji aur Krishna ki Kathayein', deity: 'Shri Ram / Maa Sita', mantra: 'ram',
    desc: 'Margashirsha Shukla Panchami ko Vivah Panchami manayi jati hai: parampara ke anusar isi din Janakpur mein Shri Ram aur Maa Sita ka vivah hua tha',
    hashtags: ['#VivahPanchami', '#SitaRam', '#RamSitaVivah', '#JaiShreeRam', '#Janakpur'],
    tags: ['Vivah Panchami status', 'Vivah Panchami 2026', 'विवाह पंचमी', 'विवाह पंचमी स्टेटस', 'Ram Sita vivah status', 'राम सीता विवाह', 'Sita Ram status', 'Jai Shree Ram'],
    scenes: [
      { prompt: 'Shri Ram and Maa Sita exchanging flower garlands at their divine wedding in a royal palace courtyard of Janakpur, Ram with blue complexion and a golden crown, Sita in a red bridal saree with gold jewellery, flower petals in the air, joyful golden light', animate: 'flower petals drift down slowly and the lamps glow softly, the faces stay still', deity: true, motion: 'in', hold: 6, big: 'सिया राम', line: 'विवाह पंचमी की शुभकामनाएं', tts: 'सीता राम जी का आशीर्वाद हर घर में प्रेम बनाए रखे।', sub: 'Sita Ram ji ka ashirwad har ghar mein prem banaye rakhe.' },
      { prompt: 'A grand decorated wedding mandap with marigold and rose garlands, a sacred fire altar with a soft glow, brass kalash, banana trees at the corners, royal Janakpur palace at dusk', animate: 'the garlands sway gently, petals drift and lamp lights twinkle', motion: 'out', hold: 6, big: 'जनकपुर में उत्सव', line: 'राम-सीता का पावन विवाह', tts: 'जनकपुर में आज भी यह पावन विवाह धूम से मनाया जाता है।', sub: 'Janakpur mein aaj bhi yeh paavan vivah dhoom se manaya jata hai.' },
      { prompt: 'Close-up darshan of Shri Ram and Maa Sita seated together on a golden throne, gentle smiles, a soft golden halo, lotus flowers and lit diyas in front', deity: true, motion: 'pan', hold: 6, big: 'जय सिया राम', mantra: 'श्री राम जय राम जय जय राम', tts: 'श्री राम जय राम जय जय राम।', sub: 'Shri Ram Jai Ram Jai Jai Ram.' },
    ],
  }),
  tulsi: T({
    playlist: 'Tyohar aur Vrat Kathayein', deity: 'Tulsi Mata / Shaligram ji', mantra: 'vishnu',
    desc: 'Kartik Shukla Dwadashi ko Tulsi Vivah hota hai: Tulsi Mata ka vivah Shaligram ji (Bhagwan Vishnu) se karaya jata hai',
    hashtags: ['#TulsiVivah', '#TulsiVivah2026', '#TulsiMata', '#Shaligram', '#DevUthaniEkadashi'],
    tags: ['Tulsi Vivah status', 'Tulsi Vivah 2026', 'तुलसी विवाह', 'तुलसी विवाह स्टेटस', 'Tulsi Shaligram vivah', 'तुलसी माता', 'Tulsi vivah whatsapp status', 'Shaligram'],
    scenes: [
      { prompt: 'A green tulsi plant dressed as a bride with a red chunari and marigold garlands in a decorated clay pot, a small black Shaligram stone on a silver throne beside it, a sugarcane mandap, many lit diyas, festive evening', animate: 'the diya flames flicker and the marigold garlands sway gently', deity: true, motion: 'in', hold: 6, big: 'तुलसी विवाह', line: 'तुलसी माता की जय', tts: 'तुलसी माता और शालिग्राम जी आपके घर में मंगल करें।', sub: 'Tulsi Mata aur Shaligram ji aapke ghar mein mangal karein.' },
      { prompt: 'A home courtyard decorated for Tulsi Vivah at dusk, a rangoli of flowers, rows of lit clay diyas, sugarcane sticks tied as a canopy, women in festive saris doing aarti seen from behind', animate: 'the aarti flame moves slowly in a circle and the diyas flicker', motion: 'out', hold: 6, big: 'मंगल उत्सव', line: 'घर-घर में शुभ विवाह', tts: 'आज घर घर में तुलसी विवाह का मंगल उत्सव है।', sub: 'Aaj ghar ghar mein Tulsi Vivah ka mangal utsav hai.' },
      { prompt: `Divine darshan of ${VISHNU}, waking from yoga nidra on the coiled Sheshnag in the ocean of milk, Maa Lakshmi beside him, a tulsi plant in front, soft golden dawn`, deity: true, motion: 'pan', hold: 6, big: 'ॐ नमो नारायणाय', mantra: 'ॐ नमो भगवते वासुदेवाय', tts: 'ॐ नमो भगवते वासुदेवाय।', sub: 'Om Namo Bhagavate Vasudevaya.' },
    ],
  }),
  lohri: T({
    playlist: 'Tyohar aur Vrat Kathayein', deity: 'Lohri (Agni / fasal ka parv)', mantra: null, voice: 'hm_omega',
    desc: 'Lohri Makar Sankranti se ek din pehle manayi jati hai: nayi fasal ki khushi, aag ke charon or parikrama aur til, gud, rewri, moongfali',
    hashtags: ['#Lohri', '#HappyLohri', '#Lohri2027', '#LohriStatus', '#Punjab'],
    tags: ['Lohri status', 'Happy Lohri status', 'Lohri 2027', 'लोहड़ी', 'लोहड़ी स्टेटस', 'हैप्पी लोहड़ी', 'Lohri whatsapp status', 'Lohri di lakh lakh vadhaiyan'],
    scenes: [
      { prompt: 'A big festive bonfire at night in a Punjabi village courtyard, a happy family in colourful winter clothes and phulkari dupattas standing around it seen from behind, sparks rising into the starry sky', animate: 'the bonfire flames dance and sparks rise slowly into the night sky', motion: 'in', hold: 6, big: 'लोहड़ी की बधाई', line: 'लख-लख बधाइयां', tts: 'लोहड़ी की लख लख बधाइयां! नई फसल की खुशियाँ आपके घर आएं।', sub: 'Lohri di lakh lakh vadhaiyan! Nayi fasal ki khushiyan aapke ghar aayein.' },
      { prompt: 'Close-up of hands offering sesame seeds, peanuts, popcorn and rewri sweets into a glowing bonfire at night, warm orange light, festive winter mood', animate: 'the flames flicker and the seeds fall slowly into the fire, sparks drift up', motion: 'out', hold: 6, big: 'तिल, गुड़, रेवड़ी', line: 'मीठी-मीठी लोहड़ी', tts: 'तिल, गुड़ और रेवड़ी की मिठास, सदा बनी रहे।', sub: 'Til, gud aur rewri ki mithaas, sada bani rahe.' },
      { prompt: 'Golden wheat and mustard fields of Punjab at sunset in winter, a small village with lit lamps on rooftops, a festive bonfire glowing in the distance, peaceful', motion: 'pan', hold: 6, big: 'हैप्पी लोहड़ी', line: 'खेत-खलिहान खुशहाल रहें', tts: 'खेत खलिहान खुशहाल रहें, और घर में बरकत हो।', sub: 'Khet khalihaan khushhaal rahein, aur ghar mein barkat ho.' },
    ],
  }),
  chhath: T({
    deity: 'Chhathi Maiya / Surya dev', mantra: null,
    desc: 'Chhath Puja mein Chhathi Maiya aur Surya dev ki pooja hoti hai',
    hashtags: ['#ChhathPuja', '#ChhathiMaiya', '#SuryaDev', '#Chhath2026'],
    tags: ['Chhath Puja status', 'Chhath Puja 2026', 'छठ पूजा', 'छठ पूजा स्टेटस', 'Chhathi Maiya', 'छठी मैया', 'Surya dev arghya', 'Chhath whatsapp status'],
    scenes: [
      { prompt: 'Sunrise over a calm river ghat, bamboo soop baskets with fruits, sugarcane and thekua on the steps, lit diyas floating on the water, golden sun on the horizon', animate: 'the water ripples softly and the diyas float slowly, the sun glows', motion: 'in', hold: 6, big: 'छठ पूजा', line: 'छठी मैया की जय', tts: 'छठी मैया और सूर्य देव की कृपा आप पर बनी रहे।', sub: 'Chhathi Maiya aur Surya dev ki kripa aap par bani rahe.' },
      { prompt: 'Women in yellow and orange saris standing in a river at sunset offering arghya to the setting sun with bamboo baskets of fruits, seen from behind, golden reflections', animate: 'the water ripples and the golden sunlight shimmers', motion: 'out', hold: 6, big: 'सूर्य को अर्घ्य', line: 'आस्था का महापर्व', tts: 'आस्था के इस महापर्व पर सबके घर खुशियाँ आएं।', sub: 'Aastha ke is mahaparv par sabke ghar khushiyan aayein.' },
      { prompt: 'Rows of lit clay diyas and sugarcane stalks on a decorated river ghat at dusk, bamboo baskets with fruits and thekua, peaceful devotional mood', motion: 'pan', hold: 6, big: 'जय छठी मैया', line: 'सबके घर सुख-समृद्धि', tts: 'जय छठी मैया!', sub: 'Jai Chhathi Maiya!' },
    ],
  }),
  // Gopashtami (Kartik Shukla Ashtami; owner, 16 Nov 2026: "Kal Gopashtami hai uske liye taiyar ho"). Krishna is always
  // blue-skinned with the peacock-feather crown and yellow pitambar, Balram fair-skinned in blue; the cows are decorated
  // for gau puja (tilak, garland). The date story (first day of go-charan) is parampara/manyata, said so in desc and tts.
  gopashtami: T({
    playlist: 'Vishnu ji aur Krishna ki Kathayein', deity: 'Shri Krishna (Gopal) / Gau Mata', mantra: null,
    desc: 'Kartik Shukla Ashtami ko Gopashtami manayi jati hai: parampara ke anusar isi din Bal Krishna aur Balram ji ne pehli baar gauon ko charana shuru kiya (Shrimad Bhagavat mein Vrindavan ki go-charan leela). Is din gau mata ki pooja, tilak, mala aur gud-roti se seva ki jati hai',
    hashtags: ['#Gopashtami', '#Gopashtami2026', '#GauMata', '#JaiShreeKrishna', '#Gopal'],
    tags: ['Gopashtami 2026', 'गोपाष्टमी', 'गोपाष्टमी की शुभकामनाएं', 'Happy Gopashtami', 'Gau Mata status', 'गौ माता', 'Gopal Krishna status', 'गौ पूजा', 'Jai Shree Krishna', 'Gau puja'],
    scenes: [
      { prompt: 'Little blue-skinned Bal Krishna with a peacock-feather crown, a yellow silk pitambar and a flute tucked in his waist sash, lovingly resting his hand on the forehead of a white cow decorated with a red kumkum tilak, a marigold garland and a small brass bell, her calf beside her, a green Braj pasture by the Yamuna at sunrise, soft golden light', animate: 'a very slow gentle camera push-in, the marigold garland and the grass sway softly in the breeze, the golden sunrise light glows, Krishna and the faces stay still', deity: true, motion: 'in', hold: 6, big: 'जय श्री गोपाल', line: 'गोपाष्टमी की शुभकामनाएं', tts: 'गौ माता और गोपाल जी की कृपा आपके घर पर सदा बनी रहे।', sub: 'Gau Mata aur Gopal ji ki kripa aapke ghar par sada bani rahe.' },
      { prompt: 'Young Bal Krishna, blue-skinned with a peacock-feather crown and a yellow dhoti, holding a flute, and his elder brother Balram ji, fair-skinned in blue garments holding a small wooden staff, walking with a herd of white and brown cows on the green pastures of Vrindavan at sunrise, kadamb trees and the Yamuna river behind, seen from a gentle distance', deity: true, motion: 'pan', hold: 6, big: 'कान्हा बने गोपाल', line: 'कान्हा-बलराम की गौ-चारण लीला', tts: 'मान्यता है, इसी दिन कान्हा और बलराम जी ने पहली बार गौएं चराईं।', sub: 'Manyata hai, isi din Kanha aur Balram ji ne pehli baar gauein charayin.' },
      { prompt: 'A white cow and her calf decorated for Gopashtami puja in a village courtyard at sunrise: a red kumkum tilak on the forehead, a marigold garland, a colourful embroidered cloth on her back, a brass puja thali with a lit diya, jaggery, green grass and a roti offered before her, a devotee in a red saree seen from behind with folded hands, warm golden light', animate: 'the diya flame flickers softly and the marigold garland sways gently, the cow and the calf stay calm and still', motion: 'out', hold: 6, big: 'गौ माता की जय', line: 'गौ सेवा ही गोपाल की सेवा', tts: 'गौ माता की जय! जय श्री कृष्ण।', sub: 'Gau Mata ki jai! Jai Shree Krishna.' },
    ],
  }),
  // Akshaya (Amla) Navami, Kartik Shukla Navami (feed audit 17 Nov 2026: every searchable festival gets a status Short;
  // search brought 95% of Gopashtami's views). Amla-tree puja for Bhagwan Vishnu and akshaya punya of daan are the common
  // parampara; the "Satyug began on this day" belief is a manyata, so it is not stated as fact.
  akshayanavami: T({
    playlist: 'Vishnu ji aur Krishna ki Kathayein', deity: 'Bhagwan Vishnu (Amla vriksh puja)', mantra: 'vishnu',
    desc: 'Kartik Shukla Navami ko Akshaya Navami (Amla Navami) manayi jati hai: parampara ke anusar is din aanwle ke vriksh ki pooja hoti hai, jismein Bhagwan Vishnu ka vaas mana jata hai, aur is din kiya gaya daan-punya akshaya (kabhi kam na hone wala) mana jata hai',
    hashtags: ['#AkshayaNavami', '#AmlaNavami', '#AkshayaNavami2026', '#JaiShreeHari', '#KartikMaas'],
    tags: ['Amla Navami status', 'आंवला नवमी', 'आंवला नवमी स्टेटस', 'Akshaya Navami 2026', 'अक्षय नवमी 2026', 'Amla Navami 2026', 'Amla vriksh puja', 'Jai Shree Hari'],
    scenes: [
      { prompt: 'A large green amla (Indian gooseberry) tree with round green fruits in a village courtyard at sunrise, a red sacred thread tied around its trunk, a brass puja thali with a lit diya, kumkum, rice and amla fruits at its roots, marigold flowers, soft golden light', animate: 'a very slow gentle push-in, the leaves sway softly in the breeze and the diya flame flickers', motion: 'in', hold: 6, big: 'आंवला नवमी की शुभकामनाएं', line: 'आंवले की पूजा, श्री हरि का आशीर्वाद', tts: 'आंवले के वृक्ष की पूजा से घर में सुख और समृद्धि आए।', sub: 'Aanwle ke vriksh ki pooja se ghar mein sukh aur samriddhi aaye.' },
      { prompt: `Divine darshan of ${VISHNU}, standing in soft golden light beneath the branches of a green amla tree laden with round fruits, Maa Lakshmi beside him, lotus flowers at their feet, a peaceful heavenly glow`, deity: true, motion: 'pan', hold: 6, big: 'जय श्री हरि', line: 'आंवले में श्री हरि का वास', tts: 'मान्यता है, आंवले के वृक्ष में श्री हरि का वास होता है।', sub: 'Manyata hai, aanwle ke vriksh mein Shri Hari ka vaas hota hai.' },
      { prompt: 'Women in festive red and yellow saris seen from behind walking around a big amla tree with a red sacred thread, offering water from brass lotas, a family sitting for a meal under the tree, diyas and marigold garlands, warm morning light', animate: 'the water pours slowly from the brass lota and the leaves sway gently, the people stay calm', motion: 'out', hold: 6, big: 'अक्षय पुण्य', line: 'दान-पुण्य कभी कम न हो', tts: 'ॐ नमो भगवते वासुदेवाय।', sub: 'Om Namo Bhagavate Vasudevaya.', mantra: 'ॐ नमो भगवते वासुदेवाय' },
    ],
  }),
  // Vaikuntha Chaturdashi, Kartik Shukla Chaturdashi: the day of Hari and Har. The katha of Bhagwan Vishnu offering a
  // thousand lotuses to Shiv ji in Kashi (and his lotus-eye for the missing one) is told as katha / manyata; the Ujjain
  // "Hari-Har milan" procession and Vishnu puja at night, Shiv puja at dawn are the common parampara.
  vaikuntha: T({
    playlist: 'Shiv ji ki Kathayein', deity: 'Bhagwan Vishnu aur Bhagwan Shiv (Hari-Har)', mantra: 'vishnu',
    desc: 'Kartik Shukla Chaturdashi ko Vaikuntha Chaturdashi manayi jati hai: yeh Hari (Bhagwan Vishnu) aur Har (Bhagwan Shiv) dono ki pooja ka din hai; katha ke anusar Bhagwan Vishnu ne Kashi mein Shiv ji ko hazaar kamal arpit kiye, aur Ujjain mein is din Hari-Har milan ki parampara hai',
    hashtags: ['#VaikunthaChaturdashi', '#BaikunthChaturdashi', '#HariHar', '#HarHarMahadev', '#JaiShreeHari'],
    tags: ['Vaikuntha Chaturdashi 2026', 'वैकुंठ चतुर्दशी 2026', 'Baikunth Chaturdashi status', 'बैकुंठ चतुर्दशी स्टेटस', 'Hari Har milan', 'हरि हर मिलन', 'Har Har Mahadev', 'Jai Shree Hari'],
    scenes: [
      { prompt: `Divine darshan of ${VISHNU}, and ${SHIV}, standing side by side in a heavenly golden sky above clouds, a soft halo behind both, lotus flowers and bel leaves floating around them, serene and peaceful`, animate: 'a very slow gentle push-in, the clouds drift and the halo glows softly, the faces stay still', deity: true, motion: 'in', hold: 6, big: 'हरि हर मिलन', line: 'वैकुंठ चतुर्दशी की शुभकामनाएं', tts: 'हरि और हर की कृपा आप पर सदा बनी रहे।', sub: 'Hari aur Har ki kripa aap par sada bani rahe.' },
      { prompt: 'A stone Shivling in an ancient Kashi temple sanctum covered with fresh pink and white lotus flowers, a brass lamp and bel leaves, a tulsi leaf offering on a silver plate, soft lamp light, devotional night', animate: 'the lamp flame flickers softly and a few lotus petals move gently', deity: true, motion: 'out', hold: 6, big: 'हज़ार कमल', line: 'श्री हरि ने महादेव को अर्पित किए', tts: 'कथा है, श्री हरि ने काशी में महादेव को हज़ार कमल अर्पित किए।', sub: 'Katha hai, Shri Hari ne Kashi mein Mahadev ko hazaar kamal arpit kiye.' },
      { prompt: 'The ghats of Varanasi at night with rows of lit clay diyas on the stone steps, the river Ganga reflecting the lights, temple spires against a starry sky, peaceful festive night', motion: 'pan', hold: 6, big: 'जय श्री हरि', line: 'हर हर महादेव', tts: 'ॐ नमो भगवते वासुदेवाय।', sub: 'Om Namo Bhagavate Vasudevaya.', mantra: 'ॐ नमो भगवते वासुदेवाय' },
    ],
  }),
  // ---- Feb-Mar 2027 (festivals.json, verified 20 Nov 2026 on Drik Panchang + Prokerala) ----
  // Ganesh Jayanti, Magh Shukla Chaturthi (Drik 10 Feb 2027): Ganesh ji's birth anniversary in the Magh parampara
  // (Tilkund Chaturthi in Maharashtra); til-gud bhog is the common custom.
  ganeshjayanti: T({
    playlist: 'Ganesh ji ki Kathayein', deity: 'Ganesh ji', mantra: 'ganesh',
    desc: 'Magh Shukla Chaturthi ko Ganesh Jayanti manayi jati hai: parampara ke anusar is din Ganesh ji ki janm-tithi ki pooja hoti hai aur til-gud ke laddoo ka bhog lagta hai',
    hashtags: ['#GaneshJayanti', '#GaneshJi', '#GanpatiBappaMorya', '#Vighnaharta'],
    tags: ['Ganesh Jayanti status', 'Ganesh Jayanti 2027', 'गणेश जयंती', 'गणेश जयंती स्टेटस', 'Maghi Ganesh Jayanti', 'Ganpati Bappa Morya', 'गणपति बप्पा मोरया', 'Ganesh ji status'],
    scenes: [
      { prompt: `Divine darshan of ${GANESH}, seated on a golden throne decorated with red hibiscus, durva grass and marigold garlands, a plate of sesame and jaggery laddoos before him, warm festive temple light`, animate: 'a very slow push-in, diya flames flicker softly and flower petals drift, the face stays still', deity: true, motion: 'in', hold: 6, big: 'गणपति बप्पा मोरया', line: 'गणेश जयंती की शुभकामनाएं', tts: 'विघ्नहर्ता गणेश जी आपके घर सुख और समृद्धि लाएं।', sub: 'Vighnaharta Ganesh ji aapke ghar sukh aur samriddhi laayein.' },
      { prompt: 'A brass plate of sesame and jaggery laddoos, modak, durva grass and red hibiscus flowers on a red cloth before a small decorated Ganesh shrine at a home altar, a lit diya, soft winter morning light', animate: 'the diya flame flickers and a few petals settle gently', motion: 'out', hold: 6, big: 'तिल-गुड़ का भोग', line: 'प्रथम पूज्य गणेश जी', tts: 'तिल गुड़ का भोग, और प्रथम पूज्य गणेश जी का आशीर्वाद।', sub: 'Til gud ka bhog, aur pratham poojya Ganesh ji ka ashirwad.' },
      { prompt: 'A small old stone Ganesh temple decorated with marigold garlands and saffron flags at sunrise, a brass bell at the gate, a mouse figure on the steps, peaceful village morning', motion: 'pan', hold: 6, big: 'ॐ गं गणपतये नमः', mantra: 'ॐ गं गणपतये नमः', tts: 'ॐ गं गणपतये नमः।', sub: 'Om Gam Ganapataye Namah.' },
    ],
  }),
  // Holika Dahan, Phalgun Purnima evening (Drik 21 Mar 2027). The katha is Bhakt Prahlad's bhakti and Bhagwan Narasimha's
  // protection: the picture shows the pyre and Prahlad safe, never a person in the fire.
  holika: T({
    playlist: 'Vishnu ji aur Krishna ki Kathayein', deity: 'Bhagwan Narasimha / Bhakt Prahlad', mantra: 'vishnu',
    desc: 'Phalgun Purnima ki shaam Holika Dahan hota hai: katha ke anusar Bhagwan Vishnu ne apne bhakt Prahlad ki raksha ki; yeh buraai par achchhai ki jeet aur bhakti ka parv hai',
    hashtags: ['#HolikaDahan', '#Holi', '#BhaktPrahlad', '#JaiShreeHari'],
    tags: ['Holika Dahan status', 'Holika Dahan 2027', 'होलिका दहन', 'होलिका दहन स्टेटस', 'Holi status', 'Bhakt Prahlad', 'भक्त प्रह्लाद', 'Holika puja'],
    scenes: [
      { prompt: 'Divine darshan of Bhagwan Narasimha with a calm, protective lion face, a golden mane and a jewelled crown, gently blessing the young boy devotee Prahlad who sits with folded hands and a peaceful smile, a warm golden glow around them, night sky', animate: 'a very slow push-in, the golden glow pulses softly, the faces stay still', deity: true, motion: 'in', hold: 6, big: 'बुराई पर अच्छाई की जीत', line: 'होलिका दहन की शुभकामनाएं', tts: 'भक्त प्रह्लाद की तरह, सच्ची भक्ति की सदा जीत हो।', sub: 'Bhakt Prahlad ki tarah, sachchi bhakti ki sada jeet ho.' },
      { prompt: 'A tall traditional Holika pyre of wood and dried cow-dung cakes tied with a red and white sacred thread in a village square at night, glowing flames and sparks rising, families seen from behind walking around it with brass lotas of water', animate: 'the flames rise and sparks drift upward slowly, the people stay calm', motion: 'out', hold: 6, big: 'होली की अग्नि', line: 'मन की हर बुराई जल जाए', tts: 'होली की अग्नि में मन की हर बुराई जल जाए।', sub: 'Holi ki agni mein man ki har buraai jal jaaye.' },
      { prompt: 'A brass puja thali with roli, rice, a coconut, raw cotton thread, green wheat ears, gulal and a lit diya on a red cloth, ready for Holika puja, warm night light', motion: 'pan', hold: 6, big: 'होलिका पूजा', line: 'कच्चा सूत, नारियल और गेहूं की बालियां', tts: 'ॐ नमो भगवते वासुदेवाय।', sub: 'Om Namo Bhagavate Vasudevaya.', mantra: 'ॐ नमो भगवते वासुदेवाय' },
    ],
  }),
  // Sheetala Ashtami / Basoda, Chaitra Krishna Ashtami (Drik + Prokerala 30 Mar 2027): big in Rajasthan; food cooked the
  // day before is offered cold to Maa Sheetala (donkey vahan, broom, kalash, neem: the common iconography).
  sheetala: T({
    playlist: 'Maa Durga aur Devi ki Kathayein', deity: 'Maa Sheetala', mantra: null,
    desc: 'Chaitra Krishna Ashtami ko Sheetala Ashtami (Basoda) manayi jati hai: parampara ke anusar ek din pehle bana thanda bhojan Maa Sheetala ko bhog lagaya jata hai aur parivaar ke aarogya ki kaamna ki jati hai',
    hashtags: ['#SheetalaAshtami', '#Basoda', '#SheetalaMata', '#JaiMataDi'],
    tags: ['Sheetala Ashtami status', 'Sheetala Ashtami 2027', 'शीतला अष्टमी', 'शीतला अष्टमी स्टेटस', 'Basoda status', 'बसोड़ा', 'Sheetala Mata', 'शीतला माता'],
    scenes: [
      { prompt: 'Divine darshan of Maa Sheetala, a calm and gentle Hindu goddess with a kind face, a red saree and a silver crown, seated on a donkey, holding a small broom and a kalash of cool water, fresh neem leaves around her, a small Rajasthan village temple in soft morning light', animate: 'a very slow push-in, the neem leaves sway gently and the light glows softly, the face stays still', deity: true, motion: 'in', hold: 6, big: 'जय शीतला माता', line: 'शीतला अष्टमी की शुभकामनाएं', tts: 'शीतला माता आपके परिवार को आरोग्य और सुख दें।', sub: 'Sheetala Mata aapke parivaar ko aarogya aur sukh dein.' },
      { prompt: 'A brass thali of basoda food made the day before, puris, sweet rice, curd, bajra roti and kanji in small clay pots, neem leaves and red flowers on a cloth at a home altar, cool morning light', animate: 'soft morning light moves slowly across the thali and the neem leaves stir gently', motion: 'out', hold: 6, big: 'बसोड़ा', line: 'ठंडे भोजन का भोग', tts: 'एक दिन पहले बने ठंडे भोजन का माँ को भोग।', sub: 'Ek din pehle bane thande bhojan ka Maa ko bhog.' },
      { prompt: 'Women in colourful Rajasthani lehariya odhnis seen from behind walking at dawn to a small Sheetala Mata temple under a big neem tree, carrying covered brass thalis, a quiet village lane', motion: 'pan', hold: 6, big: 'माँ की कृपा', line: 'घर में सदा आरोग्य रहे', tts: 'जय शीतला माता! घर में सदा आरोग्य रहे।', sub: 'Jai Sheetala Mata! Ghar mein sada aarogya rahe.' },
    ],
  }),
  // ---- big festivals (6 scenes; each variant shows 3 of them) ----
  // Basant (Vasant) Panchami, Magh Shukla Panchami (Drik + Prokerala 11 Feb 2027): Saraswati puja, yellow colours, spring.
  basant: T({
    playlist: 'Maa Durga aur Devi ki Kathayein', deity: 'Maa Saraswati', mantra: 'saraswati', big: true,
    desc: 'Magh Shukla Panchami ko Basant Panchami manayi jati hai: Maa Saraswati ki pooja, peele vastra aur peele phoolon ke saath basant ritu ka swagat; parampara ke anusar is din vidya aarambh shubh mana jata hai',
    hashtags: ['#BasantPanchami', '#VasantPanchami', '#MaaSaraswati', '#SaraswatiPuja', '#JaiMaaSaraswati'],
    tags: ['Basant Panchami status', 'Basant Panchami 2027', 'Vasant Panchami status', 'बसंत पंचमी', 'बसंत पंचमी स्टेटस', 'सरस्वती पूजा', 'Saraswati Puja status', 'Maa Saraswati status', 'वसंत पंचमी', 'Happy Basant Panchami'],
    scenes: [
      { prompt: 'Divine darshan of Maa Saraswati, a serene Hindu goddess with a gentle smiling face, a white saree and a golden crown, playing the veena while seated on a white lotus beside a calm river, a white swan near her, yellow mustard flowers around, soft spring morning light', animate: 'a very slow push-in, the river ripples and mustard flowers sway gently, the face stays still', deity: true, motion: 'in', hold: 6, big: 'जय माँ सरस्वती', line: 'बसंत पंचमी की शुभकामनाएं', tts: 'माँ सरस्वती आपको विद्या, बुद्धि और सफलता दें।', sub: 'Maa Saraswati aapko vidya, buddhi aur safalta dein.' },
      { prompt: 'Endless fields of bright yellow mustard flowers at sunrise in a north Indian village, a small temple with a saffron flag, butterflies, a clear spring sky', animate: 'the mustard flowers sway in the breeze and butterflies flutter slowly', motion: 'out', hold: 6, big: 'बसंत ऋतु', line: 'पीले फूलों से सजी धरती', tts: 'बसंत आया, धरती पीले फूलों से सज गई।', sub: 'Basant aaya, dharti peele phoolon se saj gayi.' },
      { prompt: 'A home altar for Maa Saraswati with yellow flowers, a veena, books, a pen and an ink pot, a bowl of yellow sweet rice and a lit brass diya on a yellow cloth, warm morning light', motion: 'pan', hold: 6, big: 'विद्या का वरदान', line: 'किताब और कलम की पूजा', tts: 'आज किताब और कलम की पूजा, विद्या का वरदान।', sub: 'Aaj kitaab aur kalam ki pooja, vidya ka vardaan.' },
      { prompt: 'Close darshan of Maa Saraswati with a calm gentle face, a white saree and a golden crown, holding a book and a rosary, a soft white halo behind her, a peacock beside her, white lotus flowers, serene light', animate: 'a very slow push-in, the halo glows softly and lotus petals drift, the face stays still', deity: true, motion: 'in', hold: 6, big: 'वीणा वादिनी', line: 'माँ शारदे की कृपा', tts: 'वीणा वादिनी माँ शारदे, सबके मन में ज्ञान का दीप जलाएं।', sub: 'Veena vadini Maa Sharde, sabke man mein gyaan ka deep jalayein.' },
      { prompt: 'Children in yellow clothes seen from behind flying yellow and orange kites from a rooftop on a bright spring morning, a clear blue sky, mustard fields far away', animate: 'the kites float and sway in the breeze', motion: 'out', hold: 6, big: 'पीला रंग, नई उमंग', line: 'खुशियों का बसंत', tts: 'पीले रंग की नई उमंग, खुशियों का बसंत।', sub: 'Peele rang ki nayi umang, khushiyon ka Basant.' },
      { prompt: 'Maa Saraswati with a calm face seated on a graceful white swan gliding over a lotus pond at dawn, the veena in her hands, a soft white and yellow glow', animate: 'the swan glides slowly and the water ripples, the face stays still', deity: true, motion: 'pan', hold: 6, big: 'ॐ ऐं सरस्वत्यै नमः', mantra: 'ॐ ऐं सरस्वत्यै नमः', tts: 'ॐ ऐं सरस्वत्यै नमः।', sub: 'Om Aim Saraswatyai Namah.' },
    ],
  }),
  // Mahashivratri, Phalgun Krishna Chaturdashi (Drik + Prokerala 6 Mar 2027): night puja and jagran; Shiv-Parvati vivah
  // is told as manyata.
  mahashivratri: T({
    playlist: 'Shiv ji ki Kathayein', deity: 'Shiv ji', mantra: 'shiv', big: true,
    desc: 'Phalgun Krishna Chaturdashi ko Mahashivratri manayi jati hai: raat bhar Bhagwan Shiv ki pooja, jalabhishek, belpatra aur jagran; manyata hai ki isi din Shiv-Parvati ka vivah hua tha',
    hashtags: ['#Mahashivratri', '#HarHarMahadev', '#OmNamahShivaya', '#Mahadev', '#Bholenath'],
    tags: ['Mahashivratri status', 'Mahashivratri 2027', 'Maha Shivratri status', 'महाशिवरात्रि', 'महाशिवरात्रि स्टेटस', 'शिवरात्रि स्टेटस', 'Har Har Mahadev status', 'Bholenath status', 'Om Namah Shivaya', 'महादेव स्टेटस'],
    scenes: [
      { prompt: `${SHIV}, seated on a tiger skin on Mount Kailash under a starry night sky, a calm blue glow, a crescent moon above, snow peaks behind`, animate: 'the stars twinkle softly and a gentle mist drifts, the face stays still and serene', deity: true, motion: 'in', hold: 6, big: 'हर हर महादेव', line: 'महाशिवरात्रि की शुभकामनाएं', tts: 'भोलेनाथ आपके हर संकट को हर लें।', sub: 'Bholenath aapke har sankat ko har lein.' },
      { prompt: 'A black stone Shivling at midnight in an old temple sanctum, a stream of milk and water being offered from a brass lota, bel leaves, white dhatura flowers and rudraksha, many small diyas glowing around it', animate: 'the milk stream flows slowly and the diya flames flicker', motion: 'out', hold: 6, big: 'जलाभिषेक', line: 'बेलपत्र, जल और दूध', tts: 'बेलपत्र, जल और दूध से भोलेनाथ का अभिषेक।', sub: 'Belpatra, jal aur doodh se Bholenath ka abhishek.' },
      { prompt: 'A temple trident with a small damru tied to it, rudraksha malas and bel leaves on a stone altar, a deep blue night sky with a thin crescent moon, a Shiv temple spire glowing with lamps', motion: 'pan', hold: 6, big: 'रात्रि जागरण', line: 'रात भर शिव का ध्यान', tts: 'आज की रात शिव का ध्यान, मन को शांति देता है।', sub: 'Aaj ki raat Shiv ka dhyaan, man ko shanti deta hai.' },
      { prompt: `${SHIV}, with Maa Parvati beside him in a red bridal saree on Mount Kailash, both with calm smiling faces, flowers falling from the sky, Nandi resting in front, a soft golden glow`, animate: 'flower petals drift down slowly and the golden glow pulses softly, the faces stay still', deity: true, motion: 'in', hold: 6, big: 'शिव-पार्वती', line: 'शिव-शक्ति का पावन पर्व', tts: 'शिव पार्वती की कृपा से घर में सुख शांति बनी रहे।', sub: 'Shiv Parvati ki kripa se ghar mein sukh shanti bani rahe.' },
      { prompt: 'Devotees seen from behind walking at night towards a lit Shiv temple carrying brass kalash of water and bel leaves, saffron flags, temple bells and rows of oil lamps on the steps', animate: 'the lamp flames flicker and the flags flutter gently, the people walk calmly', motion: 'out', hold: 6, big: 'बम बम भोले', line: 'शिव भक्ति की रात', tts: 'बम बम भोले! शिव भक्ति की यह पावन रात।', sub: 'Bam Bam Bhole! Shiv bhakti ki yeh paavan raat.' },
      { prompt: 'Close darshan of Bhagwan Shiv with a calm blue-grey face and closed eyes in meditation, a crescent moon and the Ganga in his matted hair, rudraksha malas, a soft blue glow and night stars behind', animate: 'a very slow push-in, the glow pulses softly and the Ganga stream shimmers in his hair, the face stays still', deity: true, motion: 'pan', hold: 6, big: 'ॐ नमः शिवाय', mantra: 'ॐ नमः शिवाय', tts: 'ॐ नमः शिवाय।', sub: 'Om Namah Shivaya.' },
    ],
  }),
  // Holi (Dhulandi), the day after Holika Dahan (Drik 22 Mar 2027, gazetted holiday 22 Mar per timeanddate.com;
  // Prokerala lists 23 Mar). Braj Holi of Radha-Krishna, and Baba Shyam's Phalgun Holi at Khatu (sheesh only).
  holi: T({
    playlist: 'Vishnu ji aur Krishna ki Kathayein', deity: 'Radha Krishna / Khatu Shyam ji', mantra: null, big: true,
    desc: 'Phalgun Purnima ke baad Holi rangon, gulal aur prem ka tyohar hai: Braj mein Radha-Krishna ki Holi aur Khatu mein Phalgun mein Baba Shyam ke darbar ki Holi ki parampara hai',
    hashtags: ['#Holi', '#HappyHoli', '#Holi2027', '#RadheKrishna', '#Bhakti'],
    tags: ['Holi status', 'Holi 2027', 'Happy Holi status', 'होली', 'होली स्टेटस', 'होली की शुभकामनाएं', 'Radha Krishna Holi status', 'राधा कृष्ण होली', 'Holi whatsapp status', 'Khatu Shyam Holi'],
    scenes: [
      { prompt: 'Divine darshan of Radha and Krishna playing Holi in a Vrindavan garden, Krishna with a peacock feather crown, blue complexion and a joyful smile, Radha in a red lehenga smiling, soft clouds of pink, yellow and green gulal in the air, flower petals, warm spring light', animate: 'soft clouds of gulal drift slowly and petals fall, the faces stay still', deity: true, motion: 'in', hold: 6, big: 'होली है', line: 'रंगों का पावन त्योहार', tts: 'राधा कृष्ण के प्रेम के रंग आपके जीवन में भर जाएं।', sub: 'Radha Krishna ke prem ke rang aapke jeevan mein bhar jaayein.' },
      { prompt: 'Brass bowls full of bright gulal powders in pink, yellow, green and orange with marigold flowers, a brass pichkari and a plate of gujiya sweets on a white cloth, festive morning light', animate: 'a little gulal powder drifts up softly in the light', motion: 'out', hold: 6, big: 'रंग, गुलाल, गुजिया', line: 'मिठास और रंगों की होली', tts: 'रंग, गुलाल और गुजिया की मिठास से भरी होली।', sub: 'Rang, gulal aur gujiya ki mithaas se bhari Holi.' },
      { prompt: 'Families in white clothes seen from behind playing Holi with colourful gulal in a Rajasthani haveli courtyard, flower petals in the air, a dhol in the corner, joyful festive mood', motion: 'pan', hold: 6, big: 'अपनों के संग', line: 'प्रेम और भाईचारे की होली', tts: 'अपनों के संग, प्रेम और भाईचारे की होली।', sub: 'Apno ke sang, prem aur bhaichare ki Holi.' },
      { prompt: `Darshan of ${SHEESH}, decorated for Phalgun with pink, yellow and green flower garlands and a little gulal, rose petals drifting, a festive temple sanctum with diyas`, animate: 'rose petals drift slowly and the diya light glows, the face stays still', deity: true, motion: 'in', hold: 6, big: 'श्याम संग होली', line: 'खाटू में फाल्गुन की होली', tts: 'बाबा श्याम के दरबार में फाल्गुन की होली।', sub: 'Baba Shyam ke darbar mein Phalgun ki Holi.' },
      { prompt: 'A Krishna temple courtyard in Vrindavan showered with rose and marigold petals during phoolon ki Holi, priests seen from behind throwing petals, colourful soft light, devotional joy', animate: 'flower petals fall slowly through the air', motion: 'out', hold: 6, big: 'फूलों की होली', line: 'वृंदावन की प्रेम भरी होली', tts: 'वृंदावन की फूलों वाली, प्रेम भरी होली।', sub: 'Vrindavan ki phoolon wali, prem bhari Holi.' },
      { prompt: 'Close darshan of Shri Krishna with a peacock feather crown, blue complexion and a joyful smile, a touch of pink gulal on his cheeks, holding a flute, soft clouds of colourful gulal behind him', animate: 'a very slow push-in, the gulal clouds drift softly, the face stays still', deity: true, motion: 'pan', hold: 6, big: 'राधे राधे', line: 'बांके बिहारी की जय', tts: 'राधे राधे! बांके बिहारी लाल की जय।', sub: 'Radhe Radhe! Banke Bihari Lal ki jai.' },
    ],
  }),
  // Khatu Shyam ji Phalgun (Lakkhi) mela: the channel's biggest yearly moment. Main day = Phalgun Shukla Ekadashi
  // (Amalaki Ekadashi, Drik + Prokerala 18 Mar 2027); the mela runs to Dwadashi (khatu.org: the sheesh appeared at Shyam
  // Kund on Phalgun Sudi Ekadashi and was offered on Dwadashi; 2026 mela: Phalgun Shukla Chaturthi-Dwadashi, 21-28 Feb).
  // Nishan yatra = devotees walking from Ringas to Khatu with flags. Khatu Shyam ji is the sheesh only.
  phalgunmela: T({
    playlist: 'Khatu Shyam ji ki Kathayein', deity: 'Khatu Shyam ji', mantra: null, big: true,
    desc: 'Phalgun Shukla Ekadashi ko Khatu Dham mein Baba Shyam ka Phalgun (Lakkhi) mela bharta hai: lakhon bhakt Ringas se nishan lekar paidal yatra karte hain; manyata hai ki Phalgun Sudi Ekadashi ko Shyam Kund mein Baba ka sheesh prakat hua',
    hashtags: ['#KhatuShyam', '#JaiShreeShyam', '#PhalgunMela', '#KhatuShyamMela', '#HaareKaSahara'],
    tags: ['Khatu Shyam mela status', 'Khatu Shyam Phalgun mela 2027', 'खाटू श्याम मेला', 'खाटू श्याम मेला स्टेटस', 'Phalgun mela Khatu', 'फाल्गुन मेला', 'Lakkhi mela Khatu', 'निशान यात्रा', 'Jai Shree Shyam', 'हारे का सहारा'],
    scenes: [
      { prompt: `Darshan of ${SHEESH}, decorated for the Phalgun mela with fresh rose and marigold garlands and colourful flowers, glowing diyas, a grand festive sanctum`, animate: 'the diya light glows and a few rose petals drift slowly, the face stays still', deity: true, motion: 'in', hold: 6, big: 'जय श्री श्याम', line: 'बाबा श्याम का फाल्गुन मेला', tts: 'हारे का सहारा, बाबा श्याम हमारा! फाल्गुन मेले की जय।', sub: 'Haare ka sahara, Baba Shyam hamara! Phalgun mele ki jai.' },
      { prompt: 'Thousands of devotees seen from behind walking on a long country road in Rajasthan towards Khatu, carrying tall saffron, blue and red nishan flags, morning sun, joyful pilgrimage', animate: 'the nishan flags flutter in the breeze and the people walk slowly ahead', motion: 'out', hold: 6, big: 'निशान यात्रा', line: 'रींगस से खाटू तक पैदल', tts: 'रींगस से खाटू तक, निशान लेकर पैदल यात्रा।', sub: 'Ringas se Khatu tak, nishan lekar paidal yatra.' },
      { prompt: 'A grand white marble Hindu temple in a small Rajasthan town at night lit with warm lights and flower decorations, saffron flags on top, a festive crowd seen from far away, a glowing sky', motion: 'pan', hold: 6, big: 'खाटू धाम', line: 'हारे का सहारा, बाबा श्याम हमारा', tts: 'खाटू धाम में आज भक्ति का सागर उमड़ा है।', sub: 'Khatu Dham mein aaj bhakti ka saagar umda hai.' },
      { prompt: `Close darshan of ${SHEESH}, with a soft golden glow, rose petals drifting in front, devotional evening light`, animate: 'a very slow push-in, rose petals drift and the golden glow pulses softly, the face stays still', deity: true, motion: 'in', hold: 6, big: 'फाल्गुन एकादशी', line: 'बाबा के दरबार में लक्खी मेला', tts: 'फाल्गुन एकादशी पर बाबा श्याम सबकी झोली भरें।', sub: 'Phalgun Ekadashi par Baba Shyam sabki jholi bharein.' },
      { prompt: 'A holy stepped temple pond in Rajasthan at dawn, devotees seen from behind with folded hands at the water, temple bells and saffron flags around it, soft mist and golden light', animate: 'the water ripples softly and the mist drifts', motion: 'out', hold: 6, big: 'श्याम कुंड', line: 'मान्यता: यहीं प्रकट हुआ बाबा का शीश', tts: 'मान्यता है, श्याम कुंड में बाबा का शीश प्रकट हुआ।', sub: 'Manyata hai, Shyam Kund mein Baba ka sheesh prakat hua.' },
      { prompt: `Darshan of ${SHEESH}, at night with rows of lit diyas and soft colourful flower petals for Phalgun, a devotional glow`, animate: 'the diya flames flicker and petals drift gently, the face stays still', deity: true, motion: 'pan', hold: 6, big: 'हारे का सहारा', line: 'बाबा श्याम सबकी झोली भरें', tts: 'जय श्री श्याम! बाबा श्याम सबकी झोली भरें।', sub: 'Jai Shree Shyam! Baba Shyam sabki jholi bharein.' },
    ],
  }),
  devdeepawali: T({
    playlist: 'Shiv ji ki Kathayein', deity: 'Shiv ji / Ganga Maiya', mantra: 'shiv', big: true,
    desc: 'Kartik Purnima ko Kashi mein Dev Deepawali manayi jati hai: Ganga ghaton par lakhon deep jalaye jate hain; parampara ke anusar isi din Bhagwan Shiv ne Tripurasur ka ant kiya aur devtaon ne deep jalaye',
    hashtags: ['#DevDeepawali', '#KartikPurnima', '#Kashi', '#Varanasi', '#HarHarMahadev', '#GangaAarti'],
    tags: ['Dev Deepawali status', 'Dev Deepawali 2026', 'Kartik Purnima status', 'देव दीपावली', 'देव दीपावली स्टेटस', 'कार्तिक पूर्णिमा', 'Kashi Dev Deepawali', 'Varanasi ghat diye', 'Ganga aarti status', 'Har Har Mahadev'],
    scenes: [
      { prompt: `${SHIV}, seated on a white rock above the Ganga at Kashi at night, lakhs of diyas glowing on the ghats below, a full moon behind his head`, animate: 'a very slow push-in, the river lights shimmer and the moon glows softly, the face stays still', deity: true, motion: 'in', hold: 6, big: 'हर हर महादेव', line: 'बाबा विश्वनाथ की जय', tts: 'बाबा विश्वनाथ की कृपा से हर घर रोशन रहे।', sub: 'Baba Vishwanath ki kripa se har ghar roshan rahe.' },
      { prompt: 'The ghats of Varanasi on Dev Deepawali night glowing with countless clay diyas along every stone step, the river Ganga reflecting the lights, temple spires, a full moon above', animate: 'the diya flames flicker and their reflections shimmer on the rippling river', motion: 'out', hold: 6, big: 'देव दीपावली', line: 'काशी में देवों की दिवाली', tts: 'काशी के घाटों पर आज देवों की दिवाली है।', sub: 'Kashi ke ghaton par aaj devon ki Diwali hai.' },
      { prompt: 'Leaf boats carrying lit diyas and marigold flowers floating on the river Ganga at night, thousands of small lights drifting, a ghat with lamps in soft focus', motion: 'pan', hold: 6, big: 'दीपदान', line: 'माँ गंगा को दीप अर्पण', tts: 'माँ गंगा को दीपदान, मन को शांति देता है।', sub: 'Maa Ganga ko deepdaan, man ko shanti deta hai.' },
      { prompt: 'Divine darshan of Maa Ganga, a serene Hindu goddess with a gentle face, fair complexion, a white and blue saree and a silver crown, seated on her makara vahan on the river at Kashi on Kartik Purnima night, holding a kalash and a lotus, rows of lit diyas on the ghats behind her, a full moon above', animate: 'a very slow push-in, the river ripples and the diya lights shimmer softly, the face stays still', deity: true, motion: 'in', hold: 6, big: 'कार्तिक पूर्णिमा', line: 'जय गंगा मैया', tts: 'कार्तिक पूर्णिमा पर माँ गंगा सबका कल्याण करें।', sub: 'Kartik Purnima par Maa Ganga sabka kalyan karein.' },
      { prompt: 'Priests in saffron performing the grand Ganga aarti with tall multi-tiered brass lamps on a Varanasi ghat at night, conch shells, bells and marigold decorations, golden glow', animate: 'the large aarti lamps move slowly in circles and the flames glow, smoke drifts', motion: 'out', hold: 6, big: 'गंगा आरती', line: 'जय गंगा मैया', tts: 'जय गंगा मैया! हर हर गंगे।', sub: 'Jai Ganga Maiya! Har Har Gange.' },
      { prompt: 'A stone Shivling on a Varanasi ghat surrounded by rows of lit clay diyas, bel leaves and white flowers, the glowing river and boats behind, devotional night', animate: 'the diya flames flicker softly and the river lights shimmer', deity: true, motion: 'pan', hold: 6, big: 'ॐ नमः शिवाय', mantra: 'ॐ नमः शिवाय', tts: 'ॐ नमः शिवाय।', sub: 'Om Namah Shivaya.' },
    ],
  }),
  sankranti: T({
    playlist: 'Surya Dev ki Kathayein', deity: 'Surya dev', mantra: 'surya', big: true, voice: 'hm_omega',
    desc: 'Makar Sankranti par Surya dev Makar rashi mein pravesh karte hain aur Uttarayan ka aarambh hota hai; snan, daan, til-gud aur patang ki parampara hai',
    hashtags: ['#MakarSankranti', '#MakarSankranti2027', '#Uttarayan', '#SuryaDev', '#TilGud', '#Patang'],
    tags: ['Makar Sankranti status', 'Makar Sankranti 2027', 'Happy Makar Sankranti', 'मकर संक्रांति', 'मकर संक्रांति स्टेटस', 'Sankranti status', 'Uttarayan status', 'तिल गुड़', 'Patang status', 'Surya dev'],
    scenes: [
      { prompt: 'Surya dev, the radiant sun god with a golden crown and a calm face, riding a golden chariot pulled by seven white horses across a glowing sunrise sky above clouds', animate: 'the horses gallop slowly in place, golden sun rays shimmer, the face stays still', deity: true, motion: 'in', hold: 6, big: 'मकर संक्रांति', line: 'सूर्य देव की जय', tts: 'सूर्य देव आपके जीवन में नई रोशनी और ऊर्जा भरें।', sub: 'Surya dev aapke jeevan mein nayi roshni aur urja bharein.' },
      { prompt: 'Colourful kites flying over old Rajasthani rooftops on a bright winter morning, families flying kites seen from behind, a clear blue sky, festive mood', animate: 'the kites float and sway in the breeze, the strings move gently', motion: 'out', hold: 6, big: 'पतंग उत्सव', line: 'खुशियों की ऊँची उड़ान', tts: 'आपकी खुशियाँ भी पतंग की तरह ऊँची उड़ें।', sub: 'Aapki khushiyan bhi patang ki tarah oonchi udein.' },
      { prompt: 'A brass plate of sesame and jaggery laddoos, chikki, khichdi in a clay pot and a lit diya on a red cloth, marigold flowers, warm winter sunlight', motion: 'pan', hold: 6, big: 'तिल-गुड़', line: 'मीठा खाओ, मीठा बोलो', tts: 'तिल गुड़ खाओ, और मीठा मीठा बोलो।', sub: 'Til gud khao, aur meetha meetha bolo.' },
      { prompt: 'Divine darshan of Surya dev with a calm radiant golden face and a golden crown, rising in a glowing sun disc above the misty sangam on a winter sunrise, devotees in the river below offering water with folded hands seen from behind, saffron flags on the bank', animate: 'a very slow push-in, the river ripples, mist drifts slowly and the golden rays shimmer, the face stays still', deity: true, motion: 'in', hold: 6, big: 'संक्रांति स्नान', line: 'गंगा स्नान और दान', tts: 'संक्रांति पर स्नान और दान का बड़ा महत्व है।', sub: 'Sankranti par snan aur daan ka bada mahatva hai.' },
      { prompt: 'Golden sunrise over green mustard and wheat fields with a small village temple, a farmer family offering water to the sun, birds flying, the start of Uttarayan', motion: 'out', hold: 6, big: 'उत्तरायण', line: 'नई फसल, नई उम्मीद', tts: 'आज से उत्तरायण शुरू, नई फसल और नई उम्मीद।', sub: 'Aaj se Uttarayan shuru, nayi fasal aur nayi ummeed.' },
      { prompt: 'Close-up darshan of Surya dev with a radiant golden face and crown, a glowing sun disc behind his head, lotus flowers in his hands, warm sunrise colours', animate: 'a very slow push-in, the golden rays shimmer softly, the face stays still', deity: true, motion: 'pan', hold: 6, big: 'ॐ सूर्याय नमः', mantra: 'ॐ सूर्याय नमः', tts: 'ॐ सूर्याय नमः।', sub: 'Om Suryaya Namah.' },
    ],
  }),
};

/** Variant picks for big themes without festivals.json `picks` (3 variants: evening before, 00:30, 08:30). */
export const DEFAULT_PICKS = { 3: [[0, 1, 2], [1, 2, 0], [2, 0, 1]], 6: [[0, 1, 2], [3, 4, 5], [1, 5, 0]] };

/** Weekday "day status" Shorts (morning slot of normal days; Ekadashi days: Gyaras Khatu Shyam). names rotate weekly. */
export const DAY_THEMES = {
  1: T({ key: 'somvar-mahadev', wish: ['आपका दिन मंगलमय हो', 'शुभ सोमवार, हर हर महादेव 🙏'], playlist: 'Shiv ji ki Kathayein', deity: 'Shiv ji (Somvar)', mantra: 'shiv',
    names: [{ en: 'Somvar Mahadev', hi: 'सोमवार महादेव' }, { en: 'Somvar Shiv ji', hi: 'सोमवार शिव जी' }, { en: 'Monday Mahadev', hi: 'मंडे महादेव' }, { en: 'Somvar Bholenath', hi: 'सोमवार भोलेनाथ' }],
    hooks: ['सोमवार: हर हर महादेव 🙏', 'जय भोलेनाथ! शुभ सोमवार 🙏'],
    desc: 'Somvar Bhagwan Shiv ka din hai', hashtags: ['#SomvarStatus', '#Mahadev', '#HarHarMahadev', '#OmNamahShivaya', '#Bholenath'],
    tags: ['Somvar status', 'Mahadev status', 'Monday Mahadev status', 'सोमवार स्टेटस', 'महादेव स्टेटस', 'शुभ सोमवार', 'Har Har Mahadev', 'Bholenath status', 'Om Namah Shivaya'],
    scenes: THEMES.shivratri.scenes.map((s, i) => (i === 0 ? { ...s, big: 'शुभ सोमवार', line: 'भोलेनाथ की कृपा बनी रहे', tts: 'भोलेनाथ की कृपा से आपका पूरा हफ्ता शुभ हो।', sub: 'Bholenath ki kripa se aapka poora hafta shubh ho.' } : s)) }),
  2: T({ key: 'mangalvar-salasar-balaji', wish: ['आपका दिन मंगलमय हो', 'शुभ मंगलवार, जय बजरंगबली 🙏'], playlist: 'Hanuman ji ki Kathayein', deity: 'Hanuman ji / Salasar Balaji (Mangalvar)', mantra: 'ram', voice: 'hm_omega',
    names: [{ en: 'Mangalvar Hanuman ji', hi: 'मंगलवार हनुमान जी' }, { en: 'Salasar Balaji', hi: 'सालासर बालाजी', lead: 0 }, { en: 'Mangalvar Bajrangbali', hi: 'मंगलवार बजरंगबली' }, { en: 'Tuesday Hanuman ji', hi: 'मंगलवार हनुमान' }],
    hooks: ['मंगलवार: जय बजरंगबली 🙏', 'जय सालासर बालाजी 🙏'],
    desc: 'Mangalvar Hanuman ji ka din hai; Salasar (Churu, Rajasthan) mein Balaji daadhi-moochh wale roop mein pooje jate hain', hashtags: ['#MangalvarStatus', '#HanumanJi', '#SalasarBalaji', '#JaiBajrangbali', '#JaiShreeRam'],
    tags: ['Mangalvar status', 'Hanuman ji status', 'Salasar Balaji status', 'मंगलवार स्टेटस', 'हनुमान जी स्टेटस', 'सालासर बालाजी', 'Jai Bajrangbali', 'Tuesday Hanuman status', 'बजरंगबली'],
    scenes: [
      { prompt: 'Divine darshan of Shri Salasar Balaji, Hanuman ji with a beard and moustache on an orange sindoor face, a silver crown and flower garlands, as worshipped at Salasar Dham, a decorated sanctum with oil lamps', animate: 'a very slow push-in, oil lamps flicker and marigold petals drift, the face stays still', deity: true, motion: 'in', hold: 6, big: 'जय सालासर बालाजी', line: 'दाढ़ी-मूँछ वाले बालाजी', tts: 'सालासर बालाजी, आपके हर संकट को दूर करें।', sub: 'Salasar Balaji, aapke har sankat ko door karein.' },
      { prompt: 'Hanuman ji flying over the ocean carrying the Sanjeevani mountain in one hand, a mace in the other, powerful and calm, golden sunset clouds', animate: 'the clouds drift past and the sunlight glows, Hanuman ji stays steady', deity: true, motion: 'out', hold: 6, big: 'संकट मोचन', line: 'जय बजरंगबली', tts: 'संकट मोचन हनुमान जी, सदा आपके साथ हैं।', sub: 'Sankat Mochan Hanuman ji, sada aapke saath hain.' },
      { prompt: 'Hanuman ji kneeling with folded hands before Shri Ram and Maa Sita in a golden palace hall, devotional light, flowers', motion: 'pan', hold: 6, big: 'जय श्री राम', mantra: 'श्री राम जय राम जय जय राम', tts: 'श्री राम जय राम जय जय राम।', sub: 'Shri Ram Jai Ram Jai Jai Ram.' },
    ] }),
  3: T({ key: 'budhvar-ganesh', wish: ['आपका दिन शुभ हो', 'शुभ बुधवार, गणपति बप्पा मोरया 🙏'], playlist: 'Ganesh ji ki Kathayein', deity: 'Ganesh ji (Budhvar)', mantra: 'ganesh',
    names: [{ en: 'Budhvar Ganesh ji', hi: 'बुधवार गणेश जी' }, { en: 'Ganpati Bappa', hi: 'गणपति बप्पा' }, { en: 'Budhvar Ganpati', hi: 'बुधवार गणपति' }],
    hooks: ['बुधवार: गणपति बप्पा मोरया 🙏', 'जय गणेश देवा! शुभ बुधवार 🙏'],
    desc: 'Budhvar Ganesh ji ka din hai', hashtags: ['#BudhvarStatus', '#GaneshJi', '#GanpatiBappaMorya', '#Vighnaharta'],
    tags: ['Budhvar status', 'Ganesh ji status', 'Ganpati Bappa status', 'बुधवार स्टेटस', 'गणेश जी स्टेटस', 'गणपति बप्पा मोरया', 'Wednesday Ganesh status', 'Vighnaharta'],
    scenes: THEMES.sankashti.scenes.map((s, i) => (i === 1 ? { prompt: 'A grand Ganesh temple sanctum decorated with marigold and rose garlands, brass bells and rows of lit diyas, devotees with folded hands in soft focus, golden morning light', animate: 'the bells sway gently and the diya flames flicker', motion: 'out', hold: 6, big: 'शुभ बुधवार', line: 'हर काम में शुभ आरंभ', tts: 'गणेश जी के आशीर्वाद से हर काम का शुभ आरंभ हो।', sub: 'Ganesh ji ke ashirwad se har kaam ka shubh aarambh ho.' } : s)) }),
  4: T({ key: 'guruvar-vishnu', wish: ['आपका दिन शुभ हो', 'शुभ गुरुवार, जय श्री हरि 🙏'], playlist: 'Vishnu ji aur Krishna ki Kathayein', deity: 'Vishnu ji / Sai Baba (Guruvar)', mantra: 'vishnu',
    names: [{ en: 'Guruvar Vishnu ji', hi: 'गुरुवार विष्णु जी', lead: 0 }, { en: 'Guruvar Sai Baba', hi: 'गुरुवार साईं बाबा', lead: 1 }, { en: 'Thursday Vishnu ji', hi: 'गुरुवार श्री हरि', lead: 2 }],
    hooks: ['गुरुवार: जय श्री हरि 🙏', 'ॐ साईं राम! शुभ गुरुवार 🙏'],
    desc: 'Guruvar Bhagwan Vishnu (aur bahut se bhakton ke liye Sai Baba) ka din hai', hashtags: ['#GuruvarStatus', '#JaiShreeHari', '#VishnuJi', '#SaiBaba', '#OmSaiRam'],
    tags: ['Guruvar status', 'Vishnu ji status', 'Sai Baba status', 'गुरुवार स्टेटस', 'विष्णु जी स्टेटस', 'साईं बाबा स्टेटस', 'Thursday status', 'Om Sai Ram', 'Jai Shree Hari'],
    scenes: [THEMES.ekadashi.scenes[0], { prompt: 'Shirdi Sai Baba seated calmly on a stone with one leg folded, white kafni robe and white head cloth, a gentle blessing hand, an old Dwarkamai mosque wall behind, warm lamp light', animate: 'a very slow push-in, the lamp light glows softly, the face stays still', deity: true, motion: 'out', hold: 6, big: 'ॐ साईं राम', line: 'श्रद्धा और सबूरी', tts: 'श्रद्धा और सबूरी, जीवन को आसान बना देती है।', sub: 'Shraddha aur saburi, jeevan ko aasaan bana deti hai.' }, THEMES.ekadashi.scenes[2]] }),
  5: T({ key: 'shukravar-lakshmi', wish: ['आपका दिन शुभ हो', 'शुभ शुक्रवार, जय माता दी 🙏'], playlist: 'Maa Durga aur Devi ki Kathayein', deity: 'Maa Lakshmi / Santoshi Mata (Shukravar)', mantra: 'lakshmi',
    names: [{ en: 'Shukravar Lakshmi Mata', hi: 'शुक्रवार लक्ष्मी माता', lead: 0 }, { en: 'Santoshi Mata', hi: 'संतोषी माता', lead: 1 }, { en: 'Shukravar Maa Lakshmi', hi: 'शुक्रवार माँ लक्ष्मी' }],
    hooks: ['शुक्रवार: जय माँ लक्ष्मी 🙏', 'जय संतोषी माता! शुभ शुक्रवार 🙏'],
    desc: 'Shukravar Maa Lakshmi aur Santoshi Mata ka din hai', hashtags: ['#ShukravarStatus', '#MaaLakshmi', '#SantoshiMata', '#JaiMataDi'],
    tags: ['Shukravar status', 'Lakshmi Mata status', 'Santoshi Mata status', 'शुक्रवार स्टेटस', 'लक्ष्मी माता स्टेटस', 'संतोषी माता', 'Friday status', 'Jai Maa Lakshmi'],
    scenes: [
      { prompt: 'Divine darshan of Maa Lakshmi seated on a pink lotus, four arms, two holding lotuses and one showering gold coins, a red silk saree and golden crown, white elephants in the background, warm golden light', animate: 'a very slow push-in, gold coins shimmer and lotus petals drift, the face stays still', deity: true, motion: 'in', hold: 6, big: 'जय माँ लक्ष्मी', line: 'शुभ शुक्रवार', tts: 'माँ लक्ष्मी आपके घर में सुख और समृद्धि भर दें।', sub: 'Maa Lakshmi aapke ghar mein sukh aur samriddhi bhar dein.' },
      { prompt: 'Divine darshan of Santoshi Mata, a gentle Hindu goddess in a red saree with a golden crown, holding a trident, a sword and a bowl of rice, a calm smile, a decorated temple sanctum with lamps', animate: 'the lamp flames flicker softly and flower petals drift, the face stays still', deity: true, motion: 'out', hold: 6, big: 'जय संतोषी माता', line: 'मन में संतोष, घर में सुख', tts: 'मन में संतोष हो, तो घर में सुख आता है।', sub: 'Man mein santosh ho, to ghar mein sukh aata hai.' },
      { prompt: 'A home altar on Friday evening with a silver kalash, lotus flowers, a lit diya, kumkum and a plate of gud-chana, a soft rangoli in front, warm light', motion: 'pan', hold: 6, big: 'ॐ श्रीं महालक्ष्म्यै नमः', mantra: 'ॐ श्रीं महालक्ष्म्यै नमः', tts: 'ॐ श्रीं महालक्ष्म्यै नमः।', sub: 'Om Shreem Mahalakshmyai Namah.' },
    ] }),
  6: T({ key: 'shanivar-shani-dev', wish: ['आपका दिन शुभ हो', 'शुभ शनिवार, जय शनि देव 🙏'], playlist: 'Shani Dev ki Kathayein', deity: 'Shani dev (Shanivar)', mantra: 'shani', voice: 'hm_omega',
    names: [{ en: 'Shanivar Shani Dev', hi: 'शनिवार शनि देव' }, { en: 'Shani Dev', hi: 'शनि देव' }, { en: 'Saturday Shani Dev', hi: 'शनिवार शनि महाराज' }],
    hooks: ['शनिवार: जय शनि देव 🙏', 'जय शनि महाराज! शुभ शनिवार 🙏'],
    desc: 'Shanivar Shani dev ka din hai; peepal ke neeche sarson ke tel ka deepak jalane ki parampara hai', hashtags: ['#ShanivarStatus', '#ShaniDev', '#JaiShaniDev', '#ShaniMaharaj'],
    tags: ['Shanivar status', 'Shani Dev status', 'Saturday Shani status', 'शनिवार स्टेटस', 'शनि देव स्टेटस', 'जय शनि देव', 'Shani Maharaj', 'शनि महाराज'],
    scenes: [
      { prompt: 'Divine darshan of Shani dev, a calm Hindu deity with a dark blue-black complexion, a golden crown, dark blue robes, holding a bow and arrow, seated on a crow vahan, a calm just gaze, a dark temple sanctum with oil lamps', animate: 'a very slow push-in, the oil lamps flicker and smoke drifts, the face stays still', deity: true, motion: 'in', hold: 6, big: 'जय शनि देव', line: 'शुभ शनिवार', tts: 'शनि देव न्याय के देवता हैं। अच्छे कर्म, अच्छा फल।', sub: 'Shani dev nyaay ke devta hain. Achchhe karm, achchha phal.' },
      { prompt: 'A clay diya with mustard oil glowing under a huge old peepal tree on a Saturday evening, black sesame seeds and blue flowers offered, a small Shani shrine nearby, twilight', animate: 'the diya flame flickers and the peepal leaves sway gently', motion: 'out', hold: 6, big: 'पीपल का दीपक', line: 'शनिवार की शाम', tts: 'शनिवार की शाम, पीपल के नीचे एक दीपक जलाइए।', sub: 'Shanivar ki shaam, peepal ke neeche ek deepak jalaiye.' },
      { prompt: 'Hanuman ji in a calm blessing pose beside Shani dev in a temple painting style, oil lamps and blue flowers, devotional light', deity: true, motion: 'pan', hold: 6, big: 'ॐ शं शनैश्चराय नमः', mantra: 'ॐ शं शनैश्चराय नमः', tts: 'ॐ शं शनैश्चराय नमः।', sub: 'Om Sham Shanaishcharaya Namah.' },
    ] }),
  0: T({ key: 'ravivar-surya-dev', wish: ['आपका दिन शुभ हो', 'शुभ रविवार, जय सूर्य देव 🙏'], playlist: 'Surya Dev ki Kathayein', deity: 'Surya dev (Ravivar)', mantra: 'surya', voice: 'hm_omega',
    names: [{ en: 'Ravivar Surya Dev', hi: 'रविवार सूर्य देव' }, { en: 'Surya Dev', hi: 'सूर्य देव' }, { en: 'Sunday Surya Dev', hi: 'रविवार सूर्य नारायण' }],
    hooks: ['रविवार: जय सूर्य देव 🙏', 'जय सूर्य नारायण! शुभ रविवार 🙏'],
    desc: 'Ravivar Surya dev ka din hai; subah Surya dev ko jal (arghya) dene ki parampara hai', hashtags: ['#RavivarStatus', '#SuryaDev', '#JaiSuryaDev', '#GoodMorning'],
    tags: ['Ravivar status', 'Surya Dev status', 'Sunday status', 'रविवार स्टेटस', 'सूर्य देव स्टेटस', 'शुभ रविवार', 'Surya arghya', 'Jai Surya Dev'],
    scenes: [THEMES.sankranti.scenes[5], { prompt: 'A devotee offering water from a copper lota to the rising sun on a riverbank at dawn, seen from behind, the water stream sparkling in golden light, birds flying', animate: 'the water stream sparkles and flows slowly, the sun glows and birds glide', motion: 'out', hold: 6, big: 'सूर्य को अर्घ्य', line: 'शुभ रविवार', tts: 'सुबह सूर्य को जल चढ़ाइए, दिन भर ऊर्जा बनी रहेगी।', sub: 'Subah Surya ko jal chadhaiye, din bhar urja bani rahegi.' }, THEMES.sankranti.scenes[0]] }),
  gyaras: T({ key: 'gyaras-khatu-shyam', wish: ['आपको और आपके परिवार को', 'ग्यारस की शुभकामनाएं, जय श्री श्याम 🙏'], playlist: 'Khatu Shyam ji ki Kathayein', deity: 'Khatu Shyam ji (Gyaras)', mantra: null,
    names: [{ en: 'Gyaras Khatu Shyam', hi: 'ग्यारस खाटू श्याम' }, { en: 'Ekadashi Shyam Baba', hi: 'एकादशी श्याम बाबा' }],
    hooks: ['ग्यारस: जय श्री श्याम 🙏', 'एकादशी पर बाबा श्याम के दर्शन 🙏'],
    desc: 'Khatu parampara mein har Ekadashi (Gyaras) Baba Shyam ka vishesh din hai', hashtags: ['#KhatuShyam', '#Gyaras', '#JaiShreeShyam', '#HaareKaSahara', '#ShyamBaba'],
    tags: ['Gyaras status', 'Khatu Shyam status', 'Ekadashi Shyam status', 'ग्यारस स्टेटस', 'खाटू श्याम स्टेटस', 'हारे का सहारा', 'Shyam Baba status', 'Jai Shree Shyam'],
    scenes: [
      { prompt: `Divine darshan of ${SHEESH}, in a decorated Khatu sanctum glowing with diyas, festive red and pink roses`, animate: 'a very slow push-in, the diya light gently pulses and rose petals drift, the face stays still', deity: true, motion: 'in', hold: 6, big: 'जय श्री श्याम', line: 'ग्यारस पर बाबा के दर्शन', tts: 'ग्यारस पर बाबा श्याम सबकी मनोकामना पूरी करें।', sub: 'Gyaras par Baba Shyam sabki manokamna poori karein.' },
      { prompt: 'Devotees with folded hands carrying saffron and blue nishan flags walking towards a glowing white temple in a small Rajasthan town at dawn, lamps along the path, peaceful', animate: 'the flags flutter gently in the breeze and the lamps flicker', motion: 'out', hold: 6, big: 'हारे का सहारा', line: 'बाबा श्याम हमारा', tts: 'हारे का सहारा, बाबा श्याम हमारा!', sub: 'Haare ka sahara, Baba Shyam hamara!' },
      { prompt: `Close-up darshan of ${SHEESH}, with a fresh gajra of white flowers and peacock feathers, a soft golden glow, lit diyas in front`, deity: true, motion: 'pan', hold: 6, big: 'खाटू नरेश की जय', line: 'शीश के दानी की जय', tts: 'शीश के दानी, खाटू नरेश की जय!', sub: 'Sheesh ke daani, Khatu Naresh ki jai!' },
    ] }),
};
