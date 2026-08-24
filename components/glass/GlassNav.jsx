"use client";

import { useLocale, useTranslations } from "next-intl";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@clerk/nextjs";
import { CircleUser } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", key: "home" },
  { href: "/about", key: "about" },
  { href: "/programs", key: "programs" },
  { href: "/gallery", key: "gallery" },
  { href: "/courses", key: "courses" },
  { href: "/playground", key: "playground" },
  { href: "/festivals", key: "festivals" },
];

export function GlassNav({ clerkConfigured = false }) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { scrollY } = useScroll();

  const paddingY = useTransform(scrollY, [0, 120], [22, 10]);
  const marginX = useTransform(scrollY, [0, 120], [28, 14]);
  const blurPx = useTransform(scrollY, [0, 120], [18, 26]);
  const backdropFilter = useTransform(blurPx, (v) => `blur(${v}px) saturate(140%)`);

  function switchLocale(nextLocale) {
    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <motion.header
      style={{ paddingLeft: marginX, paddingRight: marginX, paddingTop: 12 }}
      className="sticky top-0 z-40 hidden md:block"
    >
      <motion.div
        style={{
          paddingTop: paddingY,
          paddingBottom: paddingY,
          backdropFilter,
        }}
        className="mx-auto flex max-w-[1400px] items-center gap-7 rounded-[22px] border border-glass/12 bg-gradient-to-br from-glass/10 to-glass/[0.035] px-5 shadow-[inset_0_1px_0_var(--glass-hi),0_22px_50px_-26px_var(--glass-shadow)]"
      >
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-gradient-to-br from-brand-gold-light via-brand-gold to-brand-gold-deep shadow-[0_0_22px_-4px_rgba(242,166,59,0.8)]">
            <span className="h-3 w-3 rounded-full border-2 border-brand-ink/85" />
          </span>
          <span className="flex flex-col leading-[1.05]">
            <span className="text-[15px] font-extrabold tracking-tight text-foreground">
              IYF Patna
            </span>
            <span className="font-hindi text-[11px] font-semibold text-foreground/50">
              युवा मंच
            </span>
          </span>
        </Link>

        <nav className="ml-2 flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  "rounded-[11px] px-3.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "border border-glass/10 bg-glass/10 text-foreground"
                    : "text-foreground/60 hover:text-foreground"
                )}
              >
                {t(item.key)}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          <div className="flex rounded-full border border-glass/10 bg-well/30 p-[3px]">
            <button
              onClick={() => switchLocale("en")}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-[13px] font-bold transition-colors",
                locale === "en"
                  ? "bg-gradient-to-br from-brand-gold-light to-brand-gold text-brand-ink shadow-[0_4px_14px_-4px_rgba(242,166,59,0.9)]"
                  : "text-foreground/55"
              )}
            >
              EN
            </button>
            <button
              onClick={() => switchLocale("hi")}
              className={cn(
                "font-hindi rounded-full px-3.5 py-1.5 text-[13px] font-bold transition-colors",
                locale === "hi"
                  ? "bg-gradient-to-br from-brand-gold-light to-brand-gold text-brand-ink shadow-[0_4px_14px_-4px_rgba(242,166,59,0.9)]"
                  : "text-foreground/55"
              )}
            >
              हिं
            </button>
          </div>

          <ThemeToggle />

          {clerkConfigured ? (
            <>
              <SignedOut>
                <SignInButton mode="modal">
                  <button
                    aria-label={t("sign_in")}
                    title={t("sign_in")}
                    className="grid h-[38px] w-[38px] place-items-center rounded-xl border border-glass/10 bg-glass/[0.07] text-foreground/80 transition-colors hover:text-foreground"
                  >
                    <CircleUser className="h-[17px] w-[17px]" />
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <Link
                  href="/dashboard"
                  aria-label={t("profile")}
                  className="grid h-[38px] w-[38px] place-items-center rounded-xl border border-glass/10 bg-glass/[0.07]"
                >
                  <UserButton appearance={{ elements: { avatarBox: "h-6 w-6" } }} />
                </Link>
              </SignedIn>
            </>
          ) : (
            <Link
              href="/dashboard"
              aria-label={t("profile")}
              title={t("profile")}
              className="grid h-[38px] w-[38px] place-items-center rounded-xl border border-glass/10 bg-glass/[0.07] text-foreground/80 transition-colors hover:text-foreground"
            >
              <CircleUser className="h-[17px] w-[17px]" />
            </Link>
          )}

          <Link
            href="/programs"
            className="rounded-[13px] bg-gradient-to-br from-brand-gold-light to-brand-gold px-5 py-2.5 text-sm font-bold text-brand-ink shadow-[0_12px_30px_-12px_rgba(242,166,59,0.9)]"
          >
            {t("join")}
          </Link>
        </div>
      </motion.div>
    </motion.header>
  );
}
