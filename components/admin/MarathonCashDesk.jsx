"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { CircleCheck, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/site/Panel";
import { verifyCashSettlement } from "@/app/[locale]/admin/gita-marathon/actions";
import { cn } from "@/lib/utils";

/**
 * The desk, counting cash against what the volunteers recorded.
 *
 * Each card states three numbers before it asks for a fourth: what the
 * volunteer's own sales came to, what they declared when they handed the bag
 * over, and — once counted — what actually arrived. They are deliberately all
 * three on screen at once, because the interesting case is when they disagree,
 * and a form that showed only the expected figure would make the declared one
 * invisible at exactly the moment it matters.
 *
 * The counted field is prefilled with what the volunteer declared, not with
 * the expected total. Prefilling the expectation is an invitation to confirm
 * it without counting, which would make the whole reconciliation ceremonial.
 *
 * Verified settlements are listed too, and the variance is shown as stored —
 * never recomputed, never corrected. A deficit is a fact about a day.
 */
const ERRORS = ["mar_cash_err_amount", "mar_cash_err_not_found"];

export function MarathonCashDesk({ queue, verified }) {
  const t = useTranslations("admin");
  const locale = useLocale();

  const day = new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

  return (
    <div className="mt-8 flex flex-col gap-10">
      <section>
        <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
          {t("mar_cash_queue")}
          {queue.length > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground tabular-nums">
              {queue.length}
            </span>
          )}
        </h2>

        {queue.length === 0 ? (
          <Panel className="mt-4 p-10 text-center text-sm text-muted-foreground">
            {t("mar_cash_empty")}
          </Panel>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {queue.map((row) => (
              <CountCard key={row.id} row={row} day={day} t={t} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-base font-semibold tracking-tight">
          {t("mar_cash_done")}
        </h2>

        {verified.length === 0 ? (
          <Panel className="mt-4 p-8 text-center text-sm text-muted-foreground">
            {t("mar_cash_none_done")}
          </Panel>
        ) : (
          <Panel className="mt-4 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th scope="col" className="px-3 py-2.5 text-start font-medium">
                      {t("mar_col_when")}
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-start font-medium">
                      {t("mar_col_volunteer")}
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-end font-medium">
                      {t("mar_cash_expected")}
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-end font-medium">
                      {t("mar_cash_received")}
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-end font-medium">
                      {t("mar_cash_variance")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {verified.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-border/50 last:border-0"
                    >
                      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground tabular-nums">
                        {day.format(new Date(`${row.dayKey}T00:00:00Z`))}
                      </td>
                      <td className="max-w-48 truncate px-3 py-2.5 font-medium">
                        {row.volunteerName}
                      </td>
                      <td className="px-3 py-2.5 text-end tabular-nums">
                        ₹{row.expectedAmount}
                      </td>
                      <td className="px-3 py-2.5 text-end font-semibold tabular-nums">
                        ₹{row.receivedAmount}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2.5 text-end font-semibold tabular-nums",
                          row.variance < 0 && "text-destructive",
                          row.variance > 0 &&
                            "text-amber-600 dark:text-amber-400",
                          row.variance === 0 && "text-muted-foreground",
                        )}
                      >
                        {row.variance === 0
                          ? t("mar_cash_exact")
                          : row.variance > 0
                            ? t("mar_cash_excess", { amount: row.variance })
                            : t("mar_cash_deficit", { amount: -row.variance })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </section>
    </div>
  );
}

function Figure({ label, value, strong }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-0.5 tabular-nums",
          strong ? "text-lg font-semibold" : "text-sm",
        )}
      >
        ₹{value}
      </p>
    </div>
  );
}

function CountCard({ row, day, t }) {
  const [amount, setAmount] = useState(String(row.declaredAmount));
  const [note, setNote] = useState("");
  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();

  const counted = Number(amount) || 0;
  const variance = counted - row.expectedAmount;

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await verifyCashSettlement({
        id: row.id,
        receivedAmount: counted,
        adminNote: note,
      });
      if (!result?.ok) {
        const key = ERRORS.includes(result?.error)
          ? result.error
          : "mar_cash_failed";
        setError(key);
        toast.error(t(key));
        return;
      }
      toast.success(
        t("mar_cash_verified", { amount: counted, name: row.volunteerName }),
      );
    });
  }

  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold tracking-tight">
            {row.volunteerName}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            {day.format(new Date(`${row.dayKey}T00:00:00Z`))} ·{" "}
            {t("mar_cash_sales", { count: row.expectedCount })}
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-6">
        <Figure label={t("mar_cash_expected")} value={row.expectedAmount} />
        <Figure
          label={t("mar_cash_declared")}
          value={row.declaredAmount}
          strong
        />
      </div>

      {row.note && (
        <p className="mt-4 rounded-lg bg-muted/50 px-3 py-2 text-sm leading-relaxed text-foreground/90">
          {row.note}
        </p>
      )}

      <label className="mt-5 flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          {t("mar_cash_received")}
        </span>
        <div className="flex h-11 items-center rounded-lg border border-input bg-transparent focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30">
          <span className="ps-3 pe-1 text-sm text-muted-foreground">₹</span>
          <input
            inputMode="numeric"
            value={amount}
            onChange={(event) =>
              setAmount(event.target.value.replace(/\D/g, "").slice(0, 7))
            }
            className="h-full min-w-0 flex-1 bg-transparent pe-3 text-base font-semibold tabular-nums outline-none"
          />
        </div>
      </label>

      <p
        aria-live="polite"
        className={cn(
          "mt-3 rounded-lg px-3 py-2 text-sm font-medium tabular-nums",
          variance === 0 && "bg-muted text-muted-foreground",
          variance > 0 &&
            "bg-amber-500/10 text-amber-700 dark:text-amber-400",
          variance < 0 && "bg-destructive/10 text-destructive",
        )}
      >
        {variance === 0
          ? t("mar_cash_exact")
          : variance > 0
            ? t("mar_cash_excess", { amount: variance })
            : t("mar_cash_deficit", { amount: -variance })}
      </p>

      <label className="mt-4 flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          {t("mar_cash_note")}
        </span>
        <Input
          value={note}
          onChange={(event) => setNote(event.target.value.slice(0, 300))}
          placeholder={t("mar_cash_note_placeholder")}
          className="h-10"
        />
      </label>

      {error && (
        <p role="alert" className="mt-3 text-xs text-destructive">
          {t(error)}
        </p>
      )}

      <Button
        disabled={pending}
        onClick={confirm}
        className="mt-4 h-11 w-full rounded-full"
      >
        {pending ? (
          <>
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            {t("mar_cash_verifying")}
          </>
        ) : (
          <>
            <CircleCheck className="size-4" aria-hidden="true" />
            {t("mar_cash_verify")}
          </>
        )}
      </Button>
    </Panel>
  );
}
