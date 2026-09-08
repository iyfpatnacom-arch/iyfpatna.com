import { setRequestLocale, getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { istDayKey } from "@/lib/panchang";
import { ToolShell } from "@/components/playground/ToolShell";
import { VaishnavaCalendar } from "@/components/playground/VaishnavaCalendar";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "playground.tools.calendar" });
  return { title: t("name"), description: t("tagline") };
}

/**
 * Prerendered, and rebuilt every six hours.
 *
 * The calendar itself is pure arithmetic with no data source, so the only
 * thing that goes stale here is which day "today" is — and that is settled by
 * the `revalidate` window rather than by making the page dynamic. A visitor
 * arriving between rebuilds still gets a correct calendar; at worst the
 * highlighted cell is a few hours behind, and the client corrects it as soon
 * as they touch anything.
 */
export const revalidate = 21600;

export default async function VaishnavaCalendarPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <ToolShell toolKey="calendar" width="wide">
      <VaishnavaCalendar todayKey={istDayKey()} />
    </ToolShell>
  );
}
