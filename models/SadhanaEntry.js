import mongoose from "mongoose";

/**
 * One day of one devotee's sadhana card.
 *
 * The paper version of this sheet already exists and is already filled in at
 * IYF Patna every week, so the fields here are the paper fields — not a
 * redesign of the practice. Anything the sheet does not ask for is not here.
 *
 * The row is a *mirror*, never the original. The card works signed out and
 * offline, keeping its state in the browser, and only syncs here when there is
 * an account to sync to; so this collection may be missing days that the
 * devotee has in fact filled in, and nothing may be built that assumes
 * otherwise. `clerkId` + `date` is unique, which makes the sync a plain upsert
 * that can be retried from an offline queue without creating duplicates.
 *
 * `date` is a "YYYY-MM-DD" string in IST rather than a Date: a sadhana day is
 * a calendar day in Patna, and storing an instant would invite a timezone to
 * silently move someone's mangala-arati into the day before.
 */
const SadhanaEntrySchema = new mongoose.Schema(
  {
    clerkId: { type: String, required: true, index: true },
    date: { type: String, required: true },

    /** Rounds of japa, and how many were finished before the sun was well up. */
    rounds: { type: Number, default: 0, min: 0, max: 200 },
    roundsBeforeTen: { type: Number, default: 0, min: 0, max: 200 },

    /** The morning program. */
    mangalaArati: { type: Boolean, default: false },
    tulasiPuja: { type: Boolean, default: false },

    /** Minutes given to reading and to hearing class or kirtan. */
    readingMinutes: { type: Number, default: 0, min: 0, max: 1440 },
    hearingMinutes: { type: Number, default: 0, min: 0, max: 1440 },
    sevaMinutes: { type: Number, default: 0, min: 0, max: 1440 },

    /** "HH:MM" in IST, or empty when not recorded. */
    wakeTime: { type: String, default: "" },
    sleepTime: { type: String, default: "" },

    /** The four regulative principles, kept as a single honest yes/no. */
    principles: { type: Boolean, default: false },

    note: { type: String, default: "", maxlength: 500 },
  },
  { timestamps: true }
);

SadhanaEntrySchema.index({ clerkId: 1, date: 1 }, { unique: true });

export default mongoose.models.SadhanaEntry ||
  mongoose.model("SadhanaEntry", SadhanaEntrySchema);
