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
 * The payment receipt for a course seat.
 *
 * Everything printed is read off the stored enrolment, so the receipt is a pure
 * function of the row and is regenerated on every request rather than stored
 * anywhere.
 *
 * The page geometry, the palette, the greedy wrap and the WinAnsi folding every
 * string goes through all live in `pdf.js`, shared with the donation receipt —
 * `latin()` in particular is load-bearing and must not be reimplemented here.
 */

/**
 * Page two: the entry pass, printed large enough to scan off paper.
 *
 * On the receipt because the receipt is what downloads automatically after
 * payment, so it is the one file every participant is sure to have on their
 * phone at the door — even with no signal to open the order page.
 */
async function drawPassPage(pdf, enrollment, details, { regular, bold, serif }) {
  const page = pdf.addPage(A4);
  const { centre } = writer(page, { regular });

  page.drawRectangle({ x: 0, y: PAGE_H - 8, width: PAGE_W, height: 8, color: GOLD });

  const cardW = 360;
  const cardH = 560;
  const cardX = (PAGE_W - cardW) / 2;
  const cardY = PAGE_H - 110 - cardH;
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

  let y = cardY + cardH - 44;
  centre("ENTRY PASS", y, 12, bold, GOLD);
  y -= 30;
  for (const line of wrap(details.courseTitle, serif, 22, cardW - 40)) {
    centre(line, y, 22, serif);
    y -= 24;
  }

  const qrSize = 250;
  const image = await pdf.embedPng(details.passPng);
  y -= qrSize + 6;
  page.drawImage(image, { x: (PAGE_W - qrSize) / 2, y, width: qrSize, height: qrSize });

  y -= 34;
  centre(enrollment.orderId, y, 20, bold);
  y -= 26;
  for (const line of wrap(enrollment.name, regular, 14, cardW - 40)) {
    centre(line, y, 14);
    y -= 18;
  }
  if (details.modeLabel) {
    centre(details.modeLabel, y, 10.5, regular, MUTED);
    y -= 16;
  }
  if (details.batchLabel) {
    for (const line of wrap(details.batchLabel, regular, 9.5, cardW - 40)) {
      centre(line, y, 9.5, regular, MUTED);
      y -= 13;
    }
  }

  let noteY = cardY + 46;
  for (const line of wrap(
    "Show this QR code at the entrance. It is scanned once each day to mark your attendance - please do not share it.",
    regular,
    9,
    cardW - 48
  )) {
    centre(line, noteY, 9, regular, MUTED);
    noteY -= 12;
  }
}

/* Callers import the filename helper from here as well as the builder; it is
   defined with the rest of the drawing kit. */
export { receiptFilename } from "./pdf";

/**
 * Draws the receipt and returns the PDF bytes.
 *
 * `details` carries the wording that is not on the row: the course's English
 * title and batch line, the mode label, the organisation block for the foot,
 * and — when there is one — the entry pass QR as PNG bytes for page two.
 */
export async function buildReceiptPdf(enrollment, details) {
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
  right("PAYMENT RECEIPT", y, 11, bold, GOLD);
  y -= 16;
  text(details.orgTagline, MARGIN, y, 10, regular, MUTED);
  right(enrollment.orderId, y, 10, regular, MUTED);

  y -= 24;
  rule(y);

  /* ---- Course ---------------------------------------------------------- */

  y -= 44;
  for (const line of wrap(details.courseTitle, serif, 26, PAGE_W - 2 * MARGIN)) {
    text(line, MARGIN, y, 26, serif);
    y -= 28;
  }
  if (details.batchLabel) {
    y += 8;
    text(details.batchLabel, MARGIN, y, 10.5, regular, MUTED);
  }

  /* ---- Amount ---------------------------------------------------------- */

  y -= 30;
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
  text(money(enrollment.amount), MARGIN + 18, y - 52, 24, bold);

  // A seat made free by a coupon was never paid for; the stamp says so.
  const stamp = Number(enrollment.amount) > 0 ? "PAID" : "FREE";
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

  const coupon = enrollment.coupon?.code ? enrollment.coupon : null;
  const listPrice = Math.max(Number(enrollment.mrp) || 0, Number(coupon?.originalAmount) || 0);
  if (listPrice > enrollment.amount) {
    right(
      `Course donation ${money(listPrice)}  |  Discount ${money(listPrice - enrollment.amount)}` +
        (coupon ? ` (coupon ${coupon.code})` : ""),
      y - 64,
      8.5,
      regular,
      MUTED
    );
  }

  y -= boxHeight + 34;

  /* ---- Rows ------------------------------------------------------------ */

  const payment = enrollment.payment || {};
  const rows = [
    ["Receipt number", enrollment.orderId],
    ["Payment date", when(payment.paidAt)],
    ["Participant", enrollment.name],
    ["Mobile", enrollment.phone ? `+91 ${enrollment.phone}` : "-"],
    ["Email", enrollment.email],
    ["Attending", details.modeLabel || "-"],
    [
      "Payment method",
      coupon && !(Number(enrollment.amount) > 0)
        ? `Coupon ${coupon.code} (${coupon.percentOff}% off)`
        : paymentModeLabel(payment.paymentMode),
    ],
    ["Transaction reference", payment.trackingId || "-"],
    ["Bank reference", payment.bankRefNo || "-"],
  ];

  const LABEL_X = MARGIN;
  const VALUE_X = MARGIN + 170;
  const VALUE_W = PAGE_W - MARGIN - VALUE_X;

  for (const [label, value] of rows) {
    const lines = wrap(value, regular, 11, VALUE_W);
    text(label, LABEL_X, y, 10, regular, MUTED);
    lines.forEach((line, i) => text(line, VALUE_X, y - i * 14, 11));
    y -= 14 * (lines.length - 1) + 12;
    rule(y);
    y -= 18;
  }

  /* ---- Foot ------------------------------------------------------------ */

  const thanks = "Thank you! Hare Krishna.";
  page.drawText(thanks, {
    x: (PAGE_W - serif.widthOfTextAtSize(thanks, 18)) / 2,
    y: 132,
    size: 18,
    font: serif,
    color: GOLD,
  });

  let footY = 100;
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

  if (details.passPng) await drawPassPage(pdf, enrollment, details, { regular, bold, serif });

  pdf.setTitle(`Payment receipt ${enrollment.orderId}`);
  pdf.setAuthor(latin(details.orgName));
  pdf.setSubject(latin(details.courseTitle));
  pdf.setCreator(latin(details.orgName));

  return pdf.save();
}
