import mongoose from "mongoose";

const QuizScoreSchema = new mongoose.Schema(
  {
    clerkId: { type: String, required: true, index: true },
    chapter: { type: Number, required: true },
    score: { type: Number, required: true },
    total: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.QuizScore ||
  mongoose.model("QuizScore", QuizScoreSchema);
