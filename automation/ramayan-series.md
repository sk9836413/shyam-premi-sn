# Ramayan Ke Rochak Tathya (owner's request, 24 Nov 2026)

Owner, 24 Nov 2026: "abhi Ramayan se related facts video bahut viral ho rhe h". A numbered Shorts series
("Ramayan Tathya 7/60: ..."), one item per Short, in the order below. STORY.md section 11 says when it runs and how a
Short is built; `scripts/ramayan-rules.mjs` (through `node scripts/validate.mjs`) enforces it.

## How an item is used
- The `facts` job makes the next item (the first number above the highest one in `automation/log.md` /
  `story/facts`; `node scripts/ramayan-series.mjs next`). The series never skips back: a day the cap leaves out just
  moves the next number to the next Ramayan day.
- The Short **speaks the item's `hook_hi` and `fact_hi` word for word** (the `sub` lines are `hook` and `fact` word
  for word), shows the `source` line on screen, then a one-line lesson (`lesson` is the guide) and the CTA. Nothing may
  be added to the fact beat; the validator compares it with this file.
- `verify` is the verse / doha page on heritage.iitk.ac.in (IIT Kanpur). The job checks it again before writing and
  puts it, plus one more source, in the spec's `facts`.
- Title: `Ramayan Tathya <n>/<total>: <title or a sharper Roman line> | रामायण तथ्य <n>: <देवनागरी> #Shorts`.
  Playlist: "Ramayan Ke Rochak Tathya".

## Accuracy (strict)
- **Only what the two primary texts say.** Valmiki Ramayan: kand + sarga. Sarga numbers follow the text on
  heritage.iitk.ac.in/VRAM (the same southern recension as valmikiramayan.net; Gita Press numbering can differ by a
  sarga or two, mostly in Yuddha Kand). Shri Ramcharitmanas (Goswami Tulsidas): kand + doha, Gita Press numbering, as
  on heritage.iitk.ac.in/RCM. Every item below was checked against those pages on 24 Nov 2026.
- Popular beliefs, folk tradition and later or regional retellings are **not** items. Where an item mentions one, it is
  labelled "lok-manyata" in the item itself (item 24 only). Left out on purpose (folklore or not in these texts):
  the squirrel (gilahri) helping build the setu, stones floating because "Ram" was written on them, Urmila sleeping
  fourteen years / Lakshman ji never sleeping, Ravan teaching Lakshman ji on his deathbed, Hanuman ji breaking Mata
  Sita's pearls looking for Shri Ram / tearing open his chest, Shanta as Shri Ram's sister, the "Indrasan / Nidrasan"
  slip of Kumbhakarn, Ahiravan / Makardhwaj / Panchmukhi Hanuman, the Lakshman Rekha as a scene in Valmiki (only the
  Ramcharitmanas line of item 8), Ravan writing the Shiv Tandav Stotram, and every "Ram Setu is X years old / NASA /
  satellite" claim.
- No numbers (ages, distances, durations, years) unless the cited text states them; then the item says "Valmiki
  Ramayan ke anusaar" or names the text. No "scientific proof", no politics, nothing that disparages any community,
  deity or tradition. Shri Ram, Mata Sita, Lakshman ji, Hanuman ji, Bharat ji are named with respect; Ravan factually.

## Items

### 1. Pehla shlok, ek dukh se
- id: ramayan-01-krauncha-shlok
- deity: Maharishi Valmiki (Ramayan)
- hook: Kya aap jaante hain? Ramayan ka pehla shlok ek pakshi ke dukh se nikla!
- hook_hi: क्या आप जानते हैं? रामायण का पहला श्लोक एक पक्षी के दुख से निकला!
- fact: Tamasa nadi ke kinare Maharishi Valmiki ne ek drishya dekha. Ek shikari ne kraunch pakshiyon ke jode mein se ek ko maar diya. Unka dukh ek shlok bankar nikla, 'Ma Nishad', aur Brahma ji ne unhe isi chhand mein Shri Ram ki katha likhne ko kaha.
- fact_hi: तमसा नदी के किनारे महर्षि वाल्मीकि ने एक दृश्य देखा। एक शिकारी ने क्रौंच पक्षियों के जोड़े में से एक को मार दिया। उनका दुख एक श्लोक बनकर निकला, मा निषाद। फिर ब्रह्मा जी ने उन्हें इसी छंद में श्री राम की कथा लिखने को कहा।
- source: Valmiki Ramayan, Bal Kand, Sarga 2
- verify: https://heritage.iitk.ac.in/VRAM/1.2.15
- lesson: Sachchi karuna se hi mahaan rachna janm leti hai.

### 2. Hanuman naam kaise pada
- id: ramayan-02-hanuman-naam
- deity: Hanuman ji
- hook: Kya aap jaante hain? Hanuman ji ka naam Hanuman kyon pada?
- hook_hi: क्या आप जानते हैं? हनुमान जी का नाम हनुमान क्यों पड़ा?
- fact: Jambavan ji ne Hanuman ji ko unka bachpan yaad dilaya. Indra ke vajra se woh parvat ki choti par gire, aur unki hanu, yaani thodi, par chot lagi. Tabhi se woh Hanuman naam se jaane gaye.
- fact_hi: जाम्बवान जी ने हनुमान जी को उनका बचपन याद दिलाया। इंद्र के वज्र से वे पर्वत की चोटी पर गिरे, और उनकी हनु, यानी ठोड़ी, पर चोट लगी। तभी से वे हनुमान नाम से जाने गए।
- source: Valmiki Ramayan, Kishkindha Kand, Sarga 66
- verify: https://heritage.iitk.ac.in/VRAM/4.66.24
- lesson: Bachpan ki chot bhi Hanuman ji ki pehchaan ban gayi; kathinai bhi aashirvaad ban sakti hai.

### 3. Ravan naam kisne diya
- id: ramayan-03-ravan-naam
- deity: Ravan / Shiv ji (Ramayan)
- hook: Kya aap jaante hain? Ravan ko yeh naam Shiv ji ne diya tha!
- hook_hi: क्या आप जानते हैं? रावण को यह नाम शिव जी ने दिया था!
- fact: Dashanan ne ek baar Kailash parvat ko hilane ki koshish ki. Shiv ji ne parvat ko dabaya, to woh bahut zor se chillaya. Shiv ji ne prasann hokar kaha, tumhare is 'rav' se teeno lok kaanp uthe, isliye tumhara naam Ravan hoga.
- fact_hi: दशानन ने एक बार कैलाश पर्वत को हिलाने की कोशिश की। शिव जी ने पर्वत को दबाया, तो वह बहुत ज़ोर से चिल्लाया। शिव जी ने प्रसन्न होकर कहा, तुम्हारे इस रव से तीनों लोक काँप उठे। इसलिए तुम्हारा नाम रावण होगा।
- source: Valmiki Ramayan, Uttar Kand, Sarga 16
- verify: https://heritage.iitk.ac.in/VRAM/7.16.38
- lesson: Naam karm se banta hai; jaisa karm, waisi pehchaan.

### 4. Lakshman ji aur nupur
- id: ramayan-04-lakshman-nupur
- deity: Lakshman ji / Mata Sita
- hook: Lakshman ji ne Mata Sita ke kaun se gehne pehchaane the?
- hook_hi: लक्ष्मण जी ने माता सीता के कौन से गहने पहचाने थे?
- fact: Sugriv ne Shri Ram ko Sita ji ke gire hue aabhushan dikhaye. Lakshman ji ne kaha, main baajuband aur kundal nahi pehchaanta. Main sirf nupur pehchaanta hoon, kyonki main roz unke charanon mein pranaam karta tha.
- fact_hi: सुग्रीव ने श्री राम को सीता जी के गिरे हुए आभूषण दिखाए। लक्ष्मण जी ने कहा, मैं बाजूबंद और कुंडल नहीं पहचानता। मैं सिर्फ़ नूपुर पहचानता हूँ, क्योंकि मैं रोज़ उनके चरणों में प्रणाम करता था।
- source: Valmiki Ramayan, Kishkindha Kand, Sarga 6
- verify: https://heritage.iitk.ac.in/VRAM/4.6.22
- lesson: Sachcha aadar nazar ko bhi maryada mein rakhta hai.

### 5. Kevat ki shart
- id: ramayan-05-kevat-shart
- deity: Shri Ram / Kevat
- hook: Kevat ne Shri Ram ko naav mein bithane se pehle kya maanga?
- hook_hi: केवट ने श्री राम को नाव में बिठाने से पहले क्या माँगा?
- fact: Ganga ke kinare Kevat naav nahi laaya, usne kaha, aapke charanon ki dhool se patthar naari ban gayi thi. Kahin meri naav bhi na badal jaaye, isliye pehle charan dhone dijiye. Prabhu muskuraye, aur Kevat ne prem se charan dhokar unhe paar utaara.
- fact_hi: गंगा के किनारे केवट नाव नहीं लाया। उसने कहा, आपके चरणों की धूल से पत्थर नारी बन गई थी। कहीं मेरी नाव भी न बदल जाए, इसलिए पहले चरण धोने दीजिए। प्रभु मुस्कुराए, और केवट ने प्रेम से चरण धोकर उन्हें पार उतारा।
- source: Shri Ramcharitmanas, Ayodhya Kand, Doha 100-101
- verify: https://heritage.iitk.ac.in/RCM/2.100
- lesson: Bholi bhakti mein bhi gehri samajh hoti hai; prem se maango to Prabhu muskura dete hain.

