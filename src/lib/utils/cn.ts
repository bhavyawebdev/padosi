/**
 * cn.ts — className merge utility
 * Combines clsx (conditional classes) with tailwind-merge (Tailwind conflict resolution)
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
