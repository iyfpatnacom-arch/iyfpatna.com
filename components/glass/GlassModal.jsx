"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function GlassModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-md rounded-3xl border border-glass/12 bg-popover/95 bg-gradient-to-br from-glass/10 to-glass/[0.03] p-6 text-foreground backdrop-blur-2xl backdrop-saturate-150",
          "shadow-[inset_0_1px_0_var(--glass-hi),0_30px_60px_-20px_var(--glass-shadow)]",
          className
        )}
      >
        {(title || description) && (
          <DialogHeader>
            {title && (
              <DialogTitle className="font-sans text-xl font-bold text-foreground">
                {title}
              </DialogTitle>
            )}
            {description && (
              <DialogDescription className="text-foreground/60">
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
