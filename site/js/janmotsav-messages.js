// Plain ES module (no build step), served as is by GitHub Pages.
// Original wishes for the Khatu Shyam Janmotsav card maker (janmotsav/). Written for
// Shyam Premi SN; none is a bhajan line, a lyric or a copied forward. Names of Baba used here (Shyam, Khatu wale, Sheesh ke
// Daani, Lakhdatar, Teen Baan Dhari, Khatu Naresh) are traditional titles, not quotations.
export const OCCASIONS = [
    { id: 'janmotsav', en: 'Shyam Janmotsav', hi: 'श्याम जन्मोत्सव' },
    { id: 'birthday', en: 'Happy Birthday Shyam Baba', hi: 'हैप्पी बर्थडे श्याम बाबा' },
    { id: 'ekadashi', en: 'Dev Uthani Ekadashi + Janmotsav', hi: 'देवउठनी एकादशी + जन्मोत्सव' },
    { id: 'jaishyam', en: 'Jai Shree Shyam (any day)', hi: 'जय श्री श्याम (किसी भी दिन)' },
];
/** Big title and the small line under it, per occasion and card language. */
export const OCCASION_TITLES = {
    janmotsav: {
        hi: ['श्याम जन्मोत्सव', 'बाबा श्याम के जन्मोत्सव की हार्दिक बधाई'],
        en: ['Happy Shyam Janmotsav', 'Blessings on Khatu Shyam ji’s Janmotsav'],
        hing: ['Shyam Janmotsav', 'Baba Shyam ke janmotsav ki hardik badhai'],
    },
    birthday: {
        hi: ['जन्मदिन मुबारक, श्याम बाबा', 'खाटू वाले के जन्मोत्सव की बधाई'],
        en: ['Happy Birthday, Shyam Baba', 'Jai Shree Shyam'],
        hing: ['Happy Birthday Shyam Baba', 'Khatu wale ke janmotsav ki badhai'],
    },
    ekadashi: {
        hi: ['शुभ देवउठनी एकादशी', 'और श्याम जन्मोत्सव की शुभकामनाएँ'],
        en: ['Happy Dev Uthani Ekadashi', 'and Khatu Shyam Janmotsav'],
        hing: ['Shubh Dev Uthani Ekadashi', 'Aur Shyam Janmotsav ki shubhkamnayein'],
    },
    jaishyam: {
        hi: ['जय श्री श्याम', 'बाबा श्याम की कृपा सदा बनी रहे'],
        en: ['Jai Shree Shyam', 'May Baba Shyam always be with you'],
        hing: ['Jai Shree Shyam', 'Baba Shyam ki kripa sada bani rahe'],
    },
};
/** "प्रिय राधा जी," and the sign-off above the sender's name. */
export const JANMOTSAV_LINES = {
    hi: { dear: (n) => `प्रिय ${n},`, signoff: 'जय श्री श्याम, आपके अपने' },
    en: { dear: (n) => `Dear ${n},`, signoff: 'Jai Shree Shyam, with love' },
    hing: { dear: (n) => `Priya ${n},`, signoff: 'Jai Shree Shyam, aapke apne' },
};
const SPECIFIC = {
    janmotsav: { hi: [], en: [], hing: [] },
    birthday: {
        hi: ['जन्मदिन मुबारक हो बाबा श्याम! आपके चरणों में हमारा पूरा परिवार यूँ ही प्रेम से जुड़ा रहे।'],
        en: ['Happy Birthday, Shyam Baba! May your grace keep our family together and smiling.'],
        hing: ['Janmdin mubarak ho Baba Shyam! Aapke charnon mein hamara poora parivar yun hi pyaar se juda rahe.'],
    },
    ekadashi: {
        hi: ['देवउठनी एकादशी पर देव जागें और आपका भाग्य भी जागे। श्री हरि और बाबा श्याम की कृपा आप पर बनी रहे।'],
        en: ['As the gods awaken on Dev Uthani Ekadashi, may good fortune awaken in your life too. Jai Shree Shyam!'],
        hing: ['Dev Uthani Ekadashi par dev jaagein aur aapka bhagya bhi jaage. Shri Hari aur Baba Shyam ki kripa bani rahe.'],
    },
    jaishyam: { hi: [], en: [], hing: [] },
};
const GENERAL = {
    hi: [
        'शीश के दानी बाबा श्याम के जन्मोत्सव पर आपके घर में सुख, शांति और प्रेम सदा बना रहे। जय श्री श्याम!',
        'जिसने हार में भी हाथ थामा, वही हमारा श्याम है। बाबा का आशीर्वाद आपके हर कदम पर बना रहे।',
        'खाटू वाले की कृपा से आपका हर दिन मंगलमय हो और हर नेक मनोकामना पूरी हो। श्याम जन्मोत्सव की हार्दिक बधाई।',
        'दीयों की रोशनी, फूलों की खुशबू और होंठों पर श्याम का नाम, जन्मोत्सव पर आपका परिवार यूँ ही मुस्कुराता रहे।',
        'लखदातार बाबा श्याम आपके घर-आँगन को खुशियों से भर दें। जन्मोत्सव की ढेरों शुभकामनाएँ।',
        'जब मन थक जाए, बस एक बार प्रेम से "जय श्री श्याम" कहिए। बाबा के जन्मोत्सव पर आपको और आपके अपनों को प्रणाम।',
        'तीन बाण के धारी, खाटू नरेश, आपके जीवन से हर अंधेरा दूर करें और हर राह रोशन करें। शुभ जन्मोत्सव!',
        'श्याम नाम की ज्योत जले, हर आँगन में उजियारा हो। जन्मोत्सव के शुभ दिन पर, खुशियों का संसार तुम्हारा हो।',
    ],
    en: [
        'On Baba Shyam’s Janmotsav, may your home be full of peace, love and light. Jai Shree Shyam!',
        'May the one who stands by those who have lost hope walk with you at every step. Happy Shyam Janmotsav.',
        'Wishing you and your family the blessings of Khatu Shyam ji, today and always.',
        'Diyas, flowers and the name of Shyam: may this Janmotsav fill your home with hope and joy.',
        'May Baba Shyam remove every worry from your path and fill your days with faith and kindness.',
    ],
    hing: [
        'Sheesh ke Daani Baba Shyam ke janmotsav par aapke ghar mein sukh, shanti aur pyaar sada bana rahe. Jai Shree Shyam!',
        'Jisne haar mein bhi haath thaama, wahi hamara Shyam hai. Baba ka aashirwad aapke har kadam par bana rahe.',
        'Khatu wale ki kripa se aapka har din mangalmay ho aur har nek manokamna poori ho. Shyam Janmotsav ki hardik badhai.',
        'Diyon ki roshni, phoolon ki khushboo aur honthon par Shyam ka naam: janmotsav par aapka parivar yun hi muskurata rahe.',
        'Lakhdatar Baba Shyam aapke ghar-aangan ko khushiyon se bhar dein. Janmotsav ki dher saari shubhkamnayein.',
    ],
};
/** The occasion's own wishes first, then the general Janmotsav ones. */
export function janmotsavMessages(occasion, lang) {
    const own = SPECIFIC[occasion]?.[lang] ?? [];
    return [...own, ...GENERAL[lang]];
}
