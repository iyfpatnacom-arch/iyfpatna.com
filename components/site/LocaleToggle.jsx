"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * Hindi/English switch.
 *
 * Swaps only the locale segment and keeps the reader on the same page —
 * `usePathname` from the i18n navigation helpers returns the path already
 * stripped of its locale prefix, so this works from any route.
 */
export function LocaleToggle({ className = "" }) {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(next) {
    if (next === locale) return;
    router.replace(pathname, { locale: next });
  }

  return (
    <div
      className={cn(
        "flex items-center rounded-full border border-border bg-muted/50 p-[3px]",
        className
      )}
      role="group"
      aria-label={t("language")}
    >
      {[
        { code: "en", label: "EN", font: "" },
        { code: "hi", label: "हिं", font: "font-hindi" },
      ].map((option) => (
        <button
          key={option.code}
          type="button"
          onClick={() => switchTo(option.code)}
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
