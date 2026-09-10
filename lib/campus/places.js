/**
 * The places on the ISKCON Patna campus, and where they are.
 *
 * Two acres, a 108-foot temple and a dozen buildings with no street frontage
 * between them. Someone walking through the gate for the first time cannot see
 * that there is a restaurant, or where prasadam is served, or which door leads
 * to the altar — and there is no address to give them, because "ISKCON Patna"
 * is one pin on Google Maps for the whole plot.
 *
 * So each place carries a real coordinate, and everything else is derived from
 * it: the DIGIPIN, the maps link, and (in the campus map) the marker's position
 * on the drawing. Derived, never stored — see `withDigipin` below.
 *
 * What is deliberately *not* here:
 *
 *  - **Names and descriptions.** Those are copy, and copy lives in
 *    `messages/{en,hi}.json` under `campus.places.<key>`, the same split
 *    `DAILY_SCHEDULE` and `SEVA_LIST` already use in `lib/site-config.js`. A
 *    Hindi name typed into this file is a Hindi name that drifts.
 *  - **The DIGIPIN.** Storing it would let it disagree with the coordinate it
 *    came from, which is the one failure this whole feature exists to prevent.
 *  - **x/y for the map.** Same reason. The projection decides.
 *
 * ⚠️ Every coordinate below is currently APPROXIMATE — plausible offsets around
 * the temple's verified centre (25.606902, 85.133127), laid out to the right
 * rough shape so the feature is usable today. Each is flagged `approximate:
 * true`, and the UI says so wherever a code is shown. To make one real: open
 * Google Maps satellite, right-click the actual spot, click the coordinates to
 * copy them, paste them here, and drop the flag. Nothing else needs editing.
 */

import { encodeDigipin } from "./digipin.js";

/**
 * The six kinds of place, in the order a first-time visitor needs them.
 *
 * `entry` first is not alphabetical stubbornness: someone reading this list is
 * usually standing at the gate, and the first question is always "where do I
 * leave my shoes and where do I go in".
 */
export const CATEGORIES = ["entry", "worship", "food", "stay", "service", "facility"];

/** Ground floor. Named because `floor === 0` reads as "falsy" at a glance. */
export const GROUND_FLOOR = 0;

/**
 * One record per place.
 *
 * `key` does double duty as the URL slug and as the message key, so a place is
 * one word everywhere — `/campus/govindas` is `campus.places.govindas`. They
 * are kept identical on purpose; two ids for one thing is how a place ends up
 * on the map with the wrong name.
 *
 * `icon` is a lucide-react export name rather than the component, so this
 * module stays importable from a server component without dragging the icon set
 * into the payload — the convention `lib/playground/tools.js` already sets.
 *
 * `priority` is for the map: 3 is labelled at every zoom, 1 only up close. The
 * four things a visitor arrives looking for are 3.
 */
