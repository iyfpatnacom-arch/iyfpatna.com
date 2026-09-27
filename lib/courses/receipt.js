import { ORG } from "@/lib/site-config";
import { batchDateLabel, getCourse, modeOf } from "@/lib/courses/catalog";
import { buildReceiptPdf } from "@/lib/payments/receipt";
import { receiptFilename } from "@/lib/payments/pdf";
import { passQrPng } from "@/lib/courses/pass";

/**
 * The course receipt, as bytes and a filename.
 *
 * Lifted out of the route handler so it sits beside the donation equivalent and
 * both can be reached through one registry entry (see `payables.js`) — the
 * receipt URL is the same for either, and only this decides what is drawn.
 */
export async function buildCourseReceipt(enrollment) {
  const course = getCourse(enrollment.courseSlug);

  const pdf = await buildReceiptPdf(enrollment, {
    orgName: ORG.name,
    orgTagline: `The youth wing of ${ORG.parent}`,
    parentName: ORG.parentLegalName,
    address: ORG.address,
    siteDomain: ORG.domain,
    courseTitle: enrollment.courseTitle?.en || course?.title?.en || enrollment.courseSlug,
    batchLabel: course
      ? [batchDateLabel(course, "en"), course.batch?.sessions?.en, course.batch?.time?.en]
          .filter(Boolean)
          .join("  |  ")
      : null,
    modeLabel: course ? modeOf(course, enrollment.mode)?.label?.en : enrollment.mode,
    // A receipt without its pass page is still a receipt; never fail on it.
    passPng: await passQrPng(enrollment.orderId, 600).catch((error) => {
      console.error(`[receipt] could not draw the pass for ${enrollment.orderId}`, error);
      return null;
    }),
  });

  return { pdf, filename: receiptFilename(enrollment) };
}
