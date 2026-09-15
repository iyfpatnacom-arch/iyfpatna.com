import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/**
 * The payment receipt for a course seat.
 *
 * pdf-lib with the standard PDF fonts and nothing heavier: the standard fonts
 * are built into every reader, so a receipt is a few KB and draws in
 * milliseconds inside the customer's redirect. The price of that choice is one
 * hard constraint — they encode WinAnsi only. There is no rupee sign and no
 * Devanagari, so every string goes through `latin()` and money is written
 * "INR 99.00".
 *
 * Everything printed is read off the stored enrolment, so the receipt is a
 * pure function of the row and is regenerated on every request rather than
 * stored anywhere.
 */

const A4 = [595.28, 841.89];
const [PAGE_W, PAGE_H] = A4;
const MARGIN = 56;

const INK = rgb(0.12, 0.08, 0.05);
const MUTED = rgb(0.43, 0.39, 0.35);
const GOLD = rgb(0.706, 0.392, 0.047); // --primary, #b4640c
const RULE = rgb(0.91, 0.89, 0.85);
const PAPER = rgb(0.99, 0.97, 0.93);
const PAID = rgb(0.09, 0.5, 0.29);

/**
 * Folds a string down to what a standard PDF font can draw.
 *
 * A name is free text and the form accepts any script, so a Devanagari name
 * would otherwise throw inside `drawText` and turn a paid seat into a 500.
 */
function latin(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‒-―]/g, "-")
    .replace(/₹/g, "INR ")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Greedy wrap; a word wider than the column (an email) is cut by character. */
function wrap(value, font, size, maxWidth) {
  const words = (latin(value) || "-").split(" ");
  const lines = [];
  let line = "";

  const push = (word) => {
    let piece = "";
    for (const ch of word) {
      if (piece && font.widthOfTextAtSize(piece + ch, size) > maxWidth) {
        lines.push(piece);
        piece = ch;
      } else {
        piece += ch;
      }
    }
    return piece;
  };

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = font.widthOfTextAtSize(word, size) > maxWidth ? push(word) : word;
  }
  if (line) lines.push(line);
  return lines;
}

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

function when(value) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : DATE.format(date);
}

function money(amount) {
  return `INR ${(Number(amount) || 0).toFixed(2)}`;
}

/** CCAvenue names the rail; the receipt names it the way a person would. */
const MODES = {
  "unified payments": "UPI",
  upi: "UPI",
  "credit card": "Credit card",
  "debit card": "Debit card",
  "net banking": "Net banking",
  netbanking: "Net banking",
  wallet: "Wallet",
};

function paymentModeLabel(mode) {
  const raw = String(mode || "").trim();
  if (!raw) return "Online";
  return `Online - ${MODES[raw.toLowerCase()] || raw}`;
}

/** Receipt-DYS-101.pdf — what the browser and WhatsApp both show. */
export function receiptFilename(enrollment) {
  const id = latin(enrollment?.orderId || "order").replace(/[^A-Za-z0-9-]/g, "");
  return `Receipt-${id}.pdf`;
}

/**
 * Draws the receipt and returns the PDF bytes.
 *
 * `details` carries the wording that is not on the row: the course's English
 * title and batch line, the mode label, and the organisation block for the
 * foot.
 */
export async function buildReceiptPdf(enrollment, details) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage(A4);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRomanItalic);

  const text = (value, x, y, size, font = regular, color = INK) =>
    page.drawText(latin(value), { x, y, size, font, color });
  const right = (value, y, size, font = regular, color = INK) => {
    const safe = latin(value);
    page.drawText(safe, { x: PAGE_W - MARGIN - font.widthOfTextAtSize(safe, size), y, size, font, color });
  };
  const rule = (y) =>
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_W - MARGIN, y },
      thickness: 0.8,
      color: RULE,
    });

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

  if (enrollment.mrp && enrollment.mrp > enrollment.amount) {
    right(
      `Course fee ${money(enrollment.mrp)}  |  Discount ${money(enrollment.mrp - enrollment.amount)}`,
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
    ["Payment method", paymentModeLabel(payment.paymentMode)],
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

  pdf.setTitle(`Payment receipt ${enrollment.orderId}`);
  pdf.setAuthor(latin(details.orgName));
  pdf.setSubject(latin(details.courseTitle));
  pdf.setCreator(latin(details.orgName));

  return pdf.save();
}
