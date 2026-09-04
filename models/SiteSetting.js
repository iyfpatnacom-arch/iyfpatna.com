import mongoose from "mongoose";

/**
 * Site configuration an admin can edit without a deploy — one document per
 * setting.
 *
 * `lib/site-config.js` holds the values that only ever change with a code
 * change. This collection holds the handful that change on their own
 * schedule: a WhatsApp group invite is rotated whenever the group is reset,
 * and that should not need a developer, a commit and a redeploy.
 *
 * Deliberately a key/value store rather than one settings document with fixed
 * fields. A fixed-field document needs a schema edit for every new editable
 * value; here a new setting is a new row and nothing else.
 *
 * A missing key is not an error and never has to be seeded. Every reader in
 * `lib/settings.js` falls back to the constant in site-config, so the site
 * renders correctly against a database this collection has never been written
 * to — which is precisely its state on day one.
 */
/**
 * Every key this collection stores.
 *
 * Lives on the model rather than in lib/settings.js because the seed script
 * needs it too, and the seed runs under plain node — no "@" alias and no
 * Next.js runtime, so it cannot import anything that reaches for next/cache.
 * lib/settings.js re-exports this, so callers inside the app are unaffected.
 */
export const SETTING_KEYS = {
  whatsappGroupUrl: "whatsapp_group_url",
};

const SiteSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: String, default: "" },
    /** Clerk user id of whoever last saved it, for the audit line. */
    updatedBy: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.SiteSetting ||
  mongoose.model("SiteSetting", SiteSettingSchema);
