import {
  Bath,
  BedDouble,
  BookOpen,
  CircleParking,
  DoorOpen,
  Flame,
  Footprints,
  HandCoins,
  Info,
  Landmark,
  MapPin,
  Milk,
  ShoppingBag,
  UtensilsCrossed,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Icon names in `lib/campus/places.js` resolved to components.
 *
 * The same indirection `ToolShell` uses for the playground: the data module
 * names an icon as a string so it stays importable from a server component
 * without pulling `lucide-react` in behind it, and exactly one place — this one
 * — knows how to turn that string into something React can render.
 *
 * A place whose `icon` is missing or misspelt gets a generic pin rather than a
 * crash. A wrong icon is a small cosmetic bug; a blank page over a typo in a
 * data file is not a trade worth making.
 */
const PLACE_ICONS = {
  Bath,
  BedDouble,
  BookOpen,
  CircleParking,
  DoorOpen,
  Flame,
  Footprints,
  HandCoins,
  Info,
  Landmark,
  Milk,
  ShoppingBag,
  UtensilsCrossed,
  Users,
};

export function PlaceIcon({ name, className }) {
  const Icon = PLACE_ICONS[name] ?? MapPin;
  return <Icon className={className} aria-hidden="true" />;
}

/**
 * Which of the two brand accents each category wears.
 *
 * Two, not six. The site's palette is gold and purple and nothing else, and a
 * six-colour category scheme invented here would read as a different product
 * bolted onto the side. The split that survives is the one a visitor actually
 * makes: purple for the things you came for, gold for the things that get you
 * to them.
 */
const CATEGORY_ACCENT = {
  worship: "purple",
  food: "purple",
  stay: "purple",
  entry: "gold",
  service: "gold",
  facility: "gold",
};

export function accentFor(category) {
  return CATEGORY_ACCENT[category] ?? "gold";
}

/**
 * A place's icon on its accent tile — the campus counterpart of `ToolChip`.
 *
 * Kept here rather than imported from the playground because the two lists
 * have nothing to do with each other, and a shared chip would mean every new
 * campus category had to be added to the playground's icon map to render.
 */
export function PlaceChip({ icon, category, size = "md" }) {
  const big = size === "lg";
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-xl",
        big ? "size-11" : "size-9",
        accentFor(category) === "purple"
          ? "bg-brand-purple/10 text-brand-purple"
          : "bg-primary/10 text-primary"
      )}
    >
      <PlaceIcon name={icon} className={big ? "size-5" : "size-4"} />
    </span>
  );
}
