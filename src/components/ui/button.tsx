import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-sans font-semibold text-sm tracking-wide",
    "rounded-xl border border-transparent",
    "transition-all duration-180 cubic-bezier(0.33, 1, 0.68, 1)",
    "cursor-pointer select-none outline-none",
    "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
    "active:scale-[0.98]",
  ].join(" "),
  {
    variants: {
      variant: {
        primary: [
          "bg-primary text-on-primary shadow-sm",
          "hover:bg-primary-container hover:text-on-primary-container",
          "border-transparent",
        ].join(" "),
        secondary: [
          "bg-secondary text-on-secondary shadow-sm",
          "hover:bg-secondary-container hover:text-on-secondary-container",
          "border-transparent",
        ].join(" "),
        outline: [
          "bg-transparent text-primary",
          "border-[1.5px] border-outline",
          "hover:bg-surface-container-low hover:border-primary",
        ].join(" "),
        ghost: [
          "bg-transparent text-on-surface",
          "hover:bg-surface-container",
          "border-transparent",
        ].join(" "),
        destructive: [
          "bg-error text-on-error shadow-sm",
          "hover:bg-error/90",
          "border-transparent",
        ].join(" "),
        link: [
          "bg-transparent text-primary",
          "underline-offset-4 hover:underline",
          "border-transparent p-0 h-auto font-medium",
        ].join(" "),
        fab: [
          "bg-primary text-on-primary shadow-lg",
          "hover:bg-primary-container hover:scale-105",
          "rounded-full p-4",
        ].join(" "),
        nearby: [
          "bg-primary text-on-primary",
          "hover:opacity-90",
          "border-transparent",
        ].join(" "),
        help: [
          "bg-secondary text-on-secondary",
          "hover:opacity-90",
          "border-transparent",
        ].join(" "),
        need: [
          "bg-tertiary text-on-tertiary",
          "hover:opacity-90",
          "border-transparent",
        ].join(" "),
      },
      size: {
        sm: "h-9 px-3 text-xs rounded-lg",
        md: "h-11 px-5 text-sm rounded-xl",
        lg: "h-13 px-6 text-base rounded-2xl",
        xl: "h-14 px-8 text-base rounded-2xl",
        icon: "h-10 w-10 p-0 rounded-xl",
        "icon-sm": "h-8 w-8 p-0 rounded-lg",
        "icon-lg": "h-12 w-12 p-0 rounded-2xl",
        fab: "h-14 w-14 p-0 rounded-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading ? (
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
