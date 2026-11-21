"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  MapPin,
  QrCode,
  Ticket,
  Trophy,
  X,
} from "lucide-react";
import { IkImage } from "@/components/media/IkImage";
import { Diya } from "@/components/gita/Diya";
import { GitaRegisterForm } from "@/components/gita/GitaRegisterForm";
import { Button } from "@/components/ui/button";

/**
 * The festival on a phone: one painting, its two names, three figures,
 * Register.
 *
 * The painting is the page here. It carries no type of its own — Krishna and
 * Arjuna on the chariot, the sky open above them — so the festival's two
 * names are set over it in Kaushan Script, the one brush face on the site.
 * They are set as one lockup over the open sky at the top — Gita Mahotsav,
 * the lamp, then Gita Quiz — because they are one festival with two halves
 * and reading them as a pair is the point. The sky is the only part of the
 * painting with room for type at this size, which is why they sit there and
 * not over the chariot.
 * That is the whole reason the phone gets its own artwork: a picture with the
 * names already drawn into it cannot be translated, cannot be re-cut for a
 * narrower screen, and cannot have Register sit under it without covering
 * something. These names are text, so Hindi gets Devanagari and a 360-pixel
 * screen gets the same line one size smaller.
 *
 * Everything else is one card in two tiers. Three figures across the top —
 * what can be won, when, and what it costs — in equal columns, one line
 * each, with an icon in place of a label: the trophy, the calendar and the
 * ticket say what their numbers are faster than three words of caption
 * would, and a caption over every figure was what made this read as a form
 * rather than as a poster. Under a hairline, the two things that are not
 * numbers: where it is, and that the door wants a pass.
 *
 * Nothing here is centred by eye. The eyebrow, the names, the diya between
 * them, the bar and the button all share one axis, and the bar's three
 * columns are an equal grid rather than content-width — so the row stays
 * symmetrical whatever the numbers happen to be, in either language.
 *
 * Register does not scroll anywhere. It opens the form as a sheet over this
 * same picture, blurred behind frosted glass — which is why this is one
 * component and not a link to an anchor further down: the background never
 * changes, so tapping Register feels like the page answering rather than
 * like arriving somewhere else, and closing it puts them back exactly where
 * they were with nothing scrolled.
 *
 * Only the phone gets this. From `md` up the page below renders its own hero
 * and its own inline form, which is why the form here is given an `idPrefix`:
 * both copies are in the document at once and their labels cannot both point
 * at `#gita-name`.
 */

/* The icons, for both tiers of the card. The page names them rather than
   handing the components over: this is a client component, and a React
   component cannot cross that boundary as a prop. */
const FACT_ICONS = {
  trophy: Trophy,
  calendar: CalendarDays,
  ticket: Ticket,
  pin: MapPin,
  pass: QrCode,
};

/* The entrance order, in seconds. Read down the poster: the eyebrow, the two
   names, the figures, the two notes, the button. */
const RISE = {
  eyebrow: "0.05s",
  title: "0.15s",
  facts: "0.32s",
  notes: "0.4s",
  cta: "0.5s",
};

