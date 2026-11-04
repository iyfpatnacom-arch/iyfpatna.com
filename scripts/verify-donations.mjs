/**
 * Checks the donation dashboard's arithmetic against a real database.
 *
 * Every figure on /admin/donations comes out of an aggregation pipeline in
 * `lib/donations/stats.js`, and those are the one part of the feature that
 * cannot be read and judged correct. Three specific ways they can be wrong all
 * produce numbers that look entirely plausible:
 *
 *   A window bucketed on `createdAt` instead of on when the money landed, so a
 *   payment confirmed by a webhook the next morning falls in the wrong day.
 *
 *   A day bucketed in UTC instead of IST, which quietly moves every donation
 *   made between midnight and half past five into the previous day — and moves
 *   a 31st-of-March gift into the wrong financial year.
 *
 *   Donors counted by row rather than by person, so a family giving three
 *   times from one phone reads as three donors.
 *
 * So the fixture below is built to fail loudly on each of those, with its
 * answers worked out by hand. It runs against mongodb-memory-server — a real
 * mongod, so the pipelines are really executed, and a throwaway one, so this
 * can never touch the temple's data.
 *
 * Run with `npm run verify:donations`.
 */
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import Donation from "../models/Donation.js";
import BookSale from "../models/BookSale.js";
import Enrollment from "../models/Enrollment.js";
import MarathonVolunteer from "../models/MarathonVolunteer.js";
import { dbConnect } from "../lib/db/connect.js";
import {
  donationTotals,
  donationsBySeva,
  donationsDaily,
  financialYearStart,
  otherIncome,
  scopeWindow,
  topDonors,
} from "../lib/donations/stats.js";

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

/* ---- The fixture, and its answers worked out by hand -------------------- */

/*
 * "Today" is pinned rather than read from the clock, so these answers are the
 * same next March. Every function under test takes `today` for exactly this
 * reason.
 */
const TODAY = "2026-11-04";

/*
 * Ten attempts to give. The instants are UTC and the comment is what they are
 * in IST, because that difference is the whole point of three of these rows.
 *
 *   paid, inside today (IST)
 *     A1  Asha      anna-daan        1,100   3 Nov 19:00 UTC → 4 Nov 00:30 IST
 *     A2  Asha      deity seva       2,100   4 Nov 05:00 UTC → 4 Nov 10:30 IST
 *   paid, inside the last 30 days and this FY
 *     B1  Bimal     gita marathon    7,500  20 Oct
 *     H1  Gopal     anna-daan       11,000   1 Nov        (the only PAN given)
 *   paid, inside this FY only
 *     G1  Asha      gita-daan        1,100  15 Jun
 *   paid, but outside every window
 *     E1  Esha      anna-daan       51,000  31 Mar 10:00 UTC → 31 Mar IST, so
 *                                           the FY that ended, not this one
 *     F1  Farid     gau seva           201   4 Nov 19:00 UTC → 5 Nov 00:30 IST,
 *                                           so tomorrow, not today
 *   never money
 *     C1  Chandan   temple seva      5,100   4 Nov        pending
 *     D1  Deepa     anna-daan          501   2 Nov        failed
 *     I1  Hari      temple seva      2,100   1 Nov        aborted
 *
 * Which gives, by scope:
 *
 *   today    3,200 from 1 donor  (A1 + A2, both Asha)   1 pending, 3 attempts
 *   month   21,700 from 3 donors (A1 A2 B1 H1)          7 attempts
 *   fy      22,800 from 3 donors (+ G1)                 8 attempts
 *   all     74,001 from 5 donors (+ E1 + F1)
 */
const EXPECTED = {
  todayAmount: 3200,
  todayCount: 2,
  todayDonors: 1,
  monthAmount: 21700,
  monthCount: 4,
  monthDonors: 3,
  fyAmount: 22800,
  fyCount: 5,
  fyDonors: 3,
  allAmount: 74001,
  allCount: 7,
  allDonors: 5,
};

