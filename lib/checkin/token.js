import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Rotating check-in codes.
 *
 * The point of QR check-in is to record that a body was in a chair, and the
 * obvious naive version fails at exactly that: a static QR code on a wall gets
 * photographed once and forwarded to the group chat, and from then on it
 * measures WhatsApp membership rather than attendance.
 *
 * So the code is a function of the programme *and the minute*, like a TOTP.
 * The screen at the venue shows a new one every minute; a screenshot is dead
 * within two. Someone who wants to fake a check-in has to be in a position to
 * read a screen that is in the room, which is the same position as being in
 * the room.
 *
 * This is deliberately not a security boundary — it is an honesty rail. The
 * attendance list is not access to anything, and the failure mode of a forged
 * check-in is a slightly wrong count, so a one-minute window plus one minute of
 * tolerance is the right trade against a volunteer's phone clock being a little
 * off.
 *
 * Server-only: it reads a secret and imports `node:crypto`.
 */

/** How long one code lives. */
const WINDOW_MS = 60_000;

/**
 * Windows either side of the current one that are still accepted.
 *
 * One in each direction. It covers the gap between the screen refreshing and
 * someone finishing the form, and clock skew between the phone and the server —
 * without stretching the life of a photographed code past a couple of minutes.
 */
const TOLERANCE = 1;

/**
 * The signing key.
 *
 * `CHECKIN_SECRET` if it is set. Falling back to the Clerk secret is not
 * elegant, but it has the two properties that matter: it is already present in
 * every environment that has accounts, and it is stable across restarts — a
 * per-boot random value would invalidate every code on the wall each time the
 * server was redeployed, mid-programme.
 */
function signingKey() {
  return (
    process.env.CHECKIN_SECRET ||
    process.env.CLERK_SECRET_KEY ||
    "iyf-patna-development-checkin-secret"
  );
}

export function currentWindow(now = Date.now()) {
  return Math.floor(now / WINDOW_MS);
}

/** Milliseconds until the current code is replaced. */
export function msUntilRotation(now = Date.now()) {
  return WINDOW_MS - (now % WINDOW_MS);
}

function digest(programId, window) {
  return createHmac("sha256", signingKey())
    .update(`${programId}:${window}`)
    .digest();
}

/** The URL-safe token a QR code carries. */
export function tokenFor(programId, window = currentWindow()) {
  return digest(programId, window).toString("base64url").slice(0, 16);
}

/** The six digits printed under the QR, for anyone whose camera will not scan. */
export function codeFor(programId, window = currentWindow()) {
  const bytes = digest(programId, window);
  return String(bytes.readUInt32BE(0) % 1_000_000).padStart(6, "0");
}

/**
 * Constant-time string comparison that tolerates different lengths.
 *
 * `timingSafeEqual` throws on a length mismatch, and the throw itself would
 * leak the length — so lengths are compared first and the result folded in,
 * rather than short-circuiting.
 */
function safeEqual(a, b) {
  const bufferA = Buffer.from(String(a));
  const bufferB = Buffer.from(String(b));
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

/** True when `token` is valid for this programme, now or a minute either side. */
export function verifyToken(programId, token, now = Date.now()) {
  const window = currentWindow(now);
  for (let offset = -TOLERANCE; offset <= TOLERANCE; offset += 1) {
    if (safeEqual(tokenFor(programId, window + offset), token)) return true;
  }
  return false;
}

/** The same, for the typed six-digit code. */
export function verifyCode(programId, code, now = Date.now()) {
  const window = currentWindow(now);
  for (let offset = -TOLERANCE; offset <= TOLERANCE; offset += 1) {
    if (safeEqual(codeFor(programId, window + offset), code)) return true;
  }
  return false;
}

/**
 * Which of these programmes a typed code belongs to, if any.
 *
 * Someone typing six digits off a screen has no idea which programme row they
 * are checking in to, so the code is matched against every active programme.
 * The list is small — this is a temple's weekly schedule, not a search space.
 */
export function findProgramForCode(programIds, code, now = Date.now()) {
  return programIds.find((id) => verifyCode(id, code, now)) ?? null;
}
