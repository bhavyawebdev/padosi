/**
 * src/lib/auth/verification.ts — email verification helpers
 *
 * Supabase Auth is the authority. A session is "verified" when:
 * - the account was created through an OAuth provider (Google), whose email
 *   is verified by the identity provider, or
 * - the email address has been confirmed (email_confirmed_at is set).
 *
 * Local/demo sessions (no Supabase session) are treated as verified so the
 * demo experience keeps working without a configured project.
 */
import type { User as SupabaseUser } from "@supabase/supabase-js";

export function isGoogleUser(user: SupabaseUser | null): boolean {
  return user?.app_metadata?.provider === "google";
}

export function isSessionVerified(user: SupabaseUser | null): boolean {
  if (!user) return false;
  if (isGoogleUser(user)) return true;
  return Boolean(user.email_confirmed_at);
}

/**
 * True when the caller must verify their email before accessing protected
 * areas. Local/demo sessions carry no Supabase session, so they are verified.
 */
export function requiresEmailVerification(user: SupabaseUser | null): boolean {
  if (!user) return false;
  return !isSessionVerified(user);
}

/** Short label used by the UI ("Google account" vs "email account"). */
export function accountTypeLabel(user: SupabaseUser | null): string {
  if (isGoogleUser(user)) return "Google account";
  return "email account";
}
