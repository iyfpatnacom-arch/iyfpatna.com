"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale, useTranslations } from "next-intl";
import { useUser } from "@clerk/nextjs";
import { ArrowRight, LoaderCircle, Lock, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/site/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClerkAutofillBridge } from "@/components/programs/ClerkAutofillBridge";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { normalizePhone, PHONE_PATTERN } from "@/lib/courses/phone";
import { startPayment } from "@/lib/payments/redirect";

/**
 * Enrolment for a paid course: every "Register" button on the landing page,
 * the checkout dialog they open, and the sticky bar on phones.
 *
 * One provider owns the dialog so the page can scatter as many CTAs through
 * its (server-rendered) sections as it likes — each is a tiny client button
 * that asks the provider to open, and there is only ever one form.
 *
 * Details are asked for once. A signed-in member's name and email come from
 * Clerk; anyone else's are remembered on this device after their first
 * checkout, so the second course they buy is two taps.
 */

const EnrollContext = createContext(null);

const PROFILE_KEY = "iyf:checkout-profile";
const PROFILE_FIELDS = ["name", "phone", "email", "age", "occupation"];
const OCCUPATIONS = ["student", "working", "other"];
const KNOWN_ERRORS = [
  "rate_limited",
  "invalid",
  "not_found",
  "closed",
  "sold_out",
  "payment_unavailable",
  "network",
  "generic",
];

/* Messages are keys into `checkout.field_errors`, so a validation error reads
   in the visitor's language rather than zod's English. */
const schema = z.object({
  name: z.string().trim().min(2, "name"),
  phone: z.string().refine((v) => PHONE_PATTERN.test(normalizePhone(v)), "phone"),
  email: z.string().trim().email("email"),
  age: z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d{1,2}$/.test(v) && Number(v) >= 10 && Number(v) <= 90), "age"),
  occupation: z.enum(OCCUPATIONS, { message: "occupation" }),
  mode: z.string().min(1, "mode"),
});

export function useEnroll() {
  const value = useContext(EnrollContext);
  if (!value) throw new Error("useEnroll must be used inside <EnrollProvider>");
  return value;
}

export function EnrollProvider({ checkout, status, clerkConfigured, children }) {
  const [open, setOpen] = useState(false);

  const openCheckout = useCallback(() => {
    if (status === "open") setOpen(true);
  }, [status]);

  /* Coming back from "sign in to autofill" lands here with ?enroll=1 — open
     the form straight away so the round trip costs the visitor nothing. */
  useEffect(() => {
    if (status !== "open") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("enroll") !== "1") return;
    params.delete("enroll");
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      window.location.pathname + (query ? `?${query}` : "") + window.location.hash
    );
    const timer = setTimeout(() => setOpen(true), 0);
    return () => clearTimeout(timer);
  }, [status]);

  const value = useMemo(() => ({ openCheckout, status, checkout }), [openCheckout, status, checkout]);

  return (
    <EnrollContext.Provider value={value}>
      {children}
      <CheckoutDialog
        open={open}
        onOpenChange={setOpen}
        checkout={checkout}
        clerkConfigured={clerkConfigured}
      />
    </EnrollContext.Provider>
  );
}

/** A "Register" button anywhere on the page. */
export function EnrollButton({ id, className, children, showArrow = true }) {
  const { openCheckout, status, checkout } = useEnroll();
  const t = useTranslations("course_page");

  const label =
    status === "open"
      ? (children ?? t("register_cta", { price: checkout.priceLabel }))
      : status === "sold_out"
        ? t("sold_out")
        : t("closed");

  return (
    <Button
      id={id}
      type="button"
      onClick={openCheckout}
      disabled={status !== "open"}
      className={cn(
        "h-12 gap-2 rounded-full px-6 text-base font-semibold shadow-lg shadow-primary/25",
        className
      )}
    >
      {label}
      {status === "open" && showArrow && <ArrowRight className="size-4" aria-hidden="true" />}
    </Button>
  );
}

/**
 * The phone-only bar that keeps the price and the button in reach once the
 * hero's own button has scrolled away.
 *
 * It sits above the app dock and stops short of the right edge, where the
 * WhatsApp button lives, so neither covers the other.
 */
