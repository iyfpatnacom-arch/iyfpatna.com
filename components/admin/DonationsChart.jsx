"use client";

import { useId, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Giving, day by day.
 *
 * One measure — rupees settled per IST day — so one series, and therefore no
 * legend: the heading names it. The offerings count rides along in the readout
 * and in the table underneath rather than as a second series, because rupees
 * and gifts share no unit and putting them on one pair of axes would need two
 * y-scales (see the same note on `marathon/DailyChart`: a dual-axis chart
 * invites the reader to see a relationship that is an artefact of where the
 * scales were pinned).
 *
 * Inline SVG with no charting library, as everywhere else on this site: the
 * marks take their fill from `--viz-online`, which is a token already stepped
 * and validated for both modes, so dark mode is the same chart with the
 * theme's own values rather than a second render path.
 *
 * Every value is reachable without a pointer — the axis carries the scale, the
 * tallest day is labelled directly, hover and keyboard focus give the exact
 * figures, and the table view holds the lot.
 */

const BAR_MAX = 24; // never fill the slot — the leftover band is air
const PLOT_H = 148;
const PAD_TOP = 14;
const AXIS_W = 44;
const BAND = 28;

/** Clean tick values — 0, 2,500, 5,000 rather than 0, 2,310, 4,620. */
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
  if (value >= 100000) return `${Math.round(value / 100000)}L`;
  if (value >= 10000) return `${Math.round(value / 1000)}K`;
  return new Intl.NumberFormat("en-IN").format(Math.round(value));
}

/** "4 Nov" — the axis label for an IST day key. */
function dayLabel(dayKey, locale) {
  return new Date(`${dayKey}T00:00:00Z`).toLocaleDateString(
    locale === "hi" ? "hi-IN" : "en-IN",
    { day: "numeric", month: "short", timeZone: "UTC" },
  );
}

