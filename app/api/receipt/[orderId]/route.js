import { findPayable } from "@/lib/payments/payables";
import { verifyOrderToken } from "@/lib/payments/order-link";
import { check, clientKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * The receipt PDF for one paid order — a course seat or a donation.
 *
 * Generated on every request rather than stored: it is a pure function of the
 * row, which stops changing the moment the payment succeeds. Which document
 * gets drawn is decided by which collection holds the order (see
 * `payables.js`), so one URL shape covers both and an old link never has to be
 * migrated.
 *
 * Unauthenticated by necessity — most people paying have no account — so
 * `?t=` carries an HMAC of the order ID. An email client or WhatsApp needs a
 * link it can fetch without a cookie, and that same link is what the browser
 * downloads.
 */
export async function GET(request, { params }) {
  const limit = check(clientKey(request, "receipt"), {
    limit: 30,
    windowMs: 10 * 60 * 1000,
  });
  if (!limit.allowed) {
    return new Response("Too many requests", {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSeconds) },
    });
  }

  const { orderId } = await params;
  const token = request.nextUrl.searchParams.get("t");

  if (!orderId || !(await verifyOrderToken(orderId, token))) {
    // The same answer a missing order gets, so a wrong token cannot be used to
    // find out which order IDs exist.
    return new Response("Not found", { status: 404 });
  }

  const found = await findPayable(orderId);
  if (!found) return new Response("Not found", { status: 404 });

  const { payable, doc: row } = found;

  /* A receipt is a record of money received. An unpaid or failed order has
     none to record, and issuing one anyway would hand someone a document their
     bank statement contradicts. */
  if (row.payment?.status !== "success") {
    return new Response("No payment has been received for this order.", {
      status: 409,
    });
  }

  let pdf;
  let filename;
  try {
    ({ pdf, filename } = await payable.receipt(row));
  } catch (error) {
    console.error(`[receipt] could not draw ${orderId}`, error);
    return new Response("Could not generate the receipt", { status: 500 });
  }

  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.length),
      /* `attachment` makes the browser save rather than preview, which is why
         the status page needs no blob juggling to auto-download. */
      "Content-Disposition": `attachment; filename="${filename}"`,
      // The link is the credential, so no shared cache may keep a copy.
      "Cache-Control": "private, max-age=3600",
    },
  });
}
