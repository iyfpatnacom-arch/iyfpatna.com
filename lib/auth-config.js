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
