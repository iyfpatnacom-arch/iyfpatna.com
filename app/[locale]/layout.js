import { Plus_Jakarta_Sans, Mukta, Instrument_Serif } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ClerkProvider } from "@clerk/nextjs";
import { clerkConfigured } from "@/lib/auth-config";
import { routing } from "@/i18n/routing";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { GlassNav } from "@/components/glass/GlassNav";
import { GlassTopBar } from "@/components/glass/GlassTopBar";
import { GlassDock } from "@/components/glass/GlassDock";
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
  title: "ISKCON Youth Forum Patna",
  description:
    "A community of students in Patna practising bhakti-yoga — kirtan, Gita study, seva and festivals.",
  manifest: "/manifest.webmanifest",
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf6ef" },
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

  const content = (
    <NextIntlClientProvider>
      <TooltipProvider>
        <GlassNav clerkConfigured={clerkConfigured} />
        <GlassTopBar />
        <main className="flex-1 pb-28 md:pb-0">
          <PageTransition>{children}</PageTransition>
        </main>
        <GlassDock />
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
