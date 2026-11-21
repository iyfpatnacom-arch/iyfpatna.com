/**
 * Checks the Gita festival's pricing and its two-axis attendance register
 * against a real database.
 *
 * Two parts of this feature cannot be read and judged correct, and both fail in
 * ways that look entirely plausible on screen.
 *
 * The price. A registration for both events costs ₹151 where the two separately
 * come to ₹202, so the combined fee is a *price for the set*, not a discount on
 * either. Nothing on the server takes an amount from the browser, which means
 * the only way the wrong number reaches the gateway is if `priceFor` is wrong —
 * and ₹202 charged for a ₹151 combo is a bill nobody queries until a refund.
 *
 * The register. Admission is keyed by event *and* day, which is one more key
 * than the course register has, and the condition that makes a repeat scan
 * idempotent has to test both together. Testing them separately — "no entry
 * with this event" and "no entry with this day" — passes every test written
 * with one event and silently refuses to admit somebody to the mahotsav on a
 * day they were already admitted to the quiz. It is the exact bug the festival
 * would hit on its one busy day, so it is asserted here directly.
 *
 * It also draws the receipt and renders the email, because both only run after
 * the money has already left somebody's account: a builder that throws there
 * turns a successful payment into a 500 on the one request that must not fail.
 * The receipt is checked for the things only it can get wrong — both events
 * named, the combined fee and the saving, and the pass page behind them.
 *
 * It runs against mongodb-memory-server: a real mongod, so the update
 * conditions are really executed, and a throwaway one, so it can never touch
 * the temple's data.
 *
 * Run with `npm run verify:gita`.
 */
import zlib from "node:zlib";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import GitaRegistration from "../models/GitaRegistration.js";
import { dbConnect } from "../lib/db/connect.js";
import {
  EVENT_KEYS,
  eventForDay,
  eventOf,
  getFestival,
  normalizeEvents,
  priceFor,
  selectionLabel,
  whatsappGroupsFor,
} from "../lib/gita-event/catalog.js";
import { admitGita, setGitaAttendance } from "../lib/gita-event/attendance.js";
import { buildGitaReceipt } from "../lib/gita-event/receipt.js";
import { renderGitaRegistrationEmail } from "../lib/notifications/templates/email/gitaRegistration.js";
import { recordPaymentOutcome } from "../lib/payments/result.js";

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
 * Content streams are deflated and the text is written as hex — pdf-lib encodes
 * WinAnsi runs as `<48656c6c6f> Tj` — so neither a grep over the file nor a
 * naive `(...)\s*Tj` scan finds anything. That is a trap worth a note: both
 * come back empty and look like a receipt with no text on it rather than an
 * extractor that cannot read one.
 *
 * Lifted from `verify-marathon.mjs`, deliberately rather than shared: a check
 * script that imports its assertions from another check script fails silently
 * in two places at once. Good enough to assert on, and not a PDF parser.
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

/** Every phrase that must appear on a document, checked one by one. */
function checkSays(label, text, phrases) {
  for (const phrase of phrases) {
    check(`${label}: "${phrase}"`, text.includes(phrase), true);
  }
}

const festival = getFestival();
const [QUIZ, MAHOTSAV] = EVENT_KEYS;

/* ---- Part one: the price ------------------------------------------------ */

function verifyPricing() {
  console.log("\nPricing");

  const quizOnly = priceFor([QUIZ]);
  const mahotsavOnly = priceFor([MAHOTSAV]);
  const both = priceFor([QUIZ, MAHOTSAV]);

  check("one event is its own fee", quizOnly.amount, Number(eventOf(QUIZ).amount));
  check("one event saves nothing", quizOnly.saved, 0);
  check("the other event is its own fee", mahotsavOnly.amount, Number(eventOf(MAHOTSAV).amount));

  check("both events cost the combined fee", both.amount, Number(festival.comboAmount));
  check(
    "the full price is the sum of the two",
    both.fullAmount,
    Number(eventOf(QUIZ).amount) + Number(eventOf(MAHOTSAV).amount),
  );
  check("the saving is the difference", both.saved, both.fullAmount - both.amount);
  checkTrue("the combo is cheaper than buying both", both.amount < both.fullAmount);

  /* Order must not change the price, and nor may a repeated key: the browser
     sends an array, and "quiz, quiz" must not buy two quizzes. */
  check("order does not change the price", priceFor([MAHOTSAV, QUIZ]).amount, both.amount);
  check("a repeated event does not double the price", priceFor([QUIZ, QUIZ]).amount, quizOnly.amount);
  check("an unknown event is ignored", priceFor([QUIZ, "kirtan-night"]).amount, quizOnly.amount);

  /* A registration for nothing would be charged nothing and would walk past
     the gateway, so it must not be representable. */
  let threw = false;
  try {
    priceFor([]);
  } catch {
    threw = true;
  }
  checkTrue("no events is refused rather than priced at zero", threw);

  check("events are normalised into catalog order", normalizeEvents([MAHOTSAV, QUIZ]).join(","), EVENT_KEYS.join(","));
  checkTrue("the label names both events", selectionLabel([QUIZ, MAHOTSAV], "en").includes("+"));
}

