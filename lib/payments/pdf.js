import { rgb } from "pdf-lib";

/**
 * The shared drawing kit behind every PDF this site hands out.
 *
 * pdf-lib with the standard PDF fonts and nothing heavier: the standard fonts
 * are built into every reader, so a document is a few KB and draws in
 * milliseconds inside the customer's redirect. The price of that choice is one
 * hard constraint — they encode WinAnsi only. There is no rupee sign and no
 * Devanagari, so every string goes through `latin()` and money is written
 * "INR 1100.00".
 *
 * That constraint is the reason this module exists rather than each receipt
 * carrying its own copy of these helpers: a donation receipt prints a name and
 * a postal address typed by a stranger, and a builder that forgot `latin()`
 * would turn a Devanagari address into a 500 on the one request where the
 * money has already left the donor's account.
 */

export const A4 = [595.28, 841.89];
export const [PAGE_W, PAGE_H] = A4;
export const MARGIN = 56;

export const INK = rgb(0.12, 0.08, 0.05);
export const MUTED = rgb(0.43, 0.39, 0.35);
export const GOLD = rgb(0.706, 0.392, 0.047); // --primary, #b4640c
export const RULE = rgb(0.91, 0.89, 0.85);
export const PAPER = rgb(0.99, 0.97, 0.93);
export const PAID = rgb(0.09, 0.5, 0.29);

/**
 * Folds a string down to what a standard PDF font can draw.
 *
 * A name and an address are free text and the forms accept any script, so a
 * Devanagari name would otherwise throw inside `drawText` and turn a paid
 * order into a 500.
 */
export function latin(value) {
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
export function wrap(value, font, size, maxWidth) {
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

export function when(value) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : DATE.format(date);
}

export function money(amount) {
  return `INR ${(Number(amount) || 0).toFixed(2)}`;
}

/** The gateway names the rail; a receipt names it the way a person would. */
const MODES = {
  "unified payments": "UPI",
  upi: "UPI",
  card: "Card",
  emi: "EMI",
  "credit card": "Credit card",
  "debit card": "Debit card",
  "net banking": "Net banking",
  netbanking: "Net banking",
  wallet: "Wallet",
};

export function paymentModeLabel(mode) {
  const raw = String(mode || "").trim();
  if (!raw) return "Online";
  return `Online - ${MODES[raw.toLowerCase()] || raw}`;
}

/** Receipt-DYS-101.pdf — what the browser and WhatsApp both show. */
export function receiptFilename(doc) {
  const id = latin(doc?.orderId || "order").replace(/[^A-Za-z0-9-]/g, "");
  return `Receipt-${id}.pdf`;
}

/**
 * The four ways anything is put on a page, bound to one page and font set.
 *
 * Every call runs its argument through `latin()`, which is the point: a builder
 * cannot forget to, because there is no way to draw text here that skips it.
 */
export function writer(page, { regular }) {
  const text = (value, x, y, size, font = regular, color = INK) =>
    page.drawText(latin(value), { x, y, size, font, color });

  const right = (value, y, size, font = regular, color = INK) => {
    const safe = latin(value);
    page.drawText(safe, {
      x: PAGE_W - MARGIN - font.widthOfTextAtSize(safe, size),
      y,
      size,
      font,
      color,
    });
  };

  const centre = (value, y, size, font = regular, color = INK) => {
    const safe = latin(value);
    page.drawText(safe, {
      x: (PAGE_W - font.widthOfTextAtSize(safe, size)) / 2,
      y,
      size,
      font,
      color,
    });
  };

  const rule = (y) =>
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_W - MARGIN, y },
      thickness: 0.8,
      color: RULE,
    });

  return { text, right, centre, rule };
}
