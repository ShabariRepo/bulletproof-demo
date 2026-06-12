import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = {
  default: "border-transparent bg-primary text-primary-foreground",
  resolved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  progress: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  escalated: "border-red-500/30 bg-red-500/10 text-red-300",
  queued: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
  outline: "border-border text-zinc-300"
};

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof badgeVariants;
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn("inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors", badgeVariants[variant], className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
