import {
  ORG,
  DONATION_COMPLIANCE,
  DONATION_RECEIPT_CONTACTS,
} from "@/lib/site-config";
import { buildDonationReceiptPdf } from "@/lib/payments/donation-receipt";
import { receiptFilename } from "@/lib/payments/pdf";

/**
 * The donation receipt, as bytes and a filename.
 *
 * One function rather than two call sites assembling `details` themselves: the
 * PDF is served from /api/receipt and attached to the confirmation email, and
 * a donor who compares the two must not find a different document. Anything
 * that belongs on the receipt but not on the row is decided here, once.
 *
 * The wording below is deliberately English-only. The standard PDF fonts
 * cannot draw Devanagari (see `pdf.js`), and this is a document read by an
 * assessing officer rather than by the donor's family.
 *
 * It is also deliberately not IYF's document. IYF Patna has no separate legal
 * personality (see `ORG` in `site-config.js`): the money is received by the
 * registered trust, the 80G registration and the PAN on this page are the
 * trust's, and Form 10BE is filed by the trust. A receipt headed with the
 * youth wing's name says the donation went somewhere other than where the
 * exemption block says it went, which is the one contradiction an assessing
 * officer is reading this page to find. So the letterhead is ISKCON Patna's,
 * and the youth wing is not named on it at all.
 *
 * The course receipt is IYF's own and is headed accordingly — an enrolment
 * really is with the youth wing. See `lib/payments/receipt.js`.
 */
export async function buildDonationReceipt(donation) {
  const sevaTitle = donation.sevaTitle?.en || donation.sevaSlug;

  const pdf = await buildDonationReceiptPdf(donation, {
    orgName: ORG.parent,
    orgTagline: ORG.parentLegalName,
    parentName: ORG.parentLegalName,
    address: ORG.address,
    siteDomain: ORG.domain,
    /* The desk that issues the stamped receipt this document acknowledges. */
    receiptContact: `For donation receipt contact ${DONATION_RECEIPT_CONTACTS.join(", ")}`,
    sevaTitle,
    sevaNote: "Voluntary donation towards the seva named above.",
    compliance: DONATION_COMPLIANCE,
    formNote:
      "Form No. 10BE, the certificate used to claim the deduction, is issued by 31st May of the following financial year to the PAN and email recorded above.",
  });

  return { pdf, filename: receiptFilename(donation) };
}
