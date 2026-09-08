import { setRequestLocale, getTranslations } from "next-intl/server";
import { ArrowRight, QrCode } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { clerkConfigured, getAdminUser, redirectSignedOut } from "@/lib/auth-config";
import { dbConnect } from "@/lib/db/connect";
import Program from "@/models/Program";
import { toPlain } from "@/lib/serialize";
import { Panel } from "@/components/site/Panel";

/**
 * Which programme is being run right now.
 *
 * Admin-gated, like the rest of /admin — the display screen mints the codes,
 * and an open code-minting page would make the rotation pointless.
 */
export const dynamic = "force-dynamic";

export default async function CheckInPickerPage({ params }) {
  const { locale } = await params;
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

  let programs = [];
  try {
    await dbConnect();
    programs = toPlain(
      await Program.find({ isActive: true }).sort({ order: 1 }).select("title").lean()
    );
  } catch (error) {
    console.error("[checkin] programme list failed", error);
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-14 md:px-10 md:py-20">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
        {t("host_title")}
      </h1>
      <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">
        {t("host_body")}
      </p>

      <h2 className="mt-10 text-sm font-semibold text-foreground">{t("host_pick")}</h2>

      {programs.length === 0 ? (
        <Panel className="mt-4 p-8 text-center text-muted-foreground">
          {t("host_no_programmes")}
        </Panel>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {programs.map((program) => (
            <Link
              key={program._id}
              href={`/admin/check-in/${program._id}`}
              className="group"
            >
              <Panel className="flex h-full items-center gap-3 p-5 transition-colors group-hover:border-primary/40">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <QrCode className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 font-semibold text-foreground">
                  {program.title?.[locale] ?? program.title?.en}
                </span>
                <ArrowRight
                  className="size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-60"
                  aria-hidden="true"
                />
              </Panel>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
