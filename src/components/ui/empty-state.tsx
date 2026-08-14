import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "./button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 md:p-12",
        "rounded-3xl border border-dashed border-outline-variant/50 bg-surface-container-low/50",
        className
      )}
    >
      {icon && (
        <div className="w-14 h-14 rounded-full bg-secondary-container/30 text-primary flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h4 className="headline-md font-bold text-on-surface mb-2">{title}</h4>
      <p className="body-md text-on-surface-variant max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
