import { NextResponse } from "next/server";
import { PATNA } from "@/lib/panchang";

/**
 * Patna's weather, for the strip on the home page.
 *
 * Open-Meteo needs no API key and no account, which is the whole reason it is
 * the source: a weather pill is not worth a credential to rotate, a bill to
 * watch or a secret that has to exist in every environment before the home
 * page will render.
 *
 * The failure behaviour is the important part. This is decoration on the
 * busiest page of the site, so an unreachable weather service must produce a
 * missing pill and nothing else — never a slow page, never an error. Hence the
 * timeout, the catch, and a 200 with `null` rather than a 5xx that a client
 * would have to special-case.
 */

/** Fifteen minutes. Weather does not move faster than that, and nor should the load. */
const CACHE_SECONDS = 900;
const TIMEOUT_MS = 3500;

/**
 * WMO weather codes, bucketed into the handful of conditions worth an icon.
 * The full table has thirty entries and distinguishes freezing drizzle from
 * freezing rain; a pill three centimetres wide does not.
 */
function conditionOf(code) {
  if (code === 0) return "clear";
  if (code <= 3) return "cloudy";
  if (code <= 48) return "fog";
  if (code <= 57) return "drizzle";
  if (code <= 67) return "rain";
  if (code <= 77) return "snow";
  if (code <= 82) return "rain";
  if (code <= 86) return "snow";
  return "thunder";
}

export async function GET() {
  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${PATNA.latitude}&longitude=${PATNA.longitude}` +
    "&current=temperature_2m,relative_humidity_2m,weather_code,is_day" +
    "&timezone=Asia%2FKolkata";

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: CACHE_SECONDS },
    });
    if (!response.ok) throw new Error(`upstream ${response.status}`);

    const data = await response.json();
    const current = data?.current;
    if (!current || typeof current.temperature_2m !== "number") {
      throw new Error("unexpected payload");
    }

    return NextResponse.json(
      {
        temperature: Math.round(current.temperature_2m),
        humidity: current.relative_humidity_2m ?? null,
        condition: conditionOf(current.weather_code ?? 0),
        isDay: current.is_day === 1,
      },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=3600`,
        },
      }
    );
  } catch (error) {
    console.error("[weather] lookup failed", error);
    return NextResponse.json({ weather: null }, { status: 200 });
  }
}
