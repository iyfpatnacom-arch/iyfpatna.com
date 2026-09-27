import { getLocale, getTranslations } from "next-intl/server";
import { Flame, Shirt, Soup, Sparkles } from "lucide-react";
import { IkImage } from "@/components/media/IkImage";
import { VigrahaSevaCard } from "@/components/donate/VigrahaSevaCard";
import { DonateButton } from "@/components/donate/DonateProvider";
import { SEVA_LIST } from "@/lib/site-config";

/**
 * The two sevas this fortnight is pointed at, and why those two. Deity seva
 * follows them in a card of its own — see `VigrahaSevaCard`, which is a
 * priced list rather than a single offering and so does not fit this shape.
 *
 * Both are sevas the temple already publishes — the amounts, slugs and impact
 * arithmetic stay exactly as they are in `SEVA_LIST`, because Pitru Paksha is
 * a reason to give, not a different price list. Anna-daan is the shraddha
 * offering itself in Vaishnava practice (SB 7.15.5–6: food offered to the
 * Deity, then shared as prasadam in the forefathers' name); vastra-daan is
 * the other half of the same rite, cloth given with the meal to the sadhus
 * and brahmanas who receive it.
 *
 * Only the keys live here. Every word is in `donate.pitru.card.<key>`, so
 * Hindi is a translation and not a second hardcoded pair that can drift.
 */
const CARDS = [
  { key: "anna_daan", Icon: Soup },
  { key: "vastra_daan", Icon: Shirt },
];

/*
 * The section's photograph: tarpan at a river ghat at sunrise.
 *
 * Supplied by the site owner from IYF Patna's own ImageKit library, so it is
 * served straight off that CDN — `IkImage` picks the ImageKit loader for
 * these URLs and skips the Next optimizer, which on this VPS is CPU-bound
 * (see `lib/imagekit-loader.js`).
 *
 * It is a generic ghat and not Gaya, the Falgu or the temple, so the alt text
 * describes the picture rather than naming a place the image cannot vouch
 * for — the same rule the festivals banner follows. The intrinsic frame is
 * 1024x559; the wrapper crops it wider on desktop rather than letting a
 * half-metre-tall banner push the sevas off the first screen.
 */
const PHOTO =
  "https://ik.imagekit.io/mnkh9j9dw/IYF/a471614b-356d-4de3-ae28-43252cdbb242.jpg";

/*
 * "27 September", in the reader's language.
 *
 * Regionalised to India rather than left on the bare `en` next-intl carries,
 * because plain `en` is `en-US` and renders this "September 27" — the wrong
 * way round for Patna. The festivals page regionalises for the same reason;
 * this matches it deliberately so two dates on the same site cannot disagree
 * about their own order.
 *
 * Fixed to UTC so a day key renders as that day whatever timezone the server
 * was built in.
 */
function dayLabel(dayKey, locale) {
  return new Date(`${dayKey}T00:00:00Z`).toLocaleDateString(
    locale === "hi" ? "hi-IN" : "en-IN",
    { day: "numeric", month: "long", timeZone: "UTC" },
  );
}

/**
 * The Pitru Paksha section of the donate page.
 *
 * Rendered only while the fortnight is actually running — `window` comes from
 * `pitruPaksha()`, which derives it from tithi rather than from a date typed
 * into the source, so this section appears and disappears on its own every
 * year and can never be left advertising a fortnight that ended.
 *
 * It sits directly under the hero because that is the whole point of it: a
 * visitor arriving during Shraddha Paksha should be told what this fortnight
 * is for before being shown the full list of sevas. The two cards deep-link
 * into the existing donation flow with the seva and amount already chosen.
 */
