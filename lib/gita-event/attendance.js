import { dbConnect } from "@/lib/db/connect";
import { istDayKey } from "@/lib/panchang";
import { eventForDay, eventOf, normalizeEvents } from "@/lib/gita-event/catalog";
import GitaRegistration from "@/models/GitaRegistration";

/**
 * Admitting a paid participant at a Gita festival event — the gate at a cinema,
 * except that this cinema has two screens.
 *
 * The course gate (`lib/courses/attendance.js`) answers one question: is this
 * person in? Here there is a second one that cannot be skipped — in to *what*?
 * Somebody who paid the combined fee holds one pass that opens two different
 * doors on two different days, and marking the quiz when they walked into the
 * mahotsav would be a silent wrong number in the register. So every admission
 * names an event, and when the event cannot be worked out with certainty the
 * volunteer is asked rather than guessed at.
 *
 * It is worked out, in order:
 *
 *   1. the event the volunteer chose on the scanner, if they chose one;
 *   2. the only event this person paid for, when they paid for one;
 *   3. the event whose date is today, when they paid for both.
 *
 * Anything else comes back as "choose_event" with the options, which the door
 * screen shows as two buttons. One extra tap on one day beats a register nobody
 * can trust.
 *
 * Admission is per event per IST day. A second scan of the same pass for the
 * same event the same day is not an error — the volunteer is told "already
 * admitted at 4:02 PM", which is precisely what catches a pass that has been
 * forwarded to a friend.
 *
 * Server-only. Callers are responsible for checking the admin session.
 */

const PROJECTION = {
  orderId: 1,
  name: 1,
  phone: 1,
  events: 1,
  eventTitles: 1,
  attendance: 1,
  "payment.status": 1,
};

function eventLabel(row, key, locale) {
  const snapshot = (row.eventTitles || []).find((entry) => entry.key === key);
  return snapshot?.[locale] || eventOf(key)?.title?.[locale] || key;
}

/** What the gate screen needs, and nothing it doesn't. */
function describe(row, locale) {
  const events = normalizeEvents(row.events);
  return {
    kind: "gita",
    orderId: row.orderId,
    name: row.name,
    phone: row.phone,
    events,
    /* The one line under the name: everything this pass is good for. */
    courseTitle: events.map((key) => eventLabel(row, key, locale)).join(" + "),
    paymentStatus: row.payment?.status || "pending",
    attendance: (row.attendance || []).map((entry) => ({
      eventKey: entry.eventKey,
      dayKey: entry.dayKey,
      at: entry.at ? new Date(entry.at).toISOString() : null,
      source: entry.source,
    })),
  };
}

/** The two buttons the door screen shows when it cannot tell which event. */
function eventOptions(row, locale) {
  return normalizeEvents(row.events).map((key) => ({
    key,
    label: eventLabel(row, key, locale),
  }));
}

/**
 * Admits `orderId` to one of its events, today.
 *
 * Returns { status, person?, event?, eventLabel?, at?, options? } where status
 * is one of
 *   "admitted"      — let them in; first scan for this event today
 *   "already"       — already admitted to this event today, at `at`
 *   "choose_event"  — they hold both; `options` says which to tap
 *   "wrong_event"   — they did not pay for the event that was chosen
 *   "unpaid"        — the registration exists but no payment has landed
 *   "not_found"     — no such order
 */
export async function admitGita(orderId, { eventKey, markedBy, source = "qr", locale = "en" } = {}) {
  await dbConnect();
  const dayKey = istDayKey();

  const existing = await GitaRegistration.findOne({ orderId }, PROJECTION).lean();
  if (!existing) return { status: "not_found" };

  if (existing.payment?.status !== "success") {
    return { status: "unpaid", person: describe(existing, locale) };
  }

  const paidFor = normalizeEvents(existing.events);
  const asked = String(eventKey || "");

  /* A chosen event they did not pay for is its own answer, not a prompt to
     choose again: the volunteer has the mahotsav selected and a quiz-only pass
     in front of them, and telling them so is the whole job of the screen. */
  if (asked && !paidFor.includes(asked)) {
    return {
      status: "wrong_event",
      person: describe(existing, locale),
      event: asked,
      eventLabel: eventOf(asked)?.title?.[locale] || asked,
      options: eventOptions(existing, locale),
    };
  }

  const event = asked || eventForDay(paidFor, dayKey);
  if (!event) {
    return {
      status: "choose_event",
      person: describe(existing, locale),
      options: eventOptions(existing, locale),
    };
  }

  const at = new Date();
  /* The `$not/$elemMatch` on event-and-day is what makes this idempotent under
     two volunteers scanning the same pass at the same moment: only one update
     can match. It must test both fields together — `attendance.eventKey: {$ne}`
     plus `attendance.dayKey: {$ne}` would wrongly refuse somebody admitted to
     the quiz yesterday and the mahotsav today. */
  const updated = await GitaRegistration.findOneAndUpdate(
    {
      orderId,
      "payment.status": "success",
      attendance: { $not: { $elemMatch: { eventKey: event, dayKey } } },
    },
    { $push: { attendance: { eventKey: event, dayKey, at, markedBy: markedBy || null, source } } },
    { returnDocument: "after", projection: PROJECTION },
  ).lean();

  if (updated) {
    return {
      status: "admitted",
      at: at.toISOString(),
      event,
      eventLabel: eventLabel(updated, event, locale),
      person: describe(updated, locale),
    };
  }

  const fresh = await GitaRegistration.findOne({ orderId }, PROJECTION).lean();
  const today = fresh?.attendance?.find(
    (entry) => entry.eventKey === event && entry.dayKey === dayKey,
  );
  return {
    status: "already",
    at: today?.at ? new Date(today.at).toISOString() : null,
    event,
    eventLabel: eventLabel(fresh ?? existing, event, locale),
    person: describe(fresh ?? existing, locale),
  };
}

/**
 * Sets or clears one event's attendance on one day by hand, from the dashboard.
 *
 * For the corrections a door always needs: the phone that would not scan, the
 * person ticked against the wrong row, the volunteer who tapped "quiz" when the
 * queue was for the mahotsav. Returns the row's attendance list after the change
 * so the table can redraw that one row without reloading them all.
 */
export async function setGitaAttendance(
  orderId,
  { eventKey, dayKey, present, markedBy } = {},
) {
  await dbConnect();

  if (present) {
    /* Only for an event they actually paid for. The dashboard draws a column
       per event and greys the cells it must not offer, but a server action is a
       public POST whatever the page drew. */
    await GitaRegistration.updateOne(
      {
        orderId,
        "payment.status": "success",
        events: eventKey,
        attendance: { $not: { $elemMatch: { eventKey, dayKey } } },
      },
      {
        $push: {
          attendance: {
            eventKey,
            dayKey,
            at: new Date(),
            markedBy: markedBy || null,
            source: "manual",
          },
        },
      },
    );
  } else {
    await GitaRegistration.updateOne(
      { orderId },
      { $pull: { attendance: { eventKey, dayKey } } },
    );
  }

  const row = await GitaRegistration.findOne({ orderId }, { attendance: 1 }).lean();
  if (!row) return null;
  return (row.attendance || []).map((entry) => ({
    eventKey: entry.eventKey,
    dayKey: entry.dayKey,
    at: entry.at ? new Date(entry.at).toISOString() : null,
    source: entry.source,
  }));
}
