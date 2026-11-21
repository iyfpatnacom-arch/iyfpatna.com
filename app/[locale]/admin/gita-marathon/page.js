import { setRequestLocale, getTranslations } from "next-intl/server";
import {
  BanknoteArrowDown,
  BookOpen,
  LineChart,
  Scale,
  Trophy,
  Users,
} from "lucide-react";
import { Panel } from "@/components/site/Panel";
import { Button } from "@/components/ui/button";
import { DailyChart } from "@/components/marathon/DailyChart";
import { MarathonTransactions } from "@/components/admin/MarathonTransactions";
import { Link } from "@/i18n/navigation";
import {
  clerkConfigured,
  getAdminUser,
  redirectSignedOut,
} from "@/lib/auth-config";
import { dbConnect } from "@/lib/db/connect";
import { formatINR } from "@/lib/courses/catalog";
import { adminOverview } from "@/lib/marathon/stats";
import { cn } from "@/lib/utils";
import BookSale from "@/models/BookSale";

/**
 * /admin/gita-marathon — the coordinator's whole view of the drive.
 *
 * Four questions, in the order they get asked: how many books went out, who
 * put them out, where the money is, and what happened in any one transaction.
 *
 * The figures come from `lib/marathon/stats.js`, which is also what the
 * volunteers' own screens read, so this page and the leaderboard a volunteer
 * is looking at cannot disagree. The transactions table is the exception: it
 * loads the rows and hands them to the browser, because the coordinator
 * searches and exports them and both of those want the whole list in memory.
 *
 * `payment.raw` is left behind. It is the bulk of every online row and nothing
 * here reads it.
 */
export const dynamic = "force-dynamic";

const SCOPES = ["marathon", "today", "all"];

function Stat({ label, value, hint, Icon, tone }) {
  return (
    <Panel className="p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {Icon && <Icon className="size-3.5 shrink-0" aria-hidden="true" />}
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tracking-tight",
          tone,
        )}
      >
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

function toRow(doc) {
  const payment = doc.payment || {};
  return {
    orderId: doc.orderId,
    dayKey: doc.dayKey,
    createdAt: new Date(doc.createdAt).toISOString(),
    volunteerName: doc.volunteerName,
    quantity: doc.quantity,
    titles: (doc.items || [])
      .map((item) => `${item.quantity} × ${item.title?.en || item.bookKey}`)
      .join(", "),
    amount: doc.amount,
    method: doc.method,
    status: payment.status || "pending",
    paymentMode: payment.paymentMode || null,
    trackingId: payment.trackingId || null,
    bankRefNo: payment.bankRefNo || null,
    /* The volunteer's word that a UPI transfer landed, and whether anybody
       has since found it on the statement. Only ever set on an online sale;
       null on a cash one, where the reconciliation is a count of notes. */
    claimKind: doc.claim?.kind || null,
    claimReference: doc.claim?.reference || "",
    claimMatched: Boolean(doc.claim?.verifiedAt),
    buyerName: doc.buyer?.name || "",
    buyerPhone: doc.buyer?.phone || "",
    note: doc.note || "",
    settled: Boolean(doc.settlementId),
  };
}

