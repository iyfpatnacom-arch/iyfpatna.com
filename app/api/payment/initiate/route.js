import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/connect";
import Enrollment from "@/models/Enrollment";
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
import { orderStatusPath, verifyOrderToken } from "@/lib/payments/order-link";
import { recordPaymentOutcome } from "@/lib/payments/result";
import { check, clientKey } from "@/lib/rate-limit";

/**
 * Hands the browser everything it needs to open Razorpay's checkout.
 *
 * Powers both the checkout and "pay now" on the status page, so a visitor
 * whose card was declined can finish paying without enrolling again. The
 * signed token is required because the order ID alone is guessable.
 *
 * The Razorpay Order is created once per enrolment and reused on every retry.
 * That is what stops a double charge: if the customer paid but the redirect
 * never reached us, "pay now" finds the order already paid, records it and
 * sends them to their receipt instead of opening a second checkout.
 */
async function gatewayOrderFor(enrollment, { lang, config }) {
  const stored = enrollment.payment || {};
  const amount = toPaise(enrollment.amount);

  if (stored.gatewayOrderId && stored.gatewayAmount === amount) {
    const order = await fetchOrder(config, stored.gatewayOrderId);
    if (order.status !== "paid") return { order };

    const { items = [] } = await fetchOrderPayments(config, order.id);
    const captured = items.find((p) => p.status === "captured") || items.find((p) => p.status === "authorized");
    if (captured) {
      const outcome = await settlePayment(captured.id, config);
      if (outcome) await recordPaymentOutcome({ ...outcome, lang });
    }
    // Paid on Razorpay's side: never open a second checkout. If nothing was
    // capturable the status page stays pending for a human to reconcile.
    return { paid: true };
  }

  // First attempt, or the price changed since: a fresh order.
  const order = await createOrder(enrollment, { lang, config });
  await Enrollment.updateOne(
    { orderId: enrollment.orderId },
    { $set: { "payment.gatewayOrderId": order.id, "payment.gatewayAmount": order.amount } }
  );
  return { order };
}

/**
 * POST { orderId, token, lang } → { ok, checkout } | { ok, redirect }.
 */
export async function POST(request) {
  const limit = check(clientKey(request, "payment"), { limit: 12, windowMs: 10 * 60 * 1000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const body = await request.json().catch(() => null);
  const orderId = String(body?.orderId || "").trim();
  const lang = body?.lang === "en" ? "en" : "hi";

  if (!orderId || !(await verifyOrderToken(orderId, body?.token))) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  await dbConnect();
  const enrollment = await Enrollment.findOne(
    { orderId },
    {
      orderId: 1,
      courseSlug: 1,
      courseTitle: 1,
      amount: 1,
      currency: 1,
      name: 1,
      email: 1,
      phone: 1,
      "payment.status": 1,
      "payment.gatewayOrderId": 1,
      "payment.gatewayAmount": 1,
    }
  ).lean();

  if (!enrollment) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  if (enrollment.payment?.status === "success") {
    return NextResponse.json({ ok: true, redirect: await orderStatusPath(orderId, lang) });
  }

  const mode = paymentMode();
  if (mode === "simulate") return NextResponse.json({ ok: true, simulate: true });

  const config = getRazorpayConfig();
  if (!config) {
    return NextResponse.json({ ok: false, error: "payment_unavailable" }, { status: 503 });
  }

  try {
    const { order, paid } = await gatewayOrderFor(enrollment, { lang, config });
    if (paid) {
      return NextResponse.json({ ok: true, redirect: await orderStatusPath(orderId, lang) });
    }
    return NextResponse.json(
      { ok: true, checkout: buildCheckoutOptions(enrollment, order, { lang, config }) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[payment] could not prepare checkout", error);
    return NextResponse.json({ ok: false, error: "generic" }, { status: 500 });
  }
}
