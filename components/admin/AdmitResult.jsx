"use client";

import { useLocale, useTranslations } from "next-intl";
import { CircleAlert, CircleCheck, CircleX, History, LoaderCircle, SplitSquareVertical } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The verdict at the door, sized to be read at arm's length in a hurry.
 *
 * One colour, one icon and one word per outcome — green to let them in, amber
 * when the pass was already used today, red otherwise — with the person's name
 * under it so the volunteer can check it against the face in front of them.
 *
 * One outcome is a question rather than a verdict. A Gita festival pass bought
 * at the combined fee is good for two events, and on any day that is not one of
 * their dates nothing can tell which queue the holder is standing in. Rather
 * than guess and put a wrong number in the register, the screen asks — two
 * buttons, in the same place the verdict would have been.
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
  choose_event: {
    Icon: SplitSquareVertical,
    className: "border-primary/45 bg-primary/10 text-foreground",
  },
  wrong_event: {
    Icon: CircleAlert,
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

/**
 * `onPickEvent(eventKey)` is called when the volunteer answers the question. It
 * is optional: without it the options are still listed, so a screen that cannot
 * act on the choice at least tells the volunteer what the pass covers.
 */
export function AdmitResult({ result, className, onPickEvent, busy = false }) {
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

  const asking = result.status === "choose_event" || result.status === "wrong_event";

  return (
    <div
      role="status"
      aria-live="assertive"
      className={cn("rounded-2xl border-2 p-6 text-center", view.className, className)}
    >
      <view.Icon className="mx-auto size-14" aria-hidden="true" />
      <p className="mt-3 text-2xl font-bold tracking-tight">{t(`admit_${result.status}`)}</p>

      {/* Which event was marked. On a green screen this is the line that stops
          a volunteer wondering whether the right box was ticked. */}
      {result.eventLabel && result.status !== "choose_event" && (
        <p className="mt-1 text-sm font-semibold">{result.eventLabel}</p>
      )}

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

      {asking && result.options?.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-medium">{t("admit_choose_event_prompt")}</p>
          <div className="mt-3 grid gap-2.5">
            {result.options.map((option) => (
              <button
                key={option.key}
                type="button"
                disabled={busy || !onPickEvent}
                onClick={() => onPickEvent?.(option.key)}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {busy ? (
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                ) : null}
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
