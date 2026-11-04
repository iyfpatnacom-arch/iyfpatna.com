import { dbConnect } from "@/lib/db/connect";
import { addDays, istDayKey } from "@/lib/panchang";
import { GITA_MARATHON } from "@/lib/site-config";
import BookSale from "@/models/BookSale";
import CashSettlement from "@/models/CashSettlement";
import MarathonVolunteer from "@/models/MarathonVolunteer";

/**
 * Every number the marathon screens show — counted in the database, not in
 * Node.
 *
 * Three surfaces read from here: a volunteer's own dashboard, the leaderboard
 * everybody can see, and the coordinator's overview. They must agree. If each
 * one fetched rows and summed them itself, they would agree right up until
 * somebody fixed a filter in one place, which is how a volunteer ends up
 * arguing with a leaderboard about their own total.
 *
 * Two rules are baked into every pipeline here and stated once:
 *
 *   Only paid sales count. `payment.status === "success"` is the whole test,
 *   and it is true of a cash sale from the moment it is recorded and of an
 *   online one only once Razorpay has confirmed it. An abandoned QR is a row
 *   nobody is ever credited for.
 *
 *   Days are IST calendar days. `dayKey` is stored on the row precisely so
 *   that no aggregation has to do timezone arithmetic on a timestamp, and
 *   none of them do.
 */

/** The one filter that decides whether a row is real money. */
const PAID = { "payment.status": "success" };

/**
 * The window the marathon's standings are kept over.
 *
 * Scoped rather than all-time because it is a marathon: a volunteer who
 * distributed four hundred books last December is not ahead in this one. The
 * dates come from `GITA_MARATHON`, so moving next year's drive is one edit.
 */
export function marathonWindow() {
  return { $gte: GITA_MARATHON.start, $lte: GITA_MARATHON.end };
}

/**
 * `dayKey` filter for a named scope.
 *
 *   "today"     the IST day now in progress.
 *   "marathon"  the published window.
 *   "all"       no filter at all, for the coordinator reconciling a stray day
 *               recorded outside the window.
 */
export function scopeFilter(scope, today = istDayKey()) {
  if (scope === "today") return { dayKey: today };
  if (scope === "all") return {};
  return { dayKey: marathonWindow() };
}

/* ---- Leaderboard -------------------------------------------------------- */

/**
 * Who has distributed how much, most books first.
 *
 * Books rather than rupees is the ranking, deliberately. The two differ —
 * English copies cost ₹50 more — and a board ranked on money would quietly
 * tell volunteers to push the expensive edition at somebody who wanted the
 * Hindi one. The money is shown; the books are the rank.
 *
 * Ties are broken by amount and then by who got there first, so the order is
 * stable between renders rather than whatever Mongo felt like returning.
 */
export async function leaderboard({ scope = "marathon", limit = 100 } = {}) {
  await dbConnect();

  return BookSale.aggregate([
    { $match: { ...PAID, ...scopeFilter(scope) } },
    {
      $group: {
        _id: "$volunteerClerkId",
        name: { $last: "$volunteerName" },
        books: { $sum: "$quantity" },
        amount: { $sum: "$amount" },
        sales: { $sum: 1 },
        cashAmount: {
          $sum: { $cond: [{ $eq: ["$method", "cash"] }, "$amount", 0] },
        },
        onlineAmount: {
          $sum: { $cond: [{ $eq: ["$method", "online"] }, "$amount", 0] },
        },
        cashBooks: {
          $sum: { $cond: [{ $eq: ["$method", "cash"] }, "$quantity", 0] },
        },
        onlineBooks: {
          $sum: { $cond: [{ $eq: ["$method", "online"] }, "$quantity", 0] },
        },
        firstAt: { $min: "$createdAt" },
        lastAt: { $max: "$createdAt" },
      },
    },
    { $sort: { books: -1, amount: -1, firstAt: 1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        clerkId: "$_id",
        name: 1,
        books: 1,
        amount: 1,
        sales: 1,
        cashAmount: 1,
        onlineAmount: 1,
        cashBooks: 1,
        onlineBooks: 1,
        lastAt: 1,
      },
    },
  ]);
}

