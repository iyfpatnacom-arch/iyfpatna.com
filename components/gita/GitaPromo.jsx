import { getTranslations } from "next-intl/server";
import { GitaPromoModal } from "@/components/gita/GitaPromoModal";
import { eventOf, formatINR, getFestival } from "@/lib/gita-event/catalog";

/**
 * The festival popup's server half: it reads the catalog so the client half
 * does not have to.
 *
 * This split exists for one reason. `lib/gita-event/catalog.js` reaches
 * `lib/settings`, and through it mongoose, so importing it from a client
 * component drags a database driver into the browser bundle — the same reason
 * the festival page localises the carousel's alt text before handing it over.
 * So the prices, the dates and the poster are read here, in a server
 * component, and the popup is handed finished strings.
 *
 * No feature-flag read and no date check here either, both deliberately. The
 * homepage is prerendered, so anything decided in this file is decided once at
 * build time; whether the popup is still in season is the browser's call (see
 * `GitaPromoModal`). This file only answers "what does it say".
 */
export async function GitaPromo({ locale }) {
  const t = await getTranslations({ locale, namespace: "gita" });
  const festival = getFestival();
  const lang = locale === "en" ? "en" : "hi";

  const quiz = eventOf("quiz");
  const prizePool = festival.prizes.reduce((sum, prize) => sum + Number(prize.amount), 0);

  /* "19 Dec" rather than "19 December 2026": the popup gives each figure a
     third of a 28rem card and one line, and the year is the part nobody is in
     doubt about. Formatted from the catalog's own ISO date rather than written
     out again, so it cannot drift from the page's `dateLabel`. Fixed to UTC
     because the date is stored as a bare day — read in any timezone behind it,
     the 19th becomes the 18th. */
  const shortDate = quiz?.date
    ? new Intl.DateTimeFormat(lang === "en" ? "en-IN" : "hi-IN", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }).format(new Date(quiz.date))
    : null;

  /* The same three figures the festival page leads with, in the same order
     somebody asks them: what can be won, when, what it costs. */
  const facts = [
    { icon: "trophy", label: t("hero_prize_pool"), value: formatINR(prizePool) },
    { icon: "calendar", label: t("hero_quiz_date"), value: shortDate || "—" },
    {
      icon: "ticket",
      label: t("hero_fee"),
      value: formatINR(Number(festival.events[0].amount)),
    },
  ];

  return (
    <GitaPromoModal
      href="/gita-mahotsav"
      poster={{
        src: festival.poster.src,
        width: festival.poster.width,
        height: festival.poster.height,
        alt: festival.poster.alt?.[lang] || festival.poster.alt?.en || "",
      }}
      eyebrow={festival.eyebrow[lang] || festival.eyebrow.en}
      lines={festival.posterLines.map((line) => line[lang] || line.en)}
      title={festival.title[lang] || festival.title.en}
      facts={facts}
    />
  );
}
