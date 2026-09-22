import mongoose from "mongoose";

/**
 * One morning's darshan photograph — one document per day.
 *
 * Keyed by the date in India (`YYYY-MM-DD`, Asia/Kolkata) rather than by a
 * timestamp, because "today's darshan" is a temple-calendar idea: a photo
 * uploaded at 5:30 am IST belongs to that day even though it is still the
 * previous evening in UTC. The unique index makes a second upload the same
 * morning a replacement, not a second entry.
 *
 * Past days are kept, so the collection doubles as an archive of every
 * darshan the site has shown.
 */
const DailyDarshanSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true, index: true },
    url: { type: String, required: true },
    fileId: { type: String, default: "" },
    filePath: { type: String, default: "" },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    /** Clerk user id of the admin who uploaded it. */
    uploadedBy: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.DailyDarshan ||
  mongoose.model("DailyDarshan", DailyDarshanSchema);
