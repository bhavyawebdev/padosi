import { cn } from "@/lib/utils/cn";
import { Card, CardContent } from "@/components/ui/card";
import { ModuleBadge } from "@/components/modules/ModuleBadge";
import type { Module } from "@/types/domain";

interface ModuleCardProps {
  module: Module;
  title: string;
  excerpt?: string;
  meta?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * ModuleCard — Base card structure used by Nearby, Help, and Need posts.
 * Applies the correct module color accent and badge automatically.
 * Full business logic will be added in Stage 1.
 */
export function ModuleCard({
  module,
  title,
  excerpt,
  meta,
  footer,
  className,
  onClick,
}: ModuleCardProps) {


  return (
    <Card
      className={cn(
        "hover:shadow-[var(--shadow-md)] transition-shadow duration-200",
        "cursor-default bg-[var(--color-surface-container-lowest)] rounded-2xl",
        className,
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <ModuleBadge module={module} />
          {meta && <div className="text-xs text-[var(--color-on-surface-variant)]">{meta}</div>}
        </div>
        <h3
          className="font-bold text-[var(--color-on-surface)] text-lg leading-snug mb-1"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {title}
        </h3>
        {excerpt && (
          <p className="text-sm text-[var(--color-on-surface-variant)] line-clamp-2 leading-relaxed">
            {excerpt}
          </p>
        )}
        {footer && (
          <div className="mt-3 flex items-center gap-2">
            {footer}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
