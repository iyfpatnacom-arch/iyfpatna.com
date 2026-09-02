import { setRequestLocale, getTranslations } from "next-intl/server";
import { ComingSoon } from "@/components/site/ComingSoon";
import { routing } from "@/i18n/routing";

/**
 * Playground — not open yet.
 *
 * The previous version read four feature flags out of MongoDB on every
 * request (`force-dynamic`) to decide which tiles to light up, and its tiles
 * led to pages that query the database directly. With the database
 * unreachable those routes 500, which is what the bottom dock's Playground
 * tab was doing in production.
 *
 * The tools themselves still live under `playground/*` and are unchanged;
 * nothing links to them until they are ready to be linked to. Restoring the
 * tile grid is a matter of putting the old page back — see git history — once
 * there is a database behind it.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "playground" });
  return { title: t("title") };
}

export default async function PlaygroundPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("playground");

  return (
    <ComingSoon
      eyebrow={t("eyebrow")}
      title={t("title")}
      body={t("coming_soon_body")}
    />
  );
}
