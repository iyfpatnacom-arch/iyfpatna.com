import Image from "next/image";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { ArrowRight, CalendarDays, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { routing } from "@/i18n/routing";
import { istDayKey, upcomingObservances } from "@/lib/panchang";

/*
 * Revalidate rather than prerender-and-forget.
 *
 * Two things move under this page: the `isCurrent` flag temple staff flip in
 * the database, and the date itself, which is what now picks the highlight. A
 * fully static page would freeze both — it would still be advertising a
 * festival that finished in August until someone redeployed. Five minutes is
 * well inside the time it takes anyone to notice either one.
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
 * Every festival card, and the highlight, land here.
 *
 * The cards carry a month, or at best a day and a month — enough to place a
 * festival in the year, not enough to plan around, because most of these
 * follow the lunar calendar and move by a fortnight from one year to the
 * next. Rather than restate a date per festival that would go stale, each
 * card hands the visitor to the one screen that computes tithi, fasting
 * window and break-fast time properly.
 */
const CALENDAR_HREF = "/playground/vaishnava-calendar";

/*
 * Banner photograph.
 *
 * This is a Times of India press image, supplied by the site owner. It is NOT
 * freely licensed, so it is credited by source and no licence is asserted —
 * see public/festivals/CREDITS.md, which records that permission still has to
 * be obtained or the photograph replaced with the temple's own.
 *
 * It is a Janmashtami photograph and stays one whatever the highlight below
 * says, which is why its alt text describes the picture rather than the
 * festival on show.
 */
const PHOTO = {
  src: "/festivals/janmashtami.jpg",
  author: "Times of India",
  sourceUrl:
    "https://static.toiimg.com/thumb/resizemode-4,width-1280,height-720,msid-133624643/133624643.jpg",
};

/**
 * The festival the banner is about: today's, or the next one coming.
 *
 * The highlight used to be a hard-coded Janmashtami, which meant the page
 * spent ten months of the year inviting people to a festival that had already
 * happened. There is no need to store any of this: the panchang engine that
 * drives the calendar computes the whole Vaishnava year from tithi, so the
 * highlight is derived from the date at render time and cannot go stale.
 *
 * `upcomingObservances` counts from today inclusive, so a single scan answers
 * both halves of the rule — if today is itself a festival it is the first
 * result, and otherwise the first result is the next one due. Ekadashi days
 * come back in that list too and are filtered out: a fast is an observance to
 * keep, not a celebration to invite somebody to.
 *
 * The window widens rather than starting wide because each day costs a
 * full panchang computation. Sixty days almost always contains a festival;
 * the second pass exists for the rare quiet stretch and for correctness, not
 * because it is expected to run.
 */
function pickHighlight(todayKey) {
  for (const days of [60, 240]) {
    const found = upcomingObservances(todayKey, days).find((day) => day.festival);
    if (found) return found;
  }
  return null;
}

const intlLocale = (locale) => (locale === "hi" ? "hi-IN" : "en-IN");

/* Fixed to UTC so the label is decided by the day key alone and never by the
   timezone the server happens to be built in. */
function formatDay(dayKey, locale) {
  return new Date(`${dayKey}T00:00:00Z`).toLocaleDateString(intlLocale(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

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

  /*
   * A database row still wins, because a festival flagged `isCurrent` is a
   * deliberate act by temple staff — a multi-day programme with its own
   * schedule that the tithi table cannot know about. Everything else is the
   * computed highlight, so the page is correct on any day nobody has touched
   * it. Both reduce to the same shape, and the markup below never has to know
   * which one it is rendering.
   */
  const todayKey = istDayKey();
  const highlight = current ? null : pickHighlight(todayKey);

  const festival = current
    ? {
        title: current.title?.[locale],
        description: current.description?.[locale],
        dateLabel: null,
        isToday: true,
        schedule: (current.schedule || []).map((event) => ({
          dateLabel: event.dateLabel?.[locale],
          title: event.title?.[locale],
        })),
      }
    : {
        title: highlight?.festival.name?.[locale],
        description: highlight?.festival.note?.[locale],
        dateLabel: highlight ? formatDay(highlight.dayKey, locale) : null,
        isToday: highlight?.dayKey === todayKey,
        schedule: [],
      };

  /*
   * The year's festivals, on the same database-wins rule as the banner above.
   *
   * Temple staff who have bothered to enter a year's festivals should see
   * theirs rather than the stock cycle, so their rows replace the catalogue
   * outright instead of being appended to it — appending would show
   * Radhashtami twice the moment anyone added it. Database rows carry only a
   * title and a description, so the card treats the date tile, the tag and
   * the date line as optional rather than inventing values for them.
   */
  const annual =
    others.length > 0
      ? others.map((item) => ({
          key: item._id,
          name: item.title?.[locale],
          description: item.description?.[locale],
        }))
      : t.raw("all");

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
            /* Describes the photograph, not the festival on show — the
               highlight below now changes with the date while this one
               image does not. */
            alt={t("photo_alt")}
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
          {festival.isToday ? t("current_badge") : t("upcoming_badge")}
        </p>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
          {festival.title}
        </h2>
        {festival.dateLabel && (
          <p className="mt-2 font-mono text-sm font-medium text-primary">
            {festival.dateLabel}
          </p>
        )}
        {festival.description && (
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            {festival.description}
          </p>
        )}
        {/* The computed highlight has no schedule of its own — the calendar is
            where its tithi, fasting window and parana actually live. */}
        {!festival.schedule?.length && (
          <Button
            variant="outline"
            className="mt-6 rounded-full"
            render={<Link href={CALENDAR_HREF} />}
          >
            {t("card_cta")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
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

      {/* The rest of the Vaishnava year */}
      <section className="mt-20">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("all_title")}
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          {t("all_subtitle")}
        </p>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {annual.map((item) => (
            <li key={item.key} className="h-full">
              <Link
                href={CALENDAR_HREF}
                className="group flex h-full flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-primary/3 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <div className="flex items-start gap-4">
                  {/* Date tile. Two lines for a dated festival (28 / Aug),
                      one for the month-only ones whose tithi has not been
                      fixed yet, and a calendar glyph for a database row that
                      carries no date at all — never a placeholder digit. */}
                  <span className="grid size-14 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 leading-none text-primary">
                    {item.tileTop ? (
                      <>
                        <span className="text-lg font-semibold tabular-nums">
                          {item.tileTop}
                        </span>
                        {item.tileBottom && (
                          <span className="mt-1 text-[10px] font-medium tracking-wider uppercase">
                            {item.tileBottom}
                          </span>
                        )}
                      </>
                    ) : (
                      <CalendarDays className="size-5" aria-hidden="true" />
                    )}
                  </span>

                  <div className="min-w-0">
                    {item.tag && (
                      <span className="inline-flex rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                        {item.tag}
                      </span>
                    )}
                    <h3 className="mt-2 text-[15px] font-semibold tracking-tight text-balance">
                      {item.name}
                    </h3>
                    {item.when && (
                      <p className="mt-0.5 font-mono text-xs font-medium text-primary">
                        {item.when}
                      </p>
                    )}
                  </div>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>

                {/* Pushed to the bottom so the affordance sits on one line
                    across the row however uneven the descriptions are. */}
                <span className="mt-auto flex items-center gap-1.5 pt-4 text-xs font-medium text-primary">
                  {t("card_cta")}
                  <ArrowRight
                    className="size-3.5 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

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
