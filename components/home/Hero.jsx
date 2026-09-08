import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { HERO_IMAGE, ORG } from "@/lib/site-config";
import { TodayPills } from "./TodayPills";

/**
 * Home hero.
 *
 * The badge above the title is the most important line on the page: it is
 * where a first-time visitor learns that IYF Patna is ISKCON Patna's youth
 * wing and not an unaffiliated group using the name. It sits above the
 * headline rather than below it for exactly that reason.
 *
 * The photograph is a real IYF Patna group, and it earns its place by showing
 * who turns up — which the copy can only assert. It is `priority` because it
 * is the page's largest contentful paint.
 *
 * On a phone the hero is the name, one line saying whose youth wing this is,
 * and then the photograph with today's panchang floating on it — the app-home
 * arrangement, where the picture is the screen and one card sits on top of it.
 * The paragraph and the buttons stay behind `md:` because they are what makes
 * that screen feel like a web page: the dock already carries the navigation, and
 * the sections below the fold make the same offers at length.
 *
 * The badge renders twice by design rather than moving. Above `md` it is a
 * bordered pill sitting *above* the headline, which is where a first-time
 * visitor looks for it; on a phone it is a plain line *under* the headline,
 * where a bordered pill would be one box too many. Only one of the two is ever
 * in the layout, so only one is ever in the accessibility tree.
 */
export function Hero() {
  const t = useTranslations("home");

  return (
    <section className="relative overflow-hidden border-b border-border/70">
      <HeroAura />

      <div className="relative mx-auto grid w-full max-w-6xl gap-5 px-4 pt-5 pb-10 sm:px-6 sm:py-20 md:gap-10 md:py-16 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-14">
        <div>
          <p className="hidden items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground md:mb-6 md:inline-flex">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
            {t("badge")}
          </p>

          <h1 className="text-[26px] leading-tight font-semibold tracking-tight text-balance md:text-5xl md:leading-[1.05] lg:text-6xl">
            {t("title")}
          </h1>

          <p className="mt-2 flex items-center gap-2 text-[13px] text-muted-foreground md:hidden">
            <span
              className="size-1.5 shrink-0 rounded-full bg-primary"
              aria-hidden="true"
            />
            {t("badge")}
          </p>

          <p className="mt-5 hidden max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg md:block">
            {t("subtitle")}
          </p>

          <div className="mt-8 hidden flex-wrap items-center gap-3 md:flex">
            <Button
              size="lg"
              className="rounded-full px-5"
              render={<Link href="/programs" />}
            >
              {t("cta_primary")}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full px-5"
              render={<Link href="/about" />}
            >
              {t("about_cta")}
            </Button>
          </div>

          {/* The empty space under the buttons is exactly what this fills. */}
          <TodayPills className="mt-9 hidden md:block" />

          <p className="mt-9 hidden max-w-2xl border-l-2 border-primary/40 pl-4 text-sm leading-relaxed text-muted-foreground md:block">
            {t("parent_strip")}{" "}
            <span className="text-foreground/70">{ORG.parentLegalName}</span>
          </p>
        </div>

        {/* The halo is a sibling rather than a child of the frame: the frame
            clips its own contents so the photograph keeps its corners, and a
            glow drawn inside it would be clipped along with them. */}
        <div className="relative">
          <div
            className="animate-glow-pulse pointer-events-none absolute -inset-2 rounded-[2rem] bg-brand-gold/25 blur-2xl dark:bg-brand-gold/20"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-8 -left-8 size-40 rounded-full bg-brand-purple/25 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative aspect-4/5 w-full overflow-hidden rounded-2xl border border-border bg-muted">
            <Image
              src={HERO_IMAGE}
              alt={t("hero_image_alt")}
              fill
              priority
              sizes="(min-width: 1024px) 42vw, 100vw"
              className="object-cover"
            />
            <TodayPills variant="overlay" className="md:hidden" />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The warmth behind the hero.
 *
 * Two soft lamps and a lotus mandala, all of it decorative and none of it
 * carrying meaning — which is why the whole layer is `aria-hidden` and inert
 * to the pointer. It is kept faint on purpose: the page's colour is supposed
 * to come from the photograph and the gold buttons, and an aura that competes
 * with those turns a calm page into a busy one.
 *
 * The mandala sits behind the text column rather than the picture, on wide
 * screens only. On a phone the photograph covers this entire area, so drawing
 * it there would cost a paint nobody ever sees.
 */
function HeroAura() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="animate-glow-pulse absolute -top-28 -left-24 size-72 rounded-full bg-brand-gold/15 blur-3xl" />
      <div className="absolute right-1/3 -bottom-40 size-80 rounded-full bg-brand-purple/10 blur-3xl" />
      <Mandala className="animate-mandala absolute top-1/2 -left-40 hidden size-152 -translate-y-1/2 text-primary/[0.07] md:block" />
    </div>
  );
}

/**
 * A twelve-petal lotus mandala in line art.
 *
 * Drawn rather than shipped as an asset: it is three circles and one petal
 * repeated on a rotation, so the markup is smaller than the request for a file
 * would be, and it inherits `currentColor` — which is what lets one shape work
 * in both themes.
 */
function Mandala({ className = "" }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      className={className}
    >
      <circle cx="100" cy="100" r="26" />
      <circle cx="100" cy="100" r="64" />
      <circle cx="100" cy="100" r="96" strokeDasharray="2 6" />
      {Array.from({ length: 12 }, (_, i) => (
        <path
          key={i}
          d="M100 100 C 114 74, 114 44, 100 16 C 86 44, 86 74, 100 100 Z"
          transform={`rotate(${i * 30} 100 100)`}
        />
      ))}
    </svg>
  );
}
