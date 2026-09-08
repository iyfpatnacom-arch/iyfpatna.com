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

/**
 * Patterns in the `navigator.vibrate` format: milliseconds on/off/on…
 *
 * Nothing below goes under ~25ms on. Phones shipping a linear resonant
 * actuator — every recent Android flagship and mid-ranger, the Nothing phones
 * included — need that long just to spin the mass up, so a 12ms request comes
 * out as either nothing at all or a tick too faint to feel through a bead bag.
 * A coin-motor phone renders the same numbers as a slightly longer buzz, which
 * is the harmless direction to be wrong in.
 */
const PATTERNS = {
  /** One bead. Short enough to disappear into the movement of the thumb. */
  bead: 28,
  /** Every twenty-seventh bead — the quarter marks of a round. */
  quarter: [32, 45, 32],
  /** A completed round of 108. */
  round: [45, 60, 45, 60, 110],
  /** A milestone or badge unlocking. */
  reward: [30, 50, 30, 50, 30, 50, 130],
  /** An action undone or refused. */
  undo: [45, 35, 45],
  /** A successful check-in or save. */
  confirm: [30, 45, 40],
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
 * Returns why the phone did or did not buzz: `"ok"`, `"unsupported"` (no
 * `navigator.vibrate` — every iPhone), `"off"` (the user's own toggle), or
 * `"blocked"`, which is the browser refusing a call it does support. Chrome
 * refuses when the page has no user activation, when the tab is hidden, and —
 * the one that actually bites — when Android is suppressing touch feedback
 * system-wide, so a silent phone can be explained instead of just being
 * silent. Callers are free to ignore all of it; nothing here throws.
 *
 * Deliberately *not* gated on `prefers-reduced-motion`. That query is about
 * animation on screen, and Android turns it on for reasons that have nothing
 * to do with the user's wishes about vibration — battery saver and the
 * developer-options animation scale both flip it. Gating on it meant a phone
 * in power-saving mode silently lost the one signal that works with the eyes
 * closed. Anyone who wants it off has the toggle on the counter.
 */
export function haptic(pattern) {
  if (!hapticsSupported()) return "unsupported";
  if (!hapticsEnabled()) return "off";
  try {
    return navigator.vibrate(PATTERNS[pattern] ?? pattern) === false
      ? "blocked"
      : "ok";
  } catch {
    return "blocked";
  }
}
