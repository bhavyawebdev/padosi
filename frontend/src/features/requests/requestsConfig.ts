import type { RequestType } from "@/types";

export const REQUEST_TYPES: Array<{ value: RequestType; label: string; icon: string; tagClass: string }> = [
  {
    value: "borrow_lend",
    label: "Need to Borrow",
    icon: "handshake",
    tagClass: "bg-secondary-fixed/50 text-on-secondary-container",
  },
  {
    value: "ride_share",
    label: "Ride Share",
    icon: "directions_car",
    tagClass: "bg-tertiary-fixed/50 text-on-tertiary-fixed-variant",
  },
  {
    value: "spare_item",
    label: "Spare / Ticket",
    icon: "confirmation_number",
    tagClass: "bg-primary-fixed-dim/40 text-on-primary-fixed-variant",
  },
  {
    value: "other",
    label: "Other",
    icon: "volunteer_activism",
    tagClass: "bg-surface-variant text-on-surface-variant",
  },
];

export function requestTypeMeta(type: RequestType) {
  return REQUEST_TYPES.find((t) => t.value === type) ?? REQUEST_TYPES[3];
}
