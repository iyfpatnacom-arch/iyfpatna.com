/**
 * Checks the ported DIGIPIN implementation against the Department of Posts.
 *
 * `lib/campus/digipin.js` is a hand port of India Post's reference code, and a
 * port of a geocode is exactly the kind of thing that can be subtly wrong
 * forever: flip the row index and every code still looks like a valid DIGIPIN,
 * still round-trips through your own decoder, and points at a mirror image of
 * the country. Only an independently published vector catches that.
 *
 * Run with `npm run verify:digipin`.
 */
import {
  DIGIPIN_BOUNDS,
  decodeDigipin,
  digipinCellSizeMetres,
  encodeDigipin,
  isValidDigipin,
  normaliseDigipin,
} from "../lib/campus/digipin.js";

let failures = 0;

function check(name, actual, expected) {
  const ok = Object.is(actual, expected);
  if (!ok) failures += 1;
  console.log(`${ok ? "  ok  " : " FAIL "} ${name}${ok ? "" : `\n         expected ${expected}\n         actual   ${actual}`}`);
}

function checkTrue(name, value) {
  check(name, Boolean(value), true);
}

console.log("\nDIGIPIN — published vectors");
// The Department of Posts' own worked example, carried in the header comment
// of its reference implementation. This is the assertion that matters.
check("13.11179621, 80.20264269 -> 4T396F42L7", encodeDigipin(13.11179621, 80.20264269), "4T396F42L7");

console.log("\nDIGIPIN — corners of the covered box");
check("south-west corner", encodeDigipin(DIGIPIN_BOUNDS.minLat, DIGIPIN_BOUNDS.minLon), "L".repeat(10));
check("north-east corner", encodeDigipin(DIGIPIN_BOUNDS.maxLat, DIGIPIN_BOUNDS.maxLon), "8".repeat(10));

console.log("\nDIGIPIN — round trip within one cell");
// Every decoded point must land inside the cell it was encoded from, which for
// a ten-level code means within half a cell — under three metres, everywhere.
let worst = 0;
let worstAt = null;
for (let i = 0; i < 20_000; i += 1) {
  const lat = DIGIPIN_BOUNDS.minLat + Math.random() * (DIGIPIN_BOUNDS.maxLat - DIGIPIN_BOUNDS.minLat);
  const lon = DIGIPIN_BOUNDS.minLon + Math.random() * (DIGIPIN_BOUNDS.maxLon - DIGIPIN_BOUNDS.minLon);
  const back = decodeDigipin(encodeDigipin(lat, lon));
  const metres = Math.hypot(
    (back.lat - lat) * 111_320,
    (back.lon - lon) * 111_320 * Math.cos((lat * Math.PI) / 180)
  );
  if (metres > worst) {
    worst = metres;
    worstAt = [lat, lon];
  }
}
check(
  `20,000 random points stay within half a cell (worst ${worst.toFixed(3)}m at ${worstAt?.map((n) => n.toFixed(5)).join(", ")})`,
  worst < 3,
  true
);

console.log("\nDIGIPIN — decode is the inverse of encode");
for (const pin of ["4T396F42L7", "235M64MM85", "39J49L4L44"]) {
  const { lat, lon } = decodeDigipin(pin);
  check(`${pin} -> lat/lon -> ${pin}`, encodeDigipin(lat, lon), pin);
}

console.log("\nDIGIPIN — input handling");
check("hyphenated legacy form is read back", normaliseDigipin("235-M64-MM85"), "235M64MM85");
check("lowercase and spaces", normaliseDigipin(" 235 m64 mm85 "), "235M64MM85");
checkTrue("a real code validates", isValidDigipin("235M64MM85"));
checkTrue("a code with excluded letters does not", !isValidDigipin("ABDEGHINOQR"));
checkTrue("a nine-character code does not", !isValidDigipin("235M64MM8"));
checkTrue("null does not", !isValidDigipin(null));

console.log("\nDIGIPIN — refuses what it cannot represent");
for (const [name, lat, lon] of [
  ["north of the box", 40, 80],
  ["south of the box", 1, 80],
  ["east of the box", 20, 100],
  ["west of the box", 20, 60],
  ["not a number", Number.NaN, 80],
]) {
  let threw = false;
  try {
    encodeDigipin(lat, lon);
  } catch {
    threw = true;
  }
  checkTrue(`${name} throws`, threw);
}

console.log("\nDIGIPIN — cell size");
const patna = digipinCellSizeMetres(25.606902);
checkTrue(
  `Patna cell is ~3.8m x ~3.4m (${patna.height.toFixed(2)}m x ${patna.width.toFixed(2)}m)`,
  patna.height > 3.7 && patna.height < 3.9 && patna.width > 3.3 && patna.width < 3.5
);
checkTrue("cells are narrower further north", digipinCellSizeMetres(34).width < patna.width);

console.log(`\n${failures === 0 ? "All DIGIPIN checks passed." : `${failures} DIGIPIN check(s) FAILED.`}\n`);
process.exit(failures === 0 ? 0 : 1);
