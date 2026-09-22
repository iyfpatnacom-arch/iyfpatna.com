import mongoose from "mongoose";

/**
 * A discount code an admin hands out by hand — on WhatsApp, at the desk.
 *
 * Never listed anywhere public: the only way to use one is to know it. The
 * enrolment route looks it up by `code` and takes `percentOff` off the course
 * price; 100 makes the seat free and skips the gateway altogether.
 *
 * `uses` counts confirmed seats only (a successful payment, or a free seat),
 * so an abandoned checkout never eats into `maxUses`.
 */
const CouponSchema = new mongoose.Schema(
  {
    /** Stored upper-case; what people type is upper-cased before the lookup. */
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    percentOff: { type: Number, required: true, min: 1, max: 100 },
    active: { type: Boolean, default: true },
    /** null = unlimited. */
    maxUses: { type: Number, default: null, min: 1 },
    uses: { type: Number, default: 0 },
    /** Who it was made for — "Volunteers", "Sponsor: Ramesh ji". Admin-only. */
    note: { type: String, default: "", trim: true },
    createdBy: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.Coupon || mongoose.model("Coupon", CouponSchema);
