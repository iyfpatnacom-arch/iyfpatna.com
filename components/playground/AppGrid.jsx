"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { TOOLS } from "@/lib/playground/tools";
import { ToolIcon } from "@/components/playground/ToolShell";
import { haptic } from "@/lib/playground/haptics";
import { cn } from "@/lib/utils";

/**
 * The playground as an Android app drawer.
 *
 * On a laptop the seven tools are cards with a tagline you can read at a
 * glance; on a phone that same grid is seven tall panels you scroll past, and
 * nobody scrolls past a panel to reach a tool they did not know existed. So
 * the phone gets the vocabulary it already knows: a round icon, a name under
 * it, four to a row, all of them above the fold. That is the whole point of
 * this screen — someone opening the dock's Playground tab sees all eight
 * things at once and taps one.
 *
 * Material rather than the iOS home screen, specifically: a circular mask, one
 * flat fill with no gradient and no gloss, a glyph at half the diameter, a
 * state layer instead of a scale on press, and a pill search bar. Nearly
 * everyone who opens this is on an Android phone, and the drawer they left to
 * get here is the one this is imitating.
 *
 * Rendered only under `sm`; the page keeps its card grid for wider screens
 * rather than bending one layout to serve both.
 */

/**
 * Icon fills, one per tool.
 *
 * An app drawer reads as a drawer because no two icons are the same colour —
 * colour is how a thumb finds the japa counter without reading. The site's two
 * accents cannot do that across eight icons, so these run a wider spread, kept
 * inside the warm-gold-to-violet family the brand already lives in rather than
 * reaching for a full rainbow.
 *
 * One flat tone each, not a gradient: a Material icon is a solid mask, and a
 * fill that lightens toward the top is exactly what made these read as iOS
 * tiles.
 *
 * Tonal containers rather than saturated fills — a pale disc with the glyph in
 * a deep tone of the same hue, which is the Material You pairing and the
 * quieter half of it. Eight full-strength discs on a page of body text shout
 * over everything around them; muted, the colour still does the only job it
 * has here, which is to let a thumb find the japa counter without reading. The
 * hue is what is being recognised, not the intensity.
 *
 * Each hue is written twice because a tonal container cannot be one colour in
 * both themes: a 200 tint is invisible on the near-black ink and a 900 is a
 * hole in the near-white paper. The hue itself never moves, so nothing has to
 * be learned twice — amber is amber in either theme, lighter or darker.
 *
 * Sarathi is the exception, an outlined container with no fill: in Material's
 * own hierarchy that is the lowest emphasis there is, which is the right
 * weight for the one icon that does not open anything.
 */
const APP_TINT = {
  sadhana: "bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  japa: "bg-orange-200 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  gita_daily: "bg-violet-200 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  feelings: "bg-rose-200 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  kirtan: "bg-fuchsia-200 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-200",
  calendar: "bg-indigo-200 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  checkin: "bg-teal-200 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  sarathi:
    "border border-dashed border-brand-purple/45 bg-brand-purple/8 text-brand-purple",
};

/**
 * Sarathi sits last here, not first.
 *
 * It leads the desktop grid because there it is a banner that explains itself.
 * Reduced to an icon among identical icons it can only be a tap that does
 * nothing, so it goes at the end of the second row, in a tonal container and
 * labelled, with no link — see the note in `SarathiCard` on why nothing about
 * it should invite a press.
 */
const APPS = [
  ...TOOLS.map((tool) => ({
    key: tool.key,
    href: tool.href,
    icon: tool.icon,
    nameKey: `tools.${tool.key}.name`,
    taglineKey: `tools.${tool.key}.tagline`,
  })),
  {
    key: "sarathi",
    href: null,
    icon: "Sparkles",
    nameKey: "sarathi.name",
    taglineKey: "sarathi.tagline",
  },
];

/** Case-insensitive enough for eight names across two scripts. */
function normalise(value) {
  return value.toLocaleLowerCase().replace(/\s+/g, " ").trim();
}

