import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";

/**
 * Sarathi AI — announced, not yet built.
 *
 * The one tile on the playground index that is deliberately not a link. Every
 * other card here opens something; this one is a promise, so it must not look
 * like a tool that is merely failing to respond. Hence no `Link`, no `onClick`
 * and no hover affordance: nothing about it invites a tap, which is the honest
 * way to say "coming soon" to someone on a phone who cannot hover to find out.
 *
 * It spans both columns rather than sitting as an eighth tile because a tile
 * that behaves differently from its neighbours while looking identical to them
 * is a bug report waiting to happen.
 *
 * Drawn with a border and two flat tints rather than the frosted-glass
 * vocabulary the tools used to share — see the note in `components/site/Panel`
 * for why nothing on these pages composites.
 */
export function SarathiCard() {
  const t = useTranslations("playground.sarathi");

  return (
    <section
      aria-labelledby="sarathi-heading"
      className="relative overflow-hidden rounded-xl border border-brand-purple/25 bg-linear-to-br from-brand-purple/[0.07] via-card to-primary/[0.07] col-span-2 p-5 sm:p-6 dark:from-brand-purple/12 dark:to-primary/10"
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
        </div>
      </div>
    </section>
  );
}
