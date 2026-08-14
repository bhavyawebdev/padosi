import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Star, Shield } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { TrustLevel } from "@/types/domain";

const trustConfig: Record<TrustLevel, {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  className: string;
}> = {
  new: {
    label: "New Member",
    icon: Shield,
    className: "bg-surface-container text-on-surface-variant",
  },
  basic: {
    label: "Basic",
    icon: Shield,
    className: "bg-surface-container-high text-on-surface",
  },
  trusted: {
    label: "Trusted",
    icon: Star,
    className: "bg-secondary-container/40 text-on-secondary-container border border-secondary-container/60",
  },
  verified: {
    label: "Verified",
    icon: ShieldCheck,
    className: "bg-secondary-container/50 text-on-secondary-container border border-secondary-container/70",
  },
};

interface TrustBadgeProps {
  level: TrustLevel;
  className?: string;
}

export function TrustBadge({ level, className }: TrustBadgeProps) {
  const config = trustConfig[level];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 label-sm font-semibold tracking-wide",
        config.className,
        className
      )}
      aria-label={`Trust level: ${config.label}`}
    >
      <Icon size={12} aria-hidden="true" />
      {config.label}
    </span>
  );
}

interface VerificationBadgeProps {
  isVerified: boolean;
  className?: string;
}

export function VerificationBadge({ isVerified, className }: VerificationBadgeProps) {
  if (!isVerified) return null;

  return (
    <Badge
      variant="help"
      className={cn("gap-1 px-3 py-1 font-semibold", className)}
      aria-label="Community verified"
    >
      <ShieldCheck size={13} aria-hidden="true" />
      Verified Help
    </Badge>
  );
}
