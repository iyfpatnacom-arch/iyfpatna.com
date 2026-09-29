import { dbConnect } from "@/lib/db/connect";
import Enrollment from "@/models/Enrollment";
import Donation from "@/models/Donation";
import { getCourse } from "@/lib/courses/catalog";
import { sendEnrollmentConfirmation } from "@/lib/courses/notify";
import { recordCouponUse } from "@/lib/courses/coupons";
import { buildCourseReceipt } from "@/lib/courses/receipt";
import { sendDonationConfirmation } from "@/lib/donations/notify";
import { buildDonationReceipt } from "@/lib/donations/receipt";
import { reportDonationPurchase } from "@/lib/analytics/meta-capi";
import { donationStatusPath, orderStatusPath } from "./order-link";

/**
 * The two things this site takes money for, and everything that differs
 * between them.
 *
 * There is one payment pipeline: /api/payment/initiate opens the checkout,
 * Razorpay posts the result back to /api/payment/response, and the webhook
 * settles whatever the browser lost. That pipeline was written for course
 * seats, and the cheap way to add donations would have been to copy it — a
 * second initiate, a second callback URL, a second webhook to register in the
 * Razorpay dashboard and to remember when the signing secret is rotated.
 *
 * Instead the pipeline asks this registry what it is holding. Everything
 * generic — reusing a gateway order across retries, refusing to open a second
 * checkout for an order Razorpay already shows as paid, comparing the returned
 * amount against the stored one, writing the outcome exactly once — stays in
 * one place and is exercised by both kinds of payment.
 *
 * A kind supplies:
 *   model        the collection the order lives in
 *   notes        what to write into the Razorpay order's notes
 *   checkout     the description and prefill for Razorpay's checkout
 *   statusPath   where the browser goes when it comes back
 *   fallbackPath where it goes when we cannot tell which order it was
 *   onPaid       what happens once, the first time money is confirmed
 *   receipt      the PDF, drawn from the row
 */

const course = {
  kind: "course",
  model: Enrollment,

  notes: (enrollment) => ({
    courseSlug: String(enrollment.courseSlug || "").slice(0, 100),
  }),

  checkout: (enrollment, lang) => ({
    description:
      enrollment.courseTitle?.[lang] ||
      enrollment.courseTitle?.en ||
      getCourse(enrollment.courseSlug)?.title?.en ||
      "",
    prefill: {
      name: enrollment.name,
      email: enrollment.email,
      phone: enrollment.phone,
    },
  }),

  statusPath: (orderId, lang) => orderStatusPath(orderId, lang),
  fallbackPath: (lang) => `/${lang}/courses`,

  /* A coupon is spent when the seat is confirmed, not when it is typed, so a
     checkout the customer abandons does not use one up. */
  onPaid: async (enrollment) => {
    await recordCouponUse(enrollment.coupon?.code);
    return sendEnrollmentConfirmation(enrollment);
  },

  receipt: (enrollment) => buildCourseReceipt(enrollment),
};

const donation = {
  kind: "donation",
  model: Donation,

  notes: (row) => ({ sevaSlug: String(row.sevaSlug || "").slice(0, 100) }),

  checkout: (row, lang) => ({
    description: row.sevaTitle?.[lang] || row.sevaTitle?.en || row.sevaSlug,
    prefill: { name: row.name, email: row.email, phone: row.phone },
  }),

  statusPath: (orderId, lang) => donationStatusPath(orderId, lang),
  fallbackPath: (lang) => `/${lang}/donate`,

  /*
   * Two things happen the first time a donation's money is confirmed: the
   * donor gets their 80G receipt, and Meta gets told the ad worked.
   *
   * The conversion is reported from here, and not only from the donor's
   * browser, because this is the one place that runs for *every* donation. A
   * UPI payment approved in Google Pay often never brings the donor back to
   * the thank-you screen at all — the Razorpay webhook settles that row, and
   * the browser pixel never sees a rupee of it. See `meta-capi.js`.
   *
   * In parallel, and with the report's failure kept to itself: `onPaid`'s
   * return value is the email outcome that gets written onto the row, and a
   * Meta outage must not cost the temple its record of having sent a receipt.
   */
  onPaid: async (row) => {
    const [notified] = await Promise.all([
      sendDonationConfirmation(row),
      reportDonationPurchase(row).catch((error) => {
        console.error("[meta] donation report failed", error);
      }),
    ]);
    return notified;
  },

  receipt: (row) => buildDonationReceipt(row),
};

const PAYABLES = { course, donation };

/** The kinds, in the order `findPayable` searches when it has no hint. */
export const PAYABLE_KINDS = ["course", "donation"];

export function payableFor(kind) {
  return PAYABLES[kind] || null;
}

export function isPayableKind(kind) {
  return Object.hasOwn(PAYABLES, String(kind));
}

/**
 * Finds the row one of our order IDs names, and says which kind it is.
 *
 * `kind` is a hint, not a filter: the browser and the Razorpay order's notes
 * both carry one, and trying it first makes the common path a single indexed
 * lookup. When it is absent, wrong, or from an order created before the note
 * existed, the remaining collections are tried rather than reporting the order
 * missing — the alternative is a paid donation that nothing can settle.
 *
 * Order IDs cannot collide across kinds: each prefix has its own counter and
 * `DN` is reserved (see `DONATION_ORDER_PREFIX`), so at most one collection
 * ever answers.
 */
export async function findPayable(orderId, { kind } = {}) {
  const id = String(orderId || "").trim();
  if (!id) return null;

  const order = isPayableKind(kind)
    ? [kind, ...PAYABLE_KINDS.filter((k) => k !== kind)]
    : PAYABLE_KINDS;

  await dbConnect();

  for (const candidate of order) {
    const payable = PAYABLES[candidate];
    const doc = await payable.model.findOne({ orderId: id }).lean();
    if (doc) return { kind: candidate, payable, doc };
  }

  return null;
}
