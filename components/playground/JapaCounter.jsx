"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { CircleDot, Lock, Trophy, Undo2 } from "lucide-react";
import { Panel } from "@/components/site/Panel";
import { TabBar } from "./controls";
import { useSignedIn } from "./SignedInProvider";
import {
  computeStreak,
  syncUp,
  todayKey,
  useLocalState,
  useOutboxFlush,
} from "@/lib/playground/local";
import {
  haptic,
  hapticsEnabled,
  hapticsSupported,
  setHapticsEnabled,
} from "@/lib/playground/haptics";
import { resolveRewards } from "@/lib/playground/rewards";
import { useIsClient } from "@/lib/playground/useIsClient";
import { panchangForDay } from "@/lib/panchang";
import { cn } from "@/lib/utils";

/**
 * The japa counter.
 *
 * Two things make this different from a tally app. The first is that it is
 * built to be used without looking: the entire disc is one hit area, and the
 * phone buzzes once per bead, three times at each quarter of the round and a
 * longer pattern at 108, so a round can be counted with the eyes closed and
 * the phone in a bead bag. The second is that the rewards tab only ever
 * rewards chanting that happened — see `lib/playground/rewards.js`.
 *
 * Counting is stored per day as a running bead total. Rounds are derived from
 * it rather than stored separately, which is what makes undo trivial and makes
 * a half-finished round survive a page reload.
 */

const BEADS_PER_ROUND = 108;
const STORAGE_KEY = "japa";
const TARGET_KEY = "japa-target";
const TARGET_OPTIONS = [1, 4, 8, 16, 25, 64];

export function JapaCounter() {
  const t = useTranslations("playground.japa");
  const signedIn = useSignedIn();

  const [log, setLog, hydrated] = useLocalState(STORAGE_KEY, {});
  const [target, setTarget] = useLocalState(TARGET_KEY, 16);
  const [tab, setTab] = useState("counter");

  useOutboxFlush(signedIn);

  const today = todayKey();
  const entry = log[today] ?? { beads: 0, firstAt: null };
  const beads = entry.beads ?? 0;

  const rounds = Math.floor(beads / BEADS_PER_ROUND);
  const inRound = beads % BEADS_PER_ROUND;

  const setBeads = useCallback(
    (nextBeads, { firstAt } = {}) => {
      setLog((current) => {
        const existing = current[today] ?? { beads: 0, firstAt: null };
        const updated = {
          beads: Math.max(0, nextBeads),
          // The time of the day's first bead, kept so "started before 6am"
          // can be a fact rather than a claim. Never overwritten once set.
          firstAt: existing.firstAt ?? firstAt ?? null,
        };
        const next = { ...current, [today]: updated };

        syncUp(
          "/api/japa",
          {
            date: today,
            rounds: Math.floor(updated.beads / BEADS_PER_ROUND),
            beadTaps: updated.beads,
          },
          { enabled: signedIn, dedupeKey: today }
        );

        return next;
      });
    },
    [setLog, signedIn, today]
  );

  const tap = useCallback(() => {
    const next = beads + 1;
    const positionInRound = next % BEADS_PER_ROUND;

    if (positionInRound === 0) haptic("round");
    else if (positionInRound % 27 === 0) haptic("quarter");
    else haptic("bead");

    setBeads(next, { firstAt: nowHHMM() });
  }, [beads, setBeads]);

  const undo = useCallback(() => {
    if (beads === 0) return;
    haptic("undo");
    setBeads(beads - 1);
  }, [beads, setBeads]);

  const stats = useMemo(() => summarise(log), [log]);

  return (
    <div className="flex flex-col gap-5">
      <TabBar
        value={tab}
        onChange={setTab}
        tabs={[
          {
            key: "counter",
            label: t("tab_counter"),
            icon: <CircleDot className="size-4" aria-hidden="true" />,
          },
          {
            key: "rewards",
            label: t("tab_rewards"),
            icon: <Trophy className="size-4" aria-hidden="true" />,
          },
        ]}
      />

      {!hydrated ? (
        <div className="h-96 animate-pulse rounded-xl bg-muted/40" aria-hidden="true" />
      ) : tab === "counter" ? (
        <CounterTab
          t={t}
          beads={beads}
          inRound={inRound}
          rounds={rounds}
          target={target}
          onTarget={setTarget}
          onTap={tap}
          onUndo={undo}
          streak={stats.streak}
          lifetime={stats.lifetimeRounds}
        />
      ) : (
        <RewardsTab t={t} stats={stats} />
      )}
    </div>
  );
}

