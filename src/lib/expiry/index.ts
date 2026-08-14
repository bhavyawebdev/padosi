/**
 * src/lib/expiry/index.ts — Expiry Engine
 *
 * Shared expiry logic used by all three modules:
 *   - Nearby Right Now
 *   - Verified Help
 *   - Need It Now
 *
 * Expiry is module-specific — each module has different default TTL.
 * All expiry calculations happen server-side via Supabase.
 *
 * Full implementation in Stage 1.
 */

import type { Module } from "@/types/domain";

/**
 * Default post TTL in hours per module.
 * These are starting defaults and can be overridden at post creation time.
 */
export const DEFAULT_TTL_HOURS: Record<Module, number> = {
  nearby: 24,  // Nearby posts expire in 24 hours
  help:   168, // Help listings last 7 days
  need:   48,  // Need requests expire in 48 hours
};

/**
 * Minimum and maximum expiry windows per module (in hours).
 */
export const EXPIRY_BOUNDS: Record<Module, { min: number; max: number }> = {
  nearby: { min: 1,   max: 48  },
  help:   { min: 24,  max: 720 }, // up to 30 days
  need:   { min: 1,   max: 72  },
};

/**
 * Calculate an ISO expiry timestamp from now + hours.
 */
export function expiryFromNow(hours: number): string {
  const ms = hours * 60 * 60 * 1000;
  return new Date(Date.now() + ms).toISOString();
}

/**
 * Whether a post is still active (expiry is in the future).
 */
export function isPostActive(expiresAt: string): boolean {
  return new Date(expiresAt) > new Date();
}

/**
 * Remaining time label for a post (e.g. "2h left", "Expired").
 * Full implementation uses date-fns in Stage 1.
 */
export function expiryLabel(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins  = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) return `${Math.floor(hours / 24)}d left`;
  if (hours > 0)  return `${hours}h left`;
  return `${mins}m left`;
}
