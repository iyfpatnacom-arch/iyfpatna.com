import mongoose from "mongoose";

/**
 * The payment state machine, shared by everything this site takes money for.
 *
 * A course seat and a temple donation are different things with different
 * rows, but the money is taken the same way and settled by the same writer —
 * `recordPaymentOutcome` sets these exact dotted paths on whichever collection
 * the order belongs to. Two hand-copied sub-schemas would let that writer
 * quietly stop matching one of them, so both models call this instead.
 *
 * A factory rather than one exported schema instance: a Mongoose schema
 * carries per-model state once compiled, and handing the same object to two
 * models is asking for the kind of bug that only shows up under load.
 */
export function paymentSchema() {
  return new mongoose.Schema(
    {
      status: {
        type: String,
        enum: ["pending", "success", "failed", "aborted"],
        default: "pending",
      },
      provider: { type: String, default: "razorpay" },
      /* The Razorpay Order (order_…) and its amount in paise, reused across
         retries so a second "pay now" can see an earlier payment landed. */
      gatewayOrderId: { type: String, default: null },
      gatewayAmount: { type: Number, default: null },
      trackingId: { type: String, default: null },
      bankRefNo: { type: String, default: null },
      paymentMode: { type: String, default: null },
      failureMessage: { type: String, default: null },
      paidAt: { type: Date, default: null },
      amountMismatch: { type: Boolean, default: false },
      reconciledAt: { type: Date, default: null },
      // What the gateway said about the payment, for reconciliation by hand.
      raw: { type: mongoose.Schema.Types.Mixed, default: null },
    },
    { _id: false },
  );
}
