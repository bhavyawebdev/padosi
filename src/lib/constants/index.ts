/**
 * src/lib/constants/index.ts — Application-wide constants
 */

// ============================================================
// GEO
// ============================================================
export const DEFAULT_RADIUS_KM = 2;
export const MAX_RADIUS_KM = 25;

/** India bounding box (approximate) */
export const INDIA_BOUNDS = {
  north: 37.6,
  south: 6.75,
  east:  97.4,
  west:  68.1,
} as const;

// ============================================================
// POSTS
// ============================================================
export const POST_TITLE_MAX = 120;
export const POST_BODY_MAX  = 1000;
export const POST_TITLE_MIN = 5;

// ============================================================
// TRUST
// ============================================================
export const MIN_TRUST_SCORE_TO_POST = 0; // Everyone can post
export const MIN_TRUST_SCORE_FOR_VERIFY = 30;

// ============================================================
// PAGINATION
// ============================================================
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

// ============================================================
// AUTH
// ============================================================
export const MIN_PASSWORD_LENGTH = 8;
export const OTP_EXPIRY_MINUTES  = 10; // For future phone OTP
export const EMAIL_CONFIRM_EXPIRY_HOURS = 24;

// ============================================================
// RATE LIMITING (enforced server-side via Supabase RLS + middleware)
// ============================================================
export const MAX_POSTS_PER_DAY = 10;
export const MAX_POSTS_PER_HOUR = 3;
