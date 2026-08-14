/**
 * src/lib/supabase/errors.ts — user-friendly error mapping
 *
 * Never surface raw database/network errors to users. This module maps the
 * Supabase error codes we care about to safe, human-readable messages.
 */

export type FriendlyError = {
  code: string;
  message: string;
};

/** Stable, user-safe error messages. */
export const ERROR_MESSAGES: Record<string, string> = {
  "auth/invalid-credentials": "Incorrect email or password. Please try again.",
  "auth/user-not-found": "No account found with that email address.",
  "auth/email-already-in-use": "An account with this email already exists. Try signing in.",
  "auth/invalid-email": "That email address doesn't look right. Please check it.",
  "auth/weak-password": "Password should be at least 8 characters long.",
  "auth/email-not-confirmed": "Please verify your email address before signing in.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/unauthorized": "You don't have permission to do that.",
  "auth/session-expired": "Your session expired. Please sign in again.",
  "auth/verification-expired": "This verification link has expired. Request a new one.",
  "auth/verification-already-used": "This verification link has already been used. You can sign in now.",
  "auth/invalid-verification": "This verification link is invalid. Request a new one.",
  "rate-limit": "Please slow down a moment before trying again.",
  "network": "Network trouble. Check your connection and try again.",
  "unknown": "Something went wrong. Please try again.",
};

/**
 * Map any thrown error (Supabase `AuthError` / `PostgrestError` or plain) to a
 * safe { code, message } pair. The raw error is never passed to the UI.
 */
export function toFriendlyError(err: unknown): FriendlyError {
  if (err && typeof err === "object") {
    const e = err as { code?: string; message?: string; status?: number };

    // Postgrest RLS violations
    if (e.code === "42501") {
      return { code: "auth/unauthorized", message: ERROR_MESSAGES["auth/unauthorized"] };
    }
    // Row-level conflicts / constraint violations
    if (e.code === "23505") {
      return { code: "duplicate", message: "That already exists. Please check your input." };
    }
    if (e.code === "23503") {
      return { code: "invalid-reference", message: "The related item no longer exists." };
    }

    if (typeof e.code === "string" && ERROR_MESSAGES[e.code]) {
      return { code: e.code, message: ERROR_MESSAGES[e.code] };
    }

    // Network-level failures
    if (e.message && /fetch|network|ECONNREFUSED|Failed to fetch/i.test(e.message)) {
      return { code: "network", message: ERROR_MESSAGES.network };
    }

    if (e.status === 403) {
      return { code: "auth/unauthorized", message: ERROR_MESSAGES["auth/unauthorized"] };
    }
    if (e.status === 429) {
      return { code: "rate-limit", message: ERROR_MESSAGES["rate-limit"] };
    }
  }

  return { code: "unknown", message: ERROR_MESSAGES.unknown };
}

/** True when the error comes from a missing table (migration not applied). */
export function isMissingRelationError(err: unknown): boolean {
  if (err && typeof err === "object") {
    const message = (err as { message?: string }).message ?? "";
    return /relation ".*" does not exist/i.test(message);
  }
  return false;
}
