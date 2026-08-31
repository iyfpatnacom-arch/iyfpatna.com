import { useTranslations } from "next-intl";
import { IskconLogo } from "@/components/site/IskconLogo";
import { MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ORG } from "@/lib/site-config";

/**
 * Says the quiet part out loud: IYF Patna is a wing of ISKCON Patna, not an
 * independent body.
 *
 * The hero badge makes the claim in four words; this section is where a
 * visitor who wants the full relationship — parent society, temple, governing
 * council — can read it without leaving the home page.
 */
export function ParentOrg() {
  const t = useTranslations("home");

  return (
    <section className="border-b border-border/70">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[auto_1fr] lg:items-start lg:gap-14">
        <div className="flex items-center gap-4 lg:flex-col lg:items-start">
          <IskconLogo
            className="h-16 w-auto shrink-0 text-foreground sm:h-24"
            title="ISKCON"
          />
        </div>

        <div className="max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("about_title")}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            {t("about_body")}
          </p>

          <p className="mt-6 flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin
              className="mt-0.5 size-4 shrink-0 opacity-70"
              aria-hidden="true"
            />
            <span className="leading-relaxed">{ORG.address}</span>
          </p>

          <Button
            variant="outline"
            className="mt-7 rounded-full"
            render={<Link href="/about" />}
          >
            {t("about_cta")}
          </Button>
        </div>
      </div>
    </section>
  );
}
