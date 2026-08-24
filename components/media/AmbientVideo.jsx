"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Decorative, muted, looping background footage.
 *
 * The home page carries several clips at once, so playback is gated on
 * visibility: a clip only fetches and plays once it scrolls into view, and
 * pauses again when it leaves. `priority` opts the hero out of that gate so it
 * starts loading immediately. Users who ask for reduced motion get a still
 * frame instead of a loop.
 */
export function AmbientVideo({ src, className, priority = false, poster }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Deferred clips carry no src in the markup, so nothing loads until they
    // are needed — including on the reduced-motion path, which still wants one
    // frame to paint.
    const load = () => {
      if (!el.src) el.src = src;
    };

    const play = () => {
      // Autoplay can still be refused (low power mode); a paused first frame is
      // an acceptable outcome, so swallow the rejection.
      el.play().catch(() => {});
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Show a still frame, never a loop. `autoplay` is set in the markup for
      // the hero, so it has to be cleared rather than simply not started.
      el.autoplay = false;
      el.preload = "metadata";
      load();
      el.pause();
      return;
    }

    if (priority) {
      play();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          load();
          play();
        } else {
          el.pause();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [priority, src]);

  return (
    <video
      ref={ref}
      // Deferred clips get their src assigned once in view; the hero needs it
      // in the initial markup so the browser can start fetching during hydration.
      src={priority ? src : undefined}
      poster={poster}
      className={cn("h-full w-full object-cover", className)}
      preload={priority ? "auto" : "none"}
      autoPlay={priority}
      muted
      loop
      playsInline
      disablePictureInPicture
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}
