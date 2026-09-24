import Image from "next/image";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import {
  ArrowLeft,
  BookOpenCheck,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Compass,
  Flower2,
  HeartHandshake,
  Languages,
  Lock,
  MapPin,
  Phone,
  Quote,
  Repeat,
  Scale,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Timer,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { clerkConfigured } from "@/lib/auth-config";
import { ORG } from "@/lib/site-config";
import {
  batchDateLabel,
  courseSlugs,
  formatINR,
  getCourse,
  isEnrollmentOpen,
  pricingOf,
} from "@/lib/courses/catalog";
import { paymentMode } from "@/lib/payments/razorpay";
import { Panel } from "@/components/site/Panel";
import { EnrollButton, EnrollProvider, StickyEnrollBar } from "@/components/courses/Enroll";

/**
 * A paid course's landing page — the page the course card's Join button
 * opens, and the one that gets shared in WhatsApp groups.
 *
 * Every word of course copy comes from content/courses/<slug>.json; this file
 * is only the layout, so the next course is a JSON file rather than a page.
 * The order is the classic one for a page that has to earn a payment: promise
 * and price above the fold, then the why, the what, who it is for, proof, and
 * objections — with a way to register never more than a thumb away.
 *
 * Prerendered and revalidated every five minutes, which is as fresh as the
 * seat count needs to be; the enrolment route re-checks capacity for real.
 *
 * `dynamicParams` is deliberately left at its default (true). It used to be
 * false, and that turned a deploy that shipped without this route's static
 * params into a hard 404 on /courses/discover-yourself while /courses still
 * advertised the link — the router rejects an unlisted param before the page
 * ever runs, so there is nothing to fall back to. With the default, a slug the
 * build did not prerender is simply rendered on demand, and the `notFound()`
 * below stays the only thing that can 404 a course: one that is not in the
 * catalog.
 */
export const revalidate = 300;

const ICONS = {
  book: BookOpenCheck,
  compass: Compass,
  lotus: Flower2,
  shield: ShieldCheck,
  scale: Scale,
  repeat: Repeat,
  target: Target,
  heart: HeartHandshake,
  sparkles: Sparkles,
};

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => courseSlugs().map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }) {
  const { locale, slug } = await params;
  const course = getCourse(slug);
  if (!course) return {};

  const price = formatINR(pricingOf(course).amount);
  const title = `${course.title[locale]} — ${course.eyebrow[locale]}`;
  const description = `${course.summary[locale]} ${price}.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: course.media?.image ? [course.media.image] : undefined,
    },
  };
}

/**
 * Whether a seat can be bought right now, and how many are left.
 *
 * The site-wide kill switch and the batch's own flag both close the page; the
 * seat count is only read when the batch has a capacity at all. Every failure
 * degrades to "open" — the enrolment route is the real gate, and a database
 * hiccup must not turn a sales page into a "closed" sign.
 */
async function loadAvailability(course) {
  let registrationsOpen = true;
  let seatsLeft = null;

  try {
    const { getFlag } = await import("@/lib/flags");
    registrationsOpen = await getFlag("registrations.programsOpen", true);

    if (course.batch.capacity) {
      const { dbConnect } = await import("@/lib/db/connect");
      const { default: Enrollment } = await import("@/models/Enrollment");
      await dbConnect();
      const taken = await Enrollment.countDocuments({
        courseSlug: course.slug,
        batchId: course.batch.id,
        "payment.status": "success",
      });
      seatsLeft = Math.max(0, course.batch.capacity - taken);
    }
  } catch (error) {
    console.warn("[course] availability unavailable, assuming open:", error.message);
  }

  const status =
    !registrationsOpen || !isEnrollmentOpen(course)
      ? "closed"
      : seatsLeft === 0
        ? "sold_out"
        : "open";

  return { status, seatsLeft };
}

function initials(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** JSON-LD for a script tag — `<` escaped so copy can never close the tag. */
function jsonLd(data) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}

export default async function CoursePage({ params }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const course = getCourse(slug);
  if (!course) notFound();

  const t = await getTranslations("course_page");
  const { status, seatsLeft } = await loadAvailability(course);
  const { amount, mrp, discountPercent } = pricingOf(course);

  const L = (field) => field?.[locale] ?? field?.en ?? "";
  const price = formatINR(amount);
  const mrpLabel = mrp ? formatINR(mrp) : null;
  const dateLabel = batchDateLabel(course, locale) || t("dates_tba");
  const seatLine =
    seatsLeft != null && seatsLeft > 0 && seatsLeft <= 20
      ? t("seats_left", { count: seatsLeft })
      : t("seats_limited");

  const checkout = {
    slug: course.slug,
    title: L(course.title),
    batchLabel: [dateLabel, L(course.batch.time)].filter(Boolean).join(" · "),
    priceLabel: price,
    mrpLabel,
    saveLabel: mrp ? formatINR(mrp - amount) : null,
    modes: course.modes.map((mode) => ({
      key: mode.key,
      label: L(mode.label),
      detail: L(mode.detail),
    })),
    paymentMode: paymentMode() ?? "none",
  };

  const facts = [
    { Icon: CalendarDays, label: t("detail_date"), value: dateLabel },
    { Icon: Clock, label: t("detail_time"), value: L(course.batch.time) },
    {
      Icon: Timer,
      label: t("detail_duration"),
      value: `${L(course.batch.sessions)} · ${L(course.batch.sessionLength)}`,
    },
    { Icon: MapPin, label: t("detail_venue"), value: L(course.batch.venue) },
    { Icon: Languages, label: t("detail_language"), value: L(course.language) },
  ];

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Course",
      name: L(course.title),
      description: L(course.summary),
      inLanguage: locale === "hi" ? "hi-IN" : "en-IN",
      provider: { "@type": "Organization", name: ORG.name, sameAs: ORG.siteUrl },
      offers: {
        "@type": "Offer",
        price: amount,
        priceCurrency: "INR",
        category: "Paid",
        availability:
          status === "open" ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: course.faqs.map((faq) => ({
        "@type": "Question",
        name: L(faq.q),
        acceptedAnswer: { "@type": "Answer", text: L(faq.a).replace("{price}", price) },
      })),
    },
  ];

  return (
    <EnrollProvider checkout={checkout} status={status} clerkConfigured={clerkConfigured}>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />

      {/* The extra foot on phones is the sticky bar's height, so the last
          section is never hidden under it. */}
      <div className="pb-20 md:pb-0">
        {/* ------------------------------------------------------------ hero */}
        <section className="relative overflow-hidden border-b border-border/70">
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="animate-glow-pulse absolute -top-28 -left-24 size-72 rounded-full bg-brand-gold/15 blur-3xl" />
            <div className="absolute right-1/4 -bottom-40 size-80 rounded-full bg-brand-purple/10 blur-3xl" />
          </div>

          <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 pt-6 pb-12 sm:px-6 md:pt-10 md:pb-16 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-14">
            <div>
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" aria-hidden="true" />
                {t("back")}
              </Link>

              <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="size-3.5" aria-hidden="true" />
                {L(course.eyebrow)}
              </p>

              <h1 className="mt-4 text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                {L(course.title)}
              </h1>
              <p className="instrument-serif mt-4 text-2xl leading-snug text-balance text-foreground/85 italic sm:text-[1.75rem]">
                {L(course.headline)}
              </p>
              <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
                {L(course.summary)}
              </p>

              <ul className="mt-6 flex flex-wrap gap-2">
                {facts.slice(0, 4).map(({ Icon, label, value }) => (
                  <li
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium"
                  >
                    <Icon className="size-3.5 text-primary" aria-hidden="true" />
                    <span className="sr-only">{label}: </span>
                    {value}
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-center">
                <div>
                  <p className="flex items-end gap-2.5">
                    <span className="text-4xl leading-none font-bold tracking-tight">{price}</span>
                    {mrpLabel && (
                      <span className="pb-0.5 text-lg leading-none text-muted-foreground line-through decoration-2">
                        {mrpLabel}
                      </span>
                    )}
                    {discountPercent > 0 && (
                      <span className="mb-0.5 rounded-full bg-emerald-500/12 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        {t("save", { percent: discountPercent })}
                      </span>
                    )}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">{t("price_note")}</p>
                </div>
                <EnrollButton id="enroll-hero-cta" className="w-full sm:w-auto" />
              </div>

              <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="size-3.5 shrink-0" aria-hidden="true" />
                {t("secure_note")}
              </p>

              <div className="mt-8 flex items-center gap-3">
                <div className="flex -space-x-2" aria-hidden="true">
                  {course.testimonials.slice(0, 4).map((person) => (
                    <span
                      key={person.name}
                      className="grid size-8 place-items-center rounded-full border-2 border-background bg-primary/15 text-[10px] font-bold text-primary"
                    >
                      {initials(person.name)}
                    </span>
                  ))}
                </div>
                <div>
                  <p className="flex gap-0.5 text-brand-gold" aria-hidden="true">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className="size-3.5 fill-current" />
                    ))}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{L(course.socialProof)}</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div
                className="animate-glow-pulse pointer-events-none absolute -inset-2 rounded-[2rem] bg-brand-gold/25 blur-2xl dark:bg-brand-gold/20"
                aria-hidden="true"
              />
              <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl border border-border bg-muted lg:aspect-4/5">
                {course.media?.image && (
                  <Image
                    src={course.media.image}
                    alt={t("media_alt")}
                    fill
                    priority
                    sizes="(min-width: 1024px) 42vw, 100vw"
                    className="object-cover"
                  />
                )}
                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-black/75 via-black/30 to-transparent" />
                <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-end justify-between gap-3 text-white sm:inset-x-5 sm:bottom-5">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold tracking-wider text-brand-gold-light uppercase">
                      {t("next_batch")}
                    </p>
                    <p className="mt-1 text-lg leading-snug font-semibold">{dateLabel}</p>
                    <p className="text-sm text-white/80">
                      {L(course.batch.time)} · {t("language_badge", { language: L(course.language) })}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                    {seatLine}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------- stats */}
        <section className="border-b border-border/70 bg-muted/25">
          <dl className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-y-6 px-4 py-8 sm:grid-cols-4 sm:px-6">
            {course.stats.map((stat) => (
              <div key={stat.value + L(stat.label)} className="text-center">
                <dt className="sr-only">{L(stat.label)}</dt>
                <dd>
                  <span className="block text-3xl font-semibold tracking-tight text-primary sm:text-4xl">
                    {stat.value}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground sm:text-sm">
                    {L(stat.label)}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* --------------------------------------------------------- pillars */}
        <Section>
          <SectionHead eyebrow={t("pillars_eyebrow")} title={t("pillars_title")} />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {course.pillars.map((pillar) => {
              const Icon = ICONS[pillar.icon] ?? Sparkles;
              return (
                <Panel key={pillar.icon} className="p-6">
                  <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold tracking-tight">{L(pillar.title)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{L(pillar.body)}</p>
                </Panel>
              );
            })}
          </div>
        </Section>

        {/* ----------------------------------------------------------- quote */}
        <section className="relative overflow-hidden border-b border-border/70 bg-muted/25">
          <div className="mx-auto w-full max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-24">
            <Quote className="mx-auto size-8 text-primary/60" aria-hidden="true" />
            <p className="mt-2 text-xs font-semibold tracking-wider text-primary uppercase">
              {t("quote_eyebrow")}
            </p>
            <blockquote className="instrument-serif mt-5 text-3xl leading-tight text-balance italic sm:text-5xl">
              {L(course.quote.line)}
            </blockquote>
            <p className="mt-5 text-base text-muted-foreground sm:text-lg">{L(course.quote.tail)}</p>
          </div>
        </section>

        {/* ----------------------------------------------------------- learn */}
        <Section>
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <SectionHead
                eyebrow={t("learn_eyebrow")}
                title={t("learn_title")}
                body={t("learn_body")}
              />
              <EnrollButton className="mt-8 hidden lg:inline-flex" />
            </div>
            <ol className="grid gap-3">
              {course.learn.map((item, index) => (
                <li key={index} className="flex gap-4 rounded-xl border border-border bg-card p-4 sm:p-5">
                  <span className="instrument-serif shrink-0 text-2xl leading-none text-primary italic">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="text-[15px] leading-relaxed">{L(item)}</p>
                </li>
              ))}
            </ol>
          </div>
        </Section>

        {/* -------------------------------------------------------- audience */}
        <Section className="bg-muted/25">
          <SectionHead
            eyebrow={t("audience_eyebrow")}
            title={t("audience_title")}
            body={t("audience_body")}
          />
          <ul className="mt-8 flex flex-wrap gap-2.5">
            {course.audience.map((who) => (
              <li
                key={who.en}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium"
              >
                <Check className="size-4 text-primary" aria-hidden="true" />
                {L(who)}
              </li>
            ))}
          </ul>
        </Section>

        {/* -------------------------------------------------------- benefits */}
        <Section>
          <SectionHead eyebrow={t("benefits_eyebrow")} title={t("benefits_title")} />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {course.benefits.map((benefit) => {
              const Icon = ICONS[benefit.icon] ?? Sparkles;
              return (
                <div key={benefit.icon} className="flex gap-4 rounded-xl border border-border bg-card p-5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-purple/10 text-brand-purple">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-semibold tracking-tight">{L(benefit.title)}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{L(benefit.body)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* ---------------------------------------------------- details/offer */}
        <Section id="details" className="bg-muted/25">
          <SectionHead eyebrow={t("details_eyebrow")} title={t("details_title")} />
          <div className="mt-10 grid gap-4 lg:grid-cols-[1.15fr_1fr]">
            <Panel className="p-6 sm:p-8">
              <dl className="grid gap-5 sm:grid-cols-2">
                {facts.map(({ Icon, label, value }) => (
                  <div key={label} className="flex gap-3">
                    <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                    <div>
                      <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                        {label}
                      </dt>
                      <dd className="mt-1 text-[15px] font-medium">{value}</dd>
                    </div>
                  </div>
                ))}
              </dl>

              <div className="mt-8 border-t border-border/70 pt-6">
                <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  {t("detail_modes")}
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {course.modes.map((mode) => (
                    <div key={mode.key} className="rounded-xl border border-border bg-background/60 p-4">
                      <p className="text-sm font-semibold">{L(mode.label)}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{L(mode.detail)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>

            <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-card p-6 sm:p-8">
              <div
                className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-brand-gold/20 blur-3xl"
                aria-hidden="true"
              />
              <p className="relative text-sm font-semibold">{t("includes_title")}</p>
              <ul className="relative mt-4 grid gap-3">
                {course.includes.map((item) => (
                  <li key={item.en} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    {L(item)}
                  </li>
                ))}
              </ul>

              <div className="relative mt-8 border-t border-border/70 pt-6">
                <p className="flex items-end gap-2.5">
                  <span className="text-4xl leading-none font-bold tracking-tight">{price}</span>
                  {mrpLabel && (
                    <span className="pb-0.5 text-base leading-none text-muted-foreground line-through">
                      {mrpLabel}
                    </span>
                  )}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">{seatLine}</p>
                <EnrollButton className="mt-5 w-full" />
                <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Lock className="size-3.5" aria-hidden="true" />
                  {t("secure_note")}
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* ---------------------------------------------------- testimonials */}
        <Section>
          <SectionHead eyebrow={t("testimonials_eyebrow")} title={t("testimonials_title")} />
          <div className="-mx-4 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-3">
            {course.testimonials.map((person) => (
              <figure
                key={person.name}
                className="flex w-[85%] shrink-0 snap-start flex-col rounded-xl border border-border bg-card p-6 md:w-auto"
              >
                <p className="flex gap-0.5 text-brand-gold" aria-hidden="true">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} className="size-3.5 fill-current" />
                  ))}
                </p>
                <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed">
                  “{L(person.quote)}”
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                    {initials(person.name)}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{person.name}</span>
                    <span className="block text-xs text-muted-foreground">{L(person.role)}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </Section>

        {/* ------------------------------------------------------------- faq */}
        <Section className="bg-muted/25">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <div>
              <SectionHead eyebrow={t("faq_eyebrow")} title={t("faq_title")} />
              <p className="mt-5 text-sm text-muted-foreground">{t("contact_note")}</p>
              <a
                href={`tel:${ORG.phone.replace(/\s+/g, "")}`}
                className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium transition-colors hover:border-primary/40"
              >
                <Phone className="size-4 text-primary" aria-hidden="true" />
                {ORG.phone}
              </a>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border bg-card">
              {course.faqs.map((faq) => (
                <details key={faq.q.en} className="group px-5 py-1">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-[15px] font-medium [&::-webkit-details-marker]:hidden">
                    {L(faq.q)}
                    <ChevronDown
                      className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <p className="pb-4 text-sm leading-relaxed text-muted-foreground">
                    {L(faq.a).replace("{price}", price)}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </Section>

        {/* ------------------------------------------------------- final cta */}
        <section className="px-4 py-14 sm:px-6 sm:py-20">
          <div className="iskcon-band relative mx-auto w-full max-w-6xl overflow-hidden rounded-2xl px-6 py-12 text-center text-brand-cream sm:px-12 sm:py-16">
            <div
              className="animate-glow-pulse pointer-events-none absolute -top-24 left-1/2 size-96 -translate-x-1/2 rounded-full bg-brand-gold/25 blur-3xl"
              aria-hidden="true"
            />
            <p className="relative text-xs font-semibold tracking-wider text-brand-gold uppercase">
              {L(course.eyebrow)}
            </p>
            <h2 className="instrument-serif relative mx-auto mt-4 max-w-2xl text-3xl leading-tight text-balance italic sm:text-5xl">
              {t("final_title")}
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-brand-cream/75">
              {t("final_body")}
            </p>
            <div className="relative mt-8 flex flex-col items-center gap-3">
              <EnrollButton className="bg-brand-gold text-brand-ink hover:bg-brand-gold-light" />
              <p className="text-xs text-brand-cream/60">
                {mrpLabel ? t("final_price", { price, mrp: mrpLabel }) : price} · {seatLine}
              </p>
            </div>
          </div>
        </section>
      </div>

      <StickyEnrollBar />
    </EnrollProvider>
  );
}

function Section({ id, className = "", children }) {
  return (
    <section id={id} className={`scroll-mt-24 border-b border-border/70 ${className}`}>
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">{children}</div>
    </section>
  );
}

function SectionHead({ eyebrow, title, body }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wider text-primary uppercase">{eyebrow}</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{title}</h2>
      {body && (
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{body}</p>
      )}
    </div>
  );
}
