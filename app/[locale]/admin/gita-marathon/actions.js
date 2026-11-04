"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-config";
import { dbConnect } from "@/lib/db/connect";
import { toPlain } from "@/lib/serialize";
import CashSettlement from "@/models/CashSettlement";
import MarathonVolunteer from "@/models/MarathonVolunteer";

/**
 * The two decisions only a coordinator makes: who may sell, and how much cash
 * actually arrived.
 *
 * Both are the kind of write that wants an audit trail rather than a clean
 * final state, and both are written accordingly — see the notes on each.
 *
 * `requireAdmin` throws rather than returning, because a server action has no
 * UI to fall back to and must simply refuse. Expected mistakes come back as
 * `{ ok: false, error }` with a message key, as the other admin actions do.
 */

const PATHS = [
  "/[locale]/admin/gita-marathon",
  "/[locale]/admin/gita-marathon/volunteers",
  "/[locale]/admin/gita-marathon/cash",
  /* The volunteer's own screens, so somebody watching their phone while the
     coordinator activates them sees it happen. */
  "/[locale]/activity/gita-marathon",
];

function revalidateAll() {
  for (const path of PATHS) revalidatePath(path, "page");
}

const statusSchema = z.object({
  clerkId: z.string().trim().min(1).max(100),
  status: z.enum(["pending", "active", "suspended"]),
  note: z.string().trim().max(200).default(""),
});

/**
 * Letting somebody sell, or stopping them.
 *
 * The one write in this feature with real consequences outside the database:
 * an active volunteer can draw stock from the temple and collect money in its
 * name. So the row records *who* decided and *when*, and a suspension carries
 * a reason that the volunteer themselves is shown — being switched off without
 * explanation is how a volunteer stops being a volunteer.
 *
 * Deliberately no delete. Every sale and every cash settlement points back at
 * this row, and removing a volunteer would orphan a day's accounts; suspension
 * is the off switch, and it keeps the history.
 */
export async function setVolunteerStatus(input) {
  const adminId = await requireAdmin();

  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "mar_vol_failed" };
  const { clerkId, status, note } = parsed.data;

  await dbConnect();

  const volunteer = await MarathonVolunteer.findOneAndUpdate(
    { clerkId },
    {
      $set: {
        status,
        decidedBy: adminId,
        decidedAt: new Date(),
        /* Kept when nothing new is given, so re-activating somebody does not
           erase the note explaining why they were switched off. */
        ...(note ? { decisionNote: note } : {}),
      },
    },
    { returnDocument: "after" },
  ).lean();

  if (!volunteer) return { ok: false, error: "mar_vol_failed" };

  revalidateAll();
  return { ok: true, volunteer: toPlain(volunteer) };
}

const verifySchema = z.object({
  id: z.string().trim().min(1).max(60),
  receivedAmount: z.coerce
    .number()
    .int("mar_cash_err_amount")
    .min(0, "mar_cash_err_amount")
    .max(1000000, "mar_cash_err_amount"),
  adminNote: z.string().trim().max(300).default(""),
});

/**
 * Counting a volunteer's cash and closing the day.
 *
 * `variance` is stored as `received - expected` rather than the expected
 * figure being adjusted to match. That is the whole discipline of this
 * function: a deficit is a fact about a day and about a person, and quietly
 * editing the expectation so the books balance is how a shortfall stops being
 * visible to the next person who looks. Positive is excess, negative is short,
 * and `adminOverview` sums them across every counted day so the running total
 * is the figure the temple actually watches.
 *
 * Scoped to `status: "submitted"`, so counting the same handover twice is a
 * no-op rather than a second write — two people at the desk with the same
 * list open is the ordinary case, not the exception.
 */
export async function verifyCashSettlement(input) {
  const adminId = await requireAdmin();

  const parsed = verifySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || "mar_cash_err_amount",
    };
  }
  const { id, receivedAmount, adminNote } = parsed.data;

  await dbConnect();

  const existing = await CashSettlement.findOne({
    _id: id,
    status: "submitted",
  }).lean();
  if (!existing) return { ok: false, error: "mar_cash_err_not_found" };

  const settlement = await CashSettlement.findOneAndUpdate(
    { _id: id, status: "submitted" },
    {
      $set: {
        status: "verified",
        receivedAmount,
        variance: receivedAmount - existing.expectedAmount,
        verifiedBy: adminId,
        verifiedAt: new Date(),
        ...(adminNote ? { adminNote } : {}),
      },
    },
    { returnDocument: "after" },
  ).lean();

  if (!settlement) return { ok: false, error: "mar_cash_err_not_found" };

  revalidateAll();
  return { ok: true, settlement: toPlain(settlement) };
}
