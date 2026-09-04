import { setRequestLocale, getTranslations } from "next-intl/server";
import { clerkConfigured, getAdminUser } from "@/lib/auth-config";
import { SETTING_KEYS, getSettingDoc } from "@/lib/settings";
import { WHATSAPP_GROUP_URL } from "@/lib/site-config";
import { GlassCard } from "@/components/glass/GlassCard";
import { WhatsappLinkForm } from "@/components/admin/WhatsappLinkForm";

/**
 * /admin/settings — the links an admin can change without a deploy.
 *
 * `force-dynamic` and an uncached read on purpose. Every other page reads
 * settings through the cache; this is the one screen that must show what is
 * actually in the database, because it is where someone comes to check
 * whether their save took.
 *
 * The database read is left unguarded here, unlike the public pages: if Mongo
 * is down there is nothing useful to show an admin on a settings screen, and
 * a page that silently rendered the fallback would invite them to "fix" a
 * link that was never broken.
 */
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  if (!clerkConfigured) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <GlassCard className="p-10">
          <p className="font-bold text-foreground">Accounts aren&apos;t set up yet</p>
          <p className="mt-2 text-sm text-foreground/55">
            Add Clerk keys to .env.local, then set your user&apos;s publicMetadata.role
            to &quot;admin&quot; to unlock this page.
          </p>
        </GlassCard>
      </div>
    );
  }

  const user = await getAdminUser();
  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <GlassCard className="p-10 text-foreground/60">Admins only.</GlassCard>
      </div>
    );
  }

  const doc = await getSettingDoc(SETTING_KEYS.whatsappGroupUrl);

  return (
    <div className="mx-auto max-w-3xl px-5 py-14 md:px-10 md:py-20">
      <h1 className="text-3xl font-extrabold text-foreground md:text-4xl">
        {t("settings_title")}
      </h1>
      <p className="mt-2 text-foreground/60">{t("settings_subtitle")}</p>

      <GlassCard className="mt-8 p-6 md:p-8">
        <WhatsappLinkForm
          current={doc?.value || WHATSAPP_GROUP_URL}
          isDefault={!doc?.value}
          updatedAt={doc?.updatedAt ? doc.updatedAt.toISOString() : null}
        />
      </GlassCard>

      <p className="mt-6 text-sm text-foreground/50">{t("whatsapp_where")}</p>
    </div>
  );
}
