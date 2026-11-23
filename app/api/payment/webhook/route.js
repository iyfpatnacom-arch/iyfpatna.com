import { NextResponse } from "next/server";
import {
  getRazorpayConfig,
  qrPaymentOutcome,
  settlePayment,
  verifyWebhookSignature,
} from "@/lib/payments/razorpay";
import { recordPaymentOutcome } from "@/lib/payments/result";
import { loggerProvider, paymentWebhookLogger } from "@/instrumentation";

export const dynamic = "force-dynamic";

/**
 * Razorpay webhook — the backstop for a customer who pays and then closes the
 * tab, loses signal, or never makes it back from their UPI app. Without it that
 * seat, or that donation, stays "pending" until they press "pay now" again.
 *
 * One endpoint covers every kind: the payment names its order, the order's
 * notes name its kind, and `recordPaymentOutcome` settles it against the right
 * collection. Nothing here changes when another kind is added.
 *
 * Register https://iyfpatna.in/api/payment/webhook in the Razorpay dashboard
 * for payment.captured, payment.failed, order.paid and qr_code.credited, with
 * the same secret as RAZORPAY_WEBHOOK_SECRET.
 *
 * Razorpay retries anything that is not a 2xx, and recordPaymentOutcome is
 * idempotent, so a failure here answers 500 and lets the retry try again.
 */
const EVENTS = new Set(["payment.captured", "payment.authorized", "payment.failed", "order.paid"]);

/**
 * A QR scanned off a volunteer's screen at a book stall.
 *
 * Handled apart from the events above because a QR payment carries no Razorpay
 * Order, and `settlePayment` finds our order ID in the order's notes. The QR's
 * own notes carry it instead, which is why they are set when the code is
 * created (see `createQrCode`).
 *
 * `payment.captured` fires for these too, and reaches `settlePayment`, which
 * returns null for want of an order and leaves the row alone — so the two
 * paths cannot both settle the same payment.
 */
const QR_EVENT = "qr_code.credited";

function qrOutcomeFrom(event) {
  const payment = event?.payload?.payment?.entity;
  const notes = event?.payload?.qr_code?.entity?.notes || {};
  if (!payment?.id || !notes.orderId) return null;
  return qrPaymentOutcome(payment, {
    orderId: notes.orderId,
    kind: notes.kind || null,
    lang: notes.lang,
  });
}

export async function POST(request) {
  const config = getRazorpayConfig();
  if (!config?.webhookSecret) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  const raw = await request.text();
  if (!verifyWebhookSignature(raw, request.headers.get("x-razorpay-signature"), config.webhookSecret)) {
    console.error("[payment] webhook with a bad signature");
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const paymentId = event?.payload?.payment?.entity?.id;
  const isQr = event?.event === QR_EVENT;
  if ((!EVENTS.has(event?.event) && !isQr) || !paymentId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const outcome = isQr
      ? qrOutcomeFrom(event)
      : await settlePayment(paymentId, config);
    // A payment for something this site did not create (another integration
    // on the same account) is acknowledged and left alone.
    const recorded = outcome ? await recordPaymentOutcome(outcome) : null;
    paymentWebhookLogger?.emit({
      severityText: "INFO",
      body: "payment webhook processed",
      attributes: {
        source: "razorpay_webhook",
        gateway_event: event.event,
        outcome_found: Boolean(outcome),
        outcome_status: recorded?.status || "unmatched",
        payment_kind: recorded?.kind || "unknown",
        outcome_changed: Boolean(recorded?.changed),
      },
    });
    await loggerProvider?.forceFlush().catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (error) {
    paymentWebhookLogger?.emit({
      severityText: "ERROR",
      body: "payment webhook settlement failed",
      attributes: {
        source: "razorpay_webhook",
        gateway_event: event.event,
        error_category: "payment_settlement_failed",
      },
    });
    await loggerProvider?.forceFlush().catch(() => {});
    console.error(`[payment] webhook for ${paymentId} failed`, error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
