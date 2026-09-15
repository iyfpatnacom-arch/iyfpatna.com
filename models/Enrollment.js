import mongoose from "mongoose";

/**
 * A paid seat on a course — one row per person per batch.
 *
 * Kept apart from `Registration` on purpose. A registration is a free "count
 * me in" with no money attached; an enrollment carries an order ID, an amount
 * and a payment state machine, and every check downstream (the receipt, the
 * status page, the gateway's amount comparison) reads this row as the only
 * authority on what was charged. Mixing the two would put a `payment` field on
 * thousands of rows that can never have one.
 *
 * Course *content* (copy, price, dates) lives in content/courses/*.json. What
 * is copied onto the row — title, amount — is a snapshot at the moment of
 * enrolment, so a later price change or a renamed course never rewrites what
 * someone was actually charged.
 */

const PaymentSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["pending", "success", "failed", "aborted"],
      default: "pending",
    },
    provider: { type: String, default: "ccavenue" },
    trackingId: { type: String, default: null },
    bankRefNo: { type: String, default: null },
    paymentMode: { type: String, default: null },
    failureMessage: { type: String, default: null },
    paidAt: { type: Date, default: null },
    amountMismatch: { type: Boolean, default: false },
    reconciledAt: { type: Date, default: null },
    // The whole decrypted gateway response, for reconciliation by hand.
    raw: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const EnrollmentSchema = new mongoose.Schema(
  {
    /** DYS-101 — short enough to read down a phone line. */
    orderId: { type: String, required: true, unique: true },
    courseSlug: { type: String, required: true },
    batchId: { type: String, required: true },
    courseTitle: {
      hi: { type: String },
      en: { type: String },
    },

    amount: { type: Number, required: true },
    mrp: { type: Number },
    currency: { type: String, default: "INR" },

    /* Set when the person was signed in with Clerk. Optional by design: an
       account is never a precondition for paying, but when there is one the
       dashboard can later list "my courses" by it. */
    clerkId: { type: String, index: true },

    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    /** Ten digits, no +91 — normalised before it is stored. */
    phone: { type: String, required: true, trim: true },
    age: { type: Number },
    occupation: { type: String, enum: ["student", "working", "other"] },
    /** Which of the course's `modes` they picked — offline / online. */
    mode: { type: String },
    locale: { type: String, enum: ["hi", "en"], default: "hi" },

    payment: { type: PaymentSchema, default: () => ({}) },

    notifications: {
      emailSent: { type: Boolean, default: false },
      attempts: { type: [mongoose.Schema.Types.Mixed], default: [] },
    },

    meta: {
      userAgent: { type: String },
    },
  },
  { timestamps: true }
);

// "Has this phone already paid for this batch?" — asked on every enrolment.
EnrollmentSchema.index({ courseSlug: 1, batchId: 1, phone: 1 });
// The admin view and the seat count both filter on paid rows.
EnrollmentSchema.index({ courseSlug: 1, batchId: 1, "payment.status": 1 });
EnrollmentSchema.index({ "payment.status": 1, createdAt: -1 });

export default mongoose.models.Enrollment ||
  mongoose.model("Enrollment", EnrollmentSchema);
