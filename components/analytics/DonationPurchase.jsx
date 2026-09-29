"use client";

import { useEffect } from "react";
import { META_CURRENCY, trackMeta } from "@/lib/analytics/meta";

/** One key per donation, so a refresh of the thank-you page stays quiet. */
const fired = (orderId) => `iyf:meta-purchase:${orderId}`;

/**
 * Reports a completed donation from the donor's own browser.
 *
 * Mounted on the donation status page, and only when that page is showing a
 * donation that is actually paid for — the server decides that, so nothing
 * here can report a conversion for a pending or failed offering.
 *
 * The server sends the same two events from `onPaid` (see
 * `lib/analytics/meta-capi.js`), which is what covers the donors who pay by
 * UPI and never return to this page. This copy exists for the ones who do:
 * a browser event carries the visitor's own cookies and Meta's own click
 * attribution, so it matches to an ad far better than the server's can. Both
 * carry `eventID` = the order ID, and Meta keeps only one.
 *
 * The session guard is not what prevents double counting — the shared event ID
 * is, for 48 hours and across devices. This only spares the network the calls
 * a donor makes by reopening their receipt link, which they do: the page is
 * bookmarked and mailed to them.
 *
 * Renders nothing.
 */
export function DonationPurchase({ orderId, amount, currency, sevaSlug }) {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(fired(orderId))) return;
      sessionStorage.setItem(fired(orderId), "1");
    } catch {
      /* Storage blocked — fall through and let the event ID do the
         deduplicating, which is its job anyway. */
    }

    const params = {
      value: Number(amount) || 0,
      currency: currency || META_CURRENCY,
      content_type: "product",
      content_ids: [sevaSlug],
      /* The slug, matching what the server sends, so one seva reads as one
         row in Ads Manager rather than as its Hindi and English titles. */
      content_name: sevaSlug,
      content_category: "seva",
      num_items: 1,
      order_id: orderId,
    };

    trackMeta("Purchase", params, { eventId: orderId });
    trackMeta("Donate", params, { eventId: orderId });
  }, [orderId, amount, currency, sevaSlug]);

  return null;
}
