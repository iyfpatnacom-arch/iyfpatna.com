import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { HERO_IMAGE, ORG } from "@/lib/site-config";

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
 * is the page's largest contentful paint, and it sits second in the DOM on a
 * phone so the headline is still the first thing read.
 */
export function Hero() {
  const t = useTranslations("home");

  return (
    <section className="border-b border-border/70">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-14">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            <span
              className="size-1.5 rounded-full bg-primary"
              aria-hidden="true"
            />
            {t("badge")}
          </p>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            {t("title")}
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("subtitle")}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
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

          <p className="mt-10 max-w-2xl border-l-2 border-primary/40 pl-4 text-sm leading-relaxed text-muted-foreground">
            {t("parent_strip")}{" "}
            <span className="text-foreground/70">{ORG.parentLegalName}</span>
          </p>
        </div>

        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-border bg-muted sm:aspect-[3/2] lg:aspect-[4/5]">
          <Image
            src={HERO_IMAGE.src}
            alt={t("hero_image_alt")}
            fill
            priority
            sizes="(min-width: 1024px) 42vw, 100vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}
