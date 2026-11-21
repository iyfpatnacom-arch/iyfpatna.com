import { Resend } from "resend";
import { ORG } from "@/lib/site-config";
import {
  eventOf,
  formatINR,
  getFestival,
  whatsappGroupsFor,
} from "@/lib/gita-event/catalog";
import {
  absoluteUrl,
  gitaStatusPath,
  passImagePath,
  receiptPath,
} from "@/lib/payments/order-link";
import { renderGitaRegistrationEmail } from "@/lib/notifications/templates/email/gitaRegistration";

const FROM = process.env.RESEND_FROM_EMAIL || "IYF Patna <onboarding@resend.dev>";

/**
 * The "you're registered" email, sent once a payment is confirmed.
 *
 * Never throws, exactly like the course and donation equivalents: it runs on
 * the payment-response path with the participant's browser waiting mid-redirect,
 * and a mail outage must never turn a successful payment into an error page.
 * The outcome is returned so `recordPaymentOutcome` can write it onto the row.
 *
 * Both WhatsApp groups are listed when both events were paid for. The group
 * links are the reason this email exists at all — the quiz link only ever goes
 * out in the group, so a confirmation that reached somebody without them would
 * have sold them nothing.
 */
export async function sendGitaRegistrationConfirmation(row) {
  try {
    const festival = getFestival();
    const locale = row.locale === "en" ? "en" : "hi";

    const [statusPath, receipt, passImage] = await Promise.all([
      gitaStatusPath(row.orderId, locale),
      receiptPath(row.orderId),
      passImagePath(row.orderId),
    ]);

    const snapshots = new Map((row.eventTitles || []).map((entry) => [entry.key, entry]));
    const events = (row.events || []).map((key) => {
      const event = eventOf(key);
      return {
        key,
        title: snapshots.get(key)?.[locale] || event?.title?.[locale] || key,
        dateLabel: event?.dateLabel?.[locale] || null,
      };
    });

    const { subject, html } = renderGitaRegistrationEmail({
      locale,
      name: row.name,
      orderId: row.orderId,
      festivalTitle: festival.title[locale] || festival.title.en,
      events,
      amount: formatINR(row.amount),
      referral: row.referral || null,
      statusUrl: absoluteUrl(statusPath),
      receiptUrl: absoluteUrl(receipt),
      groups: whatsappGroupsFor(row.events, locale),
      passImageUrl: absoluteUrl(passImage),
      helpline: festival.helpline || ORG.phone,
    });

    if (!process.env.RESEND_API_KEY) {
      console.log(
        `[notifications:email] RESEND_API_KEY not set — logging instead of sending. To: ${row.email}, Subject: ${subject}`,
      );
      return { ok: true, logged: true };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: FROM,
      to: row.email,
      subject,
      html,
    });
    if (error) throw new Error(error.message || "Resend send failed");
    return { ok: true };
  } catch (error) {
    console.error("[notifications:email] Gita registration confirmation failed", error);
    return { ok: false, error: String(error?.message || error).slice(0, 300) };
  }
}