/* --------------------------------------------------------------- counter */

function CounterTab({
  t,
  beads,
  inRound,
  rounds,
  target,
  onTarget,
  onTap,
  onUndo,
  streak,
  lifetime,
}) {
  /* Both of these are facts about the browser, so they cannot be read during
     the server render. `useIsClient` defers them to the first client pass
     instead of pushing them through an effect — the toggle then keeps its own
     override, and falls back to the stored preference until someone touches
     it. */
  const isClient = useIsClient();
  const supported = isClient && hapticsSupported();
  const [override, setOverride] = useState(null);
  const haptics = override ?? (isClient ? hapticsEnabled() : true);

  const progress = inRound / BEADS_PER_ROUND;
  const roundProgress = target === 0 ? 0 : Math.min(1, rounds / target);

  return (
    <>
      <Panel className="p-5">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            {t("rounds_today")}
          </span>
          <span className="text-sm font-semibold text-foreground tabular-nums">
            {rounds} / {target}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${roundProgress * 100}%` }}
          />
        </div>

        {/* The whole disc is the button. A small tap target is the single
            biggest thing that would stop this being usable with the eyes
            closed, which is how japa is actually chanted. */}
        <button
          type="button"
          onClick={onTap}
          aria-label={t("tap_hint")}
          className="relative mx-auto mt-7 grid aspect-square w-full max-w-68 place-items-center rounded-full transition-transform duration-100 active:scale-[0.97]"
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
        >
          <BeadRing progress={progress} />

          <span className="relative flex flex-col items-center">
            <motion.span
              key={inRound}
              initial={{ scale: 1.12, opacity: 0.75 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.12 }}
              className="text-6xl font-semibold tabular-nums text-foreground"
            >
              {inRound}
            </motion.span>
            <span className="mt-1 text-xs font-medium text-muted-foreground">
              {t("beads")} · {BEADS_PER_ROUND}
            </span>
          </span>
        </button>

        <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
          {supported ? t("tap_hint_eyes") : t("tap_hint")}
        </p>

        <div className="mt-5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onUndo}
            disabled={beads === 0}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border px-3.5 text-sm font-medium text-muted-foreground disabled:opacity-40"
          >
            <Undo2 className="size-4" aria-hidden="true" />
            {t("undo")}
          </button>

          {supported ? (
            <button
              type="button"
              role="switch"
              aria-checked={haptics}
              onClick={() => {
                const next = !haptics;
                setOverride(next);
                setHapticsEnabled(next);
                if (next) haptic("confirm");
              }}
              className={cn(
                "min-h-10 rounded-full border px-3.5 text-sm font-medium transition-colors",
                haptics
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground"
              )}
            >
              {haptics ? t("haptics_on") : t("haptics_off")}
            </button>
          ) : (
            <span className="text-xs text-muted-foreground">
              {t("haptics_unsupported")}
            </span>
          )}
        </div>
      </Panel>

      <Panel className="p-4">
        <p className="text-sm font-medium text-foreground">{t("target")}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {TARGET_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                haptic("bead");
                onTarget(option);
              }}
              aria-pressed={option === target}
              className={cn(
                "min-h-10 min-w-11 rounded-full border px-3 text-sm font-semibold tabular-nums transition-colors",
                option === target
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border bg-card/50 text-muted-foreground"
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-3">
        <Panel className="p-4">
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            🔥 {streak}
          </p>
          <p className="text-xs text-muted-foreground">{t("streak")}</p>
        </Panel>
        <Panel className="p-4">
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {lifetime}
          </p>
          <p className="text-xs text-muted-foreground">{t("lifetime")}</p>
        </Panel>
      </div>
    </>
  );
}

/**
 * The progress ring around the counter.
 *
 * Drawn as an SVG arc rather than a border trick so it can run from the top
 * and stay perfectly circular at any size. The 108 tick marks are decorative
 * and hidden from assistive technology — the count itself is the text in the
 * middle, which is what gets announced.
 */
function BeadRing({ progress }) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;

  return (
    <svg
      viewBox="0 0 100 100"
      className="absolute inset-0 size-full -rotate-90"
      aria-hidden="true"
    >
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        className="text-border"
      />
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="text-primary transition-[stroke-dashoffset] duration-150"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - progress)}
      />
      {/* Quarter marks, at the beads where the phone buzzes differently. */}
      {[27, 54, 81].map((bead) => {
        const angle = (bead / BEADS_PER_ROUND) * 2 * Math.PI;
        return (
          <circle
            key={bead}
            cx={50 + radius * Math.cos(angle)}
            cy={50 + radius * Math.sin(angle)}
            r="1.6"
            className="fill-muted-foreground/50"
          />
        );
      })}
    </svg>
  );
}

/* --------------------------------------------------------------- rewards */

function RewardsTab({ t, stats }) {
  const locale = useLocale();
  const rewards = useMemo(() => resolveRewards(stats), [stats]);
  const unlocked = rewards.filter((reward) => reward.unlocked).length;

  return (
    <>
      <Panel className="p-4">
        <p className="text-sm font-semibold text-foreground">
          {t("unlocked_count", { unlocked, total: rewards.length })}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {t("rewards_hint")}
        </p>
      </Panel>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {rewards.map((reward) => (
          <Panel
            key={reward.key}
            tone={reward.unlocked ? "default" : "accent"}
            className={cn(
              "flex flex-col p-4 transition-opacity",
              !reward.unlocked && "opacity-70"
            )}
          >
            <span
              className={cn(
                "grid size-11 place-items-center rounded-2xl text-xl",
                reward.unlocked ? "bg-primary/15" : "bg-muted/50 grayscale"
              )}
              aria-hidden="true"
            >
              {reward.unlocked ? (
                reward.emoji
              ) : (
                <Lock className="size-4 text-muted-foreground" />
              )}
            </span>

            <p className="mt-3 text-sm font-semibold text-foreground">
              {reward.name[locale]}
            </p>
            <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">
              {reward.hint[locale]}
            </p>

            {reward.unlocked ? (
              <p className="mt-3 text-[11px] font-semibold text-primary">
                {t("reward_unlocked")}
              </p>
            ) : (
              <div className="mt-3">
                <div className="h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/60"
                    style={{ width: `${reward.progress * 100}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] tabular-nums text-muted-foreground">
                  {reward.current} / {reward.target}
                </p>
              </div>
            )}
          </Panel>
        ))}
      </div>
    </>
  );
}

