"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import {
  BanknoteArrowDown,
  BookOpen,
  CircleCheck,
  CircleX,
  LoaderCircle,
  Minus,
  Plus,
  QrCode,
  RotateCcw,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "@/components/site/Panel";
import { GITA_BOOKS, MAX_PER_TITLE, priceBasket } from "@/lib/marathon/books";
import { startPayment } from "@/lib/payments/redirect";
import { cn } from "@/lib/utils";

/**
 * The screen a volunteer actually uses, standing in a market with one hand
 * free.
 *
 * Everything about it is shaped by that. Two big steppers instead of a form;
 * a running total that is always on screen; two buttons the size of a thumb;
 * and a single decision at the end — cash, or show a QR. There is no "submit"
 * and no page navigation in the common path, because a volunteer with a queue
 * in front of them cannot afford a round trip they have to wait out and then
 * find their way back from.
 *
 * The two halves of that decision are genuinely different mechanisms:
 *
 *   Cash      recorded and finished in one request. The money is already in
 *             their hand; what is left is the evening's reconciliation, and
 *             the confirm step exists so that a mis-tap cannot add ₹300 to
 *             what they will be asked for at the desk.
 *
 *   Online    the reader pays, on their own phone, by scanning a QR off this
 *             one. That is why it cannot be the ordinary checkout: the
 *             checkout assumes the payer is holding the device. The QR is
 *             created server-side for this exact amount, single-use, and the
 *             screen then polls until Razorpay says it has been paid — see
 *             /api/marathon/sales/[orderId], which settles it through the same
 *             writer every other payment on this site goes through.
 *
 * `priceBasket` is imported rather than reimplemented: the total on screen and
 * the total in the database come out of the same function, so a volunteer can
 * never be shown one figure and charged for another.
 */

/* Fast enough that the volunteer does not start wondering, slow enough that a
   sale left open for ten minutes is forty requests and not six hundred. */
const POLL_MS = 3000;

const SALE_ERRORS = [
  "rate_limited",
  "invalid",
  "empty",
  "closed",
  "not_active",
  "payment_unavailable",
  "network",
  "generic",
];

