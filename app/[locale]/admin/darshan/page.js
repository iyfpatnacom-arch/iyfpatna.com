import { setRequestLocale, getTranslations, getFormatter } from "next-intl/server";
import {
  clerkConfigured,
  getAdminUser,
  redirectSignedOut,
} from "@/lib/auth-config";
import { getRecentDarshans, indiaDate } from "@/lib/darshan";
import { imagekitConfigured } from "@/lib/imagekit";
import { Panel } from "@/components/site/Panel";
import { IkImage } from "@/components/media/IkImage";
import { DarshanUploadForm } from "@/components/admin/DarshanUploadForm";

/**
 * /admin/darshan — this morning's deity photo for the home page.
 *
 * `force-dynamic` with uncached reads, like /admin/settings: this is where an
 * admin checks that their upload took, so it must show the database, not a
 * cache entry.
 */
export const dynamic = "force-dynamic";

export default async function AdminDarshanPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const format = await getFormatter();

  await redirectSignedOut(locale);
  const user = clerkConfigured ? await getAdminUser() : null;
  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <Panel className="p-10 text-muted-foreground">
          {clerkConfigured
            ? "Admins only."
            : "Add Clerk keys and set your user's publicMetadata.role to \"admin\"."}
        </Panel>
      </div>
    );
  }

  const today = indiaDate();
  const recent = await getRecentDarshans();
  const todays = recent.find((d) => d.date === today);
  const dateLabel = (date) =>
    format.dateTime(new Date(`${date}T00:00:00+05:30`), {
      dateStyle: "medium",
      timeZone: "Asia/Kolkata",
    });

  return (
    <div className="mx-auto max-w-3xl px-5 py-14 md:px-10 md:py-20">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
        {t("darshan_title")}
      </h1>
      <p className="mt-2 text-muted-foreground">{t("darshan_subtitle")}</p>

      {!imagekitConfigured() ? (
        <Panel className="mt-8 p-6 text-sm text-destructive">
          {t("darshan_error_config")}
        </Panel>
      ) : null}

      <Panel className="mt-8 p-6 md:p-8">
        <p className="mb-4 text-sm text-muted-foreground">
          {todays
            ? t("darshan_status_done", {
                time: format.dateTime(new Date(todays.updatedAt), {
                  timeStyle: "short",
                  timeZone: "Asia/Kolkata",
                }),
              })
            : t("darshan_status_pending", { date: dateLabel(today) })}
        </p>
        <DarshanUploadForm hasToday={Boolean(todays)} />
      </Panel>

      {recent.length ? (
        <>
          <h2 className="mt-12 text-lg font-semibold text-foreground">
            {t("darshan_recent")}
          </h2>
          <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {recent.map((d) => (
              <li key={d.date}>
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="group block">
                  <div className="relative aspect-4/5 overflow-hidden rounded-xl border border-border bg-muted">
                    <IkImage
                      src={d.url}
                      alt=""
                      fill
                      sizes="(min-width: 640px) 25vw, 33vw"
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {d.date === today ? t("darshan_today") : dateLabel(d.date)}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
