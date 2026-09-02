import { setRequestLocale, getTranslations } from "next-intl/server";
import { ComingSoon } from "@/components/site/ComingSoon";
import { routing } from "@/i18n/routing";

/**
 * Profile / dashboard — not open yet.
 *
 * The previous version called `dbConnect()` and then queried three
 * collections for the signed-in user. When the database was unreachable that
 * threw straight out of the server component, so the dock's Profile tab
 * rendered the error page rather than anything a visitor could act on.
 *
 * `DashboardTabs` and the models it reads are untouched; put the old page
 * back (see git history) when there is a database and an account system
 * behind it.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard" });
  return { title: t("title") };
}

export default async function DashboardPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");

  return (
    <ComingSoon
      eyebrow={t("eyebrow")}
      title={t("title")}
      body={t("coming_soon_body")}
    />
  );
}
