import { setRequestLocale, getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { clerkConfigured, getAdminUser, redirectSignedOut } from "@/lib/auth-config";
import { Panel } from "@/components/site/Panel";
import { PassScanner } from "@/components/admin/PassScanner";

/** /admin/registrations/scan — the phone at the door. */
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { robots: { index: false, follow: false } };
}

export default async function ScanPage({ params }) {
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:py-12">
      <Link
        href="/admin/registrations"
        className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border px-3.5 text-sm font-medium text-muted-foreground"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
        {t("reg_title")}
      </Link>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
        {t("scan_title")}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        {t("scan_body")}
      </p>
      <div className="mt-6">
        <PassScanner />
      </div>
    </div>
  );
}
