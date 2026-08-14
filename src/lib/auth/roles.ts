import "server-only";

/**
 * src/lib/auth/roles.ts — server-side role-based authorization
 *
 * The browser is never the security boundary: every protected operation
 * re-verifies the caller's role server-side (session + profiles.role via RLS),
 * and administrative mutations go through the service-role client.
 */

import { createClient } from "@/lib/supabase/server";

export type UserRole = "user" | "moderator" | "admin" | "super_admin";
export type ProfileStatus = "active" | "suspended" | "disabled";

export const ROLE_LEVEL: Record<UserRole, number> = {
  user: 0,
  moderator: 1,
  admin: 2,
  super_admin: 3,
};

/** Roles permitted for a given capability. */
export const CAN = {
  moderate: (r: UserRole | null) => r !== null && ROLE_LEVEL[r] >= ROLE_LEVEL.moderator,
  admin: (r: UserRole | null) => r !== null && ROLE_LEVEL[r] >= ROLE_LEVEL.admin,
  superAdmin: (r: UserRole | null) => r !== null && ROLE_LEVEL[r] >= ROLE_LEVEL.super_admin,
} as const;

export type SessionRoleResult =
  | { user: { id: string; role: UserRole; status: ProfileStatus } }
  | { user: null; error: string };

/**
 * Resolve the authenticated user's role from the database (not from the
 * client). Returns `{ user: null }` for unauthenticated callers.
 */
export async function getSessionRole(): Promise<SessionRoleResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, error: "Not authenticated" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single();

  // Fall back to a safe default if the profiles table is unavailable
  // (migration not applied) — the caller still needs a session.
  const role: UserRole = profile?.role ?? "user";
  const status: ProfileStatus = profile?.status ?? "active";

  return { user: { id: user.id, role, status } };
}

/**
 * Guard helper for route handlers. Returns an error descriptor when the
 * caller isn't authenticated or lacks the required role.
 */
export async function requireRole(
  minRole: UserRole
): Promise<
  | { ok: true; userId: string; role: UserRole }
  | { ok: false; status: number; message: string }
> {
  const session = await getSessionRole();

  if (!session.user) {
    return { ok: false, status: 401, message: "Authentication required." };
  }
  if (session.user.status !== "active") {
    return { ok: false, status: 403, message: "Your account is not active." };
  }
  if (ROLE_LEVEL[session.user.role] < ROLE_LEVEL[minRole]) {
    return { ok: false, status: 403, message: "You don't have permission to do that." };
  }
  return { ok: true, userId: session.user.id, role: session.user.role };
}
