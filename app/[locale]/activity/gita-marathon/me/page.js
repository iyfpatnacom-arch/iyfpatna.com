import { setRequestLocale, getTranslations } from "next-intl/server";
import {
  BanknoteArrowUp,
  CircleCheck,
  Clock3,
  LineChart,
  Trophy,
} from "lucide-react";
import { Panel } from "@/components/site/Panel";
import { CashSubmitForm } from "@/components/marathon/CashSubmitForm";
import { DailyChart } from "@/components/marathon/DailyChart";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { redirectSignedOut } from "@/lib/auth-config";
import { dbConnect } from "@/lib/db/connect";
import { formatINR } from "@/lib/courses/catalog";
import { istDayKey } from "@/lib/panchang";
import { getVolunteerStanding } from "@/lib/marathon/volunteers";
import {
  dailySeries,
  totals,
  unsettledCash,
  volunteerStanding,
} from "@/lib/marathon/stats";
import BookSale from "@/models/BookSale";
import CashSettlement from "@/models/CashSettlement";

/**
 * /activity/gita-marathon/me — one volunteer's own account of the marathon.
 *
 * Three things, in the order a volunteer wants them: where they stand, what
 * they owe tonight, and everything they have recorded.
 *
 * The standing comes first because it is why the page gets opened. The cash
 * panel comes second because it is the one thing on the page with a deadline —
 * the desk closes — and burying a deadline under a history table is how a
 * volunteer goes home with ₹2,400 in their bag. The history is last and
 * complete, because it is the only answer to "I think the board is wrong".
 *
 * Every figure comes out of `lib/marathon/stats.js`, which is also what the
 * leaderboard and the coordinator's overview read. The rank shown here is
 * computed from the same ordering the board renders, so a volunteer cannot be
 * told "#7" by one screen and shown eighth by another.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "marathon" });
  return { title: t("me_title"), robots: { index: false, follow: false } };
}

const HISTORY_LIMIT = 50;

function Stat({ label, value, hint }) {
  return (
    <Panel className="p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {hint ? (
        <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
          {hint}
        </p>
      ) : null}
    </Panel>
  );
}

export default async function MarathonMePage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("marathon");
  await redirectSignedOut(locale);

  const { state, volunteer } = await getVolunteerStanding();
  if (state === "signed_out" || state === "new" || !volunteer) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-14 sm:px-6">
        <Panel className="p-8 text-center">
          <p className="text-sm text-muted-foreground">{t("join_body")}</p>
          <Button
            className="mt-6 rounded-full"
            render={<Link href="/activity/gita-marathon" />}
          >
            {t("join_cta")}
          </Button>
        </Panel>
      </div>
    );
  }

  const clerkId = volunteer.clerkId;
  const today = istDayKey();

  await dbConnect();

  /* Everything in parallel: six independent reads, and a volunteer refreshing
     this between sales should not wait for them in sequence. */
  const [standing, mine, todayTotals, series, outstanding, settlement, history] =
    await Promise.all([
      volunteerStanding(clerkId),
      totals({ scope: "marathon", clerkId }),
      totals({ scope: "today", clerkId }),
      dailySeries({ clerkId, to: today }),
      unsettledCash(clerkId, today),
      CashSettlement.findOne({ volunteerClerkId: clerkId, dayKey: today }).lean(),
      BookSale.find({ volunteerClerkId: clerkId })
        .select("orderId quantity amount method dayKey payment.status payment.paymentMode createdAt")
        .sort({ createdAt: -1 })
        .limit(HISTORY_LIMIT)
        .lean(),
    ]);

  const when = new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });

  const variance =
    settlement?.status === "verified" ? (settlement.variance ?? 0) : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {t("me_title")}
      </h1>

      {/* ------------------------------------------------------- standing */}
      <Panel className="mt-5 flex flex-wrap items-center justify-between gap-4 border-primary/25 bg-primary/[0.05] p-5">
        <div className="flex items-center gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
            <Trophy className="size-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            {/* The rank is a hero figure, so proportional digits rather than
                tabular — `tabular-nums` gives every digit the width of a zero
                and makes a number like #12 read loose at this size. */}
            <p className="text-2xl font-semibold tracking-tight">
              {standing.rank
                ? t("me_rank", { rank: standing.rank })
                : t("me_rank_none")}
            </p>
            {standing.rank && (
              <p className="text-xs text-muted-foreground">
                {t("me_rank_of", { total: standing.total })}
              </p>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {standing.ahead
            ? t("me_behind", {
                name: standing.ahead.name,
                books: standing.ahead.books - standing.row.books,
              })
            : standing.rank === 1
              ? t("me_leading")
              : null}
        </p>
      </Panel>

      {/* ---------------------------------------------------------- totals */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label={t("me_stat_books")}
          value={mine.books}
          hint={t("me_split", { hindi: mine.hindi, english: mine.english })}
        />
        <Stat label={t("me_stat_amount")} value={formatINR(mine.amount)} />
        <Stat label={t("me_stat_cash")} value={formatINR(mine.cashAmount)} />
        <Stat
          label={t("me_stat_today")}
          value={todayTotals.books}
          hint={formatINR(todayTotals.amount)}
        />
      </div>

      {/* ----------------------------------------------------- the day's cash */}
      <Panel className="mt-6 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <BanknoteArrowUp
            className="size-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          {t("me_cash_title")}
        </h2>

        {settlement ? (
          <div className="mt-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              {settlement.status === "verified" ? (
                <CircleCheck
                  className="size-4 text-emerald-600 dark:text-emerald-400"
                  aria-hidden="true"
                />
              ) : (
                <Clock3 className="size-4 text-primary" aria-hidden="true" />
              )}
              {settlement.status === "verified"
                ? t("me_cash_verified_title")
                : t("me_cash_submitted_title")}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground tabular-nums">
              {settlement.status === "verified"
                ? t("me_cash_verified_body", {
                    received: settlement.receivedAmount ?? 0,
                    expected: settlement.expectedAmount,
                  })
                : t("me_cash_submitted_body", {
                    declared: settlement.declaredAmount,
                    expected: settlement.expectedAmount,
                  })}
            </p>
            {variance !== null && (
              <p className="mt-3 inline-flex rounded-full bg-muted px-3 py-1 text-xs font-medium tabular-nums">
                {variance === 0
                  ? t("me_cash_exact")
                  : variance > 0
                    ? t("me_cash_excess", { amount: variance })
                    : t("me_cash_deficit", { amount: -variance })}
              </p>
            )}
            {/* A sale made after the handover is a fresh debt, not part of the
                settled day — which is exactly what `settlementId: null` means
                on those rows, so it is worth saying out loud here. */}
            {outstanding.count > 0 && (
              <p className="mt-4 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 tabular-nums dark:text-amber-400">
                {t("me_cash_due", {
                  count: outstanding.count,
                  amount: outstanding.amount,
                })}
              </p>
            )}
          </div>
        ) : outstanding.count > 0 ? (
          <CashSubmitForm
            expected={outstanding.amount}
            count={outstanding.count}
          />
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {t("me_cash_none")}
          </p>
        )}
      </Panel>

      {/* ------------------------------------------------------------ chart */}
      <Panel className="mt-6 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <LineChart
            className="size-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          {t("me_chart_title")}
        </h2>
        <div className="mt-4">
          <DailyChart series={series} metric="books" locale={locale} />
        </div>
      </Panel>

      {/* ---------------------------------------------------------- history */}
      <section className="mt-6">
        <h2 className="text-base font-semibold tracking-tight">
          {t("me_history_title")}
        </h2>

        {history.length === 0 ? (
          <Panel className="mt-4 p-8 text-center text-sm text-muted-foreground">
            {t("me_history_empty")}
          </Panel>
        ) : (
          <Panel className="mt-4 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th scope="col" className="px-4 py-2.5 text-start font-medium">
                      {t("me_col_when")}
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-end font-medium">
                      {t("me_col_books")}
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-end font-medium">
                      {t("me_col_amount")}
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-start font-medium">
                      {t("me_col_method")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((sale) => {
                    const status = sale.payment?.status || "pending";
                    return (
                      <tr
                        key={sale.orderId}
                        className="border-b border-border/50 last:border-0"
                      >
                        <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground tabular-nums">
                          {when.format(new Date(sale.createdAt))}
                        </td>
                        <td className="px-3 py-2.5 text-end font-semibold tabular-nums">
                          {sale.quantity}
                        </td>
                        <td className="px-3 py-2.5 text-end tabular-nums">
                          {formatINR(sale.amount)}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className="text-foreground/90">
                            {t(`method_${sale.method}`)}
                          </span>
                          {/* Only an unfinished payment is worth a word here.
                              Saying "Done" on every one of fifty rows is ink
                              for the reader to filter out. */}
                          {status !== "success" && (
                            <span className="ms-2 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                              {t(`status_${status}`)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </section>
    </div>
  );
}
