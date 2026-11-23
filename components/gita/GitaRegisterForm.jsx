"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale, useTranslations } from "next-intl";
import {
  BadgeCheck,
  Check,
  LoaderCircle,
  Lock,
  ShieldCheck,
  Sparkles,
  UserRoundSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { normalizePhone, PHONE_PATTERN } from "@/lib/courses/phone";
import { startPayment } from "@/lib/payments/redirect";
import posthog from "posthog-js";

/**
 * The one form for the whole festival.
 *
 * A single form rather than one per event, because the two events are bought
 * together more often than separately and the combined fee only exists for
 * people who can see both boxes at once. Which boxes are ticked is the first
 * field on the form and the only one that changes the price, so it is at the
 * top and the total under it moves as they tick.
 *
 * The price shown here is advisory. The server reads the amount from the
 * catalog for the events it was sent (see /api/gita/register) and the gateway
 * is charged from the stored row, so nothing typed or tampered with in this
 * component can change what is actually taken.
 *
 * Validation messages are keys into `gita.field_errors`, not English sentences,
 * so a mistyped phone number reads in the visitor's own language.
 *
 * It asks for as little as the festival actually needs: a name, a number, an
 * email, who they are and their gender, which is what the seating, the
 * prasadam count and the two groups are planned from. There is no address box
 * — nothing is posted to anybody, and a nine-line form is the single biggest
 * reason somebody who meant to register does not.
 */

const OCCUPATIONS = ["student", "working", "other"];
/* Asked because the mahotsav is seated separately and the volunteers'
   WhatsApp groups are split the same way. Three options, not two: nobody
   should have to lie to register for a quiz. */
const GENDERS = ["male", "female", "other"];

const KNOWN_ERRORS = [
  "rate_limited",
  "invalid",
  "closed",
  "payment_unavailable",
  "network",
  "generic",
];

const PROFILE_KEY = "iyf:checkout-profile";
/* The same key the course checkout writes, and deliberately so: somebody who
   has already paid for anything on this site should not retype their name. Only
   the fields both forms genuinely share are read back. */
const PROFILE_FIELDS = ["name", "phone", "email", "age", "occupation", "gender"];

/**
 * The form's rules, built around whichever events the catalog is offering.
 *
 * Built from the `events` prop rather than written out with `quiz` and
 * `mahotsav` in it, so adding a third event to content/events needs no edit
 * here — and, more to the point, cannot leave a checkbox on screen that the
 * resolver has never heard of and silently passes.
 *
 * It is not built from the catalog module directly: that is server code (it
 * reaches for `lib/settings`, and through it mongoose) and importing it into a
 * client component would drag the database driver into the browser bundle.
 */
const buildSchema = (eventKeys) =>
  z
    .object({
      ...Object.fromEntries(eventKeys.map((key) => [key, z.boolean()])),
      name: z.string().trim().min(2, "name"),
      phone: z.string().refine((v) => PHONE_PATTERN.test(normalizePhone(v)), "phone"),
      email: z.string().trim().email("email"),
      age: z
        .string()
        .trim()
        .refine(
          (v) => v === "" || (/^\d{1,2}$/.test(v) && Number(v) >= 5 && Number(v) <= 99),
          "age",
        ),
      occupation: z.enum(OCCUPATIONS, { message: "occupation" }),
      gender: z.enum(GENDERS, { message: "gender" }),
      institution: z.string().trim().max(120, "institution"),
      referral: z.string().trim().max(80, "referral"),
    })
    /* At least one event. The error is attached to the first checkbox so it
       renders against the event block rather than at the form root, where
       react-hook-form would have nowhere to show it. */
    .refine((values) => eventKeys.some((key) => values[key]), {
      message: "events",
      path: [eventKeys[0]],
    });

const inr = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);

/**
 * `events` is the catalog's list, each with `{ key, title, tagline, dateLabel,
 * modeLabel, detail, amount }`. `combo` is the price of taking all of them, or
 * null when there is no combined fee.
 */
