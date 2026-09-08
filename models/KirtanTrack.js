import mongoose from "mongoose";
import { bilingualField } from "../lib/db/bilingual.js";

/**
 * One line of a kirtan, and where it falls in the recording.
 *
 * `at` is seconds from the start of the audio. It is what turns the lyric
 * sheet into a karaoke sheet: the player highlights the line whose `at` has
 * passed and the next one has not. A track whose lines have no `at` still
 * renders — as a plain sheet to sing from — so timing a recording is an
 * improvement to make later, never a prerequisite for uploading one.
 *
 * `devanagari` and `roman` are both required because a kirtan is sung from
 * whichever one the singer reads; the meaning is per-line and optional, since
 * many kirtans are better served by one meaning for the whole verse.
 */
const KirtanLineSchema = new mongoose.Schema(
  {
    at: { type: Number, default: null, min: 0 },
    devanagari: { type: String, required: true, trim: true },
    roman: { type: String, required: true, trim: true },
    meaning: {
      hi: { type: String, default: "" },
      en: { type: String, default: "" },
    },
  },
  { _id: false }
);

const KirtanTrackSchema = new mongoose.Schema(
  {
    title: bilingualField(),
    artist: { type: String, trim: true },
    audioUrl: { type: String, required: true },
    durationSeconds: { type: Number },
    coverImage: { type: String },
    /** Ordered lines. Empty is fine — the player falls back to audio only. */
    lyrics: { type: [KirtanLineSchema], default: [] },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.KirtanTrack ||
  mongoose.model("KirtanTrack", KirtanTrackSchema);