/* ---- Part two: which group, and which event -------------------------- */

function verifyRouting() {
  console.log("\nGroups and event resolution");

  check("one event earns one group", whatsappGroupsFor([QUIZ], "en").length, 1);
  check("both events earn both groups", whatsappGroupsFor([QUIZ, MAHOTSAV], "en").length, 2);
  checkTrue(
    "the two groups are different links",
    whatsappGroupsFor([QUIZ, MAHOTSAV], "en")[0].url !==
      whatsappGroupsFor([QUIZ, MAHOTSAV], "en")[1].url,
  );

  /* A single-event pass resolves on any day: a volunteer at a door is never
     told "wrong day" by software. */
  check("a single-event pass resolves on any day", eventForDay([MAHOTSAV], "2019-01-01"), MAHOTSAV);

  /* A two-event pass resolves only on a date the catalog knows, and is
     deliberately unresolved otherwise so the door asks instead of guessing. */
  const quizDate = eventOf(QUIZ).date;
  if (quizDate) {
    check("a two-event pass resolves on the quiz's date", eventForDay([QUIZ, MAHOTSAV], quizDate), QUIZ);
  }
  check(
    "a two-event pass is unresolved on an unrelated day",
    eventForDay([QUIZ, MAHOTSAV], "2019-01-01"),
    null,
  );
}

/* ---- Part three: the register ------------------------------------------ */

const TODAY_FIXTURE = {
  orderId: "GITA-901",
  festivalSlug: festival.slug,
  name: "Test Participant",
  email: "test@example.com",
  phone: "9000000001",
  occupation: "student",
  gender: "male",
  locale: "en",
};

async function seed(orderId, events, { paid = true, phone } = {}) {
  await GitaRegistration.deleteOne({ orderId });
  const price = priceFor(events);
  await GitaRegistration.create({
    ...TODAY_FIXTURE,
    orderId,
    phone: phone || TODAY_FIXTURE.phone,
    events,
    eventTitles: events.map((key) => ({
      key,
      en: eventOf(key).title.en,
      hi: eventOf(key).title.hi,
    })),
    amount: price.amount,
    fullAmount: price.fullAmount,
    payment: paid
      ? { status: "success", provider: "razorpay", paidAt: new Date() }
      : { status: "pending" },
  });
}

