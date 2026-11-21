import { setRequestLocale, getTranslations } from "next-intl/server";
import { Clock3, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/site/Panel";
import { SellConsole } from "@/components/marathon/SellConsole";
import { Link } from "@/i18n/navigation";
import { getFlag } from "@/lib/flags";
import { volunteerStock } from "@/lib/marathon/stock";
import { getVolunteerStanding } from "@/lib/marathon/volunteers";
import { redirectSignedOut } from "@/lib/auth-config";

/**
 * /activity/gita-marathon/sell — recording a handover.
 *
 * Thin on purpose. The page's whole job is the gate: an active volunteer gets
 * the console, and anybody else is sent back to the door rather than shown a
 * disabled version of it. A screen that takes money must not render at all
 * for somebody who may not take money, however carefully its buttons are
 * disabled — /api/marathon/sales refuses them anyway, and a form that looks
 * usable and then refuses is worse than a closed door.
 *
 * `marathon.open` is checked here as well as in the route, so that closing the
 * marathon closes this screen rather than letting a volunteer fill a basket
 * and be refused at the end of it.
 *
 * The trolley is read here too and handed down. It is what the console draws
 * its titles, its prices and its caps from, and /api/marathon/sales reads the
 * same thing through the same function when the sale arrives — so the screen
 * cannot offer a book, a price or a last copy that the route will then
 * disagree with.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "marathon" });
  return { title: t("sell_title"), robots: { index: false, follow: false } };
}

export default async function SellPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("marathon");

  /* A stranger with no session gets the sign-in screen, not "volunteers
     only" — which for them is a dead end with no door in it. */
  await redirectSignedOut(locale);

  const [{ state, volunteer }, open] = await Promise.all([
    getVolunteerStanding(),
    getFlag("marathon.open", true),
  ]);

  /* Only for an active volunteer: `volunteerStock` runs an aggregation, and
     there is nothing to count for somebody who may not sell. */
  const stock = state === "active" ? await volunteerStock(volunteer) : [];

  if (state !== "active") {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-14 sm:px-6">
        <Panel className="p-7 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
            {state === "suspended" ? (
              <ShieldOff className="size-6" aria-hidden="true" />
            ) : (
              <Clock3 className="size-6" aria-hidden="true" />
            )}
          </span>
          <h1 className="mt-5 text-lg font-semibold tracking-tight">
            {state === "suspended"
              ? t("suspended_title")
              : t("pending_title", {
                  name: volunteer?.name?.split(" ")[0] || "",
                })}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {state === "suspended" ? t("suspended_body") : t("pending_body")}
          </p>
          <Button
            variant="outline"
            className="mt-6 rounded-full"
            render={<Link href="/activity/gita-marathon" />}
          >
            {t("tab_about")}
          </Button>
        </Panel>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {t("sell_title")}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {t("sell_subtitle")}
      </p>

      {open ? (
        <div className="mt-7">
          <SellConsole stock={stock} />
        </div>
      ) : (
        <Panel className="mt-7 border-amber-500/30 bg-amber-500/[0.06] p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <Clock3
              className="size-4 text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            />
            {t("closed_title")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("closed_body")}
          </p>
        </Panel>
      )}
    </div>
  );
}
