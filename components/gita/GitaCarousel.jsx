"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { IkImage } from "@/components/media/IkImage";
import { cn } from "@/lib/utils";

/**
 * The festival posters at the top of the page, where the headline used to be.
 *
 * The two pictures carry their own titles — "Gita Mahotsav · Celebrating Divine
 * Wisdom" and "Gita Quiz · Quest for Divine Wisdom" — so they are the heading
 * here, not decoration beside one. That is what makes their `alt` text
 * load-bearing rather than polite: for anyone who cannot see them, the alt is
 * the only place the festival names itself. It is written out in full in
 * content/events, in both languages.
 *
 * Built on CSS scroll-snap rather than a carousel library, and the order of
 * priorities is deliberate:
 *
 *   - with no JavaScript at all it is still a swipeable strip of two posters,
 *     which on a phone is the whole interaction anyway;
 *   - the script adds auto-advance, dots and arrows on top of that, driving
 *     the same scroll container rather than a second source of truth;
 *   - which slide is "current" is read back off the scroll position, so a
 *     thumb-swipe and a dot-tap can never disagree about where it is.
 *
 * It holds still for anyone who asked for less motion, while the pointer is
 * over it, while anything inside it has keyboard focus, and while the tab is
 * in the background — a poster that keeps sliding under a cursor is the thing
 * people hate about carousels, and a tab in another window should not be
 * animating at all.
 *
 * `fit` is how a poster meets its frame:
 *
 *   - "auto" lets the frame take the picture's own height. The default, and
 *     right when every slide shares one aspect ratio.
 *   - "contain" fits the whole poster inside a frame the caller has sized and
 *     fills what is left with a blurred, scaled copy of the same picture. This
 *     is the desktop strip, where one poster is 3:4 and the other 16:9:
 *     cropping would cut a title off, and bare letterbox bars read as a bug.
 *     The dots then move over the picture instead of sitting under it.
 *
 * The phone does not use this at all — it gets one still painting with live
 * type over it, which is `GitaStage`.
 */

const ADVANCE_MS = 6000;
/* After a swipe or a tap, autoplay stays out of the way long enough that the
   person is clearly done looking rather than being argued with. */
