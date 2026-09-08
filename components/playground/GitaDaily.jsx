"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, Check, Lightbulb, Share2 } from "lucide-react";
import { Panel } from "@/components/site/Panel";
import { useLocalState } from "@/lib/playground/local";
import { haptic } from "@/lib/playground/haptics";
import { chapterOf } from "@/lib/gita/chapters";
import {
  MAX_GUESSES,
  directionOf,
  guessableChapters,
  msUntilNextPuzzle,
  remainingChapters,
  scoreLabel,
  shareGrid,
  todaysPuzzle,
} from "@/lib/gita/daily";
import { cn } from "@/lib/utils";

/**
 * Gita Daily.
 *
 * A guessing game whose point is not the guessing. Every wrong answer buys a
 * clue, and the clues are the verse — its subject, who is speaking, a phrase
 * from the Sanskrit, then the line itself — so a player who loses has still
 * read the whole verse slowly, which is more than a player who wins in one.
 *
 * The result grid is arrows rather than the answer, so posting it in a group
 * chat spoils nothing. That is what is meant to carry this through WhatsApp:
 * the same verse for everybody, a score worth comparing, and no way to leak
 * the answer while comparing it.
 */

const STORAGE_KEY = "gita-daily";

const EMPTY_STATE = {
  puzzle: null,
  guesses: [],
  stats: { played: 0, wins: 0, streak: 0, best: 0, lastWon: null, distribution: {} },
};

