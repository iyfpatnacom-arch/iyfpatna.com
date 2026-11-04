import { getTranslations } from "next-intl/server";
import { BookOpen, Check } from "lucide-react";
import { DonateButton } from "@/components/donate/DonateProvider";
import { GITA_MARATHON } from "@/lib/site-config";
import { cn } from "@/lib/utils";

/**
 * One Gita Marathon sponsorship.
 *
 * The number of books leads, not the amount. Every tier is the same ₹250 a
 * copy, so the rupees carry no information the count does not already give —
 * and "108 Gitas" is a thing somebody can picture, which "₹27,000" is not.
 * The arithmetic is printed underneath anyway (`tier_each`), because a donor
 * being asked for twenty-seven thousand rupees is entitled to check it.
 *
 * A server component, unlike `SevaCard`: there is nothing to pick here. The
 * tier *is* the amount, so the card holds no state and the only client code on
 * it is the `DonateButton` that opens the shared donation dialog with this
 * seva and this amount already chosen.
 */
export async function GitaTierCard({ tier }) {
  const t = await getTranslations("donate.gita_marathon");

  return (
    <article
      className={cn(
        "relative flex flex-col rounded-2xl border bg-card p-5 transition-colors sm:p-6",
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

      <div className="flex items-start justify-between gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full border border-primary/25 bg-primary/10 text-primary">
          <BookOpen className="size-[18px]" aria-hidden="true" />
        </span>
        {/* `tabular-nums` so a column of these line up down the grid. */}
        <span className="text-end">
          <span className="block text-2xl font-semibold tracking-tight tabular-nums">
            {t("tier_books", { books: tier.books })}
          </span>
          <span className="block text-[11px] text-muted-foreground tabular-nums">
            {t("tier_each", {
              price: GITA_MARATHON.bookPrice,
              books: tier.books,
            })}
          </span>
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
