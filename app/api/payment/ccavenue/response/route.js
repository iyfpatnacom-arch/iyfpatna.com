import { getCcavenueConfig, parseGatewayResponse, toOutcome } from "@/lib/payments/ccavenue";
import { gatewayReturn, recordPaymentOutcome } from "@/lib/payments/result";

export const dynamic = "force-dynamic";

/**
 * CCAvenue's redirect_url — for a course seat and a donation alike.
 *
 * One URL for both, because the request carried the kind out in
 * merchant_param1 and CCAvenue echoes it back, so `recordPaymentOutcome`
 * settles it against the right collection. Razorpay has its own callback at
 * /api/payment/response; the two gateways share everything downstream of this
 * file, including the amount check and the write-exactly-once guarantee.
 *
 * The customer's browser arrives here as a cross-site POST. Nothing about this
 * request is authenticated by a cookie — it cannot be, the customer may be
 * returning from a bank page in a different browser session entirely. What
 * authenticates it is the encryption: `encResp` can only have been produced by
 * something holding the working key.
 */
async function handle(request, encResp) {
  let config = null;
  try {
    config = getCcavenueConfig();
  } catch (error) {
    console.error("[payment] bad CCAvenue configuration", error);
  }

  if (!config) {
    console.error("[payment] CCAvenue response received while it is unconfigured");
    return gatewayReturn(request, "hi");
  }

  if (!encResp) {
    console.error("[payment] CCAvenue response carried no encResp");
    return gatewayReturn(request, "hi");
  }

  let outcome = null;
  try {
    outcome = toOutcome(parseGatewayResponse(encResp, config));
  } catch (error) {
    console.error("[payment] could not read the CCAvenue response", error);
    return gatewayReturn(request, "hi");
  }

  try {
    const result = await recordPaymentOutcome(outcome);
    if (!result) {
      console.error(`[payment] CCAvenue named ${outcome.orderId}, which we do not hold`);
      return gatewayReturn(request, outcome.lang, { kind: outcome.kind });
    }
    return gatewayReturn(request, result.lang, { orderId: result.orderId, kind: result.kind });
  } catch (error) {
    // The payment itself may well have succeeded, so the customer still goes
    // to their status page; "pay now" there reconciles the row.
    console.error("[payment] failed to record the CCAvenue response", error);
    return gatewayReturn(request, outcome.lang, {
      orderId: outcome.orderId,
      kind: outcome.kind,
    });
  }
}

export async function POST(request) {
  let encResp = null;
  try {
    encResp = (await request.formData()).get("encResp");
  } catch (error) {
    console.error("[payment] unreadable CCAvenue response body", error);
  }
  return handle(request, encResp);
}

/** A customer who lands here by hand (a bookmark, the back button). */
export async function GET(request) {
  return handle(request, request.nextUrl.searchParams.get("encResp"));
}
