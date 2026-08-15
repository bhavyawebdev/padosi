/** Admin API client — the only place /admin/* fetches happen. */
import { api } from "@/lib/api";
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

function qs(params: Record<string, string | undefined>): string {
  const parts = Object.entries(params).filter(
    (entry): entry is [string, string] =>
      entry[1] !== undefined && entry[1] !== "",
  );
  if (parts.length === 0) return "";
  return `?${parts
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&")}`;
}

export const fetchAdminOverview = () => api<AdminOverview>("/admin/overview");

export const fetchAdminUsers = (q?: string, role?: UserRole) =>
  api<AdminUser[]>(`/admin/users${qs({ q, role })}`);

export const updateAdminUser = (id: string, payload: AdminUserUpdate) =>
  api<AdminUser>(`/admin/users/${id}`, { method: "PATCH", body: payload });

export const fetchAdminPosts = () => api<AdminPost[]>("/admin/posts");

export const resolveAdminPost = (id: string) =>
  api<AdminPost>(`/admin/posts/${id}/resolve`, { method: "POST" });

export const deleteAdminPost = (id: string) =>
  api<void>(`/admin/posts/${id}`, { method: "DELETE" });

export const fetchAdminRequests = () => api<AdminRequest[]>("/admin/requests");

export const deleteAdminRequest = (id: string) =>
  api<void>(`/admin/requests/${id}`, { method: "DELETE" });

export const fetchAdminProviders = () => api<AdminProvider[]>("/admin/providers");

export const deleteAdminProvider = (id: string) =>
  api<void>(`/admin/providers/${id}`, { method: "DELETE" });

export const fetchAdminReports = () => api<AdminReport[]>("/admin/reports");

export const dismissAdminReport = (id: string) =>
  api<void>(`/admin/reports/${id}`, { method: "DELETE" });

export const fetchCommunityOverview = () =>
  api<CommunityOverview>("/admin/community/overview");
