import { NextResponse } from "next/server";
import { getRazorpayConfig } from "./razorpay";
import { findPayable, payableFor } from "./payables";

/**
 * Writes a gateway outcome onto whatever it was paying for, exactly once.
 *
 * Razorpay can deliver the same result more than once — the redirect POST, the
 * webhook, a customer refreshing that page, a retry from the status page. The
 * conditional update below is what makes that harmless: only the first writer
 * that moves a row into "success" gets a document back, so only that one sends
 * the confirmation email.
 *
 * Which collection the row is in is decided by `payables.js`, so a course seat
 * and a donation are settled by this same function under the same guarantees.
 */

/**
 * A confirmed payment must never be downgraded by a later message. Once money
 * is in, only a human can change the row.
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
async function recordNotification(model, orderId, outcome) {
  if (!outcome) return;
  await model
    .updateOne(
      { orderId },
      {
        $set: {
          "notifications.emailSent": Boolean(outcome.ok && !outcome.logged),
        },
        $push: {
          "notifications.attempts": {
            kind: "confirmation_email",
            ok: Boolean(outcome.ok),
            error: outcome.error || null,
            at: new Date(),
          },
        },
      },
    )
    .catch((error) => console.error("[payment] notification record failed", error));
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
function toPaymentUpdate(outcome, row) {
  const status = outcome.status;
  const returnedAmount = Number(outcome.amount);
  const expectedAmount = Number(row.amount);

  const amountMismatch =
    status === "success" &&
    (!Number.isFinite(returnedAmount) ||
      Math.abs(returnedAmount - expectedAmount) > 0.009 ||
      (outcome.currency || "INR") !== (row.currency || "INR"));

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
 *   { orderId, kind?, lang?, status, amount, currency, provider, trackingId,
 *     bankRefNo, paymentMode, failureMessage, raw }
 *
 * Returns { orderId, kind, lang, status, changed } so the caller knows where to
 * send the browser, or null when the outcome does not name an order we hold.
 */
export async function recordPaymentOutcome(outcome) {
  const found = await findPayable(outcome?.orderId, { kind: outcome?.kind });
  if (!found) return null;

  const { kind, payable, doc: existing } = found;
  const orderId = existing.orderId;
  const lang = ["hi", "en"].includes(outcome.lang) ? outcome.lang : existing.locale || "hi";

  if (existing.payment?.status === "success") {
    return { orderId, kind, lang, status: "success", changed: false };
  }

  // A payment still in flight says nothing new; don't let it overwrite an
  // earlier attempt's failure message with blanks.
  if (outcome.status === "pending") {
    return {
      orderId,
      kind,
      lang,
      status: existing.payment?.status || "pending",
      changed: false,
    };
  }

  const update = toPaymentUpdate(outcome, existing);

  const updated = await payable.model
    .findOneAndUpdate(
      { orderId, ...NOT_ALREADY_PAID },
      { $set: update },
      { returnDocument: "after" },
    )
    .lean();

  // Someone else won the race and marked it paid; they own the notifications.
  if (!updated) return { orderId, kind, lang, status: "success", changed: false };

  if (outcome.status === "success") {
    if (update["payment.amountMismatch"]) {
      console.error(
        `[payment] amount mismatch on ${orderId}: expected ${existing.amount} ${existing.currency}, gateway returned ${outcome.amount} ${outcome.currency}`,
      );
    }
    const notified = await withBudget(payable.onPaid(updated));
    await recordNotification(payable.model, orderId, notified);
  }

  return { orderId, kind, lang, status: outcome.status, changed: true };
}

/**
 * Where the browser goes after the gateway — the order's own page, signed.
 *
 * 303 so the browser follows with GET instead of re-POSTing the payload.
 *
 * With no order to name (an unreadable callback, a payment that turned out not
 * to be ours) it falls back to the section the payment came from, which is why
 * `kind` is worth passing even when `orderId` is not known: a donor who cannot
 * be matched to their row should land back on /donate, not in the course list.
 */
export async function gatewayReturn(request, lang = "hi", { orderId, kind } = {}) {
  let base = request.nextUrl.origin;
  try {
    base = getRazorpayConfig()?.siteUrl || base;
  } catch {
    /* Here the visitor just needs to land somewhere. */
  }

  const locale = lang === "en" ? "en" : "hi";
  const payable = payableFor(kind) || payableFor("course");

  let path = payable.fallbackPath(locale);
  if (orderId) {
    try {
      path = await payable.statusPath(orderId, locale);
    } catch (error) {
      console.error("[payment] could not sign the status link", error);
    }
  }

  return NextResponse.redirect(new URL(path, base), 303);
}
