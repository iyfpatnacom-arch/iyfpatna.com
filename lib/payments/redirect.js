/**
 * Browser-side half of the payment handoff.
 *
 * CCAvenue's billing page is reached by POSTing `encRequest` and the access
 * code to it, which a redirect cannot do — so the browser builds a throwaway
 * form and submits itself. The encrypted payload is minted server-side by
 * /api/payment/initiate; nothing here can influence what is being charged.
 */

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
 * Starts (or restarts) payment for an order.
 *
 * On success the browser is already navigating away, so callers should leave
 * their loading state on. On failure the returned `error` is a message key
 * for the caller to translate.
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

  submitToGateway(result.action, result.fields);
  return { ok: true };
}
