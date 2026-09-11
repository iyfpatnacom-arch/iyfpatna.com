import { setRequestLocale, getTranslations } from "next-intl/server";
import { ArrowRight, BookOpenText, Languages, Sparkles, Sprout, UsersRound } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { SARATHI_FEATURES } from "@/lib/sarathi/avatars";
import { Panel } from "@/components/site/Panel";
import { cn } from "@/lib/utils";

/**
 * Sarathi AI — the hub.
 *
 * One card per AI feature. Only AI Avatars is built; the rest are announced
 * the same way the playground announced Sarathi itself — present, dimmed, and
 * deliberately not links, so nothing on a phone invites a tap that goes
 * nowhere.
 */

const ICONS = { UsersRound, BookOpenText, Languages, Sprout };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "sarathi" });
  return { title: t("eyebrow"), description: t("intro") };
}

export default async function SarathiPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("sarathi");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="max-w-2xl">
        <p className="inline-flex items-center gap-2 rounded-full border border-brand-purple/30 bg-brand-purple/10 px-3 py-1 text-xs font-medium text-brand-purple">
          <Sparkles className="size-3.5" aria-hidden="true" />
          {t("eyebrow")}
        </p>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground sm:text-base">
          {t("intro")}
        </p>
      </header>

      <div className="mt-10 grid gap-3 sm:grid-cols-2 sm:gap-4">
        {SARATHI_FEATURES.map((feature) => {
          const Icon = ICONS[feature.icon] ?? Sparkles;
          const live = feature.status === "live";

          const card = (
            <Panel
              tone={live ? "accent" : "default"}
              className={cn(
                "flex h-full flex-col p-5 sm:p-6",
                live ? "transition-colors group-hover:border-brand-purple/50" : "opacity-70"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-purple/12 text-brand-purple ring-1 ring-brand-purple/25">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                    live
                      ? "border-brand-purple/30 bg-brand-purple/10 text-brand-purple"
                      : "border-border bg-muted/40 text-muted-foreground"
                  )}
                >
                  {live ? t("status_live") : t("status_soon")}
                </span>
              </div>

              <p className="mt-4 flex items-center gap-1.5 text-lg font-semibold text-foreground">
                {t(`features.${feature.key}.name`)}
                {live && (
                  <ArrowRight
                    className="size-4 opacity-60 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                )}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {t(`features.${feature.key}.tagline`)}
              </p>
            </Panel>
          );

          return live ? (
            <Link key={feature.key} href={feature.href} className="group">
              {card}
            </Link>
          ) : (
            <div key={feature.key} aria-disabled="true">
              {card}
            </div>
          );
        })}
      </div>

      <p className="mt-10 max-w-2xl border-l-2 border-brand-purple/40 pl-4 text-sm leading-relaxed text-muted-foreground">
        {t("footnote")}
      </p>
    </div>
  );
}
