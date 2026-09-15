import { ORG } from "@/lib/site-config";

/**
 * The unguessable half of an order link.
 *
 * Order IDs are short and sequential (DYS-101) so they can be read down a
 * helpline — which also means anyone can count. The status page and the
 * receipt name a person with their phone and email, so an unauthenticated
 * /orders/DYS-101 would hand the whole batch list to whoever walks the numbers.
 *
 * Most people paying have no account, so the link itself carries the proof:
 * sixteen hex characters of HMAC over the order ID. It is derived rather than
 * stored, so no column has to hold it and it survives a database restore.
 *
 * Web Crypto rather than node:crypto so this runs unchanged wherever Next
 * decides to put it.
 */

const TOKEN_LENGTH = 16;

/* Local development only. A production build without ORDER_LINK_SECRET
   refuses to mint links — and so refuses to take money — rather than signing
   with a value that is sitting in the source code. */
const DEV_SECRET = "iyf-dev-order-links-not-for-production";

function getSecret() {
  const secret = process.env.ORDER_LINK_SECRET || "";
  if (secret.length >= 16) return secret;
  if (process.env.NODE_ENV !== "production") return DEV_SECRET;
  throw new Error(
    "ORDER_LINK_SECRET must be set to a random string of at least 16 characters."
  );
}

export async function orderToken(orderId) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`order:${orderId}`)
  );

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, TOKEN_LENGTH);
}

/** Length-safe, branch-free compare, so a wrong token leaks no timing signal. */
export async function verifyOrderToken(orderId, candidate) {
  const expected = await orderToken(orderId);
  const given = String(candidate || "");
  if (given.length !== expected.length) return false;

  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  }
  return diff === 0;
}

function localeOf(locale) {
  return locale === "en" ? "en" : "hi";
}

/** /hi/orders/DYS-101?t=… — the status / success page. */
export async function orderStatusPath(orderId, locale) {
  const token = await orderToken(orderId);
  return `/${localeOf(locale)}/orders/${encodeURIComponent(orderId)}?t=${token}`;
}

/** /api/receipt/DYS-101?t=… — the PDF. */
export async function receiptPath(orderId) {
  const token = await orderToken(orderId);
  return `/api/receipt/${encodeURIComponent(orderId)}?t=${token}`;
}

/**
 * Absolute form, for anything that leaves the site — an email, a WhatsApp
 * message — where a relative path would never resolve.
 */
export function absoluteUrl(path) {
  const base = String(process.env.NEXT_PUBLIC_SITE_URL || ORG.siteUrl).replace(/\/+$/, "");
  return `${base}${path}`;
}
