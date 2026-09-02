/**
 * Identity, governance and link map for iyfpatna.in — in one place.
 *
 * IYF Patna is not an independent society: it is the youth wing of ISKCON
 * Patna, and every public surface has to say so. The header, the footer, the
 * about page and the page metadata all read their wording from here rather
 * than each restating the relationship in their own words, so the claim can
 * never drift between pages.
 *
 * Anything that differs between environments (the yatra host, contact
 * details) is read from the environment with a production default, so a
 * developer running locally still sees the real values in the footer they are
 * proofreading.
 */

/** Strips scheme and trailing slash: "https://a.b/" -> "a.b". */
function hostOf(url, fallback) {
  const host = String(url || "")
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "")
    .trim();
  return host || fallback;
}

export const ORG = {
  /** The youth wing itself. */
  name: "ISKCON Youth Forum Patna",
  shortName: "IYF Patna",

  /**
   * The parent body. IYF Patna has no separate legal personality — donations,
   * registrations and every legal notice run through ISKCON Patna, so this is
   * the name that belongs on the legal pages.
   */
  parent: "ISKCON Patna",
  parentLegalName:
    process.env.NEXT_PUBLIC_ORG_LEGAL_NAME ||
    "International Society for Krishna Consciousness (ISKCON), Patna",

  address:
    process.env.NEXT_PUBLIC_ORG_ADDRESS ||
    "Sri Sri Radha Banke Bihari Temple, Buddha Marg, Patna - 800001, Bihar, India",

  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contact@iyfpatna.in",
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || "+91 90310 54014",

  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://iyfpatna.in",
  domain:
    process.env.NEXT_PUBLIC_ORG_DOMAIN ||
    hostOf(process.env.NEXT_PUBLIC_SITE_URL, "iyfpatna.in"),

  /** Date the legal pages were last reviewed. Bump when you edit them. */
  policyUpdated: process.env.NEXT_PUBLIC_POLICY_UPDATED || "2026-09-01",
};

/**
 * The Vrindavan yatra runs as its own deployment with its own payment
 * gateway and database, so the nav points at it by absolute URL rather than
 * importing any of it.
 *
 * Kept as one env-overridable constant on purpose: if the yatra is later
 * folded in as a route or proxied through a multi-zone rewrite, this single
 * value becomes "/yatra" and every link follows.
 */
export const YATRA_URL =
  process.env.NEXT_PUBLIC_YATRA_URL || "https://yatra.iyfpatna.in";

/** True when the yatra lives on another host and the link must leave the site. */
export const yatraIsExternal = /^https?:\/\//i.test(YATRA_URL);

/**
 * WhatsApp group invite, surfaced by the floating button.
 *
 * Kept here rather than inline in the component because an invite link is the
 * kind of thing that gets rotated when a group is reset — one edit here moves
 * every place that offers it.
 */
export const WHATSAPP_GROUP_URL =
  process.env.NEXT_PUBLIC_WHATSAPP_GROUP_URL ||
  "https://chat.whatsapp.com/ChSqtqarhxV5ffNOSMWen9?s=sw&p=a&ilr=0";

/**
 * The photograph beside the WhatsApp invite on the home page.
 *
 * A group photo rather than a QR code, because what the section is really
 * asking is "do you want to be in this room" — and forty faces answer that
 * better than a scannable square does.
 *
 * Intrinsic dimensions travel with it, as they do for the gallery, so
 * next/image can reserve the right box and the section does not jump as the
 * photo loads.
 */
export const WHATSAPP_GROUP_IMAGE = {
  src: "https://ik.imagekit.io/mnkh9j9dw/IYF/WhatsApp%20Image%202026-09-02%20at%2013.03.29.jpeg",
  width: 4160,
  height: 2340,
};

/**
 * Temple Management Council, as published in the footer.
 *
 * Names are proper nouns and stay in Latin script in both locales; only the
 * role is translated, via `footer.roles.<roleKey>`.
 */
