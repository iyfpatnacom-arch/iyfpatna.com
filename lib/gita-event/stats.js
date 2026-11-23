import { dbConnect } from "@/lib/db/connect";
import { addDays, istDayKey } from "@/lib/panchang";
import GitaRegistration from "@/models/GitaRegistration";
import { EVENT_KEYS, eventOf, getFestival } from "@/lib/gita-event/catalog";

/**
 * Every number /admin/registrations/gita/overview shows — counted in the
 * database, not in Node.
 *
 * The same arrangement as `lib/donations/stats.js`, and for the same reason
 * given there: the figures on the dashboard and the figures in whatever summary
 * gets sent on WhatsApp the morning after must come from one place, or they
 * will disagree the first time somebody fixes a filter in one of them.
 *
 * Why this is a separate file from the register it sits beside. The register at
 * /admin/registrations/gita loads every row and does its arithmetic in the
 * browser, which is right for what it is: a volunteer at the door searches,
 * ticks a box and exports what is on screen, and all of that wants the list in
 * memory. None of it answers "how is the campaign going". That question is
 * group-bys over the whole collection — per day, per event, per referrer, per
 * age band — and shipping the rows to the browser to answer it would mean the
 * dashboard got slower every day the festival grew more successful.
 *
 * Three rules are baked into every pipeline here and stated once:
 *
 *   Only settled money counts. `payment.status === "success"` is the whole
 *   test. Somebody who opened the gateway and closed it leaves a pending row
 *   that is real — counted here as an abandoned attempt, never as a
 *   registration and never as income.
 *
 *   A registration lands on the IST day the *form* was filled, not the day the
 *   money settled. This is the one place this file deliberately differs from
 *   the donations pipeline, which buckets by `payment.paidAt`. The question
 *   this dashboard exists to answer is whether the promotion is working — which
 *   poster, which WhatsApp forward, which day of the campaign — and that is a
 *   property of when somebody filled the form. For a registration the two are
 *   minutes apart anyway (there is no cheque to clear and nothing settled by
 *   hand), so bucketing by `createdAt` costs the revenue figures nothing and
 *   buys the signup figures their actual meaning.
 *
 *   Days are IST calendar days, derived in the pipeline with an explicit
 *   `Asia/Kolkata`, never by timezone arithmetic on a timestamp in JavaScript.
 *
 * `payment.raw`, `meta` and the notification attempt log are never read here.
 * They are the bulk of a row and nothing on the dashboard wants them.
 */

const IST = "Asia/Kolkata";

/** The one filter that decides whether a row is a registration at all. */
const PAID = { "payment.status": "success" };

/**
 * The IST day a row belongs to, as a stage.
 *
 * `createdAt` rather than `payment.paidAt` — see the note above. Derived rather
 * than stored, which costs the index on `createdAt` for the window match below;
 * deliberate, because a festival is thousands of rows at the very most and a
 * second date stored on every row is a field that can drift from the timestamp
 * it was derived from.
 */
function withDayKey() {
  return {
    $addFields: {
      dayKey: {
        $dateToString: { date: "$createdAt", format: "%Y-%m-%d", timezone: IST },
      },
    },
  };
}

/**
 * The attendance array flattened to "event:day" strings, so a pipeline can ask
 * "was this row admitted to *this* event *today*" with a single `$in`.
 *
 * The two keys have to be tested together. Testing them apart — "has an entry
 * for this event" and "has an entry for today" — answers yes for somebody who
 * came to the quiz yesterday and the mahotsav today, on both events, which is
 * the exact wrong number the two-axis register exists to avoid. Same bug the
 * verify script asserts against in `setGitaAttendance`.
 */
function withMarks() {
  return {
    $addFields: {
      marks: {
        $map: {
          input: { $ifNull: ["$attendance", []] },
          as: "entry",
          in: { $concat: ["$$entry.eventKey", ":", "$$entry.dayKey"] },
        },
      },
      eventKeys: {
        $map: { input: { $ifNull: ["$attendance", []] }, as: "entry", in: "$$entry.eventKey" },
      },
    },
  };
}

