"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, CalendarDays, Ticket, Trophy, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { IkImage } from "@/components/media/IkImage";
import { Diya } from "@/components/gita/Diya";
import { Link } from "@/i18n/navigation";
import { gitaPromoIsLive } from "@/lib/gita-event/promo";

const SEEN_KEY = "iyf-gita-promo-seen";
const OPEN_DELAY_MS = 1100;

/* Named rather than passed in: a React component cannot cross the server /
   client boundary as a prop, so the server hands over icon names and this
   keeps its own copy of the map — the same arrangement as `GitaStage`. */
const FACT_ICONS = { trophy: Trophy, calendar: CalendarDays, ticket: Ticket };

/**
 * "Registration is open" — the Gita Mahotsav popup on the homepage, shown
 * once a session until the quiz day and never after it.
 *
 * It is the poster, the three figures somebody asks for (what can be won,
 * when, what it costs) and Register. Nothing else: this is an interruption,
 * and an interruption gets one screen to earn the tap. The figures are the
 * same three the festival page leads with, localised on the server and handed
 * over finished, so a price or a date changed in the festival JSON moves the
 * popup along with the page.
 *
 * Three things have to be true before it opens, and all three are decided in
 * the browser rather than on the server, because the homepage is prerendered
 * and a server-side answer would be whatever was true at build time:
 *
 *   - today in India is on or before the quiz day (`gitaPromoIsLive`);
 *   - this session has not seen it;
 *   - the visitor did not arrive on a `#hash` — somebody following a deep
 *     link is already on their way somewhere, and a popup over that is a
 *     door shut in front of them.
 *
 * "Seen" is sessionStorage, not localStorage, the same choice the yatra promo
 * makes and for the same reason: registration runs for weeks, and somebody
 * who closed this on Tuesday may well be ready to register on Thursday. One
 * line to change if it should be once per browser instead. Storage throws in
 * private mode and with site data blocked; the popup then simply shows again,
 * which is harmless.
 *
 * It closes itself. A gold bar along the top drains over twelve seconds and
 * `animationend` shuts the dialog — the CSS animation *is* the timer, so
 * hovering or touching the card pauses it with `animation-play-state` and
 * nobody is cut off mid-read. Focus deliberately does not pause it: the
 * dialog focuses its close button on open, which would stop the clock before
 * anyone had touched anything. Under reduced motion the bar holds still and
 * the dialog waits to be dismissed.
 *
 * Registration being closed early by the admin flag is not checked here —
 * that is a live database read, and this page is prerendered. Register goes
 * to `/gita-mahotsav`, which is dynamic and says so itself.
 */
