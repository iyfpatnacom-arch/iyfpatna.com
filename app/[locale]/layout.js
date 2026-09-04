import { Plus_Jakarta_Sans, Mukta, Instrument_Serif } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ClerkProvider } from "@clerk/nextjs";
import { clerkConfigured } from "@/lib/auth-config";
import { routing } from "@/i18n/routing";
import { ORG } from "@/lib/site-config";
import { getWhatsappGroupUrl } from "@/lib/settings";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { GlassDock } from "@/components/glass/GlassDock";
import { WhatsappFab } from "@/components/site/WhatsappFab";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { PageTransition } from "@/components/PageTransition";
import { PwaInstallGate } from "@/components/pwa/PwaInstallGate";
import "../globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const mukta = Mukta({
  variable: "--font-mukta",
  subsets: ["devanagari", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Display face for the editorial lines in the hero and section headers.
// Instrument Serif ships a single weight; the italic is the expressive one.
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata = {
  title: {
    default: "ISKCON Youth Forum Patna — the youth wing of ISKCON Patna",
    template: "%s · IYF Patna",
  },
  description:
    "ISKCON Youth Forum Patna is the youth wing of ISKCON Patna — a community of students and young professionals practising bhakti-yoga through kirtan, Bhagavad Gita study, seva and festivals.",
  metadataBase: new URL(ORG.siteUrl),
  manifest: "/manifest.webmanifest",
};

export const viewport = {
  // `cover` is what makes `env(safe-area-inset-*)` report real values on iOS.
  // Without it the bottom dock reads an inset of 0 and sits under the home
  // indicator instead of above it.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfcfa" },
    { media: "(prefers-color-scheme: dark)", color: "#100a06" },
  ],
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);

  // Resolved once here and handed to both places that link to the group. It
  // is a cached data read, not a per-request query, so the pages under this
  // layout stay prerendered — and it falls back to the constant in
  // site-config if the database has nothing stored or nothing to say.
  const whatsappUrl = await getWhatsappGroupUrl();

  const content = (
    <NextIntlClientProvider>
      <TooltipProvider>
        <SiteHeader
          clerkConfigured={clerkConfigured}
          whatsappUrl={whatsappUrl}
        />
        {/* The dock is fixed over the page on phones, so the padding that
            keeps it from covering content has to clear the footer too — it
            sits on the wrapper, not on <main>. */}
        <div className="flex flex-1 flex-col pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
          <main className="flex-1">
            <PageTransition>{children}</PageTransition>
          </main>
          <SiteFooter />
        </div>
        <GlassDock />
        <WhatsappFab href={whatsappUrl} />
        <PwaInstallGate />
        <Toaster position="top-center" />
      </TooltipProvider>
    </NextIntlClientProvider>
  );

  return (
    <html
      lang={locale}
      className={`${jakarta.variable} ${mukta.variable} ${instrumentSerif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {/* Theme wraps Clerk, not the other way round, so the light/dark
            switch works signed out and even without Clerk keys. */}
        <ThemeProvider>
          {clerkConfigured ? <ClerkProvider>{content}</ClerkProvider> : content}
        </ThemeProvider>
      </body>
    </html>
  );
}
