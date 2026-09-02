import { useTranslations } from "next-intl";
import { ArrowRight, Hourglass } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

/**
 * The page for a route that is named in the navigation but not built yet.
 *
 * Both the bottom dock and the mobile menu link to Playground and Profile, and
 * a nav item that leads to a stack trace is worse than one that leads
 * nowhere: the visitor cannot tell whether the site is broken or the feature
 * simply is not ready. This says which, in the site's own voice, and then
 * offers the two places that *are* worth their time — so a dead end becomes a
 * fork rather than a bounce.
 *
 * Deliberately static. The pages that used to live here read feature flags and
 * user rows out of MongoDB at request time, which is exactly why they fell
 * over when the database was unreachable. Nothing on this page can fail.
 */
export function ComingSoon({ eyebrow, title, body }) {
  const t = useTranslations("common");
  const tn = useTranslations("nav");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-20 text-center sm:px-6 sm:py-28">
      <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
        <Hourglass className="size-3.5" aria-hidden="true" />
        {eyebrow}
      </span>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {title}
      </h1>

      <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
        {body}
      </p>

      <p className="mt-8 text-sm font-medium text-primary">
        {t("coming_soon")}
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button
          size="lg"
          className="rounded-full px-5"
          render={<Link href="/programs" />}
        >
          {tn("programs")}
          <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="rounded-full px-5"
          render={<Link href="/" />}
        >
          {tn("home")}
        </Button>
      </div>
    </div>
  );
}
