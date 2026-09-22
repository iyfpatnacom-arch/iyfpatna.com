import { NextResponse } from "next/server";
import { z } from "zod";
import { dbConnect } from "@/lib/db/connect";
import { getFlag } from "@/lib/flags";
import { getOptionalAuth } from "@/lib/auth-config";
import Enrollment from "@/models/Enrollment";
import { getCourse, isEnrollmentOpen, modeOf, pricingOf } from "@/lib/courses/catalog";
import { generateOrderId } from "@/lib/courses/enrollment";
import { normalizePhone, PHONE_PATTERN } from "@/lib/courses/phone";
import { applyCoupon, findUsableCoupon } from "@/lib/courses/coupons";
import { orderStatusPath, orderToken } from "@/lib/payments/order-link";
import { paymentMode } from "@/lib/payments/razorpay";
import { recordPaymentOutcome } from "@/lib/payments/result";
import { check, clientKey } from "@/lib/rate-limit";

/**
 * Step one of paying for a course: save who is coming and mint an order.
 *
 * Deliberately separate from /api/payment/initiate: the same order can then be
 * paid from the status page, so someone whose card was declined or whose
 * network dropped finishes paying without filling the form again.
 *
 * The price is read from the course catalog and stored on the row — the body
 * of this request never gets a say in what is charged. A coupon code is the
 * one input that moves it, and only by the percentage stored against that code.
 * A code worth 100% confirms the seat right here, with no gateway involved.
 */

const optionalAge = z.preprocess(
  (value) => (value === "" || value == null ? undefined : Number(value)),
  z.number().int().min(10).max(90).optional()
);

const bodySchema = z.object({
  slug: z.string().trim().min(1).max(80),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(120),
  phone: z.string().transform(normalizePhone).refine((v) => PHONE_PATTERN.test(v)),
  age: optionalAge,
  occupation: z.enum(["student", "working", "other"]),
  mode: z.string().trim().min(1).max(40),
  locale: z.enum(["hi", "en"]).default("hi"),
  coupon: z.string().trim().max(40).optional(),
});

function fail(status, error, headers) {
  return NextResponse.json({ ok: false, error }, { status, headers });
}

export async function POST(request) {
  const limit = check(clientKey(request, "enroll"), { limit: 10, windowMs: 10 * 60 * 1000 });
  if (!limit.allowed) {
    return fail(429, "rate_limited", { "Retry-After": String(limit.retryAfterSeconds) });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, "invalid");
  const data = parsed.data;

  const course = getCourse(data.slug);
  if (!course) return fail(404, "not_found");
  if (!modeOf(course, data.mode)) return fail(400, "invalid");

  const registrationsOpen = await getFlag("registrations.programsOpen", true);
  if (!registrationsOpen || !isEnrollmentOpen(course)) return fail(403, "closed");

  try {
    await dbConnect();
    const batchId = course.batch.id;
    const scope = { courseSlug: course.slug, batchId, phone: data.phone };

    /* One seat per phone per batch. Someone who has already paid and taps
       Register again is sent to their receipt, not charged twice. */
    const paid = await Enrollment.findOne(
      { ...scope, "payment.status": "success" },
      { orderId: 1 }
    ).lean();
    if (paid) {
      return NextResponse.json({
        ok: true,
        already: true,
        orderId: paid.orderId,
        statusUrl: await orderStatusPath(paid.orderId, data.locale),
      });
    }

    if (course.batch.capacity) {
      const taken = await Enrollment.countDocuments({
        courseSlug: course.slug,
        batchId,
        "payment.status": "success",
      });
      if (taken >= course.batch.capacity) return fail(409, "sold_out");
    }

    const { userId } = await getOptionalAuth();
    const { mrp, currency } = pricingOf(course);
    let { amount } = pricingOf(course);

    let coupon = null;
    if (data.coupon) {
      const found = await findUsableCoupon(data.coupon);
      if (!found) return fail(400, "coupon_invalid");
      ({ amount, snapshot: coupon } = applyCoupon(amount, found));
    }

    const details = {
      name: data.name,
      email: data.email,
      occupation: data.occupation,
      mode: data.mode,
      locale: data.locale,
      amount,
      mrp,
      currency,
      courseTitle: course.title,
      meta: { userAgent: request.headers.get("user-agent")?.slice(0, 300) || null },
    };
    if (data.age !== undefined) details.age = data.age;
    if (userId) details.clerkId = userId;
    if (coupon) details.coupon = coupon;

    /* An unpaid attempt for the same phone is picked up again rather than
       left behind as a second row: the admin list should hold one line per
       person, and the order ID they may already have noted keeps working. */
    let enrollment = await Enrollment.findOneAndUpdate(
      { ...scope, "payment.status": { $ne: "success" } },
      // A retry without the code must not keep the discount from the last try.
      coupon ? { $set: details } : { $set: details, $unset: { coupon: 1 } },
      { sort: { createdAt: -1 }, returnDocument: "after" }
    ).lean();

    if (!enrollment) {
      const orderId = await generateOrderId(course.orderPrefix);
      enrollment = (
        await Enrollment.create({ orderId, courseSlug: course.slug, batchId, phone: data.phone, ...details })
      ).toObject();
    }

    const [token, statusUrl] = await Promise.all([
      orderToken(enrollment.orderId),
      orderStatusPath(enrollment.orderId, data.locale),
    ]);

    /* Free after the coupon: confirm the seat through the same writer a real
       payment goes through, so the email, the receipt PDF and the pass all
       come out exactly as they do for a paid seat. */
    if (amount === 0) {
      await recordPaymentOutcome({
        orderId: enrollment.orderId,
        lang: data.locale,
        status: "success",
        amount: 0,
        currency,
        provider: "coupon",
        paymentMode: "Coupon",
        trackingId: null,
        bankRefNo: null,
      });
      return NextResponse.json(
        { ok: true, orderId: enrollment.orderId, token, statusUrl, next: "status", free: true },
        { status: 201 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        orderId: enrollment.orderId,
        token,
        statusUrl,
        // With no gateway in production the seat is saved as pending and the
        // status page explains that payment opens shortly.
        next: paymentMode() ? "payment" : "status",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[enroll] failed", error);
    return fail(500, "generic");
  }
}
