import crypto from "node:crypto";
import { ORG } from "@/lib/site-config";

/**
 * Razorpay Standard Checkout — the gateway offered first, because it is the
 * one that takes UPI and cards as well as net banking (see `gateways.js`).
 *
 * Flow: /api/payment/initiate creates (or reuses) a Razorpay Order for the
 * enrolment, the browser opens Razorpay's checkout with it, and when the
 * customer finishes Razorpay POSTs them back to /api/payment/response. Card
 * details never touch this server, which is what keeps us out of PCI DSS scope.
 *
 * Nothing the browser brings back is taken at its word. Every outcome — the
 * redirect, the webhook, a retry from the status page — is settled by fetching
 * the payment from Razorpay's API with the secret key, so the row only ever
 * records what Razorpay itself says happened.
 */

const API = "https://api.razorpay.com/v1";

/** The customer's browser is waiting on most of these calls. */
const API_TIMEOUT_MS = 10000;

/**
 * Resolves credentials, or null when payment is not configured yet. Callers
 * treat null as "no live gateway" so the site keeps working on localhost.
 *
 * Test and live are told apart by the key itself (rzp_test_… / rzp_live_…),
 * so there is no separate switch to forget.
 */
export function getRazorpayConfig() {
  const keyId = (process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
  /* NEXT_PUBLIC_* is inlined at build time, and this site is built on one
     machine and run on another — so a build without the variable must not
     quietly switch the gateway off. It falls back to the canonical origin the
     rest of the site already uses. */
  const siteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || ORG.siteUrl || "")
    .trim()
    .replace(/\/+$/, "");

  if (!keyId || !keySecret || !siteUrl) return null;

  return {
    keyId,
    keySecret,
    // Optional: without it the webhook answers 503 and the redirect alone
    // records payments.
    webhookSecret: (process.env.RAZORPAY_WEBHOOK_SECRET || "").trim() || null,
    environment: keyId.startsWith("rzp_live_") ? "live" : "test",
    siteUrl,
  };
}

// ── API ─────────────────────────────────────────────────────────────────────

async function api(config, method, path, body) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64")}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(
      `Razorpay ${method} ${path} failed (${response.status}): ${result?.error?.description || "no body"}`
    );
    error.status = response.status;
    error.code = result?.error?.code;
    throw error;
  }
  return result;
}

export function fetchPayment(config, paymentId) {
  return api(config, "GET", `/payments/${encodeURIComponent(paymentId)}`);
}

export function fetchOrder(config, gatewayOrderId) {
  return api(config, "GET", `/orders/${encodeURIComponent(gatewayOrderId)}`);
}

export function fetchOrderPayments(config, gatewayOrderId) {
  return api(config, "GET", `/orders/${encodeURIComponent(gatewayOrderId)}/payments`);
}

/** Rupees → paise, the only unit Razorpay accepts. */
export function toPaise(amount) {
  return Math.round(Number(amount) * 100);
}

// ── Orders ──────────────────────────────────────────────────────────────────

/**
 * The Razorpay Order for one thing being paid for.
 *
 * The amount comes from the stored document, never from the browser: that row is
 * the only authority on what this costs. `receipt` is our own order ID, which is
 * how a payment is traced back to what it was for, and `kind` in the notes is how
 * the webhook knows which collection to settle it against.
 */
export function createOrder({ orderId, amount, currency, kind, notes }, { lang = "hi", config } = {}) {
  return api(config, "POST", "/orders", {
    amount: toPaise(amount),
    currency: currency || "INR",
    receipt: String(orderId).slice(0, 40),
    notes: {
      orderId,
      kind,
      ...notes,
      lang: lang === "en" ? "en" : "hi",
    },
  });
}

/**
 * The options the browser hands to `new Razorpay(...)`.
 *
 * `redirect: true` (set in the browser) sends the customer to `callback_url`
 * with the result as a form POST — the same shape of round trip as a hosted
 * billing page, and the one that survives mobile browsers and UPI app
 * switches, where an in-page JavaScript handler can be lost.
 *
 * What is being charged for is described by the caller (see `payables.js`), so
 * this function knows nothing about courses or sevas.
 */
export function buildCheckoutOptions({ orderId, description, prefill }, gatewayOrder, { lang = "hi", config }) {
  return {
    key: config.keyId,
    order_id: gatewayOrder.id,
    amount: gatewayOrder.amount,
    currency: gatewayOrder.currency,
    name: ORG.name,
    description: String(description || "").slice(0, 255),
    prefill: {
      name: prefill?.name || "",
      email: prefill?.email || "",
      contact: prefill?.phone ? `+91${prefill.phone}` : "",
    },
    notes: { orderId },
    theme: { color: "#b4640c" },
    callback_url: `${config.siteUrl}/api/payment/response?lang=${lang === "en" ? "en" : "hi"}`,
  };
}

// ── Verification ────────────────────────────────────────────────────────────

