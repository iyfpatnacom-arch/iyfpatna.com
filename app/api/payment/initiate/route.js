import { NextResponse } from "next/server";
import {
  buildCheckoutOptions,
  createOrder,
  fetchOrder,
  fetchOrderPayments,
  settlePayment,
  toPaise,
} from "@/lib/payments/razorpay";
import {
  buildPaymentRequest,
  fetchOrderStatus,
  statusToOutcome,
} from "@/lib/payments/ccavenue";
import { gatewayConfig, paymentMode, resolveGateway } from "@/lib/payments/gateways";
import { findPayable } from "@/lib/payments/payables";
import { verifyOrderToken } from "@/lib/payments/order-link";
import { recordPaymentOutcome } from "@/lib/payments/result";
import { check, clientKey } from "@/lib/rate-limit";

/**
 * Hands the browser everything it needs to start paying, on whichever gateway
 * it asked for.
 *
 * Serves both a course seat and a donation, through both Razorpay and
 * CCAvenue: which row is being paid for is decided by the order ID, not by the
 * caller (see `payables.js`), and which gateways that row may use is decided
 * by the same registry (see `gateways.js`). It powers the first checkout and
 * every retry after it, so someone whose card was declined can finish paying
 * — or switch gateways — without filling the form again. The signed token is
 * required because the order ID alone is guessable.
 *
 * Two shapes come back. Razorpay returns `checkout` options for its overlay;
 * CCAvenue returns a `form` the browser POSTs itself to its billing page.
 */

/**
 * What an earlier Razorpay attempt on this row left behind:
 *
 *   { paid: true }   Razorpay already has the money for it.
 *   { order }        an unpaid order still good for the current amount.
 *   {}               nothing to reuse.
 *
 * The Razorpay Order is created once per row and reused on every retry, which
 * is what stops a double charge: if the customer paid but the redirect never
 * reached us, "pay now" finds the order already paid, records it and sends
 * them to their receipt instead of opening a second checkout. This runs
 * whichever gateway they have chosen this time, so switching to CCAvenue
 * cannot charge someone twice either.
 */
async function earlierRazorpayAttempt(row, { lang }) {
  const stored = row.payment || {};
  if (!stored.gatewayOrderId) return {};

  const config = gatewayConfig("razorpay");
  if (!config) return {};

  const order = await fetchOrder(config, stored.gatewayOrderId);

  if (order.status !== "paid") {
    // Reusable only while it is still for the amount this row now costs.
    return stored.gatewayAmount === toPaise(row.amount) ? { order } : {};
  }

  const { items = [] } = await fetchOrderPayments(config, order.id);
  const captured =
    items.find((p) => p.status === "captured") || items.find((p) => p.status === "authorized");
  if (captured) {
    const outcome = await settlePayment(captured.id, config);
    if (outcome) await recordPaymentOutcome({ ...outcome, lang });
  }
  // Paid on Razorpay's side: never open a second checkout. If nothing was
  // capturable the status page stays pending for a human to reconcile.
  return { paid: true };
}

/**
 * Has CCAvenue already taken the money for this row?
 *
 * CCAvenue's answer to Razorpay's reusable order. It has no webhook here and
 * does not refuse a second transaction on an order number it has already
 * charged, so without this a customer whose redirect was lost would pay twice
 * by pressing "pay now".
 *
 * Asked only when `payment.lastGateway` says a CCAvenue billing page was
 * opened for this row before. On a first attempt there is nothing to find, and
 * CCAvenue answers an order number it has never seen with an outright
 * rejection — which would mean an error in the log for every single checkout.
 *
 * Fail-soft, and that is a judgement worth naming. The enquiry needs this
 * server's IP registered with CCAvenue, so it can fail for reasons that have
 * nothing to do with the customer in front of us — and refusing to let them
 * pay because a status API is unreachable would lose far more seats than the
 * rare lost redirect it protects. It logs loudly and lets them through.
 */
