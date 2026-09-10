import { setRequestLocale, getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { TOOLS } from "@/lib/playground/tools";
import { ToolChip } from "@/components/playground/ToolShell";
import { Panel } from "@/components/site/Panel";
import { SarathiCard } from "@/components/playground/SarathiCard";

/**
 * Playground — the seven sadhana tools.
 *
 * This page reads nothing. The version it replaces queried four feature flags
 * out of MongoDB on every request to decide which tiles to light up, which is
 * why the dock's Playground tab served an error page whenever the database was
 * unreachable. There is nothing here worth that risk: every tool behind these
 * tiles keeps its state in the browser and works signed out and offline, so
 * there is no state of the world in which a tile should be hidden.
 *
 * One layout for every pointer: the cards, two to a row at every width. The
 * phone-only app drawer that briefly stood in for them here is gone — a single
 * grid is the thing to maintain, and a card that names the tool and says what
 * it does in a line beats an icon that only names it. Two columns rather than
 * three on a wide screen so the tagline keeps its measure, and rather than one
 * on a phone so the seventh tool is not four screens down.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "playground" });
  return { title: t("title"), description: t("subtitle") };
}

export default async function PlaygroundPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("playground");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="max-w-2xl">
        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
          {t("eyebrow")}
        </p>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground sm:text-base">
          {t("intro")}
        </p>
      </header>

      {/* Two columns at every width, so the grid a visitor learns on a phone is
          the grid they meet again on a laptop. The gap and the cards' own
          padding tighten below `sm`: at 360px, two cards plus a 16px gutter
          leave about 150px of card, and 20px of padding on each side of that
          would wrap the shortest tool name. */}
      <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4">
        <SarathiCard />

        {TOOLS.map((tool) => (
          <Link key={tool.key} href={tool.href} className="group">
            <Panel className="flex h-full flex-col p-4 transition-colors group-hover:border-primary/40 sm:p-5">
              <ToolChip icon={tool.icon} accent={tool.accent} size="lg" />

              <p className="mt-4 flex items-center gap-1.5 font-semibold text-foreground">
                {t(`tools.${tool.key}.name`)}
                <ArrowRight
                  className="size-4 opacity-0 transition-opacity group-hover:opacity-60"
                  aria-hidden="true"
                />
              </p>
              <p className="mt-1.5 hidden md:block text-sm leading-relaxed text-muted-foreground">
                {t(`tools.${tool.key}.tagline`)}
              </p>

              <p className="mt-4 flex-1" />
              <p className="text-[11px] font-medium text-muted-foreground/80">
                {tool.signInAdds === "sync"
                  ? t("badge_sync")
                  : t("badge_no_account")}
              </p>
            </Panel>
          </Link>
        ))}
      </div>

      <p className="mt-10 max-w-2xl border-l-2 border-primary/40 pl-4 text-sm leading-relaxed text-muted-foreground">
        {t("footnote")}
      </p>
    </div>
  );
}