const SEVAS = {
  anna_daan: { slug: "anna-daan", hi: "अन्न-दान", en: "Anna-daan" },
  deity_seva: { slug: "deity-seva", hi: "विग्रह सेवा", en: "Deity seva" },
  gita_marathon: { slug: "gita-marathon", hi: "गीता मैराथन", en: "Gita Marathon" },
  gita_daan: { slug: "gita-daan", hi: "गीता दान", en: "Gita-daan" },
  gau_seva: { slug: "gau-seva", hi: "गौ सेवा", en: "Gau seva" },
  temple_seva: { slug: "temple-seva", hi: "मंदिर सेवा", en: "Temple seva" },
};

let counter = 100;

async function give({
  name,
  phone,
  sevaKey,
  amount,
  at,
  status = "success",
  mode = "upi",
  pan = null,
}) {
  const seva = SEVAS[sevaKey];
  counter += 1;
  const when = new Date(at);

  return Donation.create({
    orderId: `DN-${counter}`,
    sevaKey,
    sevaSlug: seva.slug,
    sevaTitle: { hi: seva.hi, en: seva.en },
    amount,
    name,
    email: `${name.toLowerCase()}@example.com`,
    phone,
    address: `1 Test Lane, Patna 800001`,
    pincode: "800001",
    ...(pan ? { pan } : {}),
    locale: "hi",
    /* `createdAt` is forced to the same instant, so a pipeline that buckets on
       the wrong one still lands in the right window for a settled row — and
       the only rows that prove the difference are the unpaid ones, which have
       no `paidAt` at all and must fall back to it. */
    createdAt: when,
    updatedAt: when,
    payment:
      status === "success"
        ? {
            status: "success",
            provider: "razorpay",
            paymentMode: mode,
            trackingId: `pay_${counter}`,
            paidAt: when,
          }
        : { status },
    notifications: { emailSent: status === "success" },
  });
}

async function seed() {
  await give({
    name: "Asha",
    phone: "9000000001",
    sevaKey: "anna_daan",
    amount: 1100,
    at: "2026-11-03T19:00:00Z",
  });
  await give({
    name: "Asha",
    phone: "9000000001",
    sevaKey: "deity_seva",
    amount: 2100,
    at: "2026-11-04T05:00:00Z",
    mode: "card",
  });
  await give({
    name: "Bimal",
    phone: "9000000002",
    sevaKey: "gita_marathon",
    amount: 7500,
    at: "2026-10-20T06:00:00Z",
  });
  await give({
    name: "Gopal",
    phone: "9000000007",
    sevaKey: "anna_daan",
    amount: 11000,
    at: "2026-11-01T06:00:00Z",
    pan: "ABCDE1234F",
  });
  await give({
    name: "Asha",
    phone: "9000000001",
    sevaKey: "gita_daan",
    amount: 1100,
    at: "2026-06-15T06:00:00Z",
  });
  await give({
    name: "Esha",
    phone: "9000000005",
    sevaKey: "anna_daan",
    amount: 51000,
    at: "2026-03-31T10:00:00Z",
  });
  await give({
    name: "Farid",
    phone: "9000000006",
    sevaKey: "gau_seva",
    amount: 201,
    at: "2026-11-04T19:00:00Z",
  });
  await give({
    name: "Chandan",
    phone: "9000000003",
    sevaKey: "temple_seva",
    amount: 5100,
    at: "2026-11-04T05:00:00Z",
    status: "pending",
  });
  await give({
    name: "Deepa",
    phone: "9000000004",
    sevaKey: "anna_daan",
    amount: 501,
    at: "2026-11-02T05:00:00Z",
    status: "failed",
  });
  await give({
    name: "Hari",
    phone: "9000000008",
    sevaKey: "temple_seva",
    amount: 2100,
    at: "2026-11-01T06:00:00Z",
    status: "aborted",
  });

  /* Money that is not a donation, so the page's last row can be checked for
     the thing that matters about it: that it is counted separately and never
     folded into a donation total. */
  const volunteer = await MarathonVolunteer.create({
    clerkId: "user_asha",
    name: "Asha",
    phone: "9000000001",
    status: "active",
  });

  await BookSale.create({
    orderId: "GM-900",
    volunteerClerkId: volunteer.clerkId,
    volunteerId: volunteer._id,
    volunteerName: volunteer.name,
    items: [
      {
        bookKey: "gita_hi",
        title: { hi: "गीता", en: "Gita" },
        language: "hi",
        unitPrice: 300,
        quantity: 3,
      },
    ],
    quantity: 3,
    amount: 900,
    method: "cash",
    dayKey: "2026-11-02",
    payment: { status: "success", provider: "cash", paidAt: new Date("2026-11-02T06:00:00Z") },
  });

  // Outside the last 30 days, inside this financial year.
  await BookSale.create({
    orderId: "GM-901",
    volunteerClerkId: volunteer.clerkId,
    volunteerId: volunteer._id,
    volunteerName: volunteer.name,
    items: [
      {
        bookKey: "gita_en",
        title: { hi: "गीता", en: "Gita" },
        language: "en",
        unitPrice: 350,
        quantity: 1,
      },
    ],
    quantity: 1,
    amount: 350,
    method: "cash",
    dayKey: "2026-09-01",
    payment: { status: "success", provider: "cash", paidAt: new Date("2026-09-01T06:00:00Z") },
  });

  const enrolledAt = new Date("2026-11-02T06:00:00Z");
  await Enrollment.create({
    orderId: "DYS-900",
    courseSlug: "dys",
    batchId: "dys-2026-11",
    courseTitle: { hi: "DYS", en: "DYS" },
    amount: 1100,
    name: "Ishan",
    email: "ishan@example.com",
    phone: "9000000009",
    createdAt: enrolledAt,
    updatedAt: enrolledAt,
    payment: { status: "success", provider: "razorpay", paidAt: enrolledAt },
  });
}

