import type { ProviderCategory } from "@/types";

export const PROVIDER_CATEGORIES: Array<{ value: ProviderCategory; label: string; icon: string }> = [
  { value: "cook", label: "Cook", icon: "restaurant" },
  { value: "maid", label: "Maid", icon: "cleaning_services" },
  { value: "tutor", label: "Tutor", icon: "school" },
  { value: "plumber", label: "Plumber", icon: "handyman" },
  { value: "electrician", label: "Electrician", icon: "electrical_services" },
  { value: "dog_walker", label: "Dog Walker", icon: "pets" },
  { value: "other", label: "Other", icon: "badge" },
];

export function providerCategoryMeta(category: ProviderCategory): { label: string; icon: string } {
  return PROVIDER_CATEGORIES.find((c) => c.value === category) ?? PROVIDER_CATEGORIES[6];
}
