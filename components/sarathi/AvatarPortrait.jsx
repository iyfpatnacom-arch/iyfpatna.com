import { cn } from "@/lib/utils";

/**
 * An avatar's monogram in a saffron-to-purple ring.
 *
 * A monogram rather than a photograph: the photographs of Srila Prabhupada
 * are the BBT's, and a portrait beside AI-written words invites exactly the
 * confusion the disclaimer is there to prevent.
 */
export function AvatarPortrait({ avatar, size = "md", className }) {
  const sizes = {
    sm: "size-9 text-[11px]",
    md: "size-14 text-base",
    lg: "size-20 text-xl",
  };

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-linear-to-br from-primary to-brand-purple p-[2px]",
        sizes[size] ?? sizes.md,
        className
      )}
      aria-hidden="true"
    >
      <span className="grid size-full place-items-center rounded-full bg-card font-semibold tracking-wide text-foreground">
        {avatar.monogram}
      </span>
    </span>
  );
}
