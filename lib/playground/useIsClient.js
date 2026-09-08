"use client";

import { useSyncExternalStore } from "react";

/**
 * False during the server render and the first client paint, true afterwards.
 *
 * Several tools here need to render something that only the browser knows —
 * today's date from the visitor's own clock, whether the phone can vibrate,
 * what is in local storage. Reading any of that during render produces a
 * hydration mismatch, and the usual workaround is `useEffect(() =>
 * setMounted(true), [])`, which trades the mismatch for a cascading render and
 * a lint error.
 *
 * `useSyncExternalStore` is what React added for exactly this. The store never
 * changes, so `subscribe` returns an unsubscribe that does nothing; the two
 * snapshots differ, so React renders the server's answer, hydrates cleanly, and
 * then re-renders once with the client's. Both snapshots are primitives, which
 * is what keeps it from looping — a snapshot returning a fresh object every
 * call would re-render forever.
 */
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function useIsClient() {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}
