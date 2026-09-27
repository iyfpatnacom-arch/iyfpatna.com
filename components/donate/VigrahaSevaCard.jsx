import { getTranslations } from "next-intl/server";
import { Flower2 } from "lucide-react";
import { IkImage } from "@/components/media/IkImage";
import { getLatestDarshan } from "@/lib/darshan";
import { DonateButton, SevaPriceRow } from "@/components/donate/DonateProvider";
import { VIGRAHA_SEVA_OPTIONS, VIGRAHA_SEVA_SLUG } from "@/lib/site-config";

/**
 * Sri Vigraha Seva Avsar — the eleven named offerings, each at its own price.
 *
 * It sits across the full width of the Pitru Paksha grid rather than beside
 * the other two cards because it is a price list, not a single ask: eleven
 * rows squeezed into a third of the row would have wrapped every one of them.
 *
 * Each row is its own link with the price already set, so a donor who wants
 * the payal seva arrives at the gateway on that amount instead of typing it.
 * They all carry the same seva slug — to the gateway these are one seva at
 * eleven prices, and inventing a slug per offering would send the temple's
 * form a value it does not publish.
 *
 * The photograph is the morning's darshan, the same one the home page shows,
 * which is the whole argument for this card: what the seva pays for is what
 * the visitor is looking at. When there is no darshan — nothing uploaded yet,
 * or the database is unreachable during a build — the card renders without
 * it rather than falling back to the hero photo, which is a picture of youths
 * on a yatra and would be a lie above a deity seva.
 */
export async function VigrahaSevaCard() {
  const t = await getTranslations("donate.pitru.vigraha");
  /* The darshan's description belongs to the photo itself, so it is read from
     where that photo is published rather than restated here. */
  const tHome = await getTranslations("home");

  const darshan = await getLatestDarshan();

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card sm:col-span-2 sm:flex-row">
      {darshan && (
        <div className="relative aspect-video w-full shrink-0 border-b border-border/70 sm:aspect-auto sm:w-[34%] sm:border-r sm:border-b-0">
          <IkImage
            src={darshan.url}
            alt={tHome("darshan_image_alt")}
            fill
            quality={60}
            sizes="(min-width: 1152px) 372px, (min-width: 640px) 34vw, 55vw"
            className="object-cover"
          />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
        <span className="grid size-10 shrink-0 place-items-center rounded-full border border-primary/25 bg-primary/10 text-primary">
          <Flower2 className="size-4.5" aria-hidden="true" />
        </span>

        <h3 className="mt-4 text-lg font-semibold tracking-tight text-balance">
          {t("title")}
        </h3>
        {/* The Devanagari name under the English one, because this is how the
            temple itself lists this seva and the donor hears it said. */}
        <p className="font-hindi mt-1 text-sm text-muted-foreground">
          {t("title_hi")}
        </p>

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {t("intro")}
        </p>

        <p className="mt-4 rounded-xl bg-muted/40 px-3.5 py-3 text-sm leading-relaxed text-muted-foreground">
          {t("scripture")}
          <span className="mt-1.5 block text-xs font-medium text-foreground/70">
            — {t("source")}
          </span>
        </p>

        {/* The price list. Rows rather than chips: the name and the amount
            have to stay on one line together, and "Phool Bangla Seva
            ₹1,00,000" is too long to wrap into a chip row without breaking
            the pairing. */}
        <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {VIGRAHA_SEVA_OPTIONS.map(({ key, amount }) => (
            <li key={key}>
              <SevaPriceRow
                sevaSlug={VIGRAHA_SEVA_SLUG}
                amount={amount}
                label={t(`options.${key}`)}
              />
            </li>
          ))}
        </ul>

        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          {t("note")}
        </p>

        <div className="mt-auto pt-5">
          <DonateButton sevaSlug={VIGRAHA_SEVA_SLUG} variant="outline">
            {t("cta")}
          </DonateButton>
        </div>
      </div>
    </article>
  );
}
