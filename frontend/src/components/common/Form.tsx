import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

const fieldClasses =
  "w-full bg-surface rounded-xl border border-outline-variant px-5 py-3 font-body-md text-body-md text-on-background placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow";

interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, hint, error, children, className }: FieldProps) {
  return (
    <label className={cn("block space-y-2", className)}>
      {label && (
        <span className="block text-label-md font-label-md text-on-surface-variant">{label}</span>
      )}
      {children}
      {hint && !error && <span className="block text-label-sm font-label-sm text-outline">{hint}</span>}
      {error && <span className="block text-label-sm font-label-sm text-error">{error}</span>}
    </label>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClasses, className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldClasses, "resize-none", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldClasses, "appearance-none pr-5", className)} {...rest}>
      {children}
    </select>
  );
}

/** Recessed search input with a leading icon (screen 02 pattern). */
export function SearchInput({
  className,
  icon = "search",
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { icon?: string }) {
  return (
    <div className="relative">
      <span
        aria-hidden
        className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
      >
        {icon}
      </span>
      <input
        className={cn(
          "w-full pl-[40px] pr-3 py-3 bg-surface-container-highest border border-outline-variant rounded-full text-body-md font-body-md placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-inner",
          className,
        )}
        {...rest}
      />
    </div>
  );
}
