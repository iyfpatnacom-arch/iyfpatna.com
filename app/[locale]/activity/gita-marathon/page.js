import { setRequestLocale, getTranslations } from "next-intl/server";
import {
  ArrowRight,
  BookOpen,
  Clock3,
  HandHeart,
  LogIn,
  Pencil,
  ShieldOff,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/site/Panel";
import { VolunteerRegisterForm } from "@/components/marathon/VolunteerRegisterForm";
import { Link } from "@/i18n/navigation";
import { clerkConfigured, getSignedInUser } from "@/lib/auth-config";
import { getFlag } from "@/lib/flags";
import { GITA_BOOKS } from "@/lib/marathon/books";
import { getVolunteerStanding } from "@/lib/marathon/volunteers";

/**
 * /activity/gita-marathon — the door into the marathon, whoever opens it.
 *
 * One page with five faces, because the thing a visitor needs here depends
 * entirely on where they already are:
 *
 *   signed out  a recruitment page with a way in
 *   new         the same page with the application form on it
 *   pending     "a coordinator has your details", and a way to correct them
 *   suspended   why, plainly, with their history still intact
 *   active      the console's About tab — what the books cost, and the rules
 *
 * They are one route rather than five because the lower half of the page is
 * the same in every case: what the work is, how it starts, what the books
 * cost. Splitting them would have meant maintaining that content five times
 * or inventing a shared component that is this page with a prop.
 *
 * The gate itself is `getVolunteerStanding`, which is the only thing on the
 * site that decides what "an active volunteer" means — the sell screen and
 * /api/marathon/sales both ask the same question of the same function, so a
 * screen can never open for somebody a route would refuse.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "marathon" });
  return { title: t("title"), description: t("description") };
}

export default async function MarathonPage({ params, searchParams }) {
  const { locale } = await params;
  const { edit } = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations("marathon");

  const [{ state, volunteer }, open] = await Promise.all([
    getVolunteerStanding(),
    getFlag("marathon.open", true),
  ]);

  /* Only fetched when there is a form to put it on: `currentUser()` is a
     round trip to Clerk, and the recruitment page does not need one. */
  const showForm = state === "new" || (state === "pending" && edit);
  const user = showForm ? await getSignedInUser() : null;
  const email = user?.primaryEmailAddress?.emailAddress || "";

  /* Where Clerk sends somebody back to once they have an account. Written out
     with the locale prefix because that is what Clerk redirects to verbatim —
     an unprefixed path would bounce through the proxy's locale detection and
     could land them in the other language. */
  const back = `/${locale}/activity/gita-marathon`;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      {/* ------------------------------------------------------------ hero */}
      <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[11px] font-semibold tracking-wider text-primary uppercase">
        <Sparkles className="size-3" aria-hidden="true" />
        {t("eyebrow")}
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {t("hero_title")}
      </h1>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
        {t("hero_subtitle")}
      </p>

      {/* ------------------------------------------------- the state panel */}
      {!open && (
        <Panel className="mt-8 border-amber-500/30 bg-amber-500/[0.06] p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <Clock3 className="size-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            {t("closed_title")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("closed_body")}
          </p>
        </Panel>
      )}

      {state === "signed_out" && (
        <Panel className="mt-8 p-6 sm:p-8">
          <h2 className="text-lg font-semibold tracking-tight">
            {t("join_title")}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {t("join_body")}
          </p>

          {clerkConfigured ? (
            <>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  className="rounded-full"
                  render={
                    <a
                      href={`/${locale}/sign-up?redirect_url=${encodeURIComponent(back)}`}
                    />
                  }
                >
                  <UserPlus className="size-4" aria-hidden="true" />
                  {t("join_cta")}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full"
                  render={
                    <a
                      href={`/${locale}/sign-in?redirect_url=${encodeURIComponent(back)}`}
                    />
                  }
                >
                  <LogIn className="size-4" aria-hidden="true" />
                  {t("signin_cta")}
                </Button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                {t("signin_note")}
              </p>
            </>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">
              Accounts aren&apos;t set up yet — add Clerk keys to .env.local.
            </p>
          )}
        </Panel>
      )}

      {showForm && (
        <Panel className="mt-8 p-6 sm:p-8">
          <h2 className="text-lg font-semibold tracking-tight">
            {t("reg_title")}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {t("reg_body")}
          </p>
          <VolunteerRegisterForm email={email} defaults={volunteer} />
        </Panel>
      )}

      {state === "pending" && !edit && (
        <Panel className="mt-8 border-primary/25 bg-primary/[0.05] p-6 sm:p-8">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Clock3 className="size-4 shrink-0 text-primary" aria-hidden="true" />
            {t("pending_title", { name: volunteer?.name?.split(" ")[0] || "" })}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {t("pending_body")}
          </p>
          <p className="mt-3 max-w-xl text-xs leading-relaxed text-muted-foreground/80">
            {t("pending_hint")}
          </p>
          {/* A query parameter rather than client state: the form is the same
              form, and this page is already dynamic, so there is nothing for
              a toggle to buy. */}
          <Button
            variant="outline"
            className="mt-5 rounded-full"
            render={<Link href="/activity/gita-marathon?edit=1" />}
          >
            <Pencil className="size-4" aria-hidden="true" />
            {t("pending_edit")}
          </Button>
        </Panel>
      )}

      {state === "suspended" && (
        <Panel className="mt-8 border-destructive/30 bg-destructive/[0.05] p-6 sm:p-8">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <ShieldOff className="size-4 shrink-0 text-destructive" aria-hidden="true" />
            {t("suspended_title")}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {t("suspended_body")}
          </p>
          {volunteer?.decisionNote && (
            <p className="mt-3 max-w-xl rounded-lg bg-background/70 px-3 py-2 text-sm text-foreground/90">
              {t("suspended_reason", { note: volunteer.decisionNote })}
            </p>
          )}
          <Button
            variant="outline"
            className="mt-5 rounded-full"
            render={<Link href="/activity/gita-marathon/me" />}
          >
            {t("me_history_title")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </Panel>
      )}

      {state === "active" && (
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button
            size="lg"
            className="rounded-full"
            render={<Link href="/activity/gita-marathon/sell" />}
          >
            <BookOpen className="size-4" aria-hidden="true" />
            {t("sell_title")}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="rounded-full"
            render={<Link href="/activity/gita-marathon/me" />}
          >
            {t("me_title")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      )}

      {/* ---------------------------------------------------- what and how */}
      <section className="mt-14 rounded-2xl border border-border bg-muted/30 p-6 sm:p-8">
        <h2 className="text-lg font-semibold tracking-tight">
          {t("what_title")}
        </h2>
        <ul className="mt-5 space-y-3">
          {t.raw("what_points").map((point) => (
            <li
              key={point}
              className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground"
            >
              <span
                aria-hidden="true"
                className="mt-[7px] size-1.5 shrink-0 rounded-full bg-primary"
              />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* The prices. On the About tab for an active volunteer as much as on
          the recruitment page for a stranger — it is the one number a
          volunteer standing at a stall needs to be sure of, and "never take
          less, never take more" is the rule it is printed with. */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <BookOpen className="size-4 shrink-0 text-primary" aria-hidden="true" />
          {t("prices_title")}
        </h2>
        <ul className="mt-5 divide-y divide-border/60">
          {GITA_BOOKS.map((book) => (
            <li
              key={book.key}
              className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <span className="min-w-0 text-sm text-foreground/90">
                {t(`books.${book.key}.name`)}
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-primary">
                ₹{book.price}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-5 border-t border-border/60 pt-4 text-xs leading-relaxed text-muted-foreground">
          {t("prices_note")}
        </p>
      </section>

      {state !== "active" && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold tracking-tight">
            {t("how_title")}
          </h2>
          <ol className="mt-6 grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-4">
            {t.raw("how_steps").map((step, index, steps) => {
              const isLast = index === steps.length - 1;
              return (
                <li key={step.title} className="relative flex flex-col">
                  {!isLast && (
                    <span
                      aria-hidden="true"
                      className="absolute top-5 left-10 hidden h-px w-[calc(100%-1.5rem)] bg-border lg:block"
                    />
                  )}
                  <span className="relative z-10 grid size-10 place-items-center rounded-full border border-primary/25 bg-primary/10 text-xs font-semibold text-primary tabular-nums">
                    {index + 1}
                  </span>
                  <h3 className="mt-3 text-[15px] font-semibold tracking-tight text-balance">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* --------------------------------------------------- the other door */}
      <section className="mt-10 rounded-2xl border border-primary/25 bg-primary/5 p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight">
              {t("sponsor_title")}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {t("sponsor_body")}
            </p>
          </div>
          <Button
            size="lg"
            variant="outline"
            className="shrink-0 rounded-full"
            render={<Link href="/donate/gita-marathon" />}
          >
            <HandHeart className="size-4" aria-hidden="true" />
            {t("sponsor_cta")}
          </Button>
        </div>
      </section>
    </div>
  );
}
