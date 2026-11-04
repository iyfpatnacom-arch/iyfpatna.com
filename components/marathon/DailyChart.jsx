"use client";

import { useId, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * The marathon, day by day.
 *
 * Two charts rather than one, and that is the only interesting decision here.
 * The obvious design — books and rupees on the same axes — needs two y-scales
 * for two measures that share no unit, and a dual-axis chart lets the reader
 * "see" a correlation that is an artefact of where the two scales were pinned.
 * So: one column chart for books (one series, no legend; the heading names it)
 * and one stacked column chart for the money, split by how it arrived.
 *
 * Drawn as inline SVG with no charting library. The page already ships
 * framer-motion and Clerk to a volunteer's mid-range Android; a plotting
 * library for two bar charts would be the largest thing on the route. SVG also
 * means the marks take their fill from CSS custom properties, so dark mode is
 * the same chart with the theme's own tokens rather than a second render path
 * (see `--viz-cash` / `--viz-online` in globals.css, which are validated for
 * colour-blind separation and for contrast against each mode's surface).
 *
 * Every value is reachable without a pointer: the axis carries the scale, the
 * tallest day is labelled directly, hover and keyboard focus give the exact
 * figures, and a table view underneath holds the lot. Nothing is gated behind
 * a hover.
 */

/* The mark specs, in one place so both charts obey the same ones. */
const BAR_MAX = 24; // never fill the slot — the leftover band is air
const BAR_GAP = 2; // surface-coloured gap between stacked segments
const PLOT_H = 148;
const PAD_TOP = 14;
const AXIS_W = 40;

/** Clean tick values — 0, 25, 50 rather than 0, 23.3, 46.6. */
function niceTicks(max) {
  if (max <= 0) return [0];
  const rough = max / 3;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step =
    [1, 2, 2.5, 5, 10].find((factor) => factor * magnitude >= rough) * magnitude;
  const ticks = [];
  for (let value = 0; value <= max + step / 2; value += step) ticks.push(value);
  return ticks;
}

/** "1,000" under ten thousand, "12K" once the axis reaches it. */
function tick(value) {
  if (value >= 10000) return `${Math.round(value / 1000)}K`;
  return new Intl.NumberFormat("en-IN").format(value);
}

/** "4 Nov" — the axis label for an IST day key. */
function dayLabel(dayKey, locale) {
  return new Date(`${dayKey}T00:00:00Z`).toLocaleDateString(
    locale === "hi" ? "hi-IN" : "en-IN",
    { day: "numeric", month: "short", timeZone: "UTC" },
  );
}

export function DailyChart({
  series,
  metric = "books",
  locale = "hi",
  /* How many days the plot holds. Past this the oldest fall off the left and
     live on in the table view underneath — which is the trade a phone forces:
     thirty bands across 320px of screen puts the axis labels below 6px, and an
     unreadable chart is worse than a shorter one. */
  maxDays = 14,
}) {
  const t = useTranslations("marathon");
  const titleId = useId();
  const [hovered, setHovered] = useState(null);

  /* Trailing empty days are dropped — a marathon that runs to the 7th of
     December should not render three weeks of flat zeros in November. Leading
     and interior zeros stay: a day nobody went out is information. */
  const days = useMemo(() => {
    const rows = [...series];
    while (rows.length > 1 && rows.at(-1).books === 0) rows.pop();
    return rows.slice(-maxDays);
  }, [series, maxDays]);

  /* The table view holds everything, trailing zeros and all, so nothing the
     plot drops becomes unreachable. */
  const allDays = useMemo(() => [...series], [series]);

  const money = metric === "money";

  const max = useMemo(
    () =>
      days.reduce(
        (highest, day) => Math.max(highest, money ? day.amount : day.books),
        0,
      ),
    [days, money],
  );

  if (!days.length || max === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {t("chart_empty")}
      </p>
    );
  }

  const ticks = niceTicks(max);
  const top = ticks.at(-1) || max;
  const scale = (value) => (value / top) * (PLOT_H - PAD_TOP);

  /* A viewBox wide enough for the days and then scaled to the container:
     the chart is read on a phone first, and letting the SVG shrink keeps the
     bars proportional instead of crushing the last few. */
  const band = 28;
  const width = AXIS_W + days.length * band + 8;
  const barWidth = Math.min(BAR_MAX, band - 8);

  /* The one day worth labelling directly — the tallest. Labelling every
     column is noise, and the axis plus the tooltip carry the rest. */
  const peak = days.reduce(
    (best, day, index) =>
      (money ? day.amount : day.books) > (money ? best.day.amount : best.day.books)
        ? { day, index }
        : best,
    { day: days[0], index: 0 },
  );

  /* Enough room for a readable label every few bands on a narrow screen. */
  const labelEvery = Math.max(1, Math.ceil(days.length / 8));

  const total = days.reduce(
    (sum, day) => sum + (money ? day.amount : day.books),
    0,
  );

  return (
    <div className="flex flex-col gap-3">
      {money && (
        /* Two series, so a legend is always there — identity never rests on
           colour alone. Keys mirror the mark: a rect for a bar. */
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
          {[
            { key: "cash", color: "var(--viz-cash)" },
            { key: "online", color: "var(--viz-online)" },
          ].map(({ key, color }) => (
            <li
              key={key}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <span
                aria-hidden="true"
                className="size-2.5 rounded-sm"
                style={{ background: color }}
              />
              {t(`me_stat_${key}`)}
            </li>
          ))}
        </ul>
      )}

      <div className="relative -mx-1 overflow-x-auto px-1">
        <svg
          viewBox={`0 0 ${width} ${PLOT_H + 26}`}
          role="group"
          aria-labelledby={titleId}
          /* Never narrower than its own geometry, so the text stays at the
             size it was written for and the wrapper scrolls instead. Left
             aligned on a wide screen, where the axis is. */
          style={{ minWidth: width, height: PLOT_H + 26 }}
          className="block w-full"
          preserveAspectRatio="xMinYMid meet"
        >
          <title id={titleId}>
            {money
              ? `${t("me_stat_amount")}: ₹${tick(total)}`
              : `${t("me_stat_books")}: ${tick(total)}`}
          </title>

          {/* Gridlines and ticks — hairline, solid, one step off the surface,
              and deliberately behind everything else. */}
          {ticks.map((value) => {
            const y = PLOT_H - scale(value);
            return (
              <g key={value}>
                <line
                  x1={AXIS_W}
                  x2={width - 4}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  strokeWidth="1"
                  className="text-border"
                />
                <text
                  x={AXIS_W - 6}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-muted-foreground text-[9px] tabular-nums"
                >
                  {tick(value)}
                </text>
              </g>
            );
          })}

          {days.map((day, index) => {
            const x = AXIS_W + index * band + (band - barWidth) / 2;
            const value = money ? day.amount : day.books;
            const isHovered = hovered === index;

            /* Stacked: cash sits on the baseline and online on top of it, so
               the series that has to be reconciled by hand is the one anchored
               to the axis. A 2px gap in the surface colour separates them —
               never a stroke, which would add ink that is not data. */
            const segments = money
              ? [
                  { key: "cash", value: day.cashAmount, fill: "var(--viz-cash)" },
                  {
                    key: "online",
                    value: day.onlineAmount,
                    fill: "var(--viz-online)",
                  },
                ].filter((segment) => segment.value > 0)
              : [{ key: "books", value: day.books, fill: "var(--viz-cash)" }];

            let cursor = PLOT_H;

            return (
              <g
                key={day.dayKey}
                tabIndex={0}
                role="img"
                aria-label={`${dayLabel(day.dayKey, locale)} — ${describe(day, {
                  money,
                  locale,
                  t,
                })}`}
                onPointerEnter={() => setHovered(index)}
                onPointerLeave={() => setHovered(null)}
                onFocus={() => setHovered(index)}
                onBlur={() => setHovered(null)}
                className="outline-none"
                style={{ opacity: hovered === null || isHovered ? 1 : 0.55 }}
              >
                {/* The hit target is the whole band, not the painted bar — a
                    4px column on a day with one sale is not something a thumb
                    can land on. */}
                <rect
                  x={AXIS_W + index * band}
                  y={0}
                  width={band}
                  height={PLOT_H}
                  fill="transparent"
                />

                {segments.map((segment, segmentIndex) => {
                  const height = Math.max(2, scale(segment.value));
                  const gap = segmentIndex > 0 ? BAR_GAP : 0;
                  const y = cursor - height - gap;
                  cursor = y;
                  /* 4px rounded data-end, square at the baseline. Only the
                     topmost segment has a data-end; the ones below it are
                     interior and stay square. */
                  const rounded = segmentIndex === segments.length - 1;
                  return (
                    <rect
                      key={segment.key}
                      x={x}
                      y={y}
                      width={barWidth}
                      height={height}
                      rx={rounded ? 4 : 0}
                      fill={segment.fill}
                    />
                  );
                })}
                {/* `rx` rounds all four corners, so the bottom of the
                    lowest segment is squared off again by overdrawing it —
                    only where the bar is tall enough to have a bottom worth
                    squaring. */}
                {segments.length > 0 && scale(segments[0].value) > 6 && (
                  <rect
                    x={x}
                    y={PLOT_H - 4}
                    width={barWidth}
                    height={4}
                    fill={segments[0].fill}
                  />
                )}

                {/* The peak's own value, printed above its cap. */}
                {index === peak.index && (
                  <text
                    x={x + barWidth / 2}
                    y={PLOT_H - scale(value) - 5}
                    textAnchor="middle"
                    className="fill-foreground text-[9px] font-semibold tabular-nums"
                  >
                    {money ? `₹${tick(value)}` : tick(value)}
                  </text>
                )}

                {index % labelEvery === 0 && (
                  <text
                    x={x + barWidth / 2}
                    y={PLOT_H + 14}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[9px]"
                  >
                    {dayLabel(day.dayKey, locale)}
                  </text>
                )}
              </g>
            );
          })}

          <line
            x1={AXIS_W}
            x2={width - 4}
            y1={PLOT_H}
            y2={PLOT_H}
            stroke="currentColor"
            strokeWidth="1"
            className="text-border"
          />
        </svg>

        {/* The readout. Values lead and the series name follows, which is the
            legend's hierarchy inverted — by this point the reader has the
            series and wants the number. Positioned above the plot rather than
            following the pointer: a tooltip chasing a thumb on a phone is a
            tooltip under the thumb. */}
        {hovered !== null && (
          <div
            role="status"
            className="pointer-events-none absolute inset-x-0 -top-1 mx-auto w-fit rounded-lg border border-border bg-popover px-3 py-1.5 text-xs shadow-sm"
          >
            <p className="font-semibold tabular-nums">
              {dayLabel(days[hovered].dayKey, locale)}
            </p>
            <p className="mt-0.5 text-muted-foreground tabular-nums">
              {describe(days[hovered], { money, locale, t })}
            </p>
          </div>
        )}
      </div>

      {/* The table view. `<details>` so it costs nothing until it is asked
          for, and it is what makes every value reachable with no pointer and
          no colour at all. */}
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground underline underline-offset-4">
          {money ? t("me_stat_amount") : t("me_stat_books")}
        </summary>
        <table className="mt-2 w-full border-collapse">
          <thead>
            <tr className="text-start text-muted-foreground">
              <th scope="col" className="py-1 text-start font-medium">
                {t("me_col_when")}
              </th>
              <th scope="col" className="py-1 text-end font-medium">
                {money ? t("me_stat_cash") : t("me_stat_books")}
              </th>
              {money && (
                <th scope="col" className="py-1 text-end font-medium">
                  {t("me_stat_online")}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {allDays.map((day) => (
              <tr key={day.dayKey} className="border-t border-border/60">
                <td className="py-1">{dayLabel(day.dayKey, locale)}</td>
                <td className="py-1 text-end">
                  {money ? `₹${day.cashAmount}` : day.books}
                </td>
                {money && (
                  <td className="py-1 text-end">₹{day.onlineAmount}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

/** One day, in words — the tooltip, and the bar's accessible name. */
function describe(day, { money, locale, t }) {
  const number = (value) =>
    new Intl.NumberFormat(locale === "hi" ? "hi-IN" : "en-IN").format(value);

  if (!money) {
    return `${number(day.books)} · ${t("me_stat_books")}`;
  }
  return `${t("me_stat_cash")} ₹${number(day.cashAmount)} · ${t(
    "me_stat_online",
  )} ₹${number(day.onlineAmount)}`;
}
