import mongoose from "mongoose";
import { paymentSchema } from "./payment-schema";

/**
 * One handover of books — one row per transaction a volunteer records.
 *
 * This is a sale, not a donation, and the distinction is not pedantry: the
 * reader pays a counter price for a thing they take away, so there is no 80G
 * deduction, no postal address, no PAN and no tax document at the end of it.
 * A `Donation` row carries all four because a donation needs them. Putting
 * both in one collection would mean a few thousand street sales each carrying
 * five empty fields that can never be filled in.
 *
 * What it shares with a donation is the money, so it shares the payment state
 * machine (see `payment-schema.js`) and is settled by the same pipeline —
 * `payables.js` registers it as the "book" kind, and from there the Razorpay
 * callback, the webhook and the retry logic all work on it unchanged.
 *
 * Cash is recorded through that same machine rather than beside it:
 * `payment.status` goes straight to "success" with `provider: "cash"`. So
 * "has this sale happened" is one question with one answer everywhere —
 * `payment.status === "success"` — instead of two conditions that drift apart
 * the first time somebody writes a report. Where the cash physically *is* is a
 * different question, and `settlementId` below is what answers it.
 */

/**
 * One title in one transaction.
 *
 * The title and the unit price are snapshotted, like a course's title on an
 * enrolment: the counter price of a Gita will change, and a sale recorded in
 * November must still read back as what was actually charged that evening.
 */
const SaleItemSchema = new mongoose.Schema(
  {
    bookKey: { type: String, required: true },
    title: {
      hi: { type: String, default: "" },
      en: { type: String, default: "" },
    },
    language: { type: String, enum: ["hi", "en"], required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const BookSaleSchema = new mongoose.Schema(
  {
    /** GM-101 — its own counter, so it can never collide with DN or DYS. */
    orderId: { type: String, required: true, unique: true },

    /* The volunteer, by Clerk id first. The ObjectId is the formal reference
       and the name is a snapshot for the admin table and the CSV — a
       leaderboard that had to join two collections to print a name would do
       it on every row of every render. */
    volunteerClerkId: { type: String, required: true, index: true },
    volunteerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MarathonVolunteer",
      required: true,
    },
    volunteerName: { type: String, required: true, trim: true },

    items: { type: [SaleItemSchema], required: true },
    /** Total copies across `items` — denormalised because every count is of
        books, not of transactions, and the alternative is unwinding the array
        in every aggregation on this collection. */
    quantity: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, default: "INR" },

    method: { type: String, enum: ["cash", "online"], required: true },

    /**
     * The IST calendar date the sale belongs to.
     *
     * A day, not an instant, because everything downstream is per day: the
     * leaderboard's "today", the chart's bars, and above all the cash
     * settlement — a volunteer hands over one day's takings, and a sale made
     * at 9:40 pm belongs to that evening however the server's clock is set.
     */
    dayKey: { type: String, required: true, index: true },

    /* Optional, and asked for last. Somebody buying a book on a footpath owes
       us no details, and a form that demanded them would cost more sales than
       the contact list is worth. */
    buyer: {
      name: { type: String, default: "", trim: true, maxlength: 80 },
      phone: { type: String, default: "", trim: true, maxlength: 10 },
    },
    note: { type: String, default: "", trim: true, maxlength: 200 },

    payment: { type: paymentSchema(), default: () => ({}) },

    /**
     * The Razorpay QR this sale is waiting to be paid through.
     *
     * Only ever set on an online sale, and only when the account has the QR
     * Codes API enabled. It is what lets the sell screen ask "has anyone paid
     * this yet" without a webhook having arrived — a QR payment carries no
     * Razorpay Order, so there is nothing else on the row to look it up by.
     * See `lib/payments/razorpay.js`.
     */
    qr: {
      id: { type: String, default: null },
      imageUrl: { type: String, default: null },
      closeBy: { type: Date, default: null },
    },

    /**
     * The day's cash settlement this sale was counted into, once there is one.
     *
     * Null means the money is still in the volunteer's pocket as far as the
     * temple is concerned. It is set when they submit the day's cash, so a
     * sale recorded after that submission starts a fresh day's reckoning
     * rather than silently joining a total the desk has already counted.
     */
    settlementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CashSettlement",
      default: null,
    },

    locale: { type: String, enum: ["hi", "en"], default: "hi" },
  },
  { timestamps: true },
);

/* The two reads that happen constantly: one volunteer's own history, and the
   cash a volunteer still owes for a given day. */
BookSaleSchema.index({ volunteerClerkId: 1, createdAt: -1 });
BookSaleSchema.index({ volunteerClerkId: 1, dayKey: 1, method: 1 });
/** The admin's day view and every chart bucket. */
BookSaleSchema.index({ dayKey: 1, "payment.status": 1 });

export default mongoose.models.BookSale ||
  mongoose.model("BookSale", BookSaleSchema);
