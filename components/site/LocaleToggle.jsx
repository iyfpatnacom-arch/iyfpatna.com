"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter as useNextRouter } from "next/navigation";
import { getPathname, usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { code: "en", label: "EN", font: "" },
  { code: "hi", label: "हिं", font: "font-hindi" },
];

/**
 * Hindi/English switch.
 *
 * Swaps only the locale segment and keeps the reader on the same page —
 * `usePathname` from the i18n navigation helpers returns the path already
 * stripped of its locale prefix, so this works from any route.
 *
 * Three things here exist to stop the switch reading as a page reload, which
 * is what it used to feel like even though it never was one. Next.js decides
 * a locale change is a *soft* navigation (see `isNavigatingToNewRootLayout`
 * in the router: it compares the dynamic segment's param name and ignores its
 * value, so `/en/x` and `/hi/x` share one root layout), and next-intl writes
 * the locale cookie in the browser rather than bouncing through a redirect.
 * So the document is never re-fetched. What broke the flow was everything
 * around that:
 *
 *   1. `scroll: false`. Without it the router scrolls to the top, so a reader
 *      halfway down a long page lost their place — the single thing that made
 *      this feel like a refresh. The page is the same page in another
 *      language; their position in it still means something.
 *   2. `useTransition`. React keeps the current page interactive and on
 *      screen while the new locale streams in, and `pending` gives the toggle
 *      something to say for itself instead of appearing to hang.
 *   3. Prefetch on hover and focus, so by the time the tap lands the other
 *      locale is usually already in the router cache.
 *
 * The prefetch deliberately goes through Next's own router rather than
 * next-intl's. next-intl runs `syncLocaleCookie` on every one of push,
 * replace *and* prefetch, so prefetching through its wrapper would write
 * `NEXT_LOCALE` on mere hover and quietly change the language the next visit
 * resolves to. `getPathname` is a pure function of the routing config, so
 * building the href by hand here is safe and side-effect free.
 */
export function LocaleToggle({ className = "" }) {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const nextRouter = useNextRouter();
  const [pending, startTransition] = useTransition();

  function switchTo(next) {
    if (next === locale || pending) return;
    startTransition(() => {
      router.replace(pathname, { locale: next, scroll: false });
    });
  }

  /* Warm the other locale without committing to it. */
  function prefetch(next) {
    if (next === locale) return;
    nextRouter.prefetch(getPathname({ href: pathname, locale: next }));
  }

  return (
    <div
      className={cn(
        "flex items-center rounded-full border border-border bg-muted/50 p-[3px] transition-opacity",
        pending && "opacity-60",
        className
      )}
      role="group"
      aria-label={t("language")}
      aria-busy={pending || undefined}
    >
      {OPTIONS.map((option) => (
        <button
          key={option.code}
          type="button"
          onClick={() => switchTo(option.code)}
          onPointerEnter={() => prefetch(option.code)}
          onFocus={() => prefetch(option.code)}
          aria-pressed={locale === option.code}
          className={cn(
            "rounded-full px-2.5 py-1 text-[12px] font-semibold transition-colors",
            option.font,
            locale === option.code
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
