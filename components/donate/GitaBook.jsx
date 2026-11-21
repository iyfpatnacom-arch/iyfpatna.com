import { cn } from "@/lib/utils";

/**
 * Bhagavad-gita As It Is, drawn rather than photographed.
 *
 * The thing being sponsored on this page is one book, and the same book six
 * times down the tier grid. A photograph of the cover would be the obvious
 * way to show it and the wrong one: six copies of a raster on a page whose
 * LCP is the hero copy, each one a separate request on a volunteer's phone
 * network, for an illustration thirty pixels wide.
 *
 * So it is geometry — flat fills, no gradients, no defs. That has three
 * consequences worth knowing, all of them the reason it is built this way:
 *
 *   It can be inlined as many times as the page likes. No `<defs>` means no
 *   ids, so there is nothing to collide when seven of these sit in one
 *   document. (`useId` is not available to us here: these cards are server
 *   components, and keeping them that way is what keeps the dialog's bundle
 *   off this route.)
 *
 *   It takes its colours from CSS custom properties, so the cover is stepped
 *   for the dark surface rather than flipped (see `.gita-book` in
 *   `globals.css`), like every other themed thing on this site.
 *
 *   It opens on hover. The animation is CSS on the parts below, driven by the
 *   `group` class on whatever card holds it, so this stays a server component
 *   and nothing ships to the browser at all.
 *
 * Deliberately a likeness and not a forgery: the cover's proportions, its
 * gold double rule, the arch and the chariot wheel inside it. BBT's painting
 * is theirs, and a traced copy of it would be both heavier and not ours to
 * redraw.
 *
 * Decorative throughout — `aria-hidden`. The card's heading already says how
 * many Gitas it stands for, and a screen reader does not need the drawing
 * repeated at it.
 */
export function GitaBook({ className }) {
  return (
    <svg
      viewBox="0 0 96 128"
      aria-hidden="true"
      focusable="false"
      className={cn("gita-book", className)}
    >
      {/* Grounds the book. Grows on hover with it, which is what reads as
          "lifted" — a shadow that stays put reads as a sticker. */}
      <ellipse
        className="gita-book__shadow"
        cx="50"
        cy="124"
        rx="30"
        ry="3.5"
        fill="currentColor"
      />

      {/* The block of pages: its own edge first, then the top sheet, so the
          stack has a visible thickness down the fore-edge. */}
      <rect x="20" y="8" width="66" height="112" rx="3" fill="var(--gita-page-edge)" />
      <rect x="18" y="6" width="66" height="112" rx="3" fill="var(--gita-page)" />

      {/* The first page, under the cover and only worth drawing once the
          cover has swung off it. */}
      <g className="gita-book__inner">
        <rect x="28" y="20" width="22" height="2.5" rx="1.25" fill="var(--gita-gold)" />
        {[32, 40, 48, 56, 64, 72, 80].map((y, index) => (
          <rect
            key={y}
            x="28"
            y={y}
            width={index % 3 === 2 ? 30 : 44}
            height="1.6"
            rx="0.8"
            fill="var(--gita-page-line)"
          />
        ))}
      </g>

      {/* The front cover, hinged at the spine. */}
      <g className="gita-book__cover">
        <rect x="10" y="4" width="70" height="116" rx="3.5" fill="var(--gita-cover)" />
        <rect x="10" y="4" width="9" height="116" rx="3.5" fill="var(--gita-spine)" />
        <rect x="12.5" y="16" width="4" height="1.4" rx="0.7" fill="var(--gita-gold)" opacity="0.7" />
        <rect x="12.5" y="104" width="4" height="1.4" rx="0.7" fill="var(--gita-gold)" opacity="0.7" />

        {/* The double rule the cover has had through every printing. */}
        <rect
          x="24"
          y="12"
          width="48"
          height="100"
          rx="2"
          fill="none"
          stroke="var(--gita-gold)"
          strokeWidth="1.2"
          opacity="0.85"
        />
        <rect
          x="27"
          y="15"
          width="42"
          height="94"
          rx="1.5"
          fill="none"
          stroke="var(--gita-gold)"
          strokeWidth="0.6"
          opacity="0.45"
        />

        {/* The arched panel, and the chariot wheel in it — the one element of
            the cover that survives being drawn at this size. */}
        <path d="M30 58V34a18 18 0 0 1 36 0v24Z" fill="var(--gita-arch)" />
        <circle
          cx="48"
          cy="36"
          r="9"
          fill="none"
          stroke="var(--gita-gold)"
          strokeWidth="1.1"
          opacity="0.9"
        />
        <g stroke="var(--gita-gold)" strokeWidth="0.7" opacity="0.8">
          <path d="M39 36h18M48 27v18M41.6 29.6l12.8 12.8M54.4 29.6L41.6 42.4" />
        </g>
        <circle cx="48" cy="36" r="2" fill="var(--gita-gold)" />

        {/* The title, as type reads at thirty pixels: two bars, a rule, and
            the author's line. Spelling it out would be five illegible
            pixels of text. */}
        <rect x="33" y="66" width="30" height="3.4" rx="1.7" fill="var(--gita-gold)" />
        <rect x="38" y="73.5" width="20" height="2.4" rx="1.2" fill="var(--gita-gold)" opacity="0.75" />
        <rect x="36" y="83" width="24" height="1" rx="0.5" fill="var(--gita-gold)" opacity="0.45" />
        <rect x="34" y="97" width="28" height="1.8" rx="0.9" fill="var(--gita-gold)" opacity="0.55" />
      </g>
    </svg>
  );
}
