/**
 * The astronomy the Vaishnava calendar stands on.
 *
 * Everything here is a pure function of a Julian Day and returns degrees. No
 * dependencies, no network, no `Intl` — so the same code that renders the
 * calendar on the server also runs in the browser with the phone in aeroplane
 * mode, which is the only way a calendar of fast days is any use.
 *
 * Sources are Jean Meeus, *Astronomical Algorithms* (2nd ed.): chapter 25 for
 * the Sun and chapter 47 (table 47.A) for the Moon. The Moon series is
 * truncated to its longitude terms, which is all a tithi needs — a tithi is
 * 12° of elongation wide and this series is good to about 10 arcseconds, so
 * the boundary times it produces are accurate to well under a minute.
 *
 * Nutation is deliberately absent. It shifts the Sun and the Moon by the same
 * amount, and every quantity here is built from the *difference* of the two,
 * where it cancels exactly.
 */

const RAD = Math.PI / 180;

export function norm360(deg) {
  const x = deg % 360;
  return x < 0 ? x + 360 : x;
}

/** Signed difference in (-180, 180]. */
export function deltaDeg(a, b) {
  return ((((a - b) % 360) + 540) % 360) - 180;
}

const sin = (deg) => Math.sin(deg * RAD);
const cos = (deg) => Math.cos(deg * RAD);

export const J2000 = 2451545.0;
const UNIX_EPOCH_JD = 2440587.5;

/** Julian Day from a JS timestamp (milliseconds since the Unix epoch, UTC). */
export function julianDay(ms) {
  return ms / 86400000 + UNIX_EPOCH_JD;
}

/** The inverse, as a Date. */
export function julianDayToDate(jd) {
  return new Date((jd - UNIX_EPOCH_JD) * 86400000);
}

/**
 * TT − UT in seconds.
 *
 * Espenak and Meeus's polynomial for 2005–2050. Around 72 seconds in the
 * 2020s, which moves the Moon about 0.011° — small, but a tithi boundary is a
 * wall-clock time someone plans a fast around, so it is worth the one line.
 */
export function deltaTSeconds(jd) {
  const year = 2000 + (jd - J2000) / 365.25;
  const t = year - 2000;
  return 62.92 + 0.32217 * t + 0.005589 * t * t;
}

/** Universal Time JD to Dynamical Time JD, which is what the series want. */
export function toDynamical(jd) {
  return jd + deltaTSeconds(jd) / 86400;
}

/* ------------------------------------------------------------------- Sun */

/**
 * Apparent geocentric longitude of the Sun in degrees (Meeus ch. 25),
 * accurate to about 0.01°.
 */
export function sunLongitude(jde) {
  const T = (jde - J2000) / 36525;

  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;

  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M) +
    (0.019993 - 0.000101 * T) * sin(2 * M) +
    0.000289 * sin(3 * M);

  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * T;

  return norm360(trueLong - 0.00569 - 0.00478 * sin(omega));
}

/* ------------------------------------------------------------------ Moon */

/**
 * Meeus table 47.A, longitude terms only.
 *
 * Columns: multiples of D, M, M′ and F, then the coefficient of the sine term
 * in units of 1e-6 degrees. Rows whose longitude coefficient is zero (they
 * carry only a distance term) are omitted.
 */
