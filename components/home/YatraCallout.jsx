import { useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { YATRA_URL, yatraIsExternal } from "@/lib/site-config";
import { Link } from "@/i18n/navigation";

/**
 * Vrindavan Yatra callout.
 *
 * The yatra runs as its own deployment with its own payment gateway, so this
 * links out by absolute URL. If it is ever folded in as a route on this site,
 * `YATRA_URL` becomes a path and this renders an internal link instead —
 * nothing else here changes.
 */
export function YatraCallout() {
  const t = useTranslations("home");

  const label = (
    <>
      {t("yatra_cta")}
      {yatraIsExternal && (
        <ArrowUpRight className="size-4" aria-hidden="true" />
      )}
    </>
  );

  return (
    <section className="border-b border-border/70 bg-muted/25">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex flex-col gap-6 rounded-2xl border border-primary/25 bg-card p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-wider text-primary uppercase">
              {t("yatra_eyebrow")}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              {t("yatra_title")}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              {t("yatra_body")}
            </p>
          </div>

          <Button
            size="lg"
            className="shrink-0 rounded-full px-5"
            render={
              yatraIsExternal ? (
                <a
                  href={YATRA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              ) : (
                <Link href={YATRA_URL} />
              )
            }
          >
            {label}
          </Button>
        </div>
      </div>
    </section>
  );
}
