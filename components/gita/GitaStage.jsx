"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, X } from "lucide-react";
import { IkImage } from "@/components/media/IkImage";
import { GitaRegisterForm } from "@/components/gita/GitaRegisterForm";
import { Button } from "@/components/ui/button";

/**
 * The festival on a phone: one picture, its two names, three facts, Register.
 *
 * The picture is the page here. It is a painting with no type in it — Krishna
 * and Arjuna on the chariot, the sky open above them — so the festival's two
 * names are set over it in the house display face rather than baked into the
 * artwork. That is the whole reason the phone gets its own poster: a picture
 * with the names already drawn on cannot be translated, cannot be re-cut for
 * a narrower screen, and cannot have Register sit under it without covering
 * something. These names are text, so Hindi gets Devanagari and a 360-pixel
 * screen gets the same line one size smaller.
 *
 * Everything else the page has to say sits on top in pills: what can be won,
 * when the quiz is, what it costs. Three, because three fit in one row
 * without wrapping and a fourth is a thing nobody reads.
 *
 * Register does not scroll anywhere. It opens the form as a sheet over this
 * same picture, blurred behind frosted glass — which is the whole reason this
 * is one component and not a link to an anchor further down: the background
 * never changes, so tapping Register feels like the page answering rather
 * than like arriving somewhere else, and closing it puts them back exactly
 * where they were with nothing scrolled.
 *
 * Only the phone gets this. From `md` up the page below renders its own hero
 * and its own inline form, which is why the form here is given an `idPrefix`:
 * both copies are in the document at once and their labels cannot both point
 * at `#gita-name`.
 */
export function GitaStage({
  poster,
  lines,
  eyebrow,
  facts,
  events,
  combo,
  open,
  detailsHref,
}) {
  const t = useTranslations("gita");
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeRef = useRef(null);

  /* While the sheet is up the page behind it must not scroll under the thumb,
     and Escape must close it. Both are undone on the way out, and the body's
     own overflow is put back rather than cleared — the layout may well be
     setting one of its own. */
  useEffect(() => {
    if (!sheetOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") setSheetOpen(false);
    };
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [sheetOpen]);

  return (
    <section className="relative isolate flex min-h-[calc(100svh-11rem)] flex-col overflow-hidden bg-brand-ink text-brand-cream md:hidden">
      {/* The painting, filling the frame. `cover` crops rather than
          letterboxes, and the crop is pinned to the bottom: the chariot is in
          the lower third and the open sky above it is what should give way on
          a short screen. It is not `priority` — the desktop hero below is in
          the same document behind a media query, and a lazy image inside a
          `display: none` subtree is never fetched, which is what keeps each
          width from downloading the other's artwork. */}
      <IkImage
        src={poster.src}
        alt={poster.alt}
        width={poster.width}
        height={poster.height}
        sizes="100vw"
        className="absolute inset-0 size-full object-cover object-bottom"
      />

      {/* Two scrims, one from each edge. The top one is what the names are
          read against — the sky behind them is cream and pink, and cream type
          on it would vanish. The bottom one carries the pills and the button.
          The middle is left alone: that is the chariot. */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand-ink/75 via-transparent to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-ink via-brand-ink/25 to-transparent"
        aria-hidden="true"
      />

      <div className="pointer-events-none relative z-10 flex flex-1 flex-col px-4 pt-5 pb-8">
        <p className="pointer-events-auto mx-auto rounded-full border border-brand-cream/25 bg-brand-ink/35 px-3.5 py-1.5 text-[11px] font-semibold tracking-wider text-brand-gold-light uppercase backdrop-blur-md">
          {eyebrow}
        </p>

        {/* The names. One `h1` holding both, because they are one festival
            with two halves and a reader should hear them that way — the rule
            and the "and" between them are decoration, and hidden from the
            screen reader, which gets the two lines in sequence.

            The desktop hero below carries an `h1` of its own. Only ever one
            of the two is rendered: the other sits inside a `display: none`
            subtree, which no reader, assistive or otherwise, is shown. */}
        <h1 className="fraunces-display mt-5 text-center text-brand-cream drop-shadow-[0_2px_18px_rgba(16,10,6,0.7)]">
          {lines.map((line, index) => (
            <span key={line} className="block">
              {index > 0 && (
                <span
                  className="my-2 flex items-center justify-center gap-3"
                  aria-hidden="true"
                >
                  <span className="h-px w-10 bg-gradient-to-r from-transparent to-brand-gold/70" />
                  <span className="font-sans text-[10px] font-semibold tracking-[0.25em] text-brand-gold-light uppercase">
                    {t("stage_and")}
                  </span>
                  <span className="h-px w-10 bg-gradient-to-l from-transparent to-brand-gold/70" />
                </span>
              )}
              <span className="block text-[2.3rem] leading-[1.08] font-bold">
                {line}
              </span>
            </span>
          ))}
        </h1>

        <div className="mt-auto flex flex-col gap-4 pt-8">
          {/* Three equal columns, so the row is symmetrical whatever the
              values are — the grid decides the widths, not the text. */}
          <dl className="grid grid-cols-3 gap-2">
            {facts.map((fact) => (
              <div
                key={fact.label}
                className="pointer-events-auto rounded-2xl border border-brand-cream/20 bg-brand-ink/30 px-2 py-2.5 text-center backdrop-blur-md"
              >
                <dt className="text-[10px] leading-tight font-medium tracking-wide text-brand-cream/70 uppercase">
                  {fact.label}
                </dt>
                <dd className="mt-1 text-[15px] leading-tight font-bold text-brand-cream">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>

          <Button
            type="button"
            size="lg"
            onClick={() => setSheetOpen(true)}
            className="pointer-events-auto h-14 w-full gap-2 rounded-full text-base font-semibold shadow-xl shadow-black/40"
          >
            {open ? t("stage_register") : t("hero_cta_closed")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>

          <a
            href={detailsHref}
            className="pointer-events-auto text-center text-xs font-medium text-brand-cream/70 underline-offset-4"
          >
            {t("stage_scroll")}
          </a>
        </div>
      </div>

      {sheetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("stage_form_title")}
          className="fixed inset-0 z-[60] flex flex-col justify-end"
        >
          {/* The poster, still there, through frosted glass. Tapping it is the
              other way out — the same gesture as the close button, for a thumb
              that is nowhere near the top of the screen. */}
          <button
            type="button"
            onClick={() => setSheetOpen(false)}
            aria-label={t("stage_form_close")}
            className="absolute inset-0 bg-brand-ink/55 backdrop-blur-xl"
          />

          <div className="relative flex max-h-[92svh] flex-col overflow-hidden rounded-t-3xl border-t border-brand-gold/30 bg-background/85 shadow-2xl shadow-black/50 backdrop-blur-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3.5">
              <h2 className="text-base font-semibold tracking-tight">
                {t("stage_form_title")}
              </h2>
              <button
                type="button"
                ref={closeRef}
                onClick={() => setSheetOpen(false)}
                aria-label={t("stage_form_close")}
                className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="overflow-y-auto overscroll-contain px-4 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
              {/* No card of its own inside the sheet: the sheet is the card,
                  and a bordered panel within a bordered panel is the thing
                  that made this form look heavier than it is. */}
              <GitaRegisterForm
                events={events}
                combo={combo}
                open={open}
                idPrefix="gita-sheet"
                className="rounded-none border-0 bg-transparent p-0 shadow-none sm:p-0"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
