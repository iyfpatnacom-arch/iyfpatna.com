import { NextResponse } from "next/server";
import { z } from "zod";
import { getCourse, pricingOf } from "@/lib/courses/catalog";
import { applyCoupon, findUsableCoupon } from "@/lib/courses/coupons";
import { check, clientKey } from "@/lib/rate-limit";

/**
 * "Apply" in the checkout: what a code would bring the price down to.
 *
 * A preview only — nothing is reserved or counted, and the enrolment route
 * applies the code again from scratch. Rate-limited tightly because this is the
 * one place a code could be guessed at, and every miss gets the same answer.
 *
 * POST { slug, code } → { ok, code, percentOff, amount } | { ok: false, error }
 */

const bodySchema = z.object({
  slug: z.string().trim().min(1).max(80),
  code: z.string().trim().min(1).max(40),
});

export async function POST(request) {
  const limit = check(clientKey(request, "coupon"), { limit: 10, windowMs: 10 * 60 * 1000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "coupon_invalid" }, { status: 400 });

  const course = getCourse(parsed.data.slug);
  if (!course) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  try {
    const coupon = await findUsableCoupon(parsed.data.code);
    if (!coupon) return NextResponse.json({ ok: false, error: "coupon_invalid" }, { status: 400 });

    const { amount } = applyCoupon(pricingOf(course).amount, coupon);
    return NextResponse.json(
      { ok: true, code: coupon.code, percentOff: coupon.percentOff, amount },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[coupon] check failed", error);
    return NextResponse.json({ ok: false, error: "generic" }, { status: 500 });
  }
}
