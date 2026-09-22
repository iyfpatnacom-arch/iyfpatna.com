import { dbConnect } from "@/lib/db/connect";
import Coupon from "@/models/Coupon";

/**
 * Coupon lookup and pricing, shared by the enrolment route (which charges) and
 * the "Apply" check in the checkout (which only previews).
 *
 * The server always re-applies the code on enrolment; what the checkout showed
 * is never trusted.
 */

export const COUPON_PATTERN = /^[A-Z0-9-]{3,32}$/;

export function normalizeCouponCode(value) {
  return String(value ?? "").trim().toUpperCase();
}

/**
 * The live coupon for a code, or null when it is unknown, switched off or used
 * up. The three are deliberately indistinguishable to the caller, so the
 * checkout cannot be used to find out which codes exist.
 */
export async function findUsableCoupon(rawCode) {
  const code = normalizeCouponCode(rawCode);
  if (!COUPON_PATTERN.test(code)) return null;

  await dbConnect();
  const coupon = await Coupon.findOne({ code, active: true }).lean();
  if (!coupon) return null;
  if (coupon.maxUses && coupon.uses >= coupon.maxUses) return null;
  return coupon;
}

/**
 * What is charged after the coupon, in whole rupees.
 *
 * Rounded to the rupee because the course price is whole rupees and a receipt
 * reading "INR 49.50" invites questions. Anything under ₹1 becomes free —
 * Razorpay will not open a checkout for less than a rupee.
 */
export function applyCoupon(amount, coupon) {
  const discounted = Math.round((Number(amount) * (100 - coupon.percentOff)) / 100);
  const final = discounted < 1 ? 0 : discounted;
  return {
    amount: final,
    snapshot: {
      code: coupon.code,
      percentOff: coupon.percentOff,
      originalAmount: Number(amount),
    },
  };
}

/** Counts one confirmed seat against the code. Never fails the caller. */
export async function recordCouponUse(code) {
  if (!code) return;
  await Coupon.updateOne({ code }, { $inc: { uses: 1 } }).catch((error) =>
    console.error(`[coupon] could not count a use of ${code}`, error)
  );
}
