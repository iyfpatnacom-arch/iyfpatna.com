import mongoose from "mongoose";
import { bilingualField } from "../lib/db/bilingual.js";

const KirtanTrackSchema = new mongoose.Schema(
  {
    title: bilingualField(),
    artist: { type: String, trim: true },
    audioUrl: { type: String, required: true },
    durationSeconds: { type: Number },
    coverImage: { type: String },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.KirtanTrack ||
  mongoose.model("KirtanTrack", KirtanTrackSchema);
