import { getCcavenueConfig, parseGatewayResponse } from "@/lib/payments/ccavenue";
import { gatewayReturn, recordGatewayResponse } from "@/lib/payments/result";

export const dynamic = "force-dynamic";

/**
 * CCAvenue's redirect_url.
 *
 * The customer's browser arrives here as a cross-site POST carrying `encResp`.
 * Nothing about this request is authenticated by a cookie — it cannot be, the
 * customer may be returning in a different browser session entirely. The
 * ciphertext is the credential: only CCAvenue holds the working key needed to
 * produce a response that decrypts into a well-formed result.
 *
 * This URL must be registered with CCAvenue and be absolute HTTPS, which is
 * why real payments cannot be exercised against localhost.
 */
async function handle(request, encResp) {
  let config = null;
  try {
    config = getCcavenueConfig();
  } catch (error) {
    console.error("[payment] bad CCAvenue configuration", error);
  }
  if (!config) {
    console.error("[payment] response received while CCAvenue is unconfigured");
    return gatewayReturn(request);
  }
  if (!encResp) {
    console.error("[payment] response had no encResp");
    return gatewayReturn(request);
  }

  let response;
  try {
    response = parseGatewayResponse(encResp, config);
  } catch (error) {
    console.error("[payment] could not decrypt response", error);
    return gatewayReturn(request);
  }

  try {
    const result = await recordGatewayResponse(response);
    if (!result) {
      console.error(`[payment] response for unknown order ${response.order_id || "(none)"}`);
      return gatewayReturn(request);
    }
    return gatewayReturn(request, result.lang, result.orderId);
  } catch (error) {
    // The payment itself may well have succeeded, so the customer still goes
    // to their status page; the row stays pending for reconciliation.
    console.error("[payment] failed to record response", error);
    return gatewayReturn(request, response.merchant_param3, response.order_id || null);
  }
}

export async function POST(request) {
  let encResp = null;
  try {
    const form = await request.formData();
    encResp = form.get("encResp");
  } catch (error) {
    console.error("[payment] unreadable response body", error);
  }
  return handle(request, encResp);
}

/** Some merchant configurations return the customer over GET. */
export async function GET(request) {
  return handle(request, request.nextUrl.searchParams.get("encResp"));
}
