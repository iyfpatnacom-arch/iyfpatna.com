import { PDFDocument, StandardFonts } from "pdf-lib";
import {
  A4,
  GOLD,
  MARGIN,
  MUTED,
  PAGE_H,
  PAGE_W,
  PAID,
  PAPER,
  RULE,
  latin,
  money,
  paymentModeLabel,
  when,
  wrap,
  writer,
} from "./pdf";

/**
 * The registration receipt for the Gita Jayanti festival — one document for
 * however many of its events were paid for.
 *
 * A third builder beside the course receipt and the donation receipt, rather
 * than a flag on either, because the thing it has to show is different: a list
 * of events with a price each, a combined total that is less than their sum,
 * and a single pass that is valid at more than one door. A course receipt names
 * one course; printing two events into it would mean the word "Course" over a
 * list, and the saving line would have nowhere to go.
 *
 * Everything printed is read off the stored row, so the receipt is a pure
 * function of it and is regenerated on each request rather than stored.
 *
 * The page geometry, the palette, the greedy wrap and the WinAnsi folding every
 * string goes through all live in `pdf.js`. `latin()` in particular is
 * load-bearing — the name and the institution are free text typed by a
 * stranger, often in Devanagari, and a builder that skipped it would turn a
 * paid registration into a 500. There is no way to draw text through `writer()` that
 * skips it, which is why nothing here calls `drawText` directly.
 */

/**
 * Page two: the pass, printed large enough to scan off paper.
 *
 * On the receipt because the receipt is what downloads automatically after
 * payment, so it is the one file every participant is sure to have on their
 * phone at the gate — even with no signal to open the confirmation page.
 *
 * One QR for the whole registration, not one per event. The code carries the
 * order ID and nothing else; which event a scan marks is decided at the door
 * from the day and from what they paid for (see `lib/gita-event/attendance.js`).
 * Two QRs on one sheet would mean a volunteer choosing between them under a
 * queue, which is exactly the decision this takes away from them.
 */
async function drawPassPage(pdf, row, details, { regular, bold, serif }) {
  const page = pdf.addPage(A4);
  const { centre } = writer(page, { regular });

  page.drawRectangle({ x: 0, y: PAGE_H - 8, width: PAGE_W, height: 8, color: GOLD });

  const cardW = 360;
  const cardH = 580;
  const cardX = (PAGE_W - cardW) / 2;
  const cardY = PAGE_H - 100 - cardH;
  page.drawRectangle({
    x: cardX,
    y: cardY,
    width: cardW,
    height: cardH,
    color: PAPER,
    borderColor: GOLD,
    borderWidth: 1.2,
    borderDashArray: [6, 4],
  });

  let y = cardY + cardH - 42;
  centre("ENTRY PASS", y, 12, bold, GOLD);
  y -= 28;
  for (const line of wrap(details.festivalTitle, serif, 20, cardW - 40)) {
    centre(line, y, 20, serif);
    y -= 22;
  }

  const qrSize = 240;
  const image = await pdf.embedPng(details.passPng);
  y -= qrSize + 4;
  page.drawImage(image, { x: (PAGE_W - qrSize) / 2, y, width: qrSize, height: qrSize });

  y -= 32;
  centre(row.orderId, y, 20, bold);
  y -= 24;
  for (const line of wrap(row.name, regular, 14, cardW - 40)) {
    centre(line, y, 14);
    y -= 18;
  }

  /* Which doors this pass opens, each on its own line with its date. The
     volunteer and the holder read the same list, so nobody turns up to the
     mahotsav on a quiz-only pass expecting to be let in. */
  y -= 6;
  for (const event of details.events) {
    centre(event.title, y, 11, bold, GOLD);
    y -= 14;
    for (const line of wrap(
      [event.modeLabel, event.dateLabel].filter(Boolean).join("  |  "),
      regular,
      9,
      cardW - 40,
    )) {
      centre(line, y, 9, regular, MUTED);
      y -= 12;
    }
    y -= 4;
  }

  let noteY = cardY + 42;
  for (const line of wrap(
    "Show this QR code at the entrance. It is scanned once per event to mark your attendance - please do not share it.",
    regular,
    9,
    cardW - 48,
  )) {
    centre(line, noteY, 9, regular, MUTED);
    noteY -= 12;
  }
}

/**
 * Draws the receipt and returns the PDF bytes.
 *
 * `details` carries the wording that is not on the row: the festival's English
 * title, the events with their own English titles, dates and prices, the
 * organisation block for the foot, and — when there is one — the pass QR as PNG
 * bytes for page two.
 */
