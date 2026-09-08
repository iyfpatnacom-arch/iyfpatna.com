"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Panel } from "@/components/site/Panel";
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
      <Panel className="mt-10 flex flex-col items-center gap-4 p-10 text-center">
        <p className="text-muted-foreground">{questions.length} questions</p>
        <button
          onClick={() => setStarted(true)}
          className="min-h-11 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-opacity active:opacity-90"
        >
          {t("start")}
        </button>
      </Panel>
    );
  }

  if (finished) {
    return (
      <Panel className="mt-10 flex flex-col items-center gap-4 p-10 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          {t("score")}
        </p>
        <p className="text-5xl font-semibold tabular-nums text-foreground">
          {score}/{questions.length}
        </p>
        <button
          onClick={restart}
          className="mt-2 min-h-11 rounded-full border border-border px-6 text-sm font-semibold text-foreground transition-colors active:bg-muted"
        >
          {t("retry")}
        </button>
      </Panel>
    );
  }

  return (
    <Panel className="mt-10 p-6 md:p-8">
      <p className="text-xs font-medium text-muted-foreground">
        {index + 1} / {questions.length}
      </p>
      <h2 className="mt-2 text-lg font-semibold text-foreground">{question.question[locale]}</h2>
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
                revealed && isCorrect && "border-emerald-600/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                revealed && isSelected && !isCorrect && "border-destructive/40 bg-destructive/10 text-destructive",
                !revealed && "border-border text-foreground hover:bg-muted/50",
                revealed && !isCorrect && !isSelected && "border-border/60 text-muted-foreground"
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
          className="mt-6 min-h-11 w-full rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity active:opacity-90"
        >
          {index + 1 < questions.length ? t("next") : t("submit")}
        </button>
      )}
    </Panel>
  );
}
