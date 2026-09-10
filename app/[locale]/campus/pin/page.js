import { setRequestLocale, getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { DIGIPIN_ALPHABET } from "@/lib/campus/digipin";
import { CAMPUS_CENTRE, withDigipin, placeByKey } from "@/lib/campus/places";
import { DigipinLookup } from "@/components/campus/DigipinLookup";
import { Panel } from "@/components/site/Panel";

/**
 * The DIGIPIN decoder.
 *
 * Deliberately not restricted to this campus. A visitor who has just learnt
 * what the code under Govinda's means will try one from somewhere else within
 * the minute — their own house, most likely — and a tool that answers "not
 * found" to a perfectly good code teaches them the codes do not work. It costs
 * nothing to decode all of India, because that is all the algorithm does.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "campus.pin" });
  return { title: t("title"), description: t("subtitle") };
}

export default async function DigipinLookupPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("campus");

  // A code from this campus, so the empty state has something real to try
  // rather than asking the visitor to invent ten characters.
  const example = withDigipin(placeByKey("temple-hall")) ?? {
    digipin: null,
    ...CAMPUS_CENTRE,
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <Link
        href="/campus"
        className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        {t("back")}
      </Link>

      <header className="mt-6">
        <p className="text-xs font-semibold tracking-wider text-primary uppercase">
          {t("pin.eyebrow")}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {t("pin.title")}
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground sm:text-base">
          {t("pin.subtitle")}
        </p>
      </header>

      <div className="mt-6">
        <DigipinLookup />
      </div>

      {example.digipin && (
        <p className="mt-3 text-sm text-muted-foreground">
          <Link
            href={`/campus/pin/${example.digipin}`}
            className="font-mono tracking-wider text-primary underline-offset-4 hover:underline"
          >
            {example.digipin}
          </Link>{" "}
          — {t(`places.temple-hall.name`)}
        </p>
      )}

      <Panel className="mt-8 p-5">
        <h2 className="text-sm font-semibold text-foreground">
          {t("pin.about_title")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t("pin.about_body")}
        </p>
        <p className="mt-3 font-mono text-sm tracking-[0.2em] text-muted-foreground">
          {DIGIPIN_ALPHABET}
        </p>
      </Panel>
    </div>
  );
}
