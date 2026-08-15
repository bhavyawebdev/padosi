import { ApiError, toApiError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import type { CreatePostPayload, FeedCategory, FeedPost } from "@/types";

export interface FeedQueryParams {
  lat: number;
  lng: number;
  radiusKm?: number;
  category?: FeedCategory | null;
  q?: string;
  includeResolved?: boolean;
}

/** Mirrors the old backend's per-category "pulse" lifetimes. */
const EXPIRY_HOURS: Record<FeedCategory, number> = {
  traffic: 6,
  safety: 6,
  utility: 12,
  civic: 12,
  event: 24,
  other: 12,
};

export async function fetchFeed(params: FeedQueryParams): Promise<FeedPost[]> {
  const { data, error } = await supabase.rpc("feed_list", {
    p_lat: params.lat,
    p_lng: params.lng,
    p_radius_km: params.radiusKm ?? 3,
    p_category: params.category ?? null,
    p_q: params.q ?? null,
    p_include_resolved: params.includeResolved ?? false,
  });
  if (error) throw toApiError(error);
  return (data ?? []) as FeedPost[];
}

export async function fetchPost(postId: string): Promise<FeedPost> {
  const { data, error } = await supabase.rpc("post_get", { p_post_id: postId });
  if (error) throw toApiError(error);
  return data as FeedPost;
}

export async function createPost(payload: CreatePostPayload): Promise<FeedPost> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ApiError(401, "Please sign in.");

  const expiresAt = new Date(Date.now() + EXPIRY_HOURS[payload.category] * 3_600_000).toISOString();
  const { data, error } = await supabase
    .from("feed_posts")
    .insert({
      user_id: user.id,
      category: payload.category,
      text: payload.text,
      lat: payload.lat,
      lng: payload.lng,
      expires_at: expiresAt,
      urgent: payload.urgent ?? false,
    })
    .select("id, user_id, category, text, created_at, expires_at, confirm_count, resolved, urgent")
    .single();
  if (error) throw toApiError(error);
  // Fetch the authoritative row (author name, confirms, etc.) via the RPC.
  return fetchPost((data as { id: string }).id);
}

export async function confirmPost(postId: string): Promise<FeedPost> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ApiError(401, "Please sign in.");

  const { error } = await supabase.from("feed_post_confirms").insert({
    post_id: postId,
    user_id: user.id,
  });
  if (error) {
    const apiError = toApiError(error);
    if (apiError.status === 409) {
      // Already confirmed — the unique constraint fired; not an error for UX.
      return fetchPost(postId);
    }
    throw apiError;
  }
  return fetchPost(postId);
}

export async function resolvePost(postId: string): Promise<FeedPost> {
  const { data, error } = await supabase
    .from("feed_posts")
    .update({ resolved: true, resolved_at: new Date().toISOString() })
    .eq("id", postId)
    .select("id")
    .maybeSingle();
  if (error) throw toApiError(error);
  if (!data) throw new ApiError(403, "Only the author can resolve this post.");
  return fetchPost(postId);
}

export async function reportPost(postId: string, reason: string): Promise<{ ok: boolean }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ApiError(401, "Please sign in.");

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: "feed",
    target_id: postId,
    reason,
  });
  if (error) throw toApiError(error);
  return { ok: true };
}
