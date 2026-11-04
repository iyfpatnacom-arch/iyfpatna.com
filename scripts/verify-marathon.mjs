/**
 * Checks the Gita Marathon's arithmetic against a real database.
 *
 * Everything the marathon shows anybody — a volunteer's own total, their rank,
 * the leaderboard, the coordinator's figures, the cash a volunteer still owes
 * — comes out of aggregation pipelines in `lib/marathon/stats.js`. Those are
 * the one part of this feature that cannot be read and judged correct: a
 * `$cond` on the wrong field, or a `$sum` over `items` instead of `quantity`,
 * produces numbers that look entirely plausible and are wrong, and the first
 * person to notice is a volunteer arguing with a leaderboard about their own
 * books.
 *
 * So it is checked arithmetically, against a fixture whose answers are worked
 * out by hand at the top of the file. It runs against mongodb-memory-server —
 * a real mongod, so the pipelines are really executed, and a throwaway one, so
 * this can never touch the temple's data.
 *
 * It also draws both receipts, because a PDF builder that throws does so on
 * the one request where the money has already left somebody's account.
 *
 * Run with `npm run verify:marathon`.
 */
import zlib from "node:zlib";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import BookSale from "../models/BookSale.js";
import CashSettlement from "../models/CashSettlement.js";
import MarathonVolunteer from "../models/MarathonVolunteer.js";
import { dbConnect } from "../lib/db/connect.js";
import { GITA_MARATHON } from "../lib/site-config.js";
import { getBook, priceBasket } from "../lib/marathon/books.js";
import { buildBookSaleReceipt } from "../lib/marathon/receipt.js";
import { gitasFor, gitaTierFor, isSevaInSeason } from "../lib/donations/sevas.js";
import { buildDonationReceipt } from "../lib/donations/receipt.js";
import {
  adminOverview,
  dailySeries,
  leaderboard,
  totals,
  unsettledCash,
  volunteerStanding,
} from "../lib/marathon/stats.js";

let failures = 0;

function check(name, actual, expected) {
  const ok = Object.is(actual, expected);
  if (!ok) failures += 1;
  console.log(
    `${ok ? "  ok  " : " FAIL "} ${name}${
      ok ? "" : `\n         expected ${expected}\n         actual   ${actual}`
    }`,
  );
}

function checkTrue(name, value) {
  check(name, Boolean(value), true);
}

/**
 * The strings a pdf-lib PDF actually draws.
 *
 * Content streams are deflated and the text is written as hex — pdf-lib
 * encodes WinAnsi runs as `<48656c6c6f> Tj` — so neither a grep over the file
 * nor a naive `(...)\s*Tj` scan finds anything, which is a trap worth leaving
 * a note about: both come back empty and look like a receipt with no text on
 * it rather than an extractor that cannot read one.
 *
 * Good enough to assert on, and deliberately not a PDF parser.
 */
function drawnText(bytes) {
  const buf = Buffer.from(bytes);
  const raw = buf.toString("latin1");

  let streams = "";
  const re = /\/Length (\d+)[\s\S]{0,300}?stream\r?\n/g;
  let match;
  while ((match = re.exec(raw))) {
    const start = match.index + match[0].length;
    const slice = buf.subarray(start, start + Number(match[1]));
    try {
      streams += zlib.inflateSync(slice).toString("latin1");
    } catch {
      streams += slice.toString("latin1");
    }
  }

  return [...streams.matchAll(/(?:\(([^)]*)\)|<([0-9A-Fa-f\s]+)>)\s*Tj/g)]
    .map((hit) =>
      hit[1] === undefined
        ? Buffer.from(hit[2].replace(/\s+/g, ""), "hex").toString("latin1")
        : hit[1],
    )
    .join(" | ");
}

/** Every phrase that must appear on a receipt, checked one by one. */
function checkSays(label, text, phrases) {
  for (const phrase of phrases) {
    check(`${label}: "${phrase}"`, text.includes(phrase), true);
  }
}

/* ---- The fixture, and its answers worked out by hand -------------------- */

/*
 * Three volunteers over three days of the marathon, plus one row that must be
 * counted by nothing at all.
 *
 * Hindi is 300 and English 350, so:
 *
 *   Asha    day 1  3 Hindi cash          900   3 books
 *           day 1  2 English online      700   2 books
 *           day 2  4 Hindi cash        1,200   4 books
 *                                     ------  --------
 *                                      2,800   9 books   (1 Hindi+1 Eng = 7 hi, 2 en)
 *
 *   Bimal   day 2  1 English cash        350   1 book
 *           day 3  5 Hindi online      1,500   5 books
 *                                     ------  --------
 *                                      1,850   6 books
 *
 *   Chandan day 3  2 Hindi online        600   2 books   ← payment PENDING
 *                                     ------  --------
 *                                          0   0 books   counted
 *
 * Totals that must come out:
 *   books 15, amount 4,650, cash 2,450, online 2,200, sales 5
 *   Hindi 12, English 3
 *   leaderboard: Asha 9, Bimal 6, Chandan absent
 */
