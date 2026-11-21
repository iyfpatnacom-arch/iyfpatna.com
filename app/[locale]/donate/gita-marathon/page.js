import { setRequestLocale, getTranslations } from "next-intl/server";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CreditCard,
  HandHeart,
  Mail,
  Phone,
  ReceiptIndianRupee,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DonateButton,
  DonateProvider,
} from "@/components/donate/DonateProvider";
import { GitaBook } from "@/components/donate/GitaBook";
import { GitaTierCard } from "@/components/donate/GitaTierCard";
import { IkImage } from "@/components/media/IkImage";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getFlag } from "@/lib/flags";
import {
  DONATION_COMPLIANCE,
  DONATION_HELPLINE,
  GITA_MARATHON,
  GITA_MARATHON_PORTRAIT,
  GITA_MARATHON_TIERS,
  ORG,
} from "@/lib/site-config";

/*
 * Nothing on this page is decided by today's date — the tiers, the verse and
 * the arithmetic are the same in February as in November, and the marathon's
 * dates are printed rather than branched on. So it could be fully static; it
 * re-renders hourly only because `donations.open` is a database flag the
 * temple expects to take effect without a deploy, exactly as on /donate.
 */
export const revalidate = 3600;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "donate.gita_marathon",
  });
  return { title: t("title"), description: t("subtitle") };
}

/* Shared with /donate, deliberately: the promises are the same promises, and
   a donor who read them on one page must not find them reworded on the other. */
const TRUST_ROW = [
  { key: "tax", Icon: BadgeCheck },
  { key: "receipt", Icon: ReceiptIndianRupee },
  { key: "methods", Icon: CreditCard },
  { key: "registered", Icon: ShieldCheck },
];

/** "1 November", in the reader's language — as `PitruPaksha` renders a tithi. */
function dayLabel(dayKey, locale) {
  return new Date(`${dayKey}T00:00:00Z`).toLocaleDateString(
    locale === "hi" ? "hi-IN" : "en-IN",
    { day: "numeric", month: "long", timeZone: "UTC" },
  );
}

/**
 * /donate/gita-marathon — sponsoring copies of the Gita for the November drive.
 *
 * Its own page rather than a card on /donate, because the ask is a different
 * shape. Every other seva asks for an amount and tells the donor what it buys;
 * this one asks for a number of books and derives the amount from it, which is
 * why the tiers lead with "108 Gitas" and carry the rupees underneath.
 *
 * Underneath, it is the ordinary donation flow and nothing else: the seva is a
 * row in `SEVA_LIST`, the dialog is the one `DonateProvider` mounts, the money
 * goes through the same gateway, and the 80G acknowledgement is drawn by the
 * same builder — which names the number of copies the gift sponsored (see
 * `lib/donations/receipt.js`). Nothing about this page is a second payment
 * path, and that is the point of it.
 *
 * The form's seva select is narrowed to this one seva, as the Pitru Paksha
 * hero narrows to three: the reader has just been asked for Gitas, and a list
 * offering gau seva would be undoing the ask they answered.
 */
