"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Info, Sunrise, Sunset } from "lucide-react";
import { Panel } from "@/components/site/Panel";
import { haptic } from "@/lib/playground/haptics";
import {
  PATNA,
  addDays,
  daysBetween,
  istDayKey,
  istTime,
  moonGlyph,
  panchangForDay,
  panchangForMonth,
  upcomingObservances,
} from "@/lib/panchang";
import { cn } from "@/lib/utils";

/**
 * The Vaishnava calendar.
 *
 * Every date on this page is computed, not typed. `lib/panchang` derives the
 * tithi from the Sun's and Moon's positions at Patna's own sunrise, which is
 * why this replaces the previous version's two hardcoded Ekadashi dates and a
 * notice apologising for them: there is no list to run out, and no year that
 * needs a developer.
 *
 * It runs entirely in the browser, so the calendar of fast days works on a
 * phone with no signal — which is when a calendar of fast days is most likely
 * to be wanted.
 */

/**
 * `todayKey` is resolved on the server and handed down rather than read from
 * the clock here. The page is server-rendered, and a component that asks
 * "what day is it?" independently on each side of hydration will eventually be
 * asked that question at two minutes to midnight and get two different
 * answers.
 */
export function VaishnavaCalendar({ todayKey }) {
  const t = useTranslations("playground.calendar");
  const locale = useLocale();

  const today = todayKey ?? istDayKey();
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(() => today.slice(0, 7));

  const day = useMemo(() => panchangForDay(selected), [selected]);
  const days = useMemo(() => {
    const [year, monthNumber] = month.split("-").map(Number);
    return panchangForMonth(year, monthNumber - 1);
  }, [month]);

  const nextFast = useMemo(() => {
    for (let offset = 0; offset < 40; offset += 1) {
      const candidate = panchangForDay(addDays(today, offset));
      if (candidate.ekadashi?.fast) return candidate;
    }
    return null;
  }, [today]);

  const upcoming = useMemo(() => upcomingObservances(today, 75), [today]);

  return (
    <div className="flex flex-col gap-5">
      <DayPanel t={t} locale={locale} day={day} isToday={day.dayKey === today} />

      {nextFast && <EkadashiPanel t={t} locale={locale} today={today} fast={nextFast} />}

      <MonthGrid
        t={t}
        locale={locale}
        month={month}
        days={days}
        today={today}
        selected={selected}
        onSelect={(dayKey) => {
          haptic("bead");
          setSelected(dayKey);
        }}
        onShift={(delta) => {
          haptic("bead");
          setMonth(shiftMonth(month, delta));
        }}
      />

      <Upcoming t={t} locale={locale} today={today} observances={upcoming} />

      <Panel tone="accent" className="p-4">
        <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>
            {t("notice")}{" "}
            <span className="text-muted-foreground">
              {t("computed_for", { place: PATNA.label[locale] })}
            </span>
          </span>
        </p>
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------ day panel */

function DayPanel({ t, locale, day, isToday }) {
  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">
            {isToday ? t("today") : formatDay(day.dayKey, locale)}
          </p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {day.tithi.name[locale]}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {day.pakshaName[locale]} · {day.month.name[locale]}
            {day.month.vedic ? ` (${day.month.vedic[locale]})` : ""}
          </p>
        </div>
        <span className="text-3xl leading-none" aria-hidden="true">
          {moonGlyph(day.moonPhase)}
        </span>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <Field label={t("tithi")}>
          {t("until", { time: istTime(day.tithi.endMs) })}
        </Field>
        <Field label={t("nakshatra")}>
          {day.nakshatra.name[locale]}{" "}
          <span className="text-muted-foreground">
            {t("until", { time: istTime(day.nakshatra.endMs) })}
          </span>
        </Field>
        <Field label={t("sunrise")} icon={<Sunrise className="size-3.5" />}>
          {istTime(day.sunriseMs)}
        </Field>
        <Field label={t("sunset")} icon={<Sunset className="size-3.5" />}>
          {istTime(day.sunsetMs)}
        </Field>
      </dl>

      {day.ekadashi?.fast && (
        <p className="mt-4 rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-2.5 text-sm font-semibold text-primary">
          {day.ekadashi.name ? `${day.ekadashi.name[locale]} · ` : ""}
          {t("fast_today")}
        </p>
      )}

      {day.parana && (
        <p className="mt-3 rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm text-foreground">
          <span className="font-semibold">{t("parana")}</span>{" "}
          <span className="tabular-nums">
            {t("parana_window", {
              start: istTime(day.parana.startMs),
              end: istTime(day.parana.endMs),
            })}
          </span>
        </p>
      )}

      {day.festivals.map((festival) => (
        <div
          key={festival.key}
          className="mt-3 rounded-xl border border-brand-purple/25 bg-brand-purple/[0.06] px-3.5 py-2.5 dark:bg-brand-purple/10"
        >
          <p className="text-sm font-semibold text-foreground">
            {festival.name[locale]}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {festival.note[locale]}
          </p>
        </div>
      ))}
    </Panel>
  );
}

function Field({ label, icon, children }) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 text-sm tabular-nums text-foreground">{children}</dd>
    </div>
  );
}

/* ------------------------------------------------------------- ekadashi */

