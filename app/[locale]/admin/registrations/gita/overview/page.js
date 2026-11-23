import { setRequestLocale, getTranslations } from "next-intl/server";
import {
  CalendarClock,
  GraduationCap,
  LineChart,
  Megaphone,
  ScanLine,
  Sparkles,
  Table2,
  TicketCheck,
  TriangleAlert,
  Users,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { clerkConfigured, getAdminUser, redirectSignedOut } from "@/lib/auth-config";
import { Panel } from "@/components/site/Panel";
import { GitaTrendChart } from "@/components/admin/GitaTrendChart";
import { getFestival, formatINR } from "@/lib/gita-event/catalog";
import { GITA_SCOPES, DEFAULT_GITA_SCOPE, adminGitaOverview } from "@/lib/gita-event/stats";
import { cn } from "@/lib/utils";

/**
 * /admin/registrations/gita/overview — how the Gita festival is selling.
 *
 * The register next door answers "who is this person on the phone, and have
 * they paid"; this answers "is the festival working". They are genuinely two
 * screens and not one, because the second question is never asked a row at a
 * time: it is day-over-day, per event, per referrer, per age band, and none of
 * those are visible in a table of three hundred lines however well it sorts.
 *
 * So this page is a layout and nothing else. Every figure on it is counted in
 * the database by `lib/gita-event/stats.js` — no rows are shipped to the
 * browser at all, which is the opposite trade from the register and the right
 * one here: the register's list has to be searchable, and a dashboard's
 * group-bys must not get slower every day the festival grows.
 *
 * Two deliberate asymmetries, both stated on the page itself rather than left
 * for somebody to discover:
 *
 *   The tiles are scoped and the chart is not. "Today" is one bar, which is not
 *   a chart, so the plot is always the campaign so far.
 *
 *   The live feed is not scoped either. A scope of "today" on a quiet morning
 *   would empty it, and an empty panel is indistinguishable from a broken one —
 *   its job is to prove the form is alive.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { robots: { index: false, follow: false } };
}

/* ---- Small pieces ------------------------------------------------------- */

function Stat({ label, value, hint, Icon, tone }) {
  return (
    <Panel className="p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {Icon && <Icon className="size-3.5 shrink-0" aria-hidden="true" />}
        {label}
      </p>
      <p className={cn("mt-1 text-2xl font-semibold tracking-tight tabular-nums", tone)}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">{hint}</p> : null}
    </Panel>
  );
}

/**
 * A ranked list of shares — one row per category, the bar being the proportion.
 *
 * A bar rather than a pie or a donut for every one of these: the categories are
 * close together often enough (two events, three occupations) that an angle is
 * unreadable, and a ranked bar with the number beside it is the form that
 * answers "which is biggest, and by how much" at a glance. One colour for every
 * bar, because the length already carries the magnitude — a darker-where-bigger
 * ramp would spend the only free channel on information the chart has shown.
 *
 * `total` is passed in rather than summed from the rows, so the share is of the
 * registration count and not of the top twelve: a leaderboard whose bars add to
 * 100% is a leaderboard claiming it is the whole list.
 */
function Shares({ rows, total, empty }) {
  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>;
  }

  return (
    <ul className="mt-4 space-y-3">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate" title={row.label}>
              {row.label}
            </span>
            <span className="shrink-0 font-semibold tabular-nums">{row.count}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{
                width: `${total ? Math.max(2, (row.count / total) * 100) : 0}%`,
                background: "var(--viz-online)",
              }}
            />
          </div>
          {row.hint ? (
            <p className="mt-1 text-xs text-muted-foreground tabular-nums">{row.hint}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/* ---- The page ----------------------------------------------------------- */

export default async function GitaOverviewPage({ params, searchParams }) {
  const { locale } = await params;
  const { scope: requested } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  await redirectSignedOut(locale);
  const admin = clerkConfigured ? await getAdminUser() : null;
  if (!admin) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <Panel className="p-10 text-muted-foreground">{t("don_not_admin")}</Panel>
      </div>
    );
  }

  const festival = getFestival();
  const festivalTitle = festival.title[locale] || festival.title.en;
  const scope = GITA_SCOPES.includes(requested) ? requested : DEFAULT_GITA_SCOPE;

  let overview = null;
  let failed = false;
  try {
    overview = await adminGitaOverview({ scope });
  } catch (error) {
    console.error("[admin/registrations/gita/overview] load failed", error);
    failed = true;
  }

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          {t("gita_ov_title")}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {t("gita_ov_subtitle", { festival: festivalTitle })}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/registrations/gita"
          className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40"
        >
          <Table2 className="size-4" aria-hidden="true" />
          {t("gita_ov_open_register")}
        </Link>
        <Link
          href="/admin/registrations/scan"
          className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <ScanLine className="size-4" aria-hidden="true" />
          {t("reg_scan_cta")}
        </Link>
      </div>
    </div>
  );

  if (failed || !overview) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:px-10 md:py-14">
        {header}
        <Panel className="mt-8 p-8 text-center text-muted-foreground">{t("reg_load_failed")}</Panel>
      </div>
    );
  }

  const { totals, todayTotals, events, series, referrals, institutions, coverage, demographics, recent } =
    overview;

  const dateTime = new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });

  const eventLabel = (event) => event.title[locale] || event.title.en;
  /* Per event, the share is of the paid registration count and not of the sum
     of the rows: somebody registered for both is counted under each, so the
     bars deliberately add to more than 100% and the panel's hint says why. */
  const eventRows = events.map((event) => ({
    key: event.key,
    label: eventLabel(event),
    count: event.registrations,
    hint: t("gita_ov_events_row_hint", {
      solo: event.solo,
      today: event.attendedToday,
      ever: event.attendedEver,
    }),
  }));

  const labelled = (rows, label) =>
    rows.map((row) => ({ key: String(row.key ?? "unknown"), label: label(row.key), count: row.count }));

  const occupationRows = labelled(demographics.occupation, (key) =>
    key ? t(`reg_occ_${key}`) : t("gita_ov_not_given"),
  );
  const genderRows = labelled(demographics.gender, (key) =>
    key ? t(`gita_gender_${key}`) : t("gita_ov_not_given"),
  );
  const ageRows = labelled(demographics.age, (key) => t(`gita_ov_age_${key}`));

  const textRows = (rows) =>
    rows.map((row) => ({ key: row.key, label: row.label, count: row.count }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:px-10 md:py-14">
      {header}

      {/* The range scopes every tile and every breakdown below it — one row of
          controls above the content, as a dashboard should have. */}
      <nav className="mt-6 flex flex-wrap gap-2" aria-label={t("gita_ov_title")}>
        {GITA_SCOPES.map((key) => (
          <Link
            key={key}
            href={`/admin/registrations/gita/overview?scope=${key}`}
            aria-current={key === scope ? "page" : undefined}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              key === scope
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`gita_ov_scope_${key}`)}
          </Link>
        ))}
      </nav>

      {/* ------------------------------------------------------------ tiles */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          Icon={TicketCheck}
          label={t("gita_ov_stat_paid")}
          value={totals.count}
          hint={t("gita_ov_stat_paid_hint", { count: totals.attempts })}
        />
        <Stat
          label={t("reg_stat_collected")}
          value={formatINR(totals.amount)}
          hint={t("gita_ov_stat_collected_hint", { amount: formatINR(totals.average) })}
        />
        <Stat
          Icon={CalendarClock}
          label={t("gita_ov_stat_today")}
          value={todayTotals.count}
          hint={t("gita_ov_stat_today_hint", { amount: formatINR(todayTotals.amount) })}
        />
        <Stat
          Icon={Sparkles}
          label={t("gita_ov_stat_combo")}
          value={totals.combo}
          hint={t("gita_ov_stat_combo_hint", { amount: formatINR(totals.saved) })}
        />
        {/* Paid attempts over all attempts — coloured only when it is low
            enough to mean the form or the gateway is in trouble, and only once
            there are enough attempts for the ratio to say anything at all. */}
        <Stat
          label={t("gita_ov_stat_rate")}
          value={`${totals.successRate}%`}
          hint={t("gita_ov_stat_rate_hint", { count: totals.attempts })}
          tone={
            totals.attempts >= 10 && totals.successRate < 50 ? "text-destructive" : undefined
          }
        />
        <Stat
          label={t("reg_stat_pending")}
          value={totals.pending.count}
          hint={t("gita_ov_stat_pending_hint", { amount: formatINR(totals.pending.amount) })}
        />
        {/* An unsent confirmation is somebody holding a pass with no WhatsApp
            group link, which is the one gap on this page a human has to close
            by hand. */}
        <Stat
          label={t("gita_ov_stat_emailed")}
          value={totals.emailed}
          hint={t("gita_ov_stat_emailed_hint", {
            count: Math.max(0, totals.count - totals.emailed),
          })}
          tone={
            totals.count > totals.emailed ? "text-amber-600 dark:text-amber-400" : undefined
          }
        />
        <Stat
          Icon={Users}
          label={t("gita_ov_stat_here")}
          value={totals.hereToday}
          hint={
            totals.lastAt
              ? t("gita_ov_stat_last", { when: dateTime.format(new Date(totals.lastAt)) })
              : undefined
          }
        />
      </div>

      {totals.mismatched > 0 ? (
        <Panel className="mt-4 flex items-start gap-2.5 border-destructive/30 bg-destructive/5 p-4 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
          <p className="text-muted-foreground">
            {t("gita_ov_mismatch_warning", { count: totals.mismatched })}
          </p>
        </Panel>
      ) : null}

      {/* Two paid rows for one phone is two passes and two lines in the
          register. The register allows exactly one, so this can only mean
          something wrote a second — worth seeing, and never worth hiding. */}
      {totals.peopleCount > 0 && totals.peopleCount !== totals.count ? (
        <Panel className="mt-4 flex items-start gap-2.5 border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <TriangleAlert
            className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
            aria-hidden="true"
          />
          <p className="text-muted-foreground">
            {t("gita_ov_duplicate_warning", {
              people: totals.peopleCount,
              count: totals.count,
            })}
          </p>
        </Panel>
      ) : null}

      {/* ---------------------------------------------- chart + event split */}
      <section className="mt-8 grid gap-5 lg:grid-cols-3">
        <Panel className="p-5 lg:col-span-2">
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <LineChart className="size-4 shrink-0 text-primary" aria-hidden="true" />
            {t("gita_ov_chart_title")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("gita_ov_chart_hint")}</p>
          <div className="mt-4">
            <GitaTrendChart series={series} locale={locale} />
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <TicketCheck className="size-4 shrink-0 text-primary" aria-hidden="true" />
            {t("gita_ov_events_title")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("gita_ov_events_hint")}</p>
          <Shares rows={eventRows} total={totals.count} empty={t("gita_ov_empty")} />
        </Panel>
      </section>

      {/* ------------------------------------------------------------ reach */}
      <section className="mt-8 grid gap-5 lg:grid-cols-2">
        <Panel className="p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <Megaphone className="size-4 shrink-0 text-primary" aria-hidden="true" />
            {t("gita_ov_referral_title")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("gita_ov_referral_hint", {
              named: coverage.withReferral,
              count: coverage.count,
            })}
          </p>
          <Shares rows={textRows(referrals)} total={totals.count} empty={t("gita_ov_empty")} />
        </Panel>

        <Panel className="p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <GraduationCap className="size-4 shrink-0 text-primary" aria-hidden="true" />
            {t("gita_ov_institution_title")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("gita_ov_institution_hint", {
              named: coverage.withInstitution,
              count: coverage.count,
            })}
          </p>
          <Shares rows={textRows(institutions)} total={totals.count} empty={t("gita_ov_empty")} />
        </Panel>
      </section>

      {/* -------------------------------------------------------- who comes */}
      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Users className="size-4 shrink-0 text-primary" aria-hidden="true" />
          {t("gita_ov_who_title")}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("gita_ov_who_hint")}</p>

        <div className="mt-4 grid gap-5 md:grid-cols-3">
          <Panel className="p-5">
            <h3 className="text-sm font-semibold tracking-tight">{t("reg_d_occupation")}</h3>
            <Shares rows={occupationRows} total={totals.count} empty={t("gita_ov_empty")} />
          </Panel>
          <Panel className="p-5">
            <h3 className="text-sm font-semibold tracking-tight">{t("gita_d_gender")}</h3>
            <Shares rows={genderRows} total={totals.count} empty={t("gita_ov_empty")} />
          </Panel>
          <Panel className="p-5">
            <h3 className="text-sm font-semibold tracking-tight">{t("gita_ov_age_title")}</h3>
            <Shares rows={ageRows} total={totals.count} empty={t("gita_ov_empty")} />
          </Panel>
        </div>
      </section>

      {/* ------------------------------------------------------- live feed */}
      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <CalendarClock className="size-4 shrink-0 text-primary" aria-hidden="true" />
          {t("gita_ov_recent_title")}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("gita_ov_recent_hint")}</p>

        {recent.length === 0 ? (
          <Panel className="mt-4 p-10 text-center text-sm text-muted-foreground">
            {t("gita_empty")}
          </Panel>
        ) : (
          <Panel className="mt-4 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th scope="col" className="px-3 py-2.5 text-start font-medium">
                      {t("don_col_when")}
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-start font-medium">
                      {t("reg_col_name")}
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-start font-medium">
                      {t("gita_col_events")}
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-end font-medium">
                      {t("don_col_amount")}
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-start font-medium">
                      {t("reg_filter_status")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((row) => (
                    <tr key={row.orderId} className="border-t border-border/60">
                      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground tabular-nums">
                        {dateTime.format(new Date(row.createdAt))}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-medium text-foreground">{row.name}</span>
                        <span className="ml-2 font-mono text-xs text-muted-foreground">
                          {row.orderId}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {row.events
                          .map((key) => {
                            const event = events.find((item) => item.key === key);
                            return event ? eventLabel(event) : key;
                          })
                          .join(" + ")}
                      </td>
                      <td className="px-3 py-2.5 text-end tabular-nums">
                        {formatINR(row.amount)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={cn(
                            "text-xs font-medium",
                            row.status === "success"
                              ? "text-emerald-700 dark:text-emerald-400"
                              : row.status === "pending"
                                ? "text-amber-700 dark:text-amber-400"
                                : "text-destructive",
                          )}
                        >
                          {t(`reg_status_${row.status}`)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </section>
    </div>
  );
}
