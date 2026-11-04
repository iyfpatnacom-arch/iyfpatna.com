import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import {
  ArrowLeft,
  Ban,
  CircleCheck,
  CircleX,
  Clock3,
  Info,
} from "lucide-react";
import { Panel } from "@/components/site/Panel";
import { ReceiptDownload } from "@/components/payments/ReceiptDownload";
import { Link } from "@/i18n/navigation";
import { dbConnect } from "@/lib/db/connect";
import { formatINR } from "@/lib/courses/catalog";
import { getOwnVolunteer } from "@/lib/marathon/volunteers";
import { receiptPath, verifyOrderToken } from "@/lib/payments/order-link";
import { receiptFilename } from "@/lib/payments/pdf";
import BookSale from "@/models/BookSale";

/**
 * One book sale's own page — where Razorpay sends the payer back to.
 *
 * It exists for the reader, not the volunteer: somebody who paid for a Gita on
 * a footpath ends up here on their own phone, and this is the only thing they
 * will ever be shown that says what they paid for and proves it. So it carries
 * the receipt, and it says plainly that this was a purchase and not a donation
 * — the one fact a reader might otherwise assume, and the one an accountant
 * would later contradict.
 *
 * Reached by a signed link (?t=…) from the gateway redirect and from the sell
 * screen. The volunteer who recorded it can also open it without the token.
 * Anybody else gets a 404 whether or not the sale exists, because GM-412 is a
 * number anyone can count to and the row names a volunteer.
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
  },
  pending: { Icon: Clock3, bubble: "bg-primary/15 text-primary" },
  failed: { Icon: CircleX, bubble: "bg-destructive/12 text-destructive" },
  aborted: { Icon: Ban, bubble: "bg-muted text-muted-foreground" },
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

export default async function BookSalePage({ params, searchParams }) {
  const { locale, orderId } = await params;
  const { t: token } = await searchParams;
  setRequestLocale(locale);

  await dbConnect();
  const sale = await BookSale.findOne({ orderId }).lean();
  if (!sale) notFound();

  let allowed = await verifyOrderToken(orderId, token);
  if (!allowed) {
    /* Ownership, not permission — a volunteer who has since been switched
       off can still open their own sales. */
    const volunteer = await getOwnVolunteer();
    allowed = Boolean(volunteer) && volunteer.clerkId === sale.volunteerClerkId;
  }
  if (!allowed) notFound();

  const t = await getTranslations("marathon");

  const status = sale.payment?.status || "pending";
  const view = PRESENTATION[status] ?? PRESENTATION.pending;

  const receipt = status === "success" ? await receiptPath(orderId) : null;

  const copy = {
    success: [
      t("sale_paid_title"),
      t("sale_paid_body", { amount: sale.amount, books: sale.quantity }),
    ],
    pending: [
      t("sale_pending_title"),
      t("sale_pending_body", { amount: sale.amount }),
    ],
    failed: [t("sale_failed_title"), t("sale_failed_body")],
    aborted: [t("sale_failed_title"), t("sale_failed_body")],
  };
  const [title, body] = copy[status] ?? copy.pending;

  const paidOn = sale.payment?.paidAt
    ? new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      }).format(new Date(sale.payment.paidAt))
    : null;

  const titles = (sale.items || [])
    .map(
      (item) =>
        `${item.quantity} × ${item.title?.[locale] || item.title?.en || item.bookKey}`,
    )
    .join(", ");

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6 sm:py-16">
      <span
        className={`flex size-16 items-center justify-center rounded-full ${view.bubble}`}
      >
        <view.Icon className="size-8" aria-hidden="true" />
      </span>

      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
        {title}
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
        {body}
      </p>

      {receipt && (
        <div className="mt-7">
          <ReceiptDownload
            url={receipt}
            filename={receiptFilename(sale)}
            label={t("sale_receipt")}
          />
        </div>
      )}

      <Panel className="mt-8 p-5 sm:p-6">
        <dl>
          <Row label={t("sale_books")} value={titles} />
          <Row label={t("sale_amount")} value={formatINR(sale.amount)} />
          <Row
            label={t("sale_method")}
            value={
              sale.method === "cash"
                ? t("method_cash")
                : sale.payment?.paymentMode || t("method_online")
            }
          />
          <Row label={t("sale_when")} value={paidOn} />
          <Row label={t("sale_volunteer")} value={sale.volunteerName} />
          <Row label={t("sale_ref")} value={sale.payment?.trackingId} mono />
          <Row label={t("sale_order")} value={sale.orderId} mono />
        </dl>
      </Panel>

      {/* The same statement the PDF carries, in the same words, because this
          page is what most readers will actually look at. */}
      <p className="mt-5 flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        {t("sale_no_tax")}
      </p>

      <Link
        href="/activity/gita-marathon"
        className="mt-10 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        {t("sale_back")}
      </Link>
    </div>
  );
}
