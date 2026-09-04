"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-config";
import { setFlag } from "@/lib/flags";

export async function toggleFlag(key, enabled) {
  const userId = await requireAdmin();
  await setFlag(key, enabled, { updatedBy: userId });
  revalidatePath("/[locale]/admin/flags", "page");
}
