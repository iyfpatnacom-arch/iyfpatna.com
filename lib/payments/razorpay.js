import crypto from "node:crypto";
import { ORG } from "@/lib/site-config";

/**
 * Razorpay Standard Checkout.
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

export function isPaymentConfigured() {
  return Boolean(getRazorpayConfig());
}

/**
 * How money is taken right now.
 *
 *   "razorpay"  the live (or test) gateway is configured.
 *   "simulate"  local development with no gateway — the checkout marks the
 *               order paid itself, so the whole flow down to the receipt can
 *               be exercised on localhost. Never in a production build.
 *   null        production with no gateway: enrolments are saved as pending
 *               and the status page says payment opens shortly.
 */
export function paymentMode() {
  if (isPaymentConfigured()) return "razorpay";
  if (process.env.NODE_ENV !== "production") return "simulate";
  return null;
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
 * The Razorpay Order for one enrolment.
 *
 * The amount comes from the stored document, never from the browser: the
 * enrolment row is the only authority on what this seat costs. `receipt` is
 * our order ID, which is how a payment is traced back to its seat.
 */
export function createOrder(enrollment, { lang = "hi", config } = {}) {
  return api(config, "POST", "/orders", {
    amount: toPaise(enrollment.amount),
    currency: enrollment.currency || "INR",
    receipt: String(enrollment.orderId).slice(0, 40),
    notes: {
      orderId: enrollment.orderId,
      kind: "course",
      courseSlug: String(enrollment.courseSlug || "").slice(0, 100),
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
 */
export function buildCheckoutOptions(enrollment, gatewayOrder, { lang = "hi", config }) {
  const title = enrollment.courseTitle?.[lang] || enrollment.courseTitle?.en || "";

  return {
    key: config.keyId,
    order_id: gatewayOrder.id,
    amount: gatewayOrder.amount,
    currency: gatewayOrder.currency,
    name: ORG.name,
    description: title.slice(0, 255),
    prefill: {
      name: enrollment.name || "",
      email: enrollment.email || "",
      contact: enrollment.phone ? `+91${enrollment.phone}` : "",
    },
    notes: { orderId: enrollment.orderId },
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
