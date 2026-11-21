import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * The categories of register the attendance tool holds.
 *
 * Attendance was built for the DYS workshop, where there was exactly one thing
 * to take it for and so no need to say which. There are now two kinds — paid
 * course batches, and the Gita festival's two events — scanned by the same
 * volunteers with the same phones at the same door. This is the one row of tabs
 * that says what is being looked at, rendered by every screen in the section so
 * the answer never depends on which one you arrived at.
 *
 * A server component: it is links and a highlighted one, and there is nothing
 * here worth shipping to a phone at a gate.
 *
 * `tabs` is `[{ key, label, href }]` and `active` names the current one.
 */
export function RegistrationTabs({ tabs, active, label }) {
  if (tabs.length < 2) return null;

  return (
    <nav className="mt-6 flex flex-wrap gap-2" aria-label={label}>
      {tabs.map((tab) => {
        const current = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              current
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
