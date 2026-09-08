import { setRequestLocale, getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { ToolShell } from "@/components/playground/ToolShell";
import { GitaDaily } from "@/components/playground/GitaDaily";

/**
 * Static. The puzzle is a pure function of the date resolved on the client, so
 * prerendering this page cannot bake yesterday's verse into it — which is
 * exactly why the selection lives in `lib/gita/daily.js` rather than in a
 * server query.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "playground.tools.gita_daily",
  });
  return { title: t("name"), description: t("tagline") };
}

export default async function GitaDailyPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <ToolShell toolKey="gita_daily">
      <GitaDaily />
    </ToolShell>
  );
}
