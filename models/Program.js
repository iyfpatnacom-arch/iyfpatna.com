import mongoose from "mongoose";
import { bilingualField } from "../lib/db/bilingual.js";

const ProgramSchema = new mongoose.Schema(
  {
    title: bilingualField(),
    description: bilingualField(),
    schedule: bilingualField(),
    location: bilingualField({ required: false }),
    image: { type: String },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Program ||
  mongoose.model("Program", ProgramSchema);