export const MANAGEMENT_COUNCIL = [
  { name: "HG Raman Manohar Das", roleKey: "co_chairman" },
  { name: "HG Adi Karta Das", roleKey: "co_chairman" },
  { name: "Rachit Goel (Radhapati Charan Das)", roleKey: "tmc_member" },
  { name: "Vinod Singh (Venu Vinod Das)", roleKey: "tmc_member" },
];

/**
 * Primary navigation.
 *
 * `key` indexes into the `nav` message namespace; nothing here carries copy.
 * `external` links leave the site and are rendered with a plain anchor plus
 * rel="noopener", not the locale-aware <Link>.
 */
export const MAIN_NAV = [
  { key: "home", href: "/" },
  { key: "about", href: "/about" },
  { key: "programs", href: "/programs" },
  { key: "courses", href: "/courses" },
  { key: "festivals", href: "/festivals" },
  { key: "schedule", href: "/schedule" },
  { key: "gallery", href: "/gallery" },
  { key: "yatra", href: YATRA_URL, external: yatraIsExternal },
];

/** Documents that must be reachable from every page. */
export const LEGAL_NAV = [
  { key: "privacy", href: "/privacy" },
  { key: "terms", href: "/terms" },
  { key: "legal", href: "/legal" },
];

/**
 * Parent-organisation lockup shown in the top band of the header.
 *
 * These are ISKCON Patna's words, not IYF Patna's — the band exists to say
 * whose roof this site sits under before the visitor reads anything else.
 */
/** ISKCON Patna's own website, linked from the parent band in the header. */
export const PARENT_SITE_URL =
  process.env.NEXT_PUBLIC_PARENT_SITE_URL || "https://www.iskconpatna.in/";

export const PARENT_BAND = {
  society: "International Society for Krishna Consciousness",
  temple: "Sri Sri Radha Banke Bihari Temple",
  founderTitle: "Founder-Ācārya His Divine Grace",
  founderName: "A. C. Bhaktivedanta Swami Prabhupāda",
};

/**
 * Social profiles for IYF Patna.
 *
 * Deliberately empty: inventing a handle would point real visitors at an
 * account we do not control. Paste the profile URLs in here (or set the
 * matching NEXT_PUBLIC_SOCIAL_* variables) and each icon appears on its own —
 * an entry with no URL is skipped, so the row is never a set of dead links.
 */
export const SOCIAL_LINKS = [
  { key: "facebook", label: "Facebook", url: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK || "" },
  { key: "x", label: "X", url: process.env.NEXT_PUBLIC_SOCIAL_X || "" },
  { key: "instagram", label: "Instagram", url: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM || "" },
  { key: "youtube", label: "YouTube", url: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE || "" },
  { key: "whatsapp", label: "WhatsApp", url: process.env.NEXT_PUBLIC_SOCIAL_WHATSAPP || "" },
];

/** Only the profiles that have actually been configured. */
export const activeSocialLinks = SOCIAL_LINKS.filter((link) => link.url);

/**
 * The temple's daily darshan and aarti schedule.
 *
 * Times are stored as 24-hour "HH:MM" strings and formatted per locale at
 * render time, so the Hindi page shows Devanagari numerals and "पूर्वाह्न"
 * rather than a hardcoded "4:30 AM" typed twice.
 *
 * `gap` marks the closure between the midday offering and the evening
 * reopening — the schedule renders it as a break in the timeline instead of
 * letting the reader assume the temple is open straight through.
 */
export const DAILY_SCHEDULE = [
  { key: "mangala_aarti", time: "04:30", icon: "bell" },
  { key: "darshan_opens", time: "07:00", icon: "door" },
  { key: "bhoga_offering", time: "12:00", icon: "sun", gap: true },
  { key: "evening_darshan", time: "16:00", icon: "lamp" },
  { key: "sandhya_aarti", time: "18:30", icon: "flame" },
  { key: "darshan_closes", time: "20:00", icon: "moon" },
];

