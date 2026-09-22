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
import { toggleAttendance } from "@/app/[locale]/admin/registrations/actions";

/**
 * The registrations table for one course.
 *
 * Every row is already in memory, so search, filters and sort are plain array
 * work and answer on each keystroke. The CSV is built from the same filtered,
 * sorted list, so what is exported is what is on screen.
 *
 * Attendance is shown one column per day anyone has been admitted, plus today.
 * A tick box per cell lets the desk correct the door; the scanner is the
 * normal way in. On event days the table refreshes itself every half minute so
 * a laptop at the desk sees the door's scans without anyone touching it.
 */

const PAGE = 100;
const REFRESH_MS = 30_000;

const STATUS_VIEW = {
  success: { Icon: CircleCheck, className: "text-emerald-700 bg-emerald-500/12 dark:text-emerald-400" },
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

/** "2026-09-30" in IST, read as a calendar date rather than an instant. */
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
  /* A cell starting with = + - @ is a formula to Excel and Sheets. Names and
     failure messages are free text from strangers, so defuse them. */
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** "2026-09-30 16:02" in IST — sortable, and read by Excel as a date. */
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
      .map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

function buildCsv(rows, days, modes) {
  const header = [
    "Order ID",
    "Name",
    "Email",
    "Phone",
    "Age",
    "Occupation",
    "Mode",
    "Language",
    "Batch",
    "Amount",
    "MRP",
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
    "Days attended",
    ...days.map((day) => `Attended ${day}`),
    "Last admitted (IST)",
  ];

  const lines = rows.map((row) => {
    const byDay = new Map(row.attendance.map((entry) => [entry.dayKey, entry]));
    const last = row.attendance.reduce(
      (latest, entry) => (!latest || entry.at > latest ? entry.at : latest),
      null
    );
    return [
      row.orderId,
      row.name,
      row.email,
      row.phone,
      row.age,
      row.occupation,
      modes[row.mode] ?? row.mode,
      row.locale,
      row.batchId,
      row.amount,
      row.mrp,
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
      row.attendance.length,
      ...days.map((day) => (byDay.has(day) ? csvTime(byDay.get(day).at) : "")),
      csvTime(last),
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
      <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground tabular-nums">{value}</p>
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
        view.className
      )}
    >
      <view.Icon className="size-3" aria-hidden="true" />
      {label}
    </span>
  );
}

function SortHeader({ label, sortKey, sort, onSort, className }) {
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
          "inline-flex items-center gap-1 rounded px-1 py-0.5 text-xs font-semibold tracking-wide uppercase transition-colors hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {label}
        <Icon className={cn("size-3", active ? "opacity-100" : "opacity-40")} aria-hidden="true" />
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

export function RegistrationsDashboard({ rows: initialRows, loadedAt, today, modes, courseTitle, fileStem }) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();

  /* Attendance changed from this screen, keyed by order ID, laid over the
     server's rows until the next refresh brings the same truth back. Reset
     whenever fresh rows arrive, so a scan at the door is never hidden behind
     a stale local copy. */
  const [overrides, setOverrides] = useState({});
  const [sourceRows, setSourceRows] = useState(initialRows);
  if (sourceRows !== initialRows) {
    setSourceRows(initialRows);
    setOverrides({});
  }

  const rows = useMemo(
    () =>
      initialRows.map((row) =>
        overrides[row.orderId] ? { ...row, attendance: overrides[row.orderId] } : row
      ),
    [initialRows, overrides]
  );

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [status, setStatus] = useState("success");
  const [mode, setMode] = useState("all");
  const [presence, setPresence] = useState("all");
  const [batch, setBatch] = useState("all");
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

  /* Today first, then every other day anyone was admitted, newest first. */
  const days = useMemo(() => {
    const set = new Set([today]);
    for (const row of rows) for (const entry of row.attendance) set.add(entry.dayKey);
    return [...set].sort().reverse();
  }, [rows, today]);

  const batches = useMemo(() => [...new Set(rows.map((row) => row.batchId))], [rows]);

  const dayLabel = useMemo(() => {
    const format = formatter(locale, { weekday: "short", day: "numeric", month: "short" });
    return (dayKey) => (dayKey === today ? t("reg_today") : format.format(dayDate(dayKey)));
  }, [locale, today, t]);

  const dateTime = useMemo(() => formatter(locale, { dateStyle: "medium", timeStyle: "short" }), [locale]);
  const timeOnly = useMemo(() => formatter(locale, { timeStyle: "short" }), [locale]);

  const statusLabel = (key) => t(`reg_status_${key}`);
  const modeLabel = (key) => (key ? modes[key] ?? key : "—");

  const stats = useMemo(() => {
    const paid = rows.filter((row) => row.status === "success");
    return {
      total: rows.length,
      paid: paid.length,
      collected: paid.reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
      pending: rows.filter((row) => row.status === "pending").length,
      offline: paid.filter((row) => row.mode === "offline").length,
      online: paid.filter((row) => row.mode === "online").length,
      today: paid.filter((row) => row.attendance.some((entry) => entry.dayKey === today)).length,
      everAttended: paid.filter((row) => row.attendance.length > 0).length,
      offlineToday: paid.filter(
        (row) => row.mode === "offline" && row.attendance.some((entry) => entry.dayKey === today)
      ).length,
    };
  }, [rows, today]);

  const filtered = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    const digits = needle.replace(/\D/g, "");

    const list = rows.filter((row) => {
      if (status !== "all" && row.status !== status) return false;
      if (mode !== "all" && row.mode !== mode) return false;
      if (batch !== "all" && row.batchId !== batch) return false;

      const here = row.attendance.some((entry) => entry.dayKey === today);
      if (presence === "today" && !here) return false;
      if (presence === "not_today" && here) return false;
      if (presence === "ever" && row.attendance.length === 0) return false;
      if (presence === "never" && row.attendance.length > 0) return false;

      if (!needle) return true;
      if (digits.length >= 3 && String(row.phone).includes(digits)) return true;
      return [row.orderId, row.name, row.email, row.trackingId, row.gatewayOrderId]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });

    const value = (row) => {
      if (sort.key.startsWith("day:")) {
        const entry = row.attendance.find((item) => item.dayKey === sort.key.slice(4));
        return entry ? entry.at || "1" : "";
      }
      switch (sort.key) {
        case "orderId":
          return orderNumber(row.orderId);
        case "days":
          return row.attendance.length;
        case "amount":
        case "age":
          return row[sort.key] ?? -1;
        case "mode":
          return modeLabel(row.mode);
        default:
          return row[sort.key] ?? "";
      }
    };

    const direction = sort.dir === "asc" ? 1 : -1;
    return list.sort((a, b) => {
      const left = value(a);
      const right = value(b);
      if (typeof left === "number" && typeof right === "number") return (left - right) * direction;
      return String(left).localeCompare(String(right), undefined, { sensitivity: "base" }) * direction;
    });
    // `modeLabel` is derived from `modes`, which is listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, deferredQuery, status, mode, presence, batch, sort, today, modes]);

  function onSort(key) {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: ["name", "email", "mode", "occupation", "status"].includes(key) ? "asc" : "desc" }
    );
  }

  /* Any filter change starts the list from the top again. */
  function withReset(setter) {
    return (value) => {
      setter(value);
      setLimit(PAGE);
    };
  }

  async function onToggle(row, dayKey, present) {
    const key = `${row.orderId}:${dayKey}`;
    setBusy(key);
    try {
      const result = await toggleAttendance(row.orderId, dayKey, present);
      if (!result?.ok) throw new Error("failed");
      setOverrides((current) => ({ ...current, [row.orderId]: result.attendance }));
      toast.success(
        present
          ? t("reg_marked_present", { name: row.name, day: dayLabel(dayKey) })
          : t("reg_marked_absent", { name: row.name, day: dayLabel(dayKey) })
      );
    } catch {
      toast.error(t("reg_toggle_failed"));
    } finally {
      setBusy(null);
    }
  }

  function onExport() {
    const exportDays = [...days].sort();
    const stamp = csvTime(Date.now()).replace(/[: ]/g, "-");
    downloadCsv(buildCsv(filtered, exportDays, modes), `${fileStem}-registrations-${stamp}.csv`);
  }

  const visible = filtered.slice(0, limit);
  const columnCount = 10 + days.length;

  return (
    <div className="mt-8">
      {/* ---- Headline numbers --------------------------------------------- */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label={t("reg_stat_paid")} value={stats.paid} hint={t("reg_stat_of_total", { count: stats.total })} />
        <Stat label={t("reg_stat_collected")} value={inr(stats.collected)} />
        <Stat
          label={t("reg_stat_split")}
          value={`${stats.offline} / ${stats.online}`}
          hint={t("reg_stat_split_hint")}
        />
        <Stat
          label={t("reg_stat_today")}
          value={stats.today}
          hint={t("reg_stat_today_hint", { count: stats.offlineToday, total: stats.offline })}
        />
        <Stat label={t("reg_stat_ever")} value={stats.everAttended} />
        <Stat label={t("reg_stat_pending")} value={stats.pending} />
      </div>

      {/* ---- Toolbar ------------------------------------------------------ */}
      <Panel className="mt-6 p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))] lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
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
                placeholder={t("reg_search_placeholder")}
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
            label={t("reg_filter_mode")}
            value={mode}
            onChange={withReset(setMode)}
            options={[["all", t("reg_all")], ...Object.entries(modes)]}
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
          {batches.length > 1 && (
            <Select
              label={t("reg_filter_batch")}
              value={batch}
              onChange={withReset(setBatch)}
              options={[["all", t("reg_all")], ...batches.map((id) => [id, id])]}
            />
          )}
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
            <Button className="h-9 rounded-full" onClick={onExport} disabled={filtered.length === 0}>
              <Download className="size-4" aria-hidden="true" />
              {t("reg_export", { count: filtered.length })}
            </Button>
          </div>
        </div>
      </Panel>

      {/* ---- Table -------------------------------------------------------- */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full caption-bottom text-sm">
          <caption className="sr-only">{courseTitle}</caption>
          <thead className="border-b border-border">
            <tr>
              <th scope="col" className="w-8 px-2">
                <span className="sr-only">{t("reg_details")}</span>
              </th>
              <SortHeader label={t("reg_col_order")} sortKey="orderId" sort={sort} onSort={onSort} />
              <SortHeader label={t("reg_col_name")} sortKey="name" sort={sort} onSort={onSort} />
              <SortHeader label={t("reg_col_phone")} sortKey="phone" sort={sort} onSort={onSort} />
              <SortHeader label={t("reg_col_email")} sortKey="email" sort={sort} onSort={onSort} />
              <SortHeader label={t("reg_col_mode")} sortKey="mode" sort={sort} onSort={onSort} />
              <SortHeader label={t("reg_col_status")} sortKey="status" sort={sort} onSort={onSort} />
              <SortHeader label={t("reg_col_amount")} sortKey="amount" sort={sort} onSort={onSort} className="text-right" />
              <SortHeader label={t("reg_col_registered")} sortKey="createdAt" sort={sort} onSort={onSort} />
              {days.map((dayKey) => (
                <SortHeader
                  key={dayKey}
                  label={dayLabel(dayKey)}
                  sortKey={`day:${dayKey}`}
                  sort={sort}
                  onSort={onSort}
                  className={cn("text-center", dayKey === today && "bg-primary/[0.06]")}
                />
              ))}
              <SortHeader label={t("reg_col_days")} sortKey="days" sort={sort} onSort={onSort} className="text-center" />
            </tr>
          </thead>

          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="px-4 py-16 text-center text-muted-foreground">
                  {rows.length === 0 ? t("reg_empty") : t("reg_no_match")}
                </td>
              </tr>
            ) : (
              visible.map((row) => {
                const open = expanded === row.orderId;
                const paid = row.status === "success";
                return (
                  <Fragment key={row.orderId}>
                    <tr className={cn("border-b border-border/70 transition-colors hover:bg-muted/40", open && "bg-muted/40")}>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() => setExpanded(open ? null : row.orderId)}
                          aria-expanded={open}
                          aria-label={t("reg_details_for", { name: row.name })}
                          className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
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
                      <td className="max-w-56 truncate px-2 py-2 font-medium text-foreground" title={row.name}>
                        {row.name}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap tabular-nums">
                        <a href={`tel:+91${row.phone}`} className="hover:text-primary hover:underline">
                          {row.phone}
                        </a>
                      </td>
                      <td className="max-w-60 truncate px-2 py-2 text-muted-foreground" title={row.email}>
                        {row.email}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-muted-foreground">{modeLabel(row.mode)}</td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        <StatusBadge status={row.status} label={statusLabel(row.status)} />
                      </td>
                      <td className="px-2 py-2 text-right whitespace-nowrap tabular-nums">{inr(row.amount)}</td>
                      <td className="px-2 py-2 whitespace-nowrap text-muted-foreground tabular-nums">
                        {row.createdAt ? dateTime.format(new Date(row.createdAt)) : "—"}
                      </td>
                      {days.map((dayKey) => {
                        const entry = row.attendance.find((item) => item.dayKey === dayKey);
                        const key = `${row.orderId}:${dayKey}`;
                        return (
                          <td
                            key={dayKey}
                            className={cn("px-2 py-2 text-center", dayKey === today && "bg-primary/[0.04]")}
                          >
                            <button
                              type="button"
                              disabled={!paid || busy === key}
                              onClick={() => onToggle(row, dayKey, !entry)}
                              aria-pressed={Boolean(entry)}
                              aria-label={t(entry ? "reg_unmark" : "reg_mark", {
                                name: row.name,
                                day: dayLabel(dayKey),
                              })}
                              title={
                                entry?.at
                                  ? `${timeOnly.format(new Date(entry.at))} · ${t(`reg_source_${entry.source || "qr"}`)}`
                                  : undefined
                              }
                              className={cn(
                                "inline-flex h-7 min-w-7 items-center justify-center gap-1 rounded-md border px-1.5 text-xs font-medium tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-30",
                                entry
                                  ? "border-emerald-600/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                  : "border-border text-transparent hover:border-primary/50 hover:text-muted-foreground"
                              )}
                            >
                              {busy === key ? (
                                <RefreshCw className="size-3.5 animate-spin text-muted-foreground" aria-hidden="true" />
                              ) : (
                                <Check className="size-3.5" aria-hidden="true" />
                              )}
                              {entry?.at ? timeOnly.format(new Date(entry.at)) : null}
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-2 py-2 text-center font-semibold tabular-nums">{row.attendance.length}</td>
                    </tr>

                    {open && (
                      <tr className="border-b border-border/70 bg-muted/20">
                        <td colSpan={columnCount} className="px-4 py-4 sm:px-12">
                          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
                            <Detail label={t("reg_d_age")} value={row.age} />
                            <Detail label={t("reg_d_occupation")} value={row.occupation ? t(`reg_occ_${row.occupation}`) : null} />
                            <Detail label={t("reg_d_language")} value={row.locale === "hi" ? "हिन्दी" : row.locale === "en" ? "English" : null} />
                            <Detail label={t("reg_d_batch")} value={row.batchId} mono />
                            <Detail label={t("reg_d_mrp")} value={row.mrp ? inr(row.mrp) : null} />
                            <Detail label={t("reg_d_paid_at")} value={row.paidAt ? dateTime.format(new Date(row.paidAt)) : null} />
                            <Detail label={t("reg_d_paid_via")} value={row.paymentMode} />
                            <Detail label={t("reg_d_payment_id")} value={row.trackingId} mono />
                            <Detail label={t("reg_d_bank_ref")} value={row.bankRefNo} mono />
                            <Detail label={t("reg_d_gateway_order")} value={row.gatewayOrderId} mono />
                            <Detail label={t("reg_d_provider")} value={row.provider} />
                            <Detail label={t("reg_d_failure")} value={row.failureMessage} />
                            <Detail label={t("reg_d_account")} value={row.hasAccount ? t("reg_yes") : t("reg_no")} />
                            <Detail label={t("reg_d_emailed")} value={row.emailSent ? t("reg_yes") : t("reg_no")} />
                            <Detail label={t("reg_d_mismatch")} value={row.amountMismatch ? t("reg_mismatch") : null} />
                            <Detail
                              label={t("reg_d_attendance")}
                              value={
                                row.attendance.length
                                  ? [...row.attendance]
                                      .sort((a, b) => a.dayKey.localeCompare(b.dayKey))
                                      .map(
                                        (entry) =>
                                          `${dayLabel(entry.dayKey)} ${entry.at ? timeOnly.format(new Date(entry.at)) : ""} (${t(`reg_source_${entry.source || "qr"}`)})`
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
          <Button variant="outline" className="rounded-full" onClick={() => setLimit((current) => current + PAGE)}>
            {t("reg_show_more", { count: Math.min(PAGE, filtered.length - limit) })}
          </Button>
        </div>
      )}
    </div>
  );
}