/* ---- Scopes ------------------------------------------------------------- */

export const GITA_SCOPES = ["today", "week", "all"];

/** The scope the page opens on. */
export const DEFAULT_GITA_SCOPE = "all";

/**
 * `{ from, to }` IST day keys for a named scope, or null for the whole
 * festival.
 *
 *   "today"  the IST day now in progress.
 *   "week"   the last 7 days, today included.
 *   "all"    no window — every registration this festival has taken.
 *
 * Deliberately shorter than the donations scopes, and defaulting to "all"
 * rather than to a year. A festival runs for a few weeks and then it is over:
 * the total that matters is the festival's own, and there is no financial year
 * to reconcile against because none of this is 80G income.
 */
export function gitaScopeWindow(scope, today = istDayKey()) {
  if (scope === "today") return { from: today, to: today };
  if (scope === "week") return { from: addDays(today, -6), to: today };
  return null;
}

/** The window as a `$match` stage, for pipelines that may not have one. */
function windowMatch(window) {
  return window ? [{ $match: { dayKey: { $gte: window.from, $lte: window.to } } }] : [];
}

/** Every pipeline here starts the same way: this festival, bucketed, windowed. */
function base(window, festivalSlug) {
  return [{ $match: { festivalSlug } }, withDayKey(), ...windowMatch(window)];
}

/* ---- Totals ------------------------------------------------------------- */

/**
 * The headline figures over one window: who registered, what came in, and what
 * was started and never paid for.
 *
 * One `$facet` rather than three queries. The abandoned attempts are counted
 * beside the money on purpose — a dashboard showing only paid registrations
 * hides the one number worth acting on, which is a form or a gateway quietly
 * failing on the day the posters went up.
 */
