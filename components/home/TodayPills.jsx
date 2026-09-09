"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  Snowflake,
  Sun,
  Sunrise,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useIsClient } from "@/lib/playground/useIsClient";
import { istTime, moonGlyph, panchangToday } from "@/lib/panchang";

/**
 * What day it is, in the calendar that matters here, plus the weather.
 *
 * Two shapes of the same reading, because the hero has two very different
 * amounts of room. On a wide screen the text column has room to spare under the
 * buttons, so the strip sits there as an ordinary row of pills. On a phone the
 * hero is only the photograph, so the reading floats on top of it as a single
 * glass card — one tap target, thumb-height, the way a weather app puts today
 * over the sky.
 *
 * Deliberately rendered only after mount. The home page is prerendered, so
 * anything computed during the server render would be the *build's* idea of
 * today baked into static HTML — a calendar strip that is correct on the day
 * of deployment and wrong every day after. Everything below is therefore
 * computed in the browser from the visitor's own clock, which is also why the
 * panchang half keeps working with no connection.
 *
 * The weather is the one part that needs the network, and it is allowed to
 * simply not appear. Nothing here is load-bearing enough to justify a spinner,
 * a layout shift or an error message on the front page.
 */

const CONDITION_ICONS = {
  clear: Sun,
  cloudy: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: Snowflake,
  thunder: CloudLightning,
};

const CALENDAR_HREF = "/playground/vaishnava-calendar";

/* One request per page load rather than one per mount: both layouts mount on
   the home page — whichever does not match the width is display:none, not
   unmounted — and they want the same reading. The promise itself is the cache,
   so the second mount joins a flight already in progress. */
let weatherRequest = null;

function fetchWeather() {
  weatherRequest ??= fetch("/api/weather")
    .then((response) => (response.ok ? response.json() : null))
    .then((data) => (data && typeof data.temperature === "number" ? data : null))
    .catch(() => null);
  return weatherRequest;
}

