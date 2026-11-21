"use client";

import { useCallback, useMemo, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import {
  BanknoteArrowDown,
  BookOpen,
  CircleCheck,
  CircleX,
  Copy,
  LoaderCircle,
  Minus,
  PackageOpen,
  Plus,
  QrCode,
  RotateCcw,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "@/components/site/Panel";
import { MAX_PER_TITLE, priceBasket } from "@/lib/marathon/books";
import { UPI_QR_IMAGE, UPI_VPA, upiIntentUrl } from "@/lib/payments/upi";
import { cn } from "@/lib/utils";

/**
 * The screen a volunteer actually uses, standing in a market with one hand
 * free.
 *
 * Everything about it is shaped by that. Steppers instead of a form; a
 * running total that is always on screen; two buttons the size of a thumb;
 * and a single decision at the end — cash, or show the QR. There is no
 * "submit" and no page navigation in the common path, because a volunteer
 * with a queue in front of them cannot afford a round trip they have to wait
 * out and then find their way back from.
 *
 * What is on the screen is `stock`: the titles this volunteer was actually
 * handed, at the prices they were handed them at, with what is left of each.
 * Not the site's catalogue — a coordinator can issue a title the catalogue
 * has never heard of, and a volunteer who was given forty Hindi Gitas should
 * not be able to record the forty-first. The steppers stop at what is left
 * and /api/marathon/sales refuses anything past it, so a stale tab cannot get
 * round the cap either.
 *
 * The two ways to pay are genuinely different mechanisms:
 *
 *   Cash    recorded and finished in one request. The money is already in
 *           their hand; what is left is the evening's reconciliation, and the
 *           confirm step exists so that a mis-tap cannot add ₹300 to what
 *           they will be asked for at the desk.
 *
 *   UPI     the reader scans the temple's own printed QR and pays straight
 *           into its account. Nothing comes back to this site when they do —
 *           a fixed code carries no order and fires no webhook — so the
 *           volunteer closes the sale by typing the last four digits of the
 *           UTR off the reader's phone. That is a claim, and the row says so
 *           until a coordinator finds it on the statement.
 *
 * `priceBasket` is imported rather than reimplemented: the total on screen
 * and the total in the database come out of the same function applied to the
 * same trolley, so a volunteer can never be shown one figure and charged for
 * another.
 */

const SALE_ERRORS = [
  "rate_limited",
  "invalid",
  "empty",
  "closed",
  "not_active",
  "no_stock",
  "out_of_stock",
  "network",
  "generic",
];

export function SellConsole({ stock = [] }) {
  const t = useTranslations("marathon");
  const locale = useLocale();
  const format = useFormatter();

  /* basket → confirm? → (upi | cash_done) → paid | failed */
  const [stage, setStage] = useState("basket");
  /* The method whose request is in flight, or null. Kept apart from `stage`
     because the screen it belongs on differs: a cash sale is confirmed from
     the confirm panel and must stay on it while it saves, an online one goes
     straight from the basket. One "recording" stage could only be on one. */
  const [recording, setRecording] = useState(null);
  const [error, setError] = useState(null);

  const [counts, setCounts] = useState(() =>
    Object.fromEntries(stock.map((book) => [book.bookKey, 0])),
  );
  const [showBuyer, setShowBuyer] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");

  /** The sale once it exists: what came back from /api/marathon/sales. */
  const [sale, setSale] = useState(null);

  const lines = useMemo(
    () =>
      Object.entries(counts)
        .filter(([, quantity]) => quantity > 0)
        .map(([bookKey, quantity]) => ({ bookKey, quantity })),
    [counts],
  );

  const basket = useMemo(() => priceBasket(lines, stock), [lines, stock]);
  const empty = basket.quantity < 1;

  /* Nothing issued means nothing to sell, and saying so plainly is better
     than an empty screen the volunteer has to interpret. */
  const nothingIssued = stock.length === 0;
  const allGone =
    !nothingIssued && stock.every((book) => book.remaining < 1);

  function step(key, delta) {
    setError(null);
    const book = stock.find((item) => item.bookKey === key);
    const ceiling = Math.min(MAX_PER_TITLE, book?.remaining ?? 0);
    setCounts((previous) => ({
      ...previous,
      [key]: Math.min(ceiling, Math.max(0, (previous[key] || 0) + delta)),
    }));
  }

  function reset() {
    setCounts(Object.fromEntries(stock.map((book) => [book.bookKey, 0])));
    setBuyerName("");
    setBuyerPhone("");
    setShowBuyer(false);
    setSale(null);
    setError(null);
    setRecording(null);
    setStage("basket");
  }

  /* ---- Recording ------------------------------------------------------- */

  const record = useCallback(
    async (method) => {
      setError(null);
      setRecording(method);

      let result;
      try {
        const response = await fetch("/api/marathon/sales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lines,
            method,
            buyerName,
            buyerPhone,
            locale,
          }),
        });
        result = await response.json().catch(() => null);
        if (!response.ok || !result?.ok) {
          setRecording(null);
          setStage("basket");
          setError(
            SALE_ERRORS.includes(result?.error) ? result.error : "generic",
          );
          return;
        }
      } catch {
        /* The request never landed, so nothing was recorded — which is the
           one thing the volunteer needs told, because the alternative is them
           recording the same sale twice. */
        setRecording(null);
        setStage("basket");
        setError("network");
        return;
      }

      setRecording(null);
      setSale(result);
      setStage(method === "cash" ? "cash_done" : "upi");
    },
    [lines, buyerName, buyerPhone, locale],
  );

  /* ---- Render ---------------------------------------------------------- */

  if (stage === "cash_done" || stage === "paid" || stage === "failed") {
    return <Done stage={stage} sale={sale} onReset={reset} t={t} />;
  }

  if (stage === "upi") {
    return (
      <UpiPanel
        sale={sale}
        format={format}
        t={t}
        onPaid={(confirmed) => {
          setSale((previous) => ({ ...previous, ...confirmed }));
          setStage("paid");
        }}
        onReset={reset}
      />
    );
  }

  if (nothingIssued) {
    return (
      <Panel className="p-7 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
          <PackageOpen className="size-6" aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-lg font-semibold tracking-tight">
          {t("sell_no_stock_title")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t("sell_no_stock_body")}
        </p>
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ------------------------------------------------------- the books */}
      <div className="grid gap-3 sm:grid-cols-2">
        {stock.map((book) => {
          const quantity = counts[book.bookKey] || 0;
          const out = book.remaining < 1;
          return (
            <Panel
              key={book.bookKey}
              className={cn(
                "p-4 transition-colors",
                quantity > 0 && "border-primary/40 bg-primary/[0.04]",
                out && "opacity-60",
              )}
            >
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full border border-primary/25 bg-primary/10 text-primary">
                  <BookOpen className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug font-semibold text-balance">
                    {bookName(book, locale, t)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                    {t("sell_each", { price: book.unitPrice })}
                    {" · "}
                    {/* What is left of what they were handed. The number that
                        decides whether they can say yes to the next reader,
                        so it is on the card rather than in a summary. */}
                    {out
                      ? t("sell_out_of_stock")
                      : t("sell_left", { left: book.remaining })}
                  </p>
                </div>
              </div>

              {/* A stepper and not a number input: a numeric keyboard opening
                  over the total is the one thing this screen cannot afford,
                  and nobody taps 300 Gitas into one sale. */}
              <div className="mt-4 flex items-center gap-3">
                <StepButton
                  label="-"
                  disabled={quantity === 0 || Boolean(recording)}
                  onClick={() => step(book.bookKey, -1)}
                >
                  <Minus className="size-4" aria-hidden="true" />
                </StepButton>
                <span
                  aria-live="polite"
                  className="min-w-10 text-center text-xl font-semibold tabular-nums"
                >
                  {quantity}
                </span>
                <StepButton
                  label="+"
                  disabled={
                    Boolean(recording) ||
                    quantity >= Math.min(MAX_PER_TITLE, book.remaining)
                  }
                  onClick={() => step(book.bookKey, 1)}
                >
                  <Plus className="size-4" aria-hidden="true" />
                </StepButton>
                {quantity > 0 && (
                  <span className="ms-auto text-sm font-semibold text-primary tabular-nums">
                    ₹{format.number(book.unitPrice * quantity)}
                  </span>
                )}
              </div>
            </Panel>
          );
        })}
      </div>

      {allGone && (
        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          {t("sell_all_gone")}
        </p>
      )}

      {/* ------------------------------------------------- reader details */}
      {showBuyer ? (
        <Panel className="grid gap-4 p-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sell-buyer" className="text-muted-foreground">
              {t("sell_buyer_name")}
            </Label>
            <Input
              id="sell-buyer"
              value={buyerName}
              onChange={(event) => setBuyerName(event.target.value.slice(0, 80))}
              className="h-11"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sell-buyer-phone" className="text-muted-foreground">
              {t("sell_buyer_phone")}
            </Label>
            <div className="flex h-11 items-center rounded-lg border border-input bg-transparent focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30">
              <span className="ps-3 pe-1 text-sm text-muted-foreground">+91</span>
              <input
                id="sell-buyer-phone"
                type="tel"
                inputMode="numeric"
                value={buyerPhone}
                onChange={(event) =>
                  setBuyerPhone(event.target.value.replace(/\D/g, "").slice(0, 10))
                }
                className="h-full min-w-0 flex-1 bg-transparent pe-3 text-base outline-none md:text-sm"
              />
            </div>
          </div>
        </Panel>
      ) : (
        <button
          type="button"
          onClick={() => setShowBuyer(true)}
          className="self-start text-sm font-medium text-primary underline underline-offset-4"
        >
          {t("sell_buyer_toggle")}
        </button>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {t(`sell_errors.${error}`)}
        </p>
      )}

      {/* ------------------------------------------------- total and pay */}
      {/* Sticky above the dock on a phone: the total and the two buttons are
          the only things on this screen that are always needed, and scrolling
          back up to find them while somebody waits is the failure mode this
          avoids. The dock is 5.5rem tall plus the home indicator. */}
      <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 -mx-4 border-t border-border bg-background/95 px-4 py-4 backdrop-blur-lg sm:static sm:mx-0 sm:rounded-2xl sm:border sm:px-5 md:bottom-4">
        <p
          aria-live="polite"
          className="text-center text-base font-semibold tabular-nums"
        >
          {empty ? (
            <span className="font-normal text-muted-foreground">
              {t("sell_basket_empty")}
            </span>
          ) : (
            t("sell_total", { books: basket.quantity, amount: basket.amount })
          )}
        </p>

        {stage === "confirm" ? (
          <div className="mt-4">
            <p className="text-sm font-semibold">
              {t("sell_confirm_cash_title", { amount: basket.amount })}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t("sell_confirm_cash_body")}
            </p>
            <div className="mt-4 flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-12 flex-1 rounded-full"
                onClick={() => setStage("basket")}
              >
                {t("sell_cancel")}
              </Button>
              <Button
                type="button"
                disabled={Boolean(recording)}
                className="h-12 flex-1 rounded-full"
                onClick={() => record("cash")}
              >
                {recording === "cash" ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                    {t("sell_recording")}
                  </>
                ) : (
                  t("sell_confirm")
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={empty || stage !== "basket"}
              onClick={() => setStage("confirm")}
              className="h-auto flex-col gap-0.5 rounded-2xl py-3"
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <BanknoteArrowDown className="size-4" aria-hidden="true" />
                {t("sell_cash")}
              </span>
              <span className="text-[11px] font-normal text-muted-foreground">
                {t("sell_cash_hint")}
              </span>
            </Button>
            <Button
              type="button"
              disabled={empty || Boolean(recording)}
              onClick={() => record("online")}
              className="h-auto flex-col gap-0.5 rounded-2xl py-3"
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                {recording === "online" ? (
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <QrCode className="size-4" aria-hidden="true" />
                )}
                {recording === "online" ? t("sell_recording") : t("sell_online")}
              </span>
              <span className="text-[11px] font-normal opacity-80">
                {t("sell_online_hint")}
              </span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- Pieces ------------------------------------------------------------- */

/**
 * A title's printed name.
 *
 * A catalogue title's name is translated and comes from the message bundle; a
 * title a coordinator typed in has only what they typed, stored in both
 * language slots. The trolley's own snapshot is preferred where there is one
 * because that is what the receipt will say.
 */
function bookName(book, locale, t) {
  const snapshot = locale === "hi" ? book.title?.hi : book.title?.en;
  if (snapshot) return snapshot;
  if (book.custom) return book.title?.en || book.title?.hi || book.bookKey;
  try {
    return t(`books.${book.bookKey}.name`);
  } catch {
    return book.bookKey;
  }
}

function StepButton({ label, disabled, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      /* 44px square — the smallest target that is reliably hit with a thumb,
         which is the only way this button is ever pressed. */
      className="grid size-11 place-items-center rounded-full border border-border bg-background text-foreground transition-colors hover:border-primary/40 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/**
 * The temple's QR, while the reader is paying into it.
 *
 * The code is fixed — the same one on the printed card at the counter — so it
 * carries no amount and nothing that says which sale it belongs to. Both of
 * those are handled here rather than pretended away: the amount is set in
 * type larger than anything else on the screen, because the reader has to key
 * it in themselves, and the sale is closed by the volunteer typing the last
 * four digits of the UTR off the reader's phone.
 *
 * Shown with a plain `<img>`: a recompressed QR is a QR that fails to scan in
 * bad light, and this one is a static file that needs no optimising.
 */
function UpiPanel({ sale, format, t, onPaid, onReset }) {
  const [kind, setKind] = useState("utr");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const valid =
    kind === "utr" ? /^\d{4}$/.test(reference) : reference.trim().length >= 3;

  async function confirm() {
    if (!valid || !sale?.orderId) return;
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/marathon/sales/${encodeURIComponent(sale.orderId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, reference: reference.trim() }),
        },
      );
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) {
        setSaving(false);
        setError(SALE_ERRORS.includes(result?.error) ? result.error : "generic");
        return;
      }
      onPaid(result);
    } catch {
      setSaving(false);
      setError("network");
    }
  }

  async function copyVpa() {
    try {
      await navigator.clipboard.writeText(UPI_VPA);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard blocked. The handle is on screen to be typed either way. */
    }
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <Panel className="w-full max-w-sm p-6 text-center">
        <h2 className="text-lg font-semibold tracking-tight">
          {t("sell_upi_title")}
        </h2>

        {/* The amount first and biggest. A fixed code cannot carry it, so the
            reader types it in — which makes this the one number on the screen
            that a mistake costs real money. */}
        <p className="mt-4 text-4xl font-bold tabular-nums">
          ₹{format.number(sale?.amount || 0)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("sell_upi_amount_hint")}
        </p>

        <div className="mx-auto mt-5 w-full max-w-64 rounded-2xl border border-border bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- the bank's own QR; re-encoding it risks an unscannable code */}
          <img
            src={UPI_QR_IMAGE}
            alt={t("sell_upi_alt")}
            width={512}
            height={512}
            className="h-auto w-full"
          />
        </div>

        <button
          type="button"
          onClick={copyVpa}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <Copy className="size-3" aria-hidden="true" />
          {copied ? t("sell_upi_copied") : UPI_VPA}
        </button>

        {/* On the reader's own phone this opens their UPI app with the payee
            and the amount already filled in, which is both faster and safer
            than scanning a code that carries neither. */}
        <a
          href={upiIntentUrl({ amount: sale?.amount, orderId: sale?.orderId })}
          className="mt-3 flex items-center justify-center gap-2 text-sm font-medium text-primary underline underline-offset-4"
        >
          <Smartphone className="size-4" aria-hidden="true" />
          {t("sell_upi_open_app")}
        </a>
      </Panel>

      {/* ------------------------------------------------ the confirmation */}
      <Panel className="w-full max-w-sm p-5">
        <h3 className="text-sm font-semibold tracking-tight">
          {t("sell_claim_title")}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {t("sell_claim_body")}
        </p>

        <div className="mt-4 flex gap-2">
          {["utr", "time"].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setKind(option);
                setReference("");
                setError(null);
              }}
              className={cn(
                "flex-1 rounded-full border px-3 py-2 text-xs font-medium transition-colors",
                kind === option
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {t(`sell_claim_${option}`)}
            </button>
          ))}
        </div>

        <div className="mt-3">
          <Label htmlFor="sell-claim" className="sr-only">
            {t(`sell_claim_${kind}`)}
          </Label>
          <Input
            id="sell-claim"
            value={reference}
            inputMode={kind === "utr" ? "numeric" : "text"}
            placeholder={t(`sell_claim_${kind}_placeholder`)}
            onChange={(event) =>
              setReference(
                kind === "utr"
                  ? event.target.value.replace(/\D/g, "").slice(0, 4)
                  : event.target.value.slice(0, 40),
              )
            }
            className="h-12 text-center text-lg tracking-[0.3em] tabular-nums"
          />
        </div>

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {t(`sell_errors.${error}`)}
          </p>
        )}

        <Button
          type="button"
          disabled={!valid || saving}
          onClick={confirm}
          className="mt-4 h-12 w-full rounded-full text-base font-semibold"
        >
          {saving ? (
            <>
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              {t("sell_recording")}
            </>
          ) : (
            <>
              <CircleCheck className="size-4" aria-hidden="true" />
              {t("sell_claim_confirm")}
            </>
          )}
        </Button>
      </Panel>

      <Button
        type="button"
        variant="ghost"
        onClick={onReset}
        className="h-11 rounded-full"
      >
        <RotateCcw className="size-4" aria-hidden="true" />
        {t("sell_abandon")}
      </Button>
    </div>
  );
}

