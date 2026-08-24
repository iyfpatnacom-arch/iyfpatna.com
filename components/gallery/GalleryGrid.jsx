"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export function GalleryGrid({ items }) {
  const locale = useLocale();
  const [active, setActive] = useState(null);

  return (
    <>
      <div className="mt-10 columns-2 gap-3 md:columns-3 lg:columns-4">
        {items.map((item) => (
          <button
            key={item._id}
            onClick={() => setActive(item)}
            className="mb-3 block w-full overflow-hidden rounded-2xl border border-glass/10"
          >
            <img
              src={item.image}
              alt={item.caption?.[locale] ?? ""}
              loading="lazy"
              className="w-full object-cover transition-transform hover:scale-105"
            />
          </button>
        ))}
      </div>

      <Dialog open={!!active} onOpenChange={(v) => !v && setActive(null)}>
        <DialogContent
          showCloseButton={false}
          className="max-w-3xl border-none bg-transparent p-0 shadow-none"
        >
          {active && (
            <div className="relative">
              <img
                src={active.image}
                alt={active.caption?.[locale] ?? ""}
                className="w-full rounded-2xl"
              />
              {active.caption?.[locale] && (
                <p className="mt-3 text-center text-sm text-foreground/70">
                  {active.caption[locale]}
                </p>
              )}
              <button
                onClick={() => setActive(null)}
                className="absolute -top-3 -right-3 grid h-9 w-9 place-items-center rounded-full bg-popover text-foreground shadow-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
