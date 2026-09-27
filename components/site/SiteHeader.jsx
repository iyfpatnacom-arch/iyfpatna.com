"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import { ArrowUpRight, HandHeart, ShieldCheck } from "lucide-react";
import NextLink from "next/link";
import { Link, usePathname } from "@/i18n/navigation";
import { BrandMark } from "@/components/site/BrandMark";
import { IskconBand } from "@/components/site/IskconBand";
import { LocaleToggle } from "@/components/site/LocaleToggle";
import { YatraTicker } from "@/components/site/YatraTicker";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { isAllowlistedAdmin } from "@/lib/admin-users";
import { DONATE_HREF } from "@/lib/donate-href";
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
 * Desktop gets the full link row. A phone gets the brand, a Donate button
 * with its label intact, and the language switch — that is the whole width
 * budget, so the theme toggle and the two Clerk buttons move into the drawer
 * below `sm`. The hamburger that opens that drawer lives in the band above,
 * where there is room for it beside the socials. The drawer matters either
 * way: the bottom dock holds five destinations, so without it About, Courses,
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
      {/* The phone menu trigger renders inside the band, so the invite and
          the Clerk flag have to travel one tier further up than the drawer
          that uses them. */}
      <IskconBand
        whatsappUrl={whatsappUrl}
        clerkConfigured={clerkConfigured}
      />
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
                giving a button to.

                It keeps its label on a phone. As a bare icon it read as one
                more toggle beside theme and language rather than as the ask —
                a heart glyph is not a word, and "दान करें" is not something a
                reader should have to infer from an outline. The width for it
                comes from Sign up, which steps aside below `sm` (see below);
                filled rather than outline there, because once it is the only
                action left in the row it may as well look like one.

                Dark mode fills with `brand-gold-deep` instead of `primary`.
                `primary` is the light gold there and pairs with near-black
                text, which is the house style for a gold button but reads as
                a warning stripe at this size; the deep gold takes a white
                label like the light-mode button does, so Donate looks like
                the same button in both themes. It is the one place on the
                site that departs from "dark text on gold", and the tradeoff
                is contrast: white on `#c9701a` is about 3.6:1, under the
                4.5:1 that 14px text wants.

                `DONATE_HREF` with Next's own `Link`, not the i18n one: the
                seva list opens in Hindi from anywhere on the site, so this
                href carries its own locale rather than the reader's. */}
            <Button
              size="lg"
              variant="outline"
              className="rounded-full max-sm:border-transparent max-sm:bg-primary max-sm:px-3.5 max-sm:text-primary-foreground max-sm:hover:bg-primary/80 dark:max-sm:bg-brand-gold-deep dark:max-sm:text-white dark:max-sm:hover:bg-brand-gold-deep/85"
              render={<NextLink href={DONATE_HREF} />}
            >
              <HandHeart className="size-4" aria-hidden="true" />
              {t(DONATE_NAV.key)}
            </Button>

            <LocaleToggle />
            {/* Below `sm` this moves into the drawer, where MobileNav renders
                the same control — the width it frees is what lets Donate keep
                its label on a phone. */}
            <ThemeToggle className="h-9 w-9 rounded-full max-sm:hidden" />

            {/* Clerk's components read context from ClerkProvider, which the
              layout only mounts when keys are present — so they must stay
              behind the same flag or they throw on a keyless deploy.

              `Show` rather than `SignedIn`/`SignedOut`: Core 3 removed those
              two, and because this branch only renders once real keys exist,
              the breakage stays invisible until the day the keys land. */}
            {clerkConfigured ? (
              <>
                <Show when="signed-out">
                  {/* Sign in is the quieter of the two: a returning member
                      knows to look for it, whereas a first-time visitor has
                      to be *offered* an account. Below `sm` neither survives:
                      the bar cannot hold both these and a Donate button that
                      says what it does, and of the three only Donate has
                      nowhere else to be — the drawer in the band above
                      carries this pair in full, side by side. */}
                  <SignInButton mode="modal">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-full max-sm:hidden"
                    >
                      {t("sign_in")}
                    </Button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <Button size="sm" className="rounded-full max-sm:hidden">
                      {t("sign_up")}
                    </Button>
                  </SignUpButton>
                </Show>
                <Show when="signed-in">
                  <AccountMenu />
                </Show>
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
          </div>
        </div>
      </header>
      {/* Under the sticky row rather than inside it: like the band above, it
          scrolls away instead of costing phone height on every page. */}
      <YatraTicker />
    </>
  );
}

/**
 * Clerk's avatar menu, plus an "Admin" item for the accounts that can use it.
 *
 * Its own component because `useUser` needs the ClerkProvider, which only
 * exists behind the `clerkConfigured` branch above. Hiding the item is for
 * tidiness only — /admin checks again on the server via `getAdminUser`.
 * Clerk renders the link as a plain navigation, outside next-intl's Link, so
 * the locale prefix is added here by hand.
 */
function AccountMenu() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const { user } = useUser();
  const isAdmin =
    isAllowlistedAdmin(user?.id) || user?.publicMetadata?.role === "admin";

  return (
    <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }}>
      {isAdmin && (
        <UserButton.MenuItems>
          <UserButton.Link
            label={t("admin")}
            labelIcon={<ShieldCheck className="size-4" aria-hidden="true" />}
            href={`/${locale}/admin`}
          />
        </UserButton.MenuItems>
      )}
    </UserButton>
  );
}
