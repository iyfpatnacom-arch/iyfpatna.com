import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { clerkConfigured, getAdminUser, redirectSignedOut } from "@/lib/auth-config";
import { dbConnect } from "@/lib/db/connect";
import Program from "@/models/Program";
import { ORG } from "@/lib/site-config";
import { Panel } from "@/components/site/Panel";
import { CheckInDisplay } from "@/components/admin/CheckInDisplay";

/**
 * The screen at the door for one programme.
 *
 * `origin` is resolved here rather than from `window.location` in the browser,
 * because the URL this page renders into a QR code has to be the one a
 * *visitor's* phone can reach — and the laptop showing this screen may well be
 * pointed at a LAN address or a tunnel that nobody else can resolve.
 */
export const dynamic = "force-dynamic";

export default async function CheckInDisplayPage({ params }) {
  const { locale, programId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("playground.checkin");

  await redirectSignedOut(locale);
  const admin = clerkConfigured ? await getAdminUser() : null;

  if (!admin) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <Panel className="p-10 text-muted-foreground">{t("host_admin_only")}</Panel>
      </div>
    );
  }

  if (!/^[0-9a-fA-F]{24}$/.test(programId)) notFound();

  await dbConnect();
  const program = await Program.findById(programId).select("title").lean();
  if (!program) notFound();

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 md:px-10 md:py-14">
      <Link
        href="/admin/check-in"
        className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border px-3.5 text-sm font-medium text-muted-foreground"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
        {t("host_pick")}
      </Link>

      <div className="mt-6">
        <CheckInDisplay
          programId={String(program._id)}
          programTitle={program.title?.[locale] ?? program.title?.en ?? ""}
          origin={ORG.siteUrl.replace(/\/+$/, "")}
        />
      </div>
    </div>
  );
}
