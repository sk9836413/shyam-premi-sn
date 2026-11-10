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
};

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
  // ---- big festivals (6 scenes; each variant shows 3 of them) ----
  devdeepawali: T({
    playlist: 'Shiv ji ki Kathayein', deity: 'Shiv ji / Ganga Maiya', mantra: 'shiv', big: true,
    desc: 'Kartik Purnima ko Kashi mein Dev Deepawali manayi jati hai: Ganga ghaton par lakhon deep jalaye jate hain; parampara ke anusar isi din Bhagwan Shiv ne Tripurasur ka ant kiya aur devtaon ne deep jalaye',
    hashtags: ['#DevDeepawali', '#KartikPurnima', '#Kashi', '#Varanasi', '#HarHarMahadev', '#GangaAarti'],
    tags: ['Dev Deepawali status', 'Dev Deepawali 2026', 'Kartik Purnima status', 'देव दीपावली', 'देव दीपावली स्टेटस', 'कार्तिक पूर्णिमा', 'Kashi Dev Deepawali', 'Varanasi ghat diye', 'Ganga aarti status', 'Har Har Mahadev'],
    scenes: [
      { prompt: 'The ghats of Varanasi on Dev Deepawali night glowing with countless clay diyas along every stone step, the river Ganga reflecting the lights, temple spires, a full moon above', animate: 'the diya flames flicker and their reflections shimmer on the rippling river', motion: 'in', hold: 6, big: 'देव दीपावली', line: 'काशी में देवों की दिवाली', tts: 'काशी के घाटों पर आज देवों की दिवाली है।', sub: 'Kashi ke ghaton par aaj devon ki Diwali hai.' },
      { prompt: `${SHIV}, seated on a white rock above the Ganga at Kashi at night, lakhs of diyas glowing on the ghats below, a full moon behind his head`, animate: 'a very slow push-in, the river lights shimmer and the moon glows softly, the face stays still', deity: true, motion: 'out', hold: 6, big: 'हर हर महादेव', line: 'बाबा विश्वनाथ की जय', tts: 'बाबा विश्वनाथ की कृपा से हर घर रोशन रहे।', sub: 'Baba Vishwanath ki kripa se har ghar roshan rahe.' },
      { prompt: 'Leaf boats carrying lit diyas and marigold flowers floating on the river Ganga at night, thousands of small lights drifting, a ghat with lamps in soft focus', motion: 'pan', hold: 6, big: 'दीपदान', line: 'माँ गंगा को दीप अर्पण', tts: 'माँ गंगा को दीपदान, मन को शांति देता है।', sub: 'Maa Ganga ko deepdaan, man ko shanti deta hai.' },
      { prompt: 'Priests in saffron performing the grand Ganga aarti with tall multi-tiered brass lamps on a Varanasi ghat at night, conch shells, bells and marigold decorations, golden glow', animate: 'the large aarti lamps move slowly in circles and the flames glow, smoke drifts', motion: 'in', hold: 6, big: 'गंगा आरती', line: 'जय गंगा मैया', tts: 'जय गंगा मैया! हर हर गंगे।', sub: 'Jai Ganga Maiya! Har Har Gange.' },
      { prompt: 'A bright full moon over the river Ganga at Kashi on Kartik Purnima, temple spires and ghats outlined with glowing diyas, a peaceful night', motion: 'out', hold: 6, big: 'कार्तिक पूर्णिमा', line: 'स्नान, दान और दीप', tts: 'कार्तिक पूर्णिमा पर स्नान, दान और दीप का महत्व है।', sub: 'Kartik Purnima par snan, daan aur deep ka mahatva hai.' },
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
      { prompt: 'Devotees taking a holy dip at the sangam at sunrise on a misty winter morning, offering water to the rising sun with folded hands, seen from behind, saffron flags on the bank', animate: 'the river ripples, mist drifts slowly and the sunlight sparkles on the water', motion: 'in', hold: 6, big: 'संक्रांति स्नान', line: 'गंगा स्नान और दान', tts: 'संक्रांति पर स्नान और दान का बड़ा महत्व है।', sub: 'Sankranti par snan aur daan ka bada mahatva hai.' },
      { prompt: 'Golden sunrise over green mustard and wheat fields with a small village temple, a farmer family offering water to the sun, birds flying, the start of Uttarayan', motion: 'out', hold: 6, big: 'उत्तरायण', line: 'नई फसल, नई उम्मीद', tts: 'आज से उत्तरायण शुरू, नई फसल और नई उम्मीद।', sub: 'Aaj se Uttarayan shuru, nayi fasal aur nayi ummeed.' },
      { prompt: 'Close-up darshan of Surya dev with a radiant golden face and crown, a glowing sun disc behind his head, lotus flowers in his hands, warm sunrise colours', animate: 'a very slow push-in, the golden rays shimmer softly, the face stays still', deity: true, motion: 'pan', hold: 6, big: 'ॐ सूर्याय नमः', mantra: 'ॐ सूर्याय नमः', tts: 'ॐ सूर्याय नमः।', sub: 'Om Suryaya Namah.' },
    ],
  }),
};

