/**
 * Meta (Facebook) Pixel — the half the browser is allowed to know.
 *
 * The temple advertises the seva page on Facebook and Instagram, and until now
 * had no way to tell which of those ads produced a donation. This module is
 * the whole browser-side contract: the pixel's identifiers, whether tracking
 * is on at all, and one guarded way to send an event.
 *
 * Deliberately free of server-only imports, because it is imported from both
 * sides — the client components that fire events, and `meta-capi.js`, which
 * needs the same pixel ID to post the server copy of a donation.
 *
 * Nothing here is the authority on what was donated. Every event carries an
 * amount, but the amount that was actually charged is the stored row's (see
 * `lib/payments/result.js`), and the event Meta counts as the conversion is
 * the one sent from the server once money is confirmed. The browser events are
 * the funnel; the server event is the truth.
 */

/*
 * The pixel ID and the domain-verification token are public strings — both sit
 * in the page source of every site that uses them — so they are defaults here
 * rather than required configuration. That is not laziness: NEXT_PUBLIC_* is
 * inlined at build time, so a value that lived only in a GitHub repository
 * variable would silently ship as "tracking off" the first time someone
 * deployed without it, and nobody would notice until a month of ad spend had
 * gone unattributed. The env vars remain as overrides for when the temple's
 * Business Manager account changes hands.
 */
export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID || "2287981768646487";

/** Proves to Meta that iyfpatna.in is ours, so the pixel may be used in ads. */
export const META_DOMAIN_VERIFICATION =
  process.env.NEXT_PUBLIC_META_DOMAIN_VERIFICATION ||
  "y1jbirjr7yx83tusampiw6llxnacqt";

/*
 * Off in `next dev`.
 *
 * A pixel that fires from localhost writes test donations into the same
 * dataset the ad campaigns optimise against, and a handful of ₹11 form-filling
 * runs is enough to teach the algorithm the wrong thing. Set
 * NEXT_PUBLIC_META_PIXEL_DEV=1 to turn it on locally when checking the events
 * themselves with Meta's Pixel Helper.
 */
const devPixel = ["1", "true", "yes", "on"].includes(
  String(process.env.NEXT_PUBLIC_META_PIXEL_DEV || "").trim().toLowerCase(),
);

export const metaPixelEnabled =
  Boolean(META_PIXEL_ID) &&
  (process.env.NODE_ENV === "production" || devPixel);

/** Rupees, in the one currency this site ever takes. */
export const META_CURRENCY = "INR";

/*
 * How long to wait for `fbq` before giving up on an event.
 *
 * The base snippet installs `fbq` as a queue that buffers calls until
 * fbevents.js has loaded, so a caller that finds `fbq` never has to think
 * about load order. The gap this covers is narrower: `next/script` injects
 * the snippet after hydration, so an effect on a page that mounts at the same
 * moment — the donation success page, which fires Purchase the instant it
 * appears — can run before the queue exists at all.
 *
 * It also, quietly, is the ad-blocker path: a blocked script means `fbq`
 * never arrives, the poll expires, and the event is dropped instead of
 * throwing inside somebody's thank-you screen. Those donations are not lost
 * to reporting, because the server sends its own copy (see `meta-capi.js`).
 */
const READY_TIMEOUT_MS = 8000;
const READY_POLL_MS = 100;

/** Runs `callback` once `fbq` exists, or never if it does not turn up. */
function whenMetaReady(callback) {
  if (typeof window === "undefined") return;
  if (typeof window.fbq === "function") {
    callback(window.fbq);
    return;
  }

  let waited = 0;
  const timer = setInterval(() => {
    if (typeof window.fbq === "function") {
      clearInterval(timer);
      callback(window.fbq);
      return;
    }
    waited += READY_POLL_MS;
    if (waited >= READY_TIMEOUT_MS) clearInterval(timer);
  }, READY_POLL_MS);
}

/**
 * Sends one standard Meta event.
 *
 * `eventId` is the whole reason this takes an options argument: the same
 * donation is reported twice, once from here and once from the server, and
 * Meta collapses the pair into one conversion only when both carry the same
 * event name and the same ID. Pass the order ID and a donation counted twice
 * becomes impossible; leave it out and it is merely unlikely.
 *
 * Never throws. An analytics call that can break a donation page is worse
 * than no analytics.
 */
export function trackMeta(event, params = {}, { eventId } = {}) {
  if (!metaPixelEnabled) return;
  whenMetaReady((fbq) => {
    try {
      fbq("track", event, params, eventId ? { eventID: eventId } : undefined);
    } catch (error) {
      console.error("[meta] event failed", event, error);
    }
  });
}
