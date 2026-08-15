import { ApiError, toApiError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import type {
  CreateReviewPayload,
  ProviderCategory,
  ProviderCreatePayload,
  ProviderDetail,
  ProviderProfile,
  Review,
} from "@/types";

export interface DirectoryQueryParams {
  lat: number;
  lng: number;
  radiusKm?: number;
  category?: ProviderCategory | null;
  verifiedOnly?: boolean;
  q?: string;
}

export async function fetchProviders(params: DirectoryQueryParams): Promise<ProviderProfile[]> {
  const { data, error } = await supabase.rpc("providers_list", {
    p_lat: params.lat,
    p_lng: params.lng,
    p_radius_km: params.radiusKm ?? 10,
    p_category: params.category ?? null,
    p_verified_only: params.verifiedOnly ?? false,
    p_q: params.q ?? null,
  });
  if (error) throw toApiError(error);
  return (data ?? []) as ProviderProfile[];
}

/** Columns the provider_profiles table actually has (review/rating stats are computed by the RPCs). */
export interface MyProviderProfile {
  id: string;
  category: ProviderCategory;
  tagline: string;
  price_range: string | null;
  availability: string | null;
  service_area_km: number;
  verified: boolean;
  verification_count: number;
}

/** The signed-in user's own provider profile, or null if they haven't listed one. */
export async function fetchMyProviderProfile(): Promise<MyProviderProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ApiError(401, "Please sign in.");

  const { data, error } = await supabase
    .from("provider_profiles")
    .select("id, category, tagline, price_range, availability, service_area_km, verified, verification_count")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw toApiError(error);
  return (data as MyProviderProfile | null) ?? null;
}

export async function fetchProvider(id: string): Promise<ProviderDetail> {
  const { data, error } = await supabase.rpc("provider_get", { p_provider_id: id });
  if (error) throw toApiError(error);
  return data as ProviderDetail;
}

export async function createProvider(payload: ProviderCreatePayload): Promise<ProviderProfile> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ApiError(401, "Please sign in.");

  const { data, error } = await supabase
    .from("provider_profiles")
    .insert({
      user_id: user.id,
      category: payload.category,
      tagline: payload.tagline,
      price_range: payload.price_range ?? null,
      availability: payload.availability ?? null,
      service_area_km: payload.service_area_km,
      lat: payload.lat,
      lng: payload.lng,
    })
    .select("id")
    .maybeSingle();
  if (error) throw toApiError(error);
  if (!data) throw new ApiError(409, "You already have a provider profile.");
  return fetchProvider((data as { id: string }).id);
}

export async function createReview(
  providerId: string,
  payload: CreateReviewPayload,
): Promise<Review> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ApiError(401, "Please sign in.");

  const { data, error } = await supabase
    .from("reviews")
    .insert({
      provider_id: providerId,
      reviewer_id: user.id,
      rating: payload.rating,
      text: payload.text,
    })
    .select(
      "id, provider_id, reviewer_id, rating, text, created_at, reviewer:profiles!reviews_reviewer_id_fkey(full_name)",
    )
    .single();
  if (error) {
    const apiError = toApiError(error);
    if (apiError.status === 409) throw new ApiError(409, "You already reviewed this provider.");
    throw apiError;
  }
  const row = data as unknown as {
    id: string;
    provider_id: string;
    reviewer_id: string;
    rating: number;
    text: string;
    created_at: string;
    reviewer: { full_name: string } | null;
  };
  return {
    id: row.id,
    provider_id: row.provider_id,
    reviewer_id: row.reviewer_id,
    reviewer_name: row.reviewer?.full_name ?? "",
    rating: row.rating,
    text: row.text,
    created_at: row.created_at,
  };
}

export async function reportProvider(providerId: string, reason: string): Promise<{ ok: boolean }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ApiError(401, "Please sign in.");

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: "provider",
    target_id: providerId,
    reason,
  });
  if (error) throw toApiError(error);
  return { ok: true };
}
