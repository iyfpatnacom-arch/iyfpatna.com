import { findPayable } from "@/lib/payments/payables";
import { verifyOrderToken } from "@/lib/payments/order-link";
import { passQrPng } from "@/lib/payments/pass";
import { check, clientKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * The entry pass QR as a PNG, for the confirmation email.
 *
 * Email clients will not render an inline SVG or a data: URI, so the email
 * links an image instead. Guarded by the order link's `?t=` like the receipt:
 * the picture is a working pass, and it should only reach the person who holds
 * the order link.
 *
 * Which collection the order lives in is decided by `payables.js`, exactly as
 * /api/receipt decides it — a course seat and a Gita festival registration both
 * get a pass, and one URL shape covers both.
 */
export async function GET(request, { params }) {
  const limit = check(clientKey(request, "pass"), { limit: 60, windowMs: 10 * 60 * 1000 });
  if (!limit.allowed) {
    return new Response("Too many requests", {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSeconds) },
    });
  }

  const { orderId } = await params;
  const token = request.nextUrl.searchParams.get("t");
  if (!orderId || !(await verifyOrderToken(orderId, token))) {
    return new Response("Not found", { status: 404 });
  }

  const found = await findPayable(orderId);
  if (!found) return new Response("Not found", { status: 404 });

  /* A pass is admission, so an unpaid order has none. `pass: false` on a kind
     (a donation, a book sold at a stall) means there is no door to show it at. */
  if (!found.payable.pass) return new Response("Not found", { status: 404 });
  if (found.doc.payment?.status !== "success") {
    return new Response("No pass has been issued for this order.", { status: 409 });
  }

  const png = await passQrPng(orderId);
  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(png.length),
      "Cache-Control": "private, max-age=86400",
    },
  });
}

