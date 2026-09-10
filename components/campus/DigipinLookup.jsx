"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/navigation";
import { normaliseDigipin } from "@/lib/campus/digipin";

/**
 * The box you paste a DIGIPIN into.
 *
 * Submitting navigates to `/campus/pin/<code>` rather than decoding in place,
 * because the answer deserves a URL — a decoded code is exactly the kind of
 * thing someone forwards to the person who sent it to them.
 *
 * Validation is left to the destination page. Doing it here as well would mean
 * two implementations of "is this a DIGIPIN" that can disagree, and the page
 * has to handle a bad code anyway: it is reachable by typing a URL, by
 * following a mangled link, and by scanning a QR that has been rained on.
 * `normaliseDigipin` still runs here so the URL is tidy and two spellings of
 * one code do not become two pages.
 */
export function DigipinLookup() {
  const t = useTranslations("campus.pin");
  const router = useRouter();
  const [value, setValue] = useState("");

  function submit(event) {
    event.preventDefault();
    const code = normaliseDigipin(value);
    if (code) router.push(`/campus/pin/${code}`);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={t("input_placeholder")}
          aria-label={t("input_label")}
          // `characters` rather than `words`: the codes have no vowels, so a
          // phone keyboard's autocorrect treats every one of them as a typo to
          // be helpfully rewritten. `spellCheck` off for the same reason.
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          maxLength={14}
          className="min-h-12 w-full rounded-2xl border border-border bg-card pr-4 pl-10 font-mono text-base tracking-[0.18em] text-foreground uppercase transition-colors outline-none placeholder:font-sans placeholder:tracking-normal placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>

      <button
        type="submit"
        className="min-h-12 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        style={{ touchAction: "manipulation" }}
        disabled={!value.trim()}
      >
        {t("submit")}
      </button>
    </form>
  );
}
