import { dbConnect } from "./connect.js";
import FeatureFlag from "../../models/FeatureFlag.js";
import Program from "../../models/Program.js";
import Course from "../../models/Course.js";
import Festival from "../../models/Festival.js";
import GalleryItem from "../../models/GalleryItem.js";
import QuizQuestion from "../../models/QuizQuestion.js";
import KirtanTrack from "../../models/KirtanTrack.js";
import SiteSetting, { SETTING_KEYS } from "../../models/SiteSetting.js";
import { WHATSAPP_GROUP_URL } from "../site-config.js";

/*
 * Editable settings, planted with the values the code already ships.
 *
 * This is only an initialiser. Like FLAGS below it is written with
 * $setOnInsert, so a key that already exists is left exactly as it is — the
 * point of /admin/settings is that someone can change the WhatsApp invite
 * without a developer, and a seed run that quietly reverted last week's edit
 * because someone was re-seeding quiz questions would make the admin screen
 * untrustworthy.
 *
 * So: to publish a new link, use /admin/settings. Edit the constant in
 * site-config here only to change what a *fresh* database starts life with.
 * (To deliberately force the code value back over a stored one, swap the
 * $setOnInsert below for $set and run the seed once.)
 */
const SETTINGS = [
  { key: SETTING_KEYS.whatsappGroupUrl, value: WHATSAPP_GROUP_URL },
];

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

/*
 * Programs and courses carry no artwork of their own.
 *
 * Left without one, every card renders its category's 3D clip from
 * DEFAULT_MEDIA in lib/site-config.js — which is what the pages show today.
 * To give a single item its own clip, add a `video` here (or set it on the
 * row in the database); `mediaFor()` prefers it over the category default, so
 * one item can be changed without touching any other. A still `image` works
 * the same way and also beats the default.
 */
const PROGRAMS = [
  {
    title: { hi: "मंत्र ध्यान", en: "Mantra Meditation" },
    description: {
      hi: "हर रविवार, हम मंत्र ध्यान सत्र के लिए एकत्र होते हैं।",
      en: "Our weekly mantra meditation session.",
    },
    schedule: { hi: "हर रविवार, शाम 5:30 बजे", en: "Every Sunday, 5:30 PM" },
    location: { hi: "इस्कॉन मंदिर, पटना", en: "ISKCON Temple, Patna" },
    order: 1,
  },
  {
    title: { hi: "साप्ताहिक संगोष्ठी", en: "Weekly Seminar" },
    description: {
      hi: "हर सप्ताह, हम गीता जैसे आध्यात्मिक विषयों पर एक संगोष्ठी के लिए एकत्र होते हैं।",
      en: "Every week, we gather for a seminar on spiritual topics like Gita in daily life.",
    },
    schedule: { hi: "हर बुधवार, शाम 6:00 बजे", en: "Every Wednesday, 6:00 PM" },
    location: { hi: "इस्कॉन मंदिर, पटना", en: "ISKCON Temple, Patna" },
    order: 2,
  },
];