async function verifyRegister() {
  console.log("\nThe register");

  /* -- a one-event pass needs no question ------------------------------- */
  await seed("GITA-901", [QUIZ]);
  const first = await admitGita("GITA-901", { markedBy: "admin_1" });
  check("a one-event pass is admitted without being asked", first.status, "admitted");
  check("and is marked against that event", first.event, QUIZ);

  const again = await admitGita("GITA-901", { markedBy: "admin_1" });
  check("a second scan the same day is 'already'", again.status, "already");
  const row901 = await GitaRegistration.findOne({ orderId: "GITA-901" }).lean();
  check("and leaves exactly one mark", row901.attendance.length, 1);

  /* -- a two-event pass is asked about, then marked once per event ------ */
  await seed("GITA-902", [QUIZ, MAHOTSAV]);
  const asked = await admitGita("GITA-902", { markedBy: "admin_1" });
  /* Unless today happens to be one of the festival's own dates, in which case
     resolution is correct and the question is rightly not asked. */
  const todayIsAnEventDay = EVENT_KEYS.some((key) => eventOf(key).date === istToday());
  check(
    "a two-event pass asks which event",
    asked.status,
    todayIsAnEventDay ? "admitted" : "choose_event",
  );
  if (asked.status === "choose_event") {
    check("and offers both of them", asked.options.length, 2);
  }

  /* The bug this file exists for: admitted to one event today, then to the
     other event *the same day*. A condition that tested event and day
     separately would refuse the second one. */
  await seed("GITA-903", [QUIZ, MAHOTSAV]);
  const toQuiz = await admitGita("GITA-903", { eventKey: QUIZ, markedBy: "admin_1" });
  const toMahotsav = await admitGita("GITA-903", { eventKey: MAHOTSAV, markedBy: "admin_1" });
  check("admitted to the first event", toQuiz.status, "admitted");
  check("admitted to the second event on the same day", toMahotsav.status, "admitted");
  const row903 = await GitaRegistration.findOne({ orderId: "GITA-903" }).lean();
  check("two marks, one per event", row903.attendance.length, 2);
  check(
    "and they name different events",
    new Set(row903.attendance.map((entry) => entry.eventKey)).size,
    2,
  );

  /* -- an event they did not pay for ----------------------------------- */
  await seed("GITA-904", [QUIZ]);
  const wrong = await admitGita("GITA-904", { eventKey: MAHOTSAV, markedBy: "admin_1" });
  check("an event they did not pay for is refused", wrong.status, "wrong_event");
  const row904 = await GitaRegistration.findOne({ orderId: "GITA-904" }).lean();
  check("and marks nothing", row904.attendance.length, 0);

  /* -- an unpaid registration ------------------------------------------ */
  await seed("GITA-905", [QUIZ], { paid: false, phone: "9000000002" });
  const unpaid = await admitGita("GITA-905", { eventKey: QUIZ, markedBy: "admin_1" });
  check("an unpaid registration is not admitted", unpaid.status, "unpaid");

  /* -- an order that does not exist ------------------------------------ */
  const missing = await admitGita("GITA-99999", { markedBy: "admin_1" });
  check("an unknown order is not found", missing.status, "not_found");

  /* -- the desk's corrections ------------------------------------------ */
  await seed("GITA-906", [QUIZ, MAHOTSAV]);
  const marked = await setGitaAttendance("GITA-906", {
    eventKey: MAHOTSAV,
    dayKey: "2026-12-20",
    present: true,
    markedBy: "admin_2",
  });
  check("the desk can mark a day by hand", marked.length, 1);
  check("as a manual admission", marked[0].source, "manual");

  const unmarked = await setGitaAttendance("GITA-906", {
    eventKey: MAHOTSAV,
    dayKey: "2026-12-20",
    present: false,
    markedBy: "admin_2",
  });
  check("and can clear it again", unmarked.length, 0);

  /* The dashboard greys the cell, and the action refuses it too: a server
     action is a public POST whatever the table drew. */
  await seed("GITA-907", [QUIZ]);
  const refused = await setGitaAttendance("GITA-907", {
    eventKey: MAHOTSAV,
    dayKey: "2026-12-20",
    present: true,
    markedBy: "admin_2",
  });
  check("the desk cannot mark an event they did not pay for", refused.length, 0);
}

/* ---- Part four: the receipt, the email, and settling once -------------- */

