import { MapPin, Clock } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatDistance, timeAgo, isActive } from "@/lib/utils/format";

interface DistanceLabelProps {
  distanceMeters: number;
  className?: string;
}

/**
 * DistanceLabel — Shows how far away a post is from the user.
 * Formatted in meters (<1km) or km (≥1km).
 */
export function DistanceLabel({ distanceMeters, className }: DistanceLabelProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs text-[var(--color-on-surface-variant)]",
        className,
      )}
      aria-label={`${formatDistance(distanceMeters)} away`}
    >
      <MapPin size={11} aria-hidden="true" />
      {formatDistance(distanceMeters)}
    </span>
  );
}

interface ExpiryLabelProps {
  expiresAt: string;
  className?: string;
}

/**
 * ExpiryLabel — Shows when a post expires.
 * Changes color when post is about to expire or has expired.
 */
export function ExpiryLabel({ expiresAt, className }: ExpiryLabelProps) {
  const active = isActive(expiresAt);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs",
        active
          ? "text-[var(--color-on-surface-variant)]"
          : "text-[var(--color-error)]",
        className,
      )}
      aria-label={active ? `Expires ${timeAgo(expiresAt)}` : "Expired"}
    >
      <Clock size={11} aria-hidden="true" />
      {active ? timeAgo(expiresAt) : "Expired"}
    </span>
  );
}
