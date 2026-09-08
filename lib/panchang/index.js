/**
 * The Vaishnava calendar for Patna.
 *
 * `astronomy.js` produces degrees; this turns them into the day a devotee
 * actually plans around — which tithi is running at sunrise, which month it
 * belongs to, whether today is an Ekadashi and when the fast may be broken.
 *
 * Three rules do most of the work here, and each is the traditional one:
 *
 *   1. A day takes the tithi that is running **at sunrise**, not at midnight.
 *      So a "date" here is a sunrise-to-sunrise thing, computed for Patna's
 *      own horizon rather than a national average.
 *
 *   2. Lunar months are named from the Sun's sidereal rashi at the new moon
 *      that begins them, and the Gaudiya calendar reads them *purnimanta* —
 *      the month turns over the day after the full moon — so a Krishna-paksha
 *      day carries the following month's name. That single shift is why
 *      Janmashtami falls in Hrishikesha and not Shridhara.
 *
 *   3. Ekadashi is kept on the *last* sunrise at which the tithi prevails.
 *      When Ekadashi touches two sunrises the first is mixed with Dashami and
 *      the Gaudiya practice is to fast on the second, pure one.
 *
 * What this does **not** implement is the full set of mahadvadasi exceptions
 * beyond a skipped Ekadashi, or the appearance and disappearance days of
 * individual acaryas, which differ between Gaudiya lines. The calendar page
 * says so where a reader can see it. Everything here is arithmetic anyone can
 * re-derive; nothing is a hardcoded date that quietly expires.
 *
 * No I/O, no `Intl`, no dependencies — it runs identically on the server and
 * on a phone with no signal.
 */

import {
  deltaDeg,
  elongation,
  findElongation,
  julianDay,
  julianDayToDate,
  moonSiderealLongitude,
  previousNewMoon,
  solarEvents,
  sunSiderealLongitude,
} from "./astronomy.js";
import {
  ADHIKA_EKADASHI,
  ADHIKA_MONTH,
  EKADASHI_NAMES,
  FESTIVALS,
  GAUDIYA_MONTHS,
  NAKSHATRAS,
  PAKSHA_NAMES,
  PATNA,
  tithiName,
} from "./data.js";

export { PATNA, GAUDIYA_MONTHS, PAKSHA_NAMES } from "./data.js";

const MS_PER_DAY = 86400000;
const TZ_MS = PATNA.tzMinutes * 60000;
const SYNODIC_MONTH = 29.530588853;
const ELONGATION_RATE = 360 / SYNODIC_MONTH; // ~12.19 deg/day
const MOON_RATE = 13.176; // deg/day, sidereal — only ever used as a first guess
const NAKSHATRA_SPAN = 360 / 27;

/* ------------------------------------------------------------ IST dates */

/** The Patna calendar date of an instant, as "YYYY-MM-DD". */
export function istDayKey(date = new Date()) {
  return new Date(date.getTime() + TZ_MS).toISOString().slice(0, 10);
}

/** Epoch milliseconds of midnight IST on `dayKey`. */
function dayStartMs(dayKey) {
  const [y, m, d] = dayKey.split("-").map(Number);
  return Date.UTC(y, m - 1, d) - TZ_MS;
}

/** `dayKey` moved by whole days, still in IST. */
export function addDays(dayKey, n) {
  return istDayKey(new Date(dayStartMs(dayKey) + n * MS_PER_DAY));
}

/** Whole days from `a` to `b`, both day keys. */
export function daysBetween(a, b) {
  return Math.round((dayStartMs(b) - dayStartMs(a)) / MS_PER_DAY);
}

/**
 * "HH:MM" in IST for an instant.
 *
 * Built by hand rather than through `Intl.DateTimeFormat` so it cannot differ
 * between the server's timezone data and the phone's — a rendered time that
 * disagrees across hydration is exactly the sort of thing nobody notices
 * until it is a fast day.
 */
