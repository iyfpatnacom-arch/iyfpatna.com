import { SEVA_LIST, VIGRAHA_SEVA_OPTIONS, VIGRAHA_SEVA_SLUG } from "@/lib/site-config";

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
  return seva.amounts;
}
