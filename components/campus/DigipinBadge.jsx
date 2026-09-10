"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { digipinCellSizeMetres } from "@/lib/campus/digipin";
import { haptic } from "@/lib/playground/haptics";
import { cn } from "@/lib/utils";

/**
 * A DIGIPIN, shown the way it should be read and copied.
 *
 * The code is the whole point of this feature, so it gets typographic weight:
 * monospace, wide tracking, and grouped 3-3-4 by letter-spacing rather than by
 * inserting hyphens. That distinction matters. India Post withdrew the
 * hyphenated `235-M64-MM85` form in the May 2026 revision — the code is now
 * ten unbroken characters — but ten unbroken characters are miserable to read
 * off a screen and worse to read aloud over a phone. Spacing gives the eye the
 * grouping without putting characters into the string that are not in the code,
 * so what you see, what you copy and what you paste are all the same ten.
 *
 * The cell-size line under it is not a disclaimer nobody asked for. A visitor
 * who has just been handed a ten-character code has no idea whether it means
 * "this district" or "this doorstep", and the honest answer — a square about
 * four metres across — is exactly what tells them when it is precise enough to
 * act on.
 */
export function DigipinBadge({ digipin, lat, approximate = false, className }) {
  const t = useTranslations("campus");
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);

  // Clearing the timer on unmount, because the "Copied" state resets two
  // seconds later and this badge sits inside a list a tap can navigate away
  // from well inside those two seconds.
  useEffect(() => () => clearTimeout(timer.current), []);

  const cell = digipinCellSizeMetres(lat);

  async function copy() {
    try {
      await navigator.clipboard.writeText(digipin);
    } catch {
      // Denied permission, an insecure origin, or a browser without the API.
      // Nothing useful to say — the code is on screen and can be read off it,
      // which is what the tracking above is for.
      return;
    }
    haptic("bead");
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          {t("digipin_label")}
        </span>

        <button
          type="button"
          onClick={copy}
          // 44px of height, because this is the one control on the page a
          // visitor uses while standing in a courtyard holding something else.
          className="inline-flex min-h-11 items-center gap-2.5 rounded-xl border border-border bg-muted/30 px-3 font-mono text-base font-semibold tracking-[0.18em] text-foreground transition-colors hover:border-primary/40 active:bg-muted/60"
          style={{ touchAction: "manipulation" }}
          aria-label={`${t("digipin_copy")}: ${digipin.split("").join(" ")}`}
        >
          {digipin}
          {copied ? (
            <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
          ) : (
            <Copy className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          )}
        </button>

        {/* Announced rather than only drawn — the icon swap is invisible to a
            screen reader, and "did that copy?" is the one question this button
            has to answer. */}
        <span aria-live="polite" className="text-xs font-medium text-primary">
          {copied ? t("digipin_copied") : ""}
        </span>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {t("digipin_note", {
          width: cell.width.toFixed(1),
          height: cell.height.toFixed(1),
        })}
      </p>

      {approximate && (
        <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
          {t("digipin_approximate")}
        </p>
      )}
    </div>
  );
}
