import { setRequestLocale, getTranslations } from "next-intl/server";
import {
  ArrowRight,
  BookOpenText,
  CalendarDays,
  MapPin,
  Phone,
  ScrollText,
  Ticket,
  Trophy,
  Users,
} from "lucide-react";
import { Button as MovingBorderButton } from "@/components/ui/moving-border";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { Spotlight } from "@/components/ui/spotlight";
import { Panel } from "@/components/site/Panel";
import { Diya } from "@/components/gita/Diya";
import { GitaCarousel } from "@/components/gita/GitaCarousel";
import { GitaStage } from "@/components/gita/GitaStage";
import { PrizePodium } from "@/components/gita/PrizePodium";
import { GitaRegisterForm } from "@/components/gita/GitaRegisterForm";
import { ORG } from "@/lib/site-config";
import { getFlag } from "@/lib/flags";
import {
  eventOf,
  formatINR,
  getFestival,
  isRegistrationOpen,
  priceTable,
} from "@/lib/gita-event/catalog";

/**
 * /gita-mahotsav — the festival's one public page: what it is, what can be
 * won, and the form that registers for it.
 *
 * One page rather than a landing page plus a form page. The fee is ₹101 and
 * the decision takes about fifteen seconds, so a second navigation between
 * reading and paying is pure loss; everything above the form exists to answer
 * the questions somebody asks in those fifteen seconds and nothing more.
 *
 * It is two layouts, not one responsive one, because a phone and a desktop are
 * answering different questions here:
 *
 *   - A phone gets `GitaStage`: one painting filling the screen with the
 *     festival's two names, three facts and Register set over it, and the
 *     form as a sheet over the same picture. Almost everybody arrives on a
 *     phone from a WhatsApp forward of this artwork, and the thing they came
 *     to do fits on one screen.
 *   - From `md` up the page is the long one — hero, prizes, the two events,
 *     the highlights, the form in a column and the FAQ — because a desktop
 *     reader is usually deciding rather than acting, and there is room to
 *     answer them without anything being hidden behind a tap.
 *
 * Under the stage the phone still gets the prizes and the questions, trimmed:
 * the events and the highlights are already said by the poster and the pills.
 *
 * Server-rendered apart from the stage, the form, the prize cards and the
 * hero's beams. The copy, the dates and the prices all come from
 * content/events, so this file holds layout and no facts — a price or a date
 * is changed in the JSON and the page, the receipt and the gateway all move
 * together.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const festival = getFestival();
  return {
    title: festival.title[locale] || festival.title.en,
    description: festival.summary[locale] || festival.summary.en,
    openGraph: {
      title: festival.title[locale] || festival.title.en,
      description: festival.summary[locale] || festival.summary.en,
    },
  };
}

/* The icons the catalog's `highlights` name, kept here rather than in the JSON:
   content should not have to know which icon set this site ships. */
const HIGHLIGHT_ICONS = {
  trophy: Trophy,
  scroll: ScrollText,
  users: Users,
  ticket: Ticket,
};

const EVENT_ICONS = { quiz: BookOpenText, mahotsav: MapPin };