/**
 * Photographs supplied by IYF Patna, used by the gallery and the home hero.
 *
 * Intrinsic dimensions travel with each entry so next/image can reserve the
 * right box and the page does not jump as they load. They are remote URLs on
 * purpose — the temple's media lives on ImageKit, so adding a photo is an
 * upload plus a line here rather than a redeploy with a new binary in git.
 */
export const GALLERY_IMAGES = [
  {
    id: "stupa",
    src: "https://ik.imagekit.io/mnkh9j9dw/IYF/WhatsApp%20Image%202026-08-30%20at%2016.03.37.jpeg",
    width: 560,
    height: 762,
  },
  {
    id: "ruins",
    src: "https://ik.imagekit.io/mnkh9j9dw/IYF/WhatsApp%20Image%202026-08-30%20at%2016.03.51.jpeg",
    width: 878,
    height: 758,
  },
  {
    id: "steps",
    src: "https://ik.imagekit.io/mnkh9j9dw/IYF/WhatsApp%20Image%202026-08-30%20at%2016.03.02.jpeg",
    width: 1600,
    height: 784,
  },
  {
    id: "temple",
    src: "https://ik.imagekit.io/mnkh9j9dw/IYF/WhatsApp%20Image%202026-08-30%20at%2016.03.25.jpeg",
    width: 571,
    height: 762,
  },
  //add these images https://ik.imagekit.io/mnkh9j9dw/IYF/WhatsApp%20Image%202026-09-02%20at%2013.03.29.jpeg
//https://ik.imagekit.io/mnkh9j9dw/IYF/WhatsApp%20Image%202026-09-02%20at%2013.03.31.jpeg
//https://ik.imagekit.io/mnkh9j9dw/IYF/WhatsApp%20Image%202026-09-02%20at%2013.03.37.jpeg
 {
    id: "temple",
    src: "https://ik.imagekit.io/mnkh9j9dw/IYF/WhatsApp%20Image%202026-09-02%20at%2013.03.29.jpeg",
    width: 571,
    height: 762,
  },
  {
    id: "temple",
    src: "https://ik.imagekit.io/mnkh9j9dw/IYF/WhatsApp%20Image%202026-09-02%20at%2013.03.31.jpeg",
    width: 571,
    height: 762,
  },
  {
    id: "temple",
    src: "https://ik.imagekit.io/mnkh9j9dw/IYF/WhatsApp%20Image%202026-09-02%20at%2013.03.37.jpeg",
    width: 571,
    height: 762,
  },

];

/** The photograph beside the home page headline. */
export const HERO_IMAGE = GALLERY_IMAGES[0];

/**
 * Fallback artwork for Programs and Courses.
 *
 * Every card falls back to its category's clip, so the pages look complete
 * today. An individual Program or Course overrides it simply by having a
 * `video` (or `image`) of its own in the database — see `mediaFor` below,
 * which is the single place that decides. Adding per-item clips later needs
 * no code change at all.
 */
export const DEFAULT_MEDIA = {
  program:
    "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260826_124724_bc041163-d651-425f-aea3-2acc1efc2c96.mp4",
  course:
    "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4",
};

/**
 * Resolves what to show at the top of a Program or Course card.
 *
 * Precedence: the item's own video, then its own still image, then the
 * category default. Returns `{ kind, src }` so the renderer never has to
 * sniff the file extension.
 */
export function mediaFor(item, itemType) {
  if (item?.video) return { kind: "video", src: item.video };
  if (item?.image) return { kind: "image", src: item.image };
  const fallback = DEFAULT_MEDIA[itemType];
  return fallback ? { kind: "video", src: fallback } : null;
}

/**
 * Programs and courses shown when the database is unreachable, so these pages
 * are never blank. Same shape as the documents they stand in for; real rows
 * replace them entirely as soon as Mongo answers.
 */