### 6. Ek baan, saat ped
- id: ramayan-06-saat-saal-vriksh
- deity: Shri Ram / Sugriv
- hook: Kya aap jaante hain? Shri Ram ke ek baan ne saat ped bhed diye the!
- hook_hi: क्या आप जानते हैं? श्री राम के एक बाण ने सात पेड़ भेद दिए थे!
- fact: Sugriv ko Shri Ram ke bal par bharosa dilana tha. Shri Ram ne ek hi baan chalaya. Valmiki Ramayan ke anusaar, woh baan saal ke saat vishaal pedon ko bhed gaya, phir parvat ko cheerta hua dharti mein sama gaya.
- fact_hi: सुग्रीव को श्री राम के बल पर भरोसा दिलाना था। श्री राम ने एक ही बाण चलाया। वाल्मीकि रामायण के अनुसार, वह बाण साल के सात विशाल पेड़ों को भेद गया। फिर पर्वत को चीरता हुआ धरती में समा गया।
- source: Valmiki Ramayan, Kishkindha Kand, Sarga 12
- verify: https://heritage.iitk.ac.in/VRAM/4.12.3
- lesson: Mitra ka vishwas shabdon se nahi, karm se jeeta jaata hai.

### 7. Hanuman ji ki bhasha
- id: ramayan-07-hanuman-bhasha
- deity: Hanuman ji / Mata Sita
- hook: Hanuman ji ne Mata Sita se kis bhasha mein baat ki thi?
- hook_hi: हनुमान जी ने माता सीता से किस भाषा में बात की थी?
- fact: Ashok Vatika mein Hanuman ji ne ek baat sochi: agar main brahman ki tarah Sanskrit bolun, to Sita ji mujhe Ravan samajhkar dar jaayengi. Isliye unhone saadharan manushyon ki bhasha mein baat karne ka nishchay kiya.
- fact_hi: अशोक वाटिका में हनुमान जी ने एक बात सोची। अगर मैं ब्राह्मण की तरह संस्कृत बोलूँ, तो सीता जी मुझे रावण समझकर डर जाएँगी। इसलिए उन्होंने साधारण मनुष्यों की भाषा में बात करने का निश्चय किया।
- source: Valmiki Ramayan, Sundar Kand, Sarga 30
- verify: https://heritage.iitk.ac.in/VRAM/5.30.18
- lesson: Baat wahi pahunchti hai jo sunne wale ki bhasha mein kahi jaaye.

### 8. Lakshman Rekha ki pankti
- id: ramayan-08-lakshman-rekha-manas
- deity: Lakshman ji / Mandodari (Ramcharitmanas)
- hook: Kya aap jaante hain? Lakshman Rekha ki baat Ramcharitmanas mein kisne kahi?
- hook_hi: क्या आप जानते हैं? लक्ष्मण रेखा की बात रामचरितमानस में किसने कही?
- fact: Ramcharitmanas ke Lanka Kand mein Mandodari Ravan ko samjhaati hain. Woh kehti hain, Ramanuj ki kheenchi ek chhoti si rekha bhi tum laangh nahi sake. Yeh pankti Lakshman ji ki rekha ki or sanket karti hai.
- fact_hi: रामचरितमानस के लंकाकांड में मंदोदरी रावण को समझाती हैं। वे कहती हैं, रामानुज की खींची एक छोटी सी रेखा भी तुम लाँघ नहीं सके। यह पंक्ति लक्ष्मण जी की रेखा की ओर संकेत करती है।
- source: Shri Ramcharitmanas, Lanka Kand, Doha 36
- verify: https://heritage.iitk.ac.in/RCM/6.36
- lesson: Maryada ki ek chhoti rekha bhi bade ahankaar se badi hoti hai.

### 9. Parvat do baar aaya
- id: ramayan-09-aushadhi-parvat-do-baar
- deity: Hanuman ji / Lakshman ji
- hook: Kya aap jaante hain? Hanuman ji aushadhi parvat ek nahi, do baar laaye!
- hook_hi: क्या आप जानते हैं? हनुमान जी औषधि पर्वत एक नहीं, दो बार लाए!
- fact: Valmiki Ramayan mein Hanuman ji aushadhiyon ka parvat do baar laaye. Pehli baar Indrajit ke Brahmastra ke baad, jab Ram-Lakshman aur sena moorchhit thi. Doosri baar jab Ravan ki shakti se Lakshman ji ghayal hue.
- fact_hi: वाल्मीकि रामायण में हनुमान जी औषधियों का पर्वत दो बार लाए। पहली बार इंद्रजीत के ब्रह्मास्त्र के बाद, जब राम-लक्ष्मण और सेना मूर्छित थी। दूसरी बार जब रावण की शक्ति से लक्ष्मण जी घायल हुए।
- source: Valmiki Ramayan, Yuddha Kand, Sarga 74 aur 102
- verify: https://heritage.iitk.ac.in/VRAM/6.102.30
- lesson: Seva ek baar karke ruk nahi jaati; zaroorat pade to baar baar haazir rehti hai.

### 10. Ahalya ji ki tapasya
- id: ramayan-10-ahalya-tapasya
- deity: Ahalya ji / Shri Ram
- hook: Kya aap jaante hain? Valmiki Ramayan mein Ahalya ji patthar nahi bani thin!
- hook_hi: क्या आप जानते हैं? वाल्मीकि रामायण में अहल्या जी पत्थर नहीं बनी थीं!
- fact: Valmiki Ramayan ke anusaar, Gautam rishi ke shaap se Ahalya ji ashram mein sab praniyon se adrishya rahin. Woh vayu par jeevit rehkar tapasya karti rahin. Shri Ram ke aane par woh phir sabko dikhne lagin.
- fact_hi: वाल्मीकि रामायण के अनुसार, गौतम ऋषि के शाप से अहल्या जी आश्रम में सब प्राणियों से अदृश्य रहीं। वे वायु पर जीवित रहकर तपस्या करती रहीं। श्री राम के आने पर वे फिर सबको दिखने लगीं।
- source: Valmiki Ramayan, Bal Kand, Sarga 48-49
- verify: https://heritage.iitk.ac.in/VRAM/1.48.30
- lesson: Dhairya aur tapasya ka phal der se sahi, milta zaroor hai.

### 11. Billi jitna roop
- id: ramayan-11-hanuman-laghu-roop
- deity: Hanuman ji
- hook: Kya aap jaante hain? Hanuman ji Lanka mein kitne chhote roop mein gaye?
- hook_hi: क्या आप जानते हैं? हनुमान जी लंका में कितने छोटे रूप में गए?
- fact: Valmiki Ramayan ke anusaar, sooraj doobne ke baad Hanuman ji ne apna sharir chhota kar liya. Woh ek billi jitne aakaar ke ho gaye, aur raat mein Lanka mein pravesh kiya.
- fact_hi: वाल्मीकि रामायण के अनुसार, सूरज डूबने के बाद हनुमान जी ने अपना शरीर छोटा कर लिया। वे एक बिल्ली जितने आकार के हो गए, और रात में लंका में प्रवेश किया।
- source: Valmiki Ramayan, Sundar Kand, Sarga 2
- verify: https://heritage.iitk.ac.in/VRAM/5.2.49
- lesson: Bada kaam karne ke liye kabhi chhota banna padta hai.

### 12. Nau aur paanch varsh
- id: ramayan-12-nau-aur-paanch-varsh
- deity: Shri Ram / Kaikeyi (vanvaas)
- hook: Kya aap jaante hain? Kaikeyi ne vanvaas ke chaudah varsh kaise kahe the?
- hook_hi: क्या आप जानते हैं? कैकेयी ने वनवास के चौदह वर्ष कैसे कहे थे?
- fact: Valmiki Ramayan mein Kaikeyi apna vardan maangte hue vanvaas ko 'nav pancha cha varshani' kehti hain. Iska arth hai, nau aur paanch varsh. Dono milakar chaudah varsh hote hain.
- fact_hi: वाल्मीकि रामायण में कैकेयी अपना वरदान माँगते हुए वनवास को नव पञ्च च वर्षाणि कहती हैं। इसका अर्थ है, नौ और पाँच वर्ष। दोनों मिलाकर चौदह वर्ष होते हैं।
- source: Valmiki Ramayan, Ayodhya Kand, Sarga 11
- verify: https://heritage.iitk.ac.in/VRAM/2.11.26
- lesson: Shabd kaise bhi kahe jaayen, vachan ka bhaar ek hi hota hai.