export async function gitaTotals({ scope = DEFAULT_GITA_SCOPE, today = istDayKey() } = {}) {
  await dbConnect();

  const festival = getFestival();
  const window = gitaScopeWindow(scope, today);

  const [row] = await GitaRegistration.aggregate([
    ...base(window, festival.slug),
    {
      $facet: {
        paid: [
          { $match: PAID },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              amount: { $sum: "$amount" },
              /* What the same events would have cost bought separately. The
                 gap between this and `amount` is what the combo gave away,
                 which is the only way to say what the combined fee actually
                 cost the temple. */
              fullAmount: { $sum: { $ifNull: ["$fullAmount", "$amount"] } },
              /* By phone, not by email or by name: it is the field the helpline
                 has, the one normalised to ten digits before it is stored, and
                 the one a family registering from a single handset shares. The
                 register allows one paid row per phone per festival, so this
                 should equal `count` — when it does not, something has written
                 a second paid row and that is worth seeing. */
              people: { $addToSet: "$phone" },
              combo: { $sum: { $cond: [{ $gt: [{ $size: "$events" }, 1] }, 1, 0] } },
              emailed: { $sum: { $cond: ["$notifications.emailSent", 1, 0] } },
              mismatched: { $sum: { $cond: ["$payment.amountMismatch", 1, 0] } },
              withAccount: { $sum: { $cond: [{ $ifNull: ["$clerkId", false] }, 1, 0] } },
              /* Anybody admitted to anything today, across both events. The
                 door's own number, and the only figure on the page that moves
                 while a volunteer is scanning. */
              hereToday: {
                $sum: {
                  $cond: [
                    {
                      $gt: [
                        {
                          $size: {
                            $filter: {
                              input: "$attendance",
                              as: "entry",
                              cond: { $eq: ["$$entry.dayKey", today] },
                            },
                          },
                        },
                        0,
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              lastAt: { $max: { $ifNull: ["$payment.paidAt", "$createdAt"] } },
            },
          },
          {
            $project: {
              _id: 0,
              count: 1,
              amount: 1,
              fullAmount: 1,
              peopleCount: { $size: "$people" },
              combo: 1,
              emailed: 1,
              mismatched: 1,
              withAccount: 1,
              hereToday: 1,
              lastAt: 1,
            },
          },
        ],
        /* Everything started that is not a registration. A pending row is an
           open gateway or an abandoned one, and from this side the two look
           identical until the webhook settles it. */
        unpaid: [
          { $match: { "payment.status": { $ne: "success" } } },
          { $group: { _id: "$payment.status", count: { $sum: 1 }, amount: { $sum: "$amount" } } },
        ],
        /* UPI, card, net banking — as the gateway reported it. Free text from
           the provider, so it is grouped as given and never mapped onto an
           enum of our own. */
        modes: [
          { $match: PAID },
          {
            $group: {
              _id: { $ifNull: ["$payment.paymentMode", null] },
              count: { $sum: 1 },
              amount: { $sum: "$amount" },
            },
          },
          { $sort: { count: -1 } },
        ],
      },
    },
  ]);

  const paid = row?.paid?.[0];
  const unpaid = row?.unpaid ?? [];
  const byStatus = Object.fromEntries(unpaid.map((entry) => [entry._id, entry]));

  const count = paid?.count ?? 0;
  const amount = paid?.amount ?? 0;
  const fullAmount = paid?.fullAmount ?? 0;
  const attempts = count + unpaid.reduce((total, entry) => total + entry.count, 0);

  return {
    scope,
    window,
    count,
    amount,
    fullAmount,
    /* Rounded: an average fee is read as "about this much", and the paise
       would be the only figure on the tile not true to the rupee. */
    average: count ? Math.round(amount / count) : 0,
    /* What the combined fee gave away against the two prices separately. Never
       negative — a row whose `fullAmount` was never set counts as its own
       amount, so the floor is zero rather than a nonsense saving. */
    saved: Math.max(0, fullAmount - amount),
    peopleCount: paid?.peopleCount ?? 0,
    combo: paid?.combo ?? 0,
    emailed: paid?.emailed ?? 0,
    mismatched: paid?.mismatched ?? 0,
    withAccount: paid?.withAccount ?? 0,
    hereToday: paid?.hereToday ?? 0,
    lastAt: paid?.lastAt ?? null,
    pending: {
      count: byStatus.pending?.count ?? 0,
      amount: byStatus.pending?.amount ?? 0,
    },
    failed: byStatus.failed?.count ?? 0,
    aborted: byStatus.aborted?.count ?? 0,
    attempts,
    /* Paid attempts over all attempts. The figure that says whether the form
       and the gateway are working, which no rupee total can. */
    successRate: attempts ? Math.round((count / attempts) * 100) : 0,
    modes: (row?.modes ?? []).map((entry) => ({
      mode: entry._id,
      count: entry.count,
      amount: entry.amount,
    })),
  };
}

/* ---- By event ----------------------------------------------------------- */

/**
 * How each event is selling, and how many of the people holding it have
 * actually walked through its door.
 *
 * `$unwind` on `events`, so somebody registered for both counts once under each
 * — which is what "how many are coming to the mahotsav" has to mean. The totals
 * therefore sum to more than the registration count, and the page says so.
 *
 * No revenue column, deliberately. A combo is one payment for a set, and there
 * is no honest way to split ₹151 between two events: any split is an invented
 * number that would then be summed into a total somebody quotes. `solo` is the
 * answer to the question that split was reaching for — how many people wanted
 * only this one.
 */
export async function gitaByEvent({ scope = DEFAULT_GITA_SCOPE, today = istDayKey() } = {}) {
  await dbConnect();

  const festival = getFestival();
  const window = gitaScopeWindow(scope, today);

  const rows = await GitaRegistration.aggregate([
    ...base(window, festival.slug),
    { $match: PAID },
    withMarks(),
    { $addFields: { eventCount: { $size: "$events" } } },
    { $unwind: "$events" },
    {
      $group: {
        _id: "$events",
        registrations: { $sum: 1 },
        solo: { $sum: { $cond: [{ $eq: ["$eventCount", 1] }, 1, 0] } },
        attendedEver: { $sum: { $cond: [{ $in: ["$events", "$eventKeys"] }, 1, 0] } },
        attendedToday: {
          $sum: {
            $cond: [{ $in: [{ $concat: ["$events", ":", today] }, "$marks"] }, 1, 0],
          },
        },
      },
    },
  ]);

  const byKey = new Map(rows.map((row) => [row._id, row]));

  /* Catalog order, and every event present even at zero: an event nobody has
     registered for yet is information, and a row that appears only once it
     sells moves the whole panel about as the festival runs. */
  return EVENT_KEYS.map((key) => {
    const row = byKey.get(key);
    const event = eventOf(key);
    return {
      key,
      title: event?.title ?? { en: key, hi: key },
      amount: Number(event?.amount) || 0,
      dateKey: event?.date || null,
      registrations: row?.registrations ?? 0,
      solo: row?.solo ?? 0,
      attendedEver: row?.attendedEver ?? 0,
      attendedToday: row?.attendedToday ?? 0,
    };
  });
}

/* ---- Daily series ------------------------------------------------------- */

/**
 * Registrations per IST day, as a dense series: paid, abandoned, and rupees.
 *
 * Dense — every day in the window, zeros included — because a chart with the
 * empty days left out lies about them: it draws a quiet fortnight as a busy
 * one. The database only knows about days that have rows, so the filling is
 * done here, walked forwards with a hard stop so a mistyped window cannot spin.
 *
 * `paid` and `abandoned` are the same unit and stack to the day's attempts,
 * which is what lets one chart carry both the campaign and its drop-off
 * without a second axis.
 */
export async function gitaDaily({ from, to = istDayKey(), maxDays = 400 } = {}) {
  await dbConnect();

  const festival = getFestival();
  const start = from || addDays(to, -29);

  const rows = await GitaRegistration.aggregate([
    { $match: { festivalSlug: festival.slug } },
    withDayKey(),
    { $match: { dayKey: { $gte: start, $lte: to } } },
    {
      $group: {
        _id: "$dayKey",
        paid: { $sum: { $cond: [{ $eq: ["$payment.status", "success"] }, 1, 0] } },
        abandoned: { $sum: { $cond: [{ $ne: ["$payment.status", "success"] }, 1, 0] } },
        amount: {
          $sum: { $cond: [{ $eq: ["$payment.status", "success"] }, "$amount", 0] },
        },
      },
    },
  ]);

  const byDay = new Map(rows.map((row) => [row._id, row]));
  const series = [];

  for (let day = start, guard = 0; day <= to && guard < maxDays; guard += 1) {
    const row = byDay.get(day);
    series.push({
      dayKey: day,
      paid: row?.paid ?? 0,
      abandoned: row?.abandoned ?? 0,
      amount: row?.amount ?? 0,
    });
    day = addDays(day, 1);
  }

  return series;
}

/* ---- Who is registering ------------------------------------------------- */

/** The age bands the temple plans seating and the quiz difficulty around. */
export const AGE_BANDS = ["u18", "18_24", "25_34", "35_49", "50_plus", "unknown"];

/**
 * Who is coming, by the four things the form asks: what they do, their gender,
 * their age and which language they filled the form in.
 *
 * One `$facet`, because all four are the same window over the same rows and
 * four round trips for four group-bys would be three too many.
 *
 * Every breakdown carries an explicit "not given" bucket rather than dropping
 * the blanks. Age is optional on the form and gender was not always asked, so a
 * panel that silently excluded them would show percentages of a denominator
 * that is not the registration count — the quiet way a dashboard starts lying.
 */
export async function gitaDemographics({ scope = DEFAULT_GITA_SCOPE, today = istDayKey() } = {}) {
  await dbConnect();

  const festival = getFestival();
  const window = gitaScopeWindow(scope, today);

  const tally = (field) => [
    { $group: { _id: { $ifNull: [`$${field}`, null] }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ];

  const [row] = await GitaRegistration.aggregate([
    ...base(window, festival.slug),
    { $match: PAID },
    {
      $facet: {
        occupation: tally("occupation"),
        gender: tally("gender"),
        locale: tally("locale"),
        age: [
          {
            $addFields: {
              band: {
                $switch: {
                  branches: [
                    { case: { $not: [{ $ifNull: ["$age", false] }] }, then: "unknown" },
                    { case: { $lt: ["$age", 18] }, then: "u18" },
                    { case: { $lt: ["$age", 25] }, then: "18_24" },
                    { case: { $lt: ["$age", 35] }, then: "25_34" },
                    { case: { $lt: ["$age", 50] }, then: "35_49" },
                  ],
                  default: "50_plus",
                },
              },
            },
          },
          { $group: { _id: "$band", count: { $sum: 1 } } },
        ],
      },
    },
  ]);

  const list = (entries) =>
    (entries ?? []).map((entry) => ({ key: entry._id, count: entry.count }));

  /* Age comes back in whatever order the groups formed; bands are an ordered
     scale and have to read youngest to oldest, with "not given" last. */
  const ages = new Map((row?.age ?? []).map((entry) => [entry._id, entry.count]));

  return {
    occupation: list(row?.occupation),
    gender: list(row?.gender),
    locale: list(row?.locale),
    age: AGE_BANDS.map((key) => ({ key, count: ages.get(key) ?? 0 })).filter(
      (band) => band.count > 0,
    ),
  };
}

/* ---- Reach -------------------------------------------------------------- */

/**
 * The free-text fields, grouped: who referred people, and where they come from.
 *
 * Both are grouped on a trimmed, lower-cased, whitespace-collapsed key and
 * labelled with the spelling the *latest* row used. "Rohit", "rohit " and
 * "ROHIT" are one volunteer; without the normalisation the thank-you list has
 * him on it three times with a third of his count each.
 *
 * `$last` after a sort on `createdAt` for the label, for the same reason the
 * donor list takes the latest name: somebody who corrected a spelling meant
 * the correction.
 *
 * This is a reach report and a thank-you list, not a foreign key. Nothing here
 * joins to a volunteer record, because the field never promised to match one —
 * see the note on `referral` in the model.
 */
async function textTally(field, { scope, today, limit }) {
  await dbConnect();

  const festival = getFestival();
  const window = gitaScopeWindow(scope, today);

  const rows = await GitaRegistration.aggregate([
    ...base(window, festival.slug),
    { $match: { ...PAID, [field]: { $nin: [null, ""] } } },
    { $sort: { createdAt: 1 } },
    {
      $addFields: {
        /* Collapse runs of whitespace as well as trimming the ends, so
           "St Xavier's  College" and "St Xavier's College" are one row. */
        groupKey: {
          $toLower: {
            $trim: {
              input: {
                $reduce: {
                  input: { $split: [{ $ifNull: [`$${field}`, ""] }, " "] },
                  initialValue: "",
                  in: {
                    $cond: [
                      { $eq: ["$$this", ""] },
                      "$$value",
                      { $concat: ["$$value", " ", "$$this"] },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    },
    { $match: { groupKey: { $ne: "" } } },
    {
      $group: {
        _id: "$groupKey",
        label: { $last: `$${field}` },
        count: { $sum: 1 },
        amount: { $sum: "$amount" },
        lastAt: { $max: "$createdAt" },
      },
    },
    { $sort: { count: -1, lastAt: -1 } },
    { $limit: limit },
    { $project: { _id: 0, key: "$_id", label: 1, count: 1, amount: 1, lastAt: 1 } },
  ]);

  return rows;
}

export function gitaReferrals({ scope = DEFAULT_GITA_SCOPE, today = istDayKey(), limit = 12 } = {}) {
  return textTally("referral", { scope, today, limit });
}

export function gitaInstitutions({
  scope = DEFAULT_GITA_SCOPE,
  today = istDayKey(),
  limit = 12,
} = {}) {
  return textTally("institution", { scope, today, limit });
}

/**
 * How many paid rows named a referrer at all, over the window.
 *
 * Beside the leaderboard rather than inside it, because the leaderboard is a
 * top-twelve and cannot say what share of the festival it covers. "Forty of
 * ninety said who sent them" is the figure that tells somebody whether the
 * list above is worth acting on.
 */
export async function gitaReferralCoverage({
  scope = DEFAULT_GITA_SCOPE,
  today = istDayKey(),
} = {}) {
  await dbConnect();

  const festival = getFestival();
  const window = gitaScopeWindow(scope, today);

  const [row] = await GitaRegistration.aggregate([
    ...base(window, festival.slug),
    { $match: PAID },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        withReferral: {
          $sum: { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ["$referral", ""] } }, 0] }, 1, 0] },
        },
        withInstitution: {
          $sum: { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ["$institution", ""] } }, 0] }, 1, 0] },
        },
      },
    },
  ]);

  return {
    count: row?.count ?? 0,
    withReferral: row?.withReferral ?? 0,
    withInstitution: row?.withInstitution ?? 0,
  };
}

/* ---- The live feed ------------------------------------------------------ */

/**
 * Every registration for this festival, newest first, whatever its payment
 * came to.
 *
 * Unwindowed on purpose. A scope of "today" on a quiet morning would leave this
 * panel empty, and an empty panel is indistinguishable from a broken one — the
 * feed's job is to prove the form is alive, so it always shows the real rows
 * and labels when they arrived.
 *
 * Pending and failed rows are in it for the same reason: the newest row being a
 * failure is exactly the thing somebody should see within the minute.
 *
 * The whole list rather than the newest few, because this panel is also the one
 * place in the admin that answers "who has registered so far" without an export
 * — the table it feeds scrolls inside its own box, so the page does not grow
 * with the campaign. `limit` is still honoured when a caller passes a positive
 * number; left out, there is no cap.
 */
export async function gitaRecent({ limit = null } = {}) {
  await dbConnect();

  const festival = getFestival();

  let query = GitaRegistration.find({ festivalSlug: festival.slug })
    .select("orderId name phone events amount createdAt payment.status payment.paidAt")
    .sort({ createdAt: -1 });

  if (Number.isFinite(limit) && limit > 0) query = query.limit(limit);

  const rows = await query.lean();

  return rows.map((row) => ({
    orderId: row.orderId,
    name: row.name,
    phone: row.phone,
    events: row.events || [],
    amount: row.amount,
    status: row.payment?.status || "pending",
    createdAt: new Date(row.createdAt).toISOString(),
    paidAt: row.payment?.paidAt ? new Date(row.payment.paidAt).toISOString() : null,
  }));
}

/* ---- The admin's overview ----------------------------------------------- */

/**
 * Everything the overview page needs, in one round trip's worth of parallel
 * queries.
 *
 * Gathered here rather than in the page so the page stays a layout — and so the
 * same figures are available to anything else that ever wants them, a
 * morning-after summary on WhatsApp being the obvious candidate.
 *
 * The chart's window is deliberately not the scope's. "Today" is one bar, which
 * is not a chart, so the plot is always the campaign so far — from the first
 * registration, or the last thirty days, whichever is shorter — and says so,
 * whatever the tiles above it are scoped to.
 */
export async function adminGitaOverview({ scope = DEFAULT_GITA_SCOPE } = {}) {
  await dbConnect();
  const today = istDayKey();

  const [totals, todayTotals, events, series, referrals, institutions, coverage, recent] =
    await Promise.all([
      gitaTotals({ scope, today }),
      gitaTotals({ scope: "today", today }),
      gitaByEvent({ scope, today }),
      gitaDaily({ from: addDays(today, -29), to: today }),
      gitaReferrals({ scope, today }),
      gitaInstitutions({ scope, today }),
      gitaReferralCoverage({ scope, today }),
      gitaRecent(),
    ]);

  /* Demographics after the rest rather than beside it: it is the one query with
     four group-bys in a facet, nothing above it depends on the result, and the
     dashboard reads the same whether it took 20ms or 200. */
  const demographics = await gitaDemographics({ scope, today });

  return {
    today,
    scope,
    totals,
    todayTotals,
    events,
    series,
    referrals,
    institutions,
    coverage,
    demographics,
    recent,
  };
}
