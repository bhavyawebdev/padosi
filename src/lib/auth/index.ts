/**
 * src/lib/auth/index.ts — Auth helpers
 *
 * MVP: Email + password authentication via Supabase.
 * Google OAuth: optional, addable without rewrite.
 * Phone OTP: future addition, no rewrite needed.
 *
 * Full implementation in Stage 1.
 */

/**
 * Routes that require authentication.
 * Used by middleware to redirect unauthenticated users.
 */
export const PROTECTED_ROUTES = [
  "/home",
  "/nearby",
  "/help",
  "/need",
  "/create",
  "/profile",
  "/messages",
  "/notifications",
  "/settings",
  "/onboarding",
] as const;

/**
 * Routes that should redirect authenticated users away (e.g. login page).
 */
export const AUTH_ROUTES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
] as const;

export type ProtectedRoute = (typeof PROTECTED_ROUTES)[number];
export type AuthRoute = (typeof AUTH_ROUTES)[number];

/**
 * Check if a pathname is a protected route.
 */
export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
}

/**
 * Check if a pathname is an auth route.
 */
export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((r) => pathname.startsWith(r));
}
