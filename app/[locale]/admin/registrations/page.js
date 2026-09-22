import { setRequestLocale, getTranslations } from "next-intl/server";
import { ScanLine } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { clerkConfigured, getAdminUser, redirectSignedOut } from "@/lib/auth-config";
import { dbConnect } from "@/lib/db/connect";
import { istDayKey } from "@/lib/panchang";
import { courseSlugs, getCourse } from "@/lib/courses/catalog";
import Enrollment from "@/models/Enrollment";
import { Panel } from "@/components/site/Panel";
import { RegistrationsDashboard } from "@/components/admin/RegistrationsDashboard";

/**
 * /admin/registrations — everyone who has enrolled on a paid course, with
 * their payment and their attendance at the door.
 *
 * The whole course is loaded at once and searched, sorted and filtered in the
 * browser. A batch is hundreds of rows, not millions, and doing it client-side
 * means the volunteer at the door gets an instant search box and the CSV is
 * exactly the rows on screen.
 *
 * `payment.raw` and the notification log are left behind: they are the bulk of
 * each row and nothing here reads them.
 */
export const dynamic = "force-dynamic";

function iso(value) {
  return value ? new Date(value).toISOString() : null;
}

function toRow(doc) {
  const payment = doc.payment || {};
  return {
    orderId: doc.orderId,
    name: doc.name,
    email: doc.email,
    phone: doc.phone,
    age: doc.age ?? null,
    occupation: doc.occupation || null,
    mode: doc.mode || null,
    locale: doc.locale || null,
    batchId: doc.batchId,
    amount: doc.amount,
    mrp: doc.mrp ?? null,
    coupon: doc.coupon?.code ? `${doc.coupon.code} (${doc.coupon.percentOff}%)` : null,
    currency: doc.currency || "INR",
    status: payment.status || "pending",
    provider: payment.provider || null,
    paymentMode: payment.paymentMode || null,
    trackingId: payment.trackingId || null,
    bankRefNo: payment.bankRefNo || null,
    gatewayOrderId: payment.gatewayOrderId || null,
    failureMessage: payment.failureMessage || null,
    amountMismatch: Boolean(payment.amountMismatch),
    paidAt: iso(payment.paidAt),
    createdAt: iso(doc.createdAt),
    hasAccount: Boolean(doc.clerkId),
    emailSent: Boolean(doc.notifications?.emailSent),
    attendance: (doc.attendance || []).map((entry) => ({
      dayKey: entry.dayKey,
      at: iso(entry.at),
      source: entry.source,
    })),
  };
}

export default async function RegistrationsPage({ params, searchParams }) {
  const { locale } = await params;
  const { course: requested } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  await redirectSignedOut(locale);
  const admin = clerkConfigured ? await getAdminUser() : null;
  if (!admin) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <Panel className="p-10 text-muted-foreground">Admins only.</Panel>
      </div>
    );
  }

  const slugs = courseSlugs();
  const slug = slugs.includes(requested) ? requested : slugs[0];
  const course = getCourse(slug);

  let rows = [];
  let failed = false;
  try {
    await dbConnect();
    const docs = await Enrollment.find({ courseSlug: slug })
      .select("-payment.raw -notifications.attempts -meta")
      .sort({ createdAt: -1 })
      .lean();
    rows = docs.map(toRow);
  } catch (error) {
    console.error("[admin/registrations] load failed", error);
    failed = true;
  }

  const modes = Object.fromEntries(
    (course?.modes ?? []).map((mode) => [mode.key, mode.label?.[locale] ?? mode.key])
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:px-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            {t("reg_title")}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("reg_subtitle")}</p>
        </div>
        <Link
          href="/admin/registrations/scan"
          className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <ScanLine className="size-4" aria-hidden="true" />
          {t("reg_scan_cta")}
        </Link>
      </div>

      {slugs.length > 1 && (
        <nav className="mt-6 flex flex-wrap gap-2" aria-label={t("reg_course")}>
          {slugs.map((key) => (
            <Link
              key={key}
              href={`/admin/registrations?course=${key}`}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${
                key === slug
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {getCourse(key)?.title?.[locale] ?? key}
            </Link>
          ))}
        </nav>
      )}

      {failed ? (
        <Panel className="mt-8 p-8 text-center text-muted-foreground">{t("reg_load_failed")}</Panel>
      ) : (
        <RegistrationsDashboard
          rows={rows}
          loadedAt={new Date().toISOString()}
          today={istDayKey()}
          modes={modes}
          courseTitle={course?.title?.[locale] ?? slug}
          fileStem={course?.orderPrefix ?? slug}
        />
      )}
    </div>
  );
}
