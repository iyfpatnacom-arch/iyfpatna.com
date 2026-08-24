import mongoose from "mongoose";
import { bilingualField } from "../lib/db/bilingual.js";

const QuizQuestionSchema = new mongoose.Schema(
  {
    chapter: { type: Number, required: true, index: true },
    question: bilingualField(),
    options: {
      type: [
        {
          hi: { type: String, required: true },
          en: { type: String, required: true },
        },
      ],
      validate: (v) => v.length === 4,
    },
    correctIndex: { type: Number, required: true, min: 0, max: 3 },
  },
  { timestamps: true }
);

export default mongoose.models.QuizQuestion ||
  mongoose.model("QuizQuestion", QuizQuestionSchema);
