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
 * One volunteer's trolley as a price list the basket can be priced against.
 *
 * `volunteer.stock` is the authority on both halves of the question the sell
 * screen asks — which titles may be sold, and at what price — because a
 * coordinator can issue a title the catalogue has never heard of, with a
 * price typed in by hand. So this, and not `GITA_BOOKS`, is what prices a
 * sale. The catalogue is only the menu the issue form offers.
 *
 * `remaining` is what is left to sell: issued, less returned, less what the
 * caller says has already gone. `sold` is passed in rather than read here
 * because counting it means querying the sales, which this file must not do
 * — it is imported by the browser.
 */
export function stockList(volunteer, sold = {}) {
  return (volunteer?.stock ?? [])
    .map((item) => {
      const issued = Math.max(0, Math.floor(Number(item.issued) || 0));
      const returned = Math.max(0, Math.floor(Number(item.returned) || 0));
      const gone = Math.max(0, Math.floor(Number(sold[item.bookKey]) || 0));
      return {
        bookKey: item.bookKey,
        title: item.title || { hi: "", en: "" },
        language: item.language || "hi",
        unitPrice: Number(item.unitPrice) || 0,
        custom: Boolean(item.custom),
        issued,
        returned,
        sold: gone,
        remaining: Math.max(0, issued - returned - gone),
      };
    })
    /* A title that has been fully sold stays on the screen at zero rather
       than vanishing: a volunteer who has run out needs to see that they have
       run out, not to wonder where the Hindi Gitas went. */
    .filter((item) => item.issued > 0);
}

/**
 * A basket, reduced to what gets stored and charged.
 *
 * `lines` is `[{ bookKey, quantity }]` in whatever order the screen produced
 * it, and `list` is the volunteer's trolley from `stockList`. Unknown titles
 * and non-positive quantities are dropped rather than rejected: the caller
 * validates emptiness, and a basket is a UI artefact that should not be able
 * to 500 a route by carrying a stale key.
 *
 * Quantities are capped at what is left on the trolley, so the arithmetic on
 * screen and the arithmetic in the route agree about an over-sell as well as
 * about a price. The route still refuses it — a silently truncated basket
 * would hand the reader two books and record one — but both sides compute the
 * same `over` list and so can say the same thing about it.
 *
 * Returns `{ items, quantity, amount, over }`, where `items` is the stored
 * shape minus the title snapshot the server adds (see `catalog.js`).
 */
export function priceBasket(lines, list = []) {
  const byKey = new Map(list.map((item) => [item.bookKey, item]));
  const items = [];
  const over = [];

  for (const line of Array.isArray(lines) ? lines : []) {
    const book = byKey.get(String(line?.bookKey || ""));
    const quantity = Math.floor(Number(line?.quantity) || 0);
    if (!book || quantity < 1 || quantity > MAX_PER_TITLE) continue;

    /* The same title twice in one basket is a UI bug, not an order for two
       lots; fold it rather than storing two lines that every report would
       then have to sum. */
    const existing = items.find((item) => item.bookKey === book.bookKey);
    const already = existing?.quantity ?? 0;
    const wanted = Math.min(MAX_PER_TITLE, already + quantity);
    const allowed = Math.min(wanted, book.remaining);
    if (wanted > book.remaining) over.push(book.bookKey);

    if (allowed < 1) continue;

    if (existing) {
      existing.quantity = allowed;
      continue;
    }

    items.push({
      bookKey: book.bookKey,
      language: book.language,
      unitPrice: book.unitPrice,
      quantity: allowed,
    });
  }

  return {
    items,
    over,
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

/**
 * What the volunteer may offer as evidence of a UPI transfer.
 *
 * "utr" is the one worth having — four digits that find the credit on the
 * statement in one search. "time" is the fallback for a payer whose app
 * buries the reference, and it is kept separate rather than folded into one
 * free-text box so the reconciliation list can sort the easy ones first.
 */
export const CLAIM_KINDS = ["utr", "time"];

/** Four digits for a UTR; anything short and non-empty for a time. */
export function isClaim(kind, reference) {
  const text = String(reference || "").trim();
  if (kind === "utr") return /^\d{4}$/.test(text);
  if (kind === "time") return text.length >= 3 && text.length <= 40;
  return false;
}