### 13. Ek bhi ashuddh shabd nahi
- id: ramayan-13-hanuman-vani
- deity: Hanuman ji / Shri Ram
- hook: Hanuman ji ki pehli baat sunkar Shri Ram ne kya kaha?
- hook_hi: हनुमान जी की पहली बात सुनकर श्री राम ने क्या कहा?
- fact: Hanuman ji Shri Ram se pehli baar ek bhikshu ke vesh mein mile. Shri Ram ne Lakshman ji se kaha, inhone vedon aur vyakaran ka gehra adhyayan kiya hai. Itna bolne par bhi inke mukh se ek bhi ashuddh shabd nahi nikla.
- fact_hi: हनुमान जी श्री राम से पहली बार एक भिक्षु के वेश में मिले। श्री राम ने लक्ष्मण जी से कहा, इन्होंने वेदों और व्याकरण का गहरा अध्ययन किया है। इतना बोलने पर भी इनके मुख से एक भी अशुद्ध शब्द नहीं निकला।
- source: Valmiki Ramayan, Kishkindha Kand, Sarga 3
- verify: https://heritage.iitk.ac.in/VRAM/4.3.29
- lesson: Madhur aur shuddh vaani pehli mulaqat mein hi dil jeet leti hai.

### 14. Kumbhakarn ki neend
- id: ramayan-14-kumbhakarn-vardan
- deity: Kumbhakarn / Brahma ji (Ramayan)
- hook: Kumbhakarn ne Brahma ji se neend ka vardan kyon maanga?
- hook_hi: कुंभकर्ण ने ब्रह्मा जी से नींद का वरदान क्यों माँगा?
- fact: Kumbhakarn ki tapasya se prasann hokar Brahma ji vardan dene aaye. Devtaon ki prarthana par Devi Saraswati uski vaani mein aa baithin. Tab Kumbhakarn ne vardan maanga, mujhe anek varshon tak sona hai.
- fact_hi: कुंभकर्ण की तपस्या से प्रसन्न होकर ब्रह्मा जी वरदान देने आए। देवताओं की प्रार्थना पर देवी सरस्वती उसकी वाणी में आ बैठीं। तब कुंभकर्ण ने वरदान माँगा, मुझे अनेक वर्षों तक सोना है।
- source: Valmiki Ramayan, Uttar Kand, Sarga 10
- verify: https://heritage.iitk.ac.in/VRAM/7.10.45
- lesson: Vardan bhi wahi maango jo sach mein kalyan kare; jeebh par sanyam zaroori hai.

### 15. Mata Sita kahan mili
- id: ramayan-15-sita-ayonija
- deity: Mata Sita / Raja Janak
- hook: Mata Sita Raja Janak ko kahan mili thin?
- hook_hi: माता सीता राजा जनक को कहाँ मिली थीं?
- fact: Raja Janak ne swayam bataya, yagya ki bhoomi jotte samay hal ki nok se ek kanya prakat hui. Woh Sita naam se prasiddh hui. Dharti se prakat hone ke kaaran Janak ji ne unhe Ayonija kaha.
- fact_hi: राजा जनक ने स्वयं बताया, यज्ञ की भूमि जोतते समय हल की नोक से एक कन्या प्रकट हुई। वे सीता नाम से प्रसिद्ध हुईं। धरती से प्रकट होने के कारण जनक जी ने उन्हें अयोनिजा कहा।
- source: Valmiki Ramayan, Bal Kand, Sarga 66
- verify: https://heritage.iitk.ac.in/VRAM/1.66.13
- lesson: Dharti jaisi sahansheelta hi Mata Sita ki pehchaan hai.

### 16. Vair maran tak
- id: ramayan-16-maranantani-vairani
- deity: Shri Ram / Vibhishan
- hook: Ravan ke antim sanskar par Shri Ram ne Vibhishan se kya kaha?
- hook_hi: रावण के अंतिम संस्कार पर श्री राम ने विभीषण से क्या कहा?
- fact: Yuddh ke baad Shri Ram ne Vibhishan se kaha, vair maran tak hi rehta hai, ab hamara prayojan poora hua. Iska vidhi se antim sanskar karo. Yeh jaise tumhare bhai hain, waise hi mere bhi.
- fact_hi: युद्ध के बाद श्री राम ने विभीषण से कहा, वैर मरण तक ही रहता है। अब हमारा प्रयोजन पूरा हुआ। इनका विधि से अंतिम संस्कार करो। यह जैसे तुम्हारे भाई हैं, वैसे ही मेरे भी।
- source: Valmiki Ramayan, Yuddha Kand, Sarga 112
- verify: https://heritage.iitk.ac.in/VRAM/6.112.25
- lesson: Badappan yahi hai ki shatruta ko jeevan ke saath hi chhod diya jaaye.

### 17. Angad ji ka pair
- id: ramayan-17-angad-charan
- deity: Angad ji (Ramcharitmanas)
- hook: Ravan ki sabha mein Angad ji ka pair koi kyon nahi hila saka?
- hook_hi: रावण की सभा में अंगद जी का पैर कोई क्यों नहीं हिला सका?
- fact: Ramcharitmanas mein Angad ji Ravan ki sabha mein pair jamaakar khade ho gaye. Bade bade yoddha uthe, par koi unka pair hila nahi saka. Jab Ravan khud pair pakadne aaya, to Angad ji bole, mere nahi, Shri Ram ke charan pakdo.
- fact_hi: रामचरितमानस में अंगद जी रावण की सभा में पैर जमाकर खड़े हो गए। बड़े बड़े योद्धा उठे, पर कोई उनका पैर हिला नहीं सका। जब रावण खुद पैर पकड़ने आया, तो अंगद जी बोले, मेरे नहीं, श्री राम के चरण पकड़ो।
- source: Shri Ramcharitmanas, Lanka Kand, Doha 34-35
- verify: https://heritage.iitk.ac.in/RCM/6.35
- lesson: Jiske peechhe Prabhu ka bal ho, uska sankalp koi hila nahi sakta.

### 18. Bal kyon bhoole
- id: ramayan-18-hanuman-rishi-shaap
- deity: Hanuman ji
- hook: Kya aap jaante hain? Hanuman ji apna bal kyon bhool gaye the?
- hook_hi: क्या आप जानते हैं? हनुमान जी अपना बल क्यों भूल गए थे?
- fact: Bachpan mein Hanuman ji ki chanchalta se rishi pareshan the. Rishiyon ke shaap se Hanuman ji apna bal bhool gaye. Shaap yeh tha ki jab koi unki keerti yaad dilayega, tab unka bal badh jaayega.
- fact_hi: बचपन में हनुमान जी की चंचलता से ऋषि परेशान थे। ऋषियों के शाप से हनुमान जी अपना बल भूल गए। शाप यह था कि जब कोई उनकी कीर्ति याद दिलाएगा, तब उनका बल बढ़ जाएगा।
- source: Valmiki Ramayan, Uttar Kand, Sarga 36
- verify: https://heritage.iitk.ac.in/VRAM/7.36.35
- lesson: Kabhi kabhi apni shakti yaad dilane ke liye ek sachcha saathi chahiye.

### 19. Mata Sumitra ki seekh
- id: ramayan-19-sumitra-seekh
- deity: Lakshman ji / Mata Sumitra
- hook: Lakshman ji ko van bhejte samay Mata Sumitra ne kya kaha?
- hook_hi: लक्ष्मण जी को वन भेजते समय माता सुमित्रा ने क्या कहा?
- fact: Van jaate Lakshman ji se Mata Sumitra ne kaha, Ram ko Dasharath samajhna, aur Sita ko mujhe samajhna. Van ko Ayodhya samajhna. Beta, sukh se jao.
- fact_hi: वन जाते लक्ष्मण जी से माता सुमित्रा ने कहा, राम को दशरथ समझना, और सीता को मुझे समझना। वन को अयोध्या समझना। बेटा, सुख से जाओ।
- source: Valmiki Ramayan, Ayodhya Kand, Sarga 40
- verify: https://heritage.iitk.ac.in/VRAM/2.40.9
- lesson: Jahan apne saath hon, wahi ghar hai.

### 20. Ravan ka tej
- id: ramayan-20-ravan-tej
- deity: Hanuman ji / Ravan
- hook: Ravan ko dekhkar Hanuman ji ne man mein kya kaha?
- hook_hi: रावण को देखकर हनुमान जी ने मन में क्या कहा?
- fact: Ravan ki sabha mein Hanuman ji uska tej dekhkar chakit hue. Unhone socha, aho roop, aho dhairya, aho tej! Yadi isme adharm prabal na hota, to yeh Indra sahit devlok ka bhi rakshak ho sakta tha.
- fact_hi: रावण की सभा में हनुमान जी उसका तेज देखकर चकित हुए। उन्होंने सोचा, अहो रूप, अहो धैर्य, अहो तेज! यदि इसमें अधर्म प्रबल न होता, तो यह इंद्र सहित देवलोक का भी रक्षक हो सकता था।
- source: Valmiki Ramayan, Sundar Kand, Sarga 49
- verify: https://heritage.iitk.ac.in/VRAM/5.49.18
- lesson: Gun kitne bhi bade hon, adharm unhe nasht kar deta hai.

