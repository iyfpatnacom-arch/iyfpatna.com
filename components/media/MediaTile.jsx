"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import Image from "next/image";

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/*
 * Subscribed to rather than copied into state. `matchMedia` is an external
 * store, so useSyncExternalStore reads it during render and stays consistent
 * — setting state from an effect would render once with the wrong value and
 * then again to correct it, which is a visible frame of motion for exactly
 * the person who asked for none.
 */
function subscribeToMotion(onChange) {
  const query = window.matchMedia(MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const readMotion = () => window.matchMedia(MOTION_QUERY).matches;

/**
 * The picture at the top of a Program or Course card — a looping clip or a
 * still, decided by `media` from `mediaFor()`.
 *
 * Three things it is careful about:
 *
 * 1. It never autoplays for someone who asked for less motion. `prefers-
 *    reduced-motion` is read once on mount and the clip is left paused with
 *    controls offered instead, rather than moving anyway.
 * 2. It only plays while on screen. Half a dozen cards each decoding video
 *    off-screen is a real battery and bandwidth cost on the mid-range Android
 *    phones most of these pages are read on, so an IntersectionObserver
 *    pauses anything scrolled away.
 * 3. `preload="none"` plus a poster-less first frame means an unseen card
 *    costs nothing until it scrolls into view.
 */
export function MediaTile({ media, alt = "", className = "" }) {
  const videoRef = useRef(null);
  // The server has no media queries; assume motion is allowed there and let
  // the client correct it on hydration.
  const reducedMotion = useSyncExternalStore(
    subscribeToMotion,
    readMotion,
    () => false,
  );

  useEffect(() => {
    const el = videoRef.current;
    if (!el || reducedMotion) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Autoplay can still be refused (low power mode); ignoring the
          // rejection leaves a paused first frame, which is fine.
          el.play().catch(() => {});
        } else {
          el.pause();
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [reducedMotion]);

  if (!media) return null;

  if (media.kind === "video") {
    return (
      <video
        ref={videoRef}
        src={media.src}
        muted
        loop
        playsInline
        preload="none"
        controls={reducedMotion}
        aria-label={alt || undefined}
        className={className}
      />
    );
  }

  return (
    <Image
      src={media.src}
      alt={alt}
      fill
      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
      className={className}
    />
  );
}
