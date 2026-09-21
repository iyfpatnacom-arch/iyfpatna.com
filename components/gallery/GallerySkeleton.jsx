import { Skeleton } from "@/components/ui/skeleton";

// Mixed heights so the placeholder reads as a masonry grid, not a table.
const HEIGHTS = ["h-56", "h-40", "h-64", "h-48", "h-36", "h-60", "h-44", "h-52"];

export function GalleryGridSkeleton({ count = 12 }) {
  return (
    <div className="mt-10 columns-2 gap-3 sm:gap-4 md:columns-3 lg:columns-4" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton
          key={i}
          className={`mb-3 w-full rounded-xl sm:mb-4 ${HEIGHTS[i % HEIGHTS.length]}`}
        />
      ))}
    </div>
  );
}

export function GalleryPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-4 h-9 w-3/4 max-w-md" />
      <Skeleton className="mt-5 h-4 w-full max-w-2xl" />
      <Skeleton className="mt-2 h-4 w-2/3 max-w-lg" />
      <GalleryGridSkeleton />
    </div>
  );
}