### 21. Payas ka batwara
- id: ramayan-21-payas-batwara
- deity: Raja Dasharath / Shri Ram ka janm
- hook: Raja Dasharath ne yagya ka payas kaise baanta tha?
- hook_hi: राजा दशरथ ने यज्ञ का पायस कैसे बाँटा था?
- fact: Yagya ki agni se ek divya purush payas lekar prakat hue. Raja Dasharath ne aadha payas Kaushalya ji ko diya, bache ka aadha Sumitra ji ko, aur phir bache ka aadha Kaikeyi ji ko. Antim bhaag phir se Sumitra ji ko mila.
- fact_hi: यज्ञ की अग्नि से एक दिव्य पुरुष पायस लेकर प्रकट हुए। राजा दशरथ ने आधा पायस कौशल्या जी को दिया। बचे का आधा सुमित्रा जी को, और फिर बचे का आधा कैकेयी जी को। अंतिम भाग फिर से सुमित्रा जी को मिला।
- source: Valmiki Ramayan, Bal Kand, Sarga 16
- verify: https://heritage.iitk.ac.in/VRAM/1.16.27
- lesson: Prasad baantne mein bhi sabka dhyan rakhna hi sachcha nyay hai.

### 22. Sharanagat ka vrat
- id: ramayan-22-sharanagat-vrat
- deity: Shri Ram / Vibhishan
- hook: Vibhishan ko sharan dete samay Shri Ram ne kaun sa vrat bataya?
- hook_hi: विभीषण को शरण देते समय श्री राम ने कौन सा व्रत बताया?
- fact: Vibhishan Shri Ram ki sharan mein aaye. Shri Ram ne kaha, jo ek baar bhi sharan mein aakar kahe 'main aapka hoon', use main sab praniyon se abhay deta hoon. Yeh mera vrat hai.
- fact_hi: विभीषण श्री राम की शरण में आए। श्री राम ने कहा, जो एक बार भी शरण में आकर कहे, मैं आपका हूँ। उसे मैं सब प्राणियों से अभय देता हूँ। यह मेरा व्रत है।
- source: Valmiki Ramayan, Yuddha Kand, Sarga 18
- verify: https://heritage.iitk.ac.in/VRAM/6.18.32
- lesson: Jo sharan mein aaye, use aashray dena hi sabse bada dharm hai.

### 23. Aag sheetal kyon rahi
- id: ramayan-23-agni-sheetal
- deity: Hanuman ji / Mata Sita
- hook: Hanuman ji ko poonchh ki aag ne kyon nahi jalaya?
- hook_hi: हनुमान जी को पूँछ की आग ने क्यों नहीं जलाया?
- fact: Ravan ne Hanuman ji ki poonchh mein aag lagwayi. Mata Sita ne Agni dev se prarthana ki, agar maine pati ki seva aur tap kiya hai, to Hanuman ke liye sheetal ho jao. Aag jalti rahi, par Hanuman ji ko uski jalan nahi hui.
- fact_hi: रावण ने हनुमान जी की पूँछ में आग लगवाई। माता सीता ने अग्नि देव से प्रार्थना की। अगर मैंने पति की सेवा और तप किया है, तो हनुमान के लिए शीतल हो जाओ। आग जलती रही, पर हनुमान जी को उसकी जलन नहीं हुई।
- source: Valmiki Ramayan, Sundar Kand, Sarga 53
- verify: https://heritage.iitk.ac.in/VRAM/5.53.28
- lesson: Sachchi prarthana apne logon ki raksha kavach ban jaati hai.

### 24. Shabari ke phal
- id: ramayan-24-shabari-phal
- deity: Shabari ji / Shri Ram
- hook: Shabari ji ne Shri Ram ko kaun se phal diye the?
- hook_hi: शबरी जी ने श्री राम को कौन से फल दिए थे?
- fact: Valmiki Ramayan mein Shabari ji Matang rishi ke shishyon ki seva karne wali tapasvini hain. Unhone Pampa ke kinare se ikatthe kiye van ke phal Shri Ram ko bhent kiye. Ber chakhkar dene ki prasiddh katha lok-manyata hai, Valmiki Ramayan mein yeh nahi milti.
- fact_hi: वाल्मीकि रामायण में शबरी जी मतंग ऋषि के शिष्यों की सेवा करने वाली तपस्विनी हैं। उन्होंने पंपा के किनारे से इकट्ठे किए वन के फल श्री राम को भेंट किए। बेर चखकर देने की प्रसिद्ध कथा लोक-मान्यता है, वाल्मीकि रामायण में यह नहीं मिलती।
- source: Valmiki Ramayan, Aranya Kand, Sarga 74
- verify: https://heritage.iitk.ac.in/VRAM/3.74.17
- lesson: Prabhu bhent ka mol nahi, bhav dekhte hain.

### 25. Shiv ji ka dhanush
- id: ramayan-25-shiv-dhanush
- deity: Shri Ram / Shiv ji ka dhanush
- hook: Kya aap jaante hain? Raja Janak ka dhanush asal mein Shiv ji ka tha!
- hook_hi: क्या आप जानते हैं? राजा जनक का धनुष असल में शिव जी का था!
- fact: Raja Janak ke paas jo dhanush tha, woh Shiv ji ka tha. Devtaon ne yeh dhanush Janak ji ke purvaj Devrat ko saunpa tha. Shri Ram ne jab ise chadhakar kheencha, to woh beech se toot gaya.
- fact_hi: राजा जनक के पास जो धनुष था, वह शिव जी का था। देवताओं ने यह धनुष जनक जी के पूर्वज देवरात को सौंपा था। श्री राम ने जब इसे चढ़ाकर खींचा, तो वह बीच से टूट गया।
- source: Valmiki Ramayan, Bal Kand, Sarga 66-67
- verify: https://heritage.iitk.ac.in/VRAM/1.67.17
- lesson: Jo sahaj bhav se kaam kare, uske liye kathin bhi saral ho jaata hai.

### 26. Bharat ji ka man
- id: ramayan-26-bharat-ka-man
- deity: Shri Ram / Bharat ji / Hanuman ji
- hook: Ayodhya lautne se pehle Shri Ram ne Hanuman ji ko kyon bheja?
- hook_hi: अयोध्या लौटने से पहले श्री राम ने हनुमान जी को क्यों भेजा?
- fact: Lautte samay Shri Ram ne Hanuman ji ko aage bheja. Unhone kaha, Bharat ke chehre aur baaton se unka man samajhna. Yadi Bharat swayam rajya chahte hon, to woh hi poori prithvi par shasan karein.
- fact_hi: लौटते समय श्री राम ने हनुमान जी को आगे भेजा। उन्होंने कहा, भरत के चेहरे और बातों से उनका मन समझना। यदि भरत स्वयं राज्य चाहते हों, तो वही पूरी पृथ्वी पर शासन करें।
- source: Valmiki Ramayan, Yuddha Kand, Sarga 128
- verify: https://heritage.iitk.ac.in/VRAM/6.128.17
- lesson: Apno ki khushi ke aage rajya bhi chhota hai.

### 27. Surasa ki pariksha
- id: ramayan-27-surasa-pariksha
- deity: Hanuman ji / Surasa
- hook: Hanuman ji ki pariksha lene samudra mein kaun aayi thin?
- hook_hi: हनुमान जी की परीक्षा लेने समुद्र में कौन आई थीं?
- fact: Devtaon ne Hanuman ji ki pariksha ke liye naagmata Surasa ko bheja. Surasa ne apna mukh bahut bada kar liya. Hanuman ji turant chhote roop mein mukh mein jaakar baahar aa gaye, aur Surasa ne unhe aashirvaad diya.
- fact_hi: देवताओं ने हनुमान जी की परीक्षा के लिए नागमाता सुरसा को भेजा। सुरसा ने अपना मुख बहुत बड़ा कर लिया। हनुमान जी तुरंत छोटे रूप में मुख में जाकर बाहर आ गए, और सुरसा ने उन्हें आशीर्वाद दिया।
- source: Valmiki Ramayan, Sundar Kand, Sarga 1
- verify: https://heritage.iitk.ac.in/VRAM/5.1.171
- lesson: Har jagah bal nahi, kabhi buddhi se raasta nikalta hai.

### 28. Pita ke mitra Jatayu
- id: ramayan-28-jatayu-mitra
- deity: Jatayu / Shri Ram
- hook: Kya aap jaante hain? Jatayu Raja Dasharath ke mitra the!
- hook_hi: क्या आप जानते हैं? जटायु राजा दशरथ के मित्र थे!
- fact: Panchvati ke raaste mein Jatayu ne Shri Ram se kaha, mujhe apne pita ka mitra samjho. Woh Aruna ke putra the, aur Sampati unke bade bhai the. Unhone vachan diya ki Ram-Lakshman ke na rehne par woh Sita ji ki raksha karenge.
- fact_hi: पंचवटी के रास्ते में जटायु ने श्री राम से कहा, मुझे अपने पिता का मित्र समझो। वे अरुण के पुत्र थे, और संपाती उनके बड़े भाई थे। उन्होंने वचन दिया कि राम-लक्ष्मण के न रहने पर वे सीता जी की रक्षा करेंगे।
- source: Valmiki Ramayan, Aranya Kand, Sarga 14
- verify: https://heritage.iitk.ac.in/VRAM/3.14.3
- lesson: Sachcha mitra parivar ki raksha ko apna dharm maanta hai.

