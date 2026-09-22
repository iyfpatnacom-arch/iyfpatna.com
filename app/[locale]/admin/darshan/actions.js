"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth-config";
import { dbConnect } from "@/lib/db/connect";
import { DARSHAN_TAG, indiaDate } from "@/lib/darshan";
import {
  deleteFromImagekit,
  imagekitConfigured,
  uploadToImagekit,
} from "@/lib/imagekit";
import DailyDarshan from "@/models/DailyDarshan";

/** Must stay under `serverActions.bodySizeLimit` in next.config.mjs. */
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const FOLDER = process.env.IMAGEKIT_DARSHAN_FOLDER || "/IYF/daily-darshan";

/**
 * Uploads this morning's darshan photo and puts it in the home hero.
 *
 * The file travels browser → this action → ImageKit, so the private key never
 * leaves the server. The form shrinks the photo before sending it, which keeps
 * the upload quick on a phone at 5 am; the checks here are the real rule
 * because a server action is a public endpoint.
 *
 * Expected problems come back as `{ ok: false, error }` message keys for the
 * form to show inline, the same as the settings actions. Not being an admin
 * throws.
 */
export async function uploadDailyDarshan(formData) {
  const userId = await requireAdmin();

  if (!imagekitConfigured()) return { ok: false, error: "darshan_error_config" };

  const file = formData.get("file");
  if (!file || typeof file === "string" || file.size === 0) {
    return { ok: false, error: "darshan_error_empty" };
  }
  if (!ALLOWED_TYPES.has(file.type)) return { ok: false, error: "darshan_error_type" };
  if (file.size > MAX_BYTES) return { ok: false, error: "darshan_error_size" };

  const date = indiaDate();
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";

  let uploaded;
  try {
    uploaded = await uploadToImagekit(file, {
      fileName: `darshan-${date}.${ext}`,
      folder: FOLDER,
      tags: ["daily-darshan", date],
    });
  } catch (err) {
    console.error("[darshan] upload failed", err);
    return { ok: false, error: "darshan_error_upload" };
  }

  await dbConnect();
  const previous = await DailyDarshan.findOneAndUpdate(
    { date },
    { $set: { ...uploaded, uploadedBy: userId } },
    { upsert: true, returnDocument: "before" }
  ).lean();

  // A second upload the same morning is a correction; the photo it replaces
  // is never shown again, so don't leave it in the media library. Earlier
  // days are kept as the archive.
  if (previous?.fileId && previous.fileId !== uploaded.fileId) {
    await deleteFromImagekit(previous.fileId);
  }

  // As in the settings action: the tag expires the cached read, the path
  // drops the prerendered home page that has the old photo baked in.
  updateTag(DARSHAN_TAG);
  revalidatePath("/[locale]", "layout");

  return { ok: true, date, url: uploaded.url, replaced: Boolean(previous) };
}
