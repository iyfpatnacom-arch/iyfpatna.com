/**
 * The donor's postal address, and the PIN code inside it.
 *
 * The address is one box, and the PIN is part of what the donor types into it
 * — the way an address is written on an envelope, which is what `address_hint`
 * asks for. A second box for the PIN was a second thing to get wrong on a
 * phone, and the one part of an address that can actually be checked is easier
 * to find in the line than to ask for again.
 *
 * So it is found rather than asked for: the form refuses an address with no PIN
 * in it, and the route pulls the PIN back out to store alongside the address.
 * Both use this module, so the digits the row keeps are provably the digits the
 * donor was shown.
 *
 * Client-safe on purpose — the form and the route handler share it.
 */

/** A PIN code, as India issues them: six digits, never starting at zero. */
export const PINCODE_PATTERN = /^[1-9]\d{5}$/;

/**
 * The PIN code inside a written address, or null if there is none.
 *
 * Runs of digits are compared whole rather than searched for a six-digit
 * window, which is what keeps a mobile number in the address line — ten
 * digits, often written there by people who put a phone number under the
 * address — from being read as a PIN plus four stray digits.
 *
 * The last qualifying run wins, because an address ends in its PIN and begins
 * with a house number that can be six digits in a new colony.
 */
export function extractPincode(address) {
  const runs = String(address ?? "").match(/\d+/g) || [];
  const pins = runs.filter((run) => PINCODE_PATTERN.test(run));
  return pins.length ? pins[pins.length - 1] : null;
}

/** Whether an address carries a PIN code. What the form checks. */
export function hasPincode(address) {
  return extractPincode(address) !== null;
}
