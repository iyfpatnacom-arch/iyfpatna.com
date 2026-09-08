"use client";

import { Check, Minus, Plus } from "lucide-react";
import { haptic } from "@/lib/playground/haptics";
import { cn } from "@/lib/utils";

/**
 * The handful of controls the sadhana tools share.
 *
 * All of them are built for a thumb rather than a cursor: nothing has a hit
 * area under 44px, every press fires a short vibration so the tool can be used
 * without looking, and none of them is a native `<select>` or a spinner, both
 * of which are awkward on a phone and impossible to hit while chanting.
 */

/**
 * A number you nudge up and down.
 *
 * The value in the middle is a live `<output>` rather than an editable input:
 * a keyboard opening over the field is worse than the two extra taps, and for
 * larger jumps `step` can be raised by the caller.
 */
export function Stepper({
  label,
  hint,
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  size = "md",
}) {
  const set = (next) => {
    const clamped = Math.min(max, Math.max(min, next));
    if (clamped === value) {
      haptic("undo");
      return;
    }
    haptic("bead");
    onChange(clamped);
  };

  const big = size === "lg";

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className={cn("font-medium text-foreground", big ? "text-base" : "text-sm")}>
          {label}
        </p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <StepButton
          onClick={() => set(value - step)}
          disabled={value <= min}
          label={`${label} −${step}`}
        >
          <Minus className="size-4" aria-hidden="true" />
        </StepButton>

        <output
          className={cn(
            "min-w-[2.75rem] text-center font-semibold tabular-nums text-foreground",
            big ? "text-2xl" : "text-lg"
          )}
        >
          {value}
        </output>

        <StepButton
          onClick={() => set(value + step)}
          disabled={value >= max}
          label={`${label} +${step}`}
        >
          <Plus className="size-4" aria-hidden="true" />
        </StepButton>
      </div>
    </div>
  );
}

function StepButton({ onClick, disabled, label, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid size-11 place-items-center rounded-xl border border-border bg-card/60 text-foreground transition-colors active:bg-muted disabled:opacity-30"
      style={{ touchAction: "manipulation" }}
    >
      {children}
    </button>
  );
}

/** A labelled yes/no row — the checkbox column of the paper sheet. */
export function ToggleRow({ label, hint, checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => {
        haptic(checked ? "undo" : "confirm");
        onChange(!checked);
      }}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-transparent py-1.5 text-left transition-colors"
      style={{ touchAction: "manipulation" }}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>

      <span
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-xl border transition-colors",
          checked
            ? "border-primary/40 bg-primary/15 text-primary"
            : "border-border bg-card/60 text-transparent"
        )}
      >
        <Check className="size-5" aria-hidden="true" />
      </span>
    </button>
  );
}

/**
 * A row of preset values, with the current one lit.
 *
 * Used for minutes, where the honest granularity is "about twenty" rather than
 * a number someone typed. The last chip is always the highest preset; a caller
 * needing more can raise it with a stepper alongside.
 */
export function ChipRow({ label, options, value, onChange, format = (v) => v }) {
  return (
    <div>
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = option === value;
          return (
            <button
              key={option}
              type="button"
              onClick={() => {
                haptic("bead");
                onChange(option);
              }}
              aria-pressed={active}
              className={cn(
                "min-h-9 rounded-full border px-3 text-sm font-medium transition-colors",
                active
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border bg-card/50 text-muted-foreground active:bg-muted"
              )}
              style={{ touchAction: "manipulation" }}
            >
              {format(option)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The two-tab bar every tool with a second view uses.
 *
 * A plain button group rather than the shadcn `Tabs` primitive: these tabs
 * switch a whole view rather than a panel, they need to survive being driven
 * from elsewhere in the page (tapping a day in the month grid jumps back to
 * the editor), and controlled state is simpler than fighting a component that
 * wants to own it.
 */
export function TabBar({ tabs, value, onChange }) {
  return (
    <div
      role="tablist"
      className="flex gap-1 rounded-2xl border border-border bg-muted/30 p-1"
    >
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => {
              if (!active) haptic("bead");
              onChange(tab.key);
            }}
            className={cn(
              "flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-medium transition-colors",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground active:text-foreground"
            )}
            style={{ touchAction: "manipulation" }}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * "HH:MM", through the platform's own time picker.
 *
 * A native `<input type="time">` is the one native control worth keeping: every
 * phone has a good wheel picker behind it, it is locale-aware for free, and
 * nothing hand-rolled would beat it.
 */
export function TimeField({ label, value, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        type="time"
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 rounded-xl border border-border bg-card/60 px-3 text-sm tabular-nums text-foreground"
      />
    </label>
  );
}
