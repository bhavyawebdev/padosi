import type { ReactNode } from "react";

import { Button } from "./Button";

export function Spinner({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <span
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-2 border-primary border-t-transparent ${className}`}
    />
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-on-surface-variant">
      <Spinner />
      <p className="text-label-md font-label-md">{label}</p>
    </div>
  );
}

interface EmptyStateProps {
  icon: string;
  title: string;
  message?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 px-5 text-center">
      <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center text-outline">
        <span aria-hidden className="material-symbols-outlined text-[32px]">
          {icon}
        </span>
      </div>
      <h3 className="text-headline-md font-headline-md text-on-background">{title}</h3>
      {message && <p className="text-body-md font-body-md text-on-surface-variant max-w-sm">{message}</p>}
      {action}
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 px-5 text-center">
      <div className="w-16 h-16 rounded-full bg-error-container/40 flex items-center justify-center text-error">
        <span aria-hidden className="material-symbols-outlined text-[32px]">
          error
        </span>
      </div>
      <h3 className="text-headline-md font-headline-md text-on-background">Something went wrong</h3>
      <p className="text-body-md font-body-md text-on-surface-variant max-w-sm">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/** Skeleton card used while the feed/directory loads. */
export function SkeletonCard() {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm animate-pulse space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-surface-container-high" />
        <div className="space-y-2 flex-1">
          <div className="h-3 w-1/2 rounded bg-surface-container-high" />
          <div className="h-2.5 w-1/3 rounded bg-surface-container-high" />
        </div>
      </div>
      <div className="h-3 w-full rounded bg-surface-container-high" />
      <div className="h-3 w-4/5 rounded bg-surface-container-high" />
    </div>
  );
}
