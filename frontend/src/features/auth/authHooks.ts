import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { setToken, tokenIsSessionOnly } from "@/lib/api";
import type { AuthResponse } from "@/types";
import {
  changePassword,
  fetchLocalities,
  fetchSessions,
  forgotPassword,
  recoverEmail,
  resetPassword,
  signOutOthers,
} from "./authApi";

/**
 * The backend bumped the token version on change-password / signout-others.
 * Adopt the fresh token synchronously so this device stays signed in and any
 * follow-up requests (e.g. the session-list refetch) use the new token.
 */
function swapToken(queryClient: QueryClient, data: AuthResponse) {
  // Preserve the user's "keep me signed in" choice: if the current token is
  // session-only, keep the fresh one session-only too (don't silently move it
  // to persistent storage on the security flows).
  setToken(data.access_token, !tokenIsSessionOnly());
  queryClient.setQueryData(["me"], data.user);
  queryClient.invalidateQueries({ queryKey: ["sessions"] });
}

export function useLocalities(city?: string, q?: string, state?: string) {
  return useQuery({
    queryKey: ["localities", city ?? "", state ?? "", q ?? ""],
    queryFn: () => fetchLocalities(city, q, state),
    staleTime: 60_000,
  });
}

export function useSessions() {
  return useQuery({
    queryKey: ["sessions"],
    queryFn: fetchSessions,
    staleTime: 30_000,
  });
}

export function useForgotPassword() {
  return useMutation({ mutationFn: forgotPassword });
}

export function useResetPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ token, newPassword }: { token: string; newPassword: string }) =>
      resetPassword(token, newPassword),
    onSuccess: () => queryClient.clear(),
  });
}

export function useRecoverEmail() {
  return useMutation({ mutationFn: recoverEmail });
}

export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      changePassword(currentPassword, newPassword),
    onSuccess: (data) => swapToken(queryClient, data),
  });
}

export function useSignOutOthers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: signOutOthers,
    onSuccess: (data) => swapToken(queryClient, data),
  });
}