### 29. Chaubees hazaar shlok
- id: ramayan-29-chaubees-hazaar-shlok
- deity: Maharishi Valmiki (Ramayan)
- hook: Ramayan mein kitne shlok hain? Jawab Ramayan mein hi likha hai!
- hook_hi: रामायण में कितने श्लोक हैं? जवाब रामायण में ही लिखा है!
- fact: Valmiki Ramayan ke anusaar, Maharishi Valmiki ne chaubees hazaar shlok rache. Inmein paanch sau sarg hain. Chhah kaand hain, aur unke baad Uttar Kaand.
- fact_hi: वाल्मीकि रामायण के अनुसार, महर्षि वाल्मीकि ने चौबीस हज़ार श्लोक रचे। इनमें पाँच सौ सर्ग हैं। छह कांड हैं, और उनके बाद उत्तरकांड।
- source: Valmiki Ramayan, Bal Kand, Sarga 4
- verify: https://heritage.iitk.ac.in/VRAM/1.4.2
- lesson: Itni badi katha ka har shlok ek hi naam ka gungaan hai: Shri Ram.

### 30. Sabse bada inaam
- id: ramayan-30-hanuman-aalingan
- deity: Shri Ram / Hanuman ji
- hook: Shri Ram ne Hanuman ji ko sabse bada inaam kya diya?
- hook_hi: श्री राम ने हनुमान जी को सबसे बड़ा इनाम क्या दिया?
- fact: Hanuman ji Sita ji ka samachar lekar laute. Shri Ram ne kaha, is mahaan kaam ke badle mere paas dene ko bas yahi hai. Aur unhone Hanuman ji ko gale laga liya.
- fact_hi: हनुमान जी सीता जी का समाचार लेकर लौटे। श्री राम ने कहा, इस महान काम के बदले मेरे पास देने को बस यही है। और उन्होंने हनुमान जी को गले लगा लिया।
- source: Valmiki Ramayan, Yuddha Kand, Sarga 1
- verify: https://heritage.iitk.ac.in/VRAM/6.1.13
- lesson: Prem bhara aalingan har inaam se bada hai.

### 31. Phulwari ka pehla darshan
- id: ramayan-31-pushp-vatika
- deity: Shri Ram / Mata Sita (Ramcharitmanas)
- hook: Ramcharitmanas mein Shri Ram-Sita ka pehla darshan kahan hua?
- hook_hi: रामचरितमानस में श्री राम-सीता का पहला दर्शन कहाँ हुआ?
- fact: Ramcharitmanas mein yeh darshan Janak ji ki phulwari mein hota hai. Sita ji Mata Gauri ki pooja ke liye aayi thin, aur Shri Ram-Lakshman guru ke liye phool lene. Phir Sita ji ne Gauri ji se man ki baat kahi.
- fact_hi: रामचरितमानस में यह दर्शन जनक जी की फुलवारी में होता है। सीता जी माता गौरी की पूजा के लिए आई थीं, और श्री राम-लक्ष्मण गुरु के लिए फूल लेने। फिर सीता जी ने गौरी जी से मन की बात कही।
- source: Shri Ramcharitmanas, Bal Kand, Doha 228-236
- verify: https://heritage.iitk.ac.in/RCM/1.229
- lesson: Pavitra man ki prarthana Mata Gauri tak zaroor pahunchti hai.

### 32. Sampati ke pankh
- id: ramayan-32-sampati-pankh
- deity: Sampati / Jatayu (Ramayan)
- hook: Jatayu ke bade bhai Sampati ke pankh kaise jale the?
- hook_hi: जटायु के बड़े भाई संपाती के पंख कैसे जले थे?
- fact: Sampati aur Jatayu ek baar Surya ki or udaan bharne lage. Jatayu tez dhoop se jalne lage, to Sampati ne apne pankh failakar unhe bachaya. Isme Sampati ke apne pankh jal gaye.
- fact_hi: संपाती और जटायु एक बार सूर्य की ओर उड़ान भरने लगे। जटायु तेज़ धूप से जलने लगे, तो संपाती ने अपने पंख फैलाकर उन्हें बचाया। इसमें संपाती के अपने पंख जल गए।
- source: Valmiki Ramayan, Kishkindha Kand, Sarga 61
- verify: https://heritage.iitk.ac.in/VRAM/4.61.15
- lesson: Bada bhai wahi jo chhote ke liye khud dhoop sah le.

### 33. Mainak par vishram nahi
- id: ramayan-33-mainak-vishram
- deity: Hanuman ji (Ramcharitmanas)
- hook: Hanuman ji ne Mainak parvat par vishram kyon nahi kiya?
- hook_hi: हनुमान जी ने मैनाक पर्वत पर विश्राम क्यों नहीं किया?
- fact: Samudra ke kehne par Mainak parvat Hanuman ji ko vishram dene upar utha. Hanuman ji ne use haath se chhukar pranaam kiya. Aur bole, Ram kaaj kiye bina mujhe vishram kahan.
- fact_hi: समुद्र के कहने पर मैनाक पर्वत हनुमान जी को विश्राम देने ऊपर उठा। हनुमान जी ने उसे हाथ से छूकर प्रणाम किया। और बोले, राम काज किए बिना मुझे विश्राम कहाँ।
- source: Shri Ramcharitmanas, Sundar Kand, Doha 1
- verify: https://heritage.iitk.ac.in/RCM/5.1
- lesson: Lakshya poora hone tak aaram nahi, yahi Hanuman ji ki seekh hai.

### 34. Bala aur Atibala
- id: ramayan-34-bala-atibala
- deity: Shri Ram / Vishwamitra ji
- hook: Vishwamitra ji ne Shri Ram ko kaun si vidya di thi?
- hook_hi: विश्वामित्र जी ने श्री राम को कौन सी विद्या दी थी?
- fact: Vishwamitra ji ne Shri Ram ko Bala aur Atibala vidya di. Valmiki Ramayan ke anusaar, inse na thakaan hoti, na jwar, na roop badalta. Sote hue bhi koi rakshas unhe haani nahi pahuncha sakta tha.
- fact_hi: विश्वामित्र जी ने श्री राम को बला और अतिबला विद्या दी। वाल्मीकि रामायण के अनुसार, इनसे न थकान होती, न ज्वर, न रूप बदलता। सोते हुए भी कोई राक्षस उन्हें हानि नहीं पहुँचा सकता था।
- source: Valmiki Ramayan, Bal Kand, Sarga 22
- verify: https://heritage.iitk.ac.in/VRAM/1.22.13
- lesson: Guru ki di hui vidya jeevan bhar ki raksha karti hai.

### 35. Navadha bhakti
- id: ramayan-35-navadha-bhakti
- deity: Shri Ram / Shabari ji (Ramcharitmanas)
- hook: Shri Ram ne Shabari ji ko bhakti ke kitne roop bataye?
- hook_hi: श्री राम ने शबरी जी को भक्ति के कितने रूप बताए?
- fact: Shabari ji ke ashram mein Shri Ram ne unhe nau prakar ki bhakti batayi. Pehli santon ka sang, doosri Prabhu ki katha mein prem. Shri Ram ne kaha, in nau mein se ek bhi jisme ho, woh mujhe atyant priya hai.
- fact_hi: शबरी जी के आश्रम में श्री राम ने उन्हें नौ प्रकार की भक्ति बताई। पहली संतों का संग, दूसरी प्रभु की कथा में प्रेम। श्री राम ने कहा, इन नौ में से एक भी जिसमें हो, वह मुझे अत्यंत प्रिय है।
- source: Shri Ramcharitmanas, Aranya Kand, Doha 35-36
- verify: https://heritage.iitk.ac.in/RCM/3.36
- lesson: Bhakti ka ek sachcha roop bhi Prabhu tak pahuncha deta hai.

### 36. Setu banane wale Nal
- id: ramayan-36-nal-vishwakarma
- deity: Nal / Shri Ram (Ram Setu)
- hook: Ram Setu banane wale Nal kiske putra the?
- hook_hi: राम सेतु बनाने वाले नल किसके पुत्र थे?
- fact: Samudra dev ne Shri Ram ko bataya, yeh vanar Nal Vishwakarma ke putra hain. Woh setu banayenge, aur main us setu ko dhaaran karoonga. Phir Nal ke netritva mein vanaron ne samudra par setu banaya.
- fact_hi: समुद्र देव ने श्री राम को बताया, यह वानर नल विश्वकर्मा के पुत्र हैं। वे सेतु बनाएँगे, और मैं उस सेतु को धारण करूँगा। फिर नल के नेतृत्व में वानरों ने समुद्र पर सेतु बनाया।
- source: Valmiki Ramayan, Yuddha Kand, Sarga 22
- verify: https://heritage.iitk.ac.in/VRAM/6.22.44
- lesson: Har kisi mein koi hunar chhupa hai; sahi samay par woh kaam aata hai.

