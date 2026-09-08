/**
 * The eighteen chapters, and the sixteen feelings the verse finder is built
 * around.
 *
 * Both are data rather than UI copy — a chapter's name is part of the verse
 * record, not a label on a button — so they live here beside the verses
 * instead of in `messages/*.json`.
 */

export const CHAPTERS = [
  {
    number: 1,
    sanskrit: { en: "Arjuna Vishada Yoga", hi: "अर्जुन विषाद योग" },
    title: { en: "Arjuna's Despair", hi: "अर्जुन का विषाद" },
  },
  {
    number: 2,
    sanskrit: { en: "Sankhya Yoga", hi: "सांख्य योग" },
    title: { en: "The Yoga of Analysis", hi: "ज्ञान का विश्लेषण" },
  },
  {
    number: 3,
    sanskrit: { en: "Karma Yoga", hi: "कर्म योग" },
    title: { en: "The Yoga of Action", hi: "कर्म का योग" },
  },
  {
    number: 4,
    sanskrit: { en: "Jnana Karma Sannyasa Yoga", hi: "ज्ञान कर्म संन्यास योग" },
    title: { en: "Knowledge, Action and Renunciation", hi: "ज्ञान, कर्म और संन्यास" },
  },
  {
    number: 5,
    sanskrit: { en: "Karma Sannyasa Yoga", hi: "कर्म संन्यास योग" },
    title: { en: "The Yoga of Renunciation", hi: "संन्यास का योग" },
  },
  {
    number: 6,
    sanskrit: { en: "Dhyana Yoga", hi: "ध्यान योग" },
    title: { en: "The Yoga of Meditation", hi: "ध्यान का योग" },
  },
  {
    number: 7,
    sanskrit: { en: "Jnana Vijnana Yoga", hi: "ज्ञान विज्ञान योग" },
    title: { en: "Knowledge and Realisation", hi: "ज्ञान और विज्ञान" },
  },
  {
    number: 8,
    sanskrit: { en: "Akshara Brahma Yoga", hi: "अक्षर ब्रह्म योग" },
    title: { en: "The Imperishable Absolute", hi: "अविनाशी ब्रह्म" },
  },
  {
    number: 9,
    sanskrit: { en: "Raja Vidya Raja Guhya Yoga", hi: "राजविद्या राजगुह्य योग" },
    title: { en: "The King of Knowledge", hi: "विद्याओं का राजा" },
  },
  {
    number: 10,
    sanskrit: { en: "Vibhuti Yoga", hi: "विभूति योग" },
    title: { en: "The Divine Opulences", hi: "भगवान की विभूतियाँ" },
  },
  {
    number: 11,
    sanskrit: { en: "Vishvarupa Darshana Yoga", hi: "विश्वरूप दर्शन योग" },
    title: { en: "The Universal Form", hi: "विराट रूप का दर्शन" },
  },
  {
    number: 12,
    sanskrit: { en: "Bhakti Yoga", hi: "भक्ति योग" },
    title: { en: "The Yoga of Devotion", hi: "भक्ति का योग" },
  },
  {
    number: 13,
    sanskrit: { en: "Kshetra Kshetrajna Vibhaga Yoga", hi: "क्षेत्र क्षेत्रज्ञ विभाग योग" },
    title: { en: "The Field and Its Knower", hi: "क्षेत्र और क्षेत्रज्ञ" },
  },
  {
    number: 14,
    sanskrit: { en: "Gunatraya Vibhaga Yoga", hi: "गुणत्रय विभाग योग" },
    title: { en: "The Three Modes of Nature", hi: "प्रकृति के तीन गुण" },
  },
  {
    number: 15,
    sanskrit: { en: "Purushottama Yoga", hi: "पुरुषोत्तम योग" },
    title: { en: "The Supreme Person", hi: "परम पुरुष" },
  },
  {
    number: 16,
    sanskrit: { en: "Daivasura Sampad Vibhaga Yoga", hi: "दैवासुर सम्पद् विभाग योग" },
    title: { en: "The Divine and the Demoniac", hi: "दैवी और आसुरी सम्पदा" },
  },
  {
    number: 17,
    sanskrit: { en: "Shraddhatraya Vibhaga Yoga", hi: "श्रद्धात्रय विभाग योग" },
    title: { en: "The Three Kinds of Faith", hi: "श्रद्धा के तीन प्रकार" },
  },
  {
    number: 18,
    sanskrit: { en: "Moksha Sannyasa Yoga", hi: "मोक्ष संन्यास योग" },
    title: { en: "Liberation through Renunciation", hi: "संन्यास द्वारा मोक्ष" },
  },
];

export function chapterOf(number) {
  return CHAPTERS[number - 1];
}

/**
 * The mood grid.
 *
 * Sixteen tiles, four across — the size at which someone scanning for their
 * own state finds it without reading every option. The wording is deliberately
 * ordinary rather than devotional ("Can't get going", not "Afflicted by
 * tamas"): the whole point of this door is that it opens for someone who has
 * never opened a Gita.
 *
 * `emoji` carries the tile; `tone` picks which of the two glass tints the card
 * uses, so the grid reads as heavy states and light ones at a glance.
 */
export const MOODS = [
  { key: "anxious", emoji: "😰", tone: "heavy", label: { en: "Anxious", hi: "चिंतित" } },
  { key: "afraid", emoji: "😨", tone: "heavy", label: { en: "Afraid", hi: "भयभीत" } },
  { key: "angry", emoji: "😠", tone: "heavy", label: { en: "Angry", hi: "क्रोधित" } },
  { key: "grieving", emoji: "😢", tone: "heavy", label: { en: "Grieving", hi: "शोकाकुल" } },
  { key: "lonely", emoji: "🫂", tone: "heavy", label: { en: "Lonely", hi: "अकेला" } },
  { key: "guilty", emoji: "😔", tone: "heavy", label: { en: "Guilty", hi: "अपराधबोध" } },
  {
    key: "unmotivated",
    emoji: "🛏️",
    tone: "heavy",
    label: { en: "Can't get going", hi: "मन नहीं लगता" },
  },
  {
    key: "overwhelmed",
    emoji: "🌊",
    tone: "heavy",
    label: { en: "Overwhelmed", hi: "अभिभूत" },
  },
  {
    key: "tempted",
    emoji: "🍫",
    tone: "heavy",
    label: { en: "Tempted", hi: "प्रलोभित" },
  },
  {
    key: "doubting",
    emoji: "🤔",
    tone: "heavy",
    label: { en: "Full of doubt", hi: "संशयग्रस्त" },
  },
  { key: "lost", emoji: "🧭", tone: "heavy", label: { en: "Lost", hi: "दिशाहीन" } },
  {
    key: "restless",
    emoji: "🌀",
    tone: "heavy",
    label: { en: "Restless mind", hi: "बेचैन मन" },
  },
  {
    key: "failing",
    emoji: "📉",
    tone: "heavy",
    label: { en: "Failing at it", hi: "असफल" },
  },
  {
    key: "grateful",
    emoji: "🙏",
    tone: "light",
    label: { en: "Grateful", hi: "कृतज्ञ" },
  },
  { key: "joyful", emoji: "✨", tone: "light", label: { en: "Joyful", hi: "आनंदित" } },
  {
    key: "seeking",
    emoji: "🪔",
    tone: "light",
    label: { en: "Want to go deeper", hi: "और गहरे जाना है" },
  },
];

export function moodByKey(key) {
  return MOODS.find((mood) => mood.key === key) ?? null;
}
