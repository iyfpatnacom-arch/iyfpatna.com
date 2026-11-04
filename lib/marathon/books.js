/**
 * What a volunteer is allowed to sell, and for how much — the half of it the
 * browser may know.
 *
 * Free of server-only imports on purpose, exactly as `lib/donations/sevas.js`
 * is: the sell screen totals the basket as the volunteer taps, and
 * /api/marathon/sales totals it again before anything is written. Both must
 * apply the same arithmetic, and the only way to be sure of that is for both
 * to call the same function. Nothing here is the authority on what was
 * charged — the stored row is.
 *
 * The prices are the temple's counter prices, not the sponsored cost of a
 * copy. A donor on /donate/gita-marathon pays `GITA_MARATHON.bookPrice` to
 * put a Gita into the stack; a reader on the street pays one of these to take
 * one away. The two numbers are different on purpose and must not be folded
 * into one.
 */

/**
 * The order-ID prefix for a book sale: GM-101, GM-102.
 *
 * Reserved, like `DN`. Each prefix has its own counter and the settling
 * pipeline finds an order by ID across every collection, so no other kind of
 * order may ever take `GM` or a sale and a seat would answer to the same
 * receipt number.
 */
export const BOOK_SALE_ORDER_PREFIX = "GM";

/**
 * The titles on the trolley.
 *
 * Only keys, prices and the edition's language live here; the printed name is
 * in `marathon.books.<key>.name`, so Hindi is a translation rather than a
 * second hardcoded list that can drift. Adding a title later — a Srimad
 * Bhagavatam set, a Beyond Birth and Death — is a line here plus two message
 * entries, and nothing else in the system changes.
 */
export const GITA_BOOKS = [
  { key: "gita_hi", language: "hi", price: 300 },
  { key: "gita_en", language: "en", price: 350 },
];

export function getBook(key) {
  const wanted = String(key || "").trim();
  return GITA_BOOKS.find((book) => book.key === wanted) || null;
}

/**
 * The most copies of one title in one transaction.
 *
 * Not a limit on enthusiasm — a hostel warden really does take forty at once,
 * and that is a conversation for the coordinator. It is a fat-finger guard on
 * a stepper being tapped on a phone in the dark, and the number is high enough
 * that nobody meets it by accident.
 */
export const MAX_PER_TITLE = 50;

/**
 * A basket, reduced to what gets stored and charged.
 *
 * `lines` is `[{ bookKey, quantity }]` in whatever order the screen produced
 * it. Unknown titles and non-positive quantities are dropped rather than
 * rejected: the caller validates emptiness, and a basket is a UI artefact that
 * should not be able to 500 a route by carrying a stale key.
 *
 * Returns `{ items, quantity, amount }`, where `items` is the stored shape
 * minus the title snapshot the server adds (see `catalog.js`).
 */
export function priceBasket(lines) {
  const items = [];

  for (const line of Array.isArray(lines) ? lines : []) {
    const book = getBook(line?.bookKey);
    const quantity = Math.floor(Number(line?.quantity) || 0);
    if (!book || quantity < 1 || quantity > MAX_PER_TITLE) continue;

    /* The same title twice in one basket is a UI bug, not an order for two
       lots; fold it rather than storing two lines that every report would
       then have to sum. */
    const existing = items.find((item) => item.bookKey === book.key);
    if (existing) {
      existing.quantity = Math.min(MAX_PER_TITLE, existing.quantity + quantity);
      continue;
    }

    items.push({
      bookKey: book.key,
      language: book.language,
      unitPrice: book.price,
      quantity,
    });
  }

  return {
    items,
    quantity: items.reduce((total, item) => total + item.quantity, 0),
    amount: items.reduce(
      (total, item) => total + item.unitPrice * item.quantity,
      0,
    ),
  };
}

/** How a sale was paid for. Cash is money in a bag; online is money in a bank. */
export const SALE_METHODS = ["cash", "online"];

export function isSaleMethod(value) {
  return SALE_METHODS.includes(String(value));
}
