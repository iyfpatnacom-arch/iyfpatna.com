import { unstable_cache } from "next/cache";
import { dbConnect } from "@/lib/db/connect";
import DailyDarshan from "@/models/DailyDarshan";

/**
 * Reading the daily darshan photo for the home hero.
 *
 * Same two rules as lib/settings.js: the home page must not go down with the
 * database (a failed read falls back to the built-in hero photo), and it must
 * stay prerendered (the read is cached under a tag the upload action expires,
 * so the new photo is live the moment the admin saves).
 */

export const DARSHAN_TAG = "daily-darshan";

/** Today's date in India as `YYYY-MM-DD` — the key a darshan is stored under. */
export function indiaDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

const readLatest = unstable_cache(
  async () => {
    await dbConnect();
    const doc = await DailyDarshan.findOne({}).sort({ date: -1 }).lean();
    if (!doc) return null;
    return {
      date: doc.date,
      url: doc.url,
      width: doc.width,
      height: doc.height,
    };
  },
  ["daily-darshan-latest"],
  // Hourly as a safety net for a build that ran without a database; the
  // upload action is what normally refreshes it.
  { tags: [DARSHAN_TAG], revalidate: 3600 }
);

/**
 * The most recent darshan, or null when there is none or Mongo is down.
 *
 * Returns the latest one even if it is from an earlier day. A slightly old
 * darshan is still a darshan; the hero labels it with its date instead of
 * "today" so nobody is misled, and falls back to the group photo only when
 * nothing has ever been uploaded.
 */
export async function getLatestDarshan() {
  try {
    return await readLatest();
  } catch (err) {
    console.error("[darshan] read failed, falling back to the hero photo", err);
    return null;
  }
}

/** Uncached, for the admin screen: the last few uploads with audit fields. */
export async function getRecentDarshans(limit = 7) {
  await dbConnect();
  return DailyDarshan.find({}).sort({ date: -1 }).limit(limit).lean();
}
