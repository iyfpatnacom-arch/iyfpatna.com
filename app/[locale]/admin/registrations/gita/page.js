import { setRequestLocale, getTranslations } from "next-intl/server";
import { LineChart, ScanLine } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { clerkConfigured, getAdminUser, redirectSignedOut } from "@/lib/auth-config";
import { dbConnect } from "@/lib/db/connect";
import { istDayKey } from "@/lib/panchang";
import { EVENT_KEYS, eventOf, getFestival } from "@/lib/gita-event/catalog";
import GitaRegistration from "@/models/GitaRegistration";
import { Panel } from "@/components/site/Panel";
import { RegistrationTabs } from "@/components/admin/RegistrationTabs";
import { GitaRegistrationsDashboard } from "@/components/admin/GitaRegistrationsDashboard";
import { GITA_TAB, registrationTabs } from "@/lib/admin/registration-tabs";

/**
 * /admin/registrations/gita — everyone registered for the Gita festival, with
 * their payment and their attendance at each of its events.
 *
 * A tab inside the attendance tool rather than a tool of its own: it is the same
 * volunteers, the same phones and the same door, and the only thing that
 * differs is that a row here may be admitted to two events instead of one
 * course on two days. So the shape is the course dashboard's — every row loaded
 * at once and searched, sorted and filtered in the browser, because a festival
 * is hundreds of rows and not millions, and a volunteer at the desk gets an
 * instant search box and a CSV of exactly what is on screen.
 *
 * `payment.raw` and the notification log are left behind: they are the bulk of
 * each row and nothing here reads them.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { robots: { index: false, follow: false } };
}

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
    /* The day alone — the time on a birthday is an artefact of storing it as
        a date, and sending the timestamp would invite a timezone to shift it. */
    dob: doc.dob ? new Date(doc.dob).toISOString().slice(0, 10) : null,
    age: doc.age ?? null,
    occupation: doc.occupation || null,
    gender: doc.gender || null,
    institution: doc.institution || null,
    /* Only ever set on rows registered while the form still asked for an
       address. Kept so an old row's export is not quietly thinner than it
       was, and shown in the detail panel only when there is one. */
    address: doc.address || null,
    referral: doc.referral || null,
    locale: doc.locale || null,
    events: doc.events || [],
    amount: doc.amount,
    fullAmount: doc.fullAmount ?? null,
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
      eventKey: entry.eventKey,
      dayKey: entry.dayKey,
      at: iso(entry.at),
      source: entry.source,
    })),
  };
}

export default async function GitaRegistrationsPage({ params }) {
  const { locale } = await params;
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

  const festival = getFestival();

  let rows = [];
  let failed = false;
  try {
    await dbConnect();
    const docs = await GitaRegistration.find({ festivalSlug: festival.slug })
      .select("-payment.raw -notifications.attempts -meta")
      .sort({ createdAt: -1 })
      .lean();
    rows = docs.map(toRow);
  } catch (error) {
    console.error("[admin/registrations/gita] load failed", error);
    failed = true;
  }

  /* The events in catalog order, with the dates the attendance columns put
     first. Labels are resolved here so the client table never reaches into the
     catalog — a row whose event has since been renamed still reads correctly
     against its own snapshot, which the table holds. */
  const events = EVENT_KEYS.map((key) => {
    const event = eventOf(key);
    return {
      key,
      label: event?.title?.[locale] || event?.title?.en || key,
      dateKey: event?.date || null,
      amount: Number(event?.amount) || 0,
    };
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:px-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            {t("reg_title")}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {t("gita_reg_subtitle", { festival: festival.title[locale] || festival.title.en })}
          </p>
        </div>
        {/* The dashboard beside the register, because the two answer different
            questions about the same rows and neither is discoverable from the
            admin index on its own. */}
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/registrations/gita/overview"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40"
          >
            <LineChart className="size-4" aria-hidden="true" />
            {t("gita_ov_open_overview")}
          </Link>
          <Link
            href="/admin/registrations/scan"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <ScanLine className="size-4" aria-hidden="true" />
            {t("reg_scan_cta")}
          </Link>
        </div>
      </div>

      <RegistrationTabs
        tabs={registrationTabs(locale)}
        active={GITA_TAB}
        label={t("reg_register")}
      />

      {failed ? (
        <Panel className="mt-8 p-8 text-center text-muted-foreground">{t("reg_load_failed")}</Panel>
      ) : (
        <GitaRegistrationsDashboard
          rows={rows}
          events={events}
          loadedAt={new Date().toISOString()}
          today={istDayKey()}
          festivalTitle={festival.title[locale] || festival.title.en}
          fileStem={festival.slug}
        />
      )}
    </div>
  );
}
