"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight, CalendarDays, Check, Flame, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogPortal,
  DialogOverlay,
  DialogTitle,
} from "@/components/ui/dialog";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { IkImage } from "@/components/media/IkImage";
import { usePathname } from "@/i18n/navigation";
import {
  HERO_IMAGE,
  YATRA_DEPARTURE,
  YATRA_ENABLED,
  YATRA_URL,
  yatraIsExternal,
} from "@/lib/site-config";

const SEEN_KEY = "iyf-yatra-promo-seen";
const OPEN_DELAY_MS = 1200;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whole days from today (in IST) to departure, or null once it has left.
 * Only ever called client-side after the dialog opens, so the count is the
 * visitor's today, never a stale one baked into a cached page.
 */
function daysToDeparture() {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const days = Math.round((Date.parse(YATRA_DEPARTURE) - Date.parse(today)) / DAY_MS);
  return days >= 0 ? days : null;
}

/**
 * Pages where a promo would get in the way of the job the visitor came to do:
 * signing in, paying, checking in at the door, or running the site.
 */
const QUIET_PATHS = ["/admin", "/dashboard", "/sign-in", "/sign-up", "/check-in", "/orders"];

/**
 * "Vrindavan Yatra bookings are live" — shown once per browser session, a
 * moment after the first page paints.
 *
 * It closes itself: a gold bar along the top drains over about ten seconds
 * and the dialog shuts when it runs out. The timer is that CSS animation and
 * nothing else — `onAnimationEnd` closes the dialog — so hovering (or
 * touching) the card pauses it with `animation-play-state`, and a visitor who
 * has started reading is never cut off mid-sentence. Focus does not pause it:
 * the dialog focuses its close button on open, which would stop the clock
 * before anyone had touched it. Under reduced motion the bar
 * holds still and the dialog waits to be dismissed.
 *
 * "Seen" is kept in sessionStorage, not localStorage: the offer is live for
 * weeks, and someone who closed it today may well be ready to book tomorrow.
 * Storage can throw (private mode, blocked site data); then it simply shows
 * again, which is harmless.
 */
