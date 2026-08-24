"use server";

import { revalidatePath } from "next/cache";
import { clerkConfigured } from "@/lib/auth-config";
import { setFlag } from "@/lib/flags";

async function requireAdmin() {
  if (!clerkConfigured) throw new Error("Clerk is not configured");
  const { currentUser } = await import("@clerk/nextjs/server");
  const user = await currentUser();
  if (!user || user.publicMetadata?.role !== "admin") throw new Error("Forbidden");
  return user.id;
}

export async function toggleFlag(key, enabled) {
  const userId = await requireAdmin();
  await setFlag(key, enabled, { updatedBy: userId });
  revalidatePath("/[locale]/admin/flags", "page");
}
