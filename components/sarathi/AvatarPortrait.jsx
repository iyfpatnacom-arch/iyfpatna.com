import { IkImage } from "@/components/media/IkImage";
import { cn } from "@/lib/utils";

/**
 * An avatar's portrait — the photograph when `avatar.portrait` is set, the
 * monogram otherwise — in a saffron-to-purple ring.
 *
 * The disclaimer beside the chat, not the absence of a face, is what keeps a
 * visitor from mistaking AI-written words for the acharya's own.
 */
export function AvatarPortrait({ avatar, size = "md", className }) {
  const sizes = {
    sm: { ring: "size-9 text-[11px]", px: 36 },
    md: { ring: "size-14 text-base", px: 56 },
    lg: { ring: "size-20 text-xl", px: 80 },
  };
  const { ring, px } = sizes[size] ?? sizes.md;

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-linear-to-br from-primary to-brand-purple p-[2px]",
        ring,
        className
      )}
      aria-hidden="true"
    >
      <span className="relative grid size-full place-items-center overflow-hidden rounded-full bg-card font-semibold tracking-wide text-foreground">
        {avatar.portrait ? (
          <IkImage
            src={avatar.portrait}
            alt=""
            fill
            sizes={`${px}px`}
            className="object-cover"
          />
        ) : (
          avatar.monogram
        )}
      </span>
    </span>
  );
}