export const PLACES = [
  {
    key: "main-gate",
    category: "entry",
    icon: "DoorOpen",
    lat: 25.6064868,
    lon: 85.1331270,
    floor: GROUND_FLOOR,
    priority: 3,
    hours: null,
    approximate: true,
  },
  {
    key: "parking",
    category: "facility",
    icon: "CircleParking",
    lat: 25.6064146,
    lon: 85.1328682,
    floor: GROUND_FLOOR,
    priority: 3,
    hours: null,
    approximate: true,
  },
  {
    key: "reception",
    category: "service",
    icon: "Info",
    lat: 25.6066041,
    lon: 85.1332166,
    floor: GROUND_FLOOR,
    priority: 2,
    hours: [{ open: "07:00", close: "20:00" }],
    approximate: true,
  },
  {
    key: "shoe-stand",
    category: "facility",
    icon: "Footprints",
    lat: 25.6067305,
    lon: 85.1330175,
    floor: GROUND_FLOOR,
    priority: 2,
    hours: null,
    approximate: true,
  },
  {
    key: "donation-counter",
    category: "service",
    icon: "HandCoins",
    lat: 25.6068027,
    lon: 85.1331867,
    floor: GROUND_FLOOR,
    priority: 1,
    hours: [{ open: "08:00", close: "20:00" }],
    approximate: true,
  },
  {
    key: "temple-hall",
    category: "worship",
    icon: "Landmark",
    lat: 25.6069020,
    lon: 85.1331270,
    floor: GROUND_FLOOR,
    priority: 3,
    hours: [{ open: "04:30", close: "20:00" }],
    approximate: true,
  },
  {
    // Directly above the hall, so it shares the hall's coordinate — and
    // therefore its DIGIPIN, exactly. That is not a mistake in the data; it is
    // what DIGIPIN is, and the place page says so rather than hiding it.
    key: "deity-darshan",
    category: "worship",
    icon: "Flame",
    lat: 25.6069020,
    lon: 85.1331270,
    floor: 1,
    priority: 3,
    hours: [
      { open: "07:00", close: "12:00" },
      { open: "16:00", close: "20:00" },
    ],
    approximate: true,
  },
  {
    key: "iyf-office",
    category: "service",
    icon: "Users",
    lat: 25.6069201,
    lon: 85.1332763,
    floor: 1,
    priority: 2,
    hours: [{ open: "10:00", close: "19:00" }],
    approximate: true,
  },
  {
    key: "book-stall",
    category: "service",
    icon: "BookOpen",
    lat: 25.6067847,
    lon: 85.1332763,
    floor: GROUND_FLOOR,
    priority: 2,
    hours: [{ open: "08:00", close: "20:00" }],
    approximate: true,
  },
  {
    key: "prasadam-store",
    category: "food",
    icon: "ShoppingBag",
    lat: 25.6068659,
    lon: 85.1333858,
    floor: GROUND_FLOOR,
    priority: 3,
    hours: [{ open: "09:00", close: "20:00" }],
    approximate: true,
  },
  {
    key: "govindas",
    category: "food",
    icon: "UtensilsCrossed",
    lat: 25.6070013,
    lon: 85.1334356,
    floor: GROUND_FLOOR,
    priority: 3,
    hours: [
      { open: "11:30", close: "15:00" },
      { open: "19:00", close: "21:30" },
    ],
    approximate: true,
  },
  {
    key: "washrooms",
    category: "facility",
    icon: "Bath",
    lat: 25.6067124,
    lon: 85.1333659,
    floor: GROUND_FLOOR,
    priority: 1,
    hours: null,
    approximate: true,
  },
  {
    key: "guest-house",
    category: "stay",
    icon: "BedDouble",
    lat: 25.6071638,
    lon: 85.1334356,
    floor: GROUND_FLOOR,
    priority: 2,
    hours: null,
    approximate: true,
  },
  {
    key: "monks-ashram",
    category: "stay",
    icon: "Users",
    lat: 25.6072721,
    lon: 85.1331668,
    floor: GROUND_FLOOR,
    priority: 1,
    hours: null,
    approximate: true,
  },
  {
    key: "gaushala",
    category: "service",
    icon: "Milk",
    lat: 25.6072089,
    lon: 85.1328582,
    floor: GROUND_FLOOR,
    priority: 2,
    hours: [{ open: "06:00", close: "18:00" }],
    approximate: true,
  },
];

/**
 * The middle of the campus — the temple, and the point the whole map hangs off.
 *
 * Falls back to the verified temple coordinate if `temple-hall` is ever renamed
 * out of the list, so nothing downstream ends up projecting from `undefined`.
 */
export const CAMPUS_CENTRE = (() => {
  const temple = PLACES.find((place) => place.key === "temple-hall");
  return { lat: temple?.lat ?? 25.606902, lon: temple?.lon ?? 85.133127 };
})();

/** Every floor that has something on it, lowest first. */
export const FLOORS = [...new Set(PLACES.map((place) => place.floor))].sort((a, b) => a - b);

