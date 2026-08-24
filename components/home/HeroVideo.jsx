"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AmbientVideo } from "@/components/media/AmbientVideo";
import { videos } from "@/lib/videos";

const MotionLink = motion.create(Link);

/**
 * The hero centrepiece: an editorial line set in Instrument Serif, then the
 * film itself carrying a glass caption card and a call to action.
 *
 * `compact` tightens the type ramp and swaps the overlay to a stacked layout
 * for the phone hero — the two homes share this block so the copy and the
 * footage never drift apart.
 */
export function HeroVideo({ compact = false, anchorId }) {
  const t = useTranslations("home");

  return (
    // The "watch the kirtan" CTA targets this block — it is the film it means.
    // Both homes render at once (CSS decides which shows), so the id has to be
    // supplied per layout rather than baked in, or it would be duplicated.
    <div id={anchorId} className="flex scroll-mt-28 flex-col items-center">
      {/* The single line above the film — nothing else competes with it for the
          fold, so it is sized to sit on one line rather than wrap into a block. */}
      <motion.p
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: "easeOut", delay: 0.25 }}
        className={
          compact
            ? "instrument-serif mb-5 text-center text-[22px] leading-[1.2] text-foreground/80"
            : "instrument-serif mb-6 text-center text-[clamp(18px,2.2vw,32px)] leading-[1.15] text-foreground/80"
        }
      >
        {t("hero_video_line")}{" "}
        <span className="italic text-gold-ink">{t("hero_video_line_accent")}</span>
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1, ease: "easeOut", delay: 0.35 }}
        // The frame's max-height transfers into a max-width through the aspect
        // ratio, so it is usually narrower than this wrapper. As a block box it
        // would sit flush left; centring it here keeps it on the same axis as
        // the line above.
        className="relative flex w-full justify-center"
      >
        {/* Warm bloom behind the frame, tying the film into the page's palette. */}
        <div className="animate-glow-pulse pointer-events-none absolute -inset-6 -z-10 rounded-[48px] bg-[radial-gradient(circle_at_50%_35%,rgba(242,166,59,0.32),transparent_65%)]" />

        {/* The aspect ratio drives the height until the viewport is too short
            for it; past that the cap wins and `object-cover` crops, which keeps
            the whole frame inside the fold instead of pushing it under. */}
        <div
          className={`relative w-[70%] overflow-hidden rounded-3xl border border-glass/12 bg-brand-ink shadow-[0_40px_90px_-40px_var(--glass-shadow)] ${
            compact ? "aspect-[4/5] max-h-[54svh]" : "aspect-video max-h-[58svh]"
          }`}
        >
          <AmbientVideo src={videos.enlightenment} priority />

          {/* Scrim: keeps the overlay legible over any frame of the loop. */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

          {/* <div className={`absolute inset-x-0 top-0 ${compact ? "p-5" : "p-6 md:p-10"}`}>
            <div className="flex flex-col items-center justify-center gap-6 md:flex-col md:items-center">
              <div className={`liquid-glass rounded-2xl ${compact ? "p-5" : "max-w-md p-6 md:p-8"}`}>
                <p className="mb-3 text-xs uppercase tracking-widest text-white/50">
                  {t("hero_video_card_eyebrow")}
                </p>
                <p className={`leading-relaxed text-white ${compact ? "text-sm" : "text-sm md:text-base"}`}>
                  {t("hero_video_card_body")}
                </p>
              </div>

              <MotionLink
                href="/about"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`liquid-glass shrink-0 rounded-full text-sm font-medium text-white ${
                  compact ? "w-full px-8 py-3 text-center" : "px-8 py-3"
                }`}
              >
                {t("hero_video_cta")}
              </MotionLink>
            </div>
          </div> */}
        </div>
      </motion.div>
    </div>
  );
}