export async function PitruPaksha({ window }) {
  const t = await getTranslations("donate.pitru");
  /* The "opens in a new tab" note is the donate page's own and is worded
     identically on every outbound button, so it is read from there rather
     than copied into this namespace. */
  const tDonate = await getTranslations("donate");
  const locale = await getLocale();

  const range = t("range", {
    start: dayLabel(window.start, locale),
    end: dayLabel(window.end, locale),
  });

  return (
    <section className="mt-12 rounded-2xl border border-primary/25 bg-primary/5 p-6 sm:p-8">
      {/* ------------------------------------------------ where we are */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-background px-3 py-1 text-[11px] font-semibold tracking-wider text-primary uppercase">
          <Sparkles className="size-3" aria-hidden="true" />
          {t("eyebrow")}
        </span>
        <span className="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground">
          {range}
        </span>
        {/* The fortnight's last day stands in for every ancestor whose tithi
            is unknown, so it is worth calling out on the day itself. */}
        {window.isMahalaya ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
            <Flame className="size-3" aria-hidden="true" />
            {t("mahalaya")}
          </span>
        ) : (
          <span className="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground tabular-nums">
            {t("day_of", { day: window.dayNumber, total: window.totalDays })}
          </span>
        )}
      </div>

      <h2 className="mt-5 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
        {t("title")}
      </h2>

      {/* --------------------------------------------------- the pramana */}
      {/* Near enough the top of the page to be the LCP element, so it is
          fetched with priority rather than lazily — which is also why the
          phone breakpoint asks for less than the full viewport width: being
          the LCP, this is the one image whose bytes are the wait, and 65vw
          holds a 3x screen to a 750px file (~35KB) instead of a 1200px one
          (~68KB) for a slot barely 360px wide. */}
      <div className="relative mt-6 aspect-video w-full overflow-hidden rounded-xl border border-border/70 sm:aspect-2/1">
        <IkImage
          src={PHOTO}
          alt={t("photo_alt")}
          fill
          priority
          quality={65}
          sizes="(min-width: 1152px) 1088px, 65vw"
          className="object-cover"
        />
      </div>

      {/* The verse carries the section on its own — the heading states the
          promise and the shastra backs it, with no paragraph in between. */}
      <figure className="mt-6 rounded-xl border border-border/70 bg-background/70 p-5 sm:p-6">
        <blockquote>
          {/* Devanagari carries the Mukta face the rest of the site uses for
              Sanskrit; the roman line is there for readers who do not read
              the script but want to chant it. */}
          <p className="font-hindi text-base leading-relaxed text-foreground sm:text-lg">
            {t("verse_sanskrit")}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground italic sm:text-sm">
            {t("verse_roman")}
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-foreground/90">
            {t("verse_translation")}
          </p>
        </blockquote>
        <figcaption className="mt-3 text-xs font-medium text-muted-foreground">
          — {t("verse_source")}
        </figcaption>
      </figure>

      {/* ----------------------------------------------- the two offerings */}
      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        {CARDS.map(({ key, Icon }) => {
          const seva = SEVA_LIST.find((entry) => entry.key === key);
          if (!seva) return null;

          return (
            <article
              key={key}
              className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-6"
            >
              {/* The same photograph the seva's own card carries further down
                  the page, cropped and bled the same way — one picture per
                  seva, read from `SEVA_LIST`, so the two places cannot end up
                  showing different food. The alt text lives with the seva's
                  copy for the same reason. */}
              {seva.image && (
                <div className="relative -mx-5 -mt-5 mb-5 aspect-video border-b border-border/70 sm:-mx-6 sm:-mt-6">
                  <IkImage
                    src={seva.image}
                    alt={tDonate(`seva.${key}.photo_alt`)}
                    fill
                    quality={60}
                    sizes="(min-width: 1152px) 544px, (min-width: 640px) 35vw, 55vw"
                    className="object-cover"
                  />
                </div>
              )}

              <span className="grid size-10 shrink-0 place-items-center rounded-full border border-primary/25 bg-primary/10 text-primary">
                <Icon className="size-[18px]" aria-hidden="true" />
              </span>

              <h3 className="mt-4 text-lg font-semibold tracking-tight text-balance">
                {t(`card.${key}.title`)}
              </h3>

              {/* The verse is the card's whole body. What the seva pays for
                  is already spelled out on its own card further down the
                  page, so repeating it here only crowded the shastra out. */}
              <p className="mt-3 rounded-xl bg-muted/40 px-3.5 py-3 text-sm leading-relaxed text-muted-foreground">
                {t(`card.${key}.scripture`)}
                <span className="mt-1.5 block text-xs font-medium text-foreground/70">
                  — {t(`card.${key}.source`)}
                </span>
              </p>

              {/* `mt-auto` so both buttons sit on one line however long the
                  two descriptions turn out in either language. */}
              <div className="mt-auto pt-5">
                <DonateButton
                  sevaSlug={seva.slug}
                  amount={seva.defaultAmount}
                  className="w-full"
                >
                  {t("card_cta", { amount: seva.defaultAmount })}
                </DonateButton>
              </div>
            </article>
          );
        })}

        {/* Third in the row, and the width of it: the deity sevas are a list
            of eleven priced offerings rather than one ask, so the card spans
            both columns underneath the other two. */}
        <VigrahaSevaCard />
      </div>

      <p className="mt-6 border-t border-primary/15 pt-5 text-sm leading-relaxed text-muted-foreground">
        {t("note")}
      </p>
    </section>
  );
}
