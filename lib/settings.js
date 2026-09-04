import { unstable_cache } from "next/cache";
import { dbConnect } from "@/lib/db/connect";
import SiteSetting, { SETTING_KEYS } from "@/models/SiteSetting";
import { WHATSAPP_GROUP_URL } from "@/lib/site-config";

/**
 * Reading and writing the settings an admin edits at /admin/settings.
 *
 * Two rules shape this file.
 *
 * The first is that the site must not go down with the database. The WhatsApp
 * link is rendered by the root layout, so it is on every page — if reading it
 * could throw, one unreachable Mongo would take the whole site with it. So
 * every read is wrapped and every miss falls through to the constant in
 * site-config, which is still the real link. The database only ever overrides
 * that value; it is never the only copy of it.
 *
 * The second is that the pages stay prerendered. `unstable_cache` (this
 * project does not run with `cacheComponents`, so `use cache` is not
 * available) makes the read a data-cache hit rather than a per-request
 * query, so the home page is still static HTML. The admin action expires the
 * tag on save, and the hourly `revalidate` is the safety net for the one case
 * a tag cannot cover: a `next build` that ran without a database and baked
 * the fallback into the prerender.
 */

/** Re-exported so app code has one import for reading, writing and naming. */
export { SETTING_KEYS };

/** Cache tag the admin action expires after a save. */
export const SETTINGS_TAG = "site-settings";

/**
 * All settings as a plain `{ key: value }` map.
 *
 * One query for the lot rather than one per key: there are a handful of
 * settings and the layout may want several of them, and a single cache entry
 * is also a single thing to invalidate.
 */
const readSettings = unstable_cache(
  async () => {
    await dbConnect();
    const docs = await SiteSetting.find({}).lean();
    const map = {};
    for (const doc of docs) map[doc.key] = doc.value;
    return map;
  },
  ["site-settings"],
  { tags: [SETTINGS_TAG], revalidate: 3600 }
);

/**
 * Settings, or an empty map if the database is unreachable.
 *
 * The throw is deliberately allowed to escape `unstable_cache` — a rejected
 * promise is not cached, so a failed read is retried on the next request
 * rather than pinning the fallback in the cache for an hour.
 */
export async function getSettings() {
  try {
    return await readSettings();
  } catch (err) {
    console.error("[settings] read failed, falling back to site-config", err);
    return {};
  }
}

/** The WhatsApp group invite as it should be rendered right now. */
export async function getWhatsappGroupUrl() {
  const settings = await getSettings();
  return settings[SETTING_KEYS.whatsappGroupUrl] || WHATSAPP_GROUP_URL;
}

/**
 * Uncached read, with the audit fields, for the admin screen itself.
 *
 * The admin has just saved and needs to see what is actually stored — not a
 * cache entry that happens to agree. Returns null when nothing is stored,
 * which the page renders as "using the built-in default".
 */
export async function getSettingDoc(key) {
  await dbConnect();
  return SiteSetting.findOne({ key }).lean();
}

export async function setSetting(key, value, { updatedBy = "" } = {}) {
  await dbConnect();
  return SiteSetting.findOneAndUpdate(
    { key },
    { $set: { value, updatedBy } },
    { upsert: true, returnDocument: "after" }
  ).lean();
}

/* ------------------------------------------------------- validation */

/**
 * Hosts a WhatsApp link is allowed to point at.
 *
 * This is the part of the feature that actually matters. The saved string
 * goes straight into an `href` on a green WhatsApp-branded button on every
 * page of the site, so an admin who pastes the wrong thing — or anyone who
 * gets at the form — must not be able to turn that button into a link to
 * somewhere else. An allowlist of hosts, over https only, is what makes the
 * button's promise ("this opens WhatsApp") true by construction rather than
 * by trust. `javascript:` and friends never even reach the host check.
 */
const WHATSAPP_HOSTS = new Set([
  "chat.whatsapp.com",
  "wa.me",
  "api.whatsapp.com",
  "whatsapp.com",
  "www.whatsapp.com",
]);

/**
 * Validates and normalises a pasted invite link.
 *
 * Returns `{ url }` on success or `{ error }` with a message *key* — the
 * caller looks it up in the `admin` namespace, so the reason a link was
 * rejected is translated like every other string on the site rather than
 * being an English sentence hardcoded in a validator.
 */
export function parseWhatsappUrl(input) {
  const raw = String(input || "").trim();
  if (!raw) return { error: "error_empty" };

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return { error: "error_malformed" };
  }

  if (parsed.protocol !== "https:") return { error: "error_not_https" };
  if (!WHATSAPP_HOSTS.has(parsed.hostname.toLowerCase())) {
    return { error: "error_not_whatsapp" };
  }

  return { url: parsed.toString() };
}