export function GitaRegisterForm({
  events,
  combo,
  open,
  /* Two pages render this form — /gita-mahotsav in its desktop column and
     /gita-mahotsav/register on its own — and `label for` needs ids that are
     unique per document. One prefix each, so a stray second copy on one page
     can never point every label at `#gita-name`. */
  idPrefix = "gita",
  className,
}) {
  const t = useTranslations("gita");
  const locale = useLocale();
  const id = (name) => `${idPrefix}-${name}`;

  /* form → submitting (saving the registration) → redirecting (leaving for
     the gateway). The dialog-less equivalent of the course checkout's stages. */
  const [stage, setStage] = useState("form");
  const [error, setError] = useState(null);

  /* The checkbox field names, in catalog order. `useWatch` is given the whole
     tuple at once so one subscription covers both boxes. */
  const eventFields = useMemo(() => events.map((event) => event.key), [events]);

  /* `events` cannot change while the form is mounted — the catalog is read on
     the server — so a resolver captured once at init is the whole story. */
  const resolver = useMemo(() => zodResolver(buildSchema(eventFields)), [eventFields]);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    control,
    formState: { errors },
  } = useForm({
    resolver,
    defaultValues: {
      /* The first event starts ticked: it is the quiz, which is what almost
         everybody arrives for, and an empty form that costs ₹0 reads broken. */
      ...Object.fromEntries(eventFields.map((key, index) => [key, index === 0])),
      name: "",
      phone: "",
      email: "",
      age: "",
      occupation: "student",
      /* No default. Gender is the one field here with no safe guess, and a
         pre-ticked box is how a form quietly records the wrong answer. */
      gender: "",
      institution: "",
      referral: "",
    },
  });

  /* `useWatch` rather than `watch()`: the latter returns a fresh function on
     every render, which makes React Compiler give up on memoising this whole
     component — and this one re-renders on every keystroke in the address box. */
  const ticked = useWatch({ control, name: eventFields });
  const picked = useMemo(
    () => events.filter((event, index) => ticked[index]),
    [events, ticked],
  );

  /* What it comes to, by the same rule the server applies: all of them
     together is the combined fee, anything else is the sum. */
  const pricing = useMemo(() => {
    const full = picked.reduce((sum, event) => sum + Number(event.amount), 0);
    const amount = picked.length === events.length && combo ? combo : full;
    return { amount, full, saved: Math.max(0, full - amount) };
  }, [picked, combo, events.length]);

  /* Details remembered on this device from an earlier checkout. Only fills
     what is still empty, so it never overwrites what has been typed. */
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
      if (!saved) return;
      for (const field of PROFILE_FIELDS) {
        if (!saved[field]) continue;
        if (field === "occupation" || !getValues(field)) setValue(field, String(saved[field]));
      }
    } catch {
      /* Storage blocked — the form simply starts empty. */
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

  function remember(values) {
    try {
      const profile = Object.fromEntries(PROFILE_FIELDS.map((f) => [f, values[f] ?? ""]));
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch {
      /* Nothing to do — next time they type it again. */
    }
  }

  async function onSubmit(values) {
    setError(null);
    setStage("submitting");

    const chosen = events.filter((event) => values[event.key]).map((event) => event.key);

    let response;
    let result;
    try {
      response = await fetch("/api/gita/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          events: chosen,
          name: values.name,
          phone: normalizePhone(values.phone),
          email: values.email,
          age: values.age,
          occupation: values.occupation,
          gender: values.gender,
          institution: values.institution,
          referral: values.referral,
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

    if (!result.already) {
      posthog.capture("gita_registration_initiated", {
        order_id: result.orderId,
        event_count: chosen.length,
        amount: result.amount,
        currency: "INR",
      });
    }

    /* Already paid from this number: their ticket, not a second charge. */
    if (result.already || result.next !== "payment") {
      window.location.assign(result.statusUrl);
      return;
    }

    const payment = await startPayment({
      orderId: result.orderId,
      token: result.token,
      lang: locale,
      kind: "gita",
    });
    if (payment.ok) return;

    /* Closing the gateway is a choice, not an error — the registration is
       saved, so a second attempt starts from the form with everything in it. */
    setStage("form");
    if (!payment.cancelled) {
      setError(KNOWN_ERRORS.includes(payment.error) ? payment.error : "generic");
    }
  }

  const fieldError = (name) =>
    errors[name] ? t(`field_errors.${errors[name].message || name}`) : null;

  const busy = stage !== "form";

  if (!open) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-6 text-center sm:p-8",
          className,
        )}
      >
        <p className="text-base font-semibold">{t("closed_title")}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("closed_body")}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className={cn(
        "flex flex-col gap-6 rounded-2xl border border-primary/25 bg-card p-5 shadow-xl shadow-primary/5 sm:p-7",
        className,
      )}
    >
      {/* ---- What they are registering for ------------------------------- */}
      <fieldset>
        <legend className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4 text-primary" aria-hidden="true" />
          {t("choose_events")}
        </legend>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {combo ? t("choose_events_hint", { price: inr(combo) }) : t("choose_events_hint_plain")}
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {events.map((event, index) => {
            const checked = Boolean(ticked[index]);
            return (
              <label
                key={event.key}
                className={cn(
                  "relative cursor-pointer rounded-xl border p-4 transition-colors",
                  "has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                  checked
                    ? "border-primary bg-primary/[0.07]"
                    : "border-border hover:border-primary/40",
                )}
              >
                <input type="checkbox" className="sr-only" {...register(event.key)} />
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{event.title}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {event.tagline}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-md border transition-colors",
                      checked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input",
                    )}
                  >
                    {checked && <Check className="size-3.5" />}
                  </span>
                </span>
                <span className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-lg font-bold">{inr(event.amount)}</span>
                  {event.dateLabel && (
                    <span className="truncate text-[11px] text-muted-foreground">
                      {event.dateLabel}
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </div>

        {fieldError(eventFields[0]) && (
          <p className="mt-2 text-xs text-destructive">{fieldError(eventFields[0])}</p>
        )}
      </fieldset>

      {/* ---- The running total ------------------------------------------- */}
      <div className="flex items-center justify-between gap-4 rounded-xl bg-primary/[0.06] px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground">{t("total")}</p>
          <p className="truncate text-sm font-medium">
            {picked.length ? picked.map((event) => event.title).join(" + ") : t("total_nothing")}
          </p>
        </div>
        <div className="shrink-0 text-end">
          <p className="text-2xl leading-none font-bold tabular-nums">{inr(pricing.amount)}</p>
          {pricing.saved > 0 && (
            <p className="mt-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              {t("saving", { amount: inr(pricing.saved) })}
            </p>
          )}
        </div>
      </div>

      {/* ---- Who they are ------------------------------------------------ */}
      <div className="flex flex-col gap-4">
        <Field id={id("name")} label={t("name")} error={fieldError("name")}>
          <Input
            id={id("name")}
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            className="h-11"
            {...register("name")}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id={id("phone")}
            label={t("phone")}
            hint={t("phone_hint")}
            error={fieldError("phone")}
          >
            <div className="flex h-11 items-center rounded-lg border border-input bg-transparent focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30">
              <span className="ps-3 pe-1 text-sm text-muted-foreground">+91</span>
              <input
                id={id("phone")}
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
            id={id("email")}
            label={t("email")}
            hint={t("email_hint")}
            error={fieldError("email")}
          >
            <Input
              id={id("email")}
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              className="h-11"
              {...register("email")}
            />
          </Field>
        </div>

        {/* Two pill groups side by side: the same shape of question, asked
            once each, and on a phone they stack into two short rows rather
            than into two more boxes to type in. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <PillGroup
            legend={t("occupation")}
            options={OCCUPATIONS.map((key) => ({ key, label: t(`occupation_${key}`) }))}
            register={register("occupation")}
            error={fieldError("occupation")}
          />
          <PillGroup
            legend={t("gender")}
            options={GENDERS.map((key) => ({ key, label: t(`gender_${key}`) }))}
            register={register("gender")}
            error={fieldError("gender")}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-[6.5rem_1fr]">
          <Field
            id={id("age")}
            label={<Optional label={t("age")} t={t} />}
            error={fieldError("age")}
          >
            <Input
              id={id("age")}
              inputMode="numeric"
              maxLength={2}
              aria-invalid={Boolean(errors.age)}
              className="h-11"
              {...register("age")}
            />
          </Field>

          <Field
            id={id("institution")}
            label={<Optional label={t("institution")} t={t} />}
            hint={t("institution_hint")}
            error={fieldError("institution")}
          >
            <Input
              id={id("institution")}
              autoComplete="organization"
              aria-invalid={Boolean(errors.institution)}
              className="h-11"
              {...register("institution")}
            />
          </Field>
        </div>

        <Field
          id={id("referral")}
          label={
            <span className="inline-flex items-center gap-1.5">
              <UserRoundSearch className="size-3.5 text-primary" aria-hidden="true" />
              <Optional label={t("referral")} t={t} />
            </span>
          }
          hint={t("referral_hint")}
          error={fieldError("referral")}
        >
          <Input
            id={id("referral")}
            autoComplete="off"
            placeholder={t("referral_placeholder")}
            aria-invalid={Boolean(errors.referral)}
            className="h-11"
            {...register("referral")}
          />
        </Field>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {t(`errors.${error}`)}
        </p>
      )}

      <Button
        type="submit"
        disabled={busy}
        animatedBorder
        className="h-12 gap-2 rounded-full text-base font-semibold shadow-lg shadow-primary/25"
      >
        {busy ? (
          <>
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            {t(stage)}
          </>
        ) : (
          <>
            <Lock className="size-4" aria-hidden="true" />
            {t("submit", { price: inr(pricing.amount) })}
          </>
        )}
      </Button>

      <div className="flex flex-col gap-2">
        <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
          {t("secure")}
        </p>
        <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
          <BadgeCheck className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
          {t("after_payment")}
        </p>
        <p className="text-[11px] leading-relaxed text-muted-foreground/80">
          {t.rich("terms", {
            terms: (chunks) => (
              <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">
                {chunks}
              </Link>
            ),
            refund: (chunks) => (
              <Link href="/refund" className="underline underline-offset-2 hover:text-foreground">
                {chunks}
              </Link>
            ),
            privacy: (chunks) => (
              <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
    </form>
  );
}

/**
 * One question answered by tapping one pill — occupation, gender.
 *
 * Radios in a fieldset rather than a `<select>`: three options are faster to
 * tap than to open, and the whole answer stays visible, which is what makes
 * the two groups read as one row instead of two dropdowns.
 */
function PillGroup({ legend, options, register, error }) {
  return (
    <fieldset className="flex flex-col">
      <legend className="mb-1.5 text-sm font-medium text-muted-foreground">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.key}
            className="cursor-pointer rounded-full border border-border px-3.5 py-2 text-sm font-medium transition-colors has-checked:border-primary has-checked:bg-primary/10 has-checked:text-primary has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
          >
            <input type="radio" value={option.key} className="sr-only" {...register} />
            {option.label}
          </label>
        ))}
      </div>
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </fieldset>
  );
}

function Optional({ label, t }) {
  return (
    <>
      {label} <span className="font-normal text-muted-foreground/70">({t("optional")})</span>
    </>
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
        <p className="text-[11px] leading-snug text-muted-foreground/80">{hint}</p>
      ) : null}
    </div>
  );
}
