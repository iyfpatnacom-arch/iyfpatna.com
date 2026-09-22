import { dbConnect } from "@/lib/db/connect";
import Enrollment from "@/models/Enrollment";
import { ORG } from "@/lib/site-config";
import { batchDateLabel, getCourse, modeOf } from "@/lib/courses/catalog";
import { buildReceiptPdf, receiptFilename } from "@/lib/payments/receipt";
import { verifyOrderToken } from "@/lib/payments/order-link";
import { check, clientKey } from "@/lib/rate-limit";
import { passQrPng } from "@/lib/courses/pass";

export const dynamic = "force-dynamic";

/**
 * The receipt PDF for one paid enrolment.
 *
 * Generated on every request rather than stored: it is a pure function of the
 * enrolment row, which stops changing the moment the payment succeeds.
 *
 * Unauthenticated by necessity — most people paying have no account — so
 * `?t=` carries an HMAC of the order ID. An email client or WhatsApp needs a
 * link it can fetch without a cookie, and that same link is what the browser
 * downloads.
 */
export async function GET(request, { params }) {
  const limit = check(clientKey(request, "receipt"), { limit: 30, windowMs: 10 * 60 * 1000 });
  if (!limit.allowed) {
    return new Response("Too many requests", {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSeconds) },
    });
  }

  const { orderId } = await params;
  const token = request.nextUrl.searchParams.get("t");

  if (!orderId || !(await verifyOrderToken(orderId, token))) {
    // The same answer a missing order gets, so a wrong token cannot be used to
    // find out which order IDs exist.
    return new Response("Not found", { status: 404 });
  }

  await dbConnect();
  const enrollment = await Enrollment.findOne(
    { orderId },
    {
      orderId: 1,
      courseSlug: 1,
      courseTitle: 1,
      amount: 1,
      mrp: 1,
      coupon: 1,
      name: 1,
      email: 1,
      phone: 1,
      mode: 1,
      "payment.status": 1,
      "payment.paidAt": 1,
      "payment.paymentMode": 1,
      "payment.trackingId": 1,
      "payment.bankRefNo": 1,
    }
  ).lean();

  if (!enrollment) return new Response("Not found", { status: 404 });

  /* A receipt is a record of money received. An unpaid or failed order has
     none to record, and issuing one anyway would hand someone a document their
     bank statement contradicts. */
  if (enrollment.payment?.status !== "success") {
    return new Response("No payment has been received for this order.", { status: 409 });
  }

  const course = getCourse(enrollment.courseSlug);
  const details = {
    orgName: ORG.name,
    orgTagline: `The youth wing of ${ORG.parent}`,
    parentName: ORG.parentLegalName,
    address: ORG.address,
    siteDomain: ORG.domain,
    courseTitle: enrollment.courseTitle?.en || course?.title?.en || enrollment.courseSlug,
    batchLabel: course
      ? [
          batchDateLabel(course, "en"),
          course.batch?.sessions?.en,
          course.batch?.time?.en,
        ]
          .filter(Boolean)
          .join("  |  ")
      : null,
    modeLabel: course ? modeOf(course, enrollment.mode)?.label?.en : enrollment.mode,
    // A receipt without its pass page is still a receipt; never fail on it.
    passPng: await passQrPng(orderId, 600).catch((error) => {
      console.error(`[receipt] could not draw the pass for ${orderId}`, error);
      return null;
    }),
  };

  let pdf;
  try {
    pdf = await buildReceiptPdf(enrollment, details);
  } catch (error) {
    console.error(`[receipt] could not draw ${orderId}`, error);
    return new Response("Could not generate the receipt", { status: 500 });
  }

  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.length),
      /* `attachment` makes the browser save rather than preview, which is why
         the status page needs no blob juggling to auto-download. */
      "Content-Disposition": `attachment; filename="${receiptFilename(enrollment)}"`,
      // The link is the credential, so no shared cache may keep a copy.
      "Cache-Control": "private, max-age=3600",
    },
  });
}