export function YatraPromoModal() {
  const t = useTranslations("yatra_promo");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [paused, setPaused] = useState(false);

  const quiet = QUIET_PATHS.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (!YATRA_ENABLED || quiet) return;
    // Someone arriving on the WhatsApp deep link is already leaving for the
    // group; do not stack a promo on top of that.
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
  }, [quiet]);

  if (!YATRA_ENABLED) return null;

  const perks = t.raw("modal_perks");
  const daysLeft = open ? daysToDeparture() : null;
  const close = () => setOpen(false);
  const hold = () => setPaused(true);
  const release = () => setPaused(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogPortal>
        <DialogOverlay className="bg-black/55 supports-backdrop-filter:backdrop-blur-sm" />
        <DialogPrimitive.Popup
          onMouseEnter={hold}
          onMouseLeave={release}
          className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl bg-brand-ink text-white shadow-[0_30px_80px_-20px_rgba(242,166,59,0.45)] ring-1 ring-brand-gold/30 outline-none duration-300 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-90 data-open:slide-in-from-bottom-4 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          {/* The countdown. Its animation *is* the timer. */}
          <div className="absolute inset-x-0 top-0 z-30 h-1 bg-white/10">
            <div
              className="yatra-countdown h-full origin-left bg-linear-to-r from-brand-gold-light via-brand-gold to-brand-gold-deep"
              style={{ animationPlayState: paused ? "paused" : "running" }}
              onAnimationEnd={(e) => e.target === e.currentTarget && close()}
            />
          </div>

          <DialogClose
            className="absolute top-3 right-3 z-30 flex size-8 items-center justify-center rounded-full bg-black/40 text-white/90 backdrop-blur-md transition-colors hover:bg-black/60 hover:text-white"
          >
            <X className="size-4" aria-hidden="true" />
            <span className="sr-only">{t("modal_close")}</span>
          </DialogClose>

          {/* ---------- picture ---------- */}
          <div className="relative h-52 sm:h-60">
            <IkImage
              src={HERO_IMAGE}
              alt={t("modal_image_alt")}
              fill
              sizes="(min-width: 640px) 28rem, 100vw"
              className="object-cover"
            />
            <div
              className="absolute inset-0 bg-linear-to-t from-brand-ink via-brand-ink/55 to-brand-purple-dark/30"
              aria-hidden="true"
            />
            <PromoMandala className="animate-mandala absolute top-1/2 -right-24 size-72 text-brand-gold/20" />

            <div className="absolute top-4 right-14 left-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-gold px-2.5 py-1 text-[11px] font-bold tracking-wider text-brand-ink uppercase shadow-[0_6px_20px_-4px_rgba(242,166,59,0.9)]">
                <span className="relative flex size-2" aria-hidden="true">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-ink/60" />
                  <span className="relative inline-flex size-2 rounded-full bg-brand-ink" />
                </span>
                {t("modal_eyebrow")}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/35 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                <CalendarDays className="size-3.5 text-brand-gold-light" aria-hidden="true" />
                {t("modal_date")}
              </span>
            </div>

            <DialogTitle className="absolute inset-x-5 bottom-3 leading-none">
              <span className="instrument-serif block bg-linear-to-r from-brand-gold-light via-brand-gold to-brand-gold-deep bg-clip-text text-5xl text-transparent italic sm:text-6xl">
                {t("modal_title_lead")}
              </span>
              <span className="mt-1 block text-xl font-semibold tracking-tight sm:text-2xl">
                {t("modal_title_tail")}
              </span>
            </DialogTitle>
          </div>

          {/* ---------- offer ---------- */}
          <div className="px-5 pt-3 pb-5 sm:px-6 sm:pb-6">
            <DialogDescription className="text-[14px] leading-relaxed text-white/75">
              {t("modal_body")}
            </DialogDescription>

            <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2">
              {perks.map((perk) => (
                <li key={perk} className="flex items-start gap-2 text-[13px] leading-snug text-white/90">
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-brand-gold/20 text-brand-gold-light">
                    <Check className="size-3" aria-hidden="true" strokeWidth={3} />
                  </span>
                  {perk}
                </li>
              ))}
            </ul>

            <a
              href={YATRA_URL}
              {...(yatraIsExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              onClick={close}
              className="group relative mt-5 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-linear-to-r from-brand-gold-light via-brand-gold to-brand-gold-deep text-base font-bold text-brand-ink shadow-[0_12px_30px_-8px_rgba(242,166,59,0.9)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="yatra-shimmer pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-20deg] bg-white/45" aria-hidden="true" />
              {t("modal_cta")}
              <ArrowUpRight className="size-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
            </a>

            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1 font-medium text-brand-gold-light">
                <Flame className="size-3.5" aria-hidden="true" />
                {daysLeft === null
                  ? t("modal_urgency")
                  : `${t("modal_days_left", { days: daysLeft })} · ${t("modal_urgency")}`}
              </span>
              <DialogClose className="text-white/55 underline-offset-4 transition-colors hover:text-white hover:underline">
                {t("modal_later")}
              </DialogClose>
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}

/** The hero's lotus mandala, drawn again so the card carries the same mark. */
function PromoMandala({ className = "" }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      className={className}
      aria-hidden="true"
    >
      <circle cx="100" cy="100" r="26" />
      <circle cx="100" cy="100" r="64" />
      <circle cx="100" cy="100" r="96" strokeDasharray="2 6" />
      {Array.from({ length: 12 }, (_, i) => (
        <path
          key={i}
          d="M100 100 C 114 74, 114 44, 100 16 C 86 44, 86 74, 100 100 Z"
          transform={`rotate(${i * 30} 100 100)`}
        />
      ))}
    </svg>
  );
}
