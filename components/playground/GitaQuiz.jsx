"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { GlassCard } from "@/components/glass/GlassCard";
import { cn } from "@/lib/utils";

export function GitaQuiz({ questions, clerkConfigured }) {
  const t = useTranslations("playground.quiz");
  const locale = useLocale();
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const question = questions[index];

  function selectOption(i) {
    if (selected !== null) return;
    setSelected(i);
    if (i === question.correctIndex) setScore((s) => s + 1);
  }

  function next() {
    if (index + 1 < questions.length) {
      setIndex((i) => i + 1);
      setSelected(null);
      return;
    }
    setFinished(true);
    if (clerkConfigured) {
      fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapter: question.chapter,
          score,
          total: questions.length,
        }),
      }).catch(() => {});
    }
  }

  function restart() {
    setStarted(false);
    setIndex(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
  }

  if (!started) {
    return (
      <GlassCard className="mt-10 flex flex-col items-center gap-4 p-10 text-center">
        <p className="text-foreground/60">{questions.length} questions</p>
        <button
          onClick={() => setStarted(true)}
          className="rounded-2xl bg-gradient-to-br from-brand-gold-light to-brand-gold px-6 py-3.5 text-sm font-bold text-brand-ink"
        >
          {t("start")}
        </button>
      </GlassCard>
    );
  }

  if (finished) {
    return (
      <GlassCard className="mt-10 flex flex-col items-center gap-4 p-10 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-foreground/50">
          {t("score")}
        </p>
        <p className="text-5xl font-extrabold text-foreground">
          {score}/{questions.length}
        </p>
        <button
          onClick={restart}
          className="mt-2 rounded-2xl border border-glass/15 px-6 py-3 text-sm font-semibold text-foreground"
        >
          {t("retry")}
        </button>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="mt-10 p-6 md:p-8">
      <p className="text-xs font-semibold text-foreground/40">
        {index + 1} / {questions.length}
      </p>
      <h2 className="mt-2 text-lg font-bold text-foreground">{question.question[locale]}</h2>
      <div className="mt-5 flex flex-col gap-2.5">
        {question.options.map((opt, i) => {
          const isCorrect = i === question.correctIndex;
          const isSelected = i === selected;
          const revealed = selected !== null;
          return (
            <button
              key={i}
              onClick={() => selectOption(i)}
              disabled={revealed}
              className={cn(
                "rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors",
                revealed && isCorrect && "border-emerald-400/50 bg-emerald-400/10 text-emerald-200",
                revealed && isSelected && !isCorrect && "border-red-400/50 bg-red-400/10 text-red-200",
                !revealed && "border-glass/12 text-foreground/80 hover:bg-glass/5",
                revealed && !isCorrect && !isSelected && "border-glass/8 text-foreground/40"
              )}
            >
              {opt[locale]}
            </button>
          );
        })}
      </div>
      {selected !== null && (
        <button
          onClick={next}
          className="mt-6 w-full rounded-xl bg-gradient-to-br from-brand-gold-light to-brand-gold px-4 py-3 text-sm font-bold text-brand-ink"
        >
          {index + 1 < questions.length ? t("next") : t("submit")}
        </button>
      )}
    </GlassCard>
  );
}
