import mongoose from "mongoose";

const AttendanceSchema = new mongoose.Schema(
  {
    registrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Registration",
      required: true,
      index: true,
    },
    clerkId: { type: String, index: true },
    status: {
      type: String,
      enum: ["joined", "attended", "missed"],
      required: true,
    },
    markedBy: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Attendance ||
  mongoose.model("Attendance", AttendanceSchema);
