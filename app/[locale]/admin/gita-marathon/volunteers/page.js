import { setRequestLocale, getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Panel } from "@/components/site/Panel";
import { MarathonVolunteers } from "@/components/admin/MarathonVolunteers";
import { Link } from "@/i18n/navigation";
import {
  clerkConfigured,
  getAdminUser,
  redirectSignedOut,
} from "@/lib/auth-config";
import { dbConnect } from "@/lib/db/connect";
import { stockList } from "@/lib/marathon/books";
import { leaderboard } from "@/lib/marathon/stats";
import BookSale from "@/models/BookSale";
import MarathonVolunteer from "@/models/MarathonVolunteer";

/**
 * /admin/gita-marathon/volunteers — who may sell.
 *
 * The whole list is loaded and grouped here, with each volunteer's book count
 * joined on from the leaderboard aggregation rather than queried per row. A
 * marathon has tens of volunteers, so the join is a Map lookup; doing it per
 * card would be one aggregation per volunteer on every render.
 *
 * The trolleys are counted the same way: one aggregation over every sale,
 * grouped by volunteer and title, turned into a Map and handed to
 * `stockList` per row. What is left of a consignment is counted from the
 * sales rather than stored, so this is the query that answers it — see
 * `lib/marathon/stock.js`, which does the same thing for one volunteer.
 *
 * Grouped rather than filtered, because the three groups are three different
 * jobs: the pending list is a queue to work through, the active list is a
 * roster to check, and the suspended list is a record. A single table with a
 * status column would make the queue — the only part with anything to do —
 * something to find.
 */
export const dynamic = "force-dynamic";

export default async function AdminMarathonVolunteersPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("admin");

  await redirectSignedOut(locale);
  const admin = clerkConfigured ? await getAdminUser() : null;
  if (!admin) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <Panel className="p-10 text-muted-foreground">
          {t("mar_not_admin")}
        </Panel>
      </div>
    );
  }

  let groups = { pending: [], active: [], suspended: [] };
  let failed = false;
  try {
    await dbConnect();
    const [docs, board, soldRows] = await Promise.all([
      MarathonVolunteer.find({})
        .sort({ status: 1, createdAt: 1 })
        .lean(),
      /* "all" rather than the marathon window: a coordinator deciding about a
         volunteer wants everything that person has ever distributed, not only
         what falls inside this year's dates. */
      leaderboard({ scope: "all", limit: 1000 }),
      BookSale.aggregate([
        { $match: { "payment.status": "success" } },
        { $unwind: "$items" },
        {
          $group: {
            _id: { clerkId: "$volunteerClerkId", bookKey: "$items.bookKey" },
            quantity: { $sum: "$items.quantity" },
          },
        },
      ]),
    ]);

    const totals = new Map(board.map((row) => [row.clerkId, row]));

    /* clerkId -> { bookKey: sold }, so each volunteer's trolley is a lookup
       rather than a query. */
    const sold = new Map();
    for (const row of soldRows) {
      const forVolunteer = sold.get(row._id.clerkId) || {};
      forVolunteer[row._id.bookKey] = row.quantity;
      sold.set(row._id.clerkId, forVolunteer);
    }

    for (const doc of docs) {
      const row = totals.get(doc.clerkId);
      groups[doc.status]?.push({
        clerkId: doc.clerkId,
        name: doc.name,
        phone: doc.phone,
        email: doc.email || "",
        city: doc.city || "",
        college: doc.college || "",
        occupation: doc.occupation || "other",
        age: doc.age ?? null,
        about: doc.about || "",
        status: doc.status,
        decisionNote: doc.decisionNote || "",
        createdAt: new Date(doc.createdAt).toISOString(),
        books: row?.books ?? 0,
        amount: row?.amount ?? 0,
        stock: stockList(doc, sold.get(doc.clerkId) || {}),
      });
    }
  } catch (error) {
    console.error("[admin/gita-marathon/volunteers] load failed", error);
    failed = true;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 md:px-10 md:py-14">
      <Link
        href="/admin/gita-marathon"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        {t("mar_title")}
      </Link>

      <h1 className="mt-5 text-3xl font-semibold tracking-tight md:text-4xl">
        {t("mar_vol_title")}
      </h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        {t("mar_vol_subtitle")}
      </p>

      {failed ? (
        <Panel className="mt-8 p-8 text-center text-muted-foreground">
          {t("mar_load_failed")}
        </Panel>
      ) : (
        <MarathonVolunteers groups={groups} />
      )}
    </div>
  );
}
