import { useFormatter, useTranslations } from "next-intl";

/**
 * A place's opening times.
 *
 * Times are stored in `lib/campus/places.js` as 24-hour "HH:MM" strings and
 * formatted per locale here, exactly as the daily schedule page does it — so
 * Hindi gets its own meridiem instead of a second hardcoded copy of every
 * time sitting in the message files, drifting.
 *
 * Two windows rather than one is the normal case and not an edge case: the
 * altar closes while the deities rest and Govinda's closes between lunch and
 * dinner, so "11:30 – 15:00, 19:00 – 21:30" is the honest answer and a single
 * "11:30 – 21:30" would send someone across the city at four in the afternoon.
 *
 * No "open now" badge. It would need the visitor's clock rather than Patna's,
 * it would be wrong on every festival day and Ekadashi — which the schedule
 * page already warns about in as many words — and being confidently wrong
 * about whether the kitchen is open is worse than making someone read a range.
 */
export function Hours({ hours, className }) {
  const t = useTranslations("campus");
  const format = useFormatter();

  const formatTime = (hhmm) => {
    const [hour, minute] = hhmm.split(":").map(Number);
    return format.dateTime(new Date(2000, 0, 1, hour, minute), {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (!hours || hours.length === 0) {
    return <span className={className}>{t("hours_none")}</span>;
  }

  return (
    <span className={className}>
      {hours
        .map((window) =>
          t("hours_range", {
            open: formatTime(window.open),
            close: formatTime(window.close),
          })
        )
        .join(", ")}
    </span>
  );
}

/** "Ground floor" / "Floor 2", the one place that mapping is written down. */
export function floorLabel(t, floor) {
  return floor === 0 ? t("floor_ground") : t("floor_upper", { n: floor });
}