### 37. Sita ji ne mana kyon kiya
- id: ramayan-37-sita-ka-uttar
- deity: Mata Sita / Hanuman ji
- hook: Mata Sita Hanuman ji ke saath kyon nahi aayin?
- hook_hi: माता सीता हनुमान जी के साथ क्यों नहीं आईं?
- fact: Hanuman ji ne Mata Sita ko peeth par bithakar Shri Ram ke paas le jaane ki baat kahi. Sita ji ne mana kar diya. Unhone kaha, uchit yahi hai ki Shri Ram swayam aakar Ravan ka ant karein aur mujhe le jaayen.
- fact_hi: हनुमान जी ने माता सीता को पीठ पर बिठाकर श्री राम के पास ले जाने की बात कही। सीता जी ने मना कर दिया। उन्होंने कहा, उचित यही है कि श्री राम स्वयं आकर रावण का अंत करें और मुझे ले जाएँ।
- source: Valmiki Ramayan, Sundar Kand, Sarga 37
- verify: https://heritage.iitk.ac.in/VRAM/5.37.62
- lesson: Maryada aur swabhimaan, Mata Sita ki shakti hain.

### 38. Solah varsh se kam
- id: ramayan-38-solah-varsh-se-kam
- deity: Shri Ram / Raja Dasharath
- hook: Vishwamitra ji aaye tab Shri Ram kitne bade the?
- hook_hi: विश्वामित्र जी आए तब श्री राम कितने बड़े थे?
- fact: Vishwamitra ji yagya ki raksha ke liye Shri Ram ko maangne aaye. Raja Dasharath ne kaha, mera kamal-nayan Ram abhi solah varsh ka bhi nahi hua. Unhone Ram ki jagah khud dhanush lekar chalne ki baat kahi.
- fact_hi: विश्वामित्र जी यज्ञ की रक्षा के लिए श्री राम को माँगने आए। राजा दशरथ ने कहा, मेरा कमल-नयन राम अभी सोलह वर्ष का भी नहीं हुआ। उन्होंने राम की जगह खुद धनुष लेकर चलने की बात कही।
- source: Valmiki Ramayan, Bal Kand, Sarga 20
- verify: https://heritage.iitk.ac.in/VRAM/1.20.2
- lesson: Pita ka prem santan ki har kathinai khud uthana chahta hai.

### 39. Indra ka rath
- id: ramayan-39-matali-rath
- deity: Shri Ram / Matali
- hook: Ravan se yuddh mein Shri Ram ka rath kisne chalaya?
- hook_hi: रावण से युद्ध में श्री राम का रथ किसने चलाया?
- fact: Ravan rath par tha, aur Shri Ram dharti par khade hokar lad rahe the. Tab Indra dev ne apne saarathi Matali ko apna rath dekar bheja. Shri Ram ne usi rath par baithkar yuddh kiya.
- fact_hi: रावण रथ पर था, और श्री राम धरती पर खड़े होकर लड़ रहे थे। तब इंद्र देव ने अपने सारथी मातलि को अपना रथ देकर भेजा। श्री राम ने उसी रथ पर बैठकर युद्ध किया।
- source: Valmiki Ramayan, Yuddha Kand, Sarga 103
- verify: https://heritage.iitk.ac.in/VRAM/6.103.7
- lesson: Dharm ki raah par chalne walon ko sahayata khud dhoondh leti hai.

### 40. Kumbhakarn ki saaf baat
- id: ramayan-40-kumbhakarn-salah
- deity: Kumbhakarn / Ravan (Ramayan)
- hook: Kumbhakarn ne jaagkar Ravan se kya kaha tha?
- hook_hi: कुंभकर्ण ने जागकर रावण से क्या कहा था?
- fact: Jagaye jaane par Kumbhakarn ne Ravan se saaf kaha, tumne yeh kaam bina soche, sirf bal ke ghamand mein kiya. Uska parinaam ab saamne aa gaya hai. Phir bhi bhai ka saath dene ke liye woh yuddh mein gaya.
- fact_hi: जगाए जाने पर कुंभकर्ण ने रावण से साफ़ बात कही। तुमने यह काम बिना सोचे, सिर्फ़ बल के घमंड में किया। उसका परिणाम अब सामने आ गया है। फिर भी भाई का साथ देने के लिए वह युद्ध में गया।
- source: Valmiki Ramayan, Yuddha Kand, Sarga 63
- verify: https://heritage.iitk.ac.in/VRAM/6.63.4
- lesson: Ghamand mein bina soche kiya kaam poore kul ko kasht deta hai.

### 41. Paduka ka rajya
- id: ramayan-41-bharat-paduka
- deity: Bharat ji / Shri Ram
- hook: Kya aap jaante hain? Bharat ji Ayodhya ke mahal mein nahi rahe!
- hook_hi: क्या आप जानते हैं? भरत जी अयोध्या के महल में नहीं रहे!
- fact: Bharat ji Chitrakoot se Shri Ram ki charan-paduka lekar laute. Unhone Ayodhya mein nahi, Nandigram mein rehkar raaj-kaaj chalaya. Paduka par chhatra lagakar, woh unhe hi raja maante rahe.
- fact_hi: भरत जी चित्रकूट से श्री राम की चरण-पादुका लेकर लौटे। उन्होंने अयोध्या में नहीं, नंदीग्राम में रहकर राज-काज चलाया। पादुका पर छत्र लगाकर, वे उन्हें ही राजा मानते रहे।
- source: Valmiki Ramayan, Ayodhya Kand, Sarga 112-115
- verify: https://heritage.iitk.ac.in/VRAM/2.115.16
- lesson: Sachcha tyag pad mein nahi, seva mein dikhta hai.

### 42. Gale mein phoolon ki bel
- id: ramayan-42-gajapushpi-mala
- deity: Sugriv / Shri Ram
- hook: Sugriv ke gale mein phoolon ki bel kyon daali gayi?
- hook_hi: सुग्रीव के गले में फूलों की बेल क्यों डाली गई?
- fact: Vali aur Sugriv ke pehle yuddh mein Shri Ram dono ko pehchaan nahi paaye, kyonki dono ek jaise dikhte the. Tab Shri Ram ke kehne par Lakshman ji ne Sugriv ke gale mein gajapushpi bel pehna di.
- fact_hi: बाली और सुग्रीव के पहले युद्ध में श्री राम दोनों को पहचान नहीं पाए। दोनों भाई एक जैसे दिखते थे। तब श्री राम के कहने पर लक्ष्मण जी ने सुग्रीव के गले में गजपुष्पी बेल पहना दी।
- source: Valmiki Ramayan, Kishkindha Kand, Sarga 12
- verify: https://heritage.iitk.ac.in/VRAM/4.12.39
- lesson: Sahi pehchaan ke bina sahi nyay nahi hota.

### 43. Marich samudra paar
- id: ramayan-43-marich-manav-astra
- deity: Shri Ram / Marich
- hook: Kya aap jaante hain? Shri Ram ka ek baan Marich ko samudra paar le gaya!
- hook_hi: क्या आप जानते हैं? श्री राम का एक बाण मारीच को समुद्र पार ले गया!
- fact: Vishwamitra ji ke yagya mein Shri Ram ne Marich par manav-astra chalaya. Valmiki Ramayan ke anusaar, woh astra use poore sau yojan door samudra mein le gaya. Shri Ram ne kaha, yeh astra use moorchhit karta hai, praan nahi leta.
- fact_hi: विश्वामित्र जी के यज्ञ में श्री राम ने मारीच पर मानव-अस्त्र चलाया। वाल्मीकि रामायण के अनुसार, वह अस्त्र उसे पूरे सौ योजन दूर समुद्र में ले गया। श्री राम ने कहा, यह अस्त्र उसे मूर्छित करता है, प्राण नहीं लेता।
- source: Valmiki Ramayan, Bal Kand, Sarga 30
- verify: https://heritage.iitk.ac.in/VRAM/1.30.17
- lesson: Shakti ke saath sanyam ho, tabhi woh dharm ki shakti hai.

### 44. Aditya Hriday
- id: ramayan-44-aditya-hriday
- deity: Shri Ram / Agastya muni / Surya dev
- hook: Shri Ram ko Aditya Hriday stotra kisne sikhaya tha?
- hook_hi: श्री राम को आदित्य हृदय स्तोत्र किसने सिखाया था?
- fact: Ravan se antim yuddh se pehle Agastya muni Shri Ram ke paas aaye. Unhone Shri Ram ko Aditya Hriday sikhaya, yaani Surya dev ki stuti. Unhone ise sanatan aur gupt stotra kaha.
- fact_hi: रावण से अंतिम युद्ध से पहले अगस्त्य मुनि श्री राम के पास आए। उन्होंने श्री राम को आदित्य हृदय सिखाया, यानी सूर्य देव की स्तुति। उन्होंने इसे सनातन और गुप्त स्तोत्र कहा।
- source: Valmiki Ramayan, Yuddha Kand, Sarga 107
- verify: https://heritage.iitk.ac.in/VRAM/6.107.3
- lesson: Bade sangharsh se pehle man ko shaant aur shraddha se bharna zaroori hai.

