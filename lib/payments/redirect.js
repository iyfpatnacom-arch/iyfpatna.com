/**
 * Browser-side half of the payment handoff.
 *
 * /api/payment/initiate mints the Razorpay Order and the checkout options
 * server-side, so nothing here can influence what is being charged. This file
 * only loads Razorpay's checkout script and opens it. With `redirect: true`
 * Razorpay sends the customer to our callback_url when they finish, so a
 * UPI app switch or a bank page on mobile cannot lose the result.
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
 * Starts (or restarts) payment for an order.
 *
 * On success the browser is already navigating away, so callers should leave
 * their loading state on. `cancelled` means the customer closed the checkout;
 * any other failure carries an `error` message key for the caller to translate.
 */
export async function startPayment({ orderId, token, lang }) {
  const { response, result } = await postJson("/api/payment/initiate", {
    orderId,
    token,
    lang,
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
    const simulated = await postJson("/api/payment/simulate", { orderId, token, lang });
    if (!simulated.response?.ok || !simulated.result?.redirect) {
      return { ok: false, error: simulated.result?.error || "generic" };
    }
    window.location.assign(simulated.result.redirect);
    return { ok: true };
  }

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
