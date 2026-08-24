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
  const pathname = usePathname();
  const items = DOCK_ITEMS;

  return (
    <nav
      className="fixed inset-x-3 bottom-3 z-40 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md items-center justify-between gap-1 rounded-[26px] border border-glass/12 bg-gradient-to-br from-glass/10 to-glass/[0.03] px-2 py-2 shadow-[inset_0_1px_0_var(--glass-hi),0_22px_50px_-26px_var(--glass-shadow)] backdrop-blur-2xl backdrop-saturate-150">
        {items.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.key}
              href={item.href}
              className="relative flex flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2"
            >
              {active && (
                <motion.span
                  layoutId="dock-active"
                  className="absolute inset-0 rounded-2xl bg-glass/10"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <item.Icon
                className={cn(
                  "relative z-10 h-5 w-5",
                  active ? "text-gold-ink" : "text-foreground/55"
                )}
              />
              <span
                className={cn(
                  "relative z-10 text-[10px] font-semibold",
                  active ? "text-foreground" : "text-foreground/45"
                )}
              >
                {t(item.key)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
