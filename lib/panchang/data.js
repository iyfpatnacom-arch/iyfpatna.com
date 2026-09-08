/**
 * The names and the festival table — everything the calendar knows that is
 * tradition rather than arithmetic.
 *
 * Bilingual strings live here rather than in `messages/*.json` for the same
 * reason the seva list and the daily schedule do: these are data rows, not UI
 * copy. A festival is a record with a Sanskrit name and a Hindi name, and it
 * belongs beside the rule that places it in the year, not scattered across
 * two translation files where the pairing can silently come apart.
 *
 * Months are indexed with Caitra = 0, matching the amanta month index
 * `lib/panchang/index.js` derives from the Sun's sidereal longitude at the
 * new moon.
 */

/** Patna. The whole calendar is computed for this horizon. */
export const PATNA = {
  latitude: 25.5941,
  longitude: 85.1376,
  /** IST is a fixed +05:30 with no daylight saving, which keeps this a number. */
  tzMinutes: 330,
  label: { en: "Patna, Bihar", hi: "पटना, बिहार" },
};

/**
 * The twelve months of the Gaudiya calendar — the names of Vishnu — against
 * the Vedic month each one covers.
 *
 * The Gaudiya month begins the day after the full moon (purnimanta), so a
 * Krishna-paksha day carries the *next* month's name. `index.js` does that
 * shift; this table is only the naming.
 */
export const GAUDIYA_MONTHS = [
  { en: "Vishnu", hi: "विष्णु", vedic: { en: "Chaitra", hi: "चैत्र" } },
  { en: "Madhusudana", hi: "मधुसूदन", vedic: { en: "Vaishakha", hi: "वैशाख" } },
  { en: "Trivikrama", hi: "त्रिविक्रम", vedic: { en: "Jyeshtha", hi: "ज्येष्ठ" } },
  { en: "Vamana", hi: "वामन", vedic: { en: "Ashadha", hi: "आषाढ़" } },
  { en: "Shridhara", hi: "श्रीधर", vedic: { en: "Shravana", hi: "श्रावण" } },
  { en: "Hrishikesha", hi: "हृषीकेश", vedic: { en: "Bhadra", hi: "भाद्र" } },
  { en: "Padmanabha", hi: "पद्मनाभ", vedic: { en: "Ashvina", hi: "आश्विन" } },
  { en: "Damodara", hi: "दामोदर", vedic: { en: "Kartika", hi: "कार्तिक" } },
  { en: "Keshava", hi: "केशव", vedic: { en: "Margashirsha", hi: "मार्गशीर्ष" } },
  { en: "Narayana", hi: "नारायण", vedic: { en: "Pausha", hi: "पौष" } },
  { en: "Madhava", hi: "माधव", vedic: { en: "Magha", hi: "माघ" } },
  { en: "Govinda", hi: "गोविन्द", vedic: { en: "Phalguna", hi: "फाल्गुन" } },
];

/** Tithis 1–14. The fifteenth is named by paksha; see `tithiName` below. */
const TITHI_NAMES = [
  { en: "Pratipat", hi: "प्रतिपदा" },
  { en: "Dvitiya", hi: "द्वितीया" },
  { en: "Tritiya", hi: "तृतीया" },
  { en: "Chaturthi", hi: "चतुर्थी" },
  { en: "Panchami", hi: "पंचमी" },
  { en: "Shashthi", hi: "षष्ठी" },
  { en: "Saptami", hi: "सप्तमी" },
  { en: "Ashtami", hi: "अष्टमी" },
  { en: "Navami", hi: "नवमी" },
  { en: "Dashami", hi: "दशमी" },
  { en: "Ekadashi", hi: "एकादशी" },
  { en: "Dvadashi", hi: "द्वादशी" },
  { en: "Trayodashi", hi: "त्रयोदशी" },
  { en: "Chaturdashi", hi: "चतुर्दशी" },
];

export const PURNIMA = { en: "Purnima", hi: "पूर्णिमा" };
export const AMAVASYA = { en: "Amavasya", hi: "अमावस्या" };

export const PAKSHA_NAMES = {
  shukla: { en: "Shukla paksha", hi: "शुक्ल पक्ष" },
  krishna: { en: "Krishna paksha", hi: "कृष्ण पक्ष" },
};

/**
 * The name of tithi `n` (1–15) in paksha `paksha`.
 *
 * The fifteenth tithi is the only one whose name depends on which half of the
 * month it falls in — full moon or dark moon — so it is resolved here rather
 * than duplicating the table.
 */
export function tithiName(n, paksha) {
  if (n === 15) return paksha === "shukla" ? PURNIMA : AMAVASYA;
  return TITHI_NAMES[n - 1];
}

