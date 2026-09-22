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

async function sign(message) {
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
    new TextEncoder().encode(message)
  );

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, TOKEN_LENGTH);
}

/** Length-safe, branch-free compare, so a wrong token leaks no timing signal. */
function sameToken(expected, candidate) {
  const given = String(candidate || "");
  if (given.length !== expected.length) return false;

  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  }
  return diff === 0;
}

export async function orderToken(orderId) {
  return sign(`order:${orderId}`);
}

export async function verifyOrderToken(orderId, candidate) {
  return sameToken(await orderToken(orderId), candidate);
}

/*
 * The entry pass is signed under a different purpose on purpose. The pass QR
 * is shown to a volunteer at the door, and it only has to prove "this seat was
 * issued by us" — it must not double as the order link, which opens the
 * person's phone, email and receipt.
 */
export async function passToken(orderId) {
  return sign(`pass:${orderId}`);
}

export async function verifyPassToken(orderId, candidate) {
  return sameToken(await passToken(orderId), candidate);
}

function localeOf(locale) {
  return locale === "en" ? "en" : "hi";
}

/** /hi/orders/DYS-101?t=… — the status / success page. */
export async function orderStatusPath(orderId, locale) {
  const token = await orderToken(orderId);
  return `/${localeOf(locale)}/orders/${encodeURIComponent(orderId)}?t=${token}`;
}

/**
 * /admin/registrations/admit/DYS-101?t=… — what the entry pass QR encodes.
 *
 * No locale prefix: the proxy sends it to whichever language the scanning
 * admin's browser prefers, and the QR is a few modules smaller for it. The
 * path is printed into emails and PDFs, so it must never move.
 */
export async function passPath(orderId) {
  const token = await passToken(orderId);
  return `/admin/registrations/admit/${encodeURIComponent(orderId)}?t=${token}`;
}

/** /api/pass/DYS-101?t=… — the pass QR as a PNG, for the email. */
export async function passImagePath(orderId) {
  const token = await orderToken(orderId);
  return `/api/pass/${encodeURIComponent(orderId)}?t=${token}`;
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
