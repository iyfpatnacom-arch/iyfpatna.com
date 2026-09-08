"use client";

/**
 * Vibration for the counting tools.
 *
 * A japa counter is used with the phone in one hand and the eyes somewhere
 * else — often shut. Vibration is the only channel that reaches a user who is
 * not looking at the screen, which makes it a feature here rather than
 * decoration: the pulse at 108 is how you know a round closed without
 * breaking your chanting to check.
 *
 * `navigator.vibrate` is Android-only in practice; iOS Safari has never
 * implemented it. Everything below is therefore a no-op that must never throw
 * on the platforms that lack it, and no tool may make vibration load-bearing
 * for anything the user cannot also see.
 */

const PREF_KEY = "iyf:haptics";

/** Patterns in the `navigator.vibrate` format: milliseconds on/off/on… */
const PATTERNS = {
  /** One bead. Short enough to disappear into the movement of the thumb. */
  bead: 12,
  /** Every twenty-seventh bead — the quarter marks of a round. */
  quarter: [18, 40, 18],
  /** A completed round of 108. */
  round: [30, 60, 30, 60, 90],
  /** A milestone or badge unlocking. */
  reward: [20, 50, 20, 50, 20, 50, 120],
  /** An action undone or refused. */
  undo: [40, 30, 40],
  /** A successful check-in or save. */
  confirm: [15, 45, 25],
};

export function hapticsSupported() {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

/** Whether the user has left vibration on. Defaults to on where supported. */
export function hapticsEnabled() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(PREF_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setHapticsEnabled(enabled) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREF_KEY, enabled ? "on" : "off");
  } catch {}
}

/**
 * Fire one of the named patterns.
 *
 * Silently does nothing when unsupported, switched off, or when the user has
 * asked the system for reduced motion — someone who has turned motion down is
 * asking for less of exactly this.
 */
export function haptic(pattern) {
  if (!hapticsSupported() || !hapticsEnabled()) return;
  if (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }
  try {
    navigator.vibrate(PATTERNS[pattern] ?? pattern);
  } catch {}
}
