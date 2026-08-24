import { setRequestLocale, getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";
import { Sparkles, Music, HelpCircle, CalendarClock } from "lucide-react";
import { getFlag } from "@/lib/flags";
import { Link } from "@/i18n/navigation";
import { GlassCard } from "@/components/glass/GlassCard";

const TILES = [
  { key: "japa", flag: "playground.japa_counter", href: "/playground/japa-counter", Icon: Sparkles },
  { key: "kirtan", flag: "playground.kirtan_library", href: "/playground/kirtan-library", Icon: Music },
  { key: "quiz", flag: "playground.gita_quiz", href: "/playground/gita-quiz", Icon: HelpCircle },
  { key: "calendar", flag: "playground.spiritual_calendar", href: "/playground/spiritual-calendar", Icon: CalendarClock },
];

export default async function PlaygroundPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("playground");

  const flags = await Promise.all(TILES.map((tile) => getFlag(tile.flag, false)));

  return (
    <div className="mx-auto max-w-4xl px-5 py-14 md:px-10 md:py-20">
      <span className="text-xs font-bold uppercase tracking-widest text-gold-ink">
        {t("eyebrow")}
      </span>
      <h1 className="mt-3 text-3xl font-extrabold text-foreground md:text-5xl">{t("title")}</h1>
      <p className="font-hindi mt-2 text-gold-ink/70">{t("subtitle")}</p>

      <div className="mt-10 grid grid-cols-2 gap-4 md:gap-6">
        {TILES.map((tile, i) => {
          const enabled = flags[i];
          const tileContent = (
            <GlassCard
              tint={i % 2 === 1 ? "purple" : "gold"}
              className={`flex aspect-square flex-col justify-between p-5 md:p-7 ${
                enabled ? "" : "opacity-50"
              }`}
            >
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-gold-light to-brand-gold text-brand-ink md:h-14 md:w-14">
                <tile.Icon className="h-6 w-6" />
              </span>
              <div>
                <p className="text-lg font-bold text-foreground md:text-xl">
                  {t(`${tile.key}.title`)}
                </p>
                <p className="font-hindi text-sm text-gold-ink/70">
                  {t(`${tile.key}.title_hi`)}
                </p>
                {!enabled && (
                  <span className="mt-2 inline-block rounded-full border border-glass/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-foreground/50">
                    {t("coming_soon")}
                  </span>
                )}
              </div>
            </GlassCard>
          );

          return enabled ? (
            <Link key={tile.key} href={tile.href}>
              {tileContent}
            </Link>
          ) : (
            <div key={tile.key}>{tileContent}</div>
          );
        })}
      </div>
    </div>
  );
}
