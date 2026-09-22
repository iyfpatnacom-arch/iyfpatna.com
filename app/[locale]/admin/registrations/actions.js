"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/auth-config";
import { verifyPassToken } from "@/lib/payments/order-link";
import { admit, setAttendance } from "@/lib/courses/attendance";

/**
 * The door and the dashboard's two ways of changing attendance.
 *
 * Every action re-checks the admin session: a server action is a public POST
 * endpoint whatever page happens to render the button. Not being an admin
 * throws; everything a volunteer can act on comes back as a status.
 */

const orderIdSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2,10}-\d{1,8}$/);

const localeSchema = z.enum(["hi", "en"]).catch("en");

/** A scanned pass: the order ID and the signature the QR carried. */
export async function admitPass(orderId, token, locale) {
  const userId = await requireAdmin();
  const id = orderIdSchema.safeParse(orderId);
  if (!id.success) return { status: "invalid" };

  /* A pass whose signature does not match was not issued by us — a
     hand-typed URL, or a QR someone made up from a sequential order ID. */
  if (!(await verifyPassToken(id.data, token))) return { status: "invalid" };

  return admit(id.data, {
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
export async function admitByOrderId(orderId, locale) {
  const userId = await requireAdmin();
  const id = orderIdSchema.safeParse(orderId);
  if (!id.success) return { status: "invalid" };

  return admit(id.data, {
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

/** The dashboard's tick box for one person on one day. */
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