function EkadashiPanel({ t, locale, today, fast }) {
  const away = daysBetween(today, fast.dayKey);
  // The parana belongs to the day after the fast, which is where it is stored.
  const parana = panchangForDay(addDays(fast.dayKey, 1)).parana;

  return (
    <Panel tone="accent" className="p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">
          {t("next_ekadashi")}
        </p>
        <p className="text-xs font-semibold text-foreground">
          {away === 0
            ? t("today_short")
            : away === 1
              ? t("tomorrow")
              : t("in_days", { count: away })}
        </p>
      </div>

      <p className="mt-1.5 text-lg font-semibold text-foreground">
        {fast.ekadashi.name ? fast.ekadashi.name[locale] : t("legend_ekadashi")}
      </p>
      <p className="text-sm text-muted-foreground">
        {formatDay(fast.dayKey, locale)}
      </p>

      {parana && (
        <p className="mt-3 text-sm tabular-nums text-foreground">
          {t("parana_tomorrow", {
            start: istTime(parana.startMs),
            end: istTime(parana.endMs),
          })}
        </p>
      )}
    </Panel>
  );
}

/* ----------------------------------------------------------- month grid */

function MonthGrid({ t, locale, month, days, today, selected, onSelect, onShift }) {
  const leadingBlanks = days[0].weekday;

  return (
    <Panel className="p-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onShift(-1)}
          aria-label={t("previous_month")}
          className="grid size-10 place-items-center rounded-xl border border-border bg-card/60"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <p className="text-sm font-semibold text-foreground">
          {formatMonth(month, locale)}
        </p>
        <button
          type="button"
          onClick={() => onShift(1)}
          aria-label={t("next_month")}
          className="grid size-10 place-items-center rounded-xl border border-border bg-card/60"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center">
        {weekdayInitials(locale).map((initial, index) => (
          <span
            key={index}
            className="pb-1 text-[10px] font-semibold text-muted-foreground"
          >
            {initial}
          </span>
        ))}

        {Array.from({ length: leadingBlanks }, (_, index) => (
          <span key={`blank-${index}`} />
        ))}

        {days.map((day) => {
          const isFast = Boolean(day.ekadashi?.fast);
          const hasFestival = day.festivals.length > 0;
          return (
            <button
              key={day.dayKey}
              type="button"
              onClick={() => onSelect(day.dayKey)}
              className={cn(
                "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border text-[11px] font-semibold transition-colors",
                day.dayKey === selected
                  ? "border-primary bg-primary/10 text-foreground"
                  : isFast
                    ? "border-primary/30 text-foreground"
                    : hasFestival
                      ? "border-brand-purple/40 text-foreground"
                      : "border-transparent text-muted-foreground active:bg-muted",
                day.dayKey === today && day.dayKey !== selected && "ring-1 ring-primary/50"
              )}
              style={{ touchAction: "manipulation" }}
            >
              <span>{Number(day.dayKey.slice(8))}</span>
              <span className="flex h-1.5 items-center gap-0.5" aria-hidden="true">
                {isFast && <span className="size-1.5 rounded-full bg-primary" />}
                {hasFestival && <span className="size-1.5 rounded-full bg-brand-purple" />}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border/70 pt-3">
        <Legend className="bg-primary">{t("legend_ekadashi")}</Legend>
        <Legend className="bg-brand-purple">{t("legend_festival")}</Legend>
      </div>
    </Panel>
  );
}

function Legend({ className, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span className={cn("size-1.5 rounded-full", className)} aria-hidden="true" />
      {children}
    </span>
  );
}

/* -------------------------------------------------------------- upcoming */

function Upcoming({ t, locale, today, observances }) {
  if (observances.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground">{t("no_events")}</p>
    );
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-foreground">{t("upcoming")}</h2>
      <div className="mt-3 flex flex-col gap-2">
        {observances.map((day) => {
          const away = daysBetween(today, day.dayKey);
          const festival = day.festivals[0];
          return (
            <div
              key={day.dayKey}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/40 px-3.5 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {festival
                    ? festival.name[locale]
                    : `${day.ekadashi.name?.[locale] ?? ""} ${t("legend_ekadashi")}`.trim()}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatDay(day.dayKey, locale)}
                </p>
              </div>
              <span className="shrink-0 text-xs font-medium whitespace-nowrap text-muted-foreground">
                {away === 0
                  ? t("today_short")
                  : away === 1
                    ? t("tomorrow")
                    : t("in_days", { count: away })}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- date helpers */

function shiftMonth(month, delta) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + delta, 1)).toISOString().slice(0, 7);
}

const intlLocale = (locale) => (locale === "hi" ? "hi-IN" : "en-IN");

function formatDay(dayKey, locale) {
  return new Date(`${dayKey}T00:00:00Z`).toLocaleDateString(intlLocale(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

function formatMonth(month, locale) {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString(intlLocale(locale), {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function weekdayInitials(locale) {
  const formatter = new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: "narrow",
    timeZone: "UTC",
  });
  // 4 January 1970 was a Sunday, which is where the grid starts.
  return Array.from({ length: 7 }, (_, index) =>
    formatter.format(new Date(Date.UTC(1970, 0, 4 + index)))
  );
}
