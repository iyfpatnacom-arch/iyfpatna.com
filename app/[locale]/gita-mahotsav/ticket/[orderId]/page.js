import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import {
  ArrowLeft,
  Ban,
  Bookmark,
  CircleCheck,
  CircleX,
  Clock3,
  FlaskConical,
  Mail,
  Ticket,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { dbConnect } from "@/lib/db/connect";
import { getOptionalAuth } from "@/lib/auth-config";
import GitaRegistration from "@/models/GitaRegistration";
import {
  eventOf,
  formatINR,
  getFestival,
  whatsappGroupsFor,
} from "@/lib/gita-event/catalog";
import { gatewayChoices, paymentMode } from "@/lib/payments/gateways";
import { payableFor } from "@/lib/payments/payables";
import { orderToken, receiptPath, verifyOrderToken } from "@/lib/payments/order-link";
import { receiptFilename } from "@/lib/payments/pdf";
import { passQrSvg } from "@/lib/payments/pass";
import { Panel } from "@/components/site/Panel";
import { WhatsappIcon } from "@/components/site/WhatsappIcon";
import { PayNowButton } from "@/components/payments/PayNowButton";
import { ReceiptDownload } from "@/components/payments/ReceiptDownload";

/**
 * A Gita festival registration's own page — the success screen after payment,
 * and the place to finish paying after a declined card or a closed app.
 *
 * Reached by a signed link (?t=…) from the gateway redirect, the confirmation
 * email and the form itself. A signed-in member can open their own without the
 * token. Anyone else gets a 404, whether or not the order exists — the order IDs
 * are sequential and the page shows a phone number, an email and a working pass.
 *
 * The WhatsApp buttons are the most important thing on it. The quiz link is
 * only ever sent in the group, so a confirmed registration that never reaches
 * one has bought nothing; one button per group they are entitled to, above the
 * receipt and above everything else.
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
      <dd className={`text-end text-sm font-semibold ${mono ? "font-mono tracking-tight" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

export default async function GitaTicketPage({ params, searchParams }) {
  const { locale, orderId } = await params;
  const { t: token } = await searchParams;
  setRequestLocale(locale);

  await dbConnect();
  const row = await GitaRegistration.findOne({ orderId }).lean();
  if (!row) notFound();

  let allowed = await verifyOrderToken(orderId, token);
  if (!allowed && row.clerkId) {
    const { userId } = await getOptionalAuth();
    allowed = Boolean(userId) && userId === row.clerkId;
  }
  if (!allowed) notFound();

  const t = await getTranslations("gita");
  const tOrder = await getTranslations("order");
  const lang = locale === "en" ? "en" : "hi";
  const festival = getFestival();

  const status = row.payment?.status || "pending";
  const view = PRESENTATION[status] ?? PRESENTATION.pending;
  const canPay = status !== "success" && Boolean(paymentMode());

  const [receipt, payToken, passSvg] = await Promise.all([
    status === "success" ? receiptPath(orderId) : null,
    canPay ? orderToken(orderId) : null,
    status === "success" ? passQrSvg(orderId).catch(() => null) : null,
  ]);

  const groups = status === "success" ? whatsappGroupsFor(row.events, lang) : [];

  /* The event names off the row's own snapshot first: this page is reopened
     from a bookmark months later, by which time the catalog may have moved on. */
  const snapshots = new Map((row.eventTitles || []).map((entry) => [entry.key, entry]));
  const events = (row.events || []).map((key) => {
    const event = eventOf(key);
    return {
      key,
      title: snapshots.get(key)?.[lang] || event?.title?.[lang] || key,
      dateLabel: event?.dateLabel?.[lang] || event?.dateLabel?.en || null,
      modeLabel: event?.modeLabel?.[lang] || event?.modeLabel?.en || null,
    };
  });

  const firstName = row.name.split(" ")[0];
  const amount = formatINR(row.amount);
  const selection = events.map((event) => event.title).join(" + ");

  const copy = {
    success: [
      t("ticket_success_title", { name: firstName }),
      t("ticket_success_body", { email: row.email }),
    ],
    pending: canPay
      ? [t("ticket_pending_title"), t("ticket_pending_body")]
      : [t("ticket_pending_wait_title"), t("ticket_pending_wait_body")],
    failed: [t("ticket_failed_title"), t("ticket_failed_body")],
    aborted: [t("ticket_aborted_title"), t("ticket_aborted_body")],
  };
  const [title, body] = copy[status] ?? copy.pending;

  const paidOn = row.payment?.paidAt
    ? new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      }).format(new Date(row.payment.paidAt))
    : null;

  const simulated = row.payment?.provider === "simulated";

  return (
    <div className="relative overflow-hidden">
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
              {festival.title[lang] || festival.title.en}
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
                {tOrder("test_payment")}
              </p>
            )}

            {groups.length > 0 && (
              <div className="mt-7 rounded-2xl border border-[#25D366]/35 bg-[#25D366]/[0.07] p-5">
                <p className="text-sm font-semibold">{t("ticket_whatsapp_title")}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {t("ticket_whatsapp_body")}
                </p>
                <div className="mt-4 flex flex-col gap-2.5">
                  {groups.map((group) => (
                    <a
                      key={group.key}
                      href={group.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 text-center text-[15px] font-semibold text-white shadow-lg shadow-[#25D366]/25 transition-colors hover:bg-[#1da851] focus-visible:ring-3 focus-visible:ring-[#25D366]/50 focus-visible:outline-none"
                    >
                      <WhatsappIcon className="size-5 shrink-0" />
                      {groups.length > 1
                        ? t("ticket_whatsapp_cta_named", { event: group.title })
                        : t("ticket_whatsapp_cta")}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {receipt && (
              <div className="mt-4">
                <ReceiptDownload
                  url={receipt}
                  filename={receiptFilename(row)}
                  auto
                  label={tOrder("receipt")}
                  autoNote={tOrder("receipt_auto")}
                />
              </div>
            )}

            {canPay && (
              <div className="mt-7">
                <PayNowButton
                  orderId={orderId}
                  token={payToken}
                  kind="gita"
                  gateways={gatewayChoices(payableFor("gita").gateways)}
                  label={
                    status === "pending"
                      ? tOrder("pay_now", { price: amount })
                      : tOrder("retry")
                  }
                />
              </div>
            )}

            {status === "success" && (
              <div className="mt-10">
                <h2 className="text-sm font-semibold">{t("ticket_next_title")}</h2>
                <ol className="mt-4 grid gap-3">
                  {[t("ticket_next_group"), t("ticket_next_pass"), t("ticket_next_read")].map(
                    (step, index) => (
                      <li
                        key={index}
                        className="flex gap-3 text-sm leading-relaxed text-muted-foreground"
                      >
                        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/12 text-xs font-bold text-primary">
                          {index + 1}
                        </span>
                        {step}
                      </li>
                    ),
                  )}
                </ol>
              </div>
            )}
          </div>

          <Panel className="p-5 sm:p-6">
            <dl>
              <Row label={tOrder("order_id")} value={row.orderId} mono />
              <Row label={t("ticket_registered_for")} value={selection} />
              <Row label={tOrder("participant")} value={row.name} />
              <Row label={t("ticket_phone")} value={row.phone ? `+91 ${row.phone}` : null} />
              <Row
                label={status === "success" ? tOrder("amount_paid") : tOrder("amount_due")}
                value={amount}
              />
              <Row label={tOrder("paid_on")} value={paidOn} />
              <Row label={tOrder("payment_mode")} value={row.payment?.paymentMode} />
              <Row label={tOrder("payment_ref")} value={row.payment?.trackingId} mono />
              <Row label={t("ticket_referral")} value={row.referral} />
            </dl>

            {/* What this pass is good for, with each event's own date — the
                same list that is printed on page two of the receipt. */}
            {status === "success" && events.length > 0 && (
              <ul className="mt-4 grid gap-2">
                {events.map((event) => (
                  <li
                    key={event.key}
                    className="flex items-baseline justify-between gap-3 rounded-lg bg-primary/[0.06] px-3 py-2 text-xs"
                  >
                    <span className="font-semibold">{event.title}</span>
                    <span className="text-end text-muted-foreground">
                      {[event.modeLabel, event.dateLabel].filter(Boolean).join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {status === "success" && (
              <p className="mt-4 flex items-start gap-2 rounded-lg bg-emerald-500/10 px-3 py-2.5 text-xs leading-relaxed text-emerald-700 dark:text-emerald-400">
                <Mail className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                {tOrder("email_note")}
              </p>
            )}

            {passSvg && (
              <div className="mt-5 rounded-2xl border-2 border-dashed border-primary/35 p-5 text-center">
                <p className="flex items-center justify-center gap-2 text-sm font-semibold">
                  <Ticket className="size-4 text-primary" aria-hidden="true" />
                  {tOrder("pass_title")}
                </p>
                {/* The SVG is drawn by the qrcode library from our own URL. */}
                <div
                  className="mx-auto mt-4 w-56 max-w-full rounded-xl bg-white p-2 [&_svg]:block [&_svg]:h-auto [&_svg]:w-full"
                  role="img"
                  aria-label={tOrder("pass_alt", { orderId: row.orderId })}
                  dangerouslySetInnerHTML={{ __html: passSvg }}
                />
                <p className="mt-3 font-mono text-sm font-semibold tracking-tight">{row.orderId}</p>
                <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">
                  {t("ticket_pass_body")}
                </p>
              </div>
            )}

            <p className="mt-3 flex items-start gap-2 rounded-lg bg-primary/8 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
              <Bookmark className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
              {tOrder("save_note")}
            </p>
          </Panel>
        </div>

        <Link
          href="/gita-mahotsav"
          className="mt-12 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          {t("ticket_back")}
        </Link>
      </div>
    </div>
  );
}