export const FALLBACK_PROGRAMS = [
  {
    _id: "fallback-mantra-meditation",
    title: { hi: "मंत्र ध्यान", en: "Mantra Meditation" },
    description: {
      hi: "हर रविवार, हम मंत्र ध्यान सत्र के लिए एकत्र होते हैं।",
      en: "Our weekly mantra meditation session.",
    },
    schedule: { hi: "हर रविवार, शाम 5:30 बजे", en: "Every Sunday, 5:30 PM" },
    location: { hi: "इस्कॉन मंदिर, पटना", en: "ISKCON Temple, Patna" },
  },
  {
    _id: "fallback-weekly-seminar",
    title: { hi: "साप्ताहिक संगोष्ठी", en: "Weekly Seminar" },
    description: {
      hi: "हर सप्ताह गीता जैसे आध्यात्मिक विषयों पर एक संगोष्ठी।",
      en: "A weekly seminar on spiritual topics such as the Gita in daily life.",
    },
    schedule: { hi: "हर बुधवार, शाम 6:00 बजे", en: "Every Wednesday, 6:00 PM" },
    location: { hi: "इस्कॉन मंदिर, पटना", en: "ISKCON Temple, Patna" },
  },
];

export const FALLBACK_COURSES = [
  {
    _id: "fallback-gita-mastery",
    title: { hi: "गीता में प्रवीणता", en: "Bhagavad Gita Mastery" },
    description: {
      hi: "गीता की मूल शिक्षाओं की एक श्रृंखला — आत्मा, कर्म और जीवन का उद्देश्य।",
      en: "A series covering the Gita's core teachings — the soul, karma and the purpose of life.",
    },
    duration: { hi: "6 सप्ताह", en: "6 weeks" },
    level: "beginner",
  },
  {
    _id: "fallback-discover-yourself",
    title: { hi: "खुद को खोजें", en: "Discover Yourself" },
    description: {
      hi: "आत्म-खोज और व्यक्तिगत विकास पर केंद्रित एक व्यावहारिक कोर्स।",
      en: "A practical course focused on self-discovery and personal growth.",
    },
    duration: { hi: "3 सप्ताह", en: "3 weeks" },
    level: "beginner",
  },
  {
    _id: "fallback-yoga-modern-age",
    title: { hi: "आधुनिक युग के लिए योग", en: "Yoga for the Modern Age" },
    description: {
      hi: "आधुनिक जीवन में योग के सिद्धांतों और अभ्यासों पर एक व्यावहारिक कोर्स।",
      en: "A practical course on the principles and practices of yoga in modern life.",
    },
    duration: { hi: "3 सप्ताह", en: "3 weeks" },
    level: "beginner",
  },
];

/* --------------------------------------------------------------- donations */

/**
 * Where a donation is actually taken.
 *
 * IYF Patna has no bank account, no PAN and no payment gateway of its own —
 * it is the youth wing of ISKCON Patna, and every offering made through this
 * site is collected by the temple's own registered gateway on
 * iskconpatna.in. So `/donate` is a fully-informed landing page: it names the
 * sevas, the amounts, the trust's 80G registration and the receipt process,
 * and then hands the visitor over. iyfpatna.in itself never sees a card, UPI
 * or bank detail, which is exactly what the privacy policy and the legal page
 * already promise — this page must not quietly make either of them untrue.
 */
export const PARENT_DONATE_ORIGIN =
  process.env.NEXT_PUBLIC_PARENT_DONATE_ORIGIN || "https://www.iskconpatna.in";

/** The "Donate now" destination: ISKCON Patna's own seva list. */
export const DONATIONS_URL = `${PARENT_DONATE_ORIGIN}/donations#seva-list`;

/** The temple's policies, which are the ones that govern the transaction. */
export const DONATION_POLICIES = [
  { key: "terms", href: `${PARENT_DONATE_ORIGIN}/terms` },
  { key: "refund", href: `${PARENT_DONATE_ORIGIN}/refund` },
  { key: "privacy", href: `${PARENT_DONATE_ORIGIN}/privacy` },
];

