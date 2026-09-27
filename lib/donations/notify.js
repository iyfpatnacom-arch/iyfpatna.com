import { Resend } from "resend";
import { formatINR } from "@/lib/courses/catalog";
import { absoluteUrl, donationStatusPath, receiptPath } from "@/lib/payments/order-link";
import { renderDonationReceiptEmail } from "@/lib/notifications/templates/email/donationReceipt";
import { buildDonationReceipt } from "./receipt";

const FROM = process.env.RESEND_FROM_EMAIL || "IYF Patna <onboarding@resend.dev>";

/**
 * The thank-you email, sent once a donation is confirmed.
 *
 * Never throws: it runs on the payment-response path, where the donor's
 * browser is waiting mid-redirect, and a mail outage must never turn a
 * successful donation into an error page. The outcome is returned so the
 * caller can record it on the row.
 *
 * The receipt travels as an attachment as well as a link, because this one is
 * a tax document. A link is something to lose; the PDF sitting in the donor's
 * mailbox is still there next March when their accountant asks for it. If the
 * PDF cannot be drawn the email still goes, carrying the link — a thank-you
 * with no attachment beats silence.
 */
export async function sendDonationConfirmation(donation) {
  try {
    const locale = donation.locale === "en" ? "en" : "hi";

    const [statusPath, receipt] = await Promise.all([
      donationStatusPath(donation.orderId, locale),
      receiptPath(donation.orderId),
    ]);

    const paidOn = donation.payment?.paidAt
      ? new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
          dateStyle: "medium",
          timeZone: "Asia/Kolkata",
        }).format(new Date(donation.payment.paidAt))
      : null;

    const { subject, html } = renderDonationReceiptEmail({
      locale,
      name: donation.name,
      orderId: donation.orderId,
      sevaTitle: donation.sevaTitle?.[locale] || donation.sevaTitle?.en || donation.sevaSlug,
      amount: formatINR(donation.amount),
      paidOn,
      paymentMode: donation.payment?.paymentMode || null,
      statusUrl: absoluteUrl(statusPath),
      receiptUrl: absoluteUrl(receipt),
    });

    const attachments = await buildDonationReceipt(donation)
      .then(({ pdf, filename }) => [{ filename, content: Buffer.from(pdf) }])
      .catch((error) => {
        console.error(
          `[notifications:email] could not attach the receipt for ${donation.orderId}`,
          error,
        );
        return undefined;
      });

    if (!process.env.RESEND_API_KEY) {
      console.log(
        `[notifications:email] RESEND_API_KEY not set — logging instead of sending. To: ${donation.email}, Subject: ${subject}`,
      );
      return { ok: true, logged: true };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: FROM,
      to: donation.email,
      subject,
      html,
      attachments,
    });
    if (error) throw new Error(error.message || "Resend send failed");
    return { ok: true };
  } catch (error) {
    console.error("[notifications:email] donation confirmation failed", error);
    return { ok: false, error: String(error?.message || error).slice(0, 300) };
  }
}
