"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth-config";
import {
  SETTING_KEYS,
  SETTINGS_TAG,
  parseWhatsappUrl,
  setSetting,
} from "@/lib/settings";

/**
 * Saves the WhatsApp group invite the whole site links to.
 *
 * Validation runs here, not only in the form. The form's check is a
 * convenience for the person typing; this one is the rule, because a server
 * action is a public endpoint and the browser is not where a permission or a
 * URL allowlist can be enforced.
 *
 * A bad link comes back as `{ ok: false, error }` rather than a throw: it is
 * an expected answer the form should render inline, and Next masks thrown
 * messages in production, so throwing would turn "that isn't a WhatsApp link"
 * into "an error occurred". The admin check does throw — a caller who is not
 * an admin gets nothing to render.
 */
export async function saveWhatsappGroupUrl(input) {
  const userId = await requireAdmin();

  const { url, error } = parseWhatsappUrl(input);
  if (error) return { ok: false, error };

  await setSetting(SETTING_KEYS.whatsappGroupUrl, url, { updatedBy: userId });

  // Two invalidations, because the link lives in two kinds of cache. The tag
  // expires the settings read itself (`updateTag`, not `revalidateTag`, so
  // the admin's very next request waits for the new value instead of being
  // served the stale one). The path drops the prerendered HTML of every page
  // under the locale layout, which has the old href baked into it — the
  // floating button is in the layout, so that is all of them.
  updateTag(SETTINGS_TAG);
  revalidatePath("/[locale]", "layout");

  return { ok: true, url };
}
