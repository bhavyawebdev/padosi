import type { FeedCategory } from "@/types";

export interface CategoryMeta {
  value: FeedCategory;
  label: string;
  /** Material Symbols icon name. */
  icon: string;
  /** Icon bubble classes (screen 01 pattern). */
  bubble: string;
  /** Active filter chip classes. */
  chipActive: string;
}

export const FEED_CATEGORIES: CategoryMeta[] = [
  {
    value: "traffic",
    label: "Traffic",
    icon: "traffic",
    bubble: "bg-secondary-container text-on-secondary-container",
    chipActive: "bg-secondary text-on-secondary",
  },
  {
    value: "civic",
    label: "Civic Issue",
    icon: "construction",
    bubble: "bg-tertiary-container text-on-tertiary-container",
    chipActive: "bg-tertiary text-on-tertiary",
  },
  {
    value: "safety",
    label: "Safety",
    icon: "local_police",
    bubble: "bg-error-container/60 text-on-error-container",
    chipActive: "bg-error text-on-error",
  },
  {
    value: "utility",
    label: "Water / Power",
    icon: "water_drop",
    bubble: "bg-secondary-fixed/70 text-on-secondary-container",
    chipActive: "bg-secondary-fixed-dim text-on-secondary-fixed-variant",
  },
  {
    value: "event",
    label: "Event",
    icon: "event",
    bubble: "bg-primary-fixed-dim/40 text-on-primary-fixed-variant",
    chipActive: "bg-primary text-on-primary",
  },
  {
    value: "other",
    label: "Other",
    icon: "campaign",
    bubble: "bg-surface-variant text-on-surface-variant",
    chipActive: "bg-surface-container-high text-on-surface",
  },
];

export function categoryMeta(category: FeedCategory): CategoryMeta {
  return FEED_CATEGORIES.find((c) => c.value === category) ?? FEED_CATEGORIES[5];
}

export function categoryLabel(category: FeedCategory): string {
  return categoryMeta(category).label;
}
