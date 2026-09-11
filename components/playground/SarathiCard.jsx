import { useTranslations } from "next-intl";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";

/**
 * Sarathi AI — the door from the playground to `/sarathi`.
 *
 * It spans both columns rather than sitting as one more tile because it is
 * not one more tool: it opens a section of its own, with its own cards (AI
 * Avatars today, more announced). A tile identical to its neighbours that
 * opened a whole second grid would be a surprise; a wide banner says so.
 *
 * Drawn with a border and two flat tints rather than the frosted-glass
 * vocabulary the tools used to share — see the note in `components/site/Panel`
 * for why nothing on these pages composites.
 */
export function SarathiCard() {
  const t = useTranslations("playground.sarathi");

  return (
    <Link
      href="/sarathi"
      aria-labelledby="sarathi-heading"
      className="group relative col-span-2 overflow-hidden rounded-xl border border-brand-purple/25 bg-linear-to-br from-brand-purple/[0.07] via-card to-primary/[0.07] p-5 transition-colors hover:border-brand-purple/50 sm:p-6 dark:from-brand-purple/12 dark:to-primary/10"
    >
      {/* A single soft bloom in the corner, positioned off the panel so it
          reads as light rather than as a shape. `blur-3xl` on one absolutely
          positioned element costs one composited layer, not one per card. */}
      <span
        className="pointer-events-none absolute -top-16 -right-10 size-44 rounded-full bg-brand-purple/20 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-purple/12 text-brand-purple ring-1 ring-brand-purple/25">
          <Sparkles className="size-6" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h2
              id="sarathi-heading"
              className="text-lg font-semibold tracking-tight text-foreground"
            >
              {t("name")}
            </h2>
            <span className="text-sm text-muted-foreground">{t("gloss")}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-purple/30 bg-brand-purple/10 px-2.5 py-1 text-[11px] font-medium text-brand-purple">
              <span
                className="size-1.5 animate-pulse rounded-full bg-brand-purple"
                aria-hidden="true"
              />
              {t("badge")}
            </span>
          </div>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {t("tagline")}
          </p>

          <ul className="mt-4 flex flex-wrap gap-2">
            {["point_ask", "point_cite", "point_honest"].map((key) => (
              <li
                key={key}
                className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
              >
                {t(key)}
              </li>
            ))}
          </ul>

          <p className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-purple">
            {t("open")}
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </p>
        </div>
      </div>
    </Link>
  );
}
