import mongoose from "mongoose";

const NotificationLogSchema = new mongoose.Schema(
  {
    registrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Registration",
    },
    channels: [
      {
        channel: { type: String, enum: ["email", "whatsapp"], required: true },
        success: { type: Boolean, required: true },
        error: { type: String },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.NotificationLog ||
  mongoose.model("NotificationLog", NotificationLogSchema);
