import { setRequestLocale, getTranslations } from "next-intl/server";
import { Panel } from "@/components/site/Panel";

export default async function OfflinePage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pwa");

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-5">
      <Panel className="w-full p-10 text-center">
        <p className="text-2xl font-semibold tracking-tight text-foreground">{t("offline_title")}</p>
        <p className="mt-3 text-sm text-muted-foreground">{t("offline_body")}</p>
      </Panel>
    </div>
  );
}
