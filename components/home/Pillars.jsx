import { useTranslations } from "next-intl";
import { BookOpen, HandHeart, Music2, Route } from "lucide-react";

/**
 * The four things IYF Patna actually does, stated plainly.
 *
 * Static content on purpose: this is the site's description of itself, not
 * event data, so it does not belong in the database and should never be one
 * failed query away from disappearing.
 */
const PILLARS = [
  { key: "kirtan", Icon: Music2 },
  { key: "gita", Icon: BookOpen },
  { key: "seva", Icon: HandHeart },
  { key: "yatra", Icon: Route },
];

export function Pillars() {
  const t = useTranslations("home");

  return (
    <section className="border-b border-border/70">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("pillars_title")}
        </h2>
        <p className="mt-2 text-muted-foreground">{t("pillars_subtitle")}</p>

        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map(({ key, Icon }) => (
            <li
              key={key}
              className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
            >
              <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-semibold tracking-tight">
                {t(`pillar_${key}_title`)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t(`pillar_${key}_body`)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
