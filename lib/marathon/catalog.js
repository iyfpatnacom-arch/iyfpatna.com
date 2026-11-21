import { getTranslations } from "next-intl/server";

/**
 * The server's view of the book list.
 *
 * Everything the browser may also know lives in `books.js` and is re-exported
 * here, so a route handler has one import and the sell screen and the route
 * are provably pricing the same basket. What is added here needs the message
 * catalogue, which is server-only — the same arrangement as
 * `lib/donations/catalog.js`.
 */
export {
  BOOK_SALE_ORDER_PREFIX,
  CLAIM_KINDS,
  GITA_BOOKS,
  MAX_PER_TITLE,
  SALE_METHODS,
  getBook,
  isClaim,
  isSaleMethod,
  priceBasket,
  stockList,
} from "./books";

/**
 * A book's name in both languages, for the row, the admin table and the CSV.
 *
 * Snapshotted onto the sale at the moment of the handover, so a later
 * rewording never changes what an old sale says was sold. Read out of the
 * message catalogue rather than restated in the config, because that
 * catalogue is where the name is edited.
 */
export async function bookTitles(bookKey) {
  const [hi, en] = await Promise.all(
    ["hi", "en"].map(async (locale) => {
      try {
        const t = await getTranslations({
          locale,
          namespace: "marathon.books",
        });
        return t(`${bookKey}.name`);
      } catch {
        /* A missing translation must never stop a sale being recorded. The
           row then falls back to the key, which is at least true. */
        return bookKey;
      }
    }),
  );
  return { hi, en };
}

/**
 * `priceBasket`'s items with their titles filled in — the stored shape.
 *
 * The title comes off the volunteer's own trolley when it is there, and only
 * falls back to the catalogue when it is not. That order matters: a title a
 * coordinator typed in by hand has no entry in the message bundle at all, and
 * looking it up there would store the key — "custom:krishna-book" — as the
 * name on the receipt.
 */
export async function describeItems(items, list = []) {
  const byKey = new Map(list.map((item) => [item.bookKey, item]));

  return Promise.all(
    items.map(async (item) => {
      const stocked = byKey.get(item.bookKey);
      const title =
        stocked?.title?.hi || stocked?.title?.en
          ? { hi: stocked.title.hi || stocked.title.en, en: stocked.title.en || stocked.title.hi }
          : await bookTitles(item.bookKey);
      return { ...item, title };
    }),
  );
}
