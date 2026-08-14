/**
 * api.ts
 *
 * Shared request/response contracts for Aas-Paas API routes.
 * Full API contracts will be finalized in Stage 1.
 */

// ============================================================
// COMMON SHAPES
// ============================================================

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

// ============================================================
// HEALTH
// ============================================================

export interface HealthResponse {
  status: "ok" | "degraded" | "down";
  timestamp: string;
  version: string;
  environment: string;
}

// ============================================================
// POSTS — COMMON REQUEST PARAMS
// ============================================================

export interface PostsQueryParams {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  page?: number;
  pageSize?: number;
  status?: "active" | "all";
}

// ============================================================
// NEARBY
// ============================================================

export interface NearbyQueryParams extends PostsQueryParams {
  category?: string;
}

// ============================================================
// HELP
// ============================================================

export interface HelpQueryParams extends PostsQueryParams {
  verifiedOnly?: boolean;
}

// ============================================================
// NEED
// ============================================================

export interface NeedQueryParams extends PostsQueryParams {
  urgentOnly?: boolean;
}

// ============================================================
// LOCATION
// ============================================================

export interface ReverseGeocodeRequest {
  lat: number;
  lng: number;
}

export interface ReverseGeocodeResponse {
  locality: string;
  city: string;
  state: string;
  postalCode?: string;
}

// ============================================================
// NOTIFICATIONS
// ============================================================

export interface NotificationsQueryParams {
  unreadOnly?: boolean;
  page?: number;
  pageSize?: number;
}
