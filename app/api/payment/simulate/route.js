import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/connect";
import Enrollment from "@/models/Enrollment";
import { paymentMode } from "@/lib/payments/ccavenue";
import { orderStatusPath, verifyOrderToken } from "@/lib/payments/order-link";
import { recordGatewayResponse } from "@/lib/payments/result";

/**
 * Local-development stand-in for the gateway.
 *
 * CCAvenue can only redirect to a registered public HTTPS URL, so on localhost
 * the real round trip is impossible. This marks the order paid through the
 * very same `recordGatewayResponse` a real success goes through — so the
 * confirmation email, the receipt and the success screen are all exercised
 * exactly as they will run in production.
 *
 * Answers 404 whenever `paymentMode()` is not "simulate", which it never is in
 * a production build.
 */
export async function POST(request) {
  if (paymentMode() !== "simulate") {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const orderId = String(body?.orderId || "").trim();
  const lang = body?.lang === "en" ? "en" : "hi";

  if (!orderId || !(await verifyOrderToken(orderId, body?.token))) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  await dbConnect();
  const enrollment = await Enrollment.findOne({ orderId }, { amount: 1, currency: 1 }).lean();
  if (!enrollment) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  await recordGatewayResponse({
    order_id: orderId,
    order_status: "Success",
    amount: Number(enrollment.amount).toFixed(2),
    currency: enrollment.currency || "INR",
    tracking_id: `SIM-${Date.now()}`,
    bank_ref_no: null,
    payment_mode: "Simulated",
    provider: "simulated",
    merchant_param3: lang,
  });

  return NextResponse.json({ ok: true, redirect: await orderStatusPath(orderId, lang) });
}
