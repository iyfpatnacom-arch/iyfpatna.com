import { setRequestLocale, getTranslations } from "next-intl/server";
import {
  clerkConfigured,
  getAdminUser,
  redirectSignedOut,
} from "@/lib/auth-config";
import { getAllFlagDocs } from "@/lib/flags";
import { toPlain } from "@/lib/serialize";
import { Panel } from "@/components/site/Panel";
import { FlagsTable } from "@/components/admin/FlagsTable";

export const dynamic = "force-dynamic";

export default async function AdminFlagsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  if (!clerkConfigured) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <Panel className="p-10">
          <p className="font-semibold text-foreground">Accounts aren&apos;t set up yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Add Clerk keys to .env.local, then set your user&apos;s publicMetadata.role
            to &quot;admin&quot; to unlock this page.
          </p>
        </Panel>
      </div>
    );
  }

  await redirectSignedOut(locale);
  const user = await getAdminUser();
  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <Panel className="p-10 text-muted-foreground">Admins only.</Panel>
      </div>
    );
  }

  const flags = await getAllFlagDocs();

  return (
    <div className="mx-auto max-w-4xl px-5 py-14 md:px-10 md:py-20">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
        {t("flags_title")}
      </h1>
      <p className="mt-2 text-muted-foreground">{t("flags_subtitle")}</p>
      <FlagsTable flags={toPlain(flags)} />
    </div>
  );
}
