import type { UserRole } from "@/types";

/**
 * Post-login destination for each account type.
 *
 * Admin lives at /admin — a completely separate experience with its own
 * login. Community and Business get their own dashboards; individuals land
 * on the neighborhood feed. The role always comes from the database-backed
 * profile (Supabase Auth + RLS), never from URL/state/localStorage.
 */
export function homePathForRole(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "community":
      return "/community";
    case "business":
      return "/business";
    default:
      return "/nearby";
  }
}
