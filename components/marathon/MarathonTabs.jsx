"use client";

import { useTranslations } from "next-intl";
import { BookOpen, Info, Trophy, UserRound } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * The volunteer console's own navigation.
 *
 * Sticky at the top of the section rather than a bottom tab bar, which is
 * what a four-tab mobile tool otherwise wants. The site already has one fixed
 * bottom bar — `AppDock`, on every page under this locale — and two of them
 * stacked on a phone is half the screen gone before any books are counted. So
 * this sits under the header where the thumb can still reach it after one
 * scroll, and the dock keeps the bottom.
 *
 * Rendered only for a volunteer who is actually active. Somebody still waiting
 * on a coordinator has nothing to navigate between, and a row of tabs that all
 * lead to the same "please wait" screen is worse than no tabs at all.
 */
const TABS = [
  { href: "/activity/gita-marathon/sell", key: "sell", Icon: BookOpen },
  { href: "/activity/gita-marathon/me", key: "me", Icon: UserRound },
  { href: "/activity/gita-marathon/leaderboard", key: "board", Icon: Trophy },
  { href: "/activity/gita-marathon", key: "about", Icon: Info },
];

export function MarathonTabs() {
  const t = useTranslations("marathon");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("title")}
      /* `top-0` and not an offset below the header: the site header scrolls
         away with the page, so once it is gone this is what should be at the
         top of the viewport. */
      className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-lg"
      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
    >
      <div className="mx-auto flex w-full max-w-5xl items-stretch px-2 sm:px-4">
        {TABS.map(({ href, key, Icon }) => {
          /* "About" is the section root, so it would otherwise match every
             child path. Everything else is a prefix match, which is what keeps
             the Sell tab lit while a sale's own page is open. */
          const active =
            key === "about"
              ? pathname === "/activity/gita-marathon"
              : pathname.startsWith(href);

          return (
            <Link
              key={key}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-1 px-2 py-2.5 text-[11px] font-medium transition-colors sm:flex-row sm:justify-center sm:gap-2 sm:py-3 sm:text-sm",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-[18px] shrink-0" aria-hidden="true" />
              {t(`tab_${key}`)}
              {/* The indicator is a child of the link rather than a shared
                  animated element: four tabs do not need a layout animation,
                  and one less client-side motion value is one less thing to
                  jank on a mid-range Android. */}
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary sm:inset-x-4"
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