/** Variant picks for big themes without festivals.json `picks` (3 variants: evening before, 00:30, 08:30). */
export const DEFAULT_PICKS = { 3: [[0, 1, 2], [1, 2, 0], [2, 0, 1]], 6: [[0, 1, 2], [3, 4, 5], [1, 5, 0]] };

/** Weekday "day status" Shorts (morning slot of normal days; Ekadashi days: Gyaras Khatu Shyam). names rotate weekly. */
export const DAY_THEMES = {
  1: T({ key: 'somvar-mahadev', playlist: 'Shiv ji ki Kathayein', deity: 'Shiv ji (Somvar)', mantra: 'shiv',
    names: [{ en: 'Somvar Mahadev', hi: 'सोमवार महादेव' }, { en: 'Somvar Shiv ji', hi: 'सोमवार शिव जी' }, { en: 'Monday Mahadev', hi: 'मंडे महादेव' }, { en: 'Somvar Bholenath', hi: 'सोमवार भोलेनाथ' }],
    hooks: ['सोमवार: हर हर महादेव 🙏', 'जय भोलेनाथ! शुभ सोमवार 🙏'],
    desc: 'Somvar Bhagwan Shiv ka din hai', hashtags: ['#SomvarStatus', '#Mahadev', '#HarHarMahadev', '#OmNamahShivaya', '#Bholenath'],
    tags: ['Somvar status', 'Mahadev status', 'Monday Mahadev status', 'सोमवार स्टेटस', 'महादेव स्टेटस', 'शुभ सोमवार', 'Har Har Mahadev', 'Bholenath status', 'Om Namah Shivaya'],
    scenes: THEMES.shivratri.scenes.map((s, i) => (i === 0 ? { ...s, big: 'शुभ सोमवार', line: 'भोलेनाथ की कृपा बनी रहे', tts: 'भोलेनाथ की कृपा से आपका पूरा हफ्ता शुभ हो।', sub: 'Bholenath ki kripa se aapka poora hafta shubh ho.' } : s)) }),
  2: T({ key: 'mangalvar-salasar-balaji', playlist: 'Hanuman ji ki Kathayein', deity: 'Hanuman ji / Salasar Balaji (Mangalvar)', mantra: 'ram', voice: 'hm_omega',
    names: [{ en: 'Mangalvar Hanuman ji', hi: 'मंगलवार हनुमान जी' }, { en: 'Salasar Balaji', hi: 'सालासर बालाजी', lead: 0 }, { en: 'Mangalvar Bajrangbali', hi: 'मंगलवार बजरंगबली' }, { en: 'Tuesday Hanuman ji', hi: 'मंगलवार हनुमान' }],
    hooks: ['मंगलवार: जय बजरंगबली 🙏', 'जय सालासर बालाजी 🙏'],
    desc: 'Mangalvar Hanuman ji ka din hai; Salasar (Churu, Rajasthan) mein Balaji daadhi-moochh wale roop mein pooje jate hain', hashtags: ['#MangalvarStatus', '#HanumanJi', '#SalasarBalaji', '#JaiBajrangbali', '#JaiShreeRam'],
    tags: ['Mangalvar status', 'Hanuman ji status', 'Salasar Balaji status', 'मंगलवार स्टेटस', 'हनुमान जी स्टेटस', 'सालासर बालाजी', 'Jai Bajrangbali', 'Tuesday Hanuman status', 'बजरंगबली'],
    scenes: [
      { prompt: 'Divine darshan of Shri Salasar Balaji, Hanuman ji with a beard and moustache on an orange sindoor face, a silver crown and flower garlands, as worshipped at Salasar Dham, a decorated sanctum with oil lamps', animate: 'a very slow push-in, oil lamps flicker and marigold petals drift, the face stays still', deity: true, motion: 'in', hold: 6, big: 'जय सालासर बालाजी', line: 'दाढ़ी-मूँछ वाले बालाजी', tts: 'सालासर बालाजी, आपके हर संकट को दूर करें।', sub: 'Salasar Balaji, aapke har sankat ko door karein.' },
      { prompt: 'Hanuman ji flying over the ocean carrying the Sanjeevani mountain in one hand, a mace in the other, powerful and calm, golden sunset clouds', animate: 'the clouds drift past and the sunlight glows, Hanuman ji stays steady', deity: true, motion: 'out', hold: 6, big: 'संकट मोचन', line: 'जय बजरंगबली', tts: 'संकट मोचन हनुमान जी, सदा आपके साथ हैं।', sub: 'Sankat Mochan Hanuman ji, sada aapke saath hain.' },
      { prompt: 'Hanuman ji kneeling with folded hands before Shri Ram and Maa Sita in a golden palace hall, devotional light, flowers', motion: 'pan', hold: 6, big: 'जय श्री राम', mantra: 'श्री राम जय राम जय जय राम', tts: 'श्री राम जय राम जय जय राम।', sub: 'Shri Ram Jai Ram Jai Jai Ram.' },
    ] }),
  3: T({ key: 'budhvar-ganesh', playlist: 'Ganesh ji ki Kathayein', deity: 'Ganesh ji (Budhvar)', mantra: 'ganesh',
    names: [{ en: 'Budhvar Ganesh ji', hi: 'बुधवार गणेश जी' }, { en: 'Ganpati Bappa', hi: 'गणपति बप्पा' }, { en: 'Budhvar Ganpati', hi: 'बुधवार गणपति' }],
    hooks: ['बुधवार: गणपति बप्पा मोरया 🙏', 'जय गणेश देवा! शुभ बुधवार 🙏'],
    desc: 'Budhvar Ganesh ji ka din hai', hashtags: ['#BudhvarStatus', '#GaneshJi', '#GanpatiBappaMorya', '#Vighnaharta'],
    tags: ['Budhvar status', 'Ganesh ji status', 'Ganpati Bappa status', 'बुधवार स्टेटस', 'गणेश जी स्टेटस', 'गणपति बप्पा मोरया', 'Wednesday Ganesh status', 'Vighnaharta'],
    scenes: THEMES.sankashti.scenes.map((s, i) => (i === 1 ? { prompt: 'A grand Ganesh temple sanctum decorated with marigold and rose garlands, brass bells and rows of lit diyas, devotees with folded hands in soft focus, golden morning light', animate: 'the bells sway gently and the diya flames flicker', motion: 'out', hold: 6, big: 'शुभ बुधवार', line: 'हर काम में शुभ आरंभ', tts: 'गणेश जी के आशीर्वाद से हर काम का शुभ आरंभ हो।', sub: 'Ganesh ji ke ashirwad se har kaam ka shubh aarambh ho.' } : s)) }),
  4: T({ key: 'guruvar-vishnu', playlist: 'Vishnu ji aur Krishna ki Kathayein', deity: 'Vishnu ji / Sai Baba (Guruvar)', mantra: 'vishnu',
    names: [{ en: 'Guruvar Vishnu ji', hi: 'गुरुवार विष्णु जी', lead: 0 }, { en: 'Guruvar Sai Baba', hi: 'गुरुवार साईं बाबा', lead: 1 }, { en: 'Thursday Vishnu ji', hi: 'गुरुवार श्री हरि', lead: 2 }],
    hooks: ['गुरुवार: जय श्री हरि 🙏', 'ॐ साईं राम! शुभ गुरुवार 🙏'],
    desc: 'Guruvar Bhagwan Vishnu (aur bahut se bhakton ke liye Sai Baba) ka din hai', hashtags: ['#GuruvarStatus', '#JaiShreeHari', '#VishnuJi', '#SaiBaba', '#OmSaiRam'],
    tags: ['Guruvar status', 'Vishnu ji status', 'Sai Baba status', 'गुरुवार स्टेटस', 'विष्णु जी स्टेटस', 'साईं बाबा स्टेटस', 'Thursday status', 'Om Sai Ram', 'Jai Shree Hari'],
    scenes: [THEMES.ekadashi.scenes[0], { prompt: 'Shirdi Sai Baba seated calmly on a stone with one leg folded, white kafni robe and white head cloth, a gentle blessing hand, an old Dwarkamai mosque wall behind, warm lamp light', animate: 'a very slow push-in, the lamp light glows softly, the face stays still', deity: true, motion: 'out', hold: 6, big: 'ॐ साईं राम', line: 'श्रद्धा और सबूरी', tts: 'श्रद्धा और सबूरी, जीवन को आसान बना देती है।', sub: 'Shraddha aur saburi, jeevan ko aasaan bana deti hai.' }, THEMES.ekadashi.scenes[2]] }),
  5: T({ key: 'shukravar-lakshmi', playlist: 'Maa Durga aur Devi ki Kathayein', deity: 'Maa Lakshmi / Santoshi Mata (Shukravar)', mantra: 'lakshmi',
    names: [{ en: 'Shukravar Lakshmi Mata', hi: 'शुक्रवार लक्ष्मी माता', lead: 0 }, { en: 'Santoshi Mata', hi: 'संतोषी माता', lead: 1 }, { en: 'Shukravar Maa Lakshmi', hi: 'शुक्रवार माँ लक्ष्मी' }],
    hooks: ['शुक्रवार: जय माँ लक्ष्मी 🙏', 'जय संतोषी माता! शुभ शुक्रवार 🙏'],
    desc: 'Shukravar Maa Lakshmi aur Santoshi Mata ka din hai', hashtags: ['#ShukravarStatus', '#MaaLakshmi', '#SantoshiMata', '#JaiMataDi'],
    tags: ['Shukravar status', 'Lakshmi Mata status', 'Santoshi Mata status', 'शुक्रवार स्टेटस', 'लक्ष्मी माता स्टेटस', 'संतोषी माता', 'Friday status', 'Jai Maa Lakshmi'],
    scenes: [
      { prompt: 'Divine darshan of Maa Lakshmi seated on a pink lotus, four arms, two holding lotuses and one showering gold coins, a red silk saree and golden crown, white elephants in the background, warm golden light', animate: 'a very slow push-in, gold coins shimmer and lotus petals drift, the face stays still', deity: true, motion: 'in', hold: 6, big: 'जय माँ लक्ष्मी', line: 'शुभ शुक्रवार', tts: 'माँ लक्ष्मी आपके घर में सुख और समृद्धि भर दें।', sub: 'Maa Lakshmi aapke ghar mein sukh aur samriddhi bhar dein.' },
      { prompt: 'Divine darshan of Santoshi Mata, a gentle Hindu goddess in a red saree with a golden crown, holding a trident, a sword and a bowl of rice, a calm smile, a decorated temple sanctum with lamps', animate: 'the lamp flames flicker softly and flower petals drift, the face stays still', deity: true, motion: 'out', hold: 6, big: 'जय संतोषी माता', line: 'मन में संतोष, घर में सुख', tts: 'मन में संतोष हो, तो घर में सुख आता है।', sub: 'Man mein santosh ho, to ghar mein sukh aata hai.' },
      { prompt: 'A home altar on Friday evening with a silver kalash, lotus flowers, a lit diya, kumkum and a plate of gud-chana, a soft rangoli in front, warm light', motion: 'pan', hold: 6, big: 'ॐ श्रीं महालक्ष्म्यै नमः', mantra: 'ॐ श्रीं महालक्ष्म्यै नमः', tts: 'ॐ श्रीं महालक्ष्म्यै नमः।', sub: 'Om Shreem Mahalakshmyai Namah.' },
    ] }),
  6: T({ key: 'shanivar-shani-dev', playlist: 'Shani Dev ki Kathayein', deity: 'Shani dev (Shanivar)', mantra: 'shani', voice: 'hm_omega',
    names: [{ en: 'Shanivar Shani Dev', hi: 'शनिवार शनि देव' }, { en: 'Shani Dev', hi: 'शनि देव' }, { en: 'Saturday Shani Dev', hi: 'शनिवार शनि महाराज' }],
    hooks: ['शनिवार: जय शनि देव 🙏', 'जय शनि महाराज! शुभ शनिवार 🙏'],
    desc: 'Shanivar Shani dev ka din hai; peepal ke neeche sarson ke tel ka deepak jalane ki parampara hai', hashtags: ['#ShanivarStatus', '#ShaniDev', '#JaiShaniDev', '#ShaniMaharaj'],
    tags: ['Shanivar status', 'Shani Dev status', 'Saturday Shani status', 'शनिवार स्टेटस', 'शनि देव स्टेटस', 'जय शनि देव', 'Shani Maharaj', 'शनि महाराज'],
    scenes: [
      { prompt: 'Divine darshan of Shani dev, a calm Hindu deity with a dark blue-black complexion, a golden crown, dark blue robes, holding a bow and arrow, seated on a crow vahan, a calm just gaze, a dark temple sanctum with oil lamps', animate: 'a very slow push-in, the oil lamps flicker and smoke drifts, the face stays still', deity: true, motion: 'in', hold: 6, big: 'जय शनि देव', line: 'शुभ शनिवार', tts: 'शनि देव न्याय के देवता हैं। अच्छे कर्म, अच्छा फल।', sub: 'Shani dev nyaay ke devta hain. Achchhe karm, achchha phal.' },
      { prompt: 'A clay diya with mustard oil glowing under a huge old peepal tree on a Saturday evening, black sesame seeds and blue flowers offered, a small Shani shrine nearby, twilight', animate: 'the diya flame flickers and the peepal leaves sway gently', motion: 'out', hold: 6, big: 'पीपल का दीपक', line: 'शनिवार की शाम', tts: 'शनिवार की शाम, पीपल के नीचे एक दीपक जलाइए।', sub: 'Shanivar ki shaam, peepal ke neeche ek deepak jalaiye.' },
      { prompt: 'Hanuman ji in a calm blessing pose beside Shani dev in a temple painting style, oil lamps and blue flowers, devotional light', deity: true, motion: 'pan', hold: 6, big: 'ॐ शं शनैश्चराय नमः', mantra: 'ॐ शं शनैश्चराय नमः', tts: 'ॐ शं शनैश्चराय नमः।', sub: 'Om Sham Shanaishcharaya Namah.' },
    ] }),
  0: T({ key: 'ravivar-surya-dev', playlist: 'Surya Dev ki Kathayein', deity: 'Surya dev (Ravivar)', mantra: 'surya', voice: 'hm_omega',
    names: [{ en: 'Ravivar Surya Dev', hi: 'रविवार सूर्य देव' }, { en: 'Surya Dev', hi: 'सूर्य देव' }, { en: 'Sunday Surya Dev', hi: 'रविवार सूर्य नारायण' }],
    hooks: ['रविवार: जय सूर्य देव 🙏', 'जय सूर्य नारायण! शुभ रविवार 🙏'],
    desc: 'Ravivar Surya dev ka din hai; subah Surya dev ko jal (arghya) dene ki parampara hai', hashtags: ['#RavivarStatus', '#SuryaDev', '#JaiSuryaDev', '#GoodMorning'],
    tags: ['Ravivar status', 'Surya Dev status', 'Sunday status', 'रविवार स्टेटस', 'सूर्य देव स्टेटस', 'शुभ रविवार', 'Surya arghya', 'Jai Surya Dev'],
    scenes: [THEMES.sankranti.scenes[5], { prompt: 'A devotee offering water from a copper lota to the rising sun on a riverbank at dawn, seen from behind, the water stream sparkling in golden light, birds flying', animate: 'the water stream sparkles and flows slowly, the sun glows and birds glide', motion: 'out', hold: 6, big: 'सूर्य को अर्घ्य', line: 'शुभ रविवार', tts: 'सुबह सूर्य को जल चढ़ाइए, दिन भर ऊर्जा बनी रहेगी।', sub: 'Subah Surya ko jal chadhaiye, din bhar urja bani rahegi.' }, THEMES.sankranti.scenes[0]] }),
  gyaras: T({ key: 'gyaras-khatu-shyam', playlist: 'Khatu Shyam ji ki Kathayein', deity: 'Khatu Shyam ji (Gyaras)', mantra: null,
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
