import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/connect";
import { getOwnVolunteer } from "@/lib/marathon/volunteers";
import { gatewayConfig } from "@/lib/payments/gateways";
import { verifyOrderToken } from "@/lib/payments/order-link";
import { closeQrCode, settleQrCode } from "@/lib/payments/razorpay";
import { recordPaymentOutcome } from "@/lib/payments/result";
import { check, clientKey } from "@/lib/rate-limit";
import BookSale from "@/models/BookSale";

export const dynamic = "force-dynamic";

/**
 * "Has this QR been paid yet?" — asked by the volunteer's screen every few
 * seconds while the reader is scanning it.
 *
 * It exists because of one property of a QR payment: it carries no Razorpay
 * Order, so there is no checkout callback and no redirect. The only two ways
 * the money is ever heard about are the `qr_code.credited` webhook and this
 * route asking Razorpay directly.
 *
 * The webhook is the backstop and the reliable one. This is the fast one — and
 * it is the one that matters at a stall, because the volunteer is standing
 * there with a queue behind them and cannot wait on a delivery attempt from
 * Razorpay's side. So the poll does not merely *read* the row: it asks
 * Razorpay about the QR and settles the outcome through the same
 * `recordPaymentOutcome` every other payment on this site goes through, which
 * is both idempotent and the only writer. A webhook arriving a moment later
 * finds the row already paid and changes nothing.
 *
 * Authorised two ways, because two different people may hold this URL: the
 * volunteer who made the sale (by their Clerk session), and whoever has the
 * signed link — which is how the reader's own phone can watch the same sale
 * after Razorpay redirects them to its status page.
 */
export async function GET(request, { params }) {
  /* Tight enough to stop a tab left open overnight from hammering Razorpay's
     API, loose enough for a 3-second poll across a long sale. */
  const limit = check(clientKey(request, "marathon-poll"), {
    limit: 240,
    windowMs: 10 * 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  const { orderId } = await params;
  const token = request.nextUrl.searchParams.get("t");

  await dbConnect();
  const sale = await BookSale.findOne({ orderId }).lean();
  /* The same answer a wrong token gets, so neither can be used to find out
     which order IDs exist. */
  if (!sale) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  let allowed = await verifyOrderToken(orderId, token);
  if (!allowed) {
    /* Ownership, not permission — a volunteer who has since been switched
       off can still open their own sales. */
    const volunteer = await getOwnVolunteer();
    allowed = Boolean(volunteer) && volunteer.clerkId === sale.volunteerClerkId;
  }
  if (!allowed) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const answer = (row) =>
    NextResponse.json(
      {
        ok: true,
        orderId: row.orderId,
        status: row.payment?.status || "pending",
        amount: row.amount,
        quantity: row.quantity,
        paymentMode: row.payment?.paymentMode || null,
        trackingId: row.payment?.trackingId || null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );

  /* Already settled — by the webhook, by an earlier poll, or because it was a
     cash sale all along. Nothing to ask Razorpay. */
  if (sale.payment?.status === "success" || !sale.qr?.id) return answer(sale);

  const config = gatewayConfig("razorpay");
  if (!config) return answer(sale);

  try {
    const outcome = await settleQrCode(config, sale.qr.id, {
      orderId: sale.orderId,
      kind: "book",
      lang: sale.locale,
    });
    /* Nobody has scanned it yet. The commonest answer by far, and not an
       event — the screen keeps waiting. */
    if (!outcome) return answer(sale);

    const result = await recordPaymentOutcome(outcome);

    /* A single-use QR is spent once it is paid, but Razorpay keeps it live
       until `close_by`. Closing it immediately means the image on screen stops
       being scannable the moment it has done its job, so a second reader
       cannot pay the same code by looking over somebody's shoulder. */
    if (result?.status === "success") {
      await closeQrCode(config, sale.qr.id);
    }

    const fresh = await BookSale.findOne({ orderId }).lean();
    return answer(fresh || sale);
  } catch (error) {
    /* Razorpay unreachable. The webhook will still settle it, and the screen
       keeps polling, so this is a pending answer rather than an error the
       volunteer has to understand. */
    console.error(`[marathon] could not check the QR for ${orderId}`, error);
    return answer(sale);
  }
}
