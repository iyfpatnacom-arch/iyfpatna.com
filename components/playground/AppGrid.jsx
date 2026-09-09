"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  CalendarDays,
  CircleUser,
  Clock,
  GraduationCap,
  HandHeart,
  Home,
  Images,
  Info,
  PartyPopper,
  Route,
  Search,
  X,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { TOOLS } from "@/lib/playground/tools";
import { ToolIcon } from "@/components/playground/ToolShell";
import { haptic } from "@/lib/playground/haptics";
import { WhatsappIcon } from "@/components/site/WhatsappIcon";
import { DONATE_NAV, MAIN_NAV, WHATSAPP_GROUP_URL } from "@/lib/site-config";
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
 *
 * `data-app-drawer` is the marker globals.css reads to fold the site footer
 * and the floating WhatsApp button away underneath this screen. A drawer with
 * a footer under it is a web page with icons on it: the footer's first heading
 * was landing inside the first viewport, and the button floated over the last
 * row of icons. The condition is the drawer's presence in the markup rather
 * than a route test, so nothing has to run before the page paints.
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
 *
 * Two names each. `shortKey` is what goes under the icon, because a launcher
 * label is a word, not a sentence: "Gita for what you're feeling" wrapped to
 * three lines and dragged its whole row down with it. The full name is still
 * what the tool's own page is titled, and it stays here so that searching
 * "feeling" or "vaishnava" — words the short label drops — still finds the
 * icon.
 */
const APPS = [
  ...TOOLS.map((tool) => ({
    key: tool.key,
    href: tool.href,
    icon: tool.icon,
    shortKey: `tools.${tool.key}.short`,
    nameKey: `tools.${tool.key}.name`,
    taglineKey: `tools.${tool.key}.tagline`,
  })),
  {
    key: "sarathi",
    href: null,
    icon: "Sparkles",
    shortKey: "sarathi.short",
    nameKey: "sarathi.name",
    taglineKey: "sarathi.tagline",
  },
];

/**
 * The rest of the site, as a second shelf of icons.
 *
 * "The rest" literally: the dock along the bottom of this screen already holds
 * Home, Programs, Playground, Festivals and Profile, and an icon that goes
 * where the button two centimetres below it goes is an icon nobody needs. What
 * is left is everything a phone could otherwise only reach through the
 * hamburger in the band — About, Courses, Schedule, Gallery, the yatra — plus
 * the two things that are acts rather than pages.
 *
 * WhatsApp is here because of what this screen does to the floating green
 * button: the drawer hides it (see globals.css), and the group invite is the
 * single most-used link on the site. It comes back as an app, which is nearer
 * to how it is actually used anyway.
 *
 * Tonal containers like the tools above, in hues the tools do not use, so the
 * shelf reads as part of the same launcher rather than as a footer of links.
 * Same disc size too — what separates the two shelves is the card each sits in
 * and the weight of the label, not the size of the icon.
 *
 * `MAIN_NAV` is the source, so the yatra appears and disappears with
 * `YATRA_ENABLED` exactly as it does in the header and the drawer, and a route
 * added there arrives here without anyone remembering to.
 */
const DOCK_KEYS = ["home", "programs", "playground", "festivals", "profile"];

const PLACE_ICONS = {
  about: Info,
  courses: GraduationCap,
  schedule: Clock,
  gallery: Images,
  // The same glyph the home page's pillars give the yatra.
  yatra: Route,
  donate: HandHeart,
};

const PLACE_TINT = {
  about: "bg-sky-200 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
  courses: "bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  schedule: "bg-cyan-200 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  gallery: "bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  yatra: "bg-emerald-200 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  // Donate keeps the site's own gold rather than borrowing a hue: it is the
  // one entry here the whole site is pointed at.
  donate: "bg-primary/15 text-primary",
  whatsapp: "bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200",
};

/**
 * What a route added to `MAIN_NAV` later gets until someone gives it a hue and
 * a glyph of its own — a filled disc and a generic mark, rather than a label
 * floating over no icon at all.
 */
const PLACE_FALLBACK = { Icon: Info, tint: "bg-muted text-muted-foreground" };

const PLACES = [
  ...MAIN_NAV.filter((item) => !DOCK_KEYS.includes(item.key)),
  DONATE_NAV,
].map((item) => ({
  key: item.key,
  href: item.href,
  external: item.external ?? false,
  Icon: PLACE_ICONS[item.key] ?? PLACE_FALLBACK.Icon,
  tint: PLACE_TINT[item.key] ?? PLACE_FALLBACK.tint,
}));

/** Case-insensitive enough for eight names across two scripts. */
function normalise(value) {
  return value.toLocaleLowerCase().replace(/\s+/g, " ").trim();
}

