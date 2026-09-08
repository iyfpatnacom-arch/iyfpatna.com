"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Share2,
  Sunrise,
} from "lucide-react";
import { Panel } from "@/components/site/Panel";
import { ChipRow, Stepper, TabBar, TimeField, ToggleRow } from "./controls";
import {
  shiftKey,
  syncUp,
  todayKey,
  useLocalState,
  useOutboxFlush,
} from "@/lib/playground/local";
import { haptic } from "@/lib/playground/haptics";
import { useSignedIn } from "./SignedInProvider";
import { panchangForDay } from "@/lib/panchang";
import { cn } from "@/lib/utils";

/**
 * The sadhana card — the paper sheet IYF Patna already runs on.
 *
 * The design constraint that matters is that nobody is being asked to adopt a
 * new habit. The sheet exists, it is filled in every week, and the only thing
 * this replaces is the paper. So the fields are the paper's fields in the
 * paper's order, the day is the unit, and the share button produces the same
 * summary people already send to their counsellor over WhatsApp — because that
 * is the step the paper version ends with too.
 *
 * State lives in `localStorage` keyed by date. Signing in adds a mirror on the
 * server and nothing else; the card is fully usable, forever, without one.
 */

const STORAGE_KEY = "sadhana";
const MINUTE_PRESETS = [0, 10, 20, 30, 45, 60];

const EMPTY_ENTRY = {
  rounds: 0,
  roundsBeforeTen: 0,
  mangalaArati: false,
  tulasiPuja: false,
  readingMinutes: 0,
  hearingMinutes: 0,
  sevaMinutes: 0,
  wakeTime: "",
  sleepTime: "",
  principles: false,
  note: "",
};

/** Has anything at all been recorded for this day? */
function isFilled(entry) {
  if (!entry) return false;
  return (
    entry.rounds > 0 ||
    entry.mangalaArati ||
    entry.tulasiPuja ||
    entry.principles ||
    entry.readingMinutes > 0 ||
    entry.hearingMinutes > 0 ||
    entry.sevaMinutes > 0 ||
    Boolean(entry.wakeTime) ||
    Boolean(entry.sleepTime) ||
    Boolean(entry.note)
  );
}

