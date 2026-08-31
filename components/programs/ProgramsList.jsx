"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarClock, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaTile } from "@/components/media/MediaTile";
import { mediaFor } from "@/lib/site-config";
import { JoinModal } from "./JoinModal";

/**
 * The Programs and Courses card grid.
 *
 * One component serves both because they differ only in which secondary line
 * they carry — a schedule and a place for a program, a duration for a course.
 *
 * What sits at the top of each card is decided entirely by `mediaFor()`, so a
 * clip can be given to a single program later without touching this file.
 */
export function ProgramsList({
  items,
  itemType,
  clerkConfigured,
  registrationsOpen,
}) {
  const t = useTranslations(itemType === "course" ? "courses" : "programs");
  const locale = useLocale();
  const [joinItem, setJoinItem] = useState(null);

  if (items.length === 0) {
    return (
      <p className="mt-12 text-center text-muted-foreground">{t("empty")}</p>
    );
  }

  return (
    <>
      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const media = mediaFor(item, itemType);
          const title = item.title?.[locale];

          return (
            <li
              key={item._id}
              className="flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/40"
            >
              {media && (
                <div className="relative aspect-video w-full overflow-hidden bg-muted">
                  <MediaTile
                    media={media}
                    alt={title}
                    className="absolute inset-0 size-full object-cover"
                  />
                </div>
              )}

              <div className="flex flex-1 flex-col gap-2 p-5">
                <h3 className="font-semibold tracking-tight">{title}</h3>
                <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                  {item.description?.[locale]}
                </p>

                <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-primary">
                  {itemType === "course" ? (
                    <Clock className="size-3.5" aria-hidden="true" />
                  ) : (
                    <CalendarClock className="size-3.5" aria-hidden="true" />
                  )}
                  {itemType === "course"
                    ? item.duration?.[locale]
                    : item.schedule?.[locale]}
                </p>

                {itemType === "program" && item.location?.[locale] && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="size-3.5 opacity-70" aria-hidden="true" />
                    {item.location[locale]}
                  </p>
                )}

                <Button
                  onClick={() => setJoinItem(item)}
                  disabled={!registrationsOpen}
                  className="mt-3 w-full rounded-full"
                >
                  {registrationsOpen ? t("join_button") : t("closed_button")}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <JoinModal
        open={!!joinItem}
        onOpenChange={(v) => !v && setJoinItem(null)}
        item={joinItem}
        itemType={itemType}
        clerkConfigured={clerkConfigured}
      />
    </>
  );
}
