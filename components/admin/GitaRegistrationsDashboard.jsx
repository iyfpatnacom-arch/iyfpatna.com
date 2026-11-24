"use client";

import { Fragment, useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Ban,
  Check,
  ChevronDown,
  CircleCheck,
  CircleX,
  Clock3,
  Download,
  RefreshCw,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/site/Panel";
import { cn } from "@/lib/utils";
import { ageFromDob, formatDob } from "@/lib/dob";
import { toggleGitaAttendance } from "@/app/[locale]/admin/registrations/actions";

/**
 * The register for the Gita festival — the quiz and the mahotsav, separately
 * and together.
 *
 * It is the course dashboard's shape, because it is the same job done by the
 * same people: everything in memory, search and filters as plain array work so
 * they answer on each keystroke, a CSV built from the filtered and sorted list
 * so what is exported is what is on screen, and a half-minute refresh so a
 * laptop at the desk sees the door's scans without anyone touching it.
 *
 * What is genuinely different is that attendance here has two axes. A row may
 * be admitted to the quiz, to the mahotsav, or to both, so a register keyed by
 * day alone could not answer "how many came to the mahotsav?" at all. So:
 *
 *   - the event filter narrows both the rows *and* the attendance columns, which
 *     is what "filter attendance per event" has to mean to be useful — picking
 *     the mahotsav should not leave quiz columns on screen to be ticked by
 *     mistake;
 *   - "Combo" is a filter of its own, because the people who paid for both are
 *     the ones the temple wants to count and to thank;
 *   - a cell is only tickable for an event that row actually paid for. The
 *     server enforces that too — a server action is a public POST whatever the
 *     table drew — but a greyed cell is the version a volunteer can see.
 */

const PAGE = 100;
const REFRESH_MS = 30_000;

const STATUS_VIEW = {
  success: {
    Icon: CircleCheck,
    className: "text-emerald-700 bg-emerald-500/12 dark:text-emerald-400",
  },
  pending: { Icon: Clock3, className: "text-amber-700 bg-amber-500/12 dark:text-amber-400" },
  failed: { Icon: CircleX, className: "text-destructive bg-destructive/10" },
  aborted: { Icon: Ban, className: "text-muted-foreground bg-muted" },
};

/* ---- Formatting --------------------------------------------------------- */

function formatter(locale, options) {
  return new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
    timeZone: "Asia/Kolkata",
    ...options,
  });
}

/** "2026-12-19" in IST, read as a calendar date rather than an instant. */
function dayDate(dayKey) {
  return new Date(`${dayKey}T12:00:00+05:30`);
}

function orderNumber(orderId) {
  return Number(String(orderId).split("-").pop()) || 0;
}

