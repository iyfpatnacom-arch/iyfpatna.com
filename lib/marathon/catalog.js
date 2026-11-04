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
  GITA_BOOKS,
  MAX_PER_TITLE,
  SALE_METHODS,
  getBook,
  isSaleMethod,
  priceBasket,
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
 * One round of the catalogue per distinct title, which on a trolley of two
 * books is two lookups against an in-memory message bundle.
 */
export async function describeItems(items) {
  return Promise.all(
    items.map(async (item) => ({
      ...item,
      title: await bookTitles(item.bookKey),
    })),
  );
}