export function SadhanaCard() {
  const t = useTranslations("playground.sadhana");
  const locale = useLocale();
  const signedIn = useSignedIn();

  const [log, setLog, hydrated] = useLocalState(STORAGE_KEY, {});
  const [tab, setTab] = useState("today");
  const [selected, setSelected] = useState(() => todayKey());
  const [monthAnchor, setMonthAnchor] = useState(() => todayKey().slice(0, 7));

  useOutboxFlush(signedIn);

  /* Pull the server's copy once, for a device that has never seen this
     account. Local entries win every conflict: this device is where the
     person actually filled the card in, and a stale server row must never
     overwrite what is in front of them. */
  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    fetch("/api/sadhana")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data?.entries) return;
        setLog((current) => {
          const merged = { ...current };
          for (const [date, entry] of Object.entries(data.entries)) {
            if (!merged[date]) merged[date] = { ...EMPTY_ENTRY, ...entry };
          }
          return merged;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [signedIn, setLog]);

  const entry = { ...EMPTY_ENTRY, ...(log[selected] ?? {}) };

  const update = useCallback(
    (patch) => {
      setLog((current) => {
        const next = {
          ...current,
          [selected]: { ...EMPTY_ENTRY, ...(current[selected] ?? {}), ...patch },
        };
        syncUp(
          "/api/sadhana",
          { date: selected, ...next[selected] },
          { enabled: signedIn, dedupeKey: selected }
        );
        return next;
      });
    },
    [selected, setLog, signedIn]
  );

  const today = todayKey();
  const atToday = selected >= today;

  return (
    <div className="flex flex-col gap-5">
      <TabBar
        value={tab}
        onChange={setTab}
        tabs={[
          {
            key: "today",
            label: t("tab_day"),
            icon: <ListChecks className="size-4" aria-hidden="true" />,
          },
          {
            key: "month",
            label: t("tab_month"),
            icon: <CalendarDays className="size-4" aria-hidden="true" />,
          },
        ]}
      />

      {!hydrated ? (
        <CardSkeleton />
      ) : tab === "today" ? (
        <DayEditor
          t={t}
          locale={locale}
          dayKey={selected}
          entry={entry}
          update={update}
          onShift={(delta) => {
            const next = shiftKey(selected, delta);
            if (next > today) return;
            haptic("bead");
            setSelected(next);
          }}
          atToday={atToday}
          signedIn={signedIn}
        />
      ) : (
        <MonthView
          t={t}
          locale={locale}
          log={log}
          month={monthAnchor}
          onMonthShift={(delta) => setMonthAnchor(shiftMonth(monthAnchor, delta))}
          onPickDay={(dayKey) => {
            setSelected(dayKey);
            setTab("today");
            haptic("confirm");
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------ day editor */

function DayEditor({ t, locale, dayKey, entry, update, onShift, atToday, signedIn }) {
  const panchang = useMemo(() => panchangForDay(dayKey), [dayKey]);

  return (
    <>
      <Panel className="p-4">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onShift(-1)}
            aria-label={t("previous_day")}
            className="grid size-10 place-items-center rounded-xl border border-border bg-card/60 text-foreground"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>

          <div className="min-w-0 text-center">
            <p className="truncate text-sm font-semibold text-foreground">
              {formatDay(dayKey, locale)}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {panchang.tithi.name[locale]} · {panchang.pakshaName[locale]}
              {panchang.ekadashi?.fast ? ` · ${t("ekadashi")}` : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onShift(1)}
            disabled={atToday}
            aria-label={t("next_day")}
            className="grid size-10 place-items-center rounded-xl border border-border bg-card/60 text-foreground disabled:opacity-30"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </Panel>

      <Section title={t("group_japa")}>
        <Stepper
          size="lg"
          label={t("rounds")}
          hint={t("rounds_hint")}
          value={entry.rounds}
          onChange={(rounds) =>
            update({
              rounds,
              // The sheet's second column can never exceed the first, and
              // silently correcting it is kinder than refusing the tap.
              roundsBeforeTen: Math.min(entry.roundsBeforeTen, rounds),
            })
          }
          max={200}
        />
        <Divider />
        <Stepper
          label={t("rounds_before_ten")}
          hint={t("rounds_before_ten_hint")}
          value={entry.roundsBeforeTen}
          onChange={(roundsBeforeTen) => update({ roundsBeforeTen })}
          max={entry.rounds}
        />
      </Section>

      <Section title={t("group_morning")}>
        <ToggleRow
          label={t("mangala_arati")}
          hint={t("mangala_arati_hint")}
          checked={entry.mangalaArati}
          onChange={(mangalaArati) => update({ mangalaArati })}
        />
        <ToggleRow
          label={t("tulasi_puja")}
          checked={entry.tulasiPuja}
          onChange={(tulasiPuja) => update({ tulasiPuja })}
        />
        <ToggleRow
          label={t("principles")}
          hint={t("principles_hint")}
          checked={entry.principles}
          onChange={(principles) => update({ principles })}
        />
      </Section>

      <Section title={t("group_hearing")}>
        <ChipRow
          label={t("reading")}
          options={MINUTE_PRESETS}
          value={entry.readingMinutes}
          onChange={(readingMinutes) => update({ readingMinutes })}
          format={(v) => (v === 0 ? "—" : t("minutes", { count: v }))}
        />
        <ChipRow
          label={t("hearing")}
          options={MINUTE_PRESETS}
          value={entry.hearingMinutes}
          onChange={(hearingMinutes) => update({ hearingMinutes })}
          format={(v) => (v === 0 ? "—" : t("minutes", { count: v }))}
        />
        <ChipRow
          label={t("seva")}
          options={MINUTE_PRESETS}
          value={entry.sevaMinutes}
          onChange={(sevaMinutes) => update({ sevaMinutes })}
          format={(v) => (v === 0 ? "—" : t("minutes", { count: v }))}
        />
      </Section>

      <Section title={t("group_rest")}>
        <TimeField
          label={t("wake_time")}
          value={entry.wakeTime}
          onChange={(wakeTime) => update({ wakeTime })}
        />
        <Divider />
        <TimeField
          label={t("sleep_time")}
          value={entry.sleepTime}
          onChange={(sleepTime) => update({ sleepTime })}
        />
      </Section>

      <Section title={t("group_note")}>
        <textarea
          value={entry.note}
          onChange={(event) => update({ note: event.target.value.slice(0, 500) })}
          rows={3}
          placeholder={t("note_placeholder")}
          className="w-full resize-none rounded-xl border border-border bg-card/60 p-3 text-sm text-foreground placeholder:text-muted-foreground/70"
        />
      </Section>

      <p className="text-center text-xs text-muted-foreground">
        {signedIn ? t("saved_synced") : t("saved_local")}
      </p>
    </>
  );
}

/* ------------------------------------------------------------ month view */

function MonthView({ t, locale, log, month, onMonthShift, onPickDay }) {
  const days = useMemo(() => monthDays(month), [month]);
  const today = todayKey();

  const totals = useMemo(() => {
    let rounds = 0;
    let mangala = 0;
    let filled = 0;
    let minutes = 0;
    for (const dayKey of days) {
      const entry = log[dayKey];
      if (!isFilled(entry)) continue;
      filled += 1;
      rounds += entry.rounds ?? 0;
      minutes += (entry.readingMinutes ?? 0) + (entry.hearingMinutes ?? 0);
      if (entry.mangalaArati) mangala += 1;
    }
    return { rounds, mangala, filled, minutes };
  }, [days, log]);

  // The first cell of the grid has to sit under the right weekday name.
  const leadingBlanks = new Date(`${days[0]}T00:00:00Z`).getUTCDay();

  return (
    <>
      <Panel className="p-4">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onMonthShift(-1)}
            aria-label={t("previous_month")}
            className="grid size-10 place-items-center rounded-xl border border-border bg-card/60"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <p className="text-sm font-semibold text-foreground">
            {formatMonth(month, locale)}
          </p>
          <button
            type="button"
            onClick={() => onMonthShift(1)}
            disabled={month >= today.slice(0, 7)}
            aria-label={t("next_month")}
            className="grid size-10 place-items-center rounded-xl border border-border bg-card/60 disabled:opacity-30"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 text-center">
          {weekdayInitials(locale).map((initial, index) => (
            <span
              key={index}
              className="pb-1 text-[10px] font-semibold text-muted-foreground"
            >
              {initial}
            </span>
          ))}

          {Array.from({ length: leadingBlanks }, (_, index) => (
            <span key={`blank-${index}`} />
          ))}

          {days.map((dayKey) => {
            const entry = log[dayKey];
            const filled = isFilled(entry);
            const rounds = entry?.rounds ?? 0;
            // Sixteen rounds is the initiated standard, so the bar reads
            // against that and simply tops out above it.
            const fill = Math.min(1, rounds / 16);
            const isFuture = dayKey > today;

            return (
              <button
                key={dayKey}
                type="button"
                disabled={isFuture}
                onClick={() => onPickDay(dayKey)}
                className={cn(
                  "relative flex aspect-square flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg border text-[11px] font-semibold transition-colors",
                  isFuture
                    ? "border-transparent text-muted-foreground/30"
                    : filled
                      ? "border-primary/30 text-foreground"
                      : "border-border/60 text-muted-foreground active:bg-muted",
                  dayKey === today && "ring-1 ring-primary"
                )}
              >
                {fill > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 bg-primary/20"
                    style={{ height: `${fill * 100}%` }}
                  />
                )}
                <span className="relative">{Number(dayKey.slice(8))}</span>
                {rounds > 0 && (
                  <span className="relative text-[9px] font-medium text-primary">
                    {rounds}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
        <Stat label={t("stat_rounds")} value={totals.rounds} />
        <Stat label={t("stat_days")} value={totals.filled} />
        <Stat label={t("stat_mangala")} value={totals.mangala} />
        <Stat
          label={t("stat_minutes")}
          value={t("minutes", { count: totals.minutes })}
        />
      </Panel>

      <ShareButton t={t} locale={locale} log={log} />
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

/* ---------------------------------------------------------------- share */

/**
 * The last seven days as a message.
 *
 * This is the whole point of digitising the sheet rather than a nicety: the
 * paper card's final step is showing it to a counsellor, and for most people
 * that already happens as a photograph sent over WhatsApp. Producing the text
 * directly skips the photograph.
 */
function ShareButton({ t, locale, log }) {
  const [copied, setCopied] = useState(false);

  const buildText = () => {
    const lines = [t("share_heading")];
    let rounds = 0;
    let mangala = 0;

    for (let offset = 6; offset >= 0; offset -= 1) {
      const dayKey = shiftKey(todayKey(), -offset);
      const entry = log[dayKey];
      if (!isFilled(entry)) {
        lines.push(`${formatShort(dayKey, locale)} — ${t("share_blank")}`);
        continue;
      }
      rounds += entry.rounds ?? 0;
      if (entry.mangalaArati) mangala += 1;

      const parts = [t("share_rounds", { count: entry.rounds ?? 0 })];
      if (entry.mangalaArati) parts.push(t("mangala_arati"));
      const study = (entry.readingMinutes ?? 0) + (entry.hearingMinutes ?? 0);
      if (study > 0) parts.push(t("share_study", { count: study }));
      lines.push(`${formatShort(dayKey, locale)} — ${parts.join(" · ")}`);
    }

    lines.push("");
    lines.push(t("share_total", { rounds, mangala }));
    return lines.join("\n");
  };

  const share = async () => {
    const text = buildText();
    haptic("confirm");

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // Dismissed, or refused by the browser. Fall through to the copy.
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      // Clipboard blocked: hand it to WhatsApp's own composer instead, which
      // needs no permission at all.
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity active:opacity-90"
    >
      <Share2 className="size-4" aria-hidden="true" />
      {copied ? t("share_copied") : t("share_week")}
    </button>
  );
}

/* ------------------------------------------------------------- fragments */

function Section({ title, children }) {
  return (
    <Panel className="p-4">
      <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        <Sunrise className="size-3.5" aria-hidden="true" />
        {title}
      </h2>
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </Panel>
  );
}

function Divider() {
  return <span className="h-px bg-border/70" aria-hidden="true" />;
}

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <div key={index} className="h-32 animate-pulse rounded-xl bg-muted/40" />
      ))}
    </div>
  );
}

/* ----------------------------------------------------------- date helpers */

function shiftMonth(month, delta) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return date.toISOString().slice(0, 7);
}

function monthDays(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  const last = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return Array.from(
    { length: last },
    (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`
  );
}

const intlLocale = (locale) => (locale === "hi" ? "hi-IN" : "en-IN");

function formatDay(dayKey, locale) {
  return new Date(`${dayKey}T00:00:00Z`).toLocaleDateString(intlLocale(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

function formatShort(dayKey, locale) {
  return new Date(`${dayKey}T00:00:00Z`).toLocaleDateString(intlLocale(locale), {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function formatMonth(month, locale) {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString(intlLocale(locale), {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function weekdayInitials(locale) {
  const formatter = new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: "narrow",
    timeZone: "UTC",
  });
  // 4 January 1970 was a Sunday, which is where the grid starts.
  return Array.from({ length: 7 }, (_, index) =>
    formatter.format(new Date(Date.UTC(1970, 0, 4 + index)))
  );
}