export function DonationsChart({
  series,
  locale = "hi",
  /* How many days the plot holds. Past this the oldest fall off the left and
     live on in the table underneath — the trade a phone forces: thirty bands
     across 320px puts the axis labels below 6px, and an unreadable chart is
     worse than a shorter one. */
  maxDays = 14,
}) {
  const t = useTranslations("admin");
  const titleId = useId();
  const [hovered, setHovered] = useState(null);

  /* Trailing empty days are dropped, so a quiet week does not push the real
     data off the left. Leading and interior zeros stay: a day nobody gave is
     information. */
  const days = useMemo(() => {
    const rows = [...series];
    while (rows.length > 1 && rows.at(-1).amount === 0) rows.pop();
    return rows.slice(-maxDays);
  }, [series, maxDays]);

  const inr = useMemo(
    () => new Intl.NumberFormat(locale === "hi" ? "hi-IN" : "en-IN"),
    [locale],
  );

  const max = useMemo(
    () => days.reduce((highest, day) => Math.max(highest, day.amount), 0),
    [days],
  );

  if (!days.length || max === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {t("don_chart_empty")}
      </p>
    );
  }

  const ticks = niceTicks(max);
  const top = ticks.at(-1) || max;
  const scale = (value) => (value / top) * (PLOT_H - PAD_TOP);

  const width = AXIS_W + days.length * BAND + 8;
  const barWidth = Math.min(BAR_MAX, BAND - 8);

  /* The one day worth labelling directly — the tallest. Labelling every
     column is noise, and the axis plus the readout carry the rest. */
  const peakIndex = days.reduce(
    (best, day, index) => (day.amount > days[best].amount ? index : best),
    0,
  );

  /* Enough room for a readable label every few bands on a narrow screen. */
  const labelEvery = Math.max(1, Math.ceil(days.length / 8));

  const total = days.reduce((sum, day) => sum + day.amount, 0);

  const describe = (day) =>
    `₹${inr.format(day.amount)} · ${t("don_chart_gifts", { count: day.count })}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative -mx-1 overflow-x-auto px-1">
        <svg
          viewBox={`0 0 ${width} ${PLOT_H + 26}`}
          role="group"
          aria-labelledby={titleId}
          /* Never narrower than its own geometry, so the text stays at the
             size it was written for and the wrapper scrolls instead. */
          style={{ minWidth: width, height: PLOT_H + 26 }}
          className="block w-full"
          preserveAspectRatio="xMinYMid meet"
        >
          <title id={titleId}>
            {t("don_chart_total", { amount: tick(total) })}
          </title>

          {/* Gridlines and ticks — hairline, one step off the surface, and
              deliberately behind everything else. */}
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
            const x = AXIS_W + index * BAND + (BAND - barWidth) / 2;
            const isHovered = hovered === index;
            const height = day.amount > 0 ? Math.max(2, scale(day.amount)) : 0;

            return (
              <g
                key={day.dayKey}
                tabIndex={0}
                role="img"
                aria-label={`${dayLabel(day.dayKey, locale)} — ${describe(day)}`}
                onPointerEnter={() => setHovered(index)}
                onPointerLeave={() => setHovered(null)}
                onFocus={() => setHovered(index)}
                onBlur={() => setHovered(null)}
                className="outline-none"
                style={{ opacity: hovered === null || isHovered ? 1 : 0.55 }}
              >
                {/* The hit target is the whole band, not the painted bar — a
                    4px column on a quiet day is not something a thumb can
                    land on. */}
                <rect
                  x={AXIS_W + index * BAND}
                  y={0}
                  width={BAND}
                  height={PLOT_H}
                  fill="transparent"
                />

                {height > 0 && (
                  <>
                    <rect
                      x={x}
                      y={PLOT_H - height}
                      width={barWidth}
                      height={height}
                      rx={4}
                      fill="var(--viz-online)"
                    />
                    {/* `rx` rounds all four corners, so the baseline end is
                        squared off again by overdrawing it — a bar sits on the
                        axis, it does not float above it. */}
                    {height > 6 && (
                      <rect
                        x={x}
                        y={PLOT_H - 4}
                        width={barWidth}
                        height={4}
                        fill="var(--viz-online)"
                      />
                    )}
                  </>
                )}

                {index === peakIndex && (
                  <text
                    x={x + barWidth / 2}
                    y={PLOT_H - height - 5}
                    textAnchor="middle"
                    className="fill-foreground text-[9px] font-semibold tabular-nums"
                  >
                    ₹{tick(day.amount)}
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

        {/* The readout, above the plot rather than following the pointer: a
            tooltip chasing a thumb on a phone is a tooltip under the thumb. */}
        {hovered !== null && (
          <div
            role="status"
            className="pointer-events-none absolute inset-x-0 -top-1 mx-auto w-fit rounded-lg border border-border bg-popover px-3 py-1.5 text-xs shadow-sm"
          >
            <p className="font-semibold tabular-nums">
              {dayLabel(days[hovered].dayKey, locale)}
            </p>
            <p className="mt-0.5 text-muted-foreground tabular-nums">
              {describe(days[hovered])}
            </p>
          </div>
        )}
      </div>

      {/* The table view. `<details>` so it costs nothing until it is asked
          for, and it is what makes every value reachable with no pointer and
          no colour at all — including the days the plot dropped. */}
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground underline underline-offset-4">
          {t("don_chart_table")}
        </summary>
        <table className="mt-2 w-full border-collapse">
          <thead>
            <tr className="text-muted-foreground">
              <th scope="col" className="py-1 text-start font-medium">
                {t("don_col_when")}
              </th>
              <th scope="col" className="py-1 text-end font-medium">
                {t("don_col_amount")}
              </th>
              <th scope="col" className="py-1 text-end font-medium">
                {t("don_col_gifts")}
              </th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {series.map((day) => (
              <tr key={day.dayKey} className="border-t border-border/60">
                <td className="py-1">{dayLabel(day.dayKey, locale)}</td>
                <td className="py-1 text-end">₹{inr.format(day.amount)}</td>
                <td className="py-1 text-end">{day.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
