import { getTranslations } from "next-intl/server";

/**
 * The server's view of the seva list.
 *
 * Everything the browser may also know lives in `sevas.js` and is re-exported
 * here, so a route handler has one import and the form and the route are
 * provably applying the same amount rules. What is added here needs the
 * message catalogue, which is server-only.
 */
export {
  DEFAULT_SEVA_SLUG,
  DONATION_ORDER_PREFIX,
  MAX_DONATION,
  MIN_DONATION,
  defaultSeva,
  getSeva,
  isValidAmount,
  suggestedAmounts,
} from "./sevas";

/**
 * The seva's name in both languages, for the row, the receipt and the email.
 *
 * Read out of the message catalogue rather than restated in the config, because
 * that catalogue is where the name is edited and a second copy would be a
 * second thing to remember. Snapshotted onto the donation row at the moment of
 * giving, so a later rewording never changes what an old receipt says the donor
 * gave towards.
 */
export async function sevaTitles(seva) {
  const [hi, en] = await Promise.all(
    ["hi", "en"].map(async (locale) => {
      try {
        const t = await getTranslations({ locale, namespace: "donate.seva" });
        return t(`${seva.key}.name`);
      } catch {
        /* A missing translation must never stop a donation. The receipt then
           falls back to the slug, which is at least true. */
        return seva.slug;
      }
    }),
  );
  return { hi, en };
}
