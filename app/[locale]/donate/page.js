import {
  setRequestLocale,
  getTranslations,
  getFormatter,
} from "next-intl/server";
import {
  BadgeCheck,
  CreditCard,
  FileText,
  HandHeart,
  Info,
  Mail,
  MapPin,
  Phone,
  ReceiptIndianRupee,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DonateButton,
  DonateProvider,
} from "@/components/donate/DonateProvider";
import { SevaCard } from "@/components/donate/SevaCard";
import { PitruPaksha } from "@/components/donate/PitruPaksha";
import { IkImage } from "@/components/media/IkImage";
import { istDayKey, pitruPaksha } from "@/lib/panchang";
import { PITRU_SEVA_KEYS, PITRU_SEVA_SLUGS } from "@/lib/donations/sevas";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getFlag } from "@/lib/flags";
import {
  DONATION_COMPLIANCE,
  DONATION_HELPLINE,
  DONATION_POLICIES,
  ORG,
  SEVA_LIST,
} from "@/lib/site-config";

/*
 * Two things on this page are decided by today's date rather than by the
 * build: a dated seva card (Janmashtami) hides its date once the festival has
 * passed, and the whole page turns towards Pitru Paksha for the fortnight
 * that observance runs. A fully static page would freeze both at build time
 * and keep advertising last year's answer, so the page re-renders hourly
 * instead — far finer than the once-a-year granularity either check needs.
 */
export const revalidate = 3600;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "donate" });
  /* The title and description follow the same seasonal swap the hero does,
     so a search result found during Shraddha Paksha reads like the page it
     actually opens. */
  const pitru = pitruPaksha(istDayKey());
  return pitru
    ? { title: t("pitru.hero_title"), description: t("pitru.hero_subtitle") }
    : { title: t("title"), description: t("subtitle") };
}

const TRUST_ROW = [
  { key: "tax", Icon: BadgeCheck },
  { key: "receipt", Icon: ReceiptIndianRupee },
  { key: "methods", Icon: CreditCard },
  { key: "registered", Icon: ShieldCheck },
];

/*
 * The hero's Pitru Paksha banner: a family performing tarpan at a river ghat.
 *
 * It stands in for the seasonal hero paragraph rather than sitting beside it
 * — during Shraddha Paksha the picture says what the paragraph said, and the
 * rite it shows needs no explaining to the people it is addressed to. The
 * wording itself is not lost: `pitru.hero_subtitle` still carries it as the
 * page's meta description, which is where it does the work now.
 *
 * Served straight off IYF Patna's own ImageKit library, like every other
 * photograph on this page — `IkImage` picks the ImageKit loader for these
 * URLs and skips the Next optimizer, which on this VPS is CPU-bound. The
 * intrinsic frame is 1408x768.
 */
const PITRU_BANNER =
  "https://ik.imagekit.io/mnkh9j9dw/IYF/Gemini_Generated_Image_h8m56th8m56th8m5%20(1).png";

/**
 * Donate page.
 *
 * A checkout now, not a landing page. It used to be the latter of necessity:
 * IYF Patna has no legal personality and no bank account of its own, so every
 * "Donate" handed the visitor to the temple's own gateway on iskconpatna.in and
 * this page existed to tell them, before they left, who was about to receive
 * their money and under whose policies.
 *
 * With the forum's own Razorpay integration live, the handoff is gone and the
 * donation is taken here — but none of the telling is. The money still reaches
 * ISKCON Patna, the receipt still says so in those words and carries the
 * trust's 80G registration rather than a number of its own, and every
 * governance detail a donor (or a gateway reviewing this site) needs is still
 * on the page. What changed is that the visitor no longer loses their chosen
 * seva and amount to a second website.
 *
 * Every "Donate" is a `DonateButton` carrying its seva and amount into the one
 * dialog `DonateProvider` mounts, so the whole page stays server-rendered
 * around a single form.
 */
