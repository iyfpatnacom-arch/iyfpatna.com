import { dbConnect } from "@/lib/db/connect";
import { addDays, istDayKey } from "@/lib/panchang";
import Donation from "@/models/Donation";
import BookSale from "@/models/BookSale";
import Enrollment from "@/models/Enrollment";

/**
 * Every number /admin/donations shows — counted in the database, not in Node.
 *
 * The same arrangement as `lib/marathon/stats.js`, and for the same reason:
 * the figures on the dashboard, the figures in a year-end report and the
 * figures in whatever summary gets sent on WhatsApp next festival must come
 * from one place, or they will disagree the first time somebody fixes a filter
 * in one of them.
 *
 * Three rules are baked into every pipeline here and stated once:
 *
 *   Only settled money counts. `payment.status === "success"` is the whole
 *   test. A donor who opened the gateway and closed it leaves a pending row
 *   that is real — counted here as an abandoned attempt, never as income.
 *
 *   A donation lands on the day the money did, not the day the form was
 *   filled. `payment.paidAt` is what every total is bucketed by, falling back
 *   to `createdAt` for a row that has none (an abandoned attempt, or anything
 *   settled by hand). That is what makes a financial-year total here match the
 *   one the trust files.
 *
 *   Days are IST calendar days. Unlike a book sale, a donation row carries no
 *   `dayKey` — nobody records one at a stall — so the key is derived in the
 *   pipeline with an explicit `Asia/Kolkata`, never by timezone arithmetic on
 *   a timestamp in JavaScript.
 *
 * `payment.raw` and `meta` are never read here. They are the bulk of a row and
 * nothing on the dashboard wants them.
 */

const IST = "Asia/Kolkata";

/** The one filter that decides whether a row is real money. */
const PAID = { "payment.status": "success" };

/**
 * The IST day a row's money belongs to, as a stage.
 *
 * Derived rather than stored, which costs the index on `createdAt` for the
 * window match below. Deliberate: a donation collection is thousands of rows,
 * not millions, and a second date stored on every row is a field that can
 * drift from the timestamp it was derived from.
 */
function withDayKey() {
  return {
    $addFields: {
      dayKey: {
        $dateToString: {
          date: { $ifNull: ["$payment.paidAt", "$createdAt"] },
          format: "%Y-%m-%d",
          timezone: IST,
        },
      },
    },
  };
}

/* ---- Scopes ------------------------------------------------------------- */

export const DONATION_SCOPES = ["today", "month", "fy", "all"];

/**
 * The Indian financial year a day falls in, as the day it starts.
 *
 * April to March, because that is the year the trust files Form 10BE against
 * and the only year-shaped total a treasurer ever asks for. A donation made on
 * the 31st of March belongs to the year that is ending — exactly the boundary
 * a calendar year gets wrong.
 */
export function financialYearStart(dayKey = istDayKey()) {
  const [year, month] = dayKey.split("-").map(Number);
  return `${month >= 4 ? year : year - 1}-04-01`;
}

/**
 * `{ from, to }` IST day keys for a named scope, or null for all time.
 *
 *   "today"  the IST day now in progress.
 *   "month"  the last 30 days, today included.
 *   "fy"     the financial year in progress.
 *   "all"    no window at all — the trust's own running total.
 */
export function scopeWindow(scope, today = istDayKey()) {
  if (scope === "today") return { from: today, to: today };
  if (scope === "month") return { from: addDays(today, -29), to: today };
  if (scope === "fy") return { from: financialYearStart(today), to: today };
  return null;
}

/** The window as a `$match` stage, for pipelines that may not have one. */
function windowMatch(window) {
  return window
    ? [{ $match: { dayKey: { $gte: window.from, $lte: window.to } } }]
    : [];
}

/* ---- Totals ------------------------------------------------------------- */

/**
 * The headline figures over one window: what came in, from how many people,
 * and what was attempted and never paid.
 *
 * One `$facet` rather than three queries. The attempts are counted beside the
 * money on purpose — a dashboard showing only settled donations hides the one
 * number worth acting on, which is a gateway quietly failing.
 */
