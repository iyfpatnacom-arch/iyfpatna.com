import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/connect";
import Enrollment from "@/models/Enrollment";
import { paymentMode } from "@/lib/payments/razorpay";
import { orderStatusPath, verifyOrderToken } from "@/lib/payments/order-link";
import { recordPaymentOutcome } from "@/lib/payments/result";

/**
 * Local-development stand-in for the gateway.
 *
 * Without Razorpay keys there is no gateway to talk to on localhost. This marks
 * the order paid through the very same `recordPaymentOutcome` a real success goes through — so the
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

  await recordPaymentOutcome({
    orderId,
    lang,
    status: "success",
    amount: Number(enrollment.amount),
    currency: enrollment.currency || "INR",
    trackingId: `SIM-${Date.now()}`,
    bankRefNo: null,
    paymentMode: "Simulated",
    provider: "simulated",
  });

  return NextResponse.json({ ok: true, redirect: await orderStatusPath(orderId, lang) });
}
