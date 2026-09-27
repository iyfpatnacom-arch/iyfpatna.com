import { NextResponse } from "next/server";
import {
  buildCheckoutOptions,
  createOrder,
  fetchOrder,
  fetchOrderPayments,
  getRazorpayConfig,
  paymentMode,
  settlePayment,
  toPaise,
} from "@/lib/payments/razorpay";
import { findPayable } from "@/lib/payments/payables";
import { verifyOrderToken } from "@/lib/payments/order-link";
import { recordPaymentOutcome } from "@/lib/payments/result";
import { check, clientKey } from "@/lib/rate-limit";

/**
 * Hands the browser everything it needs to open Razorpay's checkout.
 *
 * Serves both a course seat and a donation: which one is decided by the order
 * ID, not by the caller (see `payables.js`). It powers the first checkout and
 * every retry after it, so someone whose card was declined can finish paying
 * without filling the form again. The signed token is required because the
 * order ID alone is guessable.
 *
 * The Razorpay Order is created once per row and reused on every retry. That is
 * what stops a double charge: if the customer paid but the redirect never
 * reached us, "pay now" finds the order already paid, records it and sends them
 * to their receipt instead of opening a second checkout.
 */
async function gatewayOrderFor(payable, row, { lang, config }) {
  const stored = row.payment || {};
  const amount = toPaise(row.amount);

  if (stored.gatewayOrderId && stored.gatewayAmount === amount) {
    const order = await fetchOrder(config, stored.gatewayOrderId);
    if (order.status !== "paid") return { order };

    const { items = [] } = await fetchOrderPayments(config, order.id);
    const captured =
      items.find((p) => p.status === "captured") || items.find((p) => p.status === "authorized");
    if (captured) {
      const outcome = await settlePayment(captured.id, config);
      if (outcome) await recordPaymentOutcome({ ...outcome, lang });
    }
    // Paid on Razorpay's side: never open a second checkout. If nothing was
    // capturable the status page stays pending for a human to reconcile.
    return { paid: true };
  }

  // First attempt, or the amount changed since: a fresh order.
  const order = await createOrder(
    {
      orderId: row.orderId,
      amount: row.amount,
      currency: row.currency,
      kind: payable.kind,
      notes: payable.notes(row),
    },
    { lang, config },
  );

  await payable.model.updateOne(
    { orderId: row.orderId },
    {
      $set: {
        "payment.gatewayOrderId": order.id,
        "payment.gatewayAmount": order.amount,
      },
    },
  );
  return { order };
}

/**
 * POST { orderId, token, lang, kind? } → { ok, checkout } | { ok, redirect }.
 *
 * `kind` only saves a lookup; it is never trusted to decide what is charged.
 */
export async function POST(request) {
  const limit = check(clientKey(request, "payment"), {
    limit: 12,
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

  const body = await request.json().catch(() => null);
  const orderId = String(body?.orderId || "").trim();
  const lang = body?.lang === "en" ? "en" : "hi";

  if (!orderId || !(await verifyOrderToken(orderId, body?.token))) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const found = await findPayable(orderId, { kind: body?.kind });
  if (!found) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const { payable, doc: row } = found;

  if (row.payment?.status === "success") {
    return NextResponse.json({
      ok: true,
      redirect: await payable.statusPath(orderId, lang),
    });
  }

  const mode = paymentMode();
  if (mode === "simulate") return NextResponse.json({ ok: true, simulate: true });

  const config = getRazorpayConfig();
  if (!config) {
    return NextResponse.json({ ok: false, error: "payment_unavailable" }, { status: 503 });
  }

  try {
    const { order, paid } = await gatewayOrderFor(payable, row, {
      lang,
      config,
    });
    if (paid) {
      return NextResponse.json({
        ok: true,
        redirect: await payable.statusPath(orderId, lang),
      });
    }
    return NextResponse.json(
      {
        ok: true,
        checkout: buildCheckoutOptions({ orderId, ...payable.checkout(row, lang) }, order, {
          lang,
          config,
        }),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[payment] could not prepare checkout", error);
    return NextResponse.json({ ok: false, error: "generic" }, { status: 500 });
  }
}
