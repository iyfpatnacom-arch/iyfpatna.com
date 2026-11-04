import { setRequestLocale, getTranslations } from "next-intl/server";
import {
  BanknoteArrowUp,
  BookOpen,
  GraduationCap,
  HandCoins,
  HeartHandshake,
  LineChart,
  ReceiptText,
  TriangleAlert,
  Users,
} from "lucide-react";
import { Panel } from "@/components/site/Panel";
import { Link } from "@/i18n/navigation";
import { DonationsChart } from "@/components/admin/DonationsChart";
import { DonationsTable } from "@/components/admin/DonationsTable";
import {
  clerkConfigured,
  getAdminUser,
  redirectSignedOut,
} from "@/lib/auth-config";
import { dbConnect } from "@/lib/db/connect";
import { formatINR } from "@/lib/courses/catalog";
import { DONATION_SCOPES, adminDonationOverview } from "@/lib/donations/stats";
import { cn } from "@/lib/utils";
import Donation from "@/models/Donation";

/**
 * /admin/donations — every offering made through this site, in one place.
 *
 * The question this page exists to answer is the one an admin actually arrives
 * with: how much has come in, towards what, from whom, and is anything broken.
 * Every seva is here — the general donate page, the three Pitru Paksha sevas,
 * a Gita Marathon sponsorship, a festival gift — because they are all rows in
 * one collection and splitting the view per campaign would mean the temple's
 * own total lived nowhere.
 *
 * The figures come from `lib/donations/stats.js` and are counted in the
 * database. The transactions table is the exception: it loads the rows and
 * hands them to the browser, because an admin searches and exports them and
 * both of those want the whole list in memory — the same trade the
 * registrations and marathon tables make.
 *
 * Two deliberate asymmetries, both stated on the page itself rather than left
 * for somebody to discover:
 *
 *   The tiles are scoped and the table is not. A list that shrank with the
 *   range would make "find the donation this donor is calling about" the one
 *   thing the page could not do.
 *
 *   The chart is always the last thirty days. "Today" is one bar, which is not
 *   a chart, and all time is an axis nobody can read on a phone.
 *
 * `payment.raw` and `meta` are left behind. They are the bulk of every row and
 * nothing here reads them.
 */
export const dynamic = "force-dynamic";

function Stat({ label, value, hint, Icon, tone }) {
  return (
    <Panel className="p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {Icon && <Icon className="size-3.5 shrink-0" aria-hidden="true" />}
        {label}
      </p>
      <p className={cn("mt-1 text-2xl font-semibold tracking-tight", tone)}>
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
          {hint}
        </p>
      ) : null}
    </Panel>
  );
}

/** One donation row, as the browser needs it — and nothing more. */
function toRow(doc, locale) {
  const payment = doc.payment || {};
  return {
    orderId: doc.orderId,
    sevaKey: doc.sevaKey,
    sevaTitle:
      doc.sevaTitle?.[locale] || doc.sevaTitle?.en || doc.sevaSlug || doc.sevaKey,
    amount: doc.amount,
    name: doc.name,
    phone: doc.phone,
    email: doc.email,
    address: doc.address,
    pincode: doc.pincode,
    pan: doc.pan || null,
    clerkId: doc.clerkId || null,
    createdAt: new Date(doc.createdAt).toISOString(),
    paidAt: payment.paidAt ? new Date(payment.paidAt).toISOString() : null,
    status: payment.status || "pending",
    provider: payment.provider || null,
    paymentMode: payment.paymentMode || null,
    trackingId: payment.trackingId || null,
    bankRefNo: payment.bankRefNo || null,
    failureMessage: payment.failureMessage || null,
    mismatch: Boolean(payment.amountMismatch),
    emailSent: Boolean(doc.notifications?.emailSent),
  };
}

