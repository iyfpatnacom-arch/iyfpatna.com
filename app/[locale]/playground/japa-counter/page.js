import { setRequestLocale, getTranslations } from "next-intl/server";
import { clerkConfigured } from "@/lib/auth-config";
import { JapaCounter } from "@/components/playground/JapaCounter";

export default async function JapaCounterPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("playground.japa");

  return (
    <div className="mx-auto max-w-2xl px-5 py-14 md:px-10 md:py-20">
      <h1 className="text-3xl font-extrabold text-foreground md:text-4xl">{t("title")}</h1>
      <p className="mt-2 text-foreground/60">{t("subtitle")}</p>
      <JapaCounter clerkConfigured={clerkConfigured} />
    </div>
  );
}
