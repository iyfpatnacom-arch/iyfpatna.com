import { getCcavenueConfig, parseGatewayResponse, toOutcome } from "@/lib/payments/ccavenue";
import { findPayable } from "@/lib/payments/payables";
import { gatewayReturn, recordPaymentOutcome } from "@/lib/payments/result";

export const dynamic = "force-dynamic";

/**
 * CCAvenue's cancel_url — where the customer lands after backing out of the
 * billing page.
 *
 * What arrives here varies by merchant configuration: sometimes a full
 * encrypted result with order_status "Aborted", sometimes only the order
 * number. Both are handled, and either way the row is left intact so the
 * visitor can pay later — on either gateway — from their status page.
 *
 * With nothing but an order number there is deliberately no write: a bare
 * cancel URL is unauthenticated, and anyone who can guess an order ID must not
 * be able to stamp "aborted" onto someone else's pending seat. The encrypted
 * result is the only version of this that gets recorded.
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
      const outcome = toOutcome(parseGatewayResponse(encResp, config));
      const result = await recordPaymentOutcome(outcome);
      if (result) {
        return gatewayReturn(request, result.lang, {
          orderId: result.orderId,
          kind: result.kind,
        });
      }
    } catch (error) {
      console.error("[payment] could not read the CCAvenue cancel response", error);
    }
  }

  const orderId = String(plainOrderId || "").trim();
  if (orderId) {
    const found = await findPayable(orderId).catch(() => null);
    if (found) {
      return gatewayReturn(request, found.doc.locale || "hi", { orderId, kind: found.kind });
    }
  }

  return gatewayReturn(request, "hi");
}

export async function POST(request) {
  let encResp = null;
  let orderId = null;
  try {
    const form = await request.formData();
    encResp = form.get("encResp");
    orderId = form.get("order_id") || form.get("orderNo");
  } catch (error) {
    console.error("[payment] unreadable CCAvenue cancel body", error);
  }
  return handle(request, encResp, orderId);
}

export async function GET(request) {
  const params = request.nextUrl.searchParams;
  return handle(request, params.get("encResp"), params.get("order_id") || params.get("orderNo"));
}
