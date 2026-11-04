import {
  GITA_MARATHON,
  GITA_MARATHON_TIERS,
  SEVA_LIST,
  VIGRAHA_SEVA_OPTIONS,
  VIGRAHA_SEVA_SLUG,
} from "@/lib/site-config";

/**
 * What a donation is allowed to be — the half of it the browser may know.
 *
 * Kept free of server-only imports on purpose: the donation form validates the
 * amount as the donor types, and the create route validates it again before
 * anything reaches the gateway. Both must apply the same rule, and the only way
 * to be sure of that is for both to call the same function.
 *
 * The seva list itself lives in `SEVA_LIST` and its wording in the
 * `donate.seva.*` messages. Nothing here is the authority on what is charged —
 * the stored row is (see `app/api/donations/create`).
 */

/**
 * The order-ID prefix for donations: DN-101, DN-102.
 *
 * Reserved. Order IDs are unique per prefix because each prefix has its own
 * counter (`order:DN`), and the settling pipeline finds an order by ID across
 * both collections — so no course may ever take `DN` as its `orderPrefix` or a
 * donation and a seat would answer to the same receipt number.
 */
export const DONATION_ORDER_PREFIX = "DN";

/**
 * The floor and the ceiling, in rupees.
 *
 * The floor is low on purpose — a student giving ₹51 is the point of this page
 * — but not zero: a ₹0 donation is a form error, not an offering, and it would
 * reach the gateway as an order Razorpay rejects anyway.
 *
 * The ceiling is not a limit on generosity, it is a typo guard. Someone who
 * means to give more than this is exactly the donor the temple wants on the
 * phone (the helpline is on the page for corpus and CSR gifts), and a stray
 * extra zero on a phone keypad is otherwise indistinguishable from intent.
 */
export const MIN_DONATION = 11;
export const MAX_DONATION = 500000;

/** Whole rupees only: paise in a donation box is never what anyone meant. */
export function isValidAmount(value) {
  const amount = Number(value);
  return Number.isInteger(amount) && amount >= MIN_DONATION && amount <= MAX_DONATION;
}

export function getSeva(slug) {
  const wanted = String(slug || "").trim();
  return SEVA_LIST.find((seva) => seva.slug === wanted) || null;
}

/** The seva a donation opens on when nothing was picked — the general one. */
export const DEFAULT_SEVA_SLUG = "temple-seva";

export function defaultSeva() {
  return getSeva(DEFAULT_SEVA_SLUG) || SEVA_LIST[0];
}

/**
 * The three sevas Pitru Paksha is for.
 *
 * Anna-daan is the shraddha offering itself in Vaishnava practice, vastra-daan
 * is the cloth given alongside it, and deity seva is the offering made to the
 * Lord in a forefather's name. They are ordinary sevas from `SEVA_LIST` the
 * rest of the year — the fortnight is a reason to give and not a different
 * price list — so this is a list of which ones, and nothing more.
 *
 * One list, two uses: the donate page lifts these to the front of its seva
 * grid while the fortnight runs, and the hero's "Donate" narrows the form's
 * seva select to exactly these. Keeping both off the same constant is the
 * point — a grid that led with three sevas and a form that offered a fourth
 * would be the site disagreeing with itself.
 */
export const PITRU_SEVA_KEYS = ["anna_daan", "vastra_daan", "deity_seva"];

/** The same three as slugs, in the order the temple publishes them. */
export const PITRU_SEVA_SLUGS = SEVA_LIST.filter((seva) =>
  PITRU_SEVA_KEYS.includes(seva.key),
).map((seva) => seva.slug);

/**
 * Every amount worth offering the donor as a chip for one seva.
 *
 * Deity seva is the exception the temple itself publishes: its amounts are
 * eleven named offerings rather than suggested contributions, so its chips come
 * from that price list instead. Either way a custom amount is still accepted —
 * `isValidAmount` is what decides, and these are only suggestions.
 */
export function suggestedAmounts(seva) {
  if (!seva) return [];
  if (seva.slug === VIGRAHA_SEVA_SLUG) {
    return VIGRAHA_SEVA_OPTIONS.map((option) => option.amount);
  }
  /* The marathon is the other seva whose amounts are a published list rather
     than suggestions: each one is a number of Gitas, and a donor who typed
     ₹7,600 would be sponsoring thirty copies and losing ₹100 to rounding. A
     custom amount is still accepted — these are the chips, not the rule. */
  if (seva.slug === GITA_MARATHON_SEVA_SLUG) {
    return GITA_MARATHON_TIERS.map((tier) => tier.amount);
  }
  return seva.amounts;
}

/* ----------------------------------------------------------- gita marathon */

export const GITA_MARATHON_SEVA_SLUG = GITA_MARATHON.slug;

/**
 * How many Gitas an amount sponsors.
 *
 * Floored at one for the same reason the seva card's impact line is: a donor
 * who gave something must never be told their gift buys nothing. Used on the
 * marathon page, on the thank-you screen and on the receipt, so all three
 * agree on the number without any of them doing the division itself.
 */
export function gitasFor(amount) {
  return Math.max(1, Math.round((Number(amount) || 0) / GITA_MARATHON.bookPrice));
}

/** The published tier an amount lands on exactly, or null for a custom gift. */
export function gitaTierFor(amount) {
  return GITA_MARATHON_TIERS.find((tier) => tier.amount === Number(amount)) || null;
}

/**
 * Whether a seva is one /donate should list today.
 *
 * Only the marathon carries a `season` so far, and it carries one because a
 * seva pointed at a dated drive is worse than absent once the drive is over —
 * it is the temple still asking for something it has stopped organising. A
 * seva without a season is always in season, which is every other one.
 *
 * `dayKey` is passed in rather than read from the clock here, so a cached
 * render cannot be caught holding a stale "today" (see the `revalidate` note
 * on the donate page).
 */
export function isSevaInSeason(seva, dayKey) {
  const season = seva?.season;
  if (!season) return true;
  return (!season.start || dayKey >= season.start) && (!season.end || dayKey <= season.end);
}
