import { Resend } from "resend";
import { batchDateLabel, formatINR, getCourse, modeOf, whatsappGroupFor } from "./catalog";
import { absoluteUrl, orderStatusPath, receiptPath } from "@/lib/payments/order-link";
import { renderCourseEnrollmentEmail } from "@/lib/notifications/templates/email/courseEnrollment";

const FROM = process.env.RESEND_FROM_EMAIL || "IYF Patna <onboarding@resend.dev>";

/**
 * The "you're in" email, sent once a payment is confirmed.
 *
 * Never throws: it runs on the payment-response path, where the customer's
 * browser is waiting mid-redirect, and a mail outage must never turn a
 * successful payment into an error page. The outcome is returned so the caller
 * can record it on the enrolment.
 */
export async function sendEnrollmentConfirmation(enrollment) {
  try {
    const course = getCourse(enrollment.courseSlug);
    const locale = enrollment.locale === "en" ? "en" : "hi";

    const [statusPath, receipt, whatsappUrl] = await Promise.all([
      orderStatusPath(enrollment.orderId, locale),
      receiptPath(enrollment.orderId),
      whatsappGroupFor(course),
    ]);

    const { subject, html } = renderCourseEnrollmentEmail({
      locale,
      name: enrollment.name,
      orderId: enrollment.orderId,
      courseTitle: enrollment.courseTitle?.[locale] || course?.title?.[locale] || "",
      amount: formatINR(enrollment.amount),
      modeLabel: course ? modeOf(course, enrollment.mode)?.label?.[locale] : null,
      batchLabel: course
        ? [batchDateLabel(course, locale), course.batch?.time?.[locale]].filter(Boolean).join(" · ")
        : null,
      statusUrl: absoluteUrl(statusPath),
      receiptUrl: absoluteUrl(receipt),
      whatsappUrl,
    });

    if (!process.env.RESEND_API_KEY) {
      console.log(
        `[notifications:email] RESEND_API_KEY not set — logging instead of sending. To: ${enrollment.email}, Subject: ${subject}`
      );
      return { ok: true, logged: true };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: FROM,
      to: enrollment.email,
      subject,
      html,
    });
    if (error) throw new Error(error.message || "Resend send failed");
    return { ok: true };
  } catch (error) {
    console.error("[notifications:email] course confirmation failed", error);
    return { ok: false, error: String(error?.message || error).slice(0, 300) };
  }
}