const COURSES = [
  {
    title: { hi: "गीता में प्रवीणता पाठ्यक्रम", en: "Bhagavad Gita mastery course" },
    description: {
      hi: "गीता की मूल शिक्षाओं को कवर करने वाली एक श्रृंखला — आत्मा, कर्म और जीवन का उद्देश्य।",
      en: "A series covering the Gita's core teachings — the soul, karma and the purpose of life.",
    },
    duration: { hi: "6 सप्ताह", en: "6 weeks" },
    level: "beginner",
    order: 1,
  },
  {
    title: { hi: "खुद को खोजें", en: "Discover Yourself" },
    description: {
      hi: "एक व्यावहारिक कोर्स जो आत्म-खोज और व्यक्तिगत विकास पर केंद्रित है।",
      en: "A practical course focused on self-discovery and personal growth.",
    },
    duration: { hi: "3 सप्ताह", en: "3 weeks" },
    level: "beginner",
    order: 2,
  },
   {
    title: { hi: "आधुनिक युग के लिए योग", en: "Yoga for modern age" },
    description: {
      hi: "आधुनिक जीवन में योग के सिद्धांतों और अभ्यासों पर एक व्यावहारिक कोर्स।",
      en: "A practical course on the principles and practices of yoga in modern life.",
    },
    duration: { hi: "3 सप्ताह", en: "3 weeks" },
    level: "beginner",
    order: 3,
  },
   {
    title: { hi: "आधुनिक विज्ञान और लागू आध्यात्मिकता", en: "Modern science & applied spirituality" },
    description: {
      hi: "आधुनिक विज्ञान और लागू आध्यात्मिकता पर एक व्यावहारिक कोर्स।",
      en: "A practical course on modern science and applied spirituality.",
    },
    duration: { hi: "3 सप्ताह", en: "3 weeks" },
    level: "beginner",
    order: 4,
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
    { dateLabel: { hi: "23–28 जुलाई", en: "23–28 Aug" }, title: { hi: "झूलन उत्सव", en: "Jhulan Utsav" } },
    { dateLabel: { hi: "30 जुलाई", en: "30 Aug" }, title: { hi: "अधिवास", en: "Adhivas" } },
    { dateLabel: { hi: "31 जुलाई – 2 अगस्त", en: "31 Aug – 2 Sep" }, title: { hi: "कीर्तन मेला", en: "Kirtan Mela" } },
    { dateLabel: { hi: "4 अगस्त", en: "4 Sep" }, title: { hi: "जन्माष्टमी", en: "Janmashtami" } },
  ],
};

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

const PLACEHOLDER_IMAGE = /^https?:\/\/picsum\.photos\//;

/**
 * Removes the stand-in artwork the first version of this seed shipped.
 *
 * Two reasons it has to be an explicit step rather than just dropping the
 * URLs from the data above. `upsertMany` sends a partial document, so Mongo
 * $sets only the keys it is given — a row seeded earlier keeps its old
 * `image` forever unless something unsets it. And a card with any `image` at
 * all wins over the category video in `mediaFor()`, so one leftover
 * placeholder is the difference between a card showing the 3D clip and a card
 * showing a random photo.
 *
 * Gallery rows are deleted outright: the photographs the temple supplied live
 * in GALLERY_IMAGES (lib/site-config.js) and the page already renders those,
 * so a placeholder row is nothing but an extra tile. Real uploads recorded
 * later are untouched — the filter only matches picsum.photos.
 */
async function clearPlaceholderMedia(log) {
  const [programs, courses, gallery] = await Promise.all([
    Program.updateMany({ image: PLACEHOLDER_IMAGE }, { $unset: { image: "" } }),
    Course.updateMany({ image: PLACEHOLDER_IMAGE }, { $unset: { image: "" } }),
    GalleryItem.deleteMany({ image: PLACEHOLDER_IMAGE }),
  ]);

  log(
    `[seed] placeholders cleared: ${programs.modifiedCount} program, ` +
      `${courses.modifiedCount} course, ${gallery.deletedCount} gallery`
  );
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

  for (const setting of SETTINGS) {
    await SiteSetting.findOneAndUpdate(
      { key: setting.key },
      { $setOnInsert: setting },
      { upsert: true }
    );
  }
  log(`[seed] ${SETTINGS.length} site settings ensured`);

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

  await clearPlaceholderMedia(log);

  await upsertMany(QuizQuestion, QUIZ_QUESTIONS, ["chapter", "question.en"]);
  log(`[seed] ${QUIZ_QUESTIONS.length} quiz questions ensured`);

  await upsertMany(KirtanTrack, KIRTAN_TRACKS, ["order"]);
  log(`[seed] ${KIRTAN_TRACKS.length} kirtan tracks ensured`);

  log("[seed] done");
}
