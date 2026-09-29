"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { HandHeart, LoaderCircle, Lock, ShieldCheck } from "lucide-react";
import { Modal } from "@/components/site/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { normalizePhone, PHONE_PATTERN } from "@/lib/courses/phone";
import { hasPincode } from "@/lib/donations/address";
import {
  MAX_DONATION,
  MIN_DONATION,
  defaultSeva,
  getSeva,
  isValidAmount,
  suggestedAmounts,
} from "@/lib/donations/sevas";
import { SEVA_LIST } from "@/lib/site-config";
import { startPayment } from "@/lib/payments/redirect";

/**
 * Giving, end to end, on this site.
 *
 * One provider owns one dialog, so the donate page can scatter as many "Donate"
 * buttons through its server-rendered sections as it likes — each seva card,
 * each Pitru Paksha card, each row of the vigraha price list and both hero
 * CTAs are tiny client buttons that ask this provider to open, already carrying
 * the seva and the amount the visitor pressed. There is only ever one form, and
 * it opens with their choice already made.
 *
 * Details are asked for once and remembered on the device, because the address
 * an 80G receipt needs is the most tedious thing on this page to type, and
 * somebody who gives at Janmashtami should be two taps away from giving again
 * at Kartik.
 */

const DonateContext = createContext(null);

/* Shared with the checkout dialog on purpose: someone who has enrolled on a
   course has already typed their name, phone and email into this browser, and
   asking for them again would be asking for nothing. The donation-only fields
   are kept in a key of their own so a course checkout never has to carry them. */
const PROFILE_KEY = "iyf:checkout-profile";
const PROFILE_FIELDS = ["name", "phone", "email"];
const DONOR_KEY = "iyf:donor-profile";
const DONOR_FIELDS = ["address", "pan"];

const KNOWN_ERRORS = [
  "rate_limited",
  "invalid",
  "not_found",
  "closed",
  "payment_unavailable",
  "network",
  "generic",
];

/* Messages are keys into `donate.form.field_errors`, so a validation error
   reads in the visitor's language rather than zod's English. */
const schema = z.object({
  name: z.string().trim().min(2, "name"),
  phone: z
    .string()
    .refine((v) => PHONE_PATTERN.test(normalizePhone(v)), "phone"),
  email: z.string().trim().email("email"),
  /* One box, PIN included — see `lib/donations/address.js`. The two checks
     are separate messages because "too short" and "no PIN in it" are two
     different things to fix, and an address can easily be one without the
     other. */
  address: z
    .string()
    .trim()
    .min(10, "address")
    .max(300, "address")
    .refine(hasPincode, "address_pincode"),
  /* Optional, and only checked for shape when it is filled in. Whether it is a
     real PAN is the Income Tax Department's business. */
  pan: z
    .string()
    .trim()
    .refine((v) => v === "" || /^[A-Za-z]{5}\d{4}[A-Za-z]$/.test(v), "pan"),
});

export function useDonate() {
  const value = useContext(DonateContext);
  if (!value) throw new Error("useDonate must be used inside <DonateProvider>");
  return value;
}

export function DonateProvider({ open: openable = true, children }) {
  /*
   * One session per press of a Donate button: the seva and amount it asked for,
   * plus an id that only counts up.
   *
   * The dialog is keyed on that id, so every open mounts a fresh form whose
   * starting seva and amount are initial state. The alternative — one long-lived
   * dialog resynchronised from props by an effect — re-rendered twice on every
   * open and left the last donor's amount on screen for a frame.
   *
   * `open` is tracked apart from the session, and the session is kept after
   * closing, so the dialog can play its exit animation instead of vanishing.
   */
  const [session, setSession] = useState(null);
  const [open, setOpen] = useState(false);

  const openDonate = useCallback(
    (next = {}) => {
      if (!openable) return;
      setSession((previous) => ({
        id: (previous?.id ?? 0) + 1,
        sevaSlug: next.sevaSlug || null,
        amount: Number(next.amount) || null,
        /* Which sevas this button is willing to offer, if it cares. Null is
           the usual answer and means the whole list. */
        sevas: next.sevas?.length ? next.sevas : null,
      }));
      setOpen(true);
    },
    [openable],
  );

  const value = useMemo(
    () => ({ openDonate, enabled: openable }),
    [openDonate, openable],
  );

  return (
    <DonateContext.Provider value={value}>
      {children}
      {session && (
        <DonateDialog
          key={session.id}
          session={session}
          open={open}
          onClose={() => setOpen(false)}
        />
      )}
    </DonateContext.Provider>
  );
}