function inr(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

/* ---- CSV ---------------------------------------------------------------- */

function csvCell(value) {
  if (value === null || value === undefined) return "";
  let text = String(value);
  /* A cell starting with = + - @ is a formula to Excel and Sheets. Names,
     institutions and referral notes are free text from strangers, so defuse
     them. */
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** "2026-12-19 16:02" in IST — sortable, and read by Excel as a date. */
function csvTime(value) {
  if (!value) return "";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(value))
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

/**
 * The export, with one column per event-and-day plus a per-event total.
 *
 * `columns` is the same list the table draws, so the spreadsheet and the screen
 * cannot disagree about which days exist.
 */
function buildCsv(rows, columns, events, labelOf) {
  const header = [
    "Order ID",
    "Name",
    "Email",
    "Phone",
    "Date of birth",
    "Age",
    "Occupation",
    "Gender",
    "Institution",
    "Address",
    "Referred by",
    "Language",
    "Events",
    "Combo",
    "Amount",
    "Full price",
    "Currency",
    "Payment status",
    "Paid via",
    "Payment ID",
    "Bank reference",
    "Gateway order ID",
    "Provider",
    "Paid at (IST)",
    "Registered at (IST)",
    "Failure reason",
    "Amount mismatch",
    "Has account",
    "Confirmation emailed",
    ...events.map((event) => `${event.label} — days attended`),
    ...columns.map((column) => `${column.eventLabel} ${column.dayKey}`),
  ];

  const lines = rows.map((row) => {
    const seen = new Map(
      row.attendance.map((entry) => [`${entry.eventKey}:${entry.dayKey}`, entry]),
    );
    return [
      row.orderId,
      row.name,
      row.email,
      row.phone,
      row.dob,
      /* Recomputed from the birthday so a row registered last festival does
         not export the age it was then. */
      ageFromDob(row.dob) ?? row.age,
      row.occupation,
      row.gender,
      row.institution,
      row.address,
      row.referral,
      row.locale,
      row.events.map(labelOf).join(" + "),
      row.events.length > 1 ? "yes" : "no",
      row.amount,
      row.fullAmount,
      row.currency,
      row.status,
      row.paymentMode,
      row.trackingId,
      row.bankRefNo,
      row.gatewayOrderId,
      row.provider,
      csvTime(row.paidAt),
      csvTime(row.createdAt),
      row.failureMessage,
      row.amountMismatch ? "yes" : "no",
      row.hasAccount ? "yes" : "no",
      row.emailSent ? "yes" : "no",
      ...events.map(
        (event) => row.attendance.filter((entry) => entry.eventKey === event.key).length,
      ),
      ...columns.map((column) => {
        const entry = seen.get(`${column.eventKey}:${column.dayKey}`);
        return entry ? csvTime(entry.at) : "";
      }),
    ]
      .map(csvCell)
      .join(",");
  });

  // The BOM is what makes Excel read Devanagari names as UTF-8.
  return `﻿${[header.map(csvCell).join(","), ...lines].join("\r\n")}`;
}

function downloadCsv(content, filename) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---- Small pieces ------------------------------------------------------- */

function Stat({ label, value, hint }) {
  return (
    <Panel className="p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground tabular-nums">
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">{hint}</p> : null}
    </Panel>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
      >
        {options.map(([key, text]) => (
          <option key={key} value={key}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatusBadge({ status, label }) {
  const view = STATUS_VIEW[status] ?? STATUS_VIEW.pending;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        view.className,
      )}
    >
      <view.Icon className="size-3" aria-hidden="true" />
      {label}
    </span>
  );
}

function SortHeader({ label, sublabel, sortKey, sort, onSort, className }) {
  const active = sort.key === sortKey;
  const Icon = active ? (sort.dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      className={cn("h-10 px-2 text-left align-middle font-medium whitespace-nowrap", className)}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex flex-col items-start gap-0 rounded px-1 py-0.5 transition-colors hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        <span className="inline-flex items-center gap-1 text-xs font-semibold tracking-wide uppercase">
          {label}
          <Icon className={cn("size-3", active ? "opacity-100" : "opacity-40")} aria-hidden="true" />
        </span>
        {sublabel && (
          <span className="text-[10px] font-medium normal-case opacity-70">{sublabel}</span>
        )}
      </button>
    </th>
  );
}

function Detail({ label, value, mono }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("mt-0.5 text-sm break-words text-foreground", mono && "font-mono text-xs")}>
        {value}
      </dd>
    </div>
  );
}

/* ---- The dashboard ------------------------------------------------------ */

export function GitaRegistrationsDashboard({
  rows: initialRows,
  events,
  loadedAt,
  today,
  festivalTitle,
  fileStem,
}) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();

  /* Attendance changed from this screen, keyed by order ID, laid over the
     server's rows until the next refresh brings the same truth back. Reset
     whenever fresh rows arrive, so a scan at the door is never hidden behind a
     stale local copy. */
  const [overrides, setOverrides] = useState({});
  const [sourceRows, setSourceRows] = useState(initialRows);
  if (sourceRows !== initialRows) {
    setSourceRows(initialRows);
    setOverrides({});
  }

  const rows = useMemo(
    () =>
      initialRows.map((row) =>
        overrides[row.orderId] ? { ...row, attendance: overrides[row.orderId] } : row,
      ),
    [initialRows, overrides],
  );

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [status, setStatus] = useState("success");
  const [eventFilter, setEventFilter] = useState("all");
  const [presence, setPresence] = useState("all");
  const [sort, setSort] = useState({ key: "createdAt", dir: "desc" });
  const [limit, setLimit] = useState(PAGE);
  const [expanded, setExpanded] = useState(null);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") startRefresh(() => router.refresh());
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [router]);

  const labelOf = useMemo(() => {
    const map = new Map(events.map((event) => [event.key, event.label]));
    return (key) => map.get(key) ?? key;
  }, [events]);

  /** The events the filter has in scope — one, or all of them. */
  const scopedEvents = useMemo(
    () =>
      eventFilter === "all" || eventFilter === "combo"
        ? events
        : events.filter((event) => event.key === eventFilter),
    [events, eventFilter],
  );

  /**
   * One attendance column per event-and-day in scope.
   *
   * Each scoped event gets its own announced date (so the column exists before
   * anybody has been scanned through it), today (so the desk can always tick),
   * and every other day somebody was actually admitted — which is what catches
   * a mahotsav that ran a day longer than planned.
   */
  const columns = useMemo(() => {
    const list = [];
    for (const event of scopedEvents) {
      const days = new Set([today]);
      if (event.dateKey) days.add(event.dateKey);
      for (const row of rows) {
        for (const entry of row.attendance) {
          if (entry.eventKey === event.key) days.add(entry.dayKey);
        }
      }
      for (const dayKey of [...days].sort().reverse()) {
        list.push({ eventKey: event.key, eventLabel: event.label, dayKey });
      }
    }
    return list;
  }, [rows, scopedEvents, today]);

  const dayLabel = useMemo(() => {
    const format = formatter(locale, { day: "numeric", month: "short" });
    return (dayKey) => (dayKey === today ? t("reg_today") : format.format(dayDate(dayKey)));
  }, [locale, today, t]);

  const dateTime = useMemo(
    () => formatter(locale, { dateStyle: "medium", timeStyle: "short" }),
    [locale],
  );
  const timeOnly = useMemo(() => formatter(locale, { timeStyle: "short" }), [locale]);

  const statusLabel = (key) => t(`reg_status_${key}`);

  const stats = useMemo(() => {
    const paid = rows.filter((row) => row.status === "success");
    const here = (row, eventKey) =>
      row.attendance.some((entry) => entry.eventKey === eventKey && entry.dayKey === today);

    return {
      total: rows.length,
      paid: paid.length,
      collected: paid.reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
      pending: rows.filter((row) => row.status === "pending").length,
      combo: paid.filter((row) => row.events.length > 1).length,
      today: paid.filter((row) => row.attendance.some((entry) => entry.dayKey === today)).length,
      /* Per event: how many hold it, how many came today, how many ever. The
         three numbers the temple asks for after the festival. */
      perEvent: events.map((event) => ({
        key: event.key,
        label: event.label,
        registered: paid.filter((row) => row.events.includes(event.key)).length,
        today: paid.filter((row) => here(row, event.key)).length,
        ever: paid.filter((row) => row.attendance.some((entry) => entry.eventKey === event.key))
          .length,
      })),
    };
  }, [rows, events, today]);

  const filtered = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    const digits = needle.replace(/\D/g, "");
    const scopedKeys = scopedEvents.map((event) => event.key);

    const list = rows.filter((row) => {
      if (status !== "all" && row.status !== status) return false;

      if (eventFilter === "combo") {
        if (row.events.length < 2) return false;
      } else if (eventFilter !== "all" && !row.events.includes(eventFilter)) {
        return false;
      }

      /* Presence is asked of the events in scope, which is what makes the
         answer mean something: with the mahotsav selected, "came today" is
         about the mahotsav and not about any door they walked through. */
      const inScope = (entry) => scopedKeys.includes(entry.eventKey);
      const hereToday = row.attendance.some((entry) => inScope(entry) && entry.dayKey === today);
      const everHere = row.attendance.some(inScope);

      if (presence === "today" && !hereToday) return false;
      if (presence === "not_today" && hereToday) return false;
      if (presence === "ever" && !everHere) return false;
      if (presence === "never" && everHere) return false;

      if (!needle) return true;
      if (digits.length >= 3 && String(row.phone).includes(digits)) return true;
      return [
        row.orderId,
        row.name,
        row.email,
        row.institution,
        row.referral,
        row.trackingId,
        row.gatewayOrderId,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });

    const value = (row) => {
      if (sort.key.startsWith("cell:")) {
        const [, eventKey, dayKey] = sort.key.split(":");
        const entry = row.attendance.find(
          (item) => item.eventKey === eventKey && item.dayKey === dayKey,
        );
        return entry ? entry.at || "1" : "";
      }
      switch (sort.key) {
        case "orderId":
          return orderNumber(row.orderId);
        case "marks":
          return row.attendance.filter((entry) =>
            scopedEvents.some((event) => event.key === entry.eventKey),
          ).length;
        case "events":
          return row.events.map(labelOf).join(" + ");
        case "amount":
        case "age":
          return row[sort.key] ?? -1;
        default:
          return row[sort.key] ?? "";
      }
    };

    const direction = sort.dir === "asc" ? 1 : -1;
    return list.sort((a, b) => {
      const left = value(a);
      const right = value(b);
      if (typeof left === "number" && typeof right === "number") return (left - right) * direction;
      return (
        String(left).localeCompare(String(right), undefined, { sensitivity: "base" }) * direction
      );
    });
  }, [
    rows,
    deferredQuery,
    status,
    eventFilter,
    presence,
    sort,
    today,
    scopedEvents,
    labelOf,
  ]);

  function onSort(key) {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : {
            key,
            dir: ["name", "email", "events", "status", "institution"].includes(key)
              ? "asc"
              : "desc",
          },
    );
  }

  /* Any filter change starts the list from the top again. */
  function withReset(setter) {
    return (value) => {
      setter(value);
      setLimit(PAGE);
    };
  }

  async function onToggle(row, eventKey, dayKey, present) {
    const key = `${row.orderId}:${eventKey}:${dayKey}`;
    setBusy(key);
    try {
      const result = await toggleGitaAttendance(row.orderId, eventKey, dayKey, present);
      if (!result?.ok) throw new Error("failed");
      setOverrides((current) => ({ ...current, [row.orderId]: result.attendance }));
      toast.success(
        present
          ? t("gita_marked_present", {
              name: row.name,
              event: labelOf(eventKey),
              day: dayLabel(dayKey),
            })
          : t("gita_marked_absent", {
              name: row.name,
              event: labelOf(eventKey),
              day: dayLabel(dayKey),
            }),
      );
    } catch {
      toast.error(t("reg_toggle_failed"));
    } finally {
      setBusy(null);
    }
  }

  function onExport() {
    /* Chronological in the spreadsheet, newest-first on screen: a column order
       that reads left to right is what a spreadsheet is for. */
    const exportColumns = [...columns].sort(
      (a, b) => a.eventKey.localeCompare(b.eventKey) || a.dayKey.localeCompare(b.dayKey),
    );
    const scope = eventFilter === "all" ? "" : `-${eventFilter}`;
    const stamp = csvTime(Date.now()).replace(/[: ]/g, "-");
    downloadCsv(
      buildCsv(filtered, exportColumns, scopedEvents, labelOf),
      `${fileStem}${scope}-registrations-${stamp}.csv`,
    );
  }

  const visible = filtered.slice(0, limit);
  const columnCount = 9 + columns.length;

  return (
    <div className="mt-8">
      {/* ---- Headline numbers --------------------------------------------- */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat
          label={t("reg_stat_paid")}
          value={stats.paid}
          hint={t("reg_stat_of_total", { count: stats.total })}
        />
        <Stat label={t("reg_stat_collected")} value={inr(stats.collected)} />
        {stats.perEvent.map((event) => (
          <Stat
            key={event.key}
            label={event.label}
            value={event.registered}
            hint={t("gita_stat_event_hint", { today: event.today, ever: event.ever })}
          />
        ))}
        <Stat label={t("gita_stat_combo")} value={stats.combo} />
        <Stat label={t("reg_stat_pending")} value={stats.pending} />
      </div>

      {/* ---- Toolbar ------------------------------------------------------ */}
      <Panel className="mt-6 p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{t("reg_search")}</span>
            <span className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setLimit(PAGE);
                }}
                placeholder={t("gita_search_placeholder")}
                className="h-9 pl-8"
              />
            </span>
          </label>

          <Select
            label={t("reg_filter_status")}
            value={status}
            onChange={withReset(setStatus)}
            options={[
              ["all", t("reg_all")],
              ...["success", "pending", "failed", "aborted"].map((key) => [key, statusLabel(key)]),
            ]}
          />
          <Select
            label={t("gita_filter_event")}
            value={eventFilter}
            onChange={withReset(setEventFilter)}
            options={[
              ["all", t("reg_all")],
              ...events.map((event) => [event.key, event.label]),
              ["combo", t("gita_filter_combo")],
            ]}
          />
          <Select
            label={t("reg_filter_attendance")}
            value={presence}
            onChange={withReset(setPresence)}
            options={[
              ["all", t("reg_all")],
              ["today", t("reg_presence_today")],
              ["not_today", t("reg_presence_not_today")],
              ["ever", t("reg_presence_ever")],
              ["never", t("reg_presence_never")],
            ]}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
            {t("reg_showing", { shown: filtered.length, total: rows.length })}
            <span className="mx-2 opacity-40">·</span>
            {t("reg_updated", { time: timeOnly.format(new Date(loadedAt)) })}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="h-9 rounded-full"
              onClick={() => startRefresh(() => router.refresh())}
              disabled={refreshing}
            >
              <RefreshCw className={cn("size-4", refreshing && "animate-spin")} aria-hidden="true" />
              {t("reg_refresh")}
            </Button>
            <Button
              className="h-9 rounded-full"
              onClick={onExport}
              disabled={filtered.length === 0}
            >
              <Download className="size-4" aria-hidden="true" />
              {t("reg_export", { count: filtered.length })}
            </Button>
          </div>
        </div>
      </Panel>

      {/* ---- Table -------------------------------------------------------- */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full caption-bottom text-sm">
          <caption className="sr-only">{festivalTitle}</caption>
          <thead className="border-b border-border">
            <tr>
              <th scope="col" className="w-8 px-2">
                <span className="sr-only">{t("reg_details")}</span>
              </th>
              <SortHeader label={t("reg_col_order")} sortKey="orderId" sort={sort} onSort={onSort} />
              <SortHeader label={t("reg_col_name")} sortKey="name" sort={sort} onSort={onSort} />
              <SortHeader label={t("reg_col_phone")} sortKey="phone" sort={sort} onSort={onSort} />
              <SortHeader
                label={t("gita_col_events")}
                sortKey="events"
                sort={sort}
                onSort={onSort}
              />
              <SortHeader label={t("reg_col_status")} sortKey="status" sort={sort} onSort={onSort} />
              <SortHeader
                label={t("reg_col_amount")}
                sortKey="amount"
                sort={sort}
                onSort={onSort}
                className="text-right"
              />
              <SortHeader
                label={t("reg_col_registered")}
                sortKey="createdAt"
                sort={sort}
                onSort={onSort}
              />
              {columns.map((column) => (
                <SortHeader
                  key={`${column.eventKey}:${column.dayKey}`}
                  label={column.eventLabel}
                  sublabel={dayLabel(column.dayKey)}
                  sortKey={`cell:${column.eventKey}:${column.dayKey}`}
                  sort={sort}
                  onSort={onSort}
                  className={cn("text-center", column.dayKey === today && "bg-primary/[0.06]")}
                />
              ))}
              <SortHeader
                label={t("gita_col_marks")}
                sortKey="marks"
                sort={sort}
                onSort={onSort}
                className="text-center"
              />
            </tr>
          </thead>

          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="px-4 py-16 text-center text-muted-foreground">
                  {rows.length === 0 ? t("gita_empty") : t("reg_no_match")}
                </td>
              </tr>
            ) : (
              visible.map((row) => {
                const open = expanded === row.orderId;
                const paid = row.status === "success";
                const marks = row.attendance.filter((entry) =>
                  scopedEvents.some((event) => event.key === entry.eventKey),
                ).length;
                return (
                  <Fragment key={row.orderId}>
                    <tr
                      className={cn(
                        "border-b border-border/70 transition-colors hover:bg-muted/40",
                        open && "bg-muted/40",
                      )}
                    >
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() => setExpanded(open ? null : row.orderId)}
                          aria-expanded={open}
                          aria-label={t("reg_details_for", { name: row.name })}
                          className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <ChevronDown
                            className={cn("size-4 transition-transform", open && "rotate-180")}
                            aria-hidden="true"
                          />
                        </button>
                      </td>
                      <td className="px-2 py-2 font-mono text-xs whitespace-nowrap text-foreground">
                        {row.orderId}
                        {row.amountMismatch && (
                          <AlertTriangle
                            className="ms-1 inline size-3.5 text-destructive"
                            aria-label={t("reg_mismatch")}
                          />
                        )}
                      </td>
                      <td
                        className="max-w-56 truncate px-2 py-2 font-medium text-foreground"
                        title={row.name}
                      >
                        {row.name}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap tabular-nums">
                        <a href={`tel:+91${row.phone}`} className="hover:text-primary hover:underline">
                          {row.phone}
                        </a>
                      </td>
                      <td className="px-2 py-2">
                        <span className="flex flex-wrap gap-1">
                          {row.events.map((key) => (
                            <span
                              key={key}
                              className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-primary"
                            >
                              {labelOf(key)}
                            </span>
                          ))}
                        </span>
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        <StatusBadge status={row.status} label={statusLabel(row.status)} />
                      </td>
                      <td className="px-2 py-2 text-right whitespace-nowrap tabular-nums">
                        {inr(row.amount)}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-muted-foreground tabular-nums">
                        {row.createdAt ? dateTime.format(new Date(row.createdAt)) : "—"}
                      </td>

                      {columns.map((column) => {
                        const entry = row.attendance.find(
                          (item) =>
                            item.eventKey === column.eventKey && item.dayKey === column.dayKey,
                        );
                        const key = `${row.orderId}:${column.eventKey}:${column.dayKey}`;
                        /* Not an event they paid for: there is nothing to mark,
                           and an enabled box would invite marking it. */
                        const holds = row.events.includes(column.eventKey);
                        return (
                          <td
                            key={key}
                            className={cn(
                              "px-2 py-2 text-center",
                              column.dayKey === today && "bg-primary/[0.04]",
                            )}
                          >
                            {holds ? (
                              <button
                                type="button"
                                disabled={!paid || busy === key}
                                onClick={() =>
                                  onToggle(row, column.eventKey, column.dayKey, !entry)
                                }
                                aria-pressed={Boolean(entry)}
                                aria-label={t(entry ? "gita_unmark" : "gita_mark", {
                                  name: row.name,
                                  event: column.eventLabel,
                                  day: dayLabel(column.dayKey),
                                })}
                                title={
                                  entry?.at
                                    ? `${timeOnly.format(new Date(entry.at))} · ${t(
                                        `reg_source_${entry.source || "qr"}`,
                                      )}`
                                    : undefined
                                }
                                className={cn(
                                  "inline-flex h-7 min-w-7 items-center justify-center gap-1 rounded-md border px-1.5 text-xs font-medium tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-30",
                                  entry
                                    ? "border-emerald-600/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                    : "border-border text-transparent hover:border-primary/50 hover:text-muted-foreground",
                                )}
                              >
                                {busy === key ? (
                                  <RefreshCw
                                    className="size-3.5 animate-spin text-muted-foreground"
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <Check className="size-3.5" aria-hidden="true" />
                                )}
                                {entry?.at ? timeOnly.format(new Date(entry.at)) : null}
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground/40" aria-hidden="true">
                                —
                              </span>
                            )}
                          </td>
                        );
                      })}

                      <td className="px-2 py-2 text-center font-semibold tabular-nums">{marks}</td>
                    </tr>

                    {open && (
                      <tr className="border-b border-border/70 bg-muted/20">
                        <td colSpan={columnCount} className="px-4 py-4 sm:px-12">
                          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
                            <Detail label={t("reg_col_email")} value={row.email} />
                            <Detail label={t("gita_d_dob")} value={formatDob(row.dob)} />
                            <Detail
                              label={t("reg_d_age")}
                              value={ageFromDob(row.dob) ?? row.age}
                            />
                            <Detail
                              label={t("reg_d_occupation")}
                              value={row.occupation ? t(`reg_occ_${row.occupation}`) : null}
                            />
                            <Detail
                              label={t("gita_d_gender")}
                              value={row.gender ? t(`gita_gender_${row.gender}`) : null}
                            />
                            <Detail label={t("gita_d_institution")} value={row.institution} />
                            <Detail label={t("gita_d_referral")} value={row.referral} />
                            {/* Only on rows old enough to have been asked. */}
                            {row.address && (
                              <Detail label={t("gita_d_address")} value={row.address} />
                            )}
                            <Detail
                              label={t("reg_d_language")}
                              value={
                                row.locale === "hi"
                                  ? "हिन्दी"
                                  : row.locale === "en"
                                    ? "English"
                                    : null
                              }
                            />
                            <Detail
                              label={t("gita_d_full_price")}
                              value={
                                row.fullAmount && row.fullAmount > row.amount
                                  ? t("gita_d_saved", {
                                      full: inr(row.fullAmount),
                                      saved: inr(row.fullAmount - row.amount),
                                    })
                                  : null
                              }
                            />
                            <Detail
                              label={t("reg_d_paid_at")}
                              value={row.paidAt ? dateTime.format(new Date(row.paidAt)) : null}
                            />
                            <Detail label={t("reg_d_paid_via")} value={row.paymentMode} />
                            <Detail label={t("reg_d_payment_id")} value={row.trackingId} mono />
                            <Detail label={t("reg_d_bank_ref")} value={row.bankRefNo} mono />
                            <Detail
                              label={t("reg_d_gateway_order")}
                              value={row.gatewayOrderId}
                              mono
                            />
                            <Detail label={t("reg_d_provider")} value={row.provider} />
                            <Detail label={t("reg_d_failure")} value={row.failureMessage} />
                            <Detail
                              label={t("reg_d_account")}
                              value={row.hasAccount ? t("reg_yes") : t("reg_no")}
                            />
                            <Detail
                              label={t("reg_d_emailed")}
                              value={row.emailSent ? t("reg_yes") : t("reg_no")}
                            />
                            <Detail
                              label={t("reg_d_mismatch")}
                              value={row.amountMismatch ? t("reg_mismatch") : null}
                            />
                            <Detail
                              label={t("reg_d_attendance")}
                              value={
                                row.attendance.length
                                  ? [...row.attendance]
                                      .sort(
                                        (a, b) =>
                                          a.eventKey.localeCompare(b.eventKey) ||
                                          a.dayKey.localeCompare(b.dayKey),
                                      )
                                      .map(
                                        (entry) =>
                                          `${labelOf(entry.eventKey)} · ${dayLabel(entry.dayKey)} ${
                                            entry.at ? timeOnly.format(new Date(entry.at)) : ""
                                          } (${t(`reg_source_${entry.source || "qr"}`)})`,
                                      )
                                      .join(" · ")
                                  : t("reg_never")
                              }
                            />
                          </dl>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > limit && (
        <div className="mt-4 text-center">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => setLimit((current) => current + PAGE)}
          >
            {t("reg_show_more", { count: Math.min(PAGE, filtered.length - limit) })}
          </Button>
        </div>
      )}
    </div>
  );
}
