/**
 * Browser-side half of the payment handoff, for both gateways.
 *
 * /api/payment/initiate mints everything server-side, so nothing here can
 * influence what is being charged — this file only carries the customer to
 * whichever gateway came back:
 *
 *   Razorpay  loads checkout.js and opens the overlay. With `redirect: true`
 *             Razorpay sends the customer to our callback_url when they
 *             finish, so a UPI app switch or a bank page on mobile cannot lose
 *             the result.
 *   CCAvenue  has no script: its billing page is reached by POSTing
 *             `encRequest` and the access code to it, which a redirect cannot
 *             do, so the browser builds a throwaway form and submits itself.
 */

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
let checkoutScript = null;

function loadCheckout() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  checkoutScript ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = CHECKOUT_SRC;
    script.async = true;
    script.onload = () => (window.Razorpay ? resolve(window.Razorpay) : reject(new Error("no Razorpay")));
    script.onerror = () => reject(new Error("checkout script failed to load"));
    document.head.appendChild(script);
  }).catch((error) => {
    // Let the next tap try again rather than caching the failure.
    checkoutScript = null;
    throw error;
  });
  return checkoutScript;
}

function submitToGateway(action, fields) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = action;
  form.style.display = "none";

  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}

async function postJson(url, body) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => null);
    return { response, result };
  } catch {
    return { response: null, result: null };
  }
}

/**
 * Starts (or restarts) payment for an order — a course seat or a donation.
 *
 * `kind` only saves the server a lookup; the order ID is what decides what is
 * being paid for, so nothing here can change the amount by lying about it.
 * `gateway` is likewise only a request: the server falls back to the first one
 * on offer if this payment may not use the one named.
 *
 * On success the browser is already navigating away, so callers should leave
 * their loading state on. `cancelled` means the customer closed the Razorpay
 * overlay; any other failure carries an `error` message key for the caller to
 * translate. Backing out of CCAvenue's billing page is not a cancel we ever
 * see here — the browser has left the page by then and comes back through
 * /api/payment/ccavenue/cancel.
 */
export async function startPayment({ orderId, token, lang, kind, gateway }) {
  const { response, result } = await postJson("/api/payment/initiate", {
    orderId,
    token,
    lang,
    kind,
    gateway,
  });

  if (!response) return { ok: false, error: "network" };

  // Already paid (a second tab, a double tap) — go straight to the receipt.
  if (result?.redirect) {
    window.location.assign(result.redirect);
    return { ok: true };
  }

  if (!response.ok || !result?.ok) {
    return { ok: false, error: result?.error || "generic" };
  }

  if (result.simulate) {
    const simulated = await postJson("/api/payment/simulate", { orderId, token, lang, kind });
    if (!simulated.response?.ok || !simulated.result?.redirect) {
      return { ok: false, error: simulated.result?.error || "generic" };
    }
    window.location.assign(simulated.result.redirect);
    return { ok: true };
  }

  if (result.form) {
    submitToGateway(result.form.action, result.form.fields);
    return { ok: true };
  }

  if (!result.checkout) return { ok: false, error: "generic" };

  let Razorpay;
  try {
    Razorpay = await loadCheckout();
  } catch {
    return { ok: false, error: "network" };
  }

  // Resolves only if the customer closes the checkout; a finished payment
  // leaves the page for callback_url instead.
  return new Promise((resolve) => {
    const checkout = new Razorpay({
      ...result.checkout,
      redirect: true,
      modal: { ondismiss: () => resolve({ ok: false, cancelled: true }) },
    });
    checkout.open();
  });
}
