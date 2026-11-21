"use client";

import { Award, Medal, Trophy } from "lucide-react";
import { CardBody, CardContainer, CardItem } from "@/components/ui/3d-card";
import { cn } from "@/lib/utils";

/**
 * The three cash prizes, as cards that tilt toward the cursor.
 *
 * Aceternity's 3D card, which is the one piece of motion on this page that
 * rewards a pointer rather than just existing: the prizes are the reason most
 * people read the page at all, so they are the thing worth making tactile.
 *
 * The depths are deliberately shallow — 20 to 60px rather than the registry
 * example's 80 — because three cards tilting beside each other at full depth
 * read as a carnival. The medal lifts furthest, the amount next, the small
 * print stays on the card face.
 *
 * On touch there is no pointer to follow, so the tilt never fires and what is
 * left is three legible cards. That is the whole fallback, and it is why the
 * content is laid out to work flat.
 */

const RANKS = [
  {
    place: 1,
    Icon: Trophy,
    /* Brand gold for first, deliberately warmer than the other two so the
       podium reads at a glance without needing the ordinal. */
    ring: "border-primary/50 bg-gradient-to-b from-primary/[0.14] to-transparent",
    badge: "bg-primary/15 text-primary",
  },
  {
    place: 2,
    Icon: Medal,
    ring: "border-border bg-gradient-to-b from-muted/60 to-transparent",
    badge: "bg-muted text-muted-foreground",
  },
  {
    place: 3,
    Icon: Award,
    ring: "border-brand-gold-deep/35 bg-gradient-to-b from-brand-gold-deep/[0.1] to-transparent",
    badge: "bg-brand-gold-deep/12 text-brand-gold-deep dark:text-brand-gold-light",
  },
];

/** `prizes` is `[{ place, amount, label }]`, already localised and formatted. */
export function PrizePodium({ prizes, note }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
      {prizes.map((prize) => {
        const rank = RANKS.find((item) => item.place === prize.place) ?? RANKS[2];
        return (
          <CardContainer
            key={prize.place}
            /* The registry default is py-20, which would stack 5rem of air
               between three cards in a row. */
            containerClassName="py-0 block"
            className="w-full"
          >
            <CardBody
              className={cn(
                "h-auto w-full rounded-2xl border p-5 text-center",
                rank.ring,
              )}
            >
              <CardItem
                translateZ={60}
                className={cn(
                  "mx-auto grid size-11 place-items-center rounded-full",
                  rank.badge,
                )}
              >
                <rank.Icon className="size-5.5" aria-hidden="true" />
              </CardItem>
              <CardItem
                translateZ={40}
                as="p"
                className="mx-auto mt-3 text-2xl font-bold tracking-tight tabular-nums sm:text-3xl"
              >
                {prize.amount}
              </CardItem>
              <CardItem
                translateZ={20}
                as="p"
                className="mx-auto mt-1 text-xs font-medium text-muted-foreground"
              >
                {prize.label}
              </CardItem>
            </CardBody>
          </CardContainer>
        );
      })}
      {note && (
        <p className="text-center text-xs leading-relaxed text-muted-foreground sm:col-span-3">
          {note}
        </p>
      )}
    </div>
  );
}
