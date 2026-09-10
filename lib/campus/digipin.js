/**
 * DIGIPIN — India Post's open geocode, ported.
 *
 * DIGIPIN takes the box that contains India (2.5–38.5°N, 63.5–99.5°E), cuts it
 * into a 4×4 grid, picks the cell your point falls in, and repeats ten times.
 * Each cut contributes one symbol, so a location becomes ten characters. At
 * Patna's latitude the tenth cut is down to about 3.8m × 3.4m — small enough to
 * name a doorway rather than a building.
 *
 * That is the whole reason this file exists. "Govinda's, ISKCON Patna" is not
 * an address a stranger can act on; the campus is two acres and most of what is
 * on it has no street frontage. `235M64MM85` is.
 *
 * Ported from the reference implementation published by the Department of Posts
 * (with IIT Hyderabad and NRSC/ISRO) under the Apache License 2.0, at
 * https://github.com/INDIAPOST-gov/digipin. Vendored rather than taken as a
 * dependency because it is ninety lines of arithmetic with no imports, and this
 * project already keeps its static domain logic in plain modules under `lib/`.
 *
 * Two deliberate departures from the reference:
 *
 *  - Its encode loop contains `if (level === 3 || level === 6) digiPin += ""`,
 *    a no-op left behind when the hyphenated `XXX-XXX-XXXX` display format was
 *    withdrawn, plus an unused `str` local. Both are dropped; the output is
 *    identical, and `encodeDigipin` is verified against the Department's own
 *    published vector in `scripts/verify-digipin.mjs`.
 *  - Decode returns numbers and the cell's bounds. The reference returns
 *    `toFixed(6)` strings, which is a display decision baked into a maths
 *    function — every caller here wants to do arithmetic with the result, and
 *    the bounds are what lets the map draw the cell rather than a bare point.
 *
 * Pure, dependency-free and safe to import from a server component: nothing
 * here touches `window`, the clock, or the network.
 */

/**
 * The 16 symbols, laid out as they sit on the ground.
 *
 * Row 0 is the *north* row — the grid is written top-down the way a map is
 * drawn, while latitude counts upward, which is why encoding has to flip the
 * row index. Getting that backwards produces codes that look perfectly valid
 * and point at a mirror image of India, so it is worth being loud about.
 *
 * The alphabet omits A, B, D, E, G, H, I, N, O, Q, R, S, U, V, W, X, Y, Z and
 * 0 and 1 — no vowels to spell words with, and no pairs (0/O, 1/I/L) that get
 * misread off a printed sign.
 */
export const DIGIPIN_GRID = [
  ["F", "C", "9", "8"],
  ["J", "3", "2", "7"],
  ["K", "4", "5", "6"],
  ["L", "M", "P", "T"],
];

/** The bounding box DIGIPIN subdivides. Anything outside it has no code. */
export const DIGIPIN_BOUNDS = {
  minLat: 2.5,
  maxLat: 38.5,
  minLon: 63.5,
  maxLon: 99.5,
};

/** How many times the box is quartered — and so the length of a code. */
export const DIGIPIN_LENGTH = 10;

/**
 * Symbol → position, built once at module load.
 *
 * The reference scans all 16 cells for every character of every code. That
 * costs nothing at this size, but a lookup says what it means.
 */
const SYMBOL_POSITION = new Map();
for (let row = 0; row < 4; row += 1) {
  for (let col = 0; col < 4; col += 1) {
    SYMBOL_POSITION.set(DIGIPIN_GRID[row][col], { row, col });
  }
}

/** Every legal symbol, for the validity test and for input hints. */
export const DIGIPIN_ALPHABET = [...SYMBOL_POSITION.keys()].sort().join("");

const VALID_CODE = /^[23456789CFJKLMPT]{10}$/;

/**
 * Tidy up something a human typed or pasted.
 *
 * Accepts hyphens and spaces and throws them away. The current specification
 * (revised 2026-05-04) is an unbroken ten characters, but the withdrawn
 * `235-M64-MM85` form is still printed on older material and in a fair number
 * of blog posts, and refusing to read it back helps nobody. Lowercase is
 * upcased for the same reason.
 */
export function normaliseDigipin(input) {
  return String(input ?? "")
    .toUpperCase()
    .replace(/[\s-]/g, "");
}

/** Whether `input` is a well-formed code. Does not say whether it is *your* code. */
export function isValidDigipin(input) {
  return VALID_CODE.test(normaliseDigipin(input));
}

/**
 * Latitude and longitude to a ten-character DIGIPIN.
 *
 * Throws for a point outside India's box or for anything that is not a finite
 * number, rather than returning a plausible-looking code for a nonsense input.
 * Callers that would rather have `null` than a `try` should use
 * `safeEncodeDigipin`.
 */
