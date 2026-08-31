import mongoose from "mongoose";
import { bilingualField } from "../lib/db/bilingual.js";

const ProgramSchema = new mongoose.Schema(
  {
    title: bilingualField(),
    description: bilingualField(),
    schedule: bilingualField(),
    location: bilingualField({ required: false }),
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

export default mongoose.models.Program ||
  mongoose.model("Program", ProgramSchema);
