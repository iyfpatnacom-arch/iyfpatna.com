"use client";

import { useTranslations } from "next-intl";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { YATRA_ENABLED, YATRA_URL, yatraIsExternal } from "@/lib/site-config";
import { Link } from "@/i18n/navigation";

/**
 * The yatra announcement strip under the navigation bar.
 *
 * The whole strip is one link: a ticker is read in passing, and whatever
 * phrase catches the eye should be the thing that can be pressed. It reuses
 * the dock's `.marquee-track` (two copies of the line, shifted by half), so it
 * gets the same seamless loop and the same reduced-motion hold for free.
 *
 * Hover pauses it, so a reader who reaches for it is not chasing a moving
 * target. The screen-reader text is one plain sentence; the scrolling copies
 * are hidden from it, otherwise every line would be announced twice.
 */
export function YatraTicker() {
  const t = useTranslations("yatra_promo");

  if (!YATRA_ENABLED) return null;

  const items = t.raw("ticker");
  const Anchor = yatraIsExternal ? "a" : Link;
  const external = yatraIsExternal
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <Anchor
      href={YATRA_URL}
      {...external}
      className="group relative block overflow-hidden border-b border-brand-gold-deep/30 bg-linear-to-r from-brand-purple-dark via-[#3b2466] to-brand-purple-dark text-white"
    >
      <span className="sr-only">{t("ticker_label")}</span>

      <div className="flex h-9 items-center" aria-hidden="true">
        {/* A fixed "live" tag on the left, so the strip reads as news even
            before the first line scrolls into view. */}
        <span className="relative z-10 flex h-full shrink-0 items-center gap-1.5 bg-brand-gold px-3 text-[11px] font-bold tracking-wider text-brand-ink uppercase shadow-[6px_0_14px_-4px_rgba(0,0,0,0.45)]">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-ink/60" />
            <span className="relative inline-flex size-2 rounded-full bg-brand-ink" />
          </span>
          {t("modal_eyebrow")}
        </span>

        <div className="marquee-mask min-w-0 flex-1 overflow-hidden">
          <div className="marquee-track [animation-duration:40s] group-hover:[animation-play-state:paused]">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex shrink-0 items-center">
                {items.map((line) => (
                  <span
                    key={line}
                    className="flex items-center gap-3 px-5 text-[13px] font-medium whitespace-nowrap"
                  >
                    <Sparkles className="size-3.5 text-brand-gold-light" />
                    {line}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        <span className="relative z-10 hidden h-full shrink-0 items-center gap-1 px-4 text-[12px] font-semibold text-brand-gold-light underline-offset-4 group-hover:underline sm:flex">
          {t("ticker_cta")}
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </Anchor>
  );
}
