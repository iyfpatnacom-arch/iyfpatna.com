/**
 * The kirtans IYF Patna actually sings.
 *
 * This exists so the Kirtan Library is useful on a day when no recording has
 * been uploaded. A page that says "tracks are being uploaded, check back soon"
 * is worth nothing to someone standing in a kirtan trying to follow the words —
 * and the words are the part that is hard to find, not the audio.
 *
 * Everything here is traditional or long out of copyright: the maha-mantra and
 * the pranama mantras, Visvanatha Cakravarti Thakura (17th century) and
 * Bhaktivinoda Thakura (19th). The meanings are plain renderings written for
 * this site rather than any publisher's translation.
 *
 * `at` on a line is the second of the recording it falls on. It is null here
 * because these have no recording; a `KirtanTrack` row that carries both an
 * `audioUrl` and timed lyrics gets the full karaoke behaviour, and these fall
 * back to a plain sheet. Same component, same data shape, one field apart.
 */

export const KIRTAN_LIBRARY = [
  {
    id: "maha-mantra",
    title: { en: "Hare Krishna Maha-mantra", hi: "हरे कृष्ण महामंत्र" },
    attribution: { en: "The great chant for deliverance", hi: "महामंत्र" },
    lines: [
      {
        at: null,
        devanagari: "हरे कृष्ण हरे कृष्ण कृष्ण कृष्ण हरे हरे",
        roman: "hare kṛṣṇa hare kṛṣṇa kṛṣṇa kṛṣṇa hare hare",
      },
      {
        at: null,
        devanagari: "हरे राम हरे राम राम राम हरे हरे",
        roman: "hare rāma hare rāma rāma rāma hare hare",
      },
    ],
    meaning: {
      en: "O energy of the Lord, O Lord, please engage me in Your service.",
      hi: "हे भगवान की शक्ति, हे भगवान, कृपया मुझे अपनी सेवा में लगाइए।",
    },
  },
  {
    id: "panca-tattva",
    title: { en: "Pancha-tattva Mantra", hi: "पंच-तत्त्व मंत्र" },
    attribution: {
      en: "Chanted before the maha-mantra",
      hi: "महामंत्र से पहले गाया जाता है",
    },
    lines: [
      {
        at: null,
        devanagari: "जय श्री कृष्ण चैतन्य प्रभु नित्यानन्द",
        roman: "jaya śrī-kṛṣṇa-caitanya prabhu nityānanda",
      },
      {
        at: null,
        devanagari: "श्री अद्वैत गदाधर श्रीवासादि गौर भक्त वृन्द",
        roman: "śrī-advaita gadādhara śrīvāsādi-gaura-bhakta-vṛnda",
      },
    ],
    meaning: {
      en: "Glory to Sri Krishna Chaitanya, Nityananda Prabhu, Advaita Acharya, Gadadhara, Srivasa and all the devotees of Lord Gauranga.",
      hi: "श्री कृष्ण चैतन्य, नित्यानन्द प्रभु, अद्वैत आचार्य, गदाधर, श्रीवास तथा गौरांग के समस्त भक्तों की जय।",
    },
  },
  {
    id: "guru-pranama",
    title: { en: "Sri Guru Pranama", hi: "श्री गुरु प्रणाम" },
    attribution: { en: "Offered before class", hi: "कक्षा से पूर्व" },
    lines: [
      {
        at: null,
        devanagari: "ॐ अज्ञानतिमिरान्धस्य ज्ञानाञ्जनशलाकया।",
        roman: "oṁ ajñāna-timirāndhasya jñānāñjana-śalākayā",
      },
      {
        at: null,
        devanagari: "चक्षुरुन्मीलितं येन तस्मै श्रीगुरवे नमः॥",
        roman: "cakṣur unmīlitaṁ yena tasmai śrī-gurave namaḥ",
      },
    ],
    meaning: {
      en: "I was born in the darkness of ignorance, and my teacher opened my eyes with the torch of knowledge. To him I offer my respects.",
      hi: "मैं अज्ञान के अंधकार में जन्मा था, और मेरे गुरु ने ज्ञान की शलाका से मेरी आँखें खोलीं। उन्हें मेरा प्रणाम।",
    },
  },
  {
    id: "jaya-radha-madhava",
    title: { en: "Jaya Radha-Madhava", hi: "जय राधा-माधव" },
    attribution: {
      en: "Bhaktivinoda Thakura",
      hi: "भक्तिविनोद ठाकुर",
    },
    lines: [
      {
        at: null,
        devanagari: "जय राधा-माधव कुञ्ज-बिहारी",
        roman: "jaya rādhā-mādhava kuñja-bihārī",
      },
      {
        at: null,
        devanagari: "गोपी-जन-वल्लभ गिरि-वर-धारी",
        roman: "gopī-jana-vallabha giri-vara-dhārī",
      },
      {
        at: null,
        devanagari: "यशोदा-नन्दन ब्रज-जन-रञ्जन",
        roman: "yaśodā-nandana braja-jana-rañjana",
      },
      {
        at: null,
        devanagari: "यमुना-तीर-वन-चारी",
        roman: "yāmuna-tīra-vana-cārī",
      },
    ],
    meaning: {
      en: "Krishna is Radha's beloved, who wanders in the groves of Vrindavan. He is dear to the gopis, He lifted the great hill, He is Yashoda's son, the delight of Vraja, roaming the woods along the Yamuna.",
      hi: "कृष्ण राधा के प्रियतम हैं, जो वृन्दावन के कुंजों में विहार करते हैं। वे गोपियों के प्रिय हैं, उन्होंने गोवर्धन उठाया, वे यशोदा के पुत्र हैं, ब्रजवासियों के आनन्द हैं, और यमुना तट के वनों में विचरण करते हैं।",
    },
  },
  {
    id: "govinda-jaya-jaya",
    title: { en: "Govinda Jaya Jaya", hi: "गोविन्द जय जय" },
    attribution: { en: "Traditional", hi: "पारम्परिक" },
    lines: [
      {
        at: null,
        devanagari: "गोविन्द जय जय गोपाल जय जय",
        roman: "govinda jaya jaya gopāla jaya jaya",
      },
      {
        at: null,
        devanagari: "राधा-रमण हरि गोविन्द जय जय",
        roman: "rādhā-ramaṇa hari govinda jaya jaya",
      },
    ],
    meaning: {
      en: "Glory to Govinda, glory to Gopala. Glory to Hari, the delight of Radha.",
      hi: "गोविन्द की जय, गोपाल की जय। राधा के आनन्ददायी हरि की जय।",
    },
  },
  {
    id: "hari-haraye",
    title: { en: "Hari Haraye Namah Krishna", hi: "हरि हरये नमः कृष्ण" },
    attribution: { en: "Traditional", hi: "पारम्परिक" },
    lines: [
      {
        at: null,
        devanagari: "हरि हरये नमः कृष्ण यादवाय नमः",
        roman: "hari haraye namaḥ kṛṣṇa yādavāya namaḥ",
      },
      {
        at: null,
        devanagari: "यादवाय माधवाय केशवाय नमः",
        roman: "yādavāya mādhavāya keśavāya namaḥ",
      },
    ],
    meaning: {
      en: "Obeisances to Hari, to Krishna, to the descendant of Yadu — to Madhava, to Keshava.",
      hi: "हरि को नमन, कृष्ण को नमन, यदुवंशी को नमन — माधव को, केशव को नमन।",
    },
  },
  {
    id: "nrsimha-pranama",
    title: { en: "Sri Nrisimha Pranama", hi: "श्री नृसिंह प्रणाम" },
    attribution: { en: "Traditional", hi: "पारम्परिक" },
    lines: [
      {
        at: null,
        devanagari: "नमस्ते नरसिंहाय प्रह्लादाह्लाददायिने।",
        roman: "namas te narasiṁhāya prahlādāhlāda-dāyine",
      },
      {
        at: null,
        devanagari: "हिरण्यकशिपोर्वक्षःशिलाटङ्कनखालये॥",
        roman: "hiraṇyakaśipor vakṣaḥ-śilā-ṭaṅka-nakhālaye",
      },
      {
        at: null,
        devanagari: "इतो नृसिंहः परतो नृसिंहो",
        roman: "ito nṛsiṁhaḥ parato nṛsiṁho",
      },
      {
        at: null,
        devanagari: "यतो यतो यामि ततो नृसिंहः।",
        roman: "yato yato yāmi tato nṛsiṁhaḥ",
      },
      {
        at: null,
        devanagari: "बहिर्नृसिंहो हृदये नृसिंहो",
        roman: "bahir nṛsiṁho hṛdaye nṛsiṁho",
      },
      {
        at: null,
        devanagari: "नृसिंहमादिं शरणं प्रपद्ये॥",
        roman: "nṛsiṁham ādiṁ śaraṇaṁ prapadye",
      },
    ],
    meaning: {
      en: "Obeisances to Lord Nrisimha, who gives joy to Prahlada. Nrisimha is here and Nrisimha is there; wherever I go, Nrisimha is there. He is outside and within the heart. I take shelter of Him, the origin of all.",
      hi: "प्रह्लाद को आनन्द देने वाले भगवान नृसिंह को नमन। नृसिंह यहाँ हैं और नृसिंह वहाँ हैं; मैं जहाँ भी जाऊँ, वहाँ नृसिंह हैं। वे बाहर भी हैं और हृदय में भी। मैं उन आदि-पुरुष की शरण लेता हूँ।",
    },
  },
  {
    id: "gurvastaka",
    title: { en: "Sri Gurvashtaka (verse 1)", hi: "श्री गुर्वष्टक (प्रथम श्लोक)" },
    attribution: {
      en: "Visvanatha Chakravarti Thakura",
      hi: "विश्वनाथ चक्रवर्ती ठाकुर",
    },
    lines: [
      {
        at: null,
        devanagari: "संसार-दावानल-लीढ-लोक-",
        roman: "saṁsāra-dāvānala-līḍha-loka-",
      },
      {
        at: null,
        devanagari: "त्राणाय कारुण्य-घनाघनत्वम्।",
        roman: "trāṇāya kāruṇya-ghanāghanatvam",
      },
      {
        at: null,
        devanagari: "प्राप्तस्य कल्याण-गुणार्णवस्य",
        roman: "prāptasya kalyāṇa-guṇārṇavasya",
      },
      {
        at: null,
        devanagari: "वन्दे गुरोः श्रीचरणारविन्दम्॥",
        roman: "vande guroḥ śrī-caraṇāravindam",
      },
    ],
    meaning: {
      en: "The world is a forest fire, and the teacher is the rain cloud that comes to put it out. He is an ocean of good qualities. I bow to his lotus feet.",
      hi: "यह संसार दावानल है, और गुरु वह करुणा-मेघ हैं जो उसे बुझाने आते हैं। वे कल्याणकारी गुणों के सागर हैं। मैं उनके श्रीचरणकमलों में प्रणाम करता हूँ।",
    },
  },
];

/**
 * The database's tracks and the built-in ones, in one list.
 *
 * A `KirtanTrack` row is normalised into the same shape as the library above
 * so the player has exactly one thing to render. Rows come first: a real
 * recording of the temple's own kirtan is more interesting than a lyric sheet,
 * and the sheets are still there underneath it.
 */
export function mergeTracks(dbTracks = []) {
  const fromDb = dbTracks.map((track) => ({
    id: String(track._id),
    title: track.title,
    attribution: track.artist ? { en: track.artist, hi: track.artist } : null,
    audioUrl: track.audioUrl ?? null,
    coverImage: track.coverImage ?? null,
    lines: Array.isArray(track.lyrics) ? track.lyrics : [],
    meaning: null,
  }));

  const builtIn = KIRTAN_LIBRARY.map((track) => ({
    ...track,
    audioUrl: null,
    coverImage: null,
  }));

  return [...fromDb, ...builtIn];
}

/** True when a track can drive the karaoke highlight. */
export function isSynced(track) {
  return (
    Boolean(track.audioUrl) &&
    track.lines.length > 0 &&
    track.lines.every((line) => typeof line.at === "number")
  );
}
