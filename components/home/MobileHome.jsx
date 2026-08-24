"use client";

import { motion } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { GlassCard } from "@/components/glass/GlassCard";
import { HeroVideo } from "@/components/home/HeroVideo";
import { AmbientVideo } from "@/components/media/AmbientVideo";
import { videos } from "@/lib/videos";

// Emphasised words in headings render in the display face.
const serif = (chunks) => (
  <span className="instrument-serif italic text-gold-ink">{chunks}</span>
);

export function MobileHome({ programs, festival }) {
  const t = useTranslations("home");
  const locale = useLocale();

  return (
    <div className="flex flex-col gap-10 px-4 pb-10 pt-4">
      {/* Hero — the film owns the fold, with only the one serif line above it.
          The subtracted height covers the sticky top bar and the fixed dock. */}
      <section className="flex min-h-[calc(100svh-11rem)] flex-col justify-center">
        <HeroVideo compact anchorId="kirtan-mobile" />
      </section>

      {/* The pitch, now the first thing revealed on scroll. */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-[32px] border border-glass/10 px-5 pb-8 pt-9"
      >
        <div className="animate-glow-pulse absolute -inset-16 -z-10 rounded-full bg-[radial-gradient(circle,rgba(242,166,59,0.28),transparent_62%)]" />
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-gold/30 bg-brand-gold/10 px-3 py-1.5 text-[11px] font-semibold text-gold-ink">
            {t("eyebrow")}
          </span>
          <h1 className="mt-4 text-balance text-[40px] font-extrabold leading-[1.02] tracking-tight text-foreground">
            {t("heading_line1")} {t("heading_line2")}{" "}
            <span className="instrument-serif bg-gradient-to-r from-brand-gold-light via-brand-gold to-brand-purple bg-clip-text text-[44px] italic text-transparent">
              {t("heading_line3")}
            </span>
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-foreground/65">{t("body")}</p>
        </div>

        <div className="mt-8 flex flex-col gap-2.5">
          <Link
            href="/programs"
            className="rounded-2xl bg-gradient-to-br from-brand-gold-light to-brand-gold px-6 py-3.5 text-center text-sm font-bold text-brand-ink"
          >
            {t("cta_primary")}
          </Link>
          <a
            href="#kirtan-mobile"
            className="rounded-2xl border border-glass/14 bg-glass/5 px-6 py-3.5 text-center text-sm font-semibold text-foreground"
          >
            {t("cta_secondary")}
          </a>
        </div>
        <div className="mt-6 flex justify-between border-t border-glass/8 pt-4">
          <Stat value={t("stat_members_value")} label={t("stat_members_label")} />
          <Stat value={t("stat_chapters_value")} label={t("stat_chapters_label")} />
          <Stat value={t("stat_festivals_value")} label={t("stat_festivals_label")} />
        </div>
      </motion.section>

      {/* About preview */}
      <section>
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-glass/10 bg-brand-ink">
          <AmbientVideo src={videos.studyingAlone} />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <span className="absolute bottom-4 left-4 text-[10px] uppercase tracking-widest text-white/70">
            {t("about_preview_caption")}
          </span>
        </div>
        <h2 className="mt-5 text-2xl font-extrabold text-foreground">
          {t.rich("about_preview_title", { em: serif })}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-foreground/60">
          {t("about_preview_body")}
        </p>
        <Link
          href="/about"
          className="mt-3 inline-block text-xs font-semibold text-gold-ink"
        >
          {t("about_preview_cta")} →
        </Link>
      </section>

      {festival && (
        <GlassCard tint="purple" className="p-6">
          <span className="text-[11px] font-bold uppercase tracking-widest text-gold-ink">
            {t("festival_banner_eyebrow")}
          </span>
          <h2 className="mt-2 text-2xl font-extrabold text-foreground">
            {festival.title[locale]}
          </h2>
          <Link
            href="/festivals"
            className="mt-4 inline-block rounded-xl bg-gradient-to-br from-brand-gold-light to-brand-gold px-4 py-2.5 text-sm font-bold text-brand-ink"
          >
            {t("festival_banner_cta")}
          </Link>
        </GlassCard>
      )}

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-xl font-extrabold text-foreground">
            {t.rich("programs_preview_title", { em: serif })}
          </h2>
          <Link href="/programs" className="text-xs font-semibold text-gold-ink">
            {t("programs_preview_cta")} →
          </Link>
        </div>
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
          {programs.map((program) => (
            <GlassCard
              key={program._id}
              className="w-64 shrink-0 overflow-hidden p-0"
            >
              {program.image && (
                <img
                  src={program.image}
                  alt={program.title[locale]}
                  className="h-28 w-full object-cover"
                />
              )}
              <div className="p-4">
                <h3 className="text-sm font-bold text-foreground">
                  {program.title[locale]}
                </h3>
                <p className="mt-1 text-xs text-foreground/55">{program.schedule[locale]}</p>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Join CTA — the gathering footage sits behind the closing ask. */}
      <div className="relative overflow-hidden rounded-3xl border border-glass/10 bg-brand-ink">
        <AmbientVideo src={videos.gathering} className="absolute inset-0" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />
        <div className="relative flex flex-col items-center gap-3 px-6 py-12 text-center">
          <h2 className="text-balance text-2xl font-extrabold text-white">
            {t.rich("join_cta_title", { em: serif })}
          </h2>
          <p className="text-sm text-white/70">{t("join_cta_body")}</p>
          <Link
            href="/programs"
            className="mt-2 w-full rounded-2xl bg-gradient-to-br from-brand-gold-light to-brand-gold px-6 py-3.5 text-sm font-bold text-brand-ink"
          >
            {t("join_cta_button")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <span className="flex flex-col">
      <b className="text-lg font-extrabold text-foreground">{value}</b>
      <span className="text-[11px] text-foreground/45">{label}</span>
    </span>
  );
}
