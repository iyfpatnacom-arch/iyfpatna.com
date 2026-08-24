import mongoose from "mongoose";

const FeatureFlagSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    enabled: { type: Boolean, default: false },
    scope: { type: String, default: "global" },
    temporary: { type: Boolean, default: true },
    meta: {
      provider: { type: String, default: "" },
      updatedBy: { type: String, default: "" },
      updatedAt: { type: Date, default: null },
      note: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

export default mongoose.models.FeatureFlag ||
  mongoose.model("FeatureFlag", FeatureFlagSchema);
