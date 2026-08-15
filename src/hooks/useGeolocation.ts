import { useCallback, useState } from "react";

import type { Locality } from "@/types";

export interface GeoPoint {
  lat: number;
  lng: number;
}

interface UseGeolocationResult {
  /** Exact fix from the browser, or the locality centroid fallback. */
  point: GeoPoint | null;
  /** True while the browser is asked for a fix. */
  requesting: boolean;
  /** Whether we're falling back to the locality centroid (no GPS permission). */ usingFallback: boolean; request: () => void; } /** * Resolve a viewer location: prefer the browser fix, fall back to the * user's selected locality centroid (the trust anchor). The feed is
 * functional either way — locality is always available after signup.
 */
export function useGeolocation(locality: Locality | null | undefined): UseGeolocationResult {
  const [point, setPoint] = useState<GeoPoint | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

  const request = useCallback(() => {
    const fallback = (): void => {
      if (locality) {
        setPoint({ lat: locality.lat, lng: locality.lng });
        setUsingFallback(true);
      }
      setRequesting(false);
    };

    if (!("geolocation" in navigator)) {
      fallback();
      return;
    }
    setRequesting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setUsingFallback(false);
        setRequesting(false);
      },
      fallback,
      { timeout: 4000, maximumAge: 300_000 },
    );
  }, [locality]);

  return { point, requesting, usingFallback, request };
}
