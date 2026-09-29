import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import {
  ArrowLeft,
  Ban,
  Bookmark,
  CircleCheck,
  CircleX,
  Clock3,
  FileText,
  FlaskConical,
  Mail,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { dbConnect } from "@/lib/db/connect";
import { getOptionalAuth } from "@/lib/auth-config";
import Donation from "@/models/Donation";
import { formatINR } from "@/lib/courses/catalog";
import { DONATION_COMPLIANCE, ORG } from "@/lib/site-config";
import { paymentMode } from "@/lib/payments/razorpay";
import {
  orderToken,
  receiptPath,
  verifyOrderToken,
} from "@/lib/payments/order-link";
import { receiptFilename } from "@/lib/payments/pdf";
import { DonationPurchase } from "@/components/analytics/DonationPurchase";
import { Panel } from "@/components/site/Panel";
import { PayNowButton } from "@/components/payments/PayNowButton";
import { ReceiptDownload } from "@/components/payments/ReceiptDownload";

/**
 * A donation's own page — the thank-you screen after paying, and the place to
 * finish paying after a declined card or a cancelled checkout.
 *
 * Reached by a signed link (?t=…) from the gateway redirect, the thank-you email
 * and the form itself. A signed-in member can also open their own donations
 * without the token. Anyone else gets a 404, whether or not the donation
 * exists — the page names a person with their phone, email and postal address,
 * and DN-101 is a number anyone can count to.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { orderId } = await params;
  return { title: orderId, robots: { index: false, follow: false } };
}

const PRESENTATION = {
  success: {
    Icon: CircleCheck,
    bubble: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    glow: "bg-emerald-400/20",
  },
  pending: {
    Icon: Clock3,
    bubble: "bg-primary/15 text-primary",
    glow: "bg-brand-gold/20",
  },
  failed: {
    Icon: CircleX,
    bubble: "bg-destructive/12 text-destructive",
    glow: "bg-destructive/10",
  },
  aborted: {
    Icon: Ban,
    bubble: "bg-muted text-muted-foreground",
    glow: "bg-brand-gold/10",
  },
};

function Row({ label, value, mono }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-3 last:border-0">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd
        className={`min-w-0 text-end text-sm font-semibold ${mono ? "font-mono tracking-tight" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

export default async function DonationPage({ params, searchParams }) {
  const { locale, orderId } = await params;
  const { t: token } = await searchParams;
  setRequestLocale(locale);

  await dbConnect();
  const donation = await Donation.findOne({ orderId }).lean();
  if (!donation) notFound();

  let allowed = await verifyOrderToken(orderId, token);
  if (!allowed && donation.clerkId) {
    const { userId } = await getOptionalAuth();
    allowed = Boolean(userId) && userId === donation.clerkId;
  }
  if (!allowed) notFound();

  const t = await getTranslations("donation");
  const status = donation.payment?.status || "pending";
  const view = PRESENTATION[status] ?? PRESENTATION.pending;
  const canPay = status !== "success" && Boolean(paymentMode());

  const [receipt, payToken] = await Promise.all([
    status === "success" ? receiptPath(orderId) : null,
    canPay ? orderToken(orderId) : null,
  ]);

  const firstName = donation.name.split(" ")[0];
  const sevaTitle =
    donation.sevaTitle?.[locale] || donation.sevaTitle?.en || donation.sevaSlug;
  const amount = formatINR(donation.amount);

  const copy = {
    success: [
      t("success_title", { name: firstName }),
      t("success_body", { seva: sevaTitle, email: donation.email }),
    ],
    pending: canPay
      ? [t("pending_title"), t("pending_body")]
      : [t("pending_wait_title"), t("pending_wait_body")],
    failed: [t("failed_title"), t("failed_body")],
    aborted: [t("aborted_title"), t("aborted_body")],
  };
  const [title, body] = copy[status] ?? copy.pending;

  const paidOn = donation.payment?.paidAt
    ? new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      }).format(new Date(donation.payment.paidAt))
    : null;

  const simulated = donation.payment?.provider === "simulated";

  return (
    <div className="relative overflow-hidden">
      {/* Only ever on a donation that is genuinely paid for, and only ever
          with what the row says: the amount comes from the database and not
          from anything the browser could have carried here, so a guessed URL
          cannot report a conversion and a tampered one cannot inflate it.
          A test payment is excluded too — simulated money is not a donation
          and must not train a campaign. */}
      {status === "success" && !simulated && (
        <DonationPurchase
          orderId={donation.orderId}
          amount={donation.amount}
          currency={donation.currency}
          sevaSlug={donation.sevaSlug}
        />
      )}

      <div
        className={`pointer-events-none absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full blur-3xl ${view.glow}`}
        aria-hidden="true"
      />

      <div className="relative mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-start lg:gap-12">
          <div>
            <span
              className={`flex size-16 items-center justify-center rounded-full ${view.bubble}`}
            >
              <view.Icon className="size-8" aria-hidden="true" />
            </span>

            <p className="mt-6 text-xs font-semibold tracking-wider text-primary uppercase">
              {sevaTitle}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
              {body}
            </p>

            {simulated && (
              <p className="mt-4 flex items-start gap-2 rounded-lg border border-dashed border-primary/40 px-3 py-2 text-xs text-muted-foreground">
                <FlaskConical
                  className="mt-0.5 size-3.5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                {t("test_payment")}
              </p>
            )}

            {receipt && (
              <div className="mt-7">
                <ReceiptDownload
                  url={receipt}
                  filename={receiptFilename(donation)}
                  auto
                  label={t("receipt")}
                  autoNote={t("receipt_auto")}
                />
              </div>
            )}

            {canPay && (
              <div className="mt-7">
                <PayNowButton
                  orderId={orderId}
                  token={payToken}
                  kind="donation"
                  label={
                    status === "pending" ? t("pay_now", { amount }) : t("retry")
                  }
                />
              </div>
            )}

            {status === "success" && (
              <div className="mt-10 rounded-2xl border border-primary/25 bg-primary/[0.06] p-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <FileText
                    className="size-4 text-primary"
                    aria-hidden="true"
                  />
                  {t("tax_title")}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t("tax_body", {
                    pan: DONATION_COMPLIANCE.pan,
                    urn: DONATION_COMPLIANCE.eightyGUrn,
                  })}
                </p>
                {!donation.pan && (
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {t("tax_no_pan", { email: ORG.email })}
                  </p>
                )}
              </div>
            )}
          </div>

          <Panel className="p-5 sm:p-6">
            <dl>
              <Row label={t("receipt_no")} value={donation.orderId} mono />
              <Row label={t("seva")} value={sevaTitle} />
              <Row label={t("donor")} value={donation.name} />
              <Row
                label={
                  status === "success" ? t("amount_paid") : t("amount_due")
                }
                value={amount}
              />
              <Row label={t("paid_on")} value={paidOn} />
              <Row
                label={t("payment_mode")}
                value={donation.payment?.paymentMode}
              />
              <Row
                label={t("payment_ref")}
                value={donation.payment?.trackingId}
                mono
              />
              {/* The PIN is part of the address the donor typed, so it is
                  already in this line. */}
              <Row label={t("address")} value={donation.address} />
              <Row label={t("pan")} value={donation.pan} mono />
            </dl>

            {status === "success" && (
              <p className="mt-4 flex items-start gap-2 rounded-lg bg-emerald-500/10 px-3 py-2.5 text-xs leading-relaxed text-emerald-700 dark:text-emerald-400">
                <Mail className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                {t("email_note")}
              </p>
            )}

            <p className="mt-3 flex items-start gap-2 rounded-lg bg-primary/8 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
              <Bookmark
                className="mt-0.5 size-3.5 shrink-0 text-primary"
                aria-hidden="true"
              />
              {t("save_note")}
            </p>
          </Panel>
        </div>

        <Link
          href="/donate"
          className="mt-12 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          {t("back_donate")}
        </Link>
      </div>
    </div>
  );
}