/** The end of a sale — cash taken, money received, or payment refused. */
function Done({ stage, sale, onReset, t }) {
  const view = {
    cash_done: {
      Icon: CircleCheck,
      bubble: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
      title: t("sell_cash_done_title", { amount: sale?.amount || 0 }),
      body: t("sell_cash_done_body", { books: sale?.quantity || 0 }),
    },
    paid: {
      Icon: CircleCheck,
      bubble: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
      title: t("sell_paid_title", { amount: sale?.amount || 0 }),
      body: t("sell_upi_done_body", { books: sale?.quantity || 0 }),
    },
    failed: {
      Icon: CircleX,
      bubble: "bg-destructive/12 text-destructive",
      title: t("sell_failed_title"),
      body: t("sell_failed_body"),
    },
  }[stage];

  return (
    <div className="flex flex-col items-center gap-5 py-6 text-center">
      <span
        className={cn(
          "grid size-16 place-items-center rounded-full",
          view.bubble,
        )}
      >
        <view.Icon className="size-8" aria-hidden="true" />
      </span>

      <div>
        <h2 className="text-xl font-semibold tracking-tight text-balance">
          {view.title}
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {view.body}
        </p>
        {sale?.orderId && (
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            {sale.orderId}
          </p>
        )}
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        {/* The next sale is the only thing a volunteer wants from this screen,
            so it is the primary action and it is big. */}
        <Button
          type="button"
          onClick={onReset}
          className="h-12 rounded-full text-base font-semibold"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          {t("sell_new_sale")}
        </Button>
        {stage !== "failed" && sale?.statusUrl && (
          <Button
            variant="ghost"
            className="h-11 rounded-full"
            render={<a href={sale.statusUrl} />}
          >
            {t("sell_receipt")}
          </Button>
        )}
      </div>
    </div>
  );
}