/**
 * One volunteer's place on that board, and their own totals.
 *
 * The rank is computed from the same aggregation rather than from a second,
 * narrower one: a volunteer looking at "#7" and a board that puts them eighth
 * is the kind of discrepancy that costs more trust than the feature is worth.
 * The board is at most a few hundred rows.
 */
export async function volunteerStanding(clerkId, { scope = "marathon" } = {}) {
  const rows = await leaderboard({ scope, limit: 1000 });
  const index = rows.findIndex((row) => row.clerkId === clerkId);

  return {
    rank: index === -1 ? null : index + 1,
    total: rows.length,
    row:
      index === -1
        ? {
            clerkId,
            books: 0,
            amount: 0,
            sales: 0,
            cashAmount: 0,
            onlineAmount: 0,
            cashBooks: 0,
            onlineBooks: 0,
          }
        : rows[index],
    /* The volunteer immediately ahead, which is the only comparison that
       actually moves anybody: "you are 320 books behind the leader" does not. */
    ahead: index > 0 ? rows[index - 1] : null,
  };
}

/* ---- Daily series ------------------------------------------------------- */

/**
 * Books and rupees per IST day, split by how they were paid for.
 *
 * Returned as a dense series — every day in the range, zeros included —
 * because a chart with gaps in it lies about the days nobody went out. The
 * database only knows about days that have rows, so the filling is done here.
 */
export async function dailySeries({
  from,
  to = istDayKey(),
  clerkId = null,
} = {}) {
  await dbConnect();

  const start = from || GITA_MARATHON.start;

  const rows = await BookSale.aggregate([
    {
      $match: {
        ...PAID,
        dayKey: { $gte: start, $lte: to },
        ...(clerkId ? { volunteerClerkId: clerkId } : {}),
      },
    },
    {
      $group: {
        _id: "$dayKey",
        books: { $sum: "$quantity" },
        amount: { $sum: "$amount" },
        cashAmount: {
          $sum: { $cond: [{ $eq: ["$method", "cash"] }, "$amount", 0] },
        },
        onlineAmount: {
          $sum: { $cond: [{ $eq: ["$method", "online"] }, "$amount", 0] },
        },
      },
    },
  ]);

  const byDay = new Map(rows.map((row) => [row._id, row]));
  const series = [];

  /* Walked forwards from `start` with a hard stop, so a mistyped range can
     never spin here. 400 days is longer than any marathon and shorter than a
     hang. */
  for (let day = start, guard = 0; day <= to && guard < 400; guard += 1) {
    const row = byDay.get(day);
    series.push({
      dayKey: day,
      books: row?.books ?? 0,
      amount: row?.amount ?? 0,
      cashAmount: row?.cashAmount ?? 0,
      onlineAmount: row?.onlineAmount ?? 0,
    });
    day = addDays(day, 1);
  }

  return series;
}

/* ---- Totals ------------------------------------------------------------- */

