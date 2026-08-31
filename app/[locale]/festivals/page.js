import Image from "next/image";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { CalendarDays, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { routing } from "@/i18n/routing";

/*
 * Revalidate rather than prerender-and-forget. The festival on show is chosen
 * by an `isCurrent` flag that temple staff flip in the database; a fully
 * static page would keep serving last year's festival until someone
 * redeployed. Five minutes is well inside the time it takes anyone to notice.
 */
export const revalidate = 300;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "festivals" });
  return { title: t("title"), description: t("subtitle") };
}

/*
 * Banner photograph.
 *
 * This is a Times of India press image, supplied by the site owner. It is NOT
 * freely licensed, so it is credited by source and no licence is asserted —
 * see public/festivals/CREDITS.md, which records that permission still has to
 * be obtained or the photograph replaced with the temple's own.
 */
const PHOTO = {
  src: "/festivals/janmashtami.jpg",
  author: "Times of India",
  sourceUrl:
    "https://static.toiimg.com/thumb/resizemode-4,width-1280,height-720,msid-133624643/133624643.jpg",
};

/**
 * Reads the festival data, tolerating a missing database.
 *
 * The page used to be `force-dynamic` and called `dbConnect()` at module
 * scope, so a database hiccup took the whole route down with a 500. Festivals
 * are public marketing content: a generic page beats an error page, so a
 * failed read degrades to the copy in the message catalogue instead.
 */
async function loadFestivals() {
  try {
    const { dbConnect } = await import("@/lib/db/connect");
    const { default: Festival } = await import("@/models/Festival");
    const { toPlain } = await import("@/lib/serialize");

    await dbConnect();
    const [current, others] = await Promise.all([
      Festival.findOne({ isCurrent: true }).lean(),
      Festival.find({ isCurrent: { $ne: true } })
        .sort({ createdAt: -1 })
        .lean(),
    ]);
    return {
      current: current ? toPlain(current) : null,
      others: toPlain(others),
    };
  } catch (error) {
    console.warn(
      "[festivals] database unavailable, using fallback copy:",
      error.message
    );
    return { current: null, others: [] };
  }
}

export default async function FestivalsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("festivals");
  const { current, others } = await loadFestivals();

  // Both sources reduce to the same three fields, so the markup below never
  // has to know whether it is rendering database rows or fallback copy.
  const festival = current
    ? {
        title: current.title?.[locale],
        description: current.description?.[locale],
        schedule: (current.schedule || []).map((event) => ({
          dateLabel: event.dateLabel?.[locale],
          title: event.title?.[locale],
        })),
      }
    : {
        title: t("fallback.title"),
        description: t("fallback.description"),
        schedule: t.raw("fallback.schedule"),
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

      {/* Banner */}
      <figure className="mt-12">
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border">
          <Image
            src={PHOTO.src}
            alt={festival.title}
            fill
            priority
            sizes="(min-width: 1280px) 1152px, 100vw"
            className="object-cover"
          />
        </div>
        <figcaption className="mt-2 text-right text-[11px] text-muted-foreground">
          <a
            href={PHOTO.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            {t("photo_credit", { author: PHOTO.author })}
          </a>
        </figcaption>
      </figure>

      {/* Current festival */}
      <section className="mt-10">
        <p className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="size-3.5" aria-hidden="true" />
          {t("current_badge")}
        </p>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
          {festival.title}
        </h2>
        {festival.description && (
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            {festival.description}
          </p>
        )}

        {festival.schedule?.length > 0 && (
          <>
            <h3 className="mt-10 flex items-center gap-2 text-[11px] font-semibold tracking-wider text-foreground/70 uppercase">
              <CalendarDays className="size-3.5" aria-hidden="true" />
              {t("schedule_title")}
            </h3>

            {/* The same milestone track as the daily schedule, so the two
                pages read as one system rather than two designs. */}
            <ol className="mt-6 grid grid-cols-2 gap-x-5 gap-y-9 lg:grid-cols-4 lg:gap-x-3">
              {festival.schedule.map((event, index) => {
                const isLast = index === festival.schedule.length - 1;
                return (
                  <li
                    key={`${event.dateLabel}-${event.title}`}
                    className="relative flex flex-col items-center text-center"
                  >
                    {!isLast && (
                      <span
                        aria-hidden="true"
                        className="absolute top-5 left-1/2 hidden h-px w-full bg-border lg:block"
                      />
                    )}
                    <span className="relative z-10 grid size-10 place-items-center rounded-full border border-primary/25 bg-primary/10 text-xs font-semibold text-primary tabular-nums">
                      {index + 1}
                    </span>
                    <p className="mt-3 font-mono text-xs font-medium text-primary">
                      {event.dateLabel}
                    </p>
                    <h4 className="mt-1 text-[15px] font-semibold tracking-tight text-balance">
                      {event.title}
                    </h4>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </section>

      {/* Other festivals, when the database has them */}
      {others.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-semibold tracking-tight">
            {t("other_title")}
          </h2>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((item) => (
              <li
                key={item._id}
                className="rounded-xl border border-border bg-card p-5"
              >
                <h3 className="font-semibold tracking-tight">
                  {item.title?.[locale]}
                </h3>
                {item.description?.[locale] && (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {item.description[locale]}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-16 rounded-2xl border border-border bg-muted/30 p-6 sm:p-8">
        <h2 className="text-lg font-semibold tracking-tight">
          {t("join_title")}
        </h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          {t("join_body")}
        </p>
        <Button className="mt-6 rounded-full" render={<Link href="/programs" />}>
          {t("join_cta")}
        </Button>
      </section>
    </div>
  );
}
