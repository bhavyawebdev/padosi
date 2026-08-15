import { formatDistance } from "@/lib/geo";
import { cn } from "@/lib/cn";

interface DistanceChipProps {
  distanceM: number | null | undefined;
  /** Material symbol icon — default location_on for feed, directions_walk for requests. */
  icon?: string;
  className?: string;
}

export function DistanceChip({ distanceM, icon = "location_on", className }: DistanceChipProps) {
  const label = formatDistance(distanceM);
  if (!label) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 bg-surface-container-lowest/95 border border-outline-variant rounded-lg px-2 py-1 text-label-sm font-label-sm text-on-surface shadow-sm",
        className,
      )}
    >
      <span aria-hidden className="material-symbols-outlined text-[15px] text-tertiary" style={{ fontVariationSettings: "'FILL'1" }}>
        {icon}
      </span>
      {label}
    </span>
  );
}