/**
 * A "Donate" button anywhere on the page.
 *
 * Renders as a `<button>` and not a link, which is the whole change from what
 * this page used to be: nothing leaves the site any more, so nothing should
 * look like it does.
 */
export function DonateButton({
  sevaSlug,
  amount,
  sevas,
  className,
  variant,
  size = "lg",
  children,
  ...rest
}) {
  const { openDonate, enabled } = useDonate();

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      disabled={!enabled}
      onClick={() => openDonate({ sevaSlug, amount, sevas })}
      className={cn("rounded-full", className)}
      {...rest}
    >
      {children}
    </Button>
  );
}

/**
 * One row of the vigraha price list, as a trigger.
 *
 * Its own component because that list is not a row of buttons — it is a price
 * list where the name and the amount have to stay paired on one line, and a
 * `<Button>` cannot hold that shape.
 */
export function SevaPriceRow({ sevaSlug, amount, label }) {
  const { openDonate, enabled } = useDonate();
  const format = useFormatter();

  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={() => openDonate({ sevaSlug, amount })}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-3.5 py-2.5 text-start text-sm transition-colors outline-none hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
    >
      <span className="min-w-0 truncate text-foreground/90">{label}</span>
      <span className="shrink-0 font-semibold tabular-nums text-primary">
        ₹{format.number(amount)}
      </span>
    </button>
  );
}

/* --------------------------------------------------------------- the form */