// prettier-ignore
const MOON_TERMS = [
  [0, 0, 1, 0, 6288774], [2, 0, -1, 0, 1274027], [2, 0, 0, 0, 658314],
  [0, 0, 2, 0, 213618], [0, 1, 0, 0, -185116], [0, 0, 0, 2, -114332],
  [2, 0, -2, 0, 58793], [2, -1, -1, 0, 57066], [2, 0, 1, 0, 53322],
  [2, -1, 0, 0, 45758], [0, 1, -1, 0, -40923], [1, 0, 0, 0, -34720],
  [0, 1, 1, 0, -30383], [2, 0, 0, -2, 15327], [0, 0, 1, 2, -12528],
  [0, 0, 1, -2, 10980], [4, 0, -1, 0, 10675], [0, 0, 3, 0, 10034],
  [4, 0, -2, 0, 8548], [2, 1, -1, 0, -7888], [2, 1, 0, 0, -6766],
  [1, 0, -1, 0, -5163], [1, 1, 0, 0, 4987], [2, -1, 1, 0, 4036],
  [2, 0, 2, 0, 3994], [4, 0, 0, 0, 3861], [2, 0, -3, 0, 3665],
  [0, 1, -2, 0, -2689], [2, 0, -1, 2, -2602], [2, -1, -2, 0, 2390],
  [1, 0, 1, 0, -2348], [2, -2, 0, 0, 2236], [0, 1, 2, 0, -2120],
  [0, 2, 0, 0, -2069], [2, -2, -1, 0, 2048], [2, 0, 1, -2, -1773],
  [2, 0, 0, 2, -1595], [4, -1, -1, 0, 1215], [0, 0, 2, 2, -1110],
  [3, 0, -1, 0, -892], [2, 1, 1, 0, -810], [4, -1, -2, 0, 759],
  [0, 2, -1, 0, -713], [2, 2, -1, 0, -700], [2, 1, -2, 0, 691],
  [2, -1, 0, -2, 596], [4, 0, 1, 0, 549], [0, 0, 4, 0, 537],
  [4, -1, 0, 0, 520], [1, 0, -2, 0, -487], [2, 1, 0, -2, -399],
  [0, 0, 2, -2, -381], [1, 1, 1, 0, 351], [3, 0, -2, 0, -340],
  [4, 0, -3, 0, 330], [2, -1, 2, 0, 327], [0, 2, 1, 0, -323],
  [1, 1, -1, 0, 299], [2, 0, 3, 0, 294],
];

/** Apparent geocentric longitude of the Moon in degrees (Meeus ch. 47). */
export function moonLongitude(jde) {
  const T = (jde - J2000) / 36525;
  const T2 = T * T;
  const T3 = T2 * T;
  const T4 = T3 * T;

  // Mean longitude, mean elongation, and the two anomalies.
  const Lp =
    218.3164477 + 481267.88123421 * T - 0.0015786 * T2 + T3 / 538841 - T4 / 65194000;
  const D =
    297.8501921 + 445267.1114034 * T - 0.0018819 * T2 + T3 / 545868 - T4 / 113065000;
  const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T2 + T3 / 24490000;
  const Mp =
    134.9633964 + 477198.8675055 * T + 0.0087414 * T2 + T3 / 69699 - T4 / 14712000;
  const F =
    93.272095 + 483202.0175233 * T - 0.0036539 * T2 - T3 / 3526000 + T4 / 863310000;

  // Terms in M are solar; they scale with the Earth's changing eccentricity.
  const E = 1 - 0.002516 * T - 0.0000074 * T2;

  let sigmaL = 0;
  for (const [cD, cM, cMp, cF, coeff] of MOON_TERMS) {
    const arg = cD * D + cM * M + cMp * Mp + cF * F;
    const absM = Math.abs(cM);
    const scale = absM === 1 ? E : absM === 2 ? E * E : 1;
    sigmaL += coeff * scale * sin(arg);
  }

  // Additive terms for Venus (A1), Jupiter (A2) and the Earth's flattening.
  const A1 = 119.75 + 131.849 * T;
  const A2 = 53.09 + 479264.29 * T;
  sigmaL += 3958 * sin(A1) + 1962 * sin(Lp - F) + 318 * sin(A2);

  return norm360(Lp + sigmaL / 1e6);
}

/* ------------------------------------------------------------ elongation */

/**
 * Moon − Sun in degrees, from a *Universal Time* Julian Day.
 *
 * This one quantity is the whole calendar: divided by 12 it is the tithi,
 * divided by 180 it is the paksha, and its zeroes are the new moons the lunar
 * months hang off.
 */
export function elongation(jd) {
  const jde = toDynamical(jd);
  return norm360(moonLongitude(jde) - sunLongitude(jde));
}

/** Mean rate of change of the elongation, in degrees per day. */
const ELONGATION_RATE = 360 / 29.530588853;

