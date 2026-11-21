/**
 * The temple's own UPI handle, and the printed QR that points at it.
 *
 * This is not a gateway. Nothing here creates an order, takes a fee or calls
 * an API: it is the same code that is printed on a card at the counter, and a
 * reader scanning it is transferring money straight into the temple's bank
 * account. That is the whole appeal of it at a book stall — it needs no
 * Razorpay QR Codes entitlement, no network round trip before the reader can
 * pay, and it keeps working when the stall has one bar of signal.
 *
 * What it cannot do is tell anybody which sale a credit belongs to. A fixed
 * code carries no amount and no order reference, so the bank statement shows
 * forty ₹300 credits in an evening and nothing to match them against. That is
 * why a sale paid this way carries a `claim` (see `models/BookSale.js`): the
 * volunteer types the last four digits of the UTR off the reader's phone, and
 * those four digits are what makes the credit findable later.
 *
 * The handle is overridable from the environment so a test deployment can
 * point at somebody's own UPI id rather than at the temple's, but it is not
 * required to be set — the constant is the real one and the one on the
 * printed card.
 */

/** The VPA the QR image resolves to. Shown under the code so it can be typed. */
export const UPI_VPA =
  process.env.NEXT_PUBLIC_MARATHON_UPI_VPA || "65474428017987@cnrb";

/** The name a UPI app will show the payer once they scan. */
export const UPI_PAYEE =
  process.env.NEXT_PUBLIC_MARATHON_UPI_PAYEE ||
  "INTERNATIONAL SOCIETY FOR KRISHNA CONSCIOUSNESS";

/**
 * The QR as supplied by the temple, served from `public/`.
 *
 * A file rather than a code generated per sale, and deliberately: this is the
 * image the bank issued against that account, it is the one on the printed
 * card, and re-encoding the same VPA into a prettier square would mean the
 * screen and the card could drift apart after an account change. It is shown
 * with a plain `<img>` for the same reason Razorpay's was — a recompressed QR
 * is a QR that fails to scan in bad light.
 */
export const UPI_QR_IMAGE = "/marathon-upi-qr.jpg";

/**
 * A `upi://` link for the same handle with the amount filled in.
 *
 * Offered beside the QR, not instead of it. On the reader's own phone a tap
 * opens their UPI app with the payee and the amount already set, which is
 * both faster and safer than scanning a code that carries no amount and
 * trusting them to type ₹300 rather than ₹30. The QR stays for the ordinary
 * case, which is the reader holding their own phone and the volunteer holding
 * theirs.
 *
 * `tn` is a transaction note. Most apps show it to the payer and some pass it
 * through to the statement narration, so the order ID goes in it — when it
 * survives, reconciliation needs no UTR at all.
 */
export function upiIntentUrl({ amount, orderId }) {
  const params = new URLSearchParams({
    pa: UPI_VPA,
    pn: UPI_PAYEE,
    cu: "INR",
  });
  if (Number(amount) > 0) params.set("am", String(Number(amount).toFixed(2)));
  if (orderId) params.set("tn", `Gita Marathon ${orderId}`);
  return `upi://pay?${params.toString()}`;
}
