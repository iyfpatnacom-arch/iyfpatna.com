import mongoose from "mongoose";

const RegistrationSchema = new mongoose.Schema(
  {
    itemType: { type: String, enum: ["program", "course"], required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: "itemModel" },
    itemModel: { type: String, enum: ["Program", "Course"], required: true },
    itemTitle: {
      hi: { type: String },
      en: { type: String },
    },
    clerkId: { type: String, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    note: { type: String, trim: true },
    status: {
      type: String,
      enum: ["joined", "attended", "missed"],
      default: "joined",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Registration ||
  mongoose.model("Registration", RegistrationSchema);