function useToday() {
  const isClient = useIsClient();
  const [weather, setWeather] = useState(null);

  // Computed during render rather than in an effect, but only once the client
  // snapshot is in force — so the prerendered HTML carries no date at all and
  // there is nothing for hydration to disagree with.
  const day = useMemo(() => (isClient ? panchangToday() : null), [isClient]);

  useEffect(() => {
    let cancelled = false;
    fetchWeather().then((data) => {
      if (!cancelled && data) setWeather(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { day, weather };
}

/**
 * The day's observances, ordered the way they matter to someone deciding what
 * to do today: a fast is an instruction, a parana window is an instruction
 * with a deadline, a festival is an invitation.
 */
function observancesOf(day, locale, tc) {
  const list = [];

  if (day.ekadashi?.fast) {
    list.push({
      key: "ekadashi",
      href: CALENDAR_HREF,
      tone: "quiet",
      label: day.ekadashi.name ? day.ekadashi.name[locale] : tc("legend_ekadashi"),
      note: tc("fast_today"),
    });
  }

  if (day.parana) {
    list.push({
      key: "parana",
      href: CALENDAR_HREF,
      tone: "quiet",
      label: tc("parana"),
      note: `${istTime(day.parana.startMs)}–${istTime(day.parana.endMs)}`,
      numeric: true,
    });
  }

  for (const festival of day.festivals) {
    list.push({
      key: `festival-${festival.name.en}`,
      href: "/festivals",
      tone: "joy",
      glyph: "🪔",
      label: festival.name[locale],
    });
  }

  return list;
}

export function TodayPills({ variant = "inline", className = "" }) {
  return variant === "overlay" ? (
    <TodayOverlay className={className} />
  ) : (
    <TodayRow className={className} />
  );
}

/** Wide screens: a row of pills in the hero's text column. */
function TodayRow({ className }) {
  const t = useTranslations("home.today");
  const tc = useTranslations("playground.calendar");
  const locale = useLocale();
  const { day, weather } = useToday();

  // Before mount there is nothing true to say, and a skeleton on the front
  // page costs more than the strip is worth.
  if (!day) return null;

  const observances = observancesOf(day, locale, tc);
  const WeatherIcon = weather ? (CONDITION_ICONS[weather.condition] ?? Cloud) : null;

  return (
    <div className={className}>
      <span className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
        <span
          className="h-px w-6 bg-gradient-to-r from-primary/70 to-transparent"
          aria-hidden="true"
        />
        {tc("today")}
      </span>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Pill href={CALENDAR_HREF}>
          <MoonHalo phase={day.moonPhase} className="size-5 text-[13px]" />
          <span className="font-medium text-foreground">
            {day.tithi.name[locale]}
          </span>
          <span className="text-muted-foreground">{day.pakshaName[locale]}</span>
        </Pill>

        {observances.map((item) => (
          <Pill
            key={item.key}
            href={item.href}
            tone={item.tone === "joy" ? "accent" : "primary"}
          >
            {item.glyph && <span aria-hidden="true">{item.glyph}</span>}
            <span className="font-semibold">{item.label}</span>
            {item.note && (
              <span className={item.numeric ? "tabular-nums" : undefined}>
                {item.note}
              </span>
            )}
          </Pill>
        ))}

        <Pill href="/schedule">
          <Sunrise className="size-3.5 text-primary/80" aria-hidden="true" />
          <span className="tabular-nums">{istTime(day.sunriseMs)}</span>
          <span className="text-muted-foreground">{t("sunrise")}</span>
        </Pill>

        {weather && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/50 px-3 py-1 text-xs">
            <WeatherIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
            <span className="font-medium text-foreground tabular-nums">
              {weather.temperature}°C
            </span>
            <span className="text-muted-foreground">{t("in_patna")}</span>
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Phones: one glass card floating on the hero photograph.
 *
 * The colours here are literal rather than themed, on purpose. The card rests
 * on a photograph rather than on a page surface, so it is light-on-dark in
 * both themes — themed tokens would turn it cream-on-photo in light mode and
 * it would vanish. The shade underneath is what makes that promise keepable:
 * it darkens whatever the photograph happens to be doing along its bottom
 * edge, so legibility does not depend on the picture.
 *
 * That shade is a five-stop ramp in ink rather than a two-stop one in black,
 * and both halves of that matter. Two stops fade linearly, which the eye reads
 * as a grey band with a visible top edge laid over the photo; stops that ease
 * off — steep near the card, long and shallow above it — read as the light
 * going out of the bottom of the picture. And the colour is the site's own
 * near-black brown, so what dims a warm photograph is not a cold grey.
 *
 * Which is also why the glass itself stays thin — a light fill, a hairline
 * border and just enough blur to soften the photo. The shade already does the
 * work of legibility, so the card does not need to be opaque on top of it; a
 * heavier pane would read as a grey slab dropped on the picture rather than
 * as something the picture is showing through.
 */
const SHADE =
  "linear-gradient(to top," +
  "rgba(10,6,5,0.86) 0%," +
  "rgba(10,6,5,0.66) 20%," +
  "rgba(10,6,5,0.36) 42%," +
  "rgba(10,6,5,0.14) 65%," +
  "rgba(10,6,5,0.03) 84%," +
  "rgba(10,6,5,0) 100%)";

function TodayOverlay({ className }) {
  const t = useTranslations("home.today");
  const tc = useTranslations("playground.calendar");
  const locale = useLocale();
  const { day, weather } = useToday();

  if (!day) return null;

  const observances = observancesOf(day, locale, tc);
  const WeatherIcon = weather ? (CONDITION_ICONS[weather.condition] ?? Cloud) : null;

  return (
    <div
      className={`absolute inset-x-0 bottom-0 z-10 p-3 pt-24 ${className}`}
      style={{ background: SHADE }}
    >
      {observances.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {observances.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={
                item.tone === "joy"
                  ? "inline-flex max-w-full items-center gap-1.5 rounded-full bg-brand-gold px-2.5 py-1 text-[11px] font-semibold text-brand-ink shadow-[0_6px_20px_-6px_rgba(242,166,59,0.9)] transition-transform active:scale-[0.97]"
                  : "inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.07] px-2.5 py-1 text-[11px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-md backdrop-saturate-125 transition-transform active:scale-[0.97]"
              }
            >
              {item.glyph && <span aria-hidden="true">{item.glyph}</span>}
              <span className="truncate">{item.label}</span>
              {item.note && (
                <span className={item.numeric ? "tabular-nums opacity-80" : "opacity-80"}>
                  {item.note}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}

      <Link
        href={CALENDAR_HREF}
        className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.07] p-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_10px_28px_-18px_rgba(0,0,0,0.75)] backdrop-blur-md backdrop-saturate-125 transition-transform active:scale-[0.985]"
      >
        <MoonHalo phase={day.moonPhase} className="size-11 text-lg" />

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] leading-tight font-semibold">
            {day.tithi.name[locale]}
          </span>
          <span className="mt-1 block truncate text-[11px] leading-tight text-white/70">
            {day.pakshaName[locale]} · {day.month.name[locale]}
          </span>
        </span>

        <span className="h-9 w-px shrink-0 bg-white/15" aria-hidden="true" />

        {/* The temperature and the sunrise are two separate readings that happen
            to share a corner, so they are spaced as two lines rather than set
            as one stacked block. */}
        <span className="flex shrink-0 flex-col items-end gap-1.5">
          {weather && (
            <span className="flex items-center gap-1.5 text-[13px] leading-none font-semibold tabular-nums">
              <WeatherIcon
                className="size-3.5 text-brand-gold-light"
                aria-hidden="true"
              />
              {weather.temperature}°C
            </span>
          )}
          <span className="flex items-center gap-1.5 text-[11px] leading-none text-white/70 tabular-nums">
            <Sunrise className="size-3" aria-hidden="true" />
            {istTime(day.sunriseMs)}
            <span className="sr-only"> {t("sunrise")}</span>
          </span>
        </span>
      </Link>
    </div>
  );
}

/**
 * The moon of the day, in a warm halo.
 *
 * The one ornament the strip carries, and it is here rather than in the
 * stylesheet because of what it marks: the tithi is the devotional half of the
 * reading, so the glyph that stands for it gets the lamp-light — not the
 * temperature.
 */
function MoonHalo({ phase, className = "" }) {
  return (
    <span
      className={`relative grid shrink-0 place-items-center rounded-full bg-white/10 ${className}`}
    >
      <span
        className="animate-glow-pulse absolute inset-0 rounded-full bg-brand-gold/40 blur-[10px]"
        aria-hidden="true"
      />
      <span className="relative leading-none" aria-hidden="true">
        {moonGlyph(phase)}
      </span>
    </span>
  );
}

function Pill({ href, tone = "plain", children }) {
  const tones = {
    plain: "border-border bg-card/50 text-foreground",
    primary: "border-primary/30 bg-primary/10 text-primary",
    accent:
      "border-brand-purple/30 bg-brand-purple/[0.06] text-foreground dark:bg-brand-purple/10",
  };

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-opacity active:opacity-80 ${tones[tone]}`}
    >
      {children}
    </Link>
  );
}
