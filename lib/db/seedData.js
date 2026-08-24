import { dbConnect } from "./connect.js";
import FeatureFlag from "../../models/FeatureFlag.js";
import Program from "../../models/Program.js";
import Course from "../../models/Course.js";
import Festival from "../../models/Festival.js";
import GalleryItem from "../../models/GalleryItem.js";
import QuizQuestion from "../../models/QuizQuestion.js";
import KirtanTrack from "../../models/KirtanTrack.js";

const FLAGS = [
  { key: "whatsapp_notifications", enabled: false, temporary: true, meta: { provider: "aisensy", note: "Off until a WhatsApp provider is chosen." } },
  { key: "sms_notifications", enabled: false, temporary: true, meta: { note: "Off until an SMS provider is chosen." } },
  { key: "payment_gateway", enabled: false, temporary: true, meta: { note: "Off until payments are needed." } },
  { key: "home.showLiveEventBanner", enabled: false, temporary: false, meta: { note: "Kill switch for the live event banner on Home." } },
  { key: "playground.japa_counter", enabled: true, temporary: true, meta: { note: "Japa Counter is built and demoable." } },
  { key: "playground.kirtan_library", enabled: false, temporary: true, meta: { note: "Off until real kirtan recordings are uploaded." } },
  { key: "playground.gita_quiz", enabled: true, temporary: true, meta: { note: "Gita Quiz is built and demoable." } },
  { key: "playground.spiritual_calendar", enabled: false, temporary: true, meta: { note: "Off — needs a verified Vaishnava panchang data source." } },
  { key: "registrations.programsOpen", enabled: true, temporary: false, meta: { note: "Kill switch for all Program/Course registrations." } },
  { key: "maintenance_mode", enabled: false, temporary: false, meta: { note: "Site-wide maintenance kill switch." } },
  { key: "admin.attendanceEditingEnabled", enabled: true, temporary: false, meta: { note: "Kill switch for admin attendance editing." } },
  { key: "dashboard.enabled", enabled: true, temporary: true, meta: { note: "On for local dev/demo." } },
  { key: "i18n.englishEnabled", enabled: true, temporary: true, meta: { note: "Both hi/en are built, so on." } },
  { key: "pwa.installPromptEnabled", enabled: true, temporary: true, meta: { note: "On for local dev/demo." } },
];

const PROGRAMS = [
  {
    title: { hi: "रविवार भक्ति सत्संग", en: "Sunday Bhakti Satsang" },
    description: {
      hi: "कीर्तन, भगवद्गीता से एक छोटी सी बात और प्रसादम के साथ हमारा साप्ताहिक सामुदायिक सत्र। नए लोगों का स्वागत है, कोई पूर्व अनुभव आवश्यक नहीं।",
      en: "Our weekly community gathering — kirtan, a short talk from the Bhagavad Gita, and prasadam. Newcomers welcome, no prior experience needed.",
    },
    schedule: { hi: "हर रविवार, शाम 5:30 बजे", en: "Every Sunday, 5:30 PM" },
    location: { hi: "इस्कॉन मंदिर, पटना", en: "ISKCON Temple, Patna" },
    image: "https://picsum.photos/seed/iyf-satsang/800/600",
    order: 1,
  },
  {
    title: { hi: "साप्ताहिक कीर्तन अभ्यास", en: "Weekly Kirtan Practice" },
    description: {
      hi: "मृदंग, करताल और भजन का हाथों-हाथ अभ्यास। संगीत का कोई पूर्व ज्ञान आवश्यक नहीं।",
      en: "Hands-on practice with mridanga, karatalas and call-and-response kirtan. No musical background required.",
    },
    schedule: { hi: "हर बुधवार, शाम 6:00 बजे", en: "Every Wednesday, 6:00 PM" },
    location: { hi: "इस्कॉन मंदिर, पटना", en: "ISKCON Temple, Patna" },
    image: "https://picsum.photos/seed/iyf-kirtan/800/600",
    order: 2,
  },
  {
    title: { hi: "सेवा प्रोजेक्ट: भोजन वितरण", en: "Seva Project: Food Distribution" },
    description: {
      hi: "पटना के आसपास ज़रूरतमंद परिवारों को प्रसादम पहुंचाने वाली टीम के साथ जुड़ें।",
      en: "Join the team distributing prasadam meals to families in need around Patna.",
    },
    schedule: { hi: "महीने का दूसरा शनिवार", en: "Second Saturday of the month" },
    location: { hi: "अलग-अलग स्थान (पुष्टि के लिए संपर्क करें)", en: "Varies by month — confirm on joining" },
    image: "https://picsum.photos/seed/iyf-seva/800/600",
    order: 3,
  },
];

