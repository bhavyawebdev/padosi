/**
 * Admin API client — calls security-definer RPCs that verify the caller's
 * role inside the database. The browser cannot bypass these by calling tables
 * directly (RLS still applies there).
 */
import { toApiError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import type {
  AdminOverview,
  AdminPost,
  AdminProvider,
  AdminReport,
  AdminRequest,
  AdminUser,
  AdminUserUpdate,
  CommunityOverview,
  UserRole,
} from "@/types";

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args ?? {});
  if (error) throw toApiError(error);
  return data as T;
}

/* ---- platform overview + users (admin only) ---- */

export const fetchAdminOverview = () => rpc<AdminOverview>("admin_overview");

export const fetchAdminUsers = (q?: string, role?: UserRole) =>
  rpc<AdminUser[]>("admin_users", { p_q: q ?? null, p_role: role ?? null });

export const updateAdminUser = (id: string, payload: AdminUserUpdate) =>
  rpc<AdminUser>("admin_update_user", {
    p_user_id: id,
    p_role: payload.role ?? null,
    p_phone_verified: payload.phone_verified ?? null,
    p_govt_id_verified: payload.govt_id_verified ?? null,
  });

/* ---- moderation: posts ---- */

export const fetchAdminPosts = () => rpc<AdminPost[]>("admin_posts");

export const resolveAdminPost = (id: string) =>
  rpc<{ ok: boolean }>("admin_resolve_post", { p_post_id: id });

export const deleteAdminPost = (id: string) =>
  rpc<{ ok: boolean }>("admin_delete_post", { p_post_id: id });

/** Community (RWA) moderation — scoped to the account's locality radius. */
export const moderateCommunityPost = (id: string, action: "resolve" | "delete") =>
  rpc<{ ok: boolean }>("community_moderate_post", { p_post_id: id, p_action: action });

/* ---- moderation: requests / providers / reports (admin only) ---- */

export const fetchAdminRequests = () => rpc<AdminRequest[]>("admin_requests");

export const deleteAdminRequest = (id: string) =>
  rpc<{ ok: boolean }>("admin_delete_request", { p_request_id: id });

export const fetchAdminProviders = () => rpc<AdminProvider[]>("admin_providers");

export const deleteAdminProvider = (id: string) =>
  rpc<{ ok: boolean }>("admin_delete_provider", { p_provider_id: id });

export const fetchAdminReports = () => rpc<AdminReport[]>("admin_reports");

export const dismissAdminReport = (id: string) =>
  rpc<{ ok: boolean }>("admin_dismiss_report", { p_report_id: id });

/* ---- community (RWA) dashboard ---- */

export const fetchCommunityOverview = () => rpc<CommunityOverview>("community_overview");
