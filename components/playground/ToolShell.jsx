import { useTranslations } from "next-intl";
import {
  CircleDot,
  Cloud,
  HeartHandshake,
  ListChecks,
  MapPin,
  MoonStar,
  Music,
  Puzzle,
  QrCode,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { otherTools, TOOLS } from "@/lib/playground/tools";
import { cn } from "@/lib/utils";

/**
 * Shared chrome for the seven sadhana tools.
 *
 * Every tool page is a title, two promises and a strip of the other six. The
 * promises are the load-bearing part: these tools are offered to someone who
 * arrived from a WhatsApp link and has no intention of making an account, and
 * a page that does not say "this works without one" gets read as a sign-up
 * wall and closed. So the badges are chrome on every tool rather than copy
 * each page has to remember to write.
 */

/** Icon names in `lib/playground/tools.js` resolved to components. */
export const TOOL_ICONS = {
  ListChecks,
  CircleDot,
  Puzzle,
  HeartHandshake,
  Music,
  MoonStar,
  QrCode,
  // The campus map, which lives at `/campus` rather than under `/playground`
  // but is listed in the grid alongside the tools.
  MapPin,
  // Not a tool in `TOOLS` — Sarathi is the announced-but-unbuilt one, and the
  // phone's app grid draws it alongside the seven that work.
  Sparkles,
};

export function ToolIcon({ name, className }) {
  const Icon = TOOL_ICONS[name] ?? ListChecks;
  return <Icon className={className} aria-hidden="true" />;
}

/**
 * A tool's icon on its accent tile.
 *
 * Exported because the index page, the footer strip and the tool header all
 * draw it, and they used to each carry their own copy of the accent ternary —
 * which is how two of them ended up on `bg-accent`, a token that is a
 * near-white tint in light mode and so washed out to nothing there. Both
 * accents now come from the fixed brand palette and read at the same strength
 * in either theme.
 */
export function ToolChip({ icon, accent, size = "md" }) {
  const big = size === "lg";
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-xl",
        big ? "size-11" : "size-8",
        accent === "purple"
          ? "bg-brand-purple/10 text-brand-purple"
          : "bg-primary/10 text-primary"
      )}
    >
      <ToolIcon name={icon} className={big ? "size-5" : "size-4"} />
    </span>
  );
}

export function ToolShell({ toolKey, children, width = "narrow" }) {
  const t = useTranslations("playground");
  const tool = TOOLS.find((item) => item.key === toolKey);

  return (
    <div
      className={cn(
        "mx-auto w-full px-4 py-10 sm:px-6 sm:py-14",
        width === "wide" ? "max-w-5xl" : "max-w-2xl"
      )}
    >
      <header>
        <Link
          href="/playground"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ToolIcon name={tool?.icon} className="size-3.5" />
          {t("eyebrow")}
        </Link>

        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {t(`tools.${toolKey}.name`)}
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          {t(`tools.${toolKey}.tagline`)}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Badge icon={<Cloud className="size-3.5" aria-hidden="true" />}>
            {t("badge_offline")}
          </Badge>
          {tool?.signInAdds === "sync" && (
            <Badge icon={<UserRoundCheck className="size-3.5" aria-hidden="true" />}>
              {t("badge_sync")}
            </Badge>
          )}
          {tool?.signInAdds !== "sync" && (
            <Badge icon={<UserRoundCheck className="size-3.5" aria-hidden="true" />}>
              {t("badge_no_account")}
            </Badge>
          )}
        </div>
      </header>

      <div className="mt-8">{children}</div>

      <MoreTools currentKey={toolKey} />
    </div>
  );
}

function Badge({ icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
      {icon}
      {children}
    </span>
  );
}

/**
 * The other six tools, at the foot of every one.
 *
 * Someone who found the japa counter through a shared link has no reason to
 * suspect the calendar exists; this is the only place that tells them.
 */
function MoreTools({ currentKey }) {
  const t = useTranslations("playground");

  return (
    <section className="mt-14 border-t border-border/70 pt-8">
      <h2 className="text-sm font-semibold text-foreground">{t("more_tools")}</h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {otherTools(currentKey).map((tool) => (
          <Link
            key={tool.key}
            href={tool.href}
            // `min-w-0` on the grid item itself, not only on the text inside
            // it. A grid item defaults to `min-width: auto`, so its floor is
            // its min-content width — and the min-content width of a
            // `truncate` span is the whole un-wrapped tagline, which pushed
            // these cards to half again the width of a phone.
            className="group flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 transition-colors hover:border-primary/40"
          >
            <ToolChip icon={tool.icon} accent={tool.accent} />
            {/* `flex-1` as well as `min-w-0`: without it this span is sized by
                its content, so a long tagline pushes the row wider than the
                card instead of truncating inside it. */}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">
                {t(`tools.${tool.key}.name`)}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {t(`tools.${tool.key}.tagline`)}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
