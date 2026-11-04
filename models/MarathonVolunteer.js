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

    /** Which language their screens open in. */
    locale: { type: String, enum: ["hi", "en"], default: "hi" },
  },
  { timestamps: true },
);

/** The coordinator's list is "everyone waiting, oldest first". */
MarathonVolunteerSchema.index({ status: 1, createdAt: 1 });

export default mongoose.models.MarathonVolunteer ||
  mongoose.model("MarathonVolunteer", MarathonVolunteerSchema);
