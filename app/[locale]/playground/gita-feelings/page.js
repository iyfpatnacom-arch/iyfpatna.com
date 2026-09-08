import { setRequestLocale, getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { ToolShell } from "@/components/playground/ToolShell";
import { GitaFeelings } from "@/components/playground/GitaFeelings";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "playground.tools.feelings" });
  return { title: t("name"), description: t("tagline") };
}

export default async function GitaFeelingsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <ToolShell toolKey="feelings">
      <GitaFeelings />
    </ToolShell>
  );
}
