import { setRequestLocale, getTranslations } from "next-intl/server";
import { QrCode } from "lucide-react";
import { CheckInForm } from "@/components/playground/CheckInForm";

/**
 * Where a camera scan lands.
 *
 * Deliberately outside `/playground`: this URL is printed on a wall and read
 * by strangers, and the shorter and less app-like it is the better. It carries
 * no chrome, no nav detour and no sign-in — the whole page is "who are you",
 * because the answer to "which programme" is already in the URL.
 *
 * The token is not checked here. It is checked by `/api/checkin` on submit,
 * which is the only place that can do it honestly: a token validated at render
 * time would already be a minute stale by the time the form was filled in, and
 * pre-validating would only add a way to fail that the submit has to handle
 * anyway.
 *
 * Dynamic by nature — the token is part of the path — so there is nothing to
 * prerender and no `generateStaticParams`.
 */
export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "playground.checkin" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function CheckInScanPage({ params }) {
  const { locale, programId, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("playground.checkin");

  return (
    <div className="mx-auto w-full max-w-md px-4 py-12 sm:px-6 sm:py-16">
      <header className="text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <QrCode className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t("scan_body")}
        </p>
      </header>

      <div className="mt-8">
        <CheckInForm programId={programId} token={token} />
      </div>
    </div>
  );
}
