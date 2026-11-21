import { dbConnect } from "@/lib/db/connect";
import { stockList } from "@/lib/marathon/books";
import BookSale from "@/models/BookSale";

/**
 * How much of a volunteer's trolley is left.
 *
 * The server half of `stockList`: the browser is handed a finished list, and
 * this is where the "already sold" half of it comes from. It is counted from
 * the sales rather than decremented on a counter, which is the whole design
 * decision in this file.
 *
 * A stored balance would be a second copy of a number the sales already
 * answer, and the two drift the first time anything unusual happens — a sale
 * written twice by a double tap, an online sale that was never paid, a row
 * corrected by hand in January. Counting means the answer is always the same
 * as the books, at the cost of one grouped aggregation per sell screen, which
 * on a few hundred rows per volunteer is nothing.
 *
 * Only successful sales consume stock. A pending online sale is a reader who
 * has been shown a QR and may yet walk away; holding a copy against them
 * would let a volunteer with a full trolley be told they have run out because
 * six people changed their minds.
 */
export async function soldByBook(clerkId) {
  await dbConnect();

  const rows = await BookSale.aggregate([
    { $match: { volunteerClerkId: String(clerkId), "payment.status": "success" } },
    { $unwind: "$items" },
    { $group: { _id: "$items.bookKey", quantity: { $sum: "$items.quantity" } } },
  ]);

  return Object.fromEntries(rows.map((row) => [row._id, row.quantity]));
}

/**
 * One volunteer's trolley, priced and counted — the list both the sell screen
 * and /api/marathon/sales work from.
 *
 * Both callers go through this rather than assembling it themselves, for the
 * same reason they share `priceBasket`: the screen must not be able to offer
 * a title, a price or a remaining count that the route will then disagree
 * with.
 */
export async function volunteerStock(volunteer) {
  if (!volunteer?.clerkId) return [];
  return stockList(volunteer, await soldByBook(volunteer.clerkId));
}
