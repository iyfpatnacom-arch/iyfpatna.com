import { createHash } from "node:crypto";
import { META_CURRENCY, META_PIXEL_ID } from "./meta";
import { ORG } from "@/lib/site-config";

/**
 * The server's own copy of a donation, sent to Meta's Conversions API.
 *
 * This exists because the browser pixel cannot see most of the donations this
 * site takes. Almost everyone here pays by UPI on a phone, which means
 * Razorpay hands the browser to Google Pay or PhonePe and the donation is
 * approved in a different app entirely. Plenty of those people never come back
 * to the thank-you screen: they see "payment successful" in their UPI app and
 * close it. Their money arrives, the row is settled by the Razorpay webhook —
 * and a browser-only pixel reports nothing at all, because no page of ours
 * ever loaded after the payment. Add an ad blocker or iOS's tracking
 * restrictions on top and the browser is not a reliable witness to a
 * conversion even when the donor does return.
 *
 * So the conversion is reported from where the money is actually confirmed:
 * `recordPaymentOutcome`, exactly once per donation, via the donation
 * payable's `onPaid` (see `lib/payments/payables.js`). Whichever path settles
 * the row — the gateway redirect, the webhook, a retry from the status page —
 * the event is sent, and it is sent once because that is the guarantee
 * `onPaid` already carries for the receipt email.
 *
 * The browser still fires its own Purchase on the success page for the donors
 * who do come back. Both copies carry `event_id` = the order ID, which is how
 * Meta knows they are one donation and not two.
 *
 * Silent no-op without an access token, like every other integration here:
 * the pixel keeps working, only the server half goes quiet.
 */

const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN;
const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v21.0";
/* Events Manager → Test Events gives a code that routes events to that tab
   instead of into reporting. The only safe way to prove this works against a
   live pixel. Unset in normal operation. */
const TEST_EVENT_CODE = process.env.META_CAPI_TEST_EVENT_CODE;

/** Meta's ceiling for a slow network; a donation page must not wait on this. */
const TIMEOUT_MS = 4000;

export function metaCapiEnabled() {
  return Boolean(META_PIXEL_ID && ACCESS_TOKEN);
}

/**
 * SHA-256, lowercase hex — Meta's required form for every identifier below.
 *
 * The donor's email, phone, name and PIN never leave this server in the clear.
 * Meta matches on the hash and cannot read it back, which is the only reason
 * sending them is defensible at all for a temple's donor list.
 */
function hash(value) {
  const normalised = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!normalised) return null;
  return createHash("sha256").update(normalised).digest("hex");
}

/**
 * Phone numbers are stored as ten digits with no country code (see
 * `lib/courses/phone.js`), and Meta hashes the number in full international
 * form without a `+`. Hashing what we store instead would match nobody.
 */
function hashPhone(phone) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length !== 10) return digits ? hash(digits) : null;
  return hash(`91${digits}`);
}

function userDataFor(donation) {
  /* Meta wants first and last name apart. Most donors here write two words;
     a single word is a first name and no more, and a middle name belongs with
     the surname rather than being dropped. */
  const parts = String(donation.name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts.shift() || null;
  const last = parts.length ? parts.join(" ") : null;

  const data = {
    em: hash(donation.email),
    ph: hashPhone(donation.phone),
    fn: hash(first),
    ln: hash(last),
    zp: hash(donation.pincode),
    /* Two-letter ISO, hashed like the rest. Every donor on this page is
       giving in rupees to a trust in Patna. */
    country: hash("in"),
    /* The pixel's own cookies, captured when the form was submitted (see
       `app/api/donations/create`). They are what lifts a server event from
       "probably this person" to the match quality the browser gets, and they
       are the only fields here Meta can tie back to an ad click. */
    fbp: donation.meta?.fbp || null,
    fbc: donation.meta?.fbc || null,
    client_user_agent: donation.meta?.userAgent || null,
  };

  return Object.fromEntries(Object.entries(data).filter(([, value]) => value));
}

/**
 * Posts one event and reports whether it landed.
 *
 * Never throws and never retries. A failed analytics call must not hold up a
 * receipt email or a browser waiting on a redirect, and Meta accepts the same
 * event for seven days — so if this ever needs a retry, it belongs in a job,
 * not in the payment path.
 */
async function send(event) {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${META_PIXEL_ID}/events`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        data: [event],
        access_token: ACCESS_TOKEN,
        ...(TEST_EVENT_CODE ? { test_event_code: TEST_EVENT_CODE } : {}),
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(
        `[meta] ${event.event_name} rejected (${response.status})`,
        detail.slice(0, 500),
      );
      return { ok: false };
    }

    return { ok: true };
  } catch (error) {
    console.error(`[meta] ${event.event_name} could not be sent`, error);
    return { ok: false };
  }
}

/**
 * Reports a confirmed donation.
 *
 * Both events Meta understands for this, on purpose and with the same ID:
 *
 *   Purchase — carries the value, and is what the ad campaigns optimise and
 *              report cost-per-donation against. It is the only one of the two
 *              that value-based optimisation and ROAS will read.
 *   Donate   — Meta's own standard event for giving, which is what their
 *              nonprofit audiences and lookalikes are built from.
 *
 * Two events for one donation is not double-counting: the pair is what Meta's
 * own donation guidance asks for, and a campaign attributes against whichever
 * one it names as its objective, never both at once.
 *
 * Called from the donation payable's `onPaid`, which runs once per donation.
 */
export async function reportDonationPurchase(donation) {
  if (!metaCapiEnabled()) return { ok: false, skipped: true };
  if (!donation?.orderId) return { ok: false, skipped: true };
  /* Local development pays by `/api/payment/simulate`, which settles a row as
     thoroughly as Razorpay does — receipt, email and all. No money moved, so
     nothing should reach a dataset the campaigns optimise against. */
  if (donation.payment?.provider === "simulated") {
    return { ok: false, skipped: true };
  }

  const locale = donation.locale === "en" ? "en" : "hi";

  /* The seva's slug rather than its title: the title is stored in whichever
     language the donor was reading, and splitting one seva's totals across two
     languages would make the per-seva report in Ads Manager useless. */
  const custom = {
    currency: donation.currency || META_CURRENCY,
    value: Number(donation.amount) || 0,
    content_type: "product",
    content_ids: [donation.sevaSlug],
    content_name: donation.sevaSlug,
    content_category: "seva",
    num_items: 1,
    order_id: donation.orderId,
  };

  const base = {
    event_time: Math.floor(
      (donation.payment?.paidAt
        ? new Date(donation.payment.paidAt).getTime()
        : Date.now()) / 1000,
    ),
    /* The donor's own page. The signed token is deliberately left off — Meta
       only groups events by URL, and the token is a secret that would be
       handed to a third party for nothing. */
    event_source_url: `${ORG.siteUrl}/${locale}/donation/${donation.orderId}`,
    action_source: "website",
    user_data: userDataFor(donation),
    custom_data: custom,
  };

  const results = await Promise.all([
    send({ ...base, event_name: "Purchase", event_id: donation.orderId }),
    send({ ...base, event_name: "Donate", event_id: donation.orderId }),
  ]);

  return { ok: results.every((result) => result.ok) };
}