function safeEqualHex(expected, given) {
  const a = Buffer.from(String(expected), "utf8");
  const b = Buffer.from(String(given || ""), "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** The checkout's success signature: HMAC-SHA256(order_id|payment_id, key secret). */
export function verifyCheckoutSignature({ orderId, paymentId, signature }, config) {
  const expected = crypto
    .createHmac("sha256", config.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return safeEqualHex(expected, signature);
}

/** A webhook's signature: HMAC-SHA256(raw body, webhook secret). */
export function verifyWebhookSignature(rawBody, signature, secret) {
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}

// ── Settling a payment ──────────────────────────────────────────────────────

/** Razorpay's `method` → the way the receipt and status page name it. */
const METHODS = {
  upi: "UPI",
  card: "Card",
  netbanking: "Net banking",
  wallet: "Wallet",
  emi: "EMI",
  cardless_emi: "Cardless EMI",
  paylater: "Pay later",
};

/** Razorpay's payment `status` → the four statuses this app stores. */
export function mapPaymentStatus(status) {
  switch (String(status || "").toLowerCase()) {
    case "captured":
      return "success";
    case "failed":
      return "failed";
    default:
      // created, authorized (capture still in flight), refunded — none of them
      // is a confirmed seat, and a refund is a human's call to record.
      return "pending";
  }
}

/**
 * Reads one payment from Razorpay and turns it into the outcome
 * `recordPaymentOutcome` stores. Returns null when the payment is not one of
 * ours (no order, or an order this site did not create).
 *
 * `kind` comes back from the order's notes, which is what lets one webhook and
 * one callback URL serve both course seats and donations. An order created
 * before that note existed carries none, and the caller then finds the row by
 * its ID instead.
 *
 * An authorized-but-uncaptured payment is captured here: money that is only
 * authorized is refunded to the customer after a few days, so leaving it to
 * the account's auto-capture setting would risk a paid seat evaporating.
 */
export async function settlePayment(paymentId, config) {
  let payment = await fetchPayment(config, paymentId);
  if (!payment?.order_id) return null;

  const order = await fetchOrder(config, payment.order_id);
  const orderId = String(order?.notes?.orderId || order?.receipt || "").trim();
  if (!orderId) return null;

  if (payment.status === "authorized" && payment.amount === order.amount) {
    try {
      payment = await api(config, "POST", `/payments/${encodeURIComponent(payment.id)}/capture`, {
        amount: payment.amount,
        currency: payment.currency,
      });
    } catch (error) {
      // Most often auto-capture (or the webhook) got there first.
      console.error(`[payment] capture of ${payment.id} failed, re-reading`, error);
      payment = await fetchPayment(config, payment.id);
    }
  }

  const status = mapPaymentStatus(payment.status);
  const acquirer = payment.acquirer_data || {};

  return {
    orderId,
    kind: order?.notes?.kind || null,
    lang: order?.notes?.lang,
    status,
    amount: payment.amount / 100,
    currency: payment.currency,
    provider: "razorpay",
    trackingId: payment.id,
    bankRefNo: acquirer.rrn || acquirer.upi_transaction_id || acquirer.bank_transaction_id || null,
    paymentMode: METHODS[payment.method] || payment.method || null,
    failureMessage: status === "failed" ? payment.error_description || payment.error_reason || null : null,
    raw: {
      payment: {
        id: payment.id,
        status: payment.status,
        method: payment.method,
        amount: payment.amount,
        currency: payment.currency,
        order_id: payment.order_id,
        bank: payment.bank || null,
        wallet: payment.wallet || null,
        vpa: payment.vpa || null,
        acquirer_data: acquirer,
        error_code: payment.error_code || null,
        error_description: payment.error_description || null,
        created_at: payment.created_at,
      },
      order: { id: order.id, receipt: order.receipt, status: order.status, amount: order.amount },
    },
  };
}

// ── UPI QR codes ────────────────────────────────────────────────────────────

/**
 * A QR the payer scans off somebody else's screen.
 *
 * The checkout above assumes one device: the person paying is the person
 * holding the phone. Book distribution is the case where that is false — the
 * volunteer has the phone, the reader has the money, and the reader is not
 * going to be handed a stranger's unlocked phone to type a UPI PIN into. So
 * the volunteer shows a QR and the reader scans it with their own banking app.
 *
 * Razorpay's QR Codes API is the only way to do that and still *know* whether
 * the money arrived. A UPI intent QR built by hand from a VPA would display
 * just as well and would leave us asking the volunteer whether they got paid,
 * which is precisely the question the cash reconciliation exists because we
 * cannot trust the answer to.
 *
 * The API has to be enabled per account (Razorpay Dashboard → Settings → QR
 * Codes). It is not everywhere, so every caller treats a failure here as "no
 * QR today" and falls back to the ordinary checkout rather than failing the
 * sale — see /api/marathon/sales.
 *
 * A QR payment carries no Razorpay Order, which is the one thing that makes it
 * different from everything else in this file: `settlePayment` finds our order
 * ID in `order.notes` and there is no order to look in. The QR's own notes
 * carry it instead, and `qrPaymentOutcome` below reads them.
 */

/** Razorpay refuses a QR that closes sooner than fifteen minutes out. */
const QR_MIN_LIFETIME_S = 900;
const QR_LIFETIME_S = 1800;

/**
 * Creates a single-use QR for one exact amount.
 *
 * Single-use and fixed-amount together are what make it safe to show: it
 * cannot be paid twice, and it cannot be paid for the wrong figure, so the
 * image on the volunteer's screen is as specific as the row it belongs to.
 * It closes itself after half an hour, which is long enough for somebody to
 * find their phone and short enough that an abandoned sale does not leave a
 * live QR in the world.
 */
export function createQrCode(
  { orderId, amount, kind, description, notes },
  { lang = "hi", config } = {},
) {
  return api(config, "POST", "/payments/qr_codes", {
    type: "upi_qr",
    name: String(description || ORG.name).slice(0, 50),
    usage: "single_use",
    fixed_amount: true,
    payment_amount: toPaise(amount),
    description: String(description || "").slice(0, 255),
    close_by: Math.floor(Date.now() / 1000) + Math.max(QR_MIN_LIFETIME_S, QR_LIFETIME_S),
    /* The same three facts the Order's notes carry, for the same reason: this
       is how a payment that arrives through a webhook is traced back to the
       row it belongs to. */
    notes: {
      orderId: String(orderId),
      kind: String(kind),
      lang: lang === "en" ? "en" : "hi",
      ...notes,
    },
  });
}

/** Every payment made against one QR. Usually none, then exactly one. */
export function fetchQrCodePayments(config, qrCodeId) {
  return api(config, "GET", `/payments/qr_codes/${encodeURIComponent(qrCodeId)}/payments`);
}

/**
 * Shuts a QR down early — when the volunteer abandons the sale, or when it has
 * been paid and the screen has moved on. Never throws: closing is tidiness,
 * and a QR left open closes itself at `close_by` anyway.
 */
export async function closeQrCode(config, qrCodeId) {
  try {
    return await api(config, "POST", `/payments/qr_codes/${encodeURIComponent(qrCodeId)}/close`, {});
  } catch (error) {
    console.error(`[payment] could not close QR ${qrCodeId}`, error);
    return null;
  }
}

/**
 * One QR payment, as the outcome `recordPaymentOutcome` stores.
 *
 * The twin of `settlePayment`, minus the order lookup it cannot do. The order
 * ID is supplied by the caller — read from the QR's notes by the webhook, or
 * known already by the row that is polling — and never taken from the payment,
 * which carries none.
 *
 * Capture is not attempted here. A QR payment is captured by Razorpay on
 * arrival; an authorized one would be a UPI mandate, which this flow never
 * creates.
 */
export function qrPaymentOutcome(payment, { orderId, kind, lang } = {}) {
  if (!payment?.id || !orderId) return null;

  const status = mapPaymentStatus(payment.status);
  const acquirer = payment.acquirer_data || {};

  return {
    orderId: String(orderId),
    kind: kind || null,
    lang,
    status,
    amount: payment.amount / 100,
    currency: payment.currency,
    provider: "razorpay",
    trackingId: payment.id,
    bankRefNo: acquirer.rrn || acquirer.upi_transaction_id || null,
    paymentMode: METHODS[payment.method] || payment.method || "UPI",
    failureMessage:
      status === "failed" ? payment.error_description || payment.error_reason || null : null,
    raw: {
      payment: {
        id: payment.id,
        status: payment.status,
        method: payment.method,
        amount: payment.amount,
        currency: payment.currency,
        vpa: payment.vpa || null,
        acquirer_data: acquirer,
        created_at: payment.created_at,
      },
      qrCodeId: payment.invoice_id || null,
    },
  };
}

/**
 * Asks Razorpay whether a QR has been paid yet, and turns the answer into an
 * outcome — or null while nobody has scanned it.
 *
 * This is what makes the sell screen work without a webhook. A webhook is
 * still the right way to catch a payment that lands after the volunteer has
 * locked their phone, but the volunteer standing there watching the screen
 * should not be waiting on Razorpay's delivery queue.
 *
 * A failed attempt is reported as such: somebody whose payment bounced should
 * see that and try again, not watch a spinner.
 */
export async function settleQrCode(config, qrCodeId, { orderId, kind, lang } = {}) {
  const { items = [] } = await fetchQrCodePayments(config, qrCodeId);
  const captured = items.find((payment) => payment.status === "captured");
  if (captured) return qrPaymentOutcome(captured, { orderId, kind, lang });

  const failed = items.find((payment) => payment.status === "failed");
  return failed ? qrPaymentOutcome(failed, { orderId, kind, lang }) : null;
}
