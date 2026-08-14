import type { Module, ModuleConfig } from "@/types/domain";

export const moduleConfigs: Record<Module, ModuleConfig> = {
  nearby: {
    id: "nearby",
    label: "Nearby Right Now",
    description: "See what's happening right now in your neighbourhood.",
    color: "var(--module-nearby)",
    icon: "MapPin",
  },
  help: {
    id: "help",
    label: "Verified Help",
    description: "Community-verified help offers near you.",
    color: "var(--module-help)",
    icon: "HandHeart",
  },
  need: {
    id: "need",
    label: "Need It Now",
    description: "Request urgent help from your neighbourhood.",
    color: "var(--module-need)",
    icon: "AlertCircle",
  },
};

export const moduleList: ModuleConfig[] = Object.values(moduleConfigs);

export function getModuleConfig(module: Module): ModuleConfig {
  return moduleConfigs[module];
}
