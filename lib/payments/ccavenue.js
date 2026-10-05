import crypto from "node:crypto";
import { ORG } from "@/lib/site-config";

/**
 * CCAvenue non-seamless (billing page) integration — the second way to pay,
 * offered beside Razorpay.
 *
 * Flow: we encrypt the order into `encRequest`, the browser POSTs it together
 * with the plain access code to CCAvenue, the customer pays on CCAvenue's own
 * billing page, and CCAvenue POSTs an encrypted `encResp` back to
 * /api/payment/ccavenue/response. Card details never touch this server, which
 * is what keeps us out of PCI DSS scope.
 *
 * What it can take is narrower than Razorpay — net banking and wallets, no UPI
 * and no cards — which is why Razorpay is offered first and this is the
 * fallback for a bank Razorpay cannot reach. The checkout says so in as many
 * words; see `GATEWAYS` in `gateways.js`.
 *
 * One thing Razorpay has and this does not: a webhook. A customer whose
 * browser never makes it back from the bank would leave a row sitting at
 * "pending" with money already taken, and pressing "pay now" again would
 * charge them twice — CCAvenue does not refuse a second transaction on the
 * same order number. That is what the Status API below is for: it is the
 * stand-in for Razorpay's "is this order already paid?" check, and `initiate`
 * asks it before it will open a second billing page.
 *
 * Two encryption schemes ship in the official Node kit and a merchant account
 * is provisioned for exactly one of them, so the scheme — and the transaction
 * URL that goes with it — is configuration, not a guess:
 *
 *   aes128  MD5(workingKey) as the key, fixed IV, AES-128-CBC, hex.  (classic)
 *   aes256  the 32-byte workingKey, random 12-byte IV, AES-256-GCM, hex.
 */

const HOSTS = {
  test: "https://test.ccavenue.com",
  production: "https://secure.ccavenue.com",
};

/** The Status API lives on its own hosts, not the billing page's. */
const API_HOSTS = {
  test: "https://apitest.ccavenue.com",
  production: "https://api.ccavenue.com",
};

const API_PATH = "/apis/servlet/DoWebTrans";

/** The transaction path is tied to the encryption scheme, not chosen freely. */
const TRANSACTION_PATH = {
  aes128: "/transaction/transaction.do?command=initiateTransaction",
  aes256: "/gTransaction.do?command=initiateTransaction",
};

/** The kit's hard-coded IV: bytes 0x00 … 0x0f. */
const AES128_IV = Buffer.from([
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
]);

/**
 * Resolves credentials, or null when CCAvenue is not configured. Callers treat
 * null as "this gateway is not on offer", so the site — and Razorpay with it —
 * keeps working whether or not these keys are set.
 */
export function getCcavenueConfig() {
  const merchantId = (process.env.CCAVENUE_MERCHANT_ID || "").trim();
  const accessCode = (process.env.CCAVENUE_ACCESS_CODE || "").trim();
  const workingKey = (process.env.CCAVENUE_WORKING_KEY || "").trim();
  /* NEXT_PUBLIC_* is inlined at build time, and this site is built on one
     machine and run on another — so a build without the variable must not
     quietly switch the gateway off. It falls back to the canonical origin the
     rest of the site already uses. */
  const siteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || ORG.siteUrl || "")
    .trim()
    .replace(/\/+$/, "");

  if (!merchantId || !accessCode || !workingKey || !siteUrl) return null;

  const mode = process.env.CCAVENUE_ENCRYPTION === "aes256" ? "aes256" : "aes128";
  if (mode === "aes256" && Buffer.byteLength(workingKey, "utf8") !== 32) {
    throw new Error(
      "CCAVENUE_WORKING_KEY must be exactly 32 bytes when CCAVENUE_ENCRYPTION=aes256.",
    );
  }

  // Defaults to the test gateway on purpose: forgetting to set this should
  // send money nowhere, not somewhere real.
  const environment = process.env.CCAVENUE_ENV === "production" ? "production" : "test";

  const endpoint =
    (process.env.CCAVENUE_ENDPOINT || "").trim() ||
    HOSTS[environment] + TRANSACTION_PATH[mode];

  const apiEndpoint =
    (process.env.CCAVENUE_API_ENDPOINT || "").trim() || API_HOSTS[environment] + API_PATH;

  return {
    merchantId,
    accessCode,
    workingKey,
    mode,
    environment,
    endpoint,
    apiEndpoint,
    siteUrl,
  };
}

// ── Encryption ──────────────────────────────────────────────────────────────

function aes128Key(workingKey) {
  // The raw 16-byte MD5 digest, exactly as the PHP/Java/Node kits use it.
  return crypto.createHash("md5").update(workingKey, "utf8").digest();
}

export function encrypt(plainText, workingKey, mode = "aes128") {
  if (mode === "aes256") {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", workingKey, iv);
    const body = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
    return iv.toString("hex") + Buffer.concat([body, cipher.getAuthTag()]).toString("hex");
  }

  const cipher = crypto.createCipheriv("aes-128-cbc", aes128Key(workingKey), AES128_IV);
  return cipher.update(plainText, "utf8", "hex") + cipher.final("hex");
}

