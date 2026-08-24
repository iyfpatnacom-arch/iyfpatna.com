import { dbConnect } from "@/lib/db/connect";
import { getFlag } from "@/lib/flags";
import NotificationLog from "@/models/NotificationLog";
import { sendEmail } from "./email.js";
import { sendWhatsapp } from "./whatsapp.js";

/**
 * Fires every configured notification channel for a new registration.
 * The registration write to MongoDB is the source of truth — this must
 * NEVER throw, and a channel failing must never affect the others.
 */
export async function sendJoinNotification(payload) {
  const channels = [];

  try {
    await sendEmail(payload);
    channels.push({ channel: "email", success: true });
  } catch (err) {
    console.error("[notifications] email channel failed", err);
    channels.push({ channel: "email", success: false, error: String(err?.message ?? err) });
  }

  const whatsappEnabled = await getFlag("whatsapp_notifications", false);
  if (whatsappEnabled) {
    try {
      await sendWhatsapp(payload);
      channels.push({ channel: "whatsapp", success: true });
    } catch (err) {
      console.error("[notifications] whatsapp channel failed", err);
      channels.push({ channel: "whatsapp", success: false, error: String(err?.message ?? err) });
    }
  }

  try {
    await dbConnect();
    await NotificationLog.create({ registrationId: payload.registrationId, channels });
  } catch (err) {
    console.error("[notifications] failed to write notification log", err);
  }

  return channels;
}
