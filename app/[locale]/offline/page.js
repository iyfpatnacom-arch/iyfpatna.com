import { setRequestLocale, getTranslations } from "next-intl/server";
import { GlassCard } from "@/components/glass/GlassCard";

export default async function OfflinePage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pwa");

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-5">
      <GlassCard className="w-full p-10 text-center">
        <p className="text-2xl font-extrabold text-foreground">{t("offline_title")}</p>
        <p className="mt-3 text-sm text-foreground/60">{t("offline_body")}</p>
      </GlassCard>
    </div>
  );
}
