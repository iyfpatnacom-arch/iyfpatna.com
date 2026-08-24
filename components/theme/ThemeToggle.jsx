"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }) {
  const t = useTranslations("nav");
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // The server renders with the default theme, so hold the icon back until the
  // client knows which theme actually applies.
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";
  const label = isDark ? t("theme_light") : t("theme_dark");

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "grid h-[38px] w-[38px] place-items-center rounded-xl border border-glass/10 bg-glass/[0.07] text-foreground/80 transition-colors hover:text-foreground",
        className
      )}
    >
      {mounted ? (
        isDark ? (
          <Sun className="h-[17px] w-[17px]" />
        ) : (
          <Moon className="h-[17px] w-[17px]" />
        )
      ) : (
        <span className="h-[17px] w-[17px]" />
      )}
    </button>
  );
}
