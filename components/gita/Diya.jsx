/**
 * A lit diya, drawn rather than photographed.
 *
 * Inline SVG so it inherits the page's own gold through `currentColor` and
 * costs no request — a 4KB PNG of a lamp would be heavier than the whole rest
 * of this component and would be the wrong colour in one of the two themes.
 *
 * Purely decorative: `aria-hidden` and no title, because a screen reader
 * announcing "lamp" between a heading and a form helps nobody.
 *
 * The flame's flicker is `.animate-diya` in globals.css, which holds still
 * under `prefers-reduced-motion`.
 */
export function Diya({ className }) {
  return (
    <svg
      viewBox="0 0 64 56"
      className={className}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* Glow behind the flame. */}
      <ellipse cx="32" cy="18" rx="13" ry="16" fill="currentColor" opacity="0.14" />

      {/* Flame: an outer tongue and a hotter core. */}
      <g className="animate-diya">
        <path
          d="M32 4c4.2 4.6 6.4 8.3 6.4 11.6 0 3.9-2.9 6.9-6.4 6.9s-6.4-3-6.4-6.9C25.6 12.3 27.8 8.6 32 4Z"
          fill="currentColor"
        />
        <path
          d="M32 11.5c2 2.3 3 4.2 3 5.8 0 1.9-1.3 3.3-3 3.3s-3-1.4-3-3.3c0-1.6 1-3.5 3-5.8Z"
          fill="#FFF7E6"
          opacity="0.85"
        />
      </g>

      {/* Wick. */}
      <path d="M32 22.5v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />

      {/* The lamp: a shallow bowl with a pinched lip and a foot. */}
      <path
        d="M10 31h44c0 9.4-9.8 17-22 17s-22-7.6-22-17Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M10 31h44"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M24 48.5h16c0 2-3.6 3.5-8 3.5s-8-1.5-8-3.5Z"
        fill="currentColor"
        opacity="0.55"
      />
    </svg>
  );
}
