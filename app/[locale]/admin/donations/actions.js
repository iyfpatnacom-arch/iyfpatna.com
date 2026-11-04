"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-config";
import { dbConnect } from "@/lib/db/connect";
import { sendDonationConfirmation } from "@/lib/donations/notify";
import { donationStatusPath, receiptPath } from "@/lib/payments/order-link";
import Donation from "@/models/Donation";

/**
 * The two things an admin does to a donation row, neither of which changes it.
 *
 * Deliberately no edit and no delete. A donation row is the record of money
 * the trust received and of a tax document issued against it — the receipt is
 * drawn from this row every time it is fetched, so editing an amount here
 * would silently reissue a different 80G certificate for a payment the bank
 * statement still shows at the old figure. Anything genuinely wrong is a
 * refund through the gateway and a note in the temple's own books, not a
 * quiet update.
 *
 * `requireAdmin` throws rather than returning: a server action has no UI to
 * fall back to and must simply refuse. Expected mistakes come back as
 * `{ ok: false, error }` carrying a message key, as the other admin actions
 * do.
 */

const orderSchema = z.object({
  orderId: z.string().trim().min(1).max(60),
});

/**
 * The signed links for one donation — its receipt PDF and its status page.
 *
 * Minted on demand rather than alongside every row on the dashboard. The token
 * is an HMAC per order (see `order-link.js`), and signing a few thousand of
 * them on every page load to serve the one an admin actually clicks is work
 * nobody asked for.
 *
 * Only for a settled donation. The receipt route refuses an unpaid order
 * anyway (there is no money to acknowledge), so handing out a link to it would
 * be offering a button that cannot work.
 */
export async function donationLinks(input) {
  await requireAdmin();

  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "don_link_failed" };
  const { orderId } = parsed.data;

  await dbConnect();

  const donation = await Donation.findOne({ orderId })
    .select("orderId locale payment.status")
    .lean();
  if (!donation) return { ok: false, error: "don_link_failed" };
  if (donation.payment?.status !== "success") {
    return { ok: false, error: "don_link_unpaid" };
  }

  const [receipt, status] = await Promise.all([
    receiptPath(orderId),
    donationStatusPath(orderId, donation.locale),
  ]);

  return { ok: true, receipt, status };
}

/**
 * Sending the thank-you and the receipt again.
 *
 * The one write this page makes, and it is a write about delivery rather than
 * about money: a donor who mistyped their email, or whose inbox bounced the
 * first attempt, has no receipt and no way to get one themselves. The PDF is
 * redrawn from the row, so what lands in their inbox is byte-for-byte the
 * document /api/receipt serves.
 *
 * Every attempt is pushed onto `notifications.attempts` rather than replacing
 * the last one, exactly as the payment pipeline does it — "we sent this three
 * times and it failed three times" is the thing worth knowing when a donor
 * says they never got it.
 */
export async function resendDonationReceipt(input) {
  const adminId = await requireAdmin();

  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "don_resend_failed" };
  const { orderId } = parsed.data;

  await dbConnect();

  const donation = await Donation.findOne({ orderId }).lean();
  if (!donation) return { ok: false, error: "don_resend_failed" };
  if (donation.payment?.status !== "success") {
    return { ok: false, error: "don_link_unpaid" };
  }

  const outcome = await sendDonationConfirmation(donation);

  await Donation.updateOne(
    { orderId },
    {
      $set: {
        /* `logged` means there is no Resend key on this machine and the mail
           was written to the console. Nothing reached the donor, so the row
           must not claim it did. */
        "notifications.emailSent": Boolean(outcome.ok && !outcome.logged),
      },
      $push: {
        "notifications.attempts": {
          kind: "confirmation_email",
          ok: Boolean(outcome.ok),
          error: outcome.error || null,
          resentBy: adminId,
          at: new Date(),
        },
      },
    },
  ).catch((error) => console.error("[admin/donations] resend record failed", error));

  if (!outcome.ok) return { ok: false, error: "don_resend_failed" };

  revalidatePath("/[locale]/admin/donations", "page");
  return { ok: true, email: donation.email, logged: Boolean(outcome.logged) };
}
