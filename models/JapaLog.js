import mongoose from "mongoose";

const JapaLogSchema = new mongoose.Schema(
  {
    clerkId: { type: String, required: true, index: true },
    date: { type: String, required: true },
    rounds: { type: Number, default: 0 },
    beadTaps: { type: Number, default: 0 },
  },
  { timestamps: true }
);

JapaLogSchema.index({ clerkId: 1, date: 1 }, { unique: true });

export default mongoose.models.JapaLog ||
  mongoose.model("JapaLog", JapaLogSchema);
