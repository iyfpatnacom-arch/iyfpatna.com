import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ORG } from "@/lib/site-config";

/** Google Maps search for the temple, built from the one address constant. */
const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  ORG.address
)}`;

export function JoinCta() {
  const t = useTranslations("home");

  return (
    <section>
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="rounded-2xl border border-border bg-card px-6 py-12 text-center sm:px-10">
          <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            {t("join_title")}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            {t("join_body")}
          </p>
          <Button
            size="lg"
            className="mt-7 rounded-full px-5"
            render={
              <a href={mapsHref} target="_blank" rel="noopener noreferrer" />
            }
          >
            <MapPin className="size-4" aria-hidden="true" />
            {t("join_cta")}
          </Button>
        </div>
      </div>
    </section>
  );
}
