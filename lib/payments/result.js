import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/connect";
import Enrollment from "@/models/Enrollment";
import { getCcavenueConfig, toPaymentUpdate } from "./ccavenue";
import { orderStatusPath } from "./order-link";
import { sendEnrollmentConfirmation } from "@/lib/courses/notify";

/**
 * Writes a gateway outcome onto an enrolment, exactly once.
 *
 * CCAvenue can deliver the same result more than once — the redirect POST, a
 * customer refreshing that page, a later reconciliation. The conditional
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
 * Applies a decrypted gateway response.
 *
 * Returns { orderId, lang, status, changed } so the caller knows where to send
 * the browser, or null when the response does not name an order we hold.
 */
export async function recordGatewayResponse(response) {
  const orderId = String(response.order_id || response.orderNo || "").trim();
  if (!orderId) return null;

  await dbConnect();
  const existing = await Enrollment.findOne({ orderId }).lean();
  if (!existing) return null;

  // merchant_param3 is the locale we sent to the gateway, so it survives even
  // when the customer comes back in a fresh browser session.
  const lang = ["hi", "en"].includes(response.merchant_param3)
    ? response.merchant_param3
    : existing.locale || "hi";

  if (existing.payment?.status === "success") {
    return { orderId, lang, status: "success", changed: false };
  }

  const update = toPaymentUpdate(response, existing);

  const updated = await Enrollment.findOneAndUpdate(
    { orderId, ...NOT_ALREADY_PAID },
    { $set: { payment: update } },
    { returnDocument: "after" }
  ).lean();

  // Someone else won the race and marked it paid; they own the notifications.
  if (!updated) return { orderId, lang, status: "success", changed: false };

  if (update.status === "success") {
    if (update.amountMismatch) {
      console.error(
        `[payment] amount mismatch on ${orderId}: expected ${existing.amount} ${existing.currency}, gateway returned ${response.amount} ${response.currency}`
      );
    }
    const outcome = await withBudget(sendEnrollmentConfirmation(updated));
    await recordNotification(orderId, outcome);
  }

  return { orderId, lang, status: update.status, changed: true };
}

/**
 * Marks an untouched enrolment as abandoned. Used by the cancel URL when
 * CCAvenue sends the customer back without an encrypted result to read.
 */
export async function recordAbandoned(orderId) {
  if (!orderId) return null;
  await dbConnect();
  await Enrollment.updateOne(
    { orderId, "payment.status": "pending" },
    {
      $set: {
        "payment.status": "aborted",
        "payment.failureMessage": "Cancelled by customer on the billing page.",
      },
    }
  );
  return orderId;
}

/**
 * Where the browser goes after the gateway — the order's status page, signed.
 *
 * 303 so the browser follows with GET instead of re-POSTing the payload.
 */
export async function gatewayReturn(request, lang = "hi", orderId = null) {
  let base = request.nextUrl.origin;
  try {
    base = getCcavenueConfig()?.siteUrl || base;
  } catch {
    /* A bad key length is reported where payment starts; here the visitor
       just needs to land somewhere. */
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
