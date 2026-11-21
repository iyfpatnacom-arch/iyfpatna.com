import { getTranslations } from "next-intl/server";
import { Check } from "lucide-react";
import { DonateButton } from "@/components/donate/DonateProvider";
import { GitaBook } from "@/components/donate/GitaBook";
import { GITA_MARATHON } from "@/lib/site-config";
import { cn } from "@/lib/utils";

/**
 * One Gita Marathon sponsorship.
 *
 * The number of books leads, not the amount: "108 Gitas" is a thing somebody
 * can picture, and "₹27,000" is not. The rupees are on the button, where the
 * donor is about to agree to them.
 *
 * No per-copy rate is printed here or anywhere else on the page. What a Gita
 * costs over a counter is not what a sponsored copy costs, and publishing a
 * division as though it were the book's price invited exactly that confusion.
 * The tier is a count and an amount; both are stated plainly and neither
 * claims to be a price list.
 *
 * `group` is on the article because the drawing inside it opens on hover —
 * the animation is CSS keyed off this class (see `.gita-book` in
 * `globals.css`), which is what lets this card stay a server component. The
 * only client code on it is the `DonateButton` that opens the shared dialog
 * with this seva and this amount already chosen.
 */
export async function GitaTierCard({ tier }) {
  const t = await getTranslations("donate.gita_marathon");

  return (
    <article
      className={cn(
        "group relative flex flex-col rounded-2xl border bg-card p-5 transition-colors sm:p-6",
        /* The featured tier is outlined rather than scaled up: a card that
           grows breaks the grid's baseline on a phone, where these stack and
           the "most chosen" badge is doing the same job on its own. */
        tier.featured
          ? "border-primary/45 bg-primary/[0.04] ring-1 ring-primary/15"
          : "border-border hover:border-primary/30",
      )}
    >
      {tier.featured && (
        <span className="absolute -top-2.5 start-5 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-primary-foreground uppercase">
          <Check className="size-3" aria-hidden="true" />
          {t("tier_featured")}
        </span>
      )}

      <div className="flex items-center justify-between gap-3">
        <GitaBook className="aspect-3/4 w-14 shrink-0" />
        {/* `tabular-nums` so a column of these line up down the grid. */}
        <span className="text-2xl font-semibold tracking-tight tabular-nums">
          {t("tier_books", { books: tier.books })}
        </span>
      </div>

      <h3 className="mt-4 text-lg font-semibold tracking-tight text-balance">
        {t(`tiers.${tier.key}.name`)}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {t(`tiers.${tier.key}.note`)}
      </p>

      {/* `mt-auto` keeps every button in the row on one line however long the
          six notes come out in either language. */}
      <div className="mt-auto pt-5">
        <DonateButton
          sevaSlug={GITA_MARATHON.slug}
          amount={tier.amount}
          variant={tier.featured ? undefined : "outline"}
          className="w-full"
        >
          {t("tier_cta", { amount: tier.amount })}
        </DonateButton>
      </div>
    </article>
  );
}
