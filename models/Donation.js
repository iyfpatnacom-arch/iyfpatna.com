import mongoose from "mongoose";
import { paymentSchema } from "./payment-schema";

/**
 * One offering made through /donate — one row per attempt to give.
 *
 * Kept apart from `Enrollment` for the same reason `Enrollment` is kept apart
 * from `Registration`: a donation buys no seat, has no batch, no capacity and
 * no attendance, and it carries fields a course row has no use for — a postal
 * address and a PAN, which exist only because a donation receipt is a tax
 * document and an enrolment receipt is not.
 *
 * What the two share is money, so they share the payment state machine (see
 * `payment-schema.js`) and the whole settling pipeline around it.
 *
 * Every word the receipt prints about the seva is snapshotted here at the
 * moment of giving. The seva list and its names live in `SEVA_LIST` and the
 * `donate.seva.*` messages, both of which are edited freely — a receipt
 * reprinted next year must still say what the donor actually gave towards.
 */

const DonationSchema = new mongoose.Schema(
  {
    /** DN-101 — short enough to read down a phone line. */
    orderId: { type: String, required: true, unique: true },

    /** The seva as `SEVA_LIST` publishes it: key for logic, slug for links. */
    sevaKey: { type: String, required: true },
    sevaSlug: { type: String, required: true },
    /** The seva's name in both languages, as it read on the day. */
    sevaTitle: {
      hi: { type: String },
      en: { type: String },
    },

    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },

    /* Set when the donor happened to be signed in. Never a precondition:
       most people who give have no account and must not need one. */
    clerkId: { type: String, index: true },

    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    /** Ten digits, no +91 — normalised before it is stored. */
    phone: { type: String, required: true, trim: true },

    /* One free-text block, exactly as the donor typed it. Not split into
       line/city/state: an 80G receipt needs an address a postal worker can
       read, not a schema, and every form that insists on four boxes gets the
       city typed into the street field anyway.

       The PIN is inside that block and is also stored on its own — not asked
       for twice, but read back out of the address by `extractPincode` (see
       `lib/donations/address.js`), because a PIN is the one part of an address
       that can be checked, indexed and counted by. The receipt prints the
       address alone; this field is for the temple's own reports. */
    address: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },

    /* Optional. The trust needs a donor's PAN to file Form 10BE against the
       donation; someone who does not want to give it still gets a receipt. */
    pan: { type: String, default: null, trim: true, uppercase: true },

    locale: { type: String, enum: ["hi", "en"], default: "hi" },

    payment: { type: paymentSchema(), default: () => ({}) },

    notifications: {
      emailSent: { type: Boolean, default: false },
      attempts: { type: [mongoose.Schema.Types.Mixed], default: [] },
    },

    meta: {
      userAgent: { type: String },
    },
  },
  { timestamps: true },
);

/* "What has this person given?" — asked from the helpline, where the caller
   has a phone number and nothing else. */
DonationSchema.index({ phone: 1, createdAt: -1 });
/* The admin list and every total only ever count settled money. */
DonationSchema.index({ "payment.status": 1, createdAt: -1 });
/* Per-seva totals, for the reports the temple asks for at year end. */
DonationSchema.index({ sevaKey: 1, "payment.status": 1 });

export default mongoose.models.Donation || mongoose.model("Donation", DonationSchema);
