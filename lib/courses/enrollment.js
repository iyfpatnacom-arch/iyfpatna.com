import { nextSequence } from "@/models/Counter";

/**
 * Where each course starts counting. 101 rather than 1 so every ID is the same
 * width and reads as a number rather than a draft: DYS-101, not DYS-1.
 */
const FIRST_NUMBER = 101;

/** DYS-101 — the course's prefix and a number that only ever counts up. */
export async function generateOrderId(prefix) {
  const n = FIRST_NUMBER - 1 + (await nextSequence(`order:${prefix}`));
  return `${prefix}-${n}`;
}