export function SellConsole() {
  const t = useTranslations("marathon");
  const locale = useLocale();
  const format = useFormatter();

  /* basket → confirm? → (qr | cash_done) → paid | failed */
  const [stage, setStage] = useState("basket");
  /* The method whose request is in flight, or null. Kept apart from `stage`
     because the screen it belongs on differs: a cash sale is confirmed from
     the confirm panel and must stay on it while it saves, an online one goes
     straight from the basket. One "recording" stage could only be on one of
     the two. */
  const [recording, setRecording] = useState(null);
  const [error, setError] = useState(null);

  const [counts, setCounts] = useState(() =>
    Object.fromEntries(GITA_BOOKS.map((book) => [book.key, 0])),
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

  const basket = useMemo(() => priceBasket(lines), [lines]);
  const empty = basket.quantity < 1;

  function step(key, delta) {
    setError(null);
    setCounts((previous) => ({
      ...previous,
      [key]: Math.min(MAX_PER_TITLE, Math.max(0, (previous[key] || 0) + delta)),
    }));
  }

  function reset() {
    setCounts(Object.fromEntries(GITA_BOOKS.map((book) => [book.key, 0])));
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

      if (method === "cash") {
        setStage("cash_done");
        return;
      }

      /* A QR is the happy path. Without one — the Razorpay account does not
         have the QR Codes API, or there is no gateway at all — the screen
         says so and offers the ordinary checkout instead of a blank square. */
      setStage("qr");
    },
    [lines, buyerName, buyerPhone, locale],
  );

  /* ---- Waiting for the QR to be paid ----------------------------------- */

  useEffect(() => {
    if (stage !== "qr" || !sale?.orderId || !sale?.qr) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const response = await fetch(
          `/api/marathon/sales/${encodeURIComponent(sale.orderId)}?t=${sale.token}`,
          { cache: "no-store" },
        );
        const result = await response.json().catch(() => null);
        if (cancelled || !result?.ok) return;

        /* Merged through the updater rather than from the `sale` this
           effect closed over, so a poll that comes back after another one has
           already written cannot resurrect the older value. */
        if (result.status === "success") {
          setSale((previous) => ({ ...previous, ...result }));
          setStage("paid");
        } else if (result.status === "failed" || result.status === "aborted") {
          setSale((previous) => ({ ...previous, ...result }));
          setStage("failed");
        }
      } catch {
        /* Offline for a moment at a stall is normal. Keep polling — the sale
           is saved either way, and the webhook settles it regardless. */
      }
    };

    const timer = setInterval(poll, POLL_MS);
    poll();

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [stage, sale?.orderId, sale?.token, sale?.qr]);

  /**
   * The QR's own lifetime, so an expired square says so instead of lying.
   *
   * Held as the order id that expired rather than a boolean, and compared on
   * render. A boolean would have to be cleared when the next sale starts,
   * which means writing state from an effect on every QR that opens; this way
   * a new order simply does not match and reads as unexpired.
   */
  const [expiredOrderId, setExpiredOrderId] = useState(null);
  useEffect(() => {
    if (stage !== "qr" || !sale?.orderId || !sale?.qr?.closeBy) return;

    const orderId = sale.orderId;
    const left = new Date(sale.qr.closeBy).getTime() - Date.now();
    /* A QR that is already past its close time expires on the next tick
       rather than during this effect. */
    const timer = setTimeout(() => setExpiredOrderId(orderId), Math.max(0, left));
    return () => clearTimeout(timer);
  }, [stage, sale?.orderId, sale?.qr?.closeBy]);

  const expired = Boolean(sale?.orderId) && expiredOrderId === sale.orderId;

  /* ---- The ordinary checkout, as a fallback ---------------------------- */

  const [opening, setOpening] = useState(false);

  async function openCheckout() {
    if (!sale?.orderId || !sale?.token) return;
    setOpening(true);
    setError(null);

    const payment = await startPayment({
      orderId: sale.orderId,
      token: sale.token,
      kind: "book",
      lang: locale,
    });

    setOpening(false);
    /* On success the browser is already navigating to Razorpay's callback, so
       there is nothing to do. Closing the overlay is a choice, not an error —
       the sale stays saved and the QR keeps waiting. */
    if (!payment.ok && !payment.cancelled) {
      setError(
        SALE_ERRORS.includes(payment.error) ? payment.error : "generic",
      );
    }
  }

  /* ---- Render ---------------------------------------------------------- */

  if (stage === "cash_done" || stage === "paid" || stage === "failed") {
    return (
      <Done stage={stage} sale={sale} onReset={reset} t={t} />
    );
  }

  if (stage === "qr") {
    return (
      <QrPanel
        sale={sale}
        expired={expired}
        opening={opening}
        error={error}
        onCheckout={openCheckout}
        onReset={reset}
        format={format}
        t={t}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ------------------------------------------------------- the books */}
      <div className="grid gap-3 sm:grid-cols-2">
        {GITA_BOOKS.map((book) => {
          const quantity = counts[book.key] || 0;
          return (
            <Panel
              key={book.key}
              className={cn(
                "p-4 transition-colors",
                quantity > 0 && "border-primary/40 bg-primary/[0.04]",
              )}
            >
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full border border-primary/25 bg-primary/10 text-primary">
                  <BookOpen className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug font-semibold text-balance">
                    {t(`books.${book.key}.name`)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                    {t("sell_each", { price: book.price })}
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
                  onClick={() => step(book.key, -1)}
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
                  disabled={quantity >= MAX_PER_TITLE || Boolean(recording)}
                  onClick={() => step(book.key, 1)}
                >
                  <Plus className="size-4" aria-hidden="true" />
                </StepButton>
                {quantity > 0 && (
                  <span className="ms-auto text-sm font-semibold text-primary tabular-nums">
                    ₹{format.number(book.price * quantity)}
                  </span>
                )}
              </div>
            </Panel>
          );
        })}
      </div>

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
 * The QR, while the reader is scanning it.
 *
 * The image comes from Razorpay and is shown with a plain `<img>`: it is an
 * off-site URL that must not be re-encoded (a recompressed QR is a QR that
 * fails to scan in bad light), and routing it through the Next optimizer would
 * put CPU work on a VPS that has none to spare for every single sale.
 */
function QrPanel({
  sale,
  expired,
  opening,
  error,
  onCheckout,
  onReset,
  format,
  t,
}) {
  const hasQr = Boolean(sale?.qr?.imageUrl) && !expired;

  return (
    <div className="flex flex-col items-center gap-5">
      <Panel className="w-full max-w-sm p-6 text-center">
        <h2 className="text-lg font-semibold tracking-tight">
          {hasQr ? t("sell_qr_title") : t("sell_qr_unavailable_title")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {hasQr
            ? t("sell_qr_body", { amount: sale.amount, books: sale.quantity })
            : t("sell_qr_unavailable_body")}
        </p>

        {hasQr && (
          <div className="mx-auto mt-5 w-full max-w-64 rounded-2xl border border-border bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- Razorpay's own QR; re-encoding it risks an unscannable code */}
            <img
              src={sale.qr.imageUrl}
              alt={t("sell_qr_alt", { amount: sale.amount })}
              width={256}
              height={256}
              className="h-auto w-full"
            />
          </div>
        )}

        {expired && (
          <p className="mt-4 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            {t("sell_qr_expired")}
          </p>
        )}

        <p className="mt-5 text-2xl font-semibold tabular-nums">
          ₹{format.number(sale?.amount || 0)}
        </p>

        {hasQr && (
          <p className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            {t("sell_qr_waiting")}
          </p>
        )}
      </Panel>

      {error && (
        <p
          role="alert"
          className="w-full max-w-sm rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {t(`sell_errors.${error}`)}
        </p>
      )}

      <div className="flex w-full max-w-sm flex-col gap-3">
        <Button
          type="button"
          variant={hasQr ? "outline" : undefined}
          disabled={opening}
          onClick={onCheckout}
          className="h-12 rounded-full"
        >
          {opening ? (
            <>
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              {t("sell_opening")}
            </>
          ) : (
            <>
              <Smartphone className="size-4" aria-hidden="true" />
              {t("sell_other_methods")}
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onReset}
          className="h-11 rounded-full"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          {t("sell_new_sale")}
        </Button>
      </div>
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
      body: t("sell_paid_body", { books: sale?.quantity || 0 }),
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