export const NAKSHATRAS = [
  { en: "Ashvini", hi: "अश्विनी" },
  { en: "Bharani", hi: "भरणी" },
  { en: "Krittika", hi: "कृत्तिका" },
  { en: "Rohini", hi: "रोहिणी" },
  { en: "Mrigashira", hi: "मृगशिरा" },
  { en: "Ardra", hi: "आर्द्रा" },
  { en: "Punarvasu", hi: "पुनर्वसु" },
  { en: "Pushya", hi: "पुष्य" },
  { en: "Ashlesha", hi: "आश्लेषा" },
  { en: "Magha", hi: "मघा" },
  { en: "Purva Phalguni", hi: "पूर्वा फाल्गुनी" },
  { en: "Uttara Phalguni", hi: "उत्तरा फाल्गुनी" },
  { en: "Hasta", hi: "हस्त" },
  { en: "Chitra", hi: "चित्रा" },
  { en: "Svati", hi: "स्वाति" },
  { en: "Vishakha", hi: "विशाखा" },
  { en: "Anuradha", hi: "अनुराधा" },
  { en: "Jyeshtha", hi: "ज्येष्ठा" },
  { en: "Mula", hi: "मूल" },
  { en: "Purva Ashadha", hi: "पूर्वाषाढ़ा" },
  { en: "Uttara Ashadha", hi: "उत्तराषाढ़ा" },
  { en: "Shravana", hi: "श्रवण" },
  { en: "Dhanishtha", hi: "धनिष्ठा" },
  { en: "Shatabhisha", hi: "शतभिषा" },
  { en: "Purva Bhadrapada", hi: "पूर्वा भाद्रपदा" },
  { en: "Uttara Bhadrapada", hi: "उत्तरा भाद्रपदा" },
  { en: "Revati", hi: "रेवती" },
];

/**
 * The names of the twenty-four Ekadashis, by month and paksha.
 *
 * Indexed by the *Gaudiya* (purnimanta) month, which is why Utpanna sits in
 * Keshava's Krishna paksha rather than Damodara's — the same dark fortnight,
 * named the way the Gaudiya calendar names it.
 *
 * A leap month's two Ekadashis (Padmini and Parama) are not in this table;
 * `index.js` labels them directly when it detects an adhika masa.
 */
export const EKADASHI_NAMES = {
  "0-krishna": { en: "Papamochani", hi: "पापमोचनी" },
  "0-shukla": { en: "Kamada", hi: "कामदा" },
  "1-krishna": { en: "Varuthini", hi: "वरूथिनी" },
  "1-shukla": { en: "Mohini", hi: "मोहिनी" },
  "2-krishna": { en: "Apara", hi: "अपरा" },
  "2-shukla": { en: "Pandava Nirjala", hi: "पाण्डव निर्जला" },
  "3-krishna": { en: "Yogini", hi: "योगिनी" },
  "3-shukla": { en: "Shayana", hi: "शयन" },
  "4-krishna": { en: "Kamika", hi: "कामिका" },
  "4-shukla": { en: "Pavitropana", hi: "पवित्रोपना" },
  "5-krishna": { en: "Annada", hi: "अन्नदा" },
  "5-shukla": { en: "Parshva", hi: "पार्श्व" },
  "6-krishna": { en: "Indira", hi: "इन्दिरा" },
  "6-shukla": { en: "Pashankusha", hi: "पाशांकुशा" },
  "7-krishna": { en: "Rama", hi: "रमा" },
  "7-shukla": { en: "Utthana", hi: "उत्थान" },
  "8-krishna": { en: "Utpanna", hi: "उत्पन्ना" },
  "8-shukla": { en: "Mokshada", hi: "मोक्षदा" },
  "9-krishna": { en: "Saphala", hi: "सफला" },
  "9-shukla": { en: "Putrada", hi: "पुत्रदा" },
  "10-krishna": { en: "Shat-tila", hi: "षट्तिला" },
  "10-shukla": { en: "Bhaimi", hi: "भैमी" },
  "11-krishna": { en: "Vijaya", hi: "विजया" },
  "11-shukla": { en: "Amalaki", hi: "आमलकी" },
};

/**
 * Festivals, keyed `<gaudiyaMonth>-<paksha>-<tithi>`.
 *
 * Only observances whose date is fixed by a tithi are here, which is what
 * makes them computable at all. `major` days get a coloured cell in the month
 * grid and a line on the home page; the rest are quieter entries.
 *
 * Appearance and disappearance days of individual acaryas are deliberately
 * absent: they vary between Gaudiya lines and a calendar that prints one
 * line's dates as everyone's is worse than one that prints none. The temple's
 * own list is the authority for those.
 */
