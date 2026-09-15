import { getCcavenueConfig, parseGatewayResponse } from "@/lib/payments/ccavenue";
import { gatewayReturn, recordAbandoned, recordGatewayResponse } from "@/lib/payments/result";

export const dynamic = "force-dynamic";

/**
 * CCAvenue's cancel_url — where the customer lands after backing out of the
 * billing page.
 *
 * What arrives here varies by merchant configuration: sometimes a full
 * encrypted result with order_status "Aborted", sometimes just the order
 * number. Both are handled, and either way the enrolment is left intact so the
 * visitor can pay later from their status page.
 */
async function handle(request, encResp, plainOrderId) {
  let config = null;
  try {
    config = getCcavenueConfig();
  } catch {
    config = null;
  }

  if (config && encResp) {
    try {
      const response = parseGatewayResponse(encResp, config);
      const result = await recordGatewayResponse(response);
      if (result) return gatewayReturn(request, result.lang, result.orderId);
    } catch (error) {
      console.error("[payment] could not read cancel response", error);
    }
  }

  const orderId = String(plainOrderId || "").trim();
  if (orderId) {
    await recordAbandoned(orderId).catch((error) =>
      console.error("[payment] could not mark order abandoned", error)
    );
    return gatewayReturn(request, "hi", orderId);
  }

  return gatewayReturn(request);
}

export async function POST(request) {
  let encResp = null;
  let orderId = null;
  try {
    const form = await request.formData();
    encResp = form.get("encResp");
    orderId = form.get("order_id") || form.get("orderNo");
  } catch (error) {
    console.error("[payment] unreadable cancel body", error);
  }
  return handle(request, encResp, orderId);
}

export async function GET(request) {
  const params = request.nextUrl.searchParams;
  return handle(request, params.get("encResp"), params.get("order_id") || params.get("orderNo"));
}
