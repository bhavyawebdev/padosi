import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  changePassword,
  fetchLocalities,
  forgotPassword,
  resetPassword,
  signOutOthers,
} from "./authApi";

export function useLocalities(city?: string, q?: string, state?: string) {
  return useQuery({
    queryKey: ["localities", city ?? "", state ?? "", q ?? ""],
    queryFn: () => fetchLocalities(city, q, state),
    staleTime: 60_000,
  });
}

export function useForgotPassword() {
  return useMutation({ mutationFn: forgotPassword });
}

export function useResetPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ newPassword }: { newPassword: string }) => resetPassword(newPassword),
    onSuccess: () => queryClient.clear(),
  });
}

export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      changePassword(currentPassword, newPassword),
    onSuccess: () => {
      // The token may have rotated — refresh the profile cache.
      void queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useSignOutOthers() {
  return useMutation({ mutationFn: signOutOthers });
}
