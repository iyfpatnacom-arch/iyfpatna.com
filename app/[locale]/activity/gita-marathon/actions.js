"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbConnect } from "@/lib/db/connect";
import { getFlag } from "@/lib/flags";
import { getOptionalAuth, getSignedInUser } from "@/lib/auth-config";
import { istDayKey } from "@/lib/panchang";
import { normalizePhone, PHONE_PATTERN } from "@/lib/courses/phone";
import { getOwnVolunteer } from "@/lib/marathon/volunteers";
import { unsettledCash } from "@/lib/marathon/stats";
import { toPlain } from "@/lib/serialize";
import BookSale from "@/models/BookSale";
import CashSettlement from "@/models/CashSettlement";
import MarathonVolunteer from "@/models/MarathonVolunteer";

/**
 * The two things a volunteer does that are not a sale: joining, and handing
 * over the day's cash.
 *
 * Server actions rather than route handlers, unlike /api/marathon/sales. The
 * difference is who is waiting: a sale is recorded from a screen that needs a
 * QR back in the same breath and then polls, which is an API. These two are
 * ordinary form submissions whose answer is a re-rendered page, which is what
 * an action is for — and both re-validate everything the form checked,
 * because an action is a public endpoint like any other.
 *
 * Expected mistakes come back as `{ ok: false, error }` carrying a message
 * key, the same contract the admin actions use, so the form can say what went
 * wrong in the volunteer's own language.
 */

const PATH = "/[locale]/activity/gita-marathon";

const registerSchema = z.object({
  name: z.string().trim().min(2, "err_name").max(80, "err_name"),
  phone: z
    .string()
    .transform(normalizePhone)
    .refine((value) => PHONE_PATTERN.test(value), "err_phone"),
  city: z.string().trim().max(60).default(""),
  college: z.string().trim().max(120).default(""),
  occupation: z.enum(["student", "working", "other"]).default("student"),
  age: z.preprocess(
    (value) => (value === "" || value == null ? null : Number(value)),
    z.number().int().min(12, "err_age").max(99, "err_age").nullable(),
  ),
  about: z.string().trim().max(400).default(""),
  locale: z.enum(["hi", "en"]).default("hi"),
});

/**
 * Registering to distribute books.
 *
 * Creates the row as `pending` and nothing more: activation is a coordinator's
 * decision and there is deliberately no path through this function that can
 * reach `active`. Somebody is about to be given stock out of the temple and
 * allowed to collect money in its name, and that is not a thing a form grants.
 *
 * The email is read from Clerk rather than from the submission. It is the
 * address the coordinator will actually use, and the one thing on this form
 * that must be an account fact rather than a claim.
 *
 * Re-registering is an update, not a duplicate, and it cannot revive a
 * suspended volunteer — `status` is left exactly as it stands. Somebody who
 * was switched off and fills the form in again is editing their details, not
 * reapplying; reapplying is a conversation with the coordinator.
 */
export async function registerVolunteer(input) {
  const { userId } = await getOptionalAuth();
  if (!userId) return { ok: false, error: "err_signed_out" };

  if (!(await getFlag("marathon.registration_open", true))) {
    return { ok: false, error: "err_closed" };
  }

  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || "err_name" };
  }
  const data = parsed.data;

  const user = await getSignedInUser();
  const email = user?.primaryEmailAddress?.emailAddress || "";

  try {
    await dbConnect();

    const volunteer = await MarathonVolunteer.findOneAndUpdate(
      { clerkId: userId },
      {
        $set: {
          name: data.name,
          phone: data.phone,
          email,
          city: data.city,
          college: data.college,
          occupation: data.occupation,
          age: data.age,
          about: data.about,
          locale: data.locale,
        },
        /* `status` only on insert, so an update never reopens a door a
           coordinator closed. */
        $setOnInsert: { clerkId: userId, status: "pending" },
      },
      { upsert: true, returnDocument: "after" },
    ).lean();

    revalidatePath(PATH, "page");
    return { ok: true, volunteer: toPlain(volunteer) };
  } catch (error) {
    /* Two browser tabs submitting at once; the other one won and the row now
       exists, which is the outcome either way. */
    if (error?.code === 11000) return { ok: true, raced: true };
    console.error("[marathon] registration failed", error);
    return { ok: false, error: "err_generic" };
  }
}

const cashSchema = z.object({
  declaredAmount: z.coerce
    .number()
    .int("err_amount")
    .min(0, "err_amount")
    .max(1000000, "err_amount"),
  note: z.string().trim().max(300).default(""),
});

/**
 * Handing over the day's cash.
 *
 * The volunteer's half of the reconciliation. It freezes three things at the
 * moment of submission: what their own recorded cash sales came to, how many
 * sales that was, and exactly which sales — then stamps those sales with the
 * settlement's id so they can never be counted into a second one.
 *
 * Freezing rather than recomputing is the whole design. A volunteer who hands
 * over ₹2,400 at six o'clock and sells two more books at eight owes for two
 * books, not for the day; if the expected figure were recomputed when the desk
 * opened the record, those two books would look like a ₹600 deficit against a
 * handover that was exactly right.
 *
 * The declared amount is recorded as declared — including when it does not
 * match. It is the volunteer's own statement, and the desk needs to see a
 * disagreement, not be shielded from one.
 */
export async function submitDayCash(input) {
  /* `getOwnVolunteer`, not `getActiveVolunteer`: handing in money you are
     already holding must never be blocked. Suspending somebody stops them
     taking more, and if it also stopped them settling up it would leave the
     temple's cash in their pocket with no way to record its return. */
  const volunteer = await getOwnVolunteer();
  if (!volunteer) return { ok: false, error: "err_not_active" };

  const parsed = cashSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || "err_amount" };
  }

  const dayKey = istDayKey();

  try {
    await dbConnect();

    const outstanding = await unsettledCash(volunteer.clerkId, dayKey);
    if (!outstanding.count) return { ok: false, error: "err_nothing_due" };

    const settlement = await CashSettlement.create({
      volunteerClerkId: volunteer.clerkId,
      volunteerId: volunteer._id,
      volunteerName: volunteer.name,
      dayKey,
      expectedAmount: outstanding.amount,
      expectedCount: outstanding.count,
      saleIds: outstanding.saleIds,
      declaredAmount: parsed.data.declaredAmount,
      note: parsed.data.note,
      status: "submitted",
    });

    /* Stamped after the settlement exists, and scoped to `settlementId: null`
       so a sale that somehow joined another settlement in between is left
       alone rather than reassigned. */
    await BookSale.updateMany(
      { _id: { $in: outstanding.saleIds }, settlementId: null },
      { $set: { settlementId: settlement._id } },
    );

    revalidatePath(PATH, "page");
    return { ok: true, settlement: toPlain(settlement.toObject()) };
  } catch (error) {
    /* The unique index on (volunteer, day) caught a second submission —
       either a double tap or a second tab. One handover a day; the desk
       amends the first. */
    if (error?.code === 11000) return { ok: false, error: "err_already_today" };
    console.error("[marathon] cash submission failed", error);
    return { ok: false, error: "err_generic" };
  }
}
