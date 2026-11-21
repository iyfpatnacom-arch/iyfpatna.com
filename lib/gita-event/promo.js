/**
 * When the Gita Mahotsav popup is still worth showing.
 *
 * Its own module, and deliberately a thin one: both the promo itself and the
 * yatra promo it has to elbow out of the way are client components, and
 * `catalog.js` cannot cross that boundary — it reaches `lib/settings`, and
 * through it mongoose. So the window is a bare string here rather than read
 * off the festival JSON, and this file imports nothing.
 *
 * The date is the quiz day in `content/events/gita-jayanti-2026.json`. If that
 * moves, move this with it — there is no import to keep the two honest.
 */

/** The last day the popup appears, inclusive, as a bare IST day. */
export const GITA_PROMO_LAST_DAY = "2026-12-19";

/**
 * Is today, in India, on or before the last day?
 *
 * Only ever called in the browser. The homepage is prerendered (see its own
 * comment), so a server-side answer would be the date the page was last built
 * and the popup would outlive the festival by however long it is until the
 * next deploy. `en-CA` formats as YYYY-MM-DD, which compares as a string.
 */
export function gitaPromoIsLive(lastDay = GITA_PROMO_LAST_DAY) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  return today <= lastDay;
}
