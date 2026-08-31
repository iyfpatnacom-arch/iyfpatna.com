import { setRequestLocale, getTranslations } from "next-intl/server";
import { IskconLogo } from "@/components/site/IskconLogo";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { routing } from "@/i18n/routing";
import { MANAGEMENT_COUNCIL, ORG } from "@/lib/site-config";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return { title: t("title"), description: t("body") };
}

const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  ORG.address,
)}`;

/**
 * About page.
 *
 * The previous version presented eight invented member names behind randomly
 * generated stock portraits, and claimed a specific number of campus
 * chapters. None of it was real, so none of it survived. What replaces it is
 * the one roster we can actually stand behind: the Temple Management Council
 * that IYF Patna operates under.
 */
export default async function AboutPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("about");
  const tf = await getTranslations("footer");

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
      <p className="text-xs font-semibold tracking-wider text-primary uppercase">
        {t("eyebrow")}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
        {t("body")}
      </p>

      {/* Parent organisation */}
      <section className="mt-12 flex flex-col gap-6 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-start sm:gap-8 sm:p-8">
        <IskconLogo
          className="h-16 w-auto shrink-0 text-foreground"
          title="ISKCON"
        />
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {t("parent_title")}
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
            {t("parent_body")}
          </p>
          <p className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin
              className="mt-0.5 size-4 shrink-0 opacity-70"
              aria-hidden="true"
            />
            <span className="leading-relaxed">{ORG.address}</span>
          </p>
        </div>
      </section>

      {/* Management Council */}
      <section className="mt-14">
        <h2 className="text-2xl font-semibold tracking-tight">
          {t("council_title")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t("council_subtitle")}
        </p>

        <ul className="mt-7 grid gap-4 sm:grid-cols-2">
          {MANAGEMENT_COUNCIL.map((member) => (
            <li
              key={member.name}
              className="rounded-xl border border-border bg-card p-5"
            >
              <p className="font-medium text-foreground">{member.name}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {tf(`roles.${member.roleKey}`)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* Visit */}
      <section className="mt-14 rounded-2xl border border-border bg-muted/30 p-6 sm:p-8">
        <h2 className="text-lg font-semibold tracking-tight">
          {t("visit_title")}
        </h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          {t("visit_body")}
        </p>
        <Button
          className="mt-6 rounded-full"
          render={
            <a href={mapsHref} target="_blank" rel="noopener noreferrer" />
          }
        >
          <MapPin className="size-4" aria-hidden="true" />
          {t("visit_cta")}
        </Button>
      </section>
    </div>
  );
}