export async function donationTotals({ scope = "fy", today = istDayKey() } = {}) {
  await dbConnect();

  const window = scopeWindow(scope, today);

  const [row] = await Donation.aggregate([
    withDayKey(),
    ...windowMatch(window),
    {
      $facet: {
        paid: [
          { $match: PAID },
          {
            $group: {
              _id: null,
              amount: { $sum: "$amount" },
              count: { $sum: 1 },
              /* By phone, not by email or by name: it is the field the
                 helpline has, the one normalised to ten digits before it is
                 stored, and the one a family giving from a single handset
                 actually shares. Two gifts from one phone are one donor. */
              donors: { $addToSet: "$phone" },
              largest: { $max: "$amount" },
              withPan: {
                $sum: { $cond: [{ $ifNull: ["$pan", false] }, 1, 0] },
              },
              emailed: {
                $sum: { $cond: ["$notifications.emailSent", 1, 0] },
              },
              mismatched: {
                $sum: { $cond: ["$payment.amountMismatch", 1, 0] },
              },
            },
          },
          {
            $project: {
              _id: 0,
              amount: 1,
              count: 1,
              donorCount: { $size: "$donors" },
              largest: 1,
              withPan: 1,
              emailed: 1,
              mismatched: 1,
            },
          },
        ],
        /* Everything started that is not money. A pending row is an open
           gateway or an abandoned one, and from this side the two look the
           same until the webhook settles it. */
        unpaid: [
          { $match: { "payment.status": { $ne: "success" } } },
          {
            $group: {
              _id: "$payment.status",
              count: { $sum: 1 },
              amount: { $sum: "$amount" },
            },
          },
        ],
        /* UPI, card, net banking — as the gateway reported it. Free text from
           Razorpay, so it is grouped as given and never mapped onto an enum. */
        modes: [
          { $match: PAID },
          {
            $group: {
              _id: { $ifNull: ["$payment.paymentMode", null] },
              amount: { $sum: "$amount" },
              count: { $sum: 1 },
            },
          },
          { $sort: { amount: -1 } },
        ],
      },
    },
  ]);

  const paid = row?.paid?.[0];
  const unpaid = row?.unpaid ?? [];
  const byStatus = Object.fromEntries(unpaid.map((entry) => [entry._id, entry]));

  const amount = paid?.amount ?? 0;
  const count = paid?.count ?? 0;
  const attempts = count + unpaid.reduce((total, entry) => total + entry.count, 0);

  return {
    scope,
    window,
    amount,
    count,
    donorCount: paid?.donorCount ?? 0,
    largest: paid?.largest ?? 0,
    /* Rounded: an average gift is read as "about this much", and the paise
       would be the only figure on the tile not true to the rupee. */
    average: count ? Math.round(amount / count) : 0,
    withPan: paid?.withPan ?? 0,
    emailed: paid?.emailed ?? 0,
    mismatched: paid?.mismatched ?? 0,
    pending: {
      count: byStatus.pending?.count ?? 0,
      amount: byStatus.pending?.amount ?? 0,
    },
    failed: byStatus.failed?.count ?? 0,
    aborted: byStatus.aborted?.count ?? 0,
    attempts,
    /* Settled attempts over all attempts. The figure that says whether the
       form and the gateway are working, which no amount can. */
    successRate: attempts ? Math.round((count / attempts) * 100) : 0,
    modes: (row?.modes ?? []).map((entry) => ({
      mode: entry._id,
      amount: entry.amount,
      count: entry.count,
    })),
  };
}

/* ---- By seva ------------------------------------------------------------ */

/**
 * What each seva took, most money first.
 *
 * Grouped by `sevaKey` and labelled with the title as the latest row recorded
 * it, so a seva reworded mid-year stays one line instead of becoming two. The
 * key is what it is grouped by precisely because the wording is not stable —
 * see the snapshot note on the `Donation` model.
 */
export async function donationsBySeva({ scope = "fy", today = istDayKey() } = {}) {
  await dbConnect();

  const window = scopeWindow(scope, today);

  return Donation.aggregate([
    withDayKey(),
    ...windowMatch(window),
    { $match: PAID },
    { $sort: { createdAt: 1 } },
    {
      $group: {
        _id: "$sevaKey",
        slug: { $last: "$sevaSlug" },
        title: { $last: "$sevaTitle" },
        amount: { $sum: "$amount" },
        count: { $sum: 1 },
        donors: { $addToSet: "$phone" },
        largest: { $max: "$amount" },
        lastAt: { $max: { $ifNull: ["$payment.paidAt", "$createdAt"] } },
      },
    },
    { $sort: { amount: -1, count: -1 } },
    {
      $project: {
        _id: 0,
        key: "$_id",
        slug: 1,
        title: 1,
        amount: 1,
        count: 1,
        donorCount: { $size: "$donors" },
        largest: 1,
        lastAt: 1,
      },
    },
  ]);
}

/* ---- Daily series ------------------------------------------------------- */

/**
 * Rupees and offerings per IST day, as a dense series.
 *
 * Dense — every day in the window, zeros included — because a chart with the
 * empty days left out lies about them: it draws a quiet fortnight as a busy
 * one. The database only knows about days that have rows, so the filling is
 * done here, walked forwards with a hard stop so a mistyped window cannot
 * spin.
 */
