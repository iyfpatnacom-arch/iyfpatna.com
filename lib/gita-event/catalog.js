import festival from "@/content/events/gita-jayanti-2026.json";

/**
 * The Gita Jayanti festival: an online quiz, a mahotsav at the temple, and one
 * registration that may be for either or both.
 *
 * Shaped like `lib/courses/catalog.js` and for the same reasons — the copy, the
 * dates and the prices are product data in one JSON file under git, not
 * environment variables, so the landing page and the registration route read
 * the same numbers and a price change leaves a history.
 *
 * What is different here, and what the rest of this directory exists for, is
 * that a registration is for a *set* of events. That set decides three things
 * which no course has ever had to decide: what is charged (two events bought
 * together cost less than the sum), which WhatsApp group the person is sent to,
 * and — long after the money — which event a pass scanned at the door marks
 * attendance for.
 *
 * `date` on the mahotsav is deliberately null until the temple fixes it. It is
 * used only to guess which event a scan belongs to for somebody registered for
 * both (see `attendance.js`); with no date the volunteer is asked instead, so
 * leaving it null costs correctness nothing.
 */

/** GITA-101. Its own counter, so it can never collide with DYS or DN. */
export const GITA_ORDER_PREFIX = festival.orderPrefix;

/** "quiz", "mahotsav" — in the order they are shown and stored. */
export const EVENT_KEYS = festival.events.map((event) => event.key);

export function getFestival() {
  return festival;
}

export function eventOf(key) {
  return festival.events.find((event) => event.key === key) ?? null;
}

/**
 * The events a browser asked for, cleaned up: known keys only, no duplicates,
 * in catalog order, and never empty-but-pretending-to-be-valid.
 *
 * Catalog order rather than the order they arrived in, because the stored array
 * is printed on the receipt and read back by the admin table — two people who
 * ticked the same two boxes should produce the same row.
 */
export function normalizeEvents(requested) {
  const asked = new Set(
    (Array.isArray(requested) ? requested : [requested]).map((key) => String(key || "")),
  );
  return EVENT_KEYS.filter((key) => asked.has(key));
}

/**
 * What a set of events costs.
 *
 * The combo is a price, not a discount applied to one: both events together are
 * ₹151 where separately they are ₹202. Returning `{ amount, fullAmount }` lets
 * the form and the receipt both say what was saved without either computing it.
 *
 * Throws on an empty or unknown set rather than returning 0 — a registration
 * for nothing is a bug, and a free one would walk straight past the gateway.
 */
export function priceFor(events) {
  const keys = normalizeEvents(events);
  if (keys.length === 0) throw new Error("A Gita registration must include at least one event.");

  const fullAmount = keys.reduce((sum, key) => sum + Number(eventOf(key).amount), 0);
  const combo = Number(festival.comboAmount) || 0;
  const amount = keys.length === EVENT_KEYS.length && combo > 0 ? combo : fullAmount;

  return {
    amount,
    fullAmount,
    saved: Math.max(0, fullAmount - amount),
    currency: festival.currency || "INR",
  };
}

/** Every event's price plus the combo, for the form and the pricing cards. */
export function priceTable() {
  return {
    events: Object.fromEntries(EVENT_KEYS.map((key) => [key, Number(eventOf(key).amount)])),
    combo: Number(festival.comboAmount) || null,
  };
}

/** The event titles in both languages, snapshotted onto the row at checkout. */
export function eventTitles(events) {
  return normalizeEvents(events).map((key) => ({
    key,
    hi: eventOf(key).title.hi,
    en: eventOf(key).title.en,
  }));
}

/**
 * The one WhatsApp group a confirmed registration is sent to.
 *
 * Someone registered for both is sent to the quiz group: it is the group the
 * quiz link goes out in, and a missed link is the one failure that costs them
 * the thing they paid for. The mahotsav group is linked beside it on the
 * confirmation page, so neither is hidden — this only decides which button is
 * the big green one. A group link left blank in the catalog falls through to
 * the site-wide community group rather than leaving them nowhere to go.
 */
export async function whatsappGroupFor(events) {
  const keys = normalizeEvents(events);
  const preferred = keys.includes("quiz") ? "quiz" : keys[0];
  const url = preferred ? eventOf(preferred)?.whatsappGroupUrl : null;
  if (url) return url;

  const { getWhatsappGroupUrl } = await import("@/lib/settings");
  return getWhatsappGroupUrl();
}

/** Every group a registration earns, for the "and also join" list. */
export function whatsappGroupsFor(events, locale = "en") {
  return normalizeEvents(events)
    .map((key) => eventOf(key))
    .filter((event) => event?.whatsappGroupUrl)
    .map((event) => ({
      key: event.key,
      url: event.whatsappGroupUrl,
      title: event.title[locale] || event.title.en,
    }));
}

export function isRegistrationOpen() {
  return festival.registrationOpen !== false;
}

export function formatINR(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

/** "Bhagavad Gita Quiz + Gita Mahotsav" — one line for a receipt or a table. */
export function selectionLabel(events, locale = "en") {
  const keys = normalizeEvents(events);
  if (keys.length === 0) return "";
  return keys.map((key) => eventOf(key).title[locale] || eventOf(key).title.en).join(" + ");
}

/**
 * Which event a pass scanned today most likely belongs to, or null.
 *
 * Registered for one event: that one, whatever the date — a volunteer scanning
 * at the door is not going to be told "wrong day" by software.
 *
 * Registered for both: the event whose date is today, because that is knowable
 * and unambiguous. On any other day it is genuinely unknown, and null is the
 * answer that makes the door ask rather than guess — marking the quiz when
 * somebody walked into the mahotsav would be a silent wrong number in the
 * register, which is worse than one extra tap.
 */
export function eventForDay(events, dayKey) {
  const keys = normalizeEvents(events);
  if (keys.length === 1) return keys[0];
  return keys.find((key) => eventOf(key)?.date === dayKey) ?? null;
}