const COURSES = [
  {
    title: { hi: "भगवद्गीता का परिचय", en: "Introduction to the Bhagavad Gita" },
    description: {
      hi: "छह सप्ताह की श्रृंखला जो गीता की मूल शिक्षाओं से परिचित कराती है — आत्मा, कर्म और जीवन का उद्देश्य।",
      en: "A six-week series covering the Gita's core teachings — the soul, karma and the purpose of life.",
    },
    duration: { hi: "6 सप्ताह", en: "6 weeks" },
    level: "beginner",
    image: "https://picsum.photos/seed/iyf-gita-course/800/600",
    order: 1,
  },
  {
    title: { hi: "जप और ध्यान की कार्यशाला", en: "Japa & Meditation Workshop" },
    description: {
      hi: "माला जप की तकनीक, ध्यान लगाने के व्यावहारिक तरीके और एक स्थायी अभ्यास बनाने पर एक व्यावहारिक कोर्स।",
      en: "A practical course on japa technique, focus, and building a sustainable daily practice.",
    },
    duration: { hi: "3 सप्ताह", en: "3 weeks" },
    level: "beginner",
    image: "https://picsum.photos/seed/iyf-japa-course/800/600",
    order: 2,
  },
];

const FESTIVAL = {
  title: { hi: "जन्माष्टमी", en: "Janmashtami" },
  description: {
    hi: "भगवान श्री कृष्ण के प्राकट्य का उत्सव — झूलन उत्सव से लेकर जन्माष्टमी तक।",
    en: "Celebrating the appearance of Lord Sri Krishna — from Jhulan Utsav through to Janmashtami.",
  },
  image: "https://picsum.photos/seed/iyf-janmashtami/1200/800",
  isCurrent: true,
  schedule: [
    { dateLabel: { hi: "23–28 जुलाई", en: "23–28 Jul" }, title: { hi: "झूलन उत्सव", en: "Jhulan Utsav" } },
    { dateLabel: { hi: "30 जुलाई", en: "30 Jul" }, title: { hi: "अधिवास", en: "Adhivas" } },
    { dateLabel: { hi: "31 जुलाई – 2 अगस्त", en: "31 Jul – 2 Aug" }, title: { hi: "कीर्तन मेला", en: "Kirtan Mela" } },
    { dateLabel: { hi: "4 अगस्त", en: "4 Aug" }, title: { hi: "जन्माष्टमी", en: "Janmashtami" } },
  ],
};

const GALLERY = Array.from({ length: 8 }).map((_, i) => ({
  image: `https://picsum.photos/seed/iyf-gallery-${i + 1}/900/700`,
  caption: { hi: `समुदाय का पल ${i + 1}`, en: `Community moment ${i + 1}` },
  order: i,
}));