/** Books, rupees and the cash/online split over one scope. */
export async function totals({ scope = "marathon", clerkId = null } = {}) {
  await dbConnect();

  const [row] = await BookSale.aggregate([
    {
      $match: {
        ...PAID,
        ...scopeFilter(scope),
        ...(clerkId ? { volunteerClerkId: clerkId } : {}),
      },
    },
    {
      $group: {
        _id: null,
        books: { $sum: "$quantity" },
        amount: { $sum: "$amount" },
        sales: { $sum: 1 },
        cashAmount: {
          $sum: { $cond: [{ $eq: ["$method", "cash"] }, "$amount", 0] },
        },
        onlineAmount: {
          $sum: { $cond: [{ $eq: ["$method", "online"] }, "$amount", 0] },
        },
        hindi: {
          $sum: {
            $reduce: {
              input: "$items",
              initialValue: 0,
              in: {
                $add: [
                  "$$value",
                  {
                    $cond: [
                      { $eq: ["$$this.language", "hi"] },
                      "$$this.quantity",
                      0,
                    ],
                  },
                ],
              },
            },
          },
        },
        english: {
          $sum: {
            $reduce: {
              input: "$items",
              initialValue: 0,
              in: {
                $add: [
                  "$$value",
                  {
                    $cond: [
                      { $eq: ["$$this.language", "en"] },
                      "$$this.quantity",
                      0,
                    ],
                  },
                ],
              },
            },
          },
        },
      },
    },
  ]);

  return {
    books: row?.books ?? 0,
    amount: row?.amount ?? 0,
    sales: row?.sales ?? 0,
    cashAmount: row?.cashAmount ?? 0,
    onlineAmount: row?.onlineAmount ?? 0,
    hindi: row?.hindi ?? 0,
    english: row?.english ?? 0,
  };
}

/* ---- Cash in hand ------------------------------------------------------- */

/**
 * The cash one volunteer has taken on one day and not yet handed over.
 *
 * `settlementId: null` is the whole definition: a sale joins a settlement when
 * the day's cash is submitted, so anything still unattached is money in a
 * pocket. That is why this cannot be "all of today's cash sales" — a volunteer
 * who settles at 6pm and sells three more books at 8pm owes for three books,
 * not for the day.
 */
export async function unsettledCash(clerkId, dayKey = istDayKey()) {
  await dbConnect();

  const rows = await BookSale.find({
    volunteerClerkId: clerkId,
    dayKey,
    method: "cash",
    settlementId: null,
    ...PAID,
  })
    .select("_id amount quantity createdAt")
    .sort({ createdAt: 1 })
    .lean();

  return {
    dayKey,
    saleIds: rows.map((row) => row._id),
    count: rows.length,
    books: rows.reduce((total, row) => total + row.quantity, 0),
    amount: rows.reduce((total, row) => total + row.amount, 0),
  };
}

/* ---- The coordinator's overview ----------------------------------------- */

/**
 * Everything /admin/gita-marathon needs, in one round trip's worth of
 * parallel queries.
 *
 * Gathered here rather than in the page so the page stays a layout, and so
 * the same figures are available to anything else that ever needs them — a
 * nightly WhatsApp summary being the obvious candidate.
 */
export async function adminOverview({ scope = "marathon" } = {}) {
  await dbConnect();
  const today = istDayKey();

  const [
    scoped,
    todayTotals,
    board,
    series,
    volunteerCounts,
    cashQueue,
    varianceRow,
  ] = await Promise.all([
    totals({ scope }),
    totals({ scope: "today" }),
    leaderboard({ scope }),
    dailySeries({ to: today }),
    MarathonVolunteer.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    CashSettlement.countDocuments({ status: "submitted" }),
    CashSettlement.aggregate([
      { $match: { status: "verified" } },
      {
        $group: {
          _id: null,
          variance: { $sum: "$variance" },
          verified: { $sum: "$receivedAmount" },
        },
      },
    ]),
  ]);

  const byStatus = Object.fromEntries(
    volunteerCounts.map((row) => [row._id, row.count]),
  );

  return {
    today,
    scope,
    totals: scoped,
    todayTotals,
    leaderboard: board,
    series,
    volunteers: {
      pending: byStatus.pending ?? 0,
      active: byStatus.active ?? 0,
      suspended: byStatus.suspended ?? 0,
    },
    cash: {
      awaitingVerification: cashQueue,
      verifiedAmount: varianceRow[0]?.verified ?? 0,
      /* Positive is cash the desk counted over what the sales said; negative
         is a shortfall. Summed across every verified day, because the figure
         worth watching is the running one. */
      variance: varianceRow[0]?.variance ?? 0,
    },
  };
}