### 45. Mata Anasuya ka uphaar
- id: ramayan-45-anasuya-uphaar
- deity: Mata Sita / Mata Anasuya
- hook: Mata Anasuya ne Sita ji ko kya anokha uphaar diya?
- hook_hi: माता अनसूया ने सीता जी को क्या अनोखा उपहार दिया?
- fact: Atri muni ke ashram mein Mata Anasuya ne Sita ji ko divya mala, vastra, aabhushan aur angraag diye. Valmiki Ramayan ke anusaar, yeh sada shobha dene wale the, aur kabhi phike nahi padne wale the.
- fact_hi: अत्रि मुनि के आश्रम में माता अनसूया ने सीता जी को दिव्य माला, वस्त्र, आभूषण और अंगराग दिए। वाल्मीकि रामायण के अनुसार, ये सदा शोभा देने वाले थे, और कभी फीके नहीं पड़ने वाले थे।
- source: Valmiki Ramayan, Ayodhya Kand, Sarga 118
- verify: https://heritage.iitk.ac.in/VRAM/2.118.19
- lesson: Badon ka aashirvaad kabhi phika nahi padta.

### 46. Madhuvan ki khushi
- id: ramayan-46-madhuvan
- deity: Sugriv / vanar sena (Ramayan)
- hook: Sugriv ko Sita ji ki khabar ek baag se kaise mili?
- hook_hi: सुग्रीव को सीता जी की खबर एक बाग से कैसे मिली?
- fact: Lanka se laute vanaron ne khushi mein Sugriv ka Madhuvan ujaad diya. Rakhwale Dadhimukh ne Sugriv se shikayat ki. Sugriv samajh gaye ki Sita ji ka pata mil gaya hai, warna vanar aisa saahas nahi karte.
- fact_hi: लंका से लौटे वानरों ने खुशी में सुग्रीव का मधुवन उजाड़ दिया। रखवाले दधिमुख ने सुग्रीव से शिकायत की। सुग्रीव समझ गए कि सीता जी का पता मिल गया है, वरना वानर ऐसा साहस नहीं करते।
- source: Valmiki Ramayan, Sundar Kand, Sarga 61-63
- verify: https://heritage.iitk.ac.in/VRAM/5.63.1
- lesson: Samajhdar wahi jo shikayat mein bhi khushkhabri padh le.

### 47. Chaaron bhaiyon ka vivah
- id: ramayan-47-chaar-vivah
- deity: Shri Ram / Mata Sita / chaaron bhai
- hook: Kya aap jaante hain? Shri Ram ke saath teeno bhaiyon ka vivah bhi hua tha!
- hook_hi: क्या आप जानते हैं? श्री राम के साथ तीनों भाइयों का विवाह भी हुआ था!
- fact: Ek hi samaroh mein chaaron bhaiyon ka vivah hua. Shri Ram ka Mata Sita se, Lakshman ji ka Urmila ji se, Bharat ji ka Mandavi ji se, aur Shatrughna ji ka Shrutakirti ji se. Mandavi aur Shrutakirti, Janak ji ke bhai Kushadhwaj ki putriyan thin.
- fact_hi: एक ही समारोह में चारों भाइयों का विवाह हुआ। श्री राम का माता सीता से, लक्ष्मण जी का उर्मिला जी से। भरत जी का मांडवी जी से, और शत्रुघ्न जी का श्रुतकीर्ति जी से। मांडवी और श्रुतकीर्ति, जनक जी के भाई कुशध्वज की पुत्रियाँ थीं।
- source: Valmiki Ramayan, Bal Kand, Sarga 72-73
- verify: https://heritage.iitk.ac.in/VRAM/1.73.32
- lesson: Parivar ka mel hi sabse bada utsav hai.

### 48. Vibhishan ka vardan
- id: ramayan-48-vibhishan-vardan
- deity: Vibhishan / Brahma ji (Ramayan)
- hook: Vibhishan ne Brahma ji se kya vardan maanga tha?
- hook_hi: विभीषण ने ब्रह्मा जी से क्या वरदान माँगा था?
- fact: Brahma ji ne Vibhishan se vardan maangne ko kaha. Vibhishan ne maanga, badi se badi vipatti mein bhi mera man dharm mein hi lage. Brahma ji ne prasann hokar unhe amaratva bhi diya.
- fact_hi: ब्रह्मा जी ने विभीषण से वरदान माँगने को कहा। विभीषण ने माँगा, बड़ी से बड़ी विपत्ति में भी मेरा मन धर्म में ही लगे। ब्रह्मा जी ने प्रसन्न होकर उन्हें अमरत्व भी दिया।
- source: Valmiki Ramayan, Uttar Kand, Sarga 10
- verify: https://heritage.iitk.ac.in/VRAM/7.10.31
- lesson: Sabse bada vardan hai, mushkil mein bhi dharm na chhootna.

### 49. Naam wali anguthi
- id: ramayan-49-ram-mudrika
- deity: Hanuman ji / Shri Ram
- hook: Hanuman ji ko Shri Ram ne pehchaan ke liye kya diya tha?
- hook_hi: हनुमान जी को श्री राम ने पहचान के लिए क्या दिया था?
- fact: Sita ji ki khoj par jaate Hanuman ji ko Shri Ram ne apni anguthi di. Is anguthi par Shri Ram ka naam ankit tha. Yeh Sita ji ke liye pehchaan ka sanket thi.
- fact_hi: सीता जी की खोज पर जाते हनुमान जी को श्री राम ने अपनी अँगूठी दी। इस अँगूठी पर श्री राम का नाम अंकित था। यह सीता जी के लिए पहचान का संकेत थी।
- source: Valmiki Ramayan, Kishkindha Kand, Sarga 44
- verify: https://heritage.iitk.ac.in/VRAM/4.44.12
- lesson: Prabhu ka naam hi sabse badi pehchaan aur sabse bada sahara hai.

### 50. Mata Sita ki salah
- id: ramayan-50-sita-ki-salah
- deity: Mata Sita / Shri Ram
- hook: Mata Sita ne Shri Ram ko shastra ke baare mein kya salah di?
- hook_hi: माता सीता ने श्री राम को शस्त्र के बारे में क्या सलाह दी?
- fact: Dandakaranya mein Mata Sita ne Shri Ram se kaha, bina vair ke kisi par hinsa karna dosh hai. Shastra paas ho to man mein hinsa ki ichha jaag sakti hai. Shri Ram ne uttar diya ki unhone rishiyon ki raksha ka vachan diya hai.
- fact_hi: दंडकारण्य में माता सीता ने श्री राम से कहा, बिना वैर के किसी पर हिंसा करना दोष है। शस्त्र पास हो तो मन में हिंसा की इच्छा जाग सकती है। श्री राम ने उत्तर दिया कि उन्होंने ऋषियों की रक्षा का वचन दिया है।
- source: Valmiki Ramayan, Aranya Kand, Sarga 9-10
- verify: https://heritage.iitk.ac.in/VRAM/3.9.3
- lesson: Shakti ke saath vivek ho, tabhi woh raksha karti hai.

### 51. Rameshwar ki sthapana
- id: ramayan-51-rameshwar-sthapana
- deity: Shri Ram / Shiv ji (Rameshwaram)
- hook: Rameshwaram mein Shivling ki sthapana Shri Ram ne kyon ki?
- hook_hi: रामेश्वरम में शिवलिंग की स्थापना श्री राम ने क्यों की?
- fact: Ramcharitmanas mein setu ke paas Shri Ram ne kaha, main yahan Shambhu ki sthapana karoonga. Munivaron ko bulakar unhone vidhi se shivling sthapit karke pooja ki. Shri Ram ne kaha, Shiv ke samaan mujhe aur koi priya nahi.
- fact_hi: रामचरितमानस में सेतु के पास श्री राम ने कहा, मैं यहाँ शंभु की स्थापना करूँगा। मुनिवरों को बुलाकर उन्होंने विधि से शिवलिंग स्थापित करके पूजा की। श्री राम ने कहा, शिव के समान मुझे और कोई प्रिय नहीं।
- source: Shri Ramcharitmanas, Lanka Kand, Doha 2-3
- verify: https://heritage.iitk.ac.in/RCM/6.2
- lesson: Ram aur Shiv ek doosre ke priya hain; bhakti mein bhed nahi.

### 52. Gire hue aabhushan
- id: ramayan-52-sita-aabhushan
- deity: Mata Sita (Ramayan)
- hook: Mata Sita ne Shri Ram tak sandesh kaise bheja tha?
- hook_hi: माता सीता ने श्री राम तक संदेश कैसे भेजा था?
- fact: Ravan jab Sita ji ko le ja raha tha, to unhone ek parvat par kuch vanar dekhe. Sita ji ne apna sunehra uttariya aur aabhushan unke beech gira diye. Unhe aasha thi ki yeh sandesh Shri Ram tak pahunchega.
- fact_hi: रावण जब सीता जी को ले जा रहा था, तो उन्होंने एक पर्वत पर कुछ वानर देखे। सीता जी ने अपना सुनहरा उत्तरीय और आभूषण उनके बीच गिरा दिए। उन्हें आशा थी कि यह संदेश श्री राम तक पहुँचेगा।
- source: Valmiki Ramayan, Aranya Kand, Sarga 54
- verify: https://heritage.iitk.ac.in/VRAM/3.54.2
- lesson: Sankat mein bhi soojh-boojh na chhodna hi saahas hai.

