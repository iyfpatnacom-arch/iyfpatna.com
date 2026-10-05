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
      /* Which gateway actually took the money: "razorpay", "ccavenue", or
         "simulated" on a dev machine. Free text, not an enum, because the row
         records history — a payment taken through a gateway this site no
         longer offers must still read back correctly. */
      provider: { type: String, default: "razorpay" },
      /* The Razorpay Order (order_…) and its amount in paise, reused across
         retries so a second "pay now" can see an earlier payment landed.
         Razorpay only: CCAvenue has no order to create ahead of time, and
         `initiate` checks these before opening either gateway so switching
         between them cannot charge twice. */
      gatewayOrderId: { type: String, default: null },
      gatewayAmount: { type: Number, default: null },
      /* Which billing page this row was last sent to. It is how a retry knows
         whether to ask CCAvenue's Status API about the row before opening a
         second billing page — CCAvenue will happily charge the same order
         number twice, so without this a lost redirect becomes a double
         charge. Not where the money came from: that is `provider`, written
         when a payment is actually confirmed. */
      lastGateway: { type: String, default: null },
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
