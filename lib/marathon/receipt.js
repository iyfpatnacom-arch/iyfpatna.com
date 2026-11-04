import { PDFDocument, StandardFonts } from "pdf-lib";
import { ORG } from "@/lib/site-config";
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
  receiptFilename,
  when,
  wrap,
  writer,
} from "@/lib/payments/pdf";

/**
 * The receipt for books handed over at a stall.
 *
 * Short, and its own document rather than a variation on either of the other
 * two, because of one line on it: a book sale is **not** a donation and
 * carries no 80G deduction. The donation acknowledgement's whole lower half is
 * the trust's exemption block, and a reader who had been given a document that
 * looked like that one would reasonably assume the deduction applied. So this
 * says the opposite, in as many words, near the money.
 *
 * It is also the simplest of the three: a line per title, a total, and who
 * handed the books over. There is no postal address and no PAN because nobody
 * buying a book on a footpath is asked for either.
 *
 * Assembly and drawing live in one file, unlike the donation receipt. That one
 * is split because `lib/donations/receipt.js` decides a page of wording the
 * drawing must not know about; here the wording is four lines and splitting it
 * would be two files to open to read one page.
 *
 * Redrawn on every request rather than stored: a pure function of the row,
 * which stops changing the moment the payment is confirmed.
 */
