import { getRazorpayConfig } from "./razorpay";
import { getCcavenueConfig } from "./ccavenue";

/**
 * The gateways money can be taken through, and the order they are offered in.
 *
 * There are two because no single one of them reaches every payer: Razorpay
 * takes UPI and cards, CCAvenue has banks and wallets Razorpay sometimes
 * cannot settle with. Offering both means a declined payment has somewhere
 * else to go instead of becoming an abandoned seat.
 *
 * `methods` is not decoration. It is the list the checkout shows the customer
 * before they choose, so that nobody picks CCAvenue expecting to pay by UPI,
 * finds no UPI on the billing page, and gives up. Keep it true to what the
 * merchant accounts are actually provisioned for.
 *
 * Which gateways a given payment may use is a property of what is being paid
 * for (see `gateways` in `payables.js`), and the server intersects that with
 * the ones actually configured — a browser cannot name a gateway into
 * existence.
 */
export const GATEWAYS = {
  razorpay: {
    id: "razorpay",
    /** Opened as an overlay on our own page, then redirected back. */
    flow: "checkout",
    methods: ["card", "netbanking", "upi"],
    config: getRazorpayConfig,
  },
  ccavenue: {
    id: "ccavenue",
    /** The browser POSTs itself to CCAvenue's own billing page. */
    flow: "form",
    methods: ["netbanking", "wallet"],
    config: getCcavenueConfig,
  },
};

/** Razorpay first, deliberately: it is the only one of the two that takes UPI. */
export const GATEWAY_ORDER = ["razorpay", "ccavenue"];

/**
 * One gateway's credentials, or null when it is not set up.
 *
 * Bad configuration (a working key of the wrong length, say) throws out of
 * `getCcavenueConfig`. That must not take the whole checkout down with it, so
 * it is logged and the gateway simply drops off the list.
 */
export function gatewayConfig(id) {
  const gateway = GATEWAYS[id];
  if (!gateway) return null;
  try {
    return gateway.config() || null;
  } catch (error) {
    console.error(`[payment] ${id} is misconfigured and will not be offered`, error);
    return null;
  }
}

/** The gateway ids that are configured right now, in display order. */
export function configuredGateways(allowed = GATEWAY_ORDER) {
  return GATEWAY_ORDER.filter((id) => allowed.includes(id) && gatewayConfig(id));
}

export function isPaymentConfigured() {
  return configuredGateways().length > 0;
}

/**
 * How money is taken right now.
 *
 *   "live"      at least one gateway is configured (test keys included).
 *   "simulate"  local development with none — the checkout marks the order
 *               paid itself, so the whole flow down to the receipt can be
 *               exercised on localhost. Never in a production build.
 *   null        production with no gateway: orders are saved as pending and
 *               the status page says payment opens shortly.
 */
export function paymentMode() {
  if (isPaymentConfigured()) return "live";
  if (process.env.NODE_ENV !== "production") return "simulate";
  return null;
}

/**
 * The gateway a payment should actually open, given what the browser asked
 * for. An unknown, unconfigured or not-allowed-for-this-kind choice falls back
 * to the first one on offer rather than failing: the customer asked to pay,
 * and sending them to the wrong-but-working gateway beats an error page.
 */
export function resolveGateway(requested, allowed = GATEWAY_ORDER) {
  const offered = configuredGateways(allowed);
  const asked = String(requested || "");
  return offered.includes(asked) ? asked : (offered[0] ?? null);
}

/**
 * What the checkout needs to render the choice: the id and its payment
 * methods, for the gateways this payment may use. Empty when there is nothing
 * to choose between, which is also when the picker should not be shown.
 */
export function gatewayChoices(allowed = GATEWAY_ORDER) {
  return configuredGateways(allowed).map((id) => ({
    id,
    methods: GATEWAYS[id].methods,
  }));
}
