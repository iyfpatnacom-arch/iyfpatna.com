import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/connect";
import Enrollment from "@/models/Enrollment";
import { getRazorpayConfig } from "./razorpay";
import { orderStatusPath } from "./order-link";
import { sendEnrollmentConfirmation } from "@/lib/courses/notify";

/**
 * Writes a gateway outcome onto an enrolment, exactly once.
 *
 * Razorpay can deliver the same result more than once — the redirect POST, the
 * webhook, a customer refreshing that page, a retry from the status page. The conditional
 * update below is what makes that harmless: only the first writer that moves
 * an enrolment into "success" gets a document back, so only that one sends the
 * confirmation email.
 */

/**
 * A confirmed payment must never be downgraded by a later message. Once money
 * is in, only a human can change the seat.
 */
const NOT_ALREADY_PAID = { "payment.status": { $ne: "success" } };

/** The customer's browser is mid-redirect, so notifications get a hard budget. */
const NOTIFY_BUDGET_MS = 10000;

function withBudget(promise, ms = NOTIFY_BUDGET_MS) {
  return Promise.race([
    promise.catch(() => null),
    new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), ms);
      timer.unref?.();
    }),
  ]);
}

/** Records the delivery outcome without ever failing the payment write. */
async function recordNotification(orderId, outcome) {
  if (!outcome) return;
  await Enrollment.updateOne(
    { orderId },
    {
      $set: { "notifications.emailSent": Boolean(outcome.ok && !outcome.logged) },
      $push: {
        "notifications.attempts": {
          kind: "confirmation_email",
          ok: Boolean(outcome.ok),
          error: outcome.error || null,
          at: new Date(),
        },
      },
    }
  ).catch((error) => console.error("[payment] notification record failed", error));
}

/**
 * Turns a gateway outcome into `payment.*` fields.
 *
 * `amountMismatch` implements the headline best practice of every gateway
 * guide: never trust the amount and currency that come back — compare them
 * with what we recorded before the customer left for the gateway.
 *
 * Dotted paths rather than a whole `payment` object, so the Razorpay order ID
 * stored at initiation survives the write.
 */
function toPaymentUpdate(outcome, enrollment) {
  const status = outcome.status;
  const returnedAmount = Number(outcome.amount);
  const expectedAmount = Number(enrollment.amount);

  const amountMismatch =
    status === "success" &&
    (!Number.isFinite(returnedAmount) ||
      Math.abs(returnedAmount - expectedAmount) > 0.009 ||
      (outcome.currency || "INR") !== (enrollment.currency || "INR"));

  return {
    "payment.status": status,
    "payment.provider": outcome.provider || "razorpay",
    "payment.trackingId": outcome.trackingId || null,
    "payment.bankRefNo": outcome.bankRefNo || null,
    "payment.paymentMode": outcome.paymentMode || null,
    "payment.failureMessage": status === "success" ? null : outcome.failureMessage || null,
    "payment.paidAt": status === "success" ? new Date() : null,
    "payment.amountMismatch": amountMismatch,
    "payment.raw": outcome.raw ?? null,
  };
}

/**
 * Applies a settled gateway outcome:
 *   { orderId, lang?, status, amount, currency, provider, trackingId,
 *     bankRefNo, paymentMode, failureMessage, raw }
 *
 * Returns { orderId, lang, status, changed } so the caller knows where to send
 * the browser, or null when the outcome does not name an order we hold.
 */
export async function recordPaymentOutcome(outcome) {
  const orderId = String(outcome?.orderId || "").trim();
  if (!orderId) return null;

  await dbConnect();
  const existing = await Enrollment.findOne({ orderId }).lean();
  if (!existing) return null;

  const lang = ["hi", "en"].includes(outcome.lang) ? outcome.lang : existing.locale || "hi";

  if (existing.payment?.status === "success") {
    return { orderId, lang, status: "success", changed: false };
  }

  // A payment still in flight says nothing new; don't let it overwrite an
  // earlier attempt's failure message with blanks.
  if (outcome.status === "pending") {
    return { orderId, lang, status: existing.payment?.status || "pending", changed: false };
  }

  const update = toPaymentUpdate(outcome, existing);

  const updated = await Enrollment.findOneAndUpdate(
    { orderId, ...NOT_ALREADY_PAID },
    { $set: update },
    { returnDocument: "after" }
  ).lean();

  // Someone else won the race and marked it paid; they own the notifications.
  if (!updated) return { orderId, lang, status: "success", changed: false };

  if (outcome.status === "success") {
    if (update["payment.amountMismatch"]) {
      console.error(
        `[payment] amount mismatch on ${orderId}: expected ${existing.amount} ${existing.currency}, gateway returned ${outcome.amount} ${outcome.currency}`
      );
    }
    const notified = await withBudget(sendEnrollmentConfirmation(updated));
    await recordNotification(orderId, notified);
  }

  return { orderId, lang, status: outcome.status, changed: true };
}

/**
 * Where the browser goes after the gateway — the order's status page, signed.
 *
 * 303 so the browser follows with GET instead of re-POSTing the payload.
 */
export async function gatewayReturn(request, lang = "hi", orderId = null) {
  let base = request.nextUrl.origin;
  try {
    base = getRazorpayConfig()?.siteUrl || base;
  } catch {
    /* Here the visitor just needs to land somewhere. */
  }

  let path = `/${lang === "en" ? "en" : "hi"}/courses`;
  if (orderId) {
    try {
      path = await orderStatusPath(orderId, lang);
    } catch (error) {
      console.error("[payment] could not sign the status link", error);
    }
  }

  return NextResponse.redirect(new URL(path, base), 303);
}
