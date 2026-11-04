import mongoose from "mongoose";

/**
 * One volunteer handing one day's cash to the desk — and the desk counting it.
 *
 * The online half of the marathon needs no reconciliation: Razorpay says what
 * it took and the row records it. Cash is the opposite. A volunteer records a
 * ₹300 sale on a footpath and then carries ₹300 around in a bag for six hours,
 * and the only thing that closes the loop is somebody at the temple counting
 * notes against a number.
 *
 * So the loop is two acts by two people, and the row holds both:
 *
 *   submitted  the volunteer says "here is the day's cash, I make it ₹X".
 *              `expectedAmount` is frozen at that moment from their own
 *              recorded sales — not recomputed later, because a sale entered
 *              after the handover belongs to the next reckoning, not this one.
 *   verified   the desk counts it and records what actually arrived.
 *              `variance` is the difference, and it is kept rather than
 *              corrected: a deficit is a fact about a day, and quietly editing
 *              the expected figure to match the cash is how a shortfall stops
 *              being visible.
 *
 * One row per volunteer per day, enforced by the unique index. Submitting
 * twice in a day is a mistake, not a second handover; the second attempt is
 * refused and the desk amends the first.
 */
const CashSettlementSchema = new mongoose.Schema(
  {
    volunteerClerkId: { type: String, required: true, index: true },
    volunteerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MarathonVolunteer",
      required: true,
    },
    volunteerName: { type: String, required: true, trim: true },

    /** The IST calendar date whose cash this is. */
    dayKey: { type: String, required: true, index: true },

    /* What the volunteer's own recorded cash sales came to, frozen at
       submission, and how many sales that was. The desk reads both: a
       declared figure that matches to the rupee on nineteen sales is a
       different kind of evidence from one that matches on two. */
    expectedAmount: { type: Number, required: true, min: 0 },
    expectedCount: { type: Number, required: true, min: 0 },
    /** The sales counted into this settlement, for an exact audit trail. */
    saleIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "BookSale" }],
      default: [],
    },

    /** What the volunteer says they are handing over. */
    declaredAmount: { type: Number, required: true, min: 0 },
    note: { type: String, default: "", trim: true, maxlength: 300 },

    status: {
      type: String,
      enum: ["submitted", "verified"],
      default: "submitted",
      index: true,
    },

    /* The desk's half. `receivedAmount` is what was counted onto the table;
       `variance` is `receivedAmount - expectedAmount`, so a positive number is
       excess and a negative one a deficit. Stored rather than derived on read
       so a report can sort and total by it. */
    receivedAmount: { type: Number, default: null, min: 0 },
    variance: { type: Number, default: null },
    verifiedBy: { type: String, default: "" },
    verifiedAt: { type: Date, default: null },
    adminNote: { type: String, default: "", trim: true, maxlength: 300 },
  },
  { timestamps: true },
);

CashSettlementSchema.index(
  { volunteerClerkId: 1, dayKey: 1 },
  { unique: true },
);
/** The desk's queue: everything still waiting to be counted, oldest first. */
CashSettlementSchema.index({ status: 1, dayKey: 1 });

export default mongoose.models.CashSettlement ||
  mongoose.model("CashSettlement", CashSettlementSchema);