export function GitaStage({
  poster,
  lines,
  eyebrow,
  facts,
  notes,
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
          on it would vanish. The bottom one carries the figures and the
          button. The middle is left alone: that is the chariot. */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand-ink/80 via-brand-ink/10 to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-ink via-brand-ink/30 to-transparent"
        aria-hidden="true"
      />

      <div className="pointer-events-none relative z-10 flex flex-1 flex-col px-5 pt-5 pb-7">
        <p
          className="stage-rise pointer-events-auto mx-auto rounded-full border border-brand-gold/30 bg-brand-ink/40 px-3.5 py-1.5 text-[10px] font-semibold tracking-[0.18em] text-brand-gold-light uppercase backdrop-blur-md"
          style={{ animationDelay: RISE.eyebrow }}
        >
          {eyebrow}
        </p>

        {/* One `h1` holding both names, stretched over the whole picture and
            pushing them to its two ends — one element rather than two, so a
            screen reader still hears a single heading naming a single
            festival, and so the two lines cannot drift out of step with each
            other as the layout changes.

            The desktop hero below carries an `h1` of its own. Only ever one
            of the two is rendered: the other sits inside a `display: none`
            subtree, which no reader, assistive or otherwise, is shown. */}
        <h1
          /* Sized against the viewport rather than at two breakpoints: a
             brush script this large is within a few percent of the screen's
             width at every phone size, and `clamp` holds that margin
             everywhere instead of at 360 and 390 and nowhere in between. The
             names are deliberately left wrappable — if a longer one ever
             outgrows its line it breaks onto two, which on a poster is fine,
             where overflowing the screen would not be.

             `-mx-1` buys the names a little of the padding the rest of the
             overlay keeps, because they are the only thing here that is
             width-bound. */
          className="stage-rise kaushan-script -mx-1 mt-5 text-center text-[clamp(2.75rem,14vw,3.75rem)] text-brand-cream drop-shadow-[0_3px_22px_rgba(16,10,6,0.85)]"
          style={{ animationDelay: RISE.title }}
        >
          <span className="block">{lines[0]}</span>

          {/* The lamp between the two names, on the same axis as everything
              else on the poster. Its flame flickers on its own
              (`animate-diya`) and the glow behind it breathes a little out of
              step with it, which is what keeps the pair from looking like one
              blinking element. Decoration, so it is hidden from the screen
              reader, which hears the two names in sequence. */}
          <span className="my-2 flex items-center justify-center gap-3" aria-hidden="true">
            <span className="h-px w-12 bg-gradient-to-r from-transparent to-brand-gold/60" />
            <span className="relative grid size-7 place-items-center">
              <span className="stage-glow absolute size-7 rounded-full bg-brand-gold/40 blur-md" />
              <Diya className="relative size-7 text-brand-gold" />
            </span>
            <span className="h-px w-12 bg-gradient-to-l from-transparent to-brand-gold/60" />
          </span>

          <span className="block">{lines[1]}</span>
        </h1>

        <div className="mt-auto flex flex-col gap-4 pt-8">
          {/* One card in two tiers: the numbers, then the two things that
              are not numbers — where it is, and how you get in. One panel
              rather than two, because they answer the same question ("what
              am I signing up for?") and two stacked boxes would read as two
              unrelated announcements.

              The figures are three equal columns, one line each. Their
              dividers are drawn on the columns rather than between them so
              the grid keeps its thirds — a separate divider element would
              take width of its own and push the middle figure off the centre
              line. */}
          <dl
            className="stage-rise pointer-events-auto overflow-hidden rounded-2xl border border-brand-cream/20 bg-brand-ink/35 backdrop-blur-md"
            style={{ animationDelay: RISE.facts }}
          >
            <div className="grid grid-cols-3">
              {facts.map((fact, index) => {
                const Icon = FACT_ICONS[fact.icon] ?? Trophy;
                return (
                  <div
                    key={fact.label}
                    className="flex items-center justify-center gap-1.5 px-1 py-3 not-first:border-s not-first:border-brand-cream/15"
                  >
                    <Icon
                      className="stage-float size-4 shrink-0 text-brand-gold"
                      /* Out of phase with its neighbours, so the row drifts
                         rather than bobbing in unison. */
                      style={{ animationDelay: `${index * 0.45}s` }}
                      aria-hidden="true"
                    />
                    {/* The icon is the label for a sighted reader; this is
                        the label for everyone else, and it keeps the `dl` a
                        real definition list rather than floating numbers. */}
                    <dt className="sr-only">{fact.label}</dt>
                    <dd className="text-[13.5px] leading-none font-bold tracking-tight whitespace-nowrap text-brand-cream">
                      {fact.value}
                    </dd>
                  </div>
                );
              })}
            </div>

            {/* The venue and the door rule, on one centred line under a
                hairline. Not a second three-column grid: these two are
                sentences of very different lengths and in Hindi they are
                longer again, so they are allowed to flow and to wrap
                together rather than being forced into columns that would
                leave one of them on three lines and the other on one. */}
            <div
              className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-brand-cream/15 px-3 py-2.5"
              style={{ animationDelay: RISE.notes }}
            >
              {notes.map((note, index) => {
                const Icon = FACT_ICONS[note.icon] ?? MapPin;
                return (
                  <div key={note.label} className="flex items-center gap-1.5">
                    {/* A dot before every note but the first, so the two read
                        as one line rather than as two stacked labels when
                        they happen to fit side by side. */}
                    {index > 0 && (
                      <span
                        className="me-1 size-1 rounded-full bg-brand-gold/60"
                        aria-hidden="true"
                      />
                    )}
                    <Icon
                      className="stage-float size-3.5 shrink-0 text-brand-gold-light"
                      style={{ animationDelay: `${0.9 + index * 0.45}s` }}
                      aria-hidden="true"
                    />
                    <dt className="sr-only">{note.label}</dt>
                    <dd className="text-[11.5px] leading-snug font-medium text-brand-cream/85">
                      {note.value}
                    </dd>
                  </div>
                );
              })}
            </div>
          </dl>

          <div
            className="stage-rise flex flex-col gap-2.5"
            style={{ animationDelay: RISE.cta }}
          >
            <Button
              type="button"
              size="lg"
              onClick={() => setSheetOpen(true)}
              className="pointer-events-auto h-14 w-full gap-2 rounded-full text-base font-semibold shadow-xl shadow-black/40"
            >
              {open ? t("stage_register") : t("hero_cta_closed")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>

            {/* The way down to the prizes and the questions, as a chevron
                rather than a sentence: it is the one thing on this screen
                that is not the ask, and it should look like it. */}
            <a
              href={detailsHref}
              className="pointer-events-auto mx-auto inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium text-brand-cream/65"
            >
              {t("stage_scroll")}
              <ChevronDown className="size-3.5" aria-hidden="true" />
            </a>
          </div>
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
