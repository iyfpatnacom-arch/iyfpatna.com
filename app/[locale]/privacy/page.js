import { setRequestLocale, getTranslations } from "next-intl/server";
import { PolicyPage } from "@/components/legal/PolicyPage";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal.privacy" });
  return {
    title: t("title"),
    description: t("intro"),
  };
}

export default async function PrivacyPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <PolicyPage doc="privacy" />;
}
