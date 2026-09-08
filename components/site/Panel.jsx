import { cn } from "@/lib/utils";

/**
 * The one surface every app screen sits on.
 *
 * This replaces `GlassCard`, which drew each panel as a frosted pane — a
 * blur, a saturate, a gradient fill, an inset highlight and a 50px shadow, on
 * every card on the page. On the public site that vocabulary is gone (see the
 * note on `body` in globals.css: colour comes from the components that need
 * it, not from a wash behind them), and the tools looked like a different
 * product because of it.
 *
 * So: a border, a card fill, a radius. Nothing that composites. That matters
 * more here than anywhere else on the site — these tools are a scrolling
 * column of a dozen panels on a mid-range Android phone, and a backdrop
 * filter costs a full-surface readback per panel per frame.
 */
export function Panel({ className, tone = "default", ...props }) {
  const tones = {
    default: "border-border bg-card",
    // Purple is the accent for the reflective tools (calendar, Gita moods).
    // Taken from --brand-purple rather than --accent because that token flips
    // from a near-white tint in light mode to a saturated purple in dark, and
    // a wash of it reads at neither strength in both.
    accent: "border-brand-purple/25 bg-brand-purple/[0.06] dark:bg-brand-purple/10",
  };

  return (
    <div className={cn("rounded-xl border", tones[tone] ?? tones.default, className)} {...props} />
  );
}
