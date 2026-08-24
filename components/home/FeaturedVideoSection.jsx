"use client";

import { motion } from "framer-motion";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260402_054547_9875cfc5-155a-4229-8ec8-b7ba7125cbf8.mp4";

export function FeaturedVideoSection() {
  return (
    <section className="overflow-hidden bg-black px-6 pb-20 pt-6 md:pb-32 md:pt-10">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.9 }}
          className="relative aspect-video overflow-hidden rounded-3xl"
        >
          <video
            className="h-full w-full object-cover"
            src={VIDEO_URL}
            muted
            autoPlay
            loop
            playsInline
            preload="auto"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
              <div className="liquid-glass max-w-md rounded-2xl p-6 md:p-8">
                <p className="mb-3 text-xs uppercase tracking-widest text-white/50">Our Approach</p>
                <p className="text-sm leading-relaxed text-white md:text-base">
                  We believe in the power of curiosity-driven exploration. Every project starts with a question, and every answer opens a new door to innovation.
                </p>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="liquid-glass rounded-full px-8 py-3 text-sm font-medium text-white"
              >
                Explore more
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
