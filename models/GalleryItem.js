import mongoose from "mongoose";
import { bilingualField } from "../lib/db/bilingual.js";

const GalleryItemSchema = new mongoose.Schema(
  {
    image: { type: String, required: true },
    caption: bilingualField({ required: false }),
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.GalleryItem ||
  mongoose.model("GalleryItem", GalleryItemSchema);
