"use client";

import { useId, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * The campaign, day by day: who registered, and who started and did not finish.
 *
 * Two series, stacked, because they are the same unit — a registration attempt
 * — and together they are the day's attempts. That is the whole reason this is
 * one chart rather than two: the drop-off is only legible *against* the day it
 * happened on, and the pair of them is the shape of the question an admin
 * arrives with ("is the form working, and is anybody filling it in?"). Two
 * measures of different scale would get two charts; see the dual-axis note on
 * `DonationsChart` and in the dataviz anti-patterns — the rule is about mixed
 * units and this is not one.
 *
 * Inline SVG with no charting library, as everywhere else on this site. The
 * marks take their fill from `--viz-online` and `--viz-cash`, which is the
 * palette pair already stepped and validated for both modes (see the note above
 * them in globals.css: worst adjacent pair ΔE 30.5 light, 24.5 dark under
 * protanopia). Their names are about how money arrived on the donations screen;
 * here they are simply the two passing steps, and identity is carried by the
 * legend and the readout as well as by colour, so neither chart depends on
 * remembering what a hue meant on the other.
 *
 * Every value is reachable without a pointer — the axis carries the scale, the
 * busiest day is labelled directly, hover and keyboard focus give the exact
 * figures, and the table underneath holds the lot including the days the plot
 * dropped off the left.
 */

const BAR_MAX = 22; // never fill the slot — the leftover band is air
const PLOT_H = 148;
const PAD_TOP = 14;
const AXIS_W = 30;
const BAND = 28;
const GAP = 2; // the surface gap between the two stacked fills

/**
 * Clean tick values for a count — 0, 5, 10 rather than 0, 3, 6.
 *
 * Integer steps only, unlike the rupee axis: half a registration is not a
 * quantity, and an axis reading "2.5" on a chart of people is a chart nobody
 * trusts.
 */
function niceTicks(max) {
  if (max <= 0) return [0];
  const rough = max / 3;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = Math.max(
    1,
    Math.round([1, 2, 2.5, 5, 10].find((factor) => factor * magnitude >= rough) * magnitude),
  );
  const ticks = [];
  for (let value = 0; value <= max + step / 2; value += step) ticks.push(value);
  return ticks;
}

/** "4 Dec" — the axis label for an IST day key. */
function dayLabel(dayKey, locale) {
  return new Date(`${dayKey}T00:00:00Z`).toLocaleDateString(locale === "hi" ? "hi-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function GitaTrendChart({
  series,
  locale = "hi",
  /* How many days the plot holds. Past this the oldest fall off the left and
     live on in the table underneath — the trade a phone forces: thirty bands
     across 320px puts the axis labels below 6px, and an unreadable chart is
     worse than a shorter one. */
  maxDays = 21,
}) {
  const t = useTranslations("admin");
  const titleId = useId();
  const [hovered, setHovered] = useState(null);

  /* Leading and trailing empty days are dropped, so a festival three days old
     is not drawn as three bars at the right-hand end of a quiet month, and a
     quiet week does not push the real data off the left. Interior zeros stay: a
     day nobody registered is information. */
  const days = useMemo(() => {
    const attempts = (day) => day.paid + day.abandoned;
    const rows = [...series];
    while (rows.length > 1 && attempts(rows.at(-1)) === 0) rows.pop();
    while (rows.length > 1 && attempts(rows[0]) === 0) rows.shift();
    return rows.slice(-maxDays);
  }, [series, maxDays]);

  const number = useMemo(
    () => new Intl.NumberFormat(locale === "hi" ? "hi-IN" : "en-IN"),
    [locale],
  );

  const max = useMemo(
    () => days.reduce((highest, day) => Math.max(highest, day.paid + day.abandoned), 0),
    [days],
  );

  if (!days.length || max === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t("gita_ov_chart_empty")}</p>;
  }

  const ticks = niceTicks(max);
  const top = ticks.at(-1) || max;
  const scale = (value) => (value / top) * (PLOT_H - PAD_TOP);

  const width = AXIS_W + days.length * BAND + 8;
  const barWidth = Math.min(BAR_MAX, BAND - 8);

  /* The one day worth labelling directly — the busiest. Labelling every column
     is noise, and the axis plus the readout carry the rest. */
  const peakIndex = days.reduce(
    (best, day, index) =>
      day.paid + day.abandoned > days[best].paid + days[best].abandoned ? index : best,
    0,
  );

  /* Enough room for a readable label every few bands on a narrow screen. */
  const labelEvery = Math.max(1, Math.ceil(days.length / 8));

  const totalPaid = days.reduce((sum, day) => sum + day.paid, 0);

  const describe = (day) =>
    `${t("gita_ov_chart_paid", { count: day.paid })} · ${t("gita_ov_chart_abandoned", {
      count: day.abandoned,
    })} · ₹${number.format(day.amount)}`;

  return (
    <div className="flex flex-col gap-3">
      {/* The legend. Always present for two series, and the only thing on the
          chart that names them — so identity never rests on colour alone. */}
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {[
          ["paid", "var(--viz-online)", t("gita_ov_chart_series_paid")],
          ["abandoned", "var(--viz-cash)", t("gita_ov_chart_series_abandoned")],
        ].map(([key, fill, label]) => (
          <li key={key} className="inline-flex items-center gap-1.5">
            <span
              className="size-2.5 shrink-0 rounded-[3px]"
              style={{ background: fill }}
              aria-hidden="true"
            />
            {label}
          </li>
        ))}
      </ul>

      <div className="relative -mx-1 overflow-x-auto px-1">
        <svg
          viewBox={`0 0 ${width} ${PLOT_H + 26}`}
          role="group"
          aria-labelledby={titleId}
          /* Never narrower than its own geometry, so the text stays at the size
             it was written for and the wrapper scrolls instead. */
          style={{ minWidth: width, height: PLOT_H + 26 }}
          className="block w-full"
          preserveAspectRatio="xMinYMid meet"
        >
          <title id={titleId}>{t("gita_ov_chart_total", { count: totalPaid })}</title>

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
                  {number.format(value)}
                </text>
              </g>
            );
          })}

          {days.map((day, index) => {
            const x = AXIS_W + index * BAND + (BAND - barWidth) / 2;
            const isHovered = hovered === index;
            const attempts = day.paid + day.abandoned;

            const paidH = day.paid > 0 ? Math.max(2, scale(day.paid)) : 0;
            const lostH = day.abandoned > 0 ? Math.max(2, scale(day.abandoned)) : 0;
            /* The gap is taken out of the upper segment, so the stack's total
               height stays true to the day's attempts and the lower segment
               still sits on the axis. */
            const lostDrawn = lostH > 0 && paidH > 0 ? Math.max(1, lostH - GAP) : lostH;

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
                    4px column on a quiet day is not something a thumb can land
                    on. */}
                <rect
                  x={AXIS_W + index * BAND}
                  y={0}
                  width={BAND}
                  height={PLOT_H}
                  fill="transparent"
                />

                {paidH > 0 && (
                  <>
                    <rect
                      x={x}
                      y={PLOT_H - paidH}
                      width={barWidth}
                      height={paidH}
                      rx={4}
                      fill="var(--viz-online)"
                    />
                    {/* `rx` rounds all four corners, so the baseline end is
                        squared off again by overdrawing it — a bar sits on the
                        axis, it does not float above it. */}
                    {paidH > 6 && (
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

                {lostDrawn > 0 && (
                  <rect
                    x={x}
                    y={PLOT_H - paidH - GAP - lostDrawn}
                    width={barWidth}
                    height={lostDrawn}
                    rx={4}
                    fill="var(--viz-cash)"
                  />
                )}

                {index === peakIndex && (
                  <text
                    x={x + barWidth / 2}
                    y={PLOT_H - paidH - (lostDrawn > 0 ? lostDrawn + GAP : 0) - 5}
                    textAnchor="middle"
                    className="fill-foreground text-[9px] font-semibold tabular-nums"
                  >
                    {number.format(attempts)}
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
            className="pointer-events-none absolute inset-x-0 -top-1 mx-auto w-fit rounded-lg border border-border bg-popover px-3 py-1.5 text-center text-xs shadow-sm"
          >
            <p className="font-semibold tabular-nums">{dayLabel(days[hovered].dayKey, locale)}</p>
            <p className="mt-0.5 text-muted-foreground tabular-nums">{describe(days[hovered])}</p>
          </div>
        )}
      </div>

      {/* The table view. `<details>` so it costs nothing until it is asked for,
          and it is what makes every value reachable with no pointer and no
          colour at all — including the days the plot dropped. */}
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground underline underline-offset-4">
          {t("gita_ov_chart_table")}
        </summary>
        <table className="mt-2 w-full border-collapse">
          <thead>
            <tr className="text-muted-foreground">
              <th scope="col" className="py-1 text-start font-medium">
                {t("don_col_when")}
              </th>
              <th scope="col" className="py-1 text-end font-medium">
                {t("gita_ov_chart_series_paid")}
              </th>
              <th scope="col" className="py-1 text-end font-medium">
                {t("gita_ov_chart_series_abandoned")}
              </th>
              <th scope="col" className="py-1 text-end font-medium">
                {t("don_col_amount")}
              </th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {series.map((day) => (
              <tr key={day.dayKey} className="border-t border-border/60">
                <td className="py-1">{dayLabel(day.dayKey, locale)}</td>
                <td className="py-1 text-end">{number.format(day.paid)}</td>
                <td className="py-1 text-end">{number.format(day.abandoned)}</td>
                <td className="py-1 text-end">₹{number.format(day.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
