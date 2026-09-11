import { setRequestLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { AVATARS } from "@/lib/sarathi/avatars";
import { Panel } from "@/components/site/Panel";
import { AvatarPortrait } from "@/components/sarathi/AvatarPortrait";

/** AI Avatars — pick an acharya to put a question to. */

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "sarathi.avatars" });
  return { title: t("title"), description: t("intro") };
}

export default async function AvatarsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("sarathi.avatars");

  const live = AVATARS.filter((avatar) => avatar.status === "live");
  const soon = AVATARS.filter((avatar) => avatar.status !== "live");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <Link
        href="/sarathi"
        className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        {t("back")}
      </Link>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
        {t("intro")}
      </p>

      <div className="mt-8 flex flex-col gap-3">
        {live.map((avatar) => (
          <Link key={avatar.slug} href={`/sarathi/avatars/${avatar.slug}`} className="group">
            <Panel
              tone="accent"
              className="flex flex-col gap-4 p-5 transition-colors group-hover:border-brand-purple/50 sm:flex-row sm:items-center sm:p-6"
            >
              <AvatarPortrait avatar={avatar} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold text-foreground">{avatar.name[locale]}</p>
                <p className="text-xs font-medium text-muted-foreground">
                  {avatar.role[locale]} · {avatar.years}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {avatar.blurb[locale]}
                </p>
              </div>
              <span className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">
                {t("talk")}
                <ArrowRight className="size-4" aria-hidden="true" />
              </span>
            </Panel>
          </Link>
        ))}
      </div>

      {soon.length > 0 && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {soon.map((avatar) => (
            <Panel key={avatar.slug} className="flex items-center gap-3 p-4 opacity-70" aria-disabled="true">
              <AvatarPortrait avatar={avatar} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{avatar.name[locale]}</p>
                <p className="truncate text-xs text-muted-foreground">{avatar.role[locale]}</p>
              </div>
              <span className="shrink-0 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {t("soon")}
              </span>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
