"use client";

/**
 * Offline-first state for the sadhana tools.
 *
 * Every tool under `/playground` has to work for someone who has never signed
 * in, on a phone with no signal, standing in a temple courtyard. So the
 * browser is the primary store and the server is an optional mirror: nothing
 * here ever waits on a network request, and nothing is lost when one fails.
 *
 * The shape of that bargain:
 *
 *   - `useLocalState` keeps the truth in `localStorage`. It renders the
 *     supplied initial value on the server and on the first client paint, then
 *     swaps in the stored value in an effect. That is deliberate — reading
 *     `localStorage` during render is what produces a hydration mismatch, and
 *     the third element of the tuple lets a component hold back a skeleton
 *     until real data has arrived rather than flashing a zero.
 *
 *   - `syncUp` posts to the server when there is a session and a connection,
 *     and otherwise drops the write into an outbox that is flushed the next
 *     time the browser comes back online. A failed sync is never an error the
 *     user sees, because from their side nothing failed: the count is on their
 *     phone either way.
 *
 * Storage can throw outright — Safari in private mode, a browser set to block
 * site data — so every access is wrapped. A tool that cannot persist should
 * still count beads.
 */

import { useCallback, useEffect, useRef, useState } from "react";

const PREFIX = "iyf:";
const OUTBOX_KEY = `${PREFIX}outbox`;

/* ------------------------------------------------------------- storage */

export function readLocal(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeLocal(key, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Quota or a blocked store. The in-memory state is still correct.
  }
}

export function removeLocal(key) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {}
}

/**
 * A piece of state that lives in `localStorage`.
 *
 * Returns `[value, setValue, hydrated]`. Treat `hydrated === false` as "the
 * stored value has not been read yet" and render a skeleton — not as an empty
 * state, which is how a returning user gets told their streak is zero.
 */
export function useLocalState(key, initialValue) {
  const [value, setValue] = useState(initialValue);
  const [hydrated, setHydrated] = useState(false);

  // The initial value is frequently an object literal, which would be a new
  // reference on every render and restart the effect forever.
  const initialRef = useRef(initialValue);

  useEffect(() => {
    setValue(readLocal(key, initialRef.current));
    setHydrated(true);
  }, [key]);

  const update = useCallback(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        writeLocal(key, resolved);
        return resolved;
      });
    },
    [key]
  );

  return [value, update, hydrated];
}

/* -------------------------------------------------------------- syncing */

function readOutbox() {
  return readLocal("outbox", []);
}

function writeOutbox(items) {
  writeLocal("outbox", items.slice(-100));
}

/**
 * Mirror a local change to the server, if that is possible right now.
 *
 * `enabled` is the caller's answer to "is there a signed-in session to sync
 * to" — the tools pass the Clerk state down rather than importing Clerk here,
 * so this module stays usable on a build with no auth configured at all.
 *
 * Anything that cannot be sent goes to the outbox keyed by endpoint plus
 * `dedupeKey`, so a bead tapped ninety times offline queues one final count
 * rather than ninety of them.
 */
export async function syncUp(endpoint, body, { enabled = false, dedupeKey } = {}) {
  if (!enabled || typeof window === "undefined") return false;

  if (!navigator.onLine) {
    enqueue(endpoint, body, dedupeKey);
    return false;
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(String(response.status));
    return true;
  } catch {
    enqueue(endpoint, body, dedupeKey);
    return false;
  }
}

function enqueue(endpoint, body, dedupeKey) {
  const items = readOutbox();
  const id = dedupeKey ? `${endpoint}:${dedupeKey}` : null;
  const next = id ? items.filter((item) => item.id !== id) : items;
  next.push({ id, endpoint, body, at: Date.now() });
  writeOutbox(next);
}

/** Sends whatever is waiting. Safe to call repeatedly. */
export async function flushOutbox() {
  if (typeof window === "undefined" || !navigator.onLine) return;

  const items = readOutbox();
  if (items.length === 0) return;

  const remaining = [];
  for (const item of items) {
    try {
      const response = await fetch(item.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.body),
      });
      // A 4xx means the server will never accept this row; keeping it would
      // pin a permanent failure in the outbox. Only retry transient trouble.
      if (!response.ok && response.status >= 500) remaining.push(item);
    } catch {
      remaining.push(item);
    }
  }
  writeOutbox(remaining);
}

/**
 * Flushes the outbox on mount and whenever the connection comes back.
 *
 * Mount alone is not enough: the common case is a phone that was offline for
 * the whole session and reconnects while the page is still open.
 */
export function useOutboxFlush(enabled) {
  useEffect(() => {
    if (!enabled) return undefined;
    flushOutbox();
    const onOnline = () => flushOutbox();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [enabled]);
}

/* ---------------------------------------------------------------- dates */

/** Today in Patna as "YYYY-MM-DD" — the key every daily record is filed under. */
export function todayKey() {
  return new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
}

export function shiftKey(key, days) {
  const [y, m, d] = key.split("-").map(Number);
  const ms = Date.UTC(y, m - 1, d) + days * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Consecutive days ending today for which `hasEntry` is true.
 *
 * Yesterday is the starting point rather than today when today is still
 * empty: a streak should not be reported as broken at 6am simply because the
 * day's chanting has not happened yet.
 */
export function computeStreak(hasEntry, from = todayKey()) {
  let streak = 0;
  let cursor = hasEntry(from) ? from : shiftKey(from, -1);
  if (!hasEntry(cursor)) return 0;
  while (hasEntry(cursor)) {
    streak += 1;
    cursor = shiftKey(cursor, -1);
  }
  return streak;
}
