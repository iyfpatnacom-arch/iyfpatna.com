"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { loaderFor } from "@/lib/imagekit-loader";

const srcOf = (item) => item.src ?? item.image;

/**
 * A photograph that holds its space with a pulsing placeholder and fades in
 * once decoded, so the grid is stable from the first paint.
 */
function Photo({ item, alt, sizes, eager, className }) {
  const [loaded, setLoaded] = useState(false);
  const width = item.width ?? 900;
  const height = item.height ?? 700;

  return (
    <span
      className={cn("relative block overflow-hidden", !loaded && "animate-pulse bg-muted")}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      <Image
        src={srcOf(item)}
        loader={loaderFor(srcOf(item))}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
        onLoad={() => setLoaded(true)}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-500",
          loaded ? "opacity-100" : "opacity-0",
          className,
        )}
      />
    </span>
  );
}

/**
 * Masonry gallery with a full-screen lightbox.
 *
 * Each entry carries its intrinsic width and height, which is what lets the
 * columns reserve the right space before anything loads, so the masonry does
 * not reflow as images arrive. Accepts both shapes in play: `{src}` from the
 * config list and `{image}` from a database row.
 */
export function GalleryGrid({ items }) {
  const locale = useLocale();
  const t = useTranslations("gallery");
  const [index, setIndex] = useState(null);

  const captionOf = (item) =>
    typeof item.caption === "string" ? item.caption : item.caption?.[locale];

  return (
    <>
      <div className="mt-10 columns-2 gap-3 sm:gap-4 md:columns-3 lg:columns-4">
        {items.map((item, i) => {
          const caption = captionOf(item);
          return (
            <button
              key={item._id ?? item.id ?? srcOf(item)}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={caption || t("open_image")}
              className="group mb-3 block w-full break-inside-avoid overflow-hidden rounded-xl border border-border transition-colors hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:mb-4"
            >
              <Photo
                item={item}
                alt={caption ?? ""}
                sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                eager={i < 4}
                className="transition-[opacity,transform] duration-500 group-hover:scale-[1.03]"
              />
            </button>
          );
        })}
      </div>

      <Lightbox
        items={items}
        index={index}
        onIndexChange={setIndex}
        captionOf={captionOf}
      />
    </>
  );
}

function Lightbox({ items, index, onIndexChange, captionOf }) {
  const t = useTranslations("gallery");
  const open = index !== null;
  const active = open ? items[index] : null;
  const count = items.length;
  const [loadedSrc, setLoadedSrc] = useState(null);
  const loading = !active || loadedSrc !== srcOf(active);
  const touchStart = useRef(null);

  const go = useCallback(
    (step) => onIndexChange((i) => (i === null ? i : (i + step + count) % count)),
    [count, onIndexChange],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go]);

  // Warm the neighbours so swiping feels instant.
  useEffect(() => {
    if (!open || count < 2) return;
    for (const step of [1, -1]) {
      const item = items[(index + step + count) % count];
      const loader = loaderFor(srcOf(item));
      const img = new window.Image();
      img.src = loader ? loader({ src: srcOf(item), width: 1080 }) : srcOf(item);
    }
  }, [open, index, items, count]);

  const onTouchStart = (e) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
    else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) onIndexChange(null);
  };

  const caption = active ? captionOf(active) : null;
  const navButton =
    "grid size-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none";

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onIndexChange(null)}>
      <DialogContent
        showCloseButton={false}
        className="inset-0 top-0 left-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none bg-black/95 p-0 text-white ring-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">{caption || t("open_image")}</DialogTitle>

        {active && (
          <>
            <div className="flex shrink-0 items-center justify-between px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-2">
              <span className="text-sm text-white/70 tabular-nums">
                {index + 1} / {count}
              </span>
              <button
                type="button"
                onClick={() => onIndexChange(null)}
                aria-label={t("close_image")}
                className={navButton}
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            <div
              className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {loading && (
                <Loader2
                  className="absolute size-8 animate-spin text-white/60"
                  aria-hidden="true"
                />
              )}
              <Image
                key={srcOf(active)}
                src={srcOf(active)}
                loader={loaderFor(srcOf(active))}
                alt={caption ?? ""}
                width={active.width ?? 1600}
                height={active.height ?? 1200}
                sizes="(min-width: 1024px) 80vw, 100vw"
                loading="eager"
                onLoad={() => setLoadedSrc(srcOf(active))}
                className={cn(
                  "h-auto max-h-full w-auto max-w-full rounded-lg object-contain transition-opacity duration-300 select-none",
                  loading ? "opacity-0" : "opacity-100",
                )}
                draggable={false}
              />

              {count > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => go(-1)}
                    aria-label={t("previous_image")}
                    className={cn(navButton, "absolute left-3 hidden sm:grid")}
                  >
                    <ChevronLeft className="size-6" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => go(1)}
                    aria-label={t("next_image")}
                    className={cn(navButton, "absolute right-3 hidden sm:grid")}
                  >
                    <ChevronRight className="size-6" aria-hidden="true" />
                  </button>
                </>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-between gap-3 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)]">
              {count > 1 ? (
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label={t("previous_image")}
                  className={cn(navButton, "sm:invisible")}
                >
                  <ChevronLeft className="size-6" aria-hidden="true" />
                </button>
              ) : (
                <span />
              )}
              <p className="line-clamp-2 flex-1 text-center text-sm text-white/80">
                {caption}
              </p>
              {count > 1 ? (
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label={t("next_image")}
                  className={cn(navButton, "sm:invisible")}
                >
                  <ChevronRight className="size-6" aria-hidden="true" />
                </button>
              ) : (
                <span />
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
