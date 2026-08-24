import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    clerkId: { type: String, required: true, unique: true, index: true },
    name: { type: String, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
