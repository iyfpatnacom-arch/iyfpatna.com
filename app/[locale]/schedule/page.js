import {
  setRequestLocale,
  getTranslations,
  getFormatter,
} from "next-intl/server";
import { Bell, DoorOpen, Flame, Lamp, MapPin, Moon, MoonStar, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { routing } from "@/i18n/routing";
import { DAILY_SCHEDULE, ORG } from "@/lib/site-config";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "schedule" });
  return { title: t("title"), description: t("subtitle") };
}

const ICONS = {
  bell: Bell,
  door: DoorOpen,
  sun: Sun,
  lamp: Lamp,
  flame: Flame,
  moon: Moon,
};

const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  ORG.address
)}`;

/**
 * Temple daily schedule, laid out as milestones along a track.
 *
 * The whole day has to be readable in one glance, so it never becomes a list
 * you scroll: six across on a large screen, three on smaller ones. Three
 * columns rather than two on a phone is deliberate — two would push the last
 * pair below the fold on a 390x844 screen, which is exactly what this layout
 * exists to avoid. Marker and type shrink to pay for it.
 *
 * The connector between markers is dashed across the midday closure, so the
 * break in the day is visible in the shape of the track rather than only in
 * the note underneath.
 *
 * Times live in `DAILY_SCHEDULE` as 24-hour strings and are formatted through
 * next-intl, so each locale gets its own meridiem rather than a second
 * hardcoded copy of every time. (hi-IN keeps Latin digits, which is the
 * ordinary convention.)
 */
export default async function SchedulePage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("schedule");
  const format = await getFormatter();

  const formatTime = (hhmm) => {
    const [hours, minutes] = hhmm.split(":").map(Number);
    return format.dateTime(new Date(2000, 0, 1, hours, minutes), {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <p className="text-xs font-semibold tracking-wider text-primary uppercase">
        {t("eyebrow")}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
        {t("subtitle")}
      </p>

      <ol className="mt-12 grid grid-cols-3 gap-x-3 gap-y-8 sm:mt-14 sm:gap-x-5 sm:gap-y-10 lg:grid-cols-6 lg:gap-x-3">
        {DAILY_SCHEDULE.map((entry, index) => {
          const Icon = ICONS[entry.icon] ?? Bell;
          const isLast = index === DAILY_SCHEDULE.length - 1;

          return (
            <li
              key={entry.key}
              className="relative flex flex-col items-center text-center"
            >
              {/* Track to the next milestone. Only drawn where the row is
                  actually continuous — on a wrapped grid it would run off
                  the end of a line and point at nothing. */}
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-5 left-1/2 hidden h-px w-full sm:top-6 lg:block",
                    entry.gap
                      ? "border-t border-dashed border-muted-foreground/40"
                      : "bg-border"
                  )}
                />
              )}

              <span className="relative z-10 grid size-10 place-items-center rounded-full border border-primary/25 bg-primary/10 text-primary sm:size-12">
                <Icon className="size-4.5 sm:size-5" aria-hidden="true" />
              </span>

              <p className="mt-2.5 font-mono text-[11px] font-medium text-primary tabular-nums sm:mt-3 sm:text-sm">
                <time dateTime={entry.time}>{formatTime(entry.time)}</time>
              </p>
              <h2 className="mt-1 text-[13px] font-semibold tracking-tight text-balance sm:text-[15px]">
                {t(`items.${entry.key}.name`)}
              </h2>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground sm:text-[13px]">
                {t(`items.${entry.key}.body`)}
              </p>
            </li>
          );
        })}
      </ol>

      {/* The closure, stated in words for the breakpoints where the dashed
          segment of the track is not rendered. */}
      <p className="mt-12 flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 rounded-xl border border-dashed border-muted-foreground/30 px-5 py-4 text-center text-sm">
        <span className="font-medium text-foreground">{t("closed_label")}</span>
        <span className="text-muted-foreground">{t("closed_note")}</span>
      </p>

      <section className="mt-14 rounded-2xl border border-border bg-muted/30 p-6 sm:p-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <MoonStar className="size-4 text-primary" aria-hidden="true" />
          {t("note_title")}
        </h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          {t("note_body")}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            className="rounded-full"
            render={
              <a href={mapsHref} target="_blank" rel="noopener noreferrer" />
            }
          >
            <MapPin className="size-4" aria-hidden="true" />
            {t("note_cta")}
          </Button>
          <a
            href={`tel:${ORG.phone.replace(/\s+/g, "")}`}
            className="text-sm font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
          >
            {ORG.phone}
          </a>
        </div>
      </section>
    </div>
  );
}