export default async function DonatePage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("donate");
  const format = await getFormatter();

  /* The temple's switch for closing giving — during an audit, or while the
     gateway is re-keyed. The page stays up and keeps saying who receives a
     donation and how to give by cheque; only the buttons go quiet, which is
     kinder than a 404 and honest about why. */
  const donationsOpen = await getFlag("donations.open", true);

  /*
   * Pitru Paksha is derived from tithi, not from a date typed in here, so
   * the page turns towards the fortnight and back again on its own every
   * year. `null` outside it, and every seasonal branch below reads as
   * "ordinary donate page" in that case.
   */
  const pitru = pitruPaksha(istDayKey());

  /* The hero says the same three things either way; only which copy it
     reaches for changes. */
  const heroKey = (key) => (pitru ? `pitru.hero_${key}` : key);

  /* Stable sort, so everything outside `PITRU_FIRST` keeps the published
     order and the lifted sevas keep theirs relative to each other. */
  const sevaList = pitru
    ? [...SEVA_LIST].sort(
        (a, b) =>
          Number(PITRU_SEVA_KEYS.includes(b.key)) -
          Number(PITRU_SEVA_KEYS.includes(a.key)),
      )
    : SEVA_LIST;

  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    ORG.address,
  )}`;

  // A dated seva keeps its date badge only while the festival is still ahead
  // of us; afterwards the card stays, minus the stale date.
  const today = new Date();
  const dateLabelFor = (seva) => {
    if (!seva.date) return null;
    const date = new Date(`${seva.date}T00:00:00`);
    if (date < today) return null;
    return format.dateTime(date, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    /* `sevas` is what `/donate?give=1` opens on — the QR code's landing, which
       has no button to press and so cannot carry the choice itself. Same value
       the hero's Donate below carries, and for the same reason: a code scanned
       during Shraddha Paksha must offer the fortnight's sevas. */
    <DonateProvider
      open={donationsOpen}
      sevas={pitru ? PITRU_SEVA_SLUGS : undefined}
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        {/* ---------------------------------------------------------- hero */}
        <p className="text-xs font-semibold tracking-wider text-primary uppercase">
          {t(heroKey("eyebrow"))}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {t(heroKey("title"))}
        </h1>
        {/* During the fortnight the picture is the subtitle. Being at the
          top of the page it is the LCP element, so it is fetched with
          priority; `sizes` asks for no more than the 1152px the container
          ever gives it. */}
        {pitru ? (
          <div className="relative mt-6 aspect-video w-full overflow-hidden rounded-2xl border border-border/70 sm:aspect-2/1">
            <IkImage
              src={PITRU_BANNER}
              alt={t("pitru.hero_photo_alt")}
              fill
              priority
              quality={65}
              sizes="(min-width: 1152px) 1152px, 100vw"
              className="object-cover"
            />
          </div>
        ) : (
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
            {t("subtitle")}
          </p>
        )}

        {/* `#give` so the CTA row is linkable from elsewhere on the site, the
          way `#seva-list` already is. A QR code should point at `?give=1`
          instead, which opens the form rather than merely scrolling to it. */}
        <div
          id="give"
          className="mt-8 flex scroll-mt-24 flex-col gap-3 sm:flex-row sm:items-center"
        >
          {/* During the fortnight this button opens the form on the three
            Pitru Paksha sevas and offers only those in its select — the hero
            above it has just asked for a seva in a forefather's name, and a
            list still offering gau seva would be undoing that ask. Every
            other Donate on the page names its own seva and is untouched; the
            full list is a scroll away under "Browse sevas". */}
          <DonateButton
            animatedBorder
            sevas={pitru ? PITRU_SEVA_SLUGS : undefined}
          >
            <HandHeart className="size-4" aria-hidden="true" />
            {t("cta")}
          </DonateButton>
          <Button
            size="lg"
            variant="outline"
            className="rounded-full"
            render={<a href="#seva-list" />}
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
              {t(`trust.${key}`)}
            </li>
          ))}
        </ul>

        {/* ------------------------------------------------ pitru paksha */}
        {/* Above "who takes the money" on purpose: during Shraddha Paksha the
          reason to give comes before the governance detail. */}
        {pitru && <PitruPaksha window={pitru} />}

        {/* ------------------------------------------ who takes the money */}
        <section className="mt-14 rounded-2xl border border-border bg-muted/30 p-6 sm:p-8">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Info className="size-4 shrink-0 text-primary" aria-hidden="true" />
            {t("who_title")}
          </h2>
          <ul className="mt-5 space-y-3">
            {t.raw("who_points").map((point) => (
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

          <div className="mt-6 border-t border-border/70 pt-5">
            <p className="text-[11px] font-semibold tracking-wider text-foreground/70 uppercase">
              {t("who_address_label")}
            </p>
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-start gap-2 text-sm leading-relaxed text-muted-foreground transition-colors hover:text-foreground"
            >
              <MapPin
                className="mt-0.5 size-3.5 shrink-0 opacity-70"
                aria-hidden="true"
              />
              {ORG.address}
            </a>
          </div>
        </section>

        {/* ----------------------------------------------------- the sevas */}
        <section id="seva-list" className="mt-16 scroll-mt-24">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("seva_title")}
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            {t("seva_subtitle")}
          </p>
          {pitru && (
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
              {t("pitru.seva_note")}
            </p>
          )}

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {sevaList.map((seva) => (
              <SevaCard
                key={seva.key}
                seva={seva}
                dateLabel={dateLabelFor(seva)}
              />
            ))}
          </div>
        </section>

        {/* ------------------------------------------------- how it works */}
        <section className="mt-16">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("how_title")}
          </h2>

          {/* The same numbered milestone track the schedule and festival pages
            use, so the three read as one system. */}
          <ol className="mt-8 grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-4">
            {t.raw("how_steps").map((step, index, steps) => {
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

        {/* ------------------------------------------- tax, 10BE and help */}
        <section className="mt-16 grid gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <ReceiptIndianRupee
                className="size-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              {t("tax_title")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t("tax_body", {
                act: DONATION_COMPLIANCE.trustAct,
                registration: DONATION_COMPLIANCE.registration,
                pan: DONATION_COMPLIANCE.pan,
                urn: DONATION_COMPLIANCE.eightyGUrn,
              })}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <FileText
                className="size-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              {t("form_title")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t("form_body")}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <Smartphone
                className="size-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              {t("help_title")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t("help_body")}
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

        {/* ------------------------------------------------- the policies */}
        <section className="mt-10 rounded-2xl border border-border bg-muted/30 p-6 sm:p-8">
          <h2 className="text-lg font-semibold tracking-tight">
            {t("policies_title")}
          </h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            {t("policies_body")}
          </p>
          <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
            {DONATION_POLICIES.map((policy) => (
              <li key={policy.key}>
                {/* Ours now, and on this site, so a locale-aware <Link> rather
                  than an outbound anchor. */}
                <Link
                  href={policy.href}
                  className="text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
                >
                  {t(`policies.${policy.key}`)}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-6 border-t border-border/70 pt-5 text-sm leading-relaxed text-muted-foreground">
            {t("caution")}
          </p>
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
