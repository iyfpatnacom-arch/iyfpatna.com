import { dbConnect } from "@/lib/db/connect";
import { istDayKey } from "@/lib/panchang";
import { getCourse, modeOf } from "@/lib/courses/catalog";
import Enrollment from "@/models/Enrollment";

/**
 * Admitting a paid participant at the venue — the gate at a cinema.
 *
 * The pass QR is checked at the door, and the answer has to be one of a small
 * number of things a volunteer can act on in a second: let them in, they are
 * already in, they have not paid, or this is not one of ours. Everything below
 * returns exactly one of those, with enough of the person to say their name.
 *
 * Admission is per IST day. A second scan the same day is not an error — the
 * volunteer is told "already admitted at 4:02 PM", which is precisely what
 * catches a pass that has been forwarded to a friend.
 *
 * Server-only. Callers are responsible for checking the admin session.
 */

const PROJECTION = {
  orderId: 1,
  name: 1,
  phone: 1,
  mode: 1,
  courseSlug: 1,
  courseTitle: 1,
  attendance: 1,
  "payment.status": 1,
};

/** What the gate screen needs, and nothing it doesn't. */
function describe(enrollment, locale) {
  const course = getCourse(enrollment.courseSlug);
  const mode = course ? modeOf(course, enrollment.mode) : null;
  return {
    orderId: enrollment.orderId,
    name: enrollment.name,
    phone: enrollment.phone,
    mode: enrollment.mode || null,
    modeLabel: mode?.label?.[locale] || enrollment.mode || null,
    courseTitle:
      enrollment.courseTitle?.[locale] || course?.title?.[locale] || enrollment.courseSlug,
    paymentStatus: enrollment.payment?.status || "pending",
    attendance: (enrollment.attendance || []).map((entry) => ({
      dayKey: entry.dayKey,
      at: entry.at ? new Date(entry.at).toISOString() : null,
      source: entry.source,
    })),
  };
}

/**
 * Admits `orderId` for today.
 *
 * Returns { status, person?, at? } where status is one of
 *   "admitted"   — let them in; this is their first scan today
 *   "already"    — already admitted today, at `at`
 *   "unpaid"     — the seat exists but no payment has landed
 *   "not_found"  — no such order
 */
export async function admit(orderId, { markedBy, source = "qr", locale = "en" } = {}) {
  await dbConnect();
  const dayKey = istDayKey();

  const existing = await Enrollment.findOne({ orderId }, PROJECTION).lean();
  if (!existing) return { status: "not_found" };

  if (existing.payment?.status !== "success") {
    return { status: "unpaid", person: describe(existing, locale) };
  }

  const at = new Date();
  /* The `$ne` on the day is what makes this idempotent under two volunteers
     scanning the same pass at the same moment: only one update can match. */
  const updated = await Enrollment.findOneAndUpdate(
    { orderId, "payment.status": "success", "attendance.dayKey": { $ne: dayKey } },
    { $push: { attendance: { dayKey, at, markedBy: markedBy || null, source } } },
    { returnDocument: "after", projection: PROJECTION }
  ).lean();

  if (updated) {
    return { status: "admitted", at: at.toISOString(), person: describe(updated, locale) };
  }

  const fresh = await Enrollment.findOne({ orderId }, PROJECTION).lean();
  const today = fresh?.attendance?.find((entry) => entry.dayKey === dayKey);
  return {
    status: "already",
    at: today?.at ? new Date(today.at).toISOString() : null,
    person: describe(fresh ?? existing, locale),
  };
}

/**
 * Sets or clears one day's attendance by hand, from the dashboard.
 *
 * For the corrections a door always needs: the phone that would not scan, the
 * person ticked against the wrong row. Returns the row's attendance list after
 * the change so the table can redraw that one row without reloading them all.
 */
export async function setAttendance(orderId, dayKey, present, { markedBy } = {}) {
  await dbConnect();

  if (present) {
    await Enrollment.updateOne(
      { orderId, "payment.status": "success", "attendance.dayKey": { $ne: dayKey } },
      {
        $push: {
          attendance: { dayKey, at: new Date(), markedBy: markedBy || null, source: "manual" },
        },
      }
    );
  } else {
    await Enrollment.updateOne({ orderId }, { $pull: { attendance: { dayKey } } });
  }

  const row = await Enrollment.findOne({ orderId }, { attendance: 1 }).lean();
  if (!row) return null;
  return (row.attendance || []).map((entry) => ({
    dayKey: entry.dayKey,
    at: entry.at ? new Date(entry.at).toISOString() : null,
    source: entry.source,
  }));
}
