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

export function DesktopHome({ programs, festival }) {
  const t = useTranslations("home");
  const locale = useLocale();

  return (
    <div className="mx-auto max-w-[1400px] px-10 pb-24 pt-6">
      {/* Hero — the film owns the fold. Only the one serif line sits above it,
          and the height is held just under the viewport so the section below
          peeks and reads as scrollable. Nav and page padding come out of the
          measurement because the header is sticky, so it occupies flow height. */}
      <section className="flex min-h-[calc(100svh-9rem)] flex-col items-center justify-center">
        {/* Wide enough that the serif line above the film stays on one line. */}
        <div className="w-full max-w-6xl">
          <HeroVideo anchorId="kirtan" />
        </div>
      </section>

      {/* The pitch, now the first thing revealed on scroll. */}
      <section className="flex flex-col items-center py-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex max-w-3xl flex-col items-center gap-6 text-center"
        >
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-gold/30 bg-brand-gold/10 px-4 py-2 text-[13px] font-semibold text-gold-ink backdrop-blur-md">
            {t("eyebrow")}
          </span>
          <h1 className="text-balance text-[68px] font-extrabold leading-[0.98] tracking-tight text-foreground">
            {t("heading_line1")} {t("heading_line2")}
            <br />
            <span className="instrument-serif bg-gradient-to-r from-brand-gold-light via-brand-gold to-brand-purple bg-clip-text text-[76px] italic text-transparent">
              {t("heading_line3")}
            </span>
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-foreground/65">
            {t("body")}
          </p>
          <div className="flex items-center gap-3.5 pt-1.5">
            <Link
              href="/programs"
              className="rounded-2xl bg-gradient-to-br from-brand-gold-light to-brand-gold px-7 py-4 text-[15px] font-bold text-brand-ink shadow-[0_20px_44px_-16px_rgba(242,166,59,0.85)] transition-transform hover:scale-[1.03]"
            >
              {t("cta_primary")}
            </Link>
            <a
              href="#kirtan"
              className="rounded-2xl border border-glass/14 bg-gradient-to-br from-glass/10 to-glass/[0.03] px-6.5 py-4 text-[15px] font-semibold text-foreground backdrop-blur-lg transition-colors hover:border-glass/25"
            >
              {t("cta_secondary")}
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-14 flex w-full max-w-3xl justify-center gap-16 border-t border-glass/8 pt-8"
        >
          <Stat value={t("stat_members_value")} label={t("stat_members_label")} />
          <Stat value={t("stat_chapters_value")} label={t("stat_chapters_label")} />
          <Stat value={t("stat_festivals_value")} label={t("stat_festivals_label")} />
        </motion.div>
      </section>

      {/* About preview */}
      <section className="grid grid-cols-2 items-center gap-14 py-16">
        <GlassCard className="p-10">
          <h2 className="text-4xl font-extrabold text-foreground">
            {t.rich("about_preview_title", { em: serif })}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-foreground/60">
            {t("about_preview_body")}
          </p>
          <p className="font-hindi mt-4 text-base leading-relaxed text-gold-ink/80">
            {t("body_hi")}
          </p>
          <Link
            href="/about"
            className="mt-6 inline-block text-sm font-semibold text-gold-ink"
          >
            {t("about_preview_cta")} →
          </Link>
        </GlassCard>
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-glass/10 bg-brand-ink"
        >
          <AmbientVideo src={videos.studyingAlone} />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <span className="absolute bottom-5 left-5 text-xs uppercase tracking-widest text-white/70">
            {t("about_preview_caption")}
          </span>
        </motion.div>
      </section>

      {/* Programs preview */}
      <section className="py-16">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="text-4xl font-extrabold text-foreground">
            {t.rich("programs_preview_title", { em: serif })}
          </h2>
          <Link href="/programs" className="text-sm font-semibold text-gold-ink">
            {t("programs_preview_cta")} →
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-6">
          {programs.map((program) => (
            <GlassCard key={program._id} className="group overflow-hidden p-0">
              {program.image && (
                <img
                  src={program.image}
                  alt={program.title[locale]}
                  className="h-40 w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              )}
              <div className="p-5">
                <h3 className="font-bold text-foreground">{program.title[locale]}</h3>
                <p className="mt-1 text-sm text-foreground/55">{program.schedule[locale]}</p>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Current festival banner */}
      {festival && (
        <section className="py-16">
          <GlassCard tint="purple" className="flex items-center justify-between overflow-hidden p-10">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-gold-ink">
                {t("festival_banner_eyebrow")}
              </span>
              <h2 className="mt-3 text-4xl font-extrabold text-foreground">
                {festival.title[locale]}
              </h2>
              {festival.description && (
                <p className="mt-3 max-w-xl text-foreground/60">
                  {festival.description[locale]}
                </p>
              )}
            </div>
            <Link
              href="/festivals"
              className="shrink-0 rounded-2xl bg-gradient-to-br from-brand-gold-light to-brand-gold px-6 py-3.5 text-sm font-bold text-brand-ink"
            >
              {t("festival_banner_cta")}
            </Link>
          </GlassCard>
        </section>
      )}

      {/* Join CTA — the gathering footage sits behind the closing ask. */}
      <section className="py-16">
        <div className="relative overflow-hidden rounded-3xl border border-glass/10 bg-brand-ink">
          <AmbientVideo src={videos.gathering} className="absolute inset-0" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />
          <div className="relative flex flex-col items-center gap-4 px-10 py-24 text-center">
            <h2 className="max-w-2xl text-balance text-5xl font-extrabold text-white">
              {t.rich("join_cta_title", { em: serif })}
            </h2>
            <p className="max-w-md text-white/70">{t("join_cta_body")}</p>
            <Link
              href="/programs"
              className="mt-4 rounded-2xl bg-gradient-to-br from-brand-gold-light to-brand-gold px-8 py-4 text-[15px] font-bold text-brand-ink shadow-[0_20px_44px_-16px_rgba(242,166,59,0.85)] transition-transform hover:scale-[1.03]"
            >
              {t("join_cta_button")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <span className="flex flex-col items-center">
      <b className="text-[30px] font-extrabold text-foreground">{value}</b>
      <span className="text-[13px] text-foreground/45">{label}</span>
    </span>
  );
}
