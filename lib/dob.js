/**
 * Dates of birth, as typed into a date box by real people.
 *
 * The festival forms ask for a birthday rather than an age because an age is
 * wrong within the year and nobody comes back to fix it, while a birthday is a
 * fact: the reports the temple runs off these rows — seating, the quiz's age
 * bands — derive the age when they are read instead of freezing whatever was
 * typed on the day.
 *
 * Shared by the browser and the route that stores the row so the form rejects
 * exactly what the server would, in the manner of `lib/courses/phone`.
 *
 * Everything here works on the plain `YYYY-MM-DD` an `<input type="date">`
 * gives, never on a `Date` parsed in the visitor's own timezone — that turns a
 * birthday into the day before it for half the planet.
 */

/** The window the festival forms accept. Below five is a parent mistyping. */
export const DOB_MIN_AGE = 5;
export const DOB_MAX_AGE = 99;

const PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Today in IST — the only "now" that matters for a temple in Patna. */
export function istToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/**
 * `YYYY-MM-DD` → `{ year, month, day }`, or null when it is not a real day.
 *
 * Calendar-checked, not just pattern-checked: `2009-02-31` matches the shape
 * and `new Date` would happily roll it over to 3 March.
 */
export function parseDob(value) {
  const match = PATTERN.exec(String(value ?? "").trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) return null;
  /* Day 0 of the next month is the last day of this one. */
  if (day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return null;
  return { year, month, day };
}

/** Age in completed years on `on` (IST today by default), or null. */
export function ageFromDob(value, on = istToday()) {
  const born = parseDob(value);
  const today = parseDob(on);
  if (!born || !today) return null;
  const hadBirthday =
    today.month > born.month || (today.month === born.month && today.day >= born.day);
  return today.year - born.year - (hadBirthday ? 0 : 1);
}

/** True when it is a real day and the age it implies is one the forms take. */
export function isAcceptableDob(value, on = istToday()) {
  const age = ageFromDob(value, on);
  return age !== null && age >= DOB_MIN_AGE && age <= DOB_MAX_AGE;
}

/**
 * The earliest and latest birthday the forms accept, as `YYYY-MM-DD`.
 *
 * Handed to the date box as `min`/`max`, so the native picker cannot offer
 * tomorrow, and read from the same age window the validators use so the
 * picker and the error message agree about where the edge is.
 *
 * Each bound is nudged by a day until `isAcceptableDob` agrees with it rather
 * than being trusted as arithmetic: the shift lands on 1 March when today is
 * 29 February, and a bound the resolver would reject is worse than none.
 */
export function dobRange(on = istToday()) {
  const today = parseDob(on);
  if (!today) return { min: undefined, max: undefined };

  const at = (year, offset) =>
    new Date(Date.UTC(year, today.month - 1, today.day + offset)).toISOString().slice(0, 10);
  const settle = (year, offset, step) => {
    const bound = at(year, offset);
    return isAcceptableDob(bound, on) ? bound : at(year, offset + step);
  };

  return {
    /* Somebody turning 100 tomorrow is still 99 today, so the floor is the day
       after their hundredth birthday fell. */
    min: settle(today.year - DOB_MAX_AGE - 1, 1, 1),
    max: settle(today.year - DOB_MIN_AGE, 0, -1),
  };
}

/** `YYYY-MM-DD` → "14 March 2009" for the admin register. Unparseable → null. */
export function formatDob(value, locale = "en-IN") {
  const parts = parseDob(typeof value === "string" ? value.slice(0, 10) : value);
  if (!parts) return null;
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
