import { setRequestLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, CalendarDays, MapPin, Phone, Ticket } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Diya } from "@/components/gita/Diya";
import { GitaRegisterForm } from "@/components/gita/GitaRegisterForm";
import { ORG } from "@/lib/site-config";
import { getFlag } from "@/lib/flags";
import {
  eventOf,
  formatINR,
  getFestival,
  isRegistrationOpen,
  localisedEvents,
  priceTable,
} from "@/lib/gita-event/catalog";

/**
 * /gita-mahotsav/register — the form, on a page of its own.
 *
 * It used to be a sheet that slid up over the poster on the phone, which read
 * as the page answering rather than as arriving somewhere. That was the wrong
 * trade: a nine-field form inside a dialog that is 92svh tall gets two scroll
 * surfaces (the sheet and the page under it), the keyboard takes a third of
 * what is left, and an autofill dropdown over a translucent panel has the
 * poster showing through it. Paying is the one thing on this site a visitor
 * must not lose their place in, so it gets a route — the same shape the yatra
 * booking uses, and for the same reason.
 *
 * Solid, therefore, and deliberately: `bg-background`, no backdrop filter, no
 * scrim. Everything a frosted sheet spends a full-surface readback per frame
 * on is spent here on nothing at all, which on the mid-range Android this is
 * mostly opened from is the difference between a form that types smoothly and
 * one that does not.
 *
 * What sits above the form is only what somebody about to pay still needs:
 * the way back, the date, the fee, the venue, and a phone number. The prizes,
 * the banners and the questions are all on /gita-mahotsav, which is where
 * they were read before this link was tapped.
 *
 * Dynamic because `open` is read from the admin flag, like the landing page.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const festival = getFestival();
  const name = festival.title[locale] || festival.title.en;
  const t = await getTranslations({ locale, namespace: "gita" });
  return {
    title: `${t("register_title")} — ${name}`,
    description: festival.summary[locale] || festival.summary.en,
    /* One page for the festival in search results, and it is the one with the
       poster and the prizes on it. A bare form indexed beside it only splits
       the same festival in two. */
    robots: { index: false, follow: true },
  };
}

const FACT_ICONS = { calendar: CalendarDays, ticket: Ticket, pin: MapPin };

export default async function GitaRegisterPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("gita");

  const festival = getFestival();
  const lang = locale === "en" ? "en" : "hi";

  const open = (await getFlag("gita.registrationsOpen", true)) && isRegistrationOpen();
  const { combo } = priceTable();
  const events = localisedEvents(lang);

  const quiz = eventOf("quiz");
  const helpline = festival.helpline || ORG.phone;

  /* "19 Dec", not "19 December 2026": this strip gives each figure a third of
     a phone's width and one line, and the year is the part nobody is in doubt
     about. Formatted from the catalog's own ISO date so it cannot drift from
     `dateLabel`, and fixed to UTC because the date is stored as a bare day —
     read in any timezone behind it, the 19th becomes the 18th. */
  const shortDate = quiz?.date
    ? new Intl.DateTimeFormat(lang === "en" ? "en-IN" : "hi-IN", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }).format(new Date(quiz.date))
    : null;

  /* The three answers the form itself does not give: when, how much, and
     where. The fee is the cheapest single event — the form prices whatever is
     actually ticked, and says so as the total moves. */
  const facts = [
    {
      icon: "calendar",
      label: t("hero_quiz_date"),
      value: shortDate || quiz?.dateLabel?.[lang] || quiz?.dateLabel?.en || "—",
    },
    { icon: "ticket", label: t("hero_fee"), value: formatINR(events[0].amount) },
    {
      icon: "pin",
      label: t("stage_where"),
      value: festival.venue?.[lang] || festival.venue?.en || ORG.name,
    },
  ];

  return (
    <div className="min-h-svh bg-background">
      {/* No floating WhatsApp button over a form: it lands in the same corner
          as the submit button, which on a phone is the one tap that matters
          here. The helpline below is the way to a person on this page. */}
      <div data-hide-whatsapp-fab hidden aria-hidden="true" />

      <div className="mx-auto w-full max-w-2xl px-4 pt-5 pb-14 sm:px-6 sm:pt-8 sm:pb-20">
        {/* Back first, and as a real link to the festival page rather than
            `router.back()`: this page is linked from the poster, from the
            promo and from WhatsApp forwards, and a visitor who arrived on it
            cold still has somewhere to go. */}
        <Link
          href="/gita-mahotsav"
          className="inline-flex items-center gap-1.5 rounded-full text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          {t("register_back")}
        </Link>

        <header className="mt-6 flex flex-col items-center text-center">
          <Diya className="size-9 text-primary" />
          <p className="mt-3 text-[11px] font-semibold tracking-wider text-primary uppercase">
            {festival.title[lang] || festival.title.en}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            {t("register_title")}
          </h1>
          <p className="mt-2.5 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
            {t("register_body")}
          </p>
        </header>

        {/* When, how much, where — one row of three on a phone, one line each.
            A bordered strip rather than three cards: it is context for the
            form under it, not three announcements of its own. */}
        <dl className="mt-6 grid grid-cols-3 overflow-hidden rounded-xl border border-border bg-card">
          {facts.map(({ icon, label, value }) => {
            const Icon = FACT_ICONS[icon] ?? CalendarDays;
            return (
              <div
                key={label}
                className="min-w-0 px-3 py-3 text-center not-first:border-s not-first:border-border"
              >
                <dt className="flex items-center justify-center gap-1.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  <Icon className="size-3 shrink-0 text-primary" aria-hidden="true" />
                  <span className="truncate">{label}</span>
                </dt>
                <dd className="mt-1 text-[13px] leading-tight font-semibold text-balance">
                  {value}
                </dd>
              </div>
            );
          })}
        </dl>

        <div className="mt-5">
          <GitaRegisterForm events={events} combo={combo} open={open} idPrefix="gita-register" />
        </div>

        {/* The helpline under the form rather than over it: somebody who needs
            it needs it after reading the fields, and above the form it is an
            invitation to call instead of to register. */}
        <a
          href={`tel:${helpline.replace(/\s/g, "")}`}
          className="mt-5 flex items-center justify-center gap-2 rounded-full border border-border bg-muted/40 px-4 py-2.5 text-sm font-medium transition-colors hover:text-primary"
        >
          <Phone className="size-4 text-primary" aria-hidden="true" />
          {t("helpline", { phone: helpline })}
        </a>

        <ol className="mt-7 grid gap-3 border-t border-border/60 pt-6">
          {[t("step_one"), t("step_two"), t("step_three")].map((step, index) => (
            <li key={index} className="flex gap-3 text-[13px] leading-relaxed">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/12 text-[11px] font-bold text-primary">
                {index + 1}
              </span>
              <span className="text-muted-foreground">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
