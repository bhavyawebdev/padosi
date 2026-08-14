import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const generatedId = React.useId();
    const textareaId = id ?? generatedId;
    const errorId = `${textareaId}-error`;
    const hintId = `${textareaId}-hint`;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="label-md text-on-surface font-semibold tracking-wide"
          >
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={cn(
            "w-full min-h-[110px] rounded-2xl border px-4 py-3",
            "bg-surface-container-lowest text-on-surface body-md",
            "placeholder:text-on-surface-variant/70",
            "resize-y transition-all duration-180 ease-out outline-none",
            "focus:border-primary focus:ring-2 focus:ring-primary/20",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error
              ? "border-error focus:border-error focus:ring-error/20"
              : "border-outline-variant hover:border-outline",
            className
          )}
          {...props}
        />
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

Textarea.displayName = "Textarea";

export { Textarea };
