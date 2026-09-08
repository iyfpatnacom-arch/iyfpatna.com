"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * A titled dialog, on the site's own surface.
 *
 * Replaces `GlassModal`, which layered a gradient, a 2xl backdrop blur and a
 * 60px shadow over `DialogContent` — all of it fighting a primitive that is
 * already a solid popover with a hairline ring. What is left is the header
 * shape, which is the only part that was ever doing work.
 */
export function Modal({ open, onOpenChange, title, description, children, className }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-md p-6", className)}>
        {(title || description) && (
          <DialogHeader>
            {title && (
              <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
                {title}
              </DialogTitle>
            )}
            {description && (
              <DialogDescription className="text-muted-foreground">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>
        )}
        {children}
      </DialogContent>
    </Dialog>
  );
}
