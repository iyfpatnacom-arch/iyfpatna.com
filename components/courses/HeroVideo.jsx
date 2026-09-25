"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The looping clip in a course hero.
 *
 * Playback is started from an effect rather than the `autoPlay` attribute,
 * which is the only way `prefers-reduced-motion` can actually be honoured:
 * the attribute has the clip running from first paint, before any script
 * could ask. A reader who has asked for less motion gets the poster frame and
 * real controls instead — a decorative loop that cannot be stopped is the
 * exact thing that preference is about — and the media query is subscribed to
 * rather than read once, so changing the system setting takes effect without
 * a reload.
 *
 * `muted` is also assigned as a property before play(), not left to the
 * attribute: React does not reliably reflect it onto the element on first
 * render, and an unmuted video is refused autoplay by every browser. With
 * `playsInline` missing, iOS would take the clip fullscreen instead of
 * running it in place.
 *
 * Autoplay can still be refused — battery saver, data saver, a per-site block
 * — and nothing here treats that as an error. The poster simply stays up,
 * which is a perfectly good hero.
 */
export function HeroVideo({ src, poster, label, className }) {
  const ref = useRef(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");

    const apply = () => {
      setReduced(query.matches);
      const video = ref.current;
      if (!video) return;

      if (query.matches) {
        video.pause();
        video.currentTime = 0;
        return;
      }

      video.muted = true;
      video.play().catch(() => {});
    };

    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  return (
    <video
      ref={ref}
      className={className}
      src={src}
      poster={poster}
      aria-label={label}
      muted
      loop
      playsInline
      preload="metadata"
      controls={reduced}
    />
  );
}
