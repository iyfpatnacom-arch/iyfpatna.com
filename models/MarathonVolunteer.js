import mongoose from "mongoose";

/**
 * One person distributing books in the Gita Marathon — one row per account.
 *
 * Kept apart from `User`, which the Clerk webhook writes for everybody who
 * ever signs in. This is not "a member": it is somebody the temple has let
 * take stock out of the building and collect money for it, and that is a
 * decision a coordinator makes by hand. So the row exists from the moment
 * they apply and carries the state of that decision, rather than a role being
 * flipped on an account that also means a dozen other things.
 *
 * `clerkId` is the identity and the only one. Signing in with Google and
 * signing in with the email they first registered with are the same Clerk
 * account — Clerk links them — so a volunteer who registers with a password in
 * November and taps "Continue with Google" in December is the same row, with
 * the same sales behind it. Nothing here duplicates what Clerk holds except
 * the three contact fields, which are snapshotted so the coordinator's list
 * does not need a round trip to Clerk to render.
 *
 * `status` is the whole point of the collection:
 *
 *   pending    registered, cannot sell. What everyone starts as.
 *   active     activated by a coordinator; the sell screen opens.
 *   suspended  switched off without losing the history. Never deleted —
 *              every sale and every cash settlement points back here, and a
 *              deleted volunteer would orphan a day's accounts.
 */
/**
 * One title on one volunteer's trolley.
 *
 * The name and the price are snapshotted here rather than read from
 * `lib/marathon/books.js` at sale time, and that is what lets a coordinator
 * hand somebody a title the catalogue has never heard of — a Bhagavatam
 * canto, a leftover box of last year's Krishna Book — by typing its name and
 * price into the issue form. A sale then prices itself from this row, so the
 * trolley is the price list and there is exactly one of them per volunteer.
 *
 * `issued` is cumulative across every consignment, never a "current balance":
 * what is left is `issued` minus what has actually been sold, and the sales
 * are the authority on that (see `lib/marathon/stock.js`). A stored balance
 * would be a second copy of a number the sales already answer, and the two
 * would disagree the first time a sale was voided.
 */
const VolunteerStockSchema = new mongoose.Schema(
  {
    /** A catalogue key ("gita_hi"), or "custom:<slug>" for a typed-in title. */
    bookKey: { type: String, required: true },
    /** Both languages for a catalogue title; the same text twice for a typed one. */
    title: {
      hi: { type: String, default: "" },
      en: { type: String, default: "" },
    },
    language: { type: String, enum: ["hi", "en"], default: "hi" },
    unitPrice: { type: Number, required: true, min: 0 },
    /** Total copies handed over, summed across every consignment. */
    issued: { type: Number, required: true, min: 0, default: 0 },
    /** Copies taken back unsold, so the cap reflects the trolley as it is. */
    returned: { type: Number, required: true, min: 0, default: 0 },
    custom: { type: Boolean, default: false },
  },
  { _id: false },
);

/**
 * One handover of stock from the temple to a volunteer, as it happened.
 *
 * `stock` above is the running total and is what the sell screen is capped
 * by; this is the append-only record of how it got that way. Both are written
 * in the same update. Keeping the log matters for the same reason the cash
 * settlement keeps its variance: "forty Gitas are missing" is a question
 * somebody will ask in January, and "issued twenty on the 3rd and twenty on
 * the 9th, both by this coordinator" is the only useful answer.
 */
const ConsignmentSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    /** Clerk id of the coordinator who handed the books over. */
    by: { type: String, default: "" },
    lines: {
      type: [
        new mongoose.Schema(
          {
            bookKey: { type: String, required: true },
            title: { type: String, default: "" },
            unitPrice: { type: Number, required: true, min: 0 },
            /** Negative on a return, so the log reads as a ledger. */
            quantity: { type: Number, required: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    note: { type: String, default: "", trim: true, maxlength: 200 },
  },
  { _id: false },
);

const MarathonVolunteerSchema = new mongoose.Schema(
  {
    clerkId: { type: String, required: true, unique: true, index: true },

    name: { type: String, required: true, trim: true, maxlength: 80 },
    /** Ten digits, no +91 — normalised before it is stored, as everywhere. */
    phone: { type: String, required: true, trim: true, maxlength: 10 },
    email: { type: String, default: "", trim: true, lowercase: true },

    /* What the coordinator actually needs in order to decide, and nothing
       more. A volunteer form that asks for twelve things on a phone is a
       volunteer form that does not get filled in. */
    city: { type: String, default: "", trim: true, maxlength: 60 },
    college: { type: String, default: "", trim: true, maxlength: 120 },
    occupation: {
      type: String,
      enum: ["student", "working", "other"],
      default: "student",
    },
    age: { type: Number, default: null, min: 12, max: 99 },
    /** Free text — "I did the marathon last year with the Kankarbagh group". */
    about: { type: String, default: "", trim: true, maxlength: 400 },

    status: {
      type: String,
      enum: ["pending", "active", "suspended"],
      default: "pending",
      index: true,
    },
    /** Clerk id of the coordinator who last changed `status`. */
    decidedBy: { type: String, default: "" },
    decidedAt: { type: Date, default: null },
    /** Shown to the volunteer when they are suspended, so it is not a mystery. */
    decisionNote: { type: String, default: "", trim: true, maxlength: 200 },

    /**
     * The trolley: what this volunteer may sell, and for how much.
     *
     * Empty means they may sell nothing, which is deliberate — activating
     * somebody and issuing them books are two separate acts, and a volunteer
     * who has been approved but not yet handed a box should see an empty
     * console rather than the whole catalogue. The sell screen and
     * /api/marathon/sales both read their price list from here.
     */
    stock: { type: [VolunteerStockSchema], default: [] },
    /** How the trolley got to be what it is. Append-only. */
    consignments: { type: [ConsignmentSchema], default: [] },

    /** Which language their screens open in. */
    locale: { type: String, enum: ["hi", "en"], default: "hi" },
  },
  { timestamps: true },
);

/** The coordinator's list is "everyone waiting, oldest first". */
MarathonVolunteerSchema.index({ status: 1, createdAt: 1 });

export default mongoose.models.MarathonVolunteer ||
  mongoose.model("MarathonVolunteer", MarathonVolunteerSchema);
