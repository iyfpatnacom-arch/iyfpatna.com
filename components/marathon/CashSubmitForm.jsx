"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { BanknoteArrowUp, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitDayCash } from "@/app/[locale]/activity/gita-marathon/actions";

/**
 * Handing in the day's cash.
 *
 * Prefilled with what the volunteer's own recorded sales came to, and editable
 * — which is the whole point of the field. The temptation is to make this a
 * one-tap "hand in ₹2,400" confirmation, since the system already knows the
 * figure; but then a volunteer who is ₹300 short has no way to say so except
 * by not submitting, and the shortfall arrives at the desk as a surprise with
 * an argument attached. Asking them to count the notes and type the number
 * makes the discrepancy their own statement, made before anybody counted, and
 * that is worth more than the tap it costs.
 *
 * There is no success state here either. The action revalidates and the server
 * renders the "waiting to be counted" panel, which is the real answer.
 */
const ERRORS = [
  "err_not_active",
  "err_amount",
  "err_nothing_due",
  "err_already_today",
  "err_generic",
];

export function CashSubmitForm({ expected, count }) {
  const t = useTranslations("marathon");

  const [amount, setAmount] = useState(String(expected));
  const [note, setNote] = useState("");
  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();

  function submit(event) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await submitDayCash({
        declaredAmount: Number(amount) || 0,
        note,
      });
      if (!result?.ok) {
        setError(ERRORS.includes(result?.error) ? result.error : "err_generic");
      }
    });
  }

  const declared = Number(amount) || 0;
  const difference = declared - expected;

  return (
    <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-muted-foreground">
        {t("me_cash_due", { count, amount: expected })}
      </p>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cash-amount" className="text-muted-foreground">
          {t("me_cash_declared")}
        </Label>
        <div className="flex h-12 items-center rounded-lg border border-input bg-transparent focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30">
          <span className="ps-3 pe-1 text-base text-muted-foreground">₹</span>
          <input
            id="cash-amount"
            inputMode="numeric"
            autoComplete="off"
            value={amount}
            onChange={(event) =>
              setAmount(event.target.value.replace(/\D/g, "").slice(0, 7))
            }
            className="h-full min-w-0 flex-1 bg-transparent pe-3 text-lg font-semibold tabular-nums outline-none"
          />
        </div>
        <p className="text-[11px] leading-snug text-muted-foreground/80">
          {t("me_cash_declared_hint")}
        </p>
      </div>

      {/* The discrepancy, named as the volunteer types it rather than
          discovered at the desk. `aria-live` because the line rewrites itself
          under the field. */}
      {difference !== 0 && (
        <p
          aria-live="polite"
          className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-700 tabular-nums dark:text-amber-400"
        >
          {difference > 0
            ? t("me_cash_excess", { amount: difference })
            : t("me_cash_deficit", { amount: -difference })}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cash-note" className="text-muted-foreground">
          {t("me_cash_note")}
        </Label>
        <Textarea
          id="cash-note"
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value.slice(0, 300))}
          className="min-h-16 resize-y"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {t(`me_cash_errors.${error}`)}
        </p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="h-12 gap-2 rounded-full text-base font-semibold"
      >
        {pending ? (
          <>
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            {t("me_cash_submitting")}
          </>
        ) : (
          <>
            <BanknoteArrowUp className="size-4" aria-hidden="true" />
            {t("me_cash_submit", { amount: declared })}
          </>
        )}
      </Button>
    </form>
  );
}
