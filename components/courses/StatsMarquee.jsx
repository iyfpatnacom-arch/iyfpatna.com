/**
 * The strip of numbers that travels under the course hero.
 *
 * The agency layout this page borrows its shape from puts a marquee of client
 * logos in this slot. A temple youth forum has no client logos, so the same
 * band carries the workshop's own numbers instead — the proof this page
 * actually has, moving rather than sitting in a static four-column row.
 *
 * The track holds two identical copies of the list and travels exactly half
 * its own width, which is all `.marquee-track` in globals.css does; copy two
 * lands where copy one started, so the loop has no seam and nothing has to be
 * measured at runtime. That same rule drops the second copy and centres the
 * first under `prefers-reduced-motion`, so the numbers still read when they
 * are standing still — which is why the duplicate is built here as a plain
 * sibling rather than, say, a transformed clone.
 *
 * Only the first copy is exposed: the second is decoration, and a screen
 * reader that announced the stats twice would be reporting the animation
 * rather than the content.
 */
export function StatsMarquee({ stats }) {
  if (!stats?.length) return null;

  const run = (hidden) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {stats.map((stat) => (
        <li key={stat.value + stat.label} className="flex items-center gap-5 px-5 sm:gap-7 sm:px-7">
          <span className="flex items-baseline gap-2 whitespace-nowrap">
            <span className="text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
              {stat.value}
            </span>
            <span className="text-xs text-muted-foreground sm:text-sm">{stat.label}</span>
          </span>
          <span className="size-1 shrink-0 rounded-full bg-primary/35" aria-hidden="true" />
        </li>
      ))}
    </ul>
  );

  return (
    <section className="border-b border-border/70 bg-muted/25 py-5 sm:py-6">
      <div className="marquee-mask overflow-hidden">
        <div className="marquee-track [animation-duration:42s]">
          {run(false)}
          {run(true)}
        </div>
      </div>
    </section>
  );
}
