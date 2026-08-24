import { setRequestLocale, getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";
import { dbConnect } from "@/lib/db/connect";
import Festival from "@/models/Festival";
import { toPlain } from "@/lib/serialize";
import { GlassCard } from "@/components/glass/GlassCard";

export default async function FestivalsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("festivals");

  await dbConnect();
  const [current, others] = await Promise.all([
    Festival.findOne({ isCurrent: true }).lean(),
    Festival.find({ isCurrent: { $ne: true } }).sort({ createdAt: -1 }).lean(),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-5 py-14 md:px-10 md:py-20">
      <span className="text-xs font-bold uppercase tracking-widest text-gold-ink">
        {t("eyebrow")}
      </span>
      <h1 className="mt-3 text-3xl font-extrabold text-foreground md:text-5xl">
        {t("title")}
      </h1>

      {!current && others.length === 0 && (
        <p className="mt-10 text-center text-foreground/50">{t("empty")}</p>
      )}

      {current && (
        <GlassCard tint="purple" className="mt-10 overflow-hidden">
          {current.image && (
            <img
              src={current.image}
              alt={current.title[locale]}
              className="h-56 w-full object-cover md:h-72"
            />
          )}
          <div className="p-6 md:p-10">
            <span className="rounded-full border border-brand-gold/30 bg-brand-gold/10 px-3 py-1.5 text-xs font-bold text-gold-ink">
              {t("current_badge")}
            </span>
            <h2 className="mt-4 text-3xl font-extrabold text-foreground md:text-4xl">
              {current.title[locale]}
            </h2>
            {current.description?.[locale] && (
              <p className="mt-3 max-w-2xl text-foreground/65">
                {current.description[locale]}
              </p>
            )}

            <h3 className="mt-8 text-sm font-bold uppercase tracking-widest text-foreground/50">
              {t("schedule_title")}
            </h3>
            <ol className="mt-4 flex flex-col gap-0">
              {current.schedule.map((event, i) => (
                <li key={i} className="relative flex gap-4 pb-6 pl-2 last:pb-0">
                  <div className="flex flex-col items-center">
                    <span className="h-3 w-3 shrink-0 rounded-full bg-gradient-to-br from-brand-gold-light to-brand-gold shadow-[0_0_12px_-2px_rgba(242,166,59,0.9)]" />
                    {i < current.schedule.length - 1 && (
                      <span className="mt-1 w-px flex-1 bg-glass/12" />
                    )}
                  </div>
                  <div className="pb-1">
                    <p className="text-xs font-semibold text-gold-ink">
                      {event.dateLabel[locale]}
                    </p>
                    <p className="mt-0.5 font-bold text-foreground">{event.title[locale]}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </GlassCard>
      )}

      {others.length > 0 && (
        <div className="mt-14">
          <h2 className="text-2xl font-extrabold text-foreground">{t("other_title")}</h2>
          <div className="-mx-5 mt-5 flex gap-4 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
            {toPlain(others).map((festival) => (
              <GlassCard
                key={festival._id}
                className="w-64 shrink-0 overflow-hidden p-0 md:w-auto"
              >
                {festival.image && (
                  <img src={festival.image} alt="" className="h-32 w-full object-cover" />
                )}
                <div className="p-4">
                  <h3 className="font-bold text-foreground">{festival.title[locale]}</h3>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
