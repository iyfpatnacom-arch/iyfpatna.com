"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { cn } from "@/lib/utils";

/**
 * Mobile-only header. `GlassNav` is `hidden md:block`, so without this there is
 * no theme or locale control on small screens.
 */
export function GlassTopBar() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function switchLocale(nextLocale) {
    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 md:hidden">
      <div className="flex items-center gap-2 rounded-[20px] border border-glass/12 bg-gradient-to-br from-glass/10 to-glass/[0.035] px-3 py-2 shadow-[inset_0_1px_0_var(--glass-hi),0_18px_40px_-26px_var(--glass-shadow)] backdrop-blur-2xl backdrop-saturate-150">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-gradient-to-br from-brand-gold-light via-brand-gold to-brand-gold-deep shadow-[0_0_18px_-4px_rgba(242,166,59,0.8)]">
            <span className="h-2.5 w-2.5 rounded-full border-2 border-brand-ink/85" />
          </span>
          <span className="text-[14px] font-extrabold tracking-tight text-foreground">
            IYF Patna
          </span>
        </Link>

        <div className="flex-1" />

        <div className="flex rounded-full border border-glass/10 bg-well/30 p-[3px]">
          <button
            onClick={() => switchLocale("en")}
            className={cn(
              "rounded-full px-2.5 py-1 text-[12px] font-bold transition-colors",
              locale === "en"
                ? "bg-gradient-to-br from-brand-gold-light to-brand-gold text-brand-ink"
                : "text-foreground/55"
            )}
          >
            EN
          </button>
          <button
            onClick={() => switchLocale("hi")}
            className={cn(
              "font-hindi rounded-full px-2.5 py-1 text-[12px] font-bold transition-colors",
              locale === "hi"
                ? "bg-gradient-to-br from-brand-gold-light to-brand-gold text-brand-ink"
                : "text-foreground/55"
            )}
          >
            हिं
          </button>
        </div>

        <ThemeToggle className="h-[34px] w-[34px] rounded-lg" />
      </div>
    </header>
  );
}
