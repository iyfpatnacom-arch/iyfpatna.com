import { Resend } from "resend";
import { renderJoinProgramEmail } from "./templates/email/joinProgram.js";
import { renderJoinCourseEmail } from "./templates/email/joinCourse.js";

const FROM = process.env.RESEND_FROM_EMAIL || "IYF Patna <onboarding@resend.dev>";

export async function sendEmail(payload) {
  const { itemType, name, email, locale } = payload;

  const { subject, html } =
    itemType === "course"
      ? renderJoinCourseEmail({
          name,
          title: payload.item.title,
          duration: payload.item.duration?.[locale] ?? "",
          locale,
        })
      : renderJoinProgramEmail({
          name,
          title: payload.item.title,
          schedule: payload.item.schedule?.[locale] ?? "",
          location: payload.item.location?.[locale] ?? "",
          locale,
        });

  if (!process.env.RESEND_API_KEY) {
    console.log(`[notifications:email] RESEND_API_KEY not set — logging instead of sending. To: ${email}, Subject: ${subject}`);
    return { logged: true };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject,
    html,
  });

  if (error) throw new Error(error.message || "Resend send failed");
  return { sent: true };
}