### 53. Raaste mein Parshuram ji
- id: ramayan-53-parshuram-raaste-mein
- deity: Shri Ram / Parshuram ji
- hook: Valmiki Ramayan mein Parshuram ji Shri Ram se kahan mile the?
- hook_hi: वाल्मीकि रामायण में परशुराम जी श्री राम से कहाँ मिले थे?
- fact: Valmiki Ramayan mein vivah ke baad Ayodhya lautte samay raaste mein Parshuram ji mile. Unhone Shri Ram ko Vishnu ji ka dhanush chadhane ki chunauti di. Shri Ram ne dhanush chadha diya, aur Parshuram ji Mahendra parvat laut gaye.
- fact_hi: वाल्मीकि रामायण में विवाह के बाद अयोध्या लौटते समय रास्ते में परशुराम जी मिले। उन्होंने श्री राम को विष्णु जी का धनुष चढ़ाने की चुनौती दी। श्री राम ने धनुष चढ़ा दिया, और परशुराम जी महेंद्र पर्वत लौट गए।
- source: Valmiki Ramayan, Bal Kand, Sarga 74-76
- verify: https://heritage.iitk.ac.in/VRAM/1.75.1
- lesson: Vinamrata se diya uttar har chunauti ko shaant kar deta hai.

### 54. Teen raat ki pratiksha
- id: ramayan-54-samudra-teen-raat
- deity: Shri Ram / Samudra dev
- hook: Shri Ram samudra ke kinare kitni raat ruke the?
- hook_hi: श्री राम समुद्र के किनारे कितनी रात रुके थे?
- fact: Lanka jaane ke liye Shri Ram ne samudra se maarg maanga. Woh teen raat kush ki chatai par niyam se lete rahe. Samudra prakat nahi hua, tab Shri Ram ne dhanush uthaya.
- fact_hi: लंका जाने के लिए श्री राम ने समुद्र से मार्ग माँगा। वे तीन रात कुश की चटाई पर नियम से लेटे रहे। समुद्र प्रकट नहीं हुआ, तब श्री राम ने धनुष उठाया।
- source: Valmiki Ramayan, Yuddha Kand, Sarga 21
- verify: https://heritage.iitk.ac.in/VRAM/6.21.10
- lesson: Pehle vinay, phir dridhta; yahi Shri Ram ki neeti hai.

### 55. Jatayu ka antim sanskar
- id: ramayan-55-jatayu-sanskar
- deity: Shri Ram / Jatayu
- hook: Shri Ram ne kis pakshi ka antim sanskar khud kiya tha?
- hook_hi: श्री राम ने किस पक्षी का अंतिम संस्कार खुद किया था?
- fact: Jatayu ne Sita ji ko bachane ke liye Ravan se yuddh kiya. Ghayal Jatayu ne Shri Ram ko sab bataya aur sharir tyag diya. Shri Ram ne swayam unka antim sanskar kiya, jaise koi apne parijan ka karta hai.
- fact_hi: जटायु ने सीता जी को बचाने के लिए रावण से युद्ध किया। घायल जटायु ने श्री राम को सब बताया और शरीर त्याग दिया। श्री राम ने स्वयं उनका अंतिम संस्कार किया, जैसे कोई अपने परिजन का करता है।
- source: Valmiki Ramayan, Aranya Kand, Sarga 68
- verify: https://heritage.iitk.ac.in/VRAM/3.68.31
- lesson: Jo dharm ke liye lade, woh parivar jaisa hi hai.

### 56. Chehre par koi badlav nahi
- id: ramayan-56-ram-ka-dhairya
- deity: Shri Ram (vanvaas)
- hook: Vanvaas ka aadesh sunkar Shri Ram ka man kaisa tha?
- hook_hi: वनवास का आदेश सुनकर श्री राम का मन कैसा था?
- fact: Rajya chhodkar van jaane ka aadesh sunkar bhi Shri Ram ke man mein koi vikaar nahi dikha. Valmiki ji likhte hain, jaise koi sansar ki baaton se upar ho, waise hi unka chitt shaant raha.
- fact_hi: राज्य छोड़कर वन जाने का आदेश सुनकर भी श्री राम के मन में कोई विकार नहीं दिखा। वाल्मीकि जी लिखते हैं, जैसे कोई संसार की बातों से ऊपर हो, वैसे ही उनका चित्त शांत रहा।
- source: Valmiki Ramayan, Ayodhya Kand, Sarga 19
- verify: https://heritage.iitk.ac.in/VRAM/2.19.33
- lesson: Sukh ho ya dukh, man ka santulan hi sabse badi shakti hai.

### 57. Tulsidas ji ki tithi
- id: ramayan-57-manas-aarambh
- deity: Goswami Tulsidas ji (Ramcharitmanas)
- hook: Tulsidas ji ne Ramcharitmanas kab likhna shuru kiya tha?
- hook_hi: तुलसीदास जी ने रामचरितमानस कब लिखना शुरू किया था?
- fact: Goswami Tulsidas ji ne Ramcharitmanas mein khud likha hai ki katha kab shuru hui. Samvat solah sau iktees mein, Chaitra maas ki Navami tithi ko. Us din mangalvaar tha, aur sthaan tha Ayodhya.
- fact_hi: गोस्वामी तुलसीदास जी ने रामचरितमानस में खुद लिखा है कि कथा कब शुरू हुई। संवत सोलह सौ इकतीस में, चैत्र मास की नवमी तिथि को। उस दिन मंगलवार था, और स्थान था अयोध्या।
- source: Shri Ramcharitmanas, Bal Kand, Doha 34
- verify: https://heritage.iitk.ac.in/RCM/1.34
- lesson: Shubh kaam ke liye Prabhu ka naam aur pavitra sthaan, dono saath rakhein.

### 58. Kaikeyi ke purane vardan
- id: ramayan-58-kaikeyi-vardan
- deity: Kaikeyi / Raja Dasharath
- hook: Kaikeyi ke do vardan kahan se aaye the?
- hook_hi: कैकेयी के दो वरदान कहाँ से आए थे?
- fact: Kaikeyi ke do vardan bahut purane the. Devasur sangram mein Shambar se yuddh ke samay Kaikeyi ne ghayal Raja Dasharath ki raksha ki thi. Tab Dasharath ji ne unhe do vardan diye, jo Manthara ne unhe yaad dilaye.
- fact_hi: कैकेयी के दो वरदान बहुत पुराने थे। देवासुर संग्राम में शंबर से युद्ध के समय कैकेयी ने घायल राजा दशरथ की रक्षा की थी। तब दशरथ जी ने उन्हें दो वरदान दिए, जो मंथरा ने उन्हें याद दिलाए।
- source: Valmiki Ramayan, Ayodhya Kand, Sarga 9
- verify: https://heritage.iitk.ac.in/VRAM/2.9.17
- lesson: Diya hua vachan samay aane par poora karna padta hai; isliye vachan soch-samajhkar dein.

### 59. Motiyon ka haar
- id: ramayan-59-sita-haar-hanuman
- deity: Mata Sita / Hanuman ji
- hook: Mata Sita ne apna motiyon ka haar kise diya tha?
- hook_hi: माता सीता ने अपना मोतियों का हार किसे दिया था?
- fact: Rajyabhishek ke baad Mata Sita ne apne gale ka motiyon ka haar utaara. Shri Ram ne kaha, jis par tum prasann ho, use de do. Sita ji ne woh haar Hanuman ji ko de diya.
- fact_hi: राज्याभिषेक के बाद माता सीता ने अपने गले का मोतियों का हार उतारा। श्री राम ने कहा, जिस पर तुम प्रसन्न हो, उसे दे दो। सीता जी ने वह हार हनुमान जी को दे दिया।
- source: Valmiki Ramayan, Yuddha Kand, Sarga 131
- verify: https://heritage.iitk.ac.in/VRAM/6.131.83
- lesson: Sachchi seva ka maan Prabhu khud karte hain.

### 60. Hanuman ji ka vardan
- id: ramayan-60-hanuman-vardan
- deity: Hanuman ji / Shri Ram
- hook: Hanuman ji ne Shri Ram se kaun sa vardan maanga tha?
- hook_hi: हनुमान जी ने श्री राम से कौन सा वरदान माँगा था?
- fact: Shri Ram ke rajyabhishek ke baad Hanuman ji ne vardan maanga. Jab tak dharti par Ram katha chalti rahe, tab tak mere praan is sharir mein rahein. Shri Ram ne kaha, aisa hi hoga.
- fact_hi: श्री राम के राज्याभिषेक के बाद हनुमान जी ने वरदान माँगा। जब तक धरती पर राम कथा चलती रहे, तब तक मेरे प्राण इस शरीर में रहें। श्री राम ने कहा, ऐसा ही होगा।
- source: Valmiki Ramayan, Uttar Kand, Sarga 40
- verify: https://heritage.iitk.ac.in/VRAM/7.40.16
- lesson: Jahan Ram katha hoti hai, wahan Hanuman ji ki kripa hoti hai.