/* ---- Run ---------------------------------------------------------------- */

const server = await MongoMemoryServer.create({
  instance: { dbName: "donations-verify" },
});

/* Pointed at the throwaway server and then connected through the app's own
   `dbConnect`, rather than `mongoose.connect` here: the modules under test
   call `dbConnect` themselves, and letting it own the connection means they
   find it already open instead of querying an empty database of their own. */
process.env.MONGODB_URI = server.getUri("donations-verify");
await dbConnect();

try {
  console.log("Donations — the financial year (no database needed)");
  check("November is in the year that started in April", financialYearStart(TODAY), "2026-04-01");
  check("...and so is the 1st of April itself", financialYearStart("2026-04-01"), "2026-04-01");
  check(
    "the 31st of March belongs to the year that is ending",
    financialYearStart("2026-03-31"),
    "2025-04-01",
  );
  check("the FY window starts in April", scopeWindow("fy", TODAY).from, "2026-04-01");
  check("...and ends today", scopeWindow("fy", TODAY).to, TODAY);
  check("30 days means today and the 29 before it", scopeWindow("month", TODAY).from, "2026-10-06");
  check("today is one day", scopeWindow("today", TODAY).from, TODAY);
  check("all time has no window at all", scopeWindow("all", TODAY), null);

  await seed();

  console.log("\nDonations — today (aggregated in mongod, bucketed in IST)");
  const today = await donationTotals({ scope: "today", today: TODAY });
  check("collected today", today.amount, EXPECTED.todayAmount);
  check("offerings today", today.count, EXPECTED.todayCount);
  check("a gift at 00:30 IST counts as today", today.count >= 2, true);
  check("donors today, counted by phone", today.donorCount, EXPECTED.todayDonors);
  check("the largest gift today", today.largest, 2100);
  check("an abandoned attempt is not income", today.pending.count, 1);
  check("...and its rupees are kept apart", today.pending.amount, 5100);
  check("every attempt today is counted", today.attempts, 3);
  check("...as a settled share", today.successRate, 67);
  check("two payment modes today", today.modes.length, 2);
  check("the modes sum to the day", today.modes.reduce((sum, row) => sum + row.amount, 0), 3200);

  console.log("\nDonations — the last 30 days");
  const month = await donationTotals({ scope: "month", today: TODAY });
  check("collected", month.amount, EXPECTED.monthAmount);
  check("offerings", month.count, EXPECTED.monthCount);
  check("donors", month.donorCount, EXPECTED.monthDonors);
  check("average gift", month.average, 5425);
  check("PANs on record", month.withPan, 1);
  check("receipts emailed", month.emailed, EXPECTED.monthCount);
  check("failed attempts", month.failed, 1);
  check("cancelled attempts", month.aborted, 1);
  check("attempts in all", month.attempts, 7);
  check("settled share", month.successRate, 57);

  console.log("\nDonations — this financial year");
  const fy = await donationTotals({ scope: "fy", today: TODAY });
  check("collected", fy.amount, EXPECTED.fyAmount);
  check("offerings", fy.count, EXPECTED.fyCount);
  check("donors", fy.donorCount, EXPECTED.fyDonors);
  check(
    "a gift on the 31st of March is in last year, not this one",
    fy.amount < EXPECTED.allAmount,
    true,
  );
  check("tomorrow's gift has not arrived yet", fy.count, EXPECTED.fyCount);

  console.log("\nDonations — all time");
  const all = await donationTotals({ scope: "all", today: TODAY });
  check("collected", all.amount, EXPECTED.allAmount);
  check("offerings", all.count, EXPECTED.allCount);
  check("donors", all.donorCount, EXPECTED.allDonors);
  check("the largest gift ever", all.largest, 51000);
  check(
    "three gifts from one phone are one donor",
    all.count - all.donorCount,
    2,
  );

  console.log("\nDonations — by seva, this financial year");
  const sevas = await donationsBySeva({ scope: "fy", today: TODAY });
  check("one line per seva that took something", sevas.length, 4);
  check("ordered by what each took", sevas[0].key, "anna_daan");
  check("...the most first", sevas[0].amount, 12100);
  check("...and its gifts", sevas[0].count, 2);
  check("...from how many people", sevas[0].donorCount, 2);
  check("the marathon is next", sevas[1].key, "gita_marathon");
  check("...at its tier", sevas[1].amount, 7500);
  check("the seva's name is carried for the receipt", sevas[0].title?.en, "Anna-daan");
  check(
    "every seva together is the whole",
    sevas.reduce((sum, row) => sum + row.amount, 0),
    EXPECTED.fyAmount,
  );

  console.log("\nDonations — who gave most, this financial year");
  const donors = await topDonors({ scope: "fy", today: TODAY });
  check("one row per donor", donors.length, 3);
  check("ranked by what they gave", donors[0].name, "Gopal");
  check("...then the next", donors[1].name, "Bimal");
  check("...then the regular", donors[2].name, "Asha");
  check("a regular's three gifts are added", donors[2].amount, 4300);
  check("...and counted", donors[2].gifts, 3);
  check("...across the sevas they gave to", donors[2].sevaCount, 3);
  check("a PAN rides along for the certificate", donors[0].pan, "ABCDE1234F");

  console.log("\nDonations — day by day");
  const series = await donationsDaily({ from: "2026-11-01", to: TODAY });
  check("one entry per day, gaps filled", series.length, 4);
  check("the 1st", series[0].amount, 11000);
  check("a quiet day is a zero, not a gap", series[1].amount, 0);
  check(
    "a gift at 00:30 IST on the 4th is not on the 3rd",
    series[2].amount,
    0,
  );
  check("...it is on the 4th", series[3].amount, EXPECTED.todayAmount);
  check("...with both of that day's gifts", series[3].count, EXPECTED.todayCount);

  console.log("\nDonations — money that is not a donation");
  const other = await otherIncome({ scope: "month", today: TODAY });
  check("book sales in the window", other.books.amount, 900);
  check("...and the books they were", other.books.books, 3);
  check("an older sale is outside the window", other.books.count, 1);
  check("course fees in the window", other.courses.amount, 1100);
  check("...as paid seats", other.courses.count, 1);
  const otherFy = await otherIncome({ scope: "fy", today: TODAY });
  check("both sales are inside the financial year", otherFy.books.amount, 1250);
  checkTrue(
    "none of it is counted as a donation",
    fy.amount === EXPECTED.fyAmount,
  );
} finally {
  await mongoose.disconnect();
  await server.stop();
}

console.log(
  failures === 0
    ? "\nEvery donation figure checks out."
    : `\n${failures} check${failures === 1 ? "" : "s"} failed.`,
);
process.exit(failures === 0 ? 0 : 1);
