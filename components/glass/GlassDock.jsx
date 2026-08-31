"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Home, CalendarDays, Gamepad2, PartyPopper, CircleUser } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const DOCK_ITEMS = [
  { href: "/", key: "home", Icon: Home },
  { href: "/programs", key: "programs", Icon: CalendarDays },
  { href: "/playground", key: "playground", Icon: Gamepad2 },
  { href: "/festivals", key: "festivals", Icon: PartyPopper },
  { href: "/dashboard", key: "profile", Icon: CircleUser },
];

export function GlassDock() {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const pathname = usePathname();
  const items = DOCK_ITEMS;
  const mantra = tc("maha_mantra");

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 w-full max-w-full select-none border-t border-border bg-background/95 backdrop-blur-lg md:hidden"
      style={{
        // The blurred surface runs to the physical bottom edge and the row is
        // pushed up off the home indicator — the native tab-bar arrangement.
        // Needs `viewportFit: "cover"` in the layout's viewport export, or iOS
        // reports 0 here and the bar sits under the indicator.
        paddingBottom: "env(safe-area-inset-bottom)",
        // Own compositor layer. Without it iOS Safari repaints the backdrop
        // blur a frame behind momentum scroll and the bar visibly drifts.
        transform: "translateZ(0)",
        // Suppress the double-tap-to-zoom delay and the grey tap flash, both of
        // which read as web-page behaviour rather than app behaviour.
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* Mantra ticker. Two identical copies ride in one `w-max` track and the
          keyframe shifts it 50% — copy two arrives exactly where copy one
          began, so the loop has no seam. `overflow-hidden` here is load-bearing:
          the track is deliberately wider than the screen. */}
      <div className="marquee-mask overflow-hidden border-b border-border/60 bg-muted/40 py-[3px]">
        <div className="marquee-track" aria-hidden="true">
          {[0, 1].map((copy) => (
            <span
              key={copy}
              className="shrink-0 px-3 text-[9px] font-semibold whitespace-nowrap text-muted-foreground"
            >
              {mantra}
              <span className="px-3 text-muted-foreground/50">·</span>
            </span>
          ))}
        </div>
        {/* The visible copies are duplicated and clipped; give assistive tech
            one clean reading instead. */}
        <span className="sr-only">{mantra}</span>
      </div>

      <nav
        aria-label={t("primary_nav")}
        className="flex w-full items-stretch px-1 py-1.5"
      >
        {items.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              // `min-w-0` is the fix for the horizontal scroll: flex items
              // default to `min-width: auto`, so a long label ("Playground",
              // "प्लेग्राउंड") refused to shrink and pushed the row wider than
              // the viewport.
              className="relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-0.5 py-1.5 transition-transform duration-150 active:scale-[0.94]"
            >
              {active && (
                <motion.span
                  layoutId="dock-active"
                  className="absolute inset-0 rounded-md "
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <item.Icon
                className={cn(
                  "relative z-10 h-5 w-5 shrink-0",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span
                className={cn(
                  "relative z-10 w-full truncate text-center text-[10px] font-semibold leading-none",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {t(item.key)}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
