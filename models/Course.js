import mongoose from "mongoose";
import { bilingualField } from "../lib/db/bilingual.js";

const CourseSchema = new mongoose.Schema(
  {
    title: bilingualField(),
    description: bilingualField(),
    duration: bilingualField(),
    level: { type: String, enum: ["beginner", "intermediate", "advanced"], default: "beginner" },
    image: { type: String },
    /* Per-item clip. Left empty, the card falls back to the category default
       in lib/site-config.js — so a video can be given to one program without
       touching any others. */
    video: { type: String },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Course ||
  mongoose.model("Course", CourseSchema);
