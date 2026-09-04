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
 * The signed-in user, but only when they are an admin — otherwise null.
 *
 * One definition of "admin" for the whole admin area. The check is a role on
 * Clerk's `publicMetadata`, and the thing that must never drift is *which*
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
  if (!user || user.publicMetadata?.role !== "admin") return null;
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
