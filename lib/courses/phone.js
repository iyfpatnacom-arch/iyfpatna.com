/**
 * Indian mobile numbers, as typed by real people.
 *
 * "+91 98765 43210", "098765-43210" and "9876543210" are the same number, and
 * the "already paid for this batch?" check only works if they are stored the
 * same way. Shared by the checkout form and the enrolment route so the browser
 * rejects exactly what the server would.
 */
export const PHONE_PATTERN = /^[6-9]\d{9}$/;

export function normalizePhone(value) {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}
