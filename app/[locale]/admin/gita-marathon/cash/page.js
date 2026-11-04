import { setRequestLocale, getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Panel } from "@/components/site/Panel";
import { MarathonCashDesk } from "@/components/admin/MarathonCashDesk";
import { Link } from "@/i18n/navigation";
import {
  clerkConfigured,
  getAdminUser,
  redirectSignedOut,
} from "@/lib/auth-config";
import { dbConnect } from "@/lib/db/connect";
import CashSettlement from "@/models/CashSettlement";

/**
 * /admin/gita-marathon/cash — the desk where the notes are counted.
 *
 * Two lists: what is waiting, oldest first because a handover left uncounted
 * overnight is the one that turns into an argument; and what has been counted,
 * most recent first, with the variance exactly as it was recorded.
 *
 * `saleIds` is not loaded. It is the audit trail and can be long, and nothing
 * on this screen reads it — the count of sales is already denormalised onto
 * the row for precisely this reason.
 */
export const dynamic = "force-dynamic";

const VERIFIED_LIMIT = 100;

function toRow(doc) {
  return {
    id: String(doc._id),
    volunteerName: doc.volunteerName,
    dayKey: doc.dayKey,
    expectedAmount: doc.expectedAmount,
    expectedCount: doc.expectedCount,
    declaredAmount: doc.declaredAmount,
    receivedAmount: doc.receivedAmount ?? null,
    variance: doc.variance ?? null,
    note: doc.note || "",
    adminNote: doc.adminNote || "",
  };
}

export default async function AdminMarathonCashPage({ params }) {
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

  let queue = [];
  let verified = [];
  let failed = false;
  try {
    await dbConnect();
    const [waiting, counted] = await Promise.all([
      CashSettlement.find({ status: "submitted" })
        .select("-saleIds")
        .sort({ dayKey: 1, createdAt: 1 })
        .lean(),
      CashSettlement.find({ status: "verified" })
        .select("-saleIds")
        .sort({ verifiedAt: -1 })
        .limit(VERIFIED_LIMIT)
        .lean(),
    ]);
    queue = waiting.map(toRow);
    verified = counted.map(toRow);
  } catch (error) {
    console.error("[admin/gita-marathon/cash] load failed", error);
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
        {t("mar_cash_title")}
      </h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        {t("mar_cash_subtitle")}
      </p>

      {failed ? (
        <Panel className="mt-8 p-8 text-center text-muted-foreground">
          {t("mar_load_failed")}
        </Panel>
      ) : (
        <MarathonCashDesk queue={queue} verified={verified} />
      )}
    </div>
  );
}