export function AppGrid({ className }) {
  const t = useTranslations("playground");
  const [query, setQuery] = useState("");

  // Names and taglines both, so "offline", "rounds" or "एकादशी" find something
  // even though only the name is on screen. Eight items need no memo for the
  // filtering itself; it is there so the translated strings are not rebuilt on
  // every keystroke.
  const results = useMemo(() => {
    const needle = normalise(query);
    if (!needle) return APPS;
    return APPS.filter((app) =>
      normalise(`${t(app.nameKey)} ${t(app.taglineKey)}`).includes(needle)
    );
  }, [query, t]);

  return (
    <section className={cn("relative overflow-hidden", className)}>
      {/* Wallpaper. Two static blooms behind the grid, which is most of what
          makes a field of icons read as a home screen rather than a toolbar.
          Both are `pointer-events-none` and neither animates, so this costs one
          composited layer for the section and nothing per icon. */}
      <span
        className="pointer-events-none absolute -top-24 -left-16 size-64 rounded-full bg-primary/15 blur-3xl dark:bg-primary/20"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute top-40 -right-20 size-56 rounded-full bg-brand-purple/15 blur-3xl dark:bg-brand-purple/20"
        aria-hidden="true"
      />

      <div className="relative px-4 pt-8 pb-10">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t("title")}
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">{t("subtitle")}</p>

        <SearchField query={query} onQuery={setQuery} />

        {results.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            {t("search_empty", { query: query.trim() })}
            <span className="mt-1 block text-xs text-muted-foreground/80">
              {t("search_empty_hint")}
            </span>
          </p>
        ) : (
          // Four columns, and `gap-x-2` rather than anything wider: at 320px —
          // the narrowest phone still in use — that leaves 66px a column for a
          // 64px icon. A 12px gap overflows it by a pixel and the whole page
          // scrolls sideways.
          <ul className="mt-6 grid grid-cols-4 gap-x-2 gap-y-6">
            {results.map((app) => (
              <li key={app.key}>
                <AppIcon app={app} label={t(app.nameKey)} soon={t("badge_soon")} />
              </li>
            ))}
          </ul>
        )}

        <p className="mt-10 border-l-2 border-primary/40 pl-3 text-[12px] leading-relaxed text-muted-foreground">
          {t("footnote")}
        </p>
      </div>
    </section>
  );
}

/**
 * One app.
 *
 * A 64px circle — the mask the Pixel launcher applies to every adaptive icon
 * it is handed — with the glyph at 32px, because a Material icon fills about
 * half its diameter, noticeably more of the shape than an iOS glyph does. No
 * ring and no drop shadow: the circle is the whole icon.
 *
 * The label runs to two lines because "Gita for what you're feeling" cut to
 * one is not a name.
 *
 * Press feedback is a state layer on Material's own 100ms, rather than the
 * scale-down an iPhone would do — the flat stand-in for a ripple, which cannot
 * be had without JS tracking where the finger landed. It tints with
 * `bg-current`, the glyph's own colour: Material draws the state layer in the
 * on-container tone, and a fixed white would be invisible on the pale side of
 * these containers. The bead-length buzz goes with it, so a press is felt as
 * well as seen. There is no hover state; there is no hover on the device this
 * layout exists for.
 */
function AppIcon({ app, label, soon }) {
  const tile = (
    <>
      <span
        className={cn(
          "relative grid size-16 place-items-center rounded-full",
          APP_TINT[app.key] ?? APP_TINT.sadhana
        )}
      >
        <ToolIcon name={app.icon} className="size-8" />
        {/* The state layer. Transparent at rest, so it costs nothing until a
            finger is down, and inside the circle so it is masked to the icon
            rather than to the whole tap target. */}
        <span
          className="pointer-events-none absolute inset-0 rounded-full bg-current/0 transition-colors duration-100 group-active:bg-current/12"
          aria-hidden="true"
        />
      </span>

      <span className="mt-1.5 line-clamp-2 text-center text-[11px] leading-tight font-medium text-foreground">
        {label}
      </span>

      {!app.href && (
        <span className="mt-1 rounded-full bg-muted px-1.5 py-px text-[9px] font-semibold tracking-wide text-muted-foreground uppercase">
          {soon}
        </span>
      )}
    </>
  );

  // No link, no button and no state layer for Sarathi: it is a label on the
  // grid, and anything that answers a press is a promise it cannot keep.
  if (!app.href) {
    return <span className="flex flex-col items-center">{tile}</span>;
  }

  return (
    <Link
      href={app.href}
      onClick={() => haptic("bead")}
      className="group flex flex-col items-center"
      style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
    >
      {tile}
    </Link>
  );
}

/**
 * The drawer's search field.
 *
 * A 56dp pill on a filled surface with no outline — the Material search bar,
 * not the rounded rectangle iOS puts above a list. One step of elevation, so
 * it lifts off the wallpaper behind it.
 */
function SearchField({ query, onQuery }) {
  const t = useTranslations("playground");

  return (
    <div className="relative mt-5">
      <Search
        className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      {/* `text-base` is load-bearing rather than a size choice: iOS Safari
          zooms the page in when a focused field's text is under 16px and does
          not zoom back out — this layout is drawn for Android, but the iPhones
          in the minority still have to use it. A plain `text` input rather than
          `search`, too, because the native clear button lands under the one
          below. */}
      <input
        type="text"
        value={query}
        onChange={(event) => onQuery(event.target.value)}
        aria-label={t("search_label")}
        placeholder={t("search_placeholder")}
        enterKeyHint="search"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className="h-14 w-full rounded-full border border-transparent bg-muted pr-12 pl-11 text-base text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none"
      />
      {query && (
        <button
          type="button"
          onClick={() => onQuery("")}
          aria-label={t("search_clear")}
          className="absolute top-1/2 right-2 grid size-10 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors active:bg-foreground/10"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
