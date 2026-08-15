import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: string;
  loading?: boolean;
  children?: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container shadow-sm",
  secondary:
    "bg-surface text-primary border border-primary hover:bg-surface-variant",
  ghost: "bg-surface-container text-on-surface-variant hover:bg-surface-variant",
  danger: "bg-error-container text-on-error-container hover:bg-error hover:text-on-error",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 rounded-lg text-label-sm font-label-sm",
  md: "px-4 py-2 rounded-lg text-label-md font-label-md",
  lg: "px-6 py-3 rounded-full text-label-md font-label-md",
};

export function Button({
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span
          aria-hidden
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : (
        icon && (
          <span aria-hidden className="material-symbols-outlined text-[20px]">
            {icon}
          </span>
        )
      )}
      {children}
    </button>
  );
}
