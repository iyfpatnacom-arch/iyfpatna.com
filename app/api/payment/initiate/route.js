import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/connect";
import Enrollment from "@/models/Enrollment";
import { buildPaymentRequest, getCcavenueConfig, paymentMode } from "@/lib/payments/ccavenue";
import { orderStatusPath, verifyOrderToken } from "@/lib/payments/order-link";
import { check, clientKey } from "@/lib/rate-limit";

/**
 * Hands the browser everything it needs to POST itself to CCAvenue.
 *
 * Powers both the checkout and "pay now" on the status page, so a visitor
 * whose card was declined can finish paying without enrolling again. The
 * signed token is required because the order ID alone is guessable.
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
    { orderId: 1, courseSlug: 1, amount: 1, currency: 1, name: 1, email: 1, phone: 1, "payment.status": 1 }
  ).lean();

  if (!enrollment) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  if (enrollment.payment?.status === "success") {
    return NextResponse.json({ ok: true, redirect: await orderStatusPath(orderId, lang) });
  }

  const mode = paymentMode();
  if (mode === "simulate") return NextResponse.json({ ok: true, simulate: true });

  let config = null;
  try {
    config = getCcavenueConfig();
  } catch (error) {
    console.error("[payment] bad CCAvenue configuration", error);
  }
  if (!config) {
    return NextResponse.json({ ok: false, error: "payment_unavailable" }, { status: 503 });
  }

  try {
    const { action, fields } = buildPaymentRequest(enrollment, { lang, config });
    return NextResponse.json(
      { ok: true, action, fields },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[payment] could not build request", error);
    return NextResponse.json({ ok: false, error: "generic" }, { status: 500 });
  }
}