export async function buildBookSaleReceipt(sale) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage(A4);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRomanItalic);

  const { text, right, centre, rule } = writer(page, { regular });

  /* ---- Letterhead ------------------------------------------------------ */

  page.drawRectangle({ x: 0, y: PAGE_H - 8, width: PAGE_W, height: 8, color: GOLD });

  let y = PAGE_H - 68;
  /* The trust's name, not the youth wing's: the youth wing has no separate
     legal personality and the money for these books is received by ISKCON
     Patna. Which wing actually ran the stall is the line underneath. */
  text(ORG.parent.toUpperCase(), MARGIN, y, 15, bold);
  right("BOOK DISTRIBUTION RECEIPT", y, 11, bold, GOLD);
  y -= 16;
  text(`${ORG.name} - Gita Marathon`, MARGIN, y, 10, regular, MUTED);
  right(sale.orderId, y, 10, regular, MUTED);

  y -= 22;
  rule(y);

  /* ---- The titles ------------------------------------------------------ */

  y -= 34;
  text("BOOKS", MARGIN, y, 8.5, bold, GOLD);
  y -= 18;

  /* Four columns, right-aligned from the page edge inwards so the numbers
     line up however long a title turns out. */
  const QTY_X = PAGE_W - MARGIN - 210;
  const UNIT_X = PAGE_W - MARGIN - 140;
  const LINE_X = PAGE_W - MARGIN - 60;

  text("Title", MARGIN, y, 9, regular, MUTED);
  text("Qty", QTY_X, y, 9, regular, MUTED);
  text("Price", UNIT_X, y, 9, regular, MUTED);
  text("Amount", LINE_X, y, 9, regular, MUTED);
  y -= 8;
  rule(y);
  y -= 18;

  for (const item of sale.items || []) {
    const title = item.title?.en || item.bookKey;
    /* Wrapped against the first column's width alone, so a long title pushes
       the row taller rather than running under the figures. */
    const lines = wrap(title, regular, 10.5, QTY_X - MARGIN - 12);
    lines.forEach((line, i) => text(line, MARGIN, y - i * 13, 10.5));
    text(String(item.quantity), QTY_X, y, 10.5);
    text(money(item.unitPrice), UNIT_X, y, 10.5);
    text(money(item.unitPrice * item.quantity), LINE_X, y, 10.5);
    y -= 13 * (lines.length - 1) + 12;
    rule(y);
    y -= 16;
  }

  /* ---- Total ----------------------------------------------------------- */

  y -= 10;
  const boxHeight = 74;
  page.drawRectangle({
    x: MARGIN,
    y: y - boxHeight,
    width: PAGE_W - 2 * MARGIN,
    height: boxHeight,
    color: PAPER,
    borderColor: RULE,
    borderWidth: 0.8,
  });
  text(
    `Total - ${sale.quantity} ${sale.quantity === 1 ? "book" : "books"}`,
    MARGIN + 18,
    y - 22,
    10,
    regular,
    MUTED,
  );
  text(money(sale.amount), MARGIN + 18, y - 50, 22, bold);

  const stamp = "PAID";
  const stampW = bold.widthOfTextAtSize(stamp, 16);
  page.drawRectangle({
    x: PAGE_W - MARGIN - 18 - stampW - 20,
    y: y - 48,
    width: stampW + 20,
    height: 28,
    borderColor: PAID,
    borderWidth: 1.5,
  });
  text(stamp, PAGE_W - MARGIN - 18 - stampW - 10, y - 40, 16, bold, PAID);

  y -= boxHeight + 34;

  /* ---- Rows ------------------------------------------------------------ */

  const payment = sale.payment || {};
  const rows = [
    ["Receipt number", sale.orderId],
    ["Date", when(payment.paidAt || sale.createdAt)],
    ["Distributed by", sale.volunteerName],
    [
      "Payment method",
      sale.method === "cash" ? "Cash" : paymentModeLabel(payment.paymentMode),
    ],
    ["Transaction reference", payment.trackingId || "-"],
    ...(sale.buyer?.name ? [["Received by", sale.buyer.name]] : []),
  ];

  const VALUE_X = MARGIN + 150;
  for (const [label, value] of rows) {
    text(label, MARGIN, y, 9.5, regular, MUTED);
    for (const [i, line] of wrap(value, regular, 10.5, PAGE_W - MARGIN - VALUE_X).entries()) {
      text(line, VALUE_X, y - i * 13, 10.5);
    }
    y -= 24;
    rule(y);
    y -= 14;
  }

  /* ---- Not a donation -------------------------------------------------- */

  /* The one thing this document exists to be unambiguous about. Drawn as a
     panel in the same place the donation receipt puts its 80G block, so
     somebody comparing the two finds the answer in the same spot. */
  const panelLines = [
    "This is a receipt for books purchased, not a donation.",
    "No deduction under Section 80G of the Income Tax Act is available on this amount.",
    `To make a donation towards the Gita Marathon instead, visit ${ORG.domain}/donate/gita-marathon — those receipts do carry the trust's 80G registration.`,
  ].flatMap((line) => wrap(line, regular, 8.5, PAGE_W - 2 * MARGIN - 32));

  const panelHeight = panelLines.length * 12 + 34;
  const panelTop = Math.max(y - 6, MARGIN + 92 + panelHeight);

  page.drawRectangle({
    x: MARGIN,
    y: panelTop - panelHeight,
    width: PAGE_W - 2 * MARGIN,
    height: panelHeight,
    color: PAPER,
    borderColor: GOLD,
    borderWidth: 0.8,
  });
  text("PLEASE NOTE", MARGIN + 16, panelTop - 20, 8.5, bold, GOLD);
  let panelY = panelTop - 38;
  for (const line of panelLines) {
    text(line, MARGIN + 16, panelY, 8.5, regular, MUTED);
    panelY -= 12;
  }

  /* ---- Foot ------------------------------------------------------------ */

  const footLines = [
    ORG.address,
    `${ORG.domain}  |  This is a computer-generated receipt and needs no signature.`,
  ].flatMap((line) => wrap(line, regular, 8.5, PAGE_W - 2 * MARGIN));

  const footTop = MARGIN + 12 * (footLines.length - 1);
  centre("Hare Krishna.", footTop + 30, 18, serif, GOLD);

  let footY = footTop;
  for (const line of footLines) {
    centre(line, footY, 8.5, regular, MUTED);
    footY -= 12;
  }

  pdf.setTitle(`Book receipt ${sale.orderId}`);
  pdf.setAuthor(latin(ORG.parent));
  pdf.setSubject(latin(`Gita Marathon - book distribution receipt ${sale.orderId}`));
  pdf.setCreator(latin(ORG.name));

  return { pdf: await pdf.save(), filename: receiptFilename(sale) };
}