export function AppGrid({ className, whatsappUrl = WHATSAPP_GROUP_URL }) {
  const t = useTranslations("playground");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");
  const [query, setQuery] = useState("");

  // Names and taglines both, so "offline", "rounds" or "एकादशी" find something
  // even though only the name is on screen. Eight items need no memo for the
  // filtering itself; it is there so the translated strings are not rebuilt on
  // every keystroke.
  const results = useMemo(() => {
    const needle = normalise(query);
    if (!needle) return APPS;
    return APPS.filter((app) =>
      normalise(
        `${t(app.shortKey)} ${t(app.nameKey)} ${t(app.taglineKey)}`
      ).includes(needle)
    );
  }, [query, t]);

  // The field says "Search", not "Search tools", because it now reaches the
  // shelf below as well: typing "gallery" and being told nothing matches while
  // a Gallery icon sits two rows down would be a lie the layout tells itself.
  //
  // WhatsApp is assembled here rather than in `PLACES` because it is the one
  // entry whose destination is not a constant — the invite is editable at
  // /admin/settings and arrives as a prop — and the one whose glyph is not a
  // lucide icon. Its label is the word alone; the full "join the group" line
  // is the accessible name, the same string the floating button uses.
  const places = useMemo(() => {
    const all = [
      ...PLACES.map((place) => ({
        ...place,
        label: tn(place.key),
        name: tn(place.key),
      })),
      {
        key: "whatsapp",
        href: whatsappUrl,
        external: true,
        Icon: WhatsappIcon,
        tint: PLACE_TINT.whatsapp,
        label: t("whatsapp"),
        name: tc("whatsapp_cta"),
      },
    ];

    const needle = normalise(query);
    if (!needle) return all;
    return all.filter((place) =>
      normalise(`${place.label} ${place.name}`).includes(needle)
    );
  }, [query, t, tn, tc, whatsappUrl]);

  return (
    <section data-app-drawer className={cn("relative overflow-hidden", className)}>
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

      {/* Tall enough to reach the dock on a phone, and no taller: the two
          blooms are clipped by this section's own `overflow-hidden`, so a box
          that ends where the last icon does cuts the blur off mid-fade and
          leaves a visible horizontal edge across the screen. `100svh` less the
          band, the sticky header and the dock's own clearance — the small
          viewport height, so the screen still does not scroll with the URL bar
          expanded. */}
      <div className="relative flex min-h-[calc(100svh-14rem)] flex-col px-4 pt-5 pb-6">
        {/* The heading is read, not shown. A launcher has no title — the tab
            the visitor just pressed is labelled Playground and the icons say
            the rest — but the page still owes a screen reader and a search
            engine one. The visible copy that used to sit here (title, its
            gloss in the other script, and the privacy footnote) filled the
            top third of the screen and pushed the second row of icons under
            the fold, which is the one thing this layout exists to prevent.
            The privacy footnote still runs on the card grid above `sm`, and
            every tool page carries the shorter version of the same promise —
            works offline, no account needed — in its own header. */}
        <h1 className="sr-only">{t("title")}</h1>

        {results.length === 0 && places.length === 0 && (
          <p className="mt-12 text-center text-sm text-muted-foreground">
            {t("search_empty", { query: query.trim() })}
          </p>
        )}

        {results.length > 0 && (
          <Shelf label={t("shelf_tools")}>
            {results.map((app) => (
              <li key={app.key}>
                <Tile
                  href={app.href}
                  tint={APP_TINT[app.key] ?? APP_TINT.sadhana}
                  glyph={<ToolIcon name={app.icon} className="size-5" />}
                  label={t(app.shortKey)}
                  name={t(app.nameKey)}
                  soon={app.href ? null : t("badge_soon")}
                />
              </li>
            ))}
          </Shelf>
        )}

        {places.length > 0 && (
          <Shelf label={t("places")} className="mt-4">
            {places.map((place) => (
              <li key={place.key}>
                <Tile
                  href={place.href}
                  external={place.external}
                  externalHint={tn("external_hint")}
                  muted
                  tint={place.tint}
                  glyph={<place.Icon className="size-5" aria-hidden="true" />}
                  label={place.label}
                  name={place.name === place.label ? undefined : place.name}
                />
              </li>
            ))}
          </Shelf>
        )}

        {/* The field goes last, and low. It is the one control on this screen
            rather than one of forty destinations, and the bottom third is the
            part of a phone a thumb reaches without the hand moving — which is
            where every launcher that ships with a search bar puts it.

            `mt-auto` floors it on a screen the icons do not fill, and the
            sticky offset keeps it above the dock on one they overflow, so it
            is in the same place either way. The offset is the dock's own
            clearance, the figure the layout uses to pad the page. */}
        <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] mt-auto pt-8">
          <SearchField query={query} onQuery={setQuery} />
        </div>
      </div>
    </section>
  );
}

