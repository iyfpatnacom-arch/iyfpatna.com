"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/auth-config";
import { verifyPassToken } from "@/lib/payments/order-link";
import { findPayable } from "@/lib/payments/payables";
import { admit, setAttendance } from "@/lib/courses/attendance";
import { admitGita, setGitaAttendance } from "@/lib/gita-event/attendance";
import { EVENT_KEYS } from "@/lib/gita-event/catalog";

/**
 * The door and the dashboard's ways of changing attendance.
 *
 * Every action re-checks the admin session: a server action is a public POST
 * endpoint whatever page happens to render the button. Not being an admin
 * throws; everything a volunteer can act on comes back as a status.
 *
 * One door for every kind of pass. A course seat and a Gita festival
 * registration carry the same QR shape and land on the same admit page, so the
 * volunteer at the gate has one scanner and never has to know which event's
 * queue they are standing in. Which collection the order is in is decided by
 * the order ID (see `payables.js`), never by the browser — a scanner cannot
 * name a pass into the wrong register.
 */

const orderIdSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2,10}-\d{1,8}$/);

const localeSchema = z.enum(["hi", "en"]).catch("en");

/** Optional, and only ever one of the festival's own events. */
const eventSchema = z.enum(EVENT_KEYS).nullish().catch(null);

/**
 * Sends one admission to whichever register the order belongs to.
 *
 * A kind with no door — a donation, a book sold at a stall — is "not_found"
 * rather than an error: somebody has scanned something that is not a pass, and
 * the gate screen says exactly that.
 */
async function admitAnyKind(orderId, { eventKey, markedBy, source, locale }) {
  const found = await findPayable(orderId);
  if (!found || !found.payable.pass) return { status: "not_found" };

  if (found.kind === "gita") {
    return admitGita(orderId, { eventKey, markedBy, source, locale });
  }
  return admit(orderId, { markedBy, source, locale });
}

/**
 * A scanned pass: the order ID and the signature the QR carried.
 *
 * `eventKey` is the event the volunteer has selected on the scanner, for a
 * festival pass that is good for more than one. It is a hint the register
 * validates, not an instruction — see `admitGita`.
 */
export async function admitPass(orderId, token, locale, eventKey = null) {
  const userId = await requireAdmin();
  const id = orderIdSchema.safeParse(orderId);
  if (!id.success) return { status: "invalid" };

  /* A pass whose signature does not match was not issued by us — a
     hand-typed URL, or a QR someone made up from a sequential order ID. */
  if (!(await verifyPassToken(id.data, token))) return { status: "invalid" };

  return admitAnyKind(id.data, {
    eventKey: eventSchema.parse(eventKey),
    markedBy: userId,
    source: "qr",
    locale: localeSchema.parse(locale),
  });
}

/**
 * A typed order ID, for the phone with a cracked screen or a dead battery.
 *
 * No signature is needed: the admin is the authority here, the same as
 * ticking the row on the dashboard. It is recorded as a manual admission so
 * the two can be told apart later.
 */
export async function admitByOrderId(orderId, locale, eventKey = null) {
  const userId = await requireAdmin();
  const id = orderIdSchema.safeParse(orderId);
  if (!id.success) return { status: "invalid" };

  return admitAnyKind(id.data, {
    eventKey: eventSchema.parse(eventKey),
    markedBy: userId,
    source: "manual",
    locale: localeSchema.parse(locale),
  });
}

const toggleSchema = z.object({
  orderId: orderIdSchema,
  dayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  present: z.boolean(),
});

/** The course dashboard's tick box for one person on one day. */
export async function toggleAttendance(orderId, dayKey, present) {
  const userId = await requireAdmin();
  const parsed = toggleSchema.safeParse({ orderId, dayKey, present });
  if (!parsed.success) return { ok: false };

  const attendance = await setAttendance(parsed.data.orderId, parsed.data.dayKey, present, {
    markedBy: userId,
  });
  if (!attendance) return { ok: false };
  return { ok: true, attendance };
}

const gitaToggleSchema = toggleSchema.extend({ eventKey: z.enum(EVENT_KEYS) });

/**
 * The Gita dashboard's tick box — one person, one event, one day.
 *
 * Its own action rather than an extra argument on `toggleAttendance`, because
 * the thing being set is a different shape: the course register is keyed by day
 * alone, this one by event *and* day, and a single action taking an optional
 * event would have to decide what an absent one means for a row that holds two.
 */
export async function toggleGitaAttendance(orderId, eventKey, dayKey, present) {
  const userId = await requireAdmin();
  const parsed = gitaToggleSchema.safeParse({ orderId, eventKey, dayKey, present });
  if (!parsed.success) return { ok: false };

  const attendance = await setGitaAttendance(parsed.data.orderId, {
    eventKey: parsed.data.eventKey,
    dayKey: parsed.data.dayKey,
    present: parsed.data.present,
    markedBy: userId,
  });
  if (!attendance) return { ok: false };
  return { ok: true, attendance };
}
