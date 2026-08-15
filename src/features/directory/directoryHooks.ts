import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createProvider,
  createReview,
  fetchMyProviderProfile,
  fetchProvider,
  fetchProviders,
  type DirectoryQueryParams,
} from "./directoryApi";

export function useProviders(params: DirectoryQueryParams, enabled: boolean) {
  return useQuery({
    queryKey: [
      "providers",
      params.lat,
      params.lng,
      params.radiusKm ?? 10,
      params.category ?? "all",
      params.verifiedOnly ?? false,
      params.q ?? "",
    ],
    queryFn: () => fetchProviders(params),
    enabled,
  });
}

export function useMyProviderProfile() {
  return useQuery({
    queryKey: ["my-provider-profile"],
    queryFn: fetchMyProviderProfile,
  });
}

export function useProvider(id: string | undefined) {
  return useQuery({
    queryKey: ["provider", id],
    queryFn: () => fetchProvider(id as string),
    enabled: !!id,
  });
}

export function useCreateProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providers"] });
    },
  });
}

export function useCreateReview(providerId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { rating: number; text: string }) => createReview(providerId as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider", providerId] });
      queryClient.invalidateQueries({ queryKey: ["providers"] });
    },
  });
}