/** True while any coordinate is still a placeholder, so the UI can say so once. */
export const HAS_APPROXIMATE_PLACES = PLACES.some((place) => place.approximate);

/**
 * A place with its DIGIPIN attached.
 *
 * Computed here rather than stored in the records above, so the code and the
 * coordinate cannot drift apart — correct a latitude and the code corrects
 * itself. Memoised because a list of fifteen places re-encoding on every render
 * is fifteen ten-iteration loops for no reason, and the answer never changes.
 */
const digipinCache = new Map();

export function withDigipin(place) {
  if (!place) return null;
  if (!digipinCache.has(place.key)) {
    digipinCache.set(place.key, encodeDigipin(place.lat, place.lon));
  }
  return { ...place, digipin: digipinCache.get(place.key) };
}

/** Every place, each with its code. The list views want this. */
export function allPlacesWithDigipin() {
  return PLACES.map(withDigipin);
}

/** One place by its slug, or `null` — the shape `notFound()` wants to test. */
export function placeByKey(key) {
  return PLACES.find((place) => place.key === key) ?? null;
}

/** The places on one floor. */
export function placesOnFloor(floor) {
  return PLACES.filter((place) => place.floor === floor);
}

/**
 * Places grouped by category, in `CATEGORIES` order, skipping empty groups.
 *
 * Returned as an array of pairs rather than an object because the order is the
 * point, and object key order is a promise nobody should have to rely on.
 */
export function placesByCategory(places = PLACES) {
  return CATEGORIES.map((category) => [
    category,
    places.filter((place) => place.category === category),
  ]).filter(([, group]) => group.length > 0);
}

/**
 * Every place, sorted by how far it is from a coordinate.
 *
 * Flat-earth trigonometry: over a two-acre campus the error against a proper
 * great-circle formula is well under a centimetre, and the places themselves
 * are only located to a few metres, so anything more elaborate would be
 * arithmetic theatre.
 */
function placesByDistanceFrom(lat, lon) {
  const metresPerDegreeLat = 110_782;
  const metresPerDegreeLon = 111_320 * Math.cos((lat * Math.PI) / 180);

  return PLACES.map((place) => ({
    place: withDigipin(place),
    metres: Math.hypot(
      (place.lat - lat) * metresPerDegreeLat,
      (place.lon - lon) * metresPerDegreeLon
    ),
  })).sort((a, b) => a.metres - b.metres);
}

/**
 * The place nearest a coordinate, with the distance in metres.
 *
 * Used by the DIGIPIN decoder to answer "is this code somewhere I know?", so
 * it returns `null` when nothing is within `maxMetres` — "your nearest campus
 * place is 340km away" is not an answer, it is a non-sequitur.
 */
export function nearestPlace(lat, lon, { maxMetres = 250 } = {}) {
  const [best] = placesByDistanceFrom(lat, lon);
  return best && best.metres <= maxMetres ? best : null;
}

/**
 * What else is within a short walk of a place.
 *
 * Genuinely by distance, not by category. The first version of this grouped by
 * category instead, which put the gaushala under "nearby" for the book stall at
 * the other end of the campus and left out the prasadam store six metres away —
 * a section labelled "Nearby" has to mean it, and on a plot this size proximity
 * is the only relationship a visitor standing there can act on.
 */
export function placesNear(place, { limit = 3 } = {}) {
  return placesByDistanceFrom(place.lat, place.lon)
    .filter((entry) => entry.place.key !== place.key)
    .slice(0, limit);
}

/**
 * A link that opens the point in whatever maps app the visitor has.
 *
 * The `?q=lat,lon` form rather than a Google-specific place URL: Android hands
 * it to Maps, iOS offers Apple Maps, and a desktop browser opens the web app.
 * Nobody should have to install anything to find the gaushala.
 */
export function mapsUrlFor({ lat, lon }) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
}
