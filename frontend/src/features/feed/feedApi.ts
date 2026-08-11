import { api } from "@/lib/api";
import type { CreatePostPayload, FeedCategory, FeedPost } from "@/types";

export interface FeedQueryParams {
  lat: number;
  lng: number;
  radiusKm?: number;
  category?: FeedCategory | null;
  q?: string;
  includeResolved?: boolean;
}

export async function fetchFeed(params: FeedQueryParams): Promise<FeedPost[]> {
  const q = new URLSearchParams({
    lat: String(params.lat),
    lng: String(params.lng),
  });
  if (params.radiusKm !== undefined) q.set("radius_km", String(params.radiusKm));
  if (params.category) q.set("category", params.category);
  if (params.q) q.set("q", params.q);
  if (params.includeResolved) q.set("include_resolved", "true");
  return api<FeedPost[]>(`/feed?${q.toString()}`);
}

export async function fetchPost(postId: string): Promise<FeedPost> {
  return api<FeedPost>(`/feed/${postId}`);
}

export async function createPost(payload: CreatePostPayload): Promise<FeedPost> {
  return api<FeedPost>("/feed", { method: "POST", body: payload });
}

export async function confirmPost(postId: string): Promise<FeedPost> {
  return api<FeedPost>(`/feed/${postId}/confirm`, { method: "POST" });
}

export async function resolvePost(postId: string): Promise<FeedPost> {
  return api<FeedPost>(`/feed/${postId}/resolve`, { method: "POST" });
}

export async function reportPost(postId: string, reason: string): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>(`/feed/${postId}/report`, { method: "POST", body: { reason } });
}
