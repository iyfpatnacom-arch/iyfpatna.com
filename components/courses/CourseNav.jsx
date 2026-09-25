"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { EnrollButton } from "@/components/courses/Enroll";
import { cn } from "@/lib/utils";

/**
 * The in-page nav that rides under the site header once the hero is past.
 *
 * The layout this page borrows from opens with its own sticky site header and
 * a mobile sheet menu. This site already has one of those in the root layout,
 * and a second bar carrying the same destinations would be both a duplicate
 * and, on a phone, seven rems of chrome over the content. So the slot keeps
 * the shape and changes the job: these links move around *this* page, which
 * is long enough — eleven sections — that a reader deciding whether to pay
 * genuinely benefits from jumping to the FAQ or the price and back.
 *
 * It is sticky rather than fixed, and it sits after the hero in the document,
 * so it simply scrolls into place and parks below the header. Nothing has to
 * watch the scroll position to decide whether it should be on screen — which
 * is the failure mode of the fixed version of this bar, where a mis-fired
 * observer leaves an invisible strip swallowing taps at the top of the page.
 *
 * `top-16` is the site header's `h-16`, and `Section`'s `scroll-mt-32` is the
 * two of them stacked; if either height changes, both numbers move together.
 */
export function CourseNav({ title, sections, ctaLabel, menuLabel, navLabel }) {
  const [active, setActive] = useState(null);
  const [open, setOpen] = useState(false);

  // Joined rather than the array itself: the prop is rebuilt on every render
  // of the page that owns it, and an array identity in the dependency list
  // would tear the observer down and rebuild it each time.
  const ids = sections.map((section) => section.id).join(",");

  useEffect(() => {
    const targets = ids
      .split(",")
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (!targets.length) return;

    // The band runs from just under the nav to a little above the fold, so the
    // section being *read* is the one that wins — not whichever one happens to
    // have a pixel on screen at the bottom.
    const observer = new IntersectionObserver(
      (entries) => {
        const onscreen = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (onscreen.length) setActive(onscreen[0].target.id);
      },
      { rootMargin: "-25% 0px -65% 0px" }
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [ids]);

  const close = () => setOpen(false);

  return (
    <div className="sticky top-16 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
        <p className="min-w-0 truncate text-sm font-semibold tracking-tight">{title}</p>

        <nav aria-label={navLabel} className="ms-auto hidden items-center gap-1 lg:flex">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              aria-current={active === section.id ? "true" : undefined}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                active === section.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {section.label}
            </a>
          ))}
        </nav>

        {/* Hidden below `md`, where `StickyEnrollBar` is already carrying the
            price and a Register button along the bottom of the screen. Two
            live CTAs on one phone viewport is not twice the invitation — it
            just costs the nav the room it needs for the title. */}
        <EnrollButton
          className="hidden h-9 px-4 text-sm shadow-none md:inline-flex md:ms-auto lg:ms-3"
          showArrow={false}
        >
          {ctaLabel}
        </EnrollButton>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button
                variant="outline"
                size="icon-lg"
                className="ms-auto shrink-0 rounded-full md:ms-0 lg:hidden"
                aria-label={menuLabel}
              />
            }
          >
            <Menu className="size-4" aria-hidden="true" />
          </SheetTrigger>

          <SheetContent side="right" className="gap-0">
            <SheetHeader className="border-b border-border/70 px-4 py-4">
              <SheetTitle>{menuLabel}</SheetTitle>
            </SheetHeader>
            <nav aria-label={navLabel} className="flex flex-col p-3">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  onClick={close}
                  aria-current={active === section.id ? "true" : undefined}
                  className={cn(
                    "rounded-xl px-3 py-3 text-[15px] font-medium transition-colors",
                    active === section.id
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  {section.label}
                </a>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
