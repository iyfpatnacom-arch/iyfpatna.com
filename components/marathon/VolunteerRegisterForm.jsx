"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale, useTranslations } from "next-intl";
import { LoaderCircle, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { normalizePhone, PHONE_PATTERN } from "@/lib/courses/phone";
import { registerVolunteer } from "@/app/[locale]/activity/gita-marathon/actions";

/**
 * The volunteer application — six fields and a paragraph.
 *
 * Clerk has already established *who* this is: the person filling this in is
 * signed in, and their email comes off their account rather than out of this
 * form (see `registerVolunteer`). So the form asks only what Clerk cannot know
 * and the coordinator cannot do without — a phone number that will be answered,
 * where in Patna they are, and whatever they want to say for themselves.
 *
 * It is deliberately short. A coordinator who needs more will ring the number;
 * a twelve-field form on a phone is a form that does not get finished, and the
 * cost of that is a volunteer who does not go out.
 *
 * Validation is here and in the action both, because an action is a public
 * endpoint. The messages are keys into `marathon.reg_errors`, so an error
 * reads in the volunteer's own language rather than zod's English.
 */
const schema = z.object({
  name: z.string().trim().min(2, "err_name").max(80, "err_name"),
  phone: z
    .string()
    .refine((value) => PHONE_PATTERN.test(normalizePhone(value)), "err_phone"),
  city: z.string().trim().max(60),
  college: z.string().trim().max(120),
  occupation: z.enum(["student", "working", "other"]),
  /* Blank is fine — age is optional. Checked only when something is typed,
     which is why this is a refine on a string rather than a coerced number:
     `z.coerce.number()` turns "" into 0 and would reject an empty box. */
  age: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" || (Number(value) >= 12 && Number(value) <= 99),
      "err_age",
    ),
  about: z.string().trim().max(400),
});

const ERRORS = [
  "err_name",
  "err_phone",
  "err_age",
  "err_signed_out",
  "err_closed",
  "err_generic",
];

const OCCUPATIONS = ["student", "working", "other"];

export function VolunteerRegisterForm({ email, defaults = null }) {
  const t = useTranslations("marathon");
  const locale = useLocale();

  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    /* `defaults` is the volunteer's own row when they are editing it, so the
       same form serves "apply" and "correct what I typed". Everything else
       starts empty rather than remembered on the device: unlike a donation,
       this is filled in once. */
    defaultValues: {
      name: defaults?.name ?? "",
      phone: defaults?.phone ?? "",
      city: defaults?.city ?? "",
      college: defaults?.college ?? "",
      occupation: defaults?.occupation ?? "student",
      age: defaults?.age ? String(defaults.age) : "",
      about: defaults?.about ?? "",
    },
  });

  function onSubmit(values) {
    setError(null);
    startTransition(async () => {
      const result = await registerVolunteer({ ...values, locale });
      if (!result?.ok) {
        setError(ERRORS.includes(result?.error) ? result.error : "err_generic");
        return;
      }
      /* No success state here. The row now exists, the action revalidated the
         page, and the server renders the "waiting to be activated" screen —
         which is a truer answer than any toast this form could show. */
    });
  }

  const fieldError = (name) =>
    errors[name] ? t(`reg_errors.${errors[name].message || "err_generic"}`) : null;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="mt-7 flex flex-col gap-5"
    >
      <Field id="mv-name" label={t("reg_name")} error={fieldError("name")}>
        <Input
          id="mv-name"
          autoComplete="name"
          aria-invalid={Boolean(errors.name)}
          className="h-11"
          {...register("name")}
        />
      </Field>

      <Field id="mv-phone" label={t("reg_phone")} error={fieldError("phone")}>
        <div className="flex h-11 items-center rounded-lg border border-input bg-transparent focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30">
          <span className="ps-3 pe-1 text-sm text-muted-foreground">+91</span>
          <input
            id="mv-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            aria-invalid={Boolean(errors.phone)}
            className="h-full min-w-0 flex-1 bg-transparent pe-3 text-base outline-none md:text-sm"
            {...register("phone")}
          />
        </div>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="mv-city"
          label={
            <>
              {t("reg_city")}{" "}
              <span className="font-normal text-muted-foreground/70">
                ({t("reg_optional")})
              </span>
            </>
          }
          hint={t("reg_city_hint")}
        >
          <Input id="mv-city" className="h-11" {...register("city")} />
        </Field>

        <Field
          id="mv-age"
          label={
            <>
              {t("reg_age")}{" "}
              <span className="font-normal text-muted-foreground/70">
                ({t("reg_optional")})
              </span>
            </>
          }
          error={fieldError("age")}
        >
          <Input
            id="mv-age"
            inputMode="numeric"
            maxLength={2}
            aria-invalid={Boolean(errors.age)}
            className="h-11 max-w-24 tabular-nums"
            {...register("age")}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mv-occupation" className="text-muted-foreground">
          {t("reg_occupation")}
        </Label>
        <select
          id="mv-occupation"
          className="h-11 rounded-lg border border-input bg-transparent px-3 text-base outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 md:text-sm dark:bg-input/30"
          {...register("occupation")}
        >
          {OCCUPATIONS.map((key) => (
            <option key={key} value={key}>
              {t(`reg_occ_${key}`)}
            </option>
          ))}
        </select>
      </div>

      <Field
        id="mv-college"
        label={
          <>
            {t("reg_college")}{" "}
            <span className="font-normal text-muted-foreground/70">
              ({t("reg_optional")})
            </span>
          </>
        }
      >
        <Input id="mv-college" className="h-11" {...register("college")} />
      </Field>

      <Field
        id="mv-about"
        label={
          <>
            {t("reg_about")}{" "}
            <span className="font-normal text-muted-foreground/70">
              ({t("reg_optional")})
            </span>
          </>
        }
        hint={t("reg_about_hint")}
      >
        <Textarea
          id="mv-about"
          rows={3}
          className="min-h-20 resize-y"
          {...register("about")}
        />
      </Field>

      {email && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("reg_email_note", { email })}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {t(`reg_errors.${error}`)}
        </p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="mt-1 h-12 gap-2 rounded-full text-base font-semibold shadow-lg shadow-primary/25"
      >
        {pending ? (
          <>
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            {t("reg_submitting")}
          </>
        ) : (
          <>
            <UserPlus className="size-4" aria-hidden="true" />
            {t("reg_submit")}
          </>
        )}
      </Button>
    </form>
  );
}

function Field({ id, label, hint, error, children }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
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
