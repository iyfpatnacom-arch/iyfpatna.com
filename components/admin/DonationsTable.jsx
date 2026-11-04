"use client";

import { Fragment, useDeferredValue, useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ChevronDown,
  Download,
  FileText,
  MailCheck,
  Search,
  TriangleAlert,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/site/Panel";
import { cn } from "@/lib/utils";
import {
  donationLinks,
  resendDonationReceipt,
} from "@/app/[locale]/admin/donations/actions";

/**
 * Every offering, searchable, exportable, and openable one at a time.
 *
 * The same arrangement as `MarathonTransactions` and `RegistrationsDashboard`:
 * the rows are already in memory, so search, the filters and the CSV are plain
 * array work that answers on each keystroke. The CSV is built from the
 * *filtered* list, because somebody who has narrowed to one seva's donations
 * and presses Export means that list and not the whole collection.
 *
 * What is different here is what a row is for. A course registration is a
 * person to admit; a donation is a tax document. So the export carries the
 * fields an 80G return needs — address, PIN, PAN, the date the money actually
 * landed — and the expanded row carries the receipt itself, with the one
 * recovery an admin genuinely needs: sending it again.
 *
 * The donor's address and PAN are behind the row toggle rather than in a
 * column. They belong to the one person the row is about, they are of no use
 * while scanning a list, and a screen full of strangers' postal addresses is
 * not something to leave open on a desk.
 */

const PAGE = 100;

const STATUSES = ["success", "pending", "failed", "aborted"];

/* ---- CSV ---------------------------------------------------------------- */

function csvCell(value) {
  if (value === null || value === undefined) return "";
  let text = String(value);
  /* A cell starting with = + - @ is a formula to Excel and Sheets. Donor
     names, addresses and seva titles are free text, so defuse them. */
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
    "Receipt no",
    "Seva",
    "Amount",
    "Payment status",
    "Paid at (IST)",
    "Started at (IST)",
    "Donor",
    "Phone",
    "Email",
    "Address",
    "PIN",
    "PAN",
    "Payment mode",
    "Payment reference",
    "Bank reference",
    "Gateway",
    "Receipt emailed",
    "Amount mismatch",
    "Signed-in account",
  ];

  const lines = rows.map((row) =>
    [
      row.orderId,
      row.sevaTitle,
      row.amount,
      row.status,
      csvTime(row.paidAt),
      csvTime(row.createdAt),
      row.name,
      row.phone,
      row.email,
      row.address,
      row.pincode,
      row.pan,
      row.paymentMode,
      row.trackingId,
      row.bankRefNo,
      row.provider,
      row.emailSent ? "yes" : "no",
      row.mismatch ? "yes" : "no",
      row.clerkId,
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
        className="h-10 max-w-52 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 dark:bg-input/30"
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

/** One labelled fact in the expanded row. */
function Field({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm">{children || "—"}</dd>
    </div>
  );
}

/**
 * The donor's own details, the payment's references, and the receipt.
 *
 * The links are minted by a server action on first open rather than shipped
 * with the row: each one carries an HMAC of the order ID, and signing a few
 * thousand of them for the handful an admin clicks is work nobody asked for.
 */
function Details({ row }) {
  const t = useTranslations("admin");
  const [links, setLinks] = useState(null);
  const [loading, startLoading] = useTransition();
  const [resending, startResend] = useTransition();
  const [sent, setSent] = useState(false);

  function open() {
    startLoading(async () => {
      const result = await donationLinks({ orderId: row.orderId });
      if (!result.ok) {
        setLinks({ error: result.error });
        return;
      }
      setLinks(result);
    });
  }

  function resend() {
    startResend(async () => {
      const result = await resendDonationReceipt({ orderId: row.orderId });
      if (!result.ok) {
        toast.error(t(result.error));
        return;
      }
      setSent(true);
      toast.success(t("don_resent", { email: result.email }));
    });
  }

  return (
    <dl className="grid gap-x-6 gap-y-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
      <Field label={t("don_d_email")}>{row.email}</Field>
      <Field label={t("don_d_phone")}>{row.phone}</Field>
      <Field label={t("don_d_pan")}>
        {row.pan || (
          <span className="text-muted-foreground">{t("don_d_no_pan")}</span>
        )}
      </Field>
      <Field label={t("don_d_pincode")}>{row.pincode}</Field>
      <div className="min-w-0 sm:col-span-2 lg:col-span-4">
        <Field label={t("don_d_address")}>{row.address}</Field>
      </div>

      <Field label={t("don_d_provider")}>{row.provider}</Field>
      <Field label={t("don_d_mode")}>{row.paymentMode}</Field>
      <Field label={t("don_d_ref")}>
        {row.trackingId ? (
          <span className="font-mono text-xs">{row.trackingId}</span>
        ) : null}
      </Field>
      <Field label={t("don_d_bank_ref")}>
        {row.bankRefNo ? (
          <span className="font-mono text-xs">{row.bankRefNo}</span>
        ) : null}
      </Field>

      <Field label={t("don_d_started")}>{row.startedLabel}</Field>
      <Field label={t("don_d_paid_at")}>{row.paidLabel}</Field>
      <Field label={t("don_d_emailed")}>
        {row.emailSent || sent ? t("don_yes") : t("don_no")}
      </Field>
      <Field label={t("don_d_account")}>
        {row.clerkId ? (
          <span className="font-mono text-xs">{row.clerkId}</span>
        ) : null}
      </Field>

      {row.failureMessage ? (
        <div className="sm:col-span-2 lg:col-span-4">
          <Field label={t("don_d_failure")}>{row.failureMessage}</Field>
        </div>
      ) : null}

      {/* Only a settled donation has a receipt to show or to send again —
          there is no money to acknowledge on anything else. */}
      {row.status === "success" ? (
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-4">
          {links?.ok ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                render={<a href={links.receipt} target="_blank" rel="noreferrer" />}
              >
                <FileText className="size-4" aria-hidden="true" />
                {t("don_receipt")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full"
                render={<a href={links.status} target="_blank" rel="noreferrer" />}
              >
                {t("don_status_page")}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={loading}
              onClick={open}
            >
              <FileText className="size-4" aria-hidden="true" />
              {loading ? t("don_link_loading") : t("don_links")}
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            disabled={resending}
            onClick={resend}
          >
            <MailCheck className="size-4" aria-hidden="true" />
            {resending ? t("don_resending") : t("don_resend")}
          </Button>

          {links?.error ? (
            <span className="text-xs text-destructive">{t(links.error)}</span>
          ) : null}
        </div>
      ) : null}
    </dl>
  );
}

/* ---- The table ---------------------------------------------------------- */

export function DonationsTable({ rows, sevas }) {
  const t = useTranslations("admin");
  const locale = useLocale();

  const [query, setQuery] = useState("");
  const [seva, setSeva] = useState("all");
  const [status, setStatus] = useState("all");
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState(null);

  /* Deferred so a long list does not make the search box itself feel sticky
     — the same reason the registrations table defers its query. */
  const deferred = useDeferredValue(query);

  const filtered = useMemo(() => {
    const needle = deferred.trim().toLowerCase();
    return rows.filter((row) => {
      if (seva !== "all" && row.sevaKey !== seva) return false;
      if (status !== "all" && row.status !== status) return false;
      if (!needle) return true;
      return [
        row.orderId,
        row.name,
        row.phone,
        row.email,
        row.pan,
        row.pincode,
        row.trackingId,
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle));
    });
  }, [rows, deferred, seva, status]);

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

  /* The visible rows carry their dates as text, so `Details` never formats
     one itself and the two can never disagree about a timezone. */
  const visible = useMemo(
    () =>
      filtered.slice(0, shown).map((row) => ({
        ...row,
        startedLabel: when.format(new Date(row.createdAt)),
        paidLabel: row.paidAt ? when.format(new Date(row.paidAt)) : null,
      })),
    [filtered, shown, when],
  );

  /* What the filtered list comes to, so the figure under the controls answers
     the question the filters were set to ask — "how much has anna-daan taken
     this month" is the whole reason to narrow a donation list. */
  const filteredTotal = useMemo(
    () =>
      filtered.reduce(
        (total, row) => (row.status === "success" ? total + row.amount : total),
        0,
      ),
    [filtered],
  );

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight">
            {t("don_tx_title")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("don_tx_hint")}
          </p>
        </div>
        <Button
          variant="outline"
          className="rounded-full"
          disabled={filtered.length === 0}
          onClick={() =>
            downloadCsv(buildCsv(filtered), `iyf-donations-${Date.now()}.csv`)
          }
        >
          <Download className="size-4" aria-hidden="true" />
          {t("don_tx_export", { count: filtered.length })}
        </Button>
      </div>

      {/* One row of controls above the table, never inside it. */}
      <div className="mt-5 flex flex-wrap items-end gap-3">
        <label className="flex min-w-56 flex-1 flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            {t("don_tx_search")}
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
              placeholder={t("don_tx_search_placeholder")}
              className="h-10 ps-9"
            />
          </div>
        </label>

        <Select
          label={t("don_tx_filter_seva")}
          value={seva}
          onChange={(value) => {
            setSeva(value);
            setShown(PAGE);
          }}
          options={[
            { value: "all", label: t("don_tx_all") },
            ...sevas.map((entry) => ({
              value: entry.key,
              label: entry.title,
            })),
          ]}
        />

        <Select
          label={t("don_tx_filter_status")}
          value={status}
          onChange={(value) => {
            setStatus(value);
            setShown(PAGE);
          }}
          options={[
            { value: "all", label: t("don_tx_all") },
            ...STATUSES.map((key) => ({
              value: key,
              label: t(`don_status_${key}`),
            })),
          ]}
        />
      </div>

      <p className="mt-3 text-xs text-muted-foreground tabular-nums">
        {t("don_tx_showing", {
          shown: visible.length,
          total: filtered.length,
          amount: inr.format(filteredTotal),
        })}
      </p>

      {rows.length === 0 ? (
        <Panel className="mt-4 p-10 text-center text-sm text-muted-foreground">
          {t("don_tx_empty")}
        </Panel>
      ) : filtered.length === 0 ? (
        <Panel className="mt-4 p-10 text-center text-sm text-muted-foreground">
          {t("don_tx_no_match")}
        </Panel>
      ) : (
        <>
          <Panel className="mt-4 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    {[
                      ["don_col_receipt", "text-start"],
                      ["don_col_when", "text-start"],
                      ["don_col_donor", "text-start"],
                      ["don_col_seva", "text-start"],
                      ["don_col_amount", "text-end"],
                      ["don_col_status", "text-start"],
                      ["don_col_mode", "text-start"],
                    ].map(([key, align]) => (
                      <th
                        key={key}
                        scope="col"
                        className={cn("px-3 py-2.5 font-medium", align)}
                      >
                        {t(key)}
                      </th>
                    ))}
                    <th scope="col" className="px-3 py-2.5">
                      <span className="sr-only">{t("don_details")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => {
                    const expanded = open === row.orderId;
                    return (
                      <Fragment key={row.orderId}>
                        <tr
                          className={cn(
                            "border-b border-border/50",
                            expanded && "bg-muted/40",
                          )}
                        >
                          <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap">
                            {row.orderId}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground tabular-nums">
                            {row.paidLabel || row.startedLabel}
                          </td>
                          <td className="max-w-44 px-3 py-2.5">
                            <span className="block truncate font-medium">
                              {row.name}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground tabular-nums">
                              {row.phone}
                            </span>
                          </td>
                          <td className="max-w-40 truncate px-3 py-2.5 text-muted-foreground">
                            {row.sevaTitle}
                          </td>
                          <td className="px-3 py-2.5 text-end font-semibold tabular-nums whitespace-nowrap">
                            {inr.format(row.amount)}
                            {row.mismatch ? (
                              <TriangleAlert
                                className="ms-1 inline size-3.5 text-destructive"
                                aria-label={t("don_mismatch")}
                              />
                            ) : null}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[11px] font-medium",
                                STATUS_TONE[row.status] ?? STATUS_TONE.aborted,
                              )}
                            >
                              {t(`don_status_${row.status}`)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                            {row.paymentMode || "—"}
                          </td>
                          <td className="px-3 py-2.5 text-end">
                            <button
                              type="button"
                              onClick={() =>
                                setOpen(expanded ? null : row.orderId)
                              }
                              aria-expanded={expanded}
                              aria-label={t("don_details_for", {
                                name: row.name,
                              })}
                              className="inline-grid size-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                              <ChevronDown
                                className={cn(
                                  "size-4 transition-transform",
                                  expanded && "rotate-180",
                                )}
                                aria-hidden="true"
                              />
                            </button>
                          </td>
                        </tr>
                        {expanded ? (
                          <tr className="border-b border-border/50 bg-muted/40">
                            <td colSpan={8} className="p-0">
                              <Details row={row} />
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
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
                {t("don_tx_more")}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
