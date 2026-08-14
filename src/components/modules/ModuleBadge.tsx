import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { moduleConfigs } from "@/config/modules";
import type { Module } from "@/types/domain";
import { MapPin, HandHeart, AlertCircle, type LucideIcon } from "lucide-react";

const iconMap: Record<Module, LucideIcon> = {
  nearby: MapPin,
  help: HandHeart,
  need: AlertCircle,
};

interface ModuleBadgeProps {
  module: Module;
  className?: string;
}

export function ModuleBadge({ module, className }: ModuleBadgeProps) {
  const config = moduleConfigs[module];
  const Icon = iconMap[module];

  const variantMap: Record<Module, "nearby" | "help" | "need"> = {
    nearby: "nearby",
    help: "help",
    need: "need",
  };

  return (
    <Badge
      variant={variantMap[module]}
      className={cn("gap-1.5 font-medium px-3 py-1", className)}
      aria-label={`Module: ${config.label}`}
    >
      <Icon size={13} aria-hidden="true" />
      <span>{config.label}</span>
    </Badge>
  );
}