export function decrypt(encryptedHex, workingKey, mode = "aes128") {
  const clean = String(encryptedHex).trim();

  if (mode === "aes256") {
    const buffer = Buffer.from(clean, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", workingKey, buffer.subarray(0, 12));
    decipher.setAuthTag(buffer.subarray(-16));
    return Buffer.concat([
      decipher.update(buffer.subarray(12, -16)),
      decipher.final(),
    ]).toString("utf8");
  }

  const decipher = crypto.createDecipheriv("aes-128-cbc", aes128Key(workingKey), AES128_IV);
  return decipher.update(clean, "hex", "utf8") + decipher.final("utf8");
}

// ── Request building ────────────────────────────────────────────────────────

/**
 * CCAvenue rejects a whole transaction over one stray character (errors
 * 31004–31011), so every value is filtered down to the character set the
 * integration guide allows and cut to its documented length.
 */
function clean(value, pattern, maxLength) {
  return String(value ?? "").replace(pattern, "").trim().slice(0, maxLength);
}

const ALPHA_SPACE = /[^A-Za-z ]/g;
const DIGITS = /[^0-9]/g;
const EMAIL_CHARS = /[^A-Za-z0-9@._-]/g;
const PARAM_CHARS = /[^A-Za-z0-9#,().\-/ ]/g;

/**
 * Names only allow letters and spaces, so a stripped character becomes a space
 * rather than vanishing — "Sharma-Devi" should reach the billing page as
 * "Sharma Devi", not "SharmaDevi".
 */
function cleanName(value, maxLength) {
  return String(value ?? "")
    .replace(ALPHA_SPACE, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

/**
 * Builds the auto-submitting form's payload for one row — a course seat or a
 * donation alike.
 *
 * The amount comes from the stored document, never from the browser: that row
 * is the only authority on what this costs. What kind of row it is travels in
 * merchant_param1, which is how the response settles it against the right
 * collection — the same job the `notes` on a Razorpay order do.
 */
export function buildPaymentRequest(row, { lang = "hi", kind = "course", notes, config } = {}) {
  const settings = config || getCcavenueConfig();
  if (!settings) throw new Error("CCAvenue is not configured.");

  const fields = {
    merchant_id: settings.merchantId,
    order_id: row.orderId,
    currency: row.currency || "INR",
    amount: Number(row.amount).toFixed(2),
    redirect_url: `${settings.siteUrl}/api/payment/ccavenue/response`,
    cancel_url: `${settings.siteUrl}/api/payment/ccavenue/cancel`,
    language: lang === "hi" ? "HI" : "EN",
    // Optional, but CCAvenue checks it for uniqueness for 24 hours, which
    // stops a double-submitted browser form becoming two live transactions.
    tid: String(Date.now()),
    billing_name: cleanName(row.name, 60),
    billing_tel: clean(row.phone, DIGITS, 20),
    billing_email: clean(row.email, EMAIL_CHARS, 70),
    billing_country: "India",
    // Echoed back in the response: what kind of order this is, what it was
    // for, and which language to return the visitor to.
    merchant_param1: clean(kind, PARAM_CHARS, 30),
    merchant_param2: clean(Object.values(notes || {})[0] ?? "", PARAM_CHARS, 100),
    merchant_param3: lang === "en" ? "en" : "hi",
  };

  const plain = new URLSearchParams(fields).toString();

  return {
    action: settings.endpoint,
    fields: {
      encRequest: encrypt(plain, settings.workingKey, settings.mode),
      access_code: settings.accessCode,
    },
  };
}

// ── Response handling ───────────────────────────────────────────────────────

/** Decrypts `encResp` into a plain object of the documented response fields. */
export function parseGatewayResponse(encResp, config) {
  const decrypted = decrypt(encResp, config.workingKey, config.mode);
  return Object.fromEntries(new URLSearchParams(decrypted).entries());
}

/**
 * CCAvenue's `order_status` → the four statuses this app stores.
 *
 * Two vocabularies land here. The billing page's response says Success /
 * Aborted / Failure / Invalid; the Status API has a longer list of its own
 * (Successful, Shipped, Awaited, Unsuccessful, Initiated, Cancelled, Fraud,
 * Refunded, …). Both are mapped in one place so neither caller has to know
 * which words it is going to get.
 *
 * Anything unrecognised comes back "pending", which `recordPaymentOutcome`
 * treats as "says nothing new" rather than writing over what is already there.
 * A refund or a chargeback is deliberately in that bucket: reversing a
 * confirmed seat is a human's decision, not a status poll's.
 */
export function mapOrderStatus(orderStatus) {
  switch (String(orderStatus || "").trim().toLowerCase()) {
    case "success":
    case "successful":
    // "Shipped" is CCAvenue's own word for a transaction confirmed by the bank.
    case "shipped":
      return "success";
    case "aborted":
    case "cancelled":
      return "aborted";
    case "failure":
    case "unsuccessful":
    case "invalid":
    case "fraud":
      return "failed";
    default:
      return "pending";
  }
}

/**
 * A decrypted response → the outcome `recordPaymentOutcome` stores, in exactly
 * the shape `settlePayment` returns for Razorpay. That is what lets one writer,
 * one amount check and one set of idempotency guarantees serve both gateways.
 *
 * There is no second API call to make here as there is with Razorpay: the
 * response is authenticated by being encrypted under the working key, which
 * only CCAvenue and this server hold. The amount is still re-checked against
 * the stored row downstream (`amountMismatch`), because the guide's headline
 * warning is never to trust the number that comes back.
 */
export function toOutcome(response) {
  const status = mapOrderStatus(response.order_status);

  return {
    orderId: String(response.order_id || "").trim(),
    kind: String(response.merchant_param1 || "").trim() || null,
    lang: response.merchant_param3 === "en" ? "en" : "hi",
    status,
    amount: Number(response.amount),
    currency: response.currency || "INR",
    provider: "ccavenue",
    trackingId: response.tracking_id || null,
    bankRefNo: response.bank_ref_no || null,
    paymentMode: response.payment_mode || null,
    // status_message is the bank's chatter ("Y") on a good payment, so it only
    // earns a place on the row when something actually went wrong.
    failureMessage:
      status === "success" ? null : response.failure_message || response.status_message || null,
    raw: response,
  };
}

// ── Status API ──────────────────────────────────────────────────────────────

/** Someone is waiting on this before their checkout opens. */
const API_TIMEOUT_MS = 10000;

/**
 * Asks CCAvenue what became of one of our order numbers.
 *
 * This is the orderStatusTracker call (API guide v1.2 §1): the query is
 * encrypted into `enc_request` exactly like a transaction, posted as a form to
 * a different host from the billing page, and answered with urlencoded pairs —
 * `status=0` plus an encrypted `enc_response`, or `status=1` with the error in
 * plain text.
 *
 * Returns the decrypted response object, or null when there is no answer to be
 * had. Null is not "unpaid": the call needs this server's public IP registered
 * with CCAvenue (API guide §"Merchant must provide CCAvenue with the public IP
 * address"), so on a new VPS, or from a developer's laptop, it fails outright.
 * Callers must therefore treat null as "no information" and never as proof
 * that nothing was paid.
 */
export async function fetchOrderStatus(orderId, config) {
  const settings = config || getCcavenueConfig();
  if (!settings) return null;

  const body = new URLSearchParams({
    enc_request: encrypt(
      JSON.stringify({ order_no: String(orderId) }),
      settings.workingKey,
      settings.mode,
    ),
    access_code: settings.accessCode,
    command: "orderStatusTracker",
    request_type: "JSON",
    response_type: "JSON",
    version: "1.2",
  });

  const response = await fetch(settings.apiEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`CCAvenue status enquiry failed (${response.status})`);
  }

  const fields = Object.fromEntries(new URLSearchParams(await response.text()).entries());

  // status=1 means the enquiry itself was rejected — a bad access code, an
  // unregistered IP, an order CCAvenue has never heard of. enc_response is
  // then plain text, not ciphertext.
  if (String(fields.status).trim() === "1") {
    throw new Error(
      `CCAvenue refused the status enquiry for ${orderId}: ${fields.enc_response || fields.error_desc || "no reason given"}`,
    );
  }
  if (!fields.enc_response) return null;

  return JSON.parse(decrypt(fields.enc_response, settings.workingKey, settings.mode));
}

/** Razorpay-style `METHODS`, for the handful of codes the Status API returns. */
const OPTION_TYPES = {
  OPTCRDC: "Card",
  OPTDBCRD: "Card",
  OPTNBK: "Net banking",
  OPTEMI: "EMI",
  OPTCASHC: "Cash card",
  OPTMOBP: "Wallet",
  OPTUPI: "UPI",
};

/**
 * A Status API response → the same outcome object everything else produces.
 *
 * Its field names are its own (`order_amt`, `order_currncy` — CCAvenue's own
 * spelling — `order_bank_ref_no`), and it does not return the order number the
 * way the billing page does, so the caller passes in the row it asked about.
 */
export function statusToOutcome(status, { orderId, kind, lang }) {
  const mapped = mapOrderStatus(status?.order_status);

  return {
    orderId,
    kind,
    lang,
    status: mapped,
    amount: Number(status?.order_amt),
    currency: status?.order_currncy || "INR",
    provider: "ccavenue",
    trackingId: status?.reference_no ? String(status.reference_no) : null,
    bankRefNo: status?.order_bank_ref_no || null,
    paymentMode:
      OPTION_TYPES[status?.order_option_type] ||
      status?.order_card_name ||
      status?.order_gtw_id ||
      null,
    failureMessage: mapped === "success" ? null : status?.order_bank_response || null,
    raw: status,
  };
}
