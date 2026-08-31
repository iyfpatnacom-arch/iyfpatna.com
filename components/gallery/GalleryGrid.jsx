"use client";

import { useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

/**
 * Masonry gallery with a lightbox.
 *
 * Uses next/image rather than a bare <img> so the grid ships resized,
 * modern-format copies instead of full-size phone photographs — these come
 * straight off WhatsApp and the page shows all of them at once.
 *
 * Each entry carries its intrinsic width and height, which is what lets the
 * columns reserve the right space before anything loads, so the masonry does
 * not reflow as images arrive. Accepts both shapes in play: `{src}` from the
 * config list and `{image}` from a database row.
 */
export function GalleryGrid({ items }) {
  const locale = useLocale();
  const t = useTranslations("gallery");
  const [active, setActive] = useState(null);

  const captionOf = (item) =>
    typeof item.caption === "string" ? item.caption : item.caption?.[locale];

  return (
    <>
      <div className="mt-10 columns-2 gap-4 md:columns-3 lg:columns-4">
        {items.map((item) => {
          const caption = captionOf(item);
          return (
            <button
              key={item._id ?? item.id ?? item.src ?? item.image}
              type="button"
              onClick={() => setActive(item)}
              aria-label={caption || t("open_image")}
              className="mb-4 block w-full overflow-hidden rounded-xl border border-border transition-colors hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <Image
                src={item.src ?? item.image}
                alt={caption ?? ""}
                width={item.width ?? 900}
                height={item.height ?? 700}
                sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                className="w-full transition-transform duration-300 hover:scale-[1.03]"
              />
            </button>
          );
        })}
      </div>

      <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent
          showCloseButton={false}
          className="max-w-4xl border-none bg-transparent p-0 shadow-none"
        >
          {active && (
            <div className="relative">
              <Image
                src={active.src ?? active.image}
                alt={captionOf(active) ?? ""}
                width={active.width ?? 1600}
                height={active.height ?? 1200}
                sizes="100vw"
                className="h-auto w-full rounded-xl"
              />
              {captionOf(active) && (
                <p className="mt-3 text-center text-sm text-muted-foreground">
                  {captionOf(active)}
                </p>
              )}
              <button
                type="button"
                onClick={() => setActive(null)}
                aria-label={t("close_image")}
                className="absolute -top-3 -right-3 grid size-9 place-items-center rounded-full bg-popover text-foreground shadow-lg"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