export default async function AdminMarathonPage({ params, searchParams }) {
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
          {t("mar_not_admin")}
        </Panel>
      </div>
    );
  }

  const scope = SCOPES.includes(requested) ? requested : "marathon";

  let overview = null;
  let rows = [];
  let failed = false;
  try {
    await dbConnect();
    const [data, docs] = await Promise.all([
      adminOverview({ scope }),
      BookSale.find({})
        .select("-payment.raw -qr")
        .sort({ createdAt: -1 })
        .lean(),
    ]);
    overview = data;
    rows = docs.map(toRow);
  } catch (error) {
    console.error("[admin/gita-marathon] load failed", error);
    failed = true;
  }

  if (failed || !overview) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:px-10 md:py-14">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {t("mar_title")}
        </h1>
        <Panel className="mt-8 p-8 text-center text-muted-foreground">
          {t("mar_load_failed")}
        </Panel>
      </div>
    );
  }

  const { totals, todayTotals, leaderboard, series, volunteers, cash } =
    overview;

  const lastSale = new Intl.DateTimeFormat(
    locale === "hi" ? "hi-IN" : "en-IN",
    { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" },
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:px-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            {t("mar_title")}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("mar_subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="rounded-full"
            render={<Link href="/admin/gita-marathon/volunteers" />}
          >
            <Users className="size-4" aria-hidden="true" />
            {t("mar_vol_title")}
            {volunteers.pending > 0 && (
              <span className="ms-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground tabular-nums">
                {volunteers.pending}
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            className="rounded-full"
            render={<Link href="/admin/gita-marathon/cash" />}
          >
            <BanknoteArrowDown className="size-4" aria-hidden="true" />
            {t("mar_cash_title")}
            {cash.awaitingVerification > 0 && (
              <span className="ms-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground tabular-nums">
                {cash.awaitingVerification}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* The scope scopes the figures and the charts below it — one row of
          controls above the content, as a dashboard should have. */}
      <nav className="mt-6 flex flex-wrap gap-2" aria-label={t("mar_title")}>
        {SCOPES.map((key) => (
          <Link
            key={key}
            href={`/admin/gita-marathon?scope=${key}`}
            aria-current={key === scope ? "page" : undefined}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              key === scope
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`mar_scope_${key}`)}
          </Link>
        ))}
      </nav>

      {/* ----------------------------------------------------------- stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          Icon={BookOpen}
          label={t("mar_stat_books")}
          value={totals.books}
          hint={t("mar_stat_books_hint", {
            hindi: totals.hindi,
            english: totals.english,
          })}
        />
        <Stat
          label={t("mar_stat_amount")}
          value={formatINR(totals.amount)}
          hint={t("mar_stat_amount_hint", { sales: totals.sales })}
        />
        <Stat
          label={t("mar_stat_cash")}
          value={formatINR(totals.cashAmount)}
          hint={t("mar_stat_cash_hint")}
        />
        <Stat
          label={t("mar_stat_online")}
          value={formatINR(totals.onlineAmount)}
          hint={t("mar_stat_online_hint")}
        />
        <Stat
          label={t("mar_stat_today")}
          value={todayTotals.books}
          hint={t("mar_stat_today_hint", { amount: todayTotals.amount })}
        />
        <Stat
          Icon={Users}
          label={t("mar_stat_volunteers")}
          value={volunteers.active}
          hint={t("mar_stat_volunteers_hint", { pending: volunteers.pending })}
        />
        <Stat
          Icon={BanknoteArrowDown}
          label={t("mar_stat_queue")}
          value={cash.awaitingVerification}
          hint={t("mar_stat_queue_hint")}
        />
        {/* The one figure that is allowed to be coloured, and only by its
            direction: a running deficit is the number this whole
            reconciliation exists to surface. */}
        <Stat
          Icon={Scale}
          label={t("mar_stat_variance")}
          value={`${cash.variance > 0 ? "+" : ""}${formatINR(cash.variance)}`}
          hint={t("mar_stat_variance_hint")}
          tone={
            cash.variance < 0
              ? "text-destructive"
              : cash.variance > 0
                ? "text-amber-600 dark:text-amber-400"
                : undefined
          }
        />
      </div>

      {/* ---------------------------------------------------------- charts */}
      {/* Two charts and not one. Books and rupees share no unit, so putting
          them on one pair of axes would need two y-scales — and a dual-axis
          chart invites the reader to see a relationship that is an artefact of
          where the two scales were pinned. */}
      <section className="mt-8 grid gap-5 lg:grid-cols-2">
        <Panel className="p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <LineChart
              className="size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            {t("mar_chart_books")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("mar_chart_books_hint")}
          </p>
          <div className="mt-4">
            <DailyChart series={series} metric="books" locale={locale} />
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <BanknoteArrowDown
              className="size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            {t("mar_chart_money")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("mar_chart_money_hint")}
          </p>
          <div className="mt-4">
            <DailyChart series={series} metric="money" locale={locale} />
          </div>
        </Panel>
      </section>

      {/* ----------------------------------------------------- leaderboard */}
      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Trophy className="size-4 shrink-0 text-primary" aria-hidden="true" />
          {t("mar_board_title")}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("mar_board_hint")}
        </p>

        {leaderboard.length === 0 ? (
          <Panel className="mt-4 p-10 text-center text-sm text-muted-foreground">
            {t("mar_board_empty")}
          </Panel>
        ) : (
          <Panel className="mt-4 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th scope="col" className="px-3 py-2.5 text-start font-medium">
                      {t("mar_col_rank")}
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-start font-medium">
                      {t("mar_col_volunteer")}
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-end font-medium">
                      {t("mar_col_books")}
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-end font-medium">
                      {t("mar_col_cash")}
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-end font-medium">
                      {t("mar_col_online")}
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-end font-medium">
                      {t("mar_col_total")}
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-start font-medium">
                      {t("mar_col_last")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((row, index) => (
                    <tr
                      key={row.clerkId}
                      className="border-b border-border/50 last:border-0"
                    >
                      <td className="px-3 py-2.5 text-muted-foreground tabular-nums">
                        {index + 1}
                      </td>
                      <td className="max-w-48 truncate px-3 py-2.5 font-medium">
                        {row.name}
                      </td>
                      <td className="px-3 py-2.5 text-end font-semibold tabular-nums">
                        {row.books}
                      </td>
                      <td className="px-3 py-2.5 text-end tabular-nums">
                        {formatINR(row.cashAmount)}
                      </td>
                      <td className="px-3 py-2.5 text-end tabular-nums">
                        {formatINR(row.onlineAmount)}
                      </td>
                      <td className="px-3 py-2.5 text-end font-semibold tabular-nums">
                        {formatINR(row.amount)}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground tabular-nums">
                        {row.lastAt ? lastSale.format(new Date(row.lastAt)) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </section>

      {/* ---------------------------------------------------- transactions */}
      <MarathonTransactions rows={rows} />
    </div>
  );
}