export function istTime(ms) {
  const d = new Date(ms + TZ_MS);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Day of the week, 0 = Sunday, for a day key. */
export function weekdayOf(dayKey) {
  return new Date(dayStartMs(dayKey) + TZ_MS).getUTCDay();
}

const jdToMs = (jd) => julianDayToDate(jd).getTime();

/* --------------------------------------------------------- root finding */

/** The instant nearest `guessJd` at which the Moon reaches `targetDeg` sidereal. */
function findMoonLongitude(targetDeg, guessJd) {
  let jd = guessJd;
  for (let i = 0; i < 12; i += 1) {
    const diff = deltaDeg(moonSiderealLongitude(jd), targetDeg);
    if (Math.abs(diff) < 1e-7) break;
    jd -= diff / MOON_RATE;
  }
  return jd;
}

/** Index (0–29) and boundary instants of the tithi running at `jd`. */
function tithiAt(jd) {
  const elong = elongation(jd);
  const index = Math.floor(elong / 12);
  const startDeg = index * 12;
  const endDeg = index * 12 + 12;
  return {
    index,
    start: findElongation(startDeg % 360, jd - (elong - startDeg) / ELONGATION_RATE),
    end: findElongation(endDeg % 360, jd + (endDeg - elong) / ELONGATION_RATE),
  };
}

/** Index (0–26) and end instant of the nakshatra the Moon is in at `jd`. */
function nakshatraAt(jd) {
  const lon = moonSiderealLongitude(jd);
  const index = Math.floor(lon / NAKSHATRA_SPAN);
  const endDeg = (index + 1) * NAKSHATRA_SPAN;
  return {
    index,
    end: findMoonLongitude(endDeg % 360, jd + (endDeg - lon) / MOON_RATE),
  };
}

/**
 * The lunar month containing `jd`: its amanta index (Chaitra = 0) and whether
 * it is an intercalary month.
 *
 * A lunation with no solar ingress inside it is adhika, and it borrows the
 * name of the month that follows — which is what `(rashi + 1) % 12` already
 * produces, since the ingress it is missing is the one into `rashi + 1`.
 */
function lunarMonthAt(jd) {
  const newMoon = previousNewMoon(jd);
  const followingNewMoon = findElongation(0, newMoon + SYNODIC_MONTH);
  const rashi = Math.floor(sunSiderealLongitude(newMoon) / 30);
  return {
    amanta: (rashi + 1) % 12,
    adhika: rashi === Math.floor(sunSiderealLongitude(followingNewMoon) / 30),
    newMoon,
    followingNewMoon,
  };
}

/* ------------------------------------------------------------- day facts */

/**
 * Memo for the raw per-day computation.
 *
 * A month grid asks for 31 days plus a neighbour on each side, and every
 * Ekadashi test looks at the days either side of the one being rendered, so
 * without this each day would be solved three or four times over. Bounded
 * because the calendar page lets someone page through years.
 */
const rawCache = new Map();
const RAW_CACHE_LIMIT = 800;

/** Tithi, nakshatra, month and solar times for one Patna day. */
function rawDay(dayKey) {
  const hit = rawCache.get(dayKey);
  if (hit) return hit;

  const noonJd = julianDay(dayStartMs(dayKey) + 12 * 3600000);
  const solar = solarEvents(noonJd, PATNA.latitude, PATNA.longitude);
  // Sunrise is the reference instant for everything below. The fallback to
  // local noon only matters at latitudes with no sunrise, which Patna is not.
  const referenceJd = solar.sunrise ?? solar.transit;

  const tithi = tithiAt(referenceJd);
  const nakshatra = nakshatraAt(referenceJd);
  const month = lunarMonthAt(referenceJd);

  const paksha = tithi.index < 15 ? "shukla" : "krishna";
  const inPaksha = (tithi.index % 15) + 1;
  // The purnimanta shift: the dark fortnight belongs to the next month's name.
  const gaudiyaMonth = paksha === "krishna" ? (month.amanta + 1) % 12 : month.amanta;

  const record = {
    dayKey,
    sunriseMs: solar.sunrise === null ? null : jdToMs(solar.sunrise),
    sunsetMs: solar.sunset === null ? null : jdToMs(solar.sunset),
    referenceJd,
    tithiIndex: tithi.index,
    tithiInPaksha: inPaksha,
    tithiStartMs: jdToMs(tithi.start),
    tithiEndMs: jdToMs(tithi.end),
    paksha,
    nakshatraIndex: nakshatra.index,
    nakshatraEndMs: jdToMs(nakshatra.end),
    gaudiyaMonth,
    adhika: month.adhika,
    /** 0 at the new moon, 0.5 at the full moon — drives the phase glyph. */
    moonPhase: elongation(referenceJd) / 360,
  };

  if (rawCache.size > RAW_CACHE_LIMIT) rawCache.clear();
  rawCache.set(dayKey, record);
  return record;
}

/* -------------------------------------------------------------- the fast */

/**
 * Is the Ekadashi fast kept on this day?
 *
 * One definition, used both for the day being rendered and for the day before
 * it — the parana window only exists because yesterday was a fast, and two
 * copies of this test are two chances for them to disagree.
 *
 * Either the tithi is Ekadashi at this sunrise and not at the next one (the
 * suddha rule), or Ekadashi touched no sunrise at all and the fast has moved
 * onto Dvadashi as a mahadvadasi.
 */
function fastState(dayKey) {
  const today = rawDay(dayKey);
  const tomorrow = rawDay(addDays(dayKey, 1));
  const yesterday = rawDay(addDays(dayKey, -1));

  const ekadashiFast = today.tithiInPaksha === 11 && tomorrow.tithiInPaksha !== 11;
  const mahadvadasi = today.tithiInPaksha === 12 && yesterday.tithiInPaksha === 10;

  return { ekadashiFast, mahadvadasi, fast: ekadashiFast || mahadvadasi };
}

/**
 * Festivals attached to a tithi that no sunrise fell inside.
 *
 * A tithi shorter than the gap between two sunrises can begin and end
 * entirely within one day — Kartika Purnima 2024 did exactly this, running
 * from 06:19 on the 15th to 02:58 on the 16th with sunrise at 06:08 and 06:09
 * on either side. A rule that only ever reads the tithi at sunrise loses that
 * festival altogether. Traditionally a kshaya tithi is observed on the day it
 * *ends*, which is this day, so that is where its festival is attached.
 */
function skippedTithiFestivals(today, tomorrow) {
  const gap = (tomorrow.tithiIndex - today.tithiIndex + 30) % 30;
  if (gap < 2) return [];

  const found = [];
  for (let step = 1; step < gap; step += 1) {
    const index = (today.tithiIndex + step) % 30;
    // The month is read at the skipped tithi's own midpoint rather than
    // inherited from today: a tithi skipped across a new moon belongs to the
    // month that is starting, not the one that just ended.
    const midJd = findElongation(
      (index * 12 + 6) % 360,
      today.referenceJd + step / 2
    );
    const { amanta, adhika } = lunarMonthAt(midJd);
    if (adhika) continue;

    const paksha = index < 15 ? "shukla" : "krishna";
    const inPaksha = (index % 15) + 1;
    const gaudiyaMonth = paksha === "krishna" ? (amanta + 1) % 12 : amanta;

    const festival = FESTIVALS[`${gaudiyaMonth}-${paksha}-${inPaksha}`];
    if (festival) found.push({ ...festival, skippedTithi: true });
  }
  return found;
}

/* ----------------------------------------------------------- public API */

/**
 * Everything the calendar knows about one Patna day.
 *
 * Pure and memoised, so calling it for a whole month is cheap and calling it
 * twice for the same day is free.
 */
export function panchangForDay(dayKey) {
  const today = rawDay(dayKey);
  const tomorrow = rawDay(addDays(dayKey, 1));
  const yesterday = rawDay(addDays(dayKey, -1));

  const monthName = today.adhika ? ADHIKA_MONTH : GAUDIYA_MONTHS[today.gaudiyaMonth];
  const monthKey = `${today.gaudiyaMonth}-${today.paksha}`;

  const { fast, mahadvadasi } = fastState(dayKey);

  let ekadashi = null;
  if (today.tithiInPaksha === 11 || mahadvadasi) {
    const name = today.adhika
      ? ADHIKA_EKADASHI[today.paksha]
      : EKADASHI_NAMES[monthKey];
    ekadashi = {
      name: name ?? null,
      /** True only on the day the fast is actually kept. */
      fast,
      mahadvadasi,
    };
  }

  /* Break-fast window, on the day after a fast.

     Two traditional constraints, both computable: the parana falls after
     Hari-vasara (the first quarter of Dvadashi) and, by preference, inside
     the first fifth of the daylight — and it can never outlast Dvadashi.

     Those two can conflict. A Dvadashi long enough to span two sunrises puts
     the end of Hari-vasara well into the morning, past the daylight limit; in
     that case the limit is the one that yields, and the window runs from
     Hari-vasara to whichever comes first, the end of Dvadashi or sunset. It
     stays inside one day either way, because a break-fast window that reads
     "10:49 to 06:21" is worse than no window at all. */
  let parana = null;
  if (
    fastState(addDays(dayKey, -1)).fast &&
    today.sunriseMs !== null &&
    today.sunsetMs !== null
  ) {
    const daylightLimit = today.sunriseMs + (today.sunsetMs - today.sunriseMs) / 5;

    if (today.tithiInPaksha === 12) {
      const hariVasaraEnd =
        today.tithiStartMs + (today.tithiEndMs - today.tithiStartMs) / 4;
      const startMs = Math.max(today.sunriseMs, hariVasaraEnd);
      const preferredEnd = Math.min(today.tithiEndMs, daylightLimit);
      const endMs =
        preferredEnd > startMs
          ? preferredEnd
          : Math.min(today.tithiEndMs, today.sunsetMs);
      parana = { startMs, endMs, constrained: preferredEnd <= startMs };
    } else {
      // Dvadashi was already over by sunrise; only the daylight rule is left.
      parana = {
        startMs: today.sunriseMs,
        endMs: daylightLimit,
        constrained: false,
      };
    }
  }

  /* Festivals are placed by tithi, and an intercalary month has none of them:
     they belong to the nija month of the same name.

     A tithi that spans two sunrises would otherwise print its festival on
     both days, so the repeat is dropped and the first day keeps it. */
  const repeatsYesterday = yesterday.tithiIndex === today.tithiIndex;
  const sunriseFestival =
    today.adhika || repeatsYesterday
      ? null
      : FESTIVALS[`${today.gaudiyaMonth}-${today.paksha}-${today.tithiInPaksha}`] ??
        null;

  const festivals = [
    ...(sunriseFestival ? [sunriseFestival] : []),
    ...skippedTithiFestivals(today, tomorrow),
  ];
  const festival = festivals[0] ?? null;

  return {
    dayKey,
    weekday: weekdayOf(dayKey),
    sunriseMs: today.sunriseMs,
    sunsetMs: today.sunsetMs,
    moonPhase: today.moonPhase,
    paksha: today.paksha,
    pakshaName: PAKSHA_NAMES[today.paksha],
    tithi: {
      index: today.tithiIndex + 1,
      inPaksha: today.tithiInPaksha,
      name: tithiName(today.tithiInPaksha, today.paksha),
      startMs: today.tithiStartMs,
      endMs: today.tithiEndMs,
    },
    nakshatra: {
      index: today.nakshatraIndex,
      name: NAKSHATRAS[today.nakshatraIndex],
      endMs: today.nakshatraEndMs,
    },
    month: {
      index: today.gaudiyaMonth,
      adhika: today.adhika,
      name: monthName,
      vedic: today.adhika ? null : GAUDIYA_MONTHS[today.gaudiyaMonth].vedic,
    },
    isPurnima: today.paksha === "shukla" && today.tithiInPaksha === 15,
    isAmavasya: today.paksha === "krishna" && today.tithiInPaksha === 15,
    ekadashi,
    parana,
    /** Every observance on this day, and the first of them for convenience. */
    festivals,
    festival,
  };
}

/** Today in Patna. */
export function panchangToday(now = new Date()) {
  return panchangForDay(istDayKey(now));
}

/**
 * Every day of one Gregorian month, in order.
 *
 * The calendar grid is a Gregorian month with lunar content in the cells,
 * because that is the month everyone else's diary is in.
 */
export function panchangForMonth(year, monthIndex) {
  const days = [];
  const last = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  for (let d = 1; d <= last; d += 1) {
    const dayKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push(panchangForDay(dayKey));
  }
  return days;
}

/**
 * The next Ekadashi fast on or after `fromDayKey`.
 *
 * Scans forward a day at a time rather than solving for the tithi directly:
 * the fast day is defined by which sunrise the tithi touches, so it can only
 * be found by asking the days themselves.
 */
export function nextEkadashi(fromDayKey = istDayKey(), limitDays = 40) {
  for (let i = 0; i < limitDays; i += 1) {
    const dayKey = addDays(fromDayKey, i);
    const day = panchangForDay(dayKey);
    if (day.ekadashi?.fast) return day;
  }
  return null;
}

/**
 * Festivals and fasts in the next `days` days, oldest first.
 *
 * Used by the home page strip and the calendar's upcoming list.
 */
export function upcomingObservances(fromDayKey = istDayKey(), days = 60) {
  const found = [];
  for (let i = 0; i < days; i += 1) {
    const day = panchangForDay(addDays(fromDayKey, i));
    if (day.festival || day.ekadashi?.fast) found.push(day);
  }
  return found;
}

/**
 * A moon glyph for a phase in [0, 1).
 *
 * Eight symbols is the resolution the emoji set offers, and it is plenty for
 * a calendar cell: the grid needs to show waxing from waning at a glance, not
 * illumination to the percent.
 */
export function moonGlyph(phase) {
  const glyphs = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"];
  return glyphs[Math.round(phase * 8) % 8];
}
