"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/site/Panel";
import { cn } from "@/lib/utils";

/**
 * Every handover, searchable, and exportable as what is on screen.
 *
 * The same arrangement as `RegistrationsDashboard`: the rows are already in
 * memory, so search, filters and the CSV are plain array work that answers on
 * each keystroke. A marathon is a few thousand rows, not millions, and the
 * alternative — a server round trip per filter — is slower and gives the
 * coordinator an export that does not match what they are looking at.
 *
 * The CSV is built from the filtered list for exactly that reason: somebody
 * who has narrowed to one volunteer's cash sales and presses Export means that
 * list, not the whole collection.
 */

const PAGE = 100;

const STATUSES = ["success", "pending", "failed", "aborted"];
const METHODS = ["cash", "online"];

/* ---- CSV ---------------------------------------------------------------- */

function csvCell(value) {
  if (value === null || value === undefined) return "";
  let text = String(value);
  /* A cell starting with = + - @ is a formula to Excel and Sheets. Reader
     names and notes are free text typed by volunteers, so defuse them. */
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** "2026-11-04 19:02" in IST — sortable, and read by Excel as a date. */
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

function buildCsv(rows) {
  const header = [
    "Order ID",
    "Day (IST)",
    "Recorded at (IST)",
    "Volunteer",
    "Books",
    "Titles",
    "Amount",
    "Paid by",
    "Payment status",
    "Payment mode",
    "Payment reference",
    "Bank reference",
    "Reader",
    "Reader phone",
    "Note",
    "Cash settled",
  ];

  const lines = rows.map((row) =>
    [
      row.orderId,
      row.dayKey,
      csvTime(row.createdAt),
      row.volunteerName,
      row.quantity,
      row.titles,
      row.amount,
      row.method,
      row.status,
      row.paymentMode,
      row.trackingId,
      row.bankRefNo,
      row.buyerName,
      row.buyerPhone,
      row.note,
      row.settled ? "yes" : "no",
    ]
      .map(csvCell)
      .join(","),
  );

  // The BOM is what makes Excel read Devanagari names as UTF-8.
  return `﻿${[header.map(csvCell).join(","), ...lines].join("\r\n")}`;
}

function downloadCsv(content, filename) {
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---- Pieces ------------------------------------------------------------- */

function Select({ label, value, onChange, options }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 dark:bg-input/30"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const STATUS_TONE = {
  success: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  pending: "bg-amber-500/12 text-amber-700 dark:text-amber-400",
  failed: "bg-destructive/10 text-destructive",
  aborted: "bg-muted text-muted-foreground",
};

export function MarathonTransactions({ rows }) {
  const t = useTranslations("admin");
  const tm = useTranslations("marathon");
  const locale = useLocale();

  const [query, setQuery] = useState("");
  const [method, setMethod] = useState("all");
  const [status, setStatus] = useState("all");
  const [shown, setShown] = useState(PAGE);

  /* Deferred so a long list does not make the search box itself feel sticky
     — the same reason the registrations table defers its query. */
  const deferred = useDeferredValue(query);

  const filtered = useMemo(() => {
    const needle = deferred.trim().toLowerCase();
    return rows.filter((row) => {
      if (method !== "all" && row.method !== method) return false;
      if (status !== "all" && row.status !== status) return false;
      if (!needle) return true;
      return [
        row.orderId,
        row.volunteerName,
        row.buyerName,
        row.buyerPhone,
        row.trackingId,
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle));
    });
  }, [rows, deferred, method, status]);

  const when = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
      }),
    [locale],
  );

  const inr = useMemo(
    () =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }),
    [],
  );

  const visible = filtered.slice(0, shown);

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight">
          {t("mar_tx_title")}
        </h2>
        <Button
          variant="outline"
          className="rounded-full"
          disabled={filtered.length === 0}
          onClick={() =>
            downloadCsv(buildCsv(filtered), `gita-marathon-${Date.now()}.csv`)
          }
        >
          <Download className="size-4" aria-hidden="true" />
          {t("mar_tx_export")}
        </Button>
      </div>

      {/* One row of controls above the table, never inside it. */}
      <div className="mt-5 flex flex-wrap items-end gap-3">
        <label className="flex min-w-56 flex-1 flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            {t("mar_tx_search")}
          </span>
          <div className="relative">
            <Search
              className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setShown(PAGE);
              }}
              className="h-10 ps-9"
            />
          </div>
        </label>

        <Select
          label={t("mar_tx_filter_method")}
          value={method}
          onChange={(value) => {
            setMethod(value);
            setShown(PAGE);
          }}
          options={[
            { value: "all", label: t("mar_tx_all") },
            ...METHODS.map((key) => ({
              value: key,
              label: tm(`method_${key}`),
            })),
          ]}
        />

        <Select
          label={t("mar_tx_filter_status")}
          value={status}
          onChange={(value) => {
            setStatus(value);
            setShown(PAGE);
          }}
          options={[
            { value: "all", label: t("mar_tx_all") },
            ...STATUSES.map((key) => ({
              value: key,
              label: tm(`status_${key}`),
            })),
          ]}
        />
      </div>

      <p className="mt-3 text-xs text-muted-foreground tabular-nums">
        {t("mar_tx_showing", { shown: visible.length, total: filtered.length })}
      </p>

      {rows.length === 0 ? (
        <Panel className="mt-4 p-10 text-center text-sm text-muted-foreground">
          {t("mar_tx_empty")}
        </Panel>
      ) : filtered.length === 0 ? (
        <Panel className="mt-4 p-10 text-center text-sm text-muted-foreground">
          {t("mar_tx_no_match")}
        </Panel>
      ) : (
        <>
          <Panel className="mt-4 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    {[
                      ["mar_col_order", "text-start"],
                      ["mar_col_when", "text-start"],
                      ["mar_col_volunteer", "text-start"],
                      ["mar_col_titles", "text-start"],
                      ["mar_col_books", "text-end"],
                      ["mar_col_amount", "text-end"],
                      ["mar_col_method", "text-start"],
                      ["mar_col_status", "text-start"],
                      ["mar_col_reader", "text-start"],
                    ].map(([key, align]) => (
                      <th
                        key={key}
                        scope="col"
                        className={cn("px-3 py-2.5 font-medium", align)}
                      >
                        {t(key)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => (
                    <tr
                      key={row.orderId}
                      className="border-b border-border/50 last:border-0"
                    >
                      <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap">
                        {row.orderId}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground tabular-nums">
                        {when.format(new Date(row.createdAt))}
                      </td>
                      <td className="max-w-40 truncate px-3 py-2.5">
                        {row.volunteerName}
                      </td>
                      <td className="max-w-48 truncate px-3 py-2.5 text-muted-foreground">
                        {row.titles}
                      </td>
                      <td className="px-3 py-2.5 text-end font-semibold tabular-nums">
                        {row.quantity}
                      </td>
                      <td className="px-3 py-2.5 text-end tabular-nums">
                        {inr.format(row.amount)}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {tm(`method_${row.method}`)}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-medium",
                            STATUS_TONE[row.status] ?? STATUS_TONE.aborted,
                          )}
                        >
                          {tm(`status_${row.status}`)}
                        </span>
                      </td>
                      <td className="max-w-36 truncate px-3 py-2.5 text-muted-foreground">
                        {row.buyerName || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {visible.length < filtered.length && (
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => setShown((value) => value + PAGE)}
              >
                {t("mar_tx_more")}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