/**
 * The instant nearest `guessJd` at which the elongation equals `targetDeg`.
 *
 * Newton's method on a function whose derivative barely varies — the true
 * rate stays within about 13% of the mean — so it converges in three or four
 * passes. The guess has to be within roughly half a lunation of the answer,
 * which every caller here arranges.
 */
export function findElongation(targetDeg, guessJd) {
  let jd = guessJd;
  for (let i = 0; i < 12; i += 1) {
    const diff = deltaDeg(elongation(jd), targetDeg);
    if (Math.abs(diff) < 1e-7) break;
    jd -= diff / ELONGATION_RATE;
  }
  return jd;
}

/** The new moon at or before `jd`. */
export function previousNewMoon(jd) {
  const found = findElongation(0, jd - elongation(jd) / ELONGATION_RATE);
  // Guard the boundary: an instant a few seconds after a new moon can
  // converge onto the one that follows it.
  return found > jd ? findElongation(0, found - 29.53) : found;
}

/** The new moon strictly after `jd`. */
export function nextNewMoon(jd) {
  return findElongation(0, previousNewMoon(jd) + 29.530588853);
}

/* -------------------------------------------------------------- ayanamsa */

/**
 * Lahiri (Chitra-paksha) ayanamsa in degrees — the offset between the
 * tropical zodiac the series above compute in and the sidereal one Indian
 * astronomy reckons nakshatras and solar months in.
 *
 * A linear fit: 23.85° at J2000 drifting at the precession rate of about
 * 50.29″ a year. Within an arcminute of the published value for any date this
 * calendar will be asked about, and a nakshatra is 13°20′ wide.
 */
export function ayanamsa(jd) {
  const years = (jd - J2000) / 365.25;
  return 23.85 + (years * 50.29) / 3600;
}

/** Sidereal longitude of the Sun, in degrees. */
export function sunSiderealLongitude(jd) {
  return norm360(sunLongitude(toDynamical(jd)) - ayanamsa(jd));
}

/** Sidereal longitude of the Moon, in degrees. */
export function moonSiderealLongitude(jd) {
  return norm360(moonLongitude(toDynamical(jd)) - ayanamsa(jd));
}

/* ------------------------------------------------------ sunrise / sunset */

const SUNRISE_ALTITUDE = -0.833; // refraction plus the Sun's semi-diameter

/**
 * Sunrise, solar noon and sunset for one civil day at one place, as Julian
 * Days in Universal Time.
 *
 * The standard sunrise equation — a compact re-derivation of the NOAA
 * algorithm, good to about a minute, which is finer than the precision anyone
 * reads a mangala-arati time to.
 *
 * `jdGuess` is any instant inside the local day wanted. Latitudes where the
 * Sun does not rise or set that day come back with nulls; Patna is nowhere
 * near that, but the calendar should not produce NaN if it is ever pointed
 * somewhere else.
 */
export function solarEvents(jdGuess, latitude, longitude) {
  const west = -longitude;
  const n = Math.round(jdGuess - J2000 - 0.0009 - west / 360);

  const jStar = J2000 + 0.0009 + west / 360 + n;
  const M = norm360(357.5291 + 0.98560028 * (jStar - J2000));
  const C = 1.9148 * sin(M) + 0.02 * sin(2 * M) + 0.0003 * sin(3 * M);
  const lambda = norm360(M + C + 180 + 102.9372);

  const transit = jStar + 0.0053 * sin(M) - 0.0069 * sin(2 * lambda);

  const sinDec = sin(lambda) * sin(23.44);
  const cosDec = Math.sqrt(1 - sinDec * sinDec);
  const cosOmega =
    (sin(SUNRISE_ALTITUDE) - sin(latitude) * sinDec) / (cos(latitude) * cosDec);

  if (cosOmega > 1 || cosOmega < -1) {
    return { sunrise: null, sunset: null, transit, polar: true };
  }

  const omega = Math.acos(cosOmega) / RAD;
  return {
    sunrise: transit - omega / 360,
    sunset: transit + omega / 360,
    transit,
    polar: false,
  };
}
