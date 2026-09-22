"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-config";
import { dbConnect } from "@/lib/db/connect";
import { COUPON_PATTERN, normalizeCouponCode } from "@/lib/courses/coupons";
import { toPlain } from "@/lib/serialize";
import Coupon from "@/models/Coupon";

/**
 * Creating and switching off coupon codes.
 *
 * Validation lives here rather than only in the form — a server action is a
 * public endpoint. Expected mistakes (a taken code, a bad percentage) come back
 * as `{ ok: false, error }` with a message key, as in the settings actions.
 */

const createSchema = z.object({
  code: z.string().transform(normalizeCouponCode).refine((v) => COUPON_PATTERN.test(v), "coupon_err_code"),
  percentOff: z.coerce.number().int("coupon_err_percent").min(1, "coupon_err_percent").max(100, "coupon_err_percent"),
  maxUses: z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    z.number().int("coupon_err_max").min(1, "coupon_err_max").nullable()
  ),
  note: z.string().trim().max(120).default(""),
});

const PATH = "/[locale]/admin/coupons";

export async function createCoupon(input) {
  const userId = await requireAdmin();

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || "coupon_err_code" };
  }

  await dbConnect();
  try {
    const coupon = await Coupon.create({ ...parsed.data, createdBy: userId });
    revalidatePath(PATH, "page");
    return { ok: true, coupon: toPlain(coupon.toObject()) };
  } catch (error) {
    if (error?.code === 11000) return { ok: false, error: "coupon_err_taken" };
    throw error;
  }
}

export async function setCouponActive(id, active) {
  await requireAdmin();
  await dbConnect();
  await Coupon.updateOne({ _id: String(id) }, { $set: { active: Boolean(active) } });
  revalidatePath(PATH, "page");
}

/**
 * Only an unused code can be deleted. Once a seat carries it, it stays so the
 * registrations list can still be traced back to it — switch it off instead.
 */
export async function deleteCoupon(id) {
  await requireAdmin();
  await dbConnect();
  const result = await Coupon.deleteOne({ _id: String(id), uses: 0 });
  revalidatePath(PATH, "page");
  return { ok: result.deletedCount === 1, error: result.deletedCount === 1 ? null : "coupon_err_used" };
}