export default async function GitaMarathonPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("donate.gita_marathon");
  /* The 80G block and the trust row are /donate's own words, read from there
     rather than copied into this namespace — one edit, both pages. */
  const tDonate = await getTranslations("donate");

  const donationsOpen = await getFlag("donations.open", true);

  const range = t("window", {
    start: dayLabel(GITA_MARATHON.start, locale),
    end: dayLabel(GITA_MARATHON.end, locale),
  });

  return (
    /* `?give=1` on this page opens the form on this seva, so a printed QR code
       in the temple or a WhatsApp forward lands on the marathon rather than on
       the general seva list. */
    <DonateProvider open={donationsOpen} sevas={[GITA_MARATHON.slug]}>
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
        {/* ---------------------------------------------------------- hero */}
        <Link
          href="/donate"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          {tDonate("title")}
        </Link>

        <p className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[11px] font-semibold tracking-wider text-primary uppercase">
          <Sparkles className="size-3" aria-hidden="true" />
          {t("eyebrow")}
        </p>

        <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl md:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
          {t("subtitle")}
        </p>

        {/* The dates, and nothing beside them. A second chip here used to
            print a per-copy rate, which is not what a Gita costs and was
            being read as though it were. */}
        <div className="mt-6 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            <CalendarDays className="size-3.5 opacity-70" aria-hidden="true" />
            {range}
          </span>
        </div>

        <div
          id="give"
          className="mt-8 flex scroll-mt-24 flex-col gap-3 sm:flex-row sm:items-center"
        >
          <DonateButton animatedBorder>
            <HandHeart className="size-4" aria-hidden="true" />
            {t("cta")}
          </DonateButton>
          <Button
            size="lg"
            variant="outline"
            className="rounded-full"
            render={<a href="#tiers" />}
          >
            {t("cta_secondary")}
          </Button>
        </div>

        <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
          {TRUST_ROW.map(({ key, Icon }) => (
            <li
              key={key}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Icon
                className="size-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              {tDonate(`trust.${key}`)}
            </li>
          ))}
        </ul>

        {/* -------------------------------------------- prabhupada + verse */}
        {/* The reason the marathon exists at all, in the two sources that
            actually carry it: the instruction, and the verse behind the
            instruction. Placed before the price list on purpose — a stack of
            amounts with no shastra above it is a fundraising page, and this
            is not meant to read as one. */}
        <section className="mt-14 overflow-hidden rounded-2xl border border-primary/25 bg-primary/5">
          <div className="grid gap-0 sm:grid-cols-[minmax(0,13rem)_1fr] lg:grid-cols-[minmax(0,16rem)_1fr]">
            {/* A portrait frame, not a banner. The source image is tall, and
                cropping it to a wide band would cut the subject in half; a
                3:4 column keeps him whole and leaves the text beside it on
                anything wider than a phone. Lazy — the hero copy above is
                this page's LCP, and an image here would only compete for the
                same first bytes. */}
            <div className="relative aspect-4/3 w-full border-b border-primary/15 sm:aspect-3/4 sm:border-b-0 sm:border-e">
              <IkImage
                src={GITA_MARATHON_PORTRAIT}
                alt={t("photo_alt")}
                fill
                quality={62}
                sizes="(min-width: 1024px) 256px, (min-width: 640px) 208px, 100vw"
                className="object-cover object-top"
              />
            </div>

            <div className="p-6 sm:p-8">
              <blockquote>
                <p className="text-xl leading-snug font-semibold tracking-tight text-balance sm:text-2xl">
                  &ldquo;{t("quote")}&rdquo;
                </p>
                <footer className="mt-3 text-sm font-medium text-muted-foreground">
                  — {t("quote_source")}
                </footer>
              </blockquote>

              <figure className="mt-6 rounded-xl border border-border/70 bg-background/70 p-5">
                <blockquote>
                  {/* `font-hindi` carries the Mukta face the rest of the site
                      uses for Sanskrit; `whitespace-pre-line` is what renders
                      the two padas of the shloka as two lines without the
                      message having to hold markup. */}
                  <p className="font-hindi text-[15px] leading-relaxed whitespace-pre-line text-foreground sm:text-base">
                    {t("verse_sanskrit")}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed whitespace-pre-line text-muted-foreground italic sm:text-sm">
                    {t("verse_roman")}
                  </p>
                  <p className="mt-4 text-[15px] leading-relaxed text-foreground/90">
                    {t("verse_translation")}
                  </p>
                </blockquote>
                <figcaption className="mt-3 text-xs font-medium text-muted-foreground">
                  — {t("verse_source")}
                </figcaption>
              </figure>

              <p className="mt-4 text-xs text-muted-foreground/80">
                {t("photo_caption")}
              </p>
            </div>
          </div>
        </section>

        {/* ------------------------------------------- what the marathon is */}
        <section className="mt-14 rounded-2xl border border-border bg-muted/30 p-6 sm:p-8">
          <h2 className="text-lg font-semibold tracking-tight">
            {t("what_title")}
          </h2>
          <ul className="mt-5 space-y-3">
            {t.raw("what_points").map((point) => (
              <li
                key={point}
                className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground"
              >
                <span
                  aria-hidden="true"
                  className="mt-[7px] size-1.5 shrink-0 rounded-full bg-primary"
                />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* --------------------------------------------------- the tiers */}
        <section id="tiers" className="mt-16 scroll-mt-24">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("tiers_title")}
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            {t("tiers_subtitle")}
          </p>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {GITA_MARATHON_TIERS.map((tier) => (
              <GitaTierCard key={tier.key} tier={tier} />
            ))}
          </div>

          {/* Any amount is accepted — `isValidAmount` is the only rule — so
              the six cards must not read as the only way in. */}
          <div className="group mt-6 flex flex-col gap-4 rounded-2xl border border-dashed border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <GitaBook className="aspect-3/4 w-10 shrink-0" />
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold tracking-tight">
                  {t("custom_title")}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {t("custom_body")}
                </p>
              </div>
            </div>
            <DonateButton variant="outline" className="shrink-0">
              {t("custom_cta")}
            </DonateButton>
          </div>
        </section>

        {/* ------------------------------------------------- how it works */}
        <section className="mt-16">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {tDonate("how_title")}
          </h2>

          {/* The same numbered milestone track /donate, the schedule and the
              festival pages use — four steps that are the same four steps
              here, because this is the same checkout. */}
          <ol className="mt-8 grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-4">
            {tDonate.raw("how_steps").map((step, index, steps) => {
              const isLast = index === steps.length - 1;
              return (
                <li key={step.title} className="relative flex flex-col">
                  {!isLast && (
                    <span
                      aria-hidden="true"
                      className="absolute top-5 left-10 hidden h-px w-[calc(100%-1.5rem)] bg-border lg:block"
                    />
                  )}
                  <span className="relative z-10 grid size-10 place-items-center rounded-full border border-primary/25 bg-primary/10 text-xs font-semibold text-primary tabular-nums">
                    {index + 1}
                  </span>
                  <h3 className="mt-3 text-[15px] font-semibold tracking-tight text-balance">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </li>
              );
            })}
          </ol>
        </section>

        {/* ------------------------------------------------ volunteer door */}
        {/* The other half of the marathon, and the only outbound link on this
            page: somebody reading about book distribution is the likeliest
            person on the site to want to do it rather than fund it. */}
        <section className="mt-14 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                <Users
                  className="size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                {t("volunteer_title")}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                {t("volunteer_body")}
              </p>
            </div>
            <Button
              size="lg"
              variant="outline"
              className="shrink-0 rounded-full"
              render={<Link href="/activity/gita-marathon" />}
            >
              {t("volunteer_cta")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </section>

        {/* --------------------------------------------------- tax and help */}
        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <ReceiptIndianRupee
                className="size-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              {tDonate("tax_title")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {tDonate("tax_body", {
                act: DONATION_COMPLIANCE.trustAct,
                registration: DONATION_COMPLIANCE.registration,
                pan: DONATION_COMPLIANCE.pan,
                urn: DONATION_COMPLIANCE.eightyGUrn,
              })}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <Phone
                className="size-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              {tDonate("help_title")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {tDonate("help_body")}
            </p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a
                  href={`tel:${DONATION_HELPLINE.replace(/\s+/g, "")}`}
                  className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Phone className="size-3.5 opacity-70" aria-hidden="true" />
                  {DONATION_HELPLINE}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${ORG.email}`}
                  className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Mail className="size-3.5 opacity-70" aria-hidden="true" />
                  {ORG.email}
                </a>
              </li>
            </ul>
          </div>
        </section>

        {/* ----------------------------------------------------- last call */}
        <section className="mt-10 rounded-2xl border border-primary/25 bg-primary/5 p-6 sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">
            {t("final_title")}
          </h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            {t("final_body")}
          </p>
          <DonateButton className="mt-6">
            <HandHeart className="size-4" aria-hidden="true" />
            {t("cta")}
          </DonateButton>
        </section>
      </div>
    </DonateProvider>
  );
}
