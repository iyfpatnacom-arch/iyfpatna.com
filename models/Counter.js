import mongoose from "mongoose";

/**
 * Named, monotonically increasing sequences.
 *
 * Order IDs are short (DYS-101) so they can be read over a helpline, and three
 * digits is far too small a space to pick from at random without collisions.
 * An atomic `$inc` makes each number unique by construction — two enrolments
 * in the same instant get different numbers, even across server instances.
 */
const CounterSchema = new mongoose.Schema(
  {
    _id: { type: String },
    value: { type: Number, default: 0 },
  },
  { versionKey: false }
);

const Counter =
  mongoose.models.Counter || mongoose.model("Counter", CounterSchema);

export default Counter;

/** The next number in `name`, starting at 1. */
export async function nextSequence(name) {
  const doc = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: "after" }
  ).lean();
  return doc.value;
}
