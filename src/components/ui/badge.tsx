import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  [
    "inline-flex items-center gap-1.5",
    "rounded-full px-3 py-1",
    "label-sm font-semibold tracking-wide",
    "transition-colors duration-150 select-none",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-surface-container text-on-surface-variant",
        primary:
          "bg-primary-fixed text-on-primary-fixed-variant",
        secondary:
          "bg-secondary-fixed text-on-secondary-fixed-variant",
        tertiary:
          "bg-tertiary-fixed text-on-tertiary-fixed-variant",
        outline:
          "border border-outline-variant text-on-surface-variant bg-surface-container-lowest",
        nearby:
          "bg-secondary-container/40 text-on-secondary-container border border-secondary-container/60",
        help:
          "bg-secondary-container/40 text-on-secondary-container border border-secondary-container/60",
        need:
          "bg-tertiary-fixed/60 text-on-tertiary-fixed-variant border border-tertiary-fixed",
        error:
          "bg-error-container text-on-error-container",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge, badgeVariants };
