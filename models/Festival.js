import mongoose from "mongoose";
import { bilingualField } from "../lib/db/bilingual.js";

const FestivalEventSchema = new mongoose.Schema(
  {
    dateLabel: bilingualField(),
    title: bilingualField(),
  },
  { _id: false }
);

const FestivalSchema = new mongoose.Schema(
  {
    title: bilingualField(),
    description: bilingualField({ required: false }),
    image: { type: String },
    isCurrent: { type: Boolean, default: false, index: true },
    schedule: { type: [FestivalEventSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.Festival ||
  mongoose.model("Festival", FestivalSchema);
