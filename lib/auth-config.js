import { isAllowlistedAdmin } from "@/lib/admin-users";

export const clerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
);

/**
 * Never throws even when Clerk isn't configured — call this instead of
 * `auth()` from anywhere that needs to keep working before real keys exist.
 */
export async function getOptionalAuth() {
  if (!clerkConfigured) return { userId: null };
  const { auth } = await import("@clerk/nextjs/server");
  const result = await auth();
  return { userId: result.userId };
}

/**
 * The signed-in Clerk user, whoever they are, or null.
 *
 * `getAdminUser` is the same call with a role check on the end; this is for
 * the places that need the *person* rather than a permission — a volunteer
 * registering for the Gita Marathon, whose email address must come from Clerk
 * and not from the form they are filling in, because the form is a public
 * endpoint and the email is what the coordinator will contact them on.
 *
 * Deferred import for the same reason as every other Clerk import here:
 * nothing should pull server-only code into a bundle that only wanted
 * `clerkConfigured`.
 */
export async function getSignedInUser() {
  if (!clerkConfigured) return null;
  const { currentUser } = await import("@clerk/nextjs/server");
  return (await currentUser()) || null;
}

/**
 * Sends a visitor with no session to the sign-in screen.
 *
 * This is the half of the proxy's old `auth.protect()` worth keeping. Clerk
 * deprecated `createRouteMatcher`, so the admin guard moved into the pages,
 * where `getAdminUser` already does the stricter half of the job — it checks
 * the role, which the middleware never did. What it can't do is tell a
 * stranger from an ordinary member: both get "Admins only", and for the
 * stranger that is a dead end with no door in it. So call this first.
 *
 * The import is deferred for the same reason the rest of this module defers
 * its Clerk imports: nothing here should pull server-only code into a bundle
 * that only wanted `clerkConfigured`.
 */
export async function redirectSignedOut(locale) {
  if (!clerkConfigured) return;
  const { userId } = await getOptionalAuth();
  if (userId) return;
  const { redirect } = await import("@/i18n/navigation");
  redirect({ href: "/sign-in", locale });
}

/**
 * The signed-in user, but only when they are an admin — otherwise null.
 *
 * One definition of "admin" for the whole admin area. The check is a role on
 * Clerk's `publicMetadata`, or an id in `ADMIN_USERS`, and the thing that must never drift is *which*
 * role and *where* it is read from: a second copy of this comparison in
 * another page is a second place for it to be written slightly differently.
 *
 * Returns null rather than throwing so a page can render "admins only"
 * instead of a 500. Actions want the throw — see `requireAdmin`.
 */
export async function getAdminUser() {
  if (!clerkConfigured) return null;
  const { currentUser } = await import("@clerk/nextjs/server");
  const user = await currentUser();
  if (!user) return null;
  if (!isAllowlistedAdmin(user.id) && user.publicMetadata?.role !== "admin") {
    return null;
  }
  return user;
}

/**
 * The admin's user id, or a throw. For server actions, which have no UI to
 * fall back to and must simply refuse.
 *
 * The keyless case is called out separately because it is a deployment
 * mistake, not a permission one, and an admin staring at "Forbidden" on a
 * site with no Clerk keys has no way to tell the difference.
 */
export async function requireAdmin() {
  if (!clerkConfigured) throw new Error("Clerk is not configured");
  const user = await getAdminUser();
  if (!user) throw new Error("Forbidden");
  return user.id;
}