export function encodeDigipin(lat, lon) {
  const latitude = Number(lat);
  const longitude = Number(lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new TypeError("DIGIPIN needs two finite numbers: (latitude, longitude).");
  }
  if (latitude < DIGIPIN_BOUNDS.minLat || latitude > DIGIPIN_BOUNDS.maxLat) {
    throw new RangeError(
      `Latitude ${latitude} is outside DIGIPIN's range (${DIGIPIN_BOUNDS.minLat}–${DIGIPIN_BOUNDS.maxLat}).`
    );
  }
  if (longitude < DIGIPIN_BOUNDS.minLon || longitude > DIGIPIN_BOUNDS.maxLon) {
    throw new RangeError(
      `Longitude ${longitude} is outside DIGIPIN's range (${DIGIPIN_BOUNDS.minLon}–${DIGIPIN_BOUNDS.maxLon}).`
    );
  }

  let { minLat, maxLat, minLon, maxLon } = DIGIPIN_BOUNDS;
  let code = "";

  for (let level = 0; level < DIGIPIN_LENGTH; level += 1) {
    const latStep = (maxLat - minLat) / 4;
    const lonStep = (maxLon - minLon) / 4;

    // `3 -` because row 0 of the grid is the northernmost band while latitude
    // increases northward. The clamp catches the exact top and right edges,
    // where the division lands on 4 instead of 3.
    const row = clampIndex(3 - Math.floor((latitude - minLat) / latStep));
    const col = clampIndex(Math.floor((longitude - minLon) / lonStep));

    code += DIGIPIN_GRID[row][col];

    // Narrow to the chosen cell and go round again. Order matters: `minLon` is
    // read by the line that sets `maxLon`, so it has to move first.
    maxLat = minLat + latStep * (4 - row);
    minLat = maxLat - latStep;
    minLon += lonStep * col;
    maxLon = minLon + lonStep;
  }

  return code;
}

/** `encodeDigipin` that answers `null` instead of throwing. */
export function safeEncodeDigipin(lat, lon) {
  try {
    return encodeDigipin(lat, lon);
  } catch {
    return null;
  }
}

/**
 * A DIGIPIN back to the ground.
 *
 * Returns the centre of the cell *and* the cell itself. The centre is what you
 * hand to a maps link; the bounds are what the campus map draws, because a
 * DIGIPIN is honestly a small square and drawing it as an infinitely precise
 * dot promises accuracy the code does not have.
 */
export function decodeDigipin(input) {
  const pin = normaliseDigipin(input);

  if (!VALID_CODE.test(pin)) {
    throw new Error(
      `"${input}" is not a DIGIPIN. Expected ${DIGIPIN_LENGTH} characters from ${DIGIPIN_ALPHABET}.`
    );
  }

  let { minLat, maxLat, minLon, maxLon } = DIGIPIN_BOUNDS;

  for (const symbol of pin) {
    const { row, col } = SYMBOL_POSITION.get(symbol);
    const latStep = (maxLat - minLat) / 4;
    const lonStep = (maxLon - minLon) / 4;

    // Same flip as encode, read the other way: row 0 is the top band, so it
    // maps to the *highest* latitudes.
    maxLat -= latStep * row;
    minLat = maxLat - latStep;
    minLon += lonStep * col;
    maxLon = minLon + lonStep;
  }

  return {
    lat: (minLat + maxLat) / 2,
    lon: (minLon + maxLon) / 2,
    bounds: { minLat, maxLat, minLon, maxLon },
  };
}

/** `decodeDigipin` that answers `null` instead of throwing. */
export function safeDecodeDigipin(input) {
  try {
    return decodeDigipin(input);
  } catch {
    return null;
  }
}

/**
 * How big a DIGIPIN cell actually is, in metres, at a given latitude.
 *
 * Ten quarterings divide 36° by 4^10, so every cell is the same 0.0000343° on
 * a side. On the ground that is a constant ~3.8m north-to-south everywhere,
 * but east-to-west it shrinks with the cosine of the latitude: ~3.8m at Kanya-
 * kumari, ~3.4m in Patna, ~3.0m in Leh.
 *
 * Used for the caveat under a displayed code. Someone reading `235M64MM85` off
 * a sign should be told it means "this doorway, give or take a pace", not "this
 * exact point", so they know when it is precise enough to act on.
 */
export function digipinCellSizeMetres(lat = 0) {
  const degrees = (DIGIPIN_BOUNDS.maxLat - DIGIPIN_BOUNDS.minLat) / 4 ** DIGIPIN_LENGTH;
  const metresPerDegree = 111_320;
  return {
    height: degrees * metresPerDegree,
    width: degrees * metresPerDegree * Math.cos((Number(lat) || 0) * (Math.PI / 180)),
  };
}

/** Clamp a grid index into 0–3, for points sitting exactly on the box's edge. */
function clampIndex(value) {
  if (value < 0) return 0;
  if (value > 3) return 3;
  return value;
}
