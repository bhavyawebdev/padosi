/** React Query hooks for the admin API — server state stays in the cache. */
import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import type { AdminUserUpdate, UserRole } from "@/types";
import * as adminApi from "./adminApi";

export const useAdminOverview = () =>
  useQuery({ queryKey: ["admin", "overview"], queryFn: adminApi.fetchAdminOverview });

export const useAdminUsers = (q: string, role: UserRole | undefined) =>
  useQuery({
    queryKey: ["admin", "users", q, role ?? "all"],
    queryFn: () => adminApi.fetchAdminUsers(q || undefined, role),
  });

export const useUpdateAdminUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdminUserUpdate }) =>
      adminApi.updateAdminUser(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "users"] });
      void qc.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
  });
};

export const useAdminPosts = () =>
  useQuery({ queryKey: ["admin", "posts"], queryFn: adminApi.fetchAdminPosts });

export const useAdminRequests = () =>
  useQuery({ queryKey: ["admin", "requests"], queryFn: adminApi.fetchAdminRequests });

export const useAdminProviders = () =>
  useQuery({ queryKey: ["admin", "providers"], queryFn: adminApi.fetchAdminProviders });

export const useAdminReports = () =>
  useQuery({ queryKey: ["admin", "reports"], queryFn: adminApi.fetchAdminReports });

export const useCommunityOverview = () =>
  useQuery({ queryKey: ["admin", "community"], queryFn: adminApi.fetchCommunityOverview });

/**
 * All moderation actions; every success refreshes the admin cache.
 *
 * Community (RWA) accounts moderate through `community_moderate_post`, which
 * the database restricts to their locality radius. Platform admins use the
 * admin RPCs. Both are server-authoritative — the UI role check below is only
 * for routing, never for authorization.
 */
export function useAdminModeration() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isCommunity = user?.role === "community";

  const refresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["admin"] });
  }, [qc]);

  const resolvePost = useMutation({
    mutationFn: (id: string) =>
      isCommunity ? adminApi.moderateCommunityPost(id, "resolve") : adminApi.resolveAdminPost(id),
    onSuccess: refresh,
  });
  const deletePost = useMutation({
    mutationFn: (id: string) =>
      isCommunity ? adminApi.moderateCommunityPost(id, "delete") : adminApi.deleteAdminPost(id),
    onSuccess: refresh,
  });
  const deleteRequest = useMutation({
    mutationFn: (id: string) => adminApi.deleteAdminRequest(id),
    onSuccess: refresh,
  });
  const deleteProvider = useMutation({
    mutationFn: (id: string) => adminApi.deleteAdminProvider(id),
    onSuccess: refresh,
  });
  const dismissReport = useMutation({
    mutationFn: (id: string) => adminApi.dismissAdminReport(id),
    onSuccess: refresh,
  });

  return { resolvePost, deletePost, deleteRequest, deleteProvider, dismissReport };
}