function DonateDialog({ session, open, onClose }) {
  const t = useTranslations("donate.form");
  const tSeva = useTranslations("donate.seva");
  const locale = useLocale();
  const format = useFormatter();

  // form → submitting (saving the offering) → redirecting (leaving to pay)
  const [stage, setStage] = useState("form");
  const [error, setError] = useState(null);

  /*
   * What the select is allowed to offer.
   *
   * Normally the whole list. A button may hand over a shortlist instead — the
   * donate page's hero does during Pitru Paksha, where the page around this
   * dialog is asking for three specific sevas and a select still offering the
   * other six would be undoing the ask the visitor just answered. An empty or
   * unrecognised shortlist falls back to the full list rather than to a select
   * with nothing in it.
   */
  const options = useMemo(() => {
    const shortlist = SEVA_LIST.filter((seva) =>
      session.sevas?.includes(seva.slug),
    );
    return shortlist.length ? shortlist : SEVA_LIST;
  }, [session.sevas]);

  /* What the pressed button asked for. An amount it did not name falls back to
     the seva's own default rather than to whatever the last donor chose, which
     is how ₹51,000 used to end up offered against a ₹501 seva. */
  const wanted = getSeva(session.sevaSlug) || defaultSeva();
  /* A shortlist the wanted seva is not on means the button named no seva of
     its own (the hero's "Donate" is the case), so open on the first it does
     offer — never on a seva the select cannot show. */
  const opening = options.includes(wanted) ? wanted : options[0];
  const openingAmount = isValidAmount(session.amount)
    ? session.amount
    : opening.defaultAmount;
  const openingIsSuggested = suggestedAmounts(opening).includes(openingAmount);

  const [sevaSlug, setSevaSlug] = useState(opening.slug);
  const [amount, setAmount] = useState(openingAmount);
  /* The custom box is only shown once asked for, so the chips stay the fast
     path and the keyboard does not open on a phone for nothing — unless the
     button that opened this dialog named an amount no chip offers. */
  const [customOpen, setCustomOpen] = useState(!openingIsSuggested);
  const [custom, setCustom] = useState(
    openingIsSuggested ? "" : String(openingAmount),
  );

  const seva = getSeva(sevaSlug) || defaultSeva();
  const chips = suggestedAmounts(seva);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      pan: "",
    },
  });

  /* The one-time details, remembered on this device. Only fills what is still
     empty, so it never overwrites what the visitor has typed. Runs on mount
     because the dialog is mounted fresh for each donation. */
  useEffect(() => {
    const restore = (key, fields) => {
      try {
        const saved = JSON.parse(localStorage.getItem(key) || "null");
        if (!saved) return;
        for (const field of fields) {
          if (saved[field] && !getValues(field))
            setValue(field, String(saved[field]));
        }
      } catch {
        /* Storage blocked — the form simply starts empty. */
      }
    };
    restore(PROFILE_KEY, PROFILE_FIELDS);
    restore(DONOR_KEY, DONOR_FIELDS);

    /* The PIN used to be a box of its own, so a donor who gave before this
       changed has one saved apart from their address. Fold it in rather than
       making them find their own PIN in a form that now refuses the address
       they last gave. */
    try {
      const saved = JSON.parse(localStorage.getItem(DONOR_KEY) || "null");
      const address = getValues("address");
      if (saved?.pincode && address && !hasPincode(address))
        setValue("address", `${address}, ${saved.pincode}`);
    } catch {
      /* Storage blocked — nothing was restored to fix up. */
    }
  }, [getValues, setValue]);

  /* Pressing Back on the gateway restores this page from the bfcache with the
     spinner still running. Put the form back. */
  useEffect(() => {
    const onShow = (event) => {
      if (event.persisted) setStage("form");
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  function handleOpenChange(next) {
    // Never let the dialog be dismissed while the browser is leaving for the
    // gateway — a half-closed form over a navigating page is worse than a wait.
    if (!next && stage === "form") onClose();
  }

  function pickSeva(slug) {
    const next = getSeva(slug) || defaultSeva();
    setSevaSlug(next.slug);
    setAmount(next.defaultAmount);
    setCustomOpen(false);
    setCustom("");
  }

  function remember(values) {
    try {
      localStorage.setItem(
        PROFILE_KEY,
        JSON.stringify({
          ...JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}"),
          ...Object.fromEntries(
            PROFILE_FIELDS.map((f) => [f, values[f] ?? ""]),
          ),
        }),
      );
      localStorage.setItem(
        DONOR_KEY,
        JSON.stringify(
          Object.fromEntries(DONOR_FIELDS.map((f) => [f, values[f] ?? ""])),
        ),
      );
    } catch {
      /* Nothing to do — next time they type it again. */
    }
  }

  async function onSubmit(values) {
    if (!isValidAmount(amount)) {
      setError("amount");
      return;
    }

    setError(null);
    setStage("submitting");

    let response;
    let result;
    try {
      response = await fetch("/api/donations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          phone: normalizePhone(values.phone),
          pan: values.pan?.toUpperCase() || undefined,
          seva: seva.slug,
          amount,
          locale,
        }),
      });
      result = await response.json().catch(() => null);
    } catch {
      setStage("form");
      setError("network");
      return;
    }

    if (!response.ok || !result?.ok) {
      setStage("form");
      setError(KNOWN_ERRORS.includes(result?.error) ? result.error : "generic");
      return;
    }

    remember(values);
    setStage("redirecting");

    if (result.next !== "payment") {
      window.location.assign(result.statusUrl);
      return;
    }

    const payment = await startPayment({
      orderId: result.orderId,
      token: result.token,
      kind: "donation",
      lang: locale,
    });

    if (!payment.ok) {
      setStage("form");
      /* Closing the checkout is a choice, not an error; the offering stays
         saved and the status page can finish it. */
      if (!payment.cancelled) {
        setError(
          KNOWN_ERRORS.includes(payment.error) ? payment.error : "generic",
        );
      }
    }
  }

  const fieldError = (name) =>
    errors[name] ? t(`field_errors.${errors[name].message || name}`) : null;

  const amountLabel = `₹${format.number(amount || 0)}`;

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title={t("title")}
      description={t("description")}
      className="max-h-[92dvh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg"
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-5 pt-1"
      >
        {/* ------------------------------------------------------ the seva */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="donate-seva" className="text-muted-foreground">
            {t("seva")}
          </Label>
          {/* A select rather than the card grid again: the visitor has already
              chosen on the page behind this dialog, and this is only here so a
              wrong tap costs one press instead of closing the form. */}
          <select
            id="donate-seva"
            value={sevaSlug}
            disabled={stage !== "form"}
            onChange={(event) => pickSeva(event.target.value)}
            className="h-11 rounded-lg border border-input bg-transparent px-3 text-base outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 md:text-sm dark:bg-input/30"
          >
            {options.map((option) => (
              <option key={option.key} value={option.slug}>
                {tSeva(`${option.key}.name`)}
              </option>
            ))}
          </select>
        </div>

        {/* ---------------------------------------------------- the amount */}
        <div className="flex flex-col gap-2.5">
          <Label className="text-muted-foreground">{t("amount")}</Label>
          <div role="group" className="flex flex-wrap gap-2">
            {chips.map((value) => {
              const selected = !customOpen && value === amount;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  disabled={stage !== "form"}
                  onClick={() => {
                    setAmount(value);
                    setCustomOpen(false);
                    setCustom("");
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[13px] font-medium tabular-nums transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  ₹{format.number(value)}
                </button>
              );
            })}
            <button
              type="button"
              aria-pressed={customOpen}
              disabled={stage !== "form"}
              onClick={() => setCustomOpen(true)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                customOpen
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {t("amount_other")}
            </button>
          </div>

          {customOpen && (
            <div className="flex h-11 items-center rounded-lg border border-input bg-transparent focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30">
              <span className="ps-3 pe-1 text-sm text-muted-foreground">₹</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                aria-label={t("amount_other")}
                value={custom}
                disabled={stage !== "form"}
                onChange={(event) => {
                  const digits = event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 7);
                  setCustom(digits);
                  setAmount(Number(digits) || 0);
                  if (error === "amount") setError(null);
                }}
                className="h-full min-w-0 flex-1 bg-transparent pe-3 text-base tabular-nums outline-none md:text-sm"
              />
            </div>
          )}

          {customOpen && (
            <p className="text-[11px] leading-snug text-muted-foreground/80">
              {t("amount_hint", { min: MIN_DONATION, max: MAX_DONATION })}
            </p>
          )}
        </div>

        {/* ----------------------------------------------------- the donor */}
        <Field id="donate-name" label={t("name")} error={fieldError("name")}>
          <Input
            id="donate-name"
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            className="h-11"
            {...register("name")}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="donate-phone"
            label={t("phone")}
            error={fieldError("phone")}
          >
            <div className="flex h-11 items-center rounded-lg border border-input bg-transparent focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30">
              <span className="ps-3 pe-1 text-sm text-muted-foreground">
                +91
              </span>
              <input
                id="donate-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                aria-invalid={Boolean(errors.phone)}
                className="h-full min-w-0 flex-1 bg-transparent pe-3 text-base outline-none md:text-sm"
                {...register("phone")}
              />
            </div>
          </Field>

          <Field
            id="donate-email"
            label={t("email")}
            error={fieldError("email")}
          >
            <Input
              id="donate-email"
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              className="h-11"
              {...register("email")}
            />
          </Field>
        </div>

        {/* One box for the whole address, PIN and all. An 80G receipt needs an
            address a postal worker can read, not five boxes that get the city
            typed into the street field — and the PIN, the one part that can
            actually be checked, is easier to find in the line the donor wrote
            than to ask for twice. `extractPincode` pulls it back out for the
            row; the form only insists it is in there. */}
        <Field
          id="donate-address"
          label={t("address")}
          hint={t("address_hint")}
          error={fieldError("address")}
        >
          <Textarea
            id="donate-address"
            rows={3}
            autoComplete="street-address"
            aria-invalid={Boolean(errors.address)}
            className="min-h-20 resize-y"
            {...register("address")}
          />
        </Field>

        <Field
          id="donate-pan"
          label={
            <>
              {t("pan")}{" "}
              <span className="font-normal text-muted-foreground/70">
                ({t("optional")})
              </span>
            </>
          }
          hint={t("pan_hint")}
          error={fieldError("pan")}
        >
          <Input
            id="donate-pan"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={10}
            aria-invalid={Boolean(errors.pan)}
            className="h-11 max-w-56 font-mono uppercase"
            {...register("pan")}
          />
        </Field>

        {error && (
          <p
            role="alert"
            className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {t(`errors.${error}`)}
          </p>
        )}

        <Button
          type="submit"
          disabled={stage !== "form"}
          className="mt-1 h-12 gap-2 rounded-full text-base font-semibold shadow-lg shadow-primary/25"
        >
          {stage === "form" ? (
            <>
              <HandHeart className="size-4" aria-hidden="true" />
              {t("submit", { amount: amountLabel })}
            </>
          ) : (
            <>
              <LoaderCircle
                className="size-4 animate-spin"
                aria-hidden="true"
              />
              {t(stage)}
            </>
          )}
        </Button>

        <div className="flex flex-col gap-1.5">
          <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck
              className="mt-0.5 size-3.5 shrink-0 text-primary"
              aria-hidden="true"
            />
            {t("secure")}
          </p>
          <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
            <Lock
              className="mt-0.5 size-3.5 shrink-0 text-primary"
              aria-hidden="true"
            />
            {t("receipt_note")}
          </p>
          <p className="text-[11px] leading-relaxed text-muted-foreground/80">
            {t.rich("terms", {
              terms: (chunks) => (
                <Link
                  href="/terms"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  {chunks}
                </Link>
              ),
              refund: (chunks) => (
                <Link
                  href="/refund"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  {chunks}
                </Link>
              ),
              privacy: (chunks) => (
                <Link
                  href="/privacy"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>
      </form>
    </Modal>
  );
}

function Field({ id, label, hint, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-muted-foreground">
        {label}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-[11px] leading-snug text-muted-foreground/80">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