export function StickyEnrollBar({ watchId = "enroll-hero-cta" }) {
  const { status, checkout } = useEnroll();
  const t = useTranslations("course_page");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById(watchId);
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [watchId]);

  if (status !== "open") return null;

  return (
    <div
      inert={!visible}
      className={cn(
        "fixed start-3 end-20 bottom-[calc(5.9rem+env(safe-area-inset-bottom))] z-40 transition-all duration-300 md:hidden",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      )}
    >
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-popover/95 p-1.5 ps-4 shadow-xl shadow-black/10 backdrop-blur-md">
        <div className="min-w-0">
          <p className="flex items-baseline gap-1.5 leading-none">
            <span className="text-lg font-bold">{checkout.priceLabel}</span>
            {checkout.mrpLabel && (
              <span className="text-xs text-muted-foreground line-through">{checkout.mrpLabel}</span>
            )}
          </p>
          <p className="mt-1 truncate text-[11px] text-muted-foreground">{t("sticky_note")}</p>
        </div>
        <EnrollButton className="ms-auto h-10 px-4 text-sm" showArrow={false}>
          {t("sticky_cta")}
        </EnrollButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- checkout */

function CheckoutDialog({ open, onOpenChange, checkout, clerkConfigured }) {
  const t = useTranslations("checkout");
  const locale = useLocale();
  // form → submitting (saving the order) → redirecting (leaving for payment)
  const [stage, setStage] = useState("form");
  const [error, setError] = useState(null);

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
      age: "",
      occupation: "student",
      mode: checkout.modes[0]?.key ?? "",
    },
  });

  /* The one-time details, remembered on this device from a previous
     checkout. Only fills what is still empty, so it never overwrites what the
     visitor has typed or what their account supplied. */
  useEffect(() => {
    if (!open) return;
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
  }, [open, getValues, setValue]);

  /* Pressing Back on the gateway restores this page from the bfcache with the
     spinner still running. Put the form back. */
  useEffect(() => {
    const onShow = (event) => {
      if (event.persisted) setStage("form");
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  /* A signed-in member's account is the better source for who they are, so it
     wins over anything remembered on the device. */
  const handleAutofill = useCallback(
    (data) => {
      if (data.name) setValue("name", data.name);
      if (data.email) setValue("email", data.email);
      if (data.phone) setValue("phone", normalizePhone(data.phone));
    },
    [setValue]
  );

  function handleOpenChange(next) {
    // Never let the dialog be dismissed while the browser is leaving for the
    // gateway — a half-closed form over a navigating page is worse than a wait.
    if (!next && stage !== "form") return;
    onOpenChange(next);
  }

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

    let response;
    let result;
    try {
      response = await fetch("/api/courses/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          phone: normalizePhone(values.phone),
          slug: checkout.slug,
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

    if (result.already) {
      toast.success(t("already_title"), { description: t("already_body") });
      window.location.assign(result.statusUrl);
      return;
    }

    if (result.next !== "payment") {
      window.location.assign(result.statusUrl);
      return;
    }

    const payment = await startPayment({ orderId: result.orderId, token: result.token, lang: locale });
    if (!payment.ok) {
      setStage("form");
      // Closing the checkout is a choice, not an error; the seat stays saved.
      if (!payment.cancelled) {
        setError(KNOWN_ERRORS.includes(payment.error) ? payment.error : "generic");
      }
    }
  }

  const fieldError = (name) =>
    errors[name] ? t(`field_errors.${errors[name].message || name}`) : null;

  const secureLine =
    checkout.paymentMode === "razorpay"
      ? t("secure_gateway")
      : checkout.paymentMode === "simulate"
        ? t("secure_test")
        : t("secure_offline");

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title={t("title")}
      description={t("description")}
      // Modal's own max-w-md would run edge to edge on a phone; this restores
      // the primitive's 1rem side gutter and gives the form more room above sm.
      className="max-h-[92dvh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg"
    >
      {clerkConfigured && <ClerkAutofillBridge onAutofill={handleAutofill} />}

      <div className="flex flex-col gap-5 pt-1">
        <OrderSummary checkout={checkout} />

        {clerkConfigured && <AccountRow />}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <Field id="checkout-name" label={t("name")} hint={t("name_hint")} error={fieldError("name")}>
            <Input
              id="checkout-name"
              autoComplete="name"
              aria-invalid={Boolean(errors.name)}
              className="h-11"
              {...register("name")}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="checkout-phone" label={t("phone")} hint={t("phone_hint")} error={fieldError("phone")}>
              <div className="flex h-11 items-center rounded-lg border border-input bg-transparent focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30">
                <span className="ps-3 pe-1 text-sm text-muted-foreground">+91</span>
                <input
                  id="checkout-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  aria-invalid={Boolean(errors.phone)}
                  className="h-full min-w-0 flex-1 bg-transparent pe-3 text-base outline-none md:text-sm"
                  {...register("phone")}
                />
              </div>
            </Field>

            <Field id="checkout-email" label={t("email")} hint={t("email_hint")} error={fieldError("email")}>
              <Input
                id="checkout-email"
                type="email"
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
                className="h-11"
                {...register("email")}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_6.5rem]">
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 text-sm font-medium text-muted-foreground">{t("occupation")}</legend>
              <div className="flex flex-wrap gap-2">
                {OCCUPATIONS.map((key) => (
                  <label
                    key={key}
                    className="cursor-pointer rounded-full border border-border px-3.5 py-2 text-sm font-medium transition-colors has-checked:border-primary has-checked:bg-primary/10 has-checked:text-primary has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
                  >
                    <input type="radio" value={key} className="sr-only" {...register("occupation")} />
                    {t(`occupation_${key}`)}
                  </label>
                ))}
              </div>
            </fieldset>

            <Field
              id="checkout-age"
              label={
                <>
                  {t("age")} <span className="font-normal text-muted-foreground/70">({t("optional")})</span>
                </>
              }
              error={fieldError("age")}
            >
              <Input
                id="checkout-age"
                inputMode="numeric"
                maxLength={2}
                aria-invalid={Boolean(errors.age)}
                className="h-11"
                {...register("age")}
              />
            </Field>
          </div>

          {checkout.modes.length > 1 && (
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-muted-foreground">{t("mode")}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {checkout.modes.map((mode) => (
                  <label
                    key={mode.key}
                    className="cursor-pointer rounded-xl border border-border p-3 transition-colors has-checked:border-primary has-checked:bg-primary/[0.07] has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
                  >
                    <input type="radio" value={mode.key} className="sr-only" {...register("mode")} />
                    <span className="block text-sm font-semibold">{mode.label}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{mode.detail}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {error && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
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
                <Lock className="size-4" aria-hidden="true" />
                {t("submit", { price: checkout.priceLabel })}
              </>
            ) : (
              <>
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                {t(stage)}
              </>
            )}
          </Button>

          <div className="flex flex-col gap-1.5">
            <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
              {secureLine}
            </p>
            <p className="text-[11px] leading-relaxed text-muted-foreground/80">
              {t.rich("terms", {
                terms: (chunks) => (
                  <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">
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
      </div>
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
        <p className="text-[11px] leading-snug text-muted-foreground/80">{hint}</p>
      ) : null}
    </div>
  );
}

function OrderSummary({ checkout }) {
  const t = useTranslations("checkout");
  return (
    <div className="rounded-xl border border-primary/25 bg-primary/[0.06] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold leading-snug">{checkout.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{checkout.batchLabel}</p>
        </div>
        <div className="shrink-0 text-end">
          <p className="text-[11px] text-muted-foreground">{t("summary_total")}</p>
          <p className="text-xl leading-tight font-bold">{checkout.priceLabel}</p>
          {checkout.mrpLabel && (
            <p className="text-xs text-muted-foreground line-through">{checkout.mrpLabel}</p>
          )}
        </div>
      </div>
      {checkout.saveLabel && (
        <p className="mt-3 inline-flex rounded-full bg-emerald-500/12 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
          {t("summary_save", { amount: checkout.saveLabel })}
        </p>
      )}
    </div>
  );
}

/**
 * Who the form thinks you are. Rendered only when Clerk is configured —
 * `useUser` throws outside a ClerkProvider.
 */
function AccountRow() {
  const t = useTranslations("checkout");
  const locale = useLocale();
  const pathname = usePathname();
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) return null;

  if (isSignedIn) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
        {user.imageUrl ? (
          <Image
            src={user.imageUrl}
            alt=""
            width={32}
            height={32}
            className="size-8 shrink-0 rounded-full object-cover"
          />
        ) : (
          <UserRound className="size-8 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {t("signed_in_as", {
              name: user.fullName || user.primaryEmailAddress?.emailAddress || "",
            })}
          </p>
          <p className="text-xs text-muted-foreground">{t("signed_in_note")}</p>
        </div>
      </div>
    );
  }

  return (
    <p className="text-sm text-muted-foreground">
      {t("sign_in_prompt")}{" "}
      <Link
        href={{ pathname: "/sign-in", query: { redirect_url: `/${locale}${pathname}?enroll=1` } }}
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        {t("sign_in_link")}
      </Link>
    </p>
  );
}