async function verifyDocuments() {
  console.log("\nThe receipt and the email");

  /* A combo registration, because it is the one that has to print a list, a
     combined fee and a saving. */
  await seed("GITA-910", [QUIZ, MAHOTSAV], { phone: "9000000010" });
  const row = await GitaRegistration.findOne({ orderId: "GITA-910" }).lean();

  const receipt = await buildGitaReceipt(row);
  checkTrue("the receipt is a PDF", receipt.pdf.length > 1000);
  check("...named after the order", receipt.filename, "Receipt-GITA-910.pdf");

  const text = drawnText(receipt.pdf);
  checkSays("receipt", text, [
    "REGISTRATION RECEIPT",
    "GITA-910",
    "REGISTERED FOR",
    eventOf(QUIZ).title.en,
    eventOf(MAHOTSAV).title.en,
    /* The amount actually charged, written the way `money()` writes it — the
       standard PDF fonts have no rupee sign (see `pdf.js`). */
    `INR ${Number(festival.comboAmount).toFixed(2)}`,
    "PAID",
    "Combined saving",
    "Test Participant",
    /* Page two. If the QR failed to draw, the receipt is still issued — so the
       pass page's own wording is what proves it is there. */
    "ENTRY PASS",
  ]);

  /* The address row is drawn only for rows old enough to have been asked for
     one — the form has not taken an address since the field was dropped, and a
     receipt that printed an empty "Address" line would be worse than one that
     prints none. Both halves are checked: gone when there is nothing, and
     still there for a row that has one. */
  check(
    "a receipt with no address draws no address row",
    text.includes("Address"),
    false,
  );
  await GitaRegistration.updateOne(
    { orderId: "GITA-910" },
    { $set: { address: "Kankarbagh, Patna, 800020" } },
  );
  const older = await GitaRegistration.findOne({ orderId: "GITA-910" }).lean();
  checkSays("an older receipt still prints its address", drawnText((await buildGitaReceipt(older)).pdf), [
    "Address",
    "Kankarbagh, Patna, 800020",
  ]);

  /* A single-event registration must not claim a saving it did not get. */
  await seed("GITA-911", [QUIZ], { phone: "9000000011" });
  const single = await GitaRegistration.findOne({ orderId: "GITA-911" }).lean();
  const singleText = drawnText((await buildGitaReceipt(single)).pdf);
  check(
    "a single-event receipt claims no saving",
    singleText.includes("Combined saving"),
    false,
  );
  checkSays("single receipt", singleText, [
    `INR ${Number(eventOf(QUIZ).amount).toFixed(2)}`,
    eventOf(QUIZ).title.en,
  ]);

  /* It must not list the event they did not pay for. Asserted on the mahotsav's
     own mode line rather than its title: the festival is *called* "Gita
     Mahotsav & Gita Quiz", so its title is on every receipt's letterhead and
     searching for it would pass whatever the event list said. */
  const mahotsavOnlyLine = eventOf(MAHOTSAV).modeLabel.en;
  checkTrue("a combo receipt lists the second event's details", text.includes(mahotsavOnlyLine));
  check(
    "...and a single-event receipt does not",
    singleText.includes(mahotsavOnlyLine),
    false,
  );

  /* The email carries the group links. This is the whole delivery: the quiz
     link only ever goes out in the group. */
  const email = renderGitaRegistrationEmail({
    locale: "en",
    name: row.name,
    orderId: row.orderId,
    festivalTitle: festival.title.en,
    events: row.events.map((key) => ({
      key,
      title: eventOf(key).title.en,
      dateLabel: eventOf(key).dateLabel?.en || null,
    })),
    amount: "₹151",
    referral: null,
    statusUrl: "https://example.test/status",
    receiptUrl: "https://example.test/receipt",
    groups: whatsappGroupsFor(row.events, "en"),
    passImageUrl: "https://example.test/pass.png",
    helpline: festival.helpline,
  });

  checkTrue("the email has a subject", email.subject.includes(festival.title.en));
  for (const group of whatsappGroupsFor(row.events, "en")) {
    /* The template escapes `&` into `&amp;`, which these invite URLs are full
       of, so the stored link is checked in its escaped form — the form that
       actually reaches the inbox. */
    checkTrue(
      `the email links the ${group.key} group`,
      email.html.includes(group.url.replace(/&/g, "&amp;")),
    );
  }
  checkSays("email", email.html, ["GITA-910", "Test Participant", "https://example.test/pass.png"]);

  /* Settling is write-once. A gateway delivers the same result more than once
     — the redirect, the webhook, a refresh — and only the first writer may own
     the notifications. */
  await seed("GITA-912", [QUIZ], { paid: false, phone: "9000000012" });
  const firstWrite = await recordPaymentOutcome({
    orderId: "GITA-912",
    kind: "gita",
    lang: "en",
    status: "success",
    amount: Number(eventOf(QUIZ).amount),
    currency: "INR",
    provider: "simulated",
    paymentMode: "Simulated",
    trackingId: "SIM-1",
  });
  const secondWrite = await recordPaymentOutcome({
    orderId: "GITA-912",
    kind: "gita",
    lang: "en",
    status: "success",
    amount: Number(eventOf(QUIZ).amount),
    currency: "INR",
    provider: "simulated",
    paymentMode: "Simulated",
    trackingId: "SIM-2",
  });
  check("the pipeline finds a Gita order by its ID alone", firstWrite?.kind, "gita");
  check("the first outcome changes the row", firstWrite.changed, true);
  check("a repeated outcome does not", secondWrite.changed, false);

  const settled = await GitaRegistration.findOne({ orderId: "GITA-912" }).lean();
  check("the row is paid", settled.payment.status, "success");
  check("...by the first writer's reference", settled.payment.trackingId, "SIM-1");
  check("...with no amount mismatch", settled.payment.amountMismatch, false);

  /* The headline best practice of every gateway guide: never trust the amount
     that comes back. A wrong one must be flagged, not quietly accepted. */
  await seed("GITA-913", [QUIZ], { paid: false, phone: "9000000013" });
  await recordPaymentOutcome({
    orderId: "GITA-913",
    kind: "gita",
    lang: "en",
    status: "success",
    amount: 1,
    currency: "INR",
    provider: "simulated",
    paymentMode: "Simulated",
    trackingId: "SIM-3",
  });
  const mismatched = await GitaRegistration.findOne({ orderId: "GITA-913" }).lean();
  check("a short payment is flagged", mismatched.payment.amountMismatch, true);
}

/** The same IST day key the register uses, so "today" means one thing here. */
function istToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/* ---- Run ---------------------------------------------------------------- */

const mongod = await MongoMemoryServer.create();
process.env.MONGODB_URI = mongod.getUri();
process.env.MONGODB_DB = "verify-gita";

try {
  await dbConnect();

  verifyPricing();
  verifyRouting();
  await verifyRegister();
  await verifyDocuments();

  console.log(
    failures === 0
      ? "\nAll checks passed.\n"
      : `\n${failures} check${failures === 1 ? "" : "s"} failed.\n`,
  );
} finally {
  await mongoose.disconnect();
  await mongod.stop();
}

process.exit(failures === 0 ? 0 : 1);
