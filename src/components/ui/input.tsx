import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, hint, leftIcon, rightElement, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="label-md text-on-surface font-semibold tracking-wide"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span
              className="absolute left-4 text-on-surface-variant pointer-events-none flex items-center justify-center"
              aria-hidden="true"
            >
              {leftIcon}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            type={type}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            className={cn(
              "w-full h-12 rounded-2xl border bg-surface-container-lowest",
              "text-on-surface body-md placeholder:text-on-surface-variant/70",
              "transition-all duration-180 ease-out outline-none",
              "focus:border-primary focus:ring-2 focus:ring-primary/20",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              leftIcon ? "pl-11" : "pl-4",
              rightElement ? "pr-11" : "pr-4",
              error
                ? "border-error focus:border-error focus:ring-error/20"
                : "border-outline-variant hover:border-outline",
              className
            )}
            {...props}
          />
          {rightElement && (
            <span className="absolute right-4 text-on-surface-variant flex items-center justify-center">
              {rightElement}
            </span>
          )}
        </div>
        {error && (
          <p id={errorId} role="alert" className="label-sm text-error mt-0.5">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="label-sm text-on-surface-variant mt-0.5">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