/**
 * Deep link to one seva with an amount already chosen.
 *
 * Mirrors the query the temple's own seva cards submit, so a visitor who has
 * picked "Anna Daan, ₹1,100" here does not have to pick it again on the other
 * side. If that route ever changes, this is the one place it changes; callers
 * with no slug fall back to the plain seva list.
 */
export function sevaDonateHref(slug, amount) {
  if (!slug) return DONATIONS_URL;
  const query = new URLSearchParams({ seva: slug });
  if (amount) query.set("amount", String(amount));
  return `${PARENT_DONATE_ORIGIN}/donate?${query}`;
}

/**
 * The sevas ISKCON Patna publishes, in the order the temple lists them.
 *
 * Only numbers and keys live here. Every word — the seva's name, what it pays
 * for, the sentence describing its impact — is copy and comes from the
 * `donate.seva.<key>` message namespace, so Hindi is a translation rather
 * than a second hardcoded list that can drift.
 *
 * `unit` is the rupee cost of one unit of whatever the seva buys: one meal,
 * one day of worship, one Gita. The card divides the chosen amount by it to
 * say what that amount actually does, which is how the temple's own page
 * presents each seva. Change an amount here and the impact line follows.
 */
export const SEVA_LIST = [
  {
    key: "janmashtami",
    slug: "janmashtami",
    icon: "festival",
    tagged: true,
    unit: 40,
    amounts: [1100, 2100, 5100, 11000],
    defaultAmount: 2100,
    /* The one dated entry. Rendered only while it is still ahead of us — see
       the `upcoming` check on the donate page — so the card degrades to an
       ordinary festival seva the day after rather than advertising a date
       that has passed. */
    date: "2026-09-04",
  },
  {
    key: "anna_daan",
    slug: "anna-daan",
    icon: "meal",
    tagged: true,
    unit: 40,
    amounts: [501, 1100, 2100, 5100],
    defaultAmount: 1100,
  },
  {
    key: "deity_seva",
    slug: "deity-seva",
    icon: "flower",
    unit: 2100,
    amounts: [1100, 2100, 5100, 11000],
    defaultAmount: 2100,
  },
  {
    key: "gau_seva",
    slug: "gau-seva",
    icon: "cow",
    unit: 150,
    amounts: [501, 1100, 2100, 5100],
    defaultAmount: 1100,
  },
  {
    key: "gita_daan",
    slug: "gita-daan",
    icon: "book",
    unit: 250,
    amounts: [501, 1100, 2500, 5100],
    defaultAmount: 1100,
  },
  {
    key: "nitya_seva",
    slug: "nitya-seva",
    icon: "recurring",
    tagged: true,
    unit: 1100,
    amounts: [501, 1100, 2100, 5100],
    defaultAmount: 1100,
  },
  {
    key: "temple_seva",
    slug: "temple-seva",
    icon: "temple",
    tagged: true,
    unit: 5100,
    amounts: [2100, 5100, 11000, 51000],
    defaultAmount: 5100,
  },
];

/**
 * The trust's registration numbers, as published by ISKCON Patna.
 *
 * Printed in full on the donate page for two readers: a donor who needs them
 * to claim the deduction, and a payment gateway reviewing the site, which has
 * to be able to see which registered entity the money reaches.
 */
export const DONATION_COMPLIANCE = {
  trustAct: "Maharashtra Public Trust Act, 1950",
  registration: "F-2179",
  pan: "AAATI0017P",
  eightyGUrn: "AAATI0017PF20219",
};

/** Published by the temple for cheque, cash, corpus and CSR donations. */
export const DONATION_HELPLINE =
  process.env.NEXT_PUBLIC_DONATION_HELPLINE || "+91 90310 54003";

/**
 * The donate page's own nav entry.
 *
 * Kept out of `MAIN_NAV` deliberately. That row is already at its width
 * budget on a 1152px header once the Hindi labels are in, and a donate link
 * buried between "Gallery" and "Vrindavan Yatra" is not how anyone finds it
 * anyway — the header renders this one as a button instead, and the footer
 * appends it to Explore.
 */
export const DONATE_NAV = { key: "donate", href: "/donate" };
