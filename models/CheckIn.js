import mongoose from "mongoose";

/**
 * One person, physically present at one programme, on one day.
 *
 * Deliberately its own collection rather than a row bent into `Registration`
 * and `Attendance`. Those two model a different thing: someone signed up in
 * advance, and was then marked present against that sign-up. Check-in has to
 * serve the person who never signed up at all — who is most of the room at a
 * Sunday programme — and `Registration` requires an email address, which
 * nobody standing in a doorway with a phone camera should be made to type.
 *
 * When a matching registration does exist it is linked, and the registration's
 * own status is moved to "attended", so the two views agree without either
 * schema having to weaken.
 *
 * `dayKey` is the IST calendar date, and it is what makes the unique index
 * correct: a weekly programme is one `Program` row attended many times, so
 * uniqueness has to be per occasion rather than per programme. Checking in
 * twice on the same evening is idempotent; checking in next Sunday is a new
 * row.
 */
const CheckInSchema = new mongoose.Schema(
  {
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Program",
      required: true,
      index: true,
    },
    /** Denormalised so the volunteer screen needs no join to render a list. */
    programTitle: {
      hi: { type: String, default: "" },
      en: { type: String, default: "" },
    },

    /** "YYYY-MM-DD" in IST — the occasion, not the instant. */
    dayKey: { type: String, required: true, index: true },

    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },

    /** Present when the person happened to be signed in. Never required. */
    clerkId: { type: String, default: null, index: true },
    registrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Registration",
      default: null,
    },

    /** How they got here: the camera, or the six digits under the QR. */
    source: { type: String, enum: ["qr", "code"], default: "qr" },
  },
  { timestamps: true }
);

CheckInSchema.index({ programId: 1, dayKey: 1, phone: 1 }, { unique: true });

export default mongoose.models.CheckIn || mongoose.model("CheckIn", CheckInSchema);
