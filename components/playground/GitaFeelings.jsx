"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { ArrowLeft, RefreshCw, Share2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Panel } from "@/components/site/Panel";
import { haptic } from "@/lib/playground/haptics";
import { MOODS, chapterOf, moodByKey } from "@/lib/gita/chapters";
import { versesForMood } from "@/lib/gita/verses";
import { cn } from "@/lib/utils";

/**
 * Gita for what you're feeling.
 *
 * The door this tool opens is the widest one on the site, so it is built for
 * someone who has never opened a Gita and did not come here looking for one.
 * Three consequences, all deliberate:
 *
 *   - The first screen asks nothing and stores nothing. No account, no mood
 *     history, no "we noticed you've been anxious" — a tool people reach for
 *     at their lowest must not be one that keeps a record of it.
 *   - The tiles are worded as feelings rather than as diagnoses. "Can't get
 *     going" finds a reader that "affliction by tamas" loses.
 *   - Every verse carries a line saying why it is the answer to that feeling,
 *     because a Sanskrit couplet handed over without one is not consolation.
 *
 * The invitation at the end is the only thing being asked for, and it comes
 * after the verse rather than before it.
 */

export function GitaFeelings() {
  const t = useTranslations("playground.feelings");
  const [mood, setMood] = useState(null);

  if (!mood) return <MoodGrid t={t} onPick={setMood} />;
  return <VerseView t={t} moodKey={mood} onBack={() => setMood(null)} />;
}

/* ------------------------------------------------------------ mood grid */

function MoodGrid({ t, onPick }) {
  const locale = useLocale();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t("prompt")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("sub_prompt")}</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {MOODS.map((mood) => (
          <button
            key={mood.key}
            type="button"
            onClick={() => {
              haptic("confirm");
              onPick(mood.key);
            }}
            className={cn(
              "flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-center transition-transform active:scale-[0.97]",
              mood.tone === "light"
                ? "border-primary/25 bg-primary/5"
                : "border-border bg-card/40"
            )}
            style={{ touchAction: "manipulation" }}
          >
            <span className="text-2xl" aria-hidden="true">
              {mood.emoji}
            </span>
            <span className="text-xs leading-tight font-medium text-foreground">
              {mood.label[locale]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- verse view */

function VerseView({ t, moodKey, onBack }) {
  const locale = useLocale();
  const mood = moodByKey(moodKey);
  const verses = useMemo(() => versesForMood(moodKey), [moodKey]);

  /* Where in the list to start. Randomised once per visit so that opening the
     same feeling twice in a week does not hand over the same verse twice, and
     held in state rather than recomputed so that paging back and forth is
     stable. */
  const [index, setIndex] = useState(() =>
    verses.length === 0 ? 0 : Math.floor(Math.random() * verses.length)
  );
  const [copied, setCopied] = useState(false);

  if (verses.length === 0) return null;

  const verse = verses[index % verses.length];
  const chapter = chapterOf(verse.chapter);

  const next = () => {
    haptic("bead");
    setIndex((current) => (current + 1) % verses.length);
  };

  const share = async () => {
    const text = [
      verse.sanskrit.join("\n"),
      "",
      verse.translation[locale],
      "",
      `— Bhagavad-gita ${verse.id}`,
      typeof window === "undefined"
        ? ""
        : `${window.location.origin}${window.location.pathname}`,
    ]
      .filter((line) => line !== undefined)
      .join("\n");

    haptic("confirm");

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // Dismissed. Fall through to the clipboard.
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border px-3.5 text-sm font-medium text-muted-foreground"
        >
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
          {t("back")}
        </button>
        <p className="text-xs text-muted-foreground tabular-nums">
          {t("of_count", { index: (index % verses.length) + 1, total: verses.length })}
        </p>
      </div>

      <p className="text-sm font-medium text-foreground">
        <span className="mr-1.5 text-base" aria-hidden="true">
          {mood.emoji}
        </span>
        {t("for_mood", { mood: mood.label[locale].toLowerCase() })}
      </p>

      <motion.div
        key={verse.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <Panel className="p-5">
          <div className="font-hindi space-y-1 text-lg leading-relaxed text-foreground">
            {verse.sanskrit.map((line, lineIndex) => (
              <p key={lineIndex}>{line}</p>
            ))}
          </div>

          <div className="mt-4 space-y-0.5 text-sm italic leading-relaxed text-muted-foreground">
            {verse.roman.map((line, lineIndex) => (
              <p key={lineIndex}>{line}</p>
            ))}
          </div>

          <p className="mt-5 border-l-2 border-primary/40 pl-4 text-[15px] leading-relaxed text-foreground">
            {verse.translation[locale]}
          </p>

          <p className="mt-4 text-xs font-medium text-muted-foreground">
            Bhagavad-gita {verse.id} · {chapter.sanskrit[locale]}
          </p>
        </Panel>
      </motion.div>

      <Panel tone="accent" className="p-4">
        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          {t("why_this")}
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-foreground">
          {verse.theme[locale]}
        </p>
      </Panel>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={next}
          disabled={verses.length < 2}
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border border-border text-sm font-semibold text-foreground disabled:opacity-40"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          {t("another")}
        </button>
        <button
          type="button"
          onClick={share}
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          <Share2 className="size-4" aria-hidden="true" />
          {copied ? t("share_copied") : t("share")}
        </button>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        {t("translation_note")}
      </p>

      {/* The ask, and it comes last on purpose. */}
      <Panel className="mt-2 p-5">
        <h2 className="text-base font-semibold text-foreground">{t("cta_title")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t("cta_body")}
        </p>
        <Link
          href="/programs"
          className="mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          {t("cta_button")}
        </Link>
      </Panel>
    </div>
  );
}
