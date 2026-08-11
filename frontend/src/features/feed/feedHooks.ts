import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  confirmPost,
  createPost,
  fetchFeed,
  fetchPost,
  resolvePost,
  type FeedQueryParams,
} from "./feedApi";

export function useFeed(params: FeedQueryParams, enabled: boolean) {
  return useQuery({
    queryKey: ["feed", params.lat, params.lng, params.radiusKm ?? 3, params.category ?? "all", params.q ?? "", params.includeResolved ?? false],
    queryFn: () => fetchFeed(params),
    enabled,
  });
}

export function usePost(id: string | undefined) {
  return useQuery({
    queryKey: ["post", id],
    queryFn: () => fetchPost(id as string),
    enabled: !!id,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

export function useConfirmPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: confirmPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

export function useResolvePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resolvePost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}
