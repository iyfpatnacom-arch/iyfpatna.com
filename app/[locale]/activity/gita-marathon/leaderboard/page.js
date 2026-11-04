import { setRequestLocale, getTranslations } from "next-intl/server";
import { Trophy } from "lucide-react";
import { Panel } from "@/components/site/Panel";
import { Link } from "@/i18n/navigation";
import { formatINR } from "@/lib/courses/catalog";
import { getVolunteerStanding } from "@/lib/marathon/volunteers";
import { leaderboard } from "@/lib/marathon/stats";
import { cn } from "@/lib/utils";

/**
 * /activity/gita-marathon/leaderboard — the board, as the volunteers see it.
 *
 * Ranked by books and not by rupees, which is a choice with teeth: the English
 * Gita costs ₹50 more than the Hindi one, so a board ranked on money would
 * quietly reward pushing the expensive edition at somebody who asked for the
 * other. Books are what the marathon counts, so books are what the board
 * counts; the money is shown beside each name but never decides the order.
 *
 * Visible to every volunteer, including a suspended one — their own name is
 * still on it and their books still happened. The only thing it does not show
 * is anything about cash reconciliation, which is between a volunteer and the
 * desk and is nobody else's business.
 *
 * Server-rendered with no filtering in the browser. The board is a few hundred
 * rows at most, and its two views — the marathon and today — are a link each
 * rather than client state, so a volunteer can send somebody "look at today".
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "marathon" });
  return { title: t("board_title"), robots: { index: false, follow: false } };
}

const SCOPES = ["marathon", "today"];

/** The three medals, then nothing. Past third place a rank is a number. */
const MEDALS = ["text-amber-500", "text-zinc-400", "text-amber-700"];

export default async function LeaderboardPage({ params, searchParams }) {
  const { locale } = await params;
  const { scope: requested } = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations("marathon");

  const scope = SCOPES.includes(requested) ? requested : "marathon";

  const [rows, { volunteer }] = await Promise.all([
    leaderboard({ scope }),
    getVolunteerStanding(),
  ]);

  const me = volunteer?.clerkId ?? null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight sm:text-3xl">
        <Trophy className="size-6 shrink-0 text-primary" aria-hidden="true" />
        {t("board_title")}
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
        {t("board_subtitle")}
      </p>

      <nav className="mt-6 flex gap-2" aria-label={t("board_title")}>
        {SCOPES.map((key) => (
          <Link
            key={key}
            href={`/activity/gita-marathon/leaderboard?scope=${key}`}
            aria-current={key === scope ? "page" : undefined}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              key === scope
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`board_scope_${key}`)}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <Panel className="mt-6 p-10 text-center text-sm text-muted-foreground">
          {t("board_empty")}
        </Panel>
      ) : (
        <Panel className="mt-6 overflow-hidden">
          <ol>
            {rows.map((row, index) => {
              const rank = index + 1;
              const isMe = me && row.clerkId === me;
              return (
                <li
                  key={row.clerkId}
                  className={cn(
                    "flex items-center gap-3 border-b border-border/50 px-4 py-3 last:border-0 sm:px-5",
                    /* The volunteer's own row is marked rather than pinned to
                       the top: moving it would break the ranking it is the
                       whole point of. */
                    isMe && "bg-primary/[0.06]",
                  )}
                >
                  <span
                    className={cn(
                      "w-7 shrink-0 text-center text-sm font-semibold tabular-nums",
                      rank <= 3 ? MEDALS[rank - 1] : "text-muted-foreground",
                    )}
                  >
                    {rank}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {row.name}
                      {isMe && (
                        <span className="ms-2 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                          {t("board_you")}
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-muted-foreground tabular-nums">
                      {formatINR(row.amount)}
                    </span>
                  </span>

                  <span className="shrink-0 text-end">
                    <span className="block text-lg font-semibold tabular-nums">
                      {row.books}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {t("board_col_books")}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </Panel>
      )}
    </div>
  );
}
