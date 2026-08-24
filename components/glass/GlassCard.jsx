import { cn } from "@/lib/utils";

export function GlassCard({ className, children, tint = "gold", ...props }) {
  const tints = {
    gold: "bg-gradient-to-br from-glass/10 to-glass/[0.03]",
    purple: "bg-gradient-to-br from-brand-purple/25 to-glass/[0.02]",
  };

  return (
    <div
      className={cn(
        "relative rounded-3xl border border-glass/10",
        tints[tint],
        "shadow-[inset_0_1px_0_var(--glass-hi),0_22px_50px_-26px_var(--glass-shadow)]",
        "backdrop-blur-xl backdrop-saturate-150",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