export async function buildGitaReceiptPdf(row, details) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage(A4);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRomanItalic);

  const { text, right, rule } = writer(page, { regular });

  /* ---- Letterhead ------------------------------------------------------ */

  page.drawRectangle({ x: 0, y: PAGE_H - 8, width: PAGE_W, height: 8, color: GOLD });

  let y = PAGE_H - 72;
  text(details.orgName.toUpperCase(), MARGIN, y, 15, bold);
  right("REGISTRATION RECEIPT", y, 11, bold, GOLD);
  y -= 16;
  text(details.orgTagline, MARGIN, y, 10, regular, MUTED);
  right(row.orderId, y, 10, regular, MUTED);

  y -= 24;
  rule(y);

  /* ---- The festival ---------------------------------------------------- */

  y -= 42;
  for (const line of wrap(details.festivalTitle, serif, 24, PAGE_W - 2 * MARGIN)) {
    text(line, MARGIN, y, 24, serif);
    y -= 26;
  }

  /* ---- What was registered for ----------------------------------------- */

  y -= 6;
  text("REGISTERED FOR", MARGIN, y, 8.5, bold, GOLD);
  y -= 18;

  for (const event of details.events) {
    text(event.title, MARGIN, y, 12, bold);
    right(money(event.amount), y, 11);
    y -= 14;
    const line = [event.modeLabel, event.dateLabel].filter(Boolean).join("  |  ");
    if (line) {
      text(line, MARGIN, y, 9, regular, MUTED);
      y -= 14;
    }
    y -= 4;
  }

  /* ---- Amount ---------------------------------------------------------- */

  y -= 10;
  const boxHeight = 72;
  page.drawRectangle({
    x: MARGIN,
    y: y - boxHeight,
    width: PAGE_W - 2 * MARGIN,
    height: boxHeight,
    color: PAPER,
    borderColor: RULE,
    borderWidth: 0.8,
  });
  text("Amount paid", MARGIN + 18, y - 24, 10, regular, MUTED);
  text(money(row.amount), MARGIN + 18, y - 52, 24, bold);

  const stamp = "PAID";
  const stampSize = 16;
  const stampW = bold.widthOfTextAtSize(stamp, stampSize);
  page.drawRectangle({
    x: PAGE_W - MARGIN - 18 - stampW - 20,
    y: y - 50,
    width: stampW + 20,
    height: 28,
    borderColor: PAID,
    borderWidth: 1.5,
  });
  text(stamp, PAGE_W - MARGIN - 18 - stampW - 10, y - 42, stampSize, bold, PAID);

  /* Only on a combo, and read off the row rather than recomputed: the catalog's
     prices may have moved since, and this has to say what this person saved. */
  const full = Number(row.fullAmount) || 0;
  if (full > Number(row.amount)) {
    right(
      `Both events separately ${money(full)}  |  Combined saving ${money(full - row.amount)}`,
      y - 64,
      8.5,
      regular,
      MUTED,
    );
  }

  y -= boxHeight + 30;

  /* ---- Rows ------------------------------------------------------------ */

  const payment = row.payment || {};
  /* Built by pushing rather than written out, because two of them are
     conditional: the address is only on rows registered while the form still
     asked for one, and `wrap()` on an undefined value would turn a paid
     registration into a 500. */
  const rows = [
    ["Receipt number", row.orderId],
    ["Payment date", when(payment.paidAt)],
    ["Participant", row.name],
    ["Mobile", row.phone ? `+91 ${row.phone}` : "-"],
    ["Email", row.email],
  ];
  if (row.address) rows.push(["Address", row.address]);
  if (row.referral) rows.push(["Referred by", row.referral]);
  rows.push(
    ["Payment method", paymentModeLabel(payment.paymentMode)],
    ["Transaction reference", payment.trackingId || "-"],
    ["Bank reference", payment.bankRefNo || "-"],
  );

  const LABEL_X = MARGIN;
  const VALUE_X = MARGIN + 170;
  const VALUE_W = PAGE_W - MARGIN - VALUE_X;

  for (const [label, value] of rows) {
    const lines = wrap(value, regular, 10.5, VALUE_W);
    text(label, LABEL_X, y, 10, regular, MUTED);
    lines.forEach((line, i) => text(line, VALUE_X, y - i * 13, 10.5));
    y -= 13 * (lines.length - 1) + 11;
    rule(y);
    y -= 16;
  }

  /* ---- Foot ------------------------------------------------------------ */

  const thanks = "Hare Krishna!";
  page.drawText(thanks, {
    x: (PAGE_W - serif.widthOfTextAtSize(thanks, 18)) / 2,
    y: 124,
    size: 18,
    font: serif,
    color: GOLD,
  });

  let footY = 96;
  for (const line of [
    `Collected on behalf of ${details.parentName}`,
    details.address,
    `${details.siteDomain}  |  This is a computer-generated receipt and needs no signature.`,
  ]) {
    for (const piece of wrap(line, regular, 8.5, PAGE_W - 2 * MARGIN)) {
      page.drawText(piece, {
        x: (PAGE_W - regular.widthOfTextAtSize(piece, 8.5)) / 2,
        y: footY,
        size: 8.5,
        font: regular,
        color: MUTED,
      });
      footY -= 12;
    }
  }

  if (details.passPng) await drawPassPage(pdf, row, details, { regular, bold, serif });

  pdf.setTitle(`Registration receipt ${row.orderId}`);
  pdf.setAuthor(latin(details.orgName));
  pdf.setSubject(latin(details.festivalTitle));
  pdf.setCreator(latin(details.orgName));

  return pdf.save();
}
