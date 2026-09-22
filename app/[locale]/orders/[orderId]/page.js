import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, Ban, Bookmark, CircleCheck, CircleX, Clock3, FlaskConical, Mail } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { dbConnect } from "@/lib/db/connect";
import { getOptionalAuth } from "@/lib/auth-config";
import Enrollment from "@/models/Enrollment";
import { formatINR, getCourse, modeOf, whatsappGroupFor } from "@/lib/courses/catalog";
import { paymentMode } from "@/lib/payments/razorpay";
import { orderToken, receiptPath, verifyOrderToken } from "@/lib/payments/order-link";
import { receiptFilename } from "@/lib/payments/receipt";
import { Panel } from "@/components/site/Panel";
import { WhatsappIcon } from "@/components/site/WhatsappIcon";
import { PayNowButton } from "@/components/payments/PayNowButton";
import { ReceiptDownload } from "@/components/payments/ReceiptDownload";

/**
 * An order's status page — the success screen after payment, and the place
 * to finish paying after a declined card or a cancelled checkout.
 *
 * Reached by a signed link (?t=…) from the gateway redirect, the confirmation
 * email and the checkout itself. A signed-in member can also open their own
 * orders without the token, which is what a future "my courses" list will link
 * to. Anyone else gets a 404, whether or not the order exists.
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
  pending: { Icon: Clock3, bubble: "bg-primary/15 text-primary", glow: "bg-brand-gold/20" },
  failed: { Icon: CircleX, bubble: "bg-destructive/12 text-destructive", glow: "bg-destructive/10" },
  aborted: { Icon: Ban, bubble: "bg-muted text-muted-foreground", glow: "bg-brand-gold/10" },
};

function Row({ label, value, mono }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-3 last:border-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={`text-end text-sm font-semibold ${mono ? "font-mono tracking-tight" : ""}`}>{value}</dd>
    </div>
  );
}

export default async function OrderPage({ params, searchParams }) {
  const { locale, orderId } = await params;
  const { t: token } = await searchParams;
  setRequestLocale(locale);

  await dbConnect();
  const enrollment = await Enrollment.findOne({ orderId }).lean();
  if (!enrollment) notFound();

  let allowed = await verifyOrderToken(orderId, token);
  if (!allowed && enrollment.clerkId) {
    const { userId } = await getOptionalAuth();
    allowed = Boolean(userId) && userId === enrollment.clerkId;
  }
  if (!allowed) notFound();

  const t = await getTranslations("order");
  const course = getCourse(enrollment.courseSlug);
  const status = enrollment.payment?.status || "pending";
  const view = PRESENTATION[status] ?? PRESENTATION.pending;
  const canPay = status !== "success" && Boolean(paymentMode());

  const [receipt, whatsappUrl, payToken] = await Promise.all([
    status === "success" ? receiptPath(orderId) : null,
    status === "success" ? whatsappGroupFor(course) : null,
    canPay ? orderToken(orderId) : null,
  ]);

  const firstName = enrollment.name.split(" ")[0];
  const courseTitle = enrollment.courseTitle?.[locale] || course?.title?.[locale] || enrollment.courseSlug;
  const mode = course ? modeOf(course, enrollment.mode) : null;
  const amount = formatINR(enrollment.amount);

  const copy = {
    success: [t("success_title", { name: firstName }), t("success_body", { course: courseTitle, email: enrollment.email })],
    pending: canPay
      ? [t("pending_title"), t("pending_body")]
      : [t("pending_wait_title"), t("pending_wait_body")],
    failed: [t("failed_title"), t("failed_body")],
    aborted: [t("aborted_title"), t("aborted_body")],
  };
  const [title, body] = copy[status] ?? copy.pending;

  const paidOn = enrollment.payment?.paidAt
    ? new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      }).format(new Date(enrollment.payment.paidAt))
    : null;

  const simulated = enrollment.payment?.provider === "simulated";

  return (
    <div className="relative overflow-hidden">
      <div
        className={`pointer-events-none absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full blur-3xl ${view.glow}`}
        aria-hidden="true"
      />

      <div className="relative mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-start lg:gap-12">
          <div>
            <span className={`flex size-16 items-center justify-center rounded-full ${view.bubble}`}>
              <view.Icon className="size-8" aria-hidden="true" />
            </span>

            <p className="mt-6 text-xs font-semibold tracking-wider text-primary uppercase">{courseTitle}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h1>
            <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-muted-foreground">{body}</p>

            {simulated && (
              <p className="mt-4 flex items-start gap-2 rounded-lg border border-dashed border-primary/40 px-3 py-2 text-xs text-muted-foreground">
                <FlaskConical className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
                {t("test_payment")}
              </p>
            )}

            {whatsappUrl && (
              <div className="mt-7 rounded-2xl border border-[#25D366]/35 bg-[#25D366]/[0.07] p-5">
                <p className="text-sm font-semibold">{t("whatsapp_title")}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t("whatsapp_body")}</p>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#25D366] text-base font-semibold text-white shadow-lg shadow-[#25D366]/25 transition-colors hover:bg-[#1da851] focus-visible:ring-3 focus-visible:ring-[#25D366]/50 focus-visible:outline-none"
                >
                  <WhatsappIcon className="size-5" />
                  {t("whatsapp_cta")}
                </a>
              </div>
            )}

            {receipt && (
              <div className="mt-4">
                <ReceiptDownload
                  url={receipt}
                  filename={receiptFilename(enrollment)}
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
                  label={status === "pending" ? t("pay_now", { price: amount }) : t("retry")}
                />
              </div>
            )}

            {status === "success" && (
              <div className="mt-10">
                <h2 className="text-sm font-semibold">{t("next_title")}</h2>
                <ol className="mt-4 grid gap-3">
                  {[
                    enrollment.mode === "online" ? t("next_online") : t("next_offline"),
                    t("next_receipt"),
                  ].map((step, index) => (
                    <li key={index} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/12 text-xs font-bold text-primary">
                        {index + 2}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          <Panel className="p-5 sm:p-6">
            <dl>
              <Row label={t("order_id")} value={enrollment.orderId} mono />
              <Row label={t("course")} value={courseTitle} />
              <Row label={t("participant")} value={enrollment.name} />
              <Row label={t("attending")} value={mode?.label?.[locale]} />
              <Row label={status === "success" ? t("amount_paid") : t("amount_due")} value={amount} />
              <Row label={t("paid_on")} value={paidOn} />
              <Row label={t("payment_mode")} value={enrollment.payment?.paymentMode} />
              <Row label={t("payment_ref")} value={enrollment.payment?.trackingId} mono />
            </dl>

            {status === "success" && (
              <p className="mt-4 flex items-start gap-2 rounded-lg bg-emerald-500/10 px-3 py-2.5 text-xs leading-relaxed text-emerald-700 dark:text-emerald-400">
                <Mail className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                {t("email_note")}
              </p>
            )}
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-primary/8 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
              <Bookmark className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
              {t("save_note")}
            </p>
          </Panel>
        </div>

        <Link
          href={course ? `/courses/${course.slug}` : "/courses"}
          className="mt-12 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          {t("back_course")}
        </Link>
      </div>
    </div>
  );
}
