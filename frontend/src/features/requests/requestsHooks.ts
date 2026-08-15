import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createReply,
  createRequest,
  fetchRequest,
  fetchRequests,
  fulfillRequest,
  type RequestsQueryParams,
} from "./requestsApi";

export function useRequests(params: RequestsQueryParams, enabled: boolean) {
  return useQuery({
    queryKey: ["requests", params.lat, params.lng, params.radiusKm ?? 3, params.type ?? "all", params.status ?? "open"],
    queryFn: () => fetchRequests(params),
    enabled,
  });
}

export function useRequest(id: string | undefined) {
  return useQuery({
    queryKey: ["request", id],
    queryFn: () => fetchRequest(id as string),
    enabled: !!id,
  });
}

export function useCreateRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
    },
  });
}

export function useCreateReply(requestId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message: string) => createReply(requestId as string, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["request", requestId] });
      queryClient.invalidateQueries({ queryKey: ["requests"] });
    },
  });
}

export function useFulfillRequest(requestId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => fulfillRequest(requestId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["request", requestId] });
      queryClient.invalidateQueries({ queryKey: ["requests"] });
    },
  });
}
