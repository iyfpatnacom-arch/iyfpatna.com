import { setRequestLocale, getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { clerkConfigured } from "@/lib/auth-config";
import { ToolShell } from "@/components/playground/ToolShell";
import { SignedInProvider } from "@/components/playground/SignedInProvider";
import { JapaCounter } from "@/components/playground/JapaCounter";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "playground.tools.japa" });
  return { title: t("name"), description: t("tagline") };
}

export default async function JapaCounterPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <ToolShell toolKey="japa">
      <SignedInProvider clerkConfigured={clerkConfigured}>
        <JapaCounter />
      </SignedInProvider>
    </ToolShell>
  );
}