export async function donationsDaily({ from, to = istDayKey(), maxDays = 400 } = {}) {
  await dbConnect();

  const start = from || addDays(to, -29);

  const rows = await Donation.aggregate([
    withDayKey(),
    { $match: { ...PAID, dayKey: { $gte: start, $lte: to } } },
    {
      $group: {
        _id: "$dayKey",
        amount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);

  const byDay = new Map(rows.map((row) => [row._id, row]));
  const series = [];

  for (let day = start, guard = 0; day <= to && guard < maxDays; guard += 1) {
    const row = byDay.get(day);
    series.push({
      dayKey: day,
      amount: row?.amount ?? 0,
      count: row?.count ?? 0,
    });
    day = addDays(day, 1);
  }

  return series;
}

/* ---- Donors ------------------------------------------------------------- */

/**
 * Who has given the most over one window.
 *
 * By phone for the reason given above, and carrying the latest name and email
 * rather than the first: a donor who corrected the spelling of their own name
 * on a second gift meant the correction.
 *
 * This is the list the temple acts on — the people worth a call before the
 * next festival — so it carries how many times somebody gave as well as how
 * much, which is the difference between a large one-off and a regular.
 */
export async function topDonors({ scope = "fy", today = istDayKey(), limit = 25 } = {}) {
  await dbConnect();

  const window = scopeWindow(scope, today);

  return Donation.aggregate([
    withDayKey(),
    ...windowMatch(window),
    { $match: PAID },
    { $sort: { createdAt: 1 } },
    {
      $group: {
        _id: "$phone",
        name: { $last: "$name" },
        email: { $last: "$email" },
        pan: { $last: "$pan" },
        amount: { $sum: "$amount" },
        gifts: { $sum: 1 },
        sevas: { $addToSet: "$sevaKey" },
        firstAt: { $min: { $ifNull: ["$payment.paidAt", "$createdAt"] } },
        lastAt: { $max: { $ifNull: ["$payment.paidAt", "$createdAt"] } },
      },
    },
    { $sort: { amount: -1, gifts: -1, firstAt: 1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        phone: "$_id",
        name: 1,
        email: 1,
        pan: 1,
        amount: 1,
        gifts: 1,
        sevaCount: { $size: "$sevas" },
        lastAt: 1,
      },
    },
  ]);
}

/* ---- Money that is not a donation --------------------------------------- */

/**
 * The other two things this site takes money for, over the same window.
 *
 * On this page because "how much came in through the site" is the question an
 * admin arrives with, and a donations page answering only part of it would be
 * quietly wrong. Kept in its own row, labelled as not donations, and never
 * added into the totals above: a book sold at a stall and a course fee are
 * receipts, not offerings — neither is 80G-deductible, and neither may end up
 * inside a figure the trust reports as donation income.
 *
 * Each is a link to the screen that owns it. A cross-reference, not a second
 * dashboard.
 */
export async function otherIncome({ scope = "fy", today = istDayKey() } = {}) {
  await dbConnect();

  const window = scopeWindow(scope, today);

  const [books, courses] = await Promise.all([
    /* A book sale carries its own IST `dayKey`, written when the sale is
       recorded — including for cash taken on a footpath, which never passes
       through a gateway at all — so it is matched on that rather than on a
       derived one. */
    BookSale.aggregate([
      {
        $match: {
          ...PAID,
          ...(window ? { dayKey: { $gte: window.from, $lte: window.to } } : {}),
        },
      },
      {
        $group: {
          _id: null,
          amount: { $sum: "$amount" },
          count: { $sum: 1 },
          books: { $sum: "$quantity" },
        },
      },
    ]),
    Enrollment.aggregate([
      withDayKey(),
      ...windowMatch(window),
      { $match: PAID },
      { $group: { _id: null, amount: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]),
  ]);

  return {
    books: {
      amount: books[0]?.amount ?? 0,
      count: books[0]?.count ?? 0,
      books: books[0]?.books ?? 0,
    },
    courses: {
      amount: courses[0]?.amount ?? 0,
      count: courses[0]?.count ?? 0,
    },
  };
}

/* ---- The admin's overview ----------------------------------------------- */

/**
 * Everything /admin/donations needs, in one round trip's worth of parallel
 * queries.
 *
 * Gathered here rather than in the page so the page stays a layout — and so
 * the same figures are available to anything else that ever wants them, a
 * month-end summary being the obvious candidate.
 *
 * The chart's window is deliberately not the scope's. "Today" is one bar,
 * which is not a chart, and all time is an axis nobody can read on a phone, so
 * the plot is always the last thirty days and says so, whatever the tiles
 * above it are scoped to.
 */
export async function adminDonationOverview({ scope = "fy" } = {}) {
  await dbConnect();
  const today = istDayKey();

  const [totals, todayTotals, sevas, series, donors, other] = await Promise.all([
    donationTotals({ scope, today }),
    donationTotals({ scope: "today", today }),
    donationsBySeva({ scope, today }),
    donationsDaily({ from: addDays(today, -29), to: today }),
    topDonors({ scope, today }),
    otherIncome({ scope, today }),
  ]);

  return { today, scope, totals, todayTotals, sevas, series, donors, other };
}
