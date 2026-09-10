"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { ChevronRight, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { CATEGORIES } from "@/lib/campus/places";
import { Panel } from "@/components/site/Panel";
import { TabBar } from "@/components/playground/controls";
import { PlaceChip } from "@/components/campus/icons";
import { Hours, floorLabel } from "@/components/campus/Hours";
import { cn } from "@/lib/utils";

const ALL_FLOORS = "all";

/**
 * The campus, as a searchable list grouped by what you came for.
 *
 * This is the whole of the feature's first phase, and it is deliberately a
 * list rather than a picture. A drawn map is coming, but a list is what a
 * screen reader can read, what works at 360px in one hand, what a search box
 * can filter, and — the part that decided it — what is useful on day one,
 * before anyone has traced a single building footprint. When the map arrives
 * this list stays: it becomes the accessible half of it rather than scaffolding
 * to be thrown away.
 *
 * Places arrive already carrying their DIGIPIN, computed on the server from
 * `lib/campus/places.js`. Nothing here encodes anything; there is exactly one
 * path from a coordinate to a code and it is not in a component.
 */
export function CampusExplorer({ places, floors }) {
  const t = useTranslations("campus");
  const [query, setQuery] = useState("");
  const [floor, setFloor] = useState(ALL_FLOORS);

  // The list is fifteen rows, so filtering is instant and this is not load-
  // bearing today. It is here because the map's marker layout will hang off
  // the same filtered set, and that is worth keeping off the input's critical
  // path from the start rather than retrofitting when it starts to stutter.
  const deferredQuery = useDeferredValue(query);

  /**
   * Name and blurb are message keys, so the searchable text has to be built
   * after translation — searching the data module would only ever match the
   * English slug, which is precisely the search a Hindi-first visitor will
   * never type.
   */
  const searchable = useMemo(
    () =>
      places.map((place) => ({
        place,
        haystack: [
          t(`places.${place.key}.name`),
          t(`places.${place.key}.blurb`),
          t(`categories.${place.category}`),
          place.digipin,
        ]
          .join(" ")
          .toLowerCase(),
      })),
    [places, t]
  );

  const visible = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    return searchable
      .filter(({ place }) => floor === ALL_FLOORS || place.floor === floor)
      .filter(({ haystack }) => !needle || haystack.includes(needle))
      .map(({ place }) => place);
  }, [searchable, deferredQuery, floor]);

  const groups = useMemo(
    () =>
      CATEGORIES.map((category) => [
        category,
        visible.filter((place) => place.category === category),
      ]).filter(([, group]) => group.length > 0),
    [visible]
  );

  const floorTabs = [
    { key: ALL_FLOORS, label: t("all_floors") },
    ...floors.map((value) => ({ key: value, label: floorLabel(t, value) })),
  ];

  return (
    <div>
      <div className="flex flex-col gap-3">
        {/* Search first, filters second: someone who knows they want Govinda's
            should never have to think about which floor it is on. */}
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("search_placeholder")}
            aria-label={t("search_label")}
            className="min-h-12 w-full rounded-2xl border border-border bg-card pr-11 pl-10 text-[15px] text-foreground transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label={t("search_clear")}
              className="absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-xl text-muted-foreground transition-colors hover:text-foreground"
              style={{ touchAction: "manipulation" }}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Only worth drawing when there is more than one floor to choose. */}
        {floors.length > 1 && (
          <TabBar tabs={floorTabs} value={floor} onChange={setFloor} />
        )}
      </div>

      {/* One live region for the whole list. A screen-reader user typing into
          the box needs to hear the count change; hearing each row appear would
          be unusable. */}
      <p aria-live="polite" className="mt-4 text-xs text-muted-foreground">
        {t("count", { count: visible.length })}
      </p>

      {groups.length === 0 ? (
        <Panel className="mt-4 p-6 text-center text-sm text-muted-foreground">
          {t("search_empty", { query: query.trim() })}
        </Panel>
      ) : (
        <div className="mt-4 space-y-8">
          {groups.map(([category, group]) => (
            <section key={category}>
              <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                {t(`categories.${category}`)}
              </h2>
              <ul className="mt-3 space-y-2">
                {group.map((place) => (
                  <li key={place.key}>
                    <PlaceRow place={place} showFloor={floor === ALL_FLOORS} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * One place in the list.
 *
 * `min-w-0` on both the grid item and the text column, for the reason the
 * playground's "more tools" strip already documents: a flex child defaults to
 * `min-width: auto`, so its floor is the min-content width of its longest
 * unbroken line — which for a `truncate`d blurb is the entire blurb, and the
 * row grows wider than the phone instead of truncating inside it.
 */
function PlaceRow({ place, showFloor }) {
  const t = useTranslations("campus");

  return (
    <Link href={`/campus/${place.key}`} className="group block">
      <Panel className="flex items-center gap-3 p-3 transition-colors group-hover:border-primary/40 sm:gap-4 sm:p-4">
        <PlaceChip icon={place.icon} category={place.category} />

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-semibold text-foreground">
              {t(`places.${place.key}.name`)}
            </span>
            {showFloor && place.floor !== 0 && (
              <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {floorLabel(t, place.floor)}
              </span>
            )}
          </span>

          <span className="mt-0.5 block truncate text-sm text-muted-foreground">
            {t(`places.${place.key}.blurb`)}
          </span>

          <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="font-mono tracking-wider">{place.digipin}</span>
            <Hours hours={place.hours} />
          </span>
        </span>

        <ChevronRight
          className={cn(
            "size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity",
            "group-hover:opacity-60"
          )}
          aria-hidden="true"
        />
      </Panel>
    </Link>
  );
}
