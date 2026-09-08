/**
 * The verse corpus behind Gita Daily and the mood finder.
 *
 * A note on the translations, because it matters legally as well as
 * editorially: the Sanskrit is ancient and belongs to everyone, but modern
 * English and Hindi translations do not. Srila Prabhupada's renderings in
 * *Bhagavad-gita As It Is* are the BBT's copyright and are not reproduced
 * here. What follows are plain, literal renderings written for this site —
 * deliberately unadorned, with no purport — and the tools point a reader who
 * wants the full translation and commentary at the real book.
 *
 * Each record carries:
 *   `id`          "chapter.verse", and the stable key everything else uses
 *   `sanskrit`    Devanagari, one string per line of the sloka
 *   `roman`       IAST transliteration, matching lines
 *   `translation` the rendering, per locale
 *   `theme`       one line on why someone in this state might want it
 *   `moods`       which tiles of the mood grid it answers
 *   `speaker`     krishna | arjuna | sanjaya — a Gita Daily clue
 *   `keyword`     a distinctive Sanskrit word — the last clue before the answer
 *
 * Adding a verse is adding a record. Nothing indexes them by position, so the
 * order here is only reading order.
 */

export const VERSES = [
  {
    id: "2.3",
    chapter: 2,
    verse: 3,
    speaker: "krishna",
    keyword: "hṛdaya-daurbalyam",
    sanskrit: [
      "क्लैब्यं मा स्म गमः पार्थ नैतत्त्वय्युपपद्यते।",
      "क्षुद्रं हृदयदौर्बल्यं त्यक्त्वोत्तिष्ठ परन्तप॥",
    ],
    roman: [
      "klaibyaṁ mā sma gamaḥ pārtha naitat tvayy upapadyate",
      "kṣudraṁ hṛdaya-daurbalyaṁ tyaktvottiṣṭha parantapa",
    ],
    translation: {
      en: "Do not give in to this weakness, Partha. It does not suit you. Shake off this petty faintness of heart and stand up, scorcher of foes.",
      hi: "हे पार्थ, इस नपुंसकता को मत प्राप्त हो। यह तुम्हें शोभा नहीं देती। हृदय की इस तुच्छ दुर्बलता को त्यागकर खड़े हो जाओ, हे परंतप।",
    },
    theme: {
      en: "The first thing Krishna says to a man who has sat down and given up.",
      hi: "जो हार मानकर बैठ गया, कृष्ण उससे सबसे पहले यही कहते हैं।",
    },
    moods: ["unmotivated", "failing"],
  },
  {
    id: "2.13",
    chapter: 2,
    verse: 13,
    speaker: "krishna",
    keyword: "dehāntara-prāptiḥ",
    sanskrit: [
      "देहिनोऽस्मिन्यथा देहे कौमारं यौवनं जरा।",
      "तथा देहान्तरप्राप्तिर्धीरस्तत्र न मुह्यति॥",
    ],
    roman: [
      "dehino 'smin yathā dehe kaumāraṁ yauvanaṁ jarā",
      "tathā dehāntara-prāptir dhīras tatra na muhyati",
    ],
    translation: {
      en: "Just as the embodied soul passes through childhood, youth and old age in this body, so it passes into another body. A steady person is not bewildered by this.",
      hi: "जैसे देहधारी आत्मा इस शरीर में बालपन, जवानी और वृद्धावस्था से गुजरता है, वैसे ही वह दूसरा शरीर प्राप्त करता है। धीर व्यक्ति इससे मोहित नहीं होता।",
    },
    theme: {
      en: "Death read as one more change of clothes, in a body that has already changed many times.",
      hi: "मृत्यु को उसी क्रम में देखा गया है जिसमें शरीर पहले भी कई बार बदल चुका है।",
    },
    moods: ["grieving", "afraid"],
  },
  {
    id: "2.14",
    chapter: 2,
    verse: 14,
    speaker: "krishna",
    keyword: "titikṣasva",
    sanskrit: [
      "मात्रास्पर्शास्तु कौन्तेय शीतोष्णसुखदुःखदाः।",
      "आगमापायिनोऽनित्यास्तांस्तितिक्षस्व भारत॥",
    ],
    roman: [
      "mātrā-sparśās tu kaunteya śītoṣṇa-sukha-duḥkha-dāḥ",
      "āgamāpāyino 'nityās tāṁs titikṣasva bhārata",
    ],
    translation: {
      en: "Contact with the senses, Kaunteya, brings cold and heat, pleasure and pain. These come and go and do not last. Bear them patiently, Bharata.",
      hi: "हे कुन्तीपुत्र, इन्द्रियों का विषयों से संपर्क सर्दी-गर्मी और सुख-दुख देता है। ये आते-जाते रहते हैं, स्थायी नहीं हैं। हे भारत, इन्हें सहन करो।",
    },
    theme: {
      en: "The verse for a bad week: this is weather, and weather moves.",
      hi: "कठिन समय के लिए — यह मौसम है, और मौसम बदलता है।",
    },
    moods: ["overwhelmed", "grieving", "restless"],
  },
  {
    id: "2.20",
    chapter: 2,
    verse: 20,
    speaker: "krishna",
    keyword: "ajo nityaḥ",
    sanskrit: [
      "न जायते म्रियते वा कदाचिन्",
      "नायं भूत्वा भविता वा न भूयः।",
      "अजो नित्यः शाश्वतोऽयं पुराणो",
      "न हन्यते हन्यमाने शरीरे॥",
    ],
    roman: [
      "na jāyate mriyate vā kadācin",
      "nāyaṁ bhūtvā bhavitā vā na bhūyaḥ",
      "ajo nityaḥ śāśvato 'yaṁ purāṇo",
      "na hanyate hanyamāne śarīre",
    ],
    translation: {
      en: "The soul is never born and never dies. It did not come into being, and it will not cease to be. Unborn, eternal, ever-existing and ancient, it is not slain when the body is slain.",
      hi: "आत्मा न कभी जन्म लेता है, न मरता है। यह न उत्पन्न हुआ है, न कभी समाप्त होगा। अजन्मा, नित्य, शाश्वत और पुरातन यह आत्मा शरीर के मारे जाने पर भी नहीं मारा जाता।",
    },
    theme: {
      en: "Read at funerals for two thousand years, and still the plainest thing said about death.",
      hi: "दो हजार वर्षों से अंत्येष्टि में पढ़ा गया — मृत्यु पर कही गई सबसे सीधी बात।",
    },
    moods: ["grieving", "afraid"],
  },
  {
    id: "2.22",
    chapter: 2,
    verse: 22,
    speaker: "krishna",
    keyword: "vāsāṁsi jīrṇāni",
    sanskrit: [
      "वासांसि जीर्णानि यथा विहाय",
      "नवानि गृह्णाति नरोऽपराणि।",
      "तथा शरीराणि विहाय जीर्णा-",
      "न्यन्यानि संयाति नवानि देही॥",
    ],
    roman: [
      "vāsāṁsi jīrṇāni yathā vihāya",
      "navāni gṛhṇāti naro 'parāṇi",
      "tathā śarīrāṇi vihāya jīrṇāny",
      "anyāni saṁyāti navāni dehī",
    ],
    translation: {
      en: "As a person puts aside worn-out clothes and takes up new ones, so the embodied soul puts aside worn-out bodies and enters others that are new.",
      hi: "जैसे मनुष्य पुराने वस्त्र त्यागकर नए वस्त्र धारण करता है, वैसे ही देहधारी आत्मा जीर्ण शरीरों को छोड़कर नए शरीर धारण करता है।",
    },
    theme: {
      en: "The image everyone remembers, because it makes the idea ordinary.",
      hi: "वह उपमा जो सबको याद रह जाती है — क्योंकि वह बात को साधारण बना देती है।",
    },
    moods: ["grieving", "afraid"],
  },
  {
    id: "2.23",
    chapter: 2,
    verse: 23,
    speaker: "krishna",
    keyword: "nainaṁ chindanti",
    sanskrit: [
      "नैनं छिन्दन्ति शस्त्राणि नैनं दहति पावकः।",
      "न चैनं क्लेदयन्त्यापो न शोषयति मारुतः॥",
    ],
    roman: [
      "nainaṁ chindanti śastrāṇi nainaṁ dahati pāvakaḥ",
      "na cainaṁ kledayanty āpo na śoṣayati mārutaḥ",
    ],
    translation: {
      en: "Weapons cannot cut the soul, fire cannot burn it, water cannot wet it, wind cannot dry it.",
      hi: "इस आत्मा को शस्त्र काट नहीं सकते, अग्नि जला नहीं सकती, जल भिगो नहीं सकता और वायु सुखा नहीं सकती।",
    },
    theme: {
      en: "Four things that destroy everything else, and none of them touches you.",
      hi: "चार शक्तियाँ जो सब कुछ नष्ट कर देती हैं — और आत्मा को छू भी नहीं पातीं।",
    },
    moods: ["afraid", "grieving"],
  },
  {
    id: "2.47",
    chapter: 2,
    verse: 47,
    speaker: "krishna",
    keyword: "mā phaleṣu kadācana",
    sanskrit: [
      "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।",
      "मा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥",
    ],
    roman: [
      "karmaṇy evādhikāras te mā phaleṣu kadācana",
      "mā karma-phala-hetur bhūr mā te saṅgo 'stv akarmaṇi",
    ],
    translation: {
      en: "You have a right to your work, never to its fruits. Do not make the fruit your motive, and do not be attached to inaction either.",
      hi: "तुम्हारा अधिकार केवल कर्म पर है, फल पर कभी नहीं। फल को अपने कर्म का हेतु मत बनाओ, और अकर्म में भी आसक्त मत हो।",
    },
    theme: {
      en: "The most quoted line in the book, and the one most often stopped halfway — the second half forbids giving up.",
      hi: "गीता की सबसे उद्धृत पंक्ति — जिसका दूसरा भाग अक्सर छूट जाता है: कर्म छोड़ना भी मना है।",
    },
    moods: ["anxious", "overwhelmed", "failing"],
  },
  {
    id: "2.48",
    chapter: 2,
    verse: 48,
    speaker: "krishna",
    keyword: "samatvaṁ yoga ucyate",
    sanskrit: [
      "योगस्थः कुरु कर्माणि सङ्गं त्यक्त्वा धनञ्जय।",
      "सिद्ध्यसिद्ध्योः समो भूत्वा समत्वं योग उच्यते॥",
    ],
    roman: [
      "yoga-sthaḥ kuru karmāṇi saṅgaṁ tyaktvā dhanañjaya",
      "siddhy-asiddhyoḥ samo bhūtvā samatvaṁ yoga ucyate",
    ],
    translation: {
      en: "Do your work established in yoga, Dhananjaya, giving up attachment, even-minded in success and failure. Evenness of mind is what yoga means.",
      hi: "हे धनंजय, आसक्ति त्यागकर, सिद्धि और असिद्धि में समान रहकर योग में स्थित होकर कर्म करो। समत्व ही योग कहलाता है।",
    },
    theme: {
      en: "A definition of yoga with no mat in it.",
      hi: "योग की एक परिभाषा, जिसमें आसन का कोई उल्लेख नहीं।",
    },
    moods: ["anxious", "failing", "seeking"],
  },
  {
    id: "2.56",
    chapter: 2,
    verse: 56,
    speaker: "krishna",
    keyword: "sthita-dhīr muniḥ",
    sanskrit: [
      "दुःखेष्वनुद्विग्नमनाः सुखेषु विगतस्पृहः।",
      "वीतरागभयक्रोधः स्थितधीर्मुनिरुच्यते॥",
    ],
    roman: [
      "duḥkheṣv anudvigna-manāḥ sukheṣu vigata-spṛhaḥ",
      "vīta-rāga-bhaya-krodhaḥ sthita-dhīr munir ucyate",
    ],
    translation: {
      en: "One whose mind is undisturbed in sorrow and who does not crave in happiness, who is free from longing, fear and anger, is called steady in wisdom.",
      hi: "जो दुख में विचलित नहीं होता, सुख में लालायित नहीं होता, और जो राग, भय तथा क्रोध से मुक्त है — वह स्थितप्रज्ञ मुनि कहलाता है।",
    },
    theme: {
      en: "A portrait of steadiness, given as a checklist rather than an ideal.",
      hi: "स्थिरता का चित्र — आदर्श के रूप में नहीं, एक सूची के रूप में।",
    },
    moods: ["anxious", "angry", "restless"],
  },
  {
    id: "2.62",
    chapter: 2,
    verse: 62,
    speaker: "krishna",
    keyword: "kāmāt krodho 'bhijāyate",
    sanskrit: [
      "ध्यायतो विषयान्पुंसः सङ्गस्तेषूपजायते।",
      "सङ्गात्सञ्जायते कामः कामात्क्रोधोऽभिजायते॥",
    ],
    roman: [
      "dhyāyato viṣayān puṁsaḥ saṅgas teṣūpajāyate",
      "saṅgāt sañjāyate kāmaḥ kāmāt krodho 'bhijāyate",
    ],
    translation: {
      en: "Dwelling on the objects of the senses, a person becomes attached to them. From attachment desire is born, and from desire, anger.",
      hi: "विषयों का चिंतन करते रहने से मनुष्य की उनमें आसक्ति हो जाती है। आसक्ति से कामना उत्पन्न होती है, और कामना से क्रोध।",
    },
    theme: {
      en: "Anger traced back to its beginning, which is somewhere much earlier than the thing that made you angry.",
      hi: "क्रोध की जड़ — जो उस घटना से बहुत पहले है जिसने क्रोध दिलाया।",
    },
    moods: ["angry", "tempted", "restless"],
  },
  {
    id: "2.70",
    chapter: 2,
    verse: 70,
    speaker: "krishna",
    keyword: "samudram āpaḥ",
    sanskrit: [
      "आपूर्यमाणमचलप्रतिष्ठं",
      "समुद्रमापः प्रविशन्ति यद्वत्।",
      "तद्वत्कामा यं प्रविशन्ति सर्वे",
      "स शान्तिमाप्नोति न कामकामी॥",
    ],
    roman: [
      "āpūryamāṇam acala-pratiṣṭhaṁ",
      "samudram āpaḥ praviśanti yadvat",
      "tadvat kāmā yaṁ praviśanti sarve",
      "sa śāntim āpnoti na kāma-kāmī",
    ],
    translation: {
      en: "As rivers enter the ocean, which is filled yet never moved from its place, so desires enter one who is at peace — not one who chases them.",
      hi: "जैसे नदियाँ समुद्र में प्रवेश करती हैं और समुद्र भरा रहकर भी अविचल रहता है, वैसे ही जिसमें सारी कामनाएँ प्रवेश करती हैं वही शांति पाता है — कामनाओं के पीछे भागने वाला नहीं।",
    },
    theme: {
      en: "Peace is not the absence of wanting. It is not being moved by it.",
      hi: "शांति कामना का अभाव नहीं — उससे विचलित न होना है।",
    },
    moods: ["tempted", "restless", "seeking"],
  },
  {
    id: "3.21",
    chapter: 3,
    verse: 21,
    speaker: "krishna",
    keyword: "śreṣṭhaḥ",
    sanskrit: [
      "यद्यदाचरति श्रेष्ठस्तत्तदेवेतरो जनः।",
      "स यत्प्रमाणं कुरुते लोकस्तदनुवर्तते॥",
    ],
    roman: [
      "yad yad ācarati śreṣṭhas tat tad evetaro janaḥ",
      "sa yat pramāṇaṁ kurute lokas tad anuvartate",
    ],
    translation: {
      en: "Whatever a great person does, others follow. Whatever standard they set by their acts, the world pursues.",
      hi: "श्रेष्ठ पुरुष जो-जो आचरण करता है, अन्य लोग वही करते हैं। वह जो प्रमाण स्थापित करता है, संसार उसी का अनुसरण करता है।",
    },
    theme: {
      en: "Why the practice of one person is never only their own business.",
      hi: "एक व्यक्ति का आचरण कभी केवल उसका निजी विषय क्यों नहीं होता।",
    },
    moods: ["seeking", "lost"],
  },
  {
    id: "3.35",
    chapter: 3,
    verse: 35,
    speaker: "krishna",
    keyword: "sva-dharme nidhanaṁ",
    sanskrit: [
      "श्रेयान्स्वधर्मो विगुणः परधर्मात्स्वनुष्ठितात्।",
      "स्वधर्मे निधनं श्रेयः परधर्मो भयावहः॥",
    ],
    roman: [
      "śreyān sva-dharmo viguṇaḥ para-dharmāt sv-anuṣṭhitāt",
      "sva-dharme nidhanaṁ śreyaḥ para-dharmo bhayāvahaḥ",
    ],
    translation: {
      en: "Better one's own duty done imperfectly than another's duty done well. Better to die in one's own duty; another's duty brings danger.",
      hi: "दूसरे के धर्म को भली-भाँति करने की अपेक्षा अपना धर्म दोषपूर्ण ढंग से करना भी श्रेष्ठ है। अपने धर्म में मरना भी कल्याणकारी है; पराया धर्म भयावह है।",
    },
    theme: {
      en: "For anyone measuring their life against somebody else's.",
      hi: "उनके लिए जो अपना जीवन किसी और के जीवन से नापते हैं।",
    },
    moods: ["lost", "failing", "doubting"],
  },
  {
    id: "4.7",
    chapter: 4,
    verse: 7,
    speaker: "krishna",
    keyword: "sṛjāmy aham",
    sanskrit: [
      "यदा यदा हि धर्मस्य ग्लानिर्भवति भारत।",
      "अभ्युत्थानमधर्मस्य तदात्मानं सृजाम्यहम्॥",
    ],
    roman: [
      "yadā yadā hi dharmasya glānir bhavati bhārata",
      "abhyutthānam adharmasya tadātmānaṁ sṛjāmy aham",
    ],
    translation: {
      en: "Whenever righteousness declines, Bharata, and unrighteousness rises, then I send Myself forth.",
      hi: "हे भारत, जब-जब धर्म की हानि होती है और अधर्म का उत्थान होता है, तब-तब मैं स्वयं को प्रकट करता हूँ।",
    },
    theme: {
      en: "Krishna's own account of why He appears at all.",
      hi: "कृष्ण स्वयं बताते हैं कि वे अवतरित क्यों होते हैं।",
    },
    moods: ["doubting", "seeking"],
  },
  {
    id: "4.34",
    chapter: 4,
    verse: 34,
    speaker: "krishna",
    keyword: "paripraśnena sevayā",
    sanskrit: [
      "तद्विद्धि प्रणिपातेन परिप्रश्नेन सेवया।",
      "उपदेक्ष्यन्ति ते ज्ञानं ज्ञानिनस्तत्त्वदर्शिनः॥",
    ],
    roman: [
      "tad viddhi praṇipātena paripraśnena sevayā",
      "upadekṣyanti te jñānaṁ jñāninas tattva-darśinaḥ",
    ],
    translation: {
      en: "Learn it by approaching humbly, by asking questions and by service. Those who have seen the truth will teach you knowledge.",
      hi: "उस ज्ञान को विनम्रता से जाकर, प्रश्न पूछकर और सेवा करके जानो। तत्त्वदर्शी ज्ञानी तुम्हें ज्ञान का उपदेश देंगे।",
    },
    theme: {
      en: "Questions are not doubted here — they are the method.",
      hi: "यहाँ प्रश्नों पर संदेह नहीं — वे ही मार्ग हैं।",
    },
    moods: ["doubting", "seeking", "lost"],
  },
  {
    id: "4.39",
    chapter: 4,
    verse: 39,
    speaker: "krishna",
    keyword: "śraddhāvāl labhate jñānam",
    sanskrit: [
      "श्रद्धावाँल्लभते ज्ञानं तत्परः संयतेन्द्रियः।",
      "ज्ञानं लब्ध्वा परां शान्तिमचिरेणाधिगच्छति॥",
    ],
    roman: [
      "śraddhāvāl labhate jñānaṁ tat-paraḥ saṁyatendriyaḥ",
      "jñānaṁ labdhvā parāṁ śāntim acireṇādhigacchati",
    ],
    translation: {
      en: "One with faith, devoted to it and restrained in the senses, obtains knowledge — and having obtained it, quickly reaches the highest peace.",
      hi: "श्रद्धावान, तत्पर और जितेन्द्रिय मनुष्य ज्ञान प्राप्त करता है, और ज्ञान पाकर शीघ्र ही परम शांति को प्राप्त होता है।",
    },
    theme: {
      en: "Faith listed first, as the thing that makes learning possible at all.",
      hi: "श्रद्धा सबसे पहले — क्योंकि उसी से सीखना संभव होता है।",
    },
    moods: ["doubting", "seeking"],
  },
  {
    id: "5.22",
    chapter: 5,
    verse: 22,
    speaker: "krishna",
    keyword: "duḥkha-yonaya eva te",
    sanskrit: [
      "ये हि संस्पर्शजा भोगा दुःखयोनय एव ते।",
      "आद्यन्तवन्तः कौन्तेय न तेषु रमते बुधः॥",
    ],
    roman: [
      "ye hi saṁsparśa-jā bhogā duḥkha-yonaya eva te",
      "ādy-antavantaḥ kaunteya na teṣu ramate budhaḥ",
    ],
    translation: {
      en: "Pleasures born of contact with the senses are wombs of misery. They have a beginning and an end, Kaunteya, and the wise do not delight in them.",
      hi: "इन्द्रिय-संपर्क से उत्पन्न भोग दुख के ही कारण हैं। हे कुन्तीपुत्र, इनका आदि और अंत है, इसलिए बुद्धिमान इनमें रमण नहीं करते।",
    },
    theme: {
      en: "Not a prohibition — an observation about how these things actually end.",
      hi: "यह निषेध नहीं, एक अवलोकन है — कि ये चीज़ें अंततः कहाँ ले जाती हैं।",
    },
    moods: ["tempted", "guilty"],
  },
  {
    id: "5.29",
    chapter: 5,
    verse: 29,
    speaker: "krishna",
    keyword: "suhṛdaṁ sarva-bhūtānām",
    sanskrit: [
      "भोक्तारं यज्ञतपसां सर्वलोकमहेश्वरम्।",
      "सुहृदं सर्वभूतानां ज्ञात्वा मां शान्तिमृच्छति॥",
    ],
    roman: [
      "bhoktāraṁ yajña-tapasāṁ sarva-loka-maheśvaram",
      "suhṛdaṁ sarva-bhūtānāṁ jñātvā māṁ śāntim ṛcchati",
    ],
    translation: {
      en: "Knowing Me as the enjoyer of sacrifice and austerity, the great lord of all worlds, and the well-wishing friend of every living being, one attains peace.",
      hi: "मुझे यज्ञ और तप का भोक्ता, समस्त लोकों का महेश्वर तथा सभी प्राणियों का सुहृद जानकर मनुष्य शांति प्राप्त करता है।",
    },
    theme: {
      en: "Three words in, and the last one is 'friend'.",
      hi: "तीन परिचय दिए गए — और अंतिम है 'सुहृद', मित्र।",
    },
    moods: ["lonely", "anxious", "seeking"],
  },
  {
    id: "6.5",
    chapter: 6,
    verse: 5,
    speaker: "krishna",
    keyword: "ātmaiva hy ātmano bandhuḥ",
    sanskrit: [
      "उद्धरेदात्मनात्मानं नात्मानमवसादयेत्।",
      "आत्मैव ह्यात्मनो बन्धुरात्मैव रिपुरात्मनः॥",
    ],
    roman: [
      "uddhared ātmanātmānaṁ nātmānam avasādayet",
      "ātmaiva hy ātmano bandhur ātmaiva ripur ātmanaḥ",
    ],
    translation: {
      en: "Lift yourself by your own self; do not drag yourself down. For the self alone is the friend of the self, and the self alone is its enemy.",
      hi: "अपने द्वारा अपना उद्धार करो, अपने को गिराओ मत। क्योंकि आत्मा ही आत्मा का मित्र है और आत्मा ही आत्मा का शत्रु।",
    },
    theme: {
      en: "For a bad day of self-attack: the same person is both parties.",
      hi: "जब मन स्वयं पर ही प्रहार करे — दोनों पक्ष एक ही व्यक्ति हैं।",
    },
    moods: ["guilty", "failing", "unmotivated"],
  },
  {
    id: "6.17",
    chapter: 6,
    verse: 17,
    speaker: "krishna",
    keyword: "yuktāhāra-vihārasya",
    sanskrit: [
      "युक्ताहारविहारस्य युक्तचेष्टस्य कर्मसु।",
      "युक्तस्वप्नावबोधस्य योगो भवति दुःखहा॥",
    ],
    roman: [
      "yuktāhāra-vihārasya yukta-ceṣṭasya karmasu",
      "yukta-svapnāvabodhasya yogo bhavati duḥkha-hā",
    ],
    translation: {
      en: "For one who is regulated in eating and recreation, in effort at work, and in sleeping and waking, yoga becomes the destroyer of sorrow.",
      hi: "जिसका आहार-विहार संयमित है, कर्मों में चेष्टा संयमित है, और सोना-जागना संयमित है — उसके लिए योग दुखों का नाश करने वाला होता है।",
    },
    theme: {
      en: "Sleep, food and hours listed as spiritual practice, which is what a sadhana card is for.",
      hi: "नींद, भोजन और समय — इन्हें साधना कहा गया है, और साधना-पत्रक इसी के लिए है।",
    },
    moods: ["restless", "unmotivated", "overwhelmed"],
  },
  {
    id: "6.30",
    chapter: 6,
    verse: 30,
    speaker: "krishna",
    keyword: "na praṇaśyāmi",
    sanskrit: [
      "यो मां पश्यति सर्वत्र सर्वं च मयि पश्यति।",
      "तस्याहं न प्रणश्यामि स च मे न प्रणश्यति॥",
    ],
    roman: [
      "yo māṁ paśyati sarvatra sarvaṁ ca mayi paśyati",
      "tasyāhaṁ na praṇaśyāmi sa ca me na praṇaśyati",
    ],
    translation: {
      en: "For one who sees Me everywhere and sees everything in Me, I am never lost, and he is never lost to Me.",
      hi: "जो मुझे सर्वत्र देखता है और सब कुछ मुझमें देखता है, उसके लिए मैं कभी अदृश्य नहीं होता, और वह मेरे लिए कभी खोया नहीं जाता।",
    },
    theme: {
      en: "A promise about never being misplaced.",
      hi: "एक वचन — कि कोई खो नहीं जाता।",
    },
    moods: ["lonely", "lost", "grateful"],
  },
  {
    id: "6.35",
    chapter: 6,
    verse: 35,
    speaker: "krishna",
    keyword: "abhyāsena vairāgyeṇa",
    sanskrit: [
      "असंशयं महाबाहो मनो दुर्निग्रहं चलम्।",
      "अभ्यासेन तु कौन्तेय वैराग्येण च गृह्यते॥",
    ],
    roman: [
      "asaṁśayaṁ mahā-bāho mano durnigrahaṁ calam",
      "abhyāsena tu kaunteya vairāgyeṇa ca gṛhyate",
    ],
    translation: {
      en: "Without doubt, mighty-armed one, the mind is restless and hard to restrain. But by practice and by detachment it is held, Kaunteya.",
      hi: "हे महाबाहो, निस्संदेह मन चंचल है और उसे वश में करना कठिन है। किन्तु हे कुन्तीपुत्र, अभ्यास और वैराग्य से वह वश में होता है।",
    },
    theme: {
      en: "Krishna agrees that it is hard before saying it is possible.",
      hi: "कृष्ण पहले मानते हैं कि यह कठिन है — फिर कहते हैं कि संभव है।",
    },
    moods: ["restless", "failing", "unmotivated"],
  },
  {
    id: "6.40",
    chapter: 6,
    verse: 40,
    speaker: "krishna",
    keyword: "na hi kalyāṇa-kṛt",
    sanskrit: [
      "पार्थ नैवेह नामुत्र विनाशस्तस्य विद्यते।",
      "न हि कल्याणकृत्कश्चिद्दुर्गतिं तात गच्छति॥",
    ],
    roman: [
      "pārtha naiveha nāmutra vināśas tasya vidyate",
      "na hi kalyāṇa-kṛt kaścid durgatiṁ tāta gacchati",
    ],
    translation: {
      en: "Partha, there is no destruction for him in this world or the next. No one who does good, My friend, ever comes to a bad end.",
      hi: "हे पार्थ, उसका न इस लोक में विनाश होता है, न परलोक में। हे तात, कल्याणकारी कर्म करने वाला कभी दुर्गति को प्राप्त नहीं होता।",
    },
    theme: {
      en: "Arjuna asks what happens to someone who tries and fails. This is the answer.",
      hi: "अर्जुन पूछते हैं कि जो प्रयास करके असफल हो जाए उसका क्या होगा। यह उत्तर है।",
    },
    moods: ["failing", "guilty", "afraid"],
  },
  {
    id: "7.14",
    chapter: 7,
    verse: 14,
    speaker: "krishna",
    keyword: "māyām etāṁ taranti te",
    sanskrit: [
      "दैवी ह्येषा गुणमयी मम माया दुरत्यया।",
      "मामेव ये प्रपद्यन्ते मायामेतां तरन्ति ते॥",
    ],
    roman: [
      "daivī hy eṣā guṇa-mayī mama māyā duratyayā",
      "mām eva ye prapadyante māyām etāṁ taranti te",
    ],
    translation: {
      en: "This divine energy of Mine, made of the modes, is hard to cross over. But those who surrender to Me cross beyond it.",
      hi: "गुणों से बनी यह मेरी दैवी माया दुस्तर है। किन्तु जो मेरी शरण लेते हैं, वे इस माया को पार कर जाते हैं।",
    },
    theme: {
      en: "The difficulty is admitted, and so is the way through it.",
      hi: "कठिनाई भी स्वीकार की गई है, और उसे पार करने का उपाय भी।",
    },
    moods: ["tempted", "overwhelmed", "doubting"],
  },
  {
    id: "7.16",
    chapter: 7,
    verse: 16,
    speaker: "krishna",
    keyword: "catur-vidhā bhajante",
    sanskrit: [
      "चतुर्विधा भजन्ते मां जनाः सुकृतिनोऽर्जुन।",
      "आर्तो जिज्ञासुरर्थार्थी ज्ञानी च भरतर्षभ॥",
    ],
    roman: [
      "catur-vidhā bhajante māṁ janāḥ su-kṛtino 'rjuna",
      "ārto jijñāsur arthārthī jñānī ca bharatarṣabha",
    ],
    translation: {
      en: "Four kinds of virtuous people worship Me, Arjuna: the distressed, the curious, the seeker of gain, and the one who knows.",
      hi: "हे अर्जुन, चार प्रकार के सुकृती लोग मेरी उपासना करते हैं: आर्त, जिज्ञासु, अर्थार्थी और ज्ञानी।",
    },
    theme: {
      en: "Coming because you are in trouble is on the list. It counts.",
      hi: "संकट में आना भी इसी सूची में है। वह भी गिना जाता है।",
    },
    moods: ["seeking", "anxious", "doubting"],
  },
  {
    id: "8.5",
    chapter: 8,
    verse: 5,
    speaker: "krishna",
    keyword: "anta-kāle ca mām eva",
    sanskrit: [
      "अन्तकाले च मामेव स्मरन्मुक्त्वा कलेवरम्।",
      "यः प्रयाति स मद्भावं याति नास्त्यत्र संशयः॥",
    ],
    roman: [
      "anta-kāle ca mām eva smaran muktvā kalevaram",
      "yaḥ prayāti sa mad-bhāvaṁ yāti nāsty atra saṁśayaḥ",
    ],
    translation: {
      en: "Whoever leaves the body at the end remembering Me alone attains My nature. Of this there is no doubt.",
      hi: "जो अंत समय में मुझे ही स्मरण करते हुए शरीर त्यागकर जाता है, वह मेरे स्वरूप को प्राप्त होता है — इसमें कोई संशय नहीं।",
    },
    theme: {
      en: "Why the chanting is practised daily: for one particular moment.",
      hi: "प्रतिदिन जप क्यों — एक विशेष क्षण के लिए।",
    },
    moods: ["afraid", "grieving", "seeking"],
  },
  {
    id: "9.22",
    chapter: 9,
    verse: 22,
    speaker: "krishna",
    keyword: "yoga-kṣemaṁ vahāmy aham",
    sanskrit: [
      "अनन्याश्चिन्तयन्तो मां ये जनाः पर्युपासते।",
      "तेषां नित्याभियुक्तानां योगक्षेमं वहाम्यहम्॥",
    ],
    roman: [
      "ananyāś cintayanto māṁ ye janāḥ paryupāsate",
      "teṣāṁ nityābhiyuktānāṁ yoga-kṣemaṁ vahāmy aham",
    ],
    translation: {
      en: "For those who worship Me with undivided attention, always steady, I carry what they lack and preserve what they have.",
      hi: "जो अनन्य भाव से मेरा चिंतन करते हुए मेरी उपासना करते हैं, उन नित्ययुक्त भक्तों का योगक्षेम मैं स्वयं वहन करता हूँ।",
    },
    theme: {
      en: "The verse people write on the inside cover of their notebook.",
      hi: "वह श्लोक जो लोग अपनी कॉपी के पहले पन्ने पर लिखते हैं।",
    },
    moods: ["anxious", "overwhelmed", "lonely"],
  },
  {
    id: "9.26",
    chapter: 9,
    verse: 26,
    speaker: "krishna",
    keyword: "patraṁ puṣpaṁ phalaṁ toyam",
    sanskrit: [
      "पत्रं पुष्पं फलं तोयं यो मे भक्त्या प्रयच्छति।",
      "तदहं भक्त्युपहृतमश्नामि प्रयतात्मनः॥",
    ],
    roman: [
      "patraṁ puṣpaṁ phalaṁ toyaṁ yo me bhaktyā prayacchati",
      "tad ahaṁ bhakty-upahṛtam aśnāmi prayatātmanaḥ",
    ],
    translation: {
      en: "A leaf, a flower, a fruit, water — whoever offers Me these with devotion, that offering of a pure heart I accept and eat.",
      hi: "जो कोई पत्र, पुष्प, फल या जल भक्ति से मुझे अर्पित करता है, शुद्ध हृदय से की गई उस भेंट को मैं स्वीकार करता हूँ और ग्रहण करता हूँ।",
    },
    theme: {
      en: "The entry price, stated: a leaf and some water.",
      hi: "प्रवेश का मूल्य — एक पत्ता और थोड़ा जल।",
    },
    moods: ["grateful", "seeking", "guilty"],
  },
  {
    id: "9.30",
    chapter: 9,
    verse: 30,
    speaker: "krishna",
    keyword: "api cet su-durācāraḥ",
    sanskrit: [
      "अपि चेत्सुदुराचारो भजते मामनन्यभाक्।",
      "साधुरेव स मन्तव्यः सम्यग्व्यवसितो हि सः॥",
    ],
    roman: [
      "api cet su-durācāro bhajate mām ananya-bhāk",
      "sādhur eva sa mantavyaḥ samyag vyavasito hi saḥ",
    ],
    translation: {
      en: "Even if someone of very bad conduct worships Me with undivided devotion, he is to be considered saintly, for his resolve is right.",
      hi: "यदि अत्यंत दुराचारी भी अनन्य भाव से मेरा भजन करता है, तो उसे साधु ही मानना चाहिए, क्योंकि उसका निश्चय सही है।",
    },
    theme: {
      en: "The verse for anyone convinced they have disqualified themselves.",
      hi: "उनके लिए जो मान बैठे हैं कि वे अब इस योग्य नहीं रहे।",
    },
    moods: ["guilty", "failing", "tempted"],
  },
  {
    id: "9.31",
    chapter: 9,
    verse: 31,
    speaker: "krishna",
    keyword: "na me bhaktaḥ praṇaśyati",
    sanskrit: [
      "क्षिप्रं भवति धर्मात्मा शश्वच्छान्तिं निगच्छति।",
      "कौन्तेय प्रतिजानीहि न मे भक्तः प्रणश्यति॥",
    ],
    roman: [
      "kṣipraṁ bhavati dharmātmā śaśvac-chāntiṁ nigacchati",
      "kaunteya pratijānīhi na me bhaktaḥ praṇaśyati",
    ],
    translation: {
      en: "He quickly becomes righteous and attains lasting peace. Declare it boldly, Kaunteya: My devotee never perishes.",
      hi: "वह शीघ्र ही धर्मात्मा हो जाता है और स्थायी शांति प्राप्त करता है। हे कुन्तीपुत्र, घोषणा कर दो — मेरा भक्त कभी नष्ट नहीं होता।",
    },
    theme: {
      en: "Krishna asks Arjuna to make the promise, so that it is a man's word too.",
      hi: "कृष्ण अर्जुन से यह घोषणा करवाते हैं — ताकि यह मनुष्य का वचन भी बने।",
    },
    moods: ["guilty", "failing", "afraid"],
  },
  {
    id: "9.34",
    chapter: 9,
    verse: 34,
    speaker: "krishna",
    keyword: "man-manā bhava mad-bhakto",
    sanskrit: [
      "मन्मना भव मद्भक्तो मद्याजी मां नमस्कुरु।",
      "मामेवैष्यसि युक्त्वैवमात्मानं मत्परायणः॥",
    ],
    roman: [
      "man-manā bhava mad-bhakto mad-yājī māṁ namaskuru",
      "mām evaiṣyasi yuktvaivam ātmānaṁ mat-parāyaṇaḥ",
    ],
    translation: {
      en: "Fix your mind on Me, be My devotee, offer to Me, bow to Me. Absorbed in Me and holding Me as the highest, you will come to Me.",
      hi: "मुझमें मन लगाओ, मेरे भक्त बनो, मुझे अर्पित करो, मुझे प्रणाम करो। इस प्रकार मुझमें युक्त होकर, मुझे परम आश्रय मानकर तुम मुझे ही प्राप्त करोगे।",
    },
    theme: {
      en: "Four instructions, and every one of them fits into an ordinary day.",
      hi: "चार निर्देश — और चारों एक साधारण दिन में समा जाते हैं।",
    },
    moods: ["seeking", "lost", "grateful"],
  },
  {
    id: "10.10",
    chapter: 10,
    verse: 10,
    speaker: "krishna",
    keyword: "dadāmi buddhi-yogaṁ",
    sanskrit: [
      "तेषां सततयुक्तानां भजतां प्रीतिपूर्वकम्।",
      "ददामि बुद्धियोगं तं येन मामुपयान्ति ते॥",
    ],
    roman: [
      "teṣāṁ satata-yuktānāṁ bhajatāṁ prīti-pūrvakam",
      "dadāmi buddhi-yogaṁ taṁ yena mām upayānti te",
    ],
    translation: {
      en: "To those constantly devoted, worshipping Me with love, I give the understanding by which they come to Me.",
      hi: "जो निरंतर युक्त होकर प्रेमपूर्वक मेरा भजन करते हैं, उन्हें मैं वह बुद्धियोग देता हूँ जिससे वे मुझे प्राप्त होते हैं।",
    },
    theme: {
      en: "The understanding is given, not achieved.",
      hi: "वह बुद्धि दी जाती है — अर्जित नहीं की जाती।",
    },
    moods: ["seeking", "doubting", "grateful"],
  },
  {
    id: "11.33",
    chapter: 11,
    verse: 33,
    speaker: "krishna",
    keyword: "nimitta-mātraṁ bhava",
    sanskrit: [
      "तस्मात्त्वमुत्तिष्ठ यशो लभस्व",
      "जित्वा शत्रून्भुङ्क्ष्व राज्यं समृद्धम्।",
      "मयैवैते निहताः पूर्वमेव",
      "निमित्तमात्रं भव सव्यसाचिन्॥",
    ],
    roman: [
      "tasmāt tvam uttiṣṭha yaśo labhasva",
      "jitvā śatrūn bhuṅkṣva rājyaṁ samṛddham",
      "mayaivaite nihatāḥ pūrvam eva",
      "nimitta-mātraṁ bhava savya-sācin",
    ],
    translation: {
      en: "Therefore stand up and win glory. Conquer your enemies and enjoy a flourishing kingdom. These are already struck down by Me — be merely the instrument, Savyasachin.",
      hi: "इसलिए तुम खड़े हो जाओ और यश प्राप्त करो। शत्रुओं को जीतकर समृद्ध राज्य भोगो। ये पहले ही मेरे द्वारा मारे जा चुके हैं — हे सव्यसाची, तुम केवल निमित्त बनो।",
    },
    theme: {
      en: "The pressure comes off the moment the outcome stops being yours.",
      hi: "जैसे ही परिणाम आपका नहीं रहता, बोझ उतर जाता है।",
    },
    moods: ["anxious", "overwhelmed", "unmotivated"],
  },
  {
    id: "12.13",
    chapter: 12,
    verse: 13,
    speaker: "krishna",
    keyword: "adveṣṭā sarva-bhūtānāṁ",
    sanskrit: [
      "अद्वेष्टा सर्वभूतानां मैत्रः करुण एव च।",
      "निर्ममो निरहङ्कारः समदुःखसुखः क्षमी॥",
    ],
    roman: [
      "adveṣṭā sarva-bhūtānāṁ maitraḥ karuṇa eva ca",
      "nirmamo nirahaṅkāraḥ sama-duḥkha-sukhaḥ kṣamī",
    ],
    translation: {
      en: "One who envies no living being, who is friendly and compassionate, free from possessiveness and ego, the same in sorrow and happiness, forgiving —",
      hi: "जो किसी प्राणी से द्वेष नहीं करता, जो मैत्रीपूर्ण और करुणामय है, ममता और अहंकार से रहित, सुख-दुख में समान और क्षमाशील है —",
    },
    theme: {
      en: "The start of Krishna's list of who is dear to Him, and it opens with not hating anybody.",
      hi: "कृष्ण को कौन प्रिय है — इस सूची का आरंभ: किसी से द्वेष न करना।",
    },
    moods: ["angry", "seeking", "joyful"],
  },
  {
    id: "12.15",
    chapter: 12,
    verse: 15,
    speaker: "krishna",
    keyword: "yasmān nodvijate loko",
    sanskrit: [
      "यस्मान्नोद्विजते लोको लोकान्नोद्विजते च यः।",
      "हर्षामर्षभयोद्वेगैर्मुक्तो यः स च मे प्रियः॥",
    ],
    roman: [
      "yasmān nodvijate loko lokān nodvijate ca yaḥ",
      "harṣāmarṣa-bhayodvegair mukto yaḥ sa ca me priyaḥ",
    ],
    translation: {
      en: "He who disturbs no one and is disturbed by no one, free from elation, resentment, fear and agitation — he is dear to Me.",
      hi: "जिससे कोई उद्विग्न नहीं होता और जो स्वयं किसी से उद्विग्न नहीं होता, जो हर्ष, ईर्ष्या, भय और उद्वेग से मुक्त है — वह मुझे प्रिय है।",
    },
    theme: {
      en: "A definition of peace that includes the people around you.",
      hi: "शांति की एक परिभाषा जिसमें आसपास के लोग भी शामिल हैं।",
    },
    moods: ["angry", "anxious", "restless"],
  },
  {
    id: "13.28",
    chapter: 13,
    verse: 28,
    speaker: "krishna",
    keyword: "samaṁ paśyan hi sarvatra",
    sanskrit: [
      "समं पश्यन्हि सर्वत्र समवस्थितमीश्वरम्।",
      "न हिनस्त्यात्मनात्मानं ततो याति परां गतिम्॥",
    ],
    roman: [
      "samaṁ paśyan hi sarvatra samavasthitam īśvaram",
      "na hinasty ātmanātmānaṁ tato yāti parāṁ gatim",
    ],
    translation: {
      en: "Seeing the Lord equally present everywhere, he does not degrade himself by his own mind, and so reaches the highest destination.",
      hi: "ईश्वर को सर्वत्र समान रूप से स्थित देखकर वह अपने मन से अपना पतन नहीं करता, और इसी से परम गति को प्राप्त होता है।",
    },
    theme: {
      en: "Seeing evenly and treating yourself decently turn out to be the same skill.",
      hi: "समदृष्टि और स्वयं के प्रति उदारता — दोनों एक ही अभ्यास निकलते हैं।",
    },
    moods: ["guilty", "angry", "lonely"],
  },
  {
    id: "14.26",
    chapter: 14,
    verse: 26,
    speaker: "krishna",
    keyword: "avyabhicāreṇa bhakti-yogena",
    sanskrit: [
      "मां च योऽव्यभिचारेण भक्तियोगेन सेवते।",
      "स गुणान्समतीत्यैतान्ब्रह्मभूयाय कल्पते॥",
    ],
    roman: [
      "māṁ ca yo 'vyabhicāreṇa bhakti-yogena sevate",
      "sa guṇān samatītyaitān brahma-bhūyāya kalpate",
    ],
    translation: {
      en: "One who serves Me with unwavering devotion rises above these modes of nature and becomes fit to realise Brahman.",
      hi: "जो अव्यभिचारी भक्तियोग से मेरी सेवा करता है, वह इन गुणों को पार करके ब्रह्मभाव के योग्य हो जाता है।",
    },
    theme: {
      en: "One practice named as the way past all three modes at once.",
      hi: "एक ही अभ्यास — जो तीनों गुणों से एक साथ पार ले जाता है।",
    },
    moods: ["seeking", "restless", "tempted"],
  },
  {
    id: "15.7",
    chapter: 15,
    verse: 7,
    speaker: "krishna",
    keyword: "mamaivāṁśo jīva-loke",
    sanskrit: [
      "ममैवांशो जीवलोके जीवभूतः सनातनः।",
      "मनःषष्ठानीन्द्रियाणि प्रकृतिस्थानि कर्षति॥",
    ],
    roman: [
      "mamaivāṁśo jīva-loke jīva-bhūtaḥ sanātanaḥ",
      "manaḥ-ṣaṣṭhānīndriyāṇi prakṛti-sthāni karṣati",
    ],
    translation: {
      en: "An eternal fragment of My own self becomes the living being in this world, and draws to itself the senses, with the mind as the sixth, resting in nature.",
      hi: "इस जीव-जगत में मेरा ही सनातन अंश जीव बनता है, और प्रकृति में स्थित मन सहित छह इन्द्रियों को आकर्षित करता है।",
    },
    theme: {
      en: "Where a person comes from, in one line.",
      hi: "मनुष्य कहाँ से आया — एक पंक्ति में।",
    },
    moods: ["lost", "lonely", "seeking"],
  },
  {
    id: "16.21",
    chapter: 16,
    verse: 21,
    speaker: "krishna",
    keyword: "kāmaḥ krodhas tathā lobhaḥ",
    sanskrit: [
      "त्रिविधं नरकस्येदं द्वारं नाशनमात्मनः।",
      "कामः क्रोधस्तथा लोभस्तस्मादेतत्त्रयं त्यजेत्॥",
    ],
    roman: [
      "tri-vidhaṁ narakasyedaṁ dvāraṁ nāśanam ātmanaḥ",
      "kāmaḥ krodhas tathā lobhas tasmād etat trayaṁ tyajet",
    ],
    translation: {
      en: "There are three gates to that hell which destroys the self: lust, anger and greed. Therefore give up these three.",
      hi: "आत्मा का नाश करने वाले नरक के तीन द्वार हैं: काम, क्रोध और लोभ। इसलिए इन तीनों को त्याग देना चाहिए।",
    },
    theme: {
      en: "Named plainly, so they can be recognised on the way in rather than after.",
      hi: "स्पष्ट नाम — ताकि इन्हें प्रवेश के समय पहचाना जा सके, बाद में नहीं।",
    },
    moods: ["angry", "tempted", "guilty"],
  },
  {
    id: "17.15",
    chapter: 17,
    verse: 15,
    speaker: "krishna",
    keyword: "vāṅ-mayaṁ tapa ucyate",
    sanskrit: [
      "अनुद्वेगकरं वाक्यं सत्यं प्रियहितं च यत्।",
      "स्वाध्यायाभ्यसनं चैव वाङ्मयं तप उच्यते॥",
    ],
    roman: [
      "anudvega-karaṁ vākyaṁ satyaṁ priya-hitaṁ ca yat",
      "svādhyāyābhyasanaṁ caiva vāṅ-mayaṁ tapa ucyate",
    ],
    translation: {
      en: "Speech that causes no distress, that is truthful, pleasing and beneficial, together with the regular study of scripture — this is called austerity of speech.",
      hi: "जो वाणी उद्वेग न उत्पन्न करे, जो सत्य, प्रिय और हितकारी हो, तथा स्वाध्याय का अभ्यास — यह वाणी का तप कहलाता है।",
    },
    theme: {
      en: "Four tests for a sentence, all of which it has to pass at once.",
      hi: "एक वाक्य के लिए चार कसौटियाँ — और चारों एक साथ पूरी होनी चाहिए।",
    },
    moods: ["angry", "guilty", "seeking"],
  },
  {
    id: "18.58",
    chapter: 18,
    verse: 58,
    speaker: "krishna",
    keyword: "sarva-durgāṇi tariṣyasi",
    sanskrit: [
      "मच्चित्तः सर्वदुर्गाणि मत्प्रसादात्तरिष्यसि।",
      "अथ चेत्त्वमहङ्कारान्न श्रोष्यसि विनङ्क्ष्यसि॥",
    ],
    roman: [
      "mac-cittaḥ sarva-durgāṇi mat-prasādāt tariṣyasi",
      "atha cet tvam ahaṅkārān na śroṣyasi vinaṅkṣyasi",
    ],
    translation: {
      en: "With your mind fixed on Me you will cross over every obstacle by My grace. But if from ego you will not listen, you will be lost.",
      hi: "मुझमें चित्त लगाने से तुम मेरी कृपा से सारी कठिनाइयों को पार कर जाओगे। किन्तु यदि अहंकारवश तुम नहीं सुनोगे, तो नष्ट हो जाओगे।",
    },
    theme: {
      en: "Both halves said in the same breath, which is unusually direct.",
      hi: "दोनों बातें एक ही साँस में — असामान्य रूप से स्पष्ट।",
    },
    moods: ["overwhelmed", "afraid", "doubting"],
  },
  {
    id: "18.61",
    chapter: 18,
    verse: 61,
    speaker: "krishna",
    keyword: "hṛd-deśe 'rjuna tiṣṭhati",
    sanskrit: [
      "ईश्वरः सर्वभूतानां हृद्देशेऽर्जुन तिष्ठति।",
      "भ्रामयन्सर्वभूतानि यन्त्रारूढानि मायया॥",
    ],
    roman: [
      "īśvaraḥ sarva-bhūtānāṁ hṛd-deśe 'rjuna tiṣṭhati",
      "bhrāmayan sarva-bhūtāni yantrārūḍhāni māyayā",
    ],
    translation: {
      en: "The Lord dwells in the heart of every being, Arjuna, causing them all to move as though mounted on a machine, by His energy.",
      hi: "हे अर्जुन, ईश्वर समस्त प्राणियों के हृदय में स्थित है, और अपनी माया से सब प्राणियों को यंत्र पर आरूढ़ की भाँति घुमाता है।",
    },
    theme: {
      en: "Nobody is anywhere alone, including in the part of them nobody sees.",
      hi: "कोई कहीं अकेला नहीं — उस हिस्से में भी नहीं जिसे कोई नहीं देखता।",
    },
    moods: ["lonely", "lost", "afraid"],
  },
  {
    id: "18.66",
    chapter: 18,
    verse: 66,
    speaker: "krishna",
    keyword: "mā śucaḥ",
    sanskrit: [
      "सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज।",
      "अहं त्वां सर्वपापेभ्यो मोक्षयिष्यामि मा शुचः॥",
    ],
    roman: [
      "sarva-dharmān parityajya mām ekaṁ śaraṇaṁ vraja",
      "ahaṁ tvāṁ sarva-pāpebhyo mokṣayiṣyāmi mā śucaḥ",
    ],
    translation: {
      en: "Abandon all varieties of duty and come to Me alone for shelter. I will free you from all sins. Do not grieve.",
      hi: "समस्त धर्मों को त्यागकर केवल मेरी शरण में आओ। मैं तुम्हें सारे पापों से मुक्त कर दूँगा — शोक मत करो।",
    },
    theme: {
      en: "The last instruction of the book, and it ends with two words of comfort.",
      hi: "गीता का अंतिम उपदेश — और उसका अंत दो सांत्वना भरे शब्दों से होता है।",
    },
    moods: ["guilty", "overwhelmed", "grieving", "afraid"],
  },
  {
    id: "18.78",
    chapter: 18,
    verse: 78,
    speaker: "sanjaya",
    keyword: "yatra yogeśvaraḥ kṛṣṇo",
    sanskrit: [
      "यत्र योगेश्वरः कृष्णो यत्र पार्थो धनुर्धरः।",
      "तत्र श्रीर्विजयो भूतिर्ध्रुवा नीतिर्मतिर्मम॥",
    ],
    roman: [
      "yatra yogeśvaraḥ kṛṣṇo yatra pārtho dhanur-dharaḥ",
      "tatra śrīr vijayo bhūtir dhruvā nītir matir mama",
    ],
    translation: {
      en: "Wherever there is Krishna, master of yoga, and wherever there is Partha the archer, there will surely be fortune, victory, prosperity and sound conduct. That is my conviction.",
      hi: "जहाँ योगेश्वर कृष्ण हैं और जहाँ धनुर्धर पार्थ हैं, वहीं श्री, विजय, ऐश्वर्य और अटल नीति है — यह मेरा मत है।",
    },
    theme: {
      en: "The last verse, and the only voice in it is a bystander's.",
      hi: "अंतिम श्लोक — और उसमें बोलने वाला केवल एक साक्षी है।",
    },
    moods: ["joyful", "grateful", "seeking"],
  },
  {
    id: "2.7",
    chapter: 2,
    verse: 7,
    speaker: "arjuna",
    keyword: "śiṣyas te 'haṁ",
    sanskrit: [
      "कार्पण्यदोषोपहतस्वभावः",
      "पृच्छामि त्वां धर्मसम्मूढचेताः।",
      "यच्छ्रेयः स्यान्निश्चितं ब्रूहि तन्मे",
      "शिष्यस्तेऽहं शाधि मां त्वां प्रपन्नम्॥",
    ],
    roman: [
      "kārpaṇya-doṣopahata-svabhāvaḥ",
      "pṛcchāmi tvāṁ dharma-sammūḍha-cetāḥ",
      "yac chreyaḥ syān niścitaṁ brūhi tan me",
      "śiṣyas te 'haṁ śādhi māṁ tvāṁ prapannam",
    ],
    translation: {
      en: "My nature is overcome by weakness and my mind confused about duty, so I ask You: tell me clearly what is best. I am Your student. Instruct me; I have come to You.",
      hi: "कृपणता के दोष से मेरा स्वभाव आहत है और धर्म के विषय में मेरा चित्त मोहित है, इसलिए मैं आपसे पूछता हूँ: जो निश्चित रूप से श्रेयस्कर हो, वही मुझे बताइए। मैं आपका शिष्य हूँ, शरण में आया हूँ — मुझे शिक्षा दीजिए।",
    },
    theme: {
      en: "The moment the Gita actually begins: someone admits they do not know.",
      hi: "गीता वास्तव में यहीं से आरंभ होती है — जब कोई स्वीकार करता है कि वह नहीं जानता।",
    },
    moods: ["lost", "doubting", "overwhelmed"],
  },
];

/** Verse lookup by "chapter.verse". */
export function verseById(id) {
  return VERSES.find((v) => v.id === id) ?? null;
}

/** Every verse tagged with a mood, in corpus order. */
export function versesForMood(mood) {
  return VERSES.filter((v) => v.moods.includes(mood));
}
