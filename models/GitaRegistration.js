import mongoose from "mongoose";
import { paymentSchema } from "./payment-schema";

/**
 * One paid registration for the Gita Jayanti festival — the quiz, the
 * mahotsav, or both on one receipt.
 *
 * A fourth collection beside `Enrollment`, `Donation` and `BookSale`, and for
 * the same reason the first three are separate: what it holds is not what they
 * hold. A course seat has a batch, a mode and a capacity; a donation has a
 * postal address because its receipt is a tax document. This row has a *set of
 * events*, and that set is what the price, the WhatsApp group and — months
 * later, at the door — the attendance register are all derived from. Bolting
 * `events: []` onto `Enrollment` would have put an array that can never be
 * filled on every course seat ever sold, and would have left the course
 * attendance code deciding, on every scan, which event a DYS pass meant.
 *
 * What it does share is money, so it shares the payment state machine (see
 * `payment-schema.js`) and the entire settling pipeline around it: the same
 * /api/payment/initiate, the same gateway callback, the same webhook, the same
 * write-exactly-once guarantee. See the `gita` entry in `lib/payments/payables.js`.
 *
 * Every word the receipt prints about what was bought is snapshotted here at
 * the moment of registration. The catalog in content/events is edited freely —
 * a receipt reprinted next year must still say what the person actually paid
 * for, and at what price.
 */

/**
 * One event this person was admitted to, on one day.
 *
 * Keyed by `eventKey` *and* `dayKey` rather than either alone. The event is
 * what makes "how many came to the mahotsav?" answerable separately from the
 * quiz, which is the whole point of the Gita tab in the admin. The day is kept
 * for the same reason the course pass keeps it: a second scan the same day is
 * recognised as the same admission rather than counted twice, and the mahotsav
 * may yet run over more than one day.
 */
const GitaAttendanceSchema = new mongoose.Schema(
  {
    /** "quiz" | "mahotsav" — one of `EVENT_KEYS`, and always one they paid for. */
    eventKey: { type: String, required: true },
    /** The IST calendar date, so a repeat scan is the same admission. */
    dayKey: { type: String, required: true },
    at: { type: Date, default: Date.now },
    /** Clerk id of the admin who scanned or ticked them. */
    markedBy: { type: String, default: null },
    /** "qr" from a scanned pass, "manual" from the dashboard or a typed ID. */
    source: { type: String, enum: ["qr", "manual"], default: "qr" },
  },
  { _id: false },
);

const GitaRegistrationSchema = new mongoose.Schema(
  {
    /** GITA-101 — short enough to read down a helpline. */
    orderId: { type: String, required: true, unique: true },

    /** Which festival this belongs to, so next year's is a new slug, not a migration. */
    festivalSlug: { type: String, required: true, index: true },

    /**
     * The events paid for, in catalog order: ["quiz"], ["mahotsav"] or both.
     *
     * The authority on what this registration is, and the only input to the
     * price. Required and non-empty — a registration for no event would walk
     * past the gateway at zero rupees.
     */
    events: {
      type: [String],
      required: true,
      validate: {
        validator: (events) => Array.isArray(events) && events.length > 0,
        message: "A Gita registration must include at least one event.",
      },
    },
    /** Their names in both languages, as they read on the day. */
    eventTitles: {
      type: [
        new mongoose.Schema(
          {
            key: { type: String },
            hi: { type: String },
            en: { type: String },
          },
          { _id: false },
        ),
      ],
      default: [],
    },

    amount: { type: Number, required: true },
    /* What the same events would have cost bought separately. Only ever above
       `amount` on a combo, and it is what lets the receipt print the saving
       without recomputing a price that may since have changed. */
    fullAmount: { type: Number },
    currency: { type: String, default: "INR" },

    /* Set when they happened to be signed in. Never a precondition: almost
       nobody registering for a quiz has an account on this site. */
    clerkId: { type: String, index: true },

    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    /** Ten digits, no +91 — normalised before it is stored. */
    phone: { type: String, required: true, trim: true },
    age: { type: Number },
    occupation: { type: String, enum: ["student", "working", "other"] },
    /* Asked on the form because the mahotsav is seated separately and the
       volunteer groups are split the same way. Three values, not two. */
    gender: { type: String, enum: ["male", "female", "other"] },
    /** School, college or employer. Free text, and often the most useful column. */
    institution: { type: String, trim: true, default: null },

    /* No longer asked for, and no longer required. The form used to take a
       one-line address with the PIN inside it, as the donation form does,
       because the temple wanted to know which districts the quiz reached;
       weighed against a registration that takes fifteen seconds, it was not
       worth the two fields. Both stay in the schema, unrequired, because rows
       written while the form asked still carry them and their receipts must
       still print what was given. */
    address: { type: String, trim: true, default: null },
    pincode: { type: String, trim: true, default: null },

    /* Who told them about it — a volunteer's name, or a code off a poster.
       Free text on purpose: it is a thank-you list and a reach report, not a
       foreign key, and a devotee who writes a name that matches nobody in the
       database must still be able to submit the form. */
    referral: { type: String, trim: true, default: null },

    locale: { type: String, enum: ["hi", "en"], default: "hi" },

    payment: { type: paymentSchema(), default: () => ({}) },

    attendance: { type: [GitaAttendanceSchema], default: [] },

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

// "Has this phone already registered for this festival?" — asked on every POST.
GitaRegistrationSchema.index({ festivalSlug: 1, phone: 1 });
// The admin tab lists paid rows for one festival, newest first.
GitaRegistrationSchema.index({ festivalSlug: 1, "payment.status": 1, createdAt: -1 });

export default mongoose.models.GitaRegistration ||
  mongoose.model("GitaRegistration", GitaRegistrationSchema);