const RESUME_AFTER_MS = 12000;

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToMotion(onChange) {
  const query = window.matchMedia(MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const readMotion = () => window.matchMedia(MOTION_QUERY).matches;

/** `slides` is `[{ src, alt, width, height }]`, already localised. */
export function GitaCarousel({
  slides,
  className,
  /* What this region is called. Defaulted rather than required, but a page
     holding two of these must name them apart: a reader jumping between
     landmarks has nothing else to tell one from the other. */
  label,
  fit = "auto",
  frameClassName,
  dotsClassName,
  sizes = "(min-width: 1024px) 1024px, 100vw",
  /* Off by default, and the festival page leaves it off on purpose. It holds
     two of these — the phone's posters and the desktop's — and both are in the
     document at either width, one of them hidden by a media query. A lazy
     image inside a `display: none` subtree is never near the viewport and so
     is never fetched, which is what keeps a phone from downloading the
     desktop artwork it will never show. A preload would defeat exactly that.
     Pass it where a carousel is the only one on the page. */
  priority = false,
}) {
  const t = useTranslations("gita");
  const trackRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  /* Timestamp of the last manual move, so autoplay can hold off afterwards. */
  const touchedAt = useRef(0);

  /* The server has no media queries; assume motion is allowed there and let
     the client correct it on hydration. Subscribed to rather than copied into
     state, so there is never a first frame of movement for someone who asked
     for none. */
  const stillness = useSyncExternalStore(subscribeToMotion, readMotion, () => false);

  const goTo = useCallback((next, { smooth = true } = {}) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({
      left: next * track.clientWidth,
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  /** Which slide is under the viewport now, read off the scroll position. */
  const onScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    setIndex(Math.round(track.scrollLeft / track.clientWidth));
  }, []);

  const jump = useCallback(
    (next) => {
      touchedAt.current = Date.now();
      goTo((next + slides.length) % slides.length);
    },
    [goTo, slides.length],
  );

  /* Auto-advance. One interval for the life of the component; the conditions
     are re-read inside it rather than torn down and rebuilt on every pause,
     which would restart the countdown each time the pointer crossed an edge. */
  useEffect(() => {
    if (stillness || slides.length < 2) return undefined;

    const id = setInterval(() => {
      if (paused) return;
      if (document.visibilityState !== "visible") return;
      if (Date.now() - touchedAt.current < RESUME_AFTER_MS) return;

      const track = trackRef.current;
      if (!track || track.clientWidth === 0) return;
      const current = Math.round(track.scrollLeft / track.clientWidth);
      goTo((current + 1) % slides.length);
    }, ADVANCE_MS);

    return () => clearInterval(id);
  }, [stillness, paused, slides.length, goTo]);

  /* A resize changes what one "page" of the track is worth, which would leave
     it parked between two posters. Put it back on the current one. */
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    const observer = new ResizeObserver(() => {
      goTo(Math.round(track.scrollLeft / track.clientWidth), { smooth: false });
    });
    observer.observe(track);
    return () => observer.disconnect();
  }, [goTo]);

  if (slides.length === 0) return null;

  const filled = fit !== "auto";

  return (
    <div
      className={cn("group/carousel relative w-full", filled && "h-full", className)}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        ref={trackRef}
        onScroll={onScroll}
        /* `group` is the carousel's own, so the arrows react to this element
           and not to some ancestor that also happens to be a group. */
        className={cn(
          "flex w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          filled
            ? "h-full"
            : "rounded-2xl border border-brand-gold/25 shadow-2xl shadow-black/40",
          frameClassName,
        )}
        /* A labelled region rather than a listbox or a tablist: it is a set of
           pictures a reader can simply scroll through, and announcing fake
           widget semantics over a scroll container helps nobody. */
        role="region"
        aria-roledescription="carousel"
        aria-label={label || t("carousel_label")}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            jump(index + 1);
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            jump(index - 1);
          }
        }}
      >
        {slides.map((slide, i) => (
          <div
            key={slide.src}
            className={cn(
              "w-full shrink-0 snap-center snap-always",
              filled && "relative h-full overflow-hidden",
            )}
            aria-roledescription="slide"
            aria-label={t("carousel_slide", { index: i + 1, total: slides.length })}
          >
            {/* The filler behind a contained poster: the same picture, blown
                up and blurred past recognition, so a 3:4 poster in a 16:10
                frame sits in its own colours rather than in two black bars.
                It asks for a tiny rendition — it is never seen sharp — and is
                hidden from assistive tech, which already has the real one. */}
            {filled && (
              <IkImage
                src={slide.src}
                alt=""
                aria-hidden="true"
                width={64}
                height={64}
                sizes="64px"
                loading="lazy"
                className="absolute inset-0 size-full scale-125 object-cover blur-2xl saturate-150"
              />
            )}
            <IkImage
              src={slide.src}
              alt={slide.alt}
              width={slide.width || 1408}
              height={slide.height || 768}
              /* The first poster is the page's largest paint; the rest can
                 wait until the reader asks for them. */
              priority={priority && i === 0}
              loading={priority && i === 0 ? undefined : "lazy"}
              sizes={sizes}
              className={cn(
                filled ? "absolute inset-0 size-full object-contain" : "block h-auto w-full",
              )}
            />
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <>
          {/* Arrows on pointer devices only — a phone has the swipe, and two
              buttons over a 16:9 poster on a small screen cover the artwork. */}
          <button
            type="button"
            onClick={() => jump(index - 1)}
            aria-label={t("carousel_previous")}
            className="absolute start-3 top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-full border border-brand-cream/20 bg-brand-ink/60 text-brand-cream backdrop-blur-sm transition-opacity hover:bg-brand-ink/80 focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-brand-gold/50 focus-visible:outline-none sm:grid sm:opacity-0 sm:group-hover/carousel:opacity-100"
          >
            <ChevronLeft className="size-5 rtl:rotate-180" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => jump(index + 1)}
            aria-label={t("carousel_next")}
            className="absolute end-3 top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-full border border-brand-cream/20 bg-brand-ink/60 text-brand-cream backdrop-blur-sm transition-opacity hover:bg-brand-ink/80 focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-brand-gold/50 focus-visible:outline-none sm:grid sm:opacity-0 sm:group-hover/carousel:opacity-100"
          >
            <ChevronRight className="size-5 rtl:rotate-180" aria-hidden="true" />
          </button>

          <div
            className={cn(
              "flex items-center justify-center gap-2",
              filled ? "absolute inset-x-0 bottom-0 z-10" : "mt-4",
              dotsClassName,
            )}
          >
            {slides.map((slide, i) => (
              <button
                key={slide.src}
                type="button"
                onClick={() => jump(i)}
                aria-label={t("carousel_go_to", { index: i + 1 })}
                aria-current={i === index ? "true" : undefined}
                /* The hit area is a comfortable 44px square; only the pill
                   inside it is painted. */
                className="grid size-11 place-items-center rounded-full focus-visible:ring-3 focus-visible:ring-brand-gold/50 focus-visible:outline-none"
              >
                <span
                  className={cn(
                    "block h-1.5 rounded-full transition-all duration-300",
                    i === index ? "w-7 bg-brand-gold" : "w-1.5 bg-brand-cream/35",
                  )}
                />
              </button>
            ))}
          </div>
        </>
      )}

      {/* Which poster is showing, for a screen reader that is not following
          the scroll. Polite: it must not interrupt anything being read. */}
      <p className="sr-only" aria-live="polite">
        {t("carousel_slide", { index: index + 1, total: slides.length })}
      </p>
    </div>
  );
}