/**
 * A group of apps on its own card.
 *
 * The two shelves used to be separated by a hairline, which said "these are
 * different" without saying what either one was. A pale card each says both,
 * and it is the arrangement a launcher's folders and a phone's settings screen
 * already use, so nobody has to be taught it. `bg-card` is white on the light
 * theme and an 8% white wash on the dark one, so the same class reads as a
 * lifted surface over the wallpaper in either.
 *
 * Four columns, and `gap-x-2` rather than anything wider: at 320px — the
 * narrowest phone still in use — the card's own padding leaves 60px a column
 * for a 48px icon, and a wider gap starts truncating two-word labels.
 */
function Shelf({ label, className, children }) {
  return (
    <section
      className={cn(
        "mt-6 rounded-3xl border border-border/50 bg-card/70 p-4 shadow-sm backdrop-blur-sm",
        className
      )}
    >
      <h2 className="text-[10px] font-semibold tracking-wider text-muted-foreground/80 uppercase">
        {label}
      </h2>
      <ul className="mt-3 grid grid-cols-4 items-start gap-x-2 gap-y-5">
        {children}
      </ul>
    </section>
  );
}

/**
 * One tile: an icon over a label, and usually a link.
 *
 * A 48px circle with the glyph at 20px — a Material icon fills about half its
 * diameter, noticeably more of the shape than an iOS glyph does. No ring and
 * no drop shadow: the circle is the whole icon.
 *
 * One size for both shelves. The tools were 64px while the site destinations
 * were 48px, and the larger disc turned a compact grid into something closer
 * to a page of buttons; at one size the two shelves are told apart by the card
 * each sits in, which is a quieter signal and a truer one — they are two
 * groups, not two ranks. `muted` is the only difference left, and it only
 * touches the label.
 *
 * One line for the label, and a short one — every row of icons then sits on
 * the same baseline, which is most of what separates a launcher from a list
 * of links. Where a `name` is given it is longer than the label, and it
 * becomes the link's accessible name, so a screen reader hears "Gita for what
 * you're feeling" rather than "Feelings".
 *
 * "Soon" rides on the icon rather than under the label, for the same reason:
 * a third line beneath one tile in a row of four makes that row taller than
 * its neighbour.
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
function Tile({
  href,
  external = false,
  externalHint,
  muted = false,
  tint,
  glyph,
  label,
  name,
  soon,
}) {
  const inner = (
    <>
      <span
        className={cn(
          "relative grid size-12 place-items-center rounded-full",
          tint
        )}
      >
        {glyph}
        {/* The state layer. Transparent at rest, so it costs nothing until a
            finger is down, and inside the circle so it is masked to the icon
            rather than to the whole tap target. */}
        <span
          className="pointer-events-none absolute inset-0 rounded-full bg-current/0 transition-colors duration-100 group-active:bg-current/12"
          aria-hidden="true"
        />

        {soon && (
          <span className="absolute -bottom-1.5 rounded-full border border-background bg-muted px-1 py-px text-[7px] font-semibold tracking-wide text-muted-foreground uppercase">
            {soon}
          </span>
        )}
      </span>

      <span
        className={cn(
          "mt-1.5 line-clamp-2 w-full text-center text-[10px] leading-tight font-medium",
          muted ? "text-muted-foreground" : "text-foreground"
        )}
      >
        {label}
      </span>
    </>
  );

  // No link, no button and no state layer for Sarathi: it is a label on the
  // grid, and anything that answers a press is a promise it cannot keep.
  if (!href) {
    return (
      <span className="flex flex-col items-center" title={name}>
        {inner}
      </span>
    );
  }

  const shared = {
    "aria-label": name,
    onClick: () => haptic("bead"),
    className: "group flex flex-col items-center",
    style: { WebkitTapHighlightColor: "transparent", touchAction: "manipulation" },
  };

  // The yatra lives on its own host: a plain anchor, never the locale-aware
  // Link, which would prefix the hostname with /en or /hi.
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...shared}>
        {inner}
        {/* Nothing on the tile can show a new-tab arrow without crowding the
            glyph, so the warning goes where it costs no pixels. */}
        <span className="sr-only"> ({externalHint})</span>
      </a>
    );
  }

  return (
    <Link href={href} {...shared}>
      {inner}
    </Link>
  );
}

/**
 * The drawer's search field.
 *
 * A pill on a filled surface — the Material search bar, not the rounded
 * rectangle iOS puts above a list. 48px rather than Material's own 56dp: every
 * icon on this screen is 48px, and a field taller than the things it searches
 * reads as the subject of the screen instead of a control on it.
 *
 * Elevated and blurred because it is pinned low over the grid rather than
 * sitting above it: `--muted` is a translucent wash in the dark theme, so an
 * icon would otherwise show straight through the field as it scrolled past.
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
        className="h-12 w-full rounded-full border border-border/50 bg-muted pr-12 pl-11 text-base text-foreground shadow-md backdrop-blur-md placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none"
      />
      {query && (
        <button
          type="button"
          onClick={() => onQuery("")}
          aria-label={t("search_clear")}
          className="absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors active:bg-foreground/10"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
