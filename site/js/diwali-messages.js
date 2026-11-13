// Plain ES module (no build step), served as is by GitHub Pages.
// Original greetings for the Diwali card maker (diwali/). Written for Shyam Premi SN; none is
// copied from a known poem or forward. Each festival's own lines come first, then the general festive ones.
export const FESTIVALS = [
    { id: 'season', en: 'Happy Diwali (all five days)', hi: 'हैप्पी दिवाली (पूरा दीपोत्सव)' },
    { id: 'dhanteras', en: 'Dhanteras', hi: 'धनतेरस' },
    { id: 'choti', en: 'Choti Diwali', hi: 'छोटी दिवाली' },
    { id: 'diwali', en: 'Diwali (Lakshmi Puja)', hi: 'दीपावली (लक्ष्मी पूजन)' },
    { id: 'govardhan', en: 'Govardhan Puja', hi: 'गोवर्धन पूजा' },
    { id: 'bhaidooj', en: 'Bhai Dooj', hi: 'भाई दूज' },
    { id: 'shyam', en: 'Jai Shree Shyam: Shubh Deepawali', hi: 'जय श्री श्याम: शुभ दीपावली' },
];
/** Big title and the small line under it, per festival and card language. */
export const TITLES = {
    season: {
        hi: ['शुभ दीपावली', 'दीपोत्सव की हार्दिक शुभकामनाएँ'],
        en: ['Happy Diwali', 'Wishing you a festival full of light'],
        hing: ['Happy Diwali', 'Deepotsav ki hardik shubhkamnayein'],
    },
    dhanteras: {
        hi: ['शुभ धनतेरस', 'स्वास्थ्य और समृद्धि का पर्व'],
        en: ['Happy Dhanteras', 'Wishing you health, wealth and happiness'],
        hing: ['Shubh Dhanteras', 'Sehat aur samriddhi ka parv'],
    },
    choti: {
        hi: ['शुभ छोटी दिवाली', 'नरक चतुर्दशी की शुभकामनाएँ'],
        en: ['Happy Choti Diwali', 'Wishing you light and joy'],
        hing: ['Happy Choti Diwali', 'Roshni aur khushiyon ki shubhkamnayein'],
    },
    diwali: {
        hi: ['शुभ दीपावली', 'लक्ष्मी पूजन की हार्दिक शुभकामनाएँ'],
        en: ['Happy Diwali', 'Blessings on Lakshmi Puja'],
        hing: ['Shubh Deepawali', 'Lakshmi Puja ki shubhkamnayein'],
    },
    govardhan: {
        hi: ['शुभ गोवर्धन पूजा', 'अन्नकूट महोत्सव की शुभकामनाएँ'],
        en: ['Happy Govardhan Puja', 'With the blessings of Shri Krishna'],
        hing: ['Shubh Govardhan Puja', 'Annakut ki shubhkamnayein'],
    },
    bhaidooj: {
        hi: ['शुभ भाई दूज', 'भाई-बहन के प्रेम का पर्व'],
        en: ['Happy Bhai Dooj', 'Celebrating a bond of love'],
        hing: ['Happy Bhai Dooj', 'Bhai-behen ke pyaar ka tyohaar'],
    },
    shyam: {
        hi: ['जय श्री श्याम', 'शुभ दीपावली'],
        en: ['Jai Shree Shyam', 'Happy Diwali'],
        hing: ['Jai Shree Shyam', 'Shubh Deepawali'],
    },
};
/** "Dear Riya," and the sign-off above the sender's name. */
export const LINES = {
    hi: { dear: (n) => `प्रिय ${n},`, signoff: 'शुभकामनाओं सहित,' },
    en: { dear: (n) => `Dear ${n},`, signoff: 'With warm wishes,' },
    hing: { dear: (n) => `Dear ${n},`, signoff: 'Dher saare pyaar ke saath,' },
};
const GENERAL = {
    en: [
        'May the glow of every diya fill your home with peace, your heart with joy and your days with good health.',
        'Wishing you a Diwali as bright as your smile and as sweet as the first laddoo of the season.',
        'May Goddess Lakshmi bless your home with prosperity, and may Lord Ganesha clear every obstacle from your path.',
        'As we light the lamps tonight, may every shadow of worry fade and new hope shine in your life.',
        'Here is to new beginnings, old friendships and a year filled with light. Warm wishes to you and your family.',
        'May this festival of lights bring warmth to your home, laughter to your table and calm to your heart.',
        'Sending you love wrapped in light, sweetness and blessings this festive season.',
        'May your home be full of diyas, your plate full of sweets and your life full of the people you love.',
        'Let the lamps remind us that even a small light can push back the dark. Wishing you a joyful festival.',
        'May the coming year bring you success in your work, strength in your body and peace in your mind.',
        'On this auspicious festival, may good fortune knock on your door and stay for good.',
        'Wishing you a festival full of rangoli colours, twinkling lamps and moments to remember.',
        'May the light within you shine as brightly as the lamps around you. Happy Diwali!',
        'Distance may keep us apart, but my wishes reach you with every diya I light.',
        'May your family stay healthy, your dreams find their way and your home stay full of light.',
        'Thank you for being a light in my life. Wishing you the happiest festival of lights.',
        'May every lamp you light bring a new reason to smile in the year ahead.',
        'Let this festival sweep away old worries and welcome fresh joy, just as we welcome Lakshmi ji home.',
        'Wishing you sparkling moments, sweet memories and blessings that last long after the diyas are put away.',
        'May your path be lit with wisdom, your heart with kindness and your home with happiness.',
        'A little light, a lot of love and the blessings of the Divine: that is my wish for you this Diwali.',
        'May the festival bring the whole family together around the lamps, the prayers and the sweets.',
    ],
    hi: [
        'दीयों की रोशनी आपके घर में सुख, शांति और समृद्धि लेकर आए।',
        'माँ लक्ष्मी आपका घर धन-धान्य से भर दें और गणेश जी हर बाधा दूर करें।',
        'हर दीया आपके जीवन से अँधेरा मिटाए और नई उम्मीद का उजाला फैलाए।',
        'मिठाइयों की मिठास, रंगोली के रंग और दीयों की चमक सदा आपके जीवन में बनी रहे।',
        'इस पर्व पर आपके घर हँसी गूँजे, मन में शांति रहे और परिवार में प्यार बढ़ता रहे।',
        'प्रकाश का यह पर्व आपके जीवन को खुशियों से रोशन कर दे। शुभ दीपावली!',
        'आपका हर सपना पूरा हो, हर दिन दीये-सा उजला हो और हर रात दीपावली-सी सुंदर हो।',
        'नए साल में आपको अच्छा स्वास्थ्य, काम में सफलता और अपनों का साथ मिले।',
        'दूर रहकर भी मेरी शुभकामनाएँ हर दीये के साथ आप तक पहुँच रही हैं।',
        'घर-आँगन में दीप जलें, मन में प्रेम के फूल खिलें। आपको और आपके परिवार को ढेरों बधाई।',
        'एक छोटा-सा दीया भी अँधेरे को हरा देता है। आपका जीवन सदा ऐसे ही रोशन रहे।',
        'माँ लक्ष्मी का आशीर्वाद, गणपति की कृपा और अपनों का प्यार, यही मेरी शुभकामना है।',
        'इस शुभ अवसर पर सौभाग्य आपके द्वार आए और सदा के लिए वहीं ठहर जाए।',
        'आपके जीवन में खुशियों की फुलझड़ियाँ हों और दुखों का नाम भी न रहे।',
        'जैसे दीया खुद जलकर रोशनी देता है, वैसे ही आपका जीवन सबके लिए प्रेरणा बने।',
        'मेरी ज़िंदगी में उजाला भरने के लिए धन्यवाद। आपको पर्व की ढेरों शुभकामनाएँ।',
        'पुरानी चिंताएँ पीछे छूटें और नई खुशियाँ आपका स्वागत करें। शुभ दीपावली!',
        'आपका घर सदा दीयों से जगमगाए, थाली मिठाइयों से भरी रहे और दिल अपनों से।',
        'ज्ञान का दीप, प्रेम की बाती और विश्वास का तेल, आपका जीवन सदा उजला रहे।',
        'यह पर्व आपके पूरे परिवार को एक साथ, दीयों के पास, खुशियों के साथ ले आए।',
        'आने वाला वर्ष आपके लिए सुख, समृद्धि और सफलता से भरा हो।',
        'रोशनी का यह त्योहार आपके हर दिन को मंगलमय बना दे।',
    ],
    hing: [
        'Diyon ki roshni aapke ghar mein sukh, shanti aur samriddhi laaye.',
        'Maa Lakshmi aapka ghar khushiyon se bhar dein aur Ganesh ji har mushkil door karein.',
        'Har diya aapki zindagi se andhera mitaye aur nayi umeed ka ujala phailaye.',
        'Mithai ki mithaas, rangoli ke rang aur diyon ki chamak hamesha aapke saath rahe.',
        'Is tyohaar par ghar mein hasi goonje, mann mein shanti rahe aur family mein pyaar badhta rahe.',
        'Roshni ka yeh tyohaar aapki life ko khushiyon se roshan kar de. Shubh Deepawali!',
        'Aapka har sapna poora ho, har din diye jaisa ujla ho aur har raat Diwali jaisi sundar.',
        'Naye saal mein aapko achhi sehat, kaam mein safalta aur apno ka saath mile.',
        'Door hokar bhi meri wishes har diye ke saath aap tak pahunch rahi hain.',
        'Ghar-aangan mein deep jalein, dil mein pyaar ke phool khilein. Aapko aur family ko dher saari badhai.',
        'Ek chhota sa diya bhi andhere ko hara deta hai. Aapki zindagi hamesha aise hi roshan rahe.',
        'Maa Lakshmi ka aashirwad, Ganpati ki kripa aur apno ka pyaar: yahi meri wish hai.',
        'Is shubh mauke par good luck aapke darwaze aaye aur hamesha wahin ruk jaaye.',
        'Aapki life mein khushiyon ki phuljhadiyan hon aur dukh ka naam bhi na rahe.',
        'Jaise diya khud jalkar roshni deta hai, waise hi aap sabke liye inspiration banein.',
        'Meri zindagi mein ujala bharne ke liye thank you. Aapko tyohaar ki dher saari shubhkamnayein.',
        'Purani tension peeche chhoote aur nayi khushiyan aapka swagat karein. Happy Diwali!',
        'Aapka ghar hamesha diyon se jagmagaye, thaali mithai se bhari rahe aur dil apno se.',
        'Gyaan ka deep, pyaar ki baati aur vishwas ka tel: aapki zindagi hamesha ujli rahe.',
        'Yeh tyohaar poori family ko ek saath, diyon ke paas, khushiyon ke saath le aaye.',
        'Aane wala saal aapke liye sukh, samriddhi aur success se bhara ho.',
        'Roshni ka yeh tyohaar aapke har din ko mangalmay bana de.',
    ],
};
const SPECIAL = {
    shyam: {
        en: [
            'May Khatu Shyam Baba light your home with lamps of joy this Diwali. Jai Shree Shyam!',
            'May Baba Shyam, the support of everyone who has lost hope, remove every darkness from your life.',
            'May the blessings of Baba Shyam stay with your family this Diwali and always.',
            'Light a lamp of Shyam’s name in your heart, and every worry will fade away.',
            'May Shyam Sarkar, with the peacock feather in his crown, fill your home with peace and plenty.',
            'By the grace of Khatu Naresh, may every wish of yours come true this festival of lights.',
            'May the glow of the diyas and the sweetness of Shyam bhajans make your Diwali blessed.',
            'May Baba Shyam always walk beside you and light up your path. Jai Shree Shyam!',
        ],
        hi: [
            'खाटू वाले श्याम बाबा आपके घर-आँगन को खुशियों के दीयों से रोशन करें। जय श्री श्याम!',
            'हारे के सहारे श्याम बाबा की कृपा से आपके जीवन का हर अँधेरा दूर हो।',
            'इस दीपावली बाबा श्याम का आशीर्वाद आपके परिवार पर सदा बना रहे।',
            'मन में श्याम नाम का दीपक जलाएँ, हर चिंता अपने आप दूर हो जाएगी।',
            'मोरमुकुट वाले श्याम सरकार आपके घर सुख, शांति और समृद्धि से भर दें।',
            'खाटू नरेश की कृपा से इस दीपोत्सव पर आपकी हर मनोकामना पूरी हो।',
            'दीयों की जगमग और श्याम भजनों की मिठास से आपकी दीपावली मंगलमय हो।',
            'बाबा श्याम सदा आपके साथ रहें और हर कदम पर राह रोशन करें। जय श्री श्याम!',
        ],
        hing: [
            'Khatu wale Shyam Baba aapke ghar-aangan ko khushiyon ke diyon se roshan karein. Jai Shree Shyam!',
            'Haare ke sahare Shyam Baba ki kripa se aapki zindagi ka har andhera door ho.',
            'Is Diwali Baba Shyam ka aashirwad aapki family par hamesha bana rahe.',
            'Mann mein Shyam naam ka deepak jalayein, har chinta apne aap door ho jaayegi.',
            'Mor-mukut wale Shyam Sarkar aapka ghar sukh, shanti aur samriddhi se bhar dein.',
            'Khatu Naresh ki kripa se is Deepotsav par aapki har manokamna poori ho.',
            'Diyon ki jagmag aur Shyam bhajanon ki mithaas se aapki Diwali mangalmay ho.',
            'Baba Shyam hamesha aapke saath rahein aur har kadam par raah roshan karein. Jai Shree Shyam!',
        ],
    },
    dhanteras: {
        en: [
            'May this Dhanteras bring health, wealth and lasting happiness to you and your family.',
            'Wishing you a blessed Dhanteras. May Lord Dhanvantari keep your family healthy and Goddess Lakshmi keep your home prosperous.',
            'May the lamp you light at your door this Dhanteras welcome good fortune for the whole year.',
        ],
        hi: [
            'धनतेरस के पावन पर्व पर आपको अच्छा स्वास्थ्य, धन और सुख मिले।',
            'भगवान धन्वंतरि आपके परिवार को निरोग रखें और माँ लक्ष्मी आपका घर समृद्धि से भर दें।',
            'इस धनतेरस द्वार पर जलाया दीया पूरे साल सौभाग्य लेकर आए।',
        ],
        hing: [
            'Dhanteras ke paavan parv par aapko achhi sehat, dhan aur sukh mile.',
            'Bhagwan Dhanvantari aapki family ko healthy rakhein aur Maa Lakshmi ghar ko samriddhi se bhar dein.',
            'Is Dhanteras darwaze par jalaya diya poore saal good luck laaye.',
        ],
    },
    choti: {
        en: [
            'May the first lamps of Choti Diwali drive away every darkness and fill your home with light.',
            'Wishing you a joyful Choti Diwali. May every corner of your home shine with happiness.',
            'As the lamps of Choti Diwali glow, may your worries grow smaller and your joys grow bigger.',
        ],
        hi: [
            'छोटी दिवाली के दीये हर अँधेरे को दूर करें और आपके घर को रोशनी से भर दें।',
            'छोटी दिवाली की शुभकामनाएँ! घर का हर कोना खुशियों से जगमगाए।',
            'छोटी दिवाली के दीयों के साथ आपकी चिंताएँ छोटी और खुशियाँ बड़ी हो जाएँ।',
        ],
        hing: [
            'Choti Diwali ke diye har andhera door karein aur aapka ghar roshni se bhar dein.',
            'Happy Choti Diwali! Ghar ka har kona khushiyon se jagmagaye.',
            'Choti Diwali ke diyon ke saath aapki tension chhoti aur khushiyan badi ho jaayein.',
        ],
    },
    diwali: {
        en: [
            'On this Lakshmi Puja, may the Goddess bless your home with wealth, wisdom and peace.',
            'Wishing you a blessed Deepawali. May Lakshmi ji and Ganesh ji fill your life with prosperity and joy.',
            'As the family gathers for Lakshmi Puja tonight, may every prayer be answered with light.',
        ],
        hi: [
            'लक्ष्मी पूजन के इस शुभ दिन माँ लक्ष्मी आपके घर धन, बुद्धि और शांति का वास करें।',
            'आज की पूजा में माँगी हर मनोकामना पूरी हो। शुभ दीपावली!',
            'लक्ष्मी जी और गणेश जी की कृपा से आपका जीवन सुख-समृद्धि से भरा रहे।',
        ],
        hing: [
            'Lakshmi Puja ke is shubh din Maa Lakshmi aapke ghar dhan, buddhi aur shanti laayein.',
            'Aaj ki puja mein maangi har wish poori ho. Shubh Deepawali!',
            'Lakshmi ji aur Ganesh ji ki kripa se aapki life sukh-samriddhi se bhari rahe.',
        ],
    },
    govardhan: {
        en: [
            'May Shri Krishna, who lifted Govardhan to shelter his people, always keep you and your family safe.',
            'Wishing you a blessed Govardhan Puja. May your home always be as full as the Annakut offering.',
            'On Govardhan Puja, may your faith stay strong and your life be filled with plenty.',
        ],
        hi: [
            'जिन श्रीकृष्ण ने गोवर्धन उठाकर सबकी रक्षा की, वे आपके परिवार की भी सदा रक्षा करें।',
            'गोवर्धन पूजा की शुभकामनाएँ! आपका घर अन्नकूट की तरह सदा भरा-पूरा रहे।',
            'गोवर्धन पूजा पर आपकी आस्था दृढ़ रहे और जीवन में किसी चीज़ की कमी न हो।',
        ],
        hing: [
            'Jin Shri Krishna ne Govardhan uthakar sabki raksha ki, woh aapki family ki bhi hamesha raksha karein.',
            'Govardhan Puja ki shubhkamnayein! Aapka ghar Annakut ki tarah hamesha bhara-poora rahe.',
            'Govardhan Puja par aapki aastha mazboot rahe aur life mein kisi cheez ki kami na ho.',
        ],
    },
    bhaidooj: {
        en: [
            'May our bond always stay as bright as the diya on the puja thali. Happy Bhai Dooj!',
            'Wishing you a long, healthy and happy life this Bhai Dooj. Thank you for always being there.',
            'May the tilak of Bhai Dooj bring you protection, success and endless smiles.',
        ],
        hi: [
            'भाई-बहन का यह रिश्ता पूजा की थाली के दीये-सा सदा उजला रहे।',
            'भाई दूज पर आपको लंबी उम्र, अच्छा स्वास्थ्य और ढेर सारी खुशियाँ मिलें।',
            'भाई दूज का यह तिलक आपको हर मुश्किल से बचाए और हर कदम पर सफलता दिलाए।',
        ],
        hing: [
            'Bhai-behen ka yeh rishta puja ki thaali ke diye jaisa hamesha ujla rahe.',
            'Bhai Dooj par aapko lambi umar, achhi sehat aur dher saari khushiyan milein.',
            'Bhai Dooj ka yeh tilak aapko har mushkil se bachaye aur har kadam par success dilaye.',
        ],
    },
};
// A closing "Happy Diwali!" reads oddly on a Bhai Dooj or Dhanteras card, so it is dropped there.
const DIWALI_SIGNOFF = /\s*(Happy Diwali|Shubh Deepawali|शुभ दीपावली)!$/;
/** All greetings for a festival and language: its own lines first, then the general ones. */
export function messagesFor(festival, lang) {
    const general = GENERAL[lang];
    if (festival === 'season')
        return general;
    const own = SPECIAL[festival][lang];
    const rest = festival === 'diwali' || festival === 'shyam' ? general : general.map((m) => m.replace(DIWALI_SIGNOFF, ''));
    return [...own, ...rest];
}
