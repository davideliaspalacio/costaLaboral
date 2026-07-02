import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border-2 border-ink px-2.5 py-0.5 text-xs font-bold",
  {
    variants: {
      tone: {
        brand: "bg-brand-100 text-brand-800",
        accent: "bg-accent-100 text-accent-700",
        sol: "bg-sol-300 text-ink",
        success: "bg-success-50 text-success-600",
        warn: "bg-warn-50 text-warn-500",
        danger: "bg-danger-50 text-danger-600",
        neutral: "bg-surface text-ink-soft",
        outline: "bg-surface text-ink-soft",
        ink: "bg-ink text-canvas",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
