/**
 * The acharyas Sarathi can speak as, and the Sarathi hub's feature cards.
 *
 * Client-safe on purpose: this is what the picker and the chat header draw,
 * and it carries nothing a visitor should not see. The persona dossiers — the
 * biography, the voice, the guardrails the model is held to — live in
 * `lib/sarathi/personas/` and are only ever imported by the API route.
 *
 * Only acharyas who have left this world are listed. Putting words in the
 * mouth of a living teacher, with a disciple able to quote the chatbot back at
 * him, is not a thing this site is willing to do.
 */

export const SARATHI_FEATURES = [
  { key: "avatars", href: "/sarathi/avatars", icon: "UsersRound", status: "live" },
  { key: "ask_shastra", href: null, icon: "BookOpenText", status: "soon" },
  { key: "verse_explain", href: null, icon: "Languages", status: "soon" },
  { key: "sadhana_coach", href: null, icon: "Sprout", status: "soon" },
];

export const AVATARS = [
  {
    slug: "srila-prabhupada",
    status: "live",
    monogram: "ŚP",
    years: "1896 – 1977",
    name: { en: "Srila Prabhupada", hi: "श्रील प्रभुपाद" },
    fullName: {
      en: "His Divine Grace A.C. Bhaktivedanta Swami Prabhupada",
      hi: "कृष्णकृपाश्रीमूर्ति श्री श्रीमद् ए.सी. भक्तिवेदान्त स्वामी प्रभुपाद",
    },
    role: {
      en: "Founder-Acharya of ISKCON",
      hi: "इस्कॉन के संस्थापक-आचार्य",
    },
    blurb: {
      en: "Sailed to America at sixty-nine with a trunk of books, and in eleven years gave the world the Hare Krishna movement, 108 temples and the Bhagavad-gita As It Is.",
      hi: "उनहत्तर वर्ष की आयु में पुस्तकों की एक पेटी लेकर अमेरिका गए, और ग्यारह वर्षों में संसार को हरे कृष्ण आंदोलन, 108 मंदिर और भगवद्गीता यथारूप दी।",
    },
    greeting: {
      en: "Hare Krishna. So, you have come with some question. That is very good — the Vedanta-sutra begins, athāto brahma-jijñāsā: now is the time to inquire. Please ask, whatever is in your heart.",
      hi: "हरे कृष्ण। तो आप कुछ प्रश्न लेकर आए हैं। यह बहुत अच्छा है — वेदान्त-सूत्र का आरम्भ ही है, अथातो ब्रह्मजिज्ञासा: अब जिज्ञासा का समय है। पूछिए, जो भी आपके हृदय में है।",
    },
    suggestions: {
      en: [
        "Why should I chant Hare Krishna?",
        "I can't control my mind. What should I do?",
        "What happens to us after death?",
        "Why did you go to America at the age of 69?",
      ],
      hi: [
        "मुझे हरे कृष्ण क्यों जपना चाहिए?",
        "मेरा मन मेरे वश में नहीं रहता। क्या करूँ?",
        "मृत्यु के बाद हमारा क्या होता है?",
        "आप 69 वर्ष की आयु में अमेरिका क्यों गए?",
      ],
    },
  },
  {
    slug: "bhaktisiddhanta-sarasvati",
    status: "soon",
    monogram: "BS",
    years: "1874 – 1937",
    name: { en: "Bhaktisiddhanta Sarasvati Thakura", hi: "भक्तिसिद्धान्त सरस्वती ठाकुर" },
    role: { en: "Spiritual master of Srila Prabhupada", hi: "श्रील प्रभुपाद के गुरु" },
  },
  {
    slug: "bhaktivinoda-thakura",
    status: "soon",
    monogram: "BT",
    years: "1838 – 1914",
    name: { en: "Bhaktivinoda Thakura", hi: "भक्तिविनोद ठाकुर" },
    role: { en: "Pioneer of Gaudiya Vaishnavism in the modern age", hi: "आधुनिक युग में गौड़ीय वैष्णव धर्म के अग्रदूत" },
  },
];

export function avatarBySlug(slug) {
  return AVATARS.find((avatar) => avatar.slug === slug) ?? null;
}

export function liveAvatars() {
  return AVATARS.filter((avatar) => avatar.status === "live");
}