export function GitaDaily() {
  const t = useTranslations("playground.gita_daily");
  const locale = useLocale();

  const [state, setState, hydrated] = useLocalState(STORAGE_KEY, EMPTY_STATE);
  const [selected, setSelected] = useState(null);

  // Resolved once per mount. The puzzle only turns over at midnight, and a
  // page open across that boundary is better served by a stale puzzle than by
  // one that changes under a half-finished game.
  const puzzle = useMemo(() => todaysPuzzle(), []);
  const answer = puzzle.verse.chapter;

  /* A game from a previous day is not this game.

     Memoised so the fallback is not a fresh `[]` on every render — `submit`
     closes over it, and a new array each pass would rebuild that callback
     forever. */
  const guesses = useMemo(
    () => (state.puzzle === puzzle.number ? state.guesses : []),
    [state.puzzle, state.guesses, puzzle.number]
  );
  const won = guesses.includes(answer);
  const finished = won || guesses.length >= MAX_GUESSES;

  const submit = useCallback(() => {
    if (selected === null || finished) return;

    const nextGuesses = [...guesses, selected];
    const isWin = selected === answer;
    const isOver = isWin || nextGuesses.length >= MAX_GUESSES;

    haptic(isWin ? "reward" : isOver ? "undo" : "bead");

    setState((current) => {
      const stats = { ...EMPTY_STATE.stats, ...current.stats };

      if (isOver) {
        // A streak counts consecutive *puzzles* won, not consecutive days
        // opened — someone who skips a day and comes back has not chanted
        // through it either.
        const continues = isWin && stats.lastWon === puzzle.number - 1;
        stats.played += 1;
        stats.wins += isWin ? 1 : 0;
        stats.streak = isWin ? (continues ? stats.streak + 1 : 1) : 0;
        stats.best = Math.max(stats.best, stats.streak);
        stats.lastWon = isWin ? puzzle.number : stats.lastWon;

        const bucket = isWin ? String(nextGuesses.length) : "X";
        stats.distribution = {
          ...stats.distribution,
          [bucket]: (stats.distribution?.[bucket] ?? 0) + 1,
        };
      }

      return { puzzle: puzzle.number, guesses: nextGuesses, stats };
    });

    setSelected(null);
  }, [answer, finished, guesses, puzzle.number, selected, setState]);

  if (!hydrated) {
    return <div className="h-96 animate-pulse rounded-xl bg-muted/40" aria-hidden="true" />;
  }

  const available = remainingChapters(guesses, answer);

  return (
    <div className="flex flex-col gap-5">
      <Panel className="p-4 text-center">
        <p className="text-sm font-semibold text-foreground">
          {t("puzzle", { number: puzzle.number })}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{t("same_verse")}</p>
      </Panel>

      <Clues t={t} locale={locale} verse={puzzle.verse} revealed={guesses.length} />

      {finished ? (
        <Result
          t={t}
          locale={locale}
          puzzle={puzzle}
          guesses={guesses}
          won={won}
          stats={state.stats}
        />
      ) : (
        <>
          <GuessHistory t={t} guesses={guesses} answer={answer} />

          <Panel className="p-4">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-medium text-foreground">{t("prompt")}</p>
              <p className="text-xs font-medium text-muted-foreground">
                {MAX_GUESSES - guesses.length === 1
                  ? t("one_guess_left")
                  : t("guesses_left", { count: MAX_GUESSES - guesses.length })}
              </p>
            </div>

            <div className="mt-3 grid grid-cols-6 gap-1.5 sm:grid-cols-9">
              {guessableChapters().map((chapter) => {
                const ruledOut = !available.includes(chapter);
                const isSelected = selected === chapter;
                return (
                  <button
                    key={chapter}
                    type="button"
                    disabled={ruledOut}
                    aria-pressed={isSelected}
                    onClick={() => {
                      haptic("bead");
                      setSelected(chapter);
                    }}
                    className={cn(
                      "flex min-h-11 items-center justify-center rounded-xl border text-sm font-semibold tabular-nums transition-colors",
                      ruledOut
                        ? "border-transparent bg-muted/30 text-muted-foreground/30"
                        : isSelected
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border bg-card/50 text-foreground active:bg-muted"
                    )}
                    style={{ touchAction: "manipulation" }}
                  >
                    {chapter}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={selected === null}
              className="mt-4 flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              {selected === null
                ? t("guess_placeholder")
                : t("chapter_short", { number: selected })}
            </button>
          </Panel>
        </>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- clues */

/**
 * The clue ladder.
 *
 * One clue is free; each wrong guess opens the next. They run from the most
 * abstract to the most literal, so the verse arrives in pieces rather than all
 * at once, and the last one before the answer is the Sanskrit itself.
 */
function Clues({ t, locale, verse, revealed }) {
  const clues = [
    { key: "theme", label: t("clue_theme"), value: verse.theme[locale] },
    { key: "speaker", label: t("clue_speaker"), value: t(`speaker_${verse.speaker}`) },
    { key: "keyword", label: t("clue_keyword"), value: verse.keyword },
    { key: "roman", label: t("clue_first_line"), value: verse.roman[0] },
    { key: "devanagari", label: t("clue_devanagari"), value: verse.sanskrit[0] },
  ];

  const shown = clues.slice(0, Math.min(clues.length, revealed + 1));

  return (
    <div className="flex flex-col gap-2">
      {shown.map((clue, index) => (
        <motion.div
          key={clue.key}
          initial={index === shown.length - 1 && index > 0 ? { opacity: 0, y: -6 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Panel tone="accent" className="p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              <Lightbulb className="size-3.5" aria-hidden="true" />
              {t("clue", { number: index + 1 })} · {clue.label}
            </p>
            <p
              className={cn(
                "mt-2 leading-relaxed text-foreground",
                clue.key === "devanagari"
                  ? "font-hindi text-lg"
                  : clue.key === "roman" || clue.key === "keyword"
                    ? "text-base italic"
                    : "text-[15px]"
              )}
            >
              {clue.value}
            </p>
          </Panel>
        </motion.div>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- history */

function GuessHistory({ t, guesses, answer }) {
  if (guesses.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {guesses.map((guess, index) => {
        const direction = directionOf(guess, answer);
        return (
          <div
            key={index}
            className="flex items-center justify-between rounded-xl border border-border bg-card/40 px-3.5 py-2.5"
          >
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {t("chapter_short", { number: guess })}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              {direction === "later" ? (
                <>
                  <ArrowUp className="size-3.5" aria-hidden="true" />
                  {t("higher")}
                </>
              ) : (
                <>
                  <ArrowDown className="size-3.5" aria-hidden="true" />
                  {t("lower")}
                </>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- result */

function Result({ t, locale, puzzle, guesses, won, stats }) {
  const { verse, number } = puzzle;
  const chapter = chapterOf(verse.chapter);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    const tick = () => setCountdown(formatCountdown(msUntilNextPuzzle()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const share = async () => {
    const text = [
      t("share_line", {
        number,
        score: scoreLabel(guesses, verse.chapter),
      }),
      shareGrid(guesses, verse.chapter),
      typeof window === "undefined"
        ? ""
        : `${window.location.origin}${window.location.pathname}`,
    ]
      .filter(Boolean)
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
    <>
      <Panel className={cn("p-4 text-center", won && "border-primary/30")}>
        <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-foreground">
          {won && <Check className="size-4 text-primary" aria-hidden="true" />}
          {won
            ? t("correct", { number: verse.chapter })
            : t("failed", { number: verse.chapter })}
        </p>
        <p className="mt-2 text-lg tracking-[0.2em]" aria-hidden="true">
          {shareGrid(guesses, verse.chapter)}
        </p>
      </Panel>

      <Panel className="p-5">
        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          {t("reveal")} · {verse.id}
        </p>

        <div className="font-hindi mt-3 space-y-1 text-lg leading-relaxed text-foreground">
          {verse.sanskrit.map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>

        <div className="mt-4 space-y-0.5 text-sm italic leading-relaxed text-muted-foreground">
          {verse.roman.map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>

        <p className="mt-4 border-l-2 border-primary/40 pl-4 text-[15px] leading-relaxed text-foreground">
          {verse.translation[locale]}
        </p>

        <p className="mt-4 text-xs text-muted-foreground">
          {chapter.sanskrit[locale]} · {chapter.title[locale]}
        </p>
      </Panel>

      <button
        type="button"
        onClick={share}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
      >
        <Share2 className="size-4" aria-hidden="true" />
        {copied ? t("share_copied") : t("share")}
      </button>

      <Panel className="grid grid-cols-4 gap-3 p-4 text-center">
        <Stat label={t("stat_played")} value={stats.played ?? 0} />
        <Stat
          label={t("stat_wins")}
          value={
            stats.played ? `${Math.round(((stats.wins ?? 0) / stats.played) * 100)}%` : "—"
          }
        />
        <Stat label={t("stat_streak")} value={stats.streak ?? 0} />
        <Stat label={t("stat_best")} value={stats.best ?? 0} />
      </Panel>

      <p className="text-center text-xs text-muted-foreground tabular-nums">
        {t("next_puzzle", { time: countdown })}
      </p>
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-xl font-semibold tabular-nums text-foreground">{value}</p>
      <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{label}</p>
    </div>
  );
}

function formatCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = String(Math.floor(total / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}
