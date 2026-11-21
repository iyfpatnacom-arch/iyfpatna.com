import { ORG } from "@/lib/site-config";
import { eventOf, getFestival } from "@/lib/gita-event/catalog";
import { buildGitaReceiptPdf } from "@/lib/payments/gita-receipt";
import { receiptFilename } from "@/lib/payments/pdf";
import { passQrPng } from "@/lib/payments/pass";

/**
 * The Gita festival receipt, as bytes and a filename.
 *
 * Lifted out of the route handler so it sits beside the course and donation
 * equivalents and all three can be reached through one registry entry (see
 * `payables.js`) — /api/receipt/<orderId> is the same URL for any of them, and
 * only this decides what gets drawn.
 *
 * The wording is English-only, like the other two, because the standard PDF
 * fonts cannot draw Devanagari (see the note in `pdf.js`).
 *
 * The event titles come off the row's own snapshot first and the catalog only
 * as a fallback. A receipt reprinted after the festival has been renamed — or
 * after next year's catalog has replaced this one — must still say what this
 * person actually paid for.
 */
export async function buildGitaReceipt(row) {
  const festival = getFestival();
  const snapshots = new Map((row.eventTitles || []).map((entry) => [entry.key, entry]));

  const events = (row.events || []).map((key) => {
    const event = eventOf(key);
    return {
      key,
      title: snapshots.get(key)?.en || event?.title?.en || key,
      amount: Number(event?.amount) || 0,
      modeLabel: event?.modeLabel?.en || null,
      dateLabel: event?.dateLabel?.en || null,
    };
  });

  const pdf = await buildGitaReceiptPdf(row, {
    orgName: ORG.name,
    orgTagline: `The youth wing of ${ORG.parent}`,
    parentName: ORG.parentLegalName,
    address: ORG.address,
    siteDomain: ORG.domain,
    festivalTitle: festival.title.en,
    events,
    // A receipt without its pass page is still a receipt; never fail on it.
    passPng: await passQrPng(row.orderId, 600).catch((error) => {
      console.error(`[receipt] could not draw the Gita pass for ${row.orderId}`, error);
      return null;
    }),
  });

  return { pdf, filename: receiptFilename(row) };
}