const QUIZ_QUESTIONS = [
  {
    chapter: 1,
    question: { hi: "भगवद्गीता किस महाकाव्य का हिस्सा है?", en: "The Bhagavad Gita is part of which epic?" },
    options: [
      { hi: "रामायण", en: "Ramayana" },
      { hi: "महाभारत", en: "Mahabharata" },
      { hi: "पुराण", en: "Puranas" },
      { hi: "उपनिषद", en: "Upanishads" },
    ],
    correctIndex: 1,
  },
  {
    chapter: 1,
    question: { hi: "गीता का उपदेश किसने किसको दिया?", en: "Who spoke the Gita, and to whom?" },
    options: [
      { hi: "अर्जुन ने कृष्ण को", en: "Arjuna to Krishna" },
      { hi: "कृष्ण ने अर्जुन को", en: "Krishna to Arjuna" },
      { hi: "व्यास ने संजय को", en: "Vyasa to Sanjaya" },
      { hi: "भीष्म ने युधिष्ठिर को", en: "Bhishma to Yudhishthira" },
    ],
    correctIndex: 1,
  },
  {
    chapter: 2,
    question: {
      hi: "भगवद्गीता के अनुसार आत्मा का क्या होता है जब शरीर नष्ट होता है?",
      en: "According to the Gita, what happens to the soul when the body is destroyed?",
    },
    options: [
      { hi: "आत्मा भी नष्ट हो जाती है", en: "The soul is also destroyed" },
      { hi: "आत्मा शाश्वत और अविनाशी है", en: "The soul is eternal and indestructible" },
      { hi: "आत्मा सो जाती है", en: "The soul goes to sleep" },
      { hi: "आत्मा भूल जाती है", en: "The soul forgets everything" },
    ],
    correctIndex: 1,
  },
];

const KIRTAN_TRACKS = [
  {
    title: { hi: "हरे कृष्ण महामंत्र (लाइव)", en: "Hare Krishna Maha-mantra (Live)" },
    artist: "IYF Patna Kirtan Team",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    coverImage: "https://picsum.photos/seed/iyf-kirtan-1/400/400",
    order: 1,
  },
  {
    title: { hi: "जन्माष्टमी कीर्तन मेला", en: "Janmashtami Kirtan Mela" },
    artist: "IYF Patna Kirtan Team",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    coverImage: "https://picsum.photos/seed/iyf-kirtan-2/400/400",
    order: 2,
  },
];

async function upsertMany(Model, docs, matchKeys) {
  for (const doc of docs) {
    const filter = {};
    for (const key of matchKeys) filter[key] = doc[key];
    await Model.findOneAndUpdate(filter, doc, {
      upsert: true,
      returnDocument: "after",
      setDefaultsOnInsert: true,
    });
  }
}

export async function runSeed({ log = console.log } = {}) {
  await dbConnect();

  for (const flag of FLAGS) {
    await FeatureFlag.findOneAndUpdate(
      { key: flag.key },
      { $setOnInsert: flag },
      { upsert: true }
    );
  }
  log(`[seed] ${FLAGS.length} feature flags ensured`);

  await upsertMany(Program, PROGRAMS, ["order"]);
  log(`[seed] ${PROGRAMS.length} programs ensured`);

  await upsertMany(Course, COURSES, ["order"]);
  log(`[seed] ${COURSES.length} courses ensured`);

  await Festival.updateMany({ isCurrent: true }, { $set: { isCurrent: false } });
  await Festival.findOneAndUpdate({ "title.en": FESTIVAL.title.en }, FESTIVAL, {
    upsert: true,
    returnDocument: "after",
  });
  log("[seed] festival (Janmashtami, isCurrent) ensured");

  await upsertMany(GalleryItem, GALLERY, ["order"]);
  log(`[seed] ${GALLERY.length} gallery items ensured`);

  await upsertMany(QuizQuestion, QUIZ_QUESTIONS, ["chapter", "question.en"]);
  log(`[seed] ${QUIZ_QUESTIONS.length} quiz questions ensured`);

  await upsertMany(KirtanTrack, KIRTAN_TRACKS, ["order"]);
  log(`[seed] ${KIRTAN_TRACKS.length} kirtan tracks ensured`);

  log("[seed] done");
}
