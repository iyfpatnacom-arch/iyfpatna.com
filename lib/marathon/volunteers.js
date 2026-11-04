import { dbConnect } from "@/lib/db/connect";
import { getOptionalAuth } from "@/lib/auth-config";
import { toPlain } from "@/lib/serialize";
import MarathonVolunteer from "@/models/MarathonVolunteer";

/**
 * Who the person looking at the marathon screens is, and what they may do.
 *
 * One definition of "an active volunteer" for the whole feature. Every page
 * and every route asks this rather than comparing `status === "active"` on
 * its own, for the same reason `getAdminUser` exists: a second copy of that
 * comparison somewhere else is a second place for it to be written slightly
 * differently, and the thing it guards is somebody taking money from the
 * public in the temple's name.
 */

/**
 * The four states a visitor can be in, which are exactly the four screens
 * /activity/gita-marathon knows how to render:
 *
 *   signed_out  no Clerk session. Show the public page and a way in.
 *   new         signed in, no volunteer row. Show the registration form.
 *   pending     registered, waiting on a coordinator.
 *   suspended   switched off. Their history stands; the sell screen does not.
 *   active      the console.
 */
export const VOLUNTEER_STATES = [
  "signed_out",
  "new",
  "pending",
  "suspended",
  "active",
];

/**
 * The viewer's volunteer standing: `{ state, userId, volunteer }`.
 *
 * `volunteer` is a plain object, already serialised, because every caller is a
 * server component about to hand it to a client component or render it
 * directly. Never throws — a database that is down renders the public page
 * rather than an error, which is the right failure for a page that is also a
 * recruitment poster.
 */
export async function getVolunteerStanding() {
  const { userId } = await getOptionalAuth();
  if (!userId) return { state: "signed_out", userId: null, volunteer: null };

  let volunteer = null;
  try {
    await dbConnect();
    volunteer = await MarathonVolunteer.findOne({ clerkId: userId }).lean();
  } catch (error) {
    console.error("[marathon] could not read the volunteer row", error);
    /* Signed in but unreadable. "new" would invite them to register a second
       time, so say pending: it is the one state whose screen asks for nothing
       and promises nothing. */
    return { state: "pending", userId, volunteer: null };
  }

  if (!volunteer) return { state: "new", userId, volunteer: null };

  return {
    state: volunteer.status === "active" ? "active" : volunteer.status,
    userId,
    volunteer: toPlain(volunteer),
  };
}

/**
 * The active volunteer behind a request, or null. For route handlers, which
 * must refuse rather than render.
 *
 * Returns the raw lean document — a route is about to write a sale against its
 * `_id` and `name`, not serialise it to a client.
 */
export async function getActiveVolunteer() {
  const { userId } = await getOptionalAuth();
  if (!userId) return null;

  await dbConnect();
  const volunteer = await MarathonVolunteer.findOne({
    clerkId: userId,
    status: "active",
  }).lean();

  return volunteer || null;
}

/**
 * The viewer's own volunteer row whatever its status, or null.
 *
 * Distinct from `getActiveVolunteer` on purpose, and the distinction is the
 * point: *selling* requires an active account, but *owning* a record does not.
 * A volunteer who has been switched off still has to be able to open the sales
 * they made and — this is the one that matters — still has to be able to hand
 * in the cash they are holding. Gating a handover on an active account would
 * mean suspending somebody made it impossible for them to settle up, which is
 * the opposite of what suspending them is for.
 *
 * `pending` is excluded because a pending account has never sold anything, so
 * there is nothing for it to own.
 */
export async function getOwnVolunteer() {
  const { userId } = await getOptionalAuth();
  if (!userId) return null;

  await dbConnect();
  const volunteer = await MarathonVolunteer.findOne({
    clerkId: userId,
    status: { $in: ["active", "suspended"] },
  }).lean();

  return volunteer || null;
}
