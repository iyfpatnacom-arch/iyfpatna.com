import { setRequestLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, ExternalLink, MapPin, TriangleAlert } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import {
  DIGIPIN_ALPHABET,
  digipinCellSizeMetres,
  normaliseDigipin,
  safeDecodeDigipin,
} from "@/lib/campus/digipin";
import { allPlacesWithDigipin, mapsUrlFor, nearestPlace } from "@/lib/campus/places";
import { DigipinLookup } from "@/components/campus/DigipinLookup";
import { PlaceChip } from "@/components/campus/icons";
import { Panel } from "@/components/site/Panel";

/**
 * Where a DIGIPIN lands.
 *
 * The campus's own codes are prerendered so the QR on a signboard resolves
 * without the server doing any thinking; everything else renders on demand,
 * which costs one ten-iteration loop and no I/O at all — there is nothing to
 * fetch, because decoding is pure arithmetic.
 *
 * Never calls `notFound()` for a malformed code. A 404 tells the visitor the
 * page is missing, when what is actually wrong is the ten characters they
 * typed — and the fix is to show them the box again with a note about which
 * letters exist. A code arriving here has usually been read off a rain-streaked
 * sign or retyped from a WhatsApp message, so a typo is the expected case, not
 * an error condition.
 */
export function generateStaticParams() {
  const codes = [...new Set(allPlacesWithDigipin().map((place) => place.digipin))];
  return routing.locales.flatMap((locale) =>
    codes.map((digipin) => ({ locale, digipin }))
  );
}

export async function generateMetadata({ params }) {
  const { locale, digipin } = await params;
  const t = await getTranslations({ locale, namespace: "campus.pin" });
  const code = normaliseDigipin(decodeURIComponent(digipin));
  const point = safeDecodeDigipin(code);

  return {
    title: point ? code : t("invalid_title"),
    description: t("subtitle"),
    // A decoded code is a computed answer, not a page worth having in an index
    // — and there are 4^10 of them per level. Keeping them out of search
    // results also keeps the campus's own place pages from competing with a
    // wall of near-identical coordinate pages.
    robots: { index: false, follow: true },
  };
}

export default async function DigipinResultPage({ params }) {
  const { locale, digipin } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("campus");

  const code = normaliseDigipin(decodeURIComponent(digipin));
  const point = safeDecodeDigipin(code);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <Link
        href="/campus/pin"
        className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        {t("pin.title")}
      </Link>

      {point ? (
        <Found code={code} point={point} t={t} />
      ) : (
        <NotACode code={code} t={t} />
      )}

      <div className="mt-10 border-t border-border/70 pt-8">
        <DigipinLookup />
      </div>
    </div>
  );
}

function Found({ code, point, t }) {
  const cell = digipinCellSizeMetres(point.lat);
  const near = nearestPlace(point.lat, point.lon);

  // Under half a cell is the same square, not "nearby" — saying "2 metres from
  // the gaushala" about a code that *is* the gaushala reads as a rounding bug.
  const isHere = near && near.metres <= Math.max(cell.width, cell.height) / 2;

  return (
    <>
      <header className="mt-6">
        <p className="text-xs font-semibold tracking-wider text-primary uppercase">
          {t("pin.eyebrow")}
        </p>
        <h1 className="mt-3 font-mono text-3xl font-semibold tracking-[0.18em] text-foreground sm:text-4xl">
          {code}
        </h1>
      </header>

      {near ? (
        <Panel tone="accent" className="mt-6 p-5">
          <h2 className="text-sm font-semibold text-foreground">
            {t("pin.on_campus_title")}
          </h2>
          <Link
            href={`/campus/${near.place.key}`}
            className="group mt-3 flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 transition-colors hover:border-primary/40"
          >
            <PlaceChip icon={near.place.icon} category={near.place.category} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">
                {t(`places.${near.place.key}.name`)}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {isHere
                  ? t("pin.on_campus_here", {
                      place: t(`places.${near.place.key}.name`),
                    })
                  : t("pin.on_campus_near", {
                      metres: Math.round(near.metres),
                      place: t(`places.${near.place.key}.name`),
                    })}
              </span>
            </span>
          </Link>
        </Panel>
      ) : (
        <Panel className="mt-6 p-5">
          <h2 className="text-sm font-semibold text-foreground">
            {t("pin.off_campus_title")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("pin.off_campus_body")}
          </p>
        </Panel>
      )}

      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        <Panel className="p-4">
          <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            {t("pin.coordinates")}
          </dt>
          {/* Six decimals is about 11cm — one significant figure past what a
              four-metre cell can justify, and the conventional precision for a
              coordinate someone might paste elsewhere. */}
          <dd className="mt-1 font-mono text-[15px] text-foreground">
            {point.lat.toFixed(6)}, {point.lon.toFixed(6)}
          </dd>
        </Panel>

        <Panel className="p-4">
          <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            {t("pin.cell_label")}
          </dt>
          <dd className="mt-1 text-[15px] text-foreground">
            {t("pin.cell_value", {
              width: cell.width.toFixed(1),
              height: cell.height.toFixed(1),
            })}
          </dd>
        </Panel>
      </dl>

      <a
        href={mapsUrlFor(point)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-muted/30 px-4 text-sm font-medium text-foreground transition-colors hover:border-primary/40"
        style={{ touchAction: "manipulation" }}
      >
        <MapPin className="size-4 text-muted-foreground" aria-hidden="true" />
        {t("pin.open_maps")}
        <ExternalLink className="size-3.5 text-muted-foreground" aria-hidden="true" />
      </a>
    </>
  );
}

function NotACode({ code, t }) {
  return (
    <Panel className="mt-6 flex items-start gap-3 p-5">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0">
        <h1 className="text-lg font-semibold text-foreground">
          {t("pin.invalid_title")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t("pin.invalid_body", {
            alphabet: DIGIPIN_ALPHABET,
            code: code || "—",
          })}
        </p>
      </div>
    </Panel>
  );
}
