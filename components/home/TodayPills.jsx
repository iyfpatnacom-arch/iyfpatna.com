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
 * The strip under the hero: what day it is, in the calendar that matters here,
 * plus the weather.
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

export function TodayPills() {
  const t = useTranslations("home.today");
  const tc = useTranslations("playground.calendar");
  const locale = useLocale();

  const isClient = useIsClient();
  const [weather, setWeather] = useState(null);

  // Computed during render rather than in an effect, but only once the client
  // snapshot is in force — so the prerendered HTML carries no date at all and
  // there is nothing for hydration to disagree with.
  const day = useMemo(() => (isClient ? panchangToday() : null), [isClient]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/weather")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data.temperature === "number") {
          setWeather(data);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Before mount there is nothing true to say, and a skeleton on the front
  // page costs more than the strip is worth.
  if (!day) return null;

  const festival = day.festivals[0];
  const WeatherIcon = weather ? (CONDITION_ICONS[weather.condition] ?? Cloud) : null;

  return (
    <section className="border-b border-border/70 bg-muted/20">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
        <Pill href="/playground/vaishnava-calendar">
          <span aria-hidden="true">{moonGlyph(day.moonPhase)}</span>
          <span className="font-medium text-foreground">
            {day.tithi.name[locale]}
          </span>
          <span className="text-muted-foreground">{day.pakshaName[locale]}</span>
        </Pill>

        {day.ekadashi?.fast && (
          <Pill href="/playground/vaishnava-calendar" tone="primary">
            <span className="font-semibold">
              {day.ekadashi.name ? day.ekadashi.name[locale] : tc("legend_ekadashi")}
            </span>
            <span>{tc("fast_today")}</span>
          </Pill>
        )}

        {day.parana && (
          <Pill href="/playground/vaishnava-calendar" tone="primary">
            <span className="font-semibold">{tc("parana")}</span>
            <span className="tabular-nums">
              {istTime(day.parana.startMs)}–{istTime(day.parana.endMs)}
            </span>
          </Pill>
        )}

        {festival && (
          <Pill href="/festivals" tone="accent">
            <span aria-hidden="true">🪔</span>
            <span className="font-medium">{festival.name[locale]}</span>
          </Pill>
        )}

        <Pill href="/schedule">
          <Sunrise className="size-3.5" aria-hidden="true" />
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
    </section>
  );
}

function Pill({ href, tone = "plain", children }) {
  const tones = {
    plain: "border-border bg-card/50 text-foreground",
    primary: "border-primary/30 bg-primary/10 text-primary",
    accent: "border-brand-purple/30 bg-brand-purple/[0.06] text-foreground dark:bg-brand-purple/10",
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
