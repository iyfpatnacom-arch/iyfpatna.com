import { setRequestLocale, getTranslations } from "next-intl/server";
import { ScanLine, Table2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { clerkConfigured, getAdminUser, redirectSignedOut } from "@/lib/auth-config";
import { Panel } from "@/components/site/Panel";
import { AdmitOnOpen } from "@/components/admin/AdmitOnOpen";

/**
 * Where an entry pass QR lands.
 *
 * The pass is a link to this page, so a volunteer can admit people with the
 * camera app every phone already has. For an admin it admits on open; for
 * anyone else — including the participant scanning their own pass out of
 * curiosity — it is a dead end that reveals nothing about the order.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { robots: { index: false, follow: false } };
}

export default async function AdmitPage({ params, searchParams }) {
  const { locale, orderId } = await params;
  const { t: token } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  await redirectSignedOut(locale);
  const admin = clerkConfigured ? await getAdminUser() : null;
  if (!admin) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <Panel className="p-10 text-muted-foreground">{t("admit_not_admin")}</Panel>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:py-14">
      <AdmitOnOpen orderId={decodeURIComponent(orderId)} token={String(token || "")} />
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Link
          href="/admin/registrations/scan"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground"
        >
          <ScanLine className="size-4" aria-hidden="true" />
          {t("admit_scan_next")}
        </Link>
        <Link
          href="/admin/registrations"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border text-sm font-medium text-foreground"
        >
          <Table2 className="size-4" aria-hidden="true" />
          {t("reg_title")}
        </Link>
      </div>
    </div>
  );
}
