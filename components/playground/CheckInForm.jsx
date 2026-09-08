"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CircleCheck, Loader2, QrCode, TriangleAlert } from "lucide-react";
import { Panel } from "@/components/site/Panel";
import { haptic } from "@/lib/playground/haptics";
import { readLocal, writeLocal } from "@/lib/playground/local";
import { cn } from "@/lib/utils";

/**
 * Checking in.
 *
 * Two entrances into the same form. Arriving from a camera scan, `programId`
 * and `token` are already filled in and the only question left is who you are.
 * Arriving at the tool page cold, the six digits from the screen stand in for
 * the token.
 *
 * The name and phone are remembered on the device, so the second week is one
 * tap. That is stored locally rather than behind an account for the same
 * reason the whole tool is: the person this is built for is standing in a
 * doorway and is not going to make an account first.
 */

const PROFILE_KEY = "checkin-profile";

export function CheckInForm({ programId = null, token = null }) {
  const t = useTranslations("playground.checkin");
  const locale = useLocale();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  /* Restore last week's details after mount rather than during render.

     Reading storage in a lazy `useState` initialiser would be tidier, but it
     would also make the server render an empty field and the client render a
     filled one — a hydration mismatch on a form someone is about to type into.
     So this stays an effect, and the lint rule is silenced deliberately: the
     cascading render it warns about is one extra pass on a two-field form, and
     it is the price of the fields being correct. */
  useEffect(() => {
    const saved = readLocal(PROFILE_KEY, null);
    if (saved) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setName(saved.name ?? "");
      setPhone(saved.phone ?? "");
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, []);

  const scanned = Boolean(programId && token);
  const ready =
    name.trim().length > 0 &&
    phone.trim().length >= 6 &&
    (scanned || /^\d{6}$/.test(code));

  async function submit(event) {
    event.preventDefault();
    if (!ready || status === "sending") return;

    setStatus("sending");
    setError(null);

    try {
      const response = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(scanned ? { programId, token } : { code }),
          name: name.trim(),
          phone: phone.trim(),
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        haptic("undo");
        setError(errorKeyFor(response.status, data?.error));
        setStatus("idle");
        return;
      }

      writeLocal(PROFILE_KEY, { name: name.trim(), phone: phone.trim() });
      haptic("reward");
      setResult(data);
      setStatus("done");
    } catch {
      haptic("undo");
      setError("error_generic");
      setStatus("idle");
    }
  }

  if (status === "done" && result) {
    const title = result.program?.title?.[locale] ?? "";
    return (
      <Panel className="p-6 text-center">
        <CircleCheck
          className="mx-auto size-10 text-primary"
          aria-hidden="true"
        />
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          {result.alreadyCheckedIn ? t("already_title") : t("success_title")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {result.alreadyCheckedIn
            ? t("already_body", { programme: title })
            : t("success_body", { programme: title })}
        </p>
      </Panel>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {!scanned && (
        <Panel className="p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <QrCode className="size-4 text-primary" aria-hidden="true" />
            {t("scan_title")}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("scan_body")}
          </p>

          <label className="mt-5 block">
            <span className="text-sm font-medium text-foreground">
              {t("code_label")}
            </span>
            <input
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder={t("code_placeholder")}
              className="mt-2 w-full rounded-xl border border-border bg-card/60 px-4 py-3 text-center text-2xl tracking-[0.3em] tabular-nums text-foreground placeholder:tracking-normal placeholder:text-base placeholder:text-muted-foreground"
            />
          </label>
        </Panel>
      )}

      <Panel className="flex flex-col gap-4 p-5">
        <label className="block">
          <span className="text-sm font-medium text-foreground">
            {t("name_label")}
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            placeholder={t("name_placeholder")}
            className="mt-2 w-full rounded-xl border border-border bg-card/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-foreground">
            {t("phone_label")}
          </span>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className="mt-2 w-full rounded-xl border border-border bg-card/60 px-4 py-3 text-sm tabular-nums text-foreground"
          />
        </label>
      </Panel>

      {error && (
        <p className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-foreground">
          <TriangleAlert
            className="mt-0.5 size-4 shrink-0 text-destructive"
            aria-hidden="true"
          />
          {t(error)}
        </p>
      )}

      <button
        type="submit"
        disabled={!ready || status === "sending"}
        className={cn(
          "flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground",
          (!ready || status === "sending") && "opacity-40"
        )}
      >
        {status === "sending" && (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        )}
        {status === "sending" ? t("checking") : t("submit")}
      </button>
    </form>
  );
}

/**
 * The server's error slug mapped to a message key.
 *
 * An expired code is the one failure worth explaining properly — it is the
 * expected consequence of the rotation, it is not the visitor's fault, and the
 * fix ("read the screen again") is not guessable from a generic message.
 */
function errorKeyFor(status, slug) {
  if (slug === "expired") return "error_expired";
  if (slug === "invalid_code") return "error_invalid";
  if (slug === "no_programme" || status === 404) return "error_no_programme";
  return "error_generic";
}