export default async function AdminDonationsPage({ params, searchParams }) {
  const { locale } = await params;
  const { scope: requested } = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations("admin");

  await redirectSignedOut(locale);
  const admin = clerkConfigured ? await getAdminUser() : null;
  if (!admin) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <Panel className="p-10 text-muted-foreground">
          {t("don_not_admin")}
        </Panel>
      </div>
    );
  }

  const scope = DONATION_SCOPES.includes(requested) ? requested : "fy";

  let overview = null;
  let rows = [];
  let failed = false;
  try {
    await dbConnect();
    const [data, docs] = await Promise.all([
      adminDonationOverview({ scope }),
      Donation.find({})
        .select("-payment.raw -meta -notifications.attempts")
        .sort({ createdAt: -1 })
        .lean(),
    ]);
    overview = data;
    rows = docs.map((doc) => toRow(doc, locale));
  } catch (error) {
    console.error("[admin/donations] load failed", error);
    failed = true;
  }

  if (failed || !overview) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:px-10 md:py-14">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {t("don_title")}
        </h1>
        <Panel className="mt-8 p-8 text-center text-muted-foreground">
          {t("don_load_failed")}
        </Panel>
      </div>
    );
  }

  const { totals, todayTotals, sevas, series, donors, other } = overview;

  /* The seva filter is built from the rows rather than from the scoped
     breakdown, so narrowing the range never removes a seva from the list of
     things the table can be narrowed by. */
  const sevaOptions = [
    ...new Map(rows.map((row) => [row.sevaKey, row.sevaTitle])).entries(),
  ]
    .map(([key, title]) => ({ key, title }))
    .sort((a, b) => a.title.localeCompare(b.title));

  const sevaMax = sevas.reduce((top, row) => Math.max(top, row.amount), 0);
  const modeTotal = totals.modes.reduce((sum, row) => sum + row.amount, 0);

  const lastGift = new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:px-10 md:py-14">
      <div className="min-w-0">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {t("don_title")}
        </h1>
        <p className="mt-2 text-muted-foreground">{t("don_subtitle")}</p>
      </div>

      {/* The range scopes every figure and the breakdowns below it — one row
          of controls above the content, as a dashboard should have. */}
      <nav className="mt-6 flex flex-wrap gap-2" aria-label={t("don_title")}>
        {DONATION_SCOPES.map((key) => (
          <Link
            key={key}
            href={`/admin/donations?scope=${key}`}
            aria-current={key === scope ? "page" : undefined}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              key === scope
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`don_scope_${key}`)}
          </Link>
        ))}
      </nav>

      {/* ----------------------------------------------------------- stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          Icon={HandCoins}
          label={t("don_stat_collected")}
          value={formatINR(totals.amount)}
          hint={t("don_stat_collected_hint", { count: totals.count })}
        />
        <Stat
          Icon={Users}
          label={t("don_stat_donors")}
          value={totals.donorCount}
          hint={t("don_stat_donors_hint", { amount: totals.average })}
        />
        <Stat
          label={t("don_stat_today")}
          value={formatINR(todayTotals.amount)}
          hint={t("don_stat_today_hint", { count: todayTotals.count })}
        />
        <Stat
          Icon={HeartHandshake}
          label={t("don_stat_largest")}
          value={formatINR(totals.largest)}
          hint={t("don_stat_largest_hint")}
        />
        <Stat
          Icon={ReceiptText}
          label={t("don_stat_pan")}
          value={totals.withPan}
          hint={t("don_stat_pan_hint", {
            count: Math.max(0, totals.count - totals.withPan),
          })}
        />
        <Stat
          label={t("don_stat_emailed")}
          value={totals.emailed}
          hint={t("don_stat_emailed_hint", {
            count: Math.max(0, totals.count - totals.emailed),
          })}
          /* An unsent receipt is a donor with no tax document, which is the
             one gap on this page somebody has to act on by hand. */
          tone={
            totals.count > totals.emailed
              ? "text-amber-600 dark:text-amber-400"
              : undefined
          }
        />
        <Stat
          label={t("don_stat_pending")}
          value={formatINR(totals.pending.amount)}
          hint={t("don_stat_pending_hint", { count: totals.pending.count })}
        />
        {/* Settled attempts over all attempts — coloured only when it is low
            enough to mean something is wrong with the form or the gateway,
            and only once there are enough attempts for the ratio to say
            anything at all. */}
        <Stat
          label={t("don_stat_rate")}
          value={`${totals.successRate}%`}
          hint={t("don_stat_rate_hint", { count: totals.attempts })}
          tone={
            totals.attempts >= 10 && totals.successRate < 50
              ? "text-destructive"
              : undefined
          }
        />
      </div>

      {totals.mismatched > 0 ? (
        <Panel className="mt-4 flex items-start gap-2.5 border-destructive/30 bg-destructive/5 p-4 text-sm">
          <TriangleAlert
            className="mt-0.5 size-4 shrink-0 text-destructive"
            aria-hidden="true"
          />
          <p className="text-muted-foreground">
            {t("don_mismatch_warning", { count: totals.mismatched })}
          </p>
        </Panel>
      ) : null}

      {/* -------------------------------------------- chart and how it came */}
      <section className="mt-8 grid gap-5 lg:grid-cols-3">
        <Panel className="p-5 lg:col-span-2">
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <LineChart
              className="size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            {t("don_chart_title")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("don_chart_hint")}
          </p>
          <div className="mt-4">
            <DonationsChart series={series} locale={locale} />
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <BanknoteArrowUp
              className="size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            {t("don_modes_title")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("don_modes_hint")}
          </p>

          {totals.modes.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("don_modes_empty")}
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {totals.modes.map((row) => (
                <li key={row.mode ?? "unknown"}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate">
                      {row.mode || t("don_mode_unknown")}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {formatINR(row.amount)}
                    </span>
                  </div>
                  {/* The bar is the share, so the row reads as a proportion
                      without a second number to parse. */}
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${modeTotal ? (row.amount / modeTotal) * 100 : 0}%`,
                        background: "var(--viz-online)",
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                    {t("don_modes_count", { count: row.count })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>

      {/* ------------------------------------------------------- by seva */}
      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <HeartHandshake
            className="size-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          {t("don_seva_title")}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("don_seva_hint")}
        </p>

        {sevas.length === 0 ? (
          <Panel className="mt-4 p-10 text-center text-sm text-muted-foreground">
            {t("don_seva_empty")}
          </Panel>
        ) : (
          <Panel className="mt-4 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th scope="col" className="px-3 py-2.5 text-start font-medium">
                      {t("don_col_seva")}
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-end font-medium">
                      {t("don_col_amount")}
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-start font-medium">
                      <span className="sr-only">{t("don_col_share")}</span>
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-end font-medium">
                      {t("don_col_gifts")}
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-end font-medium">
                      {t("don_col_donors")}
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-end font-medium">
                      {t("don_col_largest")}
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-start font-medium">
                      {t("don_col_last")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sevas.map((row) => (
                    <tr
                      key={row.key}
                      className="border-b border-border/50 last:border-0"
                    >
                      <td className="max-w-56 truncate px-3 py-2.5 font-medium">
                        {row.title?.[locale] || row.title?.en || row.slug}
                      </td>
                      <td className="px-3 py-2.5 text-end font-semibold tabular-nums whitespace-nowrap">
                        {formatINR(row.amount)}
                      </td>
                      <td className="w-32 px-3 py-2.5">
                        <div
                          className="h-1.5 overflow-hidden rounded-full bg-muted"
                          role="presentation"
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${sevaMax ? (row.amount / sevaMax) * 100 : 0}%`,
                              background: "var(--viz-online)",
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-end tabular-nums">
                        {row.count}
                      </td>
                      <td className="px-3 py-2.5 text-end tabular-nums">
                        {row.donorCount}
                      </td>
                      <td className="px-3 py-2.5 text-end tabular-nums whitespace-nowrap">
                        {formatINR(row.largest)}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground tabular-nums">
                        {row.lastAt ? lastGift.format(new Date(row.lastAt)) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </section>

      {/* ----------------------------------------------------- top donors */}
      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Users className="size-4 shrink-0 text-primary" aria-hidden="true" />
          {t("don_donors_title")}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("don_donors_hint")}
        </p>

        {donors.length === 0 ? (
          <Panel className="mt-4 p-10 text-center text-sm text-muted-foreground">
            {t("don_donors_empty")}
          </Panel>
        ) : (
          <Panel className="mt-4 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th scope="col" className="px-3 py-2.5 text-start font-medium">
                      {t("don_col_rank")}
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-start font-medium">
                      {t("don_col_donor")}
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-start font-medium">
                      {t("don_col_phone")}
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-end font-medium">
                      {t("don_col_amount")}
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-end font-medium">
                      {t("don_col_gifts")}
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-start font-medium">
                      {t("don_col_pan")}
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-start font-medium">
                      {t("don_col_last")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {donors.map((row, index) => (
                    <tr
                      key={row.phone}
                      className="border-b border-border/50 last:border-0"
                    >
                      <td className="px-3 py-2.5 text-muted-foreground tabular-nums">
                        {index + 1}
                      </td>
                      <td className="max-w-48 truncate px-3 py-2.5 font-medium">
                        {row.name}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">
                        {row.phone}
                      </td>
                      <td className="px-3 py-2.5 text-end font-semibold tabular-nums whitespace-nowrap">
                        {formatINR(row.amount)}
                      </td>
                      <td className="px-3 py-2.5 text-end tabular-nums">
                        {row.gifts}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap">
                        {row.pan || (
                          <span className="font-sans text-muted-foreground">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground tabular-nums">
                        {row.lastAt ? lastGift.format(new Date(row.lastAt)) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </section>

      {/* --------------------------------------------------- other income */}
      {/* Deliberately outside every total above. A book sold at a stall and a
          course fee are receipts, not offerings: neither is 80G-deductible,
          and neither may end up inside a figure the trust reports as donation
          income. They are here because "what came in through the site" is the
          question somebody arrives with, and each is a link to the screen that
          owns it. */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">
          {t("don_other_title")}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("don_other_hint")}
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link href="/admin/gita-marathon" className="group">
            <Panel className="h-full p-4 transition-colors group-hover:border-primary/40">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <BookOpen className="size-3.5 shrink-0" aria-hidden="true" />
                {t("don_other_books")}
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {formatINR(other.books.amount)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                {t("don_other_books_hint", {
                  books: other.books.books,
                  count: other.books.count,
                })}
              </p>
            </Panel>
          </Link>

          <Link href="/admin/registrations" className="group">
            <Panel className="h-full p-4 transition-colors group-hover:border-primary/40">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <GraduationCap className="size-3.5 shrink-0" aria-hidden="true" />
                {t("don_other_courses")}
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {formatINR(other.courses.amount)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                {t("don_other_courses_hint", { count: other.courses.count })}
              </p>
            </Panel>
          </Link>
        </div>
      </section>

      {/* --------------------------------------------------- transactions */}
      <DonationsTable rows={rows} sevas={sevaOptions} />
    </div>
  );
}
