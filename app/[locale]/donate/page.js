import { setRequestLocale, getTranslations, getFormatter } from "next-intl/server";
import {
  ArrowUpRight,
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
import { SevaCard } from "@/components/donate/SevaCard";
import { routing } from "@/i18n/routing";
import {
  DONATION_COMPLIANCE,
  DONATION_HELPLINE,
  DONATION_POLICIES,
  DONATIONS_URL,
  ORG,
  SEVA_LIST,
} from "@/lib/site-config";

/*
 * One dated card (Janmashtami) hides itself once the festival has passed, and
 * that decision is made at render time. A fully static page would freeze the
 * answer at build time and keep advertising the date for another year, so the
 * page re-renders hourly instead — far finer than the once-a-year granularity
 * the check actually needs.
 */
export const revalidate = 3600;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "donate" });
  return { title: t("title"), description: t("subtitle") };
}

const TRUST_ROW = [
  { key: "tax", Icon: BadgeCheck },
  { key: "receipt", Icon: ReceiptIndianRupee },
  { key: "methods", Icon: CreditCard },
  { key: "registered", Icon: ShieldCheck },
];

/**
 * Donate page.
 *
 * Deliberately a landing page and not a checkout. IYF Patna is the youth wing
 * of ISKCON Patna and has no legal personality, no bank account and no
 * gateway of its own — so this page carries everything a donor (or a payment
 * gateway reviewing the site) needs to decide: which sevas exist, what each
 * amount actually buys, which registered trust receives the money, the 80G
 * and Form 10BE position, and whose refund and privacy policies govern the
 * transaction. Every "Donate" then hands off to the temple's own donation
 * page, where the payment is taken.
 *
 * That split is the point rather than a shortcut: it keeps true the promise
 * the privacy policy and the legal page both already make, that iyfpatna.in
 * never collects a payment or stores a card, UPI or bank detail. All of the
 * seva copy, amounts and registration numbers are ISKCON Patna's own, taken
 * from the donations page this one links to.
 */
export default async function DonatePage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("donate");
  const format = await getFormatter();

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
    <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      {/* ---------------------------------------------------------- hero */}
      <p className="text-xs font-semibold tracking-wider text-primary uppercase">
        {t("eyebrow")}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
        {t("subtitle")}
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          size="lg"
          className="rounded-full"
          render={
            <a href={DONATIONS_URL} target="_blank" rel="noopener noreferrer" />
          }
        >
          <HandHeart className="size-4" aria-hidden="true" />
          {t("cta")}
          <ArrowUpRight className="size-4 opacity-80" aria-hidden="true" />
          <span className="sr-only"> ({t("external_note")})</span>
        </Button>
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
            <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
            {t(`trust.${key}`)}
          </li>
        ))}
      </ul>

      {/* ------------------------------------------ who takes the money */}
      <section className="mt-14 rounded-2xl border border-border bg-muted/30 p-6 sm:p-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Info className="size-4 shrink-0 text-primary" aria-hidden="true" />
          {t("who_title")}
        </h2>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
          {t("who_body")}
        </p>
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

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SEVA_LIST.map((seva) => (
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
              <a
                href={policy.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
              >
                {t(`policies.${policy.key}`)}
                <ArrowUpRight className="size-3 opacity-60" aria-hidden="true" />
              </a>
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
        <Button
          size="lg"
          className="mt-6 rounded-full"
          render={
            <a href={DONATIONS_URL} target="_blank" rel="noopener noreferrer" />
          }
        >
          <HandHeart className="size-4" aria-hidden="true" />
          {t("cta")}
          <ArrowUpRight className="size-4 opacity-80" aria-hidden="true" />
          <span className="sr-only"> ({t("external_note")})</span>
        </Button>
      </section>
    </div>
  );
}
