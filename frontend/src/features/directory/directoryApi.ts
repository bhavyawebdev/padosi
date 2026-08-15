import { api } from "@/lib/api";
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
  const q = new URLSearchParams({ lat: String(params.lat), lng: String(params.lng) });
  if (params.radiusKm !== undefined) q.set("radius_km", String(params.radiusKm));
  if (params.category) q.set("category", params.category);
  if (params.verifiedOnly) q.set("verified_only", "true");
  if (params.q) q.set("q", params.q);
  return api<ProviderProfile[]>(`/directory?${q.toString()}`);
}

export async function fetchProvider(id: string): Promise<ProviderDetail> {
  return api<ProviderDetail>(`/directory/${id}`);
}

export async function createProvider(payload: ProviderCreatePayload): Promise<ProviderProfile> {
  return api<ProviderProfile>("/directory", { method: "POST", body: payload });
}

export async function createReview(providerId: string, payload: CreateReviewPayload): Promise<Review> {
  return api<Review>(`/directory/${providerId}/reviews`, { method: "POST", body: payload });
}

export async function reportProvider(providerId: string, reason: string): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>(`/directory/${providerId}/report`, { method: "POST", body: { reason } });
}
