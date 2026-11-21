import { dbConnect } from "@/lib/db/connect";
import Enrollment from "@/models/Enrollment";
import Donation from "@/models/Donation";
import BookSale from "@/models/BookSale";
import GitaRegistration from "@/models/GitaRegistration";
import { getCourse } from "@/lib/courses/catalog";
import { sendEnrollmentConfirmation } from "@/lib/courses/notify";
import { recordCouponUse } from "@/lib/courses/coupons";
import { buildCourseReceipt } from "@/lib/courses/receipt";
import { sendDonationConfirmation } from "@/lib/donations/notify";
import { buildDonationReceipt } from "@/lib/donations/receipt";
import { reportDonationPurchase } from "@/lib/analytics/meta-capi";
import { buildBookSaleReceipt } from "@/lib/marathon/receipt";
import { selectionLabel } from "@/lib/gita-event/catalog";
import { sendGitaRegistrationConfirmation } from "@/lib/gita-event/notify";
import { buildGitaReceipt } from "@/lib/gita-event/receipt";
import {
  bookSaleStatusPath,
  donationStatusPath,
  gitaStatusPath,
  orderStatusPath,
} from "./order-link";

/**
 * The things this site takes money for, and everything that differs between
 * them.
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
 *   gateways     which gateways it may be paid through, most preferred first
 *   pass         whether a paid order of this kind is admission to something,
 *                and so has an entry pass QR (/api/pass reads this)
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

  /* Both, with the choice put to the customer at checkout: a declined card on
     one gateway should not cost a seat when the other may take it. */
  gateways: ["razorpay", "ccavenue"],

  /** A seat is admission to a venue, so it carries a pass. */
  pass: true,

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

  /* Razorpay only. A donor reaches for UPI, which CCAvenue cannot take here,
     and a second gateway on this form would be a choice with one good answer. */
  gateways: ["razorpay"],

  /** Giving admits you to nothing; there is no door to show a QR at. */
  pass: false,

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

/**
 * A stack of books handed over at a stall, paid for by UPI.
 *
 * The third kind, and the one that justified this registry rather than
 * vindicating it: adding it touched no route. The Razorpay callback, the
 * webhook, the amount comparison, the reuse of a gateway order across retries
 * and the refusal to open a second checkout on a paid row all came for free,
 * which for money collected on a footpath by a volunteer with a phone is
 * exactly the machinery that would otherwise have been reimplemented badly.
 *
 * Cash sales never reach any of it. They are written straight to "success"
 * with `provider: "cash"` by /api/marathon/sales, so they share the same
 * "is this real money" test as everything else and nothing more.
 */
const book = {
  kind: "book",
  model: BookSale,

  /* Razorpay only, and for a sharper reason than the donation's: the reader is
     standing in the street with a phone in their hand, so this is a UPI
     payment or it is nothing. CCAvenue's billing page has no place here. */
  gateways: ["razorpay"],

  /** Books, not admission. */
  pass: false,

  notes: (row) => ({
    volunteer: String(row.volunteerClerkId || "").slice(0, 100),
    books: String(row.quantity || 0),
  }),

  checkout: (row, lang) => ({
    description:
      row.items?.map((item) => item.title?.[lang] || item.title?.en || item.bookKey).join(", ") ||
      "Bhagavad-gita",
    /* The reader's details if they gave any, and nothing of the volunteer's:
       prefilling a stall volunteer's phone number onto a stranger's payment
       would put the wrong person on Razorpay's record of the transaction. */
    prefill: { name: row.buyer?.name || "", email: "", phone: row.buyer?.phone || "" },
  }),

  statusPath: (orderId, lang) => bookSaleStatusPath(orderId, lang),
  fallbackPath: (lang) => `/${lang}/activity/gita-marathon`,

  /* Nothing to send. A reader on a footpath gives no email address, and the
     receipt is reached from the sale's own page by whoever has the link —
     usually the volunteer, showing it to them. Returning null is what tells
     `recordPaymentOutcome` there is no delivery outcome to record. */
  onPaid: async () => null,

  receipt: (row) => buildBookSaleReceipt(row),
};

/**
 * A place at the Gita Jayanti festival — the quiz, the mahotsav, or both.
 *
 * The fourth kind, and the first whose row is for a *set* of things: what was
 * charged, which WhatsApp group the email carries and which door the pass opens
 * all come off `row.events`. None of that reaches this far. By the time the
 * pipeline is holding the row there is an amount and a currency on it, which is
 * all the gateway has ever needed, so adding the festival touched no route —
 * the Razorpay callback, the webhook, the amount comparison, the reuse of a
 * gateway order across retries and the refusal to open a second checkout on a
 * paid row all came for free.
 */
const gita = {
  kind: "gita",
  model: GitaRegistration,

  /* Razorpay only. The fee is ₹101 paid from a phone, which means UPI; a
     gateway picker over a hundred rupees is a question nobody wants asked. */
  gateways: ["razorpay"],

  /** Admission to one or two events, scanned at the door. */
  pass: true,

  notes: (row) => ({
    festival: String(row.festivalSlug || "").slice(0, 100),
    events: (row.events || []).join(",").slice(0, 100),
  }),

  checkout: (row, lang) => ({
    description: selectionLabel(row.events, lang) || "Gita Mahotsav",
    prefill: { name: row.name, email: row.email, phone: row.phone },
  }),

  statusPath: (orderId, lang) => gitaStatusPath(orderId, lang),
  fallbackPath: (lang) => `/${lang}/gita-mahotsav`,

  /* The email is the delivery here in a way it is not for a course: the quiz
     link only ever goes out in the WhatsApp group, and this is what carries the
     invite to it. The confirmation page shows the same links, so a bounced
     email is recoverable — but it is recorded on the row either way. */
  onPaid: async (row) => sendGitaRegistrationConfirmation(row),

  receipt: (row) => buildGitaReceipt(row),
};

const PAYABLES = { course, donation, book, gita };

/** The kinds, in the order `findPayable` searches when it has no hint. */
export const PAYABLE_KINDS = ["course", "donation", "book", "gita"];

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