export const FESTIVALS = {
  "0-shukla-9": {
    key: "rama_navami",
    major: true,
    name: { en: "Rama Navami", hi: "राम नवमी" },
    note: {
      en: "Appearance of Lord Sri Ramachandra. Fasting until sunset.",
      hi: "भगवान श्रीरामचन्द्र का आविर्भाव। सूर्यास्त तक उपवास।",
    },
  },
  "0-krishna-1": {
    key: "jagannatha_misra",
    name: { en: "Jagannatha Mishra Mahotsava", hi: "जगन्नाथ मिश्र महोत्सव" },
    note: {
      en: "The festival Sri Chaitanya's father held on the day after His birth.",
      hi: "श्री चैतन्य के आविर्भाव के अगले दिन उनके पिता द्वारा किया गया उत्सव।",
    },
  },
  "1-shukla-3": {
    key: "akshaya_tritiya",
    name: { en: "Akshaya Tritiya · Chandana Yatra", hi: "अक्षय तृतीया · चन्दन यात्रा" },
    note: {
      en: "Sandalwood is offered to the deities through the hot months.",
      hi: "ग्रीष्म ऋतु में श्रीविग्रह को चन्दन अर्पित किया जाता है।",
    },
  },
  "1-shukla-14": {
    key: "nrsimha_caturdasi",
    major: true,
    name: { en: "Nrisimha Chaturdashi", hi: "नृसिंह चतुर्दशी" },
    note: {
      en: "Appearance of Lord Nrisimhadeva. Fasting until dusk.",
      hi: "भगवान नृसिंहदेव का आविर्भाव। संध्या तक उपवास।",
    },
  },
  "2-shukla-13": {
    key: "panihati",
    name: { en: "Panihati Chida-dahi Utsava", hi: "पानीहाटी चिड़ा-दही उत्सव" },
    note: {
      en: "Chipped rice and yoghurt distributed, as Nityananda Prabhu arranged.",
      hi: "नित्यानन्द प्रभु की व्यवस्था अनुसार चिड़ा-दही का वितरण।",
    },
  },
  "2-shukla-15": {
    key: "snana_yatra",
    name: { en: "Snana Yatra", hi: "स्नान यात्रा" },
    note: {
      en: "The grand bathing festival of Lord Jagannatha.",
      hi: "भगवान जगन्नाथ का महास्नान उत्सव।",
    },
  },
  "3-shukla-2": {
    key: "ratha_yatra",
    major: true,
    name: { en: "Ratha Yatra", hi: "रथ यात्रा" },
    note: {
      en: "Lord Jagannatha, Baladeva and Subhadra ride out on their chariots.",
      hi: "भगवान जगन्नाथ, बलदेव और सुभद्रा का रथ पर नगर भ्रमण।",
    },
  },
  "3-shukla-11": {
    key: "sayana_ekadashi",
    name: { en: "Shayana Ekadashi · Chaturmasya begins", hi: "शयन एकादशी · चातुर्मास्य आरम्भ" },
    note: {
      en: "The four-month vow of additional austerity begins.",
      hi: "चार मास के अतिरिक्त व्रत का आरम्भ।",
    },
  },
  "3-shukla-15": {
    key: "guru_purnima",
    name: { en: "Guru Purnima · Vyasa Puja", hi: "गुरु पूर्णिमा · व्यास पूजा" },
    note: {
      en: "Honouring Srila Vyasadeva and the disciplic succession.",
      hi: "श्रील व्यासदेव और गुरु-परम्परा का सम्मान।",
    },
  },
  "4-shukla-11": {
    key: "jhulan_begins",
    name: { en: "Jhulan Yatra begins", hi: "झूलन यात्रा आरम्भ" },
    note: {
      en: "Five days of the swing festival for Radha and Krishna.",
      hi: "राधा-कृष्ण के झूलन उत्सव के पाँच दिन।",
    },
  },
  "4-shukla-15": {
    key: "balarama_purnima",
    major: true,
    name: { en: "Balarama Purnima", hi: "बलराम पूर्णिमा" },
    note: {
      en: "Appearance of Lord Balarama. Jhulan Yatra ends.",
      hi: "भगवान बलराम का आविर्भाव। झूलन यात्रा की समाप्ति।",
    },
  },
  "5-krishna-8": {
    key: "janmashtami",
    major: true,
    name: { en: "Sri Krishna Janmashtami", hi: "श्री कृष्ण जन्माष्टमी" },
    note: {
      en: "Appearance of Lord Sri Krishna. Fasting until midnight.",
      hi: "भगवान श्रीकृष्ण का आविर्भाव। मध्यरात्रि तक उपवास।",
    },
  },
  "5-krishna-9": {
    key: "nandotsava",
    major: true,
    name: { en: "Nandotsava", hi: "नन्दोत्सव" },
    note: {
      en: "Nanda Maharaja's celebration — and Srila Prabhupada's appearance day.",
      hi: "नन्द महाराज का उत्सव — और श्रील प्रभुपाद का आविर्भाव दिवस।",
    },
  },
  "5-shukla-8": {
    key: "radhashtami",
    major: true,
    name: { en: "Radhashtami", hi: "राधाष्टमी" },
    note: {
      en: "Appearance of Srimati Radharani. Fasting until noon.",
      hi: "श्रीमती राधारानी का आविर्भाव। मध्याह्न तक उपवास।",
    },
  },
  "5-shukla-12": {
    key: "vamana_dvadasi",
    name: { en: "Vamana Dvadashi", hi: "वामन द्वादशी" },
    note: {
      en: "Appearance of Lord Vamanadeva.",
      hi: "भगवान वामनदेव का आविर्भाव।",
    },
  },
  "6-shukla-15": {
    key: "sharad_purnima",
    name: { en: "Sharad Purnima · Rasa Yatra", hi: "शरद पूर्णिमा · रास यात्रा" },
    note: {
      en: "The autumn full moon of the rasa dance. Kartika vrata begins.",
      hi: "रास नृत्य की शरद पूर्णिमा। कार्तिक व्रत आरम्भ।",
    },
  },
  "7-shukla-1": {
    key: "govardhana_puja",
    major: true,
    name: { en: "Govardhana Puja · Annakuta", hi: "गोवर्धन पूजा · अन्नकूट" },
    note: {
      en: "A hill of food offered, as Krishna lifted the hill of Govardhana.",
      hi: "अन्न का पर्वत अर्पित — जैसे कृष्ण ने गोवर्धन उठाया।",
    },
  },
  "7-shukla-8": {
    key: "gopashtami",
    name: { en: "Gopashtami", hi: "गोपाष्टमी" },
    note: {
      en: "The day Krishna first took the cows to pasture.",
      hi: "जिस दिन कृष्ण पहली बार गौओं को चराने ले गए।",
    },
  },
  "7-shukla-15": {
    key: "kartika_purnima",
    major: true,
    name: { en: "Kartika Purnima · Rasa Purnima", hi: "कार्तिक पूर्णिमा · रास पूर्णिमा" },
    note: {
      en: "Kartika vrata and Chaturmasya both end.",
      hi: "कार्तिक व्रत और चातुर्मास्य दोनों की समाप्ति।",
    },
  },
  "8-shukla-11": {
    key: "gita_jayanti",
    major: true,
    name: { en: "Gita Jayanti", hi: "गीता जयंती" },
    note: {
      en: "The day the Bhagavad-gita was spoken at Kurukshetra.",
      hi: "जिस दिन कुरुक्षेत्र में भगवद्गीता कही गई।",
    },
  },
  "10-shukla-5": {
    key: "vasanta_panchami",
    name: { en: "Vasanta Panchami", hi: "वसंत पंचमी" },
    note: {
      en: "The first day of spring, and of Vasanta-rasa.",
      hi: "वसंत ऋतु का प्रथम दिन, और वसंत-रास।",
    },
  },
  "10-shukla-12": {
    key: "varaha_dvadasi",
    name: { en: "Varaha Dvadashi", hi: "वराह द्वादशी" },
    note: {
      en: "Appearance of Lord Varahadeva.",
      hi: "भगवान वराहदेव का आविर्भाव।",
    },
  },
  "10-shukla-13": {
    key: "nityananda_trayodasi",
    major: true,
    name: { en: "Nityananda Trayodashi", hi: "नित्यानन्द त्रयोदशी" },
    note: {
      en: "Appearance of Lord Nityananda Prabhu. Fasting until noon.",
      hi: "श्री नित्यानन्द प्रभु का आविर्भाव। मध्याह्न तक उपवास।",
    },
  },
  "11-shukla-15": {
    key: "gaura_purnima",
    major: true,
    name: { en: "Gaura Purnima", hi: "गौर पूर्णिमा" },
    note: {
      en: "Appearance of Sri Chaitanya Mahaprabhu. Fasting until moonrise.",
      hi: "श्री चैतन्य महाप्रभु का आविर्भाव। चन्द्रोदय तक उपवास।",
    },
  },
};

/** The leap month's own two Ekadashis, used when an adhika masa is detected. */
export const ADHIKA_EKADASHI = {
  krishna: { en: "Parama", hi: "परमा" },
  shukla: { en: "Padmini", hi: "पद्मिनी" },
};

export const ADHIKA_MONTH = { en: "Purushottama (adhika)", hi: "पुरुषोत्तम (अधिक)" };
