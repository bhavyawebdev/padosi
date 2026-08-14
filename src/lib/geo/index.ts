/**
 * src/lib/geo/index.ts — Geolocation Engine (Free-First)
 *
 * Provides location utilities using:
 *   - Browser Geolocation API (no paid API required)
 *   - Manual locality entry as fallback
 *   - PostGIS for server-side geographic queries
 *
 * NO Mapbox / Google Maps dependency for core geo queries.
 * A map UI provider (Mapbox/Leaflet) can be added as a V1.1 overlay
 * without changing this engine.
 *
 * Privacy principles:
 *   - Exact home coordinates are NEVER exposed publicly
 *   - Public UI shows only approximate distance (e.g. "200m away", "Near Bandra West")
 *   - Radius buckets: 200m | 400m | 800m | 1.5km | 5km
 *
 * Full implementation in Stage 1.
 */

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy?: number; // in metres
}

export interface LocalityInfo {
  /** User-entered or reverse-geocoded neighbourhood name */
  neighbourhood: string;
  /** User-entered locality (e.g. Bandra West) */
  locality: string;
  city: string;
  state: string;
  postalCode?: string;
  /** Optional: society / building / complex name */
  societyName?: string;
}

export type LocationSource = "browser" | "manual" | "denied";

export interface UserLocation {
  source: LocationSource;
  position?: GeoPosition;
  localityInfo?: LocalityInfo;
}

/**
 * Bucket an exact distance into an approximate public-safe label.
 * Used on post cards and list views — never exposes exact coordinates.
 */
export function bucketDistance(metres: number): string {
  if (metres < 300)  return "200m away";
  if (metres < 600)  return "400m away";
  if (metres < 1200) return "800m away";
  if (metres < 2500) return "1.5km away";
  if (metres < 6000) return "~5km away";
  return "Nearby";
}

/**
 * Request browser geolocation.
 * Returns null if denied or unavailable.
 * Never throws — always handles permission denial gracefully.
 *
 * Full implementation in Stage 1.
 */
export async function requestBrowserLocation(): Promise<GeoPosition | null> {
  // Placeholder — full implementation in Stage 1
  return null;
}

/**
 * Default radius options for the location filter UI.
 */
export const RADIUS_OPTIONS = [
  { label: "500m",  value: 0.5 },
  { label: "1 km",  value: 1 },
  { label: "2 km",  value: 2 },
  { label: "5 km",  value: 5 },
  { label: "10 km", value: 10 },
] as const;

export const DEFAULT_RADIUS_KM = 2;