export default async function GitaMahotsavPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("gita");

  const festival = getFestival();
  const lang = locale === "en" ? "en" : "hi";

  /* Two ways to close registration, and either is enough: a flag the admin can
     throw the night before the quiz, and the catalog's own switch. */
  const open = (await getFlag("gita.registrationsOpen", true)) && isRegistrationOpen();

  const { combo } = priceTable();

  const events = festival.events.map((event) => ({
    key: event.key,
    title: event.title[lang] || event.title.en,
    tagline: event.tagline[lang] || event.tagline.en,
    detail: event.detail[lang] || event.detail.en,
    dateLabel: event.dateLabel?.[lang] || event.dateLabel?.en || null,
    modeLabel: event.modeLabel?.[lang] || event.modeLabel?.en || null,
    amount: Number(event.amount),
  }));

  const prizes = festival.prizes.map((prize) => ({
    place: prize.place,
    amount: formatINR(prize.amount),
    label: prize.label[lang] || prize.label.en,
  }));

  /* Localised here so the carousel, which is a client component, is handed
     finished strings rather than importing the catalog into the browser
     bundle — it reaches for `lib/settings`, and through it mongoose. */
  const localise = (slides) =>
    (slides ?? []).map((slide) => ({
      src: slide.src,
      width: slide.width,
      height: slide.height,
      alt: slide.alt?.[lang] || slide.alt?.en || "",
    }));

  /* Two pieces of artwork, not one scaled. The desktop pair are finished
     posters with the festival's names drawn into them; the phone's is a
     single untyped painting, because on a phone the names are set over it as
     live text (see GitaStage) and two sets of lettering in one frame is one
     too many. */
  const gallery = localise(festival.gallery);
  const poster = {
    src: festival.poster.src,
    width: festival.poster.width,
    height: festival.poster.height,
    alt: festival.poster.alt?.[lang] || festival.poster.alt?.en || "",
  };
  const posterLines = festival.posterLines.map((line) => line[lang] || line.en);

  const prizePool = festival.prizes.reduce((sum, prize) => sum + Number(prize.amount), 0);
  const quiz = eventOf("quiz");
  const helpline = festival.helpline || ORG.phone;

  /* The three the poster has room for, in the order somebody asks them. */
  const facts = [
    { label: t("hero_prize_pool"), value: formatINR(prizePool) },
    {
      label: t("hero_quiz_date"),
      value: quiz?.dateLabel?.[lang] || quiz?.dateLabel?.en || "—",
    },
    { label: t("hero_fee"), value: formatINR(events[0].amount) },
  ];

  return (
    <div className="w-full">
      {/* The floating WhatsApp button is hidden for this route — see the rule
          in globals.css. The page has its own full-width Register button
          pinned over the poster, and two round buttons stacked in the same
          corner of a phone is one too many. The group is joined from the
          confirmation page the moment a registration is paid for, which is
          the only moment the invite is any use. */}
      <div data-hide-whatsapp-fab hidden aria-hidden="true" />

      {/* ------------------------------------------------- phone: the poster */}
      <GitaStage
        poster={poster}
        lines={posterLines}
        eyebrow={festival.eyebrow[lang] || festival.eyebrow.en}
        facts={facts}
        events={events}
        combo={combo}
        open={open}
        detailsHref="#festival"
      />

      {/* --------------------------------------------------- desktop: a hero */}
      <section className="relative isolate hidden overflow-hidden bg-brand-ink text-brand-cream md:block">
        {/* The beams and the spotlight are the page's atmosphere, and they are
            drawn on a fixed near-black rather than on `--background`: both are
            built for a dark surface, and in light mode they would be a grey
            smear over cream. The hero is a constant piece of brand furniture,
            the same decision the site header already makes. */}
        <BackgroundBeams className="opacity-70" />
        <Spotlight className="-top-40 left-0 md:-top-24 md:left-52" fill="#F2A63B" />

        <div className="relative z-10 mx-auto w-full max-w-5xl px-6 py-20 md:py-24">
          <div className="flex flex-col items-center text-center">
            <Diya className="size-14 text-brand-gold" />

            <p className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-brand-gold/35 bg-brand-gold/10 px-3.5 py-1 text-[11px] font-semibold tracking-wider text-brand-gold-light uppercase">
              {festival.eyebrow[lang] || festival.eyebrow.en}
            </p>

            {/* The posters are the headline: each one carries the festival's
                name in its own artwork, which is why the page's `h1` is here
                rather than above them, and is for screen readers only. The
                names a sighted reader sees are inside the pictures; the names
                everybody else gets are in their alt text. */}
            <h1 className="sr-only">{festival.title[lang] || festival.title.en}</h1>

            {/* A fixed 16:10 window with the poster fitted inside it. The two
                desktop slides are a 3:4 poster and a 16:9 banner, so a frame
                that took each picture's own height would jump by half the
                viewport every six seconds. */}
            <GitaCarousel
              slides={gallery}
              fit="contain"
              className="mt-8 max-w-3xl"
              frameClassName="aspect-[16/10] rounded-2xl border border-brand-gold/25 bg-brand-ink-2 shadow-2xl shadow-black/40"
              dotsClassName="bottom-3"
              sizes="(min-width: 1024px) 768px, 90vw"
            />

            {/* The three facts somebody wants before they scroll. */}
            <dl className="mt-8 grid w-full max-w-2xl grid-cols-3 gap-3">
              {[
                { Icon: Trophy, ...facts[0] },
                { Icon: CalendarDays, ...facts[1] },
                { Icon: Ticket, ...facts[2] },
              ].map(({ Icon, label, value }) => (
                <div
                  key={label}
                  className="rounded-xl border border-brand-cream/12 bg-brand-cream/[0.04] p-3 text-start backdrop-blur-sm"
                >
                  <dt className="flex items-center gap-1.5 text-[11px] font-medium text-brand-cream/60">
                    <Icon className="size-3.5 text-brand-gold" aria-hidden="true" />
                    {label}
                  </dt>
                  <dd className="mt-1 text-base font-semibold tracking-tight">{value}</dd>
                </div>
              ))}
            </dl>

            <MovingBorderButton
              as="a"
              href="#register"
              borderRadius="999px"
              duration={3500}
              containerClassName="mt-9 h-14 w-auto p-[1.5px] text-base"
              borderClassName="h-20 w-20 bg-[radial-gradient(#F2A63B_40%,transparent_60%)] opacity-80"
              className="gap-2 border-brand-gold/30 bg-brand-ink-2/80 px-7 text-base font-semibold text-brand-cream"
            >
              {open ? t("hero_cta") : t("hero_cta_closed")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </MovingBorderButton>

            <p className="mt-3 text-xs text-brand-cream/55">{t("hero_cta_note")}</p>
          </div>
        </div>

        {/* A gold rule hands the hero off to the page, the way the site
            header's band does. */}
        <div
          className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-gold/50 to-transparent"
          aria-hidden="true"
        />
      </section>

      <div id="festival" className="mx-auto w-full max-w-5xl scroll-mt-20 px-4 sm:px-6">
        {/* -------------------------------------------------------- prizes */}
        <section className="py-12 sm:py-16" aria-labelledby="gita-prizes">
          <h2
            id="gita-prizes"
            className="text-center text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            {t("prizes_title")}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm leading-relaxed text-muted-foreground">
            {t("prizes_body", { total: formatINR(prizePool) })}
          </p>
          <div className="mt-8">
            <PrizePodium prizes={prizes} note={t("prizes_note")} />
          </div>
        </section>

        {/* -------------------------------------------------- the two events
            Desktop only: on a phone the poster names both of them and the
            form prices both of them, and this is the same thing a third
            time. */}
        <section className="hidden pb-12 md:block sm:pb-16" aria-labelledby="gita-events">
          <h2 id="gita-events" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("events_title")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {combo
              ? t("events_body", { price: formatINR(combo) })
              : t("events_body_plain")}
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {events.map((event) => {
              const Icon = EVENT_ICONS[event.key] ?? BookOpenText;
              return (
                <Panel key={event.key} className="flex flex-col p-5 sm:p-6">
                  <span className="grid size-10 place-items-center rounded-full bg-primary/12 text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight">{event.title}</h3>
                  <p className="mt-1 text-xs font-medium text-primary">{event.tagline}</p>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {event.detail}
                  </p>
                  <dl className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-border/60 pt-4 text-xs">
                    <div>
                      <dt className="text-muted-foreground">{t("event_fee")}</dt>
                      <dd className="mt-0.5 text-sm font-semibold">{formatINR(event.amount)}</dd>
                    </div>
                    {event.dateLabel && (
                      <div>
                        <dt className="text-muted-foreground">{t("event_when")}</dt>
                        <dd className="mt-0.5 text-sm font-semibold">{event.dateLabel}</dd>
                      </div>
                    )}
                    {event.modeLabel && (
                      <div>
                        <dt className="text-muted-foreground">{t("event_mode")}</dt>
                        <dd className="mt-0.5 text-sm font-semibold">{event.modeLabel}</dd>
                      </div>
                    )}
                  </dl>
                </Panel>
              );
            })}
          </div>
        </section>

        {/* ---------------------------------------------------- highlights */}
        <section className="hidden pb-12 md:block sm:pb-16">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {festival.highlights.map((highlight) => {
              const Icon = HIGHLIGHT_ICONS[highlight.icon] ?? Trophy;
              return (
                <div
                  key={highlight.icon}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <Icon className="size-5 text-primary" aria-hidden="true" />
                  <h3 className="mt-3 text-sm font-semibold tracking-tight">
                    {highlight.title[lang] || highlight.title.en}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {highlight.body[lang] || highlight.body.en}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ------------------------------------------------------ the form
            Desktop only: the phone opens the same form as a sheet over the
            poster, and two copies of it in one document would be two sets of
            saved details fighting over the same localStorage key. */}
        <section
          id="register"
          className="hidden scroll-mt-20 pb-12 md:block sm:pb-16"
          aria-labelledby="gita-register"
        >
          <div className="grid gap-8 lg:grid-cols-[1fr_1.15fr] lg:items-start lg:gap-12">
            <div className="lg:sticky lg:top-24">
              <h2
                id="gita-register"
                className="text-2xl font-semibold tracking-tight sm:text-3xl"
              >
                {t("register_title")}
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                {t("register_body")}
              </p>

              <ol className="mt-6 grid gap-4">
                {[t("step_one"), t("step_two"), t("step_three")].map((step, index) => (
                  <li key={index} className="flex gap-3 text-sm leading-relaxed">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/12 text-xs font-bold text-primary">
                      {index + 1}
                    </span>
                    <span className="text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ol>

              <a
                href={`tel:${helpline.replace(/\s/g, "")}`}
                className="mt-7 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-4 py-2 text-sm font-medium transition-colors hover:text-primary"
              >
                <Phone className="size-4 text-primary" aria-hidden="true" />
                {t("helpline", { phone: helpline })}
              </a>
            </div>

            <GitaRegisterForm events={events} combo={combo} open={open} />
          </div>
        </section>

        {/* ------------------------------------------------------------ faq */}
        <section className="pb-16 sm:pb-20" aria-labelledby="gita-faq">
          <h2 id="gita-faq" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("faq_title")}
          </h2>
          <div className="mt-6 grid gap-3">
            {festival.faqs.map((faq, index) => (
              <details
                key={index}
                className="group rounded-xl border border-border bg-card px-4 py-3 open:border-primary/30"
              >
                <summary className="cursor-pointer list-none text-sm font-semibold marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-start justify-between gap-3">
                    {faq.q[lang] || faq.q.en}
                    <span
                      className="mt-1 text-primary transition-transform group-open:rotate-45"
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </span>
                </summary>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                  {faq.a[lang] || faq.a.en}
                </p>
              </details>
            ))}
          </div>

          {/* The one way to reach a person, and on a phone the only one left
              once the events block is gone. */}
          <a
            href={`tel:${helpline.replace(/\s/g, "")}`}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-4 py-2 text-sm font-medium transition-colors hover:text-primary md:hidden"
          >
            <Phone className="size-4 text-primary" aria-hidden="true" />
            {t("helpline", { phone: helpline })}
          </a>
        </section>
      </div>
    </div>
  );
}