const DAY1 = GITA_MARATHON.start;
const DAY2 = nextDay(DAY1);
const DAY3 = nextDay(DAY2);

function nextDay(dayKey) {
  const date = new Date(`${dayKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

const EXPECTED = {
  books: 15,
  amount: 4650,
  cash: 2450,
  online: 2200,
  sales: 5,
  hindi: 12,
  english: 3,
  ashaBooks: 9,
  ashaAmount: 2800,
  bimalBooks: 6,
};

async function seed() {
  const volunteers = await MarathonVolunteer.create([
    { clerkId: "user_asha", name: "Asha", phone: "9000000001", status: "active" },
    { clerkId: "user_bimal", name: "Bimal", phone: "9000000002", status: "active" },
    { clerkId: "user_chandan", name: "Chandan", phone: "9000000003", status: "pending" },
  ]);
  const by = Object.fromEntries(volunteers.map((v) => [v.clerkId, v]));

  let counter = 100;
  const sale = async (clerkId, dayKey, bookKey, quantity, method, status) => {
    const volunteer = by[clerkId];
    const { items, quantity: books, amount } = priceBasket([{ bookKey, quantity }]);
    counter += 1;
    return BookSale.create({
      orderId: `GM-${counter}`,
      volunteerClerkId: clerkId,
      volunteerId: volunteer._id,
      volunteerName: volunteer.name,
      items: items.map((item) => ({ ...item, title: { hi: item.bookKey, en: item.bookKey } })),
      quantity: books,
      amount,
      method,
      dayKey,
      payment:
        status === "success"
          ? { status: "success", provider: method === "cash" ? "cash" : "razorpay", paidAt: new Date() }
          : { status: "pending" },
    });
  };

  await sale("user_asha", DAY1, "gita_hi", 3, "cash", "success");
  await sale("user_asha", DAY1, "gita_en", 2, "online", "success");
  await sale("user_asha", DAY2, "gita_hi", 4, "cash", "success");
  await sale("user_bimal", DAY2, "gita_en", 1, "cash", "success");
  await sale("user_bimal", DAY3, "gita_hi", 5, "online", "success");
  // Never counted: the QR was never scanned.
  await sale("user_chandan", DAY3, "gita_hi", 2, "online", "pending");
}

/* ---- Run ---------------------------------------------------------------- */

const server = await MongoMemoryServer.create({ instance: { dbName: "marathon-verify" } });

/* Pointed at the throwaway server and then connected through the app's own
   `dbConnect`, rather than `mongoose.connect` here. The modules under test
   call `dbConnect` themselves; letting it own the connection means they find
   it already open instead of standing up a second in-memory server of their
   own and querying an empty database. */
process.env.MONGODB_URI = server.getUri("marathon-verify");
await dbConnect();

try {
  console.log("Gita Marathon — pricing (no database needed)");
  check("Hindi Gita is INR 300", getBook("gita_hi").price, 300);
  check("English Gita is INR 350", getBook("gita_en").price, 350);
  check("2 Hindi + 1 English is INR 950", priceBasket([
    { bookKey: "gita_hi", quantity: 2 },
    { bookKey: "gita_en", quantity: 1 },
  ]).amount, 950);
  check("the same title twice is folded into one line", priceBasket([
    { bookKey: "gita_hi", quantity: 2 },
    { bookKey: "gita_hi", quantity: 3 },
  ]).items.length, 1);
  check("...and its quantities added", priceBasket([
    { bookKey: "gita_hi", quantity: 2 },
    { bookKey: "gita_hi", quantity: 3 },
  ]).quantity, 5);
  check("an unknown title is dropped", priceBasket([
    { bookKey: "mahabharata", quantity: 1 },
  ]).items.length, 0);
  check("a zero quantity is dropped", priceBasket([
    { bookKey: "gita_hi", quantity: 0 },
  ]).quantity, 0);
  check("51 copies is refused as a fat finger", priceBasket([
    { bookKey: "gita_hi", quantity: 51 },
  ]).quantity, 0);

  console.log("\nGita Marathon — sponsorship arithmetic");
  check("INR 2,750 sponsors 11 Gitas", gitasFor(2750), 11);
  check("INR 27,000 sponsors 108 Gitas", gitasFor(27000), 108);
  check("INR 1,25,250 sponsors 501 Gitas", gitasFor(125250), 501);
  check("every published tier divides exactly",
    gitasFor(62750) * GITA_MARATHON.bookPrice, 62750);
  check("a gift below one book still sponsors one", gitasFor(50), 1);
  checkTrue("INR 7,500 is a published tier", Boolean(gitaTierFor(7500)));
  check("INR 7,600 is not", gitaTierFor(7600), null);
  checkTrue(
    "the marathon seva is in season on its first day",
    isSevaInSeason({ season: { start: GITA_MARATHON.start, end: GITA_MARATHON.end } }, GITA_MARATHON.start),
  );
  checkTrue(
    "...and out of season the day after it ends",
    !isSevaInSeason(
      { season: { start: GITA_MARATHON.start, end: GITA_MARATHON.end } },
      nextDay(GITA_MARATHON.end),
    ),
  );
  checkTrue("a seva with no season is always in season", isSevaInSeason({}, "2026-01-01"));

  await seed();

  console.log("\nGita Marathon — totals (aggregated in mongod)");
  const all = await totals({ scope: "marathon" });
  check("books counted", all.books, EXPECTED.books);
  check("amount counted", all.amount, EXPECTED.amount);
  check("paid sales counted", all.sales, EXPECTED.sales);
  check("cash split", all.cashAmount, EXPECTED.cash);
  check("online split", all.onlineAmount, EXPECTED.online);
  check("cash + online is the whole", all.cashAmount + all.onlineAmount, all.amount);
  check("Hindi copies", all.hindi, EXPECTED.hindi);
  check("English copies", all.english, EXPECTED.english);
  check("the two editions account for every book", all.hindi + all.english, all.books);

  const asha = await totals({ scope: "marathon", clerkId: "user_asha" });
  check("one volunteer's books", asha.books, EXPECTED.ashaBooks);
  check("one volunteer's amount", asha.amount, EXPECTED.ashaAmount);

  console.log("\nGita Marathon — leaderboard");
  const board = await leaderboard({ scope: "marathon" });
  check("only volunteers with paid sales appear", board.length, 2);
  check("ranked by books, most first", board[0].name, "Asha");
  check("...then the next", board[1].name, "Bimal");
  check("the leader's books", board[0].books, EXPECTED.ashaBooks);
  check("the runner-up's books", board[1].books, EXPECTED.bimalBooks);
  checkTrue(
    "a pending payment credits nobody",
    !board.some((row) => row.clerkId === "user_chandan"),
  );

  const standing = await volunteerStanding("user_bimal");
  check("a volunteer's own rank", standing.rank, 2);
  check("...out of how many", standing.total, 2);
  check("who is immediately ahead", standing.ahead?.name, "Asha");
  const unranked = await volunteerStanding("user_chandan");
  check("somebody with nothing counted has no rank", unranked.rank, null);
  check("...and is shown zero rather than nothing", unranked.row.books, 0);

  console.log("\nGita Marathon — the daily series");
  const series = await dailySeries({ from: DAY1, to: DAY3 });
  check("one entry per day, gaps filled", series.length, 3);
  check("day one's books", series[0].books, 5);
  check("day one's cash", series[0].cashAmount, 900);
  check("day one's online", series[0].onlineAmount, 700);
  check("day three's books", series[2].books, 5);
  check(
    "the series sums to the total",
    series.reduce((sum, day) => sum + day.books, 0),
    EXPECTED.books,
  );

  console.log("\nGita Marathon — cash still in hand");
  const owed = await unsettledCash("user_asha", DAY1);
  check("one day's unsettled cash", owed.amount, 900);
  check("...and how many sales that is", owed.count, 1);
  checkTrue("...with the sale ids to stamp", owed.saleIds.length === 1);

  // Settle it the way the volunteer's own action does, then re-ask.
  const settlement = await CashSettlement.create({
    volunteerClerkId: "user_asha",
    volunteerId: (await MarathonVolunteer.findOne({ clerkId: "user_asha" }))._id,
    volunteerName: "Asha",
    dayKey: DAY1,
    expectedAmount: owed.amount,
    expectedCount: owed.count,
    saleIds: owed.saleIds,
    declaredAmount: 800,
  });
  await BookSale.updateMany(
    { _id: { $in: owed.saleIds }, settlementId: null },
    { $set: { settlementId: settlement._id } },
  );

  const after = await unsettledCash("user_asha", DAY1);
  check("a settled day owes nothing", after.amount, 0);
  check("...and names no sales", after.count, 0);

  const second = await BookSale.create({
    orderId: "GM-900",
    volunteerClerkId: "user_asha",
    volunteerId: settlement.volunteerId,
    volunteerName: "Asha",
    items: [{ bookKey: "gita_hi", title: { hi: "x", en: "x" }, language: "hi", unitPrice: 300, quantity: 1 }],
    quantity: 1,
    amount: 300,
    method: "cash",
    dayKey: DAY1,
    payment: { status: "success", provider: "cash", paidAt: new Date() },
  });
  const afterLate = await unsettledCash("user_asha", DAY1);
  check("a sale made after the handover is a fresh debt", afterLate.amount, 300);

  // A second handover the same day is refused by the unique index.
  let duplicateRefused = false;
  try {
    await CashSettlement.create({
      volunteerClerkId: "user_asha",
      volunteerId: settlement.volunteerId,
      volunteerName: "Asha",
      dayKey: DAY1,
      expectedAmount: 300,
      expectedCount: 1,
      declaredAmount: 300,
    });
  } catch (error) {
    duplicateRefused = error?.code === 11000;
  }
  checkTrue("two handovers in one day are refused", duplicateRefused);
  await second.deleteOne();

  console.log("\nGita Marathon — the coordinator's overview");
  await CashSettlement.updateOne(
    { _id: settlement._id },
    { $set: { status: "verified", receivedAmount: 800, variance: 800 - owed.amount } },
  );
  const overview = await adminOverview({ scope: "marathon" });
  check("active volunteers", overview.volunteers.active, 2);
  check("volunteers waiting", overview.volunteers.pending, 1);
  check("a deficit is carried, not corrected", overview.cash.variance, -100);
  check("verified cash", overview.cash.verifiedAmount, 800);
  check("nothing left to count", overview.cash.awaitingVerification, 0);
  check("the overview agrees with the totals", overview.totals.books, EXPECTED.books);

  console.log("\nGita Marathon — the receipts actually draw");
  const saleRow = await BookSale.findOne({ orderId: "GM-101" }).lean();
  const bookReceipt = await buildBookSaleReceipt({
    ...saleRow,
    items: saleRow.items.map((item) => ({
      ...item,
      title: { hi: "भगवद्गीता यथारूप", en: "Bhagavad-gita As It Is (Hindi)" },
    })),
  });
  checkTrue("a book receipt is a PDF", bookReceipt.pdf.length > 1000);
  check("...named after the order", bookReceipt.filename, "Receipt-GM-101.pdf");
  checkSays("book receipt", drawnText(bookReceipt.pdf), [
    "BOOK DISTRIBUTION RECEIPT",
    "ISKCON PATNA",
    "Gita Marathon",
    "Bhagavad-gita As It Is (Hindi)",
    "INR 900.00",
    "PAID",
    "Asha",
    "GM-101",
    /* The whole reason this document is not the donation acknowledgement. */
    "This is a receipt for books purchased, not a donation.",
    "No deduction under Section 80G",
  ]);

  /* A Devanagari name and a three-line address, which is the input that used
     to turn a paid donation into a 500. */
  const donationReceipt = await buildDonationReceipt({
    orderId: "DN-501",
    sevaSlug: GITA_MARATHON.slug,
    sevaTitle: { hi: "गीता मैराथन", en: "Gita Marathon" },
    amount: 27000,
    name: "राधा शर्मा",
    email: "radha@example.com",
    phone: "9000000009",
    address: "Flat 3B, Shri Krishna Apartments, Boring Canal Road, Patna, Bihar 800001",
    pan: "ABCDE1234F",
    payment: { status: "success", paidAt: new Date(), paymentMode: "UPI", trackingId: "pay_x" },
  });
  checkTrue("a marathon donation receipt is a PDF", donationReceipt.pdf.length > 1000);
  check("...named after the order", donationReceipt.filename, "Receipt-DN-501.pdf");
  checkSays("donation receipt", drawnText(donationReceipt.pdf), [
    "DONATION ACKNOWLEDGEMENT",
    "ISKCON PATNA",
    "Gita Marathon",
    /* The count, in both the places it is printed. */
    "Gitas sponsored",
    "108",
    "108 copies of Bhagavad-gita As It Is",
    "INR 27000.00",
    "Twenty Seven Thousand Rupees Only",
    "80G TAX EXEMPTION",
    "AAATI0017P27MB02",
    "ABCDE1234F",
    /* The donor's address survives a Devanagari name beside it — the input
       that `latin()` exists for. */
    "Boring Canal Road",
  ]);
} finally {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await server.stop();
}

console.log(
  `\n${failures === 0 ? "All Gita Marathon checks passed." : `${failures} Gita Marathon check(s) FAILED.`}\n`,
);
process.exit(failures === 0 ? 0 : 1);
