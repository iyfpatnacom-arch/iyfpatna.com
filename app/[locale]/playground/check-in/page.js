import { setRequestLocale, getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { ToolShell } from "@/components/playground/ToolShell";
import { CheckInForm } from "@/components/playground/CheckInForm";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "playground.tools.checkin" });
  return { title: t("name"), description: t("tagline") };
}

/**
 * The tool page: for someone who opened the app rather than the camera.
 *
 * Most people arrive at check-in by scanning, which lands them on
 * /check-in/[programId]/[token] with everything already filled in. This page
 * is the way in for a phone whose camera will not read the code — the six
 * digits under the QR do the same job.
 */
export default async function CheckInToolPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <ToolShell toolKey="checkin">
      <CheckInForm />
    </ToolShell>
  );
}
