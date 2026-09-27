import { PDFDocument, StandardFonts } from "pdf-lib";
import {
  A4,
  GOLD,
  INK,
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
 * The 80G donation receipt.
 *
 * Not a variation on the course receipt but its own document, because it is
 * read by someone else. A course receipt is proof to the participant that
 * their seat is paid for; this is proof to an assessing officer that a
 * registered trust received a specific sum from a specific person at a
 * specific address — so it prints the donor's postal address and PAN, the
 * trust's registration block, and the amount in words, none of which a course
 * receipt has any use for.
 *
 * Everything on it is read off the stored donation row, so the receipt is a
 * pure function of that row and is redrawn on every request rather than
 * stored. The row stops changing the moment the payment succeeds.
 */

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function underHundred(n) {
  if (n < 20) return ONES[n];
  const tens = TENS[Math.floor(n / 10)];
  const ones = ONES[n % 10];
  return ones ? `${tens} ${ones}` : tens;
}

/**
 * "One Thousand One Hundred Rupees Only" — the amount spelled out, as an
 * Indian receipt spells it: lakh and crore, not million.
 *
 * On the receipt because a figure alone can be altered with a pen after the
 * fact, which is exactly the objection a written amount answers. Whole rupees
 * only; a donation here is never fractional (see `isValidAmount`).
 */
export function rupeesInWords(value) {
  const amount = Math.floor(Math.abs(Number(value) || 0));
  if (amount === 0) return "Zero Rupees Only";

  const groups = [
    [Math.floor(amount / 10000000), "Crore"],
    [Math.floor((amount % 10000000) / 100000), "Lakh"],
    [Math.floor((amount % 100000) / 1000), "Thousand"],
    [Math.floor((amount % 1000) / 100), "Hundred"],
  ];

  const parts = groups
    .filter(([count]) => count > 0)
    .map(([count, name]) => `${underHundred(count)} ${name}`);

  const rest = amount % 100;
  if (rest) parts.push(`${parts.length ? "and " : ""}${underHundred(rest)}`);

  return `${parts.join(" ")} Rupees Only`;
}

/**
 * Draws the receipt and returns the PDF bytes.
 *
 * `details` carries what is not on the row: the organisation block for the
 * letterhead and the foot, the receipt desk's telephone line, the trust's
 * registration numbers, and the seva's English name (the row snapshots both languages; a tax document is read in
 * English, and the standard PDF fonts cannot draw Devanagari anyway).
 *
 * The organisation named here is the trust that receives the money, not the
 * wing that collected it — see `lib/donations/receipt.js` for why.
 */
export async function buildDonationReceiptPdf(donation, details) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage(A4);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRomanItalic);

  const { text, right, centre, rule } = writer(page, { regular });

  /* ---- Letterhead ------------------------------------------------------ */

  page.drawRectangle({
    x: 0,
    y: PAGE_H - 8,
    width: PAGE_W,
    height: 8,
    color: GOLD,
  });

  let y = PAGE_H - 68;
  text(details.orgName.toUpperCase(), MARGIN, y, 15, bold);
  /* "Acknowledgement" and not "receipt": the stamped receipt is issued by the
     temple's receipt desk, whose number is at the foot of this page. This
     document acknowledges that the money arrived. */
  right("DONATION ACKNOWLEDGEMENT", y, 11, bold, GOLD);
  y -= 16;
  text(details.orgTagline, MARGIN, y, 10, regular, MUTED);
  right(donation.orderId, y, 10, regular, MUTED);

  y -= 22;
  rule(y);

  /* ---- The seva -------------------------------------------------------- */

  y -= 38;
  for (const line of wrap(details.sevaTitle, serif, 24, PAGE_W - 2 * MARGIN)) {
    text(line, MARGIN, y, 24, serif);
    y -= 26;
  }
  y += 6;
  text(details.sevaNote, MARGIN, y, 10, regular, MUTED);

  /* ---- Amount ---------------------------------------------------------- */

  y -= 28;
  const boxHeight = 86;
  page.drawRectangle({
    x: MARGIN,
    y: y - boxHeight,
    width: PAGE_W - 2 * MARGIN,
    height: boxHeight,
    color: PAPER,
    borderColor: RULE,
    borderWidth: 0.8,
  });
  text("Donation received", MARGIN + 18, y - 22, 10, regular, MUTED);
  text(money(donation.amount), MARGIN + 18, y - 50, 24, bold);

  const stamp = "PAID";
  const stampSize = 16;
  const stampW = bold.widthOfTextAtSize(stamp, stampSize);
  page.drawRectangle({
    x: PAGE_W - MARGIN - 18 - stampW - 20,
    y: y - 48,
    width: stampW + 20,
    height: 28,
    borderColor: PAID,
    borderWidth: 1.5,
  });
  text(stamp, PAGE_W - MARGIN - 18 - stampW - 10, y - 40, stampSize, bold, PAID);

  /* The written amount, which is what stops a figure being altered later.
     `rupeesInWords` already ends in "Rupees Only", so nothing is prefixed. */
  text(rupeesInWords(donation.amount), MARGIN + 18, y - 70, 9, regular, MUTED);

  y -= boxHeight + 30;

  /* ---- Rows ------------------------------------------------------------ */

  const payment = donation.payment || {};
  const rows = [
    ["Receipt number", donation.orderId],
    ["Date of donation", when(payment.paidAt)],
    ["Donor", donation.name],
    ["Address", donation.address],
    ["Mobile", donation.phone ? `+91 ${donation.phone}` : "-"],
    ["Email", donation.email],
    ["PAN of donor", donation.pan || "Not provided"],
    ["Seva", details.sevaTitle],
    ["Payment method", paymentModeLabel(payment.paymentMode)],
    ["Transaction reference", payment.trackingId || "-"],
    ["Bank reference", payment.bankRefNo || "-"],
  ];

  const LABEL_X = MARGIN;
  const VALUE_X = MARGIN + 150;
  const VALUE_W = PAGE_W - MARGIN - VALUE_X;

  /* Wrapped before anything is drawn, because how tall this block comes out is
     the one thing on the page nobody controls — a donor may type a three-line
     postal address — and what sits below it is anchored to the bottom of the
     sheet. See the measuring pass below. */
  const wrappedRows = rows.map(([label, value]) => [
    label,
    wrap(value, regular, 10.5, VALUE_W),
  ]);

  /* ---- 80G ------------------------------------------------------------- */

  /* The block the donor's assessing officer actually looks for. Drawn as a
     panel rather than another row, because every row above it is a statement
     about the donor and this is a statement about the recipient. */
  const panelLines = [
    `Donations to ${details.parentName} are exempt under Section 80G of the Income Tax Act, 1961.`,
    `Registered under the ${details.compliance.trustAct}, Regn. No. ${details.compliance.registration}.`,
    `PAN of recipient: ${details.compliance.pan}    |    80G Unique Registration Number: ${details.compliance.eightyGUrn}`,
    details.formNote,
  ];

  const wrapped = panelLines.flatMap((line) => wrap(line, regular, 8.5, PAGE_W - 2 * MARGIN - 32));
  const panelHeight = wrapped.length * 12 + 34;

  /* ---- Sharing out the bottom of the sheet ----------------------------- */

  /*
   * Everything below the rows is fixed-height, so it is measured first and
   * laid out from the bottom margin upwards; the rows then take what is left.
   *
   * Flowing the whole page downwards and trusting it to land is what this used
   * to do, and it did not: one more wrapped line in the panel — an 80G number
   * a few characters longer is enough — walked the panel's lower border down
   * onto "Thank you! Hare Krishna.". The rows are the only part whose height
   * depends on what the donor typed, so the rows are the part that gives. The
   * gap between them is squeezed, never past `MIN_ROW_GAP`, until the panel
   * clears the foot.
   */

  const ROW_GAP = 16;
  const MIN_ROW_GAP = 8;
  const PANEL_GAP = 16;

  const footLines = [
    [details.receiptContact, bold, INK],
    [details.address, regular, MUTED],
    [
      `${details.siteDomain}  |  This is a computer-generated acknowledgement and needs no signature.`,
      regular,
      MUTED,
    ],
  ].flatMap(([line, font, color]) =>
    wrap(line, font, 8.5, PAGE_W - 2 * MARGIN).map((piece) => [piece, font, color]),
  );

  /* Sat on the bottom margin rather than at a y picked by hand, which is both
     where it belongs and 24pt of paper the old layout left unused. */
  const footTop = MARGIN + 12 * (footLines.length - 1);
  const thanksY = footTop + 30;

  /* The panel may come no lower than a clear gap above the tallest letter of
     the thank-you line. `heightAtSize` over-states the ascent slightly, which
     is the direction to be wrong in. */
  const minPanelBottom = thanksY + serif.heightAtSize(18) + PANEL_GAP;

  const rowsFixed = wrappedRows.reduce(
    (total, [, lines]) => total + 13 * (lines.length - 1) + 11,
    0,
  );
  /* The panel's top edge lands 12pt below where the rows finish, so this is the
     lowest the rows may end and still leave the panel above its floor. */
  const rowsFloor = minPanelBottom + panelHeight - 12;
  const rowGap = Math.max(
    MIN_ROW_GAP,
    Math.min(ROW_GAP, (y - rowsFixed - rowsFloor) / wrappedRows.length),
  );

  /* ---- Drawing, top to bottom ------------------------------------------ */

  for (const [label, lines] of wrappedRows) {
    text(label, LABEL_X, y, 9.5, regular, MUTED);
    lines.forEach((line, i) => text(line, VALUE_X, y - i * 13, 10.5));
    y -= 13 * (lines.length - 1) + 11;
    rule(y);
    y -= rowGap;
  }

  /* Follows the rows down, but stops at the floor: with `MIN_ROW_GAP` reached
     and an address still longer than the page can take, it is the rows above
     that are crowded rather than the foot below. */
  const panelTop = Math.max(y + 12, minPanelBottom + panelHeight);

  page.drawRectangle({
    x: MARGIN,
    y: panelTop - panelHeight,
    width: PAGE_W - 2 * MARGIN,
    height: panelHeight,
    color: PAPER,
    borderColor: GOLD,
    borderWidth: 0.8,
  });

  text("80G TAX EXEMPTION", MARGIN + 16, panelTop - 20, 8.5, bold, GOLD);
  let panelY = panelTop - 38;
  for (const line of wrapped) {
    text(line, MARGIN + 16, panelY, 8.5, regular, MUTED);
    panelY -= 12;
  }

  /* ---- Foot ------------------------------------------------------------ */

  centre("Thank you! Hare Krishna.", thanksY, 18, serif, GOLD);

  let footY = footTop;
  for (const [line, font, color] of footLines) {
    centre(line, footY, 8.5, font, color);
    footY -= 12;
  }

  pdf.setTitle(`Donation receipt ${donation.orderId}`);
  pdf.setAuthor(latin(details.orgName));
  pdf.setSubject(latin(`${details.sevaTitle} — donation receipt`));
  pdf.setCreator(latin(details.orgName));

  return pdf.save();
}
