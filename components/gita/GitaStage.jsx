"use client";

import { useTranslations } from "next-intl";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  MapPin,
  QrCode,
  Ticket,
  Trophy,
} from "lucide-react";
import { IkImage } from "@/components/media/IkImage";
import { Diya } from "@/components/gita/Diya";
import { Link } from "@/i18n/navigation";
import { Button as MovingBorderButton } from "@/components/ui/moving-border";
import { cn } from "@/lib/utils";

/**
 * The festival on a phone: the poster, three figures, Register.
 *
 * The poster is the page here, and it comes in two kinds. An untyped
 * painting — Krishna and Arjuna on the chariot, the sky open above them —
 * gets the festival's two names set over it in Kaushan Script, the one brush
 * face on the site; being text, they translate, they re-cut for a narrow
 * screen, and they leave room for Register underneath. A finished poster
 * with its own lettering gets none of that, because two sets of the same
 * names in one frame is one set too many.
 *
 * Which it is comes from the content file (`poster.hasTitle`), not from a
 * guess here. When the poster carries its own type the overlay is reduced to
 * a screen-reader heading and the top scrim is dropped — that scrim exists
 * to make cream type readable against a pale sky, and over a poster's own
 * title it is just a shadow across the artwork.
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
 * Register is a link to /gita-mahotsav/register, not a sheet over this
 * picture. It was a sheet, and the sheet is what the form kept losing to: a
 * nine-field form in a 92svh dialog has two scroll surfaces, the keyboard
 * eats a third of the one it is in, and an autofill menu over frosted glass
 * has a chariot showing through it. A page that costs one navigation and
 * cannot be swiped away by accident is the better trade for the one thing on
 * this screen somebody must not lose their place in.
 *
 * Only the phone gets this. From `md` up the page below renders its own hero
 * and its own inline form; nothing of the form is in this subtree any more,
 * so there is only ever one of it in the document.
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
  /* The festival's own name, for the heading a screen reader is given when
     the poster's lettering is the only thing a sighted reader gets. */
  title,
  lines,
  eyebrow,
  facts,
  notes,
  open,
  registerHref,
  detailsHref,
}) {
  const t = useTranslations("gita");
  /* A poster that names itself needs nothing written over it. */
  const titled = Boolean(poster?.hasTitle) || !lines?.length;

  return (
    <section className="relative isolate flex min-h-[calc(100svh-11rem)] flex-col overflow-hidden bg-brand-ink text-brand-cream md:hidden">
      {/* The poster, filling the frame. `cover` crops rather than
          letterboxes, and which end gives way depends on what is in it: a
          titled poster is cropped from the bottom, because its lettering is
          along the top and the bottom is where the figures and the button
          sit anyway; an untyped painting is cropped from the top, where
          there is only sky.

          It is not `priority` — the desktop hero below is in the same
          document behind a media query, and a lazy image inside a
          `display: none` subtree is never fetched, which is what keeps each
          width from downloading the other's artwork. */}
      <IkImage
        src={poster.src}
        alt={poster.alt}
        width={poster.width}
        height={poster.height}
        sizes="100vw"
        className={cn(
          "absolute inset-0 size-full object-cover",
          titled ? "object-top" : "object-bottom",
        )}
      />

      {/* Two scrims, one from each edge. The top one is what the names are
          read against — the sky behind them is cream and pink, and cream type
          on it would vanish. The bottom one carries the figures and the
          button. The middle is left alone: that is the chariot. */}
      {!titled && (
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand-ink/80 via-brand-ink/10 to-transparent"
          aria-hidden="true"
        />
      )}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-ink via-brand-ink/30 to-transparent"
        aria-hidden="true"
      />

      <div className="pointer-events-none relative z-10 flex flex-1 flex-col px-5 pt-5 pb-7">
        {!titled && (
          <p
            className="stage-rise pointer-events-auto mx-auto rounded-full border border-brand-gold/30 bg-brand-ink/40 px-3.5 py-1.5 text-[10px] font-semibold tracking-[0.18em] text-brand-gold-light uppercase backdrop-blur-md"
            style={{ animationDelay: RISE.eyebrow }}
          >
            {eyebrow}
          </p>
        )}

        {/* The names. A titled poster has them already, drawn far better
            than type over a photograph can be, so all that is left to do is
            give the page a heading nobody sees — the poster's lettering is a
            picture, and `alt` text on a background image is not a heading.

            The desktop hero below carries an `h1` of its own. Only ever one
            of the two is rendered: the other sits inside a `display: none`
            subtree, which no reader, assistive or otherwise, is shown. */}
        {titled ? (
          <h1 className="sr-only">{title}</h1>
        ) : (
          <h1
            /* Sized against the viewport rather than at two breakpoints: a
               brush script this large is within a few percent of the
               screen's width at every phone size, and `clamp` holds that
               margin everywhere instead of at 360 and 390 and nowhere in
               between. The names are deliberately left wrappable — if a
               longer one ever outgrows its line it breaks onto two, which on
               a poster is fine, where overflowing the screen would not be.

               `-mx-1` buys the names a little of the padding the rest of the
               overlay keeps, because they are the only thing here that is
               width-bound. */
            className="stage-rise kaushan-script -mx-1 mt-5 text-center text-[clamp(2.75rem,14vw,3.75rem)] text-brand-cream drop-shadow-[0_3px_22px_rgba(16,10,6,0.85)]"
            style={{ animationDelay: RISE.title }}
          >
            <span className="block">{lines[0]}</span>

            {/* The lamp between the two names, on the same axis as
                everything else on the poster. Its flame flickers on its own
                (`animate-diya`) and the glow behind it breathes a little out
                of step with it, which is what keeps the pair from looking
                like one blinking element. Decoration, so it is hidden from
                the screen reader, which hears the two names in sequence. */}
            <span
              className="my-2 flex items-center justify-center gap-3"
              aria-hidden="true"
            >
              <span className="h-px w-12 bg-gradient-to-r from-transparent to-brand-gold/60" />
              <span className="relative grid size-7 place-items-center">
                <span className="stage-glow absolute size-7 rounded-full bg-brand-gold/40 blur-md" />
                <Diya className="relative size-7 text-brand-gold" />
              </span>
              <span className="h-px w-12 bg-gradient-to-l from-transparent to-brand-gold/60" />
            </span>

            <span className="block">{lines[1]}</span>
          </h1>
        )}

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
            {/* The same button the desktop hero uses — the gold spark running
                its rim — rather than a plain filled pill. One festival, one
                Register: the artwork above it is the same on both, and a
                phone arriving from a WhatsApp forward should recognise the
                button somebody showed them on a laptop. Full width here
                because it is the one thing to tap on this screen. The face is
                opaque, not `/80`: the spark is an 80px blob behind it, and
                through a translucent face it reads as a semicircle sliding
                about inside the button instead of a light running the rim.

                A `Link`, so the form page is prefetched while they are still
                reading the poster and the locale rides along — and so the one
                tap on this screen is a navigation a browser understands,
                openable in a new tab and recoverable with Back. */}
            <MovingBorderButton
              as={Link}
              href={registerHref}
              borderRadius="999px"
              duration={3500}
              containerClassName="pointer-events-auto h-14 w-full p-[1.5px] text-base shadow-xl shadow-black/40"
              borderClassName="h-20 w-20 bg-[radial-gradient(#F2A63B_40%,transparent_60%)] opacity-80"
              className="gap-2 border-brand-gold/30 bg-brand-ink-2 px-7 text-base font-semibold text-brand-cream"
            >
              {open ? t("stage_register") : t("hero_cta_closed")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </MovingBorderButton>

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
    </section>
  );
}
