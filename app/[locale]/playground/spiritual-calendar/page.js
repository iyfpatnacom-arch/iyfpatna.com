import { setRequestLocale, getTranslations } from "next-intl/server";
import { GlassCard } from "@/components/glass/GlassCard";

// STUB: dates below are placeholders, not computed from a real panchang.
// TODO: integrate a verified Vaishnava panchang data source (e.g. a
// maintained Ekadashi/festival API) before relying on this for real dates.
const PROVISIONAL_DATES = [
  { date: "2026-08-30", label: { hi: "एकादशी", en: "Ekadashi" } },
  { date: "2026-09-13", label: { hi: "एकादशी", en: "Ekadashi" } },
];

export default async function SpiritualCalendarPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("playground.calendar");

  return (
    <div className="mx-auto max-w-xl px-5 py-14 md:px-10 md:py-20">
      <h1 className="text-3xl font-extrabold text-foreground md:text-4xl">{t("title")}</h1>
      <p className="mt-2 text-foreground/60">{t("subtitle")}</p>

      <GlassCard className="mt-8 border-brand-gold/25 p-4 text-sm text-gold-ink">
        {t("notice")}
      </GlassCard>

      <div className="mt-6 flex flex-col gap-2">
        {PROVISIONAL_DATES.map((d) => (
          <GlassCard key={d.date} className="flex items-center justify-between p-4">
            <span className="text-foreground/80">{d.label[locale]}</span>
            <span className="text-sm font-semibold text-foreground/50">{d.date}</span>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
