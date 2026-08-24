"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/glass/GlassCard";

const ROUNDS_TARGET = 108;
const STORAGE_KEY = "iyf-japa-log";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadLog() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveLog(log) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  } catch {}
}

function computeStreak(log) {
  let streak = 0;
  const cursor = new Date();
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if ((log[key]?.rounds ?? 0) > 0) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export function JapaCounter({ clerkConfigured }) {
  const t = useTranslations("playground.japa");
  const [taps, setTaps] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [streak, setStreak] = useState(0);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const log = loadLog();
    const today = log[todayKey()] ?? { taps: 0, rounds: 0 };
    setTaps(today.taps);
    setRounds(today.rounds);
    setStreak(computeStreak(log));
  }, []);

  const progressPct = useMemo(
    () => Math.round(((taps % ROUNDS_TARGET) / ROUNDS_TARGET) * 100),
    [taps]
  );

  function tap() {
    const nextTaps = taps + 1;
    const nextRounds = Math.floor(nextTaps / ROUNDS_TARGET);
    setTaps(nextTaps);
    setPulse(true);
    setTimeout(() => setPulse(false), 150);

    if (nextRounds !== rounds) {
      setRounds(nextRounds);
    }

    const log = loadLog();
    const key = todayKey();
    log[key] = { taps: nextTaps, rounds: nextRounds };
    saveLog(log);
    setStreak(computeStreak(log));

    if (clerkConfigured && navigator.onLine) {
      fetch("/api/japa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: key, rounds: nextRounds, beadTaps: nextTaps }),
      }).catch(() => {});
    }
  }

  function newRound() {
    setTaps(rounds * ROUNDS_TARGET);
  }

  return (
    <GlassCard className="mx-auto mt-8 max-w-sm p-6 text-center">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-foreground/70">{t("rounds_today")}</span>
        <span className="font-bold text-gold-ink">
          {rounds} {t("rounds")}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-glass/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-gold-light to-brand-gold transition-all"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <button
        onClick={tap}
        className="group relative mx-auto mt-8 grid h-40 w-40 place-items-center rounded-full border border-glass/15 bg-[radial-gradient(circle_at_40%_30%,rgba(255,208,138,0.35),rgba(242,166,59,0.10)_60%,transparent_70%)] shadow-[inset_0_1px_0_var(--glass-hi)] active:scale-95"
      >
        <motion.span
          animate={{ scale: pulse ? 1.15 : 1 }}
          transition={{ duration: 0.15 }}
          className="text-4xl font-extrabold text-foreground"
        >
          {taps}
        </motion.span>
      </button>
      <p className="font-hindi mt-4 text-sm text-foreground/45">{t("tap_hint")}</p>

      <div className="mt-6 flex items-center justify-between border-t border-glass/8 pt-4">
        <span className="text-sm text-foreground/60">
          🔥 {streak} {t("streak")}
        </span>
        <button
          onClick={newRound}
          className="rounded-xl border border-glass/10 px-3 py-1.5 text-xs font-semibold text-foreground/70"
        >
          {t("reset")}
        </button>
      </div>
    </GlassCard>
  );
}
