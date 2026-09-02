"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowUpRight,
  CircleUser,
  Gamepad2,
  HandHeart,
  Menu,
} from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { WhatsappIcon } from "@/components/site/WhatsappIcon";
import {
  DONATE_NAV,
  LEGAL_NAV,
  MAIN_NAV,
  WHATSAPP_GROUP_URL,
} from "@/lib/site-config";
import { cn } from "@/lib/utils";

/**
 * The whole navigation, behind one button, for phones.
 *
 * The bottom dock carries five destinations and the header carries none below
 * `md`, which left About, Courses, Schedule, Gallery, the yatra and the legal
 * pages reachable on a phone only from the footer. This is the drawer that
 * holds all of it.
 *
 * It duplicates the dock rather than replacing it, and that is the point: the
 * dock is for the handful of places people go constantly, the drawer is for
 * everywhere else. The two dock-only routes (Playground, Profile) are
 * repeated here so the drawer really is the complete map — a menu that is
 * missing items is worse than no menu.
 *
 * Open state is controlled rather than left to the primitive because every
 * link has to close it: without that, a client-side navigation leaves the
 * drawer sitting open over the page it just moved to.
 */

/** Dock-only destinations, so the drawer lists every route the site has. */
const EXTRA_NAV = [
  { key: "playground", href: "/playground", Icon: Gamepad2 },
  { key: "profile", href: "/dashboard", Icon: CircleUser },
];

export function MobileNav() {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const close = () => setOpen(false);

  const itemClass = (href) =>
    cn(
      "flex items-center justify-between gap-3 rounded-xl border border-transparent px-3 py-3 text-[15px] font-medium transition-colors",
      isActive(href)
        ? "border-border bg-muted text-foreground"
        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
    );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="outline"
            size="icon-lg"
            className="rounded-full md:hidden"
            aria-label={t("open_menu")}
          />
        }
      >
        <Menu className="size-4" aria-hidden="true" />
      </SheetTrigger>

      {/* Width and the slide-in come from SheetContent's own `side=right`
          styles; only the gap and the scroll are ours. `w-*` set here would
          lose to those anyway — they are attribute-qualified and win on
          specificity. */}
      <SheetContent side="right" className="gap-0 overflow-y-auto">
        <SheetHeader className="border-b border-border/70 px-4 py-4">
          <SheetTitle>{t("menu")}</SheetTitle>
        </SheetHeader>

        <nav aria-label={t("primary_nav")} className="flex flex-col p-3">
          {MAIN_NAV.map((item) =>
            item.external ? (
              // Leaves the site: a plain anchor, never the locale-aware Link,
              // which would prefix the host with /hi or /en.
              <a
                key={item.key}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={close}
                className={itemClass(item.href)}
              >
                {t(item.key)}
                <ArrowUpRight className="size-4 opacity-60" aria-hidden="true" />
                <span className="sr-only"> ({t("external_hint")})</span>
              </a>
            ) : (
              <Link
                key={item.key}
                href={item.href}
                onClick={close}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={itemClass(item.href)}
              >
                {t(item.key)}
              </Link>
            )
          )}

          <span className="my-2 h-px bg-border/70" aria-hidden="true" />

          {EXTRA_NAV.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              onClick={close}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={itemClass(item.href)}
            >
              {t(item.key)}
              <item.Icon className="size-4 opacity-60" aria-hidden="true" />
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-2 px-4 pb-4">
          <Button
            size="lg"
            className="w-full rounded-full"
            render={<Link href={DONATE_NAV.href} onClick={close} />}
          >
            <HandHeart className="size-4" aria-hidden="true" />
            {t(DONATE_NAV.key)}
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="w-full rounded-full border-[#25D366]/40 text-[#128C7E] hover:bg-[#25D366]/10 dark:text-[#25D366]"
            render={
              <a
                href={WHATSAPP_GROUP_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={close}
              />
            }
          >
            <WhatsappIcon className="size-4" />
            {tc("whatsapp_cta")}
          </Button>
        </div>

        {/* `mt-auto` floors this row on a tall screen; the inset keeps it off
            the iOS home indicator, which the drawer runs underneath. */}
        <div
          className="mt-auto flex flex-wrap gap-x-4 gap-y-1 border-t border-border/70 px-4 pt-4 text-xs text-muted-foreground"
          style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
        >
          {LEGAL_NAV.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              onClick={close}
              className="hover:text-foreground"
            >
              {t(item.key)}
            </Link>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
