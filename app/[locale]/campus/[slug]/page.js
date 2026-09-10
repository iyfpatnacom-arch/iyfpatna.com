import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, ExternalLink, Layers } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import {
  PLACES,
  allPlacesWithDigipin,
  mapsUrlFor,
  placeByKey,
  placesNear,
  withDigipin,
} from "@/lib/campus/places";
import { DigipinBadge } from "@/components/campus/DigipinBadge";
import { Hours, floorLabel } from "@/components/campus/Hours";
import { PlaceChip } from "@/components/campus/icons";
import { PlaceQr } from "@/components/campus/PlaceQr";
import { Panel } from "@/components/site/Panel";

/**
 * One place on the campus.
 *
 * Exists as its own URL rather than a modal on the list because the URL is the
 * product: it is what goes on the signboard's QR code, what gets pasted into a
 * WhatsApp group, and what a visitor sends to the friend still looking for
 * parking. A modal is none of those things.
 *
 * Keyed by slug, never by DIGIPIN. Two places on the campus already share a
 * code — the temple hall and the altar directly above it — so a code cannot
 * identify a place, and building the route around one would have made that
 * collision a 404 rather than a footnote.
 */
export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    PLACES.map((place) => ({ locale, slug: place.key }))
  );
}

export async function generateMetadata({ params }) {
  const { locale, slug } = await params;
  const place = placeByKey(slug);
  if (!place) return {};

  const t = await getTranslations({ locale, namespace: "campus" });
  return {
    title: t(`places.${place.key}.name`),
    description: t(`places.${place.key}.blurb`),
  };
}

export default async function PlacePage({ params }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const place = withDigipin(placeByKey(slug));
  if (!place) notFound();

  const t = await getTranslations("campus");

  /**
   * Other places that decode to this same square.
   *
   * DIGIPIN addresses the ground, not the building standing on it, so anything
   * stacked vertically collides by design. Saying so on the page is the only
   * honest option: a visitor who notices two places sharing a code and is told
   * nothing concludes the site has a bug.
   */
  const sharing = allPlacesWithDigipin().filter(
    (other) => other.digipin === place.digipin && other.key !== place.key
  );

  const nearby = placesNear(place);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <Link
        href="/campus"
        className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        {t("back")}
      </Link>

      <header className="mt-6 flex items-start gap-4">
        <PlaceChip icon={place.icon} category={place.category} size="lg" />
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {t(`places.${place.key}.name`)}
          </h1>
          <p className="mt-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            {t(`categories.${place.category}`)}
          </p>
        </div>
      </header>

      <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground sm:text-base">
        {t(`places.${place.key}.blurb`)}
      </p>

      <dl className="mt-6 grid gap-3 sm:grid-cols-2">
        <Panel className="p-4">
          <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            {t("floor_label")}
          </dt>
          <dd className="mt-1 flex items-center gap-2 text-[15px] font-medium text-foreground">
            <Layers className="size-4 text-muted-foreground" aria-hidden="true" />
            {floorLabel(t, place.floor)}
          </dd>
        </Panel>

        <Panel className="p-4">
          <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            {t("hours_label")}
          </dt>
          <dd className="mt-1 text-[15px] font-medium text-foreground">
            <Hours hours={place.hours} />
          </dd>
        </Panel>
      </dl>

      <Panel className="mt-3 p-4 sm:p-5">
        <DigipinBadge
          digipin={place.digipin}
          lat={place.lat}
          approximate={place.approximate}
        />

        {sharing.length > 0 && (
          <p className="mt-3 border-t border-border/70 pt-3 text-xs leading-relaxed text-muted-foreground">
            {t("digipin_shared", {
              other: sharing.map((other) => t(`places.${other.key}.name`)).join(", "),
            })}
          </p>
        )}

        <a
          href={mapsUrlFor(place)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-muted/30 px-4 text-sm font-medium text-foreground transition-colors hover:border-primary/40"
          style={{ touchAction: "manipulation" }}
        >
          {t("directions")}
          <ExternalLink className="size-3.5 text-muted-foreground" aria-hidden="true" />
        </a>
      </Panel>

      <div className="mt-3">
        <PlaceQr placeKey={place.key} />
      </div>

      {nearby.length > 0 && (
        <section className="mt-12 border-t border-border/70 pt-8">
          <h2 className="text-sm font-semibold text-foreground">{t("nearby")}</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {nearby.map(({ place: other, metres }) => (
              <Link
                key={other.key}
                href={`/campus/${other.key}`}
                className="group flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 transition-colors hover:border-primary/40"
              >
                <PlaceChip icon={other.icon} category={other.category} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {t(`places.${other.key}.name`)}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {/* Rounded to the nearest five metres. The coordinates are
                        good to a few metres at best, so "23 m" would be quoting
                        a precision the data has not got. */}
                    {t("nearby_metres", { metres: Math.max(5, Math.round(metres / 5) * 5) })}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
