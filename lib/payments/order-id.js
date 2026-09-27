import { nextSequence } from "@/models/Counter";

/**
 * Where each prefix starts counting. 101 rather than 1 so every ID is the same
 * width and reads as a number rather than a draft: DYS-101, not DYS-1.
 */
const FIRST_NUMBER = 101;

/**
 * DYS-101, DN-101 — a prefix and a number that only ever counts up.
 *
 * One counter per prefix, incremented atomically, which is what makes an ID
 * unique by construction even across server instances. Two prefixes therefore
 * must never be shared between different kinds of order: the settling pipeline
 * looks an order up by ID across every collection, so a collision would let a
 * donation and a course seat answer to the same receipt number.
 */
export async function generateOrderId(prefix) {
  const n = FIRST_NUMBER - 1 + (await nextSequence(`order:${prefix}`));
  return `${prefix}-${n}`;
}