async function alreadyPaidOnCcavenue(payable, row, { lang, config }) {
  if (row.payment?.lastGateway !== "ccavenue") return false;

  let status;
  try {
    status = await fetchOrderStatus(row.orderId, config);
  } catch (error) {
    console.error(`[payment] CCAvenue status enquiry for ${row.orderId} failed`, error);
    return false;
  }
  if (!status) return false;

  const outcome = statusToOutcome(status, { orderId: row.orderId, kind: payable.kind, lang });
  if (outcome.status === "pending") return false;

  const result = await recordPaymentOutcome(outcome);
  // Only a confirmed payment closes the door. A failed or aborted attempt is
  // recorded and they are sent straight back to the billing page.
  return result?.status === "success";
}

/** A fresh Razorpay Order for this row, remembered for the next retry. */
async function createRazorpayOrder(payable, row, { lang, config }) {
  const order = await createOrder(
    {
      orderId: row.orderId,
      amount: row.amount,
      currency: row.currency,
      kind: payable.kind,
      notes: payable.notes(row),
    },
    { lang, config },
  );

  await payable.model.updateOne(
    { orderId: row.orderId },
    {
      $set: {
        "payment.gatewayOrderId": order.id,
        "payment.gatewayAmount": order.amount,
      },
    },
  );
  return order;
}

/**
 * POST { orderId, token, lang, kind?, gateway? }
 *   → { ok, gateway, checkout } | { ok, gateway, form } | { ok, redirect }.
 *
 * `kind` only saves a lookup; it is never trusted to decide what is charged.
 * `gateway` is a request, not an instruction: an unknown or unconfigured one
 * falls back to the first gateway this row may use.
 */
export async function POST(request) {
  const limit = check(clientKey(request, "payment"), {
    limit: 12,
    windowMs: 10 * 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  const body = await request.json().catch(() => null);
  const orderId = String(body?.orderId || "").trim();
  const lang = body?.lang === "en" ? "en" : "hi";

  if (!orderId || !(await verifyOrderToken(orderId, body?.token))) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const found = await findPayable(orderId, { kind: body?.kind });
  if (!found) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const { payable, doc: row } = found;

  if (row.payment?.status === "success") {
    return NextResponse.json({
      ok: true,
      redirect: await payable.statusPath(orderId, lang),
    });
  }

  if (paymentMode() === "simulate") return NextResponse.json({ ok: true, simulate: true });

  const gateway = resolveGateway(body?.gateway, payable.gateways);
  const config = gateway && gatewayConfig(gateway);
  if (!config) {
    return NextResponse.json({ ok: false, error: "payment_unavailable" }, { status: 503 });
  }

  try {
    const paidElsewhere = async () =>
      NextResponse.json({ ok: true, redirect: await payable.statusPath(orderId, lang) });

    // Both gateways are asked, whichever one is about to be opened: someone
    // who paid on Razorpay and came back for CCAvenue (or the other way
    // round) must not be charged a second time.
    const { paid, order: reusable } = await earlierRazorpayAttempt(row, { lang });
    if (paid) return paidElsewhere();
    if (await alreadyPaidOnCcavenue(payable, row, { lang, config: gatewayConfig("ccavenue") })) {
      return paidElsewhere();
    }

    const payload =
      gateway === "ccavenue"
        ? {
            form: buildPaymentRequest(row, {
              lang,
              kind: payable.kind,
              notes: payable.notes(row),
              config,
            }),
          }
        : {
            checkout: buildCheckoutOptions(
              { orderId, ...payable.checkout(row, lang) },
              reusable ?? (await createRazorpayOrder(payable, row, { lang, config })),
              { lang, config },
            ),
          };

    /* Which billing page this row was last sent to, so the next "pay now"
       knows whom to ask about it. Written after the payload is built, so a
       request that never reached the customer does not claim it did. */
    await payable.model.updateOne(
      { orderId: row.orderId },
      { $set: { "payment.lastGateway": gateway } },
    );

    return NextResponse.json(
      { ok: true, gateway, ...payload },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(`[payment] could not prepare ${gateway} checkout`, error);
    return NextResponse.json({ ok: false, error: "generic" }, { status: 500 });
  }
}
