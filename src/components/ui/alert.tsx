import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const alertVariants = cva(
  [
    "relative w-full rounded-xl border px-4 py-3",
    "text-sm",
    "[&>svg]:absolute [&>svg]:left-4 [&>svg]:top-3.5 [&>svg+div]:pl-7",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-[var(--color-surface-container-low)]",
          "border-[var(--color-outline-variant)]",
          "text-[var(--color-on-surface)]",
        ].join(" "),
        destructive: [
          "bg-[var(--color-error-container)]",
          "border-[var(--color-error)]",
          "text-[var(--color-on-error-container)]",
        ].join(" "),
        success: [
          "bg-[var(--color-secondary-container)]",
          "border-[var(--color-secondary)]",
          "text-[var(--color-on-secondary-container)]",
        ].join(" "),
        info: [
          "bg-[var(--color-surface-container)]",
          "border-[var(--color-outline)]",
          "text-[var(--color-on-surface-variant)]",
        ].join(" "),
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight mb-1", className)}
    style={{ fontFamily: "var(--font-heading)" }}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("text-sm leading-relaxed", className)} {...props} />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
