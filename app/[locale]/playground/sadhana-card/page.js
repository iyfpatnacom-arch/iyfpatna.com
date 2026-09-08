import { setRequestLocale, getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { clerkConfigured } from "@/lib/auth-config";
import { ToolShell } from "@/components/playground/ToolShell";
import { SignedInProvider } from "@/components/playground/SignedInProvider";
import { SadhanaCard } from "@/components/playground/SadhanaCard";

/**
 * Static, like every tool page here. The card's data lives in the visitor's
 * browser, so there is nothing to fetch and nothing to go wrong when Mongo is
 * unreachable; whether they are signed in is settled on the client, which is
 * also what keeps this page prerenderable.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "playground.tools.sadhana" });
  return { title: t("name"), description: t("tagline") };
}

export default async function SadhanaCardPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <ToolShell toolKey="sadhana">
      <SignedInProvider clerkConfigured={clerkConfigured}>
        <SadhanaCard />
      </SignedInProvider>
    </ToolShell>
  );
}
