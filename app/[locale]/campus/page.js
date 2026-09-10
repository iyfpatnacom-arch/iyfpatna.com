import { setRequestLocale, getTranslations } from "next-intl/server";
import { Info } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import {
  FLOORS,
  HAS_APPROXIMATE_PLACES,
  allPlacesWithDigipin,
} from "@/lib/campus/places";
import { CampusExplorer } from "@/components/campus/CampusExplorer";
import { Panel } from "@/components/site/Panel";

/**
 * The campus, listed.
 *
 * Reads nothing but a static module, for the reason the playground index has
 * written on it in as many words: a page whose only job is to tell a visitor
 * where the restaurant is has no business going down because Mongo is
 * unreachable. Every place, its floor, its timings and its DIGIPIN are known at
 * build time, so this prerenders in both locales and then never changes until
 * someone edits `lib/campus/places.js`.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "campus" });
  return { title: t("title"), description: t("subtitle") };
}

export default async function CampusPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("campus");

  // Encoded once here rather than fifteen times in the browser: the codes are
  // a pure function of coordinates that do not change between requests.
  const places = allPlacesWithDigipin();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="max-w-2xl">
        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
          {t("eyebrow")}
        </p>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground sm:text-base">
          {t("subtitle")}
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          {t("intro")}{" "}
          <Link
            href="/campus/pin"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("digipin_learn")}
          </Link>
        </p>
      </header>

      {/* Said once, at the top, rather than on every row. The coordinates are
          placeholders until the campus is surveyed, and a visitor who is about
          to copy a code deserves to know that before they send it to someone. */}
      {HAS_APPROXIMATE_PLACES && (
        <Panel tone="accent" className="mt-6 flex items-start gap-3 p-4">
          <Info className="mt-0.5 size-4 shrink-0 text-brand-purple" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t("approximate_note")}
          </p>
        </Panel>
      )}

      <div className="mt-8">
        <CampusExplorer places={places} floors={FLOORS} />
      </div>
    </div>
  );
}
