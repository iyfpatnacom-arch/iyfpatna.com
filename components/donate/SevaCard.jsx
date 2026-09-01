"use client";

import { useId, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Flower2,
  Landmark,
  PartyPopper,
  Repeat,
  Soup,
  Sprout,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { sevaDonateHref } from "@/lib/site-config";
import { cn } from "@/lib/utils";

/**
 * `SEVA_LIST` stores an icon by name rather than importing a component into
 * the config, so the config file stays free of React — same arrangement the
 * daily schedule uses.
 */
const ICONS = {
  festival: PartyPopper,
  meal: Soup,
  flower: Flower2,
  cow: Sprout,
  book: BookOpen,
  recurring: Repeat,
  temple: Landmark,
};

/**
 * One seva, with the amount the visitor picks.
 *
 * This is the only interactive piece of the donate page, and it exists for a
 * single reason: an amount means nothing on its own, but "₹1,100 feeds 28
 * people" does. Choosing a chip re-reads the impact line and re-points the
 * donate link, so the visitor arrives at the temple's gateway with the seva
 * and the amount already chosen rather than starting over.
 *
 * Both numbers in the impact line are ICU arguments, so next-intl formats
 * them for the active locale and the sentence can be reordered freely in
 * translation — Hindi puts the verb last, and hardcoding "feeds" between two
 * spans would have made that impossible.
 *
 * `dateLabel` is passed in already formatted and already filtered: the page
 * decides whether a dated festival is still ahead of us, so this component
 * never has to reason about "now" and cannot go stale in a cached render.
 */
export function SevaCard({ seva, dateLabel }) {
  const t = useTranslations("donate");
  const format = useFormatter();
  const [amount, setAmount] = useState(seva.defaultAmount);
  const labelId = useId();

  const Icon = ICONS[seva.icon] ?? Landmark;

  // What the chosen amount actually buys. Floored at one unit: a rounded-down
  // zero would read as "your donation does nothing", which is both wrong and
  // discouraging on the one screen where neither is affordable.
  const units = Math.max(1, Math.round(amount / seva.unit));

  return (
    <article className="flex flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-border/60 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full border border-primary/25 bg-primary/10 text-primary">
          <Icon className="size-[18px]" aria-hidden="true" />
        </span>
        {seva.tagged && (
          <span className="rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            {t(`seva.${seva.key}.tag`)}
          </span>
        )}
      </div>

      <p className="mt-4 text-[11px] font-semibold tracking-wider text-primary uppercase">
        {t(`seva.${seva.key}.eyebrow`)}
      </p>
      <h3 className="mt-1.5 text-lg font-semibold tracking-tight text-balance">
        {t(`seva.${seva.key}.name`)}
      </h3>

      {dateLabel && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <CalendarDays className="size-3.5 opacity-70" aria-hidden="true" />
          {dateLabel}
        </p>
      )}

      <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
        {t(`seva.${seva.key}.body`)}
      </p>

      {/* Impact. `aria-live` because the sentence rewrites itself under the
          chips — without it a screen-reader user changes the amount and hears
          nothing change. */}
      <p
        aria-live="polite"
        className="mt-4 rounded-xl bg-muted/40 px-3.5 py-3 text-sm leading-relaxed text-muted-foreground"
      >
        {t.rich(`seva.${seva.key}.impact`, {
          amount,
          units,
          b: (chunks) => (
            <b className="font-semibold text-foreground tabular-nums">
              {chunks}
            </b>
          ),
        })}
      </p>

      {/* Amounts. Exclusive toggles rather than a radiogroup: `aria-pressed`
          carries the state without also promising arrow-key roving, which a
          radiogroup would and this row does not implement. */}
      <p
        id={labelId}
        className="mt-5 text-[11px] font-semibold tracking-wider text-foreground/70 uppercase"
      >
        {t("amount_label")}
      </p>
      <div
        role="group"
        aria-labelledby={labelId}
        className="mt-2.5 flex flex-wrap gap-2"
      >
        {seva.amounts.map((value) => {
          const selected = value === amount;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={selected}
              onClick={() => setAmount(value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[13px] font-medium tabular-nums transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              ₹{format.number(value)}
            </button>
          );
        })}
      </div>

      {/* `mt-auto` keeps the buttons on one line across a row of cards whose
          descriptions differ in length. */}
      <div className="mt-auto pt-5">
        <Button
          size="lg"
          className="w-full rounded-full"
          render={
            <a
              href={sevaDonateHref(seva.slug, amount)}
              target="_blank"
              rel="noopener noreferrer"
            />
          }
        >
          {t("seva_cta", { amount })}
          <ArrowUpRight className="size-4 opacity-80" aria-hidden="true" />
          <span className="sr-only"> ({t("external_note")})</span>
        </Button>
      </div>
    </article>
  );
}