export function GitaPromoModal({ href, poster, eyebrow, lines, title, facts }) {
  const t = useTranslations("gita");
  const [open, setOpen] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!gitaPromoIsLive()) return;
    if (window.location.hash) return;

    try {
      if (sessionStorage.getItem(SEEN_KEY)) return;
    } catch {}

    const timer = setTimeout(() => {
      setOpen(true);
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {}
    }, OPEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const close = () => setOpen(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogPortal>
        <DialogOverlay className="bg-black/60 supports-backdrop-filter:backdrop-blur-sm" />
        <DialogPrimitive.Popup
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl bg-brand-ink text-brand-cream shadow-[0_30px_80px_-20px_rgba(242,166,59,0.45)] ring-1 ring-brand-gold/30 outline-none duration-300 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-90 data-open:slide-in-from-bottom-4 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          {/* The countdown. Its animation *is* the timer. */}
          <div className="absolute inset-x-0 top-0 z-30 h-1 bg-white/10">
            <div
              className="gita-countdown h-full origin-left bg-linear-to-r from-brand-gold-light via-brand-gold to-brand-gold-deep"
              style={{ animationPlayState: paused ? "paused" : "running" }}
              onAnimationEnd={(e) => e.target === e.currentTarget && close()}
            />
          </div>

          <DialogClose className="absolute top-3 right-3 z-30 flex size-8 items-center justify-center rounded-full bg-black/40 text-brand-cream/90 backdrop-blur-md transition-colors hover:bg-black/60 hover:text-white">
            <X className="size-4" aria-hidden="true" />
            <span className="sr-only">{t("promo_close")}</span>
          </DialogClose>

          {/* ---------------------------------------------------- the poster
              The painting is untyped, so the festival's names are set over it
              as live text in the one brush face on the site — being text they
              translate, and they re-cut for a narrow card. Centred rather
              than bottom-anchored as on the phone stage: the frame here is a
              band, and the chariot sits in the middle of it. */}
          <div className="relative h-52 sm:h-60">
            <IkImage
              src={poster.src}
              alt={poster.alt}
              width={poster.width}
              height={poster.height}
              sizes="(min-width: 640px) 28rem, 100vw"
              className="absolute inset-0 size-full object-cover object-center"
            />
            <div
              className="absolute inset-0 bg-linear-to-t from-brand-ink via-brand-ink/60 to-brand-ink/25"
              aria-hidden="true"
            />

            <div className="absolute top-4 right-14 left-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-gold px-2.5 py-1 text-[11px] font-bold tracking-wider text-brand-ink uppercase shadow-[0_6px_20px_-4px_rgba(242,166,59,0.9)]">
                <span className="relative flex size-2" aria-hidden="true">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-ink/60" />
                  <span className="relative inline-flex size-2 rounded-full bg-brand-ink" />
                </span>
                {t("promo_eyebrow")}
              </span>
              <p className="mt-1.5 text-[11px] font-semibold tracking-wider text-brand-gold-light uppercase drop-shadow-[0_2px_10px_rgba(16,10,6,0.9)]">
                {eyebrow}
              </p>
            </div>

            {/* The festival's own name, for a screen reader. What a sighted
                reader gets is the two brush lines below, which are the same
                name broken the way the poster breaks it. */}
            <DialogTitle className="sr-only">{title}</DialogTitle>

            <div className="absolute inset-x-5 bottom-3 flex items-end justify-between gap-3">
              <p
                className="kaushan-script text-[clamp(1.75rem,8vw,2.5rem)] leading-[1.05] text-brand-cream drop-shadow-[0_3px_22px_rgba(16,10,6,0.85)]"
                aria-hidden="true"
              >
                {lines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </p>
              <Diya className="mb-1 size-8 shrink-0 text-brand-gold" />
            </div>
          </div>

          {/* ------------------------------------------------ the three facts
              An equal three-column grid rather than content-width columns, so
              the row stays symmetrical whatever the numbers are, in either
              language — the same decision the phone stage's bar makes. */}
          <div className="px-5 pt-4 pb-5 sm:px-6 sm:pb-6">
            <DialogDescription className="text-[14px] leading-relaxed text-brand-cream/75">
              {t("promo_body")}
            </DialogDescription>

            <dl className="mt-4 grid grid-cols-3 gap-2">
              {facts.map(({ icon, label, value }) => {
                const Icon = FACT_ICONS[icon] ?? Trophy;
                return (
                  <div
                    key={label}
                    className="rounded-xl border border-brand-cream/12 bg-brand-cream/[0.05] px-2.5 py-2 text-start"
                  >
                    <dt className="flex items-center gap-1 text-[10px] font-medium text-brand-cream/60">
                      <Icon className="size-3 shrink-0 text-brand-gold" aria-hidden="true" />
                      <span className="truncate">{label}</span>
                    </dt>
                    <dd className="mt-0.5 text-sm font-semibold tracking-tight">{value}</dd>
                  </div>
                );
              })}
            </dl>

            {/* `Link`, not an `<a>`: this is an internal route and the locale
                prefix comes from the i18n router rather than being written
                in. `onClick` closes the dialog as well as navigating, so
                coming back with the browser's Back button does not land on a
                homepage with this still mounted open. */}
            <Link
              href={href}
              onClick={close}
              className="group relative mt-5 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-linear-to-r from-brand-gold-light via-brand-gold to-brand-gold-deep text-base font-bold text-brand-ink shadow-[0_12px_30px_-8px_rgba(242,166,59,0.9)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <span
                className="gita-shimmer pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-20deg] bg-white/45"
                aria-hidden="true"
              />
              {t("promo_cta")}
              <ArrowRight
                className="size-5 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>

            <div className="mt-3 flex items-center justify-between gap-3 text-xs">
              <span className="text-brand-gold-light">{t("promo_note")}</span>
              <DialogClose className="shrink-0 text-brand-cream/55 underline-offset-4 transition-colors hover:text-white hover:underline">
                {t("promo_later")}
              </DialogClose>
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}
