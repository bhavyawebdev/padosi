import { cn } from "@/lib/utils/cn";

interface CountBadgeProps {
  count: number;
  className?: string;
}

/**
 * CountBadge — small primary pill used for unread counts (nav items,
 * conversation rows, header icons). Renders nothing when count is zero.
 */
export function CountBadge({ count, className }: CountBadgeProps) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full",
        "bg-primary text-on-primary text-[11px] font-bold leading-none",
        "transition-transform duration-150 select-none",
        className
      )}
      aria-label={`${count} unread`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