/* ------------------------------------------------------------- statistics */

/** Current time in Patna as "HH:MM". */
function nowHHMM() {
  return new Date(Date.now() + 330 * 60000).toISOString().slice(11, 16);
}

/**
 * Everything the rewards need, in one pass over the log.
 *
 * The calendar lookups are the expensive part, so they only run for days that
 * actually have rounds on them — `panchangForDay` memoises, and a log of a few
 * hundred chanting days costs a few milliseconds once per change.
 */
function summarise(log) {
  let lifetimeRounds = 0;
  let bestDayRounds = 0;
  let daysChanted = 0;
  let earlyDays = 0;
  let ekadashiDays = 0;
  let festivalDays = 0;
  let bestEkadashiRounds = 0;

  for (const [dayKey, entry] of Object.entries(log)) {
    const rounds = Math.floor((entry?.beads ?? 0) / BEADS_PER_ROUND);
    if (rounds <= 0) continue;

    lifetimeRounds += rounds;
    daysChanted += 1;
    bestDayRounds = Math.max(bestDayRounds, rounds);
    if (entry.firstAt && entry.firstAt < "06:00") earlyDays += 1;

    let day;
    try {
      day = panchangForDay(dayKey);
    } catch {
      continue; // A malformed key from an old build must not break the grid.
    }
    if (day.ekadashi?.fast) {
      ekadashiDays += 1;
      bestEkadashiRounds = Math.max(bestEkadashiRounds, rounds);
    }
    if (day.festival) festivalDays += 1;
  }

  const hasRounds = (dayKey) =>
    Math.floor((log[dayKey]?.beads ?? 0) / BEADS_PER_ROUND) > 0;

  return {
    lifetimeRounds,
    bestDayRounds,
    daysChanted,
    earlyDays,
    ekadashiDays,
    festivalDays,
    bestEkadashiRounds,
    streak: computeStreak(hasRounds),
    bestStreak: bestRun(log),
  };
}

/** The longest run of consecutive chanting days ever recorded. */
function bestRun(log) {
  const days = Object.keys(log)
    .filter((dayKey) => Math.floor((log[dayKey]?.beads ?? 0) / BEADS_PER_ROUND) > 0)
    .sort();

  let best = 0;
  let run = 0;
  let previous = null;

  for (const dayKey of days) {
    const isNextDay =
      previous !== null &&
      Date.parse(`${dayKey}T00:00:00Z`) - Date.parse(`${previous}T00:00:00Z`) ===
        86400000;
    run = isNextDay ? run + 1 : 1;
    best = Math.max(best, run);
    previous = dayKey;
  }
  return best;
}
