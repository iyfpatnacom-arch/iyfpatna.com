"use client";

import { useLocale, useTranslations } from "next-intl";
import { CircleAlert, CircleCheck, CircleX, History } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The verdict at the door, sized to be read at arm's length in a hurry.
 *
 * One colour, one icon and one word per outcome — green to let them in, amber
 * when the pass was already used today, red otherwise — with the person's name
 * under it so the volunteer can check it against the face in front of them.
 */

const VIEW = {
  admitted: {
    Icon: CircleCheck,
    className: "border-emerald-600/40 bg-emerald-500/12 text-emerald-800 dark:text-emerald-300",
  },
  already: {
    Icon: History,
    className: "border-amber-600/40 bg-amber-500/12 text-amber-800 dark:text-amber-300",
  },
  unpaid: {
    Icon: CircleAlert,
    className: "border-destructive/40 bg-destructive/10 text-destructive",
  },
  not_found: {
    Icon: CircleX,
    className: "border-destructive/40 bg-destructive/10 text-destructive",
  },
  invalid: {
    Icon: CircleX,
    className: "border-destructive/40 bg-destructive/10 text-destructive",
  },
};

export function AdmitResult({ result, className }) {
  const t = useTranslations("admin");
  const locale = useLocale();
  if (!result) return null;

  const view = VIEW[result.status] ?? VIEW.invalid;
  const person = result.person;
  const time = result.at
    ? new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      }).format(new Date(result.at))
    : null;

  return (
    <div
      role="status"
      aria-live="assertive"
      className={cn("rounded-2xl border-2 p-6 text-center", view.className, className)}
    >
      <view.Icon className="mx-auto size-14" aria-hidden="true" />
      <p className="mt-3 text-2xl font-bold tracking-tight">{t(`admit_${result.status}`)}</p>
      {result.status === "already" && time && (
        <p className="mt-1 text-sm font-medium">{t("admit_already_at", { time })}</p>
      )}

      {person && (
        <div className="mt-5 rounded-xl bg-background/70 p-4 text-left text-foreground">
          <p className="text-xl font-semibold">{person.name}</p>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            {person.orderId} · {person.phone}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {person.courseTitle}
            {person.modeLabel ? ` · ${person.modeLabel}` : ""}
          </p>
          {person.mode === "online" && result.status === "admitted" && (
            <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-400">
              {t("admit_online_note")}
            </p>
          )}
          {person.attendance?.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t("admit_days", { count: person.attendance.length })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
