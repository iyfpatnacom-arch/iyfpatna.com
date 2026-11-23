"use client";

import { useId, useState } from "react";

/**
 * The footer's link columns, as a row of chips on mobile.
 *
 * The footer has to carry a lot that cannot be dropped — every nav entry, all
 * six legal documents the payment gateway checks for by name, and the contact
 * details — which stacked on a phone is a wall of links under every page. So
 * below `md` the three headings collapse into one row of small buttons and
 * only the chosen panel is shown; from `md` up the row disappears and the
 * columns render exactly as they always have, headings and all.
 *
 * One DOM tree serves both: each section always renders, and the mobile/desktop
 * difference is only which parts are display:none. Rendering mobile and desktop
 * variants separately would duplicate every link and every nav landmark.
 *
 * `sections` arrives from the server component with its `content` already
 * rendered, so the copy and the config stay in SiteFooter where the rest of the
 * footer's content lives.
 */
export function FooterSections({ sections }) {
  const [openKey, setOpenKey] = useState(null);
  const idPrefix = useId();

  const panelId = (key) => `${idPrefix}-${key}`;

  return (
    <>
      {/* Mobile: one row of chips in place of three stacked headings. */}
      <div className="mb-1 flex flex-wrap gap-2 md:hidden">
        {sections.map((section) => {
          const isOpen = openKey === section.key;

          return (
            <button
              key={section.key}
              type="button"
              onClick={() => setOpenKey(isOpen ? null : section.key)}
              aria-expanded={isOpen}
              aria-controls={panelId(section.key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                isOpen
                  ? "border-foreground bg-foreground text-background"
                  : "border-border/70 text-muted-foreground hover:text-foreground"
              }`}
            >
              {section.title}
            </button>
          );
        })}
      </div>

      {sections.map((section) => {
        const Wrapper = section.as === "nav" ? "nav" : "div";
        const isOpen = openKey === section.key;

        return (
          <Wrapper
            key={section.key}
            className={section.className}
            aria-label={section.as === "nav" ? section.title : undefined}
          >
            {/* The chip is the heading on mobile; this one takes over at md. */}
            <h2 className="hidden text-[11px] font-semibold tracking-wider text-foreground/70 uppercase md:block">
              {section.title}
            </h2>
            <div
              id={panelId(section.key)}
              className={`pt-3 md:block md:pt-3 ${isOpen ? "" : "hidden"}`}
            >
              {section.content}
            </div>
          </Wrapper>
        );
      })}
    </>
  );
}
