"use client";

import { useTranslations } from "next-intl";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { ArrowUpRight, HandHeart } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { BrandMark } from "@/components/site/BrandMark";
import { IskconBand } from "@/components/site/IskconBand";
import { LocaleToggle } from "@/components/site/LocaleToggle";
import { MobileNav } from "@/components/site/MobileNav";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { DONATE_NAV, MAIN_NAV } from "@/lib/site-config";
import { cn } from "@/lib/utils";

/**
 * The site header: an ISKCON Patna band, then IYF Patna's own navigation.
 *
 * Only the navigation row is sticky. The parent band is an attribution rather
 * than a control, so it scrolls away and gives the reader back the vertical
 * space — pinning both tiers would cost roughly a fifth of a phone screen on
 * every page.
 *
 * Desktop gets the full link row. A phone gets the brand, the language and
 * theme controls, and a hamburger that opens the same row as a drawer — the
 * bottom dock holds five destinations, so without the drawer About, Courses,
 * Schedule, Gallery and the yatra had no route in from the top of a phone
 * screen at all.
 */
export function SiteHeader({ clerkConfigured = false, whatsappUrl }) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const isActive = (href) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <IskconBand />
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
          {/* `compact` drops the "youth wing of ISKCON Patna" subtitle: the
              band directly above already states the relationship, and at this
              width the second line only truncated. The footer still carries
              it in full. */}
          <BrandMark compact />

          {/* ---------- desktop navigation ---------- */}
          <NavigationMenu className="ml-4 hidden md:flex">
            <NavigationMenuList className="gap-0.5">
              {MAIN_NAV.map((item) => {
                const label = t(item.key);

                return (
                  <NavigationMenuItem key={item.key}>
                    <NavigationMenuLink
                      data-active={
                        !item.external && isActive(item.href) ? true : undefined
                      }
                      render={
                        item.external ? (
                          // Leaves the site: a plain anchor, never the
                          // locale-aware Link, which would prefix the host.
                          <a
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                          />
                        ) : (
                          <Link href={item.href} />
                        )
                      }
                      className="px-3 py-2 text-sm font-medium whitespace-nowrap text-muted-foreground hover:text-foreground data-active:text-foreground"
                    >
                      {label}
                      {item.external && (
                        <>
                          <ArrowUpRight
                            className="size-3.5 opacity-60"
                            aria-hidden="true"
                          />
                          <span className="sr-only">
                            {" "}
                            ({t("external_hint")})
                          </span>
                        </>
                      )}
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                );
              })}
            </NavigationMenuList>
          </NavigationMenu>

          <div className="ml-auto flex items-center gap-2">
            {/* Donate rides in the control cluster rather than the link row.
                The row above is already at its width budget once the Hindi
                labels are in, and this is the one action on the site worth
                giving a button to. Below `sm` it drops to an icon and matches
                the theme toggle's size, so the phone bar stays a bar. */}
            <Button
              size="lg"
              variant="outline"
              className="rounded-full max-sm:w-9 max-sm:px-0"
              render={<Link href={DONATE_NAV.href} />}
            >
              <HandHeart className="size-4" aria-hidden="true" />
              <span className="max-sm:sr-only">{t(DONATE_NAV.key)}</span>
            </Button>

            <LocaleToggle />
            <ThemeToggle className="h-9 w-9 rounded-full" />

            {/* Clerk's components read context from ClerkProvider, which the
              layout only mounts when keys are present — so they must stay
              behind the same flag or they throw on a keyless deploy. */}
            {clerkConfigured ? (
              <>
                <SignedOut>
                  <SignInButton mode="modal">
                    <Button size="sm" className="rounded-full">
                      {t("sign_in")}
                    </Button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <UserButton
                    appearance={{ elements: { avatarBox: "h-8 w-8" } }}
                  />
                </SignedIn>
              </>
            ) : (
              <Button
                size="sm"
                className="hidden rounded-full lg:inline-flex"
                render={<Link href="/programs" />}
              >
                {t("join")}
              </Button>
            )}

            {/* Passed through rather than read here: the header is a client
                component and the invite lives in the database, so the layout
                is the one place that can resolve it on the server. */}
            <MobileNav whatsappUrl={whatsappUrl} />
          </div>
        </div>
      </header>
    </>
  );
}
